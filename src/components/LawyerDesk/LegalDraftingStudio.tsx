import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Copy,
  Check,
  Printer,
  Sparkles,
  BookOpen,
  Scale,
  RefreshCw,
  Download,
  AlertCircle,
  Layers,
  Bot,
  Filter,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  ArrowDownLeft,
  Loader2,
  SlidersHorizontal,
  ShieldCheck,
  FileCheck,
  Settings,
  Key,
  X,
} from 'lucide-react';
import { PelakNode, LegalDocument, LegalDraftTemplate, CaseDomain } from '../../types/cadastre';
import { STANDARD_LEGAL_TEMPLATES, interpolateDraftTemplate, getTodayShamsi } from '../../utils/legalFormulas';
import { toPersianDigits, getDomainMeta } from '../../utils/persian';
import {
  generateAiLegalDraft,
  CITATION_FOCUS_OPTIONS,
  CitationFocusId,
} from '../../utils/aiDraftingEngine';

interface LegalDraftingStudioProps {
  pelaks: PelakNode[];
  documents: LegalDocument[];
  selectedPelakId?: string;
}

export const LegalDraftingStudio: React.FC<LegalDraftingStudioProps> = ({
  pelaks,
  documents,
  selectedPelakId,
}) => {
  const [activePelakId, setActivePelakId] = useState<string>(selectedPelakId || (pelaks[0]?.id ?? ''));
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [draftContent, setDraftContent] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterByDomainOnly, setFilterByDomainOnly] = useState<boolean>(true);

  // AI Copilot States
  const [showAiCopilot, setShowAiCopilot] = useState<boolean>(true);
  const [showCitationFociSettings, setShowCitationFociSettings] = useState<boolean>(false);
  const [activeFoci, setActiveFoci] = useState<CitationFocusId[]>([
    'deed_registry',
    'statutory_articles',
    'case_facts_disputes',
  ]);
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiGeneratedText, setAiGeneratedText] = useState<string>('');
  const [aiCopied, setAiCopied] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // Gemini API Key State (Shared across whole system with LegalChatbot)
  const [apiKey, setApiKey] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('attorney_gemini_api_key') || '' : '';
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');

  // Synchronize key state if changed in chatbot or other component
  useEffect(() => {
    const handleStorageChange = () => {
      setApiKey(localStorage.getItem('attorney_gemini_api_key') || '');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('attorney_gemini_api_key', trimmed);
      setApiKey(trimmed);
    } else {
      localStorage.removeItem('attorney_gemini_api_key');
      setApiKey('');
    }
    setShowApiKeyModal(false);
  };

  const currentPelak = useMemo(
    () => pelaks.find((p) => p.id === activePelakId) || null,
    [pelaks, activePelakId]
  );

  const currentDoc = useMemo(
    () => documents.find((d) => d.id === activeDocId) || null,
    [documents, activeDocId]
  );

  // Documents related to the currently selected pelak
  const relatedDocs = useMemo(
    () => documents.filter((d) => (activePelakId ? d.pelakId === activePelakId : true)),
    [documents, activePelakId]
  );

  // Determine current active domain
  const activeDomain: CaseDomain | null = useMemo(() => {
    if (!currentPelak) return null;
    if (currentPelak.dossierDomain) return currentPelak.dossierDomain;
    if (!currentPelak.isNonLandDossier) return 'real_estate';
    return null;
  }, [currentPelak]);

  // Filter templates based on domain compatibility and category
  const filteredTemplates = useMemo(() => {
    return STANDARD_LEGAL_TEMPLATES.filter((t) => {
      // 1. Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory) {
        return false;
      }
      // 2. Domain compatibility filter
      if (filterByDomainOnly && activeDomain) {
        if (t.isGeneral) return true; // General procedural templates apply everywhere
        if (activeDomain === 'real_estate') {
          return t.isLandSpecific || t.applicableDomains?.includes('real_estate');
        }
        return t.applicableDomains?.includes(activeDomain);
      }
      return true;
    });
  }, [selectedCategory, filterByDomainOnly, activeDomain]);

  // Selected template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return filteredTemplates[0]?.id || STANDARD_LEGAL_TEMPLATES[0].id;
  });

  const currentTemplate = useMemo(() => {
    return (
      filteredTemplates.find((t) => t.id === selectedTemplateId) ||
      STANDARD_LEGAL_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
      filteredTemplates[0] ||
      STANDARD_LEGAL_TEMPLATES[0]
    );
  }, [filteredTemplates, selectedTemplateId]);

  // Automatically switch template if the current one is completely incompatible with newly selected pelak
  useEffect(() => {
    if (filterByDomainOnly && activeDomain && filteredTemplates.length > 0) {
      const isCurrentInFiltered = filteredTemplates.some((t) => t.id === selectedTemplateId);
      if (!isCurrentInFiltered) {
        // Automatically switch to the best matching template for this case
        setSelectedTemplateId(filteredTemplates[0].id);
      }
    }
  }, [activePelakId, filterByDomainOnly, activeDomain, filteredTemplates, selectedTemplateId]);

  // Sync draft content when template, pelak, or doc changes
  useEffect(() => {
    if (currentTemplate) {
      const interpolated = interpolateDraftTemplate(currentTemplate.templateContent, currentPelak, currentDoc);
      setDraftContent(interpolated);
    }
  }, [selectedTemplateId, activePelakId, activeDocId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.error('Failed to copy draft:', e);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('لطفاً باز شدن پنجره‌های پاپ‌آپ را در مرورگر مجاز بفرمایید.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>${currentTemplate.title}</title>
        <style>
          @page { size: A4 portrait; margin: 25mm 20mm 25mm 20mm; }
          body {
            font-family: 'Vazirmatn', 'B Nazanin', 'Tahoma', sans-serif;
            font-size: 13pt;
            line-height: 2.1;
            color: #111;
            padding: 20px;
            direction: rtl;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .title { font-size: 16pt; font-weight: bold; margin-bottom: 6px; }
          .date { font-size: 11pt; color: #555; }
          .content { white-space: pre-wrap; text-align: justify; }
          .footer {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            font-size: 11pt;
            border-top: 1px dashed #999;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${currentTemplate.title}</div>
          <div class="date">تاریخ تنظیم: ${toPersianDigits(getTodayShamsi())}</div>
        </div>
        <div class="content">${draftContent.replace(/\n/g, '<br/>')}</div>
        <div class="footer">
          <div>سامانه اتوماسیون اسناد و کاداستر وکیل</div>
          <div>محل امضا و مهر وکیل دادگستری</div>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleDownload = () => {
    const blob = new Blob([draftContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTemplate.title.replace(/\s+/g, '_')}_${getTodayShamsi().replace(/\//g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFocus = (id: CitationFocusId) => {
    setActiveFoci((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Trigger AI generation
  const handleAiGenerate = async (
    actionType: 'full_draft' | 'insert_grounds' | 'rebuttal' | 'polish_rewrite' | 'custom_prompt'
  ) => {
    setAiGenerating(true);
    setAiGeneratedText('');
    try {
      const result = await generateAiLegalDraft({
        pelak: currentPelak,
        documents: relatedDocs,
        currentTemplate,
        currentDraft: draftContent,
        activeFoci,
        actionType,
        customPrompt: actionType === 'custom_prompt' ? customPrompt : undefined,
        apiKey: apiKey || undefined,
      });
      setAiGeneratedText(result);
    } catch (err) {
      console.error('Error generating AI draft:', err);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleReplaceDraft = () => {
    if (!aiGeneratedText) return;
    setDraftContent(aiGeneratedText);
  };

  const handleAppendDraft = () => {
    if (!aiGeneratedText) return;
    setDraftContent((prev) => `${prev.trim()}\n\n${aiGeneratedText.trim()}`);
  };

  const handleCopyAi = async () => {
    if (!aiGeneratedText) return;
    try {
      await navigator.clipboard.writeText(aiGeneratedText);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy AI text:', e);
    }
  };

  const domainMeta = activeDomain ? getDomainMeta(activeDomain) : null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">
                  استودیوی هوشمند تنظیم دادخواست و لوایح
                </h2>
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono">
                  Smart Drafting & AI Copilot
                </span>
                {domainMeta && (
                  <span className={`text-[11px] px-2 py-0.5 rounded font-medium border ${domainMeta.bg} ${domainMeta.text} ${domainMeta.border}`}>
                    {domainMeta.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                پالایش خودکار بانک قالب‌ها متناسب با موضوع پرونده و تعبیه دستیار هوش مصنوعی تحلیلگر اسناد با تنظیم محورهای استناد
              </p>
            </div>
          </div>

          {/* Quick Stats & Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setShowAiCopilot(!showAiCopilot)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showAiCopilot
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span>{showAiCopilot ? 'بستن دستیار هوشمند' : 'دستیار تحلیلگر اسناد'}</span>
            </button>

            <button
              onClick={() => {
                const interpolated = interpolateDraftTemplate(
                  currentTemplate.templateContent,
                  currentPelak,
                  currentDoc
                );
                setDraftContent(interpolated);
              }}
              title="بارگذاری مجدد و تطبیق با متغیرهای پرونده"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">بازنشانی فیلدها</span>
            </button>

            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'کپی شد!' : 'کپی لایحه'}</span>
            </button>

            <button
              onClick={handlePrint}
              title="پیش‌نمایش چاپ در سربرگ رسمی استاندارد قضایی"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">چاپ رسمی</span>
            </button>

            <button
              onClick={handleDownload}
              title="ذخیره به عنوان فایل متنی"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Dossier Injector & Smart Filtered Templates (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Dossier & Document Selector Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                تزریق خودکار اطلاعات پرونده
              </span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                اتصال زنده
              </span>
            </div>

            {/* Select Pelak / Dossier */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                انتخاب پرونده یا پلاک ثبتی مبنا:
              </label>
              <select
                value={activePelakId}
                onChange={(e) => {
                  setActivePelakId(e.target.value);
                  setActiveDocId('');
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- بدون انتساب پرونده (قالب خام) --</option>
                {pelaks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.title} ({p.ownerName})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Specific Document */}
            {relatedDocs.length > 0 && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  استناد به دادنامه / سند خاص:
                </label>
                <select
                  value={activeDocId}
                  onChange={(e) => setActiveDocId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- انتخاب سند یا دادنامه مرجع --</option>
                  {relatedDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.documentNumber} - {d.title} ({d.authority})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Injected Variables Preview Pill */}
            {currentPelak && (
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-[11px] space-y-1.5 text-slate-400">
                <div className="flex justify-between items-center">
                  <span>موکل:</span>
                  <span className="text-white font-medium">{currentPelak.ownerName || 'نامشخص'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>کلاسه / پلاک:</span>
                  <span className="text-amber-400 font-mono font-semibold">{currentPelak.code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>موضوع پرونده:</span>
                  <span className="text-slate-200">
                    {currentPelak.dossierDomain === 'commercial' ? 'اسناد تجاری و مطالبات مالی' :
                     currentPelak.dossierDomain === 'criminal' ? 'کیفری و جرایم مالی' :
                     currentPelak.dossierDomain === 'contracts' ? 'تعهدات و اختلافات قراردادی' :
                     currentPelak.dossierDomain === 'inheritance' ? 'ارث، ترکه و حسبی' :
                     currentPelak.dossierDomain === 'administrative' ? 'شهرداری و اداری' :
                     currentPelak.isNonLandDossier ? 'حقوقی عمومی' : 'دعاوی ملکی و کاداستر'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>مدارک ثبت‌شده در پرونده:</span>
                  <span className="text-sky-400 font-semibold font-mono">
                    {toPersianDigits(relatedDocs.length)} سند
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Template Categories & Domain-Aware Filter */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                بانک قالب‌های متناسب
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {toPersianDigits(filteredTemplates.length)} از {toPersianDigits(STANDARD_LEGAL_TEMPLATES.length)} قالب
              </span>
            </div>

            {/* Smart Domain Filter Toggle Notice */}
            {currentPelak && activeDomain && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-amber-200 leading-tight">
                    {filterByDomainOnly
                      ? `فیلتر خودکار بر اساس موضوع «${domainMeta?.label || 'پرونده جاری'}»`
                      : 'نمایش کل قالب‌ها (تمام حوزه‌ها)'}
                  </span>
                </div>
                <button
                  onClick={() => setFilterByDomainOnly(!filterByDomainOnly)}
                  className="px-2 py-1 rounded-lg text-[10px] bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 transition-colors whitespace-nowrap"
                >
                  {filterByDomainOnly ? 'مشاهده همه' : 'فیلتر پرونده'}
                </button>
              </div>
            )}

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              {[
                { id: 'all', label: 'همه' },
                { id: 'petition', label: 'دادخواست' },
                { id: 'bill', label: 'لایحه' },
                { id: 'injunction', label: 'دستور موقت' },
                { id: 'objection', label: 'اعتراض کارشناسی' },
                { id: 'declaration', label: 'اظهارنامه' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2 py-0.5 rounded-lg border transition-colors ${
                    selectedCategory === c.id
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-semibold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Templates List */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  <p>قالبی با این دسته‌بندی برای موضوع پرونده یافت نشد.</p>
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setFilterByDomainOnly(false);
                    }}
                    className="mt-2 text-amber-400 hover:underline text-[11px]"
                  >
                    نمایش تمام قالب‌ها
                  </button>
                </div>
              ) : (
                filteredTemplates.map((t) => {
                  const isSelected = t.id === selectedTemplateId;
                  const isGeneral = t.isGeneral;
                  const isDirectMatch = activeDomain
                    ? activeDomain === 'real_estate'
                      ? t.isLandSpecific || t.applicableDomains?.includes('real_estate')
                      : t.applicableDomains?.includes(activeDomain)
                    : false;

                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`w-full text-right p-3 rounded-xl border transition-all text-xs ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-white mb-1.5 flex items-center justify-between gap-1.5">
                        <span className="truncate">{t.title}</span>
                        {isDirectMatch ? (
                          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded shrink-0">
                            منطبق
                          </span>
                        ) : isGeneral ? (
                          <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.2 rounded shrink-0">
                            عمومی
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Editor + AI Document Analyst Copilot (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* AI Copilot Side/Top Panel */}
          {showAiCopilot && (
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

              {/* Copilot Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      دستیار هوش مصنوعی تحلیلگر اسناد و نگارش لوایح
                      <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                        Grounded AI Drafter
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      تنظیم لوایح و دادخواست‌ها بر مبنای اسناد واقعی پرونده و اولویت‌های استناد انتخابی
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Shared API Key Status Indicator / Button */}
                  <button
                    onClick={() => {
                      setApiKeyInput(apiKey);
                      setShowApiKeyModal(true);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                      apiKey
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                    title={
                      apiKey
                        ? 'کلید Gemini API متصل است (مشترک با چت‌بات). جهت مشاهده یا ویرایش کلیک کنید.'
                        : 'کلید API تنظیم نشده؛ موتور داخلی استدلال قضایی فعال است. جهت اتصال به Gemini کلیک کنید.'
                    }
                  >
                    <Key className={`w-3.5 h-3.5 ${apiKey ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="hidden sm:inline">
                      {apiKey ? 'متصل به Gemini API (مشترک)' : 'استدلال آفلاین (تنظیم کلید)'}
                    </span>
                    <span className="sm:hidden">{apiKey ? 'Gemini فعال' : 'تنظیم کلید'}</span>
                  </button>

                  {/* Toggle Citation Priorities Settings */}
                  <button
                    onClick={() => setShowCitationFociSettings(!showCitationFociSettings)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-950 text-slate-300 hover:text-white rounded-lg border border-slate-700/80 transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>محورهای استناد ({toPersianDigits(activeFoci.length)})</span>
                    {showCitationFociSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Citation Focus Selector Panel (Expanded/Collapsible) */}
              {showCitationFociSettings && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 border-b border-slate-800/80 pb-1.5">
                    <span className="font-semibold text-slate-200">
                      محورهای اولویت‌دار جهت استناددهی در متن لایحه:
                    </span>
                    <span className="text-[10px] text-amber-400">
                      (تیک محورهای مورد نظر خود را فعال یا غیرفعال فرمایید)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {CITATION_FOCUS_OPTIONS.map((f) => {
                      const isActive = activeFoci.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          onClick={() => toggleFocus(f.id)}
                          className={`text-right p-2.5 rounded-lg border transition-all flex items-start gap-2 ${
                            isActive
                              ? 'bg-amber-500/10 border-amber-500/40 text-slate-200'
                              : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:bg-slate-800/50'
                          }`}
                        >
                          {isActive ? (
                            <CheckSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="font-bold text-[11px] flex items-center justify-between">
                              <span>{f.label}</span>
                              <span className="text-[9px] px-1 rounded bg-slate-800 text-amber-300 font-mono">
                                {f.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                              {f.shortDesc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  disabled={aiGenerating}
                  onClick={() => handleAiGenerate('full_draft')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-md disabled:opacity-50 transition-all"
                >
                  {aiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>پیش‌نویس کامل لایحه با مدارک پرونده</span>
                </button>

                <button
                  disabled={aiGenerating}
                  onClick={() => handleAiGenerate('insert_grounds')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs border border-slate-700 disabled:opacity-50 transition-colors"
                >
                  <FileCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>تولید بند استناد به اسناد رسمی و قوانین</span>
                </button>

                <button
                  disabled={aiGenerating}
                  onClick={() => handleAiGenerate('rebuttal')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs border border-slate-700 disabled:opacity-50 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تنظیم دفاعیه و پاسخ به ادعای طرف مقابل</span>
                </button>

                <button
                  disabled={aiGenerating}
                  onClick={() => handleAiGenerate('polish_rewrite')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs border border-slate-700 disabled:opacity-50 transition-colors"
                >
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>بازنویسی با ادبیات قضایی فاخر</span>
                </button>
              </div>

              {/* Custom Prompt Box */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="دستور مشخص به هوش مصنوعی (مثلاً: بند ۳ را با استناد به ماده ۲۱۹ قانون مدنی اصلاح کن)..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customPrompt.trim()) {
                      handleAiGenerate('custom_prompt');
                    }
                  }}
                />
                <button
                  disabled={aiGenerating || !customPrompt.trim()}
                  onClick={() => handleAiGenerate('custom_prompt')}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold disabled:opacity-40 transition-colors"
                >
                  اعمال
                </button>
              </div>

              {/* AI Generation Output Preview */}
              {aiGeneratedText && (
                <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-3.5 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      پیش‌نویس تولیدشده توسط هوش مصنوعی (آماده انتقال به متن اصلی):
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleCopyAi}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] flex items-center gap-1"
                      >
                        {aiCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{aiCopied ? 'کپی شد' : 'کپی'}</span>
                      </button>
                      <button
                        onClick={handleAppendDraft}
                        className="px-2.5 py-1 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-800 rounded text-[11px] font-medium flex items-center gap-1"
                      >
                        <ArrowDownLeft className="w-3 h-3 text-sky-400" />
                        <span>افزودن به انتهای لایحه</span>
                      </button>
                      <button
                        onClick={handleReplaceDraft}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-[11px] font-bold"
                      >
                        جایگزینی کل متن ویرایشگر
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap select-text pr-1">
                    {aiGeneratedText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legal Basis & Statutory Authorities Card */}
          {currentTemplate.legalBasis && currentTemplate.legalBasis.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-xs shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <Scale className="w-4 h-4" />
                  مستندات قانونی و مواد استنادی این لایحه:
                </div>
                <span className="text-[10px] text-slate-400">
                  منطبق با رویه محاکم دادگستری
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentTemplate.legalBasis.map((article, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-950 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-lg text-[11px] hover:border-slate-700 transition-colors"
                  >
                    ⚖️ {article}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Live Text Area Editor */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[560px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-white">{currentTemplate.title}</span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  (متن نهایی لایحه جهت تقدیم به دادگاه یا بارگذاری در خودکاربری ثنا)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {toPersianDigits(draftContent.length)} کاراکتر
              </div>
            </div>

            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="متن دادخواست یا لایحه را اینجا ویرایش فرمایید..."
              className="flex-1 w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs sm:text-sm text-slate-100 font-sans leading-loose focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30 resize-none selection:bg-amber-500/30"
              dir="rtl"
            />

            <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500/70" />
                متن حاضر با استانداردهای سامانه جامع خدمات الکترونیک قضایی (عدل‌ایران) کاملاً سازگار است.
              </span>
              <span>تنظیم خودکار با تاریخ امروز ({toPersianDigits(getTodayShamsi())})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Gemini API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Key className="w-4 h-4" />
                <span>تنظیم کلید هوش مصنوعی Google Gemini (مشترک در کل سامانه)</span>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              این کلید در حافظه محلی مرورگر (Local Storage) ذخیره شده و به‌صورت خودکار بین <strong className="text-white">«دستیار چت‌بات هوش مصنوعی»</strong> و <strong className="text-white">«استودیوی تنظیم لوایح میزکار»</strong> به اشتراک گذاشته می‌شود.
            </p>

            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>وضعیت فعلی اتصال:</span>
                {apiKey ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    کلید فعال و متصل
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">موتور داخلی آفلاین فعال است</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                در صورت عدم وارد کردن کلید، سامانه بدون وقفه از موتور قدرتمند تحلیل و استدلال حقوقی داخلی استفاده می‌کند.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">کلید API گوگل (Gemini API Key):</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {apiKey && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('attorney_gemini_api_key');
                    setApiKey('');
                    setApiKeyInput('');
                    setShowApiKeyModal(false);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
                >
                  حذف کلید از مرورگر
                </button>
              )}
              <div className="flex items-center gap-2 mr-auto">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors"
                >
                  ذخیره تنظیمات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
