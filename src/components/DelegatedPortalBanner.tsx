import React from 'react';
import { Shield, Lock, Eye, Download, Edit3, LogOut, Clock, AlertCircle } from 'lucide-react';
import { DelegatedSession } from '../types/cadastre';
import { getPermissionLevelMeta } from '../services/accessControlService';
import { toPersianDigits } from '../utils/persian';

interface DelegatedPortalBannerProps {
  session: DelegatedSession;
  onExit: () => void;
}

export const DelegatedPortalBanner: React.FC<DelegatedPortalBannerProps> = ({ session, onExit }) => {
  const permMeta = getPermissionLevelMeta(session.grant.permissionLevel);
  const now = new Date().getTime();
  const exp = new Date(session.grant.expiresAt).getTime();
  const diffHours = Math.max(0, Math.round((exp - now) / (1000 * 3600)));

  return (
    <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border-b border-amber-500/40 px-4 py-2 text-xs shadow-lg sticky top-0 z-40 animate-in fade-in">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap text-slate-200">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold text-[11px] shrink-0">
            <Lock className="w-3.5 h-3.5" />
            پرتال دسترسی تفویض‌شده
          </div>
          <span className="font-semibold text-white">
            گیرنده:{' '}
            <span className="text-amber-300 font-bold">{session.grant.granteeName}</span>
          </span>
          <span className="text-slate-500 hidden sm:inline">·</span>
          <span className="text-slate-300">
            سطح مجوز:{' '}
            <span className={`px-2 py-0.2 rounded font-bold ${permMeta.badgeColor}`}>
              {permMeta.label}
            </span>
          </span>
          <span className="text-slate-500 hidden sm:inline">·</span>
          <span className="text-slate-300 flex items-center gap-1 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            اعتبار باقی‌مانده:{' '}
            <span className="text-amber-400 font-bold">
              {diffHours > 24
                ? `${toPersianDigits(Math.ceil(diffHours / 24))} روز`
                : `${toPersianDigits(diffHours)} ساعت`}
            </span>
          </span>
          <span className="text-slate-500 hidden sm:inline">·</span>
          <span className="text-slate-400 text-[11px]">
            (محدود به {toPersianDigits(session.grant.caseIds.length)} پرونده مجاز)
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onExit}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            خروج از دسترسی تفویض‌شده
          </button>
        </div>
      </div>
    </div>
  );
};
