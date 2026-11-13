export const FAVORITE_STORAGE_KEY = 'sap_spec_favorites_v1';

type FavoriteMap = Record<string, string[]>;

function normalizeUserKey(userName: string): string {
  const clean = (userName || '').trim();
  return clean || 'default';
}

function readFavoriteMap(): FavoriteMap {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(FAVORITE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as FavoriteMap;
    }
  } catch {
    // ignore storage parse/access errors
  }
  return {};
}

function writeFavoriteMap(map: FavoriteMap): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

export function getFavoriteProgramIds(userName: string): string[] {
  const key = normalizeUserKey(userName);
  const map = readFavoriteMap();
  const list = map[key];
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  list.forEach((id) => {
    if (typeof id === 'string') {
      const upper = id.trim().toUpperCase();
      if (upper && !seen.has(upper)) {
        seen.add(upper);
        result.push(upper);
      }
    }
  });
  return result;
}

export function isProgramFavorited(userName: string, programId: string): boolean {
  const target = (programId || '').trim().toUpperCase();
  if (!target) return false;
  return getFavoriteProgramIds(userName).includes(target);
}

export function toggleFavoriteProgram(
  userName: string,
  programId: string
): { favorited: boolean; ids: string[] } {
  const key = normalizeUserKey(userName);
  const target = (programId || '').trim().toUpperCase();
  const map = readFavoriteMap();
  const current = getFavoriteProgramIds(userName);

  if (!target) {
    return { favorited: false, ids: current };
  }

  const exists = current.includes(target);
  const next = exists
    ? current.filter((id) => id !== target)
    : [target, ...current];

  map[key] = next;
  writeFavoriteMap(map);

  return { favorited: !exists, ids: next };
}

export function removeFavoriteProgram(userName: string, programId: string): string[] {
  const key = normalizeUserKey(userName);
  const target = (programId || '').trim().toUpperCase();
  const map = readFavoriteMap();
  const current = getFavoriteProgramIds(userName);
  if (!target || !current.includes(target)) return current;

  const next = current.filter((id) => id !== target);
  map[key] = next;
  writeFavoriteMap(map);
  return next;
}
