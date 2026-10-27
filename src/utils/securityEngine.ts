/**
 * Security Engine for Attorney Vault Authentication
 * Handles:
 * - Password strength scoring
 * - Dual OTP (SMS & Email) generation, dispatch simulation & verification
 * - Brute-force protection & cooldown locks
 * - Security contact profiles (phone & email)
 * - Inactivity auto-lock configuration
 */

export interface VaultSecurityProfile {
  phone: string; // e.g. 09121234567
  email: string; // e.g. lawyer@example.ir
  autoLockMinutes: number; // 0 (off), 5, 10, 15, 30
  registeredAt: string;
  lastLoginAt?: string;
}

export interface PasswordRequirements {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasUppercase: boolean;
  hasSpecial: boolean;
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: string;
  color: string;
  barWidth: string;
  feedback: string[];
  requirements: PasswordRequirements;
  isStrongEnough: boolean;
}

export interface PendingOtp {
  code: string;
  channel: 'sms' | 'email';
  target: string;
  expiresAt: number; // timestamp
}

export interface FailedAttemptsState {
  count: number;
  lockedUntil: number | null;
}

const STORAGE_KEY_PASSCODE = 'attorney_vault_passcode';
const STORAGE_KEY_PROFILE = 'attorney_vault_security_profile';
const STORAGE_KEY_FAILED = 'attorney_vault_failed_attempts';
const STORAGE_KEY_PENDING_OTP = 'attorney_vault_pending_otp';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout after 5 failed tries
const OTP_VALIDITY_MS = 120 * 1000; // 2 minutes (120 seconds)

export function getStoredPasscode(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_PASSCODE);
  } catch {
    return null;
  }
}

export function setStoredPasscode(passcode: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_PASSCODE, passcode);
  } catch (e) {
    console.error('Failed to save passcode', e);
  }
}

export function clearStoredPasscode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PASSCODE);
  } catch (e) {
    console.error('Failed to clear passcode', e);
  }
}

