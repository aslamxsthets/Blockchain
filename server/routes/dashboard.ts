import { Router, Response } from 'express';
import { db } from '../db/database';
import { AuthRequest, requireAuth, requireRoles } from '../middleware/auth';
import { blockchainService } from '../services/blockchainService';

export const dashboardRouter = Router();

// GET /api/v1/dashboard/stats
dashboardRouter.get(
  '/stats',
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const isStudent = user.role === 'student';

      const allCerts = isStudent
        ? await db.getAllCertificates({ studentUserId: user.id, studentId: user.studentId })
        : await db.getAllCertificates({ institutionId: user.institutionId });

      const issuedCount = allCerts.filter(c => c.issuanceState === 'issued').length;
      const revokedCount = allCerts.filter(c => c.issuanceState === 'revoked').length;
      const pendingCount = allCerts.filter(c => c.issuanceState === 'pending').length;
      const totalCount = allCerts.length;

      const verificationEvents = await db.getVerificationEvents(50);
      const auditEvents = isStudent ? [] : await db.getAuditEvents(25);

      let blockchainStatus = null;
      try {
        blockchainStatus = await blockchainService.getNetworkStatus();
      } catch (e) {
        // blockchain status fallback
      }

      // Compute status distribution for charts
      const departmentDistribution: Record<string, number> = {};
      allCerts.forEach(c => {
        departmentDistribution[c.department] = (departmentDistribution[c.department] || 0) + 1;
      });

      const departmentData = Object.entries(departmentDistribution).map(([name, count]) => ({
        name,
        count,
      }));

      res.json({
        stats: {
          totalCertificates: totalCount,
          activeIssued: issuedCount,
          revokedCount,
          pendingCount,
          verificationChecks: verificationEvents.length,
        },
        departmentDistribution: departmentData,
        blockchainStatus,
        recentActivity: {
          verifications: verificationEvents.slice(0, 10),
          audits: auditEvents.slice(0, 10),
        },
      });
    } catch (err: any) {
      console.error('[Dashboard] Stats error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
);

// GET /api/v1/dashboard/audit-events
dashboardRouter.get(
  '/audit-events',
  requireAuth,
  requireRoles(['admin', 'issuer']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const events = await db.getAuditEvents(100);
      res.json({ events });
    } catch (err: any) {
      console.error('[Dashboard] Audit events error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
);

// GET /api/v1/dashboard/verification-events
dashboardRouter.get(
  '/verification-events',
  requireAuth,
  requireRoles(['admin', 'issuer']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const events = await db.getVerificationEvents(100);
      res.json({ events });
    } catch (err: any) {
      console.error('[Dashboard] Verification events error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
);
