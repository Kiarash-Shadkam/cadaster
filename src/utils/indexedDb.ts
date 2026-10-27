import { PelakNode, LegalDocument, DisputeAlert, TimelineItem, ChatSession, LegalDeadline, FeeRecord } from '../types/cadastre';
import { INITIAL_PELAKS, INITIAL_DOCUMENTS, INITIAL_DISPUTES, INITIAL_TIMELINE } from '../data/cadastreData';

const DB_NAME = 'CadasterAttorneyVaultDB';
const DB_VERSION = 2;

export const STORES = {
  DOCUMENTS: 'documents',
  PELAKS: 'pelaks',
  DISPUTES: 'disputes',
  TIMELINE: 'timeline',
  CHAT_SESSIONS: 'chat_sessions',
  SETTINGS: 'settings',
  DEADLINES: 'deadlines',
  FEE_RECORDS: 'fee_records',
} as const;

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes and returns the IndexedDB singleton connection.
 */
export function getDb(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Documents Store
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        const docStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
        docStore.createIndex('pelakId', 'pelakId', { unique: false });
        docStore.createIndex('category', 'category', { unique: false });
        docStore.createIndex('issueDate', 'issueDate', { unique: false });
      }

      // 2. Pelaks Store
      if (!db.objectStoreNames.contains(STORES.PELAKS)) {
        const pelakStore = db.createObjectStore(STORES.PELAKS, { keyPath: 'id' });
        pelakStore.createIndex('code', 'code', { unique: false });
        pelakStore.createIndex('parentId', 'parentId', { unique: false });
      }

      // 3. Disputes Store
      if (!db.objectStoreNames.contains(STORES.DISPUTES)) {
        const dispStore = db.createObjectStore(STORES.DISPUTES, { keyPath: 'id' });
        dispStore.createIndex('pelakId', 'pelakId', { unique: false });
      }

      // 4. Timeline Store
      if (!db.objectStoreNames.contains(STORES.TIMELINE)) {
        const timeStore = db.createObjectStore(STORES.TIMELINE, { keyPath: 'id' });
        timeStore.createIndex('pelakId', 'pelakId', { unique: false });
      }

      // 5. Chat Sessions Store
      if (!db.objectStoreNames.contains(STORES.CHAT_SESSIONS)) {
        const chatStore = db.createObjectStore(STORES.CHAT_SESSIONS, { keyPath: 'id' });
        chatStore.createIndex('pelakId', 'pelakId', { unique: false });
      }

      // 6. Key-Value Settings Store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      // 7. Court Deadlines Store
      if (!db.objectStoreNames.contains(STORES.DEADLINES)) {
        const deadlineStore = db.createObjectStore(STORES.DEADLINES, { keyPath: 'id' });
        deadlineStore.createIndex('pelakId', 'pelakId', { unique: false });
        deadlineStore.createIndex('calculatedDueDate', 'calculatedDueDate', { unique: false });
      }

      // 8. Fee & Article 103 Accounting Store
      if (!db.objectStoreNames.contains(STORES.FEE_RECORDS)) {
        const feeStore = db.createObjectStore(STORES.FEE_RECORDS, { keyPath: 'id' });
        feeStore.createIndex('pelakId', 'pelakId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onclose = () => {
        dbInstance = null;
        dbInitPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbInitPromise;
}

/**
 * Generic helper to execute a read-write transaction to overwrite a whole store with an array of items.
 */
async function overwriteStore<T>(storeName: string, items: T[]): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      // Clear existing records first
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const item of items) {
          store.put(item);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`Failed to write to IndexedDB store ${storeName}:`, err);
  }
}

/**
 * Generic helper to read all items from an object store.
 */
