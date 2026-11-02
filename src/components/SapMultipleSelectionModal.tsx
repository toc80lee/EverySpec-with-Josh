import React, { useState } from 'react';
import { Check, X, Plus, Trash2 } from 'lucide-react';
import { SelectionParameter } from '../types/sap';

interface SapMultipleSelectionModalProps {
  param: SelectionParameter;
  isOpen: boolean;
  onClose: () => void;
  onApply: (low: string, high: string, items: { sign: 'I' | 'E'; option: string; low: string; high: string }[]) => void;
}

export const SapMultipleSelectionModal: React.FC<SapMultipleSelectionModalProps> = ({
  param,
  isOpen,
  onClose,
  onApply,
}) => {
  if (!isOpen) return null;

  const [tab, setTab] = useState<'single' | 'range' | 'exclude'>('single');
  const [singleItems, setSingleItems] = useState<string[]>([
    param.low || '',
    '',
    '',
    '',
  ]);
  const [rangeItems, setRangeItems] = useState<{ low: string; high: string }[]>([
    { low: param.low || '', high: param.high || '' },
    { low: '', high: '' },
    { low: '', high: '' },
  ]);

  const handleApply = () => {
    const validSingles = singleItems.filter(s => s.trim() !== '');
    const validRanges = rangeItems.filter(r => r.low.trim() !== '');

    let low = param.low || '';
    let high = param.high || '';
    const items: { sign: 'I' | 'E'; option: string; low: string; high: string }[] = [];

    if (validSingles.length > 0) {
      low = validSingles[0];
      high = '';
      validSingles.forEach(v => {
        items.push({ sign: 'I', option: 'EQ', low: v, high: '' });
      });
    } else if (validRanges.length > 0) {
      low = validRanges[0].low;
      high = validRanges[0].high;
      validRanges.forEach(r => {
        items.push({ sign: 'I', option: 'BT', low: r.low, high: r.high });
      });
    }

    onApply(low, high, items);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded border border-slate-400 bg-[#ECE9D8] shadow-2xl text-slate-800 text-xs font-sans">
        {/* SAP GUI Classic Dialog Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#2B547E] to-[#4863A0] px-3 py-1.5 text-white font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white"></span>
            <span>다중 선택: {param.text} ({param.name})</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-0.5 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tab Navigation (Authentic SAP GUI tabs) */}
        <div className="flex border-b border-slate-300 bg-[#E3E1D4] px-2 pt-1.5 gap-1">
          <button
            onClick={() => setTab('single')}
            className={`px-3 py-1 text-xs rounded-t border-t border-x transition-colors ${
              tab === 'single'
                ? 'bg-[#ECE9D8] border-slate-400 font-semibold text-slate-900 border-b-transparent -mb-px'
                : 'bg-[#DCD8C8] border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            단일 값 선택 (Single)
          </button>
          <button
            onClick={() => setTab('range')}
            className={`px-3 py-1 text-xs rounded-t border-t border-x transition-colors ${
              tab === 'range'
                ? 'bg-[#ECE9D8] border-slate-400 font-semibold text-slate-900 border-b-transparent -mb-px'
                : 'bg-[#DCD8C8] border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            구간 선택 (Ranges)
          </button>
          <button
            onClick={() => setTab('exclude')}
            className={`px-3 py-1 text-xs rounded-t border-t border-x transition-colors ${
              tab === 'exclude'
                ? 'bg-[#ECE9D8] border-slate-400 font-semibold text-slate-900 border-b-transparent -mb-px'
                : 'bg-[#DCD8C8] border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            제외 값 (Exclude)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3">
          <div className="text-[11px] text-slate-600">
            {tab === 'single' && '지정할 단일 값들을 입력하세요. (Sign = I, Option = EQ)'}
            {tab === 'range' && '조회할 범위의 시작값과 종료값을 입력하세요. (Sign = I, Option = BT)'}
            {tab === 'exclude' && '조회 대상에서 제외할 값을 입력하세요. (Sign = E)'}
          </div>

          {tab === 'single' && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {singleItems.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-right font-mono text-slate-500 text-[11px]">{idx + 1}</span>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => {
                      const next = [...singleItems];
                      next[idx] = e.target.value;
                      setSingleItems(next);
                    }}
                    placeholder={`값 ${idx + 1}`}
                    className="flex-1 bg-white border border-slate-400 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  {singleItems.length > 2 && (
                    <button
                      onClick={() => setSingleItems(singleItems.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setSingleItems([...singleItems, ''])}
                className="mt-1 flex items-center gap-1 text-[11px] text-blue-700 hover:underline"
              >
                <Plus className="w-3 h-3" /> 행 추가
              </button>
            </div>
          )}

          {tab === 'range' && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              <div className="flex text-[11px] text-slate-500 font-medium px-8 gap-4">
                <span className="flex-1">시작값 (From)</span>
                <span className="flex-1">종료값 (To)</span>
              </div>
              {rangeItems.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-right font-mono text-slate-500 text-[11px]">{idx + 1}</span>
                  <input
                    type="text"
                    value={r.low}
                    onChange={(e) => {
                      const next = [...rangeItems];
                      next[idx] = { ...next[idx], low: e.target.value };
                      setRangeItems(next);
                    }}
                    placeholder="From"
                    className="flex-1 bg-white border border-slate-400 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="text"
                    value={r.high}
                    onChange={(e) => {
                      const next = [...rangeItems];
                      next[idx] = { ...next[idx], high: e.target.value };
                      setRangeItems(next);
                    }}
                    placeholder="To"
                    className="flex-1 bg-white border border-slate-400 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              ))}
              <button
                onClick={() => setRangeItems([...rangeItems, { low: '', high: '' }])}
                className="mt-1 flex items-center gap-1 text-[11px] text-blue-700 hover:underline"
              >
                <Plus className="w-3 h-3" /> 구간 추가
              </button>
            </div>
          )}

          {tab === 'exclude' && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded">
              제외 조건은 조회 대상에서 특정 코드 또는 범위를 제외(Sign = 'E')할 때 사용됩니다.
            </div>
          )}
        </div>

        {/* Footer with SAP Classic Buttons */}
        <div className="flex items-center justify-between border-t border-slate-300 bg-[#E3E1D4] px-4 py-2">
          <button
            onClick={() => {
              setSingleItems(['', '']);
              setRangeItems([{ low: '', high: '' }]);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-700 bg-[#F4F2E6] border border-slate-400 hover:bg-white"
          >
            전체 초기화
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApply}
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-white bg-[#2B547E] border border-[#1A385C] hover:bg-[#1E3F66] shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              적용 (F8 / Copy)
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 text-[11px] text-slate-700 bg-[#ECE9D8] border border-slate-400 hover:bg-white"
            >
              취소 (F12)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
