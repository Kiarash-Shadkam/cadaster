import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { CadastreTree } from './components/CadastreTree';
import { CadastreMap } from './components/CadastreMap';
import { DocumentExplorer } from './components/DocumentExplorer';
import { TimelineDisputes } from './components/TimelineDisputes';
import { DocumentScanner } from './components/DocumentScanner';
import { LegalChatbot } from './components/LegalChatbot';
import { SecurityVault } from './components/SecurityVault';
import { CaseStatusChart } from './components/CaseStatusChart';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { LawyerDesk } from './components/LawyerDesk/LawyerDesk';
import { CaseSharingModal } from './components/CaseSharingModal';
import { DelegatedPortalBanner } from './components/DelegatedPortalBanner';
import { DelegatedAccessGateModal } from './components/DelegatedAccessGateModal';
import { ClaimDelegatedCaseModal } from './components/ClaimDelegatedCaseModal';
import {
  INITIAL_PELAKS,
  INITIAL_DOCUMENTS,
  INITIAL_DISPUTES,
  INITIAL_TIMELINE,
} from './data/cadastreData';
import {
  PelakNode,
  LegalDocument,
  DisputeAlert,
  TimelineItem,
  VaultBackupData,
  LegalDeadline,
  FeeRecord,
  SharedAccessGrant,
  DelegatedSession,
  ClaimedDelegatedCase,
} from './types/cadastre';
import { Scale, ShieldCheck, Loader2, Sparkles, ArrowLeft, Share2, FolderDown } from 'lucide-react';
import { BatchScanProvider, useBatchScan } from './context/BatchScanContext';
import { toPersianDigits } from './utils/persian';
import { getDeadlineUrgency } from './utils/legalFormulas';
import {
  getStoredGrants,
  validateGrantAccess,
  recordAuditLog,
  getClaimedCases,
  removeClaimedCase,
} from './services/accessControlService';

import {
  initializeDatabase,
  dbSaveDocuments,
  dbSavePelaks,
  dbSaveDisputes,
  dbSaveTimeline,
  dbSaveDeadlines,
  dbSaveFeeRecords,
  dbClearAll,
} from './utils/indexedDb';
import { getSecurityProfile } from './utils/securityEngine';

