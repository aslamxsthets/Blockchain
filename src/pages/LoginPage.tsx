import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, demoLogin, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'student') {
        navigate('/student');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = async (role: 'admin' | 'issuer' | 'student1' | 'student2') => {
    try {
      setLoading(true);
      setError(null);
      await demoLogin(role);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-12 h-12 rounded bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs mb-4">
          <Shield size={24} className="text-amber-400" />
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
          CertiChain Academic Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600">
          Sign in to issue credentials, manage registries, or view student certificates.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Institutional Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@apex.edu"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              <span>Sign In to Institutional Portal</span>
            </button>
          </form>

          {/* Quick Demo Switcher Strip */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              One-Click Demonstration Logins
            </div>
            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => handleDemoFill('admin')}
                className="p-2 border border-slate-200 rounded hover:bg-slate-50 transition-colors text-left"
              >
                <div className="text-[11px] font-bold text-slate-900">Dr. Sterling</div>
                <div className="text-[10px] text-slate-500">Dean (Admin)</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('issuer')}
                className="p-2 border border-slate-200 rounded hover:bg-slate-50 transition-colors text-left"
              >
                <div className="text-[11px] font-bold text-slate-900">Elena Rostova</div>
                <div className="text-[10px] text-slate-500">Registrar (Issuer)</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('student1')}
                className="p-2 border border-slate-200 rounded hover:bg-slate-50 transition-colors text-left"
              >
                <div className="text-[11px] font-bold text-slate-900">Alex Chen</div>
                <div className="text-[10px] text-emerald-600 font-medium">Student (Active)</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('student2')}
                className="p-2 border border-slate-200 rounded hover:bg-slate-50 transition-colors text-left"
              >
                <div className="text-[11px] font-bold text-slate-900">Maria Santos</div>
                <div className="text-[10px] text-rose-600 font-medium">Student (Revoked)</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
