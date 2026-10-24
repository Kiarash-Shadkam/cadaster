import { ChatSession, ChatMessage } from '../types/cadastre';
import { dbSaveChatSessions } from './indexedDb';

const STORAGE_KEY_SESSIONS = 'cadaster_legal_chat_sessions_v2';
const STORAGE_KEY_ACTIVE_ID = 'cadaster_legal_chat_active_session_id';

export const INITIAL_WELCOME_TEXT = `سلام و احترام همکار گرامی؛ من مستشار و دستیار ارشد حقوقی شما هستم.
تمامی پرونده‌ها، اسناد و مدارک مضبوط در کارتابل پیش روی من است و بر موازین قانون مدنی، تجارت، صدور چک، مجازات اسلامی، ثبت اسناد، آیین دادرسی و رویه قضایی مسلط هستم.
می‌توانید برای هر پرونده یا سند یک سربرگ گفتگوی مجزا ایجاد فرمایید. آماده‌ام به پرسش‌های حقوقی و کیفری شما به صورت تخصصی و منطبق با اسناد بارگذاری‌شده پاسخ دهم.`;

export function createDefaultSession(pelakId: string = 'all', title?: string): ChatSession {
  const id = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    title: title || 'مشاوره پرونده جدید',
    pelakId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    draftInput: '',
    messages: [
      {
        id: 'welcome',
        sender: 'agent',
        timestamp: 'هم‌اکنون',
        text: INITIAL_WELCOME_TEXT,
      },
    ],
  };
}

export function loadStoredSessions(): { sessions: ChatSession[]; activeSessionId: string } {
  if (typeof window === 'undefined') {
    const initial = createDefaultSession();
    return { sessions: [initial], activeSessionId: initial.id };
  }

  try {
    const rawSessions = localStorage.getItem(STORAGE_KEY_SESSIONS);
    let sessions: ChatSession[] = rawSessions ? JSON.parse(rawSessions) : [];

    if (!Array.isArray(sessions) || sessions.length === 0) {
      // Check legacy single-session chat messages if existing
      const legacyRaw = localStorage.getItem('cadaster_chat_history');
      let legacyMessages: ChatMessage[] = [];
      if (legacyRaw) {
        try {
          legacyMessages = JSON.parse(legacyRaw);
        } catch {
          // ignore
        }
      }

      const defaultSess = createDefaultSession();
      if (legacyMessages.length > 0) {
        defaultSess.messages = legacyMessages;
      }
      sessions = [defaultSess];
    }

    const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    const activeExists = sessions.some((s) => s.id === savedActiveId);
    const activeSessionId = activeExists ? (savedActiveId as string) : sessions[0].id;

    return { sessions, activeSessionId };
  } catch (err) {
    console.error('Failed to parse stored chat sessions:', err);
    const fallback = createDefaultSession();
    return { sessions: [fallback], activeSessionId: fallback.id };
  }
}

export function saveStoredSessions(sessions: ChatSession[], activeSessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeSessionId);
  } catch (err) {
    console.warn('Failed to save chat sessions to localStorage:', err);
  }
  dbSaveChatSessions(sessions).catch((e) => console.error(e));
}
