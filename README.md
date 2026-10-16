# CertiChain — Blockchain-Based Student Certificate Verification System

CertiChain is an institutional university credential issuance and verification platform. It allows universities to issue tamper-evident academic certificates, students to store and share credentials via QR codes, and third-party employers to cryptographically verify certificate integrity, issuer authority, blockchain ledger proof, and revocation status without exposing sensitive personal identifiable information (PII) on a public blockchain.

---

## 1. System Architecture Diagram

```
                 [ University Registrar / Admin ]
                               │
               (Issue / Revoke Credential Form)
                               │
                               ▼
               ┌───────────────────────────────┐
               │    Node.js / Express Backend   │
               └───────────────┬───────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
[ Off-Chain Private Storage ]               [ Cryptographic Engine ]
- Student PII (FERPA/GDPR safe)             - Canonical field serialization
- Names, Student IDs, Degrees               - SHA-256 Fingerprint Digest
- Classifications & Transcript Notes        - Ethers.js Wallet Signing
- Persistent JSON / MongoDB Store                       │
                                                        ▼
                                            [ Ethereum Consensus Ledger ]
                                            - CertificateRegistry.sol
                                            - bytes32 fingerprint anchor
                                            - block number & tx hash proof
                                            - permanent revocation registry

                               ▲
                               │
               (Public Scan via QR Code or ID)
                               │
                 [ Employer / Third-Party Verifier ]
```

---

## 2. On-Chain vs. Off-Chain Separation

| Data Element | Location | Rationale |
| :--- | :--- | :--- |
| **Student Name, Student ID** | Off-Chain Database | FERPA / GDPR privacy compliance. Personal data must never be permanently etched on a public ledger. |
| **Degree Name, Major, Department** | Off-Chain Database | Allows confidential student record handling. |
| **SHA-256 Fingerprint** | On-Chain (`bytes32`) | Immutable 256-bit cryptographic digest. Enables 100% tamper detection without exposing underlying plaintext. |
| **Issuer Address (`address`)** | On-Chain | Cryptographic proof that only authorized university signers registered the credential. |
| **Block Number & Timestamp** | On-Chain | Independent consensus proof of existence. |
| **Revocation Flag & Reason** | On-Chain (`bool`, `string`) | Permanent record that a degree has been officially nullified or suspended. |

---

## 3. Four-Pillar Verification Model

Never claim that a certificate is genuine merely because its hash exists on a blockchain. CertiChain strictly enforces four validation checks:

1. **Cryptographic Integrity:** Recomputes the SHA-256 hash from canonical student fields and compares it against the stored and registered fingerprints. Any altered character triggers an `ALTERED` state.
2. **Issuer Authorization:** Validates that the signing Ethereum address holds active issuer privileges granted by the university.
3. **Blockchain Proof:** Confirms existence, block number, and transaction receipt on the smart contract.
4. **Revocation Status:** Cross-references on-chain revocation state. If marked revoked, returns `REVOKED` with the persistent institutional justification.

---

## 4. Default Demo Accounts

For demonstration and defense evaluation, the following pre-configured credentials are provided:

| Role | Name | Email | Password | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **University Dean (Admin)** | Dr. Arthur Sterling | `admin@apex.edu` | `Password123!` | Full registry, issue, revoke, manage issuers, view audit events. |
| **Registrar (Issuer)** | Elena Rostova | `issuer@apex.edu` | `Password123!` | Issue credentials, revoke degrees, download official PDFs. |
| **Student (Active)** | Alex Chen | `alex.chen@student.apex.edu` | `Password123!` | 2 active degrees (`CERT-2026-APEX-1001`, `CERT-2026-APEX-1003`), QR sharing, PDF download. |
| **Student (Revoked)** | Maria Santos | `maria.santos@student.apex.edu` | `Password123!` | 1 revoked degree (`CERT-2026-APEX-1002`) with disciplinary thesis violation note. |
| **Public Verifier** | Anonymous | N/A (No Login Required) | N/A | Public verification at `/verify` or via QR code URLs. |

---

## 5. Live Demonstration & Defense Walkthrough

1. **Step 1: Test an Authentic Certificate**
   - Navigate to `/verify` and enter `CERT-2026-APEX-1001`.
   - Observe the green **VERIFIED** verdict banner.
   - Expand the **ON-CHAIN PROOF AUDIT** drawer to inspect the exact SHA-256 fingerprint, Ethereum contract address, block number, and transaction hash.
   - Click **Download PDF** to inspect the university diploma with embedded high-resolution verification QR code.

2. **Step 2: Test a Disciplinary Revocation**
   - Navigate to `/verify` and enter `CERT-2026-APEX-1002`.
   - Observe the crimson **REVOKED** verdict banner.
   - Read the on-chain revocation reason: *"Disciplinary sanction: academic integrity violation identified in graduate thesis"*.
   - Note that the blockchain retains the original issuance timestamp, proving that blockchain state is append-only and revocation modifies status rather than deleting history.

3. **Step 3: Test Real-Time Tamper Detection**
   - Sign in as Dean (`admin@apex.edu` / `Password123!`).
   - On `CERT-2026-APEX-1001`, click the **Flask icon ("Simulate Altered Record")**.
   - Navigate back to `/verify/CERT-2026-APEX-1001`.
   - The verification engine immediately flags the credential as **ALTERED (INTEGRITY MISMATCH)** because the recomputed candidate fingerprint diverges from the immutable hash stored on the blockchain!

4. **Step 4: Issue a New Credential**
   - Sign in as Registrar (`issuer@apex.edu`), navigate to `/issue`.
   - Enter student details or use one of the quick sample buttons (e.g. *M.S. Robotics*).
   - Click **Issue & Seal on Blockchain**.
   - Watch the transaction submit to the Ethereum smart contract, receive a block number and transaction hash, and generate an official downloadable PDF with a scannable QR code.

---

## 6. Testing

### Run Smart Contract Tests
Tests the Solidity contract access controls, authorized registration, unauthorized rejection, duplicate rejection, and revocation persistence:
```bash
npm run test:contracts
```

### Run Backend Integrity & Verification Logic Tests
Tests deterministic canonical hashing, SHA-256 avalanche effect, role-based authorization rules, and verification result classification:
```bash
node test/backend.test.cjs
```

---

## 7. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, React Router, TanStack Query.
- **Backend:** Node.js, Express, TypeScript, JWT (HTTP-only cookies), bcryptjs, Zod.
- **Blockchain:** Solidity (`0.8.20`), Hardhat, Ethers.js v6, in-process Ganache EVM provider.
- **Utilities:** SHA-256 (Node crypto), QRCode, pdf-lib.
