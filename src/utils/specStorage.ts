import { ProgramSpec, SapModule, SpecChangeHistoryItem } from '../types/sap';
import { SAMPLE_SPECS } from '../data/sampleSpecs';

const STORAGE_KEY = 'sap_spec_programs_v4';

export interface SavedProgramSpecItem {
  program_id: string;
  tcode: string;
  title: string;
  module: SapModule;
  sample_type?: string;
  author: string;
  updated_at: string;
  is_system?: boolean;
  change_history: SpecChangeHistoryItem[];
  spec: ProgramSpec;
}

/**
 * Seed initial sample programs if storage is empty
 */
const getInitialSeedSpecs = (): SavedProgramSpecItem[] => {
  return SAMPLE_SPECS.map((s) => ({
    program_id: s.program_id.toUpperCase(),
    tcode: s.tcode,
    title: s.title,
    module: s.module,
    sample_type: s.sample_type || '01',
    author: s.author,
    updated_at: s.created_date || new Date().toISOString().split('T')[0],
    is_system: true,
    change_history: s.change_history || [
      {
        id: `init-${s.program_id}`,
        version: 'v1.0',
        changed_at: `${s.created_date || '2026-11-01'} 09:00:00`,
        author: s.author,
        comment: 'SAP 표준 기본 사양서 등록',
      },
    ],
    spec: {
      ...s,
      program_id: s.program_id.toUpperCase(),
      is_system: true,
      change_history: s.change_history || [
        {
          id: `init-${s.program_id}`,
          version: 'v1.0',
          changed_at: `${s.created_date || '2026-11-01'} 09:00:00`,
          author: s.author,
          comment: 'SAP 표준 기본 사양서 등록',
        },
      ],
    },
  }));
};

/**
 * Retrieve all saved Program Specs from localStorage
 */
export const getSavedSpecList = (): SavedProgramSpecItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedSpecs();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const initial = getInitialSeedSpecs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  } catch (err) {
    console.error('Failed to load saved specs from localStorage', err);
    return getInitialSeedSpecs();
  }
};

/**
 * Helper to generate next version number
 */
const getNextVersion = (history: SpecChangeHistoryItem[]): string => {
  if (!history || history.length === 0) return 'v1.0';
  const last = history[history.length - 1];
  const match = last.version.match(/v(\d+)\.(\d+)/);
  if (match) {
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10) + 1;
    return `v${major}.${minor}`;
  }
  return `v1.${history.length}`;
};

/**
 * Save or overwrite a specification by program_id with Change History Tracking
 */
