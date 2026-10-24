import React, { useState, useMemo } from 'react';
import {
  Upload,
  Sparkles,
  FileText,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Loader2,
  Play,
  Pause,
  Check,
  Link as LinkIcon,
  X,
  FileStack,
  FolderPlus,
  Briefcase,
  Search,
  CheckCircle2,
  Layers,
  ArrowRight,
  Gavel,
  Landmark,
  Scale,
  Users,
  FileCheck,
} from 'lucide-react';
import { LegalDocument, PelakNode, CaseDomain } from '../types/cadastre';
import { toPersianDigits } from '../utils/persian';
import { useBatchScan } from '../context/BatchScanContext';

interface DocumentScannerProps {
  pelaks: PelakNode[];
  documents: LegalDocument[];
  selectedPelakId: string;
  onDocumentAdded: (newDoc: LegalDocument | null, newPelakToCreate?: Partial<PelakNode>) => void;
  onReconcileDocs: (
    matches: Array<{ unresolvedDocId: string; targetPelakId: string; targetPelakCode: string; reason: string }>,
    rootDoc: LegalDocument
  ) => void;
  onUpdatePelak?: (pelakId: string, updates: Partial<PelakNode>) => void;
  onGoToTree?: () => void;
}

export const DocumentScanner: React.FC<DocumentScannerProps> = ({
  pelaks,
  documents,
  selectedPelakId,
  onDocumentAdded,
  onReconcileDocs,
  onUpdatePelak,
  onGoToTree,
}) => {
  const {
    queue,
    isProcessingBatch,
    isSynthesizing,
    currentProcessingIndex,
    batchNotes,
    dossierMode,
    newDossierData,
    selectedExistingPelakId,
    reconcileToasts,
    addFilesToQueue,
    startBatchProcessing,
    stopBatchProcessing,
    clearCompleted,
    removeQueueItem,
    setBatchNotes,
    setDossierMode,
    setNewDossierData,
    setSelectedExistingPelakId,
    dismissToast,
  } = useBatchScan();

  const [searchFilter, setSearchFilter] = useState('');

  // Filter existing dossiers
  const filteredExistingPelaks = useMemo(() => {
    if (!searchFilter.trim()) return pelaks;
    const q = searchFilter.toLowerCase().trim();
    return pelaks.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        (p.sector && p.sector.toLowerCase().includes(q))
    );
  }, [pelaks, searchFilter]);

  // Selected dossier details
  const activeExistingPelak = pelaks.find(
    (p) => p.id === (selectedExistingPelakId || selectedPelakId || (pelaks.length > 0 ? pelaks[0].id : ''))
  );

  // Auto-initialize selectedExistingPelakId if empty
  React.useEffect(() => {
    if (!selectedExistingPelakId && pelaks.length > 0) {
      setSelectedExistingPelakId(selectedPelakId || pelaks[0].id);
    }
  }, [pelaks, selectedPelakId, selectedExistingPelakId, setSelectedExistingPelakId]);

  // Handle file uploads
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    addFilesToQueue(files);
    e.target.value = '';
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    addFilesToQueue(files);
  };

  const handleStart = () => {
    startBatchProcessing(pelaks, documents, onDocumentAdded, onReconcileDocs, onUpdatePelak);
  };

  const completedCount = queue.filter((item) => item.status === 'success').length;
  const progressPercent = queue.length > 0 ? Math.round((completedCount / queue.length) * 100) : 0;

  // Active target title for UI preview
  const currentTargetTitle =
    dossierMode === 'new'
      ? newDossierData.title.trim() || 'پرونده جامع جدید (در انتظار درج نام)'
      : activeExistingPelak?.title || 'پرونده انتخابی';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <FileStack className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                ایستگاه دریافت و پرونده‌بندی هوشمند اسناد (Unified Dossier Ingestion)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                بارگذاری دسته‌ای اسناد و دادنامه‌ها با انتساب مستقیم به یک پرونده مشخص، استخراج متمرکز اصحاب دعوا، و تحلیل تطبیقی جامع (Holistic Synthesis) بدون توقف در حین تعویض سربرگ‌ها.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4" />
            <span>پردازش محرمانه و یکپارچه</span>
          </div>
        </div>
      </div>

      {/* Notifications / Synthesis Toasts */}
      {reconcileToasts.length > 0 && (
        <div className="space-y-2">
          {reconcileToasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-3.5 rounded-xl flex items-center justify-between text-xs shadow-lg animate-in fade-in border ${
                toast.type === 'synthesis'
                  ? 'bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/80 border-amber-500/60 text-amber-200'
                  : 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/80 border-emerald-600/60 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'synthesis' ? (
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <LinkIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="font-medium leading-relaxed">{toast.text}</span>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* STEP 1: Dossier Assignment Strategy */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center">
              ۱
            </span>
            <h3 className="text-sm font-bold text-white">
              گام اول: تعیین نحوه پرونده‌بندی مدارک ارسالی
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            تمامی اسناد این بسته مستقیماً در پرونده انتخابی ذخیره و به صورت مشترک تحلیل می‌شوند.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDossierMode('new')}
            disabled={isProcessingBatch}
            className={`p-4 rounded-xl border text-right transition-all flex items-start gap-3 relative ${
              dossierMode === 'new'
                ? 'bg-amber-500/10 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                dossierMode === 'new' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <FolderPlus className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">تشکیل پرونده جدید و جامع</span>
                {dossierMode === 'new' && (
                  <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> فعال
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                برای مدارک یک شکایت، دعوای جدید یا موضوع مستقل؛ ایجاد یک پرونده مادر با تحلیل تطبیقی کل مدارک
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setDossierMode('existing')}
            disabled={isProcessingBatch}
            className={`p-4 rounded-xl border text-right transition-all flex items-start gap-3 relative ${
              dossierMode === 'existing'
                ? 'bg-amber-500/10 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                dossierMode === 'existing' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">الحاق به پرونده‌های موجود در پایگاه</span>
                {dossierMode === 'existing' && (
                  <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> فعال
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                افزودن اسناد تازه به یکی از پرونده‌ها یا پلاک‌های قبلی و تکمیل زنجیره ادله و خط زمانی آن
              </p>
            </div>
          </button>
        </div>

        {/* MODE A: New Dossier Creation Form */}
        {dossierMode === 'new' && (
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 border-b border-slate-800/60 pb-2">
              <Sparkles className="w-4 h-4" />
              <span>مشخصات پرونده مادر جدید (هدایتگر هوش مصنوعی در استخراج و سنتز یکپارچه)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  عنوان کامل پرونده <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: شکایت کلاهبرداری و انتقال مال غیر علیه آقای رضوی"
                  value={newDossierData.title}
                  onChange={(e) => setNewDossierData({ title: e.target.value })}
                  disabled={isProcessingBatch}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  حوزه و دسته‌بندی موضوعی دعوا <span className="text-rose-400">*</span>
                </label>
                <select
                  value={newDossierData.domain}
                  onChange={(e) => setNewDossierData({ domain: e.target.value as CaseDomain })}
                  disabled={isProcessingBatch}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="criminal">⚖️ کیفری، کلاهبرداری، خیانت در امانت و جعل</option>
                  <option value="commercial">💳 اسناد تجاری، چک و سفته و مطالبات مالی</option>
                  <option value="contracts">📜 دعاوی قراردادی، مشارکت مدنی و ساخت</option>
                  <option value="real_estate">🗺️ اراضی، پلاک‌های ثبتی و کاداستر ملکی</option>
                  <option value="inheritance">🏛️ انحصار وراثت، تحریر و تقسیم ترکه</option>
                  <option value="administrative">🏢 دیوان عدالت اداری، شهرداری و کمیسیون‌ها</option>
                  <option value="general">📁 سایر دعاوی حقوقی و عمومی</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  شاکی / خواهان / موکل پرونده
                </label>
                <input
                  type="text"
                  placeholder="نام و مشخصات موکل یا شاکی..."
                  value={newDossierData.client}
                  onChange={(e) => setNewDossierData({ client: e.target.value })}
                  disabled={isProcessingBatch}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  مشتکی‌عنه / خوانده / طرف دعوا
                </label>
                <input
                  type="text"
                  placeholder="نام و مشخصات طرف شکایت یا خوانده دعوا..."
                  value={newDossierData.defendant}
                  onChange={(e) => setNewDossierData({ defendant: e.target.value })}
                  disabled={isProcessingBatch}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  شماره کلاسه یا شماره پرونده مرجع قضایی (اختیاری)
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: ۱۴۰۲۹۱۰۰۰۱۲۳۴"
                  value={newDossierData.caseNumber}
                  onChange={(e) => setNewDossierData({ caseNumber: e.target.value })}
                  disabled={isProcessingBatch}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  شعبه رسیدگی‌کننده یا مرجع صدور
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: شعبه ۱۰۲ دادگاه کیفری دو یا بازپرسی شعبه ۵"
                  value={newDossierData.sector}
                  onChange={(e) => setNewDossierData({ sector: e.target.value })}
                  disabled={isProcessingBatch}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1 text-xs">
                خلاصه ماوقع یا یادداشت وکیل در خصوص این پرونده:
              </label>
              <textarea
                rows={2}
                placeholder="توضیحاتی در مورد روند شکایت، ادعاها، یا اسناد بارگذاری‌شده که به ایجنت در سنتز دقیق پرونده کمک می‌کند..."
                value={newDossierData.description}
                onChange={(e) => setNewDossierData({ description: e.target.value })}
                disabled={isProcessingBatch}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* MODE B: Existing Dossier Selection with Real-Time Search */}
        {dossierMode === 'existing' && (
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span>انتخاب پرونده مقصد از میان {toPersianDigits(pelaks.length)} پرونده موجود در پایگاه</span>
              </span>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو بر اساس نام، کلاسه یا موکل..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Dossier List Grid */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredExistingPelaks.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  پرونده‌ای با عبارت جستجو شده یافت نشد.
                </div>
              ) : (
                filteredExistingPelaks.map((p) => {
                  const docCount = documents.filter((d) => d.pelakId === p.id).length;
                  const isSelected = (selectedExistingPelakId || selectedPelakId) === p.id;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isProcessingBatch && setSelectedExistingPelakId(p.id)}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p.isNonLandDossier ? (
                            <Briefcase className="w-4 h-4" />
                          ) : (
                            <Landmark className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">{p.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 font-mono">
                              {p.code}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                            <span>موکل: {p.ownerName || 'نامشخص'}</span>
                            {p.sector && <span>· مرجع: {p.sector}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                          {toPersianDigits(docCount)} سند پیوست
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {activeExistingPelak && (
              <div className="mt-2 p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-300 flex items-center justify-between">
                <span>
                  پرونده مقصد انتخابی:{' '}
                  <strong className="text-amber-400 font-bold">{activeExistingPelak.title}</strong> ({activeExistingPelak.code})
                </span>
                <span className="text-[11px] text-slate-400">
                  تمام اسناد ارسالی به این پرونده الحاق خواهند شد.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 2: Multi-File Batch Upload Drag & Drop */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center">
              ۲
            </span>
            <h3 className="text-sm font-bold text-white">
              گام دوم: بارگذاری دسته‌ای اسناد و مدارک این پرونده
            </h3>
          </div>
          <div className="text-xs text-amber-300 bg-amber-950/60 border border-amber-800/60 px-3 py-1 rounded-lg">
            انتساب قطعی به: <strong className="text-white">{currentTargetTitle}</strong>
          </div>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropFiles}
          className="border-2 border-dashed border-slate-700 hover:border-amber-500/70 rounded-2xl p-8 text-center bg-slate-950/50 hover:bg-slate-950/80 transition-all cursor-pointer relative group"
        >
          <input
            type="file"
            id="batchFileInput"
            multiple
            accept="image/*,application/pdf,text/*"
            onChange={handleFilesSelected}
            className="hidden"
          />
          <label htmlFor="batchFileInput" className="cursor-pointer block">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">
              کلیک برای انتخاب یا کشیدن و رها کردن فایل‌های اسناد (همزمان ۱۰، ۲۰ یا ۵۰+ مدرک)
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              پشتیبانی از انواع فرمت‌های تصویری (JPG, PNG)، فایل‌های اسکن‌شده PDF و فایل‌های متنی لایحه، دادنامه و قرارداد
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-300">
              <span className="bg-slate-900 px-3 py-1 rounded-md border border-slate-800 text-amber-400">
                🔒 انتساب ۱۰۰٪ یکپارچه به {currentTargetTitle}
              </span>
              <span className="bg-slate-900 px-3 py-1 rounded-md border border-slate-800 text-sky-400">
                ⚡ فشرده‌سازی خودکار و OCR دقیق
              </span>
              <span className="bg-slate-900 px-3 py-1 rounded-md border border-slate-800 text-emerald-400">
                ⚖️ تحلیل تطبیقی جامع پرونده (Holistic Synthesis)
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Synthesis Active Alert */}
      {isSynthesizing && (
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/80 border border-amber-500/60 p-4 rounded-2xl flex items-center gap-3 text-xs text-amber-200 shadow-xl animate-pulse">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
          <div className="flex-1">
            <h4 className="font-bold text-amber-300">در حال تدوین تحلیل تطبیقی و سنتز پرونده توسط هوش مصنوعی...</h4>
            <p className="text-[11px] text-amber-200/80 mt-0.5">
              مدارک دسته به پرونده الحاق شدند؛ ایجنت در حال تطبیق ادله، کشف تعارضات احتمالی و تدوین نقشه راه استراتژیک پرونده است.
            </p>
          </div>
        </div>
      )}

      {/* Batch Processing Controls & Progress */}
      {queue.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">صف پردازش اسناد پرونده:</span>
                <span className="text-xs font-mono text-amber-400 tabular-nums">
                  {toPersianDigits(completedCount)} از {toPersianDigits(queue.length)} مدرک
                </span>
                <span className="text-xs text-slate-400">({toPersianDigits(progressPercent)}٪)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                پردازش به طور خودکار در پس‌زمینه ادامه می‌یابد؛ می‌توانید بدون توقف اسکن به سایر بخش‌ها بروید.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isProcessingBatch ? (
                <button
                  type="button"
                  onClick={stopBatchProcessing}
                  className="px-4 py-2 text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800/80 hover:bg-rose-900 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Pause className="w-3.5 h-3.5" />
                  توقف پردازش
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={completedCount === queue.length}
                  className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md ${
                    completedCount === queue.length
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  شروع بررسی و انتساب یکپارچه
                </button>
              )}

              <button
                type="button"
                onClick={clearCompleted}
                disabled={isProcessingBatch || completedCount === 0}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors"
              >
                پاکسازی موارد تکمیل‌شده
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-amber-500 via-sky-500 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Queue Items Table / Cards */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            {queue.map((item, index) => {
              const isCurrent = currentProcessingIndex === index;
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border text-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-sm'
                      : item.status === 'success'
                      ? 'bg-slate-950/70 border-emerald-900/40 text-slate-300'
                      : item.status === 'error'
                      ? 'bg-rose-950/30 border-rose-900/60 text-rose-300'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        item.status === 'success'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : item.status === 'error'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : isCurrent
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.status === 'success' ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : item.status === 'error' ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : isCurrent ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({(item.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {item.progressMsg ||
                          (item.status === 'success'
                            ? `الحاق به پرونده: ${currentTargetTitle}`
                            : item.status === 'error'
                            ? item.error
                            : `در انتظار شروع و انتساب به ${currentTargetTitle}`)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                        item.status === 'success'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : item.status === 'error'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          : isCurrent
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.status === 'success'
                        ? 'تکمیل شد'
                        : item.status === 'error'
                        ? 'خطا'
                        : isCurrent
                        ? 'در حال پردازش...'
                        : 'در صف'}
                    </span>

                    {!isProcessingBatch && item.status !== 'processing' && (
                      <button
                        type="button"
                        onClick={() => removeQueueItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                        title="حذف از صف"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {completedCount > 0 && onGoToTree && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onGoToTree}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-semibold transition-colors"
              >
                <span>مشاهده پرونده و تحلیل جامع در کارتابل کاداستر</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
