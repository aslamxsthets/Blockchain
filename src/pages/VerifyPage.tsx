import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, QrCode, Shield, CheckCircle2, XCircle, ArrowRight, FileSearch } from 'lucide-react';

export const VerifyPage: React.FC = () => {
  const [certId, setCertId] = useState('');
  const navigate = useNavigate();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (certId.trim()) {
      navigate(`/verify/${encodeURIComponent(certId.trim().toUpperCase())}`);
    }
  };

  const sampleCertificates = [
    {
      id: 'CERT-2026-APEX-1001',
      student: 'Alex Chen',
      degree: 'B.S. Computer Science',
      expectedState: 'VERIFIED',
      note: 'Cryptographic match on block #2',
    },
    {
      id: 'CERT-2026-APEX-1002',
      student: 'Maria Santos',
      degree: 'M.S. Data Intelligence',
      expectedState: 'REVOKED',
      note: 'Disciplinary revocation recorded on-chain',
    },
    {
      id: 'CERT-2026-APEX-1003',
      student: 'Alex Chen',
      degree: 'Dip. Cryptographic Engineering',
      expectedState: 'VERIFIED',
      note: 'Active credential',
    },
    {
      id: 'CERT-FAKE-999999',
      student: 'Non-existent',
      degree: 'Fabricated Credential',
      expectedState: 'NOT_FOUND',
      note: 'Unregistered identifier',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center mx-auto mb-3">
          <FileSearch size={20} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Verify Academic Credential
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
          Enter an official CertiChain certificate ID or test our live demo samples to audit cryptographic integrity and blockchain confirmation.
        </p>
      </div>

      {/* Main Search Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-10">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Certificate Identifier
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={certId}
                onChange={(e) => setCertId(e.target.value)}
                placeholder="e.g. CERT-2026-APEX-1001"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden uppercase"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Found on the bottom of official paper transcripts, diplomas, or embedded inside the verification QR code.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Zero login required · Instant public lookup
            </span>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>Validate Integrity</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>

      {/* Live Pre-configured Test Samples */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Interactive Test Samples (Live Ledger State)
          </h2>
          <span className="text-[11px] text-slate-500">Click any row to test</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {sampleCertificates.map((sample) => (
            <button
              key={sample.id}
              onClick={() => navigate(`/verify/${sample.id}`)}
              className="p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-left transition-all hover:shadow-xs group flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="font-mono text-xs font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                  {sample.id}
                </div>
                <div className="text-xs text-slate-700 font-medium">
                  {sample.student} · {sample.degree}
                </div>
                <div className="text-[11px] text-slate-500">
                  {sample.note}
                </div>
              </div>

              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded shrink-0 ${
                  sample.expectedState === 'VERIFIED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : sample.expectedState === 'REVOKED'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {sample.expectedState}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
