import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  X,
  Search,
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  Eye,
  Bookmark,
  FileCode,
  Tag,
  ArrowRight,
  Sparkles,
  Info,
  Server,
  Database,
  Sliders,
} from 'lucide-react';
import {
  ProgramSpec,
  PredefinedTemplate,
  SavedUserTemplate,
  TemplateCategory,
} from '../types/sap';
import { PREDEFINED_TEMPLATES } from '../data/predefinedTemplates';
import {
  getSavedUserTemplates,
  saveSpecAsUserTemplate,
  deleteUserTemplate,
  exportTemplatesAsJson,
  importTemplateFromJson,
} from '../utils/templateStorage';

interface ProgramTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSpec: ProgramSpec;
  onSelectTemplate: (spec: ProgramSpec) => void;
}

export const ProgramTemplateModal: React.FC<ProgramTemplateModalProps> = ({
  isOpen,
  onClose,
  currentSpec,
  onSelectTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<'predefined' | 'saved' | 'save_current'>('predefined');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedTemplates, setSavedTemplates] = useState<SavedUserTemplate[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<PredefinedTemplate | SavedUserTemplate | null>(null);

  // Form state for saving current spec as new template
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<TemplateCategory>('Single-Table');
  const [newTemplateDesc, setNewTemplateDesc] = useState<string>('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Load saved user templates on mount and when modal opens
  useEffect(() => {
    if (isOpen) {
      setSavedTemplates(getSavedUserTemplates());
      // Pre-fill save form
      setNewTemplateName(`${currentSpec.program_id} - ${currentSpec.title}`);
      setNewTemplateCategory(
        currentSpec.sample_type === '02' || !!currentSpec.item_grid
          ? 'Header-Detail'
          : currentSpec.sample_type === '04'
          ? 'OData-based'
          : 'Single-Table'
      );
      setNewTemplateDesc(currentSpec.business_purpose || '');
      setSaveSuccessNotice(null);
    }
  }, [isOpen, currentSpec]);

  // Filter predefined templates
  const filteredPredefined = useMemo(() => {
    return PREDEFINED_TEMPLATES.filter((tmpl) => {
      const matchCat = selectedCategory === 'ALL' || tmpl.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        tmpl.name.toLowerCase().includes(q) ||
        tmpl.description.toLowerCase().includes(q) ||
        tmpl.module.toLowerCase().includes(q) ||
        tmpl.spec.program_id.toLowerCase().includes(q) ||
        tmpl.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  // Filter saved user templates
  const filteredSaved = useMemo(() => {
    return savedTemplates.filter((tmpl) => {
      const matchCat = selectedCategory === 'ALL' || tmpl.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        tmpl.name.toLowerCase().includes(q) ||
        tmpl.description.toLowerCase().includes(q) ||
        tmpl.module.toLowerCase().includes(q) ||
        tmpl.spec.program_id.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [savedTemplates, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  // Handle Save Spec
  const handleSaveCurrentSpec = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const saved = saveSpecAsUserTemplate(
      newTemplateName,
      newTemplateCategory,
      newTemplateDesc,
      currentSpec
    );

    setSavedTemplates(getSavedUserTemplates());
    setSaveSuccessNotice(`Template "${saved.name}" successfully saved!`);
    setTimeout(() => {
      setActiveTab('saved');
      setSaveSuccessNotice(null);
    }, 1200);
  };

  // Handle Delete Template
  const handleDeleteSavedTemplate = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete template "${name}"?`)) {
      const updated = deleteUserTemplate(id);
      setSavedTemplates(updated);
      if (previewTemplate?.id === id) {
        setPreviewTemplate(null);
      }
    }
  };

  // Handle Import Template JSON file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const imported = importTemplateFromJson(content);
      if (imported) {
        setSavedTemplates(getSavedUserTemplates());
        setActiveTab('saved');
        setSaveSuccessNotice(`Successfully imported template: ${imported.name}`);
        setTimeout(() => setSaveSuccessNotice(null), 3000);
      } else {
        alert('Invalid template JSON file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Category Badge Helper
  const renderCategoryBadge = (category: TemplateCategory) => {
    switch (category) {
      case 'Header-Detail':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
            Header-Detail
          </span>
        );
      case 'Single-Table':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
            Single-Table
          </span>
        );
      case 'OData-based':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
            OData-based
          </span>
        );
      case 'Interface / Batch':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
            Interface / Batch
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            Custom
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  SAP Program Template Library
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Predefined & Custom
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Load predefined SAP program blueprints (Header-Detail, Single-Table, OData-based, Interface) or save your own specifications as templates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('predefined')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'predefined'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Predefined Blueprints</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-bold">
                {PREDEFINED_TEMPLATES.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-600" />
              <span>My Saved Templates</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                {savedTemplates.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('save_current')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'save_current'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-blue-700 bg-white/70'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Current Spec as Template</span>
            </button>
          </div>

          {/* Import / Export Actions */}
          <div className="flex items-center gap-2">
            <label
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Import specification JSON file as template"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Import JSON</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
              />
            </label>

            <button
              type="button"
              onClick={() => exportTemplatesAsJson([...PREDEFINED_TEMPLATES, ...savedTemplates])}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Export all templates as a backup JSON file"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export All</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar (Visible on Predefined & Saved tabs) */}
        {activeTab !== 'save_current' && (
          <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
              {[
                { id: 'ALL', label: 'All Architecture Types' },
                { id: 'Single-Table', label: 'Single-Table' },
                { id: 'Header-Detail', label: 'Header-Detail' },
                { id: 'OData-based', label: 'OData-based' },
                { id: 'Interface / Batch', label: 'Interface / Batch' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Live Search */}
            <div className="relative min-w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates by title, code, module..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Main Body Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {/* TAB 1: Predefined Templates */}
          {activeTab === 'predefined' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPredefined.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Card Top Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {renderCategoryBadge(tmpl.category)}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {tmpl.module} MODULE
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {tmpl.spec.program_id}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors mb-1.5">
                        {tmpl.name}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                        {tmpl.description}
                      </p>

                      {/* Architectural Metrics Badges */}
                      <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 mb-3 font-mono">
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase">Params</span>
                          <span className="font-bold text-slate-800">
                            {tmpl.spec.selection_params.length} items
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase">Field Cat</span>
                          <span className="font-bold text-slate-800">
                            {tmpl.spec.field_catalog.length} fields
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase">Target</span>
                          <span className="font-bold text-blue-900 truncate block">
                            {tmpl.spec.item_grid ? 'Dual Grid' : 'Single Grid'}
                          </span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {tmpl.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setPreviewTemplate(tmpl)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Preview Spec</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectTemplate(tmpl.spec);
                          onClose();
                        }}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Load Template</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: My Saved Templates */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              {filteredSaved.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
                  <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    No custom templates saved yet
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Save your current specification as a template or import an existing JSON blueprint to reuse it in future projects.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('save_current')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save Current Spec as Template</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSaved.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="bg-white rounded-xl border border-slate-200 hover:border-amber-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {renderCategoryBadge(tmpl.category)}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {tmpl.module} MODULE
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(tmpl.savedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors mb-1.5">
                          {tmpl.name}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                          {tmpl.description}
                        </p>

                        {/* Metrics */}
                        <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 mb-3 font-mono">
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase">Program ID</span>
                            <span className="font-bold text-slate-800 truncate block">
                              {tmpl.spec.program_id}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase">Field Cat</span>
                            <span className="font-bold text-slate-800">
                              {tmpl.spec.field_catalog.length} fields
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 uppercase">Type</span>
                            <span className="font-bold text-slate-800">
                              {tmpl.spec.item_grid ? 'Dual ALV' : 'Single ALV'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewTemplate(tmpl)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => exportTemplatesAsJson([tmpl], `${tmpl.spec.program_id}_TEMPLATE.json`)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Export as JSON file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSavedTemplate(tmpl.id, tmpl.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Delete template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectTemplate(tmpl.spec);
                            onClose();
                          }}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Load Template</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Save Current Specification as Template */}
          {activeTab === 'save_current' && (
            <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Bookmark className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Save Current Workspace as Template
                  </h4>
                  <p className="text-xs text-slate-500">
                    Create a reusable blueprint from your active specification (selection parameters, field catalogs, layout, mock test data).
                  </p>
                </div>
              </div>

              {saveSuccessNotice && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>{saveSuccessNotice}</span>
                </div>
              )}

              <form onSubmit={handleSaveCurrentSpec} className="space-y-4 text-xs">
                {/* Template Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g. Sales Order Header-Item Monitoring Report"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Architecture Category */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Architecture Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newTemplateCategory}
                    onChange={(e) => setNewTemplateCategory(e.target.value as TemplateCategory)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Single-Table">Single-Table (Standard ALV Grid)</option>
                    <option value="Header-Detail">Header-Detail (Master-Detail Dual ALV Grids)</option>
                    <option value="OData-based">OData-based (SAP Gateway & RAP Service)</option>
                    <option value="Interface / Batch">Interface / Batch (Mass Upload & BAPI Execution)</option>
                    <option value="Custom">Custom Architecture</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Description & Architectural Purpose
                  </label>
                  <textarea
                    rows={3}
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    placeholder="Briefly describe the business purpose, tables, and target release..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Snapshot Summary of Current Specification */}
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-2">
                    Current Specification Snapshot
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">PROGRAM ID</span>
                      <span className="font-bold text-blue-900">{currentSpec.program_id}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">MODULE</span>
                      <span className="font-bold text-slate-800">{currentSpec.module}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">SELECTION PARAMS</span>
                      <span className="font-bold text-slate-800">{currentSpec.selection_params.length} items</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">FIELD CATALOG</span>
                      <span className="font-bold text-slate-800">
                        {currentSpec.field_catalog.length} fields {currentSpec.item_grid ? `(+${currentSpec.item_grid.field_catalog.length} items)` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('predefined')}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>Save Template</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Templates include selection screen definitions, field catalog attributes, ALV layout modes, and mock test scenarios.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Quick Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold text-white">
                  Template Preview: {previewTemplate.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 font-mono font-bold text-blue-900">
                    <span>{previewTemplate.spec.program_id}</span>
                    <span>|</span>
                    <span>{previewTemplate.spec.tcode}</span>
                  </div>
                  {renderCategoryBadge(previewTemplate.category)}
                </div>
                <p className="text-slate-600 mt-1">{previewTemplate.description}</p>
              </div>

              {/* Selection Parameters */}
              <div>
                <h5 className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Selection Parameters ({previewTemplate.spec.selection_params.length})</span>
                </h5>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="p-2">Kind</th>
                        <th className="p-2">Field Name</th>
                        <th className="p-2">Label</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Ref Table</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] font-mono">
                      {previewTemplate.spec.selection_params.map((p) => (
                        <tr key={p.id}>
                          <td className="p-2 font-bold text-slate-700">{p.kind}</td>
                          <td className="p-2 font-bold text-blue-900">{p.name}</td>
                          <td className="p-2 font-sans">{p.text}</td>
                          <td className="p-2">{p.datatype}({p.length})</td>
                          <td className="p-2 text-slate-500">{p.ref_table || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Field Catalog */}
              <div>
                <h5 className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  <span>Field Catalog ({previewTemplate.spec.field_catalog.length} fields)</span>
                </h5>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] text-slate-600 font-bold uppercase sticky top-0">
                      <tr>
                        <th className="p-2">POS</th>
                        <th className="p-2">Fieldname</th>
                        <th className="p-2">Column Text</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Key</th>
                        <th className="p-2">Hotspot</th>
                        <th className="p-2">Sum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] font-mono">
                      {previewTemplate.spec.field_catalog.map((f) => (
                        <tr key={f.id || f.fieldname}>
                          <td className="p-2 text-slate-400">{f.col_pos}</td>
                          <td className="p-2 font-bold text-blue-900">{f.fieldname}</td>
                          <td className="p-2 font-sans">{f.coltext}</td>
                          <td className="p-2">{f.datatype}({f.outputlen})</td>
                          <td className="p-2">{f.key ? '✓' : '-'}</td>
                          <td className="p-2">{f.hotspot ? '✓' : '-'}</td>
                          <td className="p-2">{f.do_sum ? 'Σ' : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Master-Detail Note */}
              {previewTemplate.spec.item_grid && (
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span className="text-[11px]">
                    Includes synchronized Item ALV Grid ({previewTemplate.spec.item_grid.field_catalog.length} item fields linked by foreign key <strong>{previewTemplate.spec.item_grid.foreign_key || 'VBELN'}</strong>).
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded font-semibold cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTemplate(previewTemplate.spec);
                  setPreviewTemplate(null);
                  onClose();
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Load This Template</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
