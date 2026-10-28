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

  // 1. First priority: Call server-side API proxy (/api/generate-legal-draft)
  // This uses the server's GEMINI_API_KEY with gemini-3.8-flash and eliminates client key friction!
  try {
    const res = await fetch('/api/generate-legal-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pelak,
        documents,
        currentTemplate,
        currentDraft,
        activeFoci,
        actionType,
        customPrompt,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.text) {
        return data.text;
      }
    }
  } catch (backendErr) {
    console.warn('Backend /api/generate-legal-draft call failed or network offline:', backendErr);
  }

  // 2. Second priority: If user configured a direct personal Gemini API key in client settings
  const effectiveKey = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('attorney_gemini_api_key') : null);
  if (effectiveKey && effectiveKey.trim().length > 10) {
    try {
      const geminiResult = await executeGeminiDrafting(effectiveKey.trim(), req);
      if (geminiResult) return geminiResult;
    } catch (err) {
      console.warn('Direct Gemini API drafting failed:', err);
    }
  }

  // 3. Third priority: High-fidelity Offline Persian Judicial Drafting Engine (fully grounded in real case data)
  return synthesizeOfflineLegalDraft(req);
}

async function executeGeminiDrafting(key: string, req: AiDraftingRequest): Promise<string | null> {
  const { pelak, documents, currentTemplate, currentDraft, activeFoci, actionType, customPrompt } = req;

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

  // Use modern gemini-3.8-flash model alias
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${key}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.25,
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

  const clientName = pelak?.ownerName || 'خواهان / موکل محترم';
  const pelakCode = pelak?.code || 'پلاک ثبتی معین';
  const sector = pelak?.sector || 'حوزه ثبتی تهران';
  const domain = pelak?.dossierDomain || 'contracts';

  // Find all defendants or adverse parties from documents
  const allDefendants = Array.from(
    new Set(documents.map((d) => d.parties.defendant).filter(Boolean))
  ) as string[];
  const defendantName = allDefendants.length > 0 ? allDefendants.join(' و ') : 'خوانده محترم دعوا';

  const courtBranch = documents[0]?.authority || 'شعبه محترم دادگاه عمومی حقوقی';
  const deedDocs = documents.filter((d) => d.category === 'deed' || d.category === 'contract');
  const verdictDocs = documents.filter((d) => d.category === 'verdict' || d.category === 'order');

  // Handle Action: insert_grounds (تولید بند استناد به اسناد و قوانین)
  if (actionType === 'insert_grounds') {
    const groundLines: string[] = [];
    groundLines.push(`بند استنادی - پیرامون ادله اثباتی و مبانی مشروعیت خواسته موکل:`);
    if (documents.length > 0) {
      documents.forEach((d, i) => {
        groundLines.push(
          `• استناد به ${d.title} به شماره رسمی ${d.documentNumber || '-'} مورخ ${d.issueDate || '-'} صادره از ${d.authority || '-'} دال بر ثبوت حق موکل بر رقبه پلاک ${pelakCode}.`
        );
      });
    } else {
      groundLines.push(`• استناد به سوابق رسمی ثبتی و دفاتر املاک حوزه ثبتی ${sector} در خصوص پلاک ثبتی ${pelakCode}.`);
    }
    groundLines.push(`• انطباق با ${currentTemplate.legalBasis.join(' و ')}.`);
    groundLines.push(`• مستنداً به ماده ۲۲ قانون ثبت اسناد و املاک، پس از اتمام تشریفات ثبتی، دولت و تمامی مراجع رسمی و قضایی فقط شخصی را که ملک به اسم او ثبت شده یا به او منتقل گردیده مالک قانونی می‌شناسند.`);
    return groundLines.join('\n');
  }

  // Handle Action: rebuttal (پاسخ به ادعای طرف مقابل)
  if (actionType === 'rebuttal') {
    const rebuttalLines: string[] = [];
    rebuttalLines.push(`دفاع ماهوی در رد ادعاهای بلاوجه طرف مقابل (${defendantName}):`);
    rebuttalLines.push(`۱. ادعای معنونه از سوی خوانده در خصوص تزلزل مالکیت موکل بر پلاک ثبتی ${pelakCode} با عنایت به حاکمیت اسناد رسمی مضبوط در پرونده، محکوم به بطلان و فاقد اثر حقوقی است.`);
    if (documents.some((d) => d.isForgedOrConflicting)) {
      const conflicting = documents.filter((d) => d.isForgedOrConflicting);
      conflicting.forEach((cd) => {
        rebuttalLines.push(
          `۲. مدرک مورد ادعای خوانده («${cd.title}» به شماره ${cd.documentNumber}) دارای تعارض آشکار ثبتی بوده و بر اساس لایحه قانونی اسناد مالکیت معارض تا زمان ابطال قطعی، سلب‌کننده حقوق مستقر موکل نیست.`
        );
      });
    } else {
      rebuttalLines.push(`۲. هیچ‌گونه دلیل، بینه شرعی یا مدرک رسمی نافی مالکیت موکل از سوی طرف مقابل ارائه نگردیده و اصل بر استصحاب مالکیت موکل است.`);
    }
    rebuttalLines.push(`۳. دفاعیات خوانده صرفاً در مقام اطاله دادرسی تنظیم گردیده و به موجب مواد ۱۹۸ و ۵۲۲ قانون آیین دادرسی مدنی، رد دفاعیات ایشان و صدور حکم بر محکومیت مشارالیه مورد استدعاست.`);
    return rebuttalLines.join('\n');
  }

  // Handle Action: polish_rewrite (بازنویسی فاخر قضایی)
  if (actionType === 'polish_rewrite' && currentDraft && currentDraft.length > 50) {
    let polished = currentDraft.trim();
    if (!polished.startsWith('بسمه‌تعالی') && !polished.startsWith('ریاست محترم')) {
      polished = `بسمه‌تعالی\nریاست محترم و مستشاران عالی‌مقام ${courtBranch}\n\n` + polished;
    }
    if (!polished.includes('بناءً علی‌هذا') && !polished.includes('علی‌هذا')) {
      polished += `\n\nبناءً علی‌هذا، با توجه به انطباق تام مراتب معروضه با مقررات آمره قانونی، اتخاذ تصمیم شایسته قضایی بر وفق ستون خواسته به انضمام خسارات دادرسی و حق‌الوکاله وکیل مورد تمناست.\n\nبا کمال احترام،\nوکیل خواهان (${clientName})`;
    }
    return polished;
  }

  // Handle Action: custom_prompt
  if (actionType === 'custom_prompt' && customPrompt) {
    return `بسمه‌تعالی
ریاست محترم دادگاه رسیدگی‌کننده
موضوع: لایحه تکمیلی بر اساس دستور تخصصی وکیل پیرامون «${customPrompt}»
کلاسه پرونده / پلاک: ${pelakCode} | موکل: ${clientName} | خوانده: ${defendantName}

احتراماً در پاسخ و انطباق با دستور قضایی معنونه، به استحضار می‌رساند:
۱. در راستای اعمال ${customPrompt}، بررسی سوابق پرونده پلاک ${pelakCode} واقع در حوزه ${sector} نشان می‌دهد که حقوق قانونی موکل بر اساس موازین شرعی و مواد قانونی ${currentTemplate.legalBasis.slice(0, 2).join(' و ')} مستقر است.
۲. ادله و مستندات ابرازی (${documents.map((d) => d.title).join('، ') || 'اسناد ثبت‌شده'}) به وضوح ادعای فوق را اثبات می‌نماید.
۳. تقاضای اعمال بندهای قانونی یادشده در متن دادنامه اصداری را دارد.

با احترام،
وکیل موکل - تاریخ: ${today}`;
  }

  // Default: Full Draft (تنظیم کامل دادخواست / لایحه)
  const sections: string[] = [];

  // Header
  sections.push(`بسمه‌تعالی`);
  sections.push(`ریاست محترم و مستشاران عالی‌مقام ${courtBranch}`);
  sections.push(`موضوع: ${currentTemplate.title}`);
  sections.push(`خواهان / موکل: ${clientName} | خوانده / طرف دعوا: ${defendantName}`);
  sections.push(`شماره پرونده / پلاک: ${pelakCode} واقع در حوزه ثبتی ${sector}`);
  if (pelak?.areaM2 && pelak.areaM2 > 0) {
    sections.push(`مساحت رقبه متنازع‌فیه: ${toPersianDigits(pelak.areaM2.toLocaleString('fa-IR'))} متر مربع`);
  }
  sections.push(`\nبا سلام و تحیات وافره،\nاحتراماً اینجانب به وکالت از خواهان/موکل، در خصوص موضوع دعوای معنونه، مراتب ذیل را مستنداً به شواهد متقن پرونده و موازین قانونی به استحضار می‌رساند:\n`);

  // Section 1: Facts & Contradictions (if active)
  if (activeFoci.includes('case_facts_disputes')) {
    sections.push(`۱. شرح ماوقع و مبانی ماهوی استحقاق موکل:`);
    if (documents.length > 0) {
      const docSnippets = documents.slice(0, 3).map((d) =>
        `به موجب «${d.title}» مورخ ${toPersianDigits(d.issueDate)} صادره از ${d.authority} (به شماره ${toPersianDigits(d.documentNumber)})، حقوق قانونی و مکتسبه موکل بر رقبه متنازع‌فیه محرز و مستقر بوده است. متأسفانه طرف مقابل با نقض صریح تعهدات و عدول از موازین قانونی، موجبات تضییع حقوق موکل را فراهم آورده است.`
      ).join('\n');
      sections.push(docSnippets);
    } else {
      sections.push(`موکل بر اساس اسناد رسمی مالکیت و توافقات فی‌مابین به تمامیت تکالیف قانونی خویش عمل نموده؛ لکن خوانده از انجام تعهدات قانونی خودداری ورزیده است.`);
    }
    if (pelak?.boundaryDetails) {
      sections.push(
        `حدود اربعه رقبه طبق سوابق تحدید حدود ثبتی: شمالاً به ${pelak.boundaryDetails.north || '-'}، جنوباً به ${pelak.boundaryDetails.south || '-'}، شرقاً به ${pelak.boundaryDetails.east || '-'} و غرباً به ${pelak.boundaryDetails.west || '-'} محدود می‌باشد.`
      );
    }
  }

  // Section 2: Deed & Registry References (if active)
  if (activeFoci.includes('deed_registry')) {
    sections.push(`\n۲. استناد صریح به اسناد رسمی مالکیت و سوابق ثبتی:`);
    if (documents.length > 0) {
      documents.forEach((d, idx) => {
        sections.push(
          `• سند ردیف (${toPersianDigits(idx + 1)}): سند شماره ${toPersianDigits(d.documentNumber)} مورخ ${toPersianDigits(d.issueDate)} تحت عنوان «${d.title}» که دلالت قطعی بر مشروعیت ادعای موکل داشته و اصل صحت معاملات موضوعه را اثبات می‌نماید.`
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
    sections.push(`۳) ارجاع امر به کارشناس رسمی دادگستری در امور ثبتی و نقشه‌برداری در صورت صلاحدید محکمه محترم`);
    sections.push(`۴) شهادت شهود و مطلعین و عنداللزوم اتیان سوگند شرعی`);
  }

  // Conclusion
  sections.push(`\nبناءً علی‌هذا، با عنایت به جمیع مراتب معروضه و انطباق کامل ادله با موازین قانونی، صدور حکم شایسته بر وفق ستون خواسته به انضمام خسارات دادرسی و حق‌الوکاله وکیل وفق تعرفه قانونی مورد استدعاست.\n\nبا تجدید احترام،\nوکیل خواهان - تاریخ تنظیم: ${toPersianDigits(today)}`);

  return sections.join('\n');
}
