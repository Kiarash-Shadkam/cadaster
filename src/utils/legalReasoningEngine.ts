import { PelakNode, LegalDocument, DisputeAlert, TimelineItem, ChatMessage } from '../types/cadastre';
import { toPersianDigits } from './persian';

export interface LegalAnalysisInput {
  message: string;
  pelakData?: PelakNode | null;
  allPelaks?: PelakNode[];
  documents: LegalDocument[];
  disputes: DisputeAlert[];
  timeline: TimelineItem[];
  history?: ChatMessage[];
  apiKey?: string | null;
}

/**
 * Executes a full legal query analysis.
 * Prioritizes:
 * 1. Client-provided Gemini API key (if set for live AI directly on GitHub Pages)
 * 2. Backend /api/legal-chat (if running in full-stack Node environment)
 * 3. Deep Offline & Dynamic Persian Legal Reasoning Engine (fully customized to user question & loaded documents)
 */
export async function generateLegalResponse(input: LegalAnalysisInput): Promise<string> {
  const { message, pelakData, documents, disputes, timeline, history = [], apiKey } = input;

  // 1. Try Direct Client-Side Gemini if user has configured an API key
  const effectiveApiKey = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('attorney_gemini_api_key') : null);
  if (effectiveApiKey && effectiveApiKey.trim().length > 10) {
    try {
      const directAiResult = await callDirectGeminiApi(effectiveApiKey.trim(), message, pelakData, documents, disputes, timeline, history);
      if (directAiResult) {
        return directAiResult;
      }
    } catch (err) {
      console.warn('Direct Gemini API call failed, falling back to reasoning engine:', err);
    }
  }

  // 2. Try Backend API if running with local server (with a 2-second timeout to avoid waiting on GitHub Pages)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);

    const response = await fetch('/api/legal-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        pelakId: pelakData?.id || 'all',
        pelakData: pelakData || null,
        documents,
        disputes,
        timeline,
        history: history.slice(-6),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.reply) {
        return data.reply;
      }
    }
  } catch {
    // Expected on static GitHub Pages; smoothly fall back to our deep legal reasoning engine
  }

  // 3. Comprehensive Dynamic Persian Legal Reasoning Engine
  return synthesizeClientLegalAnalysis(message, pelakData, documents, disputes, timeline, history);
}

/**
 * Direct call to Google Gemini API from client (works on GitHub Pages if user enters their key)
 */
