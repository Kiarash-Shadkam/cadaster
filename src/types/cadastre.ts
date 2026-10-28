/**
 * Types for Cadastral Legal Automation System
 * سیستم اتوماسیون کاداستر و اسناد وکیل
 */

export type CaseDomain =
  | 'real_estate'    // پرونده‌های اراضی و کاداستر ثبتی
  | 'commercial'     // پرونده‌های تجاری، چک، سفته و اسناد مالی
  | 'contracts'      // دعاوی ناشی از قراردادها و مشارکت ساخت
  | 'criminal'       // پرونده‌های کیفری، کلاهبرداری، جعل، خیانت در امانت
  | 'inheritance'    // انحصار وراثت، تقسیم ترکه و امور حسبی
  | 'administrative' // دیوان عدالت اداری، شهرداری کمیسیون ماده ۱۰۰
  | 'general';       // سایر پرونده‌های حقوقی

export type PelakType = 'main' | 'sub' | 'parcel';

export type PelakStatus =
  | 'valid'        // تثبیت‌شده و سند رسمی معتبر
  | 'disputed'     // متنازع‌فیه و دارای دعوای حقوقی
  | 'arrested'     // توقیفی / دستور موقت / تأمین خواسته
  | 'pending'      // در جریان عملیات ثبتی یا تحدید حدود
  | 'forged'       // دارای سند مجعول / فروش مال غیر
  | 'closed';      // مختومه و بایگانی‌شده

export type DocumentCategory =
  | 'deed'              // سند مالکیت رسمی (تک‌برگی / دفترچه‌ای)
  | 'verdict'           // دادنامه و حکم قطعی دادگاه
  | 'order'             // قرار قضایی / دستور موقت / توقیف عملیات
  | 'inquiry'           // استعلام ثبتی / استعلام دارایی و شهرداری
  | 'contract'          // مبایعه‌نامه / صلح‌نامه عادی / قولنامه
  | 'power_of_attorney' // وکالت‌نامه رسمی تام‌الاختیار
  | 'minutes'           // صورت‌مجلس تفکیکی / دست‌نوشته و استشهاد محلی
  | 'expert_report';    // نظریه کارشناس رسمی دادگستری (ثبتی / خط‌شناسی)

export interface PelakNode {
  id: string;
  code: string;                 // e.g. "۶۸" or "کلاسه-۹۹۰۱" or "پرونده چک"
  mainNumber: string;           // پلاک اصلی یا شماره کلاسه
  subNumber?: string;           // زیرپلاک
  parcelNumber?: string;        // پلاک فرعی یا قطعه تفکیکی
  sector: string;               // بخش ثبتی یا حوزه قضایی
  title: string;                // عنوان قطعه / عنوان پرونده
  areaM2: number;               // مساحت به متر مربع (برای املاک) یا مبلغ خواسته
  ownerName: string;            // مالک رسمی / موکل
  status: PelakStatus;
  parentId?: string;            // شناسه والد در درخت کاداستر
  childrenIds: string[];        // شناسه‌های فرزندان
  description: string;
  deedType: 'دفترچه‌ای شاهنشاهی' | 'تک‌برگی کاداستری' | 'عادی با وکالت تام' | 'فاقد سند رسمی' | 'پرونده قضایی حقوقی/کیفری';
  boundaryDetails?: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
  cadastralShape?: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    fillColor?: string;
  };
  isNonLandDossier?: boolean;   // آیا این گره یک پرونده غیرملکی (چک، قرارداد، کیفری و...) است؟
  dossierDomain?: CaseDomain;   // حوزه پرونده
  clientRole?: string;          // جایگاه وکیل: وکیل شاکی / وکیل خواهان / وکیل مدافع خوانده
  holisticAnalysis?: HolisticDossierAnalysis; // تحلیل و ارزیابی تطبیقی و جامع پرونده
}

