import {
  SharedAccessGrant,
  AccessAuditLog,
  PermissionLevel,
  GranteeType,
  CaseSecurityCredential,
  ClaimedDelegatedCase,
  PelakNode,
  LegalDocument,
} from '../types/cadastre';

const STORAGE_KEY = 'cadaster_access_grants_v3';
const CLAIMED_CASES_STORAGE_KEY = 'cadaster_claimed_delegated_cases_v1';

/* =========================================================================
   1. Iranian National ID (کد ملی) & Mobile Validation
   ========================================================================= */

/**
 * اعتبارسنجی الگوریتم کد ملی ۱۰ رقمی جمهوری اسلامی ایران بر مبنای رقم کنترل Modulo 11
 */
export function isValidIranianNationalCode(code: string): boolean {
  if (!code) return false;
  const clean = code.replace(/\D/g, '');
  if (clean.length !== 10) return false;

  // تمام ارقام نباید یکسان باشند (مانند ۱۱۱۱۱۱۱۱۱۱)
  if (/^(\d)\1{9}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  const remainder = sum % 11;
  const checkDigit = parseInt(clean.charAt(9), 10);

  return remainder < 2 ? checkDigit === remainder : checkDigit === 11 - remainder;
}

/**
 * بررسی ساختار شماره موبایل ایران (۰۹xxxxxxxxx)
 */
export function isValidIranianMobile(mobile: string): boolean {
  if (!mobile) return false;
  const clean = mobile.replace(/\D/g, '');
  return /^09\d{9}$/.test(clean);
}

/* =========================================================================
   2. RFC 3548 Base32 & RFC 6238 TOTP Authenticator Engine (Client-Side)
   ========================================================================= */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * تولید کلید محرمانه رندوم با فرمت Base32 برای نرم‌افزارهای احراز هویت
 */
export function generateBase32Secret(length = 16): string {
  let secret = '';
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : null;
  const bytes = new Uint8Array(length);
  if (cryptoObj && cryptoObj.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET.charAt(bytes[i] % 32);
  }
  return secret;
}

/**
 * تبدیل رشته Base32 به آرایه بایت‌ها
 */
export function base32ToBytes(base32Str: string): Uint8Array {
  const clean = base32Str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean.charAt(i));
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

/**
 * پیاده‌سازی خالص SHA-1 در جاوااسکریپت جهت تولید فوری و همگام کدهای TOTP در مرورگر
 */
function sha1(message: Uint8Array): Uint8Array {
  function rotl(n: number, s: number) {
    return (n << s) | (n >>> (32 - s));
  }

  const msgLen = message.length;
  const bitLen = msgLen * 8;
  const withPaddingLen = ((msgLen + 8) >> 6) + 1;
  const words = new Uint32Array(withPaddingLen * 16);

  for (let i = 0; i < msgLen; i++) {
    words[i >> 2] |= message[i] << (24 - (i % 4) * 8);
  }
  words[msgLen >> 2] |= 0x80 << (24 - (msgLen % 4) * 8);
  words[words.length - 1] = bitLen;

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);

  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) {
      w[t] = words[i + t];
    }
    for (let t = 16; t < 80; t++) {
      w[t] = rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let t = 0; t < 80; t++) {
      let f = 0;
      let k = 0;
      if (t < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (t < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotl(a, 5) + f + e + k + w[t]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const result = new Uint8Array(20);
  const outWords = [h0, h1, h2, h3, h4];
  for (let i = 0; i < 5; i++) {
    result[i * 4] = (outWords[i] >>> 24) & 255;
    result[i * 4 + 1] = (outWords[i] >>> 16) & 255;
    result[i * 4 + 2] = (outWords[i] >>> 8) & 255;
    result[i * 4 + 3] = outWords[i] & 255;
  }
  return result;
}

/**
 * پیاده‌سازی HMAC-SHA1
 */
function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let k = key;
  if (k.length > blockSize) {
    k = sha1(k);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(k);

  const oPad = new Uint8Array(blockSize);
  const iPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oPad[i] = paddedKey[i] ^ 0x5c;
    iPad[i] = paddedKey[i] ^ 0x36;
  }

  const innerMsg = new Uint8Array(iPad.length + message.length);
  innerMsg.set(iPad);
  innerMsg.set(message, iPad.length);
  const innerHash = sha1(innerMsg);

  const outerMsg = new Uint8Array(oPad.length + innerHash.length);
  outerMsg.set(oPad);
  outerMsg.set(innerHash, oPad.length);
  return sha1(outerMsg);
}

/**
 * محاسبه فوری کد ۶ رقمی پویای Authenticator (RFC 6238 TOTP)
 */
export function getLiveTotpCode(secretBase32: string, timestampMs = Date.now(), period = 30): string {
  try {
    const key = base32ToBytes(secretBase32);
    const counter = Math.floor(timestampMs / 1000 / period);

    const counterBuffer = new Uint8Array(8);
    let temp = counter;
    for (let i = 7; i >= 0; i--) {
      counterBuffer[i] = temp & 255;
      temp = Math.floor(temp / 256);
    }

    const hmac = hmacSha1(key, counterBuffer);
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  } catch (err) {
    console.error('Error generating TOTP code:', err);
    return '000000';
  }
}

/**
 * اعتبارسنجی کد ۶ رقمی وارد شده توسط کاربر با احتساب تلورانس زمانی (۳۰ ثانیه قبل و بعد)
 */
export function verifyTotpCode(
  secretBase32: string,
  inputCode: string,
  windowToleranceSteps = 1
): boolean {
  if (!secretBase32 || !inputCode) return false;
  const cleanInput = inputCode.replace(/\D/g, '').trim();
  if (cleanInput.length !== 6) return false;

  const now = Date.now();
  const period = 30;

  for (let step = -windowToleranceSteps; step <= windowToleranceSteps; step++) {
    const checkTime = now + step * period * 1000;
    const expected = getLiveTotpCode(secretBase32, checkTime, period);
    if (expected === cleanInput) {
      return true;
    }
  }
  return false;
}

/**
 * ثانیه‌های باقیمانده تا تغییر کد بعدی در پنجره ۳۰ ثانیه‌ای
 */
export function getTotpRemainingSeconds(period = 30): number {
  const currentSec = Math.floor(Date.now() / 1000) % period;
  return period - currentSec;
}

/**
 * ایجاد لینک استاندارد otpauth:// برای ثبت مستقیم در نرم‌افزارهای Authenticator
 */
export function generateTotpAuthUri(
  accountName: string,
  secretBase32: string,
  issuer = 'CadasterVault'
): string {
  const encIssuer = encodeURIComponent(issuer);
  const encAccount = encodeURIComponent(accountName || 'کاربر_مجاز');
  return `otpauth://totp/${encIssuer}:${encAccount}?secret=${secretBase32}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/* =========================================================================
   3. Case-Specific Isolated Passphrase Generator
   ========================================================================= */

/**
 * تولید گذرواژه امن و منحصربه‌فرد برای هر پرونده و سطح دسترسی مشخص
 * مثال: CAD-68-24-DL-7492
 */
export function generateCasePassphrase(
  caseCode: string,
  permission: PermissionLevel
): string {
  const cleanCode = (caseCode || 'CASE')
    .replace(/[\/\s]/g, '-')
    .replace(/[^\w-]/g, '')
    .slice(0, 8)
    .toUpperCase();

  const permTag =
    permission === 'view_only' ? 'VIEW' : permission === 'view_download' ? 'DOWN' : 'EDIT';

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CAD-${cleanCode || 'PELAK'}-${permTag}-${randSuffix}`;
}

/**
 * ساخت شناسه و لینک اختصاصی اشتراک‌گذاری
 */
export function generateGrantShareUrl(grantId: string): string {
  const origin = window.location.origin;
  const path = window.location.pathname;
  return `${origin}${path}?access_token=${grantId}`;
}

/* =========================================================================
   4. Initial Real-World Sample Grants
   ========================================================================= */

export const INITIAL_SAMPLE_GRANTS: SharedAccessGrant[] = [
  {
    id: 'grant_exp_expert_rezai',
    title: 'تفویض پرونده پلاک ۶۸/۲۴ به کارشناس ثبتی (با احراز هویت دوعاملی)',
    granteeName: 'مهندس رضایی (کارشناس رسمی دادگستری - رشته امور ثبتی)',
    granteeType: 'external_guest',
    caseIds: ['pelak_68', 'pelak_68_1'],
    permissionLevel: 'view_download',
    recipientNationalId: '0012345678', // نمونه کد ملی ۱۰ رقمی معتبر
    recipientMobile: '09123456789',
    totpSecret: 'JBSWY3DPEHPK3PXP', // کلید استاندارد TOTP
    totpAuthUri:
      'otpauth://totp/CadasterVault:%D9%85%D9%87%D9%86%D8%AF%D8%B3%20%D8%B1%D8%B6%D8%A7%DB%8C%DB%8C?secret=JBSWY3DPEHPK3PXP&issuer=CadasterVault&algorithm=SHA1&digits=6&period=30',
    primaryPassphrase: 'CAD-68-24-DOWN-8491',
    caseCredentials: [
      {
        caseId: 'pelak_68',
        caseCode: '۶۸/۲۴',
        caseTitle: 'پلاک اصلی ۶۸ فرعی ۲۴ بخش ۱۱ تهران',
        passphrase: 'CAD-68-24-DOWN-8491',
        permissionLevel: 'view_download',
      },
      {
        caseId: 'pelak_68_1',
        caseCode: '۶۸/۲۴/۱',
        caseTitle: 'قطعه ۱ تفکیکی پلاک ۶۸/۲۴',
        passphrase: 'CAD-68-24-1-DOWN-4128',
        permissionLevel: 'view_download',
      },
    ],
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
        action: 'authenticator_verified',
        details: 'تطبیق موفق کد ملی ۰۰۱۲۳۴۵۶۷۸ و تایید توکن پویای Authenticator',
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
    ],
  },
  {
    id: 'grant_intern_dehghan',
    title: 'تفویض پرونده مطالبه وجه چک به همکار دفتر با حق ویرایش',
    granteeName: 'خانم دهقان (کارآموز وکالت دفتر مرکزی)',
    granteeType: 'collaborator',
    caseIds: ['pelak_chek_9901'],
    permissionLevel: 'edit_upload',
    recipientNationalId: '0451234567',
    recipientMobile: '09198765432',
    totpSecret: 'KRSXG5CTMVRXEZLU',
    totpAuthUri:
      'otpauth://totp/CadasterVault:%D8%AE%D8%A7%D9%86%D9%85%20%D8%AF%D9%87%D9%82%D8%A7%D9%86?secret=KRSXG5CTMVRXEZLU&issuer=CadasterVault&algorithm=SHA1&digits=6&period=30',
    primaryPassphrase: 'CAD-CHEK-9901-EDIT-3920',
    caseCredentials: [
      {
        caseId: 'pelak_chek_9901',
        caseCode: 'چک-۹۹۰۱',
        caseTitle: 'دعوای حقوقی مطالبه وجه چک صیادی و خسارت تاخیر تادیه',
        passphrase: 'CAD-CHEK-9901-EDIT-3920',
        permissionLevel: 'edit_upload',
      },
    ],
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
        action: 'authenticator_verified',
        details: 'احراز هویت فردی همکار دفتری با کد ملی و گذرواژه اختصاصی پرونده',
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

/* =========================================================================
   5. Storage & Lifecycle Management
   ========================================================================= */

export function getStoredGrants(): SharedAccessGrant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migrate from v2 if exists
      const oldRaw = localStorage.getItem('cadaster_access_grants_v2');
      if (oldRaw) {
        try {
          const oldGrants: SharedAccessGrant[] = JSON.parse(oldRaw);
          // Upgrade old grants with TOTP secret and national ID if missing
          const upgraded = oldGrants.map((g) => {
            const secret = g.totpSecret || generateBase32Secret(16);
            return {
              ...g,
              totpSecret: secret,
              totpAuthUri: g.totpAuthUri || generateTotpAuthUri(g.granteeName, secret),
              recipientNationalId: g.recipientNationalId || '0012345678',
              recipientMobile: g.recipientMobile || '09123456789',
              primaryPassphrase: g.primaryPassphrase || `CAD-AUTH-${g.pinCode || '9872'}`,
            };
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
          return upgraded;
        } catch {
          // fallback to samples
        }
      }
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

export function saveStoredGrants(grants: SharedAccessGrant[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grants));
  } catch (err) {
    console.error('Error saving access grants:', err);
  }
}

export function getEffectiveGrantStatus(grant: SharedAccessGrant): 'active' | 'revoked' | 'expired' {
  if (grant.status === 'revoked') return 'revoked';
  const now = new Date().getTime();
  const exp = new Date(grant.expiresAt).getTime();
  if (now > exp) return 'expired';
  return 'active';
}

/* =========================================================================
   6. Grant Creation with Authenticator & Isolated Credentials
   ========================================================================= */

export interface CreateGrantParams {
  title: string;
  granteeName: string;
  granteeType: GranteeType;
  recipientNationalId: string;
  recipientMobile: string;
  caseIds: string[];
  casesMeta?: Array<{ id: string; code: string; title: string }>;
  permissionLevel: PermissionLevel;
  validityHours: number;
  customExpiresAt?: string;
  customTotpSecret?: string;
}

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

  // 1. Generate TOTP secret and standard URI
  const totpSecret = params.customTotpSecret || generateBase32Secret(16);
  const totpAuthUri = generateTotpAuthUri(params.granteeName, totpSecret);

  // 2. Generate isolated case credentials per dossier
  const caseCredentials: CaseSecurityCredential[] = (params.casesMeta || []).map((c) => ({
    caseId: c.id,
    caseCode: c.code,
    caseTitle: c.title,
    passphrase: generateCasePassphrase(c.code, params.permissionLevel),
    permissionLevel: params.permissionLevel,
  }));

  const primaryPassphrase =
    caseCredentials.length > 0
      ? caseCredentials[0].passphrase
      : generateCasePassphrase('GEN', params.permissionLevel);

  const newGrant: SharedAccessGrant = {
    id,
    title: params.title.trim() || `تفویض پرونده‌ها به ${params.granteeName}`,
    granteeName: params.granteeName.trim(),
    granteeType: params.granteeType,
    caseIds: params.caseIds,
    permissionLevel: params.permissionLevel,
    recipientNationalId: params.recipientNationalId.trim(),
    recipientMobile: params.recipientMobile.trim(),
    totpSecret,
    totpAuthUri,
    caseCredentials,
    primaryPassphrase,
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

export function deleteAccessGrant(grantId: string): boolean {
  const grants = getStoredGrants();
  const filtered = grants.filter((g) => g.id !== grantId);
  saveStoredGrants(filtered);
  return true;
}

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
      accessCount:
        log.action === 'login' || log.action === 'authenticator_verified'
          ? g.accessCount + 1
          : g.accessCount,
      lastAccessedAt: new Date().toISOString(),
      auditLogs: [newLogItem, ...(g.auditLogs || [])],
    };
  });
  saveStoredGrants(updated);
}

