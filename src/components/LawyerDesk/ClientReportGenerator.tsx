import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  Download,
  Building,
  Scale,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Calendar,
  Layers,
} from 'lucide-react';
import { PelakNode, LegalDocument, DisputeAlert } from '../../types/cadastre';
import { getTodayShamsi } from '../../utils/legalFormulas';
import { toPersianDigits } from '../../utils/persian';

interface ClientReportGeneratorProps {
  pelaks: PelakNode[];
  documents: LegalDocument[];
  disputes: DisputeAlert[];
  selectedPelakId?: string;
}

export const ClientReportGenerator: React.FC<ClientReportGeneratorProps> = ({
  pelaks,
  documents,
  disputes,
  selectedPelakId,
}) => {
  const [activePelakId, setActivePelakId] = useState<string>(selectedPelakId || (pelaks[0]?.id ?? ''));

  // Attorney Letterhead Configuration
  const [attorneyName, setAttorneyName] = useState<string>('وکیل پایه یک دادگستری');
  const [licenseNumber, setLicenseNumber] = useState<string>('۱۲۳۴۵');
  const [barAssociation, setBarAssociation] = useState<string>('کانون وکلای دادگستری مرکز');
  const [officeContact, setOfficeContact] = useState<string>('۰۲۱-۸۸۰۰۰۰۰۰ | تهران');
  const [customReportNote, setCustomReportNote] = useState<string>(
    'کلیه لوایح و مستندات پرونده با هماهنگی موکل در موعد مقرر به شعبه تسلیم گردید و روند دادرسی با اولویت حفظ حقوق موکل تحت پیگیری مستمر است.'
  );

  const [copied, setCopied] = useState<boolean>(false);

  const currentPelak = pelaks.find((p) => p.id === activePelakId) || pelaks[0] || null;
  const currentDocs = documents.filter((d) => (currentPelak ? d.pelakId === currentPelak.id : false));
  const currentDisputes = disputes.filter((d) => (currentPelak ? d.pelakId === currentPelak.id : false));

  // Generate Report Text
  const generateReportPlainText = () => {
    if (!currentPelak) return '';
    const today = getTodayShamsi();

    let text = `=================================================\n`;
    text += `گزارش رسمی وضعیت و گردش‌کار پرونده حقوقی / ثبتی\n`;
    text += `دفتر وکالت: ${attorneyName} (شماره پروانه: ${toPersianDigits(licenseNumber)})\n`;
    text += `${barAssociation} | تاریخ تنظیم: ${toPersianDigits(today)}\n`;
    text += `=================================================\n\n`;

    text += `۱. مشخصات کلی پرونده و موکل:\n`;
    text += `• نام موکل: ${currentPelak.ownerName || 'نامشخص'}\n`;
    text += `• شناسه / کلاسه پرونده: ${currentPelak.code}\n`;
    text += `• عنوان پرونده: ${currentPelak.title}\n`;
    text += `• بخش ثبتی / حوزه قضایی: ${currentPelak.sector}\n`;
    if (currentPelak.areaM2 > 0) {
      text += `• مساحت رقبه: ${toPersianDigits(currentPelak.areaM2.toLocaleString('fa-IR'))} متر مربع\n`;
    }
    text += `• نوع سند ابرازی: ${currentPelak.deedType}\n\n`;

    text += `۲. خلاصه وضعیت دعوا و گردش‌کار:\n`;
    if (currentPelak.holisticAnalysis?.synthesisSummary) {
      text += `${currentPelak.holisticAnalysis.synthesisSummary}\n\n`;
    } else {
      text += `${currentPelak.description || 'رسیدگی طبق برنامه قانونی در جریان است.'}\n\n`;
    }

    if (currentDisputes.length > 0) {
      text += `۳. دعاوی و تعارضات مطروحه:\n`;
      currentDisputes.forEach((disp, idx) => {
        text += `• [دعوای ${toPersianDigits(idx + 1)}] عنوان: ${disp.title} (شعبه: ${disp.courtBranch})\n`;
        text += `  وضعیت: ${disp.legalStatus} | اقدام: ${disp.strategyNote}\n`;
      });
      text += `\n`;
    }

    if (currentDocs.length > 0) {
      text += `۴. فهرست اسناد رسمی و مدارک ارائه‌شده به دادگاه (${toPersianDigits(currentDocs.length)} سند):\n`;
      currentDocs.forEach((d) => {
        text += `• شماره: ${d.documentNumber} | عنوان: ${d.title} (صادره از ${d.authority} مورخ ${toPersianDigits(d.issueDate)})\n`;
      });
      text += `\n`;
    }

    text += `۵. ملاحظات وکیل:\n`;
    text += `${customReportNote}\n\n`;
    text += `با احترام،\n`;
    text += `${attorneyName}\n`;
    text += `${officeContact}\n`;

    return text;
  };

  const handleCopy = async () => {
    try {
      const text = generateReportPlainText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    if (!currentPelak) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('لطفاً باز شدن پاپ‌آپ را در مرورگر مجاز بفرمایید.');
      return;
    }

    const today = getTodayShamsi();

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>گزارش وضعیت پرونده - ${currentPelak.code}</title>
        <style>
          @page { size: A4 portrait; margin: 20mm 15mm 20mm 15mm; }
          body {
            font-family: 'Vazirmatn', 'B Nazanin', 'Tahoma', sans-serif;
            font-size: 11pt;
            line-height: 1.8;
            color: #111;
            padding: 15px;
            direction: rtl;
          }
          .letterhead {
            border-bottom: 2px solid #b8860b;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .attorney-title { font-size: 15pt; font-weight: bold; color: #111; }
          .bar-sub { font-size: 10pt; color: #555; }
          .report-meta { font-size: 10pt; text-align: left; }
          .section-title {
            font-size: 12pt;
            font-weight: bold;
            color: #8b6508;
            border-bottom: 1px solid #ddd;
            padding-bottom: 4px;
            margin-top: 18px;
            margin-bottom: 8px;
          }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10pt; }
          th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: right; }
          th { background-color: #f7f7f7; font-weight: bold; }
          .footer {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            border-top: 1px dashed #aaa;
            padding-top: 15px;
            font-size: 10pt;
          }
        </style>
      </head>
      <body>
        <div class="letterhead">
          <div>
            <div class="attorney-title">${attorneyName}</div>
            <div class="bar-sub">${barAssociation} | شماره پروانه: ${toPersianDigits(licenseNumber)}</div>
          </div>
          <div class="report-meta">
            <div><strong>تاریخ گزارش:</strong> ${toPersianDigits(today)}</div>
            <div><strong>کلاسه پرونده:</strong> ${currentPelak.code}</div>
            <div><strong>موکل:</strong> ${currentPelak.ownerName || 'محترم'}</div>
          </div>
        </div>

        <div style="text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 15px;">
          گزارش جامع وضعیت پرونده و اقدامات انجام‌شده
        </div>

        <div class="section-title">۱. خلاصه مشخصات موضوع دعوا و پلاک ثبتی</div>
        <table>
          <tr>
            <th width="20%">کلاسه / پلاک ثبتی</th>
            <td width="30%">${currentPelak.code}</td>
            <th width="20%">بخش ثبتی</th>
            <td width="30%">${currentPelak.sector}</td>
          </tr>
          <tr>
            <th>عنوان پرونده</th>
            <td>${currentPelak.title}</td>
            <th>نوع سند ابرازی</th>
            <td>${currentPelak.deedType}</td>
          </tr>
          ${currentPelak.areaM2 > 0 ? `
          <tr>
            <th>مساحت عرصه</th>
            <td colspan="3">${toPersianDigits(currentPelak.areaM2.toLocaleString('fa-IR'))} متر مربع</td>
          </tr>` : ''}
        </table>

        <div class="section-title">۲. گردش‌کار و ارزیابی آخرین وضعیت دادرسی</div>
        <p style="text-align: justify; margin-bottom: 15px;">
          ${currentPelak.holisticAnalysis?.synthesisSummary || currentPelak.description || 'پرونده با تنظیم دادخواست و پیگیری استعلامات ثبتی در جریان رسیدگی دادگاه محترم قرار دارد.'}
        </p>

        ${currentDocs.length > 0 ? `
        <div class="section-title">۳. اسناد و مدارک ارائه شده به مرجع قضایی (${toPersianDigits(currentDocs.length)} مدرک)</div>
        <table>
          <thead>
            <tr>
              <th>ردیف</th>
              <th>شماره مدرک</th>
              <th>عنوان سند</th>
              <th>مرجع صادرکننده</th>
              <th>تاریخ صدور</th>
            </tr>
          </thead>
          <tbody>
            ${currentDocs.map((d, i) => `
              <tr>
                <td>${toPersianDigits(i + 1)}</td>
                <td>${d.documentNumber}</td>
                <td>${d.title}</td>
                <td>${d.authority}</td>
                <td>${toPersianDigits(d.issueDate)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        <div class="section-title">۴. توضیحات و رهنمودهای تکمیلی وکیل به موکل</div>
        <p style="text-align: justify; background: #fafafa; border: 1px solid #eee; padding: 10px; border-radius: 6px;">
          ${customReportNote}
        </p>

        <div class="footer">
          <div>نشانی و تماس دفتر: ${officeContact}</div>
          <div style="text-align: center;">
            محل امضا و مهر وکیل<br/>
            <strong>${attorneyName}</strong>
          </div>
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

  const handleDownloadTxt = () => {
    const text = generateReportPlainText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Client_Report_${currentPelak?.code || 'dossier'}_${getTodayShamsi().replace(/\//g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                گزارش‌ساز شکیل وضعیت پرونده ویژه موکل
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                  Client Dossier Briefing
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تولید گزارش رسمی وضعیت پرونده با سربرگ استاندارد کانون وکلا، بدون افشای یادداشت‌های محرمانه دفاعی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'متن کپی شد!' : 'کپی برای پیام‌رسان'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 shadow transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>چاپ سربرگ A4</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              title="دانلود فایل متنی گزارش"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700"
            >
              <Download className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Dossier Selection & Letterhead Customizer (4 cols) */}
        <div className="lg:col-span-4 space-y-4 text-xs">
          {/* Select Dossier */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <label className="block text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              انتخاب پرونده مورد گزارش:
            </label>
            <select
              value={activePelakId}
              onChange={(e) => setActivePelakId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
            >
              {pelaks.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.title} ({p.ownerName})
                </option>
              ))}
            </select>
          </div>

          {/* Letterhead Configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Scale className="w-4 h-4 text-amber-400" />
              مشخصات سربرگ وکیل دادگستری
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">نام وکیل / عنوان دفتر:</label>
              <input
                type="text"
                value={attorneyName}
                onChange={(e) => setAttorneyName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">شماره پروانه:</label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">کانون متبوع:</label>
                <input
                  type="text"
                  value={barAssociation}
                  onChange={(e) => setBarAssociation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">نشانی و تلفن دفتر:</label>
              <input
                type="text"
                value={officeContact}
                onChange={(e) => setOfficeContact(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">توضیح پایانی به موکل:</label>
              <textarea
                rows={3}
                value={customReportNote}
                onChange={(e) => setCustomReportNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Printable Preview Paper (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              پیش‌نمایش زنده سربرگ رسمی ویژه موکل
            </span>
            <span>تاریخ امروز: {toPersianDigits(getTodayShamsi())}</span>
          </div>

          {currentPelak ? (
            <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-6 space-y-4 shadow-inner text-xs">
              {/* Paper Top Letterhead */}
              <div className="border-b-2 border-amber-500/60 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{attorneyName}</h3>
                  <div className="text-[11px] text-slate-400">
                    {barAssociation} | شماره پروانه: {toPersianDigits(licenseNumber)}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400 space-y-0.5">
                  <div>
                    <span className="text-slate-500">تاریخ: </span>
                    <span className="text-white font-mono">{toPersianDigits(getTodayShamsi())}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">پلاک / کلاسه: </span>
                    <span className="text-amber-400 font-mono font-bold">{currentPelak.code}</span>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center font-bold text-sm text-amber-400 py-1">
                گزارش گردش‌کار و خلاصه وضعیت پرونده برای موکل
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400">نام موکل: </span>
                  <span className="text-white font-bold">{currentPelak.ownerName || 'نامشخص'}</span>
                </div>
                <div>
                  <span className="text-slate-400">عنوان پرونده: </span>
                  <span className="text-slate-200">{currentPelak.title}</span>
                </div>
                <div>
                  <span className="text-slate-400">حوزه / بخش: </span>
                  <span className="text-slate-200">{currentPelak.sector}</span>
                </div>
              </div>

              {/* Narrative Summary */}
              <div className="space-y-1.5">
                <div className="font-bold text-slate-300 text-xs">آخرین وضعیت و گردش‌کار دادرسی:</div>
                <p className="text-slate-300 leading-relaxed text-justify bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                  {currentPelak.holisticAnalysis?.synthesisSummary ||
                    currentPelak.description ||
                    'پرونده در شعبه مربوطه تحت رسیدگی بوده و لوایح دفاعی طبق موازین قانونی تقدیم مرجع قضایی شده است.'}
                </p>
              </div>

              {/* Documents List */}
              {currentDocs.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-300 text-xs">
                    مدارک و دادنامه‌های مضبوط در پرونده ({toPersianDigits(currentDocs.length)} سند):
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {currentDocs.map((d) => (
                      <div
                        key={d.id}
                        className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400">{d.documentNumber}</span>
                          <span className="text-slate-200">{d.title}</span>
                        </div>
                        <span className="text-slate-400 text-[10px]">{d.authority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lawyer Note */}
              <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-xl space-y-1">
                <div className="font-semibold text-amber-300 text-[11px]">ملاحظات و اقدامات بعدی:</div>
                <p className="text-slate-300 text-[11px] leading-relaxed">{customReportNote}</p>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <div>{officeContact}</div>
                <div>امضا و مهر وکیل</div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              پرونده‌ای برای نمایش گزارش انتخاب نشده است.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
