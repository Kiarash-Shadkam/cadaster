import { SharedAccessGrant, AccessAuditLog, PermissionLevel, GranteeType } from '../types/cadastre';

const STORAGE_KEY = 'cadaster_access_grants_v2';

export const INITIAL_SAMPLE_GRANTS: SharedAccessGrant[] = [
  {
    id: 'grant_exp_expert_rezai',
    title: 'تفویض پرونده متنازع‌فیه پلاک ۶۸/۲۴ به کارشناس ثبتی',
    granteeName: 'مهندس رضایی (کارشناس رسمی دادگستری - رشته امور ثبتی)',
    granteeType: 'external_guest',
    caseIds: ['pelak_68', 'pelak_68_1'],
    permissionLevel: 'view_download',
    pinCode: '7429',
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    status: 'active',
    accessCount: 4,
    lastAccessedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    auditLogs: [
      {
        id: 'log_1',
        timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        action: 'login',
        details: 'ورود موفق به پرتال دسترسی امن با کد تأیید',
        ipPlaceholder: '178.252.189.44',
      },
      {
        id: 'log_2',
        timestamp: new Date(Date.now() - 35 * 3600 * 1000).toISOString(),
        action: 'view_case',
        caseId: 'pelak_68',
        caseNumber: '۶۸/۲۴',
        details: 'مشاهده مشخصات پلاک اصلی ۶۸ بخش ۱۱ تهران',
      },
      {
        id: 'log_3',
        timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
        action: 'download_document',
        caseId: 'pelak_68',
        caseNumber: '۶۸/۲۴',
        documentTitle: 'سند مالکیت تک‌برگی کاداستری',
        details: 'بارگیری نسخه باکیفیت سند تک‌برگی جهت مطابقت کاداستر',
      },
      {
        id: 'log_4',
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        action: 'download_document',
        caseId: 'pelak_68_1',
        caseNumber: '۶۸/۲۴/۱',
        documentTitle: 'نقشه وضع موجود و تحدید حدود ثبتی',
        details: 'دریافت فایل کروکی و مختصات UTM',
      },
    ],
  },
  {
    id: 'grant_intern_dehghan',
    title: 'بررسی اوراق پرونده حقوقی مطالبه وجه چک به همکار دفتر',
    granteeName: 'خانم دهقان (کارآموز وکالت دفتر مرکزی)',
    granteeType: 'collaborator',
    caseIds: ['pelak_chek_9901'],
    permissionLevel: 'edit_upload',
    pinCode: '3812',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString(),
    status: 'active',
    accessCount: 2,
    lastAccessedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    auditLogs: [
      {
        id: 'log_col_1',
        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        action: 'login',
        details: 'ورود به سامانه به عنوان همکار دفتری',
      },
      {
        id: 'log_col_2',
        timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        action: 'upload_document',
        caseId: 'pelak_chek_9901',
        caseNumber: 'چک-۹۹۰۱',
        documentTitle: 'گواهی عدم پرداخت چک از بانک صادرات',
        details: 'بارگذاری مدرک تکمیلی بانکی در پرونده',
      },
    ],
  },
];

/**
 * دریافت کلیه مجوزهای دسترسی ذخیره‌شده
 */
export function getStoredGrants(): SharedAccessGrant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_GRANTS));
      return INITIAL_SAMPLE_GRANTS;
    }
    const grants: SharedAccessGrant[] = JSON.parse(raw);
    return grants;
  } catch (err) {
    console.error('Error reading access grants:', err);
    return INITIAL_SAMPLE_GRANTS;
  }
}

/**
 * ذخیره فهرست دسترسی‌ها
 */
export function saveStoredGrants(grants: SharedAccessGrant[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grants));
  } catch (err) {
    console.error('Error saving access grants:', err);
  }
}

/**
 * بررسی وضعیت مؤثر مجوز (با احتساب تاریخ انقضا)
 */
export function getEffectiveGrantStatus(grant: SharedAccessGrant): 'active' | 'revoked' | 'expired' {
  if (grant.status === 'revoked') return 'revoked';
  const now = new Date().getTime();
  const exp = new Date(grant.expiresAt).getTime();
  if (now > exp) return 'expired';
  return 'active';
}

/**
 * تولید پین‌کد تصادفی ۴ رقمی
 */
export function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * ساخت لینک اشتراک‌گذاری یکتا
 */
export function generateGrantShareUrl(grantId: string): string {
  const origin = window.location.origin;
  const path = window.location.pathname;
  return `${origin}${path}?access_token=${grantId}`;
}

export interface CreateGrantParams {
  title: string;
  granteeName: string;
  granteeType: GranteeType;
  caseIds: string[];
  permissionLevel: PermissionLevel;
  pinCode?: string;
  validityHours: number; // e.g. 24, 72, 168 (7 days), 720 (30 days)
  customExpiresAt?: string;
}

/**
 * ایجاد مجوز دسترسی جدید
 */
