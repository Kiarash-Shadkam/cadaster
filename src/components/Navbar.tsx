import React from 'react';
import {
  Scale,
  MapPin,
  FolderOpen,
  History,
  Sparkles,
  Bot,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Lock,
  Unlock,
  Download,
  Briefcase,
  Search,
  RotateCcw,
  GripVertical,
} from 'lucide-react';
import { PelakNode } from '../types/cadastre';
import { toPersianDigits } from '../utils/persian';
import { useDraggableTabs } from '../hooks/useDraggableTabs';

export type NavTabId = 'cadastre' | 'documents' | 'timeline' | 'lawyerDesk' | 'scanner' | 'chat';

const DEFAULT_NAV_TABS: NavTabId[] = [
  'cadastre',
  'documents',
  'timeline',
  'lawyerDesk',
  'scanner',
  'chat',
];

interface NavbarProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  selectedPelak: PelakNode | null;
  totalPelaksCount: number;
  landPelaksCount?: number;
  totalDocsCount: number;
  disputesCount: number;
  validDeedsCount: number;
  urgentDeadlinesCount?: number;
  onLockVault: () => void;
  onExportBackup: () => void;
  onOpenSearch?: () => void;
  onOpenSecuritySettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedPelak,
  totalPelaksCount,
  landPelaksCount,
  totalDocsCount,
  disputesCount,
  validDeedsCount,
  urgentDeadlinesCount,
  onLockVault,
  onExportBackup,
  onOpenSearch,
  onOpenSecuritySettings,
}) => {
  const {
    orderedTabs,
    isLocked,
    toggleLock,
    resetOrder,
    isOrderCustomized,
    getTabDragProps,
  } = useDraggableTabs<NavTabId>('cadastre_vault_nav_tabs_order', DEFAULT_NAV_TABS, true);

  const tabConfigMap: Record<
    NavTabId,
    { label: string; icon: React.ComponentType<{ className?: string }>; badge?: React.ReactNode }
  > = {
    cadastre: {
      label: 'کارتابل و ساختار پرونده‌ها',
      icon: FolderOpen,
    },
    documents: {
      label: 'آرشیو اسناد و پرونده‌خوانی',
      icon: FolderOpen,
    },
    timeline: {
      label: 'سیر زمانی و گردشکار پرونده',
      icon: History,
    },
    lawyerDesk: {
      label: 'میز کار و ابزارهای پیشرفته وکیل',
      icon: Briefcase,
      badge:
        typeof urgentDeadlinesCount === 'number' && urgentDeadlinesCount > 0 ? (
          <span className="text-[10px] bg-rose-600 text-white font-mono px-1.5 py-0.2 rounded-full font-bold animate-pulse">
            {toPersianDigits(urgentDeadlinesCount)}
          </span>
        ) : null,
    },
    scanner: {
      label: 'بارگذاری دسته‌ای و ایجنت اسکنر',
      icon: Sparkles,
    },
    chat: {
      label: 'دستیار هوشمند حقوقی وکیل',
      icon: Bot,
    },
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40 backdrop-blur-md">
      {/* Top Bar with Legal Branding and Overview Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Lawyer Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-900/30">
              <Scale className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  سامانه اتوماسیون کاداستر و اسناد وکیل
                </h1>
                <span className="text-[10px] sm:text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  کارتابل امن تک‌کاربره
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                پایگاه داده مستقل اسناد واقعی، کاداستر سلسله‌مراتبی و چت‌بات هوشمند پرونده
              </p>
            </div>
          </div>

          {/* Action Tools & Stats */}
          <div className="flex flex-wrap items-center gap-2.5 self-end md:self-auto text-xs">
            {/* Tabular Stats Counter */}
            <div className="flex items-center gap-2.5 text-xs text-slate-400 border-slate-800 bg-slate-950/60 px-3 py-1.5 rounded-lg border">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                <span>پرونده‌ها:</span>
                <span className="font-semibold text-white tabular-nums">{toPersianDigits(totalPelaksCount)}</span>
              </div>
              {typeof landPelaksCount === 'number' && landPelaksCount > 0 && (
                <>
                  <span className="text-slate-700">|</span>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>پلاک‌های ملکی:</span>
                    <span className="font-semibold text-white tabular-nums">{toPersianDigits(landPelaksCount)}</span>
                  </div>
                </>
              )}
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <FileCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>اسناد:</span>
                <span className="font-semibold text-white tabular-nums">{toPersianDigits(totalDocsCount)}</span>
              </div>
              {disputesCount > 0 && (
                <>
                  <span className="text-slate-700">|</span>
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>دعاوی:</span>
                    <span className="font-semibold text-white tabular-nums">{toPersianDigits(disputesCount)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Global Search Button */}
            <button
              onClick={onOpenSearch}
              title="جستجوی سرتاسری در اسناد و پرونده‌ها (کلید میانبر Ctrl + K)"
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700/80 hover:border-amber-500/50 transition-all text-xs group shadow-sm"
            >
              <Search className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline font-medium">جستجو...</span>
              <kbd className="hidden md:inline bg-slate-850 bg-slate-900 border border-slate-700 text-[10px] text-slate-400 px-1.5 py-0.5 rounded font-mono">
                Ctrl K
              </kbd>
            </button>

            {/* Export and Lock Buttons */}
            <button
              onClick={onExportBackup}
              title="پشتیبان‌گیری امن از کل اسناد روی رایانه"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors text-xs"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">پشتیبان‌گیری</span>
            </button>

            {/* Security Settings & Lock Buttons */}
            {onOpenSecuritySettings && (
              <button
                onClick={onOpenSecuritySettings}
                title="تنظیمات امنیتی، تغییر رمز و کانال‌های بازیابی پیامک/ایمیل"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">تنظیمات رمز</span>
              </button>
            )}

            <button
              onClick={onLockVault}
              title="قفل فوری کارتابل محرمانه"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg transition-colors text-xs font-medium"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>قفل کارتابل</span>
            </button>
          </div>
        </div>

        {/* Selected Context Ribbon */}
        {selectedPelak && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-slate-500">
                {selectedPelak.isNonLandDossier ? 'پرونده فعال:' : 'پلاک / پرونده فعال:'}
              </span>
              <span className="text-amber-400 font-semibold font-mono tabular-nums">
                {selectedPelak.code}
              </span>
              <span>·</span>
              <span className="text-slate-200">{selectedPelak.title}</span>
            </div>
            {!selectedPelak.isNonLandDossier && selectedPelak.areaM2 > 0 ? (
              <div className="text-slate-400 text-[11px]">
                <span>مساحت: </span>
                <span className="text-slate-200 font-medium tabular-nums">{toPersianDigits(selectedPelak.areaM2?.toLocaleString('fa-IR') || '۰')} م²</span>
              </div>
            ) : selectedPelak.dossierDomain ? (
              <div className="text-slate-400 text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                <span>موضوع: </span>
                <span className="text-amber-300 font-medium">
                  {selectedPelak.dossierDomain === 'commercial' ? 'اسناد تجاری و مالی' :
                   selectedPelak.dossierDomain === 'criminal' ? 'کیفری' :
                   selectedPelak.dossierDomain === 'contracts' ? 'قراردادی' :
                   selectedPelak.dossierDomain === 'inheritance' ? 'ارث و حسبی' :
                   selectedPelak.dossierDomain === 'administrative' ? 'اداری و شهرداری' : 'عمومی'}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Navigation Tabs with Hold & Drag & Lock Control */}
      <div className="border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
          {/* Scrollable Tabs */}
          <nav
            aria-label="زبانه های اصلی"
            className="flex items-center space-x-reverse space-x-1 sm:space-x-reverse sm:space-x-2 overflow-x-auto py-1.5 no-scrollbar flex-1"
          >
            {orderedTabs.map((tabId) => {
              const cfg = tabConfigMap[tabId];
              if (!cfg) return null;
              const Icon = cfg.icon;
              const dragProps = getTabDragProps(tabId);
              const isActive = activeTab === tabId;

              return (
                <div
                  key={tabId}
                  {...dragProps}
                  className={`inline-flex items-center rounded-lg ${dragProps.className}`}
                >
                  <button
                    onClick={() => setActiveTab(tabId)}
                    className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap relative ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {!isLocked && (
                      <GripVertical
                        className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                          isActive ? 'text-slate-900/60' : 'text-slate-500 hover:text-amber-400'
                        }`}
                      />
                    )}
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{cfg.label}</span>
                    {cfg.badge}
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Tab Reordering Controls & Lock Button */}
          <div className="flex items-center gap-1.5 shrink-0 py-1.5 border-r border-slate-800 pr-2.5 mr-1">
            {isOrderCustomized && (
              <button
                onClick={resetOrder}
                title="بازنشانی ترتیب سربرگ‌ها به چیدمان پیش‌فرض"
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-400 hover:text-amber-300 hover:bg-slate-800/70 rounded-lg border border-transparent hover:border-slate-700 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[11px]">بازنشانی</span>
              </button>
            )}

            <button
              onClick={toggleLock}
              title={
                isLocked
                  ? 'چینش سربرگ‌ها قفل است (برای فعال کردن جابجایی تب‌ها با Drag & Drop کلیک کنید)'
                  : 'قابلیت جابجایی سربرگ‌ها فعال است (برای جلوگیری از تغییر ناخواسته کلیک کنید تا قفل شود)'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isLocked
                  ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
              }`}
            >
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden lg:inline text-[11px]">قفل چینش</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="hidden lg:inline text-[11px] font-bold">جابجایی آزاد</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
