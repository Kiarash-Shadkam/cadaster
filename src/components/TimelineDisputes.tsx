import React, { useState } from 'react';
import {
  History,
  AlertOctagon,
  Scale,
  Gavel,
  ShieldCheck,
  Calendar,
  Building,
  ArrowRight,
  FileText,
  UserCheck,
  Sparkles,
  Briefcase,
  CheckCircle2,
  Clock,
  ChevronRight,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { TimelineItem, DisputeAlert, PelakNode } from '../types/cadastre';
import { toPersianDigits } from '../utils/persian';

interface TimelineDisputesProps {
  timeline: TimelineItem[];
  disputes: DisputeAlert[];
  pelaks: PelakNode[];
  selectedPelakId: string;
  onSelectPelak: (id: string) => void;
  onOpenChatWithTopic: (topic: string) => void;
  onGoToScanner?: () => void;
}

export const TimelineDisputes: React.FC<TimelineDisputesProps> = ({
  timeline,
  disputes,
  pelaks,
  selectedPelakId,
  onSelectPelak,
  onOpenChatWithTopic,
  onGoToScanner,
}) => {
  const [filterPelakId, setFilterPelakId] = useState<string>(selectedPelakId || 'all');
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'timeline' | 'workflow'>('timeline');

  React.useEffect(() => {
    if (selectedPelakId) {
      setFilterPelakId(selectedPelakId);
    }
  }, [selectedPelakId]);

  const selectedDossier = pelaks.find((p) => p.id === filterPelakId);

  const filteredTimeline = timeline.filter((item) => {
    if (filterPelakId === 'all') return true;
    return item.pelakId === filterPelakId;
  });

  const filteredDisputes = disputes.filter((disp) => {
    if (filterPelakId === 'all') return true;
    return disp.pelakId === filterPelakId;
  });

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'court':
        return <Gavel className="w-4 h-4 text-emerald-400" />;
      case 'dispute':
        return <AlertOctagon className="w-4 h-4 text-rose-400" />;
      case 'action':
        return <UserCheck className="w-4 h-4 text-amber-400" />;
      case 'deed':
        return <ShieldCheck className="w-4 h-4 text-sky-400" />;
      case 'inquiry':
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  // Standard procedural litigation phases for cases without conflict/forgery
  const getProceduralWorkflowSteps = (dossier?: PelakNode) => {
    const isCommercial = dossier?.dossierDomain === 'commercial';
    const isCriminal = dossier?.dossierDomain === 'criminal';
    const isContracts = dossier?.dossierDomain === 'contracts';

    if (isCriminal) {
      return [
        {
          step: 1,
          title: 'طرح شکایت کیفری در دادسرا و ثبت در ثنا',
          status: 'completed',
          desc: 'تنظیم شکواییه با اختیارات تام و تعیین دقیق عنوان مجرمانه و انتساب بزه.',
        },
        {
          step: 2,
          title: 'تحقیقات مقدماتی و ارجاع به ضابطین قضایی / پلیس آگاهی',
          status: 'completed',
          desc: 'جمع‌آوری ادله، استماع اظهارات شاکی و اخذ دفاعیات متهم.',
        },
        {
          step: 3,
          title: 'صدور قرار جلب به دادرسی و کیفرخواست توسط دادستان',
          status: 'in_progress',
          desc: 'ارسال پرونده به دادگاه کیفری دو یا یک جهت رسیدگی ماهوی.',
        },
        {
          step: 4,
          title: 'جلسه رسیدگی دادگاه کیفری و صدور دادنامه محکومیت',
          status: 'pending',
          desc: 'حضور وکیل در جلسه رسیدگی، ارائه لایحه تکمیلی و اخذ حکم رد مال و مجازات.',
        },
        {
          step: 5,
          title: 'اجرای احکام کیفری و وصول رد مال و خسارات وارده به موکل',
          status: 'pending',
          desc: 'پیگیری پرونده در اجرای احکام کیفری دادسرا و توقیف اموال محکوم‌علیه.',
        },
      ];
    }

    if (isCommercial) {
      return [
        {
          step: 1,
          title: 'اخذ گواهی عدم پرداخت چک از بانک و ثبت دادخواست',
          status: 'completed',
          desc: 'ثبت دادخواست مطالبه وجه چک یا درخواست صدور اجراییه مستقیم طبق ماده ۲۳ قانون صدور چک.',
        },
        {
          step: 2,
          title: 'تأمین خواسته و توقیف فوری حساب‌ها و اموال صادرکننده',
          status: 'completed',
          desc: 'توقیف پلاک‌های ثبتی، حساب‌های بانکی و مطالبات شخص از طریق سامانه سیاق.',
        },
        {
          step: 3,
          title: 'ابلاغ اجراییه / تشکیل جلسه دادرسی و دفاع در برابر ادعاهای واهی',
          status: 'in_progress',
          desc: 'پاسخ به ادعاهای امانی بودن چک یا تضمینی بودن و اثبات دین مسلم.',
        },
        {
          step: 4,
          title: 'قطعیت حکم و محاسبه خسارت تاخیر تادیه بر اساس شاخص بانک مرکزی',
          status: 'pending',
          desc: 'محاسبه خسارات تا زمان وصول کامل اصل و فرع طلب موکل.',
        },
        {
          step: 5,
          title: 'مزایده اموال توقیف‌شده و تادیه طلب موکل',
          status: 'pending',
          desc: 'برگزاری مزایده از طریق سامانه ستاد ایران و تادیه کامل به حساب موکل.',
        },
      ];
    }

    // Default Civil / Real Estate workflow
    return [
      {
        step: 1,
        title: 'ثبت دادخواست بدوی و استناد به مستندات و احکام ثبتی',
        status: 'completed',
        desc: 'تنظیم دقیق خواسته (ابطال سند، خلع ید، الزام به تنظیم سند، تحویل مبیع) و الصاق وکالت‌نامه.',
      },
      {
        step: 2,
        title: 'دستور موقت منع نقل و انتقال و توقیف پلاک در ثبت',
        status: 'completed',
        desc: 'ثبت دستور موقت در سامانه جامع ثبت اسناد و املاک جهت جلوگیری از فروش مال غیر.',
      },
      {
        step: 3,
        title: 'ارجاع به کارشناس رسمی دادگستری (ثبتی و خط‌شناسی)',
        status: 'in_progress',
        desc: 'تطبیق حدود ثبتی با نقشه کاداستر UTM و بررسی اصالت امضاهای اسناد عادی.',
      },
      {
        step: 4,
        title: 'صدور دادنامه بدوی و تجدیدنظرخواهی در مهلت ۲۰ روزه',
        status: 'pending',
        desc: 'پیگیری پرونده در دادگاه تجدیدنظر استان و تحصیل دادنامه قطعی به نفع موکل.',
      },
      {
        step: 5,
        title: 'صدور اجراییه، ابطال سند معارض و صدور سند تک‌برگی جدید',
        status: 'pending',
        desc: 'اعلام دادگاه به اداره ثبت جهت اصلاح دفاتر املاک و صدور سند رسمی کاداستری به نام موکل.',
      },
    ];
  };

  const workflowSteps = getProceduralWorkflowSteps(selectedDossier);

  if (timeline.length === 0 && disputes.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
          <History className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white mb-1">
            خط زمانی قضایی و گردشکار پرونده‌ها در انتظار اسناد واقعی
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            به محض اینکه دادنامه‌ها، قراردادها، اسناد ملکی یا اوراق تجاری واقعی توسط شما اسکن شوند، خط سیر تاریخی، توالی اقدامات قانونی و گردشکار دادرسی به طور خودکار ترسیم خواهد شد.
          </p>
        </div>
        {onGoToScanner && (
          <button
            onClick={onGoToScanner}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            اسکن اولین مدرک یا دادنامه
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner and Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            سیر زمانی قضایی، گردشکار دادرسی و تحلیل پرونده‌ها
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            توالی دادنامه‌ها، مهلت‌های قانونی، تحلیل تعارضات یا مراحل دادرسی استخراج‌شده از اسناد
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pelaks.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">فیلتر پرونده:</span>
              <select
                value={filterPelakId}
                onChange={(e) => setFilterPelakId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 max-w-[220px] truncate"
              >
                <option value="all">تمام پرونده‌ها و پلاک‌ها</option>
                {pelaks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.isNonLandDossier ? `📁 ${p.title}` : `🗺️ پلاک ${p.code} - ${p.title}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle between Timeline & Procedural Workflow */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setActiveWorkflowTab('timeline')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeWorkflowTab === 'timeline'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              رویدادهای تاریخی
            </button>
            <button
              onClick={() => setActiveWorkflowTab('workflow')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeWorkflowTab === 'workflow'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              گردشکار دادرسی پرونده
            </button>
          </div>
        </div>
      </div>

      {/* Mode A: Procedural Workflow View (Especially useful for non-conflict cases like commercial, criminal, contracts) */}
      {activeWorkflowTab === 'workflow' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-sky-400" />
                مراحل دادرسی، گردشکار اجرایی و اقدامات آینده وکیل
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedDossier
                  ? `گردشکار تخصصی مربوط به «${selectedDossier.title}» (${selectedDossier.code})`
                  : 'گردشکار استاندارد دادرسی و پیگیری احکام قضایی'}
              </p>
            </div>

            <button
              onClick={() =>
                onOpenChatWithTopic(
                  selectedDossier
                    ? `در پرونده «${selectedDossier.title}» با کد «${selectedDossier.code}»، گام بعدی و لایحه لازم برای پیشبرد دعوا چیست؟`
                    : 'استراتژی حقوقی و گام بعدی وکیل در این پرونده را تحلیل فرمایید.'
                )
              }
              className="text-xs text-amber-400 hover:text-amber-300 bg-amber-950/70 border border-amber-800/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              مشاوره گام بعدی با ایجنت وکیل
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
            {workflowSteps.map((step) => (
              <div
                key={step.step}
                className={`p-3 rounded-xl border flex flex-col justify-between ${
                  step.status === 'completed'
                    ? 'bg-emerald-950/20 border-emerald-800/40'
                    : step.status === 'in_progress'
                    ? 'bg-amber-950/30 border-amber-500/50 shadow-sm shadow-amber-500/10'
                    : 'bg-slate-950/40 border-slate-800/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      مرحله {toPersianDigits(step.step)}
                    </span>
                    {step.status === 'completed' && (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded">
                        انجام‌شده
                      </span>
                    )}
                    {step.status === 'in_progress' && (
                      <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700/60 px-1.5 py-0.5 rounded font-bold">
                        در جریان رسیدگی
                      </span>
                    )}
                    {step.status === 'pending' && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                        گام آینده
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-white mb-1.5 leading-snug">
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Disputes & Conflicting Deeds (If Any Exist) */}
      {filteredDisputes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              پرونده‌های تعارض، جعل، یا معامله معارض ({toPersianDigits(filteredDisputes.length)})
            </h3>
            <span className="text-xs text-slate-400">تحلیل حقوقی و استراتژی دفاعی وکیل</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDisputes.map((dispute) => (
              <div
                key={dispute.id}
                className="bg-slate-900 border border-rose-900/40 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-700" />

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded">
                        {dispute.pelakCode}
                      </span>
                      <span className="text-xs text-slate-300 font-medium">{dispute.disputeType}</span>
                    </div>
                    <span className="text-[11px] bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">
                      {dispute.legalStatus}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white mb-2">{dispute.title}</h4>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">مرجع رسیدگی:</span>
                      <span className="text-slate-200">{dispute.courtBranch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">کلاسه / شماره دادنامه:</span>
                      <span className="text-slate-200 font-mono">{dispute.caseNumber}</span>
                    </div>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-xs text-amber-200 mb-3">
                    <strong className="text-amber-400 block mb-1">اقدام و استراتژی وکیل تام‌الاختیار:</strong>
                    <p className="leading-relaxed">{dispute.strategyNote}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => onSelectPelak(dispute.pelakId)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    مشاهده پرونده
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                  <button
                    onClick={() =>
                      onOpenChatWithTopic(
                        `در مورد پرونده ${dispute.disputeType} (${dispute.title}) چه اقدام حقوقی تکمیلی برای احقاق حق موکل باید انجام دهیم؟`
                      )
                    }
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800/60 transition-colors"
                  >
                    مشاوره تخصصی چت‌بات
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chronological Vertical Timeline */}
      {filteredTimeline.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            توالی زمانی دادنامه‌ها، احکام قضایی، قراردادها و رویدادهای استخراج‌شده
          </h3>

          <div className="relative border-r-2 border-slate-800 mr-4 space-y-6">
            {filteredTimeline.map((item) => (
              <div key={item.id} className="relative pr-6 group">
                <div
                  className={`absolute -right-[11px] top-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                    item.isKeyMilestone
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {getTimelineIcon(item.type)}
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5 pb-1.5 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {toPersianDigits(item.date)}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-xs bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded">
                        {item.pelakCode}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-500" />
                      {item.authority}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