async function callDirectGeminiApi(
  key: string,
  message: string,
  pelakData?: PelakNode | null,
  documents: LegalDocument[] = [],
  disputes: DisputeAlert[] = [],
  timeline: TimelineItem[] = [],
  history: ChatMessage[] = []
): Promise<string | null> {
  const docSummary = documents.map((d, i) =>
    `[سند ${toPersianDigits(i + 1)}] عنوان: ${d.title} | شماره: ${d.documentNumber || '-'} | تاریخ: ${d.issueDate || '-'} | دسته: ${d.category} | خلاصه: ${d.summary || '-'}`
  ).join('\n');

  const disputeSummary = disputes.map((disp, i) =>
    `[اختلاف ${toPersianDigits(i + 1)}] موضوع: ${disp.title} (${disp.disputeType}) | کلاسه: ${disp.caseNumber} | شعبه: ${disp.courtBranch}`
  ).join('\n');

  const systemPrompt = `شما یک مستشار ارشد حقوقی و وکیل پایه یک دادگستری باسابقه در محاکم دادگستری جمهوری اسلامی ایران هستید.
پاسخ‌های شما باید کاملاً مستدل، مبتنی بر مواد دقیق قوانین ایران (قانون مدنی، آیین دادرسی مدنی و کیفری، قانون صدور چک، قانون ثبت، قانون مجازات اسلامی و رویه قضایی دیوان عالی کشور) و دارای لحن رسمی، موشکافانه و تخصصی باشد.
همیشه پاسخ را به طور مشخص و مستقیم به سوال مطرح شده متصل کنید و از مدارک پرونده پیوست در تحلیل خود بهره بگیرید.`;

  const prompt = `مشخصات پرونده فعال:
عنوان پرونده: ${pelakData?.title || 'پرونده جاری'} (کد/پلاک: ${pelakData?.code || 'عمومی'})
حوزه پرونده: ${pelakData?.dossierDomain || 'نامشخص'}
موکل: ${pelakData?.ownerName || 'موکل پرونده'}

مدارک ضبط شده در پرونده (${toPersianDigits(documents.length)} سند):
${docSummary || 'مدرکی در کارتابل ضبط نشده است.'}

اختلافات و دعاوی مطروحه:
${disputeSummary || 'اختلافی ثبت نشده است.'}

پرسش مشخص وکیل / کاربر:
"${message}"

لطفاً پاسخی مستدل، ساختاریافته و دارای مواد قانونی، تحلیل ادله موجود و اقدامات پیشنهادی بعدی ارائه دهید.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 2500,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.statusText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || null;
}

/**
 * Deep Client-side Legal Reasoning & Document Analysis Engine.
 * Dynamically parses the user's specific query, examines loaded evidence,
 * applies statutory articles, and generates a tailored Persian legal memorandum.
 */
function synthesizeClientLegalAnalysis(
  query: string,
  pelakData?: PelakNode | null,
  documents: LegalDocument[] = [],
  disputes: DisputeAlert[] = [],
  timeline: TimelineItem[] = [],
  _history: ChatMessage[] = []
): string {
  const q = query.trim().toLowerCase();
  const title = pelakData?.title || 'پرونده جاری';
  const owner = pelakData?.ownerName || 'موکل';
  const pelakCode = pelakData?.code || 'عمومی';

  // 1. Identify Target Documents mentioned in query or relevant to query
  const matchedDocs = documents.filter((doc) => {
    const docTitle = doc.title.toLowerCase();
    const docNum = (doc.documentNumber || '').toLowerCase();
    const docSummary = (doc.summary || '').toLowerCase();
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    return (
      docTitle.includes(q) ||
      words.some((w) => docTitle.includes(w) || docNum.includes(w) || docSummary.includes(w))
    );
  });

  // 2. Identify Primary Legal Intention
  const isDraftRequest =
    q.includes('لایحه') ||
    q.includes('دادخواست') ||
    q.includes('شکواییه') ||
    q.includes('اظهارنامه') ||
    q.includes('متن لایحه') ||
    q.includes('نمونه لایحه') ||
    q.includes('پیش‌نویس') ||
    q.includes('پیش نویس');

  const isChequeOrCommercial =
    q.includes('چک') ||
    q.includes('صیاد') ||
    q.includes('سیاق') ||
    q.includes('ماده ۲۳') ||
    q.includes('سفته') ||
    q.includes('برات') ||
    q.includes('ظهرنویس') ||
    q.includes('ضامن') ||
    q.includes('گواهی عدم پرداخت') ||
    q.includes('کسری موجودی') ||
    pelakData?.dossierDomain === 'commercial';

  const isCriminalOrFraud =
    q.includes('کلاهبرداری') ||
    q.includes('خیانت در امانت') ||
    q.includes('جعل') ||
    q.includes('انتقال مال غیر') ||
    q.includes('فروش مال غیر') ||
    q.includes('کیفری') ||
    q.includes('دادسرا') ||
    q.includes('بازپرس') ||
    q.includes('کیفرخواست') ||
    q.includes('ردیابی حساب') ||
    pelakData?.dossierDomain === 'criminal';

  const isRealEstateOrCadastre =
    q.includes('ملک') ||
    q.includes('پلاک') ||
    q.includes('تداخل') ||
    q.includes('افراز') ||
    q.includes('تفکیک') ||
    q.includes('سند رسمی') ||
    q.includes('ماده ۲۲') ||
    q.includes('سند معارض') ||
    q.includes('خلع ید') ||
    q.includes('تصرف عدوانی') ||
    q.includes('تحدید حدود') ||
    q.includes('ثبت اسناد') ||
    pelakData?.dossierDomain === 'real_estate';

  const isContractOrBreach =
    q.includes('قرارداد') ||
    q.includes('مبایعه‌نامه') ||
    q.includes('قولنامه') ||
    q.includes('فسخ') ||
    q.includes('انفساخ') ||
    q.includes('بطلان') ||
    q.includes('وجه التزام') ||
    q.includes('خسارت تاخیر') ||
    q.includes('تاخیر تادیه') ||
    q.includes('تعهدات') ||
    q.includes('خیار') ||
    pelakData?.dossierDomain === 'contracts';

  const isProvisionalOrEvidence =
    q.includes('دستور موقت') ||
    q.includes('تامین خواسته') ||
    q.includes('تامین دلیل') ||
    q.includes('توقیف اموال') ||
    q.includes('ماده ۱۰۸') ||
    q.includes('ماده ۳۱۰') ||
    q.includes('خسارت احتمالی');

  const isInheritanceOrPartition =
    q.includes('ارث') ||
    q.includes('ترکه') ||
    q.includes('انحصار وراثت') ||
    q.includes('تقسیم ترکه') ||
    q.includes('تحریر ترکه') ||
    q.includes('مورث') ||
    pelakData?.dossierDomain === 'inheritance';

  // 3. Document Analysis Synthesis
  const docCount = documents.length;
  let evidenceSynthesis = '';
  if (matchedDocs.length > 0) {
    evidenceSynthesis = `مدارک مستقیم منطبق با پرسش شما در پرونده «${title}»:\n` +
      matchedDocs.slice(0, 3).map((d) =>
        `• **${d.title}** (شماره: \`${toPersianDigits(d.documentNumber || 'فاقد شماره')}\` - تاریخ: ${toPersianDigits(d.issueDate || 'نامشخص')}):\n  ${d.summary || 'خلاصه ثبت‌شده در کارتابل موید ارتباط موضوعی است.'}`
      ).join('\n');
  } else if (docCount > 0) {
    evidenceSynthesis = `در کارتابل این پرونده تعداد ${toPersianDigits(docCount)} مدرک ضبط گردیده است:\n` +
      documents.slice(0, 3).map((d) =>
        `• **${d.title}** (${d.category === 'contract' ? 'قرارداد' : d.category === 'verdict' ? 'دادنامه' : 'سند مدرکی'}) - مرجع/صادرکننده: ${d.authority || 'نامشخص'}`
      ).join('\n') +
      (docCount > 3 ? `\n• و ${toPersianDigits(docCount - 3)} مدرک تکمیلی دیگر.` : '');
  } else {
    evidenceSynthesis = 'در حال حاضر مدرکی در کارتابل این پرونده بارگذاری نشده است؛ فلذا تحلیل بر مبنای موازین عام قانونی و رویه حاکم ارائه می‌گردد.';
  }

  // 4. Generate Branch-Specific Response
  if (isDraftRequest) {
    return generateDraftPetitionResponse(q, title, owner, pelakCode, documents, isChequeOrCommercial, isCriminalOrFraud, isRealEstateOrCadastre, isContractOrBreach);
  }

  if (isChequeOrCommercial) {
    return generateChequeAnalysis(query, title, owner, documents, disputes, evidenceSynthesis);
  }

  if (isCriminalOrFraud) {
    return generateCriminalAnalysis(query, title, owner, documents, disputes, evidenceSynthesis);
  }

  if (isRealEstateOrCadastre) {
    return generateRealEstateAnalysis(query, title, owner, pelakCode, documents, disputes, evidenceSynthesis);
  }

  if (isContractOrBreach) {
    return generateContractAnalysis(query, title, owner, documents, disputes, evidenceSynthesis);
  }

  if (isProvisionalOrEvidence) {
    return generateInjunctionAnalysis(query, title, owner, documents, evidenceSynthesis);
  }

  if (isInheritanceOrPartition) {
    return generateInheritanceAnalysis(query, title, owner, documents, evidenceSynthesis);
  }

  // General Law & Comprehensive Advisory
  return generateGeneralLegalAdvisory(query, title, owner, pelakCode, documents, disputes, evidenceSynthesis);
}

