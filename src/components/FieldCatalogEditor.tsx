import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Database,
  Sparkles,
  Link,
  DollarSign,
  CheckSquare,
  Key,
} from 'lucide-react';
import { AlvField, ProgramSpec, SapDataType, TextAlignment } from '../types/sap';
import { SAP_DICTIONARY_PRESETS, presetToAlvField } from '../data/sapDictionary';

interface FieldCatalogEditorProps {
  spec: ProgramSpec;
  onChange: (updatedCatalog: AlvField[], updatedMockRows?: Record<string, any>[]) => void;
}

export const FieldCatalogEditor: React.FC<FieldCatalogEditorProps> = ({ spec, onChange }) => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<string>('');

  // Add custom new blank field with guaranteed stable ID
  const handleAddNewField = () => {
    const nextPos = spec.field_catalog.length + 1;
    const newField: AlvField = {
      id: `fld-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      col_pos: nextPos,
      fieldname: `FIELD_${nextPos}`,
      coltext: `항목_${nextPos}`,
      datatype: 'CHAR',
      outputlen: 12,
      just: 'L',
      key: false,
      hotspot: false,
      checkbox: false,
      edit: false,
      do_sum: false,
      emphasize: '',
    };
    const nextCatalog = [...spec.field_catalog, newField];
    onChange(nextCatalog);
  };

  // Add from SAP Dictionary preset
  const handleAddPreset = () => {
    if (!selectedPresetIndex) return;
    const preset = SAP_DICTIONARY_PRESETS[Number(selectedPresetIndex)];
    if (!preset) return;

    // Check if field already exists
    const exists = spec.field_catalog.some(f => f.fieldname === preset.field);
    const nextPos = spec.field_catalog.length + 1;
    const newField = presetToAlvField(preset, nextPos);
    if (exists) {
      newField.fieldname = `${preset.field}_${nextPos}`;
    }

    const nextCatalog = [...spec.field_catalog, newField];
    onChange(nextCatalog);
    setSelectedPresetIndex('');
  };

  // Delete field
  const handleDeleteField = (index: number) => {
    const nextCatalog = spec.field_catalog
      .filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, col_pos: i + 1 }));
    onChange(nextCatalog);
  };

  // Move Up / Down
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= spec.field_catalog.length) return;

    const list = [...spec.field_catalog];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const renumbered = list.map((f, i) => ({ ...f, col_pos: i + 1 }));
    onChange(renumbered);
  };

  // Update single field property with stable in-place mutation
  const handleUpdateField = (index: number, patch: Partial<AlvField>) => {
    const nextCatalog = spec.field_catalog.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(nextCatalog);
  };

  // Generate realistic mock data rows based on current fields
  const handleGenerateMockData = () => {
    const newRows: Record<string, any>[] = [];
    const count = 5;

    for (let i = 0; i < count; i++) {
      const row: Record<string, any> = {};
      spec.field_catalog.forEach(f => {
        const fname = f.fieldname;
        if (f.icon_type === 'DOC' || fname === 'STATUS') {
          row[fname] = i === 0 ? 'DOC' : '';
        } else if (f.icon_type === 'FOLDER' || fname === 'NODE') {
          row[fname] = 'FOLDER';
        } else if (fname === 'SET_NAME') {
          row[fname] = i === 0 ? 'ADMVVALL' : 'ADMVV500';
        } else if (fname === 'TEXT') {
          row[fname] = i === 0 ? '관리' : i === 1 ? '관리_인건비' : '';
        } else if (fname === 'LINE') {
          row[fname] = i === 1 ? 1 : 0;
        } else if (fname === 'PARENT_SET') {
          row[fname] = i === 1 ? 'ADMVVALL' : '';
        } else if (fname === 'START_VAL') {
          row[fname] = i >= 2 ? 'AAA' : '';
        } else if (fname === 'END_VAL') {
          row[fname] = i === 2 ? '0063051099' : i === 3 ? '0063052099' : i === 4 ? '0082422500' : '';
        } else if (fname === 'CHECKBOX') {
          row[fname] = false;
        } else if (fname === 'LIGHTS') {
          row[fname] = String((i % 3) + 1);
        } else if (f.datatype === 'CURR') {
          row[fname] = (i + 1) * 12500000;
        } else if (f.datatype === 'DEC' || f.datatype === 'INT4' || f.datatype === 'NUMC') {
          row[fname] = (i + 1) * 10;
        } else if (f.datatype === 'DATS') {
          row[fname] = `2026.10.${String(10 + i * 3).padStart(2, '0')}`;
        } else {
          row[fname] = `${f.coltext}_${i + 1}`;
        }
      });
      newRows.push(row);
    }

    onChange(spec.field_catalog, newRows);
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          {/* SAP Standard Dictionary Preset Selector */}
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-blue-700 shrink-0" />
            <select
              value={selectedPresetIndex}
              onChange={(e) => setSelectedPresetIndex(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
            >
              <option value="">SAP 표준 데이터사전 필드 선택...</option>
              {SAP_DICTIONARY_PRESETS.map((p, idx) => (
                <option key={`${p.table}-${p.field}-${idx}`} value={idx}>
                  [{p.module}] {p.table}-{p.field}: {p.label} ({p.type})
                </option>
              ))}
            </select>
            <button
              onClick={handleAddPreset}
              disabled={!selectedPresetIndex}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 rounded transition-colors flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              필드 추가
            </button>
          </div>

          <button
            onClick={handleAddNewField}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            직접 항목 추가
          </button>
        </div>

        <button
          onClick={handleGenerateMockData}
          title="현재 필드 정의에 맞춰 실시간 ALV 목업 데이터를 자동 생성합니다"
          className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          목업 테스트 데이터 자동 생성
        </button>
      </div>

      {/* Field Catalog Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-2 text-center w-12">순서</th>
                <th className="py-2.5 px-2 min-w-32">필드명 (FIELDNAME)</th>
                <th className="py-2.5 px-2 min-w-36">컬럼명 (COLTEXT)</th>
                <th className="py-2.5 px-2 w-24">타입</th>
                <th className="py-2.5 px-2 w-16 text-center">길이</th>
                <th className="py-2.5 px-2 w-16 text-center">정렬</th>
                <th className="py-2.5 px-2 text-center w-12" title="Key Field (고정 열)">
                  <span className="flex items-center justify-center gap-0.5 text-blue-700">
                    <Key className="w-3 h-3" /> Key
                  </span>
                </th>
                <th className="py-2.5 px-2 text-center w-12" title="Hotspot (클릭 시 T-Code 이동)">
                  <span className="flex items-center justify-center gap-0.5 text-indigo-700">
                    <Link className="w-3 h-3" /> Link
                  </span>
                </th>
                <th className="py-2.5 px-2 text-center w-12" title="Checkbox 형태">
                  <span className="flex items-center justify-center gap-0.5 text-slate-700">
                    <CheckSquare className="w-3 h-3" /> Chk
                  </span>
                </th>
                <th className="py-2.5 px-2 text-center w-12" title="Edit (그리드 셀 직접 편집)">
                  수정
                </th>
                <th className="py-2.5 px-2 text-center w-12" title="DO_SUM (하단 합계 산출)">
                  <span className="flex items-center justify-center gap-0.5 text-emerald-700">
                    <DollarSign className="w-3 h-3" /> Σ
                  </span>
                </th>
                <th className="py-2.5 px-2 w-24">참조 테이블</th>
                <th className="py-2.5 px-2 w-24">이동 T-Code</th>
                <th className="py-2.5 px-2 text-center w-20">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {spec.field_catalog.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-400 font-sans">
                    등록된 필드가 없습니다. 위의 [SAP 표준 데이터사전 필드]를 선택하여 추가하세요.
                  </td>
                </tr>
              ) : (
                spec.field_catalog.map((field, idx) => {
                  // Stable key using field.id (fallback to index if missing)
                  const stableKey = field.id || `fld-pos-${idx}`;
                  return (
                    <tr key={stableKey} className="hover:bg-slate-50 transition-colors">
                      {/* Position */}
                      <td className="py-2 px-2 text-center text-slate-500 font-semibold">
                        {field.col_pos}
                      </td>

                      {/* Fieldname - Stable editing without unmounting */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={field.fieldname}
                          onChange={(e) =>
                            handleUpdateField(idx, { fieldname: e.target.value })
                          }
                          onBlur={(e) =>
                            handleUpdateField(idx, { fieldname: e.target.value.trim().toUpperCase() })
                          }
                          className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500 uppercase font-bold text-slate-800"
                        />
                      </td>

                      {/* Coltext - Stable editing for Korean / English */}
                      <td className="py-1.5 px-2 font-sans">
                        <input
                          type="text"
                          value={field.coltext}
                          onChange={(e) => handleUpdateField(idx, { coltext: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded focus:bg-white focus:border-blue-500 text-slate-800 font-medium"
                        />
                      </td>

                      {/* Data Type */}
                      <td className="py-1.5 px-2">
                        <select
                          value={field.datatype}
                          onChange={(e) =>
                            handleUpdateField(idx, { datatype: e.target.value as SapDataType })
                          }
                          className="w-full bg-slate-50 border border-slate-200 px-1 py-1 rounded focus:bg-white focus:border-blue-500 text-slate-700"
                        >
                          <option value="CHAR">CHAR</option>
                          <option value="NUMC">NUMC</option>
                          <option value="DATS">DATS</option>
                          <option value="TIMS">TIMS</option>
                          <option value="CURR">CURR</option>
                          <option value="DEC">DEC</option>
                          <option value="UNIT">UNIT</option>
                          <option value="INT4">INT4</option>
                        </select>
                      </td>

                      {/* Output length */}
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          value={field.outputlen}
                          onChange={(e) =>
                            handleUpdateField(idx, { outputlen: Number(e.target.value) || 10 })
                          }
                          className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 rounded focus:bg-white focus:border-blue-500 text-center"
                        />
                      </td>

                      {/* Justification */}
                      <td className="py-1.5 px-2">
                        <select
                          value={field.just}
                          onChange={(e) =>
                            handleUpdateField(idx, { just: e.target.value as TextAlignment })
                          }
                          className="w-full bg-slate-50 border border-slate-200 px-1 py-1 rounded focus:bg-white focus:border-blue-500 text-center"
                        >
                          <option value="L">좌(L)</option>
                          <option value="C">중(C)</option>
                          <option value="R">우(R)</option>
                        </select>
                      </td>

                      {/* Key */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={field.key}
                          onChange={(e) => handleUpdateField(idx, { key: e.target.checked })}
                          className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                        />
                      </td>

                      {/* Hotspot */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={field.hotspot}
                          onChange={(e) => handleUpdateField(idx, { hotspot: e.target.checked })}
                          className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                        />
                      </td>

                      {/* Checkbox */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={field.checkbox}
                          onChange={(e) => handleUpdateField(idx, { checkbox: e.target.checked })}
                          className="w-4 h-4 accent-slate-700 rounded cursor-pointer"
                        />
                      </td>

                      {/* Edit */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={field.edit}
                          onChange={(e) => handleUpdateField(idx, { edit: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                      </td>

                      {/* Do Sum */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={field.do_sum}
                          onChange={(e) => handleUpdateField(idx, { do_sum: e.target.checked })}
                          className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                        />
                      </td>

                      {/* Ref Table */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={field.ref_table || ''}
                          onChange={(e) =>
                            handleUpdateField(idx, { ref_table: e.target.value.toUpperCase() })
                          }
                          placeholder="VBAK"
                          className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 rounded focus:bg-white focus:border-blue-500 uppercase text-[10px]"
                        />
                      </td>

                      {/* Drilldown T-Code */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={field.drilldown_tcode || ''}
                          onChange={(e) =>
                            handleUpdateField(idx, { drilldown_tcode: e.target.value.toUpperCase() })
                          }
                          placeholder="VA03"
                          className="w-full bg-slate-50 border border-slate-200 px-1.5 py-1 rounded focus:bg-white focus:border-blue-500 uppercase text-[10px]"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleMove(idx, 'up')}
                            disabled={idx === 0}
                            title="위로 이동"
                            className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(idx, 'down')}
                            disabled={idx === spec.field_catalog.length - 1}
                            title="아래로 이동"
                            className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteField(idx)}
                            title="필드 삭제"
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
