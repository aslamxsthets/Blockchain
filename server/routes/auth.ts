import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db/database';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const demoAccounts = {
  admin: 'admin@apex.edu',
  issuer: 'issuer@apex.edu',
  student1: 'alex.chen@student.apex.edu',
  student2: 'maria.santos@student.apex.edu',
};

function generateAndSetToken(res: Response, userId: string, role: string) {
  const token = jwt.sign({ userId, role }, config.jwtSecret, {
    expiresIn: '7d',
  } as jwt.SignOptions);

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  return token;
}

// POST /api/v1/auth/login
authRouter.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.format(),
      });
      return;
    }

    const { email, password } = parseResult.data;
    const user = await db.findUserByEmail(email);

    if (!user) {
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
      return;
    }

    if (user.accountStatus !== 'active') {
      res.status(403).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been deactivated or suspended.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
      return;
    }

    const token = generateAndSetToken(res, user.id, user.role);

    await db.logAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'LOGIN',
      targetRecord: user.id,
      correlationId: `AUTH-${Date.now()}`,
      metadata: { ip: req.ip, userAgent: req.headers['user-agent'] },
    });

    const institution = user.institutionId ? await db.getInstitutionById(user.institutionId) : undefined;

    res.json({
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionId: user.institutionId,
        studentId: user.studentId,
        institution: institution ? {
          id: institution.id,
          name: institution.name,
          code: institution.code,
          domain: institution.officialDomain,
        } : undefined,
      },
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'An internal error occurred during login.' });
  }
});

// POST /api/v1/auth/demo-login (quick switcher for demo presentation)
authRouter.post('/demo-login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.body as { role: keyof typeof demoAccounts };
    const email = demoAccounts[role];

    if (!email) {
      res.status(400).json({ error: 'INVALID_DEMO_ROLE', message: 'Role must be admin, issuer, student1, or student2.' });
      return;
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Demo user account not found in database.' });
      return;
    }

    const token = generateAndSetToken(res, user.id, user.role);
    const institution = user.institutionId ? await db.getInstitutionById(user.institutionId) : undefined;

    res.json({
      message: `Switched to demo role: ${user.name} (${user.role})`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionId: user.institutionId,
        studentId: user.studentId,
        institution: institution ? {
          id: institution.id,
          name: institution.name,
          code: institution.code,
          domain: institution.officialDomain,
        } : undefined,
      },
    });
  } catch (err: any) {
    console.error('[Auth] Demo login error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Internal server error.' });
  }
});

// GET /api/v1/auth/me
authRouter.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.json({ authenticated: false, user: null });
    return;
  }

  const institution = req.user.institutionId ? await db.getInstitutionById(req.user.institutionId) : undefined;

  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      institutionId: req.user.institutionId,
      studentId: req.user.studentId,
      institution: institution ? {
        id: institution.id,
        name: institution.name,
        code: institution.code,
        domain: institution.officialDomain,
      } : undefined,
    },
  });
});

// POST /api/v1/auth/logout
authRouter.post('/logout', (req: AuthRequest, res: Response): void => {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    path: '/',
  });
  res.json({ message: 'Logged out successfully' });
});
