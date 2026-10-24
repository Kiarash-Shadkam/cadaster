import { PelakNode, LegalDocument, DisputeAlert, TimelineItem } from '../types/cadastre';

/**
 * Clean Slate Initial Cadastre Database
 * تمامی پلاک‌ها، اسناد و دادنامه‌ها منحصراً توسط کاربر اصلی (وکیل) از طریق
 * اسکن مدارک واقعی یا ورود دستی اضافه شده و هیچ نام یا شماره غیرواقعی از پیش بارگذاری نمی‌شود.
 */

export const INITIAL_PELAKS: PelakNode[] = [];
export const INITIAL_DOCUMENTS: LegalDocument[] = [];
export const INITIAL_DISPUTES: DisputeAlert[] = [];
export const INITIAL_TIMELINE: TimelineItem[] = [];
