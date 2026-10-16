import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../db/database';
import { User, UserRole } from '../types/index.ts';

export interface AuthRequest extends Request {
  user?: User;
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const cookieToken = req.cookies?.[config.cookieName];
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : undefined;

  const token = bearerToken || cookieToken || queryToken;

  if (!token) {
    req.user = undefined;
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    const user = await db.findUserById(payload.userId);
    if (!user || user.accountStatus !== 'active') {
      req.user = undefined;
    } else {
      req.user = user;
    }
  } catch (err) {
    req.user = undefined;
  }

  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication is required to access this resource.',
    });
    return;
  }
  next();
}

export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication is required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}].`,
      });
      return;
    }

    next();
  };
}
