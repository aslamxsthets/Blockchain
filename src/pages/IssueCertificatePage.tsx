import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Shield,
  FileCheck2,
  Fingerprint,
} from 'lucide-react';
import { certificatesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const IssueCertificatePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [degreeName, setDegreeName] = useState('Bachelor of Science in Computer Science');
  const [department, setDepartment] = useState('School of Computing & Data Systems');
  const [graduationYear, setGraduationYear] = useState('2026');
  const [gradeClassification, setGradeClassification] = useState('First Class Honours (Summa Cum Laude)');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentEmail, setStudentEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedResult, setIssuedResult] = useState<any | null>(null);

  // Quick preset loader for fast testing
  const handleLoadSample = (sample: 'ai' | 'bio' | 'law') => {
    if (sample === 'ai') {
      setStudentName('David K. Miller');
      setStudentId('STU-2026-9114');
      setStudentEmail('david.miller@student.apex.edu');
      setDegreeName('Master of Science in Autonomous Systems');
      setDepartment('Robotics & Cognitive Computing Faculty');
      setGradeClassification('High Distinction (GPA 3.98)');
    } else if (sample === 'bio') {
      setStudentName('Sarah Al-Mansoor');
      setStudentId('STU-2026-9182');
      setStudentEmail('sarah.almansoor@student.apex.edu');
      setDegreeName('Bachelor of Science in Biomedical Engineering');
      setDepartment('Department of Bioengineering');
      setGradeClassification('Summa Cum Laude');
    } else {
      setStudentName('James Wilson');
      setStudentId('STU-2026-9205');
      setStudentEmail('james.wilson@student.apex.edu');
      setDegreeName('Juris Doctor in Technology & Intellectual Property');
      setDepartment('School of Law');
      setGradeClassification('Magna Cum Laude');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentId || !degreeName || !department || !graduationYear || !gradeClassification || !issueDate) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await certificatesApi.issue({
        studentName: studentName.trim(),
        studentId: studentId.trim().toUpperCase(),
        degreeName: degreeName.trim(),
        department: department.trim(),
        graduationYear: parseInt(graduationYear, 10),
        gradeClassification: gradeClassification.trim(),
        issueDate: issueDate.trim(),
        studentEmail: studentEmail.trim() || undefined,
      });

      setIssuedResult(res.certificate);
    } catch (err: any) {
      setError(err.message || 'Issuance failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        <span>Back to Registry</span>
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-slate-900">Issue Academic Credential</h1>
            <p className="text-xs text-slate-500">
              Signs and anchors credential fingerprint directly to the Ethereum smart contract.
            </p>
          </div>

          {/* Quick presets for evaluation */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Fill Sample:</span>
            <button
              type="button"
              onClick={() => handleLoadSample('ai')}
              className="px-2 py-0.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 text-[11px]"
            >
              M.S. Robotics
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample('bio')}
              className="px-2 py-0.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 text-[11px]"
            >
              B.S. Bioengineering
            </button>
          </div>
        </div>

        {issuedResult ? (
          /* Issuance Success Screen */
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Certificate Successfully Anchored On-Chain!
            </h2>

            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
              The canonical representation was hashed via SHA-256 and confirmed on the smart contract registry in block #{issuedResult.blockNumber}.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-mono text-left max-w-lg mx-auto space-y-1.5">
              <div><span className="text-slate-400">Certificate ID:</span> <strong className="text-slate-900">{issuedResult.id}</strong></div>
              <div><span className="text-slate-400">Student:</span> {issuedResult.studentName} ({issuedResult.studentId})</div>
              <div><span className="text-slate-400">Degree:</span> {issuedResult.degreeName}</div>
              <div className="break-all text-[11px]"><span className="text-slate-400">SHA-256:</span> {issuedResult.fingerprint}</div>
              <div className="break-all text-[11px]"><span className="text-slate-400">Tx Hash:</span> {issuedResult.transactionHash}</div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <Link
                to={`/verify/${issuedResult.id}`}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
              >
                View Public Verification Page
              </Link>
              <a
                href={certificatesApi.getPdfUrl(issuedResult.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
              >
                Download PDF Diploma
              </a>
              <button
                onClick={() => {
                  setIssuedResult(null);
                  setStudentName('');
                  setStudentId('');
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Issue Another
              </button>
            </div>
          </div>
        ) : (
          /* Issuance Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Student Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. David Miller"
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student ID Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU-2026-9114"
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 rounded font-mono uppercase focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Degree / Credential Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={degreeName}
                  onChange={(e) => setDegreeName(e.target.value)}
                  placeholder="e.g. Bachelor of Science in Computer Science"
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Faculty / Academic Department <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. School of Computing & Data Systems"
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Graduation Year <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  min={1950}
                  max={2050}
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Grade / Honours Classification <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={gradeClassification}
                  onChange={(e) => setGradeClassification(e.target.value)}
                  placeholder="e.g. First Class Honours"
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Issue Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Email (Optional Account Link)
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="e.g. david.miller@student.apex.edu"
                className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                If the student creates an account with this email, the certificate will automatically appear in their student portal.
              </p>
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded">
                {error}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Fingerprint size={16} className="text-amber-500" />
                <span>Deterministic Canonical Hash + Ethers Signer Confirmation</span>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors flex items-center gap-2 shadow-xs"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{submitting ? 'Anchoring to Smart Contract...' : 'Issue & Seal on Blockchain'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