export interface HolisticDossierAnalysis {
  synthesisSummary: string; // خلاصه تلفیقی و منسجم پرونده
  caseNarrative: string; // گردش‌کار کلی و ماهیت ادعاها
  keyParties: {
    clients: string[];
    opponents: string[];
    authorities: string[];
  };
  evidenceChain: Array<{
    documentTitle: string;
    roleInCase: string; // نقش در اثبات دعوا یا دفاع
    strength: 'conclusive' | 'supporting' | 'vulnerable';
  }>;
  conflictsOrContradictions: string[]; // تعارضات یا تناقضات بین مدارک پرونده
  legalStrengths: string[]; // نقاط قوت موکل
  legalRisks: string[]; // نقاط ریسک یا آسیب‌پذیری طرف مقابل یا موکل
  recommendedAttorneyActions: string[]; // اقدامات و لوایح پیشنهادی بعدی وکیل
  lastSynthesizedAt: string; // تاریخ شمسی یا زمان تحلیل
}

export interface LegalDocument {
  id: string;
  pelakId: string;
  pelakCode: string;
  title: string;
  category: DocumentCategory;
  caseDomain?: CaseDomain;
  suggestedDossierTitle?: string;
  documentNumber: string;       // شماره دادنامه / شماره ثبت سند / کلاسه پرونده
  issueDate: string;            // تاریخ شمسی (مثلاً ۱۴۰۱/۰۸/۱۵)
  authority: string;            // شعبه دادگاه، اداره ثبت، یا دفتر اسناد
  summary: string;
  parties: {
    claimant?: string;          // خواهان / شاکی
    defendant?: string;         // خوانده / متهم
    notaryOrSeller?: string;    // فروشنده / صادرکننده
    buyer?: string;             // خریدار / انتقال‌گیرنده
    advocate?: string;          // وکیل
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isForgedOrConflicting: boolean;
  extractedEntities: {
    verdictOutcome?: string;              // نتیجه حکم: ابطال سند، خلع ید، رد دعوا
    conflictingDeedNumbers?: string[];    // اسناد معارض
    forgeryIndicators?: string[];         // قرائن جعل و شگردها
    relevantLegalArticles?: string[];     // مواد قانونی مورد استناد
    nextActionNeeded?: string;            // اقدام اجرایی بعدی وکیل
    referencedContractDates?: string[];   // تاریخ‌های مبایعه‌نامه‌ها و قراردادهای قبلی ارجاع‌شده
    referencedCaseNumbers?: string[];     // کلاسه پرونده‌ها یا دادنامه‌های ارجاعی قبلی
  };
  scanImageUrl?: string;
  fileMimeType?: string;
  isStarred?: boolean;                  // آیا سند ستاره‌دار و مهم است (جهت نمایش در بالای فهرست)
  fileName?: string;                    // نام فایل اصلی جهت شناسایی و حذف تکراری
  fileSize?: number;                    // حجم فایل جهت احراز تکراری بودن
  isPreloaded?: boolean;
  isPendingRoot?: boolean;              // آیا پلاک یا ریشه سند نامشخص است و در انتظار مدارک مادر است
  reconciliationNote?: string;          // شرح نحوه تطبیق و پیوند عطف‌به‌ماسبق
  linkedFromUnresolved?: boolean;       // آیا قبلاً نامشخص بوده و اکنون به این پلاک منتقل شده
  originalUnresolvedDate?: string;      // تاریخ ثبت اولیه در حالت نامشخص
}

export interface ReconciliationEvent {
  id: string;
  unresolvedDocId: string;
  unresolvedDocTitle: string;
  rootDocId: string;
  rootDocTitle: string;
  targetPelakId: string;
  targetPelakCode: string;
  timestamp: string;
  reason: string;
}

export interface DisputeAlert {
  id: string;
  pelakId: string;
  pelakCode: string;
  title: string;
  disputeType:
    | 'فروش مال غیر'
    | 'معامله معارض'
    | 'جعل سند و امضا'
    | 'دستور موقت توقیف'
    | 'تعارض تحدید حدود'
    | 'مطالبه وجه چک و اسناد تجاری'
    | 'الزام به تنظیم سند و ایفای تعهدات قراردادی'
    | 'فسخ و بطلان قرارداد مشارکت'
    | 'شکایت کیفری کلاهبرداری و خیانت در امانت'
    | 'تقسیم ترکه و تحریر ماترک'
    | 'ابطال مصوبه شهرداری در دیوان عدالت اداری'
    | 'دعوای حقوقی و مطالبات';
  caseDomain?: CaseDomain;
  severity: 'critical' | 'high' | 'medium';
  involvedParties: string[];
  conflictingDocs?: string[];
  courtBranch: string;
  caseNumber: string;
  legalStatus: string;
  strategyNote: string;
}

export interface TimelineItem {
  id: string;
  pelakId: string;
  pelakCode: string;
  date: string;                  // تاریخ شمسی
  title: string;
  type: 'deed' | 'court' | 'dispute' | 'inquiry' | 'action' | 'registry';
  stageCategory?: 'filing' | 'hearing' | 'expert' | 'verdict' | 'appeal' | 'execution' | 'out_of_court';
  description: string;
  authority: string;
  docId?: string;
  isKeyMilestone?: boolean;
  caseDomain?: CaseDomain;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  timestamp: string;
  text: string;
  referencedDocIds?: string[];
  referencedPelak?: string;
  legalInferences?: string[];
  suggestedActions?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  pelakId: string;
  createdAt: number;
  updatedAt: number;
  draftInput: string;
  messages: ChatMessage[];
}

export interface LegalDeadline {
  id: string;
  pelakId: string;
  pelakCode: string;
  title: string;
  deadlineType:
    | 'appeal_20d'           // تجدیدنظرخواهی (۲۰ روز)
    | 'supreme_appeal_20d'   // فرجام‌خواهی (۲۰ روز)
    | 'default_judgment_20d' // واخواهی (۲۰ روز)
    | 'expert_objection_7d'  // اعتراض به نظریه کارشناسی (۷ روز)
    | 'defect_rectification_10d' // اخطار رفع نقص (۱۰ روز)
    | 'court_hearing'        // جلسه دادرسی
    | 'custom';              // سایر مواعد قانونی
  sanaNotificationDate: string; // تاریخ ابلاغ در ثنا (مثلاً ۱۴۰۳/۰۸/۱۰)
  calculatedDueDate: string;   // سررسید انقضا با احتساب روز ابلاغ و اقدام
  courtBranch: string;         // شعبه دادگاه
  caseNumber: string;          // شماره پرونده / کلاسه
  notes?: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface FeePayment {
  id: string;
  date: string;
  amountTomans: number;
  description: string;
  method: 'کارت‌به‌کارت' | 'شبا/پایا' | 'چک' | 'نقدی' | 'پوز دفتر';
}

export interface FeeRecord {
  id: string;
  pelakId: string;
  pelakCode: string;
  clientName: string;
  caseSubject: string;
  claimAmountTomans: number;      // بهای خواسته به تومان
  agreedFeeTomans: number;        // حق‌الوکاله توافقی کل به تومان
  stage: 'badvi' | 'tajdid' | 'farjam' | 'ejra' | 'all_inclusive'; // مرحله رسیدگی
  taxStampDutyTomans: number;     // تمبر مالیاتی ماده ۱۰۳ ق.م.م (۵٪)
  supportFundTomans: number;      // سهم صندوق حمایت وکلا (۲.۵٪)
  barShareTomans: number;         // سهم کانون وکلا (۱٪)
  payments: FeePayment[];
  notes?: string;
  createdAt: string;
}

export interface LegalDraftTemplate {
  id: string;
  title: string;
  category: 'petition' | 'bill' | 'injunction' | 'objection' | 'declaration';
  applicableDomains?: CaseDomain[]; // موضوعات پرونده منطبق
  isLandSpecific?: boolean;          // آیا مختص دعاوی ملکی، ثبتی و اراضی است؟
  isGeneral?: boolean;               // آیا قالب عمومی و در کلیه پرونده‌ها قابل استفاده است؟
  description: string;
  legalBasis: string[]; // مواد قانونی استنادی
  templateContent: string;
}

export interface ConflictMatch {
  pelakId: string;
  pelakCode: string;
  pelakTitle: string;
  matchedName: string;
  roleInCase: string; // خواهان / خوانده / متهم / مالک رسمی / خریدار
  caseDomain?: CaseDomain;
  status: PelakStatus;
  documentTitle?: string;
  isAdverseParty: boolean; // آیا طرف متخاصم/خوانده/متهم بوده است؟
  conflictWarning: string;
}

export interface VaultBackupData {
  version: string;
  exportedAt: string;
  pelaks: PelakNode[];
  documents: LegalDocument[];
  disputes: DisputeAlert[];
  timeline: TimelineItem[];
  chatSessions?: ChatSession[];
  deadlines?: LegalDeadline[];
  feeRecords?: FeeRecord[];
  accessGrants?: SharedAccessGrant[];
}

/**
 * سطوح سه‌گانه دسترسی به پرونده‌ها و اسناد
 */
export type PermissionLevel =
  | 'view_only'      // فقط مشاهده: مطالعه اطلاعات، مدارک و سوابق بدون حق دانلود یا ویرایش
  | 'view_download'  // مشاهده و دانلود: امکان بارگیری اسناد و خروجی چاپی، بدون حق ویرایش
  | 'edit_upload';   // ویرایش و بارگذاری: ثبت یادداشت، آپلود سند جدید، ویرایش اطلاعات تکمیلی

export type GranteeType = 'collaborator' | 'external_guest';

export interface CaseSecurityCredential {
  caseId: string;
  caseCode: string;
  caseTitle: string;
  passphrase: string;
  permissionLevel: PermissionLevel;
}

export interface AccessAuditLog {
  id: string;
  timestamp: string; // ISO
  action:
    | 'login'
    | 'identity_verified'
    | 'authenticator_verified'
    | 'view_case'
    | 'download_document'
    | 'upload_document'
    | 'edit_case'
    | 'failed_pin'
    | 'failed_identity'
    | 'failed_passphrase'
    | 'failed_authenticator';
  caseId?: string;
  caseNumber?: string;
  documentTitle?: string;
  details?: string;
  ipPlaceholder?: string;
}

export interface SharedAccessGrant {
  id: string;                       // e.g. "grant_171420..."
  title: string;                    // عنوان مجوز تفویض دسترسی
  granteeName: string;              // نام همکار یا شخص مهمان (مثلا: مهندس رضایی - کارشناس ثبتی)
  granteeType: GranteeType;         // نوع گیرنده: همکار دفتری یا پیوند امن مهمان
  caseIds: string[];                // شناسه‌های پرونده‌های منتخب
  permissionLevel: PermissionLevel; // سطح دسترسی

