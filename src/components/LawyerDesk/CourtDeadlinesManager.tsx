import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Scale,
  BellRing,
  Filter,
  Check,
  Info,
} from 'lucide-react';
import { LegalDeadline, PelakNode } from '../../types/cadastre';
import {
  calculateProceduralDeadlineDate,
  getDeadlineUrgency,
  getTodayShamsi,
} from '../../utils/legalFormulas';
import { toPersianDigits } from '../../utils/persian';

interface CourtDeadlinesManagerProps {
  deadlines: LegalDeadline[];
  onSaveDeadlines: (updated: LegalDeadline[]) => void;
  pelaks: PelakNode[];
  selectedPelakId?: string;
}

export const CourtDeadlinesManager: React.FC<CourtDeadlinesManagerProps> = ({
  deadlines,
  onSaveDeadlines,
  pelaks,
  selectedPelakId,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'completed'>('active');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form states
  const [title, setTitle] = useState<string>('');
  const [pelakId, setPelakId] = useState<string>(selectedPelakId || (pelaks[0]?.id ?? ''));
  const [deadlineType, setDeadlineType] = useState<LegalDeadline['deadlineType']>('appeal_20d');
  const [sanaNotificationDate, setSanaNotificationDate] = useState<string>(getTodayShamsi());
  const [courtBranch, setCourtBranch] = useState<string>('');
  const [caseNumber, setCaseNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handlePresetSelect = (type: LegalDeadline['deadlineType']) => {
    setDeadlineType(type);
    if (type === 'appeal_20d') {
      setTitle('مهلت تجدیدنظرخواهی نسبت به دادنامه');
    } else if (type === 'supreme_appeal_20d') {
      setTitle('مهلت فرجام‌خواهی در دیوان عالی کشور');
    } else if (type === 'default_judgment_20d') {
      setTitle('مهلت واخواهی نسبت به دادنامه غیابی');
    } else if (type === 'expert_objection_7d') {
      setTitle('مهلت اعتراض به نظریه کارشناسی و تقاضای هیأت');
    } else if (type === 'defect_rectification_10d') {
      setTitle('مهلت رفع نقص دادخواست طبق اخطاریه دفتر دادگاه');
    } else if (type === 'court_hearing') {
      setTitle('موعد حضور در جلسه رسیدگی دادگاه');
    }
  };

  const handleAddDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let daysCount = 20;
    if (deadlineType === 'expert_objection_7d') daysCount = 7;
    if (deadlineType === 'defect_rectification_10d') daysCount = 10;
    if (deadlineType === 'court_hearing' || deadlineType === 'custom') daysCount = 0;

    const calculatedDueDate =
      daysCount > 0
        ? calculateProceduralDeadlineDate(sanaNotificationDate, daysCount)
        : sanaNotificationDate;

    const targetPelak = pelaks.find((p) => p.id === pelakId);

    const newDeadline: LegalDeadline = {
      id: `dl-${Date.now()}`,
      pelakId: pelakId || 'general',
      pelakCode: targetPelak?.code || 'عمومی',
      title: title.trim(),
      deadlineType,
      sanaNotificationDate,
      calculatedDueDate,
      courtBranch: courtBranch.trim() || 'شعبه حقوقی/کیفری',
      caseNumber: caseNumber.trim() || 'کلاسه پرونده',
      notes: notes.trim(),
      isCompleted: false,
      createdAt: getTodayShamsi(),
    };

    onSaveDeadlines([newDeadline, ...deadlines]);
    setShowAddModal(false);
    // Reset form
    setTitle('');
    setNotes('');
    setCourtBranch('');
    setCaseNumber('');
  };

  const handleToggleComplete = (id: string) => {
    const updated = deadlines.map((dl) =>
      dl.id === id ? { ...dl, isCompleted: !dl.isCompleted } : dl
    );
    onSaveDeadlines(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('آیا از حذف این موعد دادرسی اطمینان دارید؟')) {
      const updated = deadlines.filter((dl) => dl.id !== id);
      onSaveDeadlines(updated);
    }
  };

  // Filtered list
  const filteredDeadlines = deadlines.filter((d) => {
    if (filterMode === 'active') return !d.isCompleted;
    if (filterMode === 'completed') return d.isCompleted;
    return true;
  });

  // Urgent active count (< 3 days)
  const urgentCount = deadlines.filter((d) => {
    if (d.isCompleted) return false;
    const urgency = getDeadlineUrgency(d.calculatedDueDate);
    return urgency.status === 'urgent' || urgency.status === 'expired';
  }).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  مدیریت مواعد قانونی و اخطاریه‌های سامانه ثنا
                </h2>
                {urgentCount > 0 && (
                  <span className="text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    {toPersianDigits(urgentCount)} موعد فوری و حیاتی!
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                محاسبه خودکار تاریخ انقضا طبق ماده ۴۴۳ و ۴۴۵ قانون آیین دادرسی مدنی (با حذف روز ابلاغ و اقدام)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Filter Buttons */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterMode('active')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterMode === 'active'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                جاری و در دست اقدام
              </button>
              <button
                onClick={() => setFilterMode('completed')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterMode === 'completed'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                اقدام‌شده / مختومه
              </button>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterMode === 'all'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                همه ({toPersianDigits(deadlines.length)})
              </button>
            </div>

            {/* Add Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>ثبت ابلاغیه / موعد جدید</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statutory Rules Reminder Notice */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            <strong>ماده ۴۴۵ قانون آیین دادرسی مدنی:</strong> «موعدی که ابتدای آن تاریخ ابلاغ یا اعلام است، روز ابلاغ و اعلام و همچنین روز اقدام جزء مدت محسوب نمی‌شود.»
          </span>
        </div>
        <div className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg whitespace-nowrap">
          فرجه تجدیدنظر/فرجام: ۲۰ روز + ۱ روز اقدام
        </div>
      </div>

      {/* Deadlines List */}
      {filteredDeadlines.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-500">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            {filterMode === 'active'
              ? 'هیچ موعد قانونی جاری یا فوری ثبت نشده است'
              : 'موردی در این دسته یافت نشد'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            برای ثبت دادنامه‌های جدید ثنا، اخطاریه‌های رفع نقص، مواعد اعتراض به کارشناسی یا جلسات دادرسی، دکمه «ثبت ابلاغیه / موعد جدید» را بفشارید.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow"
          >
            ثبت اولین موعد دادرسی
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeadlines.map((dl) => {
            const urgency = getDeadlineUrgency(dl.calculatedDueDate);
            const isUrgent = urgency.status === 'urgent' && !dl.isCompleted;
            const isExpired = urgency.status === 'expired' && !dl.isCompleted;
            const isWarning = urgency.status === 'warning' && !dl.isCompleted;

            return (
              <div
                key={dl.id}
                className={`bg-slate-900 rounded-2xl border p-4.5 flex flex-col justify-between transition-all relative overflow-hidden shadow-lg ${
                  dl.isCompleted
                    ? 'border-slate-800/80 opacity-70 bg-slate-950/40'
                    : isExpired
                    ? 'border-rose-600/70 bg-rose-950/20'
                    : isUrgent
                    ? 'border-rose-500/80 bg-gradient-to-b from-rose-950/30 to-slate-900 ring-1 ring-rose-500/40'
                    : isWarning
                    ? 'border-amber-500/60 bg-gradient-to-b from-amber-950/20 to-slate-900'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Urgency Ribbon */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-amber-300">
                      {dl.pelakCode}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {dl.courtBranch}
                    </span>
                  </div>

                  {/* Urgency Badge */}
                  {dl.isCompleted ? (
                    <span className="text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      اقدام شد
                    </span>
                  ) : (
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold ${
                        isExpired
                          ? 'bg-rose-600/30 text-rose-300 border border-rose-500/50'
                          : isUrgent
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {urgency.statusLabel}
                    </span>
                  )}
                </div>

                {/* Title & Notes */}
                <div className="space-y-1.5 mb-4">
                  <h4
                    className={`font-bold text-sm ${
                      dl.isCompleted ? 'line-through text-slate-400' : 'text-white'
                    }`}
                  >
                    {dl.title}
                  </h4>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>کلاسه:</span>
                    <span className="text-slate-200 font-mono">{dl.caseNumber}</span>
                  </div>
                  {dl.notes && (
                    <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 leading-relaxed">
                      {dl.notes}
                    </p>
                  )}
                </div>

                {/* Date Breakdown */}
                <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 text-[11px] space-y-1.5 mb-3">
                  <div className="flex justify-between text-slate-400">
                    <span>تاریخ ابلاغ در ثنا:</span>
                    <span className="text-slate-200 font-mono">
                      {toPersianDigits(dl.sanaNotificationDate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/50">
                    <span className="font-semibold text-amber-400">آخرین مهلت اقدام قانونی:</span>
                    <span className="font-bold text-white font-mono">
                      {toPersianDigits(dl.calculatedDueDate)}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  <button
                    onClick={() => handleToggleComplete(dl.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                      dl.isCompleted
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{dl.isCompleted ? 'بازگردانی به جاری' : 'علامت به عنوان اقدام‌شده'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(dl.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                    title="حذف موعد"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Deadline Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-400" />
                ثبت موعد دادرسی و اخطاریه ثنا
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs bg-slate-800 px-2.5 py-1 rounded-lg"
              >
                بستن
              </button>
            </div>

            <form onSubmit={handleAddDeadline} className="space-y-4 text-xs">
              {/* Presets Quick Pick */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">
                  انتخاب سریع نوع موعد بر اساس قانون آیین دادرسی:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('appeal_20d')}
                    className={`p-2 rounded-xl border text-right transition-colors ${
                      deadlineType === 'appeal_20d'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    ⚖️ تجدیدنظرخواهی (۲۰ روز)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('supreme_appeal_20d')}
                    className={`p-2 rounded-xl border text-right transition-colors ${
                      deadlineType === 'supreme_appeal_20d'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    🏛️ فرجام‌خواهی (۲۰ روز)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('expert_objection_7d')}
                    className={`p-2 rounded-xl border text-right transition-colors ${
                      deadlineType === 'expert_objection_7d'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    📐 اعتراض به کارشناسی (۷ روز)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('defect_rectification_10d')}
                    className={`p-2 rounded-xl border text-right transition-colors ${
                      deadlineType === 'defect_rectification_10d'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    📋 اخطار رفع نقص (۱۰ روز)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('default_judgment_20d')}
                    className={`p-2 rounded-xl border text-right transition-colors ${
                      deadlineType === 'default_judgment_20d'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    📜 واخواهی غیابی (۲۰ روز)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('court_hearing')}
                    className={`p-2 rounded-xl border text-right transition-colors ${
                      deadlineType === 'court_hearing'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    🗓️ جلسه رسیدگی دادگاه
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  عنوان اخطاریه یا موعد:
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: مهلت تجدیدنظرخواهی از دادنامه شعبه ۱۵ حقوقی"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Pelak & Court Branch */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    پرونده / پلاک مربوطه:
                  </label>
                  <select
                    value={pelakId}
                    onChange={(e) => setPelakId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="general">پرونده عمومی</option>
                    {pelaks.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} ({p.title})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    مرجع قضایی / شعبه:
                  </label>
                  <input
                    type="text"
                    value={courtBranch}
                    onChange={(e) => setCourtBranch(e.target.value)}
                    placeholder="مثال: شعبه ۲۴ دادگاه تجدیدنظر"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Sana Date & Case Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    تاریخ ابلاغ در سامانه ثنا:
                  </label>
                  <input
                    type="text"
                    required
                    value={sanaNotificationDate}
                    onChange={(e) => setSanaNotificationDate(e.target.value)}
                    placeholder="1403/08/15"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    شماره کلاسه پرونده:
                  </label>
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    placeholder="مثال: ۹۹۰۲۳۴"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  یادداشت استراتژیک اقدام وکیل:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: ضرورت بررسی اسناد مادر پیش از ثبت لایحه، استعلام از دارایی..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow transition-colors"
                >
                  محاسبه و ثبت موعد در کارتابل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
