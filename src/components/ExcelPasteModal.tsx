import React, { useState, useEffect, useMemo } from 'react';
import { Clipboard, Table, Check, X, AlertCircle, Copy, FileSpreadsheet } from 'lucide-react';
import { parseSpreadsheetText } from '../utils/spreadsheetClipboard';

interface ExcelPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  expectedColumns: { col: string; name: string; example?: string }[];
  onApply: (rawText: string, mode: 'append' | 'replace') => void;
  sampleTemplateTsv?: string;
}

export const ExcelPasteModal: React.FC<ExcelPasteModalProps> = ({
  isOpen,
  onClose,
  title,
  expectedColumns,
  onApply,
  sampleTemplateTsv,
}) => {
  const [pasteText, setPasteText] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Reset text when modal opens
  useEffect(() => {
    if (isOpen) {
      setPasteText('');
      setCopyFeedback(false);
    }
  }, [isOpen]);

  // Parse preview
  const parsedGrid = useMemo(() => {
    return parseSpreadsheetText(pasteText);
  }, [pasteText]);

  if (!isOpen) return null;

  const handleCopySample = () => {
    if (!sampleTemplateTsv) return;
    navigator.clipboard.writeText(sampleTemplateTsv).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    });
  };

  const handleConfirm = () => {
    if (!pasteText.trim()) return;
    onApply(pasteText, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">
                  Paste from Excel / Google Sheets ({title})
                </h3>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono">
                  Multi-line TSV
                </span>
              </div>
              <p className="text-[11px] text-emerald-200">
                Copy rows from Excel or Google Sheets (Ctrl+C), then paste (Ctrl+V) directly below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Column Mapping Guide */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-emerald-600" />
              Expected Excel Column Layout:
            </span>
            {sampleTemplateTsv && (
              <button
                type="button"
                onClick={handleCopySample}
                className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copyFeedback ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied Template to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-emerald-600" />
                    <span>Copy Sample Template for Excel</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
            {expectedColumns.map((col, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded px-2 py-1 shrink-0 font-mono shadow-2xs"
              >
                <div className="text-[10px] text-slate-400 font-bold">Col {String.fromCharCode(65 + idx)}</div>
                <div className="font-bold text-slate-800 truncate">{col.name}</div>
                {col.example && (
                  <div className="text-[10px] text-slate-500 font-normal truncate max-w-[120px]">
                    ex: {col.example}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Textarea Input & Live Preview */}
        <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Paste Area (클립보드 데이터 붙여넣기 영역):
            </label>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste cells copied from Excel / Google Sheets here (Ctrl + V)..."
              rows={5}
              autoFocus
              className="w-full bg-white border-2 border-dashed border-emerald-400 rounded-lg p-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 resize-none shadow-inner"
            />
          </div>

          {/* Parsed Live Grid Preview */}
          {parsedGrid.length > 0 && (
            <div className="flex-1 flex flex-col min-h-[160px] border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Detected {parsedGrid.length} row(s) & max {Math.max(...parsedGrid.map((r) => r.length))} col(s)
                </span>
                <span className="text-[11px] text-slate-500">
                  Preview (First 8 rows shown)
                </span>
              </div>
              <div className="flex-1 overflow-auto max-h-52">
                <table className="w-full text-xs text-left border-collapse font-mono">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 text-[10px]">
                    <tr>
                      <th className="py-1 px-2 text-center w-8 bg-slate-200 border-r border-slate-300">#</th>
                      {Array.from({ length: Math.max(...parsedGrid.map((r) => r.length), expectedColumns.length) }).map((_, cIdx) => (
                        <th key={cIdx} className="py-1 px-2 border-r border-slate-200">
                          {String.fromCharCode(65 + cIdx)}
                          {expectedColumns[cIdx] ? ` (${expectedColumns[cIdx].name})` : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {parsedGrid.slice(0, 8).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-emerald-50/50">
                        <td className="py-1 px-2 text-center bg-slate-100 text-slate-500 font-bold border-r border-slate-300">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-1 px-2 border-r border-slate-100 truncate max-w-48 text-slate-800">
                            {cell || <span className="text-slate-300 italic">(empty)</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer & Mode Options */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 shrink-0">
          {/* Mode Radio Buttons */}
          <div className="flex items-center gap-4 text-xs">
            <span className="font-bold text-slate-700">Paste Mode:</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
              <input
                type="radio"
                name="pasteMode"
                value="append"
                checked={mode === 'append'}
                onChange={() => setMode('append')}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
              <span>Append to existing rows (기존 데이터 뒤에 추가)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
              <input
                type="radio"
                name="pasteMode"
                value="replace"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
              <span>Replace entire table (기존 데이터 전체 교체)</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={parsedGrid.length === 0}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply {parsedGrid.length} Row(s)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
