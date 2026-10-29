import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import {
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
  Briefcase,
  AlertTriangle,
  ShieldCheck,
  Filter,
  Layers,
  FileText,
  Activity,
} from 'lucide-react';
import { PelakNode, LegalDocument, PelakStatus } from '../types/cadastre';
import { toPersianDigits, getStatusLabel } from '../utils/persian';

interface CaseStatusChartProps {
  pelaks: PelakNode[];
  documents: LegalDocument[];
  onSelectPelakStatus?: (status: string) => void;
  selectedStatus?: string;
}

type ChartViewMode = 'status' | 'domain' | 'docCategory';

const STATUS_COLOR_MAP: Record<string, { color: string; label: string }> = {
  disputed: { color: '#f59e0b', label: 'در حال رسیدگی / متنازع‌فیه' }, // Amber
  valid: { color: '#10b981', label: 'تثبیت‌شده رسمی و معتبر' },      // Emerald
  forged: { color: '#f43f5e', label: 'تعارض‌دار و پرریسک' },         // Rose
  arrested: { color: '#a855f7', label: 'توقیفی / دستور موقت' },      // Purple
  pending: { color: '#0ea5e9', label: 'در جریان رسیدگی ثبتی' },     // Sky
  closed: { color: '#64748b', label: 'مختومه و بایگانی‌شده' },      // Slate
};

const DOMAIN_COLOR_MAP: Record<string, { color: string; label: string }> = {
  real_estate: { color: '#10b981', label: 'اراضی و کاداستر ثبتی' },
  commercial: { color: '#3b82f6', label: 'اسناد تجاری و مالی (چک/سفته)' },
  contracts: { color: '#8b5cf6', label: 'دعاوی قراردادی و مشارکت' },
  criminal: { color: '#ef4444', label: 'کیفری و جرایم مالی' },
  inheritance: { color: '#ec4899', label: 'ارث و امور حسبی' },
  administrative: { color: '#14b8a6', label: 'دیوان عدالت و شهرداری' },
  general: { color: '#6b7280', label: 'سایر پرونده‌ها' },
};

const DOC_CAT_COLOR_MAP: Record<string, { color: string; label: string }> = {
  deed: { color: '#10b981', label: 'سند رسمی مالکیت' },
  verdict: { color: '#f59e0b', label: 'دادنامه و حکم دادگاه' },
  order: { color: '#ef4444', label: 'دستور موقت و توقیف' },
  inquiry: { color: '#0ea5e9', label: 'استعلام ثبتی و اداری' },
  contract: { color: '#8b5cf6', label: 'مبایعه‌نامه و صلح‌نامه' },
  power_of_attorney: { color: '#ec4899', label: 'وکالت‌نامه رسمی' },
  minutes: { color: '#f97316', label: 'صورت‌مجلس تفکیکی' },
  expert_report: { color: '#06b6d4', label: 'نظریه کارشناسی دادگستری' },
};

