import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/database';
import { AuthRequest, requireAuth, requireRoles } from '../middleware/auth';
import { blockchainService } from '../services/blockchainService';

export const institutionsRouter = Router();

const createIssuerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  issuerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid 42-character Ethereum address').optional(),
});

// GET /api/v1/institutions/:id
institutionsRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const institution = await db.getInstitutionById(req.params.id);
    if (!institution) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Institution not found.' });
      return;
    }
    res.json({ institution });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/v1/issuers
institutionsRouter.get(
  '/issuers/list',
  requireAuth,
  requireRoles(['admin', 'issuer']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const allUsers = await db.getAllUsers();
      const issuers = allUsers
        .filter(u => u.role === 'issuer' || u.role === 'admin')
        .map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          accountStatus: u.accountStatus,
          createdAt: u.createdAt,
        }));

      const institution = req.user!.institutionId ? await db.getInstitutionById(req.user!.institutionId) : undefined;

      res.json({
        issuers,
        authorizedBlockchainAddresses: institution?.authorizedIssuerAddresses || [],
      });
    } catch (err: any) {
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
);

// POST /api/v1/issuers
institutionsRouter.post(
  '/issuers/create',
  requireAuth,
  requireRoles(['admin']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parseResult = createIssuerSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          details: parseResult.error.format(),
        });
        return;
      }

      const { name, email, password, issuerAddress } = parseResult.data;
      const currentUser = req.user!;

      const existing = await db.findUserByEmail(email);
      if (existing) {
        res.status(400).json({ error: 'USER_EXISTS', message: 'A user with this email address already exists.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await db.createUser({
        id: `USER-ISSUER-${Date.now()}`,
        name,
        email,
        passwordHash,
        role: 'issuer',
        accountStatus: 'active',
        institutionId: currentUser.institutionId,
      });

      // If Ethereum address is provided, authorize on smart contract
      if (issuerAddress && currentUser.institutionId) {
        try {
          await blockchainService.authorizeIssuer(issuerAddress, currentUser.institutionId);
          const inst = await db.getInstitutionById(currentUser.institutionId);
          if (inst) {
            await db.updateInstitution(inst.id, {
              authorizedIssuerAddresses: [...inst.authorizedIssuerAddresses, issuerAddress],
            });
          }
        } catch (bcErr) {
          console.error('[Institutions] On-chain authorization failed:', bcErr);
        }
      }

      await db.logAuditEvent({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'ISSUER_AUTHORIZED',
        targetRecord: newUser.id,
        correlationId: `AUTH-ISSUER-${Date.now()}`,
        metadata: { issuerName: name, email, issuerAddress },
      });

      res.status(201).json({
        message: 'Authorized issuer created successfully.',
        issuer: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
);
