import crypto from 'crypto';
import { CanonicalCertificateData, Certificate } from '../types/index.ts';

/**
 * Creates canonical deterministic representation of certificate data.
 * Must include schema version and institutional issuer identity.
 */
export function createCanonicalData(input: {
  certificateId?: string;
  id?: string;
  studentId: string;
  studentName: string;
  institutionId: string;
  degreeName: string;
  department: string;
  graduationYear: number;
  gradeClassification: string;
  issueDate: string;
}): CanonicalCertificateData {
  const certId = (input.certificateId || input.id || '').toString().trim().toUpperCase();
  return {
    schemaVersion: '1.0.0',
    certificateId: certId,
    studentId: (input.studentId || '').toString().trim().toUpperCase(),
    studentName: (input.studentName || '').toString().trim(),
    institutionId: (input.institutionId || '').toString().trim().toUpperCase(),
    degreeName: (input.degreeName || '').toString().trim(),
    department: (input.department || '').toString().trim(),
    graduationYear: Number(input.graduationYear),
    gradeClassification: (input.gradeClassification || '').toString().trim(),
    issueDate: (input.issueDate || '').toString().trim(),
  };
}

/**
 * Computes deterministic SHA-256 fingerprint from canonical certificate data.
 * Keys are alphabetically sorted and values are serialized deterministically.
 */
export function computeCanonicalFingerprint(data: CanonicalCertificateData): string {
  const sortedKeys = Object.keys(data).sort() as (keyof CanonicalCertificateData)[];
  const deterministicObject: Record<string, any> = {};
  for (const key of sortedKeys) {
    deterministicObject[key] = data[key];
  }
  const serialized = JSON.stringify(deterministicObject);
  return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
}

/**
 * Validates whether the certificate's stored fingerprint matches
 * a freshly recomputed SHA-256 hash of its canonical data.
 */
export function verifyCertificateIntegrity(certificate: Certificate): {
  isValid: boolean;
  computedFingerprint: string;
  storedFingerprint: string;
} {
  const effectiveData = certificate.isTamperedSimulation && certificate.tamperedData
    ? {
        ...createCanonicalData(certificate),
        ...certificate.tamperedData,
      }
    : createCanonicalData(certificate);

  const computedFingerprint = computeCanonicalFingerprint(effectiveData as CanonicalCertificateData);
  const isValid = computedFingerprint.toLowerCase() === certificate.fingerprint.toLowerCase();

  return {
    isValid,
    computedFingerprint,
    storedFingerprint: certificate.fingerprint,
  };
}

/**
 * Formats a 64-character SHA-256 hex string to bytes32 format for Solidity
 */
export function toBytes32(hexString: string): string {
  const cleaned = hexString.replace(/^0x/, '');
  if (cleaned.length !== 64) {
    throw new Error(`Invalid SHA-256 hex string length: expected 64, got ${cleaned.length}`);
  }
  return '0x' + cleaned;
}

/**
 * Generate a cryptographically secure, unpredictable, unique certificate ID
 * Example format: "CERT-2026-APEX-8F3B9A"
 */
export function generateCertificateId(institutionCode = 'APEX'): string {
  const year = new Date().getFullYear();
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CERT-${year}-${institutionCode.toUpperCase()}-${randomSuffix}`;
}
