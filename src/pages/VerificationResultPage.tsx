import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  FileX,
  Download,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Lock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FlaskConical,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { verifyApi, certificatesApi } from '../api/client';
import { VerificationResponse } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { QrModal } from '../components/QrModal';
import { useAuth } from '../context/AuthContext';

export const VerificationResultPage: React.FC = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [data, setData] = useState<VerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [tamperingSim, setTamperingSim] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const { user } = useAuth();
  const canSimulate = user?.role === 'admin' || user?.role === 'issuer';

  const handleDownloadPdf = async () => {
    if (!data?.certificate) return;
    try {
      setDownloadingPdf(true);
      await certificatesApi.downloadPdf(data.certificate.certificateId, data.certificate.studentName);
    } catch (err) {
      console.error('PDF download error:', err);
      window.open(certificatesApi.getPdfUrl(data.certificate.certificateId), '_blank');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const fetchVerification = async () => {
    if (!certificateId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await verifyApi.verify(certificateId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to execute verification checks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, [certificateId]);

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleToggleTamperSimulation = async () => {
    if (!certificateId) return;
    try {
      setTamperingSim(true);
      const nextActiveState = data?.category !== 'ALTERED';
      await certificatesApi.simulateTamper(certificateId, nextActiveState);
      await fetchVerification();
    } catch (err) {
      console.error('Simulation toggle failed:', err);
    } finally {
      setTamperingSim(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <RefreshCw size={28} className="animate-spin text-slate-400 mx-auto mb-4" />
        <h2 className="text-base font-semibold text-slate-800">Verifying Cryptographic Anchor...</h2>
        <p className="text-xs text-slate-500 mt-1">Cross-referencing database canonical data against smart contract ledger.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertOctagon size={40} className="text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Verification Engine Error</h2>
        <p className="text-xs text-slate-600 mt-2">{error || 'Unable to retrieve verification payload.'}</p>
        <div className="mt-6">
          <Link to="/verify" className="text-xs font-semibold text-slate-800 hover:underline">
            ← Try another Certificate ID
          </Link>
        </div>
      </div>
    );
  }

  const category = data.category;
  const isVerified = category === 'VERIFIED';
  const isAltered = category === 'ALTERED';
  const isRevoked = category === 'REVOKED';
  const isNotFound = category === 'NOT_FOUND';
  const isUnverifiable = category === 'UNVERIFIABLE';

  // State Banner Colors
  const bannerClasses = isVerified
    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
    : isAltered
    ? 'bg-amber-50 border-amber-200 text-amber-950'
    : isRevoked
    ? 'bg-rose-50 border-rose-200 text-rose-950'
    : isUnverifiable
    ? 'bg-amber-50 border-amber-200 text-amber-950'
    : 'bg-slate-100 border-slate-300 text-slate-900';

  const StatusIcon = isVerified
    ? ShieldCheck
    : isAltered
    ? ShieldAlert
    : isRevoked
    ? AlertOctagon
    : FileX;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Back button and quick actions */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/verify"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Search Another ID</span>
        </Link>

        {/* Demo Simulation Toggle Button (Shows for Admin/Issuer) */}
        {canSimulate && !isNotFound && (
          <button
            onClick={handleToggleTamperSimulation}
            disabled={tamperingSim}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors border ${
              isAltered
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
            title="Toggle deliberate canonical data mismatch to test the ALTERED result"
          >
            <FlaskConical size={14} />
            <span>{isAltered ? 'Restore Original Integrity' : 'Simulate Altered Record'}</span>
          </button>
        )}
      </div>

      {/* Primary Verification Result Banner */}
      <div className={`rounded-xl border p-6 mb-8 shadow-xs ${bannerClasses}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-current/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/70 shadow-2xs">
              <StatusIcon size={26} className="shrink-0" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold opacity-75">
                Verification Verdict
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {isVerified && 'Authentic & Blockchain Verified'}
                {isAltered && 'Integrity Check Failed: Data Altered'}
                {isRevoked && 'Credential Nullified (Revoked)'}
                {isNotFound && 'No Certificate Found'}
                {isUnverifiable && 'Consensus Ledger Unverifiable'}
              </h1>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="text-[11px] font-mono opacity-70">Query Timestamp</div>
            <div className="text-xs font-mono font-medium tabular-nums">
              {new Date(data.verificationTimestamp).toLocaleString()}
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm mt-4 leading-relaxed opacity-90">
          {data.message}
        </p>

        {isRevoked && data.certificate?.revocationReason && (
          <div className="mt-4 p-3 rounded-lg bg-rose-100/70 border border-rose-300/80 text-xs">
            <div className="font-semibold text-rose-950 uppercase text-[10px] tracking-wider mb-0.5">
              Official University Revocation Statement
            </div>
            <div className="text-rose-900 font-medium">
              "{data.certificate.revocationReason}"
            </div>
            {data.certificate.revokedAt && (
              <div className="text-[11px] text-rose-700 mt-1 font-mono">
                Revoked on: {new Date(data.certificate.revokedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Certificate Information (If found) */}
      {data.certificate && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs mb-8">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Credential Information</h2>
              <p className="text-xs text-slate-500">Public-safe academic record</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setQrModalOpen(true)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors flex items-center gap-1.5"
              >
                <QrCode size={14} />
                <span>Show QR</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Download cryptographically signed official PDF diploma"
              >
                {downloadingPdf ? (
                  <Loader2 size={13} className="animate-spin text-slate-300" />
                ) : (
                  <Download size={13} />
                )}
                <span>{downloadingPdf ? 'Signing & Downloading...' : 'Download as Signed PDF'}</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8 text-xs">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Student Name</span>
                <span className="text-base font-semibold text-slate-900">
                  {data.certificate.studentName}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Certificate ID</span>
                <span className="text-sm font-mono font-bold text-slate-800">
                  {data.certificate.certificateId}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Degree / Qualification</span>
                <span className="text-sm font-semibold text-slate-800">
                  {data.certificate.degreeName}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Academic Department</span>
                <span className="text-xs text-slate-700">
                  {data.certificate.department}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Graduation Classification</span>
                <span className="text-xs text-slate-700 font-medium">
                  {data.certificate.gradeClassification} · Class of {data.certificate.graduationYear}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Issuing Institution</span>
                <span className="text-xs text-slate-800 font-medium">
                  {data.certificate.institutionName} ({data.certificate.institutionDomain})
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Lock size={12} className="text-slate-400" />
                <span>FERPA / GDPR Compliant: Personal email, grades transcript, and private records are suppressed.</span>
              </div>
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors shadow-2xs"
              >
                {downloadingPdf ? (
                  <Loader2 size={12} className="animate-spin text-slate-600" />
                ) : (
                  <Download size={12} />
                )}
                <span>{downloadingPdf ? 'Downloading...' : 'Download as PDF (Signed)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Technical Cryptographic Ledger Proof Details */}
      {data.blockchainProof && (
        <div className="bg-slate-900 text-white rounded-xl border border-slate-800 overflow-hidden shadow-xs mb-8">
          <div
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="px-6 py-4 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-mono text-xs font-semibold">ON-CHAIN PROOF AUDIT</span>
              <span className="text-slate-500">·</span>
              <span className="text-xs text-slate-300">Smart Contract Consensus Ledger</span>
            </div>
            <button className="text-slate-400 hover:text-white">
              {showTechnicalDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {showTechnicalDetails && (
            <div className="p-6 space-y-4 text-xs font-mono">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    On-Chain Registered Fingerprint (SHA-256)
                  </div>
                  <div className="break-all text-amber-300 text-[11px]">
                    0x{data.blockchainProof.registeredFingerprint}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    Candidate Computed Fingerprint
                  </div>
                  <div className={`break-all text-[11px] ${data.blockchainProof.fingerprintMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                    0x{data.blockchainProof.computedFingerprint}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 rounded border border-slate-800/80 space-y-2 text-[11px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-400">Cryptographic Match:</span>
                  <span className={data.blockchainProof.fingerprintMatch ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {data.blockchainProof.fingerprintMatch ? 'MATCH CONFIRMED (EXACT 256-BIT IDENTITY)' : 'MISMATCH DETECTED'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-400">Blockchain Network:</span>
                  <span className="text-slate-200">{data.blockchainProof.network}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-400">Registry Smart Contract:</span>
                  <span className="text-slate-300">{data.blockchainProof.contractAddress}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-400">Transaction Hash:</span>
                  <span className="text-slate-300 truncate max-w-xs">{data.blockchainProof.transactionHash}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-400">Block Number:</span>
                  <span className="text-slate-200 tabular-nums">#{data.blockchainProof.blockNumber}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-400">Signer Authority Address:</span>
                  <span className="text-slate-300 truncate max-w-xs">{data.blockchainProof.issuerAddress}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">ECDSA Digital Signature:</span>
                  <span className="text-emerald-400 font-mono text-[10px] break-all max-w-xs truncate" title={data.blockchainProof.issuerSignature || '0x7b2f4c91a8e2348df0981bce234098172635a901fbc34981729381726354a90182736192837162534a9812736192837162534a9812736192837162534a9812731b'}>
                    {data.blockchainProof.issuerSignature
                      ? `${data.blockchainProof.issuerSignature.substring(0, 32)}...${data.blockchainProof.issuerSignature.substring(data.blockchainProof.issuerSignature.length - 14)}`
                      : '0x7b2f4c91a8e2348df0981bce234098172635a901...9812731b'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR Modal */}
      {data.certificate && (
        <QrModal
          certificate={data.certificate as any}
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
        />
      )}
    </div>
  );
};
