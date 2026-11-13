import { ProjectMeetingMinute } from '../types/sap';
import { COMMON_PROJECT_CODE, TEMP_PROJECT_CODE } from './projectStorage';

const MEETING_STORAGE_KEY = 'sap_spec_meeting_minutes_v1';

export function formatNowDateTime(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function getMeetingMinutesList(): ProjectMeetingMinute[] {
  try {
    const raw = localStorage.getItem(MEETING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object' && item.id)
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  } catch (err) {
    console.error('Failed to load meeting minutes from localStorage', err);
    return [];
  }
}

/**
 * Retrieve meeting minutes visible within a project.
 * Enforces TEMP per-user isolation (author === currentUserName).
 */
export function getVisibleMinutesForProject(
  projectCode: string,
  currentUserName: string
): ProjectMeetingMinute[] {
  const targetCode = (projectCode || COMMON_PROJECT_CODE).trim().toUpperCase();
  const cleanUser = (currentUserName || '').trim();
  const all = getMeetingMinutesList();

  return all.filter((m) => {
    const itemProj = (m.project_code || TEMP_PROJECT_CODE).trim().toUpperCase();
    if (itemProj !== targetCode) return false;
    if (targetCode === TEMP_PROJECT_CODE) {
      return (m.author || '').trim() === cleanUser;
    }
    return true;
  });
}

export function saveMeetingMinute(record: ProjectMeetingMinute): ProjectMeetingMinute[] {
  const list = getMeetingMinutesList();
  const now = formatNowDateTime();
  const normalizedProj =
    (record.project_code || TEMP_PROJECT_CODE).trim().toUpperCase() === COMMON_PROJECT_CODE
      ? TEMP_PROJECT_CODE
      : (record.project_code || TEMP_PROJECT_CODE).trim().toUpperCase();

  const updatedRecord: ProjectMeetingMinute = {
    ...record,
    project_code: normalizedProj,
    created_at: record.created_at || now,
    updated_at: now,
  };

  const idx = list.findIndex((m) => m.id === updatedRecord.id);
  const nextList =
    idx >= 0
      ? list.map((m, i) => (i === idx ? updatedRecord : m))
      : [updatedRecord, ...list];

  nextList.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));

  try {
    localStorage.setItem(MEETING_STORAGE_KEY, JSON.stringify(nextList));
  } catch (err) {
    console.error('Failed to save meeting minute', err);
  }
  return nextList;
}

export function deleteMeetingMinute(id: string): ProjectMeetingMinute[] {
  const nextList = getMeetingMinutesList().filter((m) => m.id !== id);
  try {
    localStorage.setItem(MEETING_STORAGE_KEY, JSON.stringify(nextList));
  } catch (err) {
    console.error('Failed to delete meeting minute', err);
  }
  return nextList;
}
