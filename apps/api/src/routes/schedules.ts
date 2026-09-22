import { Router, Response } from 'express';
import { z } from 'zod';
import { db, workspaces, businesses, notifications } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';
import { WorkspaceRequest } from '../middleware/workspace.js';
import {
  scheduleWorkspaceResearch,
  triggerImmediateRefresh,
  removeWorkspaceRepeatableJobs,
} from '../jobs/scheduler.js';
import { getRecentJobs, researchQueue } from '../jobs/queues.js';

const router = Router();

const updateScheduleSchema = z.object({
  refreshCadence: z.enum(['daily', 'weekly', 'monthly', 'manual']),
  notificationEmail: z.string().email().optional().or(z.literal('')),
  staleDaysThreshold: z.number().int().min(1).max(90).default(7),
});

// GET /api/workspaces/me/schedule - Retrieve current schedule settings
router.get('/', async (req: WorkspaceRequest, res: Response): Promise<void> => {
  const workspaceId = req.workspace?.id;
  if (!workspaceId) {
    res.status(400).json({
      success: false,
      error: { code: 'NO_WORKSPACE', message: 'No active workspace found' },
    });
    return;
  }

  try {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
      return;
    }

    const [primaryBiz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.workspaceId, workspaceId))
      .limit(1);

    // Check next scheduled run from BullMQ
    const repeatableJobs = await researchQueue.getRepeatableJobs();
    const wsRepeatable = repeatableJobs.find(
      (j) => j.id?.includes(workspaceId) || j.key.includes(workspaceId)
    );

    res.json({
      success: true,
      data: {
        workspaceId,
        refreshCadence: workspace.refreshCadence || 'weekly',
        notificationEmail: workspace.notificationEmail || null,
        staleDaysThreshold: workspace.staleDaysThreshold || 7,
        lastScheduledRunAt: workspace.lastScheduledRunAt,
        nextRunAt: wsRepeatable && wsRepeatable.next ? new Date(wsRepeatable.next).toISOString() : null,
        cronPattern: wsRepeatable ? wsRepeatable.pattern : null,
        primaryBusiness: primaryBiz
          ? {
              id: primaryBiz.id,
              name: primaryBiz.name,
              dataStale: primaryBiz.dataStale,
              lastAnalyzedAt: primaryBiz.lastAnalyzedAt,
            }
          : null,
      },
    });
  } catch (err: any) {
    console.error('Failed to get schedule settings:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve schedule' },
    });
  }
});

// PUT /api/workspaces/me/schedule - Update schedule & notification settings
router.put('/', async (req: WorkspaceRequest, res: Response): Promise<void> => {
  const workspaceId = req.workspace?.id;
  if (!workspaceId) {
    res.status(400).json({
      success: false,
      error: { code: 'NO_WORKSPACE', message: 'No active workspace found' },
    });
    return;
  }

  const parseResult = updateScheduleSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid schedule parameters',
        details: parseResult.error.format(),
      },
    });
    return;
  }

  const { refreshCadence, notificationEmail, staleDaysThreshold } = parseResult.data;

  try {
    // 1. Update database
    const [updatedWorkspace] = await db
      .update(workspaces)
      .set({
        refreshCadence,
        notificationEmail: notificationEmail || null,
        staleDaysThreshold,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    // 2. Synchronize BullMQ repeatable job
    const [primaryBiz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.workspaceId, workspaceId))
      .limit(1);

    let scheduleStatus = { scheduled: false };
    if (primaryBiz) {
      scheduleStatus = await scheduleWorkspaceResearch({
        workspaceId,
        cadence: refreshCadence,
        businessId: primaryBiz.id,
      });
    }

    res.json({
      success: true,
      data: {
        refreshCadence: updatedWorkspace.refreshCadence,
        notificationEmail: updatedWorkspace.notificationEmail,
        staleDaysThreshold: updatedWorkspace.staleDaysThreshold,
        scheduleStatus,
      },
    });
  } catch (err: any) {
    console.error('Failed to update schedule:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to save schedule settings' },
    });
  }
});

// POST /api/workspaces/me/schedule/trigger - Trigger immediate refresh run
router.post('/trigger', async (req: WorkspaceRequest, res: Response): Promise<void> => {
  const workspaceId = req.workspace?.id;
  if (!workspaceId) {
    res.status(400).json({
      success: false,
      error: { code: 'NO_WORKSPACE', message: 'No active workspace found' },
    });
    return;
  }

  try {
    const [primaryBiz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.workspaceId, workspaceId))
      .limit(1);

    if (!primaryBiz) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No business found in workspace to refresh' },
      });
      return;
    }

    const result = await triggerImmediateRefresh({
      workspaceId,
      businessId: primaryBiz.id,
    });

    res.json({
      success: true,
      data: {
        message: `Immediate refresh enqueued for "${primaryBiz.name}"`,
        ...result,
      },
    });
  } catch (err: any) {
    console.error('Failed to trigger refresh:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to trigger refresh' },
    });
  }
});

// GET /api/workspaces/me/jobs - List recent and failed jobs with error reasons
router.get('/jobs', async (req: WorkspaceRequest, res: Response): Promise<void> => {
  const workspaceId = req.workspace?.id;
  if (!workspaceId) {
    res.status(400).json({
      success: false,
      error: { code: 'NO_WORKSPACE', message: 'No active workspace found' },
    });
    return;
  }

  try {
    const jobs = await getRecentJobs(workspaceId);
    res.json({
      success: true,
      data: jobs,
    });
  } catch (err: any) {
    console.error('Failed to fetch job history:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve jobs' },
    });
  }
});

// GET /api/workspaces/me/notifications - List sent notification history
router.get('/notifications', async (req: WorkspaceRequest, res: Response): Promise<void> => {
  const workspaceId = req.workspace?.id;
  if (!workspaceId) {
    res.status(400).json({
      success: false,
      error: { code: 'NO_WORKSPACE', message: 'No active workspace found' },
    });
    return;
  }

  try {
    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.workspaceId, workspaceId))
      .orderBy(desc(notifications.sentAt))
      .limit(50);

    res.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch notifications' },
    });
  }
});

export default router;
