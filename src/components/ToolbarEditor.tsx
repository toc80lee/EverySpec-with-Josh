import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  Search,
  Copy,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AlvToolbarButton, ProgramSpec } from '../types/sap';
import { DEFAULT_ALV_TOOLBAR_BUTTONS } from '../data/defaultToolbarButtons';
import { SapToolbarIcon } from './AlvToolbar';
import {
  exportToolbarButtonsToTsv,
  copyTsvToClipboard,
  parseSpreadsheetText,
  CellRange,
  isCellInRange,
  extractCellRangeTsv,
  isTruthy,
} from '../utils/spreadsheetClipboard';

interface ToolbarEditorProps {
  spec: ProgramSpec;
  onChange: (updatedButtons: AlvToolbarButton[]) => void;
}

export const ToolbarEditor: React.FC<ToolbarEditorProps> = ({ spec, onChange }) => {
  const buttons = spec.toolbar_buttons && spec.toolbar_buttons.length > 0
    ? spec.toolbar_buttons
    : DEFAULT_ALV_TOOLBAR_BUTTONS;

  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('custom');
  const [searchQuery, setSearchQuery] = useState('');

  // Cell range selection state
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const dragAnchorRef = useRef<{ row: number; col: number } | null>(null);

  // Mouse up listener on window
  useEffect(() => {
    const handleMouseUp = () => {
      setIsMouseDown(false);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Separate buttons into Standard vs Custom
  const standardButtons = buttons.filter(
    (b) => b.is_standard !== false || b.function.startsWith('&')
  );
  const customButtons = buttons.filter(
    (b) => b.is_standard === false && !b.function.startsWith('&')
  );

  const displayedButtons = activeTab === 'standard' ? standardButtons : customButtons;

  const filteredButtons = displayedButtons.filter(
    (b) =>
      b.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.function.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.quickinfo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Column definitions for Toolbar table (Columns A..G, Type column deleted per RFQ v1.05)
  // 0: DISPLAY (visible)
  // 1: ICON
  // 2: FUNCTION
  // 3: BUTTON TEXT
  // 4: QUICKINFO
  // 5: SEPARATOR (separator_before)
  // 6: DISABLED
  const COL_COUNT = 7;

  const getToolbarCellValue = (rowIdx: number, colIdx: number): string => {
    const btn = filteredButtons[rowIdx];
    if (!btn) return '';
    switch (colIdx) {
      case 0: return btn.visible !== false ? 'X' : '';
      case 1: return btn.icon || '';
      case 2: return btn.function || '';
      case 3: return btn.text || '';
      case 4: return btn.quickinfo || '';
      case 5: return btn.separator_before ? 'X' : '';
      case 6: return btn.disabled ? 'X' : '';
      default: return '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement &&
        activeEl.selectionStart !== null &&
        activeEl.selectionEnd !== null &&
        activeEl.selectionStart !== activeEl.selectionEnd
      ) {
        return;
      }
      if (selectedRange) {
        e.preventDefault();
        const tsv = extractCellRangeTsv(selectedRange, getToolbarCellValue);
        if (tsv) {
          copyTsvToClipboard(tsv);
        }
      }
    }
  };

  // Handle cell selection
  const handleCellMouseDown = (rowIdx: number, colIdx: number) => {
    setIsMouseDown(true);
    dragAnchorRef.current = { row: rowIdx, col: colIdx };
    setSelectedRange({
      startRow: rowIdx,
      startCol: colIdx,
      endRow: rowIdx,
      endCol: colIdx,
    });
  };

  const handleCellMouseEnter = (rowIdx: number, colIdx: number) => {
    if (!isMouseDown || !dragAnchorRef.current) return;
    setSelectedRange({
      startRow: dragAnchorRef.current.row,
      startCol: dragAnchorRef.current.col,
      endRow: rowIdx,
      endCol: colIdx,
    });
  };

  // Direct paste into selected cells and expand rows if needed
  const handleTablePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    const matrix = parseSpreadsheetText(text);
    if (matrix.length === 0) return;

    e.preventDefault();

    const startR = selectedRange
      ? Math.min(selectedRange.startRow, selectedRange.endRow)
      : 0;
    const startC = selectedRange
      ? Math.min(selectedRange.startCol, selectedRange.endCol)
      : (matrix[0].length === 1 ? 3 : 0); // If 1 col, default to button text if not selected

    const pastedRowCount = matrix.length;
    const pastedColCount = Math.max(...matrix.map((r) => r.length));

    // Clone buttons
    const updated = [...buttons];

    // Find indices of currently displayed buttons in the master buttons list
    const displayedMasterIndices: number[] = displayedButtons.map((db) =>
      updated.findIndex((b) => b.id === db.id)
    );

    const neededTotal = startR + pastedRowCount;
    const currentDisplayedCount = displayedButtons.length;

    // If more rows needed and we are in Custom tab, automatically add rows!
    if (neededTotal > currentDisplayedCount) {
      const rowsToAdd = neededTotal - currentDisplayedCount;
      for (let i = 0; i < rowsToAdd; i++) {
        const nextIdx = customButtons.length + i + 1;
        const newBtn: AlvToolbarButton = {
          id: `btn-custom-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          function: `FC0${nextIdx}`,
          text: `Custom Button ${nextIdx}`,
          quickinfo: `Custom Button ${nextIdx}`,
          icon: 'ICON_EXECUTE',
          disabled: false,
          visible: true,
          is_standard: false,
          separator_before: false,
        };
        updated.push(newBtn);
        displayedMasterIndices.push(updated.length - 1);
      }
    }

    // Apply values
    matrix.forEach((rowVals, rOffset) => {
      const targetRowIdx = startR + rOffset;
      const masterIdx = displayedMasterIndices[targetRowIdx];
      if (masterIdx === undefined || !updated[masterIdx]) return;

      const targetBtn = { ...updated[masterIdx] };

      rowVals.forEach((val, cOffset) => {
        const targetColIdx = startC + cOffset;
        const trimmed = val.trim();

        switch (targetColIdx) {
          case 0: // DISPLAY
            targetBtn.visible = isTruthy(trimmed, true);
            break;
          case 1: // ICON
            if (trimmed) targetBtn.icon = trimmed;
            break;
          case 2: // FUNCTION
            if (trimmed) targetBtn.function = trimmed.toUpperCase();
            break;
          case 3: // BUTTON TEXT
            targetBtn.text = trimmed;
            break;
          case 4: // QUICKINFO
            targetBtn.quickinfo = trimmed;
            break;
          case 5: // SEPARATOR
            targetBtn.separator_before = isTruthy(trimmed, false);
            break;
          case 6: // DISABLED
            targetBtn.disabled = isTruthy(trimmed, false);
            break;
        }
      });

      updated[masterIdx] = targetBtn;
    });

    onChange(updated);

    // Expand selection to encompass pasted area
    setSelectedRange({
      startRow: startR,
      startCol: startC,
      endRow: startR + pastedRowCount - 1,
      endCol: Math.min(startC + pastedColCount - 1, COL_COUNT - 1),
    });
  };

  // Keyboard navigation
  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, colKey: string) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-tcell="${rowIndex + 1}-${colKey}"]`) as HTMLElement;
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector(`[data-tcell="${rowIndex - 1}-${colKey}"]`) as HTMLElement;
      if (prevInput) prevInput.focus();
    }
  };

  // Copy table to Excel
  const handleCopyTable = async () => {
    const tsv = exportToolbarButtonsToTsv(displayedButtons);
    await copyTsvToClipboard(tsv);
  };

  // Add custom button
  const handleAddButton = () => {
    const nextIdx = customButtons.length + 1;
    const newBtn: AlvToolbarButton = {
      id: `btn-custom-${Date.now()}`,
      function: `FC0${nextIdx}`,
      text: `Custom Button ${nextIdx}`,
      quickinfo: `Execute custom function ${nextIdx}`,
      icon: 'ICON_EXECUTE',
      disabled: false,
      visible: true,
      is_standard: false,
      separator_before: false,
    };
    onChange([...buttons, newBtn]);
    setActiveTab('custom');
  };

  // Reset to default 16 standard buttons
  const handleResetDefaults = () => {
    if (window.confirm('Reset standard toolbar to SAP standard 16 buttons (&EXPORT follows &PRINT)?')) {
      onChange([...DEFAULT_ALV_TOOLBAR_BUTTONS, ...customButtons]);
    }
  };

  // Move custom buttons up/down
  const handleMoveCustom = (customIndex: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? customIndex - 1 : customIndex + 1;
    if (targetIdx < 0 || targetIdx >= customButtons.length) return;

    const reorderedCustom = [...customButtons];
    const temp = reorderedCustom[customIndex];
    reorderedCustom[customIndex] = reorderedCustom[targetIdx];
    reorderedCustom[targetIdx] = temp;

    // Combine standard and reordered custom
    onChange([...standardButtons, ...reorderedCustom]);
  };

  // Delete custom button
  const handleDeleteCustom = (id: string) => {
    onChange(buttons.filter((b) => b.id !== id));
  };

  // Update button field
  const handleUpdate = (id: string, patch: Partial<AlvToolbarButton>) => {
    onChange(buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="space-y-3 font-sans focus:outline-none"
    >
      {/* Tab Switcher: Standard vs Custom */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab('standard');
              setSelectedRange(null);
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'standard'
                ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Standard ({standardButtons.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('custom');
              setSelectedRange(null);
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-white text-emerald-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Custom ({customButtons.length})</span>
          </button>
        </div>

        {/* Right side controls per active tab: Simple Icon buttons with Tooltips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeTab === 'custom' && (
            <button
              type="button"
              onClick={handleAddButton}
              title="+ Add Custom Button"
              aria-label="Add Custom Button"
              className="p-1.5 text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors flex items-center justify-center shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          {activeTab === 'standard' && (
            <button
              type="button"
              onClick={handleResetDefaults}
              title="Restore Standard Toolbar (16 Buttons)"
              aria-label="Restore Standard Toolbar"
              className="p-1.5 text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyTable}
            disabled={displayedButtons.length === 0}
            className="p-1.5 text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors flex items-center justify-center shadow-2xs cursor-pointer disabled:opacity-40"
            title="Copy Table to Excel"
            aria-label="Copy Table to Excel"
          >
            <Copy className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Action / Search Bar & Info */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 p-2 rounded-lg border border-slate-200">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search button text / code..."
            className="text-xs pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-52 shadow-2xs"
          />
        </div>

        <div className="text-xs text-slate-600">
          {activeTab === 'standard' ? (
            <span className="text-slate-500">
              SAP Standard sequence fixed (&EXPORT placed right after &PRINT). Order editing disabled.
            </span>
          ) : (
            <span className="text-slate-500">
              Click & drag to select cells. <strong>Ctrl+C</strong> copy and <strong>Ctrl+V</strong> paste supported.
            </span>
          )}
        </div>
      </div>

      {/* Buttons Table in Google Sheets Style */}
      <div
        onPaste={handleTablePaste}
        className="border border-slate-300 rounded-lg overflow-x-auto bg-white shadow-xs focus:outline-none select-none"
      >
        <table className="w-full text-xs text-left border-collapse font-sans">
          <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold text-[11px] select-none">
            <tr>
              {/* Row index corner cell */}
              <th className="py-2 px-1 text-center w-8 bg-slate-200 border-r border-slate-300 text-slate-500 font-mono text-[10px]" title="Spreadsheet Row Number">
                fx
              </th>
              <th className="py-1 px-1 text-center w-14 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">A</div>
                <div>DISPLAY</div>
              </th>
              <th className="py-1 px-1 text-center w-12 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">B</div>
                <div>ICON</div>
              </th>
              <th className="py-1 px-2 w-28 border-r border-slate-200 font-mono">
                <div className="text-[9px] text-slate-400 font-mono">C</div>
                <div>FUNCTION</div>
              </th>
              <th className="py-1 px-2 min-w-36 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">D</div>
                <div>BUTTON TEXT</div>
              </th>
              <th className="py-1 px-2 min-w-48 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">E</div>
                <div>QUICKINFO</div>
              </th>
              <th className="py-1 px-1 text-center w-16 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">F</div>
                <div>SEPARATOR</div>
              </th>
              <th className="py-1 px-1 text-center w-16 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">G</div>
                <div>DISABLED</div>
              </th>
              {activeTab === 'custom' && (
                <th className="py-1 px-2 text-center w-24">
                  <div className="text-[9px] text-slate-400 font-mono">ACTIONS</div>
                  <div>ORDER / DEL</div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
            {filteredButtons.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'custom' ? 9 : 8} className="py-10 text-center text-slate-400 font-sans">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <p className="font-medium">
                      {activeTab === 'standard'
                        ? 'No standard toolbar buttons found.'
                        : 'No custom toolbar buttons created yet.'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {activeTab === 'custom'
                        ? 'Click "+ Add Custom Button" or paste multi-line rows with Ctrl+V.'
                        : 'Click "Restore Standard Toolbar" to restore standard buttons.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredButtons.map((btn, idx) => {
                const isSelectedRow =
                  selectedRange &&
                  idx >= Math.min(selectedRange.startRow, selectedRange.endRow) &&
                  idx <= Math.max(selectedRange.startRow, selectedRange.endRow);

                return (
                  <tr
                    key={btn.id}
                    className={`transition-colors ${
                      !btn.visible ? 'opacity-40 bg-slate-50/60' : 'hover:bg-blue-50/20'
                    }`}
                  >
                    {/* Google Sheets Row Index (1, 2, 3...) */}
                    <td
                      onClick={() => {
                        setSelectedRange({
                          startRow: idx,
                          startCol: 0,
                          endRow: idx,
                          endCol: COL_COUNT - 1,
                        });
                      }}
                      className={`py-1 px-1 text-center font-mono font-bold text-[10px] border-r border-slate-300 select-none cursor-pointer ${
                        isSelectedRow ? 'bg-blue-200 text-blue-900' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </td>

                    {/* Col A: Visible Checkbox */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 0)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 0)}
                      className={`p-0 border-r border-slate-200 text-center ${
                        isCellInRange(selectedRange, idx, 0)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-center h-8">
                        <input
                          type="checkbox"
                          checked={btn.visible !== false}
                          onChange={(e) => handleUpdate(btn.id, { visible: e.target.checked })}
                          title={btn.visible !== false ? 'Visible on toolbar' : 'Hidden on toolbar'}
                          className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                        />
                      </div>
                    </td>

                    {/* Col B: Icon Preview */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 1)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 1)}
                      className={`p-0 border-r border-slate-200 text-center ${
                        isCellInRange(selectedRange, idx, 1)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-center h-8">
                        <div
                          className="w-6 h-6 mx-auto rounded flex items-center justify-center border border-[#c0a662] shadow-2xs"
                          style={{
                            background: btn.disabled
                              ? '#ede4cc'
                              : 'linear-gradient(to bottom, #fffdf2 0%, #fae6a6 50%, #f4d983 100%)',
                          }}
                          title={`Icon: ${btn.icon}`}
                        >
                          <SapToolbarIcon func={btn.function} iconName={btn.icon} />
                        </div>
                      </div>
                    </td>

                    {/* Col C: Function code */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 2)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 2)}
                      className={`p-0 border-r border-slate-200 font-bold ${
                        isCellInRange(selectedRange, idx, 2)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <input
                        type="text"
                        value={btn.function}
                        disabled={activeTab === 'standard'}
                        data-tcell={`${idx}-function`}
                        onFocus={() => {
                          if (!selectedRange) {
                            setSelectedRange({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'function')}
                        onChange={(e) => handleUpdate(btn.id, { function: e.target.value })}
                        onBlur={(e) =>
                          handleUpdate(btn.id, { function: e.target.value.trim().toUpperCase() })
                        }
                        className="w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase font-mono font-bold text-slate-800 disabled:text-slate-600"
                      />
                    </td>

                    {/* Col D: Button Text */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 3)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 3)}
                      className={`p-0 border-r border-slate-200 font-sans ${
                        isCellInRange(selectedRange, idx, 3)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <input
                        type="text"
                        value={btn.text}
                        data-tcell={`${idx}-text`}
                        onFocus={() => {
                          if (!selectedRange) {
                            setSelectedRange({ startRow: idx, startCol: 3, endRow: idx, endCol: 3 });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'text')}
                        onChange={(e) => handleUpdate(btn.id, { text: e.target.value })}
                        className="w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-800"
                      />
                    </td>

                    {/* Col E: Quickinfo */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 4)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 4)}
                      className={`p-0 border-r border-slate-200 font-sans ${
                        isCellInRange(selectedRange, idx, 4)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <input
                        type="text"
                        value={btn.quickinfo}
                        data-tcell={`${idx}-quickinfo`}
                        onFocus={() => {
                          if (!selectedRange) {
                            setSelectedRange({ startRow: idx, startCol: 4, endRow: idx, endCol: 4 });
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, 'quickinfo')}
                        onChange={(e) => handleUpdate(btn.id, { quickinfo: e.target.value })}
                        className="w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700"
                      />
                    </td>

                    {/* Col F: Separator before */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 5)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 5)}
                      className={`p-0 border-r border-slate-200 text-center ${
                        isCellInRange(selectedRange, idx, 5)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-center h-8">
                        <input
                          type="checkbox"
                          checked={!!btn.separator_before}
                          onChange={(e) =>
                            handleUpdate(btn.id, { separator_before: e.target.checked })
                          }
                          title="Insert separator line (|) before button"
                          className="w-4 h-4 accent-slate-600 rounded cursor-pointer"
                        />
                      </div>
                    </td>

                    {/* Col G: Disabled */}
                    <td
                      onMouseDown={() => handleCellMouseDown(idx, 6)}
                      onMouseEnter={() => handleCellMouseEnter(idx, 6)}
                      className={`p-0 border-r border-slate-200 text-center ${
                        isCellInRange(selectedRange, idx, 6)
                          ? 'bg-blue-100 ring-1 ring-blue-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-center h-8">
                        <input
                          type="checkbox"
                          checked={btn.disabled}
                          onChange={(e) => handleUpdate(btn.id, { disabled: e.target.checked })}
                          title="Disable button"
                          className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                        />
                      </div>
                    </td>

                    {/* Col H: Actions (Custom tab only) */}
                    {activeTab === 'custom' && (
                      <td className="py-1 px-1 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveCustom(idx, 'up')}
                            disabled={idx === 0}
                            title="Move up"
                            className="p-1 text-slate-400 hover:text-blue-700 disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveCustom(idx, 'down')}
                            disabled={idx === customButtons.length - 1}
                            title="Move down"
                            className="p-1 text-slate-400 hover:text-blue-700 disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustom(btn.id)}
                            title="Delete button"
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Guide footer */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs flex items-center justify-between flex-wrap gap-2">
        <div>
          <strong>Spreadsheet Tips:</strong> Click on any cell or drag across cells to select. Paste (<strong>Ctrl+V</strong>) directly to update. If pasted data contains more lines, new custom lines are automatically created.
        </div>
        <span className="font-mono text-[11px] text-slate-700 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
          Showing {displayedButtons.length} / Total {buttons.length} Buttons
        </span>
      </div>
    </div>
  );
};
