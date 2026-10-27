import React, { useState, useEffect, useRef } from 'react';
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
  Smartphone,
  Mail,
  RefreshCw,
  CheckCircle2,
  Clock,
  Settings,
  X,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { VaultBackupData, PelakNode, LegalDocument, DisputeAlert, TimelineItem } from '../types/cadastre';
import {
  getStoredPasscode,
  setStoredPasscode,
  clearStoredPasscode,
  getSecurityProfile,
  saveSecurityProfile,
  evaluatePasswordStrength,
  maskPhone,
  maskEmail,
  getFailedAttemptsState,
  recordFailedAttempt,
  resetFailedAttempts,
  generateAndDispatchOtp,
  verifyOtp,
  VaultSecurityProfile,
  PasswordRequirements,
} from '../utils/securityEngine';
import { toPersianDigits } from '../utils/persian';

interface PasswordRequirementsChecklistProps {
  requirements: PasswordRequirements;
  isTyped: boolean;
}

const PasswordRequirementsChecklist: React.FC<PasswordRequirementsChecklistProps> = ({
  requirements,
  isTyped,
}) => {
  return (
    <div className="space-y-1.5 pt-1">
      <div className="text-[10px] text-slate-400 font-medium">شروط الزامی امنیت رمز:</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
            requirements.hasMinLength
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
              : isTyped
              ? 'bg-rose-950/30 border-rose-800/50 text-rose-300/80'
              : 'bg-slate-950/60 border-slate-800 text-slate-400'
          }`}
        >
          {requirements.hasMinLength ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
          )}
          <span>حداقل ۸ کاراکتر</span>
        </div>

        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
            requirements.hasNumber
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
              : isTyped
              ? 'bg-rose-950/30 border-rose-800/50 text-rose-300/80'
              : 'bg-slate-950/60 border-slate-800 text-slate-400'
          }`}
        >
          {requirements.hasNumber ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
          )}
          <span>حداقل یک عدد (0-9)</span>
        </div>

        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
            requirements.hasUppercase
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
              : isTyped
              ? 'bg-rose-950/30 border-rose-800/50 text-rose-300/80'
              : 'bg-slate-950/60 border-slate-800 text-slate-400'
          }`}
        >
          {requirements.hasUppercase ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
          )}
          <span>حرف بزرگ (A-Z)</span>
        </div>
      </div>
    </div>
  );
};

interface SecurityVaultProps {
  isLocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  isSettingsOpen?: boolean;
  onCloseSettings?: () => void;
  pelaks: PelakNode[];
  documents: LegalDocument[];
  disputes: DisputeAlert[];
  timeline: TimelineItem[];
  onRestoreBackup: (data: VaultBackupData) => void;
  onClearAllData: () => void;
}

type VaultView = 'LOGIN' | 'FIRST_SETUP' | 'FORGOT_CHANNEL' | 'FORGOT_OTP' | 'FORGOT_RESET' | 'SETTINGS';

export const SecurityVault: React.FC<SecurityVaultProps> = ({
  isLocked,
  onUnlock,
  onLock,
  isSettingsOpen = false,
  onCloseSettings,
  pelaks,
  documents,
  disputes,
  timeline,
  onRestoreBackup,
  onClearAllData,
}) => {
  const [storedPasscode, setStoredPasscodeState] = useState<string | null>(() => getStoredPasscode());
  const [profile, setProfileState] = useState<VaultSecurityProfile | null>(() => getSecurityProfile());

  // Current view state
  const [view, setView] = useState<VaultView>(() => {
    if (!storedPasscode) return 'FIRST_SETUP';
    return 'LOGIN';
  });

  // Password fields
  const [passcode, setPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [currentPasscodeForSettings, setCurrentPasscodeForSettings] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile setup fields
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [autoLockMinutes, setAutoLockMinutes] = useState(profile?.autoLockMinutes ?? 10);

  // Brute-force lockout state
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);

  // OTP state
  const [otpChannel, setOtpChannel] = useState<'sms' | 'email'>('sms');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpRemainingSeconds, setOtpRemainingSeconds] = useState<number>(120);
  const [dispatchedOtpInfo, setDispatchedOtpInfo] = useState<{
    code: string;
    channel: 'sms' | 'email';
    target: string;
  } | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Refs for 6-digit OTP inputs
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Keep view in sync when isSettingsOpen or isLocked changes
  useEffect(() => {
    if (isSettingsOpen) {
      setView('SETTINGS');
      setErrorMsg(null);
      setSuccessMsg(null);
      const currentProf = getSecurityProfile();
      if (currentProf) {
        setPhone(currentProf.phone);
        setEmail(currentProf.email);
        setAutoLockMinutes(currentProf.autoLockMinutes);
      }
    } else if (isLocked) {
      if (!storedPasscode) {
        setView('FIRST_SETUP');
      } else {
        setView('LOGIN');
      }
    }
  }, [isSettingsOpen, isLocked, storedPasscode]);

  // Check cooldown on mount or when view changes to LOGIN
  useEffect(() => {
    const failedState = getFailedAttemptsState();
    setFailedCount(failedState.count);
    if (failedState.lockedUntil && Date.now() < failedState.lockedUntil) {
      const remaining = Math.ceil((failedState.lockedUntil - Date.now()) / 1000);
      setCooldownSeconds(remaining);
    } else {
      setCooldownSeconds(0);
    }
  }, [view]);

  // Cooldown timer interval
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          resetFailedAttempts();
          setFailedCount(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // OTP Countdown timer
  useEffect(() => {
    if (view !== 'FORGOT_OTP' || otpRemainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setOtpRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [view, otpRemainingSeconds]);

  // Handle Login
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) {
      setErrorMsg(`گاوصندوق موقتاً قفل است. لطفاً ${toPersianDigits(cooldownSeconds)} ثانیه دیگر شکیبا باشید.`);
      return;
    }

    if (passcode === storedPasscode) {
      resetFailedAttempts();
      setFailedCount(0);
      setErrorMsg(null);
      setPasscode('');
      const curProfile = getSecurityProfile();
      if (curProfile) {
        saveSecurityProfile({ ...curProfile, lastLoginAt: new Date().toISOString() });
      }
      onUnlock();
    } else {
      const result = recordFailedAttempt();
      setFailedCount(result.count);
      if (result.isLocked) {
        setCooldownSeconds(result.remainingCooldown);
        setErrorMsg(
          `تعداد تلاش‌های ناموفق به ۵ بار رسید! سیستم به دلایل امنیتی به مدت ۶۰ ثانیه قفل شد.`
        );
      } else {
        const remainingAttempts = 5 - result.count;
        setErrorMsg(
          `رمز عبور وارد شده نادرست است. (${toPersianDigits(remainingAttempts)} تلاش مجاز باقی‌مانده است)`
        );
      }
    }
  };

  // First time PIN & Profile Setup
  const handleFirstTimeSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const strength = evaluatePasswordStrength(newPasscode);
    if (!strength.isStrongEnough) {
      setErrorMsg('رمز عبور باید حداقل ۸ کاراکتر و شامل حداقل یک عدد (0-9) و حداقل یک حرف بزرگ انگلیسی (A-Z) باشد.');
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setErrorMsg('تکرار رمز عبور با رمز اصلی همخوانی ندارد.');
      return;
    }

    if (!phone || !/^09[0-9]{9}$/.test(phone.trim())) {
      setErrorMsg('لطفاً یک شماره تلفن همراه معتبر ۱۱ رقمی (مثال: 09121234567) وارد نمایید.');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('لطفاً یک آدرس ایمیل معتبر وارد نمایید.');
      return;
    }

    // Save passcode and security profile
    setStoredPasscode(newPasscode);
    setStoredPasscodeState(newPasscode);

    const newProfile: VaultSecurityProfile = {
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      autoLockMinutes,
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    saveSecurityProfile(newProfile);
    setProfileState(newProfile);

    resetFailedAttempts();
    setPasscode('');
    setNewPasscode('');
    setConfirmPasscode('');
    setErrorMsg(null);
    onUnlock();
  };

  // Dispatch OTP
  const handleRequestOtp = (channel: 'sms' | 'email') => {
    setErrorMsg(null);
    setOtpChannel(channel);

    // If profile is missing, fallback prompt
    if (!profile) {
      setErrorMsg('اطلاعات بازیابی (شماره همراه/ایمیل) در کارتابل شما ثبت نشده است.');
      return;
    }

    const res = generateAndDispatchOtp(channel);
    if (!res.success || !res.code || !res.target) {
      setErrorMsg(res.error || 'خطا در ارسال کد تایید.');
      return;
    }

    setDispatchedOtpInfo({
      code: res.code,
      channel,
      target: res.target,
    });
    setOtpDigits(['', '', '', '', '', '']);
    setOtpRemainingSeconds(120);
    setView('FORGOT_OTP');

    // Auto-focus first digit input after render
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 150);
  };

  // OTP Box Digit Input
  const handleDigitChange = (index: number, value: string) => {
    // If pasting a full 6-digit code
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, 6);
      if (cleaned.length > 0) {
        const nextDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          nextDigits[i] = cleaned[i] || '';
        }
        setOtpDigits(nextDigits);
        const nextFocus = Math.min(cleaned.length, 5);
        otpInputRefs.current[nextFocus]?.focus();
        return;
      }
    }

    const char = value.slice(-1).replace(/\D/g, '');
    const nextDigits = [...otpDigits];
    nextDigits[index] = char;
    setOtpDigits(nextDigits);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP submission
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otpDigits.join('');
    if (fullCode.length < 6) {
      setErrorMsg('لطفاً کد تایید ۶ رقمی را به طور کامل وارد فرمایید.');
      return;
    }

    const result = verifyOtp(fullCode);
    if (!result.success) {
      setErrorMsg(result.error || 'کد تایید نادرست است.');
      return;
    }

    setErrorMsg(null);
    setNewPasscode('');
    setConfirmPasscode('');
    setView('FORGOT_RESET');
  };

  // Save New Password After OTP
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const strength = evaluatePasswordStrength(newPasscode);
    if (!strength.isStrongEnough) {
      setErrorMsg('رمز عبور جدید باید حداقل ۸ کاراکتر و شامل حداقل یک عدد (0-9) و حداقل یک حرف بزرگ انگلیسی (A-Z) باشد.');
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setErrorMsg('تکرار رمز عبور جدید همخوانی ندارد.');
      return;
    }

    setStoredPasscode(newPasscode);
    setStoredPasscodeState(newPasscode);
    resetFailedAttempts();
    setFailedCount(0);
    setCooldownSeconds(0);
    setErrorMsg(null);
    setPasscode('');
    setNewPasscode('');
    setConfirmPasscode('');
    setSuccessMsg('رمز عبور با موفقیت به‌روزرسانی شد.');
    setTimeout(() => {
      onUnlock();
    }, 600);
  };

  // Update Settings (When opened from Navbar/Settings mode)
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // If changing password, verify old password
    if (newPasscode) {
      if (currentPasscodeForSettings !== storedPasscode) {
        setErrorMsg('رمز عبور فعلی اشتباه است.');
        return;
      }
      const strength = evaluatePasswordStrength(newPasscode);
      if (!strength.isStrongEnough) {
        setErrorMsg('رمز عبور جدید باید حداقل ۸ کاراکتر و شامل حداقل یک عدد (0-9) و حداقل یک حرف بزرگ انگلیسی (A-Z) باشد.');
        return;
      }
      if (newPasscode !== confirmPasscode) {
        setErrorMsg('تکرار رمز عبور جدید یکسان نیست.');
        return;
      }
      setStoredPasscode(newPasscode);
      setStoredPasscodeState(newPasscode);
    }

    if (!phone || !/^09[0-9]{9}$/.test(phone.trim())) {
      setErrorMsg('شماره تلفن همراه باید ۱۱ رقم با پیش‌شماره 09 باشد.');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('آدرس ایمیل وارد شده معتبر نیست.');
      return;
    }

    const updatedProfile: VaultSecurityProfile = {
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      autoLockMinutes,
      registeredAt: profile?.registeredAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    saveSecurityProfile(updatedProfile);
    setProfileState(updatedProfile);

    setSuccessMsg('تنظیمات امنیتی و بازیابی کارتابل با موفقیت ذخیره شد.');
    setNewPasscode('');
    setConfirmPasscode('');
    setCurrentPasscodeForSettings('');
    setTimeout(() => {
      if (onCloseSettings) onCloseSettings();
    }, 1200);
  };

  // Backup Export
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

  // Backup Import
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
          alert('پشتیبان پرونده‌ها، اسناد و جلسات با موفقیت بازیابی شد.');
        } else {
          alert('فرمت فایل پشتیبان معتبر نیست.');
        }
      } catch (err) {
        alert('خطا در خواندن فایل پشتیبان.');
      }
    };
    reader.readAsText(file);
  };

  // Password strength calculation for newPasscode
  const passStrength = evaluatePasswordStrength(newPasscode);

  // If neither locked nor settings open, render nothing
  if (!isLocked && !isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-right shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header Close Button (Only for Settings View when unlocked) */}
        {isSettingsOpen && onCloseSettings && !isLocked && (
          <button
            onClick={onCloseSettings}
            className="absolute left-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Realistic Dispatched OTP Simulator Banner Toast */}
        {dispatchedOtpInfo && view === 'FORGOT_OTP' && (
          <div className="mb-4 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border border-amber-500/50 rounded-xl p-3.5 shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  {dispatchedOtpInfo.channel === 'sms' ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>
                      {dispatchedOtpInfo.channel === 'sms'
                        ? 'سامانه پیامکی وکیل (شبیه‌ساز تحویل فوری):'
                        : 'سرور پست الکترونیک امن وکیل:'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    کد تایید امنیتی به{' '}
                    <span className="font-mono text-amber-200 font-bold">
                      {dispatchedOtpInfo.channel === 'sms'
                        ? maskPhone(dispatchedOtpInfo.target)
                        : maskEmail(dispatchedOtpInfo.target)}
                    </span>{' '}
                    مخابره گردید.
                  </p>
                </div>
              </div>

              {/* Copy Code Button */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(dispatchedOtpInfo.code);
                  setCopiedOtp(true);
                  // auto-populate
                  const digits = dispatchedOtpInfo.code.split('');
                  setOtpDigits(digits);
                  setTimeout(() => setCopiedOtp(false), 2000);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0 shadow-sm"
              >
                {copiedOtp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedOtp ? 'کپی شد' : 'کپی و درج خودکار'}</span>
              </button>
            </div>

            <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">کد امنیتی یکبارمصرف:</span>
              <span className="font-mono text-base font-extrabold text-amber-400 tracking-widest bg-slate-950/80 px-3 py-0.5 rounded border border-amber-500/30">
                {dispatchedOtpInfo.code}
              </span>
            </div>
          </div>
        )}

        {/* Top Vault Icon & Branding */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/10">
          {view === 'SETTINGS' ? (
            <Settings className="w-7 h-7 stroke-[2.2]" />
          ) : view === 'FORGOT_OTP' || view === 'FORGOT_CHANNEL' || view === 'FORGOT_RESET' ? (
            <KeyRound className="w-7 h-7 stroke-[2.2]" />
          ) : (
            <Lock className="w-7 h-7 stroke-[2.2]" />
          )}
        </div>

        <div className="text-center mb-5">
          <h2 className="text-base font-bold text-white">
            {view === 'SETTINGS'
              ? 'تنظیمات امنیتی و کانال‌های بازیابی کارتابل'
              : view === 'FORGOT_CHANNEL'
              ? 'بازیابی رمز عبور با احراز هویت دو مرحله‌ای'
              : view === 'FORGOT_OTP'
              ? 'تایید کد یکبارمصرف (OTP)'
              : view === 'FORGOT_RESET'
              ? 'تنظیم رمز عبور جدید کارتابل'
              : view === 'FIRST_SETUP'
              ? 'راه‌اندازی گاوصندوق امنیتی و مشخصات بازیابی'
              : 'گاوصندوق امنیتی اسناد و پرونده‌های وکیل'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {view === 'SETTINGS'
              ? 'مدیریت شماره همراه، ایمیل، قفل خودکار و رمز عبور'
              : view === 'FIRST_SETUP'
              ? 'رمز عبور و اطلاعات تماس برای بازیابی اضطراری بدون اتلاف داده'
              : 'سیستم محرمانگی تک‌کاربره ایزوله با کدگذاری محلی در مرورگر'}
          </p>
        </div>

        {/* -------------------- VIEW 1: FIRST_SETUP -------------------- */}
        {view === 'FIRST_SETUP' && (
          <form onSubmit={handleFirstTimeSetup} className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-300 leading-relaxed">
              <strong className="block mb-1 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                تعریف رمز عبور اختصاصی و مشخصات امنیتی (بار اول):
              </strong>
              برای جلوگیری از دسترسی افراد غیرمجاز و محافظت از اسرار موکلین، لطفاً رمز عبور امن به همراه شماره همراه و ایمیل خود را جهت قابلیت بازیابی رمز ثبت فرمایید.
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">رمز عبور اصلی کارتابل:</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  placeholder="حداقل ۸ کاراکتر، شامل عدد و حرف بزرگ انگلیسی (مثال: Vakil1403)..."
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

              {/* Password Requirements Checklist */}
              <PasswordRequirementsChecklist
                requirements={passStrength.requirements}
                isTyped={!!newPasscode}
              />

              {/* Password Strength Meter */}
              {newPasscode && (
                <div className="mt-2 space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">سنجش استحکام رمز:</span>
                    <span className="font-bold text-white">{passStrength.label}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passStrength.color}`}
                      style={{ width: passStrength.barWidth }}
                    />
                  </div>
                  {passStrength.feedback.length > 0 && (
                    <div className="text-[10px] text-slate-400 space-y-0.5 mt-1">
                      {passStrength.feedback.map((fb, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-amber-300/80">
                          <span>•</span>
                          <span>{fb}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>شماره همراه جهت دریافت کد پیامکی:</span>
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09121234567"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-left"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  <span>آدرس ایمیل جهت بازیابی اضطراری:</span>
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lawyer@example.ir"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-left"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>قفل خودکار در صورت عدم تحرک (Inactivity Auto-Lock):</span>
              </label>
              <select
                value={autoLockMinutes}
                onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value={5}>۵ دقیقه عدم تحرک</option>
                <option value={10}>۱۰ دقیقه عدم تحرک (پیشنهادی)</option>
                <option value={15}>۱۵ دقیقه عدم تحرک</option>
                <option value={30}>۳۰ دقیقه عدم تحرک</option>
                <option value={0}>غیرفعال (فقط قفل دستی)</option>
              </select>
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
              <ShieldCheck className="w-4 h-4" />
              <span>ثبت مشخصات امنیتی و ورود به گاوصندوق</span>
            </button>
          </form>
        )}

        {/* -------------------- VIEW 2: LOGIN -------------------- */}
        {view === 'LOGIN' && (
          <form onSubmit={handleUnlock} className="space-y-4">
            {/* Lockout Banner */}
            {cooldownSeconds > 0 ? (
              <div className="bg-rose-950/80 border border-rose-700 p-3.5 rounded-xl text-rose-200 text-xs flex items-start gap-2.5 animate-pulse">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white mb-1">
                    دسترسی موقتاً مسدود گردید (دفاع در برابر نفوذ)
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    به دلیل ۵ مرتبه تلاش ناموفق، گاوصندوق به مدت{' '}
                    <span className="font-bold font-mono text-amber-300 tabular-nums">
                      {toPersianDigits(cooldownSeconds)}
                    </span>{' '}
                    ثانیه در وضعیت تعلیق قرار دارد.
                  </p>
                </div>
              </div>
            ) : null}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-300">رمز عبور اختصاصی وکیل:</label>
                {failedCount > 0 && cooldownSeconds === 0 && (
                  <span className="text-[11px] text-amber-400 font-mono">
                    ({toPersianDigits(5 - failedCount)} تلاش باقی‌مانده)
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passcode}
                  disabled={cooldownSeconds > 0}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="رمز عبور کارتابل..."
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 disabled:opacity-50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
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
              disabled={cooldownSeconds > 0}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <Unlock className="w-4 h-4" />
              <span>
                {cooldownSeconds > 0
                  ? `شکیبا باشید (${toPersianDigits(cooldownSeconds)} ثانیه)...`
                  : 'بازگشایی کارتابل محرمانه'}
              </span>
            </button>

            {/* Forgot password link */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setView('FORGOT_CHANNEL');
                }}
                className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-4 flex items-center gap-1 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>فراموشی رمز عبور؟ (ارسال کد به همراه یا ایمیل)</span>
              </button>
            </div>
          </form>
        )}

        {/* -------------------- VIEW 3: FORGOT_CHANNEL -------------------- */}
        {view === 'FORGOT_CHANNEL' && (
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-300 leading-relaxed">
              روش دلخواه خود را جهت دریافت کد یکبارمصرف ۶ رقمی احراز هویت انتخاب فرمایید:
            </div>

            <div className="space-y-2.5">
              {/* Channel 1: SMS */}
              <button
                type="button"
                onClick={() => handleRequestOtp('sms')}
                className="w-full p-3.5 rounded-xl border border-slate-800 hover:border-amber-500/70 bg-slate-950/70 hover:bg-slate-850 text-right transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>ارسال پیامک حاوی کد تایید (SMS)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      به شماره همراه وکیل:{' '}
                      <span className="font-mono text-amber-300 font-bold">
                        {profile?.phone ? maskPhone(profile.phone) : 'ثبت نشده'}
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors rotate-180" />
              </button>

              {/* Channel 2: Email */}
              <button
                type="button"
                onClick={() => handleRequestOtp('email')}
                className="w-full p-3.5 rounded-xl border border-slate-800 hover:border-sky-500/70 bg-slate-950/70 hover:bg-slate-850 text-right transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>ارسال کد تایید به پست الکترونیک (ایمیل)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      به آدرس ایمیل وکیل:{' '}
                      <span className="font-mono text-sky-300 font-bold">
                        {profile?.email ? maskEmail(profile.email) : 'ثبت نشده'}
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors rotate-180" />
              </button>
            </div>

            {/* Fallback if no contact profile exists */}
            {!profile && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-2">
                <p>
                  هیچ اطلاعات تماسی در حافظه ثبت نشده است. اگر اولین بار است یا اطلاعات پاک شده، می‌توانید رمز جدید تعریف فرمایید.
                </p>
                <button
                  type="button"
                  onClick={() => setView('FIRST_SETUP')}
                  className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400"
                >
                  تعریف اولیه رمز و اطلاعات تماس
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-950/70 border border-rose-800 text-rose-300 p-2.5 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setView('LOGIN');
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <span>بازگشت به صفحه ورود</span>
              </button>
            </div>
          </div>
        )}

        {/* -------------------- VIEW 4: FORGOT_OTP -------------------- */}
        {view === 'FORGOT_OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center text-xs text-slate-300">
              کد ۶ رقمی ارسال شده به{' '}
              <span className="font-mono font-bold text-amber-300">
                {otpChannel === 'sms'
                  ? maskPhone(dispatchedOtpInfo?.target || profile?.phone || '')
                  : maskEmail(dispatchedOtpInfo?.target || profile?.email || '')}
              </span>{' '}
              را وارد فرمایید:
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="flex justify-center items-center gap-2 dir-ltr" dir="ltr">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  className="w-11 h-12 text-center text-xl font-mono font-bold bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {/* Expiration Timer & Resend */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>مهلت اعتبار کد:</span>
                <span className="font-mono font-bold text-white tabular-nums">
                  {toPersianDigits(Math.floor(otpRemainingSeconds / 60))}:
                  {toPersianDigits(
                    (otpRemainingSeconds % 60).toString().padStart(2, '0')
                  )}
                </span>
              </div>

              {otpRemainingSeconds === 0 ? (
                <button
                  type="button"
                  onClick={() => handleRequestOtp(otpChannel)}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-xs font-bold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>ارسال مجدد کد</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRequestOtp(otpChannel)}
                  className="text-slate-500 hover:text-slate-400 text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>درخواست کد جدید</span>
                </button>
              )}
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
              <CheckCircle2 className="w-4 h-4" />
              <span>تایید کد و ادامه تغییر رمز</span>
            </button>

            <div className="pt-2 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => setView('FORGOT_CHANNEL')}
                className="text-slate-400 hover:text-white"
              >
                تغییر روش ارسال (پیامک/ایمیل)
              </button>
              <button
                type="button"
                onClick={() => setView('LOGIN')}
                className="text-slate-400 hover:text-white"
              >
                انصراف
              </button>
            </div>
          </form>
        )}

        {/* -------------------- VIEW 5: FORGOT_RESET -------------------- */}
        {view === 'FORGOT_RESET' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>هویت شما با موفقیت تایید شد. لطفاً رمز عبور جدید خود را مشخص فرمایید:</span>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">رمز عبور جدید:</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  placeholder="حداقل ۸ کاراکتر، شامل عدد و حرف بزرگ انگلیسی (مثال: Vakil1403)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Requirements Checklist */}
              <PasswordRequirementsChecklist
                requirements={passStrength.requirements}
                isTyped={!!newPasscode}
              />

              {/* Password Strength Meter */}
              {newPasscode && (
                <div className="mt-2 space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">سنجش استحکام رمز:</span>
                    <span className="font-bold text-white">{passStrength.label}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passStrength.color}`}
                      style={{ width: passStrength.barWidth }}
                    />
                  </div>
                  {passStrength.feedback.length > 0 && (
                    <div className="text-[10px] text-slate-400 space-y-0.5 mt-1">
                      {passStrength.feedback.map((fb, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-amber-300/80">
                          <span>•</span>
                          <span>{fb}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">تکرار رمز عبور جدید:</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                placeholder="تکرار رمز عبور جدید..."
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

            {successMsg && (
              <div className="bg-emerald-950/70 border border-emerald-800 text-emerald-300 p-2.5 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-4 h-4" />
              <span>ذخیره رمز جدید و ورود فوری به کارتابل</span>
            </button>
          </form>
        )}

        {/* -------------------- VIEW 6: SETTINGS (Opened while unlocked) -------------------- */}
        {view === 'SETTINGS' && (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>پروفایل امنیتی وکیل</span>
              </div>
              <p className="text-[11px] text-slate-400">
                مشخصات تماس جهت بازیابی رمز فراموش شده و سیاست قفل خودکار عدم تحرک را در این بخش تنظیم فرمایید.
              </p>
            </div>

            {/* Contact Channels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>شماره همراه وکیل (پیامک OTP):</span>
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09121234567"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-left"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  <span>ایمیل اختصاصی (ایمیل OTP):</span>
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lawyer@example.ir"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-left"
                  required
                />
              </div>
            </div>

            {/* Inactivity Auto-Lock */}
            <div>
              <label className="block text-xs text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>مدت زمان عدم تحرک تا قفل خودکار کارتابل:</span>
              </label>
              <select
                value={autoLockMinutes}
                onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value={5}>۵ دقیقه عدم تحرک</option>
                <option value={10}>۱۰ دقیقه عدم تحرک (پیشنهادی)</option>
                <option value={15}>۱۵ دقیقه عدم تحرک</option>
                <option value={30}>۳۰ دقیقه عدم تحرک</option>
                <option value={0}>غیرفعال (فقط قفل دستی)</option>
              </select>
            </div>

            {/* Optional Change Password Section */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>تغییر رمز عبور کارتابل (اختیاری):</span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">رمز عبور فعلی:</label>
                <input
                  type="password"
                  value={currentPasscodeForSettings}
                  onChange={(e) => setCurrentPasscodeForSettings(e.target.value)}
                  placeholder="تنها در صورت تمایل به تغییر رمز پر شود..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">رمز عبور جدید:</label>
                  <input
                    type="password"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    placeholder="حداقل ۸ کاراکتر، عدد و حرف بزرگ..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">تکرار رمز عبور جدید:</label>
                  <input
                    type="password"
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="تکرار رمز جدید..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {newPasscode && (
                <div className="space-y-2">
                  <PasswordRequirementsChecklist
                    requirements={passStrength.requirements}
                    isTyped={!!newPasscode}
                  />
                  <div className="space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">استحکام رمز جدید:</span>
                      <span className="font-bold text-white">{passStrength.label}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passStrength.color}`}
                        style={{ width: passStrength.barWidth }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="bg-rose-950/70 border border-rose-800 text-rose-300 p-2.5 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-950/70 border border-emerald-800 text-emerald-300 p-2.5 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              {onCloseSettings && (
                <button
                  type="button"
                  onClick={onCloseSettings}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-colors"
                >
                  انصراف
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md shadow-amber-500/20"
              >
                ذخیره تغییرات امنیتی
              </button>
            </div>
          </form>
        )}

        {/* Security Disclaimers & Backup Section */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>اسناد و پلاک‌ها منحصراً در مرورگر و حافظه امن سیستم وکیل رمزنگاری می‌گردند.</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="cursor-pointer text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>بازیابی از فایل پشتیبان</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>

            {storedPasscode && view === 'LOGIN' && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('آیا مایلید برای تست یا بازنشانی، رمز عبور پاک شده و مرحله تنظیم مجدد فعال شود؟')) {
                    clearStoredPasscode();
                    setStoredPasscodeState(null);
                    setView('FIRST_SETUP');
                  }
                }}
                className="text-slate-500 hover:text-rose-400 transition-colors"
              >
                بازنشانی کارتابل
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
