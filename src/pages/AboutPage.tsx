import React from 'react';
import {
  Shield,
  Layers,
  Lock,
  Database,
  Cpu,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="max-w-3xl mb-12">
        <div className="text-xs font-mono font-semibold text-amber-600 uppercase tracking-wider mb-2">
          Technical Whitepaper & Architecture
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          CertiChain Protocol Architecture
        </h1>
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          An institutional-grade verification protocol separating private student identity records from public immutable blockchain consensus anchors.
        </p>
      </div>

      {/* Architecture Matrix: On-Chain vs Off-Chain */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs mb-12">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-amber-400" />
            <h2 className="text-sm font-bold tracking-tight">Data Separation Matrix</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-300">FERPA & GDPR Compliant</span>
        </div>

        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs">
          {/* Off-Chain Private Storage */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Database size={16} className="text-blue-600" />
              <span>Off-Chain Encrypted Database (MongoDB / Node.js)</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Stores all human-readable personal identifiable information (PII) required for institutional administration:
            </p>
            <ul className="space-y-2 text-slate-700 list-disc list-inside">
              <li>Student Legal Name & Identification Number</li>
              <li>Academic Degree, Major & Department</li>
              <li>Graduation Year, Grade Classification, Honours</li>
              <li>University Registrar Digital Signatures</li>
              <li>Private account credentials & contact emails</li>
            </ul>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-[11px]">
              <strong>Privacy Protection:</strong> If a student requests record removal or name update under privacy laws, no immutable personal data is trapped on a public blockchain.
            </div>
          </div>

          {/* On-Chain Public Anchor */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Cpu size={16} className="text-amber-600" />
              <span>On-Chain Ethereum Ledger (CertificateRegistry.sol)</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Stores only zero-knowledge cryptographic proofs and institutional authority pointers:
            </p>
            <ul className="space-y-2 text-slate-700 list-disc list-inside">
              <li><code className="bg-slate-100 px-1 py-0.5 rounded font-mono">bytes32 fingerprint</code>: SHA-256 hash of canonical record</li>
              <li><code className="bg-slate-100 px-1 py-0.5 rounded font-mono">address issuerAddress</code>: Authorized signer address</li>
              <li><code className="bg-slate-100 px-1 py-0.5 rounded font-mono">uint64 blockNumber</code> & timestamp: Proof of existence</li>
              <li><code className="bg-slate-100 px-1 py-0.5 rounded font-mono">bool isRevoked</code>: Permanent revocation state flag</li>
              <li><code className="bg-slate-100 px-1 py-0.5 rounded font-mono">string revocationReason</code>: Administrative nullification reason</li>
            </ul>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px]">
              <strong>Tamper Proof:</strong> Any unauthorized change to a student grade or name produces a different SHA-256 hash, causing instant verification failure.
            </div>
          </div>
        </div>
      </div>

      {/* The 4-Step Cryptographic Verification Engine */}
      <div className="space-y-6 mb-12">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Cryptographic Verification Pipeline
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <div className="font-mono text-xs font-bold text-slate-400 mb-1">STEP 01</div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Canonical Serialization</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Record fields are sorted alphabetically into deterministic JSON. Whitespace and keys are strictly normalized.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <div className="font-mono text-xs font-bold text-slate-400 mb-1">STEP 02</div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">SHA-256 Hash Computation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              A 256-bit cryptographic digest is generated from the canonical representation: <code className="text-[10px] bg-slate-100 px-1 font-mono">sha256(data)</code>.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <div className="font-mono text-xs font-bold text-slate-400 mb-1">STEP 03</div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Smart Contract Query</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The verification engine calls <code className="text-[10px] bg-slate-100 px-1 font-mono">verifyCertificate(id, hash)</code> on the Ethereum blockchain.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <div className="font-mono text-xs font-bold text-slate-400 mb-1">STEP 04</div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Authority & Revocation Check</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verifies the signer is an authorized university address and that no revocation transaction has been logged.
            </p>
          </div>
        </div>
      </div>

      {/* College Project Presentation Guide */}
      <div className="bg-slate-900 text-white rounded-xl p-8 border border-slate-800">
        <h2 className="text-lg font-bold mb-2">College Project Defense Walkthrough</h2>
        <p className="text-xs text-slate-300 leading-relaxed mb-6">
          To demonstrate all key aspects of the project during an evaluation, follow this 3-step sequence:
        </p>

        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-slate-800 rounded border border-slate-700 flex items-start gap-3">
            <span className="font-mono font-bold text-amber-400 shrink-0">1. Active Certificate:</span>
            <span>
              Go to Verify and test <code className="text-amber-300 font-mono">CERT-2026-APEX-1001</code>. Observe the green <strong>VERIFIED</strong> verdict, fingerprint match, and real block number #2.
            </span>
          </div>

          <div className="p-3.5 bg-slate-800 rounded border border-slate-700 flex items-start gap-3">
            <span className="font-mono font-bold text-amber-400 shrink-0">2. Disciplinary Revocation:</span>
            <span>
              Test <code className="text-amber-300 font-mono">CERT-2026-APEX-1002</code>. Observe the red <strong>REVOKED</strong> verdict and view the persistent on-chain disciplinary reason recorded on the contract.
            </span>
          </div>

          <div className="p-3.5 bg-slate-800 rounded border border-slate-700 flex items-start gap-3">
            <span className="font-mono font-bold text-amber-400 shrink-0">3. Tamper Detection:</span>
            <span>
              Sign in as University Dean (<code className="text-amber-300 font-mono">admin@apex.edu</code>), click the <strong>Flask icon ("Simulate Altered Record")</strong> on an active certificate, then verify it. Watch the system immediately flag it as <strong>ALTERED</strong> because the cryptographic hash diverged from the immutable on-chain proof!
            </span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Solidity Contract: CertificateRegistry (Solc 0.8.20)</span>
          <Link
            to="/verify"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded transition-colors"
          >
            <span>Launch Live Verification</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};
