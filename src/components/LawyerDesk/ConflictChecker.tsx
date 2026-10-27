import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Scale,
  Users,
  Building,
  Info,
  ExternalLink,
} from 'lucide-react';
import { PelakNode, LegalDocument, DisputeAlert, ConflictMatch } from '../../types/cadastre';
import { toPersianDigits } from '../../utils/persian';

interface ConflictCheckerProps {
  pelaks: PelakNode[];
  documents: LegalDocument[];
  disputes: DisputeAlert[];
  onSelectPelak?: (pelakId: string) => void;
}

export const ConflictChecker: React.FC<ConflictCheckerProps> = ({
  pelaks,
  documents,
  disputes,
  onSelectPelak,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract all unique parties across the database to suggest quick chips
  const suggestedParties = useMemo(() => {
    const set = new Set<string>();
    pelaks.forEach((p) => {
      if (p.ownerName) set.add(p.ownerName.trim());
    });
    documents.forEach((d) => {
      if (d.parties.claimant) set.add(d.parties.claimant.trim());
      if (d.parties.defendant) set.add(d.parties.defendant.trim());
      if (d.parties.buyer) set.add(d.parties.buyer.trim());
      if (d.parties.notaryOrSeller) set.add(d.parties.notaryOrSeller.trim());
    });
    disputes.forEach((disp) => {
      disp.involvedParties?.forEach((p) => set.add(p.trim()));
    });
    return Array.from(set).filter((name) => name.length >= 3).slice(0, 8);
  }, [pelaks, documents, disputes]);

  // Execute deep conflict scan
  const results = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return null;

    const matches: ConflictMatch[] = [];

    // 1. Scan Pelaks / Dossiers
    pelaks.forEach((p) => {
      if (p.ownerName && p.ownerName.toLowerCase().includes(q)) {
        matches.push({
          pelakId: p.id,
          pelakCode: p.code,
          pelakTitle: p.title,
          matchedName: p.ownerName,
          roleInCase: 'مالک ثبتی / موکل پرونده',
          caseDomain: p.dossierDomain,
          status: p.status,
          isAdverseParty: false,
          conflictWarning:
            'این شخص به عنوان مالک رسمی یا موکل در پرونده ثبت است. قبول وکالت علیه ایشان ممنوعیت قطعی قانونی دارد.',
        });
      }

      // Check holistic analysis if present
      if (p.holisticAnalysis?.keyParties) {
        if (p.holisticAnalysis.keyParties.opponents?.some((op) => op.toLowerCase().includes(q))) {
          matches.push({
            pelakId: p.id,
            pelakCode: p.code,
            pelakTitle: p.title,
            matchedName: q,
            roleInCase: 'طرف متخاصم و خوانده اصلی (طبق گردش‌کار پرونده)',
            caseDomain: p.dossierDomain,
            status: p.status,
            isAdverseParty: true,
            conflictWarning:
              'توجه بحرانی: این شخص طرف مقابل (خوانده/متهم) در این پرونده فعال است! قبول وکالت وی تعارض منافع شدید است.',
          });
        }
      }
    });

    // 2. Scan Documents parties
    documents.forEach((d) => {
      const pelak = pelaks.find((p) => p.id === d.pelakId);
      const code = pelak?.code || d.pelakCode || 'نامشخص';
      const title = pelak?.title || 'پرونده متناظر';

      if (d.parties.defendant && d.parties.defendant.toLowerCase().includes(q)) {
        matches.push({
          pelakId: d.pelakId,
          pelakCode: code,
          pelakTitle: title,
          matchedName: d.parties.defendant,
          roleInCase: 'خوانده / متهم در دادنامه یا دادخواست',
          caseDomain: d.caseDomain,
          status: pelak?.status || 'disputed',
          documentTitle: d.title,
          isAdverseParty: true,
          conflictWarning: `این شخص در دادنامه/مدرک «${d.title}» صراحتاً طرف مقابل (خوانده/متهم) بوده است.`,
        });
      }

      if (d.parties.claimant && d.parties.claimant.toLowerCase().includes(q)) {
        matches.push({
          pelakId: d.pelakId,
          pelakCode: code,
          pelakTitle: title,
          matchedName: d.parties.claimant,
          roleInCase: 'خواهان / شاکی پرونده',
          caseDomain: d.caseDomain,
          status: pelak?.status || 'valid',
          documentTitle: d.title,
          isAdverseParty: false,
          conflictWarning: 'این شخص خواهان بوده و اطلاعات دفاعی یا اسناد وی در دفتر ثبت است.',
        });
      }

      if (d.parties.buyer && d.parties.buyer.toLowerCase().includes(q)) {
        matches.push({
          pelakId: d.pelakId,
          pelakCode: code,
          pelakTitle: title,
          matchedName: d.parties.buyer,
          roleInCase: 'خریدار / انتقال‌گیرنده سند',
          caseDomain: d.caseDomain,
          status: pelak?.status || 'valid',
          documentTitle: d.title,
          isAdverseParty: false,
          conflictWarning: 'دارای سابقه معامله در پلاک ثبتی مورد وکالت.',
        });
      }

      if (d.parties.notaryOrSeller && d.parties.notaryOrSeller.toLowerCase().includes(q)) {
        matches.push({
          pelakId: d.pelakId,
          pelakCode: code,
          pelakTitle: title,
          matchedName: d.parties.notaryOrSeller,
          roleInCase: 'فروشنده / انتقال‌دهنده ملک',
          caseDomain: d.caseDomain,
          status: pelak?.status || 'valid',
          documentTitle: d.title,
          isAdverseParty: false,
          conflictWarning: 'فروشنده اولیه در سلسله نقل‌وانتقالات رسمی یا عادی ملک.',
        });
      }
    });

    // 3. Scan Disputes
    disputes.forEach((disp) => {
      const match = disp.involvedParties?.find((p) => p.toLowerCase().includes(q));
      if (match) {
        matches.push({
          pelakId: disp.pelakId,
          pelakCode: disp.pelakCode,
          pelakTitle: disp.title,
          matchedName: match,
          roleInCase: `طرف درگیر در دعوای «${disp.disputeType}»`,
          caseDomain: disp.caseDomain,
          status: 'disputed',
          isAdverseParty: true,
          conflictWarning: `حضور مستقیم در پرونده تعارض ملکی و دعوای مطروحه در شعبه ${disp.courtBranch}.`,
        });
      }
    });

    // Deduplicate identical matches
    const seen = new Set<string>();
    const uniqueMatches: ConflictMatch[] = [];
    for (const m of matches) {
      const key = `${m.pelakId}_${m.roleInCase}_${m.documentTitle || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMatches.push(m);
      }
    }

    const hasAdverseConflict = uniqueMatches.some((m) => m.isAdverseParty);

    return {
      query: q,
      matches: uniqueMatches,
      hasAdverseConflict,
    };
  }, [searchQuery, pelaks, documents, disputes]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                سیستم استعلام تعارض منافع و بررسی طرفین دعوا
                <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-mono">
                  Conflict of Interest Sentinel
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تطبیق بلادرنگ نام و کدملی موکلان و اشخاص با خواندگان، شاکیان و مالکان قبلی جهت صیانت از سوگند وکالت و پیشگیری از تخلف انتظامی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Scale className="w-4 h-4 text-amber-400" />
            <span>آیین‌نامه لایحه قانونی استقلال کانون وکلا</span>
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <label className="block text-xs font-semibold text-white">
          جستجو و استعلام نام شخص حقیقی، شرکت حقوقی یا کدملی:
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="نام موکل جدید، طرف دعوا، خریدار، یا شخص ثالث را وارد فرمایید..."
            className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
        </div>

        {/* Suggested Quick Chips */}
        {suggestedParties.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-400">
            <span>استعلام سریع از افراد موجود در پایگاه:</span>
            {suggestedParties.map((party, idx) => (
              <button
                key={idx}
                onClick={() => setSearchQuery(party)}
                className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-lg transition-colors"
              >
                {party}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scan Results View */}
      {results && (
        <div className="space-y-4 animate-in fade-in">
          {/* Summary Alert Banner */}
          {results.matches.length === 0 ? (
            <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-2xl p-5 flex items-start gap-3 text-emerald-300">
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-emerald-200">
                  هیچ‌گونه سابقه تعارض منافع یافت نشد (وضعیت سفید)
                </h4>
                <p className="text-xs text-emerald-300/80 mt-1 leading-relaxed">
                  نام «{results.query}» در میان هیچ‌یک از موکلین سابق، خواندگان، متهمان یا مالکین پلاک‌های مطروحه در این دفتر وکالت وجود ندارد. پذیرش وکالت از حیث انتظامی بلامانع است.
                </p>
              </div>
            </div>
          ) : results.hasAdverseConflict ? (
            <div className="bg-rose-950/30 border border-rose-500/60 rounded-2xl p-5 flex items-start gap-3 text-rose-300 shadow-xl ring-1 ring-rose-500/30">
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="font-bold text-sm text-rose-200 flex items-center gap-2">
                  <span>هشدار جدی تعارض منافع و تخلف انتظامی!</span>
                  <span className="text-[10px] bg-rose-500/30 border border-rose-500/50 px-2 py-0.5 rounded-full font-mono">
                    High Risk
                  </span>
                </h4>
                <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                  شخص استعلام‌شده («{results.query}») در حداقل یک پرونده به عنوان طرف متخاصم (خوانده، متهم، یا طرف دعوای متقابل) موکلین شما ثبت شده است. قبول وکالت ایشان ممکن است منجر به خیانت در امانت و صدور رأی انتظامی در دادسرا و دادگاه انتظامی وکلا گردد.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-950/30 border border-amber-500/50 rounded-2xl p-5 flex items-start gap-3 text-amber-300">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-200">
                  سابقه وکالتی یا ثبتی موجود است (احتیاط انتظامی)
                </h4>
                <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                  نام «{results.query}» به عنوان موکل یا ذی‌نفع در سوابق این کارتابل یافت شد. در صورتی که دعوای جدید در تعارض با منافع سابق ایشان باشد، پذیرش وکالت جایز نخواهد بود.
                </p>
              </div>
            </div>
          )}

          {/* Detailed Matches Cards */}
          {results.matches.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300">
                فهرست انطباق‌های کشف‌شده در اسناد و پرونده‌ها ({toPersianDigits(results.matches.length)} مورد):
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {results.matches.map((m, idx) => (
                  <div
                    key={idx}
                    className={`bg-slate-900 border rounded-2xl p-4 space-y-2 shadow-md ${
                      m.isAdverseParty
                        ? 'border-rose-600/60 bg-gradient-to-b from-rose-950/20 to-slate-900'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold bg-slate-800 text-amber-400 px-2 py-0.5 rounded">
                          {m.pelakCode}
                        </span>
                        <span className="text-xs font-bold text-white truncate max-w-[200px]">
                          {m.pelakTitle}
                        </span>
                      </div>

                      {m.isAdverseParty ? (
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                          طرف متخاصم
                        </span>
                      ) : (
                        <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
                          ذی‌نفع / موکل
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>جایگاه در این پرونده:</span>
                        <span className="text-amber-300 font-semibold">{m.roleInCase}</span>
                      </div>
                      {m.documentTitle && (
                        <div className="flex justify-between text-slate-400">
                          <span>سند مربوطه:</span>
                          <span className="text-slate-200 truncate max-w-[200px]">
                            {m.documentTitle}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 leading-relaxed">
                      {m.conflictWarning}
                    </p>

                    {onSelectPelak && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => onSelectPelak(m.pelakId)}
                          className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                        >
                          <span>مشاهده این پرونده</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Informational Guidelines Card */}
      {!results && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-white text-sm">استعلام خودکار پیش از پذیرش هر پرونده</h4>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            کافی است نام و نام‌خانوادگی یا کدملی مراجع را در کادر جستجوی بالا تایپ کنید تا موتور استعلام، کلیه دادنامه‌ها، قراردادها، اسناد رسمی مالکیت و دعاوی ثبتی این کارتابل را تحلیل نماید.
          </p>
        </div>
      )}
    </div>
  );
};