export function createAccessGrant(params: CreateGrantParams): SharedAccessGrant {
  const grants = getStoredGrants();
  const id = `grant_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  const now = new Date();
  let expiresAt: string;
  if (params.customExpiresAt) {
    expiresAt = new Date(params.customExpiresAt).toISOString();
  } else {
    expiresAt = new Date(now.getTime() + params.validityHours * 3600 * 1000).toISOString();
  }

  const newGrant: SharedAccessGrant = {
    id,
    title: params.title.trim() || `مجوز اشتراک‌گذاری به ${params.granteeName}`,
    granteeName: params.granteeName.trim(),
    granteeType: params.granteeType,
    caseIds: params.caseIds,
    permissionLevel: params.permissionLevel,
    pinCode: params.pinCode?.trim() || undefined,
    createdAt: now.toISOString(),
    expiresAt,
    status: 'active',
    accessCount: 0,
    auditLogs: [],
  };

  grants.unshift(newGrant);
  saveStoredGrants(grants);
  return newGrant;
}

/**
 * ابطال فوری دسترسی (Revoke)
 */
export function revokeAccessGrant(grantId: string): boolean {
  const grants = getStoredGrants();
  let found = false;
  const updated = grants.map((g) => {
    if (g.id === grantId) {
      found = true;
      return {
        ...g,
        status: 'revoked' as const,
        revokedAt: new Date().toISOString(),
      };
    }
    return g;
  });
  if (found) {
    saveStoredGrants(updated);
  }
  return found;
}

/**
 * حذف کامل مجوز از تاریخچه
 */
export function deleteAccessGrant(grantId: string): boolean {
  const grants = getStoredGrants();
  const filtered = grants.filter((g) => g.id !== grantId);
  saveStoredGrants(filtered);
  return true;
}

/**
 * ثبت لاگ ممیزی در مجوز
 */
export function recordAuditLog(
  grantId: string,
  log: Omit<AccessAuditLog, 'id' | 'timestamp'>
): void {
  const grants = getStoredGrants();
  const updated = grants.map((g) => {
    if (g.id !== grantId) return g;
    const newLogItem: AccessAuditLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    return {
      ...g,
      accessCount: log.action === 'login' ? g.accessCount + 1 : g.accessCount,
      lastAccessedAt: new Date().toISOString(),
      auditLogs: [newLogItem, ...(g.auditLogs || [])],
    };
  });
  saveStoredGrants(updated);
}

/**
 * اعتبارسنجی ورود به پرتال دسترسی با شناسه مجوز و پین‌کد
 */
export function validateGrantAccess(
  grantId: string,
  inputPin?: string
): { success: boolean; grant?: SharedAccessGrant; error?: string } {
  const grants = getStoredGrants();
  const grant = grants.find((g) => g.id === grantId);

  if (!grant) {
    return { success: false, error: 'شناسه مجوز تفویض دسترسی یافت نشد یا حذف شده است.' };
  }

  const effectiveStatus = getEffectiveGrantStatus(grant);
  if (effectiveStatus === 'revoked') {
    return { success: false, error: 'این دسترسی توسط وکیل / مدیر سامانه لغو و باطل گردیده است.' };
  }

  if (effectiveStatus === 'expired') {
    return { success: false, error: 'مهلت زمانی استفاده از این پیوند به پایان رسیده و منقضی شده است.' };
  }

  if (grant.pinCode) {
    const cleanInput = (inputPin || '').trim();
    if (cleanInput !== grant.pinCode) {
      // Record failed pin attempt
      recordAuditLog(grantId, {
        action: 'failed_pin',
        details: 'تلاش ناموفق برای ورود با رمز اشتباه',
      });
      return { success: false, error: 'رمز عبور امنیتی (PIN) وارد شده نادرست است.' };
    }
  }

  // Record successful login
  recordAuditLog(grantId, {
    action: 'login',
    details: 'ورود موفق به پرتال دسترسی و احراز هویت',
  });

  return { success: true, grant };
}

/**
 * برچسب‌های خوانا برای سطوح مجوز سه‌گانه
 */
export function getPermissionLevelMeta(level: PermissionLevel): {
  label: string;
  badgeColor: string;
  description: string;
  canDownload: boolean;
  canEdit: boolean;
} {
  switch (level) {
    case 'view_only':
      return {
        label: 'فقط مشاهده',
        badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        description: 'امکان مطالعه اطلاعات و مشاهده اسناد بدون حق دانلود یا ویرایش پرونده',
        canDownload: false,
        canEdit: false,
      };
    case 'view_download':
      return {
        label: 'مشاهده و دانلود مدارک',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        description: 'امکان دریافت فایل‌های اسناد، نقشه‌های ثبتی و خروجی چاپی پرونده',
        canDownload: true,
        canEdit: false,
      };
    case 'edit_upload':
      return {
        label: 'ویرایش و بارگذاری سند',
        badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        description: 'امکان ثبت یادداشت، بارگذاری مدارک تکمیلی و ویرایش اطلاعات پرونده',
        canDownload: true,
        canEdit: true,
      };
    default:
      return {
        label: 'نامشخص',
        badgeColor: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        description: '',
        canDownload: false,
        canEdit: false,
      };
  }
}
