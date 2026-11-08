import React, { useState } from 'react';
import {
  FileDown,
  X,
  Check,
  Loader2,
  FileText,
  Sparkles,
  Layers,
  Settings2,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { ProgramSpec } from '../types/sap';
import { exportSpecificationPdf, PdfExportProgress } from '../utils/pdfExport';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  spec: ProgramSpec;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  spec,
}) => {
  const [exportMode, setExportMode] = useState<'high_fidelity' | 'vector'>('high_fidelity');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<PdfExportProgress>({ percent: 0, step: '' });
  const [completedNotice, setCompletedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setCompletedNotice(null);
    setProgress({ percent: 5, step: 'Initializing jsPDF engine...' });

    try {
      await exportSpecificationPdf(spec, {
        mode: exportMode,
        onProgress: (p) => setProgress(p),
      });

      const filename = `${spec.program_id || 'SAP_SPEC'}_SPECIFICATION.pdf`;
      setCompletedNotice(`PDF export completed successfully: ${filename}`);
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1600);
    } catch (err) {
      console.error('PDF export error:', err);
      setIsExporting(false);
      setProgress({ percent: 0, step: 'Failed to generate PDF. Falling back to browser print.' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fadeIn"
      onClick={() => !isExporting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp font-sans text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center shadow-xs">
              <FileDown className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                Export Specification as PDF
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 font-semibold font-mono">
                  jsPDF
                </span>
              </h2>
              <p className="text-xs text-blue-200">
                Generate a professional, formatted PDF deliverable for [{spec.program_id}].
              </p>
            </div>
          </div>
          {!isExporting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Document Summary Pill */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
            <div>
              <div className="font-bold text-slate-800">{spec.title}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                ID: {spec.program_id} | T-Code: {spec.tcode} | Module: {spec.module}
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded bg-blue-100 text-blue-800 font-bold font-mono">
              A4 Portrait
            </span>
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Select PDF Generation Engine</span>
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: High-Fidelity */}
              <div
                onClick={() => !isExporting && setExportMode('high_fidelity')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  exportMode === 'high_fidelity'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    exportMode === 'high_fidelity'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {exportMode === 'high_fidelity' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">
                      High-Fidelity Document PDF (Full Page Render)
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    Captures the complete SAP specification document pages with full corporate typography, Korean text, table borders, badges, and layout exactness.
                  </p>
                </div>
              </div>

              {/* Option 2: Pure Vector */}
              <div
                onClick={() => !isExporting && setExportMode('vector')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  exportMode === 'vector'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    exportMode === 'vector'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {exportMode === 'vector' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">
                      Clean Vector PDF (jsPDF AutoTable)
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">
                      Lightweight
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    Generates pure vector PDF with crisp tables, selectable text, compact file size, and standard SAP corporate blue styling.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Included Sections Checkmark Grid */}
          <div className="space-y-1.5 bg-slate-50/70 border border-slate-200 p-3.5 rounded-xl text-xs">
            <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
              Included Specification Sections
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" />
                <span>1. Cover & Admin Control</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Review & Approvals</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" />
                <span>3. Selection Screen (1000)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" />
                <span>4. ALV Field Catalog (FCAT)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" />
                <span>5. Data Extraction Logic</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" />
                <span>6. Test Cases & Verification</span>
              </div>
            </div>
          </div>

          {/* Progress Bar when exporting */}
          {isExporting && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                  <span>{progress.step || 'Exporting PDF...'}</span>
                </div>
                <span>{progress.percent}%</span>
              </div>
              <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Banner */}
          {completedNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{completedNotice}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                setTimeout(() => window.print(), 250);
              }}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="브라우저 기본 인쇄 대화상자(PDF로 저장)를 통해 100% 벡터 한글 PDF를 생성합니다."
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>브라우저 인쇄 (Ctrl+P)</span>
            </button>

            <button
              type="button"
              onClick={handleStartExport}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-900/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 text-blue-200" />
                  <span>Download PDF File</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
