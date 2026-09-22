import { Response, NextFunction } from 'express';
import { WorkspaceRequest } from './workspace.js';

export function enforceQuota(req: WorkspaceRequest, res: Response, next: NextFunction): void {
  const workspace = req.workspace;
  if (!workspace) {
    res.status(403).json({
      success: false,
      error: { code: 'NO_WORKSPACE', message: 'Workspace context is required' },
    });
    return;
  }

  if (workspace.usedQuota >= workspace.monthlyQuota) {
    res.set('Retry-After', '86400');
    res.status(429).json({
      success: false,
      error: {
        code: 'QUOTA_EXCEEDED',
        message: `Monthly quota of ${workspace.monthlyQuota} search units exceeded. Used: ${workspace.usedQuota}. Upgrade plan or wait for the next monthly cycle.`,
      },
    });
    return;
  }

  next();
}