// -----------------------------------------------------------------------------
// Detailed Branch Generators
// -----------------------------------------------------------------------------

function generateChequeAnalysis(
  query: string,
  title: string,
  owner: string,
  documents: LegalDocument[],
  _disputes: DisputeAlert[],
  evidenceSynthesis: string
): string {
  const hasSayadMention = query.includes('صیاد') || query.includes('بنفش') || query.includes('شناسه');
  const hasKhesaratMention = query.includes('خسارت') || query.includes('تاخیر') || query.includes('تورم');

  return `### ⚖️ تحلیل حقوقی اسناد تجاری و مطالبات وجه چک در پرونده «${title}»
**موکل:** ${owner}

#### ۱. موازین قانونی و ارکان اجرایی
۱. **ماده ۲۳ اصلاحی قانون صدور چک (مصوب ۱۳۹۷):**
   - دارنده چک صیادی که گواهینامه عدم پرداخت ممهور به کد رهگیری بانک مرکزی را اخذ نموده، نیازی به تقدیم دادخواست ماهوی و طی مراحل طولانی رسیدگی بدوی ندارد.
   - دادگاه حقوقی مکلف است حسب تقاضای دارنده، مستقیماً **اجراییه** علیه صادرکننده صادر نماید.
   - ظرف ۱۰ روز پس از ابلاغ اجراییه، متعهد مکلف به پرداخت یا معرفی مال است؛ در غیر این‌صورت مشمول قانون نحوه اجرای محکومیت‌های مالی (انسداد کلیه حساب‌ها و صدور برگ جلب) خواهد بود.

۲. **توقیف آنی از طریق سامانه سیاق (ماده ۵ مکرر قانون صدور چک):**
   - به محض ثبت عدم پرداخت در سامانه یکپارچه بانک مرکزی، تمامی حساب‌ها، کارت‌ها و تسهیلات صادرکننده در کلیه بانک‌ها و موسسات مالی کشور به میزان کسری چک مسدود می‌گردد.

${hasKhesaratMention ? `۳. **نحوه محاسبه خسارت تاخیر تادیه (ماده ۵۲۲ ق.آ.د.م و مصوبه مجمع تشخیص مصلحت نظام):**
   - خسارت تاخیر تادیه در چک از **تاریخ سررسید مندرج در متن چک** (و نه تاریخ برگشت یا تقدیم دادخواست) بر اساس شاخص تورم ماهانه بانک مرکزی محاسبه می‌گردد.` : ''}

${hasSayadMention ? `۴. **عدم ثبت چک در سامانه صیاد:**
   - اگر چک در سامانه صیاد ثبت نشده باشد، مشمول مزایای سند تجاری و صدور مستقیم اجراییه ماده ۲۳ نخواهد بود؛ لیکن به عنوان یک «سند عادی دین و اقرار کتبی بدهی» با استناد به ماده ۱۲۹۱ قانون مدنی در دادگاه حقوقی معتبر و قابل مطالبه است.` : ''}

#### ۲. ارزیابی ادله مضبوط در پرونده
${evidenceSynthesis}

#### ۳. نقشه راه و استراتژی پیشنهادی وکیل
۱. **مسیر نخست (سریع‌ترین اقدام):** تقدیم دادخواست «صدور اجراییه موضوع ماده ۲۳ قانون صدور چک» به محاکم عمومی حقوقی.
۲. **مسیر موازی (اجرای ثبت):** چنانچه صادرکننده دارای ملک ثبتی، خودرو یا خط تلفن همراه به نام خود باشد، اقدام از طریق دایره اجرای ثبت اسناد به مراتب سریع‌تر منجر به ممنوع‌الخروجی و بازداشت اموال می‌گردد.
۳. **توصیه تاکتیکی:** در صورتی که ظهرنویس یا ضامنی در پرونده وجود دارد، علیه آنها باید «دادخواست مطالبه وجه با قرار تامین خواسته فوری» داده شود، زیرا ماده ۲۳ صرفاً علیه صادرکننده و صاحب حساب مشترک جاری است.`;
}

