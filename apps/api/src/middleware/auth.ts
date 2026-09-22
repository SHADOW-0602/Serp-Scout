import { Request, Response, NextFunction } from 'express';
import { getAuth, requireAuth } from '@clerk/express';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    sessionId?: string;
  };
}

export { requireAuth };

export function requireAuthenticatedUser(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please provide a valid Clerk session token.',
      },
    });
    return;
  }

  (req as AuthenticatedRequest).auth = {
    userId: auth.userId,
    sessionId: auth.sessionId || undefined,
  };

  next();
}