/* =========================================================================
   7. Multi-Factor Identity & Authenticator Validation
   ========================================================================= */

export interface ValidateAccessParams {
  grantId: string;
  nationalId?: string;
  mobileNumber?: string;
  passphrase?: string;
  totpCode?: string;
  selectedCaseId?: string;
}

export function validateGrantAccess(
  paramsOrGrantId: ValidateAccessParams | string,
  legacyPin?: string
): {
  success: boolean;
  grant?: SharedAccessGrant;
  error?: string;
  stepFailed?: 'identity' | 'passphrase' | 'totp' | 'expired' | 'revoked';
} {
  const params: ValidateAccessParams =
    typeof paramsOrGrantId === 'string'
      ? { grantId: paramsOrGrantId, passphrase: legacyPin }
      : paramsOrGrantId;

  const grants = getStoredGrants();
  const grant = grants.find((g) => g.id === params.grantId);

  if (!grant) {
    return { success: false, error: 'شناسه مجوز تفویض دسترسی یافت نشد یا حذف شده است.' };
  }

  const effectiveStatus = getEffectiveGrantStatus(grant);
  if (effectiveStatus === 'revoked') {
    return {
      success: false,
      stepFailed: 'revoked',
      error: 'این دسترسی توسط وکیل / مدیر سامانه لغو و باطل گردیده است.',
    };
  }

  if (effectiveStatus === 'expired') {
    return {
      success: false,
      stepFailed: 'expired',
      error: 'مهلت زمانی استفاده از این پیوند به پایان رسیده و منقضی شده است.',
    };
  }

  // 1. Individual Identity Verification (تشخیص هویت فرد با کد ملی و شماره تماس)
  if (grant.recipientNationalId) {
    const inputNat = (params.nationalId || '').replace(/\D/g, '').trim();
    const expectedNat = grant.recipientNationalId.replace(/\D/g, '').trim();

    if (!inputNat || inputNat !== expectedNat) {
      recordAuditLog(params.grantId, {
        action: 'failed_identity',
        details: `تلاش ناموفق احراز هویت با کد ملی اشتباه (${inputNat || 'خالی'})`,
      });
      return {
        success: false,
        stepFailed: 'identity',
        error: 'کد ملی وارد شده با هویت فرد دریافت‌کننده این پرونده مطابقت ندارد.',
      };
    }
  }

  // 2. Case-Specific Passphrase Verification (گذرواژه اختصاصی پرونده و سطح دسترسی)
  if (grant.caseCredentials && grant.caseCredentials.length > 0) {
    const inputPass = (params.passphrase || '').trim();
    const validPassphrases = grant.caseCredentials.map((c) => c.passphrase.trim());
    if (grant.primaryPassphrase) validPassphrases.push(grant.primaryPassphrase.trim());
    if (grant.pinCode) validPassphrases.push(grant.pinCode.trim());

    if (!inputPass || !validPassphrases.includes(inputPass)) {
      recordAuditLog(params.grantId, {
        action: 'failed_passphrase',
        details: 'تلاش ناموفق برای گذرواژه امنیتی پرونده',
      });
      return {
        success: false,
        stepFailed: 'passphrase',
        error: 'گذرواژه اختصاصی پرونده یا سطح دسترسی وارد شده نادرست است.',
      };
    }
  } else if (grant.pinCode) {
    const inputPass = (params.passphrase || '').trim();
    if (inputPass !== grant.pinCode) {
      recordAuditLog(params.grantId, {
        action: 'failed_pin',
        details: 'ورود پین کد اشتباه',
      });
      return {
        success: false,
        stepFailed: 'passphrase',
        error: 'رمز امنیتی وارد شده نادرست است.',
      };
    }
  }

  // 3. Dynamic Rolling Authenticator Verification (کد ۶ رقمی نرم‌افزار Authenticator)
  if (grant.totpSecret) {
    const inputTotp = (params.totpCode || '').replace(/\D/g, '').trim();
    const isTotpValid = verifyTotpCode(grant.totpSecret, inputTotp, 1);

    if (!isTotpValid) {
      recordAuditLog(params.grantId, {
        action: 'failed_authenticator',
        details: `کد پویای Authenticator نامعتبر است (${inputTotp || 'خالی'})`,
      });
      return {
        success: false,
        stepFailed: 'totp',
        error: 'کد ۶ رقمی نرم‌افزار Authenticator منقضی یا اشتباه است. لطفاً کد جدید را وارد نمایید.',
      };
    }
  }

  // Record successful multi-factor authentication
  recordAuditLog(params.grantId, {
    action: 'authenticator_verified',
    details: `احراز هویت کامل فردی با کد ملی و توکن Authenticator برای ${grant.granteeName}`,
  });

  return { success: true, grant };
}

