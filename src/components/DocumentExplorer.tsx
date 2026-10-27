import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Search,
  AlertTriangle,
  ShieldCheck,
  Building,
  Calendar,
  User,
  Scale,
  Printer,
  Bot,
  ExternalLink,
  X,
  FileCheck,
  FileWarning,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  ArrowRight,
  FolderOpen,
  CheckSquare,
  Square,
  Layers,
  FolderPlus,
  Check,
  Briefcase,
  Landmark,
  Star,
  Edit3,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Settings,
  CopyCheck,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Download,
} from 'lucide-react';
import { LegalDocument, PelakNode, CaseDomain, DocumentCategory } from '../types/cadastre';
import { toPersianDigits, getCategoryLabel, getDomainMeta } from '../utils/persian';

interface DocumentExplorerProps {
  documents: LegalDocument[];
  pelaks: PelakNode[];
  selectedPelakId: string;
  onSelectPelak: (id: string) => void;
  onAskAboutDoc: (doc: LegalDocument) => void;
  onGoToScanner?: () => void;
  onManualReconcile?: (docId: string, targetPelakId: string) => void;
  onMergeDocuments?: (
    docIds: string[],
    targetPelakId: string,
    targetPelakCode: string,
    newPelakToCreate?: Partial<PelakNode>
  ) => void;
  onUpdatePelak?: (pelakId: string, updates: Partial<PelakNode>) => void;
  onDeletePelak?: (pelakId: string) => void;
  onUpdateDocument?: (docId: string, updates: Partial<LegalDocument>) => void;
  onDeleteDocument?: (docId: string) => void;
  onToggleStarDocument?: (docId: string) => void;
  onAutoDeduplicate?: (pelakId?: string) => number;
}

