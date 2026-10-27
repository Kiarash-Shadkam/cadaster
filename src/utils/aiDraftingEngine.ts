import { PelakNode, LegalDocument, LegalDraftTemplate, CaseDomain } from '../types/cadastre';
import { toPersianDigits } from './persian';
import { getTodayShamsi } from './legalFormulas';

export type CitationFocusId =
  | 'deed_registry'
  | 'statutory_articles'
  | 'case_facts_disputes'
  | 'procedural_defenses'
  | 'evidentiary_proof';

export interface CitationFocusOption {
  id: CitationFocusId;
  label: string;
  shortDesc: string;
  badge: string;
  defaultActive: boolean;
}

export const CITATION_FOCUS_OPTIONS: CitationFocusOption[] = [
  {
    id: 'deed_registry',
    label: 'استناد صریح به شماره اسناد و پلاک‌های ثبتی',
    shortDesc: 'درج شماره سند، تاریخ صدور، دفترخانه و مشخصات ثبتی موجود در پرونده',
    badge: 'سندمحور',
    defaultActive: true,
  },
  {
    id: 'statutory_articles',
    label: 'استناد به مواد قانونی مدنی، ثبتی و آیین دادرسی',
    shortDesc: 'ذکر مواد قانون مدنی، قانون ثبت، ق.آ.د.م و آرای وحدت رویه دیوان عالی',
    badge: 'قانون‌محور',
    defaultActive: true,
  },
  {
    id: 'case_facts_disputes',
    label: 'شرح ماوقع و تعارضات مستخرج از پرونده',
    shortDesc: 'روایت موشکافانه تخلفات، تناقضات ادعایی و دفاع ماهوی',
    badge: 'واقع‌محور',
    defaultActive: true,
  },
  {
    id: 'procedural_defenses',
    label: 'ایرادات شکلی، صلاحیت دادگاه و مواعد قانونی',
    shortDesc: 'ایرادات ماده ۸۴ ق.آ.د.م، صلاحیت ذاتی/محلی و رعایت مواعد ثنا',
    badge: 'شکل‌محور',
    defaultActive: false,
  },
  {
    id: 'evidentiary_proof',
    label: 'ادله اثبات دعوا و امارات قضایی',
    shortDesc: 'فهرست‌بندی ادله ابرازی شامل اسناد رسمی، استعلامات و نظر کارشناس',
    badge: 'دلیل‌محور',
    defaultActive: false,
  },
];

export interface AiDraftingRequest {
  pelak: PelakNode | null;
  documents: LegalDocument[];
  currentTemplate: LegalDraftTemplate;
  currentDraft: string;
  activeFoci: CitationFocusId[];
  actionType: 'full_draft' | 'insert_grounds' | 'rebuttal' | 'polish_rewrite' | 'custom_prompt';
  customPrompt?: string;
  apiKey?: string | null;
}

/**
 * تولید یا بازنویسی هوشمند متن حقوقی متناسب با شواهد پرونده و محورهای استناد انتخابی
 */
export async function generateAiLegalDraft(req: AiDraftingRequest): Promise<string> {
  const { pelak, documents, currentTemplate, currentDraft, activeFoci, actionType, customPrompt, apiKey } = req;
  const today = getTodayShamsi();

  // Try direct Gemini if API key available in local storage or argument
  const effectiveKey = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('attorney_gemini_api_key') : null);

  if (effectiveKey && effectiveKey.trim().length > 10) {
    try {
      const geminiResult = await executeGeminiDrafting(effectiveKey.trim(), req);
      if (geminiResult) return geminiResult;
    } catch (err) {
      console.warn('Gemini drafting failed, using offline legal synthesis engine:', err);
    }
  }

  // Fallback to high-fidelity Offline Persian Judicial Drafting Engine
  return synthesizeOfflineLegalDraft(req);
}

