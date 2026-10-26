import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  KeyRound,
  Download,
  Upload,
  AlertCircle,
  Scale,
  Eye,
  EyeOff,
} from 'lucide-react';
import { VaultBackupData, PelakNode, LegalDocument, DisputeAlert, TimelineItem } from '../types/cadastre';
import { OFFICIAL_PCKALA_VAULT_BACKUP } from '../data/cadastreData';

interface SecurityVaultProps {
  isLocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  pelaks: PelakNode[];
  documents: LegalDocument[];
  disputes: DisputeAlert[];
  timeline: TimelineItem[];
  onRestoreBackup: (data: VaultBackupData) => void;
  onClearAllData: () => void;
}

export const SecurityVault: React.FC<SecurityVaultProps> = ({
  isLocked,
  onUnlock,
  pelaks,
  documents,
  disputes,
  timeline,
  onRestoreBackup,
  onClearAllData,
}) => {
  const [passcode, setPasscode] = useState('');
  const [storedPasscode, setStoredPasscode] = useState<string | null>(() => {
    return localStorage.getItem('attorney_vault_passcode');
  });
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // If no passcode exists yet, prompt to create one
  const isFirstTimeSetup = !storedPasscode;

  const handleSetInitialPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasscode.length < 4) {
      setErrorMsg('رمز عبور باید حداقل ۴ رقم یا کاراکتر باشد.');
      return;
    }
    if (newPasscode !== confirmPasscode) {
      setErrorMsg('تکرار رمز عبور با رمز وارد شده یکسان نیست.');
      return;
    }
    localStorage.setItem('attorney_vault_passcode', newPasscode);
    setStoredPasscode(newPasscode);
    setErrorMsg(null);
    onUnlock();
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === storedPasscode) {
      setErrorMsg(null);
      setPasscode('');
      onUnlock();
    } else {
      setErrorMsg('رمز عبور وارد شده نادرست است. دسترسی غیرمجاز محدود گردید.');
    }
  };

  const handleExportBackup = () => {
    let chatSessions = [];
    try {
      const stored = localStorage.getItem('cadaster_legal_chat_sessions_v2');
      if (stored) chatSessions = JSON.parse(stored);
    } catch {}

    const backupData: VaultBackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      pelaks,
      documents,
      disputes,
      timeline,
      chatSessions,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attorney-cadastre-vault-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.pelaks)) {
          if (parsed.chatSessions && Array.isArray(parsed.chatSessions)) {
            try {
              localStorage.setItem('cadaster_legal_chat_sessions_v2', JSON.stringify(parsed.chatSessions));
            } catch {}
          }
          onRestoreBackup(parsed);
          alert('پشتیبان پرونده‌ها، اسناد و جلسات مشاوره با موفقیت بازیابی شد.');
        } else {
          alert('فرمت فایل پشتیبان معتبر نیست.');
        }
      } catch (err) {
        alert('خطا در خواندن فایل پشتیبان.');
      }
    };
    reader.readAsText(file);
  };

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-right shadow-2xl relative">
        {/* Emblem & Shield Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/10">
          <Lock className="w-7 h-7 stroke-[2.2]" />
        </div>

        <div className="text-center mb-5">
          <h2 className="text-base font-bold text-white">
            گاوصندوق امنیتی پرونده‌ها و اسناد ثبتی وکیل
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            سیستم امنیتی اختصاصی تک‌کاربره جهت حفظ محرمانگی تام اسناد و پلاک‌ها
          </p>
        </div>

        {isFirstTimeSetup ? (
          /* First time PIN Setup */
          <form onSubmit={handleSetInitialPasscode} className="space-y-3.5">
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-300">
              <strong className="block mb-1 font-bold">تنظیم رمز ورود اختصاصی (بار اول):</strong>
              جهت جلوگیری از دسترسی افراد غیرمجاز و حفظ امنیت اسناد، لطفاً یک رمز عبور یا پین‌کد امن برای کارتابل خود تعریف فرمایید.
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">رمز عبور اصلی کارتابل:</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  placeholder="حداقل ۴ کاراکتر یا عدد..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">تکرار رمز عبور:</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                placeholder="تکرار رمز عبور..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>

            {errorMsg && (
              <div className="bg-rose-950/70 border border-rose-800 text-rose-300 p-2.5 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md shadow-amber-500/20"
            >
              ثبت رمز عبور و ورود به گاوصندوق اسناد
            </button>
          </form>
        ) : (
          /* Normal Unlock Screen */
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">
                رمز عبور اختصاصی وکیل را وارد نمایید:
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="رمز عبور کارتابل..."
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-rose-950/70 border border-rose-800 text-rose-300 p-2.5 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
            >
              <Unlock className="w-4 h-4" />
              بازگشایی کارتابل محرمانه
            </button>
          </form>
        )}

        {/* Security Disclaimers & Backup */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>اسناد و پلاک‌ها منحصراً در مرورگر و حافظه امن سیستم وکیل ذخیره می‌گردند.</span>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="cursor-pointer text-sky-400 hover:text-sky-300 flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>بازیابی از فایل پشتیبان</span>
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>

              {storedPasscode && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('آیا مایلید رمز عبور را بازنشانی فرمایید؟')) {
                      localStorage.removeItem('attorney_vault_passcode');
                      setStoredPasscode(null);
                    }
                  }}
                  className="text-slate-500 hover:text-slate-400"
                >
                  فراموشی رمز
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (confirm('آیا مایلید پرونده و ۲۰ مدرک شکواییه پی‌سی‌کالا (نسخه ۱.۱.۰) بازیابی شود؟')) {
                  onRestoreBackup(OFFICIAL_PCKALA_VAULT_BACKUP);
                  alert('پرونده پی‌سی‌کالا با ۲۰ مدرک و جلسات مشاوره با موفقیت بازیابی شد.');
                  onUnlock();
                }
              }}
              className="w-full mt-1 py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 hover:text-emerald-200 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span>بارگذاری تک‌کلیک پرونده رسمی پی‌سی‌کالا (نسخه ۱.۱.۰)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
