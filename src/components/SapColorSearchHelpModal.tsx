import React, { useState } from 'react';
import { Search, X, Check, Palette } from 'lucide-react';

export interface SapColorDefinition {
  code: string;
  name: string;
  description: string;
  bgHex: string;
  textHex: string;
  category: string;
}

// 28 Standard SAP ALV Grid Color Codes (LVC_T_FCAT-EMPHASIZE: Cxyz)
export const SAP_ALV_COLORS: SapColorDefinition[] = [
  // C1xx: Grey / Blue-Grey
  { code: 'C100', name: 'Grey (Default)', description: '회색 - 기본 배경', bgHex: '#e2e8f0', textHex: '#334155', category: 'Grey' },
  { code: 'C101', name: 'Grey (Light/Inverse)', description: '회색 - 반전 연한 배경', bgHex: '#f1f5f9', textHex: '#475569', category: 'Grey' },
  { code: 'C110', name: 'Grey (Intensified)', description: '회색 - 강조 짙은 배경', bgHex: '#cbd5e1', textHex: '#1e293b', category: 'Grey' },
  { code: 'C111', name: 'Grey (Intensified Light)', description: '회색 - 강조 연한 배경', bgHex: '#e2e8f0', textHex: '#334155', category: 'Grey' },

  // C2xx: Light Blue / Sky Blue
  { code: 'C200', name: 'Light Blue (Default)', description: '하늘색 - 기본 배경', bgHex: '#e0f2fe', textHex: '#0369a1', category: 'Light Blue' },
  { code: 'C201', name: 'Light Blue (Light/Inverse)', description: '하늘색 - 반전 연한 배경', bgHex: '#f0f9ff', textHex: '#0284c7', category: 'Light Blue' },
  { code: 'C210', name: 'Light Blue (Intensified)', description: '하늘색 - 강조 짙은 배경', bgHex: '#bae6fd', textHex: '#0c4a6e', category: 'Light Blue' },
  { code: 'C211', name: 'Light Blue (Intensified Light)', description: '하늘색 - 강조 연한 배경', bgHex: '#e0f2fe', textHex: '#0369a1', category: 'Light Blue' },

  // C3xx: Yellow
  { code: 'C300', name: 'Yellow (Default)', description: '노란색 - 기본 배경', bgHex: '#fef9c3', textHex: '#854d0e', category: 'Yellow' },
  { code: 'C301', name: 'Yellow (Light/Inverse)', description: '노란색 - 반전 연한 배경', bgHex: '#fefce8', textHex: '#a16207', category: 'Yellow' },
  { code: 'C310', name: 'Yellow (Intensified)', description: '노란색 - 강조 짙은 배경', bgHex: '#fef08a', textHex: '#713f12', category: 'Yellow' },
  { code: 'C311', name: 'Yellow (Intensified Light)', description: '노란색 - 강조 연한 배경', bgHex: '#fef9c3', textHex: '#854d0e', category: 'Yellow' },

  // C4xx: Blue-Grey / Cyan
  { code: 'C400', name: 'Blue-Grey (Default)', description: '청회색 - 기본 배경', bgHex: '#e2e8f0', textHex: '#1e293b', category: 'Blue-Grey' },
  { code: 'C401', name: 'Blue-Grey (Light/Inverse)', description: '청회색 - 반전 연한 배경', bgHex: '#f8fafc', textHex: '#334155', category: 'Blue-Grey' },
  { code: 'C410', name: 'Blue-Grey (Intensified)', description: '청회색 - 강조 짙은 배경', bgHex: '#cbd5e1', textHex: '#0f172a', category: 'Blue-Grey' },
  { code: 'C411', name: 'Blue-Grey (Intensified Light)', description: '청회색 - 강조 연한 배경', bgHex: '#f1f5f9', textHex: '#1e293b', category: 'Blue-Grey' },

  // C5xx: Green
  { code: 'C500', name: 'Green (Default)', description: '초록색 - 기본 배경', bgHex: '#dcfce7', textHex: '#166534', category: 'Green' },
  { code: 'C501', name: 'Green (Light/Inverse)', description: '초록색 - 반전 연한 배경', bgHex: '#f0fdf4', textHex: '#15803d', category: 'Green' },
  { code: 'C510', name: 'Green (Intensified)', description: '초록색 - 강조 짙은 배경', bgHex: '#bbf7d0', textHex: '#14532d', category: 'Green' },
  { code: 'C511', name: 'Green (Intensified Light)', description: '초록색 - 강조 연한 배경', bgHex: '#dcfce7', textHex: '#166534', category: 'Green' },

  // C6xx: Red
  { code: 'C600', name: 'Red (Default)', description: '빨간색 - 기본 배경', bgHex: '#fee2e2', textHex: '#991b1b', category: 'Red' },
  { code: 'C601', name: 'Red (Light/Inverse)', description: '빨간색 - 반전 연한 배경', bgHex: '#fef2f2', textHex: '#b91c1c', category: 'Red' },
  { code: 'C610', name: 'Red (Intensified)', description: '빨간색 - 강조 짙은 배경', bgHex: '#fecaca', textHex: '#7f1d1d', category: 'Red' },
  { code: 'C611', name: 'Red (Intensified Light)', description: '빨간색 - 강조 연한 배경', bgHex: '#fee2e2', textHex: '#991b1b', category: 'Red' },

  // C7xx: Orange
  { code: 'C700', name: 'Orange (Default)', description: '주황색 - 기본 배경', bgHex: '#ffedd5', textHex: '#9a3412', category: 'Orange' },
  { code: 'C701', name: 'Orange (Light/Inverse)', description: '주황색 - 반전 연한 배경', bgHex: '#fff7ed', textHex: '#c2410c', category: 'Orange' },
  { code: 'C710', name: 'Orange (Intensified)', description: '주황색 - 강조 짙은 배경', bgHex: '#fed7aa', textHex: '#7c2d12', category: 'Orange' },
  { code: 'C711', name: 'Orange (Intensified Light)', description: '주황색 - 강조 연한 배경', bgHex: '#ffedd5', textHex: '#9a3412', category: 'Orange' },
];

