import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Share2,
  Users,
  Shield,
  KeyRound,
  Clock,
  CheckCircle2,
  Copy,
  AlertTriangle,
  Eye,
  Download,
  Edit3,
  ExternalLink,
  Ban,
  FileText,
  Search,
  Check,
  RefreshCw,
  Trash2,
  Info,
  Lock,
  Smartphone,
  Fingerprint,
  QrCode,
  Sparkles,
} from 'lucide-react';
import {
  PelakNode,
  PermissionLevel,
  GranteeType,
  SharedAccessGrant,
  CaseSecurityCredential,
} from '../types/cadastre';
import {
  createAccessGrant,
  revokeAccessGrant,
  deleteAccessGrant,
  generateGrantShareUrl,
  generateBase32Secret,
  generateTotpAuthUri,
  getLiveTotpCode,
  getTotpRemainingSeconds,
  generateCasePassphrase,
  isValidIranianNationalCode,
  isValidIranianMobile,
  getEffectiveGrantStatus,
  getPermissionLevelMeta,
} from '../services/accessControlService';
import { toPersianDigits } from '../utils/persian';

interface CaseSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pelaks: PelakNode[];
  initialSelectedCaseIds?: string[];
  grants: SharedAccessGrant[];
  onRefreshGrants: () => void;
  onSwitchToDelegatedSession?: (grant: SharedAccessGrant) => void;
}

