import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronLeft,
  ChevronDown,
  Layers,
  Shield,
  AlertOctagon,
  Lock,
  Clock,
  Plus,
  FileText,
  Search,
  MapPin,
  Sparkles,
  Briefcase,
  FileCheck,
  Building,
  Share2,
  Users,
  CheckSquare,
  Square,
  FolderDown,
} from 'lucide-react';
import { PelakNode, LegalDocument, CaseDomain, DelegatedSession, ClaimedDelegatedCase } from '../types/cadastre';
import { toPersianDigits, formatArea, getStatusLabel } from '../utils/persian';

interface CadastreTreeProps {
  pelaks: PelakNode[];
  documents: LegalDocument[];
  selectedPelakId: string;
  onSelectPelak: (id: string) => void;
  onAddPelak: (newNode: Partial<PelakNode>) => void;
  onUpdatePelak?: (pelakId: string, updates: Partial<PelakNode>) => void;
  onGoToScanner?: () => void;
  externalStatusFilter?: string;
  onOpenShareModal?: (caseIds?: string[]) => void;
  onOpenClaimModal?: () => void;
  claimedCases?: ClaimedDelegatedCase[];
  onRemoveClaimedCase?: (caseId: string) => void;
  activeDelegatedSession?: DelegatedSession | null;
}

