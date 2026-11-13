import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sliders,
  X,
  Check,
  Search,
  Copy,
  CircleDot,
  Box,
  Unlink,
  Pencil,
  GitPullRequestCreate,
} from 'lucide-react';
import { SelectionParameter, SelectionKind, ProgramSpec, SapDataType } from '../types/sap';
import { SapSearchHelpModal } from './SapSearchHelpModal';
import {
  exportSelectionParamsToTsv,
  copyTsvToClipboard,
  parseSpreadsheetText,
  CellRange,
  isCellInRange,
  extractCellRangeTsv,
  normalizeDataType,
  defaultLengthForType,
  isTruthy,
} from '../utils/spreadsheetClipboard';

interface SelectionScreenEditorProps {
  spec: ProgramSpec;
  onChange: (updatedParams: SelectionParameter[]) => void;
  onAddParam?: (paramData: {
    kind: SelectionKind;
    name: string;
    datatype: SapDataType;
    length: number;
    text?: string;
    ref_table?: string;
    ref_field?: string;
    obligatory?: boolean;
    default_val?: string;
    block_title?: string;
    block_id?: string;
    radio_group?: string;
  }) => void;
  onOpenAiExtract?: () => void;
}

const SAP_DATA_TYPES: { type: SapDataType; label: string; defaultLen: number }[] = [
  { type: 'CHAR', label: 'CHAR (Character String)', defaultLen: 10 },
  { type: 'NUMC', label: 'NUMC (Numeric Text)', defaultLen: 10 },
  { type: 'DATS', label: 'DATS (Date YYYYMMDD)', defaultLen: 8 },
  { type: 'TIMS', label: 'TIMS (Time HHMMSS)', defaultLen: 6 },
  { type: 'CURR', label: 'CURR (Currency Amount)', defaultLen: 15 },
  { type: 'DEC', label: 'DEC (Decimal Number)', defaultLen: 13 },
  { type: 'INT4', label: 'INT4 (4-byte Integer)', defaultLen: 10 },
  { type: 'UNIT', label: 'UNIT (Unit of Measure)', defaultLen: 3 },
  { type: 'STRING', label: 'STRING (Variable Length)', defaultLen: 255 },
];

interface BoxSummary {
  blockId: string;
  blockTitle: string;
  count: number;
}

function getNextBlockId(existingParams: SelectionParameter[]): string {
  const usedIds = new Set(
    existingParams.map((p) => (p.block_id || '').toLowerCase()).filter(Boolean)
  );
  let idx = 1;
  while (usedIds.has(`b${idx}`)) {
    idx++;
  }
  return `b${idx}`;
}

function getNextRadioGroupId(existingParams: SelectionParameter[]): string {
  const usedGroups = new Set(
    existingParams
      .filter((p) => p.kind === 'RADIOBUTTON' && p.radio_group)
      .map((p) => (p.radio_group || '').toUpperCase())
  );
  let idx = 1;
  while (usedGroups.has(`R${idx}`)) {
    idx++;
  }
  return `R${idx}`;
}