/* =========================================================================
   8. Permission Level Metadata Helper
   ========================================================================= */

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

/* =========================================================================
   9. Claimed Delegated Cases Across Accounts (دریافت و استقرار پرونده اشتراکی)
   ========================================================================= */

/**
 * دریافت لیست پرونده‌های تفویض‌شده‌ای که توسط کاربر این حساب دریافت و ذخیره گردیده‌اند
 */
export function getClaimedCases(): ClaimedDelegatedCase[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CLAIMED_CASES_STORAGE_KEY);
    if (!raw) return [];
    const list: ClaimedDelegatedCase[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Failed to parse claimed delegated cases:', err);
    return [];
  }
}

/**
 * ذخیره و به‌روزرسانی لیست پرونده‌های دریافت‌شده
 */
export function saveClaimedCases(cases: ClaimedDelegatedCase[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLAIMED_CASES_STORAGE_KEY, JSON.stringify(cases));
  } catch (err) {
    console.error('Failed to save claimed delegated cases:', err);
  }
}

/**
 * ذخیره پرونده تفویض‌شده جدید در کارتابل کاربر جاری پس از عبور موفق از گیت امنیتی
 */
export function claimDelegatedCase(
  grant: SharedAccessGrant,
  targetCase: PelakNode,
  docs?: LegalDocument[]
): ClaimedDelegatedCase {
  const current = getClaimedCases();
  
  // Remove existing claim for same case if re-claiming
  const filtered = current.filter((c) => c.caseId !== targetCase.id);

  const newClaim: ClaimedDelegatedCase = {
    id: `claim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    grantId: grant.id,
    caseId: targetCase.id,
    caseCode: targetCase.code,
    caseTitle: targetCase.title,
    delegatorName: grant.granteeName || 'همکار ارشد / وکیل پرونده',
    permissionLevel: grant.permissionLevel,
    claimedAt: new Date().toISOString(),
    expiresAt: grant.expiresAt,
    recipientNationalId: grant.recipientNationalId,
    caseSnapshot: targetCase,
    documentsSnapshot: docs || [],
  };

  saveClaimedCases([newClaim, ...filtered]);

  // Record audit log
  recordAuditLog(grant.id, {
    action: 'login',
    details: `پرونده «${targetCase.code} - ${targetCase.title}» با موفقیت در میز کار کاربر جدید دریافت و ذخیره گردید.`,
    caseId: targetCase.id,
    caseNumber: targetCase.code,
  });

  return newClaim;
}

/**
 * لغو و حذف پرونده تفویض‌شده از کارتابل حساب جاری
 */
export function removeClaimedCase(claimId: string): void {
  const current = getClaimedCases();
  const updated = current.filter((c) => c.id !== claimId && c.caseId !== claimId);
  saveClaimedCases(updated);
}

/**
 * جستجوی مجوز دسترسی بر اساس توکن، پیوند یا گذرواژه اختصاصی پرونده
 */
export function findGrantByTokenOrPassphrase(query: string): SharedAccessGrant | null {
  if (!query) return null;
  const cleanQ = query.trim();
  const grants = getStoredGrants();

  // 1. Direct ID match
  const byId = grants.find((g) => g.id === cleanQ);
  if (byId) return byId;

  // 2. URL parsing if full link pasted
  try {
    if (cleanQ.includes('?') || cleanQ.includes('http')) {
      const url = new URL(cleanQ.startsWith('http') ? cleanQ : `https://dummy.local/${cleanQ}`);
      const token = url.searchParams.get('access_token') || url.searchParams.get('grant_id');
      if (token) {
        const byToken = grants.find((g) => g.id === token);
        if (byToken) return byToken;
      }
    }
  } catch {}

  // 3. Search by Passphrase or Case Security Credential
  const byPass = grants.find((g) => {
    if (g.primaryPassphrase && g.primaryPassphrase.trim() === cleanQ) return true;
    if (g.pinCode && g.pinCode.trim() === cleanQ) return true;
    if (g.caseCredentials && g.caseCredentials.some((c) => c.passphrase.trim() === cleanQ)) return true;
    return false;
  });
  if (byPass) return byPass;

  // 4. Substring token match
  const bySub = grants.find((g) => g.id.includes(cleanQ) || cleanQ.includes(g.id));
  if (bySub) return bySub;

  return null;
}
