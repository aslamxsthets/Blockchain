import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/database';
import { AuthRequest, requireAuth, requireRoles } from '../middleware/auth';
import { blockchainService } from '../services/blockchainService';
import {
  createCanonicalData,
  computeCanonicalFingerprint,
  generateCertificateId,
} from '../services/cryptoService';
import { generateCertificatePdf, generateCertificateQRCode } from '../services/pdfService';
import { Certificate } from '../types/index.ts';

export const certificatesRouter = Router();

const issueCertificateSchema = z.object({
  studentId: z.string().min(2, 'Student ID is required'),
  studentName: z.string().min(2, 'Student Name is required'),
  degreeName: z.string().min(2, 'Degree / Credential name is required'),
  department: z.string().min(2, 'Department / Faculty is required'),
  graduationYear: z.coerce.number().min(1950).max(2050),
  gradeClassification: z.string().min(2, 'Classification or grade is required'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issue date must be in YYYY-MM-DD format'),
  studentEmail: z.string().email().optional(),
});

const revokeSchema = z.object({
  reason: z.string().min(5, 'A detailed revocation reason is required (minimum 5 characters)'),
});

// POST /api/v1/certificates (Issue credential)
certificatesRouter.post(
  '/',
  requireAuth,
  requireRoles(['admin', 'issuer']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parseResult = issueCertificateSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          details: parseResult.error.format(),
        });
        return;
      }

      const input = parseResult.data;
      const currentUser = req.user!;
      const institution = currentUser.institutionId
        ? await db.getInstitutionById(currentUser.institutionId)
        : (await db.getAllInstitutions())[0];

      if (!institution) {
        res.status(400).json({
          error: 'NO_INSTITUTION',
          message: 'The current issuer is not associated with an authorized institution.',
        });
        return;
      }

      // Find matching student account if exists
      const studentAccount = input.studentEmail
        ? await db.findUserByEmail(input.studentEmail)
        : (await db.getAllUsers()).find(u => u.studentId === input.studentId);

      // 1. Generate unique predictable certificate ID
      const certificateId = generateCertificateId(institution.code);

      // 2. Build canonical representation
      const canonical = createCanonicalData({
        certificateId,
        studentId: input.studentId,
        studentName: input.studentName,
        institutionId: institution.id,
        degreeName: input.degreeName,
        department: input.department,
        graduationYear: input.graduationYear,
        gradeClassification: input.gradeClassification,
        issueDate: input.issueDate,
      });

      // 3. Compute SHA-256 fingerprint
      const fingerprint = computeCanonicalFingerprint(canonical);

      // 4. Initial pending certificate record
      const now = new Date().toISOString();
      const qrCodeDataUrl = await generateCertificateQRCode(certificateId);

      const pendingRecord: Certificate = {
        id: certificateId,
        studentId: input.studentId,
        studentName: input.studentName,
        studentUserId: studentAccount?.id,
        issuerId: currentUser.id,
        issuerName: currentUser.name,
        institutionId: institution.id,
        institutionName: institution.name,
        degreeName: input.degreeName,
        department: input.department,
        graduationYear: input.graduationYear,
        gradeClassification: input.gradeClassification,
        issueDate: input.issueDate,
        canonicalVersion: '1.0.0',
        fingerprintAlgorithm: 'SHA-256',
        fingerprint,
        issuanceState: 'pending',
        transactionHash: '',
        blockNumber: 0,
        blockchainNetwork: 'Local Devnet (Chain ID: 31337)',
        contractAddress: await blockchainService.getContractAddress(),
        issuedAt: now,
        qrCodeDataUrl,
        downloadCount: 0,
      };

      await db.createCertificate(pendingRecord);

      // 5. Submit to Ethereum smart contract
      try {
        const txResult = await blockchainService.registerCertificate(
          certificateId,
          fingerprint,
          institution.id
        );

        // Sign the certificate fingerprint using university registrar wallet
        let issuerSignature = '';
        let issuerSignerAddress = '';
        try {
          const signed = await blockchainService.signCertificateFingerprint(fingerprint);
          issuerSignature = signed.signature;
          issuerSignerAddress = signed.signerAddress;
        } catch (signErr) {
          console.warn('[Certificates] Signature generation warning:', signErr);
        }

        // 6. Update certificate to 'issued' with real tx details and digital signature
        const issuedRecord = await db.updateCertificate(certificateId, {
          issuanceState: 'issued',
          transactionHash: txResult.transactionHash,
          blockNumber: txResult.blockNumber,
          issuerSignature,
          issuerSignerAddress,
        });

        // 7. Audit log
        await db.logAuditEvent({
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: 'CERTIFICATE_ISSUED',
          targetRecord: certificateId,
          correlationId: `ISSUE-${Date.now()}`,
          transactionHash: txResult.transactionHash,
          metadata: {
            studentName: input.studentName,
            degreeName: input.degreeName,
            blockNumber: txResult.blockNumber,
          },
        });

        res.status(201).json({
          message: 'Certificate successfully issued and anchored on blockchain.',
          certificate: issuedRecord,
        });
      } catch (chainErr: any) {
        console.error('[Certificates] Blockchain anchoring failed:', chainErr);

        // Retain recoverable failed state
        await db.updateCertificate(certificateId, {
          issuanceState: 'failed',
        });

        res.status(502).json({
          error: 'BLOCKCHAIN_SUBMISSION_FAILED',
          message: 'The certificate was recorded locally but blockchain anchoring failed.',
          details: chainErr.message,
          certificateId,
        });
      }
    } catch (err: any) {
      console.error('[Certificates] Issuance error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
);

// GET /api/v1/certificates
certificatesRouter.get(
  '/',
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { search, state } = req.query as { search?: string; state?: string };

      let certs: Certificate[] = [];

      if (user.role === 'student') {
        // Students only see their own certificates!
        certs = await db.getAllCertificates({
          studentUserId: user.id,
          studentId: user.studentId,
          search,
          issuanceState: state,
        });
      } else {
        // Admin / Issuer sees institution's certificates
        certs = await db.getAllCertificates({
          institutionId: user.institutionId,
          search,
          issuanceState: state,
        });
      }

      res.json({
        total: certs.length,
        certificates: certs,
      });
    } catch (err: any) {
      console.error('[Certificates] Fetch error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
);

// GET /api/v1/certificates/:id
certificatesRouter.get(
  '/:id',
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const cert = await db.getCertificateById(req.params.id);
      if (!cert) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Certificate not found.' });
        return;
      }

      const user = req.user!;
      if (user.role === 'student') {
        if (cert.studentUserId !== user.id && cert.studentId !== user.studentId) {
          res.status(403).json({ error: 'FORBIDDEN', message: 'You do not have permission to view this certificate.' });
          return;
        }
      }

      // Also get on-chain proof if available
      let blockchainProof = null;
      try {
        blockchainProof = await blockchainService.getCertificateProof(cert.id);
      } catch (e) {
        // Blockchain proof optional or mock
      }

      res.json({
        certificate: cert,
        blockchainProof,
      });
    } catch (err: any) {
      console.error('[Certificates] Get error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
);

// GET /api/v1/certificates/:id/pdf
certificatesRouter.get(
  '/:id/pdf',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const cert = await db.getCertificateById(req.params.id);
      if (!cert) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Certificate not found.' });
        return;
      }

      const host = `${req.protocol}://${req.get('host')}`;
      const pdfBytes = await generateCertificatePdf(cert, host);

      // Increment download counter
      await db.updateCertificate(cert.id, {
        downloadCount: (cert.downloadCount || 0) + 1,
      });

      const filename = `${cert.id}_${cert.studentName.replace(/\s+/g, '_')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.send(Buffer.from(pdfBytes));
    } catch (err: any) {
      console.error('[Certificates] PDF generation error:', err);
      res.status(500).json({ error: 'PDF_GENERATION_FAILED', message: err.message });
    }
  }
);

// POST /api/v1/certificates/:id/revoke
certificatesRouter.post(
  '/:id/revoke',
  requireAuth,
  requireRoles(['admin', 'issuer']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parseResult = revokeSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          details: parseResult.error.format(),
        });
        return;
      }

      const cert = await db.getCertificateById(req.params.id);
      if (!cert) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Certificate not found.' });
        return;
      }

      if (cert.issuanceState === 'revoked') {
        res.status(400).json({ error: 'ALREADY_REVOKED', message: 'Certificate is already marked as revoked.' });
        return;
      }

      const { reason } = parseResult.data;
      const currentUser = req.user!;

      // 1. Submit on-chain revocation transaction
      const txResult = await blockchainService.revokeCertificate(cert.id, reason);

      // 2. Update database record
      const now = new Date().toISOString();
      const updated = await db.updateCertificate(cert.id, {
        issuanceState: 'revoked',
        revokedAt: now,
        revocationReason: reason,
        revokedBy: currentUser.name,
      });

      // 3. Log audit event
      await db.logAuditEvent({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'CERTIFICATE_REVOKED',
        targetRecord: cert.id,
        correlationId: `REVOKE-${Date.now()}`,
        transactionHash: txResult.transactionHash,
        metadata: {
          reason,
          blockNumber: txResult.blockNumber,
          studentName: cert.studentName,
        },
      });

      res.json({
        message: 'Certificate successfully revoked on blockchain.',
        certificate: updated,
        transactionHash: txResult.transactionHash,
        blockNumber: txResult.blockNumber,
      });
    } catch (err: any) {
      console.error('[Certificates] Revocation error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
);

// POST /api/v1/certificates/:id/simulate-tamper (Demo demonstration helper)
certificatesRouter.post(
  '/:id/simulate-tamper',
  requireAuth,
  requireRoles(['admin', 'issuer']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const cert = await db.getCertificateById(req.params.id);
      if (!cert) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Certificate not found.' });
        return;
      }

      const { active, tamperedGrade, tamperedName } = req.body;

      let updated;
      if (active) {
        updated = await db.updateCertificate(cert.id, {
          isTamperedSimulation: true,
          tamperedData: {
            gradeClassification: tamperedGrade || 'Summa Cum Laude (Forged Distinction)',
            studentName: tamperedName || `${cert.studentName} [Altered]`,
          },
        });
      } else {
        updated = await db.updateCertificate(cert.id, {
          isTamperedSimulation: false,
          tamperedData: undefined,
        });
      }

      res.json({
        message: active
          ? 'Data tamper simulation enabled. Candidate fingerprint will now diverge from on-chain proof.'
          : 'Data tamper simulation disabled. Certificate integrity restored.',
        certificate: updated,
      });
    } catch (err: any) {
      console.error('[Certificates] Simulate tamper error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
);
