import { ProgramSpec, SapModule, SapProject } from '../types/sap';
import { PRESET_USERS } from './authStorage';

const PROJECT_STORAGE_KEY = 'sap_spec_projects_v1';

export const COMMON_PROJECT_CODE = 'COMMON';
export const TEMP_PROJECT_CODE = 'TEMP';
export const COMMON_SAMPLE_PROGRAM_IDS = ['ZRALV0010', 'ZRALV0020', 'ZRALV0030', 'ZRALV0040'];

export const ALL_SAP_MODULES: SapModule[] = ['SD', 'MM', 'FI', 'CO', 'PP', 'HR', 'QM', 'PM', 'BC', 'CM'];
const ALL_MODULES: SapModule[] = ALL_SAP_MODULES;

export const SYSTEM_PROJECTS: SapProject[] = [
  {
    code: COMMON_PROJECT_CODE,
    name: '공통 표준 영역 (COMMON)',
    description:
      '전사 공통 ALV 샘플 시리즈(ZRALV0010~0040) 및 공통 참조 사양서가 관리되는 공용 영역입니다. 원본은 보호되며 프로젝트로 복사하여 사용합니다.',
    visibility: 'common',
    target_sap_release: 'SAP S/4HANA 2023 / ECC 6.0',
    owner: 'Josh Lee',
    members: PRESET_USERS.map((u) => u.name),
    modules: ALL_MODULES,
    is_system: true,
    created_date: '2026-10-01',
  },
  {
    code: TEMP_PROJECT_CODE,
    name: '개인 임시 프로젝트 (TEMP)',
    description:
      '정식 프로젝트에 배정되지 않은 임시 작성 공간입니다. 본인 계정이 작성한 프로그램 사양서만 조회·편집할 수 있습니다.',
    visibility: 'temp',
    target_sap_release: 'SAP S/4HANA 2023',
    owner: 'SYSTEM',
    members: [],
    modules: ALL_MODULES,
    is_system: true,
    created_date: '2026-10-01',
  },
];

const INITIAL_TEAM_PROJECTS: SapProject[] = [
  {
    code: 'S4_ERP_2026',
    name: '차세대 S/4HANA ERP 구축',
    description: '전사 영업(SD)·구매(MM)·재무(FI)·관리회계(CO) 통합 SAP S/4HANA 전환 프로젝트입니다.',
    visibility: 'project',
    target_sap_release: 'SAP S/4HANA 2023',
    owner: 'Josh Lee',
    members: ['Josh Lee', '홍길동 책임', '김원가 책임', '박자재 수석'],
    modules: ['SD', 'MM', 'FI', 'CO', 'PP'],
    is_system: false,
    created_date: '2026-10-15',
  },
  {
    code: 'FI_CLOSE_TF',
    name: '재무·원가 결산 고도화',
    description: 'ACDOCA 기반 실시간 재무/원가 결산 리포트 및 수익성 분석 고도화 프로젝트입니다.',
    visibility: 'project',
    target_sap_release: 'SAP S/4HANA 2023',
    owner: '김원가 책임',
    members: ['Josh Lee', '김원가 책임'],
    modules: ['FI', 'CO'],
    is_system: false,
    created_date: '2026-11-01',
  },
];

function ensureSystemProjects(list: SapProject[]): SapProject[] {
  const customProjects = list.filter(
    (p) => p.code !== COMMON_PROJECT_CODE && p.code !== TEMP_PROJECT_CODE
  );
  const existingCommon = list.find((p) => p.code === COMMON_PROJECT_CODE);
  const existingTemp = list.find((p) => p.code === TEMP_PROJECT_CODE);

  return [
    existingCommon
      ? { ...existingCommon, is_system: true, visibility: 'common', modules: ALL_SAP_MODULES }
      : SYSTEM_PROJECTS[0],
    ...customProjects,
    existingTemp
      ? { ...existingTemp, is_system: true, visibility: 'temp', modules: ALL_SAP_MODULES }
      : SYSTEM_PROJECTS[1],
  ];
}

export function getProjects(): SapProject[] {
  try {
    const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) {
      const initial = ensureSystemProjects(INITIAL_TEAM_PROJECTS);
      localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return ensureSystemProjects(parsed);
    }
  } catch (err) {
    console.error('Failed to load projects from localStorage', err);
  }
  const fallback = ensureSystemProjects(INITIAL_TEAM_PROJECTS);
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(fallback));
  } catch {
    // ignore
  }
  return fallback;
}

export function getAccessibleProjectsForUser(userName: string): SapProject[] {
  const cleanUser = userName.trim();
  const all = getProjects();
  return all.filter(
    (p) =>
      p.visibility === 'common' ||
      p.visibility === 'temp' ||
      p.owner === cleanUser ||
      p.members.includes(cleanUser)
  );
}

export function getProjectByCode(code?: string): SapProject | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return getProjects().find((p) => p.code.toUpperCase() === upper);
}

