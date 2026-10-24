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
  | 'forged';      // دارای سند مجعول / فروش مال غیر

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

export interface VaultBackupData {
  version: string;
  exportedAt: string;
  pelaks: PelakNode[];
  documents: LegalDocument[];
  disputes: DisputeAlert[];
  timeline: TimelineItem[];
  chatSessions?: ChatSession[];
}

