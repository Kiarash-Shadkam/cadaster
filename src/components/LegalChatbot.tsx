import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User,
  Scale,
  Sparkles,
  FileText,
  AlertOctagon,
  CheckCircle,
  HelpCircle,
  Loader2,
  RefreshCw,
  Plus,
  X,
  Edit2,
  Check,
  Download,
  Copy,
  Key,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';
import { PelakNode, LegalDocument, DisputeAlert, TimelineItem, ChatMessage, ChatSession } from '../types/cadastre';
import { toPersianDigits } from '../utils/persian';
import { generateLegalResponse } from '../utils/legalReasoningEngine';
import { loadStoredSessions, saveStoredSessions, createDefaultSession } from '../utils/legalChatStore';

interface LegalChatbotProps {
  pelaks: PelakNode[];
  documents: LegalDocument[];
  disputes: DisputeAlert[];
  timeline: TimelineItem[];
  selectedPelakId: string;
  onSelectPelak: (id: string) => void;
  initialQuery?: string | null;
  onGoToScanner?: () => void;
}

export const LegalChatbot: React.FC<LegalChatbotProps> = ({
  pelaks,
  documents,
  disputes,
  timeline,
  selectedPelakId,
  onSelectPelak,
  initialQuery,
  onGoToScanner,
}) => {
  // 1. Persistent Multi-Session State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const { sessions } = loadStoredSessions();
    return sessions;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const { activeSessionId } = loadStoredSessions();
    return activeSessionId;
  });

  // Keep localStorage in sync whenever sessions or activeSessionId changes
  useEffect(() => {
    if (sessions.length > 0) {
      saveStoredSessions(sessions, activeSessionId);
    }
  }, [sessions, activeSessionId]);

  // Ensure activeSession exists
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || createDefaultSession();

  // Active dossier for the current session
  const activePelakId = activeSession.pelakId && activeSession.pelakId !== 'all' ? activeSession.pelakId : selectedPelakId;
  const currentPelak = pelaks.find((p) => p.id === activePelakId) || (pelaks.length > 0 ? pelaks[0] : null);

  const pelakDocs = currentPelak
    ? documents.filter((d) => d.pelakId === currentPelak.id || d.pelakId === currentPelak.parentId)
    : documents;
  const pelakDisputes = currentPelak
    ? disputes.filter((disp) => disp.pelakId === currentPelak.id)
    : disputes;
  const pelakTimeline = currentPelak
    ? timeline.filter((t) => t.pelakId === currentPelak.id)
    : timeline;

  // Session Editing State
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Optional Gemini API Key Dialog for live model on static GitHub Pages
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('attorney_gemini_api_key') || '' : '';
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession.messages, isLoading]);

  // Handle incoming initial queries from other views (e.g. from Scanner or Timeline)
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSendMessage(initialQuery.trim());
    }
  }, [initialQuery]);

  // Session Management Helpers
  const handleCreateSession = (pelakToLink?: string, customTitle?: string) => {
    const linkedPelak = pelaks.find((p) => p.id === (pelakToLink || activePelakId));
    const title = customTitle || (linkedPelak ? `پرونده ${linkedPelak.code} - ${linkedPelak.title.slice(0, 16)}` : `مشاوره پرونده ${toPersianDigits(sessions.length + 1)}`);
    const newSession = createDefaultSession(pelakToLink || activePelakId, title);

    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    if (pelakToLink) {
      onSelectPelak(pelakToLink);
    }
  };

  const handleCloseSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      // If last session, just clear it instead of removing
      handleClearActiveSession();
      return;
    }

    const targetSession = sessions.find((s) => s.id === sessionId);
    if (targetSession && targetSession.messages.length > 2) {
      const confirmClose = window.confirm(`آیا از بستن سربرگ «${targetSession.title}» اطمینان دارید؟`);
      if (!confirmClose) return;
    }

    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[remaining.length - 1].id);
    }
  };

  const handleStartRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setIsRenaming(true);
    setRenameText(session.title);
  };

  const handleSaveRename = () => {
    if (renameText.trim()) {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSession.id ? { ...s, title: renameText.trim(), updatedAt: Date.now() } : s))
      );
    }
    setIsRenaming(false);
  };

  const handleClearActiveSession = () => {
    const confirmClear = window.confirm('آیا مایل به پاکسازی تاریخچه این سربرگ و شروع مجدد هستید؟');
    if (!confirmClear) return;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              messages: [
                {
                  id: `reset-${Date.now()}`,
                  sender: 'agent',
                  timestamp: 'هم‌اکنون',
                  text: `جلسه گفتگوی «${s.title}» نوسازی گردید. آماده بررسی اسناد و ارائه راهبردهای حقوقی هستم.`,
                },
              ],
              draftInput: '',
              updatedAt: Date.now(),
            }
          : s
      )
    );
  };

  const handleDraftChange = (text: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? { ...s, draftInput: text } : s))
    );
  };

  const handleChangeSessionPelak = (newPelakId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? { ...s, pelakId: newPelakId, updatedAt: Date.now() } : s))
    );
    onSelectPelak(newPelakId);
  };

  // Sending Messages with Comprehensive Reasoning Engine
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || activeSession.draftInput || '').trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: 'هم‌اکنون',
      text,
      referencedPelak: currentPelak?.code || 'عمومی',
    };

    // Append user message & clear draft
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              messages: [...s.messages, userMsg],
              draftInput: '',
              updatedAt: Date.now(),
            }
          : s
      )
    );

    setIsLoading(true);

    try {
      const replyText = await generateLegalResponse({
        message: text,
        pelakData: currentPelak,
        allPelaks: pelaks,
        documents: pelakDocs,
        disputes: pelakDisputes,
        timeline: pelakTimeline,
        history: activeSession.messages,
        apiKey: typeof window !== 'undefined' ? localStorage.getItem('attorney_gemini_api_key') : null,
      });

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        timestamp: 'هم‌اکنون',
        text: replyText,
        referencedPelak: currentPelak?.code,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                messages: [...s.messages, agentMsg],
                updatedAt: Date.now(),
              }
            : s
        )
      );
    } catch (err: any) {
      console.error('Legal reasoning execution error:', err);
      const errorMsg: ChatMessage = {
        id: `agent-err-${Date.now()}`,
        sender: 'agent',
        timestamp: 'هم‌اکنون',
        text: `خطا در فرآیند استخراج داده‌های حقوقی: ${err?.message || 'نامشخص'}. لطفاً مجدداً پرسش خود را ارسال فرمایید.`,
        referencedPelak: currentPelak?.code,
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                messages: [...s.messages, errorMsg],
                updatedAt: Date.now(),
              }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleExportSession = () => {
    const transcript = activeSession.messages
      .map(
        (m) =>
          `[${m.sender === 'agent' ? 'دستیار حقوقی' : 'وکیل/کاربر'} - ${m.timestamp}]\n${m.text}\n----------------------------------------\n`
      )
      .join('\n');

    const header = `صورتجلسه و تحلیل حقوقی سامانه کاداستر\nپرونده: ${currentPelak?.title || 'عمومی'} (پلاک ${currentPelak?.code || '-'})\nعنوان گفتگو: ${activeSession.title}\nتاریخ استخراج: ${new Date().toLocaleDateString('fa-IR')}\n========================================\n\n`;

    const blob = new Blob([header + transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `legal-consultation-${activeSession.title.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveApiKey = () => {
    if (typeof window !== 'undefined') {
      if (apiKeyInput.trim()) {
        localStorage.setItem('attorney_gemini_api_key', apiKeyInput.trim());
      } else {
        localStorage.removeItem('attorney_gemini_api_key');
      }
    }
    setShowApiKeyModal(false);
  };

  // Dynamic suggested prompts based on current dossier domain and uploaded documents
  const getDynamicSuggestedPrompts = () => {
    const domain = currentPelak?.dossierDomain;
    const title = currentPelak?.title || 'پرونده جاری';

    if (domain === 'commercial') {
      return [
        'سریع‌ترین مسیر مطالبه وجه چک: اجرای ثبت یا دادخواست صدور اجراییه ماده ۲۳؟',
        'نحوه توقیف فوری حساب‌های متعهد از طریق سامانه سیاق و اجرای احکام چگونه است؟',
        'مسئولیت تضامنی ظهرنویسان و نحوه مطالبه خسارت تاخیر تادیه بر مبنای نرخ تورم چیست؟',
      ];
    } else if (domain === 'criminal') {
      return [
        'ارکان بزه کلاهبرداری و شگردهای متقلبانه متهم در این پرونده را تحلیل کن.',
        'استراتژی دفاعی و نحوه تنظیم پیش‌نویس شکواییه تقدیمی به دادسرا چیست؟',
        'دستورات قضایی فوری جهت ردیابی حساب‌ها و توقیف وجوه موکل در دادسرا چیست؟',
      ];
    } else if (domain === 'contracts') {
      return [
        'تعهدات طرفین و ضمانت‌اجرای وجه التزام (خسارت تاخیر قراردادی) را بررسی کن.',
        'آیا شرایط فسخ، انفساخ یا بطلان قرارداد در مدارک پرونده احراز می‌شود؟',
        'تنظیم دادخواست الزام به ایفای تعهدات قراردادی و تحویل مورد معامله.',
      ];
    }

    if (pelakDocs.length > 0) {
      return [
        `تحلیل موشکافانه نقاط قوت و ضعف ادله موکل در پرونده «${title}».`,
        `کالبدشکافی ادعای طرف مقابل و شواهد تعارض در مدارک پرونده.`,
        'تنظیم پیش‌نویس لایحه دفاعیه جهت ارائه به شعبه دادگاه.',
      ];
    }

    return [
      'ارکان دعوای خلع ید و الزام به تنظیم سند رسمی با توجه به مواد ۲۲ و ۴۸ قانون ثبت چیست؟',
      'راهنمای بارگذاری اسناد و استخراج زنجیره ادله پرونده توسط ایجنت چیست؟',
    ];
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[750px] shadow-2xl overflow-hidden relative">
      {/* 1. Multi-Tab Session Bar */}
      <div className="bg-slate-950 border-b border-slate-800/90 px-3 pt-2.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {sessions.map((sess) => {
            const isActive = sess.id === activeSession.id;
            const sessPelak = pelaks.find((p) => p.id === sess.pelakId);
            return (
              <div
                key={sess.id}
                onClick={() => {
                  setActiveSessionId(sess.id);
                  if (sess.pelakId && sess.pelakId !== 'all') {
                    onSelectPelak(sess.pelakId);
                  }
                }}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-medium cursor-pointer transition-all border-t border-x ${
                  isActive
                    ? 'bg-slate-900 text-amber-400 border-slate-800 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
                }`}
              >
                <div className="flex items-center gap-1.5 max-w-[160px] truncate">
                  <span className="truncate">{sess.title}</span>
                  {sessPelak && (
                    <span className="text-[10px] font-mono bg-slate-800/80 text-amber-400/90 px-1.5 py-0.2 rounded border border-slate-700/50">
                      {sessPelak.code}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {isActive && !isRenaming && (
                    <button
                      onClick={(e) => handleStartRename(e, sess)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white transition-opacity"
                      title="تغییر نام سربرگ"
                    >
                      <Edit2 className="w-3 h-3 text-slate-400 hover:text-amber-300" />
                    </button>
                  )}
                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => handleCloseSession(e, sess.id)}
                      className="p-0.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                      title="بستن سربرگ"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* New Tab Button */}
          <button
            onClick={() => handleCreateSession()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-amber-400 hover:bg-slate-900 transition-colors border border-dashed border-slate-800 hover:border-amber-500/50 shrink-0 mr-1"
            title="ایجاد سربرگ گفتگوی جدید"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">گفتگوی جدید</span>
          </button>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 py-1">
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-400 hover:text-amber-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg transition-colors"
            title="تنظیمات کلید هوش مصنوعی"
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">هوش مصنوعی</span>
          </button>

          <button
            onClick={handleExportSession}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-400 hover:text-emerald-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg transition-colors"
            title="خروجی متن مشاوره"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden md:inline">خروجی</span>
          </button>

          <button
            onClick={handleClearActiveSession}
            className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg transition-colors"
            title="نوسازی این گفتگو"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Active Session Context & Pelak Selector Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            {isRenaming ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                  autoFocus
                  className="bg-slate-950 border border-amber-500/80 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                />
                <button
                  onClick={handleSaveRename}
                  className="p-1 bg-amber-500 text-slate-950 rounded hover:bg-amber-400"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setIsRenaming(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{activeSession.title}</span>
                  <button
                    onClick={(e) => handleStartRename(e, activeSession)}
                    className="text-slate-500 hover:text-amber-400 p-0.5"
                    title="ویرایش نام"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </h3>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
                  تحلیل موشکافانه اسناد و قوانین ایران
                </span>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              {currentPelak
                ? `پرونده: ${currentPelak.title} (پلاک: ${currentPelak.code}) · تعداد ${toPersianDigits(pelakDocs.length)} سند بارگذاری‌شده`
                : 'حالت مشاوره عمومی و بررسی قوانین'}
            </p>
          </div>
        </div>

        {/* Pelak / Dossier Linker for this Tab */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <span className="text-slate-400 text-[11px]">اتصال به پرونده:</span>
          <select
            value={activePelakId}
            onChange={(e) => handleChangeSessionPelak(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500 shadow-inner"
          >
            <option value="all">همه پرونده‌ها (عمومی)</option>
            {pelaks.map((p) => (
              <option key={p.id} value={p.id}>
                پلاک {p.code} - {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {activeSession.messages.map((msg) => {
          const isAgent = msg.sender === 'agent';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 group ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs shadow ${
                  isAgent
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-sky-600 text-white font-bold'
                }`}
              >
                {isAgent ? <Scale className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div
                className={`relative max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed shadow-lg ${
                  isAgent
                    ? 'bg-slate-950 border border-slate-800 text-slate-200'
                    : 'bg-amber-500 text-slate-950 font-medium'
                }`}
              >
                {isAgent && (
                  <div className="mb-2.5 pb-2 border-b border-slate-800/80 flex items-center justify-between text-[10px] text-amber-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>
                        {msg.referencedPelak ? `مستند به پرونده پلاک ${msg.referencedPelak}` : 'تحلیل حقوقی و استناد به قوانین'}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{msg.timestamp}</span>
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors flex items-center gap-1"
                        title="کپی متن تحلیل"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400">کپی شد</span>
                          </>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="whitespace-pre-line text-justify space-y-2 select-text font-sans">
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 flex items-center gap-3 shadow-lg">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <span>
                در حال کالبدشکافی اسناد پرونده، تطبیق با مواد قانون مدنی، ثبت، چک، مجازات و آیین دادرسی و تنظیم تحلیل...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Suggested Prompts Chips */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/70 overflow-x-auto no-scrollbar flex items-center gap-2 text-[11px]">
        <span className="text-slate-500 shrink-0 font-medium flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>پرسش‌های پیشنهادی:</span>
        </span>
        {getDynamicSuggestedPrompts().map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className="whitespace-nowrap bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 px-3 py-1.5 rounded-xl transition-all shrink-0 active:scale-95 shadow-sm"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* 5. Input Area with Draft Persistence */}
      <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2.5"
        >
          <div className="flex-1 bg-slate-900 border border-slate-800 focus-within:border-amber-500 rounded-2xl px-3.5 py-2 transition-colors">
            <textarea
              ref={textareaRef}
              rows={2}
              placeholder={
                currentPelak
                  ? `پرسش حقوقی، تحلیل ادله، یا درخواست پیش‌نویس لایحه در پرونده «${currentPelak.title}» را بنویسید... (Enter برای ارسال)`
                  : 'پرسش حقوقی، استعلام ماده قانونی یا درخواست تنظیم لایحه را مطرح فرمایید... (Enter برای ارسال)'
              }
              value={activeSession.draftInput || ''}
              onChange={(e) => handleDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !activeSession.draftInput?.trim()}
            className={`p-3 rounded-2xl font-bold transition-all shadow-md shrink-0 ${
              isLoading || !activeSession.draftInput?.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-amber-500/20 active:scale-95'
            }`}
            title="ارسال پیام"
          >
            <Send className="w-4 h-4 rotate-180" />
          </button>
        </form>
      </div>

      {/* 6. Optional Gemini API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Key className="w-4 h-4" />
                <span>تنظیم کلید هوش مصنوعی Google Gemini (اختیاری)</span>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              این سامانه به صورت پیش‌فرض مجهز به موتور استدلال حقوقی داخلی است که بدون نیاز به اینترنت و بدون نیاز به کلید، تمام پرونده‌ها و مدارک را با قوانین ایران تطبیق می‌دهد.
              <br />
              چنانچه مایلید در محیط GitHub Pages از مدل‌های زنده هوش مصنوعی Google Gemini نیز استفاده کنید، می‌توانید کلید API رایگان خود را در کادر زیر وارد فرمایید (صرفاً در مرورگر شما ذخیره می‌گردد).
            </p>

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

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors"
              >
                ذخیره تنظیمات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
