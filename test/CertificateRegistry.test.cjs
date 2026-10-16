const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const ganache = require('ganache');

async function runTests() {
  console.log('--- Starting Smart Contract Tests for CertificateRegistry ---');
  
  // 1. Start in-memory Ethereum node
  const provider = new ethers.BrowserProvider(ganache.provider({
    logging: { quiet: true },
    wallet: { totalAccounts: 5 }
  }));
  
  const [deployer, authorizedIssuer, unauthorizedUser, student] = await Promise.all([
    provider.getSigner(0),
    provider.getSigner(1),
    provider.getSigner(2),
    provider.getSigner(3),
  ]);

  console.log('✓ In-memory blockchain provider initialized');
  console.log(`  Deployer: ${await deployer.getAddress()}`);
  console.log(`  Authorized Issuer: ${await authorizedIssuer.getAddress()}`);
  console.log(`  Unauthorized User: ${await unauthorizedUser.getAddress()}`);

  // 2. Load artifact
  const artifactPath = path.resolve(__dirname, '../artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  // 3. Deploy contract
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log(`✓ CertificateRegistry deployed to: ${contractAddress}`);

  // Test 1: Deployer is owner and initial issuer
  const owner = await contract.owner();
  assert.strictEqual(owner, await deployer.getAddress(), 'Owner should match deployer');
  const isDeployerIssuer = await contract.isAuthorizedIssuer(await deployer.getAddress());
  assert.strictEqual(isDeployerIssuer, true, 'Deployer should be authorized issuer');
  console.log('✓ Test 1 Passed: Contract owner is authorized issuer');

  // Test 2: Authorize a new issuer
  const authTx = await contract.authorizeIssuer(await authorizedIssuer.getAddress(), 'INST-TEST-001');
  await authTx.wait();
  const isAuth = await contract.isAuthorizedIssuer(await authorizedIssuer.getAddress());
  assert.strictEqual(isAuth, true, 'Authorized issuer should now be recognized');
  console.log('✓ Test 2 Passed: Authorized new university issuer');

  // Test 3: Unauthorized user cannot register certificate
  const unauthorizedContract = contract.connect(unauthorizedUser);
  const sampleFingerprint = ethers.keccak256(ethers.toUtf8Bytes('canonical-data-sample-1'));
  let unauthorizedError = false;
  try {
    const tx = await unauthorizedContract.registerCertificate('CERT-001', sampleFingerprint, 'INST-FAKE');
    await tx.wait();
  } catch (err) {
    unauthorizedError = true;
  }
  assert.strictEqual(unauthorizedError, true, 'Unauthorized user should be rejected');
  console.log('✓ Test 3 Passed: Unauthorized registration correctly rejected');

  // Test 4: Authorized issuer registers certificate
  const issuerContract = contract.connect(authorizedIssuer);
  const cert1Id = 'CERT-2026-STANFORD-001';
  const cert1Fingerprint = ethers.sha256(ethers.toUtf8Bytes('canonical:CERT-2026-STANFORD-001:John Doe:Computer Science:2026'));
  const regTx = await issuerContract.registerCertificate(cert1Id, cert1Fingerprint, 'INST-STANFORD');
  const receipt = await regTx.wait();
  assert(receipt.status === 1, 'Transaction should succeed');
  
  const exists = await contract.certificateExists(cert1Id);
  assert.strictEqual(exists, true, 'Certificate should exist');
  console.log('✓ Test 4 Passed: Authorized certificate registration succeeded');

  // Test 5: Duplicate registration rejection
  let duplicateError = false;
  try {
    const dupTx = await issuerContract.registerCertificate(cert1Id, cert1Fingerprint, 'INST-STANFORD');
    await dupTx.wait();
  } catch (err) {
    duplicateError = true;
  }
  assert.strictEqual(duplicateError, true, 'Duplicate certificate ID must be rejected');
  console.log('✓ Test 5 Passed: Duplicate certificate rejection succeeded');

  // Test 6: Verify certificate fingerprint match
  const verifyResult = await contract.verifyCertificate(cert1Id, cert1Fingerprint);
  assert.strictEqual(verifyResult[0], true, 'Certificate should be valid');
  assert.strictEqual(verifyResult[1], false, 'Certificate should not be revoked');
  assert.strictEqual(verifyResult[2], cert1Fingerprint, 'Fingerprint must match');
  console.log('✓ Test 6 Passed: Certificate verification matched fingerprint and valid status');

  // Test 7: Verify altered certificate fails
  const alteredFingerprint = ethers.sha256(ethers.toUtf8Bytes('tampered-content'));
  const alteredResult = await contract.verifyCertificate(cert1Id, alteredFingerprint);
  assert.strictEqual(alteredResult[0], false, 'Altered certificate must not be valid');
  console.log('✓ Test 7 Passed: Altered certificate check failed validity as expected');

  // Test 8: Unauthorized revocation rejection
  let unauthRevokeError = false;
  try {
    const unauthRevokeTx = await unauthorizedContract.revokeCertificate(cert1Id, 'Fraudulent revocation attempt');
    await unauthRevokeTx.wait();
  } catch (err) {
    unauthRevokeError = true;
  }
  assert.strictEqual(unauthRevokeError, true, 'Unauthorized revocation must fail');
  console.log('✓ Test 8 Passed: Unauthorized revocation rejected');

  // Test 9: Authorized revocation
  const revokeTx = await issuerContract.revokeCertificate(cert1Id, 'Disciplinary expulsion and credential nullification');
  await revokeTx.wait();
  
  const postRevoke = await contract.verifyCertificate(cert1Id, cert1Fingerprint);
  assert.strictEqual(postRevoke[0], false, 'Revoked certificate must not be valid');
  assert.strictEqual(postRevoke[1], true, 'Revoked flag must be true');

  const details = await contract.getCertificate(cert1Id);
  assert.strictEqual(details[6], true, 'isRevoked should be true');
  assert.strictEqual(details[8], 'Disciplinary expulsion and credential nullification', 'Revocation reason must persist');
  console.log('✓ Test 9 Passed: Authorized revocation recorded with persistent reason');

  console.log('\n========================================');
  console.log('ALL SMART CONTRACT TESTS PASSED (9/9)!');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