export const CaseSharingModal: React.FC<CaseSharingModalProps> = ({
  isOpen,
  onClose,
  pelaks,
  initialSelectedCaseIds = [],
  grants,
  onRefreshGrants,
  onSwitchToDelegatedSession,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Recipient Identity State
  const [granteeName, setGranteeName] = useState('');
  const [recipientNationalId, setRecipientNationalId] = useState('');
  const [recipientMobile, setRecipientMobile] = useState('');
  const [grantTitle, setGrantTitle] = useState('');
  const [granteeType, setGranteeType] = useState<GranteeType>('collaborator');

  // Case & Permission State
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>(initialSelectedCaseIds);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('view_download');
  const [validityPreset, setValidityPreset] = useState<number>(168); // 7 days default
  const [caseSearchTerm, setCaseSearchTerm] = useState('');

  // Authenticator State
  const [totpSecret, setTotpSecret] = useState<string>(() => generateBase32Secret(16));
  const [liveTotpCode, setLiveTotpCode] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);

  // Success / Post-Create State
  const [justCreatedGrant, setJustCreatedGrant] = useState<SharedAccessGrant | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedPassphrase, setCopiedPassphrase] = useState<string | null>(null);

  // Audit Logs Viewer State
  const [selectedGrantForLogs, setSelectedGrantForLogs] = useState<SharedAccessGrant | null>(null);

  // Live TOTP ticker for preview
  useEffect(() => {
    if (!totpSecret) return;
    const updateTicker = () => {
      setLiveTotpCode(getLiveTotpCode(totpSecret));
      setRemainingSeconds(getTotpRemainingSeconds());
    };
    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [totpSecret]);

  // Sync initialSelectedCaseIds when modal opens or selection changes
  useEffect(() => {
    if (initialSelectedCaseIds.length > 0) {
      setSelectedCaseIds(initialSelectedCaseIds);
    }
  }, [initialSelectedCaseIds]);

  // Reset created grant on tab switch
  useEffect(() => {
    setJustCreatedGrant(null);
  }, [activeTab]);

  const filteredPelaks = useMemo(() => {
    if (!caseSearchTerm.trim()) return pelaks;
    const term = caseSearchTerm.trim().toLowerCase();
    return pelaks.filter(
      (p) =>
        p.code.toLowerCase().includes(term) ||
        p.title.toLowerCase().includes(term) ||
        p.ownerName.toLowerCase().includes(term)
    );
  }, [pelaks, caseSearchTerm]);

  if (!isOpen) return null;

  const handleToggleCase = (caseId: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId]
    );
  };

  const handleSelectAllCases = () => {
    if (selectedCaseIds.length === pelaks.length) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(pelaks.map((p) => p.id));
    }
  };

  const isNationalIdChecksumValid = isValidIranianNationalCode(recipientNationalId);

  const handleCreateGrant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!granteeName.trim()) {
      alert('لطفاً نام دریافت‌کننده مجاز را وارد نمایید.');
      return;
    }
    if (!recipientNationalId.trim() || recipientNationalId.replace(/\D/g, '').length !== 10) {
      alert('لطفاً کد ملی ۱۰ رقمی دریافت‌کننده را به درستی وارد نمایید.');
      return;
    }
    if (selectedCaseIds.length === 0) {
      alert('لطفاً حداقل یک پرونده را جهت تفویض دسترسی انتخاب فرمایید.');
      return;
    }

    const selectedCasesMeta = pelaks
      .filter((p) => selectedCaseIds.includes(p.id))
      .map((p) => ({
        id: p.id,
        code: p.code,
        title: p.title,
      }));

    const newGrant = createAccessGrant({
      title: grantTitle.trim() || `تفویض پرونده‌ها به ${granteeName.trim()}`,
      granteeName: granteeName.trim(),
      granteeType,
      recipientNationalId: recipientNationalId.trim(),
      recipientMobile: recipientMobile.trim(),
      caseIds: selectedCaseIds,
      casesMeta: selectedCasesMeta,
      permissionLevel,
      validityHours: validityPreset,
      customTotpSecret: totpSecret,
    });

    setJustCreatedGrant(newGrant);
    onRefreshGrants();
  };

  const handleCopyLink = (grantId: string) => {
    const url = generateGrantShareUrl(grantId);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPassphrase(key);
    setTimeout(() => setCopiedPassphrase(null), 2500);
  };

  const handleRevoke = (grantId: string) => {
    if (
      window.confirm(
        'آیا از لغو فوری این دسترسی اطمینان دارید؟ دریافت‌کننده بلافاصله از دسترسی به پرونده‌ها منع خواهد شد.'
      )
    ) {
      revokeAccessGrant(grantId);
      onRefreshGrants();
    }
  };

  const handleDelete = (grantId: string) => {
    if (window.confirm('آیا از حذف کامل این رکورد از تاریخچه سامانه اطمینان دارید؟')) {
      deleteAccessGrant(grantId);
      onRefreshGrants();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                مرکز تفویض پرونده‌ها با Authenticator و تشخیص هویت فرد
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تطبیق کد ملی فرد، احراز هویت دوعاملی (TOTP) و گذرواژه‌های تفکیک‌شده به ازای هر پرونده
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'create'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            تعریف دسترسی جدید
            {selectedCaseIds.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[11px] font-mono">
                {toPersianDigits(selectedCaseIds.length)} پرونده
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'list'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            دسترسی‌های فعال و لاگ ممیزی
            <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[11px] font-mono">
              {toPersianDigits(grants.length)}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'create' && (
            <>
              {justCreatedGrant ? (
                /* Success Screen with Credentials Card */
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-5 animate-in zoom-in-95">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-300">
                      تفویض پرونده‌ها با تایید هویت و Authenticator صادر شد
                    </h3>
                    <p className="text-xs text-emerald-400/80 mt-1">
                      اطلاعات احراز هویت و گذرواژه‌های تفکیک‌شده پرونده‌ها برای ارائه به کاربر در زیر درج گردیده است.
                    </p>
                  </div>

                  {/* Summary & Identity Card */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-right space-y-3 text-xs">
                    <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Fingerprint className="w-4 h-4 text-amber-400" />
                        هویت فردی شخص مجاز:
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {justCreatedGrant.granteeType === 'collaborator' ? 'همکار دفتری' : 'کارشناس رسمی / مهمان'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[11px]">نام و نام خانوادگی:</span>
                        <span className="font-bold text-white text-sm mt-0.5 block">{justCreatedGrant.granteeName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">کد ملی ثبت‌شده:</span>
                        <span className="font-mono font-bold text-emerald-400 tracking-wider text-sm mt-0.5 block">
                          {justCreatedGrant.recipientNationalId}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">شماره تماس همراه:</span>
                        <span className="font-mono text-slate-300 text-sm mt-0.5 block">
                          {justCreatedGrant.recipientMobile || 'ثبت نشده'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Authenticator Key & Live TOTP Box */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-right space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        تنظیمات نرم‌افزار Authenticator (Google / Microsoft Authenticator):
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>شمارش معکوس:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {toPersianDigits(remainingSeconds)} ثانیه
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400">کلید رمزی (Secret Key):</div>
                          <div className="font-mono font-bold text-white tracking-widest text-xs mt-1">
                            {justCreatedGrant.totpSecret}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopySecret(justCreatedGrant.totpSecret || '')}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                        >
                          {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedSecret ? 'کپی شد' : 'کپی کلید'}
                        </button>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400">کد پویای ۶ رقمی فعلی:</div>
                          <div className="font-mono font-bold text-emerald-400 tracking-[0.2em] text-base mt-0.5">
                            {liveTotpCode.slice(0, 3)} {liveTotpCode.slice(3)}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500">هر ۳۰ ثانیه تغییر می‌کند</span>
                      </div>
                    </div>
                  </div>

                  {/* Isolated Case Passphrases Table */}
                  {justCreatedGrant.caseCredentials && justCreatedGrant.caseCredentials.length > 0 && (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-right space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <KeyRound className="w-4 h-4 text-amber-400" />
                          گذرواژه‌های اختصاصی تفکیک‌شده به ازای هر پرونده و سطح دسترسی:
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {toPersianDigits(justCreatedGrant.caseCredentials.length)} پرونده مجزا
                        </span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {justCreatedGrant.caseCredentials.map((cred, idx) => (
                          <div
                            key={cred.caseId}
                            className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-amber-400 font-bold">{cred.caseCode}</span>
                              <span className="text-slate-300 text-[11px] truncate max-w-xs">{cred.caseTitle}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded border ${
                                  getPermissionLevelMeta(cred.permissionLevel).badgeColor
                                }`}
                              >
                                {getPermissionLevelMeta(cred.permissionLevel).label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-emerald-400 text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                {cred.passphrase}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(cred.passphrase, cred.caseId)}
                                className="p-1 text-slate-400 hover:text-white"
                                title="کپی گذرواژه این پرونده"
                              >
                                {copiedPassphrase === cred.caseId ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Share Link Box */}
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl p-2 px-3">
                    <input
                      type="text"
                      readOnly
                      value={generateGrantShareUrl(justCreatedGrant.id)}
                      className="bg-transparent text-xs text-slate-300 flex-1 outline-none font-mono text-left select-all"
                    />
                    <button
                      onClick={() => handleCopyLink(justCreatedGrant.id)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-slate-950" />
                          کپی شد!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          کپی پیوند
                        </>
                      )}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    {onSwitchToDelegatedSession && (
                      <button
                        onClick={() => {
                          onSwitchToDelegatedSession(justCreatedGrant);
                          onClose();
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        ورود آزمایشی با این دسترسی
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setJustCreatedGrant(null);
                        setGranteeName('');
                        setRecipientNationalId('');
                        setRecipientMobile('');
                        setGrantTitle('');
                        setTotpSecret(generateBase32Secret(16));
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                    >
                      تعریف یک دسترسی دیگر
                    </button>
                  </div>
                </div>
              ) : (
                /* Main Creation Form */
                <form onSubmit={handleCreateGrant} className="space-y-6">
                  {/* Step 1: Individual Identity Verification Profile */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-amber-400" />
                        ۱. تشخیص هویت قطعی فرد دریافت‌کننده پرونده
                      </span>
                      <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setGranteeType('collaborator')}
                          className={`px-3 py-1 rounded-md transition-all ${
                            granteeType === 'collaborator'
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          همکار دفتری / کارآموز
                        </button>
                        <button
                          type="button"
                          onClick={() => setGranteeType('external_guest')}
                          className={`px-3 py-1 rounded-md transition-all ${
                            granteeType === 'external_guest'
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          کارشناس رسمی / مهمان
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                          نام و نام خانوادگی رسمی <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={granteeName}
                          onChange={(e) => setGranteeName(e.target.value)}
                          placeholder="مثلاً: مهندس رضایی یا خانم حسینی"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                          <span>
                            کد ملی ۱۰ رقمی <span className="text-rose-400">*</span>
                          </span>
                          {recipientNationalId.length === 10 && (
                            <span
                              className={`text-[10px] font-mono ${
                                isNationalIdChecksumValid ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isNationalIdChecksumValid ? '✓ معتبر' : '✕ نامعتبر'}
                            </span>
                          )}
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={recipientNationalId}
                          onChange={(e) => setRecipientNationalId(e.target.value.replace(/\D/g, ''))}
                          placeholder="مثلاً: ۰۰۱۲۳۴۵۶۷۸"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500 transition-colors text-center font-bold tracking-wider"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                          شماره موبایل (جهت تطابق)
                        </label>
                        <input
                          type="text"
                          maxLength={11}
                          value={recipientMobile}
                          onChange={(e) => setRecipientMobile(e.target.value.replace(/\D/g, ''))}
                          placeholder="مثلاً: ۰۹۱۲۳۴۵۶۷۸۹"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500 transition-colors text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                        عنوان یا یادداشت تفویض (اختیاری)
                      </label>
                      <input
                        type="text"
                        value={grantTitle}
                        onChange={(e) => setGrantTitle(e.target.value)}
                        placeholder="مثلاً: بررسی تطبیق پلاک ثبتی و کروکی نقشه توسط کارشناس رسمی"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Step 2: Selective Cases Selection */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-slate-200">
                          ۲. انتخاب پرونده‌های مجاز (تفویض گزینشی)
                        </span>
                        <span className="text-[11px] text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {toPersianDigits(selectedCaseIds.length)} از {toPersianDigits(pelaks.length)} پرونده
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={caseSearchTerm}
                            onChange={(e) => setCaseSearchTerm(e.target.value)}
                            placeholder="جستجوی پلاک یا نام..."
                            className="bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                        </div>
                        <button
                          type="button"
                          onClick={handleSelectAllCases}
                          className="text-[11px] text-slate-400 hover:text-white px-2 py-1 bg-slate-900 rounded-lg border border-slate-800 transition-colors"
                        >
                          {selectedCaseIds.length === pelaks.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                        </button>
                      </div>
                    </div>

                    {/* Cases Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 bg-slate-900/50 rounded-xl border border-slate-800">
                      {filteredPelaks.map((p) => {
                        const isSelected = selectedCaseIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleToggleCase(p.id)}
                            className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                                : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                  isSelected
                                    ? 'bg-amber-500 border-amber-500 text-slate-950'
                                    : 'border-slate-600 bg-slate-800'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                  <span>{p.title}</span>
                                  <span className="font-mono text-[10px] px-1 py-0.2 bg-slate-800 text-slate-400 rounded">
                                    {p.code}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                  مالک/موکل: {p.ownerName}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3: Permission Level Tier */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      ۳. تعیین سطح مجوز دسترسی به اسناد و پرونده‌ها
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* View Only */}
                      <div
                        onClick={() => setPermissionLevel('view_only')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all relative ${
                          permissionLevel === 'view_only'
                            ? 'bg-blue-950/30 border-blue-500 text-blue-200 shadow-sm'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Eye className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-bold text-white">فقط مشاهده</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-400">
                          مطالعه اوراق و متن بدون امکان دانلود فایل سند، بدون حق تغییر و بدون دسترسی به گاوصندوق
                        </p>
                      </div>

                      {/* View and Download */}
                      <div
                        onClick={() => setPermissionLevel('view_download')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all relative ${
                          permissionLevel === 'view_download'
                            ? 'bg-emerald-950/30 border-emerald-500 text-emerald-200 shadow-sm'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Download className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-white">مشاهده و دانلود</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-400">
                          مطالعه اسناد به‌همراه امکان دریافت نسخه اسکن‌شده PDF و کروکی‌ها جهت کارشناسی دقیق
                        </p>
                      </div>

                      {/* Edit and Upload */}
                      <div
                        onClick={() => setPermissionLevel('edit_upload')}
                        className={`p-3 rounded-xl border cursor-pointer transition-all relative ${
                          permissionLevel === 'edit_upload'
                            ? 'bg-amber-950/30 border-amber-500 text-amber-200 shadow-sm'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Edit3 className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold text-white">ویرایش و بارگذاری</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-400">
                          امکان بارگذاری مدرک تکمیلی، ثبت یادداشت‌های پرونده و ویرایش اطلاعات کاداستر
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Authenticator 2FA & Expiry */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-4">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      ۴. پیکربندی احراز هویت دوعاملی Authenticator و مدت اعتبار
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Authenticator Engine Configuration */}
                      <div className="space-y-2.5 bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-emerald-400" />
                            کلید اختصاصی TOTP Authenticator:
                          </span>
                          <button
                            type="button"
                            onClick={() => setTotpSecret(generateBase32Secret(16))}
                            className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            تولید مجدد
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="font-mono text-xs font-bold text-white tracking-widest">
                            {totpSecret}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">کد زنده:</span>
                            <span className="font-mono font-bold text-emerald-400 text-xs">
                              {liveTotpCode}
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          این کلید جهت ثبت در نرم‌افزارهای Google Authenticator یا Microsoft Authenticator گیرنده استفاده می‌شود.
                        </p>
                      </div>

                      {/* Expiry Presets */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          مدت اعتبار پیوند تفویض دسترسی
                        </label>
                        <div className="grid grid-cols-4 gap-1.5 text-center">
                          {[
                            { label: '۲۴ ساعت', hours: 24 },
                            { label: '۳ روز', hours: 72 },
                            { label: '۷ روز', hours: 168 },
                            { label: '۳۰ روز', hours: 720 },
                          ].map((item) => (
                            <button
                              key={item.hours}
                              type="button"
                              onClick={() => setValidityPreset(item.hours)}
                              className={`py-2 rounded-xl text-[11px] font-semibold transition-all border ${
                                validityPreset === item.hours
                                  ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          پس از اتمام زمان، دسترسی به‌طور خودکار منقضی و مسدود خواهد شد.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      disabled={selectedCaseIds.length === 0 || !granteeName.trim()}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Share2 className="w-4 h-4" />
                      تولید پیوند امن و گذرواژه‌های تفکیک‌شده
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {activeTab === 'list' && (
            <div className="space-y-4">
              {grants.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-xs">تاکنون هیچ مجوز دسترسی یا پیوند اشتراکی صادر نشده است.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {grants.map((grant) => {
                    const effectiveStatus = getEffectiveGrantStatus(grant);
                    const permMeta = getPermissionLevelMeta(grant.permissionLevel);

                    return (
                      <div
                        key={grant.id}
                        className={`bg-slate-950/40 border rounded-xl p-4 transition-all ${
                          effectiveStatus === 'active'
                            ? 'border-slate-800 hover:border-slate-700'
                            : effectiveStatus === 'expired'
                            ? 'border-amber-900/30 opacity-75'
                            : 'border-rose-900/30 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">{grant.granteeName}</span>
                              {grant.recipientNationalId && (
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                                  کد ملی: {grant.recipientNationalId}
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  effectiveStatus === 'active'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : effectiveStatus === 'expired'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                {effectiveStatus === 'active'
                                  ? 'فعال و معتبر'
                                  : effectiveStatus === 'expired'
                                  ? 'منقضی‌شده'
                                  : 'لغو شده توسط مدیر'}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded border ${permMeta.badgeColor}`}>
                                {permMeta.label}
                              </span>
                              {grant.totpSecret && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                  <Smartphone className="w-3 h-3" />
                                  Authenticator 2FA
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                              <span>عنوان: {grant.title}</span>
                              <span>·</span>
                              <span>
                                پرونده‌ها:{' '}
                                <span className="font-mono text-amber-300 font-bold">
                                  {toPersianDigits(grant.caseIds.length)} مورد
                                </span>
                              </span>
                              {grant.caseCredentials && grant.caseCredentials.length > 0 && (
                                <>
                                  <span>·</span>
                                  <span>
                                    گذرواژه اصلی:{' '}
                                    <span className="font-mono text-emerald-400 font-bold">
                                      {grant.caseCredentials[0].passphrase}
                                    </span>
                                  </span>
                                </>
                              )}
                              <span>·</span>
                              <span>
                                پایان اعتبار:{' '}
                                <span className="font-mono text-slate-300 text-[10px]">
                                  {new Date(grant.expiresAt).toLocaleDateString('fa-IR')}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <button
                              onClick={() => handleCopyLink(grant.id)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                              title="کپی پیوند اشتراک‌گذاری"
                            >
                              <Copy className="w-3.5 h-3.5 text-amber-400" />
                              لینک
                            </button>

                            {onSwitchToDelegatedSession && effectiveStatus === 'active' && (
                              <button
                                onClick={() => {
                                  onSwitchToDelegatedSession(grant);
                                  onClose();
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                                title="شبیه‌سازی ورود به عنوان این کاربر"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                ورود آزمایشی
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedGrantForLogs(grant)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                              title="مشاهده دفترچه لاگ و ممیزی رویدادها"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-400" />
                              لاگ ({toPersianDigits(grant.auditLogs?.length || 0)})
                            </button>

                            {effectiveStatus === 'active' && (
                              <button
                                onClick={() => handleRevoke(grant.id)}
                                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="لغو فوری دسترسی"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                لغو
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(grant.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="حذف کامل از سیستم"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-modal: Audit Log Viewer */}
      {selectedGrantForLogs && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white">
                  دفترچه ممیزی هویت و رخدادها: {selectedGrantForLogs.granteeName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedGrantForLogs(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {!selectedGrantForLogs.auditLogs || selectedGrantForLogs.auditLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  هنوز هیچ رخداد یا بازدیدی برای این مجوز ثبت نگردیده است.
                </div>
              ) : (
                selectedGrantForLogs.auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">
                        {log.action === 'login' && 'ورود به پرتال'}
                        {log.action === 'identity_verified' && 'احراز هویت فردی'}
                        {log.action === 'authenticator_verified' && 'تایید دوعاملی Authenticator'}
                        {log.action === 'view_case' && 'مشاهده پرونده'}
                        {log.action === 'download_document' && 'دانلود مدرک'}
                        {log.action === 'upload_document' && 'بارگذاری سند'}
                        {log.action === 'edit_case' && 'ویرایش پرونده'}
                        {log.action === 'failed_pin' && 'خطای رمز عبور'}
                        {log.action === 'failed_identity' && 'خطای تطابق کد ملی'}
                        {log.action === 'failed_passphrase' && 'خطای گذرواژه پرونده'}
                        {log.action === 'failed_authenticator' && 'خطای توکن Authenticator'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleString('fa-IR')}
                      </span>
                    </div>
                    {log.details && <p className="text-[11px] text-slate-400">{log.details}</p>}
                    {(log.caseNumber || log.documentTitle) && (
                      <div className="text-[10px] text-amber-300 font-mono flex items-center gap-2 pt-0.5">
                        {log.caseNumber && <span>پرونده: {log.caseNumber}</span>}
                        {log.documentTitle && <span>سند: {log.documentTitle}</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-800 flex justify-end bg-slate-950/40">
              <button
                onClick={() => setSelectedGrantForLogs(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
