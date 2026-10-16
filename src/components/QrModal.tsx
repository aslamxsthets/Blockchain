import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import { Certificate } from '../types';

interface QrModalProps {
  certificate: Certificate | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QrModal: React.FC<QrModalProps> = ({ certificate, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen || !certificate) return null;

  const verificationUrl = `${window.location.origin}/verify/${encodeURIComponent(certificate.id)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Certificate Verification QR</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{certificate.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center">
          {certificate.qrCodeDataUrl ? (
            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs mb-4">
              <img
                src={certificate.qrCodeDataUrl}
                alt={`QR code for ${certificate.id}`}
                className="w-56 h-56 object-contain"
              />
            </div>
          ) : (
            <div className="w-56 h-56 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs mb-4">
              Generating QR...
            </div>
          )}

          <p className="text-xs text-slate-600 mb-4 max-w-xs">
            Scan this QR code with any mobile device camera or barcode reader to instantly verify authenticity against the blockchain ledger.
          </p>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-2 mb-4">
            <span className="text-xs font-mono text-slate-700 truncate select-all">
              {verificationUrl}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 text-slate-600 hover:text-slate-950 rounded hover:bg-slate-200 transition-colors shrink-0"
              title="Copy verification URL"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full">
            <a
              href={verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              <ExternalLink size={14} />
              <span>Open Public Page</span>
            </a>
            <button
              onClick={onClose}
              className="flex-1 py-2 px-3 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
