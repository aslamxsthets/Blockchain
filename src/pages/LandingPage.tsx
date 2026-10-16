import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Search,
  CheckCircle2,
  Lock,
  Layers,
  ArrowRight,
  ExternalLink,
  FileCheck2,
  Fingerprint,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const [searchId, setSearchId] = useState('');
  const navigate = useNavigate();
  const { demoLogin } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/verify/${encodeURIComponent(searchId.trim().toUpperCase())}`);
    }
  };

  const handleQuickDemoRole = async (role: 'admin' | 'issuer' | 'student1' | 'student2') => {
    await demoLogin(role);
    if (role === 'admin' || role === 'issuer') {
      navigate('/dashboard');
    } else {
      navigate('/student');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-slate-900 text-white pt-16 pb-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="text-xs uppercase tracking-wider font-semibold text-amber-400">
                Institutional Academic Registry · Ethereum Consensus Anchor
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Tamper-evident university credentials verified cryptographically.
              </h1>

              <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
                CertiChain enables universities to issue digital degrees, students to share verified credentials, and employers to confirm authentic, altered, or revoked credentials without exposing private personal data on-chain.
              </p>

              {/* Instant Verification Search */}
              <form onSubmit={handleSearch} className="max-w-xl pt-2">
                <div className="flex flex-col sm:flex-row gap-2 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                      placeholder="Enter Certificate ID (e.g. CERT-2026-APEX-1001)"
                      className="w-full pl-9 pr-3 py-2.5 bg-transparent text-sm text-white placeholder-slate-400 outline-hidden font-mono uppercase"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
                  >
                    <span>Verify Credential</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Quick Sample Links */}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
                  <span>Test Live Samples:</span>
                  <button
                    type="button"
                    onClick={() => navigate('/verify/CERT-2026-APEX-1001')}
                    className="text-emerald-400 hover:underline font-mono"
                  >
                    CERT-2026-APEX-1001 [Active]
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => navigate('/verify/CERT-2026-APEX-1002')}
                    className="text-rose-400 hover:underline font-mono"
                  >
                    CERT-2026-APEX-1002 [Revoked]
                  </button>
                </div>
              </form>
            </div>

            {/* Visual Technical Anchor Card */}
            <div className="lg:col-span-5">
              <div className="bg-slate-800/90 rounded-xl border border-slate-700 p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                    <Fingerprint size={16} className="text-amber-400" />
                    <span>PROTOCOL ARCHITECTURE</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">CHAIN ID 31337</span>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="p-3 bg-slate-900/60 rounded border border-slate-700/50">
                    <div className="text-[11px] text-slate-400 font-semibold mb-1">OFF-CHAIN PRIVATE STORAGE</div>
                    <div className="text-slate-200">Personal names, student IDs, classifications, and degrees stored in encrypted database. Zero PII exposed publicly.</div>
                  </div>

                  <div className="text-center text-slate-500 font-mono text-[11px]">
                    ↓ Deterministic Canonical Serialization & SHA-256 Hashing
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded border border-slate-700/50">
                    <div className="text-[11px] text-slate-400 font-semibold mb-1">ON-CHAIN CONSENSUS PROOF</div>
                    <div className="text-slate-200 font-mono text-[11px] break-all text-amber-300/90">
                      bytes32 fingerprint = 0x4f3e...b23b · Issuer Authority Anchor
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                  <span>Smart Contract: CertificateRegistry</span>
                  <Link to="/about" className="text-amber-400 hover:underline flex items-center gap-1">
                    <span>View Spec</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column Metric Strip */}
      <section className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">0%</div>
              <div className="text-xs text-slate-500 mt-1">PII Stored on Public Chain</div>
            </div>
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">256-bit</div>
              <div className="text-xs text-slate-500 mt-1">SHA-256 Cryptographic Hash</div>
            </div>
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">100%</div>
              <div className="text-xs text-slate-500 mt-1">Tamper-Evident Ledger Integrity</div>
            </div>
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">&lt; 100ms</div>
              <div className="text-xs text-slate-500 mt-1">Direct Verification Query Speed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Verification Four-Pillar Architecture Section */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Honest Verification Architecture
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Most blockchain certificate prototypes claim a credential is valid merely because a hash was written to a smart contract. CertiChain evaluates four independent security checkpoints before declaring authenticity:
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-800 mb-3 font-mono font-bold text-xs">
                01
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Cryptographic Integrity</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recomputes the SHA-256 hash from canonical student fields and detects if even a single character was altered.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-800 mb-3 font-mono font-bold text-xs">
                02
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Issuer Authorization</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Checks that the signing Ethereum address holds authorized issuer privileges granted by the university registrar.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-800 mb-3 font-mono font-bold text-xs">
                03
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Blockchain Proof</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Validates that the certificate fingerprint is immutably sealed on-chain within an anchored block number and transaction hash.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-800 mb-3 font-mono font-bold text-xs">
                04
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Revocation Status</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cross-references the smart contract revocation registry to identify nullified, disciplinary, or voided credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Project Presentation / Demo Personas Launcher */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 rounded-xl bg-slate-900 text-white border border-slate-800">
            <div className="max-w-2xl mb-6">
              <div className="text-xs text-amber-400 font-mono uppercase tracking-wider mb-1">
                DEMONSTRATION CONTROLS
              </div>
              <h2 className="text-xl font-bold">Project Defense & Evaluation Launcher</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Select any user persona to instantly explore role-specific permissions, issuing flows, PDF downloads, and live revocation simulation.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => handleQuickDemoRole('admin')}
                className="p-4 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors group"
              >
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wide">University Dean (Admin)</div>
                <div className="text-sm font-bold text-white mt-1">Dr. Arthur Sterling</div>
                <div className="text-xs text-slate-400 mt-2">Full registry, issue, revoke, issuer management, audit trails.</div>
              </button>

              <button
                onClick={() => handleQuickDemoRole('issuer')}
                className="p-4 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors group"
              >
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Registrar (Issuer)</div>
                <div className="text-sm font-bold text-white mt-1">Elena Rostova</div>
                <div className="text-xs text-slate-400 mt-2">Issue student degrees, trigger revocation, print PDFs.</div>
              </button>

              <button
                onClick={() => handleQuickDemoRole('student1')}
                className="p-4 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors group"
              >
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Student (Valid)</div>
                <div className="text-sm font-bold text-white mt-1">Alex Chen</div>
                <div className="text-xs text-slate-400 mt-2">2 active degrees, QR code sharing, PDF download.</div>
              </button>

              <button
                onClick={() => handleQuickDemoRole('student2')}
                className="p-4 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors group"
              >
                <div className="text-xs font-semibold text-rose-400 uppercase tracking-wide">Student (Revoked)</div>
                <div className="text-sm font-bold text-white mt-1">Maria Santos</div>
                <div className="text-xs text-slate-400 mt-2">1 revoked credential with disciplinary reason.</div>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