  // سیستم احراز هویت فردی و Authenticator اختصاصی
  recipientNationalId?: string;     // کد ملی ۱۰ رقمی شخص مجاز جهت تشخیص هویت قطعی
  recipientMobile?: string;         // شماره موبایل ثبت‌شده جهت تطبیق هویت
  totpSecret?: string;              // کلید رمزی Base32 برای نرم‌افزارهای Authenticator (مانند Google / Microsoft Authenticator)
  totpAuthUri?: string;             // آدرس استاندارد otpauth://totp/... جهت QR یا اتصال نرم‌افزار
  caseCredentials?: CaseSecurityCredential[]; // گذرواژه‌های اختصاصی مجزا به تفکیک هر پرونده و سطح دسترسی
  primaryPassphrase?: string;       // گذرواژه امنیتی اصلی تفویض

  pinCode?: string;                 // پین پشتیبان
  createdAt: string;                // تاریخ ایجاد
  expiresAt: string;                // تاریخ و زمان دقیق انقضا
  status: 'active' | 'revoked' | 'expired';
  revokedAt?: string;
  accessCount: number;              // تعداد دفعات ورود موفق
  lastAccessedAt?: string;
  auditLogs: AccessAuditLog[];      // تاریخچه ممیزی کامل اقدامات
}

export interface DelegatedSession {
  grant: SharedAccessGrant;
  authenticatedAt: string;
  verifiedIdentity?: {
    nationalId?: string;
    mobile?: string;
  };
}


