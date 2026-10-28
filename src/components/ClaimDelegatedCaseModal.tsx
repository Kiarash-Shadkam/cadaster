import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
  Copy,
  Check,
  Layers,
  Sparkles,
  ArrowRight,
  FolderDown,
} from 'lucide-react';
import {
  SharedAccessGrant,
  PelakNode,
  LegalDocument,
  ClaimedDelegatedCase,
} from '../types/cadastre';
import {
  findGrantByTokenOrPassphrase,
  validateGrantAccess,
  claimDelegatedCase,
  getPermissionLevelMeta,
  getLiveTotpCode,
  getTotpRemainingSeconds,
  isValidIranianNationalCode,
} from '../services/accessControlService';
import { toPersianDigits } from '../utils/persian';

interface ClaimDelegatedCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePelaks: PelakNode[];
  availableDocuments: LegalDocument[];
  onCaseClaimed: (claim: ClaimedDelegatedCase) => void;
}

export const ClaimDelegatedCaseModal: React.FC<ClaimDelegatedCaseModalProps> = ({
  isOpen,
  onClose,
  availablePelaks,
  availableDocuments,
  onCaseClaimed,
}) => {
  const [step, setStep] = useState<'token_input' | 'security_gate' | 'success'>('token_input');

  // Step 1: Token or Passphrase input
  const [tokenOrPassInput, setTokenOrPassInput] = useState('');
  const [selectedGrant, setSelectedGrant] = useState<SharedAccessGrant | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Step 2: Multi-Factor Gate
  const [nationalIdInput, setNationalIdInput] = useState('');
  const [mobileInput, setMobileInput] = useState('');
  const [passphraseInput, setPassphraseInput] = useState('');
  const [totpInput, setTotpInput] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [liveCode, setLiveCode] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [showHelper, setShowHelper] = useState(false);

  // Result state
  const [claimedResult, setClaimedResult] = useState<ClaimedDelegatedCase | null>(null);

  // Sync TOTP timer
  useEffect(() => {
    if (!selectedGrant?.totpSecret) return;
    const update = () => {
      setLiveCode(getLiveTotpCode(selectedGrant.totpSecret!));
      setRemainingSeconds(getTotpRemainingSeconds());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [selectedGrant?.totpSecret]);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('token_input');
    setTokenOrPassInput('');
    setSelectedGrant(null);
    setSearchError(null);
    setNationalIdInput('');
    setMobileInput('');
    setPassphraseInput('');
    setTotpInput('');
    setGateError(null);
    setClaimedResult(null);
  };

  const handleLookupGrant = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);

    const q = tokenOrPassInput.trim();
    if (!q) {
      setSearchError('لطفاً پیوند امن، توکن تفویض یا گذرواژه اختصاصی پرونده را وارد فرمایید.');
      return;
    }

    const grant = findGrantByTokenOrPassphrase(q);
    if (!grant) {
      setSearchError('مجوز تفویض مطابق با این پیوند یا گذرواژه در شبکه احراز هویت سامانه یافت نشد.');
      return;
    }

    if (grant.status === 'revoked') {
      setSearchError('این مجوز دسترسی توسط مالک اصلی لغو و باطل شده است.');
      return;
    }

    if (grant.status === 'expired' || new Date(grant.expiresAt) < new Date()) {
      setSearchError('مهلت زمانی استفاده از این تفویض منقضی گردیده است.');
      return;
    }

    setSelectedGrant(grant);
    if (q.startsWith('CAD-')) {
      setPassphraseInput(q);
    }
    setStep('security_gate');
  };

  const handleVerifyAndClaim = (e: React.FormEvent) => {
    e.preventDefault();
    setGateError(null);

    if (!selectedGrant) return;

    // Validate using the rigorous multi-factor engine
    const valRes = validateGrantAccess({
      grantId: selectedGrant.id,
      nationalId: nationalIdInput,
      mobileNumber: mobileInput,
      passphrase: passphraseInput,
      totpCode: totpInput,
    });

    if (!valRes.success || !valRes.grant) {
      setGateError(valRes.error || 'عبور از دیوار امنیتی ناموفق بود.');
      return;
    }

    // Find the target PelakNode
    const targetCaseId = selectedGrant.caseIds[0];
    const targetPelak = availablePelaks.find((p) => p.id === targetCaseId) || {
      id: targetCaseId || `delegated-case-${Date.now()}`,
      code: 'پرونده تفویض‌شده',
      mainNumber: 'ثبتی',
      sector: 'حوزه قضایی',
      title: selectedGrant.title,
      areaM2: 0,
      ownerName: selectedGrant.granteeName,
      status: 'valid',
      childrenIds: [],
      description: 'پرونده تفویض‌شده از حساب دیگر',
      deedType: 'پرونده قضایی حقوقی/کیفری',
      dossierDomain: 'general',
    };

    const targetDocs = availableDocuments.filter((d) => selectedGrant.caseIds.includes(d.pelakId));

    // Claim case and persist into current user's workspace
    const claim = claimDelegatedCase(selectedGrant, targetPelak, targetDocs);
    setClaimedResult(claim);
    onCaseClaimed(claim);
    setStep('success');
  };

  const permMeta = selectedGrant ? getPermissionLevelMeta(selectedGrant.permissionLevel) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FolderDown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                دریافت پرونده مشترک از سایر اکانت‌ها
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ورود امن و استقرار پرونده‌های تفویض‌شده در کارتابل کاری شما
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* STEP 1: Token or Passphrase Entry */}
          {step === 'token_input' && (
            <form onSubmit={handleLookupGrant} className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <KeyRound className="w-4 h-4" />
                  <span>نحوه اتصال به پرونده تفویض‌شده:</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  اگر همکار یا وکیل دیگری پرونده‌ای را با شما به اشتراک گذاشته است، پیوند امن یا کد تفویض را در کادر زیر وارد کنید تا دیوار امنیتی پرونده فعال شود.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  پیوند اشتراک، شناسه دسترسی یا گذرواژه پرونده:
                </label>
                <input
                  type="text"
                  value={tokenOrPassInput}
                  onChange={(e) => setTokenOrPassInput(e.target.value)}
                  placeholder="مثال: CAD-8894-PERM-xxxx یا grant_xxx یا پیوند کامل..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  dir="ltr"
                />
              </div>

              {searchError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-amber-500/10"
              >
                <span>بررسی و انتقال به گیت امنیتی</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: Multi-Factor Security Wall Gate */}
          {step === 'security_gate' && selectedGrant && (
            <form onSubmit={handleVerifyAndClaim} className="space-y-4">
              {/* Grant Details Summary */}
              <div className="p-3.5 bg-slate-950 border border-amber-500/30 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {selectedGrant.title}
                  </span>
                  {permMeta && (
                    <span className={`px-2 py-0.5 rounded text-[11px] border font-medium ${permMeta.badgeColor}`}>
                      {permMeta.label}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>تفویض‌کننده: {selectedGrant.granteeName}</span>
                  <span>تعداد پرونده: {toPersianDigits(selectedGrant.caseIds.length)}</span>
                </div>
              </div>

              {/* National ID Check */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>۱. کدملی شخص مجاز (تشخیص هویت فردی):</span>
                  {nationalIdInput && (
                    <span className={`text-[10px] ${isValidIranianNationalCode(nationalIdInput) ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isValidIranianNationalCode(nationalIdInput) ? 'الگوریتم معتبر است' : '۱۰ رقم معتبر نیست'}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={nationalIdInput}
                  onChange={(e) => setNationalIdInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="کد ملی ۱۰ رقمی خود را وارد فرمایید..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white text-center tracking-widest focus:outline-none focus:border-amber-500"
                  dir="ltr"
                />
              </div>

              {/* Case Passphrase */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  ۲. گذرواژه اختصاصی پرونده:
                </label>
                <div className="relative">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphraseInput}
                    onChange={(e) => setPassphraseInput(e.target.value)}
                    placeholder="مانند CAD-xxxx-PERM-xxxx یا رمز پرونده..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 pr-9"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Dynamic 6-digit TOTP Authenticator */}
              {selectedGrant.totpSecret && (
                <div className="space-y-1 bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      ۳. کد ۶ رقمی Authenticator:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHelper(!showHelper)}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      {showHelper ? 'بستن دستیار' : 'کد ساز همگام'}
                    </button>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="۱۲۳۴۵۶"
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-base font-mono text-center tracking-widest text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                    dir="ltr"
                  />

                  {showHelper && liveCode && (
                    <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        کد زنده شبیه‌ساز: <strong className="font-mono text-white">{liveCode}</strong> ({remainingSeconds}ثانیه)
                      </span>
                      <button
                        type="button"
                        onClick={() => setTotpInput(liveCode)}
                        className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[10px]"
                      >
                        درج خودکار
                      </button>
                    </div>
                  )}
                </div>
              )}

              {gateError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{gateError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('token_input')}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  بازگشت
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Lock className="w-4 h-4" />
                  <span>تایید هویت و استقرار در میز کار من</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Success Confirmation */}
          {step === 'success' && claimedResult && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  پرونده با موفقیت در میز کار شما مستقر گردید!
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  پرونده «{claimedResult.caseCode} - {claimedResult.caseTitle}» اکنون در فهرست پرونده‌های شما با نشان ویژه و سطح مجوز مجاز قرار گرفته است.
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-right space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>سطح دسترسی شما:</span>
                  <span className="text-amber-400 font-bold">
                    {getPermissionLevelMeta(claimedResult.permissionLevel).label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>واگذارکننده:</span>
                  <span className="text-white">{claimedResult.delegatorName}</span>
                </div>
                <div className="flex justify-between">
                  <span>تاریخ و ساعت انقضا:</span>
                  <span className="text-slate-300 font-mono" dir="ltr">
                    {new Date(claimedResult.expiresAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                مشاهده پرونده در میز کار
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
