import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { LegalDocument, PelakNode, CaseDomain, HolisticDossierAnalysis } from '../types/cadastre';
import { processFileForUpload } from '../utils/imageCompressor';
import { toPersianDigits } from '../utils/persian';

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  base64?: string;
  status: 'pending' | 'processing' | 'success' | 'unresolved' | 'error';
  progressMsg?: string;
  result?: any;
  error?: string;
  targetPelakId?: string;
}

export interface NewDossierFormState {
  title: string;
  domain: CaseDomain;
  client: string;
  defendant: string;
  caseNumber: string;
  sector: string;
  description: string;
}

interface BatchScanContextType {
  queue: QueueItem[];
  isProcessingBatch: boolean;
  isSynthesizing: boolean;
  currentProcessingIndex: number;
  batchNotes: string;
  defaultPelakId: string;
  dossierMode: 'new' | 'existing';
  newDossierData: NewDossierFormState;
  selectedExistingPelakId: string;
  reconcileToasts: Array<{ id: string; text: string; type?: 'reconcile' | 'synthesis' }>;
  addFilesToQueue: (files: FileList | File[], targetPelakId?: string) => void;
  startBatchProcessing: (
    pelaks: PelakNode[],
    documents: LegalDocument[],
    onDocumentAdded: (newDoc: LegalDocument | null, newPelakToCreate?: Partial<PelakNode>) => void,
    onReconcileDocs: (
      matches: Array<{ unresolvedDocId: string; targetPelakId: string; targetPelakCode: string; reason: string }>,
      rootDoc: LegalDocument
    ) => void,
    onUpdatePelak?: (pelakId: string, updates: Partial<PelakNode>) => void
  ) => Promise<void>;
  stopBatchProcessing: () => void;
  clearCompleted: () => void;
  removeQueueItem: (id: string) => void;
  setBatchNotes: (notes: string) => void;
  setDefaultPelakId: (id: string) => void;
  setDossierMode: (mode: 'new' | 'existing') => void;
  setNewDossierData: (data: Partial<NewDossierFormState>) => void;
  setSelectedExistingPelakId: (id: string) => void;
  dismissToast: (id: string) => void;
}

const BatchScanContext = createContext<BatchScanContextType | null>(null);

export const useBatchScan = () => {
  const ctx = useContext(BatchScanContext);
  if (!ctx) {
    throw new Error('useBatchScan must be used within a BatchScanProvider');
  }
  return ctx;
};

const initialNewDossierData: NewDossierFormState = {
  title: '',
  domain: 'general',
  client: '',
  defendant: '',
  caseNumber: '',
  sector: '',
  description: '',
};

