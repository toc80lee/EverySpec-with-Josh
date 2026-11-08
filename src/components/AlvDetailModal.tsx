import React from 'react';
import { X, Search } from 'lucide-react';
import { AlvField } from '../types/sap';

interface AlvDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: Record<string, any> | null;
  fieldCatalog: AlvField[];
  rowIndex: number;
  totalRows: number;
  onPrevRow: () => void;
  onNextRow: () => void;
  title?: string;
  detailinit?: boolean;
}

export const AlvDetailModal: React.FC<AlvDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  fieldCatalog,
  rowIndex,
  totalRows,
  onPrevRow,
  onNextRow,
  title,
  detailinit = true,
}) => {
  if (!isOpen || !record) return null;

  const displayedFields = fieldCatalog.filter((field) => {
    if (detailinit) return true;
    const val = record[field.fieldname];
    return val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '0';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded border border-slate-400 bg-[#ECE9D8] shadow-2xl text-slate-800 text-xs font-sans">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#2B547E] to-[#4863A0] px-3 py-1.5 text-white font-medium">
          <div className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-sky-300" />
            <span>
              {title ? `${title} - ` : ''}ALV 세부내역 조회 (Detail View) - 행: {rowIndex + 1} / {totalRows}
            </span>
          </div>
          <button onClick={onClose} className="rounded p-0.5 hover:bg-white/20 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-1">
          {displayedFields.map((field) => {
            const val = record[field.fieldname];
            const isKey = field.key;
            return (
              <div
                key={field.fieldname}
                className={`flex items-center border border-slate-300 px-2 py-1 ${
                  isKey ? 'bg-[#E3EFFB]' : 'bg-white'
                }`}
              >
                <div className="w-32 font-medium text-slate-700 truncate pr-2" title={field.coltext}>
                  {field.coltext}
                </div>
                <div className="w-24 text-slate-400 font-mono text-[11px] truncate">
                  ({field.fieldname})
                </div>
                <div className="flex-1 font-mono text-slate-900 font-medium truncate">
                  {val !== undefined && val !== null ? String(val) : '-'}
                </div>
                {field.drilldown_tcode && (
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded">
                    T-Code: {field.drilldown_tcode}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with Row navigation */}
        <div className="flex items-center justify-between border-t border-slate-300 bg-[#E3E1D4] px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevRow}
              disabled={rowIndex <= 0}
              className="px-2.5 py-1 text-[11px] bg-[#F4F2E6] border border-slate-400 disabled:opacity-40 hover:bg-white"
            >
              ◀ 이전 행
            </button>
            <button
              onClick={onNextRow}
              disabled={rowIndex >= totalRows - 1}
              className="px-2.5 py-1 text-[11px] bg-[#F4F2E6] border border-slate-400 disabled:opacity-40 hover:bg-white"
            >
              다음 행 ▶
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 text-[11px] font-semibold text-white bg-[#2B547E] border border-[#1A385C] hover:bg-[#1E3F66]"
          >
            닫기 (Enter)
          </button>
        </div>
      </div>
    </div>
  );
};