function generateCriminalAnalysis(
  query: string,
  title: string,
  owner: string,
  documents: LegalDocument[],
  _disputes: DisputeAlert[],
  evidenceSynthesis: string
): string {
  const isKolahbardari = query.includes('کلاهبرداری') || query.includes('مانور متقلبانه');
  const isKhiyanat = query.includes('امانت') || query.includes('خیانت');

  return `### ⚖️ ارزیابی کیفری و تحلیل ارکان جرم در پرونده «${title}»
**شاکی/موکل:** ${owner}

#### ۱. موازین کیفری حاکم و تطبیق ارکان بزه
${isKolahbardari ? `۱. **بزه کلاهبرداری (ماده ۱ قانون تشدید مجازات مرتکبین ارتشا، اختلاس و کلاهبرداری):**
   - **رکن مادی:** توسل به وسایل متقلبانه، فریب دادن قربانی و بردن مال دیگری. صرف دروغگویی یا عدم ایفای تعهد کلاهبرداری نیست؛ بلکه «مانور متقلبانه» (استفاده از اسناد ساختگی، دفاتر صوری یا هویت دروغین) شرط اساسی تحقق جرم است.
   - **رکن معنوی:** سوءنیت عام (قصد توسل به شگرد متقلبانه) و سوءنیت خاص (قصد بردن و تصاحب مال شاکی).
   - **ضمانت‌اجرا:** حبس تعزیری از ۱ تا ۷ سال، رد مال مأخوذه به صاحبش و جزای نقدی معادل مال برده‌شده.` : ''}

${isKhiyanat ? `۲. **بزه خیانت در امانت (ماده ۶۷۴ قانون مجازات اسلامی - تعزیرات):**
   - ارکان: سپردن مال با شرط استرداد یا به مصرف معین رسانیدن، و سپس تصاحب، تلف، استعمال یا مفقود نمودن آن به ضرر مالک یا متصرف.
   - نکته حیاتی: اثبات «رابطه امانی» و تحویل اصل مال به متهم رکن اولیه است که با رسید، قرارداد یا شهادت شهود اثبات می‌شود.` : ''}

۳. **قواعد صلاحیت و شیوه طرح شکایت:**
   - دادسرای عمومی و انقلاب محل وقوع جرم (محل افتتاح حساب مقصد یا محل تسلیم مال) صالح به رسیدگی است (ماد ۳۱۰ قانون آیین دادرسی کیفری).

#### ۲. ارزیابی ادله و امارات موجود در کارتابل
${evidenceSynthesis}

#### ۳. نقشه راه اقدامات اولویت‌دار شاکی و وکیل
۱. **ردیابی مالی فوری (مسدودی وجوه):** در ابتدای شکواییه از بازپرس محترم تقاضا شود فوراً با ارسال دستور قضایی به پلیس فتا یا بانک مرکزی، کلیه وجوه انتقالی در حساب‌های متهم و حساب‌های متصل ردیابی و مسدود گردد.
۲. **جلوگیری از فرار متهم:** تقاضای صدور قرار ممنوع‌الخروجی متهم به استناد ماده ۱۸۸ قانون آیین دادرسی کیفری تا پیش از حضور در شعبه.
۳. **تامین خسارت (قرارهای تامین خواسته کیفری):** تقدیم دادخواست تامین خواسته کیفری بر مبنای ماده ۱۰۷ قانون آیین دادرسی کیفری جهت توقیف اموال منقول و غیرمنقول متهم بدون پرداخت خسارت احتمالی.`;
}

function generateRealEstateAnalysis(
  query: string,
  title: string,
  owner: string,
  pelakCode: string,
  documents: LegalDocument[],
  _disputes: DisputeAlert[],
  evidenceSynthesis: string
): string {
  const isTadakhol = query.includes('تداخل') || query.includes('تعارض') || query.includes('اشتباه');
  const isKhalYad = query.includes('خلع ید') || query.includes('تصرف');
  const isElzam = query.includes('الزام به تنظیم سند') || query.includes('تنظیم سند');

  return `### ⚖️ نظریه مستشاری در دعاوی ملکی و کاداستر پلاک «${pelakCode}»
**عنوان پرونده:** ${title} | **موکل:** ${owner}

#### ۱. مبانی حقوق ثبت و موازین آمره
۱. **حاکمیت مواد ۲۲، ۴۶، ۴۷ و ۴۸ قانون ثبت اسناد و املاک:**
   - دادگاه‌ها و ادارات دولتی تنها کسی را مالک می‌شناسند که ملک در دفتر املاک به نام او ثبت شده یا به موجب سند رسمی به او منتقل شده باشد. اسناد عادی تا پیش از تنفیذ قضایی یا صدور سند رسمی، صرفاً دال بر تعهد به انتقال هستند.

${isTadakhol ? `۲. **تداخل پلاک و اسناد معارض (لایحه قانونی اشتباهات ثبتی مصوب ۱۳۳۳):**
   - هرگاه برای تمام یا قسمتی از ملکی دو سند مالکیت صادر شود، سند دوم «معارض» تلقی شده و تا صدور حکم نهایی دادگاه ابطال نمی‌گردد؛ دارنده سند معارض حق انجام هیچ‌گونه معامله‌ای را ندارد.
   - مرجع تشخیص اولیه تعارض، هیأت نظارت اداره ثبت اسناد و املاک استان (ماده ۶ و ۲۵ قانون ثبت) و در صورت تجدیدنظرخواهی، شورای عالی ثبت است.` : ''}

${isKhalYad ? `۳. **دعوای خلع ید (رای وحدت رویه شماره ۶۷۲ دیوان عالی کشور):**
   - طرح دعوای خلع ید غاصبانه فرع بر اثبات مالکیت است. اگر موکل سند رسمی مالکیت نداشته باشد، دادگاه قرار رد دعوا صادر می‌کند. ابتدا باید دعوای اثبات مالکیت یا الزام به تنظیم سند اقامه شود.` : ''}

${isElzam ? `۴. **ارکان دعوای الزام به تنظیم سند رسمی:**
   - خواهان باید همزمان موارد زیر را در ستون خواسته قید نماید:
     الف) الزام خوانده به اخذ پایان‌کار شهرداری
     ب) الزام به اخذ صورتمجلس تفکیکی از اداره ثبت
     ج) الزام به فک رهن (در صورت در رهن بودن ملک)
     د) الزام به حضور در دفترخانه و انتقال رسمی سند انتقال مبیع.` : ''}

#### ۲. ارزیابی اسناد و سوابق ثبتی پرونده
${evidenceSynthesis}

#### ۳. استراتژی قضایی و اقدامات ضروری
۱. **قرار دستور موقت ثبتی (مواد ۳۱۰ الی ۳۲۵ ق.آ.د.م):**
   - جهت ممانعت از هرگونه نقل‌وانتقال یا ترهین مجدد ملک توسط خوانده، بلافاصله دادخواست دستور موقت مبنی بر «منع نقل و انتقال پلاک ثبتی» از طریق سامانه خدمات الکترونیک قضایی ثبت و به اداره ثبت محل ابلاغ گردد.
۲. **تامین دلیل با جلب نظر کارشناس رسمی دادگستری:**
   - قبل از هرگونه تغییرات فیزیکی یا ساخت‌وساز معارض، اجرای قرار تامین دلیل توسط شورای حل اختلاف با حضور کارشناس رسمی امور ثبتی و نقشه‌برداری جهت پیاده‌سازی مختصات UTM بر روی عرصه الزامی است.`;
}