export function getSapColorHex(colorCode: string | undefined): { bg: string; text: string } {
  if (!colorCode || colorCode.trim() === '') {
    return { bg: 'transparent', text: 'inherit' };
  }
  const clean = colorCode.trim().toUpperCase();
  const match = SAP_ALV_COLORS.find((c) => c.code === clean);
  if (match) {
    return { bg: match.bgHex, text: match.textHex };
  }
  // Generic fallback if code matches Cxyz
  if (clean.startsWith('C') && clean.length === 4) {
    const digit = clean[1];
    switch (digit) {
      case '1': return { bg: '#e2e8f0', text: '#334155' };
      case '2': return { bg: '#e0f2fe', text: '#0369a1' };
      case '3': return { bg: '#fef08a', text: '#854d0e' };
      case '4': return { bg: '#cbd5e1', text: '#1e293b' };
      case '5': return { bg: '#bbf7d0', text: '#166534' };
      case '6': return { bg: '#fecaca', text: '#991b1b' };
      case '7': return { bg: '#fed7aa', text: '#9a3412' };
    }
  }
  return { bg: 'transparent', text: 'inherit' };
}

interface SapColorSearchHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectColor: (colorCode: string) => void;
  currentColor?: string;
  fieldName?: string;
}

export const SapColorSearchHelpModal: React.FC<SapColorSearchHelpModalProps> = ({
  isOpen,
  onClose,
  onSelectColor,
  currentColor = '',
  fieldName = '',
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  if (!isOpen) return null;

  const categories = ['ALL', 'Grey', 'Light Blue', 'Yellow', 'Blue-Grey', 'Green', 'Red', 'Orange'];

  const filtered = SAP_ALV_COLORS.filter((c) => {
    const matchCat = selectedCategory === 'ALL' || c.category === selectedCategory;
    if (!matchCat) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg h-[620px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 font-sans">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                SAP ALV Grid Color Search Help (F4)
              </h3>
              <p className="text-[11px] text-slate-300">
                LVC_T_FCAT-EMPHASIZE 컬러 코드를 선택하여 컬럼 색상을 지정합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search color code (e.g., C310, Green, Yellow)..."
              className="text-xs w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette List (Matching RFQ v1.17 Page 2 Screenshot) */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Option: Clear / None */}
          <div
            onClick={() => {
              onSelectColor('');
              onClose();
            }}
            className={`flex items-center justify-between p-2.5 mb-2 rounded-lg border cursor-pointer transition-all hover:border-slate-400 ${
              !currentColor
                ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-7 rounded border border-dashed border-slate-400 bg-white flex items-center justify-center text-[10px] text-slate-400 font-mono">
                None
              </div>
              <div>
                <span className="font-mono font-bold text-xs text-slate-700">None (기본 투명/색상 해제)</span>
                <p className="text-[11px] text-slate-400">컬럼에 별도 색상을 지정하지 않습니다.</p>
              </div>
            </div>
            {!currentColor && <Check className="w-4 h-4 text-blue-600" />}
          </div>

          {/* Color Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 select-none">
                <tr>
                  <th className="py-2 px-3 w-28 font-mono">CODE</th>
                  <th className="py-2 px-3">Текст (COLOR PREVIEW & NAME)</th>
                  <th className="py-2 px-2 text-center w-16">SELECT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filtered.map((c) => {
                  const isSelected = currentColor.toUpperCase() === c.code.toUpperCase();
                  return (
                    <tr
                      key={c.code}
                      onClick={() => {
                        onSelectColor(c.code);
                        onClose();
                      }}
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-inset ring-blue-600 font-bold' : 'hover:opacity-90'
                      }`}
                      style={{ backgroundColor: c.bgHex }}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold" style={{ color: c.textHex }}>
                        {c.code}
                      </td>
                      <td className="py-2.5 px-3 font-semibold" style={{ color: c.textHex }}>
                        <div className="flex items-center gap-2">
                          <span>{c.code}</span>
                          <span className="text-[11px] opacity-80">— {c.description}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div>
            {fieldName && <span>Target Field: <strong className="font-mono text-blue-900">{fieldName}</strong></span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded font-semibold text-slate-700 cursor-pointer shadow-2xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