export const CadastreTree: React.FC<CadastreTreeProps> = ({
  pelaks,
  documents,
  selectedPelakId,
  onSelectPelak,
  onAddPelak,
  onUpdatePelak,
  onGoToScanner,
  externalStatusFilter,
  onOpenShareModal,
  onOpenClaimModal,
  claimedCases,
  onRemoveClaimedCase,
  activeDelegatedSession,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(externalStatusFilter || 'all');
  const [activeDomainFilter, setActiveDomainFilter] = useState<'all' | 'real_estate' | 'non_land'>('all');
  const [selectedCaseIdsForBatch, setSelectedCaseIdsForBatch] = useState<string[]>([]);

  const handleToggleBatchCase = (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCaseIdsForBatch((prev) =>
      prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId]
    );
  };

  React.useEffect(() => {
    if (externalStatusFilter !== undefined) {
      setStatusFilter(externalStatusFilter);
    }
  }, [externalStatusFilter]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  // Form fields for adding new node/dossier
  const [entryKind, setEntryKind] = useState<'land' | 'non_land'>('land');
  const [pelakLevel, setPelakLevel] = useState<'main' | 'sub' | 'parcel'>('main');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [inputCode, setInputCode] = useState('');
  const [inputSector, setInputSector] = useState('بخش ۱۱ ثبتی تهران');
  const [inputTitle, setInputTitle] = useState('');
  const [inputArea, setInputArea] = useState('');
  const [inputOwner, setInputOwner] = useState('موکل (وکالت رسمی)');
  const [inputDeedType, setInputDeedType] = useState<any>('تک‌برگی کاداستری');
  const [inputDomain, setInputDomain] = useState<CaseDomain>('commercial');

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const realEstatePelaks = pelaks.filter((p) => !p.isNonLandDossier);
  const mainRealEstatePelaks = realEstatePelaks.filter((p) => !p.parentId);
  const nonLandDossiers = pelaks.filter((p) => p.isNonLandDossier);

  const getChildren = (parentId: string) => {
    return pelaks.filter((p) => p.parentId === parentId);
  };

  const getDocCountForPelak = (pelakId: string) => {
    const childIds = pelaks.filter((p) => p.parentId === pelakId).map((p) => p.id);
    return documents.filter((d) => d.pelakId === pelakId || childIds.includes(d.pelakId)).length;
  };

  const handleOpenAddModal = (kind: 'land' | 'non_land', level: 'main' | 'sub' | 'parcel' = 'main', parentId?: string) => {
    setEntryKind(kind);
    setPelakLevel(level);
    if (parentId) {
      setSelectedParentId(parentId);
    } else if (mainRealEstatePelaks.length > 0) {
      setSelectedParentId(mainRealEstatePelaks[0].id);
    }
    setInputCode('');
    setInputTitle('');
    setInputArea('');
    setShowAddModal(true);
  };

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode || !inputTitle) return;

    if (entryKind === 'non_land') {
      const newDossier: Partial<PelakNode> = {
        id: `dossier-${Date.now()}`,
        code: inputCode.startsWith('کلاسه') ? inputCode : `کلاسه-${inputCode}`,
        mainNumber: inputCode,
        sector: inputSector || 'شعبه قضایی رسیدگی‌کننده',
        title: inputTitle,
        areaM2: 0,
        ownerName: inputOwner,
        status: 'valid',
        childrenIds: [],
        description: `تشکیل پرونده موضوعی در حوزه ${inputDomain}.`,
        deedType: 'پرونده قضایی حقوقی/کیفری',
        isNonLandDossier: true,
        dossierDomain: inputDomain,
        clientRole: 'وکیل تام‌الاختیار',
      };
      onAddPelak(newDossier);
      setShowAddModal(false);
      return;
    }

    // Land parcel
    let finalCode = inputCode;
    let parentNode: PelakNode | undefined;

    if (pelakLevel !== 'main' && selectedParentId) {
      parentNode = pelaks.find((p) => p.id === selectedParentId);
      if (parentNode) {
        finalCode = `${parentNode.code}/${inputCode}`;
      }
    }

    const newNode: Partial<PelakNode> = {
      id: `pelak-node-${Date.now()}`,
      code: finalCode,
      mainNumber: parentNode?.mainNumber || inputCode,
      subNumber: pelakLevel === 'sub' ? inputCode : parentNode?.subNumber,
      parcelNumber: pelakLevel === 'parcel' ? inputCode : undefined,
      sector: parentNode?.sector || inputSector,
      title: inputTitle,
      areaM2: Number(inputArea) || 0,
      ownerName: inputOwner,
      status: 'valid',
      parentId: pelakLevel === 'main' ? undefined : selectedParentId,
      childrenIds: [],
      description: `ثبت شده در سامانه بر اساس مستندات ثبتی پرونده موکل.`,
      deedType: inputDeedType,
      isNonLandDossier: false,
      boundaryDetails: {
        north: 'مطابق سند رسمی و پرونده ثبتی',
        south: 'مطابق سند رسمی و پرونده ثبتی',
        east: 'مطابق سند رسمی و پرونده ثبتی',
        west: 'مطابق سند رسمی و پرونده ثبتی',
      },
      cadastralShape: {
        x: Math.floor(Math.random() * 300) + 50,
        y: Math.floor(Math.random() * 200) + 50,
        width: 140,
        height: 100,
        label: inputTitle,
        fillColor: '#059669',
      },
    };

    onAddPelak(newNode);
    setShowAddModal(false);
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case 'forged':
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />;
      case 'arrested':
        return <Lock className="w-3.5 h-3.5 text-purple-400" />;
      case 'disputed':
        return <Layers className="w-3.5 h-3.5 text-amber-400" />;
      case 'pending':
      default:
        return <Clock className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  const renderNode = (node: PelakNode, level: number = 0) => {
    const children = getChildren(node.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes[node.id] !== false;
    const isSelected = selectedPelakId === node.id;
    const isBatchSelected = selectedCaseIdsForBatch.includes(node.id);
    const statusMeta = getStatusLabel(node.status);
    const docCount = getDocCountForPelak(node.id);

    const matchesSearch =
      node.code.includes(searchTerm) ||
      node.title.includes(searchTerm) ||
      node.description.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || node.status === statusFilter;

    if (!matchesSearch || !matchesStatus) {
      const hasMatchingChild = children.some(
        (c) =>
          (c.code.includes(searchTerm) || c.title.includes(searchTerm)) &&
          (statusFilter === 'all' || c.status === statusFilter)
      );
      if (!hasMatchingChild) return null;
    }

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => onSelectPelak(node.id)}
          className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border my-1 ${
            isBatchSelected
              ? 'bg-amber-500/20 border-amber-500/60 shadow-sm text-amber-100 ring-1 ring-amber-500/40'
              : isSelected
              ? 'bg-amber-500/15 border-amber-500/50 shadow-sm text-amber-100'
              : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300'
          }`}
          style={{ paddingRight: `${Math.max(8, level * 18)}px` }}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {/* Batch Selection Checkbox */}
            {!activeDelegatedSession && (
              <button
                type="button"
                onClick={(e) => handleToggleBatchCase(node.id, e)}
                className={`p-0.5 rounded transition-colors ${
                  isBatchSelected
                    ? 'text-amber-400'
                    : 'text-slate-600 hover:text-slate-400 group-hover:text-slate-500'
                }`}
                title={isBatchSelected ? 'لغو انتخاب پرونده' : 'انتخاب پرونده جهت اشتراک‌گذاری دسته‌ای'}
              >
                {isBatchSelected ? (
                  <CheckSquare className="w-4 h-4 fill-amber-500/20" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
            )}

            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-4 inline-block" />
            )}

            {node.isNonLandDossier ? (
              <Briefcase className="w-4 h-4 text-sky-400 shrink-0" />
            ) : level === 0 ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
              )
            ) : level === 1 ? (
              <Layers className="w-4 h-4 text-sky-400 shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0 group-hover:bg-amber-400" />
            )}

            <div className="flex flex-col truncate">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400 tracking-wider">
                  {node.code}
                </span>
                <span className="text-xs font-medium text-slate-200 truncate">
                  {node.title}
                </span>
                {claimedCases?.some((c) => c.caseId === node.id) && (
                  <span
                    className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-medium flex items-center gap-1 shrink-0"
                    title={`پرونده تفویض‌شده از: ${claimedCases.find((c) => c.caseId === node.id)?.delegatorName}`}
                  >
                    <FolderDown className="w-3 h-3 text-emerald-400" />
                    <span>تفویض‌شده</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                {node.areaM2 > 0 && <span>{formatArea(node.areaM2)} · </span>}
                <span className="text-slate-400">{node.deedType}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Share Button for single case */}
            {onOpenShareModal && !activeDelegatedSession && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenShareModal([node.id]);
                }}
                className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors opacity-70 group-hover:opacity-100"
                title="اشتراک‌گذاری و تفویض این پرونده"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}

            {docCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                <FileText className="w-3 h-3 text-sky-400" />
                <span className="tabular-nums">{toPersianDigits(docCount)}</span>
              </span>
            )}
            <span
              className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
            >
              {renderStatusIcon(node.status)}
              <span className="hidden sm:inline">{statusMeta.label}</span>
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-r border-slate-800/80 mr-3 my-0.5">
            {children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full">
      {/* Header and Add Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-amber-400" />
            کارتابل و ساختار پرونده‌ها
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تفکیک پرونده‌های موضوعی (حقوقی، چک و مالی، قراردادها، کیفری) و کاداستر اراضی
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenAddModal('non_land')}
            className="flex items-center gap-1 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            <Briefcase className="w-3.5 h-3.5" />
            پرونده جدید
          </button>
          <button
            onClick={() => handleOpenAddModal('land', 'main')}
            className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            پلاک ثبتی
          </button>
        </div>
      </div>

      {/* When Empty State */}
      {pelaks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-md">
            <Briefcase className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-1">
              کارتابل پرونده‌ها خام و آماده بارگذاری اسناد
            </h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mx-auto">
              عاری از هرگونه پرونده یا پلاک فرضی. اسناد اسکن‌شده به طور خودکار بر اساس موضوع (کیفری، تجاری، ملکی، قراردادی و...) در ساختار پرونده‌ها ثبت خواهند شد.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={() => handleOpenAddModal('non_land')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Briefcase className="w-4 h-4" />
              تشکیل پرونده موضوعی
            </button>
            <button
              onClick={() => handleOpenAddModal('land', 'main')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              ثبت پلاک ثبتی
            </button>

            {onGoToScanner && (
              <button
                onClick={onGoToScanner}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                اسکن مستقیم اسناد و پرونده‌ها
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className="pt-3 pb-2 space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="جستجوی پلاک، کلاسه، عنوان، یا پرونده..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 pl-8"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            {/* Category / Domain Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg text-[11px] border border-slate-800">
              <button
                onClick={() => setActiveDomainFilter('all')}
                className={`flex-1 py-1 rounded transition-colors text-center ${
                  activeDomainFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                کل پرونده‌ها ({toPersianDigits(pelaks.length)})
              </button>
              <button
                onClick={() => setActiveDomainFilter('real_estate')}
                className={`flex-1 py-1 rounded transition-colors text-center ${
                  activeDomainFilter === 'real_estate'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                املاک و کاداستر ({toPersianDigits(realEstatePelaks.length)})
              </button>
              <button
                onClick={() => setActiveDomainFilter('non_land')}
                className={`flex-1 py-1 rounded transition-colors text-center ${
                  activeDomainFilter === 'non_land'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                غیرملکی و موضوعی ({toPersianDigits(nonLandDossiers.length)})
              </button>
            </div>
          </div>

          {/* Tree Content */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 pl-1 mt-1">
            {/* Batch Selection Action Bar */}
            {selectedCaseIdsForBatch.length > 0 && !activeDelegatedSession && (
              <div className="bg-amber-950/70 border border-amber-500/50 rounded-xl p-2.5 px-3 flex items-center justify-between gap-2 shadow-lg animate-in slide-in-from-top-2 mb-2">
                <div className="flex items-center gap-2 text-xs text-amber-200">
                  <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-bold">
                    {toPersianDigits(selectedCaseIdsForBatch.length)} پرونده انتخاب شد
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCaseIdsForBatch([])}
                    className="text-[11px] text-slate-400 hover:text-white underline mr-1"
                  >
                    لغو
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenShareModal?.(selectedCaseIdsForBatch)}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  اشتراک‌گذاری و تعیین دسترسی
                </button>
              </div>
            )}

            {/* Real Estate Section */}
            {(activeDomainFilter === 'all' || activeDomainFilter === 'real_estate') && mainRealEstatePelaks.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-slate-400 mb-1 px-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>پرونده‌های اراضی و کاداستر ثبتی:</span>
                </div>
                {mainRealEstatePelaks.map((mainNode) => renderNode(mainNode, 0))}
              </div>
            )}

            {/* Non-Land Dossiers Section */}
            {(activeDomainFilter === 'all' || activeDomainFilter === 'non_land') && nonLandDossiers.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-slate-400 mb-1 px-1 flex items-center gap-1.5 pt-2 border-t border-slate-800/60">
                  <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                  <span>پرونده‌های حقوقی، تجاری، قراردادی و کیفری:</span>
                </div>
                {nonLandDossiers.map((dossier) => renderNode(dossier, 0))}
              </div>
            )}

            {/* Special Quarantine Node for Unresolved Land Documents */}
            {documents.filter((d) => d.isPendingRoot || d.pelakId === 'unresolved').length > 0 && (
              <div
                onClick={() => onSelectPelak('unresolved')}
                className={`mt-3 p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  selectedPelakId === 'unresolved'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                    : 'bg-amber-950/20 border-amber-800/50 hover:bg-amber-950/40 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block">
                      اسناد در انتظار ریشه‌یابی ثبتی
                    </span>
                    <span className="text-[10px] text-slate-400">
                      پلاک نامشخص (انتقال خودکار به محض ورود سند مادر)
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/60">
                  {toPersianDigits(
                    documents.filter((d) => d.isPendingRoot || d.pelakId === 'unresolved').length
                  )}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 text-right shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">
              {entryKind === 'non_land'
                ? 'تشکیل پرونده حقوقی / تجاری / کیفری'
                : pelakLevel === 'main'
                ? 'ثبت پلاک اصلی واقعی پرونده'
                : 'ثبت زیرپلاک تفکیکی'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              اطلاعات مستقیماً بر اساس مستندات واقعی و مدارک پرونده ثبت خواهد شد.
            </p>

            <form onSubmit={handleCreateEntry} className="space-y-3">
              {entryKind === 'non_land' ? (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">حوزه و موضوع پرونده:</label>
                    <select
                      value={inputDomain}
                      onChange={(e) => setInputDomain(e.target.value as CaseDomain)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    >
                      <option value="commercial">تجاری، چک و سفته</option>
                      <option value="contracts">دعاوی ناشی از قراردادها و مشارکت ساخت</option>
                      <option value="criminal">کیفری، کلاهبرداری و جعل</option>
                      <option value="inheritance">انحصار وراثت و تقسیم ترکه</option>
                      <option value="administrative">دیوان عدالت اداری و شهرداری</option>
                      <option value="general">سایر پرونده‌های حقوقی عمومی</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">شماره کلاسه پرونده / شعبه:</label>
                    <input
                      type="text"
                      placeholder="مثلاً: ۱۴۰۲-۲۴۰۲ یا شعبه ۱۲ دادگاه عمومی"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">عنوان پرونده:</label>
                    <input
                      type="text"
                      placeholder="مثلاً: پرونده مطالبه وجه چک‌های برگشتی صیادی"
                      value={inputTitle}
                      onChange={(e) => setInputTitle(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                </>
              ) : (
                <>
                  {pelakLevel !== 'main' && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">پلاک والد (پلاک بالاتر):</label>
                      <select
                        value={selectedParentId}
                        onChange={(e) => setSelectedParentId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                      >
                        {mainRealEstatePelaks.map((p) => (
                          <option key={p.id} value={p.id}>
                            پلاک {p.code} - {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {pelakLevel === 'main' ? 'شماره پلاک اصلی:' : 'شماره زیرپلاک یا فرعی:'}
                      </label>
                      <input
                        type="text"
                        placeholder="مثلاً: ۶۸ یا ۶۸/۲"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">مساحت (متر مربع):</label>
                      <input
                        type="number"
                        placeholder="مثلاً: ۴۵۰۰"
                        value={inputArea}
                        onChange={(e) => setInputArea(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">عنوان قطعه / مزرعه / پلاک:</label>
                    <input
                      type="text"
                      placeholder="مثلاً: مزرعه شادکام یا قطعه تفکیکی شماره ۲"
                      value={inputTitle}
                      onChange={(e) => setInputTitle(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1">نام موکل / طرف دعوا:</label>
                <input
                  type="text"
                  value={inputOwner}
                  onChange={(e) => setInputOwner(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  ثبت قطعی در سیستم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
