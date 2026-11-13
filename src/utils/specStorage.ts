import { ProgramSpec, SapModule, SpecChangeHistoryItem } from '../types/sap';
import { SAMPLE_SPECS } from '../data/sampleSpecs';
import {
  COMMON_PROJECT_CODE,
  COMMON_SAMPLE_PROGRAM_IDS,
  TEMP_PROJECT_CODE,
  isCommonProtectedSample,
  isReadOnlyCommonSpec,
  resolveDefaultProjectCode,
} from './projectStorage';

const STORAGE_KEY = 'sap_spec_programs_v4';

export interface SavedProgramSpecItem {
  program_id: string;
  project_code: string;
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
  return SAMPLE_SPECS.map((s) => {
    const cleanId = s.program_id.toUpperCase();
    const projectCode = resolveDefaultProjectCode({
      program_id: cleanId,
      project_code: s.project_code,
      is_system: s.is_system,
    });
    const isSystem = !!s.is_system || COMMON_SAMPLE_PROGRAM_IDS.includes(cleanId);
    const history = s.change_history || [
      {
        id: `init-${cleanId}`,
        version: 'v1.0',
        changed_at: `${s.created_date || '2026-11-01'} 09:00:00`,
        author: s.author,
        comment: 'SAP 표준 기본 사양서 등록',
      },
    ];

    return {
      program_id: cleanId,
      project_code: projectCode,
      tcode: s.tcode,
      title: s.title,
      module: s.module,
      sample_type: s.sample_type || '01',
      author: s.author,
      updated_at: s.created_date || new Date().toISOString().split('T')[0],
      is_system: isSystem,
      change_history: history,
      spec: {
        ...s,
        program_id: cleanId,
        project_code: projectCode,
        is_system: isSystem,
        change_history: history,
      },
    };
  });
};

