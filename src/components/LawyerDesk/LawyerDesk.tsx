import React, { useState } from 'react';
import {
  Briefcase,
  FileText,
  Calendar,
  Coins,
  ShieldAlert,
  FileSpreadsheet,
  AlertTriangle,
  Scale,
  Lock,
  Unlock,
  RotateCcw,
  GripVertical,
} from 'lucide-react';
import { PelakNode, LegalDocument, DisputeAlert, LegalDeadline, FeeRecord } from '../../types/cadastre';
import { LegalDraftingStudio } from './LegalDraftingStudio';
import { CourtDeadlinesManager } from './CourtDeadlinesManager';
import { LegalFeeCalculator } from './LegalFeeCalculator';
import { ConflictChecker } from './ConflictChecker';
import { ClientReportGenerator } from './ClientReportGenerator';
import { getDeadlineUrgency } from '../../utils/legalFormulas';
import { toPersianDigits } from '../../utils/persian';
import { useDraggableTabs } from '../../hooks/useDraggableTabs';

interface LawyerDeskProps {
  pelaks: PelakNode[];
  documents: LegalDocument[];
  disputes: DisputeAlert[];
  deadlines: LegalDeadline[];
  onSaveDeadlines: (deadlines: LegalDeadline[]) => void;
  feeRecords: FeeRecord[];
  onSaveFeeRecords: (feeRecords: FeeRecord[]) => void;
  selectedPelakId?: string;
  onSelectPelak?: (pelakId: string) => void;
}

export type LawyerSubTab = 'drafts' | 'deadlines' | 'fees' | 'conflicts' | 'reports';

const DEFAULT_LAWYER_SUBTABS: LawyerSubTab[] = [
  'drafts',
  'deadlines',
  'fees',
  'conflicts',
  'reports',
];

export const LawyerDesk: React.FC<LawyerDeskProps> = ({
  pelaks,
  documents,
  disputes,
  deadlines,
  onSaveDeadlines,
  feeRecords,
  onSaveFeeRecords,
  selectedPelakId,
  onSelectPelak,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<LawyerSubTab>('drafts');

  const {
    orderedTabs,
    isLocked,
    toggleLock,
    resetOrder,
    isOrderCustomized,
    getTabDragProps,
  } = useDraggableTabs<LawyerSubTab>('cadastre_lawyer_desk_subtabs_order', DEFAULT_LAWYER_SUBTABS, true);

  // Calculate urgent active deadlines (< 3 days)
  const urgentDeadlinesCount = deadlines.filter((d) => {
    if (d.isCompleted) return false;
    const urgency = getDeadlineUrgency(d.calculatedDueDate);
    return urgency.status === 'urgent' || urgency.status === 'expired';
  }).length;

  const subTabConfigMap: Record<
    LawyerSubTab,
    { label: string; icon: React.ComponentType<{ className?: string }>; badge?: React.ReactNode }
  > = {
    drafts: {
      label: 'تنظیم لوایح و دادخواست‌ها',
      icon: FileText,
    },
    deadlines: {
      label: 'مواعد قانونی و ثنا',
      icon: Calendar,
      badge:
        urgentDeadlinesCount > 0 ? (
          <span className="text-[10px] bg-rose-600 text-white font-mono px-1.5 py-0.2 rounded-full font-bold animate-pulse">
            {toPersianDigits(urgentDeadlinesCount)}
          </span>
        ) : null,
    },
    fees: {
      label: 'حسابداری حق‌الوکاله و تمبر ۱۰۳',
      icon: Coins,
    },
    conflicts: {
      label: 'استعلام تعارض منافع',
      icon: ShieldAlert,
    },
    reports: {
      label: 'گزارش شکیل پرونده موکل',
      icon: FileSpreadsheet,
    },
  };

  return (
    <div className="space-y-6">
      {/* Lawyer Desk Sub-Navigation Ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 shadow-lg backdrop-blur-md sticky top-[68px] z-30">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Subtabs Buttons with Hold & Drag */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar flex-1">
            {orderedTabs.map((subTabId) => {
              const cfg = subTabConfigMap[subTabId];
              if (!cfg) return null;
              const Icon = cfg.icon;
              const dragProps = getTabDragProps(subTabId);
              const isActive = activeSubTab === subTabId;

              return (
                <div
                  key={subTabId}
                  {...dragProps}
                  className={`inline-flex items-center rounded-xl ${dragProps.className}`}
                >
                  <button
                    onClick={() => setActiveSubTab(subTabId)}
                    className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
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
          </div>

          {/* Controls: Reset Order & Lock Toggle */}
          <div className="flex items-center gap-2 shrink-0 border-r border-slate-800 pr-2.5 mr-1">
            {isOrderCustomized && (
              <button
                onClick={resetOrder}
                title="بازنشانی ترتیب تب‌های میز کار وکیل"
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
                  ? 'چینش ابزارهای میز کار قفل است (جهت فعال‌سازی جابجایی تب‌ها با Drag & Drop کلیک کنید)'
                  : 'جابجایی ابزارهای میز کار فعال است (جهت قفل کردن چیدمان کلیک کنید)'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isLocked
                  ? 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
              }`}
            >
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline text-[11px]">قفل تب‌ها</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="hidden sm:inline text-[11px] font-bold">جابجایی آزاد</span>
                </>
              )}
            </button>

            {/* Lawyer Badge */}
            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800/80">
              <Scale className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-slate-200">میز کار تخصصی وکیل دادگستری</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sub-Tab View */}
      {activeSubTab === 'drafts' && (
        <LegalDraftingStudio
          pelaks={pelaks}
          documents={documents}
          selectedPelakId={selectedPelakId}
        />
      )}

      {activeSubTab === 'deadlines' && (
        <CourtDeadlinesManager
          deadlines={deadlines}
          onSaveDeadlines={onSaveDeadlines}
          pelaks={pelaks}
          selectedPelakId={selectedPelakId}
        />
      )}

      {activeSubTab === 'fees' && (
        <LegalFeeCalculator
          feeRecords={feeRecords}
          onSaveFeeRecords={onSaveFeeRecords}
          pelaks={pelaks}
          selectedPelakId={selectedPelakId}
        />
      )}

      {activeSubTab === 'conflicts' && (
        <ConflictChecker
          pelaks={pelaks}
          documents={documents}
          disputes={disputes}
          onSelectPelak={onSelectPelak}
        />
      )}

      {activeSubTab === 'reports' && (
        <ClientReportGenerator
          pelaks={pelaks}
          documents={documents}
          disputes={disputes}
          selectedPelakId={selectedPelakId}
        />
      )}
    </div>
  );
};