async function readAllFromStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to read from IndexedDB store ${storeName}:`, err);
    return [];
  }
}

// -----------------------------------------------------------------------------
// Document Persistence (handles multi-megabyte base64 scans & PDFs with ease)
// -----------------------------------------------------------------------------

export async function dbSaveDocuments(docs: LegalDocument[]): Promise<void> {
  await overwriteStore(STORES.DOCUMENTS, docs);
}

export async function dbLoadDocuments(): Promise<LegalDocument[]> {
  const docs = await readAllFromStore<LegalDocument>(STORES.DOCUMENTS);
  return docs;
}

// -----------------------------------------------------------------------------
// Pelaks Persistence
// -----------------------------------------------------------------------------

export async function dbSavePelaks(pelaks: PelakNode[]): Promise<void> {
  await overwriteStore(STORES.PELAKS, pelaks);
}

export async function dbLoadPelaks(): Promise<PelakNode[]> {
  return await readAllFromStore<PelakNode>(STORES.PELAKS);
}

// -----------------------------------------------------------------------------
// Disputes Persistence
// -----------------------------------------------------------------------------

export async function dbSaveDisputes(disputes: DisputeAlert[]): Promise<void> {
  await overwriteStore(STORES.DISPUTES, disputes);
}

export async function dbLoadDisputes(): Promise<DisputeAlert[]> {
  return await readAllFromStore<DisputeAlert>(STORES.DISPUTES);
}

// -----------------------------------------------------------------------------
// Timeline Persistence
// -----------------------------------------------------------------------------

export async function dbSaveTimeline(timeline: TimelineItem[]): Promise<void> {
  await overwriteStore(STORES.TIMELINE, timeline);
}

export async function dbLoadTimeline(): Promise<TimelineItem[]> {
  return await readAllFromStore<TimelineItem>(STORES.TIMELINE);
}

// -----------------------------------------------------------------------------
// Chat Sessions Persistence
// -----------------------------------------------------------------------------

export async function dbSaveChatSessions(sessions: ChatSession[]): Promise<void> {
  await overwriteStore(STORES.CHAT_SESSIONS, sessions);
}

export async function dbLoadChatSessions(): Promise<ChatSession[]> {
  return await readAllFromStore<ChatSession>(STORES.CHAT_SESSIONS);
}

// -----------------------------------------------------------------------------
// Legal Deadlines Persistence
// -----------------------------------------------------------------------------

export async function dbSaveDeadlines(deadlines: LegalDeadline[]): Promise<void> {
  await overwriteStore(STORES.DEADLINES, deadlines);
}

export async function dbLoadDeadlines(): Promise<LegalDeadline[]> {
  return await readAllFromStore<LegalDeadline>(STORES.DEADLINES);
}

// -----------------------------------------------------------------------------
// Fee & Article 103 Accounting Records Persistence
// -----------------------------------------------------------------------------

export async function dbSaveFeeRecords(fees: FeeRecord[]): Promise<void> {
  await overwriteStore(STORES.FEE_RECORDS, fees);
}

export async function dbLoadFeeRecords(): Promise<FeeRecord[]> {
  return await readAllFromStore<FeeRecord>(STORES.FEE_RECORDS);
}

// -----------------------------------------------------------------------------
// Full Database Clear (for reset data feature)
// -----------------------------------------------------------------------------

export async function dbClearAll(): Promise<void> {
  try {
    const db = await getDb();
    const stores = [
      STORES.DOCUMENTS,
      STORES.PELAKS,
      STORES.DISPUTES,
      STORES.TIMELINE,
      STORES.CHAT_SESSIONS,
      STORES.SETTINGS,
      STORES.DEADLINES,
      STORES.FEE_RECORDS,
    ];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite');
      for (const s of stores) {
        tx.objectStore(s).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to clear IndexedDB:', err);
  }
}

// -----------------------------------------------------------------------------
// Unified Bootstrapper / Initializer with Migration from localStorage
// -----------------------------------------------------------------------------

export interface InitialDossierData {
  pelaks: PelakNode[];
  documents: LegalDocument[];
  disputes: DisputeAlert[];
  timeline: TimelineItem[];
  chatSessions?: ChatSession[];
  deadlines?: LegalDeadline[];
  feeRecords?: FeeRecord[];
}

/**
 * Initializes and loads data.
 * If IndexedDB is empty, it migrates from localStorage (or defaults to initial seed data)
 * and immediately writes it to IndexedDB so all future writes enjoy multi-gigabyte capacity.
 */
export async function initializeDatabase(): Promise<InitialDossierData> {
  try {
    await getDb();

    let [dbPelaks, dbDocs, dbDisputes, dbTimeline, dbChats, dbDeadlines, dbFees] = await Promise.all([
      dbLoadPelaks(),
      dbLoadDocuments(),
      dbLoadDisputes(),
      dbLoadTimeline(),
      dbLoadChatSessions(),
      dbLoadDeadlines(),
      dbLoadFeeRecords(),
    ]);

    // Check if IndexedDB already has populated documents or pelaks
    const hasData = dbPelaks.length > 0 || dbDocs.length > 0;

    if (!hasData) {
      console.log('IndexedDB is empty; migrating from localStorage / initial seed data...');

      // 1. Pelaks
      try {
        const savedPelaks = localStorage.getItem('cadastre_real_pelaks');
        dbPelaks = savedPelaks ? JSON.parse(savedPelaks) : INITIAL_PELAKS;
      } catch {
        dbPelaks = INITIAL_PELAKS;
      }

      // 2. Documents
      try {
        const savedDocs = localStorage.getItem('cadastre_real_documents');
        dbDocs = savedDocs ? JSON.parse(savedDocs) : INITIAL_DOCUMENTS;
      } catch {
        dbDocs = INITIAL_DOCUMENTS;
      }

      // 3. Disputes
      try {
        const savedDisputes = localStorage.getItem('cadastre_real_disputes');
        dbDisputes = savedDisputes ? JSON.parse(savedDisputes) : INITIAL_DISPUTES;
      } catch {
        dbDisputes = INITIAL_DISPUTES;
      }

      // 4. Timeline
      try {
        const savedTimeline = localStorage.getItem('cadastre_real_timeline');
        dbTimeline = savedTimeline ? JSON.parse(savedTimeline) : INITIAL_TIMELINE;
      } catch {
        dbTimeline = INITIAL_TIMELINE;
      }

      // 5. Chat Sessions
      try {
        const savedChats = localStorage.getItem('cadaster_legal_chat_sessions_v2');
        dbChats = savedChats ? JSON.parse(savedChats) : [];
      } catch {
        dbChats = [];
      }

      // 6. Deadlines
      try {
        const savedDeadlines = localStorage.getItem('cadaster_legal_deadlines');
        dbDeadlines = savedDeadlines ? JSON.parse(savedDeadlines) : [];
      } catch {
        dbDeadlines = [];
      }

      // 7. Fee Records
      try {
        const savedFees = localStorage.getItem('cadaster_legal_fee_records');
        dbFees = savedFees ? JSON.parse(savedFees) : [];
      } catch {
        dbFees = [];
      }

      // Write everything to IndexedDB right away
      await Promise.all([
        dbSavePelaks(dbPelaks),
        dbSaveDocuments(dbDocs),
        dbSaveDisputes(dbDisputes),
        dbSaveTimeline(dbTimeline),
        dbSaveChatSessions(dbChats),
        dbSaveDeadlines(dbDeadlines),
        dbSaveFeeRecords(dbFees),
      ]);
      console.log('Migration to IndexedDB completed successfully.');
    }

    return {
      pelaks: dbPelaks,
      documents: dbDocs,
      disputes: dbDisputes,
      timeline: dbTimeline,
      chatSessions: dbChats,
      deadlines: dbDeadlines,
      feeRecords: dbFees,
    };
  } catch (err) {
    console.error('IndexedDB initialization failed, falling back to localStorage/initial:', err);
    return {
      pelaks: INITIAL_PELAKS,
      documents: INITIAL_DOCUMENTS,
      disputes: INITIAL_DISPUTES,
      timeline: INITIAL_TIMELINE,
      deadlines: [],
      feeRecords: [],
    };
  }
}