export const SelectionScreenEditor: React.FC<SelectionScreenEditorProps> = ({
  spec,
  onChange,
  onAddParam,
  onOpenAiExtract,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [showRadioGroupModal, setShowRadioGroupModal] = useState(false);

  const [searchHelpTarget, setSearchHelpTarget] = useState<{
    type: 'modal' | 'row';
    paramId?: string;
  } | null>(null);

  // Cell range selection state
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const dragAnchorRef = React.useRef<{ row: number; col: number } | null>(null);

  React.useEffect(() => {
    const handleMouseUp = () => {
      setIsMouseDown(false);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const COL_COUNT = 11;

  // Derived list of existing boxes & radio groups
  const existingBoxes = useMemo<BoxSummary[]>(() => {
    const map = new Map<string, BoxSummary>();
    spec.selection_params.forEach((p) => {
      const title = p.block_title?.trim() || '';
      const id = p.block_id?.trim() || '';
      if (!title && !id) return;
      const key = id || `title_${title}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.blockTitle && title) existing.blockTitle = title;
      } else {
        map.set(key, {
          blockId: id || `b${map.size + 1}`,
          blockTitle: title || id,
          count: 1,
        });
      }
    });
    return Array.from(map.values());
  }, [spec.selection_params]);

  const existingRadioGroups = useMemo<string[]>(() => {
    const set = new Set<string>();
    spec.selection_params.forEach((p) => {
      if (p.kind === 'RADIOBUTTON' && p.radio_group?.trim()) {
        set.add(p.radio_group.trim().toUpperCase());
      }
    });
    return Array.from(set);
  }, [spec.selection_params]);

  const getSelectionCellValue = (rowIdx: number, colIdx: number): string => {
    const p = spec.selection_params[rowIdx];
    if (!p) return '';
    switch (colIdx) {
      case 0:
        return p.kind === 'SELECT_OPTION'
          ? 'S-OPT'
          : p.kind === 'RADIOBUTTON'
          ? 'RADIO'
          : p.kind === 'CHECKBOX'
          ? 'CHK'
          : 'PARAM';
      case 1:
        return p.name || '';
      case 2:
        return p.text || '';
      case 3:
        return p.datatype || 'CHAR';
      case 4:
        return String(p.length || 10);
      case 5:
        return p.ref_table || '';
      case 6:
        return p.ref_field || '';
      case 7:
        return p.obligatory ? 'X' : '';
      case 8:
        return p.default_val || '';
      case 9:
        return p.block_title || '';
      case 10:
        return p.kind === 'RADIOBUTTON' ? p.radio_group || '' : '';
      default:
        return '';
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
        const tsv = extractCellRangeTsv(selectedRange, getSelectionCellValue);
        if (tsv) {
          copyTsvToClipboard(tsv);
        }
      }
    }
  };

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

  // Resolve or generate block_id from block_title
  const resolveBlockIdForTitle = (title: string, currentParams: SelectionParameter[]): string => {
    const clean = title.trim();
    if (!clean) return '';
    const found = currentParams.find(
      (p) => (p.block_title || '').trim().toLowerCase() === clean.toLowerCase() && p.block_id
    );
    if (found?.block_id) return found.block_id;
    return getNextBlockId(currentParams);
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
      : matrix[0].length === 1
      ? 2
      : 0;

    const pastedRowCount = matrix.length;
    const pastedColCount = Math.max(...matrix.map((r) => r.length));

    const updated = [...spec.selection_params];
    const neededTotal = startR + pastedRowCount;

    if (neededTotal > updated.length) {
      const rowsToAdd = neededTotal - updated.length;
      for (let i = 0; i < rowsToAdd; i++) {
        const nextIdx = updated.length + 1;
        const newParam: SelectionParameter = {
          id: `param-paste-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          kind: 'PARAMETER',
          name: `P_PARAM${nextIdx}`,
          text: `Parameter ${nextIdx}`,
          datatype: 'CHAR',
          length: 10,
          obligatory: false,
          default_val: '',
        };
        updated.push(newParam);
      }
    }

    matrix.forEach((rowVals, rOffset) => {
      const targetRowIdx = startR + rOffset;
      if (!updated[targetRowIdx]) return;

      const targetParam = { ...updated[targetRowIdx] };

      rowVals.forEach((val, cOffset) => {
        const targetColIdx = startC + cOffset;
        const trimmed = val.trim();

        switch (targetColIdx) {
          case 0: {
            const up = trimmed.toUpperCase();
            if (up.startsWith('R')) {
              targetParam.kind = 'RADIOBUTTON';
              targetParam.datatype = 'CHAR';
              targetParam.length = 1;
              targetParam.obligatory = false;
              if (!targetParam.radio_group) targetParam.radio_group = 'R1';
            } else if (up === 'CHK' || up === 'CHECKBOX' || up === 'C') {
              targetParam.kind = 'CHECKBOX';
              targetParam.datatype = 'CHAR';
              targetParam.length = 1;
              targetParam.obligatory = false;
            } else if (up.includes('SELECT') || up.includes('S-OPT') || up.startsWith('S_')) {
              targetParam.kind = 'SELECT_OPTION';
            } else {
              targetParam.kind = 'PARAMETER';
            }
            break;
          }
          case 1:
            if (trimmed) targetParam.name = trimmed.toUpperCase();
            break;
          case 2:
            targetParam.text = trimmed;
            break;
          case 3:
            if (trimmed) {
              const dt = normalizeDataType(trimmed);
              targetParam.datatype = dt;
              if (!rowVals[cOffset + 1]) {
                targetParam.length = defaultLengthForType(dt);
              }
            }
            break;
          case 4: {
            const num = parseInt(trimmed, 10);
            if (!isNaN(num) && num > 0) targetParam.length = num;
            break;
          }
          case 5:
            targetParam.ref_table = trimmed.toUpperCase();
            break;
          case 6:
            targetParam.ref_field = trimmed.toUpperCase();
            break;
          case 7:
            targetParam.obligatory = isTruthy(trimmed, false);
            break;
          case 8:
            targetParam.default_val = trimmed;
            break;
          case 9:
            targetParam.block_title = trimmed || undefined;
            targetParam.block_id = trimmed ? resolveBlockIdForTitle(trimmed, updated) : undefined;
            break;
          case 10:
            if (targetParam.kind === 'RADIOBUTTON') {
              targetParam.radio_group = trimmed.toUpperCase().slice(0, 4) || 'R1';
            }
            break;
        }
      });

      updated[targetRowIdx] = targetParam;
    });

    onChange(updated);

    setSelectedRange({
      startRow: startR,
      startCol: startC,
      endRow: startR + pastedRowCount - 1,
      endCol: Math.min(startC + pastedColCount - 1, COL_COUNT - 1),
    });
  };

  const handleCopyTable = async () => {
    const tsv = exportSelectionParamsToTsv(spec.selection_params);
    await copyTsvToClipboard(tsv);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, colKey: string) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-cell="${rowIndex + 1}-${colKey}"]`) as HTMLElement;
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector(`[data-cell="${rowIndex - 1}-${colKey}"]`) as HTMLElement;
      if (prevInput) prevInput.focus();
    }
  };

  // =========================================================================
  // 1. Add Single Field Modal State
  // =========================================================================
  const [addForm, setAddForm] = useState<{
    kind: SelectionKind;
    name: string;
    datatype: SapDataType;
    length: number;
    text: string;
    ref_table: string;
    ref_field: string;
    obligatory: boolean;
    default_val: string;
    block_title: string;
    block_id: string;
    radio_group: string;
  }>({
    kind: 'PARAMETER',
    name: 'P_BUKRS',
    datatype: 'CHAR',
    length: 4,
    text: 'Company Code',
    ref_table: 'T001',
    ref_field: 'BUKRS',
    obligatory: true,
    default_val: '1000',
    block_title: '',
    block_id: '',
    radio_group: '',
  });

  const handleOpenAdd = (kind: SelectionKind) => {
    const nextIdx = spec.selection_params.length + 1;
    const isSelectOpt = kind === 'SELECT_OPTION';
    const isRadioOrChk = kind === 'RADIOBUTTON' || kind === 'CHECKBOX';
    const lastBox = existingBoxes[existingBoxes.length - 1];

    setAddForm({
      kind,
      name: isSelectOpt ? `S_FIELD${nextIdx}` : `P_FIELD${nextIdx}`,
      datatype: 'CHAR',
      length: isRadioOrChk ? 1 : 10,
      text: isSelectOpt
        ? `Selection Range ${nextIdx}`
        : kind === 'RADIOBUTTON'
        ? `라디오 옵션 ${nextIdx}`
        : kind === 'CHECKBOX'
        ? `체크박스 ${nextIdx}`
        : `Parameter Item ${nextIdx}`,
      ref_table: '',
      ref_field: '',
      obligatory: false,
      default_val: '',
      block_title: lastBox?.blockTitle || '',
      block_id: lastBox?.blockId || '',
      radio_group: kind === 'RADIOBUTTON' ? existingRadioGroups[0] || 'R1' : '',
    });
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = addForm.block_title.trim();
    const resolvedBlockId = cleanTitle
      ? addForm.block_id.trim() || resolveBlockIdForTitle(cleanTitle, spec.selection_params)
      : undefined;

    if (onAddParam) {
      onAddParam({
        kind: addForm.kind,
        name: addForm.name,
        datatype: addForm.datatype,
        length: addForm.length,
        text: addForm.text,
        ref_table: addForm.ref_table,
        ref_field: addForm.ref_field,
        obligatory: addForm.obligatory,
        default_val: addForm.default_val,
        block_title: cleanTitle || undefined,
        block_id: resolvedBlockId,
        radio_group:
          addForm.kind === 'RADIOBUTTON'
            ? addForm.radio_group.trim().toUpperCase().slice(0, 4) || 'R1'
            : undefined,
      });
    } else {
      const nextIdx = spec.selection_params.length + 1;
      const isRadioOrChk = addForm.kind === 'RADIOBUTTON' || addForm.kind === 'CHECKBOX';
      const newParam: SelectionParameter = {
        id: `param-${Date.now()}`,
        kind: addForm.kind,
        name:
          addForm.name.trim().toUpperCase() ||
          (addForm.kind === 'SELECT_OPTION' ? `S_FLD${nextIdx}` : `P_FLD${nextIdx}`),
        text: addForm.text.trim() || `Field ${nextIdx}`,
        datatype: isRadioOrChk ? 'CHAR' : addForm.datatype,
        length: isRadioOrChk ? 1 : Number(addForm.length) > 0 ? Number(addForm.length) : 10,
        ref_table: addForm.ref_table.trim().toUpperCase() || '',
        ref_field: addForm.ref_field.trim().toUpperCase() || '',
        obligatory: isRadioOrChk ? false : addForm.obligatory,
        default_val: addForm.default_val.trim(),
        block_title: cleanTitle || undefined,
        block_id: resolvedBlockId,
        radio_group:
          addForm.kind === 'RADIOBUTTON'
            ? addForm.radio_group.trim().toUpperCase().slice(0, 4) || 'R1'
            : undefined,
        low: '',
        high: '',
        sign: 'I',
        option: 'EQ',
      };
      onChange([...spec.selection_params, newParam]);
    }
    setShowAddModal(false);
  };

  // =========================================================================
  // 2. Box (Frame Block) Builder Modal State
  // =========================================================================
  const [boxForm, setBoxForm] = useState<{
    mode: 'new' | 'edit';
    targetBlockId: string;
    blockId: string;
    blockTitle: string;
    selectedParamIds: string[];
  }>({
    mode: 'new',
    targetBlockId: '',
    blockId: 'b1',
    blockTitle: '',
    selectedParamIds: [],
  });

  const handleOpenBoxModal = (editBox?: BoxSummary) => {
    if (editBox) {
      const members = spec.selection_params
        .filter((p) => (p.block_id || `title_${p.block_title}`) === editBox.blockId || p.block_title === editBox.blockTitle)
        .map((p) => p.id);
      setBoxForm({
        mode: 'edit',
        targetBlockId: editBox.blockId,
        blockId: editBox.blockId,
        blockTitle: editBox.blockTitle,
        selectedParamIds: members,
      });
    } else {
      // Pre-select rows currently highlighted in spreadsheet, or unboxed items
      let preSelected: string[] = [];
      if (selectedRange) {
        const minR = Math.min(selectedRange.startRow, selectedRange.endRow);
        const maxR = Math.max(selectedRange.startRow, selectedRange.endRow);
        preSelected = spec.selection_params
          .slice(minR, maxR + 1)
          .map((p) => p.id);
      }
      setBoxForm({
        mode: 'new',
        targetBlockId: '',
        blockId: getNextBlockId(spec.selection_params),
        blockTitle: '',
        selectedParamIds: preSelected,
      });
    }
    setShowBoxModal(true);
  };

  const handleBoxFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = boxForm.blockTitle.trim();
    if (!title) return;

    const cleanBlockId =
      boxForm.blockId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 8) ||
      getNextBlockId(spec.selection_params);

    const selectedSet = new Set(boxForm.selectedParamIds);

    // 1. Update block assignments on items
    const updatedItems = spec.selection_params.map((p) => {
      if (selectedSet.has(p.id)) {
        return {
          ...p,
          block_id: cleanBlockId,
          block_title: title,
        };
      }
      if (boxForm.mode === 'edit' && p.block_id === boxForm.targetBlockId) {
        return {
          ...p,
          block_id: undefined,
          block_title: undefined,
        };
      }
      return p;
    });

    // 2. Keep boxed items contiguous cleanly (anchored at the earliest selected item index)
    if (selectedSet.size > 0) {
      const firstSelectedIdx = updatedItems.findIndex((p) => selectedSet.has(p.id));
      const beforeItems = updatedItems
        .slice(0, firstSelectedIdx)
        .filter((p) => !selectedSet.has(p.id));
      const boxMembers = updatedItems.filter((p) => selectedSet.has(p.id));
      const afterItems = updatedItems
        .slice(firstSelectedIdx)
        .filter((p) => !selectedSet.has(p.id));
      onChange([...beforeItems, ...boxMembers, ...afterItems]);
    } else {
      onChange(updatedItems);
    }

    setShowBoxModal(false);
  };

  const handleRenameBoxTitle = (blockId: string, oldTitle: string, newTitle: string) => {
    const updated = spec.selection_params.map((p) => {
      const matches = blockId ? p.block_id === blockId : p.block_title === oldTitle;
      return matches ? { ...p, block_title: newTitle } : p;
    });
    onChange(updated);
  };

  const handleUngroupBox = (blockId: string, blockTitle: string) => {
    const updated = spec.selection_params.map((p) => {
      const matches = blockId ? p.block_id === blockId : p.block_title === blockTitle;
      return matches ? { ...p, block_id: undefined, block_title: undefined } : p;
    });
    onChange(updated);
  };

  // =========================================================================
  // 3. Radio Button Group Builder Modal State
  // =========================================================================
  const [radioGroupForm, setRadioGroupForm] = useState<{
    groupId: string;
    boxMode: 'existing' | 'new' | 'none';
    existingBoxId: string;
    newBoxTitle: string;
    defaultIndex: number;
    options: { name: string; text: string }[];
  }>({
    groupId: 'R1',
    boxMode: 'new',
    existingBoxId: '',
    newBoxTitle: '처리 옵션 (Processing Options)',
    defaultIndex: 0,
    options: [
      { name: 'P_RAD1', text: '옵션 1' },
      { name: 'P_RAD2', text: '옵션 2' },
    ],
  });

  const handleOpenRadioGroupModal = () => {
    const nextGrp = getNextRadioGroupId(spec.selection_params);
    const existingRadiosCount = spec.selection_params.filter((p) => p.kind === 'RADIOBUTTON').length;
    const baseNum = existingRadiosCount + 1;
    const hasBoxes = existingBoxes.length > 0;

    setRadioGroupForm({
      groupId: nextGrp,
      boxMode: hasBoxes ? 'new' : 'new',
      existingBoxId: existingBoxes[existingBoxes.length - 1]?.blockId || '',
      newBoxTitle: '처리 옵션 (Processing Options)',
      defaultIndex: 0,
      options: [
        { name: `P_R${baseNum}`, text: '전체 조회 (All)' },
        { name: `P_R${baseNum + 1}`, text: '미결/진행 건만 조회 (Open Only)' },
      ],
    });
    setShowRadioGroupModal(true);
  };

  const handleRadioGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanGroup =
      radioGroupForm.groupId.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 4) || 'R1';

    let targetBlockId: string | undefined;
    let targetBlockTitle: string | undefined;

    if (radioGroupForm.boxMode === 'existing' && radioGroupForm.existingBoxId) {
      const foundBox = existingBoxes.find((b) => b.blockId === radioGroupForm.existingBoxId);
      if (foundBox) {
        targetBlockId = foundBox.blockId;
        targetBlockTitle = foundBox.blockTitle;
      }
    } else if (radioGroupForm.boxMode === 'new' && radioGroupForm.newBoxTitle.trim()) {
      targetBlockTitle = radioGroupForm.newBoxTitle.trim();
      targetBlockId = resolveBlockIdForTitle(targetBlockTitle, spec.selection_params);
    }

    const timestamp = Date.now();
    const newRadios: SelectionParameter[] = radioGroupForm.options
      .filter((opt) => opt.name.trim() || opt.text.trim())
      .map((opt, idx) => {
        const isDefault = idx === radioGroupForm.defaultIndex;
        return {
          id: `param-radio-${timestamp}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          kind: 'RADIOBUTTON',
          name: opt.name.trim().toUpperCase() || `P_RAD${idx + 1}`,
          text: opt.text.trim() || `라디오 옵션 ${idx + 1}`,
          datatype: 'CHAR',
          length: 1,
          obligatory: false,
          default_val: isDefault ? 'X' : '',
          low: isDefault ? 'X' : '',
          high: '',
          sign: 'I',
          option: 'EQ',
          block_id: targetBlockId,
          block_title: targetBlockTitle,
          radio_group: cleanGroup,
        };
      });

    if (newRadios.length === 0) return;

    // If attaching to an existing box, insert right after the last item of that box
    if (radioGroupForm.boxMode === 'existing' && targetBlockId) {
      const lastMemberIdx = [...spec.selection_params]
        .reverse()
        .findIndex((p) => p.block_id === targetBlockId);
      if (lastMemberIdx !== -1) {
        const insertAt = spec.selection_params.length - lastMemberIdx;
        const nextList = [
          ...spec.selection_params.slice(0, insertAt),
          ...newRadios,
          ...spec.selection_params.slice(insertAt),
        ];
        onChange(nextList);
        setShowRadioGroupModal(false);
        return;
      }
    }

    onChange([...spec.selection_params, ...newRadios]);
    setShowRadioGroupModal(false);
  };

  // =========================================================================
  // Row CRUD Helpers
  // =========================================================================
  const handleDelete = (id: string) => {
    onChange(spec.selection_params.filter((p) => p.id !== id));
  };

  const handleUpdate = (id: string, patch: Partial<SelectionParameter>) => {
    onChange(spec.selection_params.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  // Set default 'X' on a RADIOBUTTON while clearing default on other members of the same group
  const handleSetRadioDefault = (param: SelectionParameter) => {
    const grp = (param.radio_group || 'R1').toUpperCase();
    onChange(
      spec.selection_params.map((p) => {
        if (p.kind === 'RADIOBUTTON' && (p.radio_group || 'R1').toUpperCase() === grp) {
          return {
            ...p,
            default_val: p.id === param.id ? 'X' : '',
            low: p.id === param.id ? 'X' : '',
          };
        }
        return p;
      })
    );
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= spec.selection_params.length) return;

    const list = [...spec.selection_params];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    onChange(list);
  };

  const handleApplySearchHelp = (selected: {
    table: string;
    field: string;
    label: string;
    datatype: SapDataType;
    length: number;
    description: string;
  }) => {
    if (!searchHelpTarget) return;

    if (searchHelpTarget.type === 'modal') {
      setAddForm((prev) => ({
        ...prev,
        ref_table: selected.table,
        ref_field: selected.field,
        datatype: selected.datatype,
        length: selected.length,
        text: selected.label,
        name: prev.kind === 'SELECT_OPTION' ? `S_${selected.field}` : `P_${selected.field}`,
      }));
    } else if (searchHelpTarget.type === 'row' && searchHelpTarget.paramId) {
      handleUpdate(searchHelpTarget.paramId, {
        ref_table: selected.table,
        ref_field: selected.field,
        datatype: selected.datatype,
        length: selected.length,
      });
    }

    setSearchHelpTarget(null);
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="space-y-4 font-sans focus:outline-none"
    >
      {/* Search Help (F4) Modal */}
      <SapSearchHelpModal
        isOpen={searchHelpTarget !== null}
        onClose={() => setSearchHelpTarget(null)}
        onSelect={handleApplySearchHelp}
      />

      {/* Datalists for inline autocomplete */}
      <datalist id="selection-existing-boxes">
        {existingBoxes.map((b) => (
          <option key={b.blockId} value={b.blockTitle} />
        ))}
      </datalist>
      <datalist id="selection-existing-radio-groups">
        {existingRadioGroups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      {/* =================================================================== */}
      {/* MODAL 1: Dynamic Add Field Modal                                    */}
      {/* =================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold">
                  Add Selection Field ({addForm.kind})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              {/* Kind Toggle (4 SAP Selection Kinds) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kind</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAddForm((f) => ({
                        ...f,
                        kind: 'PARAMETER',
                        name: f.name.startsWith('S_') ? f.name.replace(/^S_/, 'P_') : f.name,
                      }));
                    }}
                    className={`py-1.5 px-2 rounded border text-[11px] font-bold cursor-pointer ${
                      addForm.kind === 'PARAMETER'
                        ? 'bg-amber-100 border-amber-400 text-amber-900 ring-1 ring-amber-400'
                        : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    PARAMETERS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddForm((f) => ({
                        ...f,
                        kind: 'SELECT_OPTION',
                        name: f.name.startsWith('P_') ? f.name.replace(/^P_/, 'S_') : f.name,
                      }));
                    }}
                    className={`py-1.5 px-2 rounded border text-[11px] font-bold cursor-pointer ${
                      addForm.kind === 'SELECT_OPTION'
                        ? 'bg-blue-100 border-blue-400 text-blue-900 ring-1 ring-blue-400'
                        : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    SELECT-OPTIONS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddForm((f) => ({
                        ...f,
                        kind: 'RADIOBUTTON',
                        datatype: 'CHAR',
                        length: 1,
                        obligatory: false,
                        radio_group: f.radio_group || existingRadioGroups[0] || 'R1',
                        name: f.name.startsWith('S_') ? f.name.replace(/^S_/, 'P_') : f.name,
                      }));
                    }}
                    className={`py-1.5 px-2 rounded border text-[11px] font-bold cursor-pointer ${
                      addForm.kind === 'RADIOBUTTON'
                        ? 'bg-indigo-100 border-indigo-400 text-indigo-900 ring-1 ring-indigo-400'
                        : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    RADIOBUTTON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddForm((f) => ({
                        ...f,
                        kind: 'CHECKBOX',
                        datatype: 'CHAR',
                        length: 1,
                        obligatory: false,
                        name: f.name.startsWith('S_') ? f.name.replace(/^S_/, 'P_') : f.name,
                      }));
                    }}
                    className={`py-1.5 px-2 rounded border text-[11px] font-bold cursor-pointer ${
                      addForm.kind === 'CHECKBOX'
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900 ring-1 ring-emerald-400'
                        : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    CHECKBOX
                  </button>
                </div>
              </div>

              {/* Field Name & Data Type & Length */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Field Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value.toUpperCase() })}
                    placeholder={addForm.kind === 'SELECT_OPTION' ? 'S_VBELN' : 'P_BUKRS'}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-blue-950 uppercase focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Data Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addForm.datatype}
                    disabled={addForm.kind === 'RADIOBUTTON' || addForm.kind === 'CHECKBOX'}
                    onChange={(e) => {
                      const dt = e.target.value as SapDataType;
                      const found = SAP_DATA_TYPES.find((s) => s.type === dt);
                      setAddForm({
                        ...addForm,
                        datatype: dt,
                        length: found ? found.defaultLen : addForm.length,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono text-slate-800 focus:bg-white focus:border-blue-500 disabled:opacity-60"
                  >
                    {SAP_DATA_TYPES.map((dt) => (
                      <option key={dt.type} value={dt.type}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Length <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={255}
                    required
                    disabled={addForm.kind === 'RADIOBUTTON' || addForm.kind === 'CHECKBOX'}
                    value={addForm.length}
                    onChange={(e) =>
                      setAddForm({ ...addForm, length: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-center text-slate-800 focus:bg-white focus:border-blue-500 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Screen Text */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Screen Text (Label) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.text}
                  onChange={(e) => setAddForm({ ...addForm, text: e.target.value })}
                  placeholder="e.g., Company Code, Document Date, Sales Order"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:bg-white focus:border-blue-500"
                />
              </div>

              {/* Box Assignment & Radio Group */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Box Title (Optional)
                  </label>
                  <input
                    type="text"
                    list="selection-existing-boxes"
                    value={addForm.block_title}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = existingBoxes.find(
                        (b) => b.blockTitle.toLowerCase() === val.trim().toLowerCase()
                      );
                      setAddForm({
                        ...addForm,
                        block_title: val,
                        block_id: matched ? matched.blockId : '',
                      });
                    }}
                    placeholder="예: 기본 조회 조건"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:bg-white focus:border-blue-500"
                  />
                </div>

                {addForm.kind === 'RADIOBUTTON' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Radio Group ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      list="selection-existing-radio-groups"
                      value={addForm.radio_group}
                      onChange={(e) =>
                        setAddForm({ ...addForm, radio_group: e.target.value.toUpperCase().slice(0, 4) })
                      }
                      placeholder="R1"
                      className="w-full bg-indigo-50 border border-indigo-300 rounded px-2.5 py-1.5 font-mono font-bold uppercase text-indigo-900 focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Default Value
                    </label>
                    <input
                      type="text"
                      value={addForm.default_val}
                      onChange={(e) => setAddForm({ ...addForm, default_val: e.target.value })}
                      placeholder={addForm.kind === 'CHECKBOX' ? 'X 또는 공백' : 'e.g., 1000, 2026.01.01'}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:bg-white focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Reference Table & Field (for PARAM / S-OPT) */}
              {(addForm.kind === 'PARAMETER' || addForm.kind === 'SELECT_OPTION') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Reference Table & Field</span>
                    <button
                      type="button"
                      onClick={() => setSearchHelpTarget({ type: 'modal' })}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Search className="w-3 h-3 text-blue-600" />
                      <span>Search Help (F4)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={addForm.ref_table}
                      onChange={(e) =>
                        setAddForm({ ...addForm, ref_table: e.target.value.toUpperCase() })
                      }
                      placeholder="Ref Table (e.g., VBAK)"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono uppercase text-slate-800 focus:bg-white focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={addForm.ref_field}
                      onChange={(e) =>
                        setAddForm({ ...addForm, ref_field: e.target.value.toUpperCase() })
                      }
                      placeholder="Ref Field (e.g., VBELN)"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono uppercase text-slate-800 focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center pt-3">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold select-none">
                      <input
                        type="checkbox"
                        checked={addForm.obligatory}
                        onChange={(e) => setAddForm({ ...addForm, obligatory: e.target.checked })}
                        className="w-4 h-4 accent-red-600 rounded"
                      />
                      <span>OBLIGATORY (Required)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Add Field</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: Box (Frame Block) Builder Modal                            */}
      {/* =================================================================== */}
      {showBoxModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-bold">
                  {boxForm.mode === 'edit' ? '선택 화면 박스 수정 (Edit Box)' : '선택 화면 박스 구성 (Group into Box)'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowBoxModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBoxFormSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    박스 타이틀 (Box Title) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={boxForm.blockTitle}
                    onChange={(e) => setBoxForm({ ...boxForm, blockTitle: e.target.value })}
                    placeholder="예: 기본 조회 조건 (Basic Criteria)"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-medium focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Block ID
                  </label>
                  <input
                    type="text"
                    value={boxForm.blockId}
                    maxLength={8}
                    onChange={(e) =>
                      setBoxForm({
                        ...boxForm,
                        blockId: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                      })
                    }
                    placeholder="b1"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-800 focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700">
                    박스로 묶을 항목 선택 ({boxForm.selectedParamIds.length}개 선택됨)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setBoxForm((prev) => ({
                          ...prev,
                          selectedParamIds: spec.selection_params
                            .filter((p) => !p.block_title && !p.block_id)
                            .map((p) => p.id),
                        }))
                      }
                      className="text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
                    >
                      미지정 항목 선택
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBoxForm((prev) => ({
                          ...prev,
                          selectedParamIds: spec.selection_params.map((p) => p.id),
                        }))
                      }
                      className="text-[11px] font-medium text-slate-600 hover:underline cursor-pointer"
                    >
                      전체 선택
                    </button>
                  </div>
                </div>

                {spec.selection_params.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center text-slate-500">
                    먼저 PARAMETERS 또는 SELECT-OPTIONS 항목을 추가해 주세요.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100 bg-slate-50/50">
                    {spec.selection_params.map((p) => {
                      const checked = boxForm.selectedParamIds.includes(p.id);
                      const kindTag =
                        p.kind === 'SELECT_OPTION'
                          ? 'S-OPT'
                          : p.kind === 'RADIOBUTTON'
                          ? 'RADIO'
                          : p.kind === 'CHECKBOX'
                          ? 'CHK'
                          : 'PARAM';
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-colors ${
                            checked ? 'bg-blue-50/80' : 'hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...boxForm.selectedParamIds, p.id]
                                  : boxForm.selectedParamIds.filter((id) => id !== p.id);
                                setBoxForm({ ...boxForm, selectedParamIds: next });
                              }}
                              className="w-4 h-4 accent-blue-600 rounded shrink-0"
                            />
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                p.kind === 'SELECT_OPTION'
                                  ? 'bg-blue-100 text-blue-800'
                                  : p.kind === 'RADIOBUTTON'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : p.kind === 'CHECKBOX'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {kindTag}
                            </span>
                            <span className="font-mono font-bold text-slate-900 shrink-0">
                              {p.name}
                            </span>
                            <span className="text-slate-600 truncate">{p.text}</span>
                          </div>
                          {p.block_title && (
                            <span className="text-[10px] text-slate-400 shrink-0 truncate max-w-[130px]">
                              {p.block_title}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBoxModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{boxForm.mode === 'edit' ? '박스 저장' : '박스 생성'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: Radio Button Group Builder Modal                           */}
      {/* =================================================================== */}
      {showRadioGroupModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold">
                  라디오 버튼 그룹 추가 (Radio Button Group)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowRadioGroupModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRadioGroupSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    그룹 ID (최대 4자) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={radioGroupForm.groupId}
                    onChange={(e) =>
                      setRadioGroupForm({
                        ...radioGroupForm,
                        groupId: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 4),
                      })
                    }
                    placeholder="R1"
                    className="w-full bg-indigo-50 border border-indigo-300 rounded px-2.5 py-1.5 font-mono font-bold uppercase text-indigo-950 focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    소속 박스 (Box Title)
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={radioGroupForm.boxMode}
                      onChange={(e) =>
                        setRadioGroupForm({
                          ...radioGroupForm,
                          boxMode: e.target.value as 'existing' | 'new' | 'none',
                        })
                      }
                      className="bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-800 cursor-pointer"
                    >
                      <option value="new">새 박스 타이틀</option>
                      {existingBoxes.length > 0 && <option value="existing">기존 박스 선택</option>}
                      <option value="none">박스 없음</option>
                    </select>

                    {radioGroupForm.boxMode === 'new' && (
                      <input
                        type="text"
                        value={radioGroupForm.newBoxTitle}
                        onChange={(e) =>
                          setRadioGroupForm({ ...radioGroupForm, newBoxTitle: e.target.value })
                        }
                        placeholder="예: 처리 옵션"
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:bg-white focus:border-blue-500"
                      />
                    )}
                    {radioGroupForm.boxMode === 'existing' && (
                      <select
                        value={radioGroupForm.existingBoxId}
                        onChange={(e) =>
                          setRadioGroupForm({ ...radioGroupForm, existingBoxId: e.target.value })
                        }
                        className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-800 cursor-pointer"
                      >
                        {existingBoxes.map((b) => (
                          <option key={b.blockId} value={b.blockId}>
                            {b.blockTitle} ({b.blockId})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Radio Options Builder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700">
                    라디오 버튼 항목 (기본값 1개 선택)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = radioGroupForm.options.length + 1;
                      setRadioGroupForm({
                        ...radioGroupForm,
                        options: [
                          ...radioGroupForm.options,
                          { name: `P_${radioGroupForm.groupId || 'R'}${nextIdx}`, text: `옵션 ${nextIdx}` },
                        ],
                      });
                    }}
                    className="px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>옵션 추가</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {radioGroupForm.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-md"
                    >
                      <label
                        className="flex items-center gap-1 cursor-pointer shrink-0"
                        title="기본 선택 ('X')"
                      >
                        <input
                          type="radio"
                          name="new_radio_default"
                          checked={radioGroupForm.defaultIndex === idx}
                          onChange={() =>
                            setRadioGroupForm({ ...radioGroupForm, defaultIndex: idx })
                          }
                          className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                        />
                        <span className="text-[10px] font-semibold text-slate-500">기본</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={opt.name}
                        onChange={(e) => {
                          const updatedOpts = radioGroupForm.options.map((o, i) =>
                            i === idx ? { ...o, name: e.target.value.toUpperCase() } : o
                          );
                          setRadioGroupForm({ ...radioGroupForm, options: updatedOpts });
                        }}
                        placeholder={`P_R${idx + 1}`}
                        className="w-28 bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold uppercase text-blue-950 focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        required
                        value={opt.text}
                        onChange={(e) => {
                          const updatedOpts = radioGroupForm.options.map((o, i) =>
                            i === idx ? { ...o, text: e.target.value } : o
                          );
                          setRadioGroupForm({ ...radioGroupForm, options: updatedOpts });
                        }}
                        placeholder="화면 표시 텍스트"
                        className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        disabled={radioGroupForm.options.length <= 2}
                        onClick={() => {
                          const filtered = radioGroupForm.options.filter((_, i) => i !== idx);
                          setRadioGroupForm({
                            ...radioGroupForm,
                            options: filtered,
                            defaultIndex:
                              radioGroupForm.defaultIndex >= filtered.length
                                ? 0
                                : radioGroupForm.defaultIndex,
                          });
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                        title="옵션 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRadioGroupModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>라디오 그룹 추가</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* Spreadsheet Quick Actions Toolbar                                   */}
      {/* =================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenAdd('PARAMETER')}
            title="+ Add PARAM (Parameters - Single Value)"
            aria-label="Add PARAM"
            className="p-1.5 text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-amber-600" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd('SELECT_OPTION')}
            title="+ Add S-OPT (Select-Options - Range Selection)"
            aria-label="Add S-OPT"
            className="p-1.5 text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-md transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
          >
            <Sliders className="w-4 h-4 text-blue-600" />
          </button>
          <button
            type="button"
            onClick={handleOpenRadioGroupModal}
            title="Add Radio Button Group"
            aria-label="Add Radio Button Group"
            className="p-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-md transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
          >
            <CircleDot className="w-4 h-4 text-indigo-600" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenBoxModal()}
            title="Group into Box"
            aria-label="Group into Box"
            className="p-1.5 text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-md transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
          >
            <Box className="w-4 h-4 text-sky-600" />
          </button>
          <button
            type="button"
            onClick={handleCopyTable}
            disabled={spec.selection_params.length === 0}
            className="p-1.5 text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer disabled:opacity-40 flex items-center justify-center"
            title="Copy Table to Excel"
            aria-label="Copy Table to Excel"
          >
            <Copy className="w-4 h-4 text-slate-500" />
          </button>
          {onOpenAiExtract && (
            <button
              type="button"
              onClick={onOpenAiExtract}
              className="p-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-md transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
              title="AI Suggest Parameters from Logic"
              aria-label="AI Suggest Parameters from Logic"
            >
              <GitPullRequestCreate className="w-4 h-4 text-indigo-600" />
            </button>
          )}
        </div>

        {/* Spreadsheet Hint */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
            <strong>Spreadsheet Mode:</strong> Drag to select cells · Ctrl+C copy · Ctrl+V paste
          </span>
          <span className="font-bold text-slate-700 tabular-nums">
            {spec.selection_params.length} rows
          </span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* Google Sheets Styled Parameters Table with Visual Box Group Headers */}
      {/* =================================================================== */}
      <div
        onPaste={handleTablePaste}
        className="border border-slate-300 rounded-lg overflow-x-auto bg-white shadow-xs focus:outline-none select-none"
      >
        <table className="w-full text-xs text-left border-collapse font-sans">
          <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] select-none border-b border-slate-300">
            <tr>
              <th className="py-2 px-2 text-center w-9 bg-slate-200 border-r border-slate-300 text-slate-500 font-mono text-[10px]">
                fx
              </th>
              <th className="py-1.5 px-2 w-18 text-center border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">A</div>
                <div>KIND</div>
              </th>
              <th className="py-1.5 px-2 min-w-28 border-r border-slate-200 font-mono">
                <div className="text-[9px] text-slate-400 font-mono">B</div>
                <div>NAME (FIELD)</div>
              </th>
              <th className="py-1.5 px-2 min-w-40 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">C</div>
                <div>SCREEN TEXT (LABEL)</div>
              </th>
              <th className="py-1.5 px-2 w-20 text-center border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">D</div>
                <div>TYPE</div>
              </th>
              <th className="py-1.5 px-2 w-14 text-center border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">E</div>
                <div>LENGTH</div>
              </th>
              <th className="py-1.5 px-2 w-24 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">F</div>
                <div>REF TABLE</div>
              </th>
              <th className="py-1.5 px-2 w-24 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">G</div>
                <div>REF FIELD</div>
              </th>
              <th className="py-1.5 px-2 text-center w-16 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">H</div>
                <div>REQUIRED</div>
              </th>
              <th className="py-1.5 px-2 min-w-24 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">I</div>
                <div>DEFAULT</div>
              </th>
              <th className="py-1.5 px-2 min-w-36 border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">J</div>
                <div>BOX TITLE</div>
              </th>
              <th className="py-1.5 px-2 w-20 text-center border-r border-slate-200">
                <div className="text-[9px] text-slate-400 font-mono">K</div>
                <div>RADIO GRP</div>
              </th>
              <th className="py-1.5 px-2 text-center w-24">
                <div className="text-[9px] text-slate-400 font-mono">ACTIONS</div>
                <div>ORDER / DEL</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
            {spec.selection_params.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-10 text-center text-slate-400 font-sans">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <p className="font-medium">No selection parameters defined.</p>
                    <p className="text-xs text-slate-400">
                      Copy rows from Excel and paste directly with <strong>Ctrl+V</strong> (lines will be created automatically).
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              spec.selection_params.map((param, idx) => {
                const isSelectedRow =
                  selectedRange &&
                  idx >= Math.min(selectedRange.startRow, selectedRange.endRow) &&
                  idx <= Math.max(selectedRange.startRow, selectedRange.endRow);

                const prevParam = idx > 0 ? spec.selection_params[idx - 1] : null;
                const curBoxKey = param.block_id || param.block_title || '';
                const prevBoxKey = prevParam ? prevParam.block_id || prevParam.block_title || '' : '';
                const showBoxBanner = Boolean(curBoxKey) && curBoxKey !== prevBoxKey;
                const isRadioOrChk = param.kind === 'RADIOBUTTON' || param.kind === 'CHECKBOX';

                return (
                  <React.Fragment key={param.id}>
                    {showBoxBanner && (
                      <tr className="bg-sky-50/90 border-y border-sky-200 font-sans">
                        <td colSpan={13} className="px-3 py-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Box className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                              <input
                                type="text"
                                value={param.block_title || ''}
                                onChange={(e) =>
                                  handleRenameBoxTitle(
                                    param.block_id || '',
                                    param.block_title || '',
                                    e.target.value
                                  )
                                }
                                placeholder="박스 타이틀 입력..."
                                className="bg-white/80 hover:bg-white focus:bg-white border border-sky-200 focus:border-sky-500 rounded px-2 py-0.5 text-xs font-bold text-slate-900 min-w-[200px] focus:outline-none"
                              />
                              <span className="text-[10px] font-mono text-sky-700">
                                BLOCK {(param.block_id || 'b1').toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenBoxModal({
                                    blockId: param.block_id || '',
                                    blockTitle: param.block_title || '',
                                    count: 0,
                                  })
                                }
                                title="Edit Box Items"
                                aria-label="Edit Box Items"
                                className="p-1.5 text-sky-800 bg-white hover:bg-sky-100 border border-sky-200 rounded flex items-center justify-center cursor-pointer transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUngroupBox(param.block_id || '', param.block_title || '')
                                }
                                title="Ungroup Box"
                                aria-label="Ungroup Box"
                                className="p-1.5 text-slate-600 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded flex items-center justify-center cursor-pointer transition-colors"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    <tr className="hover:bg-blue-50/30 transition-colors">
                      {/* Row index header */}
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

                      {/* Col A: Kind */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 0)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 0)}
                        className={`p-0 border-r border-slate-200 text-center ${
                          isCellInRange(selectedRange, idx, 0) ? 'bg-blue-100 ring-1 ring-blue-500' : ''
                        }`}
                      >
                        <select
                          value={param.kind}
                          onChange={(e) => {
                            const nextKind = e.target.value as SelectionKind;
                            const patch: Partial<SelectionParameter> = { kind: nextKind };
                            if (nextKind === 'RADIOBUTTON') {
                              patch.datatype = 'CHAR';
                              patch.length = 1;
                              patch.obligatory = false;
                              if (!param.radio_group) {
                                patch.radio_group = existingRadioGroups[0] || 'R1';
                              }
                            } else if (nextKind === 'CHECKBOX') {
                              patch.datatype = 'CHAR';
                              patch.length = 1;
                              patch.obligatory = false;
                              patch.radio_group = undefined;
                            } else {
                              patch.radio_group = undefined;
                            }
                            handleUpdate(param.id, patch);
                          }}
                          data-cell={`${idx}-kind`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'kind')}
                          className={`w-full h-8 px-1 text-center font-bold text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer ${
                            param.kind === 'PARAMETER'
                              ? 'bg-amber-50 text-amber-900'
                              : param.kind === 'RADIOBUTTON'
                              ? 'bg-indigo-50 text-indigo-900'
                              : param.kind === 'CHECKBOX'
                              ? 'bg-emerald-50 text-emerald-900'
                              : 'bg-blue-50 text-blue-900'
                          }`}
                        >
                          <option value="PARAMETER">PARAM</option>
                          <option value="SELECT_OPTION">S-OPT</option>
                          <option value="RADIOBUTTON">RADIO</option>
                          <option value="CHECKBOX">CHK</option>
                        </select>
                      </td>

                      {/* Col B: Name (Field) */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 1)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 1)}
                        className={`p-0 border-r border-slate-200 ${
                          isCellInRange(selectedRange, idx, 1) ? 'bg-blue-100 ring-1 ring-blue-500' : ''
                        }`}
                      >
                        <input
                          type="text"
                          value={param.name}
                          data-cell={`${idx}-name`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'name')}
                          onChange={(e) => handleUpdate(param.id, { name: e.target.value })}
                          onBlur={(e) =>
                            handleUpdate(param.id, { name: e.target.value.trim().toUpperCase() })
                          }
                          className="w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase font-mono font-bold text-blue-950"
                        />
                      </td>

                      {/* Col C: Screen Text (Label) */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 2)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 2)}
                        className={`p-0 border-r border-slate-200 font-sans ${
                          isCellInRange(selectedRange, idx, 2) ? 'bg-blue-100 ring-1 ring-blue-500' : ''
                        }`}
                      >
                        <input
                          type="text"
                          value={param.text}
                          data-cell={`${idx}-text`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'text')}
                          onChange={(e) => handleUpdate(param.id, { text: e.target.value })}
                          className="w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-800"
                        />
                      </td>

                      {/* Col D: Data Type */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 3)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 3)}
                        className={`p-0 border-r border-slate-200 text-center ${
                          isCellInRange(selectedRange, idx, 3) ? 'bg-blue-100 ring-1 ring-blue-500' : ''
                        }`}
                      >
                        <select
                          value={param.datatype || 'CHAR'}
                          disabled={isRadioOrChk}
                          data-cell={`${idx}-datatype`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 3, endRow: idx, endCol: 3 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'datatype')}
                          onChange={(e) =>
                            handleUpdate(param.id, { datatype: e.target.value as SapDataType })
                          }
                          className="w-full h-8 px-1 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[11px] text-slate-800 text-center cursor-pointer disabled:text-slate-400 disabled:cursor-default"
                        >
                          {SAP_DATA_TYPES.map((dt) => (
                            <option key={dt.type} value={dt.type}>
                              {dt.type}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Col E: Length */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 4)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 4)}
                        className={`p-0 border-r border-slate-200 text-center ${
                          isCellInRange(selectedRange, idx, 4) ? 'bg-blue-100 ring-1 ring-blue-500' : ''
                        }`}
                      >
                        <input
                          type="number"
                          min={1}
                          max={255}
                          disabled={isRadioOrChk}
                          value={param.length || 10}
                          data-cell={`${idx}-length`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 4, endRow: idx, endCol: 4 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'length')}
                          onChange={(e) =>
                            handleUpdate(param.id, {
                              length: Math.max(1, parseInt(e.target.value) || 1),
                            })
                          }
                          className="w-full h-8 px-1 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[11px] text-center disabled:text-slate-400"
                        />
                      </td>

                      {/* Col F: Ref Table */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 5)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 5)}
                        className={`p-0 border-r border-slate-200 relative ${
                          isCellInRange(selectedRange, idx, 5) ? 'bg-blue-100 ring-1 ring-blue-500' : ''
                        }`}
                      >
                        {isRadioOrChk ? (
                          <div className="h-8 flex items-center justify-center text-slate-300">-</div>
                        ) : (
                          <div className="flex items-center h-8">
                            <input
                              type="text"
                              value={param.ref_table || ''}
                              data-cell={`${idx}-ref_table`}
                              onFocus={() => {
                                if (!selectedRange) {
                                  setSelectedRange({ startRow: idx, startCol: 5, endRow: idx, endCol: 5 });
                                }
                              }}
                              onKeyDown={(e) => handleCellKeyDown(e, idx, 'ref_table')}
                              onChange={(e) =>
                                handleUpdate(param.id, { ref_table: e.target.value.toUpperCase() })
                              }
                              placeholder="VBAK"
                              className="w-full h-full px-2 pr-6 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase text-slate-800"
                            />
                            <button
                              type="button"
                              onClick={() => setSearchHelpTarget({ type: 'row', paramId: param.id })}
                              title="SAP Search Help (F4)"
                              className="absolute right-1 text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                            >
                              <Search className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Col G: Ref Field */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 6)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 6)}
                        className={`p-0 border-r border-slate-200 ${
                          isCellInRange(selectedRange, idx, 6) ? 'bg-blue-100 ring-1 ring-blue-500' : ''
                        }`}
                      >
                        {isRadioOrChk ? (
                          <div className="h-8 flex items-center justify-center text-slate-300">-</div>
                        ) : (
                          <input
                            type="text"
                            value={param.ref_field || ''}
                            data-cell={`${idx}-ref_field`}
                            onFocus={() => {
                              if (!selectedRange) {
                                setSelectedRange({ startRow: idx, startCol: 6, endRow: idx, endCol: 6 });
                              }
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'ref_field')}
                            onChange={(e) =>
                              handleUpdate(param.id, { ref_field: e.target.value.toUpperCase() })
                            }
                            placeholder="VBELN"
                            className="w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase text-slate-800"
                          />
                        )}
                      </td>

                      {/* Col H: Obligatory */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 7)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 7)}
                        className={`p-0 border-r border-slate-200 text-center ${
                          isCellInRange(selectedRange, idx, 7) ? 'bg-blue-100 ring-1 ring-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center h-8">
                          {isRadioOrChk ? (
                            <span className="text-slate-300">-</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={param.obligatory}
                              data-cell={`${idx}-obligatory`}
                              onChange={(e) => handleUpdate(param.id, { obligatory: e.target.checked })}
                              className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                            />
                          )}
                        </div>
                      </td>

                      {/* Col I: Default Value */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 8)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 8)}
                        className={`p-0 border-r border-slate-200 font-sans ${
                          isCellInRange(selectedRange, idx, 8) ? 'bg-blue-100 ring-1 ring-blue-500' : ''
                        }`}
                      >
                        {param.kind === 'RADIOBUTTON' ? (
                          <div className="flex items-center justify-center h-8">
                            <button
                              type="button"
                              onClick={() => handleSetRadioDefault(param)}
                              title="같은 라디오 그룹 내 기본 선택값('X') 지정"
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                param.default_val?.toUpperCase() === 'X'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700'
                              }`}
                            >
                              <CircleDot className="w-3 h-3" />
                              <span>{param.default_val?.toUpperCase() === 'X' ? 'X (기본)' : '선택'}</span>
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={param.default_val || ''}
                            data-cell={`${idx}-default_val`}
                            onFocus={() => {
                              if (!selectedRange) {
                                setSelectedRange({ startRow: idx, startCol: 8, endRow: idx, endCol: 8 });
                              }
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'default_val')}
                            onChange={(e) => handleUpdate(param.id, { default_val: e.target.value })}
                            placeholder={param.kind === 'CHECKBOX' ? 'X' : '1000'}
                            className="w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                          />
                        )}
                      </td>

                      {/* Col J: Box Title */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 9)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 9)}
                        className={`p-0 border-r border-slate-200 font-sans ${
                          isCellInRange(selectedRange, idx, 9) ? 'bg-blue-100 ring-1 ring-blue-500' : ''
                        }`}
                      >
                        <input
                          type="text"
                          list="selection-existing-boxes"
                          value={param.block_title || ''}
                          data-cell={`${idx}-block_title`}
                          onFocus={() => {
                            if (!selectedRange) {
                              setSelectedRange({ startRow: idx, startCol: 9, endRow: idx, endCol: 9 });
                            }
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'block_title')}
                          onChange={(e) => {
                            const val = e.target.value;
                            const clean = val.trim();
                            if (!clean) {
                              handleUpdate(param.id, { block_title: '', block_id: undefined });
                            } else {
                              const nextId = resolveBlockIdForTitle(clean, spec.selection_params);
                              handleUpdate(param.id, { block_title: val, block_id: nextId });
                            }
                          }}
                          placeholder="박스 타이틀 (없음)"
                          className="w-full h-8 px-2 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 text-[11px]"
                        />
                      </td>

                      {/* Col K: Radio Group */}
                      <td
                        onMouseDown={() => handleCellMouseDown(idx, 10)}
                        onMouseEnter={() => handleCellMouseEnter(idx, 10)}
                        className={`p-0 border-r border-slate-200 text-center ${
                          isCellInRange(selectedRange, idx, 10) ? 'bg-blue-100 ring-1 ring-blue-500' : ''
                        }`}
                      >
                        {param.kind === 'RADIOBUTTON' ? (
                          <input
                            type="text"
                            maxLength={4}
                            list="selection-existing-radio-groups"
                            value={param.radio_group || ''}
                            data-cell={`${idx}-radio_group`}
                            onFocus={() => {
                              if (!selectedRange) {
                                setSelectedRange({ startRow: idx, startCol: 10, endRow: idx, endCol: 10 });
                              }
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'radio_group')}
                            onChange={(e) =>
                              handleUpdate(param.id, {
                                radio_group: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 4),
                              })
                            }
                            placeholder="R1"
                            className="w-full h-8 px-1.5 bg-indigo-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono font-bold uppercase text-center text-indigo-900"
                          />
                        ) : (
                          <div className="h-8 flex items-center justify-center text-slate-300">-</div>
                        )}
                      </td>

                      {/* Col L: Order & Delete Actions */}
                      <td className="py-1 px-1 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'up')}
                            disabled={idx === 0}
                            title="Move Up"
                            className="p-1 text-slate-400 hover:text-blue-700 disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'down')}
                            disabled={idx === spec.selection_params.length - 1}
                            title="Move Down"
                            className="p-1 text-slate-400 hover:text-blue-700 disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(param.id)}
                            title="Delete Row"
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
