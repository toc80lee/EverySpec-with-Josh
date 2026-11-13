import React, { useState, useEffect } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { AlvField } from '../types/sap';
import {
  AlvLayoutConfigState,
  AlvLayoutVariant,
  deleteAlvLayoutVariant,
  getAlvLayoutVariants,
  saveAlvLayoutVariant,
} from '../utils/sapSimulatorHelpers';

interface SapAlvLayoutModalProps {
  isOpen: boolean;
  programId: string;
  fieldCatalog: AlvField[];
  currentConfig: AlvLayoutConfigState;
  onClose: () => void;
  onApplyConfig: (config: AlvLayoutConfigState, variantName?: string) => void;
}

export const SapAlvLayoutModal: React.FC<SapAlvLayoutModalProps> = ({
  isOpen,
  programId,
  fieldCatalog,
  currentConfig,
  onClose,
  onApplyConfig,
}) => {
  const [visibleFields, setVisibleFields] = useState<string[]>(currentConfig.visibleFields);
  const [subtotalField, setSubtotalField] = useState<string | null>(currentConfig.subtotalField);
  const [zebra, setZebra] = useState(currentConfig.zebra);
  const [cwidthOpt, setCwidthOpt] = useState(currentConfig.cwidth_opt);
  const [noHgrid, setNoHgrid] = useState(currentConfig.no_hgridln);
  const [noVgrid, setNoVgrid] = useState(currentConfig.no_vgridln);

  const [selectedShown, setSelectedShown] = useState<string | null>(null);
  const [selectedHidden, setSelectedHidden] = useState<string | null>(null);

  const [variants, setVariants] = useState<AlvLayoutVariant[]>([]);
  const [variantNameInput, setVariantNameInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setVisibleFields(currentConfig.visibleFields);
      setSubtotalField(currentConfig.subtotalField);
      setZebra(currentConfig.zebra);
      setCwidthOpt(currentConfig.cwidth_opt);
      setNoHgrid(currentConfig.no_hgridln);
      setNoVgrid(currentConfig.no_vgridln);
      setVariants(getAlvLayoutVariants(programId));
      setSelectedShown(null);
      setSelectedHidden(null);
    }
  }, [isOpen, programId, currentConfig]);

  if (!isOpen) return null;

  const allFieldNames = fieldCatalog.map((f) => f.fieldname);
  const hiddenFields = allFieldNames.filter((fn) => !visibleFields.includes(fn));
  const getFieldLabel = (fn: string) => {
    const f = fieldCatalog.find((c) => c.fieldname === fn);
    return f ? `${f.coltext || fn} (${fn})` : fn;
  };

  const handleHideSelected = () => {
    if (!selectedShown || visibleFields.length <= 1) return;
    setVisibleFields((prev) => prev.filter((fn) => fn !== selectedShown));
    setSelectedHidden(selectedShown);
    setSelectedShown(null);
  };

  const handleShowSelected = () => {
    if (!selectedHidden) return;
    setVisibleFields((prev) => [...prev, selectedHidden]);
    setSelectedShown(selectedHidden);
    setSelectedHidden(null);
  };

  const handleMoveShown = (dir: -1 | 1) => {
    if (!selectedShown) return;
    const idx = visibleFields.indexOf(selectedShown);
    if (idx === -1) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= visibleFields.length) return;
    const copy = [...visibleFields];
    const [removed] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, removed);
    setVisibleFields(copy);
  };

  const buildConfig = (): AlvLayoutConfigState => ({
    visibleFields,
    subtotalField,
    zebra,
    cwidth_opt: cwidthOpt,
    no_hgridln: noHgrid,
    no_vgridln: noVgrid,
  });

  const handleSaveVariant = () => {
    const cleanName = (variantNameInput.trim() || '/CUSTOM_01').toUpperCase();
    const formattedName = cleanName.startsWith('/') ? cleanName : `/${cleanName}`;
    const saved: AlvLayoutVariant = {
      id: `alv-var-${Date.now()}`,
      name: formattedName,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      config: buildConfig(),
    };
    const next = saveAlvLayoutVariant(programId, saved);
    setVariants(next);
    setVariantNameInput('');
    onApplyConfig(saved.config, saved.name);
    onClose();
  };

  const handleResetStandard = () => {
    const std: AlvLayoutConfigState = {
      visibleFields: allFieldNames,
      subtotalField: null,
      zebra: true,
      cwidth_opt: true,
      no_hgridln: false,
      no_vgridln: false,
    };
    onApplyConfig(std, '/STANDARD');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded border border-slate-400 bg-[#ECE9D8] shadow-2xl text-slate-800 text-xs font-sans overflow-hidden">
        {/* SAP GUI Dialog Titlebar */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#2B547E] to-[#4863A0] px-3 py-1.5 text-white font-medium">
          <div className="flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5 text-sky-200" />
            <span>Change Layout &amp; Manage Variants ({programId})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Dual Column Set Picker */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
            {/* Displayed Columns */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800">
                  Displayed Columns ({visibleFields.length})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveShown(-1)}
                    disabled={!selectedShown}
                    title="Move Column Up"
                    className="p-0.5 bg-white border border-slate-400 hover:bg-blue-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveShown(1)}
                    disabled={!selectedShown}
                    title="Move Column Down"
                    className="p-0.5 bg-white border border-slate-400 hover:bg-blue-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="border border-slate-400 bg-white h-44 overflow-y-auto divide-y divide-slate-100">
                {visibleFields.map((fn, idx) => (
                  <div
                    key={fn}
                    onClick={() => {
                      setSelectedShown(fn);
                      setSelectedHidden(null);
                    }}
                    className={`px-2 py-1 cursor-pointer flex items-center justify-between ${
                      selectedShown === fn ? 'bg-[#fff5cc] font-bold' : 'hover:bg-[#ebf3fb]'
                    }`}
                  >
                    <span className="truncate">{getFieldLabel(fn)}</span>
                    <span className="text-[10px] font-mono text-slate-400 ml-1">{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transfer Buttons */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleHideSelected}
                disabled={!selectedShown || visibleFields.length <= 1}
                title="Hide Selected Column"
                className="p-1.5 bg-[#F4F2E6] border border-slate-400 hover:bg-white disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleShowSelected}
                disabled={!selectedHidden}
                title="Show Selected Column"
                className="p-1.5 bg-[#F4F2E6] border border-slate-400 hover:bg-white disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden Columns */}
            <div>
              <div className="mb-1 font-bold text-slate-800">
                Hidden Column Set ({hiddenFields.length})
              </div>
              <div className="border border-slate-400 bg-white h-44 overflow-y-auto divide-y divide-slate-100">
                {hiddenFields.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-[11px]">
                    All columns visible
                  </div>
                ) : (
                  hiddenFields.map((fn) => (
                    <div
                      key={fn}
                      onClick={() => {
                        setSelectedHidden(fn);
                        setSelectedShown(null);
                      }}
                      className={`px-2 py-1 cursor-pointer truncate ${
                        selectedHidden === fn ? 'bg-[#fff5cc] font-bold' : 'hover:bg-[#ebf3fb]'
                      }`}
                    >
                      {getFieldLabel(fn)}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Subtotal Break & Display Toggles */}
          <div className="grid grid-cols-2 gap-4 bg-white border border-slate-300 p-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Subtotal Break Column (&amp;SUBTOTAL)
              </label>
              <select
                value={subtotalField || ''}
                onChange={(e) => setSubtotalField(e.target.value || null)}
                className="w-full bg-white border border-slate-400 px-2 py-1 text-xs"
              >
                <option value="">None (Grand Total Only)</option>
                {fieldCatalog
                  .filter((f) => !f.do_sum && !f.checkbox && f.fieldname !== 'ZICON' && f.fieldname !== 'LIGHTS')
                  .map((f) => (
                    <option key={f.fieldname} value={f.fieldname}>
                      {f.coltext} ({f.fieldname})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={zebra}
                  onChange={(e) => setZebra(e.target.checked)}
                  className="accent-blue-700"
                />
                <span>Zebra Striping</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cwidthOpt}
                  onChange={(e) => setCwidthOpt(e.target.checked)}
                  className="accent-blue-700"
                />
                <span>Optimize Width</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noHgrid}
                  onChange={(e) => setNoHgrid(e.target.checked)}
                  className="accent-blue-700"
                />
                <span>No Horiz. Grid</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noVgrid}
                  onChange={(e) => setNoVgrid(e.target.checked)}
                  className="accent-blue-700"
                />
                <span>No Vert. Grid</span>
              </label>
            </div>
          </div>

          {/* Save & Load Layout Variants */}
          <div className="bg-white border border-slate-300 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-800">Layout Variants</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={variantNameInput}
                  onChange={(e) => setVariantNameInput(e.target.value)}
                  placeholder="/Z_EXEC_VIEW"
                  className="w-36 bg-white border border-slate-400 px-2 py-0.5 text-xs font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={handleSaveVariant}
                  className="px-2.5 py-0.5 bg-[#F4F2E6] border border-slate-400 hover:bg-blue-50 text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3 h-3 text-blue-700" />
                  Save Variant
                </button>
              </div>
            </div>

            {variants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {variants.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center border border-slate-300 bg-[#f8fafc] text-[11px]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onApplyConfig(v.config, v.name);
                        onClose();
                      }}
                      className="px-2 py-0.5 hover:bg-blue-50 font-mono font-semibold text-blue-800 cursor-pointer"
                      title={`Load layout ${v.name} (saved ${v.updatedAt})`}
                    >
                      {v.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVariants(deleteAlvLayoutVariant(programId, v.id))}
                      className="px-1 py-0.5 text-slate-400 hover:text-red-600 border-l border-slate-300 cursor-pointer"
                      title="Delete variant"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-300 bg-[#E3E1D4] px-3 py-2">
          <button
            type="button"
            onClick={handleResetStandard}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-700 bg-[#F4F2E6] border border-slate-400 hover:bg-white cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to /STANDARD
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onApplyConfig(buildConfig());
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-white bg-[#2B547E] border border-[#1A385C] hover:bg-[#1E3F66] cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Layout
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-[11px] text-slate-700 bg-[#ECE9D8] border border-slate-400 hover:bg-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
