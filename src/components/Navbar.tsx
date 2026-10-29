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
  Share2,
  FolderDown,
  Sun,
  Moon,
} from 'lucide-react';
import { PelakNode, DelegatedSession } from '../types/cadastre';
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
  onOpenShareModal?: () => void;
  onOpenClaimModal?: () => void;
  claimedCasesCount?: number;
  activeDelegatedSession?: DelegatedSession | null;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
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
  onOpenShareModal,
  onOpenClaimModal,
  claimedCasesCount,
  activeDelegatedSession,
  theme = 'dark',
  onToggleTheme,
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
      label: 'پرونده‌ها و کاداستر',
      icon: FolderOpen,
    },
    documents: {
      label: 'آرشیو اسناد',
      icon: FileCheck,
    },
    timeline: {
      label: 'گردش‌کار و وقایع',
      icon: History,
    },
    lawyerDesk: {
      label: 'میز کار وکیل',
      icon: Briefcase,
      badge:
        typeof urgentDeadlinesCount === 'number' && urgentDeadlinesCount > 0 ? (
          <span className="text-[10px] bg-rose-600 text-white font-mono px-1.5 py-0.2 rounded-full font-bold animate-pulse">
            {toPersianDigits(urgentDeadlinesCount)}
          </span>
        ) : null,
    },
    scanner: {
      label: 'اسکن و بارگذاری',
      icon: Sparkles,
    },
    chat: {
      label: 'دستیار هوشمند',
      icon: Bot,
    },
  };

  return (
    <header className="border-b border-slate-800/90 bg-slate-900/95 sticky top-0 z-40 backdrop-blur-md">
      {/* Top Bar with Legal Branding and Overview Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          {/* Logo & Lawyer Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-900/20 shrink-0">
              <Scale className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">
                  اتوماسیون کاداستر و اسناد وکیل
                </h1>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  کارتابل امن
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                مدیریت هوشمند پرونده‌های قضایی، اسناد و کاداستر ثبتی
              </p>
            </div>
          </div>

          {/* Action Tools & Stats */}
          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto text-xs">
            {/* Minimalist Tabular Stats Pill */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-300 font-medium">
                <strong className="text-amber-400 font-bold">{toPersianDigits(totalPelaksCount)}</strong> پرونده
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-slate-300 font-medium">
                <strong className="text-sky-400 font-bold">{toPersianDigits(totalDocsCount)}</strong> سند
              </span>
              {disputesCount > 0 && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="text-rose-400 font-medium">
                    <strong className="font-bold">{toPersianDigits(disputesCount)}</strong> اختلاف
                  </span>
                </>
              )}
            </div>

            {/* Global Search Button */}
            <button
              onClick={onOpenSearch}
              title="جستجوی سرتاسری (کلید میانبر Ctrl + K)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 hover:border-amber-500/40 transition-all text-xs group"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-medium">جستجو</span>
              <kbd className="hidden xl:inline bg-slate-900 border border-slate-700 text-[10px] text-slate-400 px-1 py-0.2 rounded font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Collaboration Group (Share & Claim) */}
            <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800/80">
              {onOpenShareModal && !activeDelegatedSession && (
                <button
                  onClick={onOpenShareModal}
                  title="اشتراک‌گذاری و تفویض پرونده‌ها به همکاران"
                  className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded transition-colors text-xs font-medium"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">تفویض</span>
                </button>
              )}

              {onOpenClaimModal && !activeDelegatedSession && (
                <button
                  onClick={onOpenClaimModal}
                  title="دریافت پرونده مشترک از سایر کاربران"
                  className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded transition-colors text-xs font-medium"
                >
                  <FolderDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">دریافت</span>
                  {claimedCasesCount && claimedCasesCount > 0 ? (
                    <span className="text-[10px] bg-emerald-600 text-white font-mono px-1 py-0.2 rounded-full font-bold">
                      {toPersianDigits(claimedCasesCount)}
                    </span>
                  ) : null}
                </button>
              )}
            </div>

            {/* Tools Group (Backup, Passcode Settings, Vault Lock) */}
            <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800/80">
              <button
                onClick={onExportBackup}
                title="پشتیبان‌گیری از داده‌ها روی سیستم"
                className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors text-xs"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">پشتیبان</span>
              </button>

              {onOpenSecuritySettings && (
                <button
                  onClick={onOpenSecuritySettings}
                  title="تنظیمات امنیتی و رمز ورود"
                  className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors text-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">رمز</span>
                </button>
              )}

              {/* Dark / Day Mode Toggle */}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  title={theme === 'dark' ? 'تغییر به تم روشن و روز (Day Mode)' : 'تغییر به تم تاریک و شب (Dark Mode)'}
                  className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors text-xs"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden xl:inline text-[11px]">روز</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-sky-400" />
                      <span className="hidden xl:inline text-[11px]">شب</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={onLockVault}
                title="قفل فوری کارتابل محرمانه"
                className="flex items-center gap-1 px-2 py-1 bg-rose-950/30 hover:bg-rose-900/60 text-rose-300 rounded transition-colors text-xs font-medium"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>قفل</span>
              </button>
            </div>
          </div>
        </div>

        {/* Selected Context Ribbon */}
        {selectedPelak && (
          <div className="mt-2 pt-1.5 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-500 text-[11px]">پرونده انتخابی:</span>
              <span className="text-amber-400 font-bold font-mono tabular-nums text-xs">
                {selectedPelak.code}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-200 truncate">{selectedPelak.title}</span>
            </div>
            {selectedPelak.dossierDomain ? (
              <span className="text-slate-400 text-[11px] shrink-0">
                {selectedPelak.dossierDomain === 'commercial' ? 'تجاری و مالی' :
                 selectedPelak.dossierDomain === 'criminal' ? 'کیفری' :
                 selectedPelak.dossierDomain === 'contracts' ? 'قراردادی' :
                 selectedPelak.dossierDomain === 'inheritance' ? 'ارث' :
                 selectedPelak.dossierDomain === 'administrative' ? 'شهرداری و اداری' : 'عمومی'}
              </span>
            ) : !selectedPelak.isNonLandDossier && selectedPelak.areaM2 > 0 ? (
              <span className="text-slate-400 text-[11px] shrink-0 tabular-nums">
                {toPersianDigits(selectedPelak.areaM2?.toLocaleString('fa-IR') || '۰')} م²
              </span>
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
                  ? 'چینش سربرگ‌ها قفل است (جهت جابجایی تب‌ها با کشیدن کلیک کنید)'
                  : 'جابجایی تب‌ها فعال است (جهت تثبیت چینش کلیک کنید)'
              }
              className={`p-1.5 rounded-lg text-xs font-medium border transition-all ${
                isLocked
                  ? 'bg-slate-900/80 text-slate-500 border-slate-800 hover:text-slate-300'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/50'
              }`}
            >
              {isLocked ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