function generateContractAnalysis(
  query: string,
  title: string,
  owner: string,
  documents: LegalDocument[],
  _disputes: DisputeAlert[],
  evidenceSynthesis: string
): string {
  const isFaskh = query.includes('فسخ') || query.includes('خیار') || query.includes('بطلان');
  const isVajh = query.includes('وجه التزام') || query.includes('خسارت') || query.includes('تاخیر');

  return `### ⚖️ تحلیل حقوقی قراردادها و ضمانت‌اجراهای نقض تعهد در پرونده «${title}»
**موکل:** ${owner}

#### ۱. اصول حاکم بر قراردادها و مواد قانونی
۱. **اصل لزوم و اعتبار شروط قراردادی (مواد ۱۰، ۲۱۹ و ۲۲۰ قانون مدنی):**
   - قراردادهای منعقده بین طرفین لازم‌الاتباع است مگر آنکه به رضای طرفین اقاله یا به علت قانونی فسخ شود. طرفین نه تنها به متن قرارداد بلکه به تمامی لوازم عرفی و قانونی آن ملزم هستند.

${isVajh ? `۲. **ماهیت وجه التزام قراردادی (ماده ۲۳۰ قانون مدنی):**
   - چنانچه در قرارداد مبلغی به عنوان خسارت عدم انجام یا تاخیر در انجام تعهد تعیین شده باشد، دادگاه نمی‌تواند خوانده را به بیشتر یا کمتر از آنچه توافق شده محکوم نماید. قاضی حق تعدیل وجه التزام مقطوع را ندارد.` : ''}

${isFaskh ? `۳. **قواعد فسخ و اعمال خیارات (مواد ۳۹۶ الی ۴۵۷ قانون مدنی):**
   - اعمال حق فسخ نیازمند اثبات تحقق شرط فاسخ است.
   - مهم: فسخ یک «عمل انشایی یک‌طرفه» است. وکیل ابتدا باید اظهارنامه رسمی مبنی بر اعلام فسخ به متعهد ابلاغ کند و سپس «دادخواست تایید و تنفیذ فسخ قرارداد» به دادگاه تقدیم نماید (دادگاه خود فسخ نمی‌کند بلکه وقوع فسخ را احراز و تایید می‌نماید).` : ''}

۴. **تعهدات متقابل و حق حبس (ماده ۳۷۷ قانون مدنی):**
   - هر یک از بایع و مشتری حق دارد از تسلیم مبیع یا ثمن تا زمان تسلیم طرف مقابل خودداری کند، مگر اینکه برای تحویل موعدی معین شده باشد.

#### ۲. تطبیق با اسناد و اوراق پرونده
${evidenceSynthesis}

#### ۳. گام‌های استراتژیک وکیل
۱. **ارسال اظهارنامه رسمی:** پیش از ثبت دادخواست در دفاتر خدمات قضایی، ارسال اظهارنامه رسمی جهت اعلام اخطار نهایی، احراز تخلف متعهد و قطعیت آغاز خسارت تاخیر ضروری است.
۲. **تامین خواسته فوری (ماده ۱۰۸ ق.آ.د.م):** توقیف ثمن معامله یا سایر اموال متعهد پیش از ابلاغ دادخواست به منظور تضمین وصول مطالبات و خسارات ناشی از عهدشکنی.`;
}

