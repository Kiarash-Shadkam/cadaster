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
  Download,
} from 'lucide-react';
import { PelakNode } from '../types/cadastre';
import { toPersianDigits } from '../utils/persian';

interface NavbarProps {
  activeTab: 'cadastre' | 'documents' | 'timeline' | 'scanner' | 'chat';
  setActiveTab: (tab: 'cadastre' | 'documents' | 'timeline' | 'scanner' | 'chat') => void;
  selectedPelak: PelakNode | null;
  totalPelaksCount: number;
  totalDocsCount: number;
  disputesCount: number;
  validDeedsCount: number;
  onLockVault: () => void;
  onExportBackup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedPelak,
  totalPelaksCount,
  totalDocsCount,
  disputesCount,
  validDeedsCount,
  onLockVault,
  onExportBackup,
}) => {
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
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>پلاک‌ها:</span>
                <span className="font-semibold text-white tabular-nums">{toPersianDigits(totalPelaksCount)}</span>
              </div>
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

            {/* Export and Lock Buttons */}
            <button
              onClick={onExportBackup}
              title="پشتیبان‌گیری امن از کل اسناد روی رایانه"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors text-xs"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">پشتیبان‌گیری</span>
            </button>

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
              <span className="text-slate-500">پلاک فعال:</span>
              <span className="text-amber-400 font-semibold font-mono tabular-nums">
                {selectedPelak.code}
              </span>
              <span>·</span>
              <span className="text-slate-200">{selectedPelak.title}</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              <span>مساحت: </span>
              <span className="text-slate-200 font-medium tabular-nums">{toPersianDigits(selectedPelak.areaM2?.toLocaleString('fa-IR') || '۰')} م²</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-reverse space-x-1 sm:space-x-reverse sm:space-x-2 overflow-x-auto py-1.5 no-scrollbar">
            <button
              onClick={() => setActiveTab('cadastre')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'cadastre'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MapPin className="w-4 h-4" />
              ساختار پرونده‌ها و کاداستر ثبتی
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'documents'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              آرشیو اسناد و پرونده‌خوانی
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'timeline'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <History className="w-4 h-4" />
              سیر زمانی، گردشکار و تحلیل پرونده‌ها
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              بارگذاری دسته‌ای و ایجنت اسکنر
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'chat'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-4 h-4" />
              دستیار هوشمند حقوقی وکیل
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
