import React from 'react';
import { Layers, FileCode, FileText, SplitSquareVertical, Sparkles, Printer } from 'lucide-react';
import { ProgramSpec } from '../types/sap';
import { SAMPLE_SPECS } from '../data/sampleSpecs';
import { PREDEFINED_TEMPLATES } from '../data/predefinedTemplates';
import { getSavedUserTemplates } from '../utils/templateStorage';

export type MainWorkspaceMode = 'split' | 'mockup_only' | 'editor_only' | 'abap_code' | 'document';

interface TopNavProps {
  currentMode: MainWorkspaceMode;
  onSelectMode: (mode: MainWorkspaceMode) => void;
  currentSpec: ProgramSpec;
  onSelectTemplate: (spec: ProgramSpec) => void;
  onNewSpec: () => void;
  onTriggerPrint?: () => void;
  onOpenTemplates?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentMode,
  onSelectMode,
  currentSpec,
  onSelectTemplate,
  onNewSpec,
  onTriggerPrint,
  onOpenTemplates,
}) => {
  return (
    <header className="no-print flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-white shrink-0">
      {/* Zone 1: Brand Wordmark (Single text element) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-xs text-white shadow-md border border-blue-400/30">
          ES
        </div>
        <div className="leading-tight">
          <div className="font-extrabold text-sm tracking-tight text-white whitespace-nowrap">
            EverySpec with Josh
          </div>
          <div className="text-[10px] text-blue-300 font-medium">
            ABAP Functional Specification & CL_GUI_ALV_GRID Simulator
          </div>
        </div>
      </div>

      {/* Zone 2: Workspace View Modes (Concise single-line controls) */}
      <nav className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs">
        <button
          onClick={() => onSelectMode('split')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentMode === 'split'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <SplitSquareVertical className="w-3.5 h-3.5" />
          <span>Dual View</span>
        </button>

        <button
          onClick={() => onSelectMode('mockup_only')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentMode === 'mockup_only'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Simulate</span>
        </button>

        <button
          onClick={() => onSelectMode('editor_only')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentMode === 'editor_only'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Spec Editor</span>
        </button>

        <button
          onClick={() => onSelectMode('abap_code')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentMode === 'abap_code'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Source</span>
        </button>

        <button
          onClick={() => onSelectMode('document')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentMode === 'document'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action & Template Selector */}
      <div className="flex items-center gap-2.5 shrink-0">
        <select
          value={currentSpec.id}
          onChange={(e) => {
            const val = e.target.value;
            // 1. Check Predefined templates
            const foundPredefined = PREDEFINED_TEMPLATES.find(p => p.spec.id === val || p.id === val);
            if (foundPredefined) {
              onSelectTemplate(foundPredefined.spec);
              return;
            }
            // 2. Check Saved user templates
            const saved = getSavedUserTemplates();
            const foundSaved = saved.find(s => s.spec.id === val || s.id === val);
            if (foundSaved) {
              onSelectTemplate(foundSaved.spec);
              return;
            }
            // 3. Fallback to SAMPLE_SPECS
            const foundSample = SAMPLE_SPECS.find(s => s.id === val);
            if (foundSample) onSelectTemplate(foundSample);
          }}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer max-w-56 truncate"
        >
          <option value="" disabled>Select Program Template</option>
          <optgroup label="Predefined Architecture Blueprints">
            {PREDEFINED_TEMPLATES.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.spec.id}>
                [{tmpl.category}] {tmpl.name}
              </option>
            ))}
          </optgroup>
          {getSavedUserTemplates().length > 0 && (
            <optgroup label="My Saved Custom Templates">
              {getSavedUserTemplates().map((tmpl) => (
                <option key={tmpl.id} value={tmpl.spec.id}>
                  [Custom] {tmpl.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Templates Library Modal Button */}
        <button
          type="button"
          onClick={onOpenTemplates}
          className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs flex items-center gap-1.5 cursor-pointer"
          title="Browse, load, and save predefined SAP program templates (Header-Detail, Single-Table, OData-based)"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Templates</span>
        </button>

        <button
          onClick={onNewSpec}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 shadow-xs flex items-center gap-1 cursor-pointer"
        >
          <span>+ New</span>
        </button>
      </div>
    </header>
  );
};
