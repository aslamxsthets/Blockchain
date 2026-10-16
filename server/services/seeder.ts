import { db } from '../db/database';
import { blockchainService } from './blockchainService';
import {
  createCanonicalData,
  computeCanonicalFingerprint,
} from './cryptoService';
import { generateCertificateQRCode } from './pdfService';
import { Certificate } from '../types/index.ts';

export async function bootstrapDemoCertificates(): Promise<void> {
  await blockchainService.init();
  const existingCerts = await db.getAllCertificates();
  
  // If certificates already exist, ensure they are registered on the active EVM
  if (existingCerts.length > 0) {
    console.log(`[Seeder] Checking synchronization for ${existingCerts.length} certificates on active EVM...`);
    for (const cert of existingCerts) {
      try {
        const proof = await blockchainService.getCertificateProof(cert.id);
        if (!proof.exists) {
          console.log(`[Seeder] Re-anchoring certificate ${cert.id} to active blockchain...`);
          const tx = await blockchainService.registerCertificate(cert.id, cert.fingerprint, cert.institutionId);
          if (cert.issuanceState === 'revoked') {
            await blockchainService.revokeCertificate(cert.id, cert.revocationReason || 'Disciplinary nullification');
          }
          await db.updateCertificate(cert.id, {
            transactionHash: tx.transactionHash,
            blockNumber: tx.blockNumber,
          });
        }

        if (!cert.issuerSignature) {
          const signed = await blockchainService.signCertificateFingerprint(cert.fingerprint);
          await db.updateCertificate(cert.id, {
            issuerSignature: signed.signature,
            issuerSignerAddress: signed.signerAddress,
          });
        }
      } catch (err) {
        console.error(`[Seeder] Error re-anchoring ${cert.id}:`, err);
      }
    }
    console.log('[Seeder] Blockchain synchronization and signatures verified.');
    return;
  }

  const contractAddress = await blockchainService.getContractAddress();
  const instId = 'INST-APEX-001';
  const instName = 'Apex Institute of Technology & Science';
  const issuerId = 'USER-ADMIN-001';
  const issuerName = 'Dr. Arthur Sterling';
  const student1 = await db.findUserByEmail('alex.chen@student.apex.edu');
  const student2 = await db.findUserByEmail('maria.santos@student.apex.edu');

  // Certificate 1: Valid B.S. Computer Science for Alex Chen
  const cert1Id = 'CERT-2026-APEX-1001';
  const canonical1 = createCanonicalData({
    certificateId: cert1Id,
    studentId: 'STU-2026-9041',
    studentName: 'Alex Chen',
    institutionId: instId,
    degreeName: 'Bachelor of Science in Computer Science',
    department: 'School of Computing & Data Systems',
    graduationYear: 2026,
    gradeClassification: 'First Class Honours (Summa Cum Laude)',
    issueDate: '2026-06-15',
  });
  const fingerprint1 = computeCanonicalFingerprint(canonical1);
  const qr1 = await generateCertificateQRCode(cert1Id);

  console.log(`[Seeder] Anchoring ${cert1Id} on blockchain...`);
  const tx1 = await blockchainService.registerCertificate(cert1Id, fingerprint1, instId);
  const signed1 = await blockchainService.signCertificateFingerprint(fingerprint1);

  const cert1: Certificate = {
    id: cert1Id,
    studentId: 'STU-2026-9041',
    studentName: 'Alex Chen',
    studentUserId: student1?.id,
    issuerId,
    issuerName,
    institutionId: instId,
    institutionName: instName,
    degreeName: 'Bachelor of Science in Computer Science',
    department: 'School of Computing & Data Systems',
    graduationYear: 2026,
    gradeClassification: 'First Class Honours (Summa Cum Laude)',
    issueDate: '2026-06-15',
    canonicalVersion: '1.0.0',
    fingerprintAlgorithm: 'SHA-256',
    fingerprint: fingerprint1,
    issuerSignature: signed1.signature,
    issuerSignerAddress: signed1.signerAddress,
    issuanceState: 'issued',
    transactionHash: tx1.transactionHash,
    blockNumber: tx1.blockNumber,
    blockchainNetwork: 'Local Devnet (Chain ID: 31337)',
    contractAddress,
    issuedAt: new Date('2026-06-15T10:00:00Z').toISOString(),
    qrCodeDataUrl: qr1,
    downloadCount: 4,
  };
  await db.createCertificate(cert1);

  // Certificate 2: Revoked M.S. Data Intelligence for Maria Santos
  const cert2Id = 'CERT-2026-APEX-1002';
  const canonical2 = createCanonicalData({
    certificateId: cert2Id,
    studentId: 'STU-2026-9042',
    studentName: 'Maria Santos',
    institutionId: instId,
    degreeName: 'Master of Science in Data Intelligence',
    department: 'Faculty of Informatics & Artificial Intelligence',
    graduationYear: 2026,
    gradeClassification: 'With Distinction (GPA 3.94)',
    issueDate: '2026-05-20',
  });
  const fingerprint2 = computeCanonicalFingerprint(canonical2);
  const qr2 = await generateCertificateQRCode(cert2Id);

  console.log(`[Seeder] Anchoring ${cert2Id} on blockchain...`);
  const tx2 = await blockchainService.registerCertificate(cert2Id, fingerprint2, instId);

  // Now revoke cert2 on blockchain
  const revokeReason = 'Disciplinary sanction: academic integrity violation identified in graduate thesis';
  console.log(`[Seeder] Revoking ${cert2Id} on blockchain...`);
  const revokeTx = await blockchainService.revokeCertificate(cert2Id, revokeReason);

  const signed2 = await blockchainService.signCertificateFingerprint(fingerprint2);

  const cert2: Certificate = {
    id: cert2Id,
    studentId: 'STU-2026-9042',
    studentName: 'Maria Santos',
    studentUserId: student2?.id,
    issuerId,
    issuerName,
    institutionId: instId,
    institutionName: instName,
    degreeName: 'Master of Science in Data Intelligence',
    department: 'Faculty of Informatics & Artificial Intelligence',
    graduationYear: 2026,
    gradeClassification: 'With Distinction (GPA 3.94)',
    issueDate: '2026-05-20',
    canonicalVersion: '1.0.0',
    fingerprintAlgorithm: 'SHA-256',
    fingerprint: fingerprint2,
    issuerSignature: signed2.signature,
    issuerSignerAddress: signed2.signerAddress,
    issuanceState: 'revoked',
    transactionHash: tx2.transactionHash,
    blockNumber: tx2.blockNumber,
    blockchainNetwork: 'Local Devnet (Chain ID: 31337)',
    contractAddress,
    issuedAt: new Date('2026-05-20T14:30:00Z').toISOString(),
    revokedAt: new Date().toISOString(),
    revocationReason: revokeReason,
    revokedBy: 'Dr. Arthur Sterling',
    qrCodeDataUrl: qr2,
    downloadCount: 1,
  };
  await db.createCertificate(cert2);

  // Certificate 3: Another active certificate for Alex Chen
  const cert3Id = 'CERT-2026-APEX-1003';
  const canonical3 = createCanonicalData({
    certificateId: cert3Id,
    studentId: 'STU-2026-9041',
    studentName: 'Alex Chen',
    institutionId: instId,
    degreeName: 'Professional Diploma in Cryptographic Engineering',
    department: 'School of Computing & Data Systems',
    graduationYear: 2026,
    gradeClassification: 'High Distinction',
    issueDate: '2026-07-01',
  });
  const fingerprint3 = computeCanonicalFingerprint(canonical3);
  const qr3 = await generateCertificateQRCode(cert3Id);

  console.log(`[Seeder] Anchoring ${cert3Id} on blockchain...`);
  const tx3 = await blockchainService.registerCertificate(cert3Id, fingerprint3, instId);
  const signed3 = await blockchainService.signCertificateFingerprint(fingerprint3);

  const cert3: Certificate = {
    id: cert3Id,
    studentId: 'STU-2026-9041',
    studentName: 'Alex Chen',
    studentUserId: student1?.id,
    issuerId,
    issuerName,
    institutionId: instId,
    institutionName: instName,
    degreeName: 'Professional Diploma in Cryptographic Engineering',
    department: 'School of Computing & Data Systems',
    graduationYear: 2026,
    gradeClassification: 'High Distinction',
    issueDate: '2026-07-01',
    canonicalVersion: '1.0.0',
    fingerprintAlgorithm: 'SHA-256',
    fingerprint: fingerprint3,
    issuerSignature: signed3.signature,
    issuerSignerAddress: signed3.signerAddress,
    issuanceState: 'issued',
    transactionHash: tx3.transactionHash,
    blockNumber: tx3.blockNumber,
    blockchainNetwork: 'Local Devnet (Chain ID: 31337)',
    contractAddress,
    issuedAt: new Date('2026-07-01T09:15:00Z').toISOString(),
    qrCodeDataUrl: qr3,
    downloadCount: 2,
  };
  await db.createCertificate(cert3);

  console.log('[Seeder] Successfully seeded demo certificates with live blockchain proof!');
}