export const BatchScanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [batchNotes, setBatchNotes] = useState('');
  const [defaultPelakId, setDefaultPelakId] = useState('');
  const [dossierMode, setDossierMode] = useState<'new' | 'existing'>('new');
  const [newDossierData, setNewDossierDataState] = useState<NewDossierFormState>(initialNewDossierData);
  const [selectedExistingPelakId, setSelectedExistingPelakId] = useState<string>('');
  const [reconcileToasts, setReconcileToasts] = useState<Array<{ id: string; text: string; type?: 'reconcile' | 'synthesis' }>>([]);

  const isCancelledRef = useRef(false);

  const setNewDossierData = (data: Partial<NewDossierFormState>) => {
    setNewDossierDataState((prev) => ({ ...prev, ...data }));
  };

  const dismissToast = (id: string) => {
    setReconcileToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addFilesToQueue = (files: FileList | File[], targetPelakId?: string) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Filter out duplicate files already in the queue
    const uniqueFiles = fileArray.filter((f) => {
      return !queue.some((q) => q.name === f.name && q.size === f.size);
    });

    if (uniqueFiles.length < fileArray.length) {
      setReconcileToasts((prev) => [
        ...prev,
        {
          id: `queue-dup-${Date.now()}`,
          text: `تعداد ${toPersianDigits(fileArray.length - uniqueFiles.length)} فایل تکراری به صورت خودکار از صف حذف شد.`,
          type: 'reconcile',
        },
      ]);
    }

    if (uniqueFiles.length === 0) return;

    const newItems: QueueItem[] = uniqueFiles.map((f) => ({
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      file: f,
      name: f.name,
      size: f.size,
      mimeType: f.type || 'image/jpeg',
      status: 'pending',
      targetPelakId: targetPelakId || selectedExistingPelakId || defaultPelakId || undefined,
    }));

    setQueue((prev) => [...prev, ...newItems]);
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'success' && item.status !== 'unresolved'));
  };

  const stopBatchProcessing = () => {
    isCancelledRef.current = true;
    setIsProcessingBatch(false);
    setCurrentProcessingIndex(-1);
  };

  const startBatchProcessing = useCallback(
    async (
      pelaks: PelakNode[],
      documents: LegalDocument[],
      onDocumentAdded: (newDoc: LegalDocument | null, newPelakToCreate?: Partial<PelakNode>) => void,
      onReconcileDocs: (
        matches: Array<{ unresolvedDocId: string; targetPelakId: string; targetPelakCode: string; reason: string }>,
        rootDoc: LegalDocument
      ) => void,
      onUpdatePelak?: (pelakId: string, updates: Partial<PelakNode>) => void
    ) => {
      if (isProcessingBatch) return;

      isCancelledRef.current = false;
      setIsProcessingBatch(true);

      let currentPelaks = [...pelaks];
      let currentUnresolvedDocs = documents.filter((d) => d.isPendingRoot || d.pelakId === 'unresolved');
      const newlyCreatedDocs: LegalDocument[] = [];

      // 1. Resolve Target Unified Dossier upfront
      let targetDossierId = '';
      let targetDossierCode = '';
      let targetDossierTitle = '';
      let targetDomain: CaseDomain = 'general';

      if (dossierMode === 'new') {
        targetDomain = newDossierData.domain || 'general';
        targetDossierTitle = newDossierData.title.trim() || 'پرونده جامع حقوقی/کیفری';
        const docNum = newDossierData.caseNumber.trim() || Date.now().toString().slice(-4);
        targetDossierCode = newDossierData.caseNumber.trim()
          ? (newDossierData.caseNumber.trim().startsWith('کلاسه') ? newDossierData.caseNumber.trim() : `کلاسه-${newDossierData.caseNumber.trim()}`)
          : `کلاسه-${docNum}`;
        targetDossierId = `dossier-${targetDomain}-${Date.now()}`;

        const createdPelak: PelakNode = {
          id: targetDossierId,
          code: targetDossierCode,
          mainNumber: docNum,
          sector: newDossierData.sector.trim() || 'شعبه رسیدگی‌کننده دادگاه / دادسرا',
          title: targetDossierTitle,
          areaM2: 0,
          ownerName: newDossierData.client.trim() || 'موکل پرونده',
          status: 'valid',
          childrenIds: [],
          description: newDossierData.description.trim() || `پرونده جامع ${targetDossierTitle} تشکیل‌شده جهت رسیدگی و ثبت دسته‌ای مدارک`,
          deedType: targetDomain === 'real_estate' ? 'تک‌برگی کاداستری' : 'پرونده قضایی حقوقی/کیفری',
          isNonLandDossier: targetDomain !== 'real_estate',
          dossierDomain: targetDomain,
          clientRole: 'وکیل مدافع / نماینده قانونی با اختیارات تام',
        };

        currentPelaks.push(createdPelak);
        // Register the new dossier immediately in the system
        onDocumentAdded(null, createdPelak);
      } else {
        // Mode is 'existing'
        const chosen = currentPelaks.find((p) => p.id === (selectedExistingPelakId || defaultPelakId));
        if (chosen) {
          targetDossierId = chosen.id;
          targetDossierCode = chosen.code;
          targetDossierTitle = chosen.title;
          targetDomain = chosen.dossierDomain || (chosen.isNonLandDossier ? 'general' : 'real_estate');
        } else if (currentPelaks.length > 0) {
          targetDossierId = currentPelaks[0].id;
          targetDossierCode = currentPelaks[0].code;
          targetDossierTitle = currentPelaks[0].title;
          targetDomain = currentPelaks[0].dossierDomain || 'general';
        }
      }

      // 2. Sequential Queue Execution
      for (let i = 0; i < queue.length; i++) {
        if (isCancelledRef.current) break;

        const currentItem = queue[i];
        if (currentItem.status === 'success') {
          continue;
        }

        setCurrentProcessingIndex(i);
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'processing', progressMsg: `در حال بهینه‌سازی و بررسی سند جهت الحاق به «${targetDossierTitle || targetDossierCode}»...` } : item
          )
        );

        try {
          // Optimize image or read file
          let base64 = currentItem.base64;
          let mimeType = currentItem.mimeType;

          if (!base64) {
            setQueue((prev) =>
              prev.map((item, idx) =>
                idx === i ? { ...item, progressMsg: 'در حال فشرده‌سازی تصویر سند...' } : item
              )
            );
            const processed = await processFileForUpload(currentItem.file);
            base64 = processed.base64;
            mimeType = processed.mimeType;
          }

          const cleanFileName = currentItem.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();

          // Call server with timeout & retry
          let analysisData: any = null;
          let fetchAttempts = 0;

          while (fetchAttempts < 2 && !analysisData) {
            fetchAttempts++;
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 35000);

              const res = await fetch('/api/analyze-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fileBase64: base64,
                  mimeType: mimeType,
                  fileName: cleanFileName,
                  userNotes: `نام فایل مدرک: ${cleanFileName}\nپرونده مادر: ${targetDossierTitle} (${targetDossierCode})\nحوزه دعوا: ${targetDomain}\nشاکی/موکل: ${newDossierData.client || ''}\nطرف مقابل: ${newDossierData.defendant || ''}\n${batchNotes}`,
                  currentPelakCode: targetDossierCode,
                }),
                signal: controller.signal,
              });
              clearTimeout(timeoutId);

              if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                  analysisData = json.data;
                }
              }
            } catch (netErr) {
              console.warn(`Attempt ${fetchAttempts} failed:`, netErr);
              if (fetchAttempts < 2) {
                await new Promise((r) => setTimeout(r, 1000));
              }
            }
          }

          // Robust semantic fallback derived specifically from cleanFileName
          if (!analysisData) {
            const nameLower = cleanFileName.toLowerCase();
            let cat: any = 'deed';
            let auth = newDossierData.sector || 'مرجع رسمی / پیوست پرونده';
            let summ = `مدرک پیوست‌شده به پرونده («${cleanFileName}») به عنوان ادله و مستندات اثباتی.`;
            let outcome = 'پیوست ادله پرونده و در جریان رسیدگی';

            if (nameLower.includes('رسید') || nameLower.includes('واریز') || nameLower.includes('فیش') || nameLower.includes('تراکنش') || nameLower.includes('حواله') || nameLower.includes('بانک') || nameLower.includes('پرینت')) {
              cat = 'inquiry';
              auth = 'شبکه بانکی / بانک عامل';
              summ = `رسید تراکنش و انتقال وجه بانکی («${cleanFileName}») ضبط‌شده در پرونده جهت اثبات واریزی‌ها یا تراکنش مالی.`;
              outcome = 'تایید انتقال مالی و سند پرداخت';
            } else if (nameLower.includes('چک') || nameLower.includes('سفته') || nameLower.includes('صیاد') || nameLower.includes('برات')) {
              cat = 'contract';
              auth = 'بانک صادرکننده سند تجاری';
              summ = `سند تجاری (چک/سفته) ضبط‌شده («${cleanFileName}») به عنوان مستند طلب مالی یا بزه صدور چک بلامحل.`;
              outcome = 'مستند مطالبه وجه و صدور اجراییه';
            } else if (nameLower.includes('فاکتور') || nameLower.includes('صورتحساب') || nameLower.includes('خرید') || nameLower.includes('فروش')) {
              cat = 'deed';
              auth = 'واحد صنفی / صادرکننده فاکتور';
              summ = `فاکتور مالی و صورتحساب خرید کالا/خدمات («${cleanFileName}») دال بر تعهدات مالی و اثبات هزینه‌کرد.`;
              outcome = 'مستند اثبات دیون و خسارات';
            } else if (nameLower.includes('قرارداد') || nameLower.includes('قولنامه') || nameLower.includes('مشارکت') || nameLower.includes('مبایعه') || nameLower.includes('صلح') || nameLower.includes('تعهد')) {
              cat = 'contract';
              auth = 'طرفین قرارداد / دفتر اسناد رسمی';
              summ = `قرارداد و توافق‌نامه مکتوب میان طرفین («${cleanFileName}») متضمن تعهدات قراردادی و شروط فی‌مابین.`;
              outcome = 'احراز تعهدات و الزامات قراردادی';
            } else if (nameLower.includes('لایحه') || nameLower.includes('دفاعیه') || nameLower.includes('اظهارنامه')) {
              cat = 'minutes';
              auth = 'شعبه رسیدگی‌کننده دادگاه / دادسرا';
              summ = `لایحه دفاعیه و اظهارات حقوقی تنظیمی («${cleanFileName}») حاوی دفاعیات ماهوی و استناد به موازین قانونی.`;
              outcome = 'ارسال به شعبه رسیدگی‌کننده پرونده';
            } else if (nameLower.includes('شکواییه') || nameLower.includes('دادخواست') || nameLower.includes('شکایت')) {
              cat = 'order';
              auth = 'دفتر خدمات الکترونیک قضایی / دادسرا';
              summ = `دادخواست یا شکواییه آغازین ثبت‌شده («${cleanFileName}») متضمن خواسته یا عنوان بزه انتسابی.`;
              outcome = 'ثبت در مرجع قضایی رسیدگی‌کننده';
            } else if (nameLower.includes('کارشناس') || nameLower.includes('گزارش') || nameLower.includes('استشهادیه') || nameLower.includes('پلیس') || nameLower.includes('کلانتری')) {
              cat = 'expert_report';
              auth = 'کانون کارشناسان / مرجع انتظامی';
              summ = `نظریه کارشناسی یا گزارش مرجع انتظامی («${cleanFileName}») متضمن معاینه محل و اظهارنظر فنی.`;
              outcome = 'دلیل کارشناسی و گزارش ضابطین';
            } else if (nameLower.includes('دادنامه') || nameLower.includes('رای') || nameLower.includes('حکم') || nameLower.includes('قرار')) {
              cat = 'verdict';
              auth = 'شعبه دادگاه عمومی حقوقی / کیفری';
              summ = `دادنامه یا تصمیم قضایی («${cleanFileName}») اصداری در خصوص دعوای مطروحه.`;
              outcome = 'رأی اصداری شعبه رسیدگی‌کننده';
            }

            analysisData = {
              title: cleanFileName,
              category: cat,
              caseDomain: targetDomain,
              suggestedDossierTitle: targetDossierTitle,
              documentNumber: (cleanFileName.match(/\d{3,}/)?.[0]) || `مدرک-${Date.now().toString().slice(-4)}`,
              issueDate: (cleanFileName.match(/\d{4}\/\d{2}\/\d{2}/)?.[0]) || '۱۴۰۳/۰۶/۰۱',
              authority: auth,
              summary: summ,
              parties: {
                claimant: newDossierData.client || 'موکل (وکیل تام‌الاختیار)',
                defendant: newDossierData.defendant || 'طرف دعوا / خوانده',
                advocate: 'وکیل پایه یک دادگستری با اختیارات تام',
              },
              riskLevel: 'medium',
              isForgedOrConflicting: false,
              isPelakUncertain: false,
              suggestedPelakCode: targetDossierCode,
              extractedEntities: {
                verdictOutcome: outcome,
                forgeryIndicators: [],
                relevantLegalArticles: ['قوانین آیین دادرسی، مدنی و تجارت'],
                nextActionNeeded: 'بررسی در راستای استراتژی دفاعی پرونده مادر',
              },
            };
          }

          // AUTOMATIC DEDUPLICATION: Check if file with same name or same document number already exists in this dossier
          const docNumCandidate = analysisData.documentNumber?.trim();
          const isGenericNum = !docNumCandidate || docNumCandidate.includes('مدرک-') || docNumCandidate.includes('پرونده-');

          const duplicateDoc = [...documents, ...newlyCreatedDocs].find((existingDoc) => {
            if (existingDoc.pelakId !== targetDossierId) return false;
            // Match on exact file name
            if (existingDoc.fileName && existingDoc.fileName === currentItem.name) return true;
            // Match on identical non-generic document number
            if (!isGenericNum && existingDoc.documentNumber && existingDoc.documentNumber === docNumCandidate) {
              return true;
            }
            // Match on identical title and issue date within same dossier
            if (
              existingDoc.title === (cleanFileName || analysisData.title) &&
              existingDoc.issueDate === (analysisData.issueDate || '۱۴۰۳/۰۶/۰۱')
            ) {
              return true;
            }
            return false;
          });

          if (duplicateDoc) {
            // Deduplication triggered: Mark queue item as merged and skip adding a duplicate copy
            setQueue((prev) =>
              prev.map((item, idx) =>
                idx === i
                  ? {
                      ...item,
                      status: 'success',
                      progressMsg: `فایل تکراری تشخیص داده شد و به صورت خودکار از ایجاد کپی مجدد جلوگیری شد.`,
                    }
                  : item
              )
            );

            setReconcileToasts((prev) => [
              ...prev,
              {
                id: `dup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                text: `فایل «${currentItem.name}» به عنوان سند تکراری شناسایی شد و به صورت خودکار از ثبت مجدد آن جلوگیری گردید.`,
                type: 'reconcile',
              },
            ]);
            continue; // Skip creating redundant duplicate!
          }

          // STRICT ATTRIBUTION: Guarantee document belongs to targeted unified dossier
          const docParties = {
            claimant: analysisData.parties?.claimant || newDossierData.client || 'موکل',
            defendant: analysisData.parties?.defendant || newDossierData.defendant || 'طرف دعوا',
            notaryOrSeller: analysisData.parties?.notaryOrSeller,
            buyer: analysisData.parties?.buyer,
            advocate: analysisData.parties?.advocate || 'وکیل پایه یک دادگستری',
          };

          // User Requirement: Default title MUST be the uploaded file's original name without extension!
          const defaultDocTitle = cleanFileName || analysisData.title || `مدرک ${currentItem.name}`;

          const newDoc: LegalDocument = {
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            pelakId: targetDossierId || 'unresolved',
            pelakCode: targetDossierCode || 'پرونده جامع حقوقی',
            title: defaultDocTitle,
            category: analysisData.category || 'deed',
            caseDomain: targetDomain,
            suggestedDossierTitle: targetDossierTitle,
            documentNumber: analysisData.documentNumber || `مدرک-${Date.now().toString().slice(-4)}`,
            issueDate: analysisData.issueDate || '۱۴۰۳/۰۶/۰۱',
            authority: analysisData.authority || newDossierData.sector || 'مرجع قضایی / رسمی',
            summary: analysisData.summary || `بررسی مدرک «${defaultDocTitle}» و الحاق به پرونده «${targetDossierTitle}»`,
            parties: docParties,
            riskLevel: analysisData.riskLevel || 'medium',
            isForgedOrConflicting: !!analysisData.isForgedOrConflicting,
            extractedEntities: analysisData.extractedEntities || {},
            isPendingRoot: false, // Unified dossier documents are never stranded!
            isPreloaded: false,
            fileName: currentItem.name,
            fileSize: currentItem.size,
            isStarred: false,
            scanImageUrl: base64,
            fileMimeType: mimeType,
          };

          // Register in system
          onDocumentAdded(newDoc);
          newlyCreatedDocs.push(newDoc);

          // Retroactive Reconciliation Check if relevant
          if (currentUnresolvedDocs.length > 0 && targetDossierId && targetDossierId !== 'unresolved') {
            try {
              const reconcileRes = await fetch('/api/reconcile-documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  newDocument: newDoc,
                  unresolvedDocs: currentUnresolvedDocs,
                  pelaks: currentPelaks,
                }),
              });
              if (reconcileRes.ok) {
                const recJson = await reconcileRes.json();
                if (recJson.success && recJson.matches && recJson.matches.length > 0) {
                  onReconcileDocs(recJson.matches, newDoc);

                  const matchCount = recJson.matches.length;
                  const matchedIds = new Set(recJson.matches.map((m: any) => m.unresolvedDocId));
                  currentUnresolvedDocs = currentUnresolvedDocs.filter((u) => !matchedIds.has(u.id));

                  const toastText = `کشف ریشه هوشمند: ${toPersianDigits(matchCount)} مدرک معلق قبلی به پرونده «${targetDossierCode}» تطبیق داده شد و منتقل گردید.`;
                  setReconcileToasts((prev) => [...prev, { id: `toast-${Date.now()}`, text: toastText, type: 'reconcile' }]);
                }
              }
            } catch (rErr) {
              console.warn('Reconcile check failed:', rErr);
            }
          }

          // Mark queue item success
          setQueue((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: 'success',
                    result: analysisData,
                    progressMsg: `ثبت موفق در پرونده ${targetDossierCode}`,
                  }
                : item
            )
          );
        } catch (itemErr: any) {
          console.error(`Item ${i} processing error:`, itemErr);
          setQueue((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: 'error',
                    error: itemErr?.message || 'خطا در خواندن یا تحلیل مدرک',
                  }
                : item
            )
          );
        }
      }

      // 3. Holistic Dossier Synthesis Phase
      // When batch processing completes, trigger comparative analysis of all evidence in target dossier
      if (targetDossierId && targetDossierId !== 'unresolved' && newlyCreatedDocs.length > 0) {
        setIsSynthesizing(true);
        try {
          // Collect all documents belonging to this dossier (existing + newly uploaded)
          const allDossierDocs = [
            ...documents.filter((d) => d.pelakId === targetDossierId),
            ...newlyCreatedDocs,
          ];

          const synthRes = await fetch('/api/synthesize-dossier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dossierId: targetDossierId,
              dossierTitle: targetDossierTitle,
              dossierDomain: targetDomain,
              documents: allDossierDocs,
              userNotes: batchNotes || newDossierData.description,
            }),
          });

          if (synthRes.ok) {
            const synthJson = await synthRes.json();
            if (synthJson.success && synthJson.analysis) {
              const analysis: HolisticDossierAnalysis = synthJson.analysis;
              if (onUpdatePelak) {
                onUpdatePelak(targetDossierId, {
                  holisticAnalysis: analysis,
                  description: analysis.synthesisSummary || newDossierData.description,
                });
              }

              const successToast = `تحلیل تطبیقی و سنتز پرونده «${targetDossierTitle}» با موفقیت ثبت شد (${toPersianDigits(allDossierDocs.length)} سند بررسی شد).`;
              setReconcileToasts((prev) => [
                ...prev,
                { id: `toast-synth-${Date.now()}`, text: successToast, type: 'synthesis' },
              ]);
            }
          }
        } catch (synthErr) {
          console.warn('Holistic dossier synthesis failed:', synthErr);
        } finally {
          setIsSynthesizing(false);
        }
      }

      setIsProcessingBatch(false);
      setCurrentProcessingIndex(-1);
    },
    [queue, isProcessingBatch, batchNotes, defaultPelakId, dossierMode, newDossierData, selectedExistingPelakId]
  );

  return (
    <BatchScanContext.Provider
      value={{
        queue,
        isProcessingBatch,
        isSynthesizing,
        currentProcessingIndex,
        batchNotes,
        defaultPelakId,
        dossierMode,
        newDossierData,
        selectedExistingPelakId,
        reconcileToasts,
        addFilesToQueue,
        startBatchProcessing,
        stopBatchProcessing,
        clearCompleted,
        removeQueueItem,
        setBatchNotes,
        setDefaultPelakId,
        setDossierMode,
        setNewDossierData,
        setSelectedExistingPelakId,
        dismissToast,
      }}
    >
      {children}
    </BatchScanContext.Provider>
  );
};