function normalizeSavedItems(items: SavedProgramSpecItem[]): {
  normalized: SavedProgramSpecItem[];
  changed: boolean;
} {
  let changed = false;
  const normalized = items.map((item) => {
    const cleanId = (item.program_id || item.spec?.program_id || 'ZPROG01').toUpperCase();
    const isCommonSample = COMMON_SAMPLE_PROGRAM_IDS.includes(cleanId);
    const expectedProj = isCommonSample
      ? COMMON_PROJECT_CODE
      : (item.project_code || item.spec?.project_code || TEMP_PROJECT_CODE).toUpperCase();
    const expectedSystem = isCommonSample ? true : !!item.is_system;

    if (
      item.project_code !== expectedProj ||
      item.spec?.project_code !== expectedProj ||
      (isCommonSample && !item.is_system)
    ) {
      changed = true;
      return {
        ...item,
        program_id: cleanId,
        project_code: expectedProj,
        is_system: expectedSystem,
        spec: {
          ...item.spec,
          program_id: cleanId,
          project_code: expectedProj,
          is_system: expectedSystem,
        },
      };
    }
    return item;
  });

  // Ensure any missing ZRALV0010~0040 sample specs are present in COMMON
  const existingIds = new Set(normalized.map((i) => i.program_id.toUpperCase()));
  const seeds = getInitialSeedSpecs();
  seeds.forEach((seed) => {
    if (COMMON_SAMPLE_PROGRAM_IDS.includes(seed.program_id) && !existingIds.has(seed.program_id)) {
      normalized.push(seed);
      changed = true;
    }
  });

  return { normalized, changed };
}

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
      const { normalized, changed } = normalizeSavedItems(parsed);
      if (changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
      return normalized;
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
 * Auto-sync live edits for writable (non-COMMON) specs without adding a revision entry every keystroke.
 */
export const upsertWorkingSpecQuietly = (spec: ProgramSpec): boolean => {
  if (isReadOnlyCommonSpec(spec)) return false;
  try {
    const list = getSavedSpecList();
    const cleanProgramId = (spec.program_id || 'ZPROG01').trim().toUpperCase();
    const projectCode = resolveDefaultProjectCode(spec);
    if (projectCode === COMMON_PROJECT_CODE) return false;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const existingIndex = list.findIndex(
      (item) => item.program_id.toUpperCase() === cleanProgramId || item.spec?.id === spec.id
    );
    const existingItem = existingIndex >= 0 ? list[existingIndex] : null;
    if (existingItem && isReadOnlyCommonSpec(existingItem.spec)) {
      return false;
    }

    const history = existingItem?.change_history || spec.change_history || [
      {
        id: `h-${Date.now()}`,
        version: 'v1.0',
        changed_at: now,
        author: spec.author || 'Josh Lee',
        comment: '초기 작성',
      },
    ];

    const updatedSpec: ProgramSpec = {
      ...spec,
      program_id: cleanProgramId,
      project_code: projectCode,
      is_system: false,
      change_history: history,
    };

    const itemToSave: SavedProgramSpecItem = {
      program_id: cleanProgramId,
      project_code: projectCode,
      tcode: updatedSpec.tcode,
      title: updatedSpec.title,
      module: updatedSpec.module,
      sample_type: updatedSpec.sample_type || '01',
      author: updatedSpec.author,
      updated_at: now,
      is_system: false,
      change_history: history,
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
    return true;
  } catch {
    // ignore storage quota errors during quiet auto-sync
    return false;
  }
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
    const projectCode = (spec.project_code || '').trim().toUpperCase();
    if (!projectCode) {
      return {
        success: false,
        message: 'General Info에서 소속 프로젝트(Project)를 필수로 선택해 주세요.',
      };
    }

    const list = getSavedSpecList();
    const cleanProgramId = (spec.program_id || 'ZPROG01').trim().toUpperCase();
    const existingIndex = list.findIndex(
      (item) => item.program_id.toUpperCase() === cleanProgramId
    );
    const existingItem = existingIndex >= 0 ? list[existingIndex] : null;

    if (
      isReadOnlyCommonSpec(spec) ||
      (existingItem && isReadOnlyCommonSpec(existingItem.spec))
    ) {
      return {
        success: false,
        message:
          'COMMON 프로젝트의 샘플 사양서는 읽기 전용입니다. 다른 프로젝트(또는 TEMP)로 복사하여 저장해 주세요.',
      };
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const author = authorName || spec.author || 'Josh Lee';

    const prevHistory: SpecChangeHistoryItem[] =
      existingItem?.change_history || spec.change_history || [];

    const nextVer = getNextVersion(prevHistory);
    const newHistoryItem: SpecChangeHistoryItem = {
      id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      version: nextVer,
      changed_at: now,
      author,
      comment:
        changeComment?.trim() ||
        (existingItem ? '사양서 내용 변경 및 저장' : '신규 사양서 작성 및 저장'),
    };

    const updatedHistory = [...prevHistory, newHistoryItem];

    const updatedSpec: ProgramSpec = {
      ...spec,
      program_id: cleanProgramId,
      project_code: projectCode,
      author,
      change_history: updatedHistory,
      is_system: false,
    };

    const itemToSave: SavedProgramSpecItem = {
      program_id: cleanProgramId,
      project_code: projectCode,
      tcode: updatedSpec.tcode,
      title: updatedSpec.title,
      module: updatedSpec.module,
      sample_type: updatedSpec.sample_type || '01',
      author,
      updated_at: now,
      is_system: false,
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
 * Copy an existing spec to a new program_id and target project
 */
export const copySpecInStorage = (
  sourceProgramId: string,
  newProgramId: string,
  authorName?: string,
  targetProjectCode?: string,
  overrideTitle?: string,
  overrideTcode?: string
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

  const alreadyExists = list.some(
    (item) => item.program_id.toUpperCase() === cleanNewId
  );

  if (alreadyExists) {
    return {
      success: false,
      message: '이미 사용하고 있는 Program ID입니다.',
    };
  }

  const sourceItem = list.find(
    (item) => item.program_id.toUpperCase() === cleanSourceId
  );

  if (!sourceItem) {
    return {
      success: false,
      message: `원본 프로그램 '${cleanSourceId}'을 찾을 수 없습니다.`,
    };
  }

  const resolvedTargetProject = (
    targetProjectCode ||
    (sourceItem.project_code === COMMON_PROJECT_CODE
      ? TEMP_PROJECT_CODE
      : sourceItem.project_code || TEMP_PROJECT_CODE)
  )
    .trim()
    .toUpperCase();

  if (resolvedTargetProject === COMMON_PROJECT_CODE && COMMON_SAMPLE_PROGRAM_IDS.includes(cleanNewId)) {
    return {
      success: false,
      message: 'COMMON 샘플 ID는 사용할 수 없습니다. 프로젝트 또는 TEMP로 복사해 주세요.',
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
      comment: `프로그램 '${cleanSourceId}'(${sourceItem.project_code || COMMON_PROJECT_CODE})에서 '${resolvedTargetProject}' 프로젝트로 복사 생성`,
    },
  ];

  const defaultTcode =
    overrideTcode?.trim().toUpperCase() ||
    (cleanNewId.startsWith('Z') || cleanNewId.startsWith('Y')
      ? cleanNewId.slice(0, 20)
      : `Z${cleanNewId.slice(0, 19)}`);

  const newSpec: ProgramSpec = {
    ...JSON.parse(JSON.stringify(sourceItem.spec)),
    id: `spec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    project_code: resolvedTargetProject,
    program_id: cleanNewId,
    tcode: defaultTcode,
    title: overrideTitle?.trim() || `${sourceItem.spec.title} (Copy)`,
    author,
    created_date: new Date().toISOString().split('T')[0],
    is_system: false,
    change_history: initialHistory,
  };

  const newItem: SavedProgramSpecItem = {
    program_id: cleanNewId,
    project_code: resolvedTargetProject,
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
 * Reassign all specs belonging to a deleted project into TEMP
 */
export const reassignSpecsProjectToTemp = (deletedProjectCode: string): void => {
  const target = deletedProjectCode.trim().toUpperCase();
  if (!target || target === COMMON_PROJECT_CODE || target === TEMP_PROJECT_CODE) return;
  const list = getSavedSpecList();
  let changed = false;
  const updated = list.map((item) => {
    if ((item.project_code || '').toUpperCase() === target) {
      changed = true;
      return {
        ...item,
        project_code: TEMP_PROJECT_CODE,
        spec: {
          ...item.spec,
          project_code: TEMP_PROJECT_CODE,
        },
      };
    }
    return item;
  });
  if (changed) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
};

/**
 * Delete a spec from storage
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

  if (target.is_system) {
    return {
      success: false,
      message: 'COMMON 기본 제공 샘플 사양서 원본은 삭제할 수 없습니다.',
      list,
    };
  }

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
