import { SapDD02LTable, SapDD03LField, SapDataType } from '../types/sap';
import { SAP_SEARCH_HELP_TABLES } from '../data/sapSearchHelpData';

const DD02L_STORAGE_KEY = 'sap_ddic_dd02l_tables';
const DD03L_STORAGE_KEY = 'sap_ddic_dd03l_fields';

// Build initial default seed data from SAP_SEARCH_HELP_TABLES
function buildInitialDdicSeed(): { tables: SapDD02LTable[]; fields: SapDD03LField[] } {
  const tables: SapDD02LTable[] = [];
  const fields: SapDD03LField[] = [];

  SAP_SEARCH_HELP_TABLES.forEach((t) => {
    tables.push({
      tabname: t.table,
      ddtext: t.name,
      module: t.module,
      tabclass: 'TRANSP',
      description: t.description,
      is_custom: false,
    });

    t.fields.forEach((f, idx) => {
      fields.push({
        id: `dd03l-${t.table}-${f.field}`,
        tabname: t.table,
        fieldname: f.field,
        position: idx + 1,
        keyflag: !!f.isKey,
        datatype: f.datatype,
        leng: f.length,
        scrtext_l: f.label,
        ddtext: f.description,
        is_custom: false,
      });
    });
  });

  return { tables, fields };
}

export function getDD02LTables(): SapDD02LTable[] {
  try {
    const raw = localStorage.getItem(DD02L_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read DD02L from storage', e);
  }

  const { tables, fields } = buildInitialDdicSeed();
  saveDD02LTables(tables);
  saveDD03LFields(fields);
  return tables;
}

export function saveDD02LTables(tables: SapDD02LTable[]) {
  try {
    localStorage.setItem(DD02L_STORAGE_KEY, JSON.stringify(tables));
  } catch (e) {
    console.error('Failed to save DD02L to storage', e);
  }
}

export function getDD03LFields(filterTabname?: string): SapDD03LField[] {
  let allFields: SapDD03LField[] = [];
  try {
    const raw = localStorage.getItem(DD03L_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        allFields = parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read DD03L from storage', e);
  }

  if (allFields.length === 0) {
    const { fields } = buildInitialDdicSeed();
    allFields = fields;
    saveDD03LFields(fields);
  }

  if (filterTabname) {
    return allFields
      .filter((f) => f.tabname.toUpperCase() === filterTabname.toUpperCase())
      .sort((a, b) => a.position - b.position);
  }

  return allFields.sort((a, b) => {
    if (a.tabname !== b.tabname) return a.tabname.localeCompare(b.tabname);
    return a.position - b.position;
  });
}

export function saveDD03LFields(fields: SapDD03LField[]) {
  try {
    localStorage.setItem(DD03L_STORAGE_KEY, JSON.stringify(fields));
  } catch (e) {
    console.error('Failed to save DD03L to storage', e);
  }
}

// Save or update a single table in DD02L
export function upsertDD02LTable(table: SapDD02LTable): SapDD02LTable[] {
  const current = getDD02LTables();
  const cleanName = table.tabname.trim().toUpperCase();
  const index = current.findIndex((t) => t.tabname.toUpperCase() === cleanName);
  let updated: SapDD02LTable[];

  const newEntry: SapDD02LTable = {
    ...table,
    tabname: cleanName,
    created_at: table.created_at || new Date().toISOString().split('T')[0],
  };

  if (index >= 0) {
    updated = current.map((t, i) => (i === index ? newEntry : t));
  } else {
    updated = [...current, newEntry];
  }

  saveDD02LTables(updated);
  return updated;
}

// Delete a table from DD02L and its associated fields from DD03L
export function deleteDD02LTable(tabname: string): {
  tables: SapDD02LTable[];
  fields: SapDD03LField[];
} {
  const cleanName = tabname.trim().toUpperCase();
  const currentTables = getDD02LTables();
  const currentFields = getDD03LFields();

  const updatedTables = currentTables.filter((t) => t.tabname.toUpperCase() !== cleanName);
  const updatedFields = currentFields.filter((f) => f.tabname.toUpperCase() !== cleanName);

  saveDD02LTables(updatedTables);
  saveDD03LFields(updatedFields);

  return { tables: updatedTables, fields: updatedFields };
}

// Save or update a single field in DD03L
export function upsertDD03LField(field: SapDD03LField): SapDD03LField[] {
  const allFields = getDD03LFields();
  const cleanTab = field.tabname.trim().toUpperCase();
  const cleanField = field.fieldname.trim().toUpperCase();
  const index = allFields.findIndex(
    (f) => f.id === field.id || (f.tabname.toUpperCase() === cleanTab && f.fieldname.toUpperCase() === cleanField)
  );

  const newEntry: SapDD03LField = {
    ...field,
    id: field.id || `dd03l-${cleanTab}-${cleanField}`,
    tabname: cleanTab,
    fieldname: cleanField,
  };

  let updated: SapDD03LField[];
  if (index >= 0) {
    updated = allFields.map((f, i) => (i === index ? newEntry : f));
  } else {
    updated = [...allFields, newEntry];
  }

  saveDD03LFields(updated);
  return updated;
}

// Delete a field from DD03L
export function deleteDD03LField(fieldId: string): SapDD03LField[] {
  const allFields = getDD03LFields();
  const updated = allFields.filter((f) => f.id !== fieldId);
  saveDD03LFields(updated);
  return updated;
}

// Reset DDIC database to standard SAP dictionary presets
export function resetDdicToStandard(): { tables: SapDD02LTable[]; fields: SapDD03LField[] } {
  const seed = buildInitialDdicSeed();
  saveDD02LTables(seed.tables);
  saveDD03LFields(seed.fields);
  return seed;
}