async function executeGeminiDrafting(key: string, req: AiDraftingRequest): Promise<string | null> {
  const { pelak, documents, currentTemplate, currentDraft, activeFoci, actionType, customPrompt } = req;
  const today = getTodayShamsi();

  const activeFocusLabels = CITATION_FOCUS_OPTIONS
    .filter((f) => activeFoci.includes(f.id))
    .map((f) => `• ${f.label} (${f.shortDesc})`)
    .join('\n');

  const docsContext = documents.map((d, i) =>
    `[سند شماره ${i + 1}] عنوان: ${d.title} | شماره ثبت/دادنامه: ${d.documentNumber} | تاریخ: ${d.issueDate} | مرجع صدور: ${d.authority} | خواهان: ${d.parties.claimant || '-'} | خوانده: ${d.parties.defendant || '-'} | خلاصه: ${d.summary}`
  ).join('\n\n');

  const actionInstruction =
    actionType === 'full_draft'
      ? 'تنظیم یک دادخواست یا لایحه جامع، رسمی و کامل دادگستری متناسب با قالب انتخابی و شواهد این پرونده'
      : actionType === 'insert_grounds'
      ? 'تنظیم یک بند حقوقی مستحکم شامل استنادات دقیق به اسناد رسمی موجود در پرونده و مواد قانونی جهت درج در لایحه'
      : actionType === 'rebuttal'
      ? 'تنظیم بخش پاسخ به ادعاهای طرف مقابل (خوانده/خواهان) و رد ادله ابرازی ایشان مستند به اسناد این پرونده'
      : actionType === 'polish_rewrite'
      ? 'بازنویسی ادبی و ساختاریافته متن جاری با لحن فاخر قضایی و تقویت استدلال‌های حقوقی'
      : `انجام درخواست وکیل: "${customPrompt || ''}"`;

  const prompt = `شما یک مستشار ارشد حقوقی و وکیل پایه یک دادگستری در نظام قضایی ایران هستید.
وظیفه شما نگارش متن دادخواست یا لایحه قضایی رسمی، فاخر، بدون هذیان و دقیقاً منطبق بر شواهد پرونده زیر است:

مشخصات پرونده فعال:
- عنوان پرونده: ${pelak?.title || 'پرونده حقوقی'}
- کلاسه / پلاک ثبتی: ${pelak?.code || 'نامشخص'}
- موضوع و حوزه دعوا: ${pelak?.dossierDomain || 'حقوقی عمومی'}
- موکل: ${pelak?.ownerName || 'موکل'}
- بخش ثبتی: ${pelak?.sector || 'تهران'}

مدارک و اسناد مستند موجود در پرونده:
${docsContext || 'سند ضمیمه‌ای ثبت نشده است، بر اساس مشخصات کلی اقدام شود.'}

قالب حقوقی مبنا: ${currentTemplate.title} (${currentTemplate.category})
مواد قانونی پیشنهادی قالب: ${currentTemplate.legalBasis.join(' - ')}

متن جاری ویرایشگر:
"""
${currentDraft.slice(0, 1500)}
"""

محورهای استناد الزامی وکیل برای این لایحه:
${activeFocusLabels || '• استناد متعارف به اصول حقوقی'}

دستور کار مشخص:
${actionInstruction}

قواعد حیاتی:
۱. تمام استنادها به شماره سندها، تاریخ‌ها و طرفین باید صرفاً بر اساس مدارک فوق باشد. از ذکر شماره سند یا طرفین خیالی و جعلی اکیداً خودداری کنید.
۲. فرمت خروجی باید کاملاً متن رسمی دادخواست یا لایحه، آماده چاپ و تقدیم به دادگاه باشد (با سلام و احترام، مقدمه، شرح ماوقع و ادله، خواسته پایانی).
۳. بدون هیچ مقدمه‌چینی اضافی مستقیماً متن حقوقی را تولید فرمایید.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 3000,
      },
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() || null;
}

/**
 * موتور استدلال آفلاین و نگارش دادخواست بر اساس شواهد واقعی پرونده
 */
function synthesizeOfflineLegalDraft(req: AiDraftingRequest): string {
  const { pelak, documents, currentTemplate, currentDraft, activeFoci, actionType, customPrompt } = req;
  const today = getTodayShamsi();

  const clientName = pelak?.ownerName || 'موکل محترم';
  const pelakCode = pelak?.code || 'پلاک متنازع‌فیه';
  const sector = pelak?.sector || 'حوزه ثبتی تهران';
  const domain = pelak?.dossierDomain || 'contracts';

  const primaryDoc = documents[0];
  const defendantName = primaryDoc?.parties.defendant || 'خوانده محترم پرونده';
  const courtBranch = primaryDoc?.authority || 'شعبه محترم دادگاه عمومی حقوقی';
  const caseNumber = primaryDoc?.documentNumber || 'کلاسه پرونده';

  // Build citation paragraphs based on active foci
  const sections: string[] = [];

  // Header
  sections.push(`ریاست محترم و مستشاران عالی‌مقام ${courtBranch}`);
  sections.push(`موضوع: ${currentTemplate.title}`);
  sections.push(`خواهان / موکل: ${clientName} | خوانده / مشتکی‌عنه: ${defendantName}`);
  sections.push(`شماره پرونده / پلاک: ${pelakCode} واقع در حوزه ${sector}`);
  sections.push(`\nبا سلام و تحیات وافره،\nاحتراماً اینجانب به وکالت از خواهان/موکل، در خصوص موضوع دعوای معنونه، مراتب ذیل را مستنداً به شواهد متقن پرونده و موازین قانونی به استحضار می‌رساند:\n`);

  // Section 1: Facts & Contradictions (if active)
  if (activeFoci.includes('case_facts_disputes')) {
    sections.push(`۱. شرح ماوقع و مبانی ماهوی استحقاق موکل:`);
    if (documents.length > 0) {
      const docSnippets = documents.slice(0, 3).map((d) =>
        `به موجب «${d.title}» مورخ ${d.issueDate} صادره از ${d.authority} (به شماره ${d.documentNumber})، حقوق قانونی و مکتسبه موکل بر رقبه متنازع‌فیه محرز و مستقر بوده است. متأسفانه طرف مقابل با نقض صریح تعهدات و عدول از موازین قانونی، موجبات تضییع حقوق موکل را فراهم آورده است.`
      ).join('\n');
      sections.push(docSnippets);
    } else {
      sections.push(`موکل بر اساس اسناد و توافقات فی‌مابین به تمامیت تکالیف قانونی خویش عمل نموده؛ لکن خوانده از انجام تعهدات قانونی خودداری ورزیده است.`);
    }
  }

  // Section 2: Deed & Registry References (if active)
  if (activeFoci.includes('deed_registry')) {
    sections.push(`\n۲. استناد صریح به اسناد رسمی مالکیت و سوابق ثبتی:`);
    if (documents.length > 0) {
      documents.forEach((d, idx) => {
        sections.push(
          `• سند ردیف (${toPersianDigits(idx + 1)}): سند شماره ${d.documentNumber} مورخ ${d.issueDate} تحت عنوان «${d.title}» که دلالت قطعی بر مشروعیت ادعای موکل داشته و اصل صحت معاملات موضوعه را اثبات می‌نماید.`
        );
      });
    } else {
      sections.push(`• اسناد مالکیت تنظیمی و سوابق مضبوط در پلاک ثبتی ${pelakCode} مؤید استقرار حق موکل می‌باشد.`);
    }
  }

  // Section 3: Statutory & Civil Code Articles (if active)
  if (activeFoci.includes('statutory_articles')) {
    sections.push(`\n۳. مبانی قانونی و اصول فقهی حاکم بر دعوا:`);
    currentTemplate.legalBasis.forEach((basis) => {
      sections.push(`• استناد به ${basis}`);
    });
    if (domain === 'contracts') {
      sections.push(`• استناد به ماده ۱۰ و ۲۱۹ قانون مدنی (اصل لزوم قراردادها) و ماده ۲۳۰ قانون مدنی پیرامون خسارت تاخیر تادیه.`);
    } else if (domain === 'commercial') {
      sections.push(`• استناد به ماده ۲۳ اصلاحی قانون صدور چک و ماده ۵۲۲ قانون آیین دادرسی مدنی در خصوص مطالبات وجه و شاخص تورم.`);
    } else if (domain === 'criminal') {
      sections.push(`• استناد به قانون مجازات راجع به انتقال مال غیر مصوب ۱۳۰۸ و ماده ۱ قانون تشدید مجازات مرتکبین ارتشاء و کلاهبرداری.`);
    } else {
      sections.push(`• استناد به ماده ۲۲، ۴۶ و ۴۸ قانون ثبت اسناد و املاک و قاعده فقهی لاضرر.`);
    }
  }

  // Section 4: Procedural Defenses (if active)
  if (activeFoci.includes('procedural_defenses')) {
    sections.push(`\n۴. ایرادات شکلی و مواعد قانونی (آیین دادرسی):`);
    sections.push(`• دعوای حاضر در فرجه‌های قانونی مقرر و با رعایت کامل قواعد صلاحیت محلی و ذاتی دادگاه محترم اقامه گردیده است.`);
    sections.push(`• هرگونه ادعای متقابل خوانده به دلیل انقضای مواعد قانونی و عدم رعایت تشریفات مصرح در قانون آیین دادرسی مدنی، محکوم به رد می‌باشد.`);
  }

  // Section 5: Evidentiary Proof (if active)
  if (activeFoci.includes('evidentiary_proof')) {
    sections.push(`\n۵. فهرست ادله و امارات اثبات دعوا:`);
    sections.push(`۱) تصویر مصدق کلیه اسناد و مدارک مضبوط در کارتابل پرونده به شماره ${pelakCode}`);
    sections.push(`۲) استعلام رسمی سوابق از اداره ثبت اسناد و املاک حوزه ${sector}`);
    sections.push(`۳) ارجاع امر به کارشناس رسمی دادگستری در صورت صلاحدید محکمه محترم`);
    sections.push(`۴) شهادت شهود و مطلعین و عنداللزوم اتیان سوگند شرعی`);
  }

  // Conclusion
  sections.push(`\nبناءً علی‌هذا، با عنایت به جمیع مراتب معروضه و انطباق کامل ادله با موازین قانونی، صدور حکم شایسته بر وفق ستون خواسته به انضمام خسارات دادرسی و حق‌الوکاله وکیل وفق تعرفه قانونی مورد استدعاست.\n\nبا تجدید احترام،\nوکیل خواهان - تاریخ تنظیم: ${today}`);

  return sections.join('\n');
}