function generateInjunctionAnalysis(
  _query: string,
  title: string,
  owner: string,
  documents: LegalDocument[],
  evidenceSynthesis: string
): string {
  return `### ⚖️ ارزیابی دستور موقت و قرارهای تامین خواسته و دلیل در پرونده «${title}»
**موکل:** ${owner}

#### ۱. تمایز بنیادین قرار تامین خواسته و دستور موقت در قانون آیین دادرسی مدنی
۱. **قرار تامین خواسته (مواد ۱۰۸ الی ۱۲۹ ق.آ.د.م):**
   - **هدف:** صرفاً توقیف معادل خواسته مالی (اموال منقول یا غیرمنقول، مطالبات و حساب‌های بانکی) جهت جلوگیری از حیف و میل تا صدور حکم قطعی.
   - **بدون خسارت احتمالی:** چنانچه خواسته مستند به سند رسمی باشد، یا چک و سفته واخواست‌شده باشد، یا در معرض تضییع و تفریط قرار گیرد، بدون ایداع خسارت احتمالی نقدی صادر می‌شود.
   - **مهلت اقدام:** پس از صدور قرار تامین خواسته قبل از اقامه دعوا، خواهان باید ظرف ۱۰ روز دادخواست ماهوی را ثبت کند.

۲. **قرار دستور موقت / دادرسی فوری (مواد ۳۱۰ الی ۳۲۵ ق.آ.د.م):**
   - **هدف:** جلوگیری از انجام یک عمل مادی یا حقوقی (مانند منع نقل و انتقال ملک، منع تخریب بنا، منع ادامه عملیات ساختمانی یا توقف اجرای حکم).
   - **شرط فوریت:** خواهان باید فوریت امر را احراز کند؛ همچنین تودیع خسارت احتمالی به صندوق دادگستری با نظر دادگاه الزامی است.

۳. **قرار تامین دلیل (مواد ۱۴۹ الی ۱۵۵ ق.آ.د.م):**
   - **مرجع:** شورای حل اختلاف محل استقرار مال.
   - **کاربرد:** صرفاً ثبت و صورتجلسه کردن وضعیت فعلی (پیشرفت فیزیکی، تصرف، خسارات وارده، عیوب بنا) جهت استناد در دادگاه، بدون اظهارنظر ماهوی قاضی.

#### ۲. وضعیت ادله و استناد در پرونده
${evidenceSynthesis}

#### ۳. نقشه راه اقدام فوری
۱. در صورتی که خطر انتقال ملک یا برداشت وجوه وجود دارد، ظرف ۲۴ ساعت آینده تقاضای «صدور قرار دستور موقت با قید فوریت جهت ابلاغ پیش از اجرا» به رییس کل محاکم ارسال گردد.`;
}

function generateInheritanceAnalysis(
  _query: string,
  title: string,
  owner: string,
  documents: LegalDocument[],
  evidenceSynthesis: string
): string {
  return `### ⚖️ تحلیل موازین ارث، ترکه و امور حسبی در پرونده «${title}»
**موکل:** ${owner}

#### ۱. گردش‌کار و مراحل دادرسی در امور ترکه
۱. **اخذ گواهی حصر وراثت (قانون تصدیق انحصار وراثت):**
   - گام اول و بنیادین قبل از هرگونه تصرف مالی، ارائه دادخواست تصدیق انحصار وراثت به شورای حل اختلاف آخرین اقامتگاه متوفی است.
   - انتشار آگهی یک‌نوبته الکترونیکی در درگاه قوه قضاییه (بدون نیاز به چاپ کاغذی بر اساس بخشنامه‌های جدید).

۲. **مهر و موم و تحریر ترکه (مواد ۱۶۷ الی ۲۳۱ قانون امور حسبی):**
   - در صورت اختلاف وراث یا احتمال حیف و میل اموال، تقاضای فوری «مهر و موم ترکه» تا تعیین تکلیف نهایی.
   - تحریر ترکه به منظور تعیین دقیق دارایی‌ها، اموال منقول و غیرمنقول و دیون متوفی با حضور کارشناس رسمی.

۳. **تقسیم ترکه و فروش ماترک (ماده ۳۰۰ الی ۳۲۶ قانون امور حسبی):**
   - چنانچه ملک یا ترکه قابل افراز و تقسیم طبیعی نباشد، دادگاه عمومی حقوقی حکم به «فروش ماترک از طریق مزایده و تقسیم وجوه حاصله بین وراث به قدرالسهم قانونی» صادر می‌نماید.

#### ۲. بررسی ادله و اسناد هویتی و مالکیتی پرونده
${evidenceSynthesis}

#### ۳. راهکار اجرایی وکیل
۱. استعلام از سامانه املاک و اسناد کشور و بانک مرکزی جهت کشف اموال پنهان متوفی همزمان با پرونده تحریر ترکه.`;
}