export const saveSpecToStorage = (
  spec: ProgramSpec,
  changeComment?: string,
  authorName?: string
): { success: boolean; message?: string; savedItem?: SavedProgramSpecItem } => {
  try {
    const list = getSavedSpecList();
    const cleanProgramId = (spec.program_id || 'ZPROG01').trim().toUpperCase();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const author = authorName || spec.author || 'Josh Lee';

    const existingIndex = list.findIndex(
      (item) => item.program_id.toUpperCase() === cleanProgramId
    );

    const existingItem = existingIndex >= 0 ? list[existingIndex] : null;
    const prevHistory: SpecChangeHistoryItem[] =
      existingItem?.change_history || spec.change_history || [];

    const nextVer = getNextVersion(prevHistory);
    const newHistoryItem: SpecChangeHistoryItem = {
      id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      version: nextVer,
      changed_at: now,
      author,
      comment: changeComment?.trim() || (existingItem ? '사양서 내용 변경 및 저장' : '신규 사양서 작성 및 저장'),
    };

    const updatedHistory = [...prevHistory, newHistoryItem];

    const updatedSpec: ProgramSpec = {
      ...spec,
      program_id: cleanProgramId,
      author,
      change_history: updatedHistory,
      is_system: existingItem ? !!existingItem.is_system : false,
    };

    const itemToSave: SavedProgramSpecItem = {
      program_id: cleanProgramId,
      tcode: updatedSpec.tcode,
      title: updatedSpec.title,
      module: updatedSpec.module,
      sample_type: updatedSpec.sample_type || '01',
      author,
      updated_at: now,
      is_system: updatedSpec.is_system,
      change_history: updatedHistory,
      spec: updatedSpec,
    };

    let updatedList: SavedProgramSpecItem[];
    if (existingIndex >= 0) {
      updatedList = [...list];
      updatedList[existingIndex] = itemToSave;
    } else {
      updatedList = [itemToSave, ...list];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    return { success: true, savedItem: itemToSave };
  } catch (err) {
    console.error('Failed to save spec to localStorage', err);
    return { success: false, message: '로컬 스토리지 저장 중 오류가 발생했습니다.' };
  }
};

/**
 * Copy an existing spec to a new program_id
 */
export const copySpecInStorage = (
  sourceProgramId: string,
  newProgramId: string,
  authorName?: string
): { success: boolean; message?: string; newSpec?: ProgramSpec } => {
  const cleanSourceId = sourceProgramId.trim().toUpperCase();
  const cleanNewId = newProgramId.trim().toUpperCase();

  if (!cleanNewId) {
    return {
      success: false,
      message: '신규 Program ID를 입력해 주세요.',
    };
  }

  const list = getSavedSpecList();

  // Check if target Program ID already exists
  const alreadyExists = list.some(
    (item) => item.program_id.toUpperCase() === cleanNewId
  );

  if (alreadyExists) {
    return {
      success: false,
      message: '이미 사용하고 있는 Program ID입니다.',
    };
  }

  // Find source spec
  const sourceItem = list.find(
    (item) => item.program_id.toUpperCase() === cleanSourceId
  );

  if (!sourceItem) {
    return {
      success: false,
      message: `원본 프로그램 '${cleanSourceId}'을 찾을 수 없습니다.`,
    };
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const author = authorName || 'Josh Lee';

  const initialHistory: SpecChangeHistoryItem[] = [
    {
      id: `h-${Date.now()}`,
      version: 'v1.0',
      changed_at: now,
      author,
      comment: `프로그램 '${cleanSourceId}'에서 복사하여 신규 생성`,
    },
  ];

  // Create new cloned spec
  const newSpec: ProgramSpec = {
    ...JSON.parse(JSON.stringify(sourceItem.spec)),
    id: `spec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    program_id: cleanNewId,
    tcode: cleanNewId.startsWith('Z') || cleanNewId.startsWith('Y') ? cleanNewId : `Z${cleanNewId}`,
    title: `${sourceItem.spec.title} (Copy)`,
    author,
    created_date: new Date().toISOString().split('T')[0],
    is_system: false, // Copied spec is user-created!
    change_history: initialHistory,
  };

  const newItem: SavedProgramSpecItem = {
    program_id: cleanNewId,
    tcode: newSpec.tcode,
    title: newSpec.title,
    module: newSpec.module,
    sample_type: newSpec.sample_type || '01',
    author,
    updated_at: now,
    is_system: false,
    change_history: initialHistory,
    spec: newSpec,
  };

  const updatedList = [newItem, ...list];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    return {
      success: true,
      newSpec,
    };
  } catch (err) {
    console.error('Failed to save copied spec to localStorage', err);
    return {
      success: false,
      message: '복사된 사양서 저장 중 오류가 발생했습니다.',
    };
  }
};

/**
 * Delete a spec from storage
 * Rules:
 * 1. System sample specs CANNOT be deleted.
 * 2. Only the author who created the spec can delete it.
 */
export const deleteSpecFromStorage = (
  programId: string,
  currentUserName?: string
): { success: boolean; message?: string; list: SavedProgramSpecItem[] } => {
  const cleanId = programId.trim().toUpperCase();
  const list = getSavedSpecList();
  const target = list.find((item) => item.program_id.toUpperCase() === cleanId);

  if (!target) {
    return { success: false, message: '해당 사양서를 찾을 수 없습니다.', list };
  }

  // Rule 1: System sample check
  if (target.is_system) {
    return {
      success: false,
      message: '기본 제공 샘플 사양서는 삭제할 수 없습니다.',
      list,
    };
  }

  // Rule 2: Author permission check
  if (currentUserName && target.author && target.author !== currentUserName) {
    return {
      success: false,
      message: `본인이 작성한 사양서만 삭제할 수 있습니다. (작성자: ${target.author}, 현재 로그인: ${currentUserName})`,
      list,
    };
  }

  const updatedList = list.filter((item) => item.program_id.toUpperCase() !== cleanId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    return { success: true, list: updatedList };
  } catch (err) {
    console.error('Failed to delete spec from localStorage', err);
    return {
      success: false,
      message: '삭제 처리 중 스토리지 오류가 발생했습니다.',
      list,
    };
  }
};
