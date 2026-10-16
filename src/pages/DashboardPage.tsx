import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileCheck,
  XCircle,
  Clock,
  Search,
  Plus,
  Download,
  QrCode,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Cpu,
  History,
  Users,
  FlaskConical,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { certificatesApi, dashboardApi, institutionsApi } from '../api/client';
import { Certificate, DashboardStats } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { QrModal } from '../components/QrModal';
import { RevokeModal } from '../components/RevokeModal';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'certificates' | 'audit' | 'issuers'>('certificates');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [error, setError] = useState<string | null>(null);

  // Modals & Actions
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [tamperingId, setTamperingId] = useState<string | null>(null);

  // Audit Events & Issuers
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [issuers, setIssuers] = useState<any[]>([]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const [certRes, statsRes] = await Promise.all([
        certificatesApi.getAll(),
        dashboardApi.getStats(),
      ]);
      setCertificates(certRes.certificates);
      setStats(statsRes);
    } catch (err: any) {
      console.warn('Dashboard data fetch notification:', err?.message);
      setError(err?.message || 'Failed to retrieve ledger data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'issuer')) {
      loadData();
    }
  }, [user]);

  const loadAuditEvents = async () => {
    try {
      const res = await dashboardApi.getAuditEvents();
      setAuditEvents(res.events);
    } catch (e) {
      console.error(e);
    }
  };

  const loadIssuers = async () => {
    try {
      const res = await institutionsApi.getIssuers();
      setIssuers(res.issuers);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') loadAuditEvents();
    if (activeTab === 'issuers') loadIssuers();
  }, [activeTab]);

  const handleSimulateTamper = async (cert: Certificate) => {
    try {
      setTamperingId(cert.id);
      const nextActiveState = !cert.isTamperedSimulation;
      await certificatesApi.simulateTamper(cert.id, nextActiveState);
      await loadData();
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setTamperingId(null);
    }
  };

  const filteredCertificates = certificates.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.degreeName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.issuanceState === 'issued') ||
      (statusFilter === 'revoked' && c.issuanceState === 'revoked') ||
      (statusFilter === 'pending' && c.issuanceState === 'pending');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            {user?.institution?.name || 'Apex Institute of Technology & Science'} · Registrar Registry
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Academic Credential Registry
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
            title="Refresh database records"
          >
            <RefreshCw size={15} />
          </button>
          <Link
            to="/issue"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors shadow-xs"
          >
            <Plus size={15} />
            <span>Issue Academic Certificate</span>
          </Link>
        </div>
      </div>

      {/* Error state if ledger query fails */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-rose-900">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="self-start sm:self-auto px-3 py-1.5 bg-rose-700 text-white font-medium rounded hover:bg-rose-800 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw size={13} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Total Anchored</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {stats?.stats.totalCertificates ?? '...'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Cryptographic certificates</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-emerald-700">Active Verified</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
            {stats?.stats.activeIssued ?? '...'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Confirmed on-chain</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-rose-700">Revoked Degrees</div>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1 tabular-nums">
            {stats?.stats.revokedCount ?? '...'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Disciplinary nullifications</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Verification Scans</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {stats?.stats.verificationChecks ?? '...'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Third-party audits</div>
        </div>
      </div>

      {/* Blockchain Network Telemetry Card */}
      {stats?.blockchainStatus && (
        <div className="bg-slate-900 text-white rounded-lg border border-slate-800 p-4 mb-8 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-amber-400" />
              <span className="font-semibold text-slate-200">Consensus Ledger:</span>
              <span className="text-emerald-400">ACTIVE ({stats.blockchainStatus.network})</span>
            </div>
            <div className="text-slate-400">
              Block Height: <span className="text-white font-bold tabular-nums">#{stats.blockchainStatus.blockNumber}</span>
            </div>
            <div className="text-slate-400 truncate max-w-sm">
              Registry: <span className="text-amber-300">{stats.blockchainStatus.contractAddress}</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Tabs Header (Single line, buttons allowed for interactive controls) */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('certificates')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'certificates'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Certificate Records ({certificates.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Audit Log History
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('issuers')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'issuers'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Authorized Issuers
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Certificate Records */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 border border-slate-200 rounded-lg">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, name, student #, or degree..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs text-slate-500 whitespace-nowrap">Filter:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white font-medium' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                  statusFilter === 'active' ? 'bg-emerald-800 text-white font-medium' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('revoked')}
                className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                  statusFilter === 'revoked' ? 'bg-rose-800 text-white font-medium' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Revoked
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Certificate ID</th>
                    <th className="py-3 px-4">Student & ID</th>
                    <th className="py-3 px-4">Degree & Faculty</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Issued Date</th>
                    <th className="py-3 px-4">Integrity Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCertificates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        No certificates match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCertificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <Link to={`/verify/${cert.id}`} className="hover:underline flex items-center gap-1">
                            <span>{cert.id}</span>
                            <ExternalLink size={11} className="text-slate-400" />
                          </Link>
                          {cert.isTamperedSimulation && (
                            <span className="block text-[10px] font-sans text-amber-600 font-medium">
                              [Simulated Alteration Active]
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{cert.studentName}</div>
                          <div className="text-[11px] font-mono text-slate-500">{cert.studentId}</div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-slate-800 truncate">{cert.degreeName}</div>
                          <div className="text-[11px] text-slate-500 truncate">{cert.department}</div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          {cert.gradeClassification}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                          {cert.issueDate}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {cert.issuanceState === 'issued' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Active</span>
                            </span>
                          ) : cert.issuanceState === 'revoked' ? (
                            <span className="inline-flex items-center gap-1 text-rose-800 font-medium">
                              <XCircle size={13} className="text-rose-600" />
                              <span>Revoked</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                              <Clock size={13} className="text-slate-400" />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedCert(cert);
                                setQrModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                              title="Show QR Code"
                            >
                              <QrCode size={14} />
                            </button>

                            <a
                              href={certificatesApi.getPdfUrl(cert.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                              title="Download PDF Diploma"
                            >
                              <Download size={14} />
                            </a>

                            {/* Demo Tamper simulation toggle */}
                            <button
                              onClick={() => handleSimulateTamper(cert)}
                              disabled={tamperingId === cert.id}
                              className={`p-1.5 rounded transition-colors ${
                                cert.isTamperedSimulation
                                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                  : 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                              }`}
                              title={
                                cert.isTamperedSimulation
                                  ? 'Restore original cryptographic integrity'
                                  : 'Simulate altered data to demonstrate ALTERED detection'
                              }
                            >
                              <FlaskConical size={14} />
                            </button>

                            {cert.issuanceState !== 'revoked' && (
                              <button
                                onClick={() => {
                                  setSelectedCert(cert);
                                  setRevokeModalOpen(true);
                                }}
                                className="px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Audit Log History */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Immutable System & Issuance Audit Events
            </h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {auditEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-400">Loading audit history...</div>
            ) : (
              auditEvents.map((event) => (
                <div key={event.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{event.action}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-700 font-medium">{event.actorName}</span>
                      <span className="text-slate-400 font-mono text-[11px]">({event.actorRole})</span>
                    </div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      Target: {event.targetRecord}
                      {event.transactionHash && (
                        <span> · Tx: {event.transactionHash.substring(0, 18)}...</span>
                      )}
                    </div>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px] whitespace-nowrap tabular-nums">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Authorized Issuers */}
      {activeTab === 'issuers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Authorized Institutional Issuers
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Registered administrators permitted to sign and anchor degrees on the smart contract.
            </p>

            <div className="divide-y divide-slate-100 text-xs">
              {issuers.map((issuer) => (
                <div key={issuer.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{issuer.name}</div>
                    <div className="text-slate-500 font-mono text-[11px]">{issuer.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">
                      {issuer.role}
                    </span>
                    <span className="text-emerald-700 font-semibold text-[11px]">
                      Authorized
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QrModal
        certificate={selectedCert}
        isOpen={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false);
          setSelectedCert(null);
        }}
      />

      {/* Revocation Modal */}
      <RevokeModal
        certificate={selectedCert}
        isOpen={revokeModalOpen}
        onClose={() => {
          setRevokeModalOpen(false);
          setSelectedCert(null);
        }}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
};
