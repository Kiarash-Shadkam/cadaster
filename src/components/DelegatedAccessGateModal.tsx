import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { SharedAccessGrant } from '../types/cadastre';
import { validateGrantAccess, getPermissionLevelMeta } from '../services/accessControlService';
import { toPersianDigits } from '../utils/persian';

interface DelegatedAccessGateModalProps {
  grant: SharedAccessGrant;
  isOpen: boolean;
  onSuccess: (grant: SharedAccessGrant) => void;
  onCancel: () => void;
}

export const DelegatedAccessGateModal: React.FC<DelegatedAccessGateModalProps> = ({
  grant,
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const permMeta = getPermissionLevelMeta(grant.permissionLevel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const result = validateGrantAccess(grant.id, pinInput);
    if (!result.success) {
      setErrorMsg(result.error || 'خطا در ورود به پرتال دسترسی');
      return;
    }

    if (result.grant) {
      onSuccess(result.grant);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h2 className="text-base font-bold text-white">
            احراز هویت پرتال دسترسی تفویض‌شده
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            دسترسی به پرونده‌های منتخب توسط وکیل / مدیر سامانه برای شما فراهم گردیده است.
          </p>
        </div>

        {/* Grant Info */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">نام دریافت‌کننده:</span>
            <span className="font-bold text-white">{grant.granteeName}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">تعداد پرونده‌های مجاز:</span>
            <span className="font-mono text-amber-400 font-bold">
              {toPersianDigits(grant.caseIds.length)} پرونده
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">سطح دسترسی:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${permMeta.badgeColor}`}>
              {permMeta.label}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {grant.pinCode ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                رمز عبور امنیتی (PIN) اختصاصی را وارد نمایید:
              </label>
              <input
                type="password"
                autoFocus
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="کد ۴ الی ۶ رقمی"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-center font-mono font-bold tracking-widest text-emerald-400 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-1">
              این پیوند فاقد رمز عبور است و با تأیید زیر فعال خواهد شد.
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              ورود به پرونده‌ها
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
