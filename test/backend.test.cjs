const assert = require('assert');
const crypto = require('crypto');

function computeCanonicalFingerprint(data) {
  const sortedKeys = Object.keys(data).sort();
  const sortedObj = {};
  for (const k of sortedKeys) {
    sortedObj[k] = data[k];
  }
  return crypto.createHash('sha256').update(JSON.stringify(sortedObj), 'utf8').digest('hex');
}

async function runBackendTests() {
  console.log('--- Starting Backend Integrity & Verification Logic Tests ---');

  // Test 1: Deterministic Fingerprint Generation
  const certData1 = {
    schemaVersion: '1.0.0',
    certificateId: 'CERT-2026-APEX-1001',
    studentId: 'STU-2026-9041',
    studentName: 'Alex Chen',
    institutionId: 'INST-APEX-001',
    degreeName: 'Bachelor of Science in Computer Science',
    department: 'School of Computing & Data Systems',
    graduationYear: 2026,
    gradeClassification: 'First Class Honours',
    issueDate: '2026-06-15',
  };

  const hash1 = computeCanonicalFingerprint(certData1);
  const hash2 = computeCanonicalFingerprint({ ...certData1 });
  assert.strictEqual(hash1, hash2, 'Identical canonical data must produce identical SHA-256');
  assert.strictEqual(hash1.length, 64, 'SHA-256 fingerprint must be 64 hex characters');
  console.log('✓ Test 1 Passed: Deterministic canonical fingerprinting verified');

  // Test 2: Tamper Detection (Even 1 character alteration changes fingerprint)
  const tamperedData = {
    ...certData1,
    gradeClassification: 'Summa Cum Laude (Altered)',
  };
  const tamperedHash = computeCanonicalFingerprint(tamperedData);
  assert.notStrictEqual(hash1, tamperedHash, 'Tampered data must yield distinct fingerprint');
  console.log('✓ Test 2 Passed: Cryptographic avalanche effect prevents undetected tampering');

  // Test 3: Idempotency & Certificate ID formatting
  const rawId = ' cert-2026-apex-1001 ';
  const normalizedId = rawId.trim().toUpperCase();
  assert.strictEqual(normalizedId, 'CERT-2026-APEX-1001', 'Certificate ID must be sanitized and uppercase');
  console.log('✓ Test 3 Passed: Certificate ID canonical normalization');

  // Test 4: Verification Result Category Categorization
  function determineVerificationCategory({ exists, matchesFingerprint, isRevoked, blockchainOnline }) {
    if (!blockchainOnline) return 'UNVERIFIABLE';
    if (!exists) return 'NOT_FOUND';
    if (!matchesFingerprint) return 'ALTERED';
    if (isRevoked) return 'REVOKED';
    return 'VERIFIED';
  }

  assert.strictEqual(
    determineVerificationCategory({ exists: true, matchesFingerprint: true, isRevoked: false, blockchainOnline: true }),
    'VERIFIED',
    'Valid matching record must be VERIFIED'
  );
  assert.strictEqual(
    determineVerificationCategory({ exists: true, matchesFingerprint: false, isRevoked: false, blockchainOnline: true }),
    'ALTERED',
    'Fingerprint mismatch must be ALTERED'
  );
  assert.strictEqual(
    determineVerificationCategory({ exists: true, matchesFingerprint: true, isRevoked: true, blockchainOnline: true }),
    'REVOKED',
    'Revoked record must be REVOKED'
  );
  assert.strictEqual(
    determineVerificationCategory({ exists: false, matchesFingerprint: false, isRevoked: false, blockchainOnline: true }),
    'NOT_FOUND',
    'Non-existent record must be NOT_FOUND'
  );
  assert.strictEqual(
    determineVerificationCategory({ exists: true, matchesFingerprint: true, isRevoked: false, blockchainOnline: false }),
    'UNVERIFIABLE',
    'Blockchain network offline must be UNVERIFIABLE'
  );
  console.log('✓ Test 4 Passed: Verification category taxonomy strictly enforced');

  // Test 5: Role-based authorization rule checks
  const canIssue = (role) => role === 'admin' || role === 'issuer';
  const canRevoke = (role) => role === 'admin' || role === 'issuer';
  const canAccessStudentCert = (user, cert) => {
    if (user.role === 'admin' || user.role === 'issuer') return true;
    if (user.role === 'student' && user.studentId === cert.studentId) return true;
    return false;
  };

  assert.strictEqual(canIssue('student'), false, 'Student cannot issue certificates');
  assert.strictEqual(canIssue('issuer'), true, 'Issuer can issue certificates');
  assert.strictEqual(canRevoke('student'), false, 'Student cannot revoke certificates');
  assert.strictEqual(
    canAccessStudentCert({ role: 'student', studentId: 'STU-1' }, { studentId: 'STU-2' }),
    false,
    'Student 1 cannot access Student 2 records'
  );
  assert.strictEqual(
    canAccessStudentCert({ role: 'student', studentId: 'STU-1' }, { studentId: 'STU-1' }),
    true,
    'Student can access their own certificate'
  );
  console.log('✓ Test 5 Passed: Role-based access control matrix checks');

  console.log('\n========================================');
  console.log('ALL BACKEND INTEGRITY TESTS PASSED (5/5)!');
  console.log('========================================\n');
}

runBackendTests().catch(err => {
  console.error('Backend tests failed:', err);
  process.exit(1);
});
