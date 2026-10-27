import React, { useState } from 'react';
import {
  Coins,
  Calculator,
  Receipt,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  FileCheck,
} from 'lucide-react';
import { FeeRecord, FeePayment, PelakNode } from '../../types/cadastre';
import { calculateBarTariff, getTodayShamsi } from '../../utils/legalFormulas';
import { toPersianDigits } from '../../utils/persian';

interface LegalFeeCalculatorProps {
  feeRecords: FeeRecord[];
  onSaveFeeRecords: (records: FeeRecord[]) => void;
  pelaks: PelakNode[];
  selectedPelakId?: string;
}

export const LegalFeeCalculator: React.FC<LegalFeeCalculatorProps> = ({
  feeRecords,
  onSaveFeeRecords,
  pelaks,
  selectedPelakId,
}) => {
  // Calculator Sandbox States
  const [claimAmountInput, setClaimAmountInput] = useState<number>(500_000_000); // 500 million tomans default
  const [agreedFeeInput, setAgreedFeeInput] = useState<number>(0);

  // Active view: 'calculator' | 'ledger'
  const [activeSubView, setActiveSubView] = useState<'calculator' | 'ledger'>('calculator');

  // Modal for new fee contract
  const [showAddRecordModal, setShowAddRecordModal] = useState<boolean>(false);
  const [targetPelakId, setTargetPelakId] = useState<string>(selectedPelakId || (pelaks[0]?.id ?? ''));
  const [clientName, setClientName] = useState<string>('');
  const [caseSubject, setCaseSubject] = useState<string>('');
  const [claimAmountTomans, setClaimAmountTomans] = useState<number>(0);
  const [agreedFeeTomans, setAgreedFeeTomans] = useState<number>(0);
  const [stage, setStage] = useState<FeeRecord['stage']>('badvi');
  const [notes, setNotes] = useState<string>('');

  // Modal for new payment installment
  const [selectedRecordForPayment, setSelectedRecordForPayment] = useState<FeeRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<FeePayment['method']>('کارت‌به‌کارت');
  const [paymentDescription, setPaymentDescription] = useState<string>('قسط اول حق‌الوکاله');

  // Interactive calculations
  const tariffCalc = calculateBarTariff(claimAmountInput, agreedFeeInput > 0 ? agreedFeeInput : undefined);

  // Aggregate totals from fee records
  const totalAgreedAll = feeRecords.reduce((sum, r) => sum + r.agreedFeeTomans, 0);
  const totalReceivedAll = feeRecords.reduce(
    (sum, r) => sum + r.payments.reduce((pSum, p) => pSum + p.amountTomans, 0),
    0
  );
  const totalRemainingAll = Math.max(0, totalAgreedAll - totalReceivedAll);
  const totalTaxStampAll = feeRecords.reduce((sum, r) => sum + r.taxStampDutyTomans, 0);

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseSubject.trim() || agreedFeeTomans <= 0) return;

    const calc = calculateBarTariff(claimAmountTomans, agreedFeeTomans);
    const targetPelak = pelaks.find((p) => p.id === targetPelakId);

    const newRecord: FeeRecord = {
      id: `fee-${Date.now()}`,
      pelakId: targetPelakId || 'general',
      pelakCode: targetPelak?.code || 'عمومی',
      clientName: clientName.trim() || targetPelak?.ownerName || 'موکل محترم',
      caseSubject: caseSubject.trim(),
      claimAmountTomans,
      agreedFeeTomans,
      stage,
      taxStampDutyTomans: calc.taxStampDutyTomans,
      supportFundTomans: calc.supportFundTomans,
      barShareTomans: calc.barShareTomans,
      payments: [],
      notes: notes.trim(),
      createdAt: getTodayShamsi(),
    };

    onSaveFeeRecords([newRecord, ...feeRecords]);
    setShowAddRecordModal(false);
    // Reset
    setCaseSubject('');
    setClaimAmountTomans(0);
    setAgreedFeeTomans(0);
    setNotes('');
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForPayment || paymentAmount <= 0) return;

    const newPayment: FeePayment = {
      id: `pay-${Date.now()}`,
      date: getTodayShamsi(),
      amountTomans: paymentAmount,
      description: paymentDescription,
      method: paymentMethod,
    };

    const updatedRecords = feeRecords.map((r) =>
      r.id === selectedRecordForPayment.id
        ? { ...r, payments: [newPayment, ...r.payments] }
        : r
    );

    onSaveFeeRecords(updatedRecords);
    setSelectedRecordForPayment(null);
    setPaymentAmount(0);
  };

  const handleDeleteRecord = (id: string) => {
    if (confirm('آیا از حذف این پرونده مالی اطمینان دارید؟')) {
      onSaveFeeRecords(feeRecords.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                حسابداری حق‌الوکاله و تمبر مالیاتی ماده ۱۰۳
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                  Article 103 Tax & Fee Ledger
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                محاسبه خودکار تعرفه حق‌الوکاله مصوب، سهم ۵٪ تمبر علی‌الحساب ماده ۱۰۳ ق.م.م، ۲.۵٪ صندوق حمایت و ۱٪ کانون وکلا
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Switcher */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveSubView('calculator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  activeSubView === 'calculator'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                ماشین‌حساب تعرفه و تمبر
              </button>
              <button
                onClick={() => setActiveSubView('ledger')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  activeSubView === 'ledger'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                دفترچه مالی و اقساط ({toPersianDigits(feeRecords.length)})
              </button>
            </div>

            <button
              onClick={() => setShowAddRecordModal(true)}
              className="flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>ثبت پرونده مالی جدید</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-slate-400 text-[11px] mb-1">مجموع قراردادهای وکالت:</div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {toPersianDigits(totalAgreedAll.toLocaleString('fa-IR'))}{' '}
            <span className="text-xs text-slate-400 font-normal">تومان</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-slate-400 text-[11px] mb-1 text-emerald-400">مجموع دریافتی‌های وکیل:</div>
          <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
            {toPersianDigits(totalReceivedAll.toLocaleString('fa-IR'))}{' '}
            <span className="text-xs text-slate-400 font-normal">تومان</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-slate-400 text-[11px] mb-1 text-amber-400">مانده طلب از موکلین:</div>
          <div className="text-base sm:text-lg font-bold text-amber-400 font-mono">
            {toPersianDigits(totalRemainingAll.toLocaleString('fa-IR'))}{' '}
            <span className="text-xs text-slate-400 font-normal">تومان</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-slate-400 text-[11px] mb-1 text-sky-400">کل تمبر مالیاتی پرداختی (۵٪):</div>
          <div className="text-base sm:text-lg font-bold text-sky-400 font-mono">
            {toPersianDigits(totalTaxStampAll.toLocaleString('fa-IR'))}{' '}
            <span className="text-xs text-slate-400 font-normal">تومان</span>
          </div>
        </div>
      </div>

      {/* View 1: Interactive Tariff Calculator Sandbox */}
      {activeSubView === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Inputs Card */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Calculator className="w-4 h-4 text-amber-400" />
              ورود مقادیر بهای خواسته و قرارداد
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                بهای خواسته یا ارزش ملک مورد ترافع (به تومان):
              </label>
              <input
                type="number"
                min="0"
                step="1000000"
                value={claimAmountInput || ''}
                onChange={(e) => setClaimAmountInput(Number(e.target.value))}
                placeholder="مثال: ۵۰۰۰۰۰۰۰۰ (۵۰ میلیون تومان)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500 text-sm"
              />
              <div className="text-[11px] text-slate-500 mt-1">
                معادل: {toPersianDigits((claimAmountInput || 0).toLocaleString('fa-IR'))} تومان
              </div>
            </div>

            {/* Quick Presets for Claim Amount */}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {[
                { label: '۵۰ م تومان', val: 50_000_000 },
                { label: '۲۰۰ م تومان', val: 200_000_000 },
                { label: '۵۰۰ م تومان', val: 500_000_000 },
                { label: '۱ میلیارد تومان', val: 1_000_000_000 },
                { label: '۵ میلیارد تومان', val: 5_000_000_000 },
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setClaimAmountInput(p.val)}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-lg transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                حق‌الوکاله توافقی (اختیاری - در صورت توافق خاص با موکل):
              </label>
              <input
                type="number"
                min="0"
                step="1000000"
                value={agreedFeeInput || ''}
                onChange={(e) => setAgreedFeeInput(Number(e.target.value))}
                placeholder="در صورت خالی بودن، تعرفه مصوب مبنا قرار می‌گیرد"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500 text-sm"
              />
              {agreedFeeInput > 0 && (
                <div className="text-[11px] text-amber-400/90 mt-1">
                  حق‌الوکاله توافقی: {toPersianDigits(agreedFeeInput.toLocaleString('fa-IR'))} تومان
                </div>
              )}
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
              <div className="text-white font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                آیین‌نامه تعرفه حق‌الوکاله وکلای دادگستری:
              </div>
              <div>• تا ۵۰ م تومان: ۸٪</div>
              <div>• از ۵۰ تا ۲۰۰ م تومان: ۷٪ مازاد</div>
              <div>• از ۲۰۰ تا ۱ میلیارد: ۵٪ مازاد</div>
              <div>• از ۱ تا ۳ میلیارد: ۴٪ مازاد | بیش از ۳ میلیارد: ۳٪</div>
            </div>
          </div>

          {/* Outputs Card */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Receipt className="w-4 h-4 text-emerald-400" />
              تفکیک قانونی حق‌الوکاله و کسورات مصرح
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Tariff Total */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <div className="text-slate-400 text-[11px] mb-1">
                  {agreedFeeInput > 0 ? 'حق‌الوکاله توافقی کل:' : 'حق‌الوکاله طبق تعرفه قانونی:'}
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {toPersianDigits(
                    (agreedFeeInput > 0
                      ? agreedFeeInput
                      : tariffCalc.recommendedFeeTomans
                    ).toLocaleString('fa-IR')
                  )}{' '}
                  تومان
                </div>
              </div>

              {/* Net Attorney Fee */}
              <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-xl p-3.5">
                <div className="text-emerald-400 text-[11px] mb-1 font-semibold">
                  خالص سهم وکیل (پس از کسر مالیات و صندوق):
                </div>
                <div className="text-base font-bold text-emerald-300 font-mono">
                  {toPersianDigits(tariffCalc.netAttorneyFeeTomans.toLocaleString('fa-IR'))} تومان
                </div>
              </div>

              {/* Stage breakdown */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <div className="text-slate-400 text-[11px] font-semibold">
                  تفکیک مراحل دادرسی (ماده ۳ تعرفه):
                </div>
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>مرحله بدوی (۶۰٪):</span>
                  <span className="font-mono text-white">
                    {toPersianDigits(tariffCalc.badviFeeTomans.toLocaleString('fa-IR'))} ت
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>مرحله تجدیدنظر (۴۰٪):</span>
                  <span className="font-mono text-white">
                    {toPersianDigits(tariffCalc.tajdidFeeTomans.toLocaleString('fa-IR'))} ت
                  </span>
                </div>
              </div>

              {/* Statutory Deductions */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <div className="text-slate-400 text-[11px] font-semibold">
                  کسورات و تمبرهای قانونی:
                </div>
                <div className="flex justify-between text-sky-300 text-[11px]">
                  <span>تمبر مالیاتی ماده ۱۰۳ (۵٪):</span>
                  <span className="font-mono font-bold">
                    {toPersianDigits(tariffCalc.taxStampDutyTomans.toLocaleString('fa-IR'))} ت
                  </span>
                </div>
                <div className="flex justify-between text-amber-300 text-[11px]">
                  <span>سهم صندوق حمایت (۲.۵٪):</span>
                  <span className="font-mono">
                    {toPersianDigits(tariffCalc.supportFundTomans.toLocaleString('fa-IR'))} ت
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>سهم کانون وکلا (۱٪):</span>
                  <span className="font-mono">
                    {toPersianDigits(tariffCalc.barShareTomans.toLocaleString('fa-IR'))} ت
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setAgreedFeeTomans(agreedFeeInput > 0 ? agreedFeeInput : tariffCalc.recommendedFeeTomans);
                  setClaimAmountTomans(claimAmountInput);
                  setShowAddRecordModal(true);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-500 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت این محاسبه به عنوان پرونده قرارداد مالی وکیل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Ledger & Installments Tracker */}
      {activeSubView === 'ledger' && (
        <div className="space-y-4">
          {feeRecords.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <h4 className="font-bold text-white text-sm">هیچ پرونده مالی ثبت نگردیده است</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                برای ثبت حق‌الوکاله‌ها، رهگیری پرداخت اقساط موکلین و ابطال تمبر مالیاتی ماده ۱۰۳، پرونده مالی ثبت فرمایید.
              </p>
              <button
                onClick={() => setShowAddRecordModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow"
              >
                ثبت اولین پرونده مالی
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {feeRecords.map((record) => {
                const totalPaid = record.payments.reduce((sum, p) => sum + p.amountTomans, 0);
                const remaining = Math.max(0, record.agreedFeeTomans - totalPaid);
                const isFullyPaid = remaining === 0;

                return (
                  <div
                    key={record.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold bg-slate-800 px-2 py-0.5 rounded text-amber-400">
                            {record.pelakCode}
                          </span>
                          <h4 className="font-bold text-white text-sm">{record.caseSubject}</h4>
                          <span className="text-[11px] text-slate-400">
                            (موکل: {record.clientName})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                          <span>
                            بهای خواسته: {toPersianDigits(record.claimAmountTomans.toLocaleString('fa-IR'))} تومان
                          </span>
                          <span>·</span>
                          <span className="text-sky-400">
                            تمبر ماده ۱۰۳: {toPersianDigits(record.taxStampDutyTomans.toLocaleString('fa-IR'))} تومان
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isFullyPaid ? (
                          <span className="text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            تسویه کامل
                          </span>
                        ) : (
                          <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            مانده: {toPersianDigits(remaining.toLocaleString('fa-IR'))} تومان
                          </span>
                        )}

                        <button
                          onClick={() => setSelectedRecordForPayment(record)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors"
                        >
                          + ثبت قسط
                        </button>

                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                          title="حذف پرونده مالی"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Financial Summary Line */}
                    <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-400 text-[11px]">حق‌الوکاله کل:</span>
                        <div className="font-bold text-white font-mono">
                          {toPersianDigits(record.agreedFeeTomans.toLocaleString('fa-IR'))} ت
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px]">مجموع دریافتی:</span>
                        <div className="font-bold text-emerald-400 font-mono">
                          {toPersianDigits(totalPaid.toLocaleString('fa-IR'))} ت
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px]">مانده طلب:</span>
                        <div className="font-bold text-amber-400 font-mono">
                          {toPersianDigits(remaining.toLocaleString('fa-IR'))} ت
                        </div>
                      </div>
                    </div>

                    {/* Payment History Sub-list */}
                    {record.payments.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold text-slate-400">تاریخچه اقساط و واریزی‌ها:</div>
                        <div className="space-y-1">
                          {record.payments.map((p) => (
                            <div
                              key={p.id}
                              className="bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px]"
                            >
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-3 h-3 text-emerald-400" />
                                <span className="font-semibold text-slate-200">{p.description}</span>
                                <span className="text-slate-500 font-mono">({toPersianDigits(p.date)})</span>
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                                  {p.method}
                                </span>
                              </div>
                              <div className="font-mono font-bold text-emerald-400">
                                {toPersianDigits(p.amountTomans.toLocaleString('fa-IR'))} تومان
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add New Fee Record */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                ثبت پرونده مالی و حق‌الوکاله
              </h3>
              <button
                onClick={() => setShowAddRecordModal(false)}
                className="text-slate-400 hover:text-white text-xs bg-slate-800 px-2.5 py-1 rounded-lg"
              >
                بستن
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">پرونده یا پلاک ثبتی:</label>
                <select
                  value={targetPelakId}
                  onChange={(e) => setTargetPelakId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="general">پرونده عمومی</option>
                  {pelaks.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">نام موکل:</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="نام و نام خانوادگی موکل"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">موضوع دعوا / قرارداد:</label>
                <input
                  type="text"
                  required
                  value={caseSubject}
                  onChange={(e) => setCaseSubject(e.target.value)}
                  placeholder="مثال: دعوای ابطال سند رسمی پلاک ۶۸ و خلع ید"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">بهای خواسته (تومان):</label>
                  <input
                    type="number"
                    value={claimAmountTomans || ''}
                    onChange={(e) => setClaimAmountTomans(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">حق‌الوکاله توافقی (تومان):</label>
                  <input
                    type="number"
                    required
                    value={agreedFeeTomans || ''}
                    onChange={(e) => setAgreedFeeTomans(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">مرحله دادرسی:</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="badvi">مرحله بدوی (نخستین)</option>
                  <option value="tajdid">مرحله تجدیدنظر</option>
                  <option value="farjam">فرجام‌خواهی در دیوان عالی</option>
                  <option value="ejra">اجرای احکام مدنی</option>
                  <option value="all_inclusive">جامع کلیه مراحل تا صدور و اجرای حکم</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">یادداشت و توافقات پرداخت:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="شرح اقساط و موعدها..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow"
                >
                  ذخیره پرونده مالی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Payment Installment */}
      {selectedRecordForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                ثبت قسط حق‌الوکاله
              </h3>
              <button
                onClick={() => setSelectedRecordForPayment(null)}
                className="text-slate-400 text-xs bg-slate-800 px-2 py-0.5 rounded"
              >
                بستن
              </button>
            </div>

            <div className="text-[11px] text-slate-400">
              پرونده: <span className="text-white font-bold">{selectedRecordForPayment.caseSubject}</span>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">مبلغ واریزی (به تومان):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  placeholder="مثال: ۵۰۰۰۰۰۰۰"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">روش دریافت:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="کارت‌به‌کارت">کارت‌به‌کارت</option>
                  <option value="شبا/پایا">حواله پایا / ساتنا (شبا)</option>
                  <option value="چک">چک صیادی</option>
                  <option value="نقدی">وجه نقد</option>
                  <option value="پوز دفتر">دستگاه پوز دفتر وکالت</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">بابت / شرح واریز:</label>
                <input
                  type="text"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  placeholder="مثال: پیش‌پرداخت تنظیم دادخواست"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForPayment(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow"
                >
                  تأیید و ثبت دریافتی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
