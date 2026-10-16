import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { Certificate } from '../types';
import { certificatesApi } from '../api/client';

interface RevokeModalProps {
  certificate: Certificate | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RevokeModal: React.FC<RevokeModalProps> = ({
  certificate,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !certificate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a substantive revocation reason (at least 5 characters).');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await certificatesApi.revoke(certificate.id, reason.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke certificate on blockchain.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-600" />
            <h3 className="text-base font-semibold text-rose-950">Revoke Academic Credential</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="text-xs text-slate-600 mb-4 space-y-2">
            <p>
              You are about to nullify the following certificate on the blockchain ledger:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1 font-mono">
              <div><span className="text-slate-400">ID:</span> <strong className="text-slate-800">{certificate.id}</strong></div>
              <div><span className="text-slate-400">Student:</span> {certificate.studentName} ({certificate.studentId})</div>
              <div><span className="text-slate-400">Degree:</span> {certificate.degreeName}</div>
            </div>
            <p className="text-rose-700 bg-rose-50 border border-rose-200 rounded p-2.5 text-[11px] leading-relaxed">
              <strong>Cryptographic Permanence Notice:</strong> Blockchain state is append-only. Revocation submits a signed transaction that permanently records this credential as REVOKED. It cannot be undone.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Official Revocation Reason <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Disciplinary suspension, academic integrity violation, or administrative re-issuance..."
              rows={3}
              required
              className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              This statement will be stored on-chain and rendered to any verifier checking this credential.
            </p>
          </div>

          {error && (
            <div className="mb-4 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors flex items-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              <span>{loading ? 'Submitting Blockchain Transaction...' : 'Confirm Permanent Revocation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
