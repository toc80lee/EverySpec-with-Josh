import React, { useEffect } from 'react';
import { ArrowLeft, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS: {
  title: string;
  items: { keys: string[]; desc: string }[];
}[] = [
  {
    title: 'Workspace & Layout',
    items: [
      { keys: ['Alt', '1'], desc: 'Dual View (Split Screen)' },
      { keys: ['Alt', '2'], desc: 'SAP GUI Simulator Only' },
      { keys: ['Alt', '3'], desc: 'Spec Editor Only' },
      { keys: ['Alt', '4'], desc: 'ABAP Source Code' },
      { keys: ['Alt', '5'], desc: 'Document / Print View' },
      { keys: ['Alt', 'L'], desc: 'Cycle Split Layout (4-Way)' },
      { keys: ['Double-Click'], desc: 'Reset Split Divider to 50 : 50' },
    ],
  },
  {
    title: 'Specification History',
    items: [
      { keys: ['Ctrl', 'Z'], desc: 'Undo Spec Change (outside text inputs)' },
      { keys: ['Ctrl', 'Y'], desc: 'Redo Spec Change' },
      { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo Spec Change (Alt)' },
      { keys: ['?'], desc: 'Open / Close Keyboard Shortcuts' },
    ],
  },
  {
    title: 'Markdown Editor',
    items: [
      { keys: ['Double-Click'], desc: 'Switch Preview to Edit Mode' },
      { keys: ['Ctrl', 'B'], desc: 'Bold Selected Text (**...**)' },
      { keys: ['Ctrl', 'E'], desc: 'Toggle Edit / Preview Mode' },
      { keys: ['Tab'], desc: 'Indent Line (2 spaces)' },
    ],
  },
  {
    title: 'Tables & SAP GUI Simulator',
    items: [
      { keys: ['Ctrl', 'C'], desc: 'Copy Selected Grid Range (TSV)' },
      { keys: ['Ctrl', 'V'], desc: 'Paste Rows from Excel / Sheets' },
      { keys: ['Esc'], desc: 'Clear Grid Selection / Close Popups' },
      { keys: ['F4'], desc: 'Open SAP Value Help (Inside Inputs)' },
      { keys: ['F8'], desc: 'Execute Selection Screen Simulation' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto px-6 py-7 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center shrink-0">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Keyboard Shortcuts
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                사양서 편집기, 마크다운 에디터, SAP GUI 시뮬레이터에서 지원하는 단축키 목록입니다. (Esc 키로 이전 화면 복귀)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>이전 화면으로 돌아가기</span>
          </button>
        </div>

        {/* Shortcut Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {SHORTCUT_GROUPS.map((group) => (
            <div
              key={group.title}
              className="border border-slate-200 rounded-xl p-5 bg-white space-y-3"
            >
              <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                {group.title}
              </h2>
              <div className="space-y-2.5">
                {group.items.map((item) => (
                  <div
                    key={item.desc}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-slate-600">{item.desc}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, idx) => (
                        <React.Fragment key={`${k}-${idx}`}>
                          <kbd className="px-2 py-0.5 bg-slate-50 border border-slate-300 rounded shadow-2xs font-mono text-[11px] font-bold text-slate-800">
                            {k}
                          </kbd>
                          {idx < item.keys.length - 1 && (
                            <span className="text-slate-400 text-[11px]">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