export const DocumentExplorer: React.FC<DocumentExplorerProps> = ({
  documents,
  pelaks,
  selectedPelakId,
  onSelectPelak,
  onAskAboutDoc,
  onGoToScanner,
  onManualReconcile,
  onMergeDocuments,
  onUpdatePelak,
  onDeletePelak,
  onUpdateDocument,
  onDeleteDocument,
  onToggleStarDocument,
  onAutoDeduplicate,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRiskOnly, setFilterRiskOnly] = useState<boolean>(false);
  const [filterUnresolvedOnly, setFilterUnresolvedOnly] = useState<boolean>(false);
  const [filterStarredOnly, setFilterStarredOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeDocForModal, setActiveDocForModal] = useState<LegalDocument | null>(null);

  // Quick View Modal State
  const [quickViewDoc, setQuickViewDoc] = useState<LegalDocument | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [rotationDeg, setRotationDeg] = useState<number>(0);

  const handleOpenQuickView = (doc: LegalDocument) => {
    setQuickViewDoc(doc);
    setZoomScale(1);
    setRotationDeg(0);
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(4, Number((prev + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))));
  };

  const handleRotateCw = () => {
    setRotationDeg((prev) => (prev + 90) % 360);
  };

  const handleRotateCcw = () => {
    setRotationDeg((prev) => (prev - 90 + 360) % 360);
  };

  const handleResetQuickView = () => {
    setZoomScale(1);
    setRotationDeg(0);
  };

  const handleDownloadQuickViewFile = () => {
    if (!quickViewDoc?.scanImageUrl) return;
    const a = document.createElement('a');
    a.href = quickViewDoc.scanImageUrl;
    const isPdf =
      quickViewDoc.fileMimeType?.includes('pdf') ||
      quickViewDoc.scanImageUrl.startsWith('data:application/pdf') ||
      quickViewDoc.fileName?.toLowerCase().endsWith('.pdf');
    const ext = isPdf ? '.pdf' : '.jpg';
    a.download = quickViewDoc.fileName || `${quickViewDoc.title}${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    if (!quickViewDoc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuickViewDoc(null);
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRotateCw();
      } else if (e.key === '0') {
        handleResetQuickView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickViewDoc]);

  // Multi-selection state
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeMode, setMergeMode] = useState<'existing' | 'new'>('existing');
  const [mergeTargetPelakId, setMergeTargetPelakId] = useState<string>(pelaks[0]?.id || '');
  const [mergeSearchTerm, setMergeSearchTerm] = useState('');

  // New Dossier for Merge
  const [mergeNewTitle, setMergeNewTitle] = useState('');
  const [mergeNewDomain, setMergeNewDomain] = useState<CaseDomain>('general');
  const [mergeNewClient, setMergeNewClient] = useState('');
  const [mergeNewDefendant, setMergeNewDefendant] = useState('');
  const [mergeNewCaseNumber, setMergeNewCaseNumber] = useState('');

  // Single Manual Reconcile Dialog State
  const [docToAssign, setDocToAssign] = useState<LegalDocument | null>(null);
  const [assignTargetPelakId, setAssignTargetPelakId] = useState<string>(pelaks[0]?.id || '');

  // Edit Document Modal State
  const [docToEdit, setDocToEdit] = useState<LegalDocument | null>(null);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocNumber, setEditDocNumber] = useState('');
  const [editDocDate, setEditDocDate] = useState('');
  const [editDocAuthority, setEditDocAuthority] = useState('');
  const [editDocCategory, setEditDocCategory] = useState<DocumentCategory>('verdict');
  const [editDocSummary, setEditDocSummary] = useState('');
  const [editDocRisk, setEditDocRisk] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [editDocPelakId, setEditDocPelakId] = useState('');
  const [editDocClaimant, setEditDocClaimant] = useState('');
  const [editDocDefendant, setEditDocDefendant] = useState('');

  // Delete Document Confirmation State
  const [docToDelete, setDocToDelete] = useState<LegalDocument | null>(null);

  // Edit Dossier Modal State
  const [dossierToEdit, setDossierToEdit] = useState<PelakNode | null>(null);
  const [editDossierTitle, setEditDossierTitle] = useState('');
  const [editDossierCode, setEditDossierCode] = useState('');
  const [editDossierSector, setEditDossierSector] = useState('');
  const [editDossierOwner, setEditDossierOwner] = useState('');
  const [editDossierDomain, setEditDossierDomain] = useState<CaseDomain>('general');
  const [editDossierDesc, setEditDossierDesc] = useState('');

  // Delete Dossier Confirmation State
  const [dossierToDelete, setDossierToDelete] = useState<PelakNode | null>(null);

  // Auto-deduplication Toast
  const [dedupNotice, setDedupNotice] = useState<string | null>(null);

  const unresolvedDocsCount = documents.filter((d) => d.isPendingRoot || d.pelakId === 'unresolved').length;
  const currentDossier = pelaks.find((p) => p.id === selectedPelakId);

  // Filter documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (filterUnresolvedOnly) {
        return doc.isPendingRoot || doc.pelakId === 'unresolved';
      }

      const matchesPelak =
        !selectedPelakId ||
        selectedPelakId === 'all' ||
        doc.pelakId === selectedPelakId;

      const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
      const matchesRisk =
        !filterRiskOnly || doc.isForgedOrConflicting || doc.riskLevel === 'high' || doc.riskLevel === 'critical';
      const matchesStarred = !filterStarredOnly || !!doc.isStarred;

      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        doc.title.toLowerCase().includes(q) ||
        doc.documentNumber.toLowerCase().includes(q) ||
        doc.authority.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        (doc.parties.claimant && doc.parties.claimant.toLowerCase().includes(q)) ||
        (doc.parties.defendant && doc.parties.defendant.toLowerCase().includes(q)) ||
        (doc.pelakCode && doc.pelakCode.toLowerCase().includes(q));

      return matchesPelak && matchesCategory && matchesRisk && matchesStarred && matchesSearch;
    });
  }, [documents, filterUnresolvedOnly, selectedPelakId, filterCategory, filterRiskOnly, filterStarredOnly, searchTerm]);

  // Sort documents: Starred documents ALWAYS appear at the top!
  const sortedDocs = useMemo(() => {
    return [...filteredDocs].sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      return 0;
    });
  }, [filteredDocs]);

  // Toggle selection for a document
  const handleToggleDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocIds.length === sortedDocs.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(sortedDocs.map((d) => d.id));
    }
  };

  // Filter existing dossiers for merge modal
  const filteredMergePelaks = useMemo(() => {
    if (!mergeSearchTerm.trim()) return pelaks;
    const q = mergeSearchTerm.toLowerCase().trim();
    return pelaks.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q)
    );
  }, [pelaks, mergeSearchTerm]);

  // Execute Merge
  const handleConfirmMerge = () => {
    if (!onMergeDocuments || selectedDocIds.length === 0) return;

    if (mergeMode === 'existing') {
      const target = pelaks.find((p) => p.id === mergeTargetPelakId);
      if (!target) return;
      onMergeDocuments(selectedDocIds, target.id, target.code);
    } else {
      const docNum = mergeNewCaseNumber.trim() || Date.now().toString().slice(-4);
      const targetCode = mergeNewCaseNumber.trim()
        ? (mergeNewCaseNumber.trim().startsWith('کلاسه') ? mergeNewCaseNumber.trim() : `کلاسه-${mergeNewCaseNumber.trim()}`)
        : `کلاسه-${docNum}`;
      const targetId = `dossier-${mergeNewDomain}-${Date.now()}`;
      const targetTitle = mergeNewTitle.trim() || 'پرونده تجمیع اسناد وکیل';

      const newPelak: Partial<PelakNode> = {
        id: targetId,
        code: targetCode,
        mainNumber: docNum,
        sector: 'شعبه قضایی رسیدگی‌کننده',
        title: targetTitle,
        areaM2: 0,
        ownerName: mergeNewClient.trim() || 'موکل پرونده',
        status: 'valid',
        childrenIds: [],
        description: `پرونده تجمیعی ایجاد شده با ادغام ${toPersianDigits(selectedDocIds.length)} سند`,
        deedType: mergeNewDomain === 'real_estate' ? 'تک‌برگی کاداستری' : 'پرونده قضایی حقوقی/کیفری',
        isNonLandDossier: mergeNewDomain !== 'real_estate',
        dossierDomain: mergeNewDomain,
        clientRole: 'وکیل تام‌الاختیار',
      };

      onMergeDocuments(selectedDocIds, targetId, targetCode, newPelak);
    }

    setSelectedDocIds([]);
    setIsMergeModalOpen(false);
  };

  const categories = [
    { id: 'all', label: 'همه اسناد' },
    { id: 'verdict', label: 'دادنامه‌ها و احکام دادگاه' },
    { id: 'deed', label: 'اسناد مالکیت رسمی' },
    { id: 'order', label: 'دستور موقت و قرارهای توقیف' },
    { id: 'inquiry', label: 'استعلامات ثبتی' },
    { id: 'contract', label: 'مبایعه‌نامه‌ها و قراردادها' },
    { id: 'power_of_attorney', label: 'وکالت‌نامه‌های رسمی' },
    { id: 'minutes', label: 'صورت‌مجلس و شکواییه' },
  ];

  const handleConfirmManualAssign = () => {
    if (!docToAssign || !assignTargetPelakId || !onManualReconcile) return;
    onManualReconcile(docToAssign.id, assignTargetPelakId);
    setDocToAssign(null);
  };

  // Open Edit Document Modal
  const handleOpenEditDoc = (doc: LegalDocument) => {
    setDocToEdit(doc);
    setEditDocTitle(doc.title);
    setEditDocNumber(doc.documentNumber || '');
    setEditDocDate(doc.issueDate || '');
    setEditDocAuthority(doc.authority || '');
    setEditDocCategory(doc.category || 'verdict');
    setEditDocSummary(doc.summary || '');
    setEditDocRisk(doc.riskLevel || 'low');
    setEditDocPelakId(doc.pelakId || '');
    setEditDocClaimant(doc.parties?.claimant || '');
    setEditDocDefendant(doc.parties?.defendant || '');
  };

  const handleSaveDocEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docToEdit || !onUpdateDocument) return;

    onUpdateDocument(docToEdit.id, {
      title: editDocTitle.trim() || docToEdit.title,
      documentNumber: editDocNumber.trim(),
      issueDate: editDocDate.trim(),
      authority: editDocAuthority.trim(),
      category: editDocCategory,
      summary: editDocSummary.trim(),
      riskLevel: editDocRisk,
      pelakId: editDocPelakId || docToEdit.pelakId,
      parties: {
        ...docToEdit.parties,
        claimant: editDocClaimant.trim(),
        defendant: editDocDefendant.trim(),
      },
    });

    setDocToEdit(null);
  };

  // Open Edit Dossier Modal
  const handleOpenEditDossier = (dossier: PelakNode) => {
    setDossierToEdit(dossier);
    setEditDossierTitle(dossier.title);
    setEditDossierCode(dossier.code);
    setEditDossierSector(dossier.sector || '');
    setEditDossierOwner(dossier.ownerName || '');
    setEditDossierDomain(dossier.dossierDomain || 'general');
    setEditDossierDesc(dossier.description || '');
  };

  const handleSaveDossierEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossierToEdit || !onUpdatePelak) return;

    onUpdatePelak(dossierToEdit.id, {
      title: editDossierTitle.trim() || dossierToEdit.title,
      code: editDossierCode.trim() || dossierToEdit.code,
      sector: editDossierSector.trim(),
      ownerName: editDossierOwner.trim(),
      dossierDomain: editDossierDomain,
      description: editDossierDesc.trim(),
    });

    setDossierToEdit(null);
  };

  // Trigger Auto-Deduplication
  const handleTriggerAutoDeduplicate = () => {
    if (!onAutoDeduplicate) return;
    const removed = onAutoDeduplicate(selectedPelakId);
    if (removed > 0) {
      setDedupNotice(`تعداد ${toPersianDigits(removed)} فایل تکراری با موفقیت شناسایی و به صورت خودکار حذف شد.`);
    } else {
      setDedupNotice('هیچ سند تکراری در این بخش یافت نشد؛ تمامی فایل‌ها منحصر‌به‌فرد هستند.');
    }
    setTimeout(() => setDedupNotice(null), 5000);
  };

  if (documents.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto">
          <FileText className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white mb-1">
            آرشیو اسناد پرونده در انتظار بارگذاری مدارک
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            هیچ سندی در سامانه یافت نشد. می‌توانید با ورود به بخش بارگذاری، یک بسته مدرک را با ذکر نام پرونده مستقیماً بارگذاری فرمایید.
          </p>
        </div>
        {onGoToScanner && (
          <button
            onClick={onGoToScanner}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            ورود به بخش اسکن و بارگذاری دسته‌ای
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Toast Notification for Deduplication */}
      {dedupNotice && (
        <div className="bg-emerald-950 border border-emerald-600/80 p-3.5 rounded-xl flex items-center justify-between text-xs text-emerald-200 animate-in fade-in shadow-xl">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{dedupNotice}</span>
          </div>
          <button onClick={() => setDedupNotice(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Filter and Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-sky-400" />
              آرشیو تخصصی اسناد و پرونده‌های قضایی - ثبتی
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              مدیریت و ویرایش اسناد، ستاره‌دار کردن مدارک کلیدی، حذف خودکار تکراری‌ها و ادغام پرونده‌ها
            </p>
          </div>

          {/* Quick Pelak Selector */}
          {pelaks.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">انتخاب پرونده:</span>
              <select
                value={selectedPelakId}
                onChange={(e) => {
                  onSelectPelak(e.target.value);
                  setFilterUnresolvedOnly(false);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="all">تمام پرونده‌ها و پلاک‌ها ({toPersianDigits(documents.length)} سند)</option>
                {pelaks.map((p) => {
                  const count = documents.filter((d) => d.pelakId === p.id).length;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.isNonLandDossier ? `📁 ${p.title} (${toPersianDigits(count)})` : `📍 پلاک ${p.code} - ${p.title} (${toPersianDigits(count)})`}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Selected Dossier Management Header (when a specific dossier is selected) */}
        {currentDossier && selectedPelakId !== 'all' && (
          <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                    {currentDossier.code}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-white">{currentDossier.title}</h3>
                  {currentDossier.dossierDomain && (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                        getDomainMeta(currentDossier.dossierDomain).bg
                      } ${getDomainMeta(currentDossier.dossierDomain).text} ${
                        getDomainMeta(currentDossier.dossierDomain).border
                      }`}
                    >
                      {getDomainMeta(currentDossier.dossierDomain).label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                  <span>موکل: <strong className="text-slate-200">{currentDossier.ownerName}</strong></span>
                  {currentDossier.sector && <span>· مرجع: {currentDossier.sector}</span>}
                  <span>· کل اسناد: <strong className="text-amber-400">{toPersianDigits(documents.filter((d) => d.pelakId === currentDossier.id).length)}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onUpdatePelak && (
                <button
                  type="button"
                  onClick={() => handleOpenEditDossier(currentDossier)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-sky-300 border border-sky-800/60 rounded-xl flex items-center gap-1.5 transition-colors"
                  title="ویرایش مشخصات پرونده"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  ویرایش پرونده
                </button>
              )}

              {onDeletePelak && (
                <button
                  type="button"
                  onClick={() => setDossierToDelete(currentDossier)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-rose-950/60 text-rose-300 border border-rose-800/50 rounded-xl flex items-center gap-1.5 transition-colors"
                  title="حذف پرونده"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف پرونده
                </button>
              )}

              {onAutoDeduplicate && (
                <button
                  type="button"
                  onClick={handleTriggerAutoDeduplicate}
                  className="px-3 py-1.5 text-xs font-medium bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-xl flex items-center gap-1.5 transition-colors"
                  title="حذف خودکار فایل‌های تکراری"
                >
                  <CopyCheck className="w-3.5 h-3.5 text-emerald-400" />
                  حذف تکراری‌ها
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search & Status Filters */}
        <div className="pt-1 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="جستجو در متن دادنامه، شماره سند، مرجع صادرکننده، کلاسه، خواهان، خوانده..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 pl-8"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Starred Only Toggle */}
            <button
              onClick={() => setFilterStarredOnly(!filterStarredOnly)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
                filterStarredOnly
                  ? 'bg-amber-950/90 text-amber-300 border-amber-600 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-amber-300'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${filterStarredOnly ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
              <span>فقط ستاره‌دارها ({toPersianDigits(documents.filter((d) => d.isStarred).length)})</span>
            </button>

            {/* Auto Deduplicate across all button */}
            {onAutoDeduplicate && selectedPelakId === 'all' && (
              <button
                onClick={handleTriggerAutoDeduplicate}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border bg-slate-950 text-emerald-400 border-emerald-800/60 hover:bg-emerald-950/40 transition-colors font-medium"
                title="شناسایی و حذف خودکار فایل‌های تکراری"
              >
                <CopyCheck className="w-3.5 h-3.5" />
                <span>حذف فایل‌های تکراری</span>
              </button>
            )}

            {/* Unresolved Filter Button */}
            <button
              onClick={() => {
                setFilterUnresolvedOnly(!filterUnresolvedOnly);
                if (!filterUnresolvedOnly) setFilterRiskOnly(false);
              }}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
                filterUnresolvedOnly
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700 font-semibold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>اسناد نامشخص/معلق ({toPersianDigits(unresolvedDocsCount)})</span>
            </button>

            <button
              onClick={() => {
                setFilterRiskOnly(!filterRiskOnly);
                if (!filterRiskOnly) setFilterUnresolvedOnly(false);
              }}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
                filterRiskOnly
                  ? 'bg-rose-950/80 text-rose-300 border-rose-700 font-semibold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              اسناد معارض / جعل
            </button>
          </div>
        </div>

        {/* Categories Tab Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pt-3 text-xs no-scrollbar border-t border-slate-800/60 mt-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setFilterCategory(cat.id);
                setFilterUnresolvedOnly(false);
              }}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap text-xs font-medium ${
                filterCategory === cat.id && !filterUnresolvedOnly
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Batch Action Toolbar when items are selected */}
      {selectedDocIds.length > 0 && (
        <div className="sticky top-2 z-40 bg-gradient-to-r from-amber-950/95 via-slate-900 to-amber-950/95 border border-amber-500/70 p-3.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
              {toPersianDigits(selectedDocIds.length)}
            </div>
            <div>
              <span className="text-xs font-bold text-white">
                {toPersianDigits(selectedDocIds.length)} سند علامت‌گذاری و انتخاب شده است
              </span>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                می‌توانید تمامی این اسناد پراکنده را در یک پرونده مشخص یا جدید ادغام کنید.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMergeModalOpen(true)}
              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <FolderPlus className="w-4 h-4 fill-slate-950" />
              ادغام یا انتساب دسته‌ای به پرونده...
            </button>

            <button
              type="button"
              onClick={() => setSelectedDocIds([])}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors"
            >
              لغو انتخاب
            </button>
          </div>
        </div>
      )}

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedDocs.map((doc) => {
          const isCriticalOrForged = doc.isForgedOrConflicting || doc.riskLevel === 'critical';
          const isPendingRoot = doc.isPendingRoot || doc.pelakId === 'unresolved';
          const isSelected = selectedDocIds.includes(doc.id);
          const isStarred = !!doc.isStarred;

          return (
            <div
              key={doc.id}
              className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition-all relative ${
                isStarred
                  ? 'border-amber-400/80 bg-gradient-to-b from-amber-950/15 via-slate-900 to-slate-900 shadow-md ring-1 ring-amber-400/20'
                  : isSelected
                  ? 'border-amber-500 ring-1 ring-amber-500/40 bg-amber-500/5'
                  : isPendingRoot
                  ? 'border-amber-700/60 bg-gradient-to-b from-slate-900 to-amber-950/20 hover:border-amber-500'
                  : isCriticalOrForged
                  ? 'border-rose-900/60 bg-gradient-to-b from-slate-900 to-rose-950/20 hover:border-rose-700'
                  : doc.linkedFromUnresolved
                  ? 'border-emerald-700/50 bg-gradient-to-b from-slate-900 to-emerald-950/15 hover:border-emerald-600'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header: Star, Checkbox, Pelak Code, Category */}
                <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    {/* Star Button */}
                    {onToggleStarDocument && (
                      <button
                        type="button"
                        onClick={() => onToggleStarDocument(doc.id)}
                        className={`p-1 rounded transition-colors ${
                          isStarred
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-slate-500 hover:text-amber-400'
                        }`}
                        title={isStarred ? 'حذف ستاره (اولویت عادی)' : 'ستاره‌دار کردن (نمایش در بالای پرونده)'}
                      >
                        <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    )}

                    {/* Checkbox for batch merge */}
                    <button
                      type="button"
                      onClick={() => handleToggleDoc(doc.id)}
                      className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                      title="انتخاب جهت ادغام"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                        isPendingRoot
                          ? 'text-amber-400 bg-amber-950/70 border-amber-800'
                          : 'text-amber-400 bg-slate-950 border-slate-800'
                      }`}
                    >
                      {doc.pelakCode}
                    </span>
                    <span className="text-xs text-slate-400">
                      {getCategoryLabel(doc.category)}
                    </span>
                    {doc.caseDomain && doc.caseDomain !== 'real_estate' && (
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                          getDomainMeta(doc.caseDomain).bg
                        } ${getDomainMeta(doc.caseDomain).text} ${getDomainMeta(doc.caseDomain).border}`}
                      >
                        {getDomainMeta(doc.caseDomain).label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isStarred && (
                      <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-300" />
                        سند مهم
                      </span>
                    )}

                    {isPendingRoot ? (
                      <span className="flex items-center gap-1 text-[11px] bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        نامشخص
                      </span>
                    ) : isCriticalOrForged ? (
                      <span className="flex items-center gap-1 text-[11px] bg-rose-950/80 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded">
                        <FileWarning className="w-3.5 h-3.5 text-rose-400" />
                        ریسک بالا
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        معتبر
                      </span>
                    )}
                  </div>
                </div>

                {/* Title and Summary */}
                <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-3 line-clamp-3">
                  {doc.summary}
                </p>

                {/* Legal Metadata Grid */}
                <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800/80 text-[11px] space-y-1 text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-500">
                      <FileText className="w-3 h-3 text-slate-400" />
                      شماره مدرک:
                    </span>
                    <span className="text-slate-200 font-mono font-medium">{doc.documentNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      تاریخ صدور:
                    </span>
                    <span className="text-slate-200 font-mono">{toPersianDigits(doc.issueDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Building className="w-3 h-3 text-slate-400" />
                      مرجع صادرکننده:
                    </span>
                    <span className="text-slate-200 truncate max-w-[220px]">{doc.authority}</span>
                  </div>
                  {(doc.parties?.claimant || doc.parties?.defendant) && (
                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-1 mt-1 text-[10px]">
                      <span className="text-slate-500">طرفین:</span>
                      <span className="text-slate-300 truncate max-w-[220px]">
                        {doc.parties.claimant && `خواهان: ${doc.parties.claimant}`}
                        {doc.parties.defendant && ` | خوانده: ${doc.parties.defendant}`}
                      </span>
                    </div>
                  )}
                  {doc.fileName && (
                    <div className="flex items-center justify-between border-t border-slate-800/40 pt-1 text-[10px] text-slate-500 font-mono">
                      <span>فایل منبع:</span>
                      <span className="truncate max-w-[200px] text-slate-400">{doc.fileName}</span>
                    </div>
                  )}
                </div>

                {/* Reconciliation Note if present */}
                {doc.reconciliationNote && (
                  <div className="mt-2 text-[11px] text-emerald-300/95 bg-emerald-950/40 border border-emerald-800/50 p-2 rounded">
                    <strong>شرح پیوند: </strong>
                    {doc.reconciliationNote}
                  </div>
                )}
              </div>

              {/* Bottom Card Actions: Edit, Delete, View, Ask */}
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveDocForModal(doc)}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium py-1 px-2 rounded hover:bg-slate-800 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    جزئیات
                  </button>

                  {doc.scanImageUrl && (
                    <button
                      type="button"
                      onClick={() => handleOpenQuickView(doc)}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium py-1 px-2 rounded hover:bg-slate-800 transition-colors"
                      title="پیش‌نمایش سریع تصویر/فایل سند در تمام‌صفحه با زوم و چرخش"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      پیش‌نمایش سریع
                    </button>
                  )}

                  <button
                    onClick={() => onAskAboutDoc(doc)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium py-1 px-2 rounded hover:bg-slate-800 transition-colors"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    چت وکیل
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Edit / Rename Document */}
                  {onUpdateDocument && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditDoc(doc)}
                      className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors"
                      title="ویرایش و تغییر نام سند"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete Document */}
                  {onDeleteDocument && (
                    <button
                      type="button"
                      onClick={() => setDocToDelete(doc)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      title="حذف سند از پرونده"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* If unresolved or needs reassign */}
                  {isPendingRoot && onManualReconcile && (
                    <button
                      onClick={() => {
                        setDocToAssign(doc);
                        setAssignTargetPelakId(pelaks[0]?.id || '');
                      }}
                      className="text-[11px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <LinkIcon className="w-3 h-3" />
                      انتساب...
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT / RENAME DOCUMENT MODAL */}
      {docToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">ویرایش و تغییر نام سند قضایی</h3>
              </div>
              <button
                onClick={() => setDocToEdit(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDocEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  عنوان و نام سند: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editDocTitle}
                  onChange={(e) => setEditDocTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">شماره مدرک / دادنامه:</label>
                  <input
                    type="text"
                    value={editDocNumber}
                    onChange={(e) => setEditDocNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">تاریخ صدور (شمسی):</label>
                  <input
                    type="text"
                    value={editDocDate}
                    onChange={(e) => setEditDocDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">مرجع صادرکننده:</label>
                  <input
                    type="text"
                    value={editDocAuthority}
                    onChange={(e) => setEditDocAuthority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">دسته‌بندی مدرک:</label>
                  <select
                    value={editDocCategory}
                    onChange={(e) => setEditDocCategory(e.target.value as DocumentCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="verdict">دادنامه و حکم دادگاه</option>
                    <option value="deed">سند مالکیت رسمی</option>
                    <option value="order">قرار قضایی / دستور موقت</option>
                    <option value="inquiry">استعلام ثبتی / اداری</option>
                    <option value="contract">مبایعه‌نامه و قرارداد</option>
                    <option value="power_of_attorney">وکالت‌نامه رسمی</option>
                    <option value="minutes">صورت‌مجلس و شکواییه</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">خواهان / شاکی:</label>
                  <input
                    type="text"
                    value={editDocClaimant}
                    onChange={(e) => setEditDocClaimant(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">خوانده / متهم:</label>
                  <input
                    type="text"
                    value={editDocDefendant}
                    onChange={(e) => setEditDocDefendant(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">انتقال / انتساب به پرونده:</label>
                <select
                  value={editDocPelakId}
                  onChange={(e) => setEditDocPelakId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="unresolved">موضوع نامشخص / معلق</option>
                  {pelaks.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.isNonLandDossier ? `📁 ${p.title} (${p.code})` : `📍 پلاک ${p.code} - ${p.title}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">خلاصه حقوقی و تحلیل سند:</label>
                <textarea
                  rows={3}
                  value={editDocSummary}
                  onChange={(e) => setEditDocSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDocToEdit(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors shadow-md"
                >
                  ذخیره تغییرات سند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE DOCUMENT CONFIRMATION MODAL */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">تأیید حذف سند از پرونده</h3>
                <p className="text-xs text-rose-300/80 mt-0.5">این عملیات غیرقابل بازگشت است.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
              آیا از حذف قطعی سند «<strong className="text-white">{docToDelete.title}</strong>» به شماره مدرک «{docToDelete.documentNumber}» از پایگاه داده اطمینان دارید؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteDocument) onDeleteDocument(docToDelete.id);
                  setDocToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md transition-colors"
              >
                حذف قطعی سند
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT DOSSIER MODAL */}
      {dossierToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">ویرایش مشخصات پرونده قضایی / ثبتی</h3>
              </div>
              <button
                onClick={() => setDossierToEdit(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDossierEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  عنوان پرونده: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editDossierTitle}
                  onChange={(e) => setEditDossierTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">شماره کلاسه / پلاک:</label>
                  <input
                    type="text"
                    value={editDossierCode}
                    onChange={(e) => setEditDossierCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">حوزه پرونده:</label>
                  <select
                    value={editDossierDomain}
                    onChange={(e) => setEditDossierDomain(e.target.value as CaseDomain)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="criminal">کیفری / شکایت و کلاهبرداری</option>
                    <option value="commercial">تجاری / چک و مطالبات</option>
                    <option value="contracts">قراردادها و تعهدات</option>
                    <option value="real_estate">اراضی و ثبتی (ملکی)</option>
                    <option value="inheritance">انحصار وراثت و ترکه</option>
                    <option value="administrative">دیوان عدالت اداری</option>
                    <option value="general">عمومی</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">موکل / طرف اصلی:</label>
                  <input
                    type="text"
                    value={editDossierOwner}
                    onChange={(e) => setEditDossierOwner(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">شعبه دادگاه / مرجع:</label>
                  <input
                    type="text"
                    value={editDossierSector}
                    onChange={(e) => setEditDossierSector(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">توضیحات و خلاصه موضوع پرونده:</label>
                <textarea
                  rows={3}
                  value={editDossierDesc}
                  onChange={(e) => setEditDossierDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDossierToEdit(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors shadow-md"
                >
                  ذخیره تغییرات پرونده
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE DOSSIER CONFIRMATION MODAL */}
      {dossierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">تأیید حذف پرونده</h3>
                <p className="text-xs text-rose-300/80 mt-0.5">اسناد این پرونده حفظ شده و به بخش نامشخص منتقل می‌شوند.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
              آیا از حذف پرونده «<strong className="text-white">{dossierToDelete.title}</strong>» (کلاسه {dossierToDelete.code}) اطمینان دارید؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDossierToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeletePelak) onDeletePelak(dossierToDelete.id);
                  setDossierToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md transition-colors"
              >
                تأیید و حذف پرونده
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH MERGE MODAL */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  ادغام و انتساب گروهی {toPersianDigits(selectedDocIds.length)} سند در پرونده واحد
                </h3>
              </div>
              <button
                onClick={() => setIsMergeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              تمامی اسناد انتخاب‌شده به این پرونده منتقل شده و برچسب‌های پراکنده یا موضوع نامشخص آن‌ها اصلاح خواهد گردید.
            </p>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMergeMode('existing')}
                className={`py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                  mergeMode === 'existing'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                الحاق به پرونده موجود
              </button>

              <button
                type="button"
                onClick={() => setMergeMode('new')}
                className={`py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                  mergeMode === 'new'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                تشکیل پرونده جدید
              </button>
            </div>

            {mergeMode === 'existing' ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="جستجوی نام پرونده، پلاک یا موکل..."
                    value={mergeSearchTerm}
                    onChange={(e) => setMergeSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {filteredMergePelaks.map((p) => {
                    const isSelected = mergeTargetPelakId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setMergeTargetPelakId(p.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold truncate text-white">{p.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {p.code} · موکل: {p.ownerName}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    نام پرونده / موضوع دعوا: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: پرونده شکایت کلاهبرداری علیه رضوی"
                    value={mergeNewTitle}
                    onChange={(e) => setMergeNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">حوزه پرونده:</label>
                    <select
                      value={mergeNewDomain}
                      onChange={(e) => setMergeNewDomain(e.target.value as CaseDomain)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="criminal">کیفری / شکایت و کلاهبرداری</option>
                      <option value="commercial">تجاری / چک و مطالبات</option>
                      <option value="contracts">قراردادها و تعهدات</option>
                      <option value="real_estate">اراضی و ثبتی (ملکی)</option>
                      <option value="inheritance">انحصار وراثت و ترکه</option>
                      <option value="administrative">دیوان عدالت اداری</option>
                      <option value="general">عمومی</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">کلاسه پرونده یا شماره پلاک:</label>
                    <input
                      type="text"
                      placeholder="مثال: ۹۹۰۲۴۱"
                      value={mergeNewCaseNumber}
                      onChange={(e) => setMergeNewCaseNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">موکل / شاکی:</label>
                    <input
                      type="text"
                      placeholder="نام موکل"
                      value={mergeNewClient}
                      onChange={(e) => setMergeNewClient(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">طرف مقابل / مشتکی‌عنه:</label>
                    <input
                      type="text"
                      placeholder="نام متهم / خوانده"
                      value={mergeNewDefendant}
                      onChange={(e) => setMergeNewDefendant(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmMerge}
                className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-md transition-colors"
              >
                تأیید و ادغام گروهی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Single Assign Dialog */}
      {docToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">انتساب مستقیم مدرک به پرونده</h3>
              </div>
              <button
                onClick={() => setDocToAssign(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="text-xs font-medium text-white mb-1">{docToAssign.title}</div>
              <p className="text-[11px] text-slate-400 mb-3">{docToAssign.summary}</p>

              <label className="block text-xs text-slate-300 font-medium mb-1.5">
                پرونده مقصد جهت الصاق قطعی:
              </label>
              <select
                value={assignTargetPelakId}
                onChange={(e) => setAssignTargetPelakId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {pelaks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.isNonLandDossier ? `📁 ${p.title} (${p.code})` : `📍 پلاک ${p.code} - ${p.title}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDocToAssign(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmManualAssign}
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-md transition-colors"
              >
                تأیید و پیوند سند
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Details Modal */}
      {activeDocForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">شناسنامه موشکافانه سند قضایی</h3>
              </div>
              <button
                onClick={() => setActiveDocForModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Sheet */}
            <div className="border border-slate-800 rounded-xl p-6 bg-slate-950 text-slate-200 relative overflow-hidden">
              <div className="text-center pb-4 border-b border-slate-800 relative z-10">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
                  <Scale className="w-7 h-7" />
                </div>
                <h4 className="text-xs text-slate-400 tracking-wider">سند مضبوط در پرونده محرمانه وکیل</h4>
                <h3 className="text-base font-bold text-white mt-1">
                  {activeDocForModal.title}
                </h3>
                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 mt-2 font-mono">
                  <span>شماره: {activeDocForModal.documentNumber}</span>
                  <span>·</span>
                  <span>تاریخ: {toPersianDigits(activeDocForModal.issueDate)}</span>
                  <span>·</span>
                  <span>پرونده: {activeDocForModal.pelakCode}</span>
                </div>
              </div>

              <div className="py-4 space-y-3 relative z-10 text-xs leading-relaxed font-sans">
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-500">مرجع صادرکننده: </span>
                    <strong className="text-slate-200">{activeDocForModal.authority}</strong>
                  </div>
                  {activeDocForModal.fileName && (
                    <div className="mt-1 pt-1 border-t border-slate-800/60 font-mono text-slate-400">
                      <span>نام فایل ذخیره‌شده: </span>
                      <span className="text-slate-300">{activeDocForModal.fileName}</span>
                    </div>
                  )}
                </div>

                {activeDocForModal.scanImageUrl && (
                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Eye className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">فایل دیجیتال اسکن سند پیوست است</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-xs">{activeDocForModal.fileName || 'تصویر اصل مدرک'}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenQuickView(activeDocForModal)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-colors shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      پیش‌نمایش سریع، زوم و چرخش
                    </button>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-amber-400 text-xs mb-1">شرح موضوع و خلاصه حقوقی:</h4>
                  <p className="text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-justify">
                    {activeDocForModal.summary}
                  </p>
                </div>

                {activeDocForModal.reconciliationNote && (
                  <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-lg text-emerald-200">
                    <h5 className="font-bold text-xs text-emerald-300 mb-1">شرح پیوند و ریشه‌یابی ثبتی:</h5>
                    <p className="text-xs">{activeDocForModal.reconciliationNote}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 relative z-10">
                <span className="text-[11px] text-slate-500">نسخه دیجیتال اسکن‌شده در آرشیو تک‌کاربره</span>
                <div className="flex items-center gap-2">
                  {onUpdateDocument && (
                    <button
                      onClick={() => {
                        handleOpenEditDoc(activeDocForModal);
                        setActiveDocForModal(null);
                      }}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-sky-300 px-3 py-1.5 rounded-lg text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      ویرایش سند
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    چاپ
                  </button>
                  <button
                    onClick={() => {
                      onAskAboutDoc(activeDocForModal);
                      setActiveDocForModal(null);
                    }}
                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    تحلیل در چت‌بات وکیل
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK VIEW FULLSCREEN MODAL (WITH ZOOM, ROTATION, RESET & DOWNLOAD) */}
      {quickViewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col animate-in fade-in select-none">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white truncate max-w-md">
                    {quickViewDoc.title}
                  </h3>
                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                    {quickViewDoc.pelakCode}
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {getCategoryLabel(quickViewDoc.category)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 font-mono">
                  {quickViewDoc.documentNumber && <span>شماره: {quickViewDoc.documentNumber}</span>}
                  {quickViewDoc.issueDate && <span>· تاریخ: {toPersianDigits(quickViewDoc.issueDate)}</span>}
                  {quickViewDoc.fileName && <span className="truncate max-w-xs text-slate-300">· فایل: {quickViewDoc.fileName}</span>}
                </div>
              </div>
            </div>

            {/* Top Right Close & Download Action */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadQuickViewFile}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs rounded-xl transition-colors"
                title="دانلود فایل اصلی"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>دانلود فایل</span>
              </button>

              <button
                type="button"
                onClick={() => setQuickViewDoc(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                title="بستن (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Visual Display Area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative min-h-0 bg-radial from-slate-900 to-slate-950">
            {quickViewDoc.scanImageUrl ? (
              quickViewDoc.fileMimeType?.includes('pdf') ||
              quickViewDoc.scanImageUrl.startsWith('data:application/pdf') ||
              quickViewDoc.fileName?.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-full max-w-5xl rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex flex-col shadow-2xl">
                  <iframe
                    src={quickViewDoc.scanImageUrl}
                    className="w-full h-full bg-white"
                    title={quickViewDoc.title}
                  />
                </div>
              ) : (
                <div
                  className="max-w-full max-h-full flex items-center justify-center p-4"
                  style={{
                    transform: `scale(${zoomScale}) rotate(${rotationDeg}deg)`,
                    transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
                    transformOrigin: 'center center',
                  }}
                >
                  <img
                    src={quickViewDoc.scanImageUrl}
                    alt={quickViewDoc.title}
                    className="max-h-[75vh] max-w-[85vw] object-contain rounded-xl shadow-2xl border border-slate-800/80 pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
              )
            ) : (
              <div className="text-center p-8 bg-slate-900/80 border border-slate-800 rounded-2xl max-w-md">
                <FileWarning className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-white mb-1">پیش‌نمایش تصویر برای این سند یافت نشد</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  این سند به صورت متنی یا دستی در سامانه ثبت شده و تصویر یا فایل پیوست ندارد.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDocForModal(quickViewDoc);
                    setQuickViewDoc(null);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                >
                  مشاهده شناسنامه متنی سند
                </button>
              </div>
            )}
          </div>

          {/* Floating Glass Bottom Toolbar (Zoom, Rotation, Reset, Download) */}
          <div className="px-4 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-center shrink-0">
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 rounded-2xl px-3 py-1.5 shadow-2xl backdrop-blur-md">
              {/* Zoom Out */}
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomScale <= 0.5}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                title="کوچک‌نمایی (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {/* Zoom Percentage */}
              <span className="text-xs font-mono font-bold text-amber-400 min-w-[50px] text-center tabular-nums">
                {toPersianDigits(Math.round(zoomScale * 100))}%
              </span>

              {/* Zoom In */}
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomScale >= 4}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                title="بزرگ‌نمایی (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <span className="h-4 w-px bg-slate-800 mx-1" />

              {/* Rotate Counter-Clockwise */}
              <button
                type="button"
                onClick={handleRotateCcw}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="چرخش ۹۰ درجه پادساعتگرد"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Rotate Clockwise */}
              <button
                type="button"
                onClick={handleRotateCw}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="چرخش ۹۰ درجه ساعتگرد (R)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Reset Zoom & Rotation */}
              <button
                type="button"
                onClick={handleResetQuickView}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="بازنشانی اندازه و زاویه (0)"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px]">ریست</span>
              </button>

              <span className="h-4 w-px bg-slate-800 mx-1" />

              {/* Download */}
              <button
                type="button"
                onClick={handleDownloadQuickViewFile}
                disabled={!quickViewDoc.scanImageUrl}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors shadow-sm disabled:opacity-40"
                title="دانلود سند روی رایانه"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="text-[11px]">دانلود</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
