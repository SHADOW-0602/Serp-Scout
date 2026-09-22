import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import {
  db,
  businesses,
  reports,
  recommendations,
  sourceEvidence,
  contentGaps,
  keywords,
  rankingObservations,
} from '../db/index.js';
import { WorkspaceRequest } from '../middleware/workspace.js';
import { generateWeeklyReport } from '@serp-scout/agents';
import {
  generateReportPdf,
  generateReportCsv,
  ReportPdfData,
} from '../services/pdf.service.js';
import { getRankingsForBusiness } from '../services/ranking.service.js';
import { env } from '../config/env.js';
import { GeneratedReport } from '@serp-scout/types';

const router = Router();

const updateRecStatusSchema = z.object({
  status: z.enum(['planned', 'in_progress', 'completed', 'dismissed']),
});

// POST /api/businesses/:id/reports/generate - Generate fresh report
router.post(
  '/:id/reports/generate',
  async (req: WorkspaceRequest, res: Response): Promise<void> => {
    const businessId = String(req.params.id);
    const workspaceId = req.workspace!.id;

    try {
      // 1. Fetch business & context
      const [biz] = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.id, businessId), eq(businesses.workspaceId, workspaceId)))
        .limit(1);

      if (!biz) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Business not found' },
        });
        return;
      }

      // Fetch rankings
      const keywordRankings = await getRankingsForBusiness(businessId);

      // Fetch content gaps
      const gaps = await db
        .select()
        .from(contentGaps)
        .where(eq(contentGaps.businessId, businessId))
        .limit(10);

      const periodEnd = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const periodStart = weekAgo.toISOString().split('T')[0];

      // 2. Generate Report via Engine
      const generated = await generateWeeklyReport({
        business: {
          name: biz.name,
          websiteUrl: biz.websiteUrl,
          services: [],
          city: biz.city || undefined,
        },
        periodStart,
        periodEnd,
        keywordRankings: keywordRankings.map((k) => ({
          phrase: k.keyword.phrase,
          currentRank: k.currentRank,
          previousRank: k.previousRank,
          delta: k.delta,
          bestCompetitorRank: k.bestCompetitorRank,
          bestCompetitorDomain: k.bestCompetitorDomain,
        })),
        contentGaps: gaps.map((g) => ({
          topic: g.topic,
          competitorDomain: (g.evidence as any)?.competitorDomain || 'rival.com',
          competitorUrl: (g.evidence as any)?.competitorUrl || 'https://rival.com',
          recommendedPageType: (g.recommendedPageType as any) || 'service',
          suggestedTitle: g.suggestedTitle || g.topic,
          suggestedHeadings: (g.suggestedHeadings as string[]) || [],
          suggestedFaqs: (g.suggestedFaqs as string[]) || [],
          targetIntent: (g.targetIntent as any) || 'commercial',
          estimatedImpact: (g.impact as any) || 'medium',
          estimatedEffort: (g.effort as any) || 'medium',
          priority: (g.priority as any) || 'P1',
          evidenceUrls: (g.evidence as any)?.evidenceUrls || [],
        })),
        apiKey: env.GROQ_API_KEY,
      });

      // 3. Persist Report in Neon
      const [newReport] = await db
        .insert(reports)
        .values({
          businessId,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          summary: generated as any,
          status: 'published',
        })
        .returning();

      // 4. Persist Recommendations and Source Evidence
      const savedRecs = [];
      for (const rec of generated.actionPlan) {
        const [savedRec] = await db
          .insert(recommendations)
          .values({
            businessId,
            reportId: newReport.id,
            title: rec.title,
            description: rec.problem,
            evidence: {
              summary: rec.evidenceSummary,
              queries: rec.searchQueries,
              urls: rec.sourceUrls,
            },
            impact: rec.expectedImpact,
            effort: rec.estimatedEffort,
            priority: rec.priority,
            confidence: rec.confidence,
            status: 'planned',
          })
          .returning();

        savedRecs.push(savedRec);

        // Insert Source Evidence rows
        for (const url of rec.sourceUrls) {
          await db.insert(sourceEvidence).values({
            businessId,
            recommendationId: savedRec.id,
            sourceUrl: url,
            sourceTitle: rec.title,
            claim: rec.evidenceSummary,
          });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          report: newReport,
          recommendations: savedRecs,
        },
      });
    } catch (err: any) {
      console.error('Report generation failed:', err);
      res.status(500).json({
        success: false,
        error: { code: 'REPORT_GENERATION_FAILED', message: err.message || 'Failed to generate report' },
      });
    }
  }
);

// GET /api/businesses/:id/reports - List reports
router.get(
  '/:id/reports',
  async (req: WorkspaceRequest, res: Response): Promise<void> => {
    const businessId = String(req.params.id);
    const workspaceId = req.workspace!.id;

    try {
      const [biz] = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.id, businessId), eq(businesses.workspaceId, workspaceId)))
        .limit(1);

      if (!biz) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Business not found' },
        });
        return;
      }

      const list = await db
        .select()
        .from(reports)
        .where(eq(reports.businessId, businessId))
        .orderBy(desc(reports.generatedAt));

      res.json({
        success: true,
        data: list,
      });
    } catch (err: any) {
      console.error(`Failed to list reports for ${businessId}:`, err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch reports' },
      });
    }
  }
);

