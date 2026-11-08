import { PredefinedTemplate, ProgramSpec, SavedUserTemplate, TemplateCategory } from '../types/sap';
import { PREDEFINED_TEMPLATES } from '../data/predefinedTemplates';

const STORAGE_KEY = 'sap_spec_custom_templates_v1';

/**
 * Get all user saved custom templates from localStorage
 */
export const getSavedUserTemplates = (): SavedUserTemplate[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to load saved templates from localStorage', err);
    return [];
  }
};

/**
 * Save current specification as a new custom template
 */
export const saveSpecAsUserTemplate = (
  name: string,
  category: TemplateCategory,
  description: string,
  spec: ProgramSpec
): SavedUserTemplate => {
  const existing = getSavedUserTemplates();
  const newTemplate: SavedUserTemplate = {
    id: `custom-tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: name.trim() || `${spec.program_id} - ${spec.title}`,
    category,
    description: description.trim() || spec.business_purpose || 'User customized template',
    module: spec.module,
    savedAt: new Date().toISOString(),
    spec: {
      ...spec,
      id: `spec-${Date.now()}`,
    },
  };

  const updated = [newTemplate, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save template to localStorage', err);
  }

  return newTemplate;
};

/**
 * Delete a user saved custom template
 */
export const deleteUserTemplate = (id: string): SavedUserTemplate[] => {
  const existing = getSavedUserTemplates();
  const updated = existing.filter((t) => t.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete template from localStorage', err);
  }
  return updated;
};

/**
 * Export templates as a downloadable JSON file
 */
export const exportTemplatesAsJson = (
  templates: (PredefinedTemplate | SavedUserTemplate)[],
  filename = 'SAP_PROGRAM_TEMPLATES.json'
) => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(templates, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

/**
 * Import template from JSON string
 */
export const importTemplateFromJson = (jsonString: string): SavedUserTemplate | null => {
  try {
    const data = JSON.parse(jsonString);
    // If it's a ProgramSpec directly
    if (data.program_id && data.field_catalog) {
      return saveSpecAsUserTemplate(
        data.title || data.program_id,
        'Custom',
        data.business_purpose || 'Imported Specification Template',
        data as ProgramSpec
      );
    }
    // If it's a SavedUserTemplate structure
    if (data.spec && data.spec.program_id) {
      return saveSpecAsUserTemplate(
        data.name || data.spec.title,
        data.category || 'Custom',
        data.description || data.spec.business_purpose || '',
        data.spec as ProgramSpec
      );
    }
    return null;
  } catch (err) {
    console.error('Failed to parse imported template JSON', err);
    return null;
  }
};