function generateGeneralLegalAdvisory(
  query: string,
  title: string,
  owner: string,
  pelakCode: string,
  documents: LegalDocument[],
  disputes: DisputeAlert[],
  evidenceSynthesis: string
): string {
  return `### ⚖️ نظریه تحلیلی و مستشاری حقوقی
**پرونده:** «${title}» (شناسه/پلاک: \`${pelakCode}\`) | **موکل:** ${owner}

#### ۱. بررسی دقیق پرسش مطروحه:
پرسش شما: «*${query}*»

با توجه به ارکان ادعای مطروحه و رویه قضایی حاکم بر محاکم حقوقی و کیفری دادگستری، موارد زیر شایان تحلیل است:

۱. **تعیین ماهیت و چارچوب حقوقی:**
   - ادعای مطروحه مستلزم تعیین دقیق طرفین دعوا (اصحاب دعوا)، انطباق خواسته با موازین قانونی و انتخاب دادگاه یا مرجع صالح (شورای حل اختلاف، دادگاه حقوقی، دادسرا یا دیوان عدالت اداری) است.
   - رعایت اهلیت قانونی طرفین (ماده ۲۱۱ ق.م) و تصریح دقیق به ادله اثباتی (مواد ۱۲۵۷ و ۱۲۵۸ ق.م شامل اقرار، اسناد کتبی، شهادت، امارات قضایی و سوگند) در بدو امر تعیین‌کننده سرنوشت دعوا خواهد بود.

۲. **رعایت مواعد و مهلت‌های شکلی (آیین دادرسی):**
   - مواعد قانونی از امور آمره بوده و عدم رعایت آن موجب رد دعوا یا سقوط حق اعتراض می‌گردد:
     • مهلت تجدیدنظرخواهی: ۲۰ روز برای مقیمین ایران و ۲ ماه برای افراد مقیم خارج.
     • مهلت واخواهی احکام غیابی: ۲۰ روز از تاریخ ابلاغ واقعی یا اجراییه.
     • مهلت اعتراض به قرارهای نهایی دادسرا (منع تعقیب یا موقوفی): ۱۰ روز پس از ابلاغ.

#### ۲. پیوند و ارزیابی ادله مضبوط در کارتابل
${evidenceSynthesis}

${disputes.length > 0 ? `#### ۳. اختلافات و هشدارهای فعال پرونده:
` + disputes.slice(0, 2).map((disp) => `• **${disp.title}** (شعبه: ${disp.courtBranch} - کلاسه: \`${toPersianDigits(disp.caseNumber)}\`)`).join('\n') : ''}

#### ۴. راهبرد عملیاتی وکیل
۱. پیش از ثبت هرگونه دعوا، کلیه مدارک پایه را با استفاده از بخش **«اسکنر ادله و اسناد»** سامانه بارگذاری نمایید تا زنجیره تطبیقی و استخراج متون OCR به صورت خودکار تکمیل گردد.
۲. در صورت تمایل به دریافت متن آماده لایحه یا دادخواست، کافی است در همین صفحه عنوان «تنظیم دادخواست» یا «تنظیم لایحه دفاعیه» را همراه با مشخصات طرفین مطرح فرمایید تا پیش‌نویس کامل حقوقی صادر گردد.`;
}

function generateDraftPetitionResponse(
  query: string,
  title: string,
  owner: string,
  pelakCode: string,
  documents: LegalDocument[],
  isCheque: boolean,
  isCriminal: boolean,
  isRealEstate: boolean,
  _isContract: boolean
): string {
  const currentDate = '۱۴۰۳/۰۶/۰۱';
  const firstDoc = documents[0];
  const docRef = firstDoc ? `مستند به ${firstDoc.title} شماره ${toPersianDigits(firstDoc.documentNumber || 'مندرج در پرونده')}` : 'مستند به مدارک مضبوط در پرونده';

  if (isCriminal) {
    return `### 📝 پیش‌نویس شکواییه کیفری
**مرجع رسیدگی:** دادسرای عمومی و انقلاب حوزه قضایی محل وقوع بزه

**شاکی:** ${owner} (با وکالت وکیل پایه یک دادگستری)
**مشتکی‌عنه (متهم):** [نام و مشخصات مشتکی‌عنه / متهم]
**موضوع شکایت:** بزه کلاهبرداری، تحصیل مال از طریق نامشروع، خیانت در امانت و جعل سند عادی
**دلایل و منضمات:**
۱. وکالت‌نامه رسمی به شماره [...]
۲. ${docRef}
۳. پرینت گردش حساب و فیش‌های واریزی مأخوذه از بانک عامل
۴. استعلام پیام‌ها و مکاتبات فی‌مابین
۵. عنداللزوم شهادت شهود و مطلعین

---

**ریاست محترم دادسرای عمومی و انقلاب؛**
با سلام و اهدای تحیات، احتراما به وکالت از موکل به استحضار عالی می‌رساند:
مشتکی‌عنه نامبرده با تمسک به اقدامات و مانورهای متقلبانه و جلب اعتماد موکل در پرونده «${title}»، مبالغی را تحت عنوان سرمایه‌گذاری/انجام معامله اخذ نموده و متاسفانه از ایفای هرگونه تعهد یا استرداد وجوه استنکاف ورزیده و وجوه را تصاحب نموده است.
عناصر مادی و معنوی جرم به استناد ماده ۱ قانون تشدید مجازات مرتکبین ارتشا، اختلاس و کلاهبرداری کاملاً محقق می‌باشد.

**لذا با عنایت به جمیع مراتب، رسیدگی شایسته قضایی، صدور دستور فوری به پلیس فتا/آگاهی جهت مسدودی حساب‌های بانکی متهم، صدور قرار جلب به دادرسی و تعیین کیفر قانونی مشتکی‌عنه مورد استدعاست.**`;
  }

  if (isCheque) {
    return `### 📝 پیش‌نویس دادخواست صدور اجراییه چک صیادی (ماده ۲۳)
**مرجع رسیدگی:** دادگاه عمومی حقوقی صلاحیت‌دار

