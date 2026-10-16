export type UserRole = 'admin' | 'issuer' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  accountStatus: 'active' | 'suspended';
  institutionId?: string;
  studentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  officialDomain: string;
  authorizedIssuerAddresses: string[];
  profileDetails: {
    chancellor: string;
    accreditation: string;
    address: string;
    logoBadgeText?: string;
  };
  status: 'active' | 'pending' | 'revoked';
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalCertificateData {
  schemaVersion: '1.0.0';
  certificateId: string;
  studentId: string;
  studentName: string;
  institutionId: string;
  degreeName: string;
  department: string;
  graduationYear: number;
  gradeClassification: string;
  issueDate: string; // YYYY-MM-DD
}

export interface Certificate {
  id: string; // unique certificate ID, e.g. "CERT-2026-APEX-1001"
  studentId: string; // student university ID
  studentName: string;
  studentUserId?: string; // linked user ID if student has an account
  issuerId: string; // user ID who issued it
  issuerName: string;
  institutionId: string;
  institutionName: string;
  degreeName: string;
  department: string;
  graduationYear: number;
  gradeClassification: string; // e.g. "First Class Honours", "Summa Cum Laude", "3.92 GPA"
  issueDate: string; // YYYY-MM-DD
  canonicalVersion: '1.0.0';
  fingerprintAlgorithm: 'SHA-256';
  fingerprint: string; // 64-character lowercase hex string
  issuanceState: 'issued' | 'pending' | 'failed' | 'revoked';
  transactionHash: string;
  blockNumber: number;
  blockchainNetwork: string;
  contractAddress: string;
  issuedAt: string; // ISO 8601
  revokedAt?: string;
  revocationReason?: string;
  revokedBy?: string;
  qrCodeDataUrl?: string;
  downloadCount: number;
  issuerSignature?: string; // 132-char ECDSA signature (0x...)
  issuerSignerAddress?: string; // 42-char Ethereum address
  // Simulation flag for demonstration purposes
  isTamperedSimulation?: boolean;
  tamperedData?: Partial<CanonicalCertificateData>;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: 'LOGIN' | 'CERTIFICATE_ISSUED' | 'CERTIFICATE_REVOKED' | 'ISSUER_AUTHORIZED' | 'ISSUER_REVOKED' | 'SETTINGS_UPDATED';
  targetRecord: string;
  timestamp: string;
  correlationId: string;
  transactionHash?: string;
  metadata?: Record<string, any>;
}

export interface VerificationEvent {
  id: string;
  certificateId: string;
  timestamp: string;
  resultCategory: 'VERIFIED' | 'ALTERED' | 'REVOKED' | 'NOT_FOUND' | 'UNVERIFIABLE';
  requestSourceCategory: 'QR_SCAN' | 'DIRECT_LOOKUP' | 'API';
  metadata?: Record<string, any>;
}

export type VerificationResultCategory =
  | 'VERIFIED'
  | 'ALTERED'
  | 'REVOKED'
  | 'NOT_FOUND'
  | 'UNVERIFIABLE';

export interface VerificationResponse {
  category: VerificationResultCategory;
  verified: boolean;
  message: string;
  certificateId: string;
  verificationTimestamp: string;
  certificate?: {
    certificateId: string;
    studentName: string;
    degreeName: string;
    department: string;
    graduationYear: number;
    gradeClassification: string;
    issueDate: string;
    institutionName: string;
    institutionDomain: string;
    issuanceState: string;
    fingerprintShort: string;
    fingerprintFull: string;
    isRevoked: boolean;
    revokedAt?: string;
    revocationReason?: string;
  };
  blockchainProof?: {
    network: string;
    contractAddress: string;
    transactionHash: string;
    blockNumber: number;
    registeredFingerprint: string;
    computedFingerprint: string;
    fingerprintMatch: boolean;
    issuerAddress: string;
    isIssuerAuthorized: boolean;
    onChainRevokedStatus: boolean;
    timestamp: string;
    issuerSignature?: string;
  };
  integrityCheck: {
    schemaVersion: string;
    canonicalMatches: boolean;
    databaseConsistent: boolean;
    tamperDetected: boolean;
  };
}
