import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import {
  db,
  businesses,
  businessLocations,
  services,
} from '../db/index.js';
import { WorkspaceRequest } from '../middleware/workspace.js';
import { websiteAnalysisQueue } from '../jobs/queues.js';

const router = Router();

// URL validation schema with safe protocol enforcement
const safeUrlSchema = z
  .string()
  .url('Must be a valid URL')
  .refine((url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'URL must use http or https protocol');

const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  websiteUrl: safeUrlSchema,
  industry: z.string().optional(),
  description: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  serviceArea: z.string().optional(),
  primaryGoal: z.string().optional(),
  timezone: z.string().optional(),
  locations: z
    .array(
      z.object({
        name: z.string().min(1, 'Location name required'),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        radius: z.number().optional(),
        mapsProfileUrl: z.string().url().optional().or(z.literal('')),
      })
    )
    .optional(),
  services: z
    .array(
      z.object({
        name: z.string().min(1, 'Service name required'),
        description: z.string().optional(),
        priority: z.number().default(1),
      })
    )
    .optional(),
});

const updateBusinessSchema = createBusinessSchema.partial();

// POST /api/businesses - Create a business in active workspace
router.post('/', async (req: WorkspaceRequest, res: Response): Promise<void> => {
  const workspace = req.workspace;
  if (!workspace) {
    res.status(403).json({ success: false, error: { code: 'NO_WORKSPACE', message: 'Workspace required' } });
    return;
  }

  const parseResult = createBusinessSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid business data', details: parseResult.error.format() },
    });
    return;
  }

  const data = parseResult.data;

  try {
    const [newBusiness] = await db
      .insert(businesses)
      .values({
        workspaceId: workspace.id,
        name: data.name,
        websiteUrl: data.websiteUrl,
        industry: data.industry,
        description: data.description,
        country: data.country,
        city: data.city,
        serviceArea: data.serviceArea,
        primaryGoal: data.primaryGoal,
        timezone: data.timezone || workspace.timezone,
      })
      .returning();

    // Insert locations if provided
    let insertedLocations: unknown[] = [];
    if (data.locations && data.locations.length > 0) {
      insertedLocations = await db
        .insert(businessLocations)
        .values(
          data.locations.map((loc) => ({
            businessId: newBusiness.id,
            name: loc.name,
            address: loc.address,
            city: loc.city || data.city,
            country: loc.country || data.country,
            radius: loc.radius,
            mapsProfileUrl: loc.mapsProfileUrl || undefined,
          }))
        )
        .returning();
    }

    // Insert services if provided
    let insertedServices: unknown[] = [];
    if (data.services && data.services.length > 0) {
      insertedServices = await db
        .insert(services)
        .values(
          data.services.map((svc, index) => ({
            businessId: newBusiness.id,
            name: svc.name,
            description: svc.description,
            priority: svc.priority || index + 1,
          }))
        )
        .returning();
    }

    res.status(201).json({
      success: true,
      data: {
        ...newBusiness,
        locations: insertedLocations,
        services: insertedServices,
      },
    });
  } catch (err) {
    console.error('Failed to create business:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not create business profile' },
    });
  }
});

// GET /api/businesses - List all businesses in active workspace
router.get('/', async (req: WorkspaceRequest, res: Response): Promise<void> => {
  const workspace = req.workspace;
  if (!workspace) {
    res.status(403).json({ success: false, error: { code: 'NO_WORKSPACE', message: 'Workspace required' } });
    return;
  }

  try {
    const list = await db
      .select()
      .from(businesses)
      .where(eq(businesses.workspaceId, workspace.id));

    res.json({
      success: true,
      data: list,
    });
  } catch (err) {
    console.error('Failed to list businesses:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not fetch businesses' },
    });
  }
});

// GET /api/businesses/:id - Get detailed business info with locations and services
router.get('/:id', async (req: WorkspaceRequest, res: Response): Promise<void> => {
  const workspace = req.workspace;
  const businessId = String(req.params.id);

  try {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.workspaceId, workspace!.id)))
      .limit(1);

    if (!biz) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Business not found in this workspace' },
      });
      return;
    }

    const locs = await db
      .select()
      .from(businessLocations)
      .where(eq(businessLocations.businessId, businessId));

    const svcs = await db
      .select()
      .from(services)
      .where(eq(services.businessId, businessId));

    res.json({
      success: true,
      data: {
        ...biz,
        locations: locs,
        services: svcs,
      },
    });
  } catch (err) {
    console.error('Failed to fetch business details:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not fetch business' },
    });
  }
});

// PATCH /api/businesses/:id - Update business
router.patch('/:id', async (req: WorkspaceRequest, res: Response): Promise<void> => {
  const workspace = req.workspace;
  const businessId = String(req.params.id);

  const parseResult = updateBusinessSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid update data', details: parseResult.error.format() },
    });
    return;
  }

  const data = parseResult.data;

  try {
    const [updated] = await db
      .update(businesses)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.websiteUrl && { websiteUrl: data.websiteUrl }),
        ...(data.industry !== undefined && { industry: data.industry }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.serviceArea !== undefined && { serviceArea: data.serviceArea }),
        ...(data.primaryGoal !== undefined && { primaryGoal: data.primaryGoal }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        updatedAt: new Date(),
      })
      .where(and(eq(businesses.id, businessId), eq(businesses.workspaceId, workspace!.id)))
      .returning();

    if (!updated) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Business not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error('Failed to update business:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not update business' },
    });
  }
});

// DELETE /api/businesses/:id - Delete business
router.delete('/:id', async (req: WorkspaceRequest, res: Response): Promise<void> => {
  const workspace = req.workspace;
  const businessId = String(req.params.id);

  try {
    const deleted = await db
      .delete(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.workspaceId, workspace!.id)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Business not found' },
      });
      return;
    }

    res.json({
      success: true,
      message: 'Business deleted successfully',
    });
  } catch (err) {
    console.error('Failed to delete business:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Could not delete business' },
    });
  }
});

// POST /api/businesses/:id/analyze - Trigger async website analysis
router.post('/:id/analyze', async (req: WorkspaceRequest, res: Response): Promise<void> => {
  const workspace = req.workspace;
  const businessId = String(req.params.id);

  try {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.workspaceId, workspace!.id)))
      .limit(1);

    if (!biz) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Business not found in this workspace' },
      });
      return;
    }

    // Add job to BullMQ queue
    const job = await websiteAnalysisQueue.add('analyze-website', {
      businessId: biz.id,
    });

    res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        businessId: biz.id,
        status: 'queued',
        websiteUrl: biz.websiteUrl,
      },
    });
  } catch (err) {
    console.error('Failed to enqueue website analysis job:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to schedule website analysis' },
    });
  }
});

export default router;
