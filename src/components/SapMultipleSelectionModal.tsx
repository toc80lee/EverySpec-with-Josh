import React, { useState } from 'react';
import { Check, X, Plus, Trash2 } from 'lucide-react';
import { SelectionParameter } from '../types/sap';

interface SapMultipleSelectionModalProps {
  param: SelectionParameter;
  isOpen: boolean;
  onClose: () => void;
  onApply: (
    low: string,
    high: string,
    items: { sign: 'I' | 'E'; option: string; low: string; high: string }[]
  ) => void;
}

export const SapMultipleSelectionModal: React.FC<SapMultipleSelectionModalProps> = ({
  param,
  isOpen,
  onClose,
  onApply,
}) => {
  const existingMulti = param.multi_values || [];

  const initialIncludeSingles = existingMulti
    .filter((m) => m.sign === 'I' && (m.option === 'EQ' || m.option === 'CP'))
    .map((m) => m.low);
  const initialIncludeRanges = existingMulti
    .filter((m) => m.sign === 'I' && m.option === 'BT')
    .map((m) => ({ low: m.low, high: m.high }));
  const initialExcludeSingles = existingMulti
    .filter((m) => m.sign === 'E' && (m.option === 'EQ' || m.option === 'CP' || m.option === 'NE'))
    .map((m) => m.low);
  const initialExcludeRanges = existingMulti
    .filter((m) => m.sign === 'E' && m.option === 'BT')
    .map((m) => ({ low: m.low, high: m.high }));

  const [tab, setTab] = useState<'single' | 'range' | 'exclude'>('single');
  const [singleItems, setSingleItems] = useState<string[]>(() =>
    initialIncludeSingles.length > 0
      ? [...initialIncludeSingles, '']
      : [param.low && !param.high ? param.low : '', '', '', '']
  );
  const [rangeItems, setRangeItems] = useState<{ low: string; high: string }[]>(() =>
    initialIncludeRanges.length > 0
      ? [...initialIncludeRanges, { low: '', high: '' }]
      : [{ low: param.high ? param.low || '' : '', high: param.high || '' }, { low: '', high: '' }]
  );
  const [excludeSingles, setExcludeSingles] = useState<string[]>(() =>
    initialExcludeSingles.length > 0 ? [...initialExcludeSingles, ''] : ['', '']
  );
  const [excludeRanges, setExcludeRanges] = useState<{ low: string; high: string }[]>(() =>
    initialExcludeRanges.length > 0
      ? [...initialExcludeRanges, { low: '', high: '' }]
      : [{ low: '', high: '' }]
  );

  if (!isOpen) return null;

  const validSingleCount = singleItems.filter((s) => s.trim() !== '').length;
  const validRangeCount = rangeItems.filter((r) => r.low.trim() !== '').length;
  const validExcludeCount =
    excludeSingles.filter((s) => s.trim() !== '').length +
    excludeRanges.filter((r) => r.low.trim() !== '').length;

  const handleApply = () => {
    const validSingles = singleItems.map((s) => s.trim()).filter(Boolean);
    const validRanges = rangeItems
      .map((r) => ({ low: r.low.trim(), high: r.high.trim() }))
      .filter((r) => r.low !== '');
    const validExSingles = excludeSingles.map((s) => s.trim()).filter(Boolean);
    const validExRanges = excludeRanges
      .map((r) => ({ low: r.low.trim(), high: r.high.trim() }))
      .filter((r) => r.low !== '');

    const items: { sign: 'I' | 'E'; option: string; low: string; high: string }[] = [];

    validSingles.forEach((v) => {
      items.push({ sign: 'I', option: v.includes('*') ? 'CP' : 'EQ', low: v, high: '' });
    });
    validRanges.forEach((r) => {
      items.push({
        sign: 'I',
        option: r.high ? 'BT' : r.low.includes('*') ? 'CP' : 'EQ',
        low: r.low,
        high: r.high,
      });
    });
    validExSingles.forEach((v) => {
      items.push({ sign: 'E', option: v.includes('*') ? 'CP' : 'EQ', low: v, high: '' });
    });
    validExRanges.forEach((r) => {
      items.push({
        sign: 'E',
        option: r.high ? 'BT' : 'EQ',
        low: r.low,
        high: r.high,
      });
    });

    let low = '';
    let high = '';
    if (validRanges.length > 0) {
      low = validRanges[0].low;
      high = validRanges[0].high;
    } else if (validSingles.length > 0) {
      low = validSingles[0];
      high = '';
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
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white" />
            <span>
              Multiple Selection: {param.text} ({param.name})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tab Navigation (Authentic SAP GUI tabs) */}
        <div className="flex border-b border-slate-300 bg-[#E3E1D4] px-2 pt-1.5 gap-1">
          <button
            type="button"
            onClick={() => setTab('single')}
            className={`px-3 py-1 text-xs rounded-t border-t border-x transition-colors cursor-pointer ${
              tab === 'single'
                ? 'bg-[#ECE9D8] border-slate-400 font-semibold text-slate-900 border-b-transparent -mb-px'
                : 'bg-[#DCD8C8] border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Select Single Values{validSingleCount > 0 ? ` (${validSingleCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setTab('range')}
            className={`px-3 py-1 text-xs rounded-t border-t border-x transition-colors cursor-pointer ${
              tab === 'range'
                ? 'bg-[#ECE9D8] border-slate-400 font-semibold text-slate-900 border-b-transparent -mb-px'
                : 'bg-[#DCD8C8] border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Select Ranges{validRangeCount > 0 ? ` (${validRangeCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setTab('exclude')}
            className={`px-3 py-1 text-xs rounded-t border-t border-x transition-colors cursor-pointer ${
              tab === 'exclude'
                ? 'bg-[#ECE9D8] border-slate-400 font-semibold text-rose-800 border-b-transparent -mb-px'
                : 'bg-[#DCD8C8] border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Exclude Values{validExcludeCount > 0 ? ` (${validExcludeCount})` : ''}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3">
          <div className="text-[11px] text-slate-600">
            {tab === 'single' &&
              'Enter individual values to include (Sign = I, Option = EQ/CP). Supports * wildcards.'}
            {tab === 'range' &&
              'Enter From / To intervals to include (Sign = I, Option = BT).'}
            {tab === 'exclude' &&
              'Enter individual values or intervals to exclude from selection (Sign = E).'}
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
                    placeholder={`Value ${idx + 1}`}
                    className="flex-1 bg-white border border-slate-400 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  {singleItems.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setSingleItems(singleItems.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSingleItems([...singleItems, ''])}
                className="mt-1 flex items-center gap-1 text-[11px] text-blue-700 hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>
          )}

          {tab === 'range' && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              <div className="flex text-[11px] text-slate-500 font-medium px-8 gap-4">
                <span className="flex-1">Lower Limit (From)</span>
                <span className="flex-1">Upper Limit (To)</span>
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
                  {rangeItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRangeItems(rangeItems.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRangeItems([...rangeItems, { low: '', high: '' }])}
                className="mt-1 flex items-center gap-1 text-[11px] text-blue-700 hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Interval
              </button>
            </div>
          )}

          {tab === 'exclude' && (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-rose-800">
                  Exclude Single Values (Sign = E, Option = EQ)
                </div>
                {excludeSingles.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-right font-mono text-rose-500 text-[11px]">E{idx + 1}</span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const next = [...excludeSingles];
                        next[idx] = e.target.value;
                        setExcludeSingles(next);
                      }}
                      placeholder={`Exclude value ${idx + 1}`}
                      className="flex-1 bg-white border border-rose-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                    />
                    {excludeSingles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setExcludeSingles(excludeSingles.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setExcludeSingles([...excludeSingles, ''])}
                  className="flex items-center gap-1 text-[11px] text-rose-700 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Exclude Value
                </button>
              </div>

              <div className="border-t border-slate-300 pt-2 space-y-1.5">
                <div className="text-[11px] font-semibold text-rose-800">
                  Exclude Ranges (Sign = E, Option = BT)
                </div>
                {excludeRanges.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-right font-mono text-rose-500 text-[11px]">R{idx + 1}</span>
                    <input
                      type="text"
                      value={r.low}
                      onChange={(e) => {
                        const next = [...excludeRanges];
                        next[idx] = { ...next[idx], low: e.target.value };
                        setExcludeRanges(next);
                      }}
                      placeholder="Exclude From"
                      className="flex-1 bg-white border border-rose-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                    />
                    <span className="text-slate-400">~</span>
                    <input
                      type="text"
                      value={r.high}
                      onChange={(e) => {
                        const next = [...excludeRanges];
                        next[idx] = { ...next[idx], high: e.target.value };
                        setExcludeRanges(next);
                      }}
                      placeholder="Exclude To"
                      className="flex-1 bg-white border border-rose-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setExcludeRanges([...excludeRanges, { low: '', high: '' }])}
                  className="flex items-center gap-1 text-[11px] text-rose-700 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Exclude Range
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with SAP Classic Buttons */}
        <div className="flex items-center justify-between border-t border-slate-300 bg-[#E3E1D4] px-4 py-2">
          <button
            type="button"
            onClick={() => {
              setSingleItems(['', '']);
              setRangeItems([{ low: '', high: '' }]);
              setExcludeSingles(['', '']);
              setExcludeRanges([{ low: '', high: '' }]);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-700 bg-[#F4F2E6] border border-slate-400 hover:bg-white cursor-pointer"
          >
            Clear All
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-white bg-[#2B547E] border border-[#1A385C] hover:bg-[#1E3F66] shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Copy (F8)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-[11px] text-slate-700 bg-[#ECE9D8] border border-slate-400 hover:bg-white cursor-pointer"
            >
              Cancel (F12)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
