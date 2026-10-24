import React, { useState } from 'react';
import {
  Compass,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Clock,
  ExternalLink,
  MapPin,
  Plus,
  Briefcase,
  Sparkles,
  FileText,
  CheckCircle2,
  Users,
  Scale,
  ListChecks,
  AlertCircle,
  FileCheck,
  Star,
  Trash2,
  Edit3,
} from 'lucide-react';
import { PelakNode, LegalDocument } from '../types/cadastre';
import { toPersianDigits, formatArea, getStatusLabel, getDomainMeta } from '../utils/persian';

interface CadastreMapProps {
  pelaks: PelakNode[];
  selectedPelakId: string;
  onSelectPelak: (id: string) => void;
  onViewDocuments: (pelakId: string) => void;
  onOpenChat: (pelakId: string) => void;
  documents: LegalDocument[];
  onUpdatePelak?: (pelakId: string, updates: Partial<PelakNode>) => void;
  onDeletePelak?: (pelakId: string) => void;
  onDeleteDocument?: (docId: string) => void;
  onToggleStarDocument?: (docId: string) => void;
}

export const CadastreMap: React.FC<CadastreMapProps> = ({
  pelaks,
  selectedPelakId,
  onSelectPelak,
  onViewDocuments,
  onOpenChat,
  documents,
  onUpdatePelak,
  onDeletePelak,
  onDeleteDocument,
  onToggleStarDocument,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [hoveredPelakId, setHoveredPelakId] = useState<string | null>(null);

  const selectedNode = pelaks.find((p) => p.id === selectedPelakId) || pelaks[0];
  const isNonLand = selectedNode?.isNonLandDossier;

  // View Mode: 'map' or 'synthesis'
  const [viewMode, setViewMode] = useState<'map' | 'synthesis'>('map');

  const currentView = isNonLand ? 'synthesis' : viewMode;

  const parcelNodes = pelaks.filter((p) => p.parcelNumber);
  const subNodes = pelaks.filter((p) => p.subNumber && !p.parcelNumber);
  const mainNodes = pelaks.filter((p) => !p.parentId && !p.isNonLandDossier);

  const getDocCount = (pelakId: string) => {
    return documents.filter((d) => d.pelakId === pelakId).length;
  };

  const rawDossierDocs = selectedNode
    ? documents.filter((d) => d.pelakId === selectedNode.id)
    : [];

  const dossierDocs = [...rawDossierDocs].sort((a, b) => {
    if (a.isStarred && !b.isStarred) return -1;
    if (!a.isStarred && b.isStarred) return 1;
    return 0;
  });

  const getParcelFillColor = (status: string, isSelected: boolean) => {
    if (isSelected) return '#f59e0b';
    switch (status) {
      case 'valid':
        return '#059669';
      case 'forged':
        return '#dc2626';
      case 'arrested':
        return '#7c3aed';
      case 'disputed':
        return '#d97706';
      case 'pending':
      default:
        return '#0284c7';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-full shadow-sm">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div>
          <div className="flex items-center gap-2">
            {isNonLand ? (
              <Briefcase className="w-4 h-4 text-sky-400" />
            ) : (
              <Compass className="w-4 h-4 text-amber-400" />
            )}
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              {isNonLand
                ? 'تحلیل تطبیقی و کارتابل جامع پرونده قضایی'
                : 'نقشه کاداستر و تحلیل ثبتی قطعات (UTM Cadastre Map)'}
            </h2>
            {selectedNode && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                {selectedNode.sector}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isNonLand
              ? 'ارزیابی یکپارچه ادله، زنجیره اسناد، تعارضات و استراتژی دفاعی پرونده مادر'
              : 'تطبیق حدود اربعه، جانمایی قطعات و وضعیت حقوقی اسناد بر روی نقشه ثبتی'}
          </p>
        </div>

        {/* View Switcher for Real Estate or non-land controls */}
        {!isNonLand && pelaks.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-md transition-colors font-medium ${
                viewMode === 'map'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              نقشه کاداستر
            </button>
            <button
              onClick={() => setViewMode('synthesis')}
              className={`px-3 py-1 rounded-md transition-colors font-medium flex items-center gap-1 ${
                viewMode === 'synthesis'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              تحلیل تطبیقی
            </button>
          </div>
        )}
      </div>

      {/* SYNTHESIS VIEW (Default for Non-Land dossiers or when user switches to synthesis) */}
      {currentView === 'synthesis' ? (
        <div className="flex-1 overflow-y-auto space-y-4 my-3 pr-1 custom-scrollbar">
          {selectedNode ? (
            <div className="space-y-4">
              {/* Dossier Banner Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded">
                        {selectedNode.code}
                      </span>
                      <h3 className="text-base font-bold text-white">{selectedNode.title}</h3>
                      {selectedNode.dossierDomain && (
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                            getDomainMeta(selectedNode.dossierDomain).bg
                          } ${getDomainMeta(selectedNode.dossierDomain).text} ${
                            getDomainMeta(selectedNode.dossierDomain).border
                          }`}
                        >
                          {getDomainMeta(selectedNode.dossierDomain).label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>موکل: <strong className="text-slate-200">{selectedNode.ownerName}</strong></span>
                      {selectedNode.sector && <span>· مرجع: {selectedNode.sector}</span>}
                      <span>· مدارک مضبوط: <strong className="text-amber-400">{toPersianDigits(dossierDocs.length)} سند</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onViewDocuments(selectedNode.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-800 rounded-xl hover:bg-sky-900 transition-colors flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      اسناد پرونده ({toPersianDigits(dossierDocs.length)})
                    </button>
                    <button
                      onClick={() => onOpenChat(selectedNode.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                      مشاوره در چت‌بات
                    </button>
                  </div>
                </div>

                {/* Synthesis Summary or Description */}
                <div>
                  <h4 className="text-xs font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" />
                    خلاصه استراتژیک و گردش‌کار پرونده:
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 text-justify">
                    {selectedNode.holisticAnalysis?.synthesisSummary || selectedNode.description}
                  </p>
                </div>
              </div>

              {/* Holistic Analysis Details (if generated by AI) */}
              {selectedNode.holisticAnalysis ? (
                <div className="space-y-4">
                  {/* Evidence Chain Table */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-sky-400 mb-2.5 flex items-center gap-2">
                      <ListChecks className="w-4 h-4" />
                      زنجیره ادله اثباتی پرونده (Evidence Chain):
                    </h4>
                    <div className="space-y-2">
                      {selectedNode.holisticAnalysis.evidenceChain.map((ev, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="w-5 h-5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {toPersianDigits(idx + 1)}
                            </span>
                            <div>
                              <div className="font-bold text-white truncate">{ev.documentTitle}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                {ev.roleInCase}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                              ev.strength === 'conclusive'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : ev.strength === 'vulnerable'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-sky-950 text-sky-300 border border-sky-800'
                            }`}
                          >
                            {ev.strength === 'conclusive'
                              ? 'دلیل قاطع'
                              : ev.strength === 'vulnerable'
                              ? 'آسیب‌پذیر / متنازع'
                              : 'دلیل تکمیلی'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths & Risks Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Strengths */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                      <h5 className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        نقاط قوت پرونده برای موکل:
                      </h5>
                      <ul className="space-y-1.5 text-[11px] text-slate-300">
                        {selectedNode.holisticAnalysis.legalStrengths.map((str, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span className="leading-relaxed">{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Risks & Conflicts */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                      <h5 className="font-bold text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        ریسک‌ها و تعارضات احتمالی:
                      </h5>
                      <ul className="space-y-1.5 text-[11px] text-slate-300">
                        {selectedNode.holisticAnalysis.conflictsOrContradictions.concat(
                          selectedNode.holisticAnalysis.legalRisks
                        ).map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-rose-400 font-bold">•</span>
                            <span className="leading-relaxed">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Attorney Actionable Steps */}
                  <div className="bg-gradient-to-r from-amber-950/40 via-slate-950 to-amber-950/20 border border-amber-500/40 rounded-xl p-4">
                    <h5 className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      اقدامات راهبردی و لوایح پیشنهادی وکیل:
                    </h5>
                    <div className="space-y-1.5 text-xs text-slate-200">
                      {selectedNode.holisticAnalysis.recommendedAttorneyActions.map((act, i) => (
                        <div key={i} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                          <span className="text-amber-400 font-mono font-bold">{toPersianDigits(i + 1)}.</span>
                          <span className="leading-relaxed">{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Prompt to analyze if no synthesis yet */
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-white">
                    تحلیل تطبیقی جامع این پرونده پس از اتمام بارگذاری اسناد به طور خودکار تدوین می‌شود
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                    با بارگذاری دسته‌ای اسناد در بخش اسکنر و الحاق به این پرونده، ایجنت کلیه ادله را مقایسه و زنجیره اثباتی را استخراج می‌نماید.
                  </p>
                </div>
              )}

              {/* Dossier Files List with Star & Delete */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-sky-400" />
                    مدارک و فایل‌های پرونده ({toPersianDigits(dossierDocs.length)} سند)
                  </h5>
                  <span className="text-[11px] text-slate-400">
                    اسناد ستاره‌دار در بالای فهرست قرار می‌گیرند
                  </span>
                </div>

                {dossierDocs.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">
                    هیچ سندی هنوز به این پرونده الحاق نشده است.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dossierDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                          doc.isStarred
                            ? 'bg-amber-950/20 border-amber-500/50'
                            : 'bg-slate-900/70 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {onToggleStarDocument && (
                            <button
                              type="button"
                              onClick={() => onToggleStarDocument(doc.id)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition-colors shrink-0"
                              title="ستاره‌دار کردن سند"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  doc.isStarred ? 'fill-amber-400 text-amber-400' : ''
                                }`}
                              />
                            </button>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate flex items-center gap-1.5">
                              <span>{doc.title}</span>
                              {doc.isStarred && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-normal">
                                  مهم
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                              <span>شماره: {doc.documentNumber}</span>
                              <span>· تاریخ: {toPersianDigits(doc.issueDate)}</span>
                              {doc.authority && <span>· مرجع: {doc.authority}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onDeleteDocument && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`آیا از حذف سند «${doc.title}» از این پرونده اطمینان دارید؟`)) {
                                  onDeleteDocument(doc.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                              title="حذف این سند از پرونده"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              پرونده‌ای انتخاب نشده است.
            </div>
          )}
        </div>
      ) : (
        /* MAP VIEW (For Real Estate Cadastre) */
        <>
          <div className="relative flex-1 bg-slate-950 rounded-xl border border-slate-800/80 my-3 overflow-hidden min-h-[320px] flex items-center justify-center p-2">
            {/* Geographic North Needle */}
            <div className="absolute top-3 left-3 z-10 bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-center pointer-events-none shadow-md backdrop-blur-xs">
              <div className="w-6 h-6 mx-auto flex items-center justify-center text-rose-500 font-bold text-xs">
                ▲ N
              </div>
              <span className="text-[10px] text-slate-400 font-mono">شمال</span>
            </div>

            {/* Scale Bar */}
            <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1 text-center pointer-events-none text-[10px] text-slate-400 font-mono">
              <span>مقیاس ۱:۲۰۰۰</span>
            </div>

            <svg
              viewBox="0 0 520 320"
              className="w-full h-full max-h-[340px] select-none"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            >
              {/* Cadastral Grid lines */}
              <defs>
                <pattern id="cadastreGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="520" height="320" fill="url(#cadastreGrid)" />

              {/* Render Parcels */}
              {parcelNodes.map((parcel) => {
                const shape = parcel.cadastralShape;
                if (!shape) return null;

                const isSelected = selectedPelakId === parcel.id;
                const isHovered = hoveredPelakId === parcel.id;
                const fillColor = getParcelFillColor(parcel.status, isSelected);

                return (
                  <g
                    key={parcel.id}
                    onClick={() => onSelectPelak(parcel.id)}
                    onMouseEnter={() => setHoveredPelakId(parcel.id)}
                    onMouseLeave={() => setHoveredPelakId(null)}
                    className="cursor-pointer group"
                  >
                    <rect
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      rx="6"
                      fill={fillColor}
                      fillOpacity={isSelected ? 0.95 : isHovered ? 0.85 : 0.7}
                      stroke={isSelected ? '#ffffff' : isHovered ? '#f59e0b' : '#0f172a'}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                      className="transition-all duration-150"
                    />

                    <text
                      x={shape.x + shape.width / 2}
                      y={shape.y + shape.height / 2 - 6}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {parcel.code}
                    </text>
                    <text
                      x={shape.x + shape.width / 2}
                      y={shape.y + shape.height / 2 + 10}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="8.5"
                      fontWeight="500"
                    >
                      {parcel.title}
                    </text>

                    {getDocCount(parcel.id) > 0 && (
                      <g transform={`translate(${shape.x + shape.width - 22}, ${shape.y + 6})`}>
                        <rect width="18" height="14" rx="3" fill="#0f172a" fillOpacity="0.8" />
                        <text x="9" y="10.5" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                          {toPersianDigits(getDocCount(parcel.id))}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Selected Pelak Deep Inspection Drawer below map */}
          {selectedNode && (
            <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-mono font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                    پلاک {selectedNode.code}
                  </span>
                  <h3 className="font-semibold text-white">{selectedNode.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewDocuments(selectedNode.id)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 bg-sky-950/60 border border-sky-800/60 px-2.5 py-1 rounded-lg"
                  >
                    اسناد ({toPersianDigits(getDocCount(selectedNode.id))})
                  </button>
                  <button
                    onClick={() => onOpenChat(selectedNode.id)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-lg"
                  >
                    چت وکیل
                  </button>
                </div>
              </div>

              <div className="mt-2 text-slate-300 leading-relaxed text-[11px]">
                {selectedNode.description}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
