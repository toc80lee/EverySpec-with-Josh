import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sliders,
  Check,
  Search,
} from 'lucide-react';
import { AlvToolbarButton, ProgramSpec } from '../types/sap';
import { DEFAULT_ALV_TOOLBAR_BUTTONS } from '../data/defaultToolbarButtons';
import { SapToolbarIcon } from './AlvToolbar';

interface ToolbarEditorProps {
  spec: ProgramSpec;
  onChange: (updatedButtons: AlvToolbarButton[]) => void;
}

export const ToolbarEditor: React.FC<ToolbarEditorProps> = ({ spec, onChange }) => {
  const buttons = spec.toolbar_buttons && spec.toolbar_buttons.length > 0
    ? spec.toolbar_buttons
    : DEFAULT_ALV_TOOLBAR_BUTTONS;

  const [searchQuery, setSearchQuery] = useState('');

  // Add custom button
  const handleAddButton = () => {
    const nextIdx = buttons.length + 1;
    const newBtn: AlvToolbarButton = {
      id: `btn-custom-${Date.now()}`,
      function: `FC0${nextIdx}`,
      text: `기능버튼 ${nextIdx}`,
      quickinfo: `사용자 정의 기능 ${nextIdx} 실행`,
      icon: 'ICON_EXECUTE',
      disabled: false,
      visible: true,
      is_standard: false,
    };
    onChange([...buttons, newBtn]);
  };

  // Reset to analyzed default toolbar buttons
  const handleResetDefaults = () => {
    if (confirm('툴바 버튼을 캡처 이미지의 기본 16개 표준 버튼으로 초기화하시겠습니까?')) {
      onChange(DEFAULT_ALV_TOOLBAR_BUTTONS);
    }
  };

  // Move up/down
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= buttons.length) return;

    const list = [...buttons];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    onChange(list);
  };

  // Delete
  const handleDelete = (id: string) => {
    onChange(buttons.filter(b => b.id !== id));
  };

  // Update button field
  const handleUpdate = (id: string, patch: Partial<AlvToolbarButton>) => {
    onChange(buttons.map(b => (b.id === id ? { ...b, ...patch } : b)));
  };

  const filteredButtons = buttons.filter(b =>
    b.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.function.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.quickinfo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 font-sans">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search button text / code..."
              className="text-xs pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
            />
          </div>

          <button
            onClick={handleAddButton}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Add Custom Button
          </button>
        </div>

        <button
          onClick={handleResetDefaults}
          title="Restore standard 16 ALV toolbar buttons"
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          Restore Standard Toolbar (16 Buttons)
        </button>
      </div>

      {/* Buttons Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center">Display</th>
              <th className="py-2.5 px-3 w-12 text-center">Icon</th>
              <th className="py-2.5 px-3 w-28">Function</th>
              <th className="py-2.5 px-3 min-w-32">Button Text</th>
              <th className="py-2.5 px-3 min-w-48">Quickinfo</th>
              <th className="py-2.5 px-3 text-center w-16">Separator</th>
              <th className="py-2.5 px-3 text-center w-16">Disabled</th>
              <th className="py-2.5 px-3 text-center w-16">Type</th>
              <th className="py-2.5 px-3 text-center w-20">Order / Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {filteredButtons.map((btn, idx) => (
              <tr key={btn.id} className={`hover:bg-slate-50 transition-colors ${!btn.visible ? 'opacity-40 bg-slate-50' : ''}`}>
                {/* 1. Visible Checkbox */}
                <td className="py-2 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={btn.visible !== false}
                    onChange={(e) => handleUpdate(btn.id, { visible: e.target.checked })}
                    title={btn.visible !== false ? 'Visible on toolbar' : 'Hidden on toolbar'}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </td>

                {/* 2. Icon Picture preview */}
                <td className="py-2 px-3 text-center">
                  <div
                    className="w-6 h-6 mx-auto rounded flex items-center justify-center border border-[#c0a662] shadow-2xs"
                    style={{
                      background: btn.disabled ? '#ede4cc' : 'linear-gradient(to bottom, #fffdf2 0%, #fae6a6 50%, #f4d983 100%)',
                    }}
                    title={`Icon: ${btn.icon}`}
                  >
                    <SapToolbarIcon func={btn.function} iconName={btn.icon} />
                  </div>
                </td>

                {/* Function code */}
                <td className="py-1.5 px-3 font-bold text-slate-800">
                  <input
                    type="text"
                    value={btn.function}
                    onChange={(e) => handleUpdate(btn.id, { function: e.target.value })}
                    onBlur={(e) => handleUpdate(btn.id, { function: e.target.value.trim().toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500 uppercase font-bold"
                  />
                </td>

                {/* Text */}
                <td className="py-1.5 px-3 font-sans">
                  <input
                    type="text"
                    value={btn.text}
                    onChange={(e) => handleUpdate(btn.id, { text: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500 font-medium"
                  />
                </td>

                {/* Quickinfo */}
                <td className="py-1.5 px-3 font-sans">
                  <input
                    type="text"
                    value={btn.quickinfo}
                    onChange={(e) => handleUpdate(btn.id, { quickinfo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500 text-slate-700"
                  />
                </td>

                {/* Separator before */}
                <td className="py-1.5 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={!!btn.separator_before}
                    onChange={(e) => handleUpdate(btn.id, { separator_before: e.target.checked })}
                    title="Insert separator line (|) before button"
                    className="w-4 h-4 accent-slate-600 rounded cursor-pointer"
                  />
                </td>

                {/* Disabled */}
                <td className="py-1.5 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={btn.disabled}
                    onChange={(e) => handleUpdate(btn.id, { disabled: e.target.checked })}
                    title="Disable button"
                    className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                  />
                </td>

                {/* Standard vs Custom */}
                <td className="py-1.5 px-3 text-center font-sans">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${btn.is_standard ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {btn.is_standard ? 'Standard' : 'Custom'}
                  </span>
                </td>

                {/* Actions */}
                <td className="py-1.5 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      title="Move up"
                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === buttons.length - 1}
                      title="Move down"
                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    {!btn.is_standard && (
                      <button
                        onClick={() => handleDelete(btn.id)}
                        title="Delete button"
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tip guide */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-xs">
        <strong>ALV Toolbar Guide:</strong> Standard 16 SAP buttons are registered by default. You can customize button visibility, disabled state, text, quickinfo tooltip, and command functions in real time.
      </div>
    </div>
  );
};