// Custom Persian Tooltip for Recharts Pie Chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const item = data.payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs z-50 text-right min-w-[170px]">
        <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-800">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: data.fill }}
          />
          <span className="font-bold text-white">{data.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-300">
          <span>تعداد:</span>
          <span className="font-bold text-amber-400 font-mono tabular-nums text-sm">
            {toPersianDigits(data.value)} مورد
          </span>
        </div>
        {item.percentage !== undefined && (
          <div className="flex items-center justify-between gap-4 text-slate-400 mt-1">
            <span>درصد از کل:</span>
            <span className="font-semibold text-emerald-400 font-mono tabular-nums">
              ٪{toPersianDigits(item.percentage)}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const CaseStatusChart: React.FC<CaseStatusChartProps> = ({
  pelaks,
  documents,
  onSelectPelakStatus,
  selectedStatus,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ChartViewMode>('status');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Status Distribution Data
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {
      disputed: 0,
      valid: 0,
      forged: 0,
      arrested: 0,
      pending: 0,
      closed: 0,
    };

    pelaks.forEach((p) => {
      const st = p.status || 'pending';
      counts[st] = (counts[st] || 0) + 1;
    });

    const total = pelaks.length;
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([statusKey, count]) => {
        const meta = STATUS_COLOR_MAP[statusKey] || {
          color: '#94a3b8',
          label: getStatusLabel(statusKey).label,
        };
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '۰';
        return {
          id: statusKey,
          name: meta.label,
          value: count,
          color: meta.color,
          percentage,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [pelaks]);

  // Domain Distribution Data
  const domainChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    pelaks.forEach((p) => {
      const d = p.dossierDomain || (p.isNonLandDossier ? 'general' : 'real_estate');
      counts[d] = (counts[d] || 0) + 1;
    });

    const total = pelaks.length;
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([domainKey, count]) => {
        const meta = DOMAIN_COLOR_MAP[domainKey] || {
          color: '#94a3b8',
          label: domainKey,
        };
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '۰';
        return {
          id: domainKey,
          name: meta.label,
          value: count,
          color: meta.color,
          percentage,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [pelaks]);

  // Document Categories Distribution Data
  const docCategoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach((d) => {
      const cat = d.category || 'minutes';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = documents.length;
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([catKey, count]) => {
        const meta = DOC_CAT_COLOR_MAP[catKey] || {
          color: '#94a3b8',
          label: catKey,
        };
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '۰';
        return {
          id: catKey,
          name: meta.label,
          value: count,
          color: meta.color,
          percentage,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [documents]);

  const activeData =
    viewMode === 'status'
      ? statusChartData
      : viewMode === 'domain'
      ? domainChartData
      : docCategoryChartData;

  const totalCurrent =
    viewMode === 'docCategory' ? documents.length : pelaks.length;

  // High-level portfolio metrics
  const riskCount = pelaks.filter((p) => p.status === 'forged' || p.status === 'disputed').length;
  const validCount = pelaks.filter((p) => p.status === 'valid').length;
  const healthPercent = pelaks.length > 0 ? Math.round((validCount / pelaks.length) * 100) : 100;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm transition-all duration-300">
      {/* Header bar with toggle and title */}
      <div className="px-4 py-3 bg-slate-900 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>داشبورد تحلیلی و توزیع وضعیت پرونده‌ها</span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                نمودار هوشمند Recharts
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              پایش بلادرنگ وضعیت حقوقی، درصد ریسک و تفکیک پرونده‌ها و اسناد
            </p>
          </div>
        </div>

        {/* View mode tabs + Collapse toggle */}
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                تثبیت‌شده: {toPersianDigits(validCount)}
              </span>
              {riskCount > 0 && (
                <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  دارای ریسک/تعارض: {toPersianDigits(riskCount)}
                </span>
              )}
              <span className="text-slate-400 text-[11px]">
                شاخص سلامت: <strong className="text-white font-mono">{toPersianDigits(healthPercent)}٪</strong>
              </span>
            </div>
          )}

          {isExpanded && (
            <div className="bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 flex items-center text-xs">
              <button
                onClick={() => setViewMode('status')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium text-[11px] flex items-center gap-1.5 ${
                  viewMode === 'status'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>وضعیت پرونده</span>
              </button>
              <button
                onClick={() => setViewMode('domain')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium text-[11px] flex items-center gap-1.5 ${
                  viewMode === 'domain'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Briefcase className="w-3 h-3" />
                <span>موضوع دعاوی</span>
              </button>
              <button
                onClick={() => setViewMode('docCategory')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium text-[11px] flex items-center gap-1.5 ${
                  viewMode === 'docCategory'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>دسته‌بندی اسناد</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors text-xs flex items-center gap-1.5 font-medium shadow-sm"
            title={isExpanded ? 'بستن داشبورد نمودار' : 'مشاهده نمودار تحلیلی و آماری'}
          >
            {isExpanded ? (
              <>
                <span className="text-[11px]">بستن نمودار</span>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              </>
            ) : (
              <>
                <span className="text-[11px]">نمودار تحلیلی</span>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content with Pie Chart and Stat Badges */}
      {isExpanded && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Quick Metrics Cards */}
          <div className="md:col-span-3 space-y-2">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>مجموع اقلام بررسی‌شده</span>
                <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1 font-mono tabular-nums">
                {toPersianDigits(totalCurrent)}{' '}
                <span className="text-xs font-normal text-slate-400">
                  {viewMode === 'docCategory' ? 'سند' : 'پرونده'}
                </span>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>پرونده‌های دارای ریسک / تعارض</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-xl font-bold text-rose-400 mt-1 font-mono tabular-nums">
                {toPersianDigits(riskCount)}{' '}
                <span className="text-xs font-normal text-slate-400">مورد نیازمند لایحه</span>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>سلامت اسناد رسمی تثبیت‌شده</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
                  ٪{toPersianDigits(healthPercent)}
                </span>
                <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${healthPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recharts Pie Chart Donut Section */}
          <div className="md:col-span-5 h-64 relative flex items-center justify-center">
            {activeData.length === 0 ? (
              <div className="text-xs text-slate-500 text-center">
                داده‌ای جهت نمایش در این بخش یافت نشد.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={84}
                      paddingAngle={3}
                      stroke="#0f172a"
                      strokeWidth={2}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      onClick={(entry: any) => {
                        const targetId = entry?.id || entry?.payload?.id;
                        if (viewMode === 'status' && onSelectPelakStatus && targetId) {
                          onSelectPelakStatus(targetId);
                        }
                      }}
                      className="cursor-pointer transition-transform"
                    >
                      {activeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {viewMode === 'docCategory' ? 'کل اسناد' : 'کل پرونده‌ها'}
                  </span>
                  <span className="text-xl font-extrabold text-amber-400 font-mono tabular-nums">
                    {toPersianDigits(totalCurrent)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Interactive Legend and Slices breakdown list */}
          <div className="md:col-span-4 max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
            <div className="text-[11px] text-slate-400 font-medium mb-1 flex items-center justify-between pb-1 border-b border-slate-800">
              <span>تفکیک دسته‌ها بر حسب فراوانی:</span>
              {viewMode === 'status' && selectedStatus && (
                <button
                  onClick={() => onSelectPelakStatus && onSelectPelakStatus('all')}
                  className="text-amber-400 hover:underline text-[10px]"
                >
                  حذف فیلتر
                </button>
              )}
            </div>

            {activeData.map((item, index) => {
              const isSelected = viewMode === 'status' && selectedStatus === item.id;
              const isHovered = activeIndex === index;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={() => {
                    if (viewMode === 'status' && onSelectPelakStatus) {
                      onSelectPelakStatus(isSelected ? 'all' : item.id);
                    }
                  }}
                  className={`p-2 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/40'
                      : isHovered
                      ? 'bg-slate-800/80 border-slate-700'
                      : 'bg-slate-950/40 border-slate-800/70 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-200 truncate font-medium text-[11px]">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-left shrink-0">
                    <span className="text-slate-400 font-mono text-[11px] tabular-nums">
                      ٪{toPersianDigits(item.percentage)}
                    </span>
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono font-bold text-xs tabular-nums">
                      {toPersianDigits(item.value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
