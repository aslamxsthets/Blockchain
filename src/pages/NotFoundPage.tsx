import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
        <FileQuestion size={24} />
      </div>
      <h1 className="text-xl font-bold text-slate-900">404 - Page Not Found</h1>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">
        The requested URL path does not exist on the CertiChain university portal.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Return to CertiChain Home</span>
      </Link>
    </div>
  );
};
