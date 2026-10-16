import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { blockchainService } from '../services/blockchainService';
import {
  createCanonicalData,
  computeCanonicalFingerprint,
} from '../services/cryptoService';
import { generateCertificatePdf } from '../services/pdfService';
import {
  VerificationResponse,
  VerificationResultCategory,
  CanonicalCertificateData,
} from '../types/index.ts';

export const verifyRouter = Router();

// GET /api/v1/verify/:certificateId (Public endpoint, no login required)
verifyRouter.get('/:certificateId', async (req: Request, res: Response): Promise<void> => {
  const certificateId = req.params.certificateId?.trim().toUpperCase();
  const source = (req.query.source as string) || 'DIRECT_LOOKUP';
  const now = new Date().toISOString();

  if (!certificateId) {
    res.status(400).json({
      category: 'NOT_FOUND',
      verified: false,
      message: 'Certificate ID must be provided.',
      certificateId: '',
      verificationTimestamp: now,
      integrityCheck: {
        schemaVersion: '1.0.0',
        canonicalMatches: false,
        databaseConsistent: false,
        tamperDetected: false,
      },
    });
    return;
  }

  try {
    // 1. Resolve certificate ID against database
    const certificate = await db.getCertificateById(certificateId);

    if (!certificate) {
      await db.logVerificationEvent({
        certificateId,
        resultCategory: 'NOT_FOUND',
        requestSourceCategory: source === 'QR_SCAN' ? 'QR_SCAN' : 'DIRECT_LOOKUP',
        metadata: { reason: 'No database record exists for this identifier' },
      });

      const notFoundResponse: VerificationResponse = {
        category: 'NOT_FOUND',
        verified: false,
        message: 'No certificate matching this identifier was found in the institutional records registry.',
        certificateId,
        verificationTimestamp: now,
        integrityCheck: {
          schemaVersion: '1.0.0',
          canonicalMatches: false,
          databaseConsistent: false,
          tamperDetected: false,
        },
      };

      res.status(404).json(notFoundResponse);
      return;
    }

    // 2. Retrieve canonical data and recompute candidate SHA-256 fingerprint
    const effectiveData = certificate.isTamperedSimulation && certificate.tamperedData
      ? {
          ...createCanonicalData(certificate),
          ...certificate.tamperedData,
        }
      : createCanonicalData(certificate);

    const recomputedFingerprint = computeCanonicalFingerprint(effectiveData as CanonicalCertificateData);
    const databaseMatchesRecomputed = recomputedFingerprint.toLowerCase() === certificate.fingerprint.toLowerCase();

    // 3. Retrieve registered proof from blockchain contract
    let onChainProof: any = null;
    let blockchainAvailable = true;

    try {
      onChainProof = await blockchainService.getCertificateProof(certificate.id);
    } catch (chainErr) {
      console.error(`[Verify] Blockchain query failed for ${certificate.id}:`, chainErr);
      blockchainAvailable = false;
    }

    // If blockchain is unreachable or failed
    if (!blockchainAvailable || !onChainProof || !onChainProof.exists) {
      const isUnverifiable = !blockchainAvailable || !onChainProof?.exists;

      await db.logVerificationEvent({
        certificateId: certificate.id,
        resultCategory: 'UNVERIFIABLE',
        requestSourceCategory: source === 'QR_SCAN' ? 'QR_SCAN' : 'DIRECT_LOOKUP',
        metadata: {
          blockchainAvailable,
          proofExists: onChainProof?.exists,
          dbStatus: certificate.issuanceState,
        },
      });

      const unverifiableResponse: VerificationResponse = {
        category: 'UNVERIFIABLE',
        verified: false,
        message: 'Consensus ledger proof could not be validated. The smart contract state is unreachable or the transaction anchor has not confirmed.',
        certificateId: certificate.id,
        verificationTimestamp: now,
        certificate: {
          certificateId: certificate.id,
          studentName: certificate.studentName,
          degreeName: certificate.degreeName,
          department: certificate.department,
          graduationYear: certificate.graduationYear,
          gradeClassification: certificate.gradeClassification,
          issueDate: certificate.issueDate,
          institutionName: certificate.institutionName,
          institutionDomain: 'apex.edu',
          issuanceState: certificate.issuanceState,
          fingerprintShort: `${certificate.fingerprint.substring(0, 10)}...${certificate.fingerprint.substring(54)}`,
          fingerprintFull: certificate.fingerprint,
          isRevoked: certificate.issuanceState === 'revoked',
        },
        integrityCheck: {
          schemaVersion: '1.0.0',
          canonicalMatches: databaseMatchesRecomputed,
          databaseConsistent: false,
          tamperDetected: !databaseMatchesRecomputed,
        },
      };

      res.status(503).json(unverifiableResponse);
      return;
    }

    // 4. Compare candidate fingerprint with registered on-chain fingerprint
    const registeredFingerprintClean = onChainProof.registeredFingerprint.toLowerCase();
    const candidateMatchesOnChain = recomputedFingerprint.toLowerCase() === registeredFingerprintClean;

    // Check if altered
    if (!candidateMatchesOnChain || !databaseMatchesRecomputed) {
      await db.logVerificationEvent({
        certificateId: certificate.id,
        resultCategory: 'ALTERED',
        requestSourceCategory: source === 'QR_SCAN' ? 'QR_SCAN' : 'DIRECT_LOOKUP',
        metadata: {
          recomputedFingerprint,
          onChainFingerprint: registeredFingerprintClean,
          storedDbFingerprint: certificate.fingerprint,
        },
      });

      const alteredResponse: VerificationResponse = {
        category: 'ALTERED',
        verified: false,
        message: 'INTEGRITY MISMATCH: The current certificate content diverges from the immutable fingerprint anchored on the blockchain. Data has been altered.',
        certificateId: certificate.id,
        verificationTimestamp: now,
        certificate: {
          certificateId: certificate.id,
          studentName: certificate.studentName,
          degreeName: certificate.degreeName,
          department: certificate.department,
          graduationYear: certificate.graduationYear,
          gradeClassification: certificate.gradeClassification,
          issueDate: certificate.issueDate,
          institutionName: certificate.institutionName,
          institutionDomain: 'apex.edu',
          issuanceState: 'altered',
          fingerprintShort: `${recomputedFingerprint.substring(0, 10)}...`,
          fingerprintFull: recomputedFingerprint,
          isRevoked: certificate.issuanceState === 'revoked' || onChainProof.isRevoked,
        },
        blockchainProof: {
          network: 'Local Devnet (Chain ID: 31337)',
          contractAddress: await blockchainService.getContractAddress(),
          transactionHash: certificate.transactionHash,
          blockNumber: onChainProof.blockNumber,
          registeredFingerprint: registeredFingerprintClean,
          computedFingerprint: recomputedFingerprint,
          fingerprintMatch: false,
          issuerAddress: onChainProof.issuerAddress,
          isIssuerAuthorized: true,
          onChainRevokedStatus: onChainProof.isRevoked,
          timestamp: new Date(onChainProof.issuedAt * 1000).toISOString(),
        },
        integrityCheck: {
          schemaVersion: '1.0.0',
          canonicalMatches: false,
          databaseConsistent: false,
          tamperDetected: true,
        },
      };

      res.json(alteredResponse);
      return;
    }

    // 5. Check Revocation status on blockchain and database
    const isRevokedOnChain = Boolean(onChainProof.isRevoked);
    const isRevokedInDb = certificate.issuanceState === 'revoked';

    if (isRevokedOnChain || isRevokedInDb) {
      const revocationReason = onChainProof.revocationReason || certificate.revocationReason || 'Nullified by issuing institution';
      const revokedAt = onChainProof.revokedAt ? new Date(onChainProof.revokedAt * 1000).toISOString() : certificate.revokedAt || now;

      await db.logVerificationEvent({
        certificateId: certificate.id,
        resultCategory: 'REVOKED',
        requestSourceCategory: source === 'QR_SCAN' ? 'QR_SCAN' : 'DIRECT_LOOKUP',
        metadata: {
          reason: revocationReason,
          isRevokedOnChain,
          isRevokedInDb,
        },
      });

      const revokedResponse: VerificationResponse = {
        category: 'REVOKED',
        verified: false,
        message: `CREDENTIAL REVOKED: This certificate was officially nullified by the university. Reason: "${revocationReason}".`,
        certificateId: certificate.id,
        verificationTimestamp: now,
        certificate: {
          certificateId: certificate.id,
          studentName: certificate.studentName,
          degreeName: certificate.degreeName,
          department: certificate.department,
          graduationYear: certificate.graduationYear,
          gradeClassification: certificate.gradeClassification,
          issueDate: certificate.issueDate,
          institutionName: certificate.institutionName,
          institutionDomain: 'apex.edu',
          issuanceState: 'revoked',
          fingerprintShort: `${registeredFingerprintClean.substring(0, 10)}...${registeredFingerprintClean.substring(54)}`,
          fingerprintFull: registeredFingerprintClean,
          isRevoked: true,
          revokedAt,
          revocationReason,
        },
        blockchainProof: {
          network: 'Local Devnet (Chain ID: 31337)',
          contractAddress: await blockchainService.getContractAddress(),
          transactionHash: certificate.transactionHash,
          blockNumber: onChainProof.blockNumber,
          registeredFingerprint: registeredFingerprintClean,
          computedFingerprint: recomputedFingerprint,
          fingerprintMatch: true,
          issuerAddress: onChainProof.issuerAddress,
          isIssuerAuthorized: true,
          onChainRevokedStatus: true,
          timestamp: new Date(onChainProof.issuedAt * 1000).toISOString(),
          issuerSignature: certificate.issuerSignature,
        },
        integrityCheck: {
          schemaVersion: '1.0.0',
          canonicalMatches: true,
          databaseConsistent: true,
          tamperDetected: false,
        },
      };

      res.json(revokedResponse);
      return;
    }

    // 6. Confirmed: VERIFIED
    await db.logVerificationEvent({
      certificateId: certificate.id,
      resultCategory: 'VERIFIED',
      requestSourceCategory: source === 'QR_SCAN' ? 'QR_SCAN' : 'DIRECT_LOOKUP',
      metadata: { blockNumber: onChainProof.blockNumber },
    });

    const verifiedResponse: VerificationResponse = {
      category: 'VERIFIED',
      verified: true,
      message: 'AUTHENTIC & VERIFIED: Cryptographic SHA-256 fingerprint matches immutable blockchain ledger. Credential is active and authorized.',
      certificateId: certificate.id,
      verificationTimestamp: now,
      certificate: {
        certificateId: certificate.id,
        studentName: certificate.studentName,
        degreeName: certificate.degreeName,
        department: certificate.department,
        graduationYear: certificate.graduationYear,
        gradeClassification: certificate.gradeClassification,
        issueDate: certificate.issueDate,
        institutionName: certificate.institutionName,
        institutionDomain: 'apex.edu',
        issuanceState: 'issued',
        fingerprintShort: `${registeredFingerprintClean.substring(0, 10)}...${registeredFingerprintClean.substring(54)}`,
        fingerprintFull: registeredFingerprintClean,
        isRevoked: false,
      },
      blockchainProof: {
        network: 'Local Devnet (Chain ID: 31337)',
        contractAddress: await blockchainService.getContractAddress(),
        transactionHash: certificate.transactionHash,
        blockNumber: onChainProof.blockNumber,
        registeredFingerprint: registeredFingerprintClean,
        computedFingerprint: recomputedFingerprint,
        fingerprintMatch: true,
        issuerAddress: onChainProof.issuerAddress,
        isIssuerAuthorized: true,
        onChainRevokedStatus: false,
        timestamp: new Date(onChainProof.issuedAt * 1000).toISOString(),
        issuerSignature: certificate.issuerSignature,
      },
      integrityCheck: {
        schemaVersion: '1.0.0',
        canonicalMatches: true,
        databaseConsistent: true,
        tamperDetected: false,
      },
    };

    res.json(verifiedResponse);
  } catch (err: any) {
    console.error('[Verify] Verification error:', err);
    res.status(500).json({
      category: 'UNVERIFIABLE',
      verified: false,
      message: 'Internal server error while resolving verification checks.',
      certificateId,
      verificationTimestamp: now,
      integrityCheck: {
        schemaVersion: '1.0.0',
        canonicalMatches: false,
        databaseConsistent: false,
        tamperDetected: false,
      },
    });
  }
});

// GET /api/v1/verify/:certificateId/pdf (Public download of cryptographically signed PDF)
verifyRouter.get('/:certificateId/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const certificateId = req.params.certificateId?.trim().toUpperCase();
    if (!certificateId) {
      res.status(400).json({ error: 'INVALID_ID', message: 'Certificate ID must be specified.' });
      return;
    }

    const cert = await db.getCertificateById(certificateId);
    if (!cert) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Certificate not found in institutional registry.' });
      return;
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const pdfBytes = await generateCertificatePdf(cert, host);

    // Track download metric
    await db.updateCertificate(cert.id, {
      downloadCount: (cert.downloadCount || 0) + 1,
    });

    const filename = `${cert.id}_${cert.studentName.replace(/\s+/g, '_')}_Signed.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error('[Verify] Public PDF generation error:', err);
    res.status(500).json({ error: 'PDF_GENERATION_FAILED', message: err.message });
  }
});
