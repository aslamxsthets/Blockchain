import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldAlert } from 'lucide-react';

interface StatusBadgeProps {
  status: 'VERIFIED' | 'ALTERED' | 'REVOKED' | 'NOT_FOUND' | 'UNVERIFIABLE' | 'issued' | 'pending' | 'revoked';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showIcon = true, size = 'md' }) => {
  const normalized = status.toUpperCase();

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 13,
    md: 15,
    lg: 18,
  };

  switch (normalized) {
    case 'VERIFIED':
    case 'ISSUED':
      return (
        <span className={`inline-flex items-center font-medium text-emerald-800 dark:text-emerald-300 ${sizeClasses[size]}`}>
          {showIcon && <CheckCircle2 size={iconSizes[size]} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
          <span>Authentic & Verified</span>
        </span>
      );

    case 'ALTERED':
      return (
        <span className={`inline-flex items-center font-medium text-amber-800 dark:text-amber-300 ${sizeClasses[size]}`}>
          {showIcon && <AlertTriangle size={iconSizes[size]} className="shrink-0 text-amber-600 dark:text-amber-400" />}
          <span>Integrity Mismatch (Altered)</span>
        </span>
      );

    case 'REVOKED':
      return (
        <span className={`inline-flex items-center font-medium text-rose-800 dark:text-rose-300 ${sizeClasses[size]}`}>
          {showIcon && <XCircle size={iconSizes[size]} className="shrink-0 text-rose-600 dark:text-rose-400" />}
          <span>Revoked Credential</span>
        </span>
      );

    case 'PENDING':
      return (
        <span className={`inline-flex items-center font-medium text-slate-700 dark:text-slate-300 ${sizeClasses[size]}`}>
          {showIcon && <Clock size={iconSizes[size]} className="shrink-0 text-slate-500" />}
          <span>Pending Blockchain Confirmation</span>
        </span>
      );

    case 'UNVERIFIABLE':
      return (
        <span className={`inline-flex items-center font-medium text-amber-800 dark:text-amber-300 ${sizeClasses[size]}`}>
          {showIcon && <ShieldAlert size={iconSizes[size]} className="shrink-0 text-amber-600" />}
          <span>Consensus Ledger Unreachable</span>
        </span>
      );

    case 'NOT_FOUND':
    default:
      return (
        <span className={`inline-flex items-center font-medium text-slate-600 dark:text-slate-400 ${sizeClasses[size]}`}>
          {showIcon && <AlertTriangle size={iconSizes[size]} className="shrink-0 text-slate-400" />}
          <span>Unregistered Credential</span>
        </span>
      );
  }
};
