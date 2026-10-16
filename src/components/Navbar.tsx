import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, ChevronDown, LogOut, User as UserIcon, Check } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const handleRoleSwitch = async (role: 'admin' | 'issuer' | 'student1' | 'student2') => {
    setDemoMenuOpen(false);
    await demoLogin(role);
    if (role === 'admin' || role === 'issuer') {
      navigate('/dashboard');
    } else {
      navigate('/student');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element with icon) */}
        <Link to="/" className="flex items-center gap-2.5 text-slate-900 whitespace-nowrap shrink-0 group">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold tracking-tight shadow-xs">
            <Shield size={18} className="text-amber-400" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-slate-900 group-hover:text-slate-800 transition-colors">
            CertiChain
          </span>
        </Link>

        {/* Zone 2: 4-5 Clean Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <Link
            to="/verify"
            className={`transition-colors whitespace-nowrap shrink-0 ${
              location.pathname.startsWith('/verify') ? 'text-slate-950 font-semibold' : 'hover:text-slate-950'
            }`}
          >
            Verify Credential
          </Link>
          <Link
            to="/about"
            className={`transition-colors whitespace-nowrap shrink-0 ${
              location.pathname === '/about' ? 'text-slate-950 font-semibold' : 'hover:text-slate-950'
            }`}
          >
            Protocol Architecture
          </Link>
          {isAuthenticated && (user?.role === 'admin' || user?.role === 'issuer') && (
            <Link
              to="/dashboard"
              className={`transition-colors whitespace-nowrap shrink-0 ${
                location.pathname.startsWith('/dashboard') ? 'text-slate-950 font-semibold' : 'hover:text-slate-950'
              }`}
            >
              Institution Registry
            </Link>
          )}
          {isAuthenticated && user?.role === 'student' && (
            <Link
              to="/student"
              className={`transition-colors whitespace-nowrap shrink-0 ${
                location.pathname.startsWith('/student') ? 'text-slate-950 font-semibold' : 'hover:text-slate-950'
              }`}
            >
              My Certificates
            </Link>
          )}
        </nav>

        {/* Zone 3: 1 Primary Action Area */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quick Demo Persona Switcher (Convenient for live testing) */}
          <div className="relative">
            <button
              onClick={() => setDemoMenuOpen(!demoMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
              title="Switch demo persona"
            >
              <span className="text-slate-500 font-mono text-[11px]">Role:</span>
              <span className="font-semibold">
                {isAuthenticated ? user?.role.toUpperCase() : 'PUBLIC'}
              </span>
              <ChevronDown size={13} className="text-slate-500" />
            </button>

            {demoMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 text-xs">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Demo Persona
                </div>
                <button
                  onClick={() => handleRoleSwitch('admin')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-800">Dr. Arthur Sterling</div>
                    <div className="text-[11px] text-slate-500">University Dean (Admin)</div>
                  </div>
                  {user?.email === 'admin@apex.edu' && <Check size={14} className="text-emerald-600" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('issuer')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-800">Elena Rostova</div>
                    <div className="text-[11px] text-slate-500">Registrar (Issuer)</div>
                  </div>
                  {user?.email === 'issuer@apex.edu' && <Check size={14} className="text-emerald-600" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('student1')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-800">Alex Chen</div>
                    <div className="text-[11px] text-slate-500">Student (2 Active Credentials)</div>
                  </div>
                  {user?.email === 'alex.chen@student.apex.edu' && <Check size={14} className="text-emerald-600" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('student2')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-800">Maria Santos</div>
                    <div className="text-[11px] text-rose-600">Student (1 Revoked Credential)</div>
                  </div>
                  {user?.email === 'maria.santos@student.apex.edu' && <Check size={14} className="text-emerald-600" />}
                </button>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-xs text-slate-600 max-w-[140px] truncate">
                {user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
