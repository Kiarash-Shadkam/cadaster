/**
 * Utility functions for Persian text, numbers, and legal status formatting
 */

export function toPersianDigits(num: number | string): string {
  if (num === undefined || num === null) return '';
  const str = String(num);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[+w]);
}

export function formatArea(areaM2: number): string {
  if (!areaM2) return '۰ متر مربع';
  if (areaM2 >= 10000) {
    const hectares = (areaM2 / 10000).toFixed(1).replace('.0', '');
    return `${toPersianDigits(areaM2.toLocaleString('fa-IR'))} م² (${toPersianDigits(hectares)} هکتار)`;
  }
  return `${toPersianDigits(areaM2.toLocaleString('fa-IR'))} متر مربع`;
}

export function getStatusLabel(status: string): { label: string; bg: string; text: string; border: string } {
  switch (status) {
    case 'valid':
      return {
        label: 'تثبیت‌شده رسمی',
        bg: 'bg-emerald-950/60',
        text: 'text-emerald-400',
        border: 'border-emerald-700/50',
      };
    case 'forged':
      return {
        label: 'سند مجعول / فروش مال غیر',
        bg: 'bg-red-950/70',
        text: 'text-red-400',
        border: 'border-red-700/60',
      };
    case 'arrested':
      return {
        label: 'توقیفی / دستور موقت',
        bg: 'bg-purple-950/60',
        text: 'text-purple-400',
        border: 'border-purple-700/50',
      };
    case 'disputed':
      return {
        label: 'متنازع‌فیه / دارای معارض',
        bg: 'bg-amber-950/60',
        text: 'text-amber-400',
        border: 'border-amber-700/50',
      };
    case 'pending':
    default:
      return {
        label: 'در جریان رسیدگی ثبتی',
        bg: 'bg-sky-950/60',
        text: 'text-sky-400',
        border: 'border-sky-700/50',
      };
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'deed':
      return 'سند مالکیت رسمی';
    case 'verdict':
      return 'دادنامه و حکم دادگاه';
    case 'order':
      return 'دستور موقت و قرار توقیف';
    case 'inquiry':
      return 'استعلام ثبتی و دولتی';
    case 'contract':
      return 'مبایعه‌نامه و صلح‌نامه';
    case 'power_of_attorney':
      return 'وکالت‌نامه بلاعزل رسمی';
    case 'minutes':
      return 'صورت‌مجلس و دست‌نوشته';
    case 'expert_report':
      return 'نظریه کارشناسی دادگستری';
    default:
      return 'مدرک پرونده';
  }
}

export function getDomainMeta(domain?: string): { label: string; bg: string; text: string; border: string; iconType: string } {
  switch (domain) {
    case 'commercial':
      return {
        label: 'تجاری و اسناد مالی (چک و سفته)',
        bg: 'bg-blue-950/60',
        text: 'text-blue-400',
        border: 'border-blue-700/50',
        iconType: 'commercial',
      };
    case 'contracts':
      return {
        label: 'دعاوی قراردادی و مشارکت',
        bg: 'bg-indigo-950/60',
        text: 'text-indigo-400',
        border: 'border-indigo-700/50',
        iconType: 'contracts',
      };
    case 'criminal':
      return {
        label: 'پرونده‌های کیفری و جرایم',
        bg: 'bg-rose-950/60',
        text: 'text-rose-400',
        border: 'border-rose-700/50',
        iconType: 'criminal',
      };
    case 'inheritance':
      return {
        label: 'امور حسبی، انحصار وراثت و ترکه',
        bg: 'bg-teal-950/60',
        text: 'text-teal-400',
        border: 'border-teal-700/50',
        iconType: 'inheritance',
      };
    case 'administrative':
      return {
        label: 'دیوان عدالت اداری و شهرداری',
        bg: 'bg-amber-950/60',
        text: 'text-amber-400',
        border: 'border-amber-700/50',
        iconType: 'administrative',
      };
    case 'real_estate':
      return {
        label: 'اراضی و کاداستر ثبتی',
        bg: 'bg-emerald-950/60',
        text: 'text-emerald-400',
        border: 'border-emerald-700/50',
        iconType: 'real_estate',
      };
    case 'general':
    default:
      return {
        label: 'دعاوی حقوقی عمومی',
        bg: 'bg-slate-900',
        text: 'text-slate-300',
        border: 'border-slate-700',
        iconType: 'general',
      };
  }
}

export function getWorkflowStageLabel(stage?: string): { label: string; color: string } {
  switch (stage) {
    case 'filing':
      return { label: 'ثبت دادخواست / شکواییه', color: 'text-sky-400' };
    case 'hearing':
      return { label: 'وقت رسیدگی و جلسه دادگاه', color: 'text-amber-400' };
    case 'expert':
      return { label: 'ارجاع به کارشناسی دادگستری', color: 'text-indigo-400' };
    case 'verdict':
      return { label: 'صدور دادنامه بدوی', color: 'text-emerald-400' };
    case 'appeal':
      return { label: 'رسیدگی تجدیدنظر / فرجام‌خواهی', color: 'text-purple-400' };
    case 'execution':
      return { label: 'صدور اجراییه و وصول محکوم‌به', color: 'text-teal-400' };
    case 'dispute':
      return { label: 'اخطار تعارض / جرم جعل', color: 'text-rose-400' };
    default:
      return { label: 'مرحله قضایی', color: 'text-slate-300' };
  }
}

