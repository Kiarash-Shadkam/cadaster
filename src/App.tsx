import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CadastreTree } from './components/CadastreTree';
import { CadastreMap } from './components/CadastreMap';
import { DocumentExplorer } from './components/DocumentExplorer';
import { TimelineDisputes } from './components/TimelineDisputes';
import { DocumentScanner } from './components/DocumentScanner';
import { LegalChatbot } from './components/LegalChatbot';
import { SecurityVault } from './components/SecurityVault';
import {
  INITIAL_PELAKS,
  INITIAL_DOCUMENTS,
  INITIAL_DISPUTES,
  INITIAL_TIMELINE,
} from './data/cadastreData';
import { PelakNode, LegalDocument, DisputeAlert, TimelineItem, VaultBackupData } from './types/cadastre';
import { Scale, ShieldCheck, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { BatchScanProvider, useBatchScan } from './context/BatchScanContext';
import { toPersianDigits } from './utils/persian';

function AppInner() {
  // Vault lock status: if a passcode is already saved, start locked; otherwise unlocked for first setup
  const [isVaultLocked, setIsVaultLocked] = useState<boolean>(() => {
    return !!localStorage.getItem('attorney_vault_passcode');
  });

  // Load real data from localStorage or start with clean initial arrays
  const [pelaks, setPelaks] = useState<PelakNode[]>(() => {
    try {
      const saved = localStorage.getItem('cadastre_real_pelaks');
      return saved ? JSON.parse(saved) : INITIAL_PELAKS;
    } catch {
      return INITIAL_PELAKS;
    }
  });

  const [documents, setDocuments] = useState<LegalDocument[]>(() => {
    try {
      const saved = localStorage.getItem('cadastre_real_documents');
      return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
    } catch {
      return INITIAL_DOCUMENTS;
    }
  });

  const [disputes, setDisputes] = useState<DisputeAlert[]>(() => {
    try {
      const saved = localStorage.getItem('cadastre_real_disputes');
      return saved ? JSON.parse(saved) : INITIAL_DISPUTES;
    } catch {
      return INITIAL_DISPUTES;
    }
  });

  const [timeline, setTimeline] = useState<TimelineItem[]>(() => {
    try {
      const saved = localStorage.getItem('cadastre_real_timeline');
      return saved ? JSON.parse(saved) : INITIAL_TIMELINE;
    } catch {
      return INITIAL_TIMELINE;
    }
  });

  const [selectedPelakId, setSelectedPelakId] = useState<string>(() => {
    return pelaks.length > 0 ? pelaks[0].id : '';
  });

  const [activeTab, setActiveTab] = useState<'cadastre' | 'documents' | 'timeline' | 'scanner' | 'chat'>('cadastre');
  const [chatInitialQuery, setChatInitialQuery] = useState<string | null>(null);

  // Background Batch Processing state from Context
  const { isProcessingBatch, queue, currentProcessingIndex } = useBatchScan();

  // Sync to secure local storage
  useEffect(() => {
    try {
      localStorage.setItem('cadastre_real_pelaks', JSON.stringify(pelaks));
    } catch (e) {
      console.error(e);
    }
  }, [pelaks]);

  useEffect(() => {
    try {
      localStorage.setItem('cadastre_real_documents', JSON.stringify(documents));
    } catch (e) {
      console.error(e);
    }
  }, [documents]);

  useEffect(() => {
    try {
      localStorage.setItem('cadastre_real_disputes', JSON.stringify(disputes));
    } catch (e) {
      console.error(e);
    }
  }, [disputes]);

  useEffect(() => {
    try {
      localStorage.setItem('cadastre_real_timeline', JSON.stringify(timeline));
    } catch (e) {
      console.error(e);
    }
  }, [timeline]);

  const selectedPelak = pelaks.find((p) => p.id === selectedPelakId) || (pelaks.length > 0 ? pelaks[0] : null);

  const handleAddPelak = (newNode: Partial<PelakNode>) => {
    const fullNode = newNode as PelakNode;
    setPelaks((prev) => [...prev, fullNode]);

    if (newNode.parentId) {
      setPelaks((prev) =>
        prev.map((p) =>
          p.id === newNode.parentId
            ? { ...p, childrenIds: [...(p.childrenIds || []), fullNode.id] }
            : p
        )
      );
    }
    setSelectedPelakId(fullNode.id);
  };

  const handleUpdatePelak = (pelakId: string, updates: Partial<PelakNode>) => {
    setPelaks((prev) =>
      prev.map((p) => (p.id === pelakId ? { ...p, ...updates } : p))
    );
  };

  const handleDeletePelak = (pelakId: string) => {
    setPelaks((prev) => prev.filter((p) => p.id !== pelakId));
    // Reassign documents to unresolved so important evidence is never lost
    setDocuments((prev) =>
      prev.map((d) =>
        d.pelakId === pelakId
          ? {
              ...d,
              pelakId: 'unresolved',
              pelakCode: 'موضوع نامشخص',
              isPendingRoot: true,
              reconciliationNote: 'پرونده مبدأ حذف گردید و این مدرک به بخش اسناد نامشخص منتقل شد.',
            }
          : d
      )
    );
    setSelectedPelakId((prev) => (prev === pelakId ? 'all' : prev));
  };

  const handleUpdateDocument = (docId: string, updates: Partial<LegalDocument>) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;
        let newPelakCode = d.pelakCode;
        if (updates.pelakId && updates.pelakId !== d.pelakId) {
          const target = pelaks.find((p) => p.id === updates.pelakId);
          if (target) newPelakCode = target.code;
        }
        return { ...d, ...updates, pelakCode: newPelakCode };
      })
    );
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setTimeline((prev) => prev.filter((t) => t.docId !== docId));
  };

  const handleToggleStarDocument = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, isStarred: !d.isStarred } : d))
    );
  };

  const handleAutoDeduplicate = (targetPelakId?: string): number => {
    let removedCount = 0;
    setDocuments((prev) => {
      const keptDocs: LegalDocument[] = [];
      const seenSignatures = new Set<string>();

      for (const doc of prev) {
        if (targetPelakId && targetPelakId !== 'all' && doc.pelakId !== targetPelakId) {
          keptDocs.push(doc);
          continue;
        }

        const isGenericDocNum =
          !doc.documentNumber ||
          doc.documentNumber.includes('مدرک-') ||
          doc.documentNumber.includes('پرونده-');

        const fileSig = doc.fileName ? `${doc.pelakId}_file_${doc.fileName}` : null;
        const numSig = !isGenericDocNum ? `${doc.pelakId}_num_${doc.documentNumber}` : null;
        const contentSig = `${doc.pelakId}_title_${doc.title}_date_${doc.issueDate}`;

        const isDup =
          (fileSig && seenSignatures.has(fileSig)) ||
          (numSig && seenSignatures.has(numSig)) ||
          seenSignatures.has(contentSig);

        if (isDup) {
          removedCount++;
        } else {
          if (fileSig) seenSignatures.add(fileSig);
          if (numSig) seenSignatures.add(numSig);
          seenSignatures.add(contentSig);
          keptDocs.push(doc);
        }
      }

      return keptDocs;
    });

    return removedCount;
  };

  const handleMergeDocuments = (
    docIds: string[],
    targetPelakId: string,
    targetPelakCode: string,
    newPelakToCreate?: Partial<PelakNode>
  ) => {
    if (newPelakToCreate) {
      const fullPelak = newPelakToCreate as PelakNode;
      setPelaks((prev) => {
        const exists = prev.some((p) => p.id === fullPelak.id || p.code === fullPelak.code);
        return exists ? prev : [...prev, fullPelak];
      });
      setSelectedPelakId(fullPelak.id);
    } else {
      setSelectedPelakId(targetPelakId);
    }

    setDocuments((prev) =>
      prev.map((d) =>
        docIds.includes(d.id)
          ? {
              ...d,
              pelakId: targetPelakId,
              pelakCode: targetPelakCode,
              isPendingRoot: false,
              linkedFromUnresolved: true,
              reconciliationNote: `ادغام دسته‌ای در پرونده «${targetPelakCode}»`,
            }
          : d
      )
    );

    setTimeline((prev) =>
      prev.map((t) =>
        t.docId && docIds.includes(t.docId)
          ? {
              ...t,
              pelakId: targetPelakId,
              pelakCode: targetPelakCode,
            }
          : t
      )
    );
  };

  const handleDocumentAdded = (newDoc: LegalDocument | null, newPelakToCreate?: Partial<PelakNode>) => {
    // If a new pelak or dossier was created/discovered, automatically add it
    if (newPelakToCreate) {
      const fullPelak = newPelakToCreate as PelakNode;
      setPelaks((prev) => {
        const exists = prev.some((p) => p.code === fullPelak.code || p.id === fullPelak.id);
        return exists ? prev : [...prev, fullPelak];
      });
      setSelectedPelakId(fullPelak.id);
    }

    if (!newDoc) return;

    setDocuments((prev) => [newDoc, ...prev]);

    // Timeline event
    const newTimelineItem: TimelineItem = {
      id: `tl-${Date.now()}`,
      pelakId: newDoc.pelakId,
      pelakCode: newDoc.pelakCode,
      date: newDoc.issueDate,
      title: newDoc.title,
      type: newDoc.category === 'verdict' ? 'court' : newDoc.category === 'deed' ? 'deed' : 'inquiry',
      authority: newDoc.authority,
      description: newDoc.summary,
      docId: newDoc.id,
      isKeyMilestone: newDoc.category === 'verdict' || newDoc.category === 'deed',
    };
    setTimeline((prev) => [newTimelineItem, ...prev]);

    // Dispute alert if forged or conflicting
    if (newDoc.isForgedOrConflicting) {
      const newDispute: DisputeAlert = {
        id: `disp-${Date.now()}`,
        pelakId: newDoc.pelakId,
        pelakCode: newDoc.pelakCode,
        title: `پرونده تعارض/جعل: ${newDoc.title}`,
        disputeType: 'فروش مال غیر',
        severity: 'high',
        involvedParties: [
          newDoc.parties.claimant || 'شاکی',
          newDoc.parties.defendant || 'متهم',
        ],
        conflictingDocs: [newDoc.documentNumber],
        courtBranch: newDoc.authority,
        caseNumber: newDoc.documentNumber,
        legalStatus: 'رسیدگی در دادگاه تجدیدنظر',
        strategyNote: newDoc.extractedEntities.nextActionNeeded || 'پیگیری دستور ابطال سند معارض در اداره ثبت اسناد',
      };
      setDisputes((prev) => [newDispute, ...prev]);
    }
  };

  const handleViewDocuments = (pelakId: string) => {
    setSelectedPelakId(pelakId);
    setActiveTab('documents');
  };

  const handleOpenChat = (pelakId: string, customQuery?: string) => {
    setSelectedPelakId(pelakId);
    if (customQuery) {
      setChatInitialQuery(customQuery);
    }
    setActiveTab('chat');
  };

  const handleAskAboutDoc = (doc: LegalDocument) => {
    setSelectedPelakId(doc.pelakId);
    setChatInitialQuery(
      `در مورد سند «${doc.title}» با شماره «${doc.documentNumber}» مربوط به پرونده «${doc.pelakCode}»، مفاد حقوقی، استناد به احکام و اقدام بعدی وکیل را تشریح کن.`
    );
    setActiveTab('chat');
  };

  const handleReconcileDocs = (
    matches: Array<{ unresolvedDocId: string; targetPelakId: string; targetPelakCode: string; reason: string }>,
    rootDoc: LegalDocument
  ) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        const match = matches.find((m) => m.unresolvedDocId === doc.id);
        if (match) {
          return {
            ...doc,
            isPendingRoot: false,
            pelakId: match.targetPelakId,
            pelakCode: match.targetPelakCode,
            linkedFromUnresolved: true,
            reconciliationNote: match.reason,
          };
        }
        return doc;
      })
    );

    // Also update timeline items corresponding to those documents
    setTimeline((prev) =>
      prev.map((t) => {
        const match = matches.find((m) => m.unresolvedDocId === t.docId);
        if (match) {
          return {
            ...t,
            pelakId: match.targetPelakId,
            pelakCode: match.targetPelakCode,
          };
        }
        return t;
      })
    );
  };

  const handleManualReconcile = (docId: string, targetPelakId: string) => {
    const targetPelak = pelaks.find((p) => p.id === targetPelakId);
    if (!targetPelak) return;

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              isPendingRoot: false,
              pelakId: targetPelak.id,
              pelakCode: targetPelak.code,
              linkedFromUnresolved: true,
              reconciliationNote: `انتساب دستی توسط وکیل به ${targetPelak.code}`,
            }
          : d
      )
    );

    setTimeline((prev) =>
      prev.map((t) =>
        t.docId === docId
          ? { ...t, pelakId: targetPelak.id, pelakCode: targetPelak.code }
          : t
      )
    );
  };

  const handleRestoreBackup = (data: VaultBackupData) => {
    if (data.pelaks) setPelaks(data.pelaks);
    if (data.documents) setDocuments(data.documents);
    if (data.disputes) setDisputes(data.disputes);
    if (data.timeline) setTimeline(data.timeline);
    if (data.pelaks && data.pelaks.length > 0) {
      setSelectedPelakId(data.pelaks[0].id);
    }
    setIsVaultLocked(false);
  };

  const handleClearAllData = () => {
    if (confirm('هشدار: آیا اطمینان دارید که می‌خواهید تمامی داده‌ها، پلاک‌ها و اسناد ثبت‌شده را کاملاً پاکسازی فرمایید؟ این عملیات غیرقابل بازگشت است.')) {
      setPelaks([]);
      setDocuments([]);
      setDisputes([]);
      setTimeline([]);
      setSelectedPelakId('');
      localStorage.removeItem('cadastre_real_pelaks');
      localStorage.removeItem('cadastre_real_documents');
      localStorage.removeItem('cadastre_real_disputes');
      localStorage.removeItem('cadastre_real_timeline');
    }
  };

  const handleExportBackup = () => {
    const backupData: VaultBackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      pelaks,
      documents,
      disputes,
      timeline,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadastre-legal-vault-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validDeedsCount = pelaks.filter((p) => p.status === 'valid').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Confidential Security Lock Modal */}
      <SecurityVault
        isLocked={isVaultLocked}
        onUnlock={() => setIsVaultLocked(false)}
        onLock={() => setIsVaultLocked(true)}
        pelaks={pelaks}
        documents={documents}
        disputes={disputes}
        timeline={timeline}
        onRestoreBackup={handleRestoreBackup}
        onClearAllData={handleClearAllData}
      />

      {/* Persistent Background Batch Processing Status Ribbon */}
      {isProcessingBatch && (
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/40 px-4 py-2 text-xs flex items-center justify-between shadow-lg sticky top-0 z-40 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-amber-200">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            <span className="font-bold">
              ایجنت هوشمند در حال پردازش دسته‌ای اسناد در پس‌زمینه:
            </span>
            <span className="font-mono text-amber-300 font-bold">
              سند {toPersianDigits(currentProcessingIndex + 1)} از {toPersianDigits(queue.length)}
            </span>
            {queue[currentProcessingIndex] && (
              <span className="text-slate-400 hidden sm:inline truncate max-w-sm">
                («{queue[currentProcessingIndex].name}»)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('scanner')}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] transition-colors flex items-center gap-1 shadow-sm"
            >
              مشاهده کارتابل اسکن
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setChatInitialQuery(null);
        }}
        selectedPelak={selectedPelak}
        totalPelaksCount={pelaks.length}
        totalDocsCount={documents.length}
        disputesCount={disputes.length}
        validDeedsCount={validDeedsCount}
        onLockVault={() => setIsVaultLocked(true)}
        onExportBackup={handleExportBackup}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {activeTab === 'cadastre' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
            {/* Hierarchical Cadastral Tree Column */}
            <div className="lg:col-span-5 h-[700px]">
              <CadastreTree
                pelaks={pelaks}
                documents={documents}
                selectedPelakId={selectedPelakId}
                onSelectPelak={setSelectedPelakId}
                onAddPelak={handleAddPelak}
                onUpdatePelak={handleUpdatePelak}
                onGoToScanner={() => setActiveTab('scanner')}
              />
            </div>

            {/* Cadastral Map Visualizer Column */}
            <div className="lg:col-span-7 h-[700px]">
              <CadastreMap
                pelaks={pelaks}
                selectedPelakId={selectedPelakId}
                onSelectPelak={setSelectedPelakId}
                onViewDocuments={handleViewDocuments}
                onOpenChat={handleOpenChat}
                documents={documents}
                onUpdatePelak={handleUpdatePelak}
                onDeletePelak={handleDeletePelak}
                onDeleteDocument={handleDeleteDocument}
                onToggleStarDocument={handleToggleStarDocument}
              />
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentExplorer
            documents={documents}
            pelaks={pelaks}
            selectedPelakId={selectedPelakId}
            onSelectPelak={setSelectedPelakId}
            onAskAboutDoc={handleAskAboutDoc}
            onGoToScanner={() => setActiveTab('scanner')}
            onManualReconcile={handleManualReconcile}
            onMergeDocuments={handleMergeDocuments}
            onUpdatePelak={handleUpdatePelak}
            onDeletePelak={handleDeletePelak}
            onUpdateDocument={handleUpdateDocument}
            onDeleteDocument={handleDeleteDocument}
            onToggleStarDocument={handleToggleStarDocument}
            onAutoDeduplicate={handleAutoDeduplicate}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineDisputes
            timeline={timeline}
            disputes={disputes}
            pelaks={pelaks}
            selectedPelakId={selectedPelakId}
            onSelectPelak={setSelectedPelakId}
            onOpenChatWithTopic={(topic) => handleOpenChat(selectedPelakId, topic)}
            onGoToScanner={() => setActiveTab('scanner')}
          />
        )}

        {/* Document Scanner is kept mounted in hidden div to guarantee continuous background processing across tabs */}
        <div className={activeTab === 'scanner' ? 'block' : 'hidden'}>
          <DocumentScanner
            pelaks={pelaks}
            documents={documents}
            selectedPelakId={selectedPelakId}
            onDocumentAdded={handleDocumentAdded}
            onReconcileDocs={handleReconcileDocs}
            onUpdatePelak={handleUpdatePelak}
            onGoToTree={() => setActiveTab('cadastre')}
          />
        </div>

        {activeTab === 'chat' && (
          <LegalChatbot
            pelaks={pelaks}
            documents={documents}
            disputes={disputes}
            timeline={timeline}
            selectedPelakId={selectedPelakId}
            onSelectPelak={setSelectedPelakId}
            initialQuery={chatInitialQuery}
            onGoToScanner={() => setActiveTab('scanner')}
          />
        )}
      </main>

      {/* Persistent Background Batch Processing Floating Indicator */}
      {isProcessingBatch && activeTab !== 'scanner' && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900/95 border border-amber-500/70 shadow-2xl rounded-2xl p-3.5 flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-bottom-4 ring-1 ring-amber-500/20">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-white flex items-center gap-2">
              <span>ایجنت اسکن در پس‌زمینه فعال است</span>
              <span className="font-mono text-amber-400 tabular-nums">
                ({toPersianDigits(currentProcessingIndex + 1)} از {toPersianDigits(queue.length)})
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
              {queue[currentProcessingIndex]?.name || 'در حال تحلیل هوشمند اسناد...'}
            </div>
          </div>
          <button
            onClick={() => setActiveTab('scanner')}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors ml-1 shrink-0"
          >
            مشاهده صف اسکن
          </button>
        </div>
      )}

      {/* Bottom Legal Notice & Privacy Status */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-3 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="w-3.5 h-3.5 text-amber-500" />
            <span>سامانه اتوماسیون کاداستر و اسناد وکیل - گاوصندوق انحصاری تک‌کاربره</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              داده‌ها کاملاً ایزوله محلی و عاری از هرگونه اطلاعات فرضی
            </span>
            <span>·</span>
            <button
              onClick={handleClearAllData}
              className="text-slate-500 hover:text-rose-400 transition-colors"
            >
              پاکسازی کامل پایگاه داده
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BatchScanProvider>
      <AppInner />
    </BatchScanProvider>
  );
}
