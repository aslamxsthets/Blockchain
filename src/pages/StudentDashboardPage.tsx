import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Download,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertOctagon,
  Clock,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { certificatesApi } from '../api/client';
import { Certificate } from '../types';
import { QrModal } from '../components/QrModal';

export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (cert: Certificate) => {
    try {
      setDownloadingId(cert.id);
      await certificatesApi.downloadPdf(cert.id, cert.studentName);
    } catch (err) {
      console.error('PDF download error:', err);
      window.open(certificatesApi.getPdfUrl(cert.id), '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  const loadStudentCertificates = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await certificatesApi.getAll();
      setCertificates(res.certificates);
    } catch (err) {
      console.warn('Student certificates fetch notification:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'student') {
      loadStudentCertificates();
    }
  }, [user]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Student Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Student Portal · {user?.studentId || 'Enrolled Student'}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            {user?.name}'s Academic Credentials
          </h1>
        </div>

        <button
          onClick={loadStudentCertificates}
          className="self-start sm:self-auto p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
          title="Refresh credentials"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
          <div className="text-xs">Loading verified certificates...</div>
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <GraduationCap size={44} className="text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800">No Credentials Issued Yet</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Your university registrar has not yet anchored an academic certificate to your student record ID ({user?.studentId}).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {certificates.map((cert) => {
            const isIssued = cert.issuanceState === 'issued';
            const isRevoked = cert.issuanceState === 'revoked';

            return (
              <div
                key={cert.id}
                className={`bg-white rounded-xl border shadow-xs overflow-hidden transition-all ${
                  isRevoked
                    ? 'border-rose-200 ring-1 ring-rose-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {cert.id}
                        </span>
                        <button
                          onClick={() => handleCopyId(cert.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                          title="Copy Certificate ID"
                        >
                          {copiedId === cert.id ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                        <span className="text-slate-300">·</span>
                        {isIssued ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <ShieldCheck size={14} className="text-emerald-600" />
                            <span>Active & Verified</span>
                          </span>
                        ) : isRevoked ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                            <AlertOctagon size={14} className="text-rose-600" />
                            <span>Credential Revoked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                            <Clock size={14} className="text-slate-500" />
                            <span>Pending Confirmation</span>
                          </span>
                        )}
                      </div>

                      <h2 className="text-lg font-bold text-slate-900">
                        {cert.degreeName}
                      </h2>
                      <div className="text-xs text-slate-600">
                        {cert.institutionName} · {cert.department}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium pt-0.5">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>Cryptographically signed with institutional registrar key</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedCert(cert);
                          setQrModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded transition-colors flex items-center gap-1.5"
                      >
                        <QrCode size={14} />
                        <span>Share QR</span>
                      </button>

                      <button
                        onClick={() => handleDownloadPdf(cert)}
                        disabled={downloadingId === cert.id}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors flex items-center gap-1.5 shadow-2xs"
                        title="Download cryptographically signed official PDF diploma"
                      >
                        {downloadingId === cert.id ? (
                          <Loader2 size={13} className="animate-spin text-slate-600" />
                        ) : (
                          <Download size={13} className="text-slate-700" />
                        )}
                        <span>{downloadingId === cert.id ? 'Signing & Downloading...' : 'Download as PDF (Signed)'}</span>
                      </button>

                      <Link
                        to={`/verify/${cert.id}`}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors flex items-center gap-1.5"
                      >
                        <ExternalLink size={14} />
                        <span>Public Verification Link</span>
                      </Link>
                    </div>
                  </div>

                  {/* Detail Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Classification</span>
                      <span className="font-semibold text-slate-800">{cert.gradeClassification}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Class Year</span>
                      <span className="font-semibold text-slate-800">Class of {cert.graduationYear}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Issued Date</span>
                      <span className="font-mono text-slate-800">{cert.issueDate}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Verification Downloads</span>
                      <span className="font-mono text-slate-800 tabular-nums">{cert.downloadCount || 0} times</span>
                    </div>
                  </div>

                  {/* Revocation banner if revoked */}
                  {isRevoked && (
                    <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs">
                      <div className="font-semibold text-rose-900">
                        Nullification Notice: {cert.revocationReason || 'Revoked by institution'}
                      </div>
                      <div className="text-[11px] text-rose-600 mt-0.5 font-mono">
                        Revoked on {cert.revokedAt ? new Date(cert.revokedAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  )}

                  {/* Cryptographic anchor footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
                    <span className="truncate max-w-md">
                      SHA-256: 0x{cert.fingerprint}
                    </span>
                    <span className="shrink-0 text-slate-500">
                      Block #{cert.blockNumber} · {cert.blockchainNetwork}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Modal */}
      <QrModal
        certificate={selectedCert}
        isOpen={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false);
          setSelectedCert(null);
        }}
      />
    </div>
  );
};