export function saveProject(project: SapProject): {
  success: boolean;
  message?: string;
  list: SapProject[];
  savedProject?: SapProject;
} {
  const cleanCode = project.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
  if (!cleanCode) {
    return {
      success: false,
      message: '프로젝트 코드를 입력해 주세요. (영문 대문자, 숫자, _ 사용)',
      list: getProjects(),
    };
  }
  if (!project.name.trim()) {
    return {
      success: false,
      message: '프로젝트명을 입력해 주세요.',
      list: getProjects(),
    };
  }

  const list = getProjects();
  const idx = list.findIndex((p) => p.code.toUpperCase() === cleanCode);
  const existing = idx >= 0 ? list[idx] : null;

  const isSystem = cleanCode === COMMON_PROJECT_CODE || cleanCode === TEMP_PROJECT_CODE;
  const membersSet = new Set(project.members.filter(Boolean));
  if (project.owner) membersSet.add(project.owner);

  const normalized: SapProject = {
    ...project,
    code: cleanCode,
    name: project.name.trim(),
    description: project.description.trim(),
    visibility:
      cleanCode === COMMON_PROJECT_CODE
        ? 'common'
        : cleanCode === TEMP_PROJECT_CODE
        ? 'temp'
        : 'project',
    is_system: isSystem,
    members: isSystem && cleanCode === COMMON_PROJECT_CODE ? PRESET_USERS.map((u) => u.name) : Array.from(membersSet),
    modules: project.modules.length > 0 ? project.modules : ALL_MODULES,
    created_date: existing?.created_date || project.created_date || new Date().toISOString().split('T')[0],
  };

  let nextList: SapProject[];
  if (idx >= 0) {
    nextList = [...list];
    nextList[idx] = normalized;
  } else {
    nextList = [...list, normalized];
  }

  const ensured = ensureSystemProjects(nextList);
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(ensured));
    return { success: true, list: ensured, savedProject: normalized };
  } catch (err) {
    console.error('Failed to save project', err);
    return { success: false, message: '프로젝트 저장 중 오류가 발생했습니다.', list };
  }
}

export function deleteProject(code: string): {
  success: boolean;
  message?: string;
  list: SapProject[];
} {
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode === COMMON_PROJECT_CODE || cleanCode === TEMP_PROJECT_CODE) {
    return {
      success: false,
      message: `${cleanCode} 시스템 기본 프로젝트는 삭제할 수 없습니다.`,
      list: getProjects(),
    };
  }

  const list = getProjects();
  const nextList = ensureSystemProjects(list.filter((p) => p.code.toUpperCase() !== cleanCode));
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(nextList));
    return { success: true, list: nextList };
  } catch (err) {
    console.error('Failed to delete project', err);
    return { success: false, message: '프로젝트 삭제 중 오류가 발생했습니다.', list };
  }
}

/**
 * Determine default/migrated project code for any spec that doesn't have one yet.
 */
export function resolveDefaultProjectCode(spec: Pick<ProgramSpec, 'program_id' | 'project_code' | 'is_system'>): string {
  const explicit = spec.project_code?.trim().toUpperCase();
  if (explicit) return explicit;
  const pid = (spec.program_id || '').trim().toUpperCase();
  if (COMMON_SAMPLE_PROGRAM_IDS.includes(pid)) {
    return COMMON_PROJECT_CODE;
  }
  return TEMP_PROJECT_CODE;
}

/**
 * Protected COMMON sample check:
 * ZRALV0010 ~ ZRALV0040 system originals residing in COMMON cannot be overwritten directly.
 */
export function isCommonProtectedSample(
  spec: Pick<ProgramSpec, 'program_id' | 'project_code' | 'is_system'>
): boolean {
  const pid = (spec.program_id || '').trim().toUpperCase();
  const proj = resolveDefaultProjectCode(spec);
  return !!spec.is_system && proj === COMMON_PROJECT_CODE && COMMON_SAMPLE_PROGRAM_IDS.includes(pid);
}

/**
 * Any spec belonging to the COMMON project (or flagged as a protected COMMON sample) is read-only.
 */
export function isReadOnlyCommonSpec(
  spec: Pick<ProgramSpec, 'program_id' | 'project_code' | 'is_system'>
): boolean {
  const proj = resolveDefaultProjectCode(spec);
  return proj === COMMON_PROJECT_CODE || isCommonProtectedSample(spec);
}

/**
 * Visibility filter:
 * - TEMP project specs are strictly private to their author (author === currentUserName).
 * - COMMON and team projects show all specs assigned to that project code.
 */
export function isSpecVisibleInProject(
  item: { project_code?: string; author?: string; program_id?: string },
  projectCode: string,
  currentUserName: string
): boolean {
  const itemProject = (
    item.project_code ||
    (item.program_id && COMMON_SAMPLE_PROGRAM_IDS.includes(item.program_id.toUpperCase())
      ? COMMON_PROJECT_CODE
      : TEMP_PROJECT_CODE)
  ).toUpperCase();
  const targetProject = projectCode.trim().toUpperCase();

  if (itemProject !== targetProject) return false;

  if (targetProject === TEMP_PROJECT_CODE) {
    return (item.author || '').trim() === currentUserName.trim();
  }

  return true;
}
