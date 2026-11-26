export const APP_NAME = 'Evalynx';
export const APP_TAGLINE = 'Evaluate smarter.';

export const STORAGE_KEYS = {
  THEME: 'evalynx_theme',
  GOOGLE_REDIRECT_FLAG: 'evalynx_google_redirect_attempted',
} as const;

export const PROFESSOR_NAV_TABS = [
  { id: 'dashboard', label: 'Dashboard', path: '/professor/dashboard' },
  { id: 'tests', label: 'Tests', path: '/professor/tests' },
  { id: 'analytics', label: 'Analytics', path: '/professor/analytics' },
  { id: 'settings', label: 'Settings', path: '/professor/settings' },
] as const;

export const STUDENT_NAV_TABS = [
  { id: 'dashboard', label: 'Dashboard', path: '/student/dashboard' },
  { id: 'tests', label: 'Tests', path: '/student/tests' },
  { id: 'analytics', label: 'Results', path: '/student/analytics' },
  { id: 'settings', label: 'Settings', path: '/student/settings' },
] as const;
