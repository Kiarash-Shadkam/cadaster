import React, { useState, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  X,
  Smartphone,
  Fingerprint,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Check,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { SharedAccessGrant } from '../types/cadastre';
import {
  validateGrantAccess,
  getPermissionLevelMeta,
  getLiveTotpCode,
  getTotpRemainingSeconds,
  isValidIranianNationalCode,
} from '../services/accessControlService';
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
  // Input states
  const [nationalIdInput, setNationalIdInput] = useState('');
  const [mobileInput, setMobileInput] = useState('');
  const [passphraseInput, setPassphraseInput] = useState('');
  const [totpInput, setTotpInput] = useState('');

  // UI / Helper states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [liveCode, setLiveCode] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const [copiedKey, setCopiedKey] = useState(false);

  // Keep live TOTP and countdown updated for the companion authenticator helper
  useEffect(() => {
    if (!grant.totpSecret) return;

    const updateTimer = () => {
      setLiveCode(getLiveTotpCode(grant.totpSecret!));
      setRemainingSeconds(getTotpRemainingSeconds());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [grant.totpSecret]);

  if (!isOpen) return null;

  const permMeta = getPermissionLevelMeta(grant.permissionLevel);
  const isNationalIdValid = isValidIranianNationalCode(nationalIdInput);

  const handleAutoFillLiveCode = () => {
    if (liveCode) {
      setTotpInput(liveCode);
    }
  };

  const handleAutoFillPassphrase = () => {
    if (grant.primaryPassphrase) {
      setPassphraseInput(grant.primaryPassphrase);
    } else if (grant.caseCredentials && grant.caseCredentials[0]) {
      setPassphraseInput(grant.caseCredentials[0].passphrase);
    }
  };

  const handleAutoFillIdentity = () => {
    if (grant.recipientNationalId) {
      setNationalIdInput(grant.recipientNationalId);
    }
    if (grant.recipientMobile) {
      setMobileInput(grant.recipientMobile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const result = validateGrantAccess({
      grantId: grant.id,
      nationalId: nationalIdInput,
      mobileNumber: mobileInput,
      passphrase: passphraseInput,
      totpCode: totpInput,
    });

    if (!result.success) {
      setErrorMsg(result.error || 'خطا در احراز هویت امنیتی');
      return;
    }

    if (result.grant) {
      onSuccess(result.grant);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                احراز هویت فردی و تایید Authenticator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تطبیق هویت گیرنده مجاز و گذرواژه تفکیک‌شده پرونده
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Grant Meta Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-amber-400" />
                شخص مجاز پرونده:
              </span>
              <span className="font-bold text-white text-sm">{grant.granteeName}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">تعداد پرونده‌های مجاز:</span>
              <span className="font-mono text-amber-400 font-bold">
                {toPersianDigits(grant.caseIds.length)} پرونده
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">سطح مجوز تفویض‌شده:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${permMeta.badgeColor}`}>
                {permMeta.label}
              </span>
            </div>
          </div>

          {/* Quick Demo Helper (allows testing easily) */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>جهت تست سریع احراز هویت:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAutoFillIdentity}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                تکمیل هویت
              </button>
              <button
                type="button"
                onClick={handleAutoFillPassphrase}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                تکمیل گذرواژه
              </button>
              <button
                type="button"
                onClick={handleAutoFillLiveCode}
                className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-[10px] text-amber-300 font-semibold rounded-lg border border-amber-500/30 transition-colors"
              >
                تکمیل کد ۲FA
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Factor 1: National ID (کد ملی) */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-amber-400" />
                  ۱. کد ملی ۱۰ رقمی دریافت‌کننده مجاز:
                </label>
                {nationalIdInput.length === 10 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${
                      isNationalIdValid
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {isNationalIdValid ? (
                      <>
                        <Check className="w-3 h-3" />
                        رقم کنترل معتبر
                      </>
                    ) : (
                      'کد ملی نامعتبر'
                    )}
                  </span>
                )}
              </div>
              <input
                type="text"
                autoFocus
                required
                maxLength={10}
                value={nationalIdInput}
                onChange={(e) => setNationalIdInput(e.target.value.replace(/\D/g, ''))}
                placeholder="مثال: ۰۰۱۲۳۴۵۶۷۸ (۱۰ رقم بدون خط تیره)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-center font-mono font-bold tracking-widest text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-[10px] text-slate-500">
                تنها شخصی که کد ملی او هنگام صدور تفویض ثبت گردیده اجازه دسترسی به پرونده را دارد.
              </p>
            </div>

            {/* Factor 2: Case Passphrase */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  ۲. گذرواژه اختصاصی پرونده و سطح دسترسی:
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1"
                >
                  {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPassphrase ? 'مخفی' : 'نمایش'}
                </button>
              </label>
              <input
                type={showPassphrase ? 'text' : 'password'}
                required
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                placeholder="مثال: CAD-68-24-DOWN-8491"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-center font-mono font-bold tracking-wider text-amber-300 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-[10px] text-slate-500">
                این گذرواژه منحصراً برای این پرونده و سطح دسترسی ({permMeta.label}) صادر شده است.
              </p>
            </div>

            {/* Factor 3: Dynamic 6-digit Authenticator Token */}
            {grant.totpSecret && (
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    ۳. کد ۶ رقمی پویای Authenticator (2FA):
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSimulator(!showSimulator)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {showSimulator ? 'بستن راهنما' : 'راهنمای Authenticator'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="کد ۶ رقمی"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-center font-mono font-bold tracking-[0.3em] text-emerald-400 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  {liveCode && (
                    <button
                      type="button"
                      onClick={handleAutoFillLiveCode}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors shrink-0 flex items-center gap-1"
                      title="درج کد پویای فعلی"
                    >
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      درج خودکار
                    </button>
                  )}
                </div>

                {/* Authenticator Companion / Live Simulator Card */}
                {showSimulator && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs space-y-2.5 mt-2 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                        نرم‌افزار Google / Microsoft Authenticator
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>انقضای کد:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {toPersianDigits(Math.floor(remainingSeconds / 60))}:{toPersianDigits((remainingSeconds % 60).toString().padStart(2, '0'))} ({toPersianDigits(remainingSeconds)} ثانیه)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400">کد پویای فعال لحظه‌ای (اعتبار ۲ دقیقه):</div>
                        <div className="font-mono text-base font-bold text-emerald-400 tracking-widest mt-0.5">
                          {liveCode.slice(0, 3)} {liveCode.slice(3)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">کلید رمزی (Secret Key):</div>
                        <div className="font-mono text-xs text-slate-300 font-bold select-all">
                          {grant.totpSecret}
                        </div>
                      </div>
                    </div>

                    {/* Countdown Progress Bar (120s / 2min) */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-1000 ease-linear"
                        style={{ width: `${(remainingSeconds / 120) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="flex-2 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                تایید هویت و ورود به پرونده‌ها
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
