import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  FolderOpen,
  FileText,
  AlertTriangle,
  ExternalLink,
  Bot,
  Eye,
  Calendar,
  Building,
  User,
  ShieldAlert,
  ArrowLeft,
  CornerDownLeft,
} from 'lucide-react';
import { PelakNode, LegalDocument, DisputeAlert } from '../types/cadastre';
import { toPersianDigits, getStatusLabel, getCategoryLabel } from '../utils/persian';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  pelaks: PelakNode[];
  documents: LegalDocument[];
  disputes: DisputeAlert[];
  onSelectPelak: (pelakId: string) => void;
  onNavigateTab: (tab: 'cadastre' | 'documents' | 'timeline' | 'scanner' | 'chat') => void;
  onQuickViewDoc?: (doc: LegalDocument) => void;
  onAskAboutDoc?: (doc: LegalDocument) => void;
}

type FilterScope = 'all' | 'pelaks' | 'documents' | 'disputes';

interface SearchResultItem {
  id: string;
  type: 'pelak' | 'document' | 'dispute';
  title: string;
  subtitle: string;
  code?: string;
  date?: string;
  badge?: string;
  badgeColor?: string;
  snippet?: string;
  rawItem: PelakNode | LegalDocument | DisputeAlert;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  pelaks,
  documents,
  disputes,
  onSelectPelak,
  onNavigateTab,
  onQuickViewDoc,
  onAskAboutDoc,
}) => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<FilterScope>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global keyboard shortcut to close on Esc or navigate items
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter and compute search results
  const results = useMemo<SearchResultItem[]>(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      // Return empty or suggested recent items
      return [];
    }

    const items: SearchResultItem[] = [];

    // 1. Search Pelaks (Dossiers)
    if (scope === 'all' || scope === 'pelaks') {
      pelaks.forEach((p) => {
        const matchesCode = p.code.toLowerCase().includes(trimmed);
        const matchesTitle = p.title.toLowerCase().includes(trimmed);
        const matchesOwner = (p.ownerName || '').toLowerCase().includes(trimmed);
        const matchesSector = (p.sector || '').toLowerCase().includes(trimmed);
        const matchesDesc = (p.description || '').toLowerCase().includes(trimmed);
        const matchesMain = (p.mainNumber || '').toLowerCase().includes(trimmed);
        const matchesSub = (p.subNumber || '').toLowerCase().includes(trimmed);

        if (matchesCode || matchesTitle || matchesOwner || matchesSector || matchesDesc || matchesMain || matchesSub) {
          const statusMeta = getStatusLabel(p.status || 'valid');
          items.push({
            id: `pelak-${p.id}`,
            type: 'pelak',
            title: p.title,
            subtitle: p.isNonLandDossier
              ? `پرونده کلاسه: ${p.code} · موکل: ${p.ownerName || 'نامشخص'}`
              : `پلاک ثبتی: ${p.code} · ${p.sector} · مالک: ${p.ownerName || 'نامشخص'}`,
            code: p.code,
            badge: p.isNonLandDossier ? 'پرونده قضایی' : 'پلاک ثبتی',
            badgeColor: p.isNonLandDossier ? 'bg-blue-900/40 text-blue-300 border-blue-700/50' : 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
            snippet: p.description,
            rawItem: p,
          });
        }
      });
    }

    // 2. Search Legal Documents
    if (scope === 'all' || scope === 'documents') {
      documents.forEach((d) => {
        const matchesTitle = d.title.toLowerCase().includes(trimmed);
        const matchesDocNum = (d.documentNumber || '').toLowerCase().includes(trimmed);
        const matchesPelakCode = (d.pelakCode || '').toLowerCase().includes(trimmed);
        const matchesSummary = (d.summary || '').toLowerCase().includes(trimmed);
        const matchesAuth = (d.authority || '').toLowerCase().includes(trimmed);
        const matchesClaimant = (d.parties?.claimant || '').toLowerCase().includes(trimmed);
        const matchesDefendant = (d.parties?.defendant || '').toLowerCase().includes(trimmed);
        const matchesReconcile = (d.reconciliationNote || '').toLowerCase().includes(trimmed);

        if (
          matchesTitle ||
          matchesDocNum ||
          matchesPelakCode ||
          matchesSummary ||
          matchesAuth ||
          matchesClaimant ||
          matchesDefendant ||
          matchesReconcile
        ) {
          const catLabel = getCategoryLabel(d.category);
          items.push({
            id: `doc-${d.id}`,
            type: 'document',
            title: d.title,
            subtitle: `شماره مدرک: ${d.documentNumber || 'ندارد'} · مرجع صادرکننده: ${d.authority || 'نامشخص'} · انتساب به: ${d.pelakCode}`,
            code: d.documentNumber,
            date: d.issueDate,
            badge: catLabel,
            badgeColor: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
            snippet: d.summary || d.reconciliationNote,
            rawItem: d,
          });
        }
      });
    }

    // 3. Search Disputes & Timeline
    if (scope === 'all' || scope === 'disputes') {
      disputes.forEach((disp) => {
        const matchesTitle = disp.title.toLowerCase().includes(trimmed);
        const matchesType = (disp.disputeType || '').toLowerCase().includes(trimmed);
        const matchesPelak = (disp.pelakCode || '').toLowerCase().includes(trimmed);
        const matchesBranch = (disp.courtBranch || '').toLowerCase().includes(trimmed);
        const matchesCaseNum = (disp.caseNumber || '').toLowerCase().includes(trimmed);
        const matchesStrategy = (disp.strategyNote || '').toLowerCase().includes(trimmed);

        if (matchesTitle || matchesType || matchesPelak || matchesBranch || matchesCaseNum || matchesStrategy) {
          items.push({
            id: `disp-${disp.id}`,
            type: 'dispute',
            title: disp.title,
            subtitle: `موضوع دعوا: ${disp.disputeType} · کلاسه: ${disp.caseNumber || 'ندارد'} · شعبه: ${disp.courtBranch || 'نامشخص'}`,
            code: disp.caseNumber,
            badge: 'تعارض و دعوای حقوقی',
            badgeColor: 'bg-rose-900/40 text-rose-300 border-rose-700/50',
            snippet: disp.strategyNote,
            rawItem: disp,
          });
        }
      });
    }

    return items;
  }, [query, scope, pelaks, documents, disputes]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelectItem = (item: SearchResultItem) => {
    if (item.type === 'pelak') {
      const p = item.rawItem as PelakNode;
      onSelectPelak(p.id);
      onNavigateTab('cadastre');
      onClose();
    } else if (item.type === 'document') {
      const d = item.rawItem as LegalDocument;
      onSelectPelak(d.pelakId);
      onNavigateTab('documents');
      onClose();
    } else if (item.type === 'dispute') {
      const disp = item.rawItem as DisputeAlert;
      onSelectPelak(disp.pelakId);
      onNavigateTab('timeline');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelectItem(results[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-right"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Input */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center gap-3">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی سرتاسری: نام پرونده، شماره سند، پلاک ثبتی، کلاسه، نام موکل، خوانده یا متن مدرک..."
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800 px-2 py-1 rounded text-[11px] text-slate-400 font-mono">
            <span>Esc</span>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between text-xs overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500 text-[11px] ml-1">دامنه جستجو:</span>
            <button
              onClick={() => setScope('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                scope === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              همه بخش‌ها
            </button>
            <button
              onClick={() => setScope('pelaks')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                scope === 'pelaks'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              پرونده‌ها و پلاک‌ها ({toPersianDigits(pelaks.length)})
            </button>
            <button
              onClick={() => setScope('documents')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                scope === 'documents'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              اسناد و مدارک ({toPersianDigits(documents.length)})
            </button>
            <button
              onClick={() => setScope('disputes')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                scope === 'disputes'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              دعاوی و تعارضات ({toPersianDigits(disputes.length)})
            </button>
          </div>

          {results.length > 0 && (
            <div className="text-[11px] text-slate-400 shrink-0 font-mono">
              {toPersianDigits(results.length)} نتیجه یافت شد
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[55vh]">
          {query.trim() === '' ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-3">
              <Search className="w-8 h-8 mx-auto text-slate-600 stroke-[1.5]" />
              <div className="font-semibold text-slate-300">
                عبارت مورد نظر خود را برای جستجوی فراگیر تایپ فرمایید
              </div>
              <p className="text-slate-500 max-w-md mx-auto text-[11px] leading-relaxed">
                می‌توانید کلاسه پرونده، شماره دادنامه، پلاک ثبتی، نام موکل، نام طرف دعوا، یا عبارات مندرج در متن اسناد را جستجو فرمایید.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                <span className="text-[10px] text-slate-500">پیشنهادات سریع:</span>
                {pelaks.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setQuery(p.code)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 font-mono"
                  >
                    {p.code}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <ShieldAlert className="w-8 h-8 mx-auto text-amber-500/80" />
              <div className="font-semibold text-slate-300">
                هیچ موردی مطابق با «{query}» یافت نشد.
              </div>
              <p className="text-slate-500 text-[11px]">
                لطفاً املای کلمات را بررسی نموده یا کلمات کوتاه‌تر یا شماره کلاسه را جستجو فرمایید.
              </p>
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = selectedIndex === index;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        item.type === 'pelak'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : item.type === 'document'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {item.type === 'pelak' && <FolderOpen className="w-4 h-4" />}
                      {item.type === 'document' && <FileText className="w-4 h-4" />}
                      {item.type === 'dispute' && <AlertTriangle className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-white text-xs sm:text-sm truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {item.date && (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {toPersianDigits(item.date)}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-400 text-xs truncate">{item.subtitle}</p>

                      {item.snippet && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/80">
                          «{item.snippet}»
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions on Item */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {item.type === 'document' && (
                      <>
                        {onQuickViewDoc && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickViewDoc(item.rawItem as LegalDocument);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors text-xs flex items-center gap-1"
                            title="پیش‌نمایش سریع مدرک"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                            <span className="hidden md:inline text-[10px]">پیش‌نمایش</span>
                          </button>
                        )}
                        {onAskAboutDoc && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAskAboutDoc(item.rawItem as LegalDocument);
                              onClose();
                            }}
                            className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 transition-colors text-xs flex items-center gap-1"
                            title="تحلیل و پرسش در چت‌بات"
                          >
                            <Bot className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden md:inline text-[10px]">تحلیل در چت</span>
                          </button>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-lg border border-slate-700 transition-colors text-xs flex items-center gap-1 font-medium"
                    >
                      <span className="text-[11px]">انتقال به بخش</span>
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info & shortcut cues */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300 font-mono">↑↓</kbd>
              <span>پیمایش</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300 font-mono flex items-center gap-0.5">
                <CornerDownLeft className="w-2.5 h-2.5" /> Enter
              </kbd>
              <span>انتخاب و باز کردن</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300 font-mono">Esc</kbd>
              <span>بستن</span>
            </span>
          </div>
          <div className="text-slate-500 hidden sm:block">
            جستجوی فوری در پایگاه داده محلی اسناد
          </div>
        </div>
      </div>
    </div>
  );
};
