import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, workspaces, users } from '../db/index.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
  timezone: z.string().default('UTC'),
  userName: z.string().default('Workspace Owner'),
  userEmail: z.string().email().optional(),
  plan: z.enum(['starter', 'pro', 'agency']).optional().default('pro'),
});

// POST /api/workspaces - Create a new workspace
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = (req as any)._parsedAuth?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User ID missing' } });
    return;
  }

  const parseResult = createWorkspaceSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parseResult.error.format() },
    });
    return;
  }

  const { name, timezone, userName, userEmail, plan } = parseResult.data;

  // Plan quota and schedule configuration
  const planConfigs = {
    starter: { monthlyQuota: 250, refreshCadence: 'weekly' },
    pro: { monthlyQuota: 1000, refreshCadence: 'daily' },
    agency: { monthlyQuota: 5000, refreshCadence: 'daily' },
  } as const;
  const config = planConfigs[plan] || planConfigs.pro;

  try {
    // 1. Create workspace
    const [newWs] = await db
      .insert(workspaces)
      .values({
        name,
        ownerId: userId,
        timezone,
        monthlyQuota: config.monthlyQuota,
        usedQuota: 0,
        refreshCadence: config.refreshCadence,
      })
      .returning();

    // 2. Link user as owner
    await db
      .insert(users)
      .values({
        id: userId,
        workspaceId: newWs.id,
        name: userName,
        email: userEmail || `${userId}@user.clerk`,
        role: 'owner',
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          workspaceId: newWs.id,
          name: userName,
          role: 'owner',
          updatedAt: new Date(),
        },
      });

    res.status(201).json({
      success: true,
      data: newWs,
    });
  } catch (err) {
    console.error('Failed to create workspace:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not create workspace' },
    });
  }
});

// GET /api/workspaces/me - Get current user's workspaces
router.get('/me', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = (req as any)._parsedAuth?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User ID missing' } });
    return;
  }

  try {
    const userMemberships = await db
      .select({
        role: users.role,
        workspace: workspaces,
      })
      .from(users)
      .innerJoin(workspaces, eq(users.workspaceId, workspaces.id))
      .where(eq(users.id, userId));

    res.json({
      success: true,
      data: {
        workspaces: userMemberships.map((m) => ({
          ...m.workspace,
          role: m.role,
        })),
        activeWorkspace: userMemberships[0]
          ? { ...userMemberships[0].workspace, role: userMemberships[0].role }
          : null,
      },
    });
  } catch (err) {
    console.error('Failed to get workspaces:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not retrieve workspaces' },
    });
  }
});

// DELETE /api/workspaces/:id - Delete workspace (cascades all data)
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = (req as any)._parsedAuth?.userId;
  const workspaceId = String(req.params.id);

  if (!userId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User ID missing' } });
    return;
  }

  try {
    // Verify ownership
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

    if (workspace.ownerId !== userId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only workspace owners can delete this workspace' },
      });
      return;
    }

    // Cascade delete workspace in DB
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));

    res.json({
      success: true,
      data: { message: `Workspace ${workspace.name} and all associated data deleted.` },
    });
  } catch (err: any) {
    console.error('Failed to delete workspace:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete workspace' },
    });
  }
});

export default router;
