import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import {
  db,
  businesses,
  businessLocations,
  services,
  competitors,
  searchResults,
  searchRuns,
} from '../db/index.js';
import { WorkspaceRequest } from '../middleware/workspace.js';
import {
  planCompetitorQueries,
  discoverCompetitors,
  RawSearchItemWithContext,
} from '@serp-scout/agents';
import { executeSearchRun } from '../services/search-run.service.js';

const router = Router();

const updateCompetitorSchema = z.object({
  status: z.enum(['candidate', 'confirmed', 'rejected', 'indirect']).optional(),
  name: z.string().min(1).optional(),
  websiteUrl: z.string().url().optional(),
  userNotes: z.string().optional(),
});

const createManualCompetitorSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1, 'Competitor name is required'),
  websiteUrl: z.string().url('Must be a valid website URL'),
  category: z.string().optional(),
  competitorType: z.enum(['direct', 'geographic', 'search', 'indirect']).default('direct'),
  userNotes: z.string().optional(),
});

// POST /api/businesses/:id/competitors/discover - Run competitor discovery
router.post(
  '/:id/competitors/discover',
  async (req: WorkspaceRequest, res: Response): Promise<void> => {
    const businessId = String(req.params.id);
    const workspaceId = req.workspace!.id;

    try {
      // 1. Fetch business details
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

      const svcs = await db
        .select()
        .from(services)
        .where(eq(services.businessId, businessId));

      const locs = await db
        .select()
        .from(businessLocations)
        .where(eq(businessLocations.businessId, businessId));

      // 2. Fetch recent search results for this business to extract candidates from
      let existingResults = await db
        .select({
          result: searchResults,
          run: searchRuns,
        })
        .from(searchResults)
        .innerJoin(searchRuns, eq(searchResults.searchRunId, searchRuns.id))
        .where(eq(searchRuns.businessId, businessId))
        .limit(100);

      // If no search results exist yet, execute an initial search run automatically
      if (existingResults.length === 0) {
        const planned = planCompetitorQueries({
          businessName: biz.name,
          category: biz.industry || undefined,
          services: svcs.map((s) => s.name),
          city: biz.city || locs[0]?.city || undefined,
        });

        const initialQuery = planned.serviceQueries[0] || `${biz.name} in ${biz.city || 'Austin'}`;
        await executeSearchRun({
          businessId,
          workspaceId,
          searchType: 'google',
          query: initialQuery,
          num: 15,
        });

        // Re-fetch search results
        existingResults = await db
          .select({
            result: searchResults,
            run: searchRuns,
          })
          .from(searchResults)
          .innerJoin(searchRuns, eq(searchResults.searchRunId, searchRuns.id))
          .where(eq(searchRuns.businessId, businessId))
          .limit(100);
      }

      // 3. Format items for candidate extractor
      const searchItems: RawSearchItemWithContext[] = existingResults.map(({ result, run }) => ({
        query: run.query,
        source: run.searchType === 'google_maps' ? 'google_maps' : 'google',
        item: {
          rank: result.rank,
          title: result.title,
          url: result.url,
          domain: result.domain,
          snippet: result.snippet || undefined,
          rating: result.rating ? Number(result.rating) : undefined,
          reviewsCount: result.reviewCount || undefined,
          address: result.locationText || undefined,
          raw: result.rawReference as Record<string, any>,
        },
      }));

      // 4. Run Discovery Pipeline
      const candidates = await discoverCompetitors({
        business: {
          name: biz.name,
          websiteUrl: biz.websiteUrl,
          category: biz.industry || undefined,
          services: svcs.map((s) => s.name),
          city: biz.city || 'Austin',
        },
        searchItems,
        maxCandidatesToEnrich: 10,
      });

      // 5. Upsert candidates into database
      const savedCompetitors = [];
      for (const cand of candidates) {
        const [existing] = await db
          .select()
          .from(competitors)
          .where(and(eq(competitors.businessId, businessId), eq(competitors.domain, cand.domain)))
          .limit(1);

        if (existing) {
          // Update score and category
          const [updated] = await db
            .update(competitors)
            .set({
              confidenceScore: cand.confidenceScore,
              competitorType: cand.competitorType,
              category: cand.category || existing.category,
              updatedAt: new Date(),
            })
            .where(eq(competitors.id, existing.id))
            .returning();
          savedCompetitors.push(updated);
        } else {
          // Insert new candidate
          const [inserted] = await db
            .insert(competitors)
            .values({
              businessId,
              name: cand.name,
              domain: cand.domain,
              websiteUrl: cand.websiteUrl,
              mapsUrl: cand.mapsUrl,
              category: cand.category,
              competitorType: cand.competitorType,
              confidenceScore: cand.confidenceScore,
              status: 'candidate',
            })
            .returning();
          savedCompetitors.push(inserted);
        }
      }

      res.status(200).json({
        success: true,
        data: {
          discoveredCount: candidates.length,
          competitors: savedCompetitors,
        },
      });
    } catch (err: any) {
      console.error(`Competitor discovery failed for business ${businessId}:`, err);
      res.status(500).json({
        success: false,
        error: { code: 'DISCOVERY_FAILED', message: err.message || 'Competitor discovery failed' },
      });
    }
  }
);

