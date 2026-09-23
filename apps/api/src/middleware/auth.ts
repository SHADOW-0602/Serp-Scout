import { Request, Response, NextFunction } from 'express';
import { getAuth, requireAuth } from '@clerk/express';

export interface AuthenticatedRequest extends Request {
  _parsedAuth?: {
    userId: string;
    sessionId?: string;
  };
  // Keep auth for backwards compat — will be the original Clerk function
  auth?: any;
}

export { requireAuth };

export function requireAuthenticatedUser(req: Request, res: Response, next: NextFunction) {
  // Idempotency: if already authenticated by an earlier middleware run, skip
  const existingAuth = (req as AuthenticatedRequest)._parsedAuth;
  if (existingAuth?.userId) {
    return next();
  }

  let auth: any = null;
  try {
    // getAuth() internally calls req.auth() — which is Clerk's callable function
    auth = getAuth(req);
  } catch (err: any) {
    console.error('getAuth() failed:', err.message);
  }

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

  // Store parsed auth in a separate property — never overwrite req.auth
  (req as AuthenticatedRequest)._parsedAuth = {
    userId: auth.userId,
    sessionId: auth.sessionId || undefined,
  };

  next();
}
