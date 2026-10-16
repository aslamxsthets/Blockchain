export type UserRole = 'admin' | 'issuer' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId?: string;
  studentId?: string;
  institution?: {
    id: string;
    name: string;
    code: string;
    domain: string;
  };
}

export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  studentUserId?: string;
  issuerId: string;
  issuerName: string;
  institutionId: string;
  institutionName: string;
  degreeName: string;
  department: string;
  graduationYear: number;
  gradeClassification: string;
  issueDate: string;
  canonicalVersion: '1.0.0';
  fingerprintAlgorithm: 'SHA-256';
  fingerprint: string;
  issuanceState: 'issued' | 'pending' | 'failed' | 'revoked';
  transactionHash: string;
  blockNumber: number;
  blockchainNetwork: string;
  contractAddress: string;
  issuedAt: string;
  revokedAt?: string;
  revocationReason?: string;
  revokedBy?: string;
  qrCodeDataUrl?: string;
  downloadCount: number;
  issuerSignature?: string;
  issuerSignerAddress?: string;
  isTamperedSimulation?: boolean;
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

export interface DashboardStats {
  stats: {
    totalCertificates: number;
    activeIssued: number;
    revokedCount: number;
    pendingCount: number;
    verificationChecks: number;
  };
  departmentDistribution: { name: string; count: number }[];
  blockchainStatus?: {
    connected: boolean;
    network: string;
    chainId: number;
    contractAddress: string;
    signerAddress: string;
    blockNumber: number;
  };
  recentActivity: {
    verifications: any[];
    audits: any[];
  };
}