function AppInner() {
  // Vault lock status: if a passcode is already saved, start locked; otherwise unlocked for first setup
  const [isVaultLocked, setIsVaultLocked] = useState<boolean>(() => {
    return !!localStorage.getItem('attorney_vault_passcode');
  });
  const [isSecuritySettingsOpen, setIsSecuritySettingsOpen] = useState<boolean>(false);

  // Inactivity auto-lock based on lawyer's security profile configuration
  useEffect(() => {
    if (isVaultLocked) return;

    let timeoutId: any = null;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      const profile = getSecurityProfile();
      const minutes = profile?.autoLockMinutes ?? 10;
      if (minutes > 0) {
        timeoutId = setTimeout(() => {
          setIsVaultLocked(true);
        }, minutes * 60 * 1000);
      }
    };

    const activityEvents = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [isVaultLocked]);

  // State initialized with initial/cached data, then hydrated from high-capacity IndexedDB
  const [pelaks, setPelaks] = useState<PelakNode[]>(INITIAL_PELAKS);
  const [documents, setDocuments] = useState<LegalDocument[]>(INITIAL_DOCUMENTS);
  const [disputes, setDisputes] = useState<DisputeAlert[]>(INITIAL_DISPUTES);
  const [timeline, setTimeline] = useState<TimelineItem[]>(INITIAL_TIMELINE);
  const [deadlines, setDeadlines] = useState<LegalDeadline[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [selectedPelakId, setSelectedPelakId] = useState<string>('');
  const [isDbLoaded, setIsDbLoaded] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'cadastre' | 'documents' | 'timeline' | 'scanner' | 'chat' | 'lawyerDesk'>('cadastre');
  const [chatInitialQuery, setChatInitialQuery] = useState<string | null>(null);

  // Global search modal & status filter states
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | undefined>(undefined);

  // Delegation & Access Control State
  const [grants, setGrants] = useState<SharedAccessGrant[]>(() => getStoredGrants());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimedCases, setClaimedCases] = useState<ClaimedDelegatedCase[]>(() => getClaimedCases());
  const [preSelectedCaseIdsForShare, setPreSelectedCaseIdsForShare] = useState<string[]>([]);
  const [activeDelegatedSession, setActiveDelegatedSession] = useState<DelegatedSession | null>(null);
  const [pendingGrantForGate, setPendingGrantForGate] = useState<SharedAccessGrant | null>(null);

  const refreshGrants = () => {
    setGrants(getStoredGrants());
  };

  const handleCaseClaimed = (newClaim: ClaimedDelegatedCase) => {
    const updated = getClaimedCases();
    setClaimedCases(updated);
    setSelectedPelakId(newClaim.caseId);
  };

  const handleRemoveClaimedCase = (caseId: string) => {
    removeClaimedCase(caseId);
    setClaimedCases(getClaimedCases());
  };

  // URL query parameter check for ?access_token=...
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('access_token');
    if (token) {
      const allGrants = getStoredGrants();
      const targetGrant = allGrants.find((g) => g.id === token);
      if (targetGrant) {
        if (targetGrant.totpSecret || targetGrant.recipientNationalId || targetGrant.pinCode) {
          setPendingGrantForGate(targetGrant);
        } else {
          const valRes = validateGrantAccess({ grantId: targetGrant.id });
          if (valRes.success && valRes.grant) {
            setActiveDelegatedSession({ grant: valRes.grant, authenticatedAt: new Date().toISOString() });
            if (valRes.grant.caseIds.length > 0) {
              setSelectedPelakId(valRes.grant.caseIds[0]);
            }
          } else {
            alert(valRes.error || 'خطا در اعتبارسنجی پیوند دسترسی');
          }
        }
      }
    }
  }, []);

  const handleSwitchToDelegatedSession = (grant: SharedAccessGrant) => {
    if (grant.totpSecret || grant.recipientNationalId || grant.pinCode) {
      setPendingGrantForGate(grant);
    } else {
      const valRes = validateGrantAccess({ grantId: grant.id });
      if (valRes.success && valRes.grant) {
        setActiveDelegatedSession({ grant: valRes.grant, authenticatedAt: new Date().toISOString() });
        if (valRes.grant.caseIds.length > 0) {
          setSelectedPelakId(valRes.grant.caseIds[0]);
        }
      }
    }
  };

  const handleExitDelegatedSession = () => {
    setActiveDelegatedSession(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('access_token');
    window.history.replaceState({}, '', url.pathname);
    if (pelaks.length > 0) {
      setSelectedPelakId(pelaks[0].id);
    }
  };

  const handleOpenShareModal = (caseIds?: string[]) => {
    setPreSelectedCaseIdsForShare(
      caseIds && caseIds.length > 0 ? caseIds : selectedPelakId ? [selectedPelakId] : []
    );
    setIsShareModalOpen(true);
  };

  // Global search keyboard shortcut (Ctrl + K or Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Background Batch Processing state from Context
  const { isProcessingBatch, queue, currentProcessingIndex } = useBatchScan();

  // 1. Initial Load from high-capacity IndexedDB
  useEffect(() => {
    let isSubscribed = true;
    initializeDatabase()
      .then((data) => {
        if (!isSubscribed) return;
        setPelaks(data.pelaks);
        setDocuments(data.documents);
        setDisputes(data.disputes);
        setTimeline(data.timeline);
        setDeadlines(data.deadlines || []);
        setFeeRecords(data.feeRecords || []);
        if (data.pelaks.length > 0) {
          setSelectedPelakId((prev) => (prev && data.pelaks.some((p) => p.id === prev) ? prev : data.pelaks[0].id));
        }
        setIsDbLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to initialize IndexedDB:', err);
        setIsDbLoaded(true);
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  // 2. High-capacity asynchronous IndexedDB persistence (capable of hundreds of MBs of scanned PDFs and images)
  useEffect(() => {
    if (!isDbLoaded) return;
    dbSavePelaks(pelaks);
  }, [pelaks, isDbLoaded]);

  useEffect(() => {
    if (!isDbLoaded) return;
    dbSaveDocuments(documents);
  }, [documents, isDbLoaded]);

  useEffect(() => {
    if (!isDbLoaded) return;
    dbSaveDisputes(disputes);
  }, [disputes, isDbLoaded]);

  useEffect(() => {
    if (!isDbLoaded) return;
    dbSaveTimeline(timeline);
  }, [timeline, isDbLoaded]);

  useEffect(() => {
    if (!isDbLoaded) return;
    dbSaveDeadlines(deadlines);
  }, [deadlines, isDbLoaded]);

  useEffect(() => {
    if (!isDbLoaded) return;
    dbSaveFeeRecords(feeRecords);
  }, [feeRecords, isDbLoaded]);

  // Combine local pelaks and any claimed delegated cases from other accounts
  const combinedPelaks = useMemo(() => {
    const list = [...pelaks];
    claimedCases.forEach((claim) => {
      if (!list.some((p) => p.id === claim.caseId)) {
        list.push({
          ...claim.caseSnapshot,
          id: claim.caseId,
          code: claim.caseCode,
          title: `[تفویض‌شده] ${claim.caseTitle}`,
          description: `${claim.caseSnapshot.description || ''} (تفویض‌شده از: ${claim.delegatorName})`,
        });
      }
    });
    return list;
  }, [pelaks, claimedCases]);

  const combinedDocuments = useMemo(() => {
    const list = [...documents];
    claimedCases.forEach((claim) => {
      if (claim.documentsSnapshot && Array.isArray(claim.documentsSnapshot)) {
        claim.documentsSnapshot.forEach((doc) => {
          if (!list.some((d) => d.id === doc.id)) {
            list.push(doc);
          }
        });
      }
    });
    return list;
  }, [documents, claimedCases]);

  // Effective Pelaks & Documents strictly restricted when in delegated session
  const effectivePelaks = useMemo(() => {
    if (!activeDelegatedSession) return combinedPelaks;
    const allowed = new Set(activeDelegatedSession.grant.caseIds);
    return combinedPelaks.filter((p) => allowed.has(p.id));
  }, [combinedPelaks, activeDelegatedSession]);

  const effectiveDocuments = useMemo(() => {
    if (!activeDelegatedSession) return combinedDocuments;
    const allowed = new Set(activeDelegatedSession.grant.caseIds);
    return combinedDocuments.filter((d) => allowed.has(d.pelakId));
  }, [combinedDocuments, activeDelegatedSession]);

  // Keep selectedPelakId aligned with effectivePelaks
  useEffect(() => {
    if (activeDelegatedSession && effectivePelaks.length > 0) {
      if (!effectivePelaks.some((p) => p.id === selectedPelakId)) {
        setSelectedPelakId(effectivePelaks[0].id);
      }
    }
  }, [activeDelegatedSession, effectivePelaks, selectedPelakId]);

  const selectedPelak = effectivePelaks.find((p) => p.id === selectedPelakId) || (effectivePelaks.length > 0 ? effectivePelaks[0] : null);

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
    if (data.deadlines) setDeadlines(data.deadlines);
    if (data.feeRecords) setFeeRecords(data.feeRecords);
    if (data.pelaks && data.pelaks.length > 0) {
      setSelectedPelakId(data.pelaks[0].id);
    }
    setIsVaultLocked(false);
  };

  const handleClearAllData = async () => {
    if (confirm('هشدار: آیا اطمینان دارید که می‌خواهید تمامی داده‌ها، پلاک‌ها و اسناد ثبت‌شده را کاملاً پاکسازی فرمایید؟ این عملیات غیرقابل بازگشت است.')) {
      setPelaks([]);
      setDocuments([]);
      setDisputes([]);
      setTimeline([]);
      setDeadlines([]);
      setFeeRecords([]);
      setSelectedPelakId('');
      await dbClearAll();
      localStorage.removeItem('cadastre_real_pelaks');
      localStorage.removeItem('cadastre_real_documents');
      localStorage.removeItem('cadastre_real_disputes');
      localStorage.removeItem('cadastre_real_timeline');
      localStorage.removeItem('cadaster_legal_chat_sessions_v2');
      localStorage.removeItem('cadaster_legal_chat_active_session_id');
      localStorage.removeItem('cadaster_legal_deadlines');
      localStorage.removeItem('cadaster_legal_fee_records');
    }
  };

  const handleExportBackup = () => {
    let chatSessions = [];
    try {
      const stored = localStorage.getItem('cadaster_legal_chat_sessions_v2');
      if (stored) chatSessions = JSON.parse(stored);
    } catch {}

    const backupData: VaultBackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      pelaks,
      documents,
      disputes,
      timeline,
      chatSessions,
      deadlines,
      feeRecords,
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

  const urgentDeadlinesCount = useMemo(() => {
    return deadlines.filter((d) => {
      if (d.isCompleted) return false;
      const urgency = getDeadlineUrgency(d.calculatedDueDate);
      return urgency.status === 'urgent' || urgency.status === 'expired';
    }).length;
  }, [deadlines]);

  // Strict land pelak count: only counts genuine real estate properties, excluding non-land dossiers
  const landPelaksCount = useMemo(() => {
    return pelaks.filter(
      (p) =>
        !p.isNonLandDossier &&
        (p.dossierDomain === 'real_estate' ||
          (!p.dossierDomain && (p.areaM2 > 0 || (p.deedType && p.deedType !== 'پرونده قضایی حقوقی/کیفری'))))
    ).length;
  }, [pelaks]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Confidential Security Lock Modal & Settings */}
      <SecurityVault
        isLocked={isVaultLocked}
        onUnlock={() => setIsVaultLocked(false)}
        onLock={() => setIsVaultLocked(true)}
        isSettingsOpen={isSecuritySettingsOpen}
        onCloseSettings={() => setIsSecuritySettingsOpen(false)}
        pelaks={pelaks}
        documents={documents}
        disputes={disputes}
        timeline={timeline}
        onRestoreBackup={handleRestoreBackup}
        onClearAllData={handleClearAllData}
      />

      {/* Global Search Modal across Dossiers, Documents & Disputes */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        pelaks={pelaks}
        documents={documents}
        disputes={disputes}
        onSelectPelak={(id) => setSelectedPelakId(id)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setChatInitialQuery(null);
        }}
        onAskAboutDoc={handleAskAboutDoc}
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

      {/* Delegated Access Session Banner */}
      {activeDelegatedSession && (
        <DelegatedPortalBanner
          session={activeDelegatedSession}
          onExit={handleExitDelegatedSession}
        />
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setChatInitialQuery(null);
        }}
        selectedPelak={selectedPelak}
        totalPelaksCount={effectivePelaks.length}
        landPelaksCount={landPelaksCount}
        totalDocsCount={effectiveDocuments.length}
        disputesCount={disputes.length}
        validDeedsCount={validDeedsCount}
        urgentDeadlinesCount={urgentDeadlinesCount}
        onLockVault={() => setIsVaultLocked(true)}
        onExportBackup={handleExportBackup}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSecuritySettings={() => setIsSecuritySettingsOpen(true)}
        onOpenShareModal={() => handleOpenShareModal()}
        onOpenClaimModal={() => setIsClaimModalOpen(true)}
        claimedCasesCount={claimedCases.length}
        activeDelegatedSession={activeDelegatedSession}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {activeTab === 'cadastre' && (
          <div className="space-y-5">
            {/* Dashboard Recharts Pie Chart Widget */}
            <CaseStatusChart
              pelaks={effectivePelaks}
              documents={effectiveDocuments}
              selectedStatus={selectedStatusFilter}
              onSelectPelakStatus={(status) => {
                setSelectedStatusFilter(status === 'all' ? undefined : status);
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
              {/* Hierarchical Cadastral Tree Column */}
              <div className="lg:col-span-5 h-[700px]">
                <CadastreTree
                  pelaks={effectivePelaks}
                  documents={effectiveDocuments}
                  selectedPelakId={selectedPelakId}
                  onSelectPelak={setSelectedPelakId}
                  onAddPelak={handleAddPelak}
                  onUpdatePelak={handleUpdatePelak}
                  onGoToScanner={() => setActiveTab('scanner')}
                  externalStatusFilter={selectedStatusFilter}
                  onOpenShareModal={handleOpenShareModal}
                  onOpenClaimModal={() => setIsClaimModalOpen(true)}
                  claimedCases={claimedCases}
                  onRemoveClaimedCase={handleRemoveClaimedCase}
                  activeDelegatedSession={activeDelegatedSession}
                />
              </div>

              {/* Cadastral Map Visualizer Column */}
              <div className="lg:col-span-7 h-[700px]">
                <CadastreMap
                  pelaks={effectivePelaks}
                  selectedPelakId={selectedPelakId}
                  onSelectPelak={setSelectedPelakId}
                  onViewDocuments={handleViewDocuments}
                  onOpenChat={handleOpenChat}
                  documents={effectiveDocuments}
                  onUpdatePelak={handleUpdatePelak}
                  onDeletePelak={handleDeletePelak}
                  onDeleteDocument={handleDeleteDocument}
                  onToggleStarDocument={handleToggleStarDocument}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentExplorer
            documents={effectiveDocuments}
            pelaks={effectivePelaks}
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
            activeDelegatedSession={activeDelegatedSession}
            onOpenShareModal={handleOpenShareModal}
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

        {activeTab === 'lawyerDesk' && (
          <LawyerDesk
            pelaks={pelaks}
            documents={documents}
            disputes={disputes}
            deadlines={deadlines}
            onSaveDeadlines={setDeadlines}
            feeRecords={feeRecords}
            onSaveFeeRecords={setFeeRecords}
            selectedPelakId={selectedPelakId}
            onSelectPelak={(id) => {
              setSelectedPelakId(id);
              setActiveTab('documents');
            }}
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

        {/* Legal Chatbot is kept mounted in hidden div to guarantee persistent state, multi-tab sessions, and zero loss on navbar switching */}
        <div className={activeTab === 'chat' ? 'block' : 'hidden'}>
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
        </div>
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

      {/* Case Sharing & Delegation Modal */}
      <CaseSharingModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        pelaks={pelaks}
        initialSelectedCaseIds={preSelectedCaseIdsForShare}
        grants={grants}
        onRefreshGrants={refreshGrants}
        onSwitchToDelegatedSession={handleSwitchToDelegatedSession}
      />

      {/* Delegated Access Verification Gate Modal (for links with PIN) */}
      {pendingGrantForGate && (
        <DelegatedAccessGateModal
          grant={pendingGrantForGate}
          isOpen={!!pendingGrantForGate}
          onSuccess={(verifiedGrant) => {
            setActiveDelegatedSession({
              grant: verifiedGrant,
              authenticatedAt: new Date().toISOString(),
            });
            setPendingGrantForGate(null);
            if (verifiedGrant.caseIds.length > 0) {
              setSelectedPelakId(verifiedGrant.caseIds[0]);
            }
          }}
          onCancel={() => setPendingGrantForGate(null)}
        />
      )}

      {/* Claim & Import Delegated Case Modal from other accounts */}
      <ClaimDelegatedCaseModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        availablePelaks={pelaks}
        availableDocuments={documents}
        onCaseClaimed={handleCaseClaimed}
      />

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
