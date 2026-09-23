import { eq, and, desc, gte, inArray } from 'drizzle-orm';
import {
  db,
  businesses,
  workspaces,
  keywords,
  rankingObservations,
  competitors,
  marketAlerts,
  reviewThemes,
  searchResults,
} from '../db/index.js';
import { NotificationService } from './notification.service.js';

export interface ShiftAlertCandidate {
  type: '3pack_displacement' | 'review_spike' | 'competitor_ads' | 'critical_rank_drop';
  severity: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  details?: Record<string, any>;
}

export class MarketShiftService {
  /**
   * Scans a business's live SERP, rankings, and competitor data to detect emergency market shifts.
   */
  static async analyzeBusiness(businessId: string): Promise<number> {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) return 0;

    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, biz.workspaceId))
      .limit(1);

    const candidates: ShiftAlertCandidate[] = [];

    // 1. Analyze 3-Pack Displacement & Critical Ranking Drops
    const bizKeywords = await db
      .select()
      .from(keywords)
      .where(eq(keywords.businessId, businessId));

    for (const kw of bizKeywords) {
      const recentObs = await db
        .select()
        .from(rankingObservations)
        .where(eq(rankingObservations.keywordId, kw.id))
        .orderBy(desc(rankingObservations.observedAt))
        .limit(2);

      if (recentObs.length >= 2) {
        const curr = recentObs[0].rank;
        const prev = recentObs[1].rank;

        // Displaced from Local 3-Pack (was #1-#3, now #4+)
        if (prev !== null && prev <= 3 && curr !== null && curr > 3) {
          candidates.push({
            type: '3pack_displacement',
            severity: 'critical',
            title: `Lost Google 3-Pack Visibility for "${kw.phrase}"`,
            description: `Your business slipped from rank #${prev} to #${curr}, falling outside Google's high-conversion 3-Pack. A local competitor has captured prime local search share.`,
            details: {
              keyword: kw.phrase,
              previousRank: prev,
              currentRank: curr,
            },
          });
        } else if (prev !== null && curr !== null && curr - prev >= 3) {
          // Sharp rank drop of 3 or more spots
          candidates.push({
            type: 'critical_rank_drop',
            severity: 'high',
            title: `Sharp Rank Drop: "${kw.phrase}" (fell ${curr - prev} spots)`,
            description: `Search ranking fell from #${prev} to #${curr}. Aggressive competitor optimization or SERP feature shifts detected.`,
            details: {
              keyword: kw.phrase,
              previousRank: prev,
              currentRank: curr,
              drop: curr - prev,
            },
          });
        }
      }
    }

    // 2. Check for Competitor Sponsored Ads Over Core Keywords
    const competitorList = await db
      .select()
      .from(competitors)
      .where(eq(competitors.businessId, businessId));

    for (const comp of competitorList) {
      if (comp.metadata && (comp.metadata as any).sponsoredActivity) {
        const adKeywords = (comp.metadata as any).adQueries || [];
        if (adKeywords.length > 0) {
          candidates.push({
            type: 'competitor_ads',
            severity: 'high',
            title: `Competitor Paid Ad Blitz: ${comp.name}`,
            description: `${comp.name} is aggressively bidding on Google Ads for queries: ${adKeywords.slice(0, 3).map((q: string) => `"${q}"`).join(', ')}, intercepting buyer traffic above organic results.`,
            details: {
              competitorName: comp.name,
              competitorDomain: comp.domain,
              adQueries: adKeywords,
            },
          });
        }
      }
    }

    // 3. Check for Negative Review Sentiment Spikes across local rivals
    const compIds = competitorList.map((c) => c.id);
    if (compIds.length > 0) {
      const negativeThemes = await db
        .select()
        .from(reviewThemes)
        .where(and(inArray(reviewThemes.competitorId, compIds), eq(reviewThemes.sentiment, 'negative')));

      const totalNegFrequency = negativeThemes.reduce((acc, t) => acc + (t.frequency || 0), 0);
      if (totalNegFrequency >= 3) {
        const topThemes = negativeThemes.slice(0, 2).map((t) => t.theme);
        candidates.push({
          type: 'review_spike',
          severity: 'critical',
          title: `Competitor Review Weakness Opportunity (${totalNegFrequency} negative mentions)`,
          description: `Rival clinics are facing customer backlash around: ${topThemes.join(', ')}. Capitalize on this sentiment void in your marketing copy and service guarantees.`,
          details: {
            themes: topThemes,
            frequency: totalNegFrequency,
          },
        });
      }
    }

    // Persist alerts with 24-hour deduplication
    let createdCount = 0;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const cand of candidates) {
      const existing = await db
        .select()
        .from(marketAlerts)
        .where(
          and(
            eq(marketAlerts.businessId, businessId),
            eq(marketAlerts.type, cand.type),
            eq(marketAlerts.title, cand.title),
            gte(marketAlerts.detectedAt, oneDayAgo)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        const [newAlert] = await db
          .insert(marketAlerts)
          .values({
            businessId,
            type: cand.type,
            severity: cand.severity,
            title: cand.title,
            description: cand.description,
            details: cand.details,
            dismissed: false,
            detectedAt: new Date(),
          })
          .returning();

        createdCount++;

        // Dispatch email notification for critical alerts
        if (cand.severity === 'critical') {
          const recipient = ws?.notificationEmail || 'owner@example.com';
          NotificationService.sendMarketAlertNotification({
            workspaceId: biz.workspaceId,
            businessId,
            businessName: biz.name,
            alertTitle: cand.title,
            alertDescription: cand.description,
            severity: cand.severity,
            recipientEmail: recipient,
          }).catch((err) => {
            console.warn(`[MarketShiftService] Failed to dispatch alert notification:`, err);
          });
        }
      }
    }

    return createdCount;
  }

  /**
   * Fetches active (non-dismissed) market alerts for a business.
   */
  static async getActiveAlerts(businessId: string) {
    return await db
      .select()
      .from(marketAlerts)
      .where(and(eq(marketAlerts.businessId, businessId), eq(marketAlerts.dismissed, false)))
      .orderBy(desc(marketAlerts.detectedAt));
  }

  /**
   * Dismisses an alert by ID.
   */
  static async dismissAlert(alertId: string, businessId: string) {
    return await db
      .update(marketAlerts)
      .set({ dismissed: true })
      .where(and(eq(marketAlerts.id, alertId), eq(marketAlerts.businessId, businessId)))
      .returning();
  }
}
