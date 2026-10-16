import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-slate-700" />
            <span className="font-semibold text-slate-900">CertiChain Protocol</span>
            <span className="text-slate-400">·</span>
            <span>Cryptographic Academic Credential Verification</span>
          </div>

          <div className="flex items-center gap-6 text-slate-500">
            <Link to="/verify" className="hover:text-slate-900 transition-colors">
              Verify
            </Link>
            <Link to="/about" className="hover:text-slate-900 transition-colors">
              Architecture & Security
            </Link>
            <span className="text-slate-400">·</span>
            <span className="font-mono text-[11px] text-slate-400">Local EVM Devnet (Chain ID 31337)</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <p>
            Off-chain PII data protected under FERPA & GDPR standards. Cryptographic SHA-256 fingerprints anchored on Ethereum consensus registry.
          </p>
          <p>
            Academic Demonstration Project · Institutional Grade
          </p>
        </div>
      </div>
    </footer>
  );
};