// GET /api/reports/:id - Get report details
router.get(
  '/:id',
  async (req: WorkspaceRequest, res: Response): Promise<void> => {
    const reportId = String(req.params.id);
    const workspaceId = req.workspace!.id;

    try {
      const [existing] = await db
        .select({
          report: reports,
          business: businesses,
        })
        .from(reports)
        .innerJoin(businesses, eq(reports.businessId, businesses.id))
        .where(and(eq(reports.id, reportId), eq(businesses.workspaceId, workspaceId)))
        .limit(1);

      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Report not found' },
        });
        return;
      }

      // Fetch recommendations
      const recs = await db
        .select()
        .from(recommendations)
        .where(eq(recommendations.reportId, reportId))
        .orderBy(recommendations.priority);

      // Fetch evidence
      const recIds = recs.map((r) => r.id);
      let evidenceList: any[] = [];
      if (recIds.length > 0) {
        evidenceList = await db
          .select()
          .from(sourceEvidence)
          .where(eq(sourceEvidence.businessId, existing.business.id));
      }

      res.json({
        success: true,
        data: {
          report: existing.report,
          business: existing.business,
          recommendations: recs,
          evidence: evidenceList,
        },
      });
    } catch (err: any) {
      console.error(`Failed to fetch report ${reportId}:`, err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch report' },
      });
    }
  }
);

// GET /api/reports/:id/pdf - Stream PDF binary
router.get(
  '/:id/pdf',
  async (req: WorkspaceRequest, res: Response): Promise<void> => {
    const reportId = String(req.params.id);
    const workspaceId = req.workspace!.id;

    try {
      const [record] = await db
        .select({
          report: reports,
          business: businesses,
        })
        .from(reports)
        .innerJoin(businesses, eq(reports.businessId, businesses.id))
        .where(and(eq(reports.id, reportId), eq(businesses.workspaceId, workspaceId)))
        .limit(1);

      if (!record) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Report not found' },
        });
        return;
      }

      const reportData: ReportPdfData = {
        businessName: record.business.name,
        websiteUrl: record.business.websiteUrl,
        periodStart: record.report.periodStart.toISOString().split('T')[0],
        periodEnd: record.report.periodEnd.toISOString().split('T')[0],
        report: record.report.summary as GeneratedReport,
      };

      const pdfBuffer = await generateReportPdf(reportData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="serp-scout-report-${reportData.periodEnd}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error(`PDF generation failed for ${reportId}:`, err);
      res.status(500).json({
        success: false,
        error: { code: 'PDF_FAILED', message: err.message || 'Failed to render PDF' },
      });
    }
  }
);

// GET /api/reports/:id/csv - Stream CSV export
router.get(
  '/:id/csv',
  async (req: WorkspaceRequest, res: Response): Promise<void> => {
    const reportId = String(req.params.id);
    const workspaceId = req.workspace!.id;

    try {
      const [record] = await db
        .select({
          report: reports,
          business: businesses,
        })
        .from(reports)
        .innerJoin(businesses, eq(reports.businessId, businesses.id))
        .where(and(eq(reports.id, reportId), eq(businesses.workspaceId, workspaceId)))
        .limit(1);

      if (!record) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Report not found' },
        });
        return;
      }

      const csvContent = generateReportCsv({
        businessName: record.business.name,
        websiteUrl: record.business.websiteUrl,
        periodStart: record.report.periodStart.toISOString().split('T')[0],
        periodEnd: record.report.periodEnd.toISOString().split('T')[0],
        report: record.report.summary as GeneratedReport,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="serp-scout-actions-${record.report.periodEnd.toISOString().split('T')[0]}.csv"`
      );
      res.send(csvContent);
    } catch (err: any) {
      console.error(`CSV generation failed for ${reportId}:`, err);
      res.status(500).json({
        success: false,
        error: { code: 'CSV_FAILED', message: err.message || 'Failed to generate CSV' },
      });
    }
  }
);

// PATCH /api/recommendations/:id - Update recommendation status
router.patch(
  '/recommendations/:id',
  async (req: WorkspaceRequest, res: Response): Promise<void> => {
    const recId = String(req.params.id);
    const workspaceId = req.workspace!.id;

    const parseResult = updateRecStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid status' },
      });
      return;
    }

    try {
      const [existing] = await db
        .select({
          rec: recommendations,
        })
        .from(recommendations)
        .innerJoin(businesses, eq(recommendations.businessId, businesses.id))
        .where(and(eq(recommendations.id, recId), eq(businesses.workspaceId, workspaceId)))
        .limit(1);

      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Recommendation not found' },
        });
        return;
      }

      const [updated] = await db
        .update(recommendations)
        .set({ status: parseResult.data.status })
        .where(eq(recommendations.id, recId))
        .returning();

      res.json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      console.error(`Failed to update recommendation ${recId}:`, err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update recommendation' },
      });
    }
  }
);

export default router;
