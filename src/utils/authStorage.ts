export interface CurrentUser {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
}

const AUTH_STORAGE_KEY = 'sap_spec_current_user_v1';

export const PRESET_USERS: CurrentUser[] = [
  {
    id: 'user-josh',
    name: 'Josh Lee',
    role: 'SAP Lead Architect / Developer',
    department: 'ERP Development Team',
    email: 'josh.lee@sap-project.com',
  },
  {
    id: 'user-hong',
    name: '홍길동 책임',
    role: 'SAP SD Senior Consultant',
    department: 'Sales & Distribution Team',
    email: 'gildong.hong@sap-project.com',
  },
  {
    id: 'user-kim',
    name: '김원가 책임',
    role: 'SAP CO Lead Consultant',
    department: 'Controlling & Cost Team',
    email: 'wonga.kim@sap-project.com',
  },
  {
    id: 'user-park',
    name: '박자재 수석',
    role: 'SAP MM Principal Consultant',
    department: 'Materials Management Team',
    email: 'jajae.park@sap-project.com',
  },
];

/**
 * Retrieve current logged-in user
 */
export const getCurrentUser = (): CurrentUser => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to get current user', err);
  }
  // Default user is Josh Lee as shown in the requirement and screenshots
  return PRESET_USERS[0];
};

/**
 * Update current logged-in user
 */
export const setCurrentUser = (user: CurrentUser): void => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to set current user', err);
  }
};

/**
 * Quick login by preset name or custom name
 */
export const loginAsUser = (name: string, role?: string): CurrentUser => {
  const clean = name.trim();
  const matched = PRESET_USERS.find(
    (u) => u.name.toLowerCase() === clean.toLowerCase()
  );
  if (matched) {
    setCurrentUser(matched);
    return matched;
  }
  const customUser: CurrentUser = {
    id: `user-${Date.now()}`,
    name: clean,
    role: role || 'SAP ABAP Developer',
    department: 'IT Innovation Dept',
    email: `${clean.toLowerCase().replace(/\s+/g, '.')}@sap-project.com`,
  };
  setCurrentUser(customUser);
  return customUser;
};