**خواهان:** ${owner} (با وکالت وکیل پایه یک دادگستری)
**خوانده (صادرکننده):** [مشخصات صاحب حساب / صادرکننده چک]
**خواسته:** صدور اجراییه مستقیم مستند به ماده ۲۳ قانون صدور چک مصوب ۱۳۹۷ در خصوص چک صیادی شماره [...] به مبلغ [...] ریال به انضمام کلیه خسارات دادرسی و خسارت تاخیر تادیه تا روز اجرای حکم.
**دلایل و منضمات:**
۱. وکالت‌نامه الکترونیکی
۲. تصویر مصدق چک صیادی
۳. گواهینامه عدم پرداخت ممهور به کد رهگیری بانک مرکزی
۴. ${docRef}

---

**ریاست محترم دادگاه عمومی حقوقی؛**
با سلام و احترام، به وکالت از خواهان به استحضار می‌رساند:
خوانده محترم مبادرت به صدور یک فقره چک صیادی در عهده بانک عامل نموده که به علت کسر موجودی، گواهینامه عدم پرداخت با کد رهگیری ثبت‌شده در سامانه یکپارچه بانک مرکزی برای آن صادر گردیده است.
نظر به اینکه در متن گواهینامه عدم پرداخت، شرط یا دستور عدم پرداختی قید نگردیده است، مستند به ماده ۲۳ اصلاحی قانون صدور چک، صدور فوری برگ اجراییه علیه صادرکننده و ارسال آن به دایره اجرای احکام مدنی جهت انسداد حساب‌ها و بازداشت اموال خوانده مورد استدعاست.`;
  }

  if (isRealEstate) {
    return `### 📝 پیش‌نویس دادخواست حقوقی دعاوی ملکی
**مرجع رسیدگی:** دادگاه عمومی حقوقی حوزه قضایی محل وقوع ملک

**خواهان:** ${owner} (با وکالت وکیل پایه یک دادگستری)
**خوانده:** [نام و مشخصات خوانده / فروشنده / متصرف]
**تعیین خواسته و بهای آن:**
۱. صدور قرار دستور موقت مبنی بر منع نقل و انتقال رسمی پلاک ثبتی شماره ${pelakCode}
۲. الزام خوانده به اخذ پایان‌کار، صورتمجلس تفکیکی و تنظیم سند رسمی انتقال شش‌دانگ عرصه و اعیان پلاک ثبتی فوق‌الذکر
۳. محکومیت خوانده به پرداخت خسارت تاخیر در انجام تعهد (وجه التزام قراردادی) به ازای هر روز تاخیر از تاریخ استحقاق
۴. پرداخت کلیه خسارات دادرسی و حق‌الوکاله وکیل

**دلایل و منضمات:**
۱. قرارداد بیع / مبایعه‌نامه عادی
۲. گواهی عدم حضور صادره از دفتر اسناد رسمی
۳. استعلام ثبتی پلاک شماره ${pelakCode}
۴. ${docRef}

---

**ریاست محترم دادگاه عمومی حقوقی؛**
با سلام و تحیات، احتراما به وکالت از خواهان معروض می‌دارد:
موکل به موجب مبایعه‌نامه معتبر پیوست، شش‌دانگ پلاک ثبتی موصوف را از خوانده خریداری نموده و بخش اعظم ثمن را تادیه کرده است. متاسفانه خوانده علی‌رغم انقضای مواعد قراردادی و حضور موکل در دفترخانه اسناد رسمی، از انجام ترتیبات مقدماتی و انتقال رسمی سند خودداری نموده است.
لذا با استناد به مواد ۱۰، ۲۱۹، ۲۲۰ و ۲۲۲ قانون مدنی و مواد ۱۰۸ و ۳۱۰ قانون آیین دادرسی مدنی، صدور دستور موقت فوری و رسیدگی و محکومیت خوانده به خواسته دعوا مورد استدعاست.`;
  }

  return `### 📝 پیش‌نویس لایحه دفاعیه جامع
**شعبه محترم:** دادگاه عمومی حقوقی / کیفری
**کلاسه پرونده:** ${toPersianDigits(firstDoc?.documentNumber || 'مندرج در کارتابل')}
**موضوع:** لایحه دفاعیه در پرونده «${title}»
**موکل:** ${owner}

---

**ریاست و مستشاران محترم دادگاه؛**
با سلام و احترام،
اینجانب به عنوان وکیل موکل در پرونده کلاسه فوق‌الذکر، دفاعیات خویش را به شرح ذیل به استحضار می‌رسانم:

۱. **ایرادات شکلی:**
   دعوای مطروحه از سوی طرف مقابل فاقد ارکان اساسی دادرسی بوده و خواسته تعیین‌شده منجز و مستند به ادله قانونی موضوع ماده ۱۲۵۷ قانون مدنی نمی‌باشد.

۲. **دفاعیات ماهوی و ادله اثباتی:**
   مستند به ${docRef}، تعهدات ادعایی یا منتسبه از سوی موکل ایفا گردیده و برائت ذمه ایشان به موجب اسناد مضبوط در کارتابل قضایی محرز و مسلم است. اصل برائت (ماده ۱۹۷ ق.آ.د.م) و اصل صحت معاملات (ماده ۲۲۳ ق.م) حاکم بر این رابطه حقوقی است.

۳. **نتیجه‌گیری و خواسته:**
   با عنایت به جمیع مراتب و عدم ارائه دلیل اثباتی متقن از سوی طرف دعوا، رد ادعای مطروحه و صدور حکم به برائت / بی‌حقی خواهان از محضر دادگاه محترم مورد استدعاست.`;
}