// GET /api/businesses/:id/competitors - List competitors
router.get(
  '/:id/competitors',
  async (req: WorkspaceRequest, res: Response): Promise<void> => {
    const businessId = String(req.params.id);
    const workspaceId = req.workspace!.id;
    const statusFilter = req.query.status as string | undefined;

    try {
      const conditions = [
        eq(competitors.businessId, businessId),
        eq(businesses.workspaceId, workspaceId),
      ];

      if (statusFilter) {
        conditions.push(eq(competitors.status, statusFilter));
      }

      const list = await db
        .select({
          competitor: competitors,
        })
        .from(competitors)
        .innerJoin(businesses, eq(competitors.businessId, businesses.id))
        .where(and(...conditions))
        .orderBy(desc(competitors.confidenceScore));

      res.json({
        success: true,
        data: list.map((item) => item.competitor),
      });
    } catch (err: any) {
      console.error(`Failed to list competitors for business ${businessId}:`, err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not fetch competitors' },
      });
    }
  }
);

// PATCH /api/competitors/:id - Update competitor status or details
router.patch(
  '/competitor/:id',
  async (req: WorkspaceRequest, res: Response): Promise<void> => {
    const competitorId = String(req.params.id);
    const workspaceId = req.workspace!.id;

    const parseResult = updateCompetitorSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid update payload' },
      });
      return;
    }

    const data = parseResult.data;

    try {
      // Verify workspace ownership via business join
      const [existing] = await db
        .select({
          competitor: competitors,
        })
        .from(competitors)
        .innerJoin(businesses, eq(competitors.businessId, businesses.id))
        .where(and(eq(competitors.id, competitorId), eq(businesses.workspaceId, workspaceId)))
        .limit(1);

      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Competitor not found' },
        });
        return;
      }

      const [updated] = await db
        .update(competitors)
        .set({
          ...(data.status && { status: data.status }),
          ...(data.name && { name: data.name }),
          ...(data.websiteUrl && { websiteUrl: data.websiteUrl }),
          ...(data.userNotes !== undefined && { userNotes: data.userNotes }),
          updatedAt: new Date(),
        })
        .where(eq(competitors.id, competitorId))
        .returning();

      res.json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      console.error(`Failed to update competitor ${competitorId}:`, err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update competitor' },
      });
    }
  }
);

// POST /api/competitors - Add competitor manually
router.post(
  '/competitor',
  async (req: WorkspaceRequest, res: Response): Promise<void> => {
    const workspaceId = req.workspace!.id;

    const parseResult = createManualCompetitorSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid competitor data', details: parseResult.error.format() },
      });
      return;
    }

    const data = parseResult.data;

    try {
      // Verify business belongs to workspace
      const [biz] = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.id, data.businessId), eq(businesses.workspaceId, workspaceId)))
        .limit(1);

      if (!biz) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Business not found in your workspace' },
        });
        return;
      }

      let domain = '';
      try {
        domain = new URL(data.websiteUrl).hostname.replace(/^www\./, '');
      } catch {
        domain = data.name.toLowerCase().replace(/\s+/g, '') + '.com';
      }

      const [created] = await db
        .insert(competitors)
        .values({
          businessId: data.businessId,
          name: data.name,
          domain,
          websiteUrl: data.websiteUrl,
          category: data.category || biz.industry,
          competitorType: data.competitorType,
          confidenceScore: 100.0,
          status: 'confirmed',
          userNotes: data.userNotes,
        })
        .returning();

      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err: any) {
      console.error('Failed to add manual competitor:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create competitor' },
      });
    }
  }
);

// DELETE /api/competitors/:id - Remove competitor
router.delete(
  '/competitor/:id',
  async (req: WorkspaceRequest, res: Response): Promise<void> => {
    const competitorId = String(req.params.id);
    const workspaceId = req.workspace!.id;

    try {
      // Verify workspace ownership
      const [existing] = await db
        .select({
          competitor: competitors,
        })
        .from(competitors)
        .innerJoin(businesses, eq(competitors.businessId, businesses.id))
        .where(and(eq(competitors.id, competitorId), eq(businesses.workspaceId, workspaceId)))
        .limit(1);

      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Competitor not found' },
        });
        return;
      }

      await db.delete(competitors).where(eq(competitors.id, competitorId));

      res.json({
        success: true,
        message: 'Competitor removed successfully',
      });
    } catch (err: any) {
      console.error(`Failed to delete competitor ${competitorId}:`, err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete competitor' },
      });
    }
  }
);

export default router;
