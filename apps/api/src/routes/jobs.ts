import { Router, Response } from 'express';
import { allQueues } from '../jobs/queues.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/jobs/:id - Check status of an asynchronous job across all BullMQ queues
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const jobId = String(req.params.id);

  try {
    let job = null;
    let foundQueue = null;

    for (const q of allQueues) {
      const found = await q.getJob(jobId);
      if (found) {
        job = found;
        foundQueue = q.name;
        break;
      }
    }

    if (!job) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Job ${jobId} not found` },
      });
      return;
    }

    const state = await job.getState();
    const isCompleted = state === 'completed';
    const isFailed = state === 'failed';

    res.json({
      success: true,
      data: {
        id: job.id,
        name: job.name,
        state,
        progress: job.progress,
        isCompleted,
        isFailed,
        failedReason: job.failedReason,
        result: isCompleted ? job.returnvalue : undefined,
      },
    });
  } catch (err) {
    console.error(`Failed to fetch job ${jobId}:`, err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to inspect job' },
    });
  }
});

export default router;