export function getSecurityProfile(): VaultSecurityProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSecurityProfile(profile: VaultSecurityProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = (password || '').length >= 8;
  const hasNumber = /[0-9]/.test(password || '');
  const hasUppercase = /[A-Z]/.test(password || '');
  const hasSpecial = /[^a-zA-Z0-9\u0600-\u06FF]/.test(password || '');

  const requirements: PasswordRequirements = {
    hasMinLength,
    hasNumber,
    hasUppercase,
    hasSpecial,
  };

  if (!password) {
    return {
      score: 0,
      label: 'خالی',
      color: 'bg-slate-700',
      barWidth: '0%',
      feedback: [
        'حداقل ۸ کاراکتر وارد فرمایید.',
        'حداقل یک رقم عددی (0-9) وارد فرمایید.',
        'حداقل یک حرف بزرگ انگلیسی (A-Z) وارد فرمایید.',
      ],
      requirements,
      isStrongEnough: false,
    };
  }

  const feedback: string[] = [];
  if (!hasMinLength) feedback.push('حداقل ۸ کاراکتر باشد.');
  if (!hasNumber) feedback.push('حداقل یک عدد (0-9) داشته باشد.');
  if (!hasUppercase) feedback.push('حداقل یک حرف بزرگ انگلیسی (A-Z) داشته باشد.');

  // Strict enforcement: MUST satisfy all 3 mandatory requirements
  const isStrongEnough = hasMinLength && hasNumber && hasUppercase;

  // Calculate score based on fulfillment
  let fulfilledCount = 0;
  if (hasMinLength) fulfilledCount++;
  if (hasNumber) fulfilledCount++;
  if (hasUppercase) fulfilledCount++;
  if (hasSpecial || password.length >= 12) fulfilledCount++;

  if (!isStrongEnough) {
    // If any mandatory rule is missing, score is max 2 (insufficient)
    if (fulfilledCount <= 1) {
      return {
        score: 1,
        label: 'بسیار ضعیف (شروط احراز نشد)',
        color: 'bg-rose-500',
        barWidth: '25%',
        feedback,
        requirements,
        isStrongEnough: false,
      };
    }
    return {
      score: 2,
      label: 'ناکافی (کسری شروط امنیتی)',
      color: 'bg-amber-500',
      barWidth: '50%',
      feedback,
      requirements,
      isStrongEnough: false,
    };
  }

  // All 3 mandatory rules met!
  if (hasSpecial || password.length >= 12) {
    return {
      score: 4,
      label: 'بسیار قوی و ایمن',
      color: 'bg-emerald-500',
      barWidth: '100%',
      feedback: ['رمز عبور تمامی شروط امنیتی را در بالاترین سطح داراست.'],
      requirements,
      isStrongEnough: true,
    };
  }

  return {
    score: 3,
    label: 'قوی و مورد تایید',
    color: 'bg-sky-500',
    barWidth: '75%',
    feedback: feedback.length ? feedback : ['شروط سه‌گانه امنیتی با موفقیت احراز شد.'],
    requirements,
    isStrongEnough: true,
  };
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || 'شماره ثبت نشده';
  // 09123456789 -> 0912***6789
  const start = phone.slice(0, 4);
  const end = phone.slice(-4);
  return `${start}***${end}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || 'ایمیل ثبت نشده';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  const maskedUser = `${user[0]}***${user[user.length - 1]}`;
  return `${maskedUser}@${domain}`;
}

export function getFailedAttemptsState(): FailedAttemptsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAILED);
    if (!raw) return { count: 0, lockedUntil: null };
    const parsed = JSON.parse(raw);
    if (parsed.lockedUntil && Date.now() > parsed.lockedUntil) {
      resetFailedAttempts();
      return { count: 0, lockedUntil: null };
    }
    return parsed;
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

export function recordFailedAttempt(): {
  count: number;
  lockedUntil: number | null;
  isLocked: boolean;
  remainingCooldown: number;
} {
  const current = getFailedAttemptsState();
  const nextCount = current.count + 1;
  let lockedUntil = current.lockedUntil;

  if (nextCount >= MAX_FAILED_ATTEMPTS) {
    lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }

  const newState = { count: nextCount, lockedUntil };
  try {
    localStorage.setItem(STORAGE_KEY_FAILED, JSON.stringify(newState));
  } catch (e) {
    console.error('Failed to save failed attempts', e);
  }

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const remainingCooldown = isLocked ? Math.ceil((lockedUntil! - Date.now()) / 1000) : 0;

  return {
    count: nextCount,
    lockedUntil,
    isLocked,
    remainingCooldown,
  };
}

export function resetFailedAttempts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_FAILED);
  } catch (e) {
    console.error('Failed to reset failed attempts', e);
  }
}

/**
 * Generates a secure 6-digit OTP code, stores it with 120s expiration,
 * and returns it for immediate simulation notification toast.
 */
export function generateAndDispatchOtp(channel: 'sms' | 'email'): {
  success: boolean;
  code?: string;
  target?: string;
  expiresAt?: number;
  error?: string;
} {
  const profile = getSecurityProfile();
  if (!profile) {
    return {
      success: false,
      error: 'اطلاعات امنیتی ثبت نشده است. ابتدا رمز عبور را تنظیم فرمایید.',
    };
  }

  const target = channel === 'sms' ? profile.phone : profile.email;
  if (!target) {
    return {
      success: false,
      error: channel === 'sms' ? 'شماره موبایل ثبت نشده است.' : 'آدرس ایمیل ثبت نشده است.',
    };
  }

  // 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + OTP_VALIDITY_MS;

  const pending: PendingOtp = {
    code,
    channel,
    target,
    expiresAt,
  };

  try {
    localStorage.setItem(STORAGE_KEY_PENDING_OTP, JSON.stringify(pending));
  } catch (e) {
    console.error('Failed to save pending OTP', e);
  }

  return {
    success: true,
    code,
    target,
    expiresAt,
  };
}

export function verifyOtp(inputCode: string): { success: boolean; error?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING_OTP);
    if (!raw) {
      return { success: false, error: 'کد تایید منقضی شده یا درخواستی ثبت نشده است.' };
    }
    const pending: PendingOtp = JSON.parse(raw);

    if (Date.now() > pending.expiresAt) {
      localStorage.removeItem(STORAGE_KEY_PENDING_OTP);
      return { success: false, error: 'مهلت زمانی کد تایید (۲ دقیقه) پایان یافته است. کد جدید دریافت نمایید.' };
    }

    if (pending.code !== inputCode.trim()) {
      return { success: false, error: 'کد تایید ۶ رقمی وارد شده نادرست است.' };
    }

    // OTP Validated! Remove it so it cannot be reused
    localStorage.removeItem(STORAGE_KEY_PENDING_OTP);
    return { success: true };
  } catch {
    return { success: false, error: 'خطا در ارزیابی کد تایید.' };
  }
}
