import { create } from 'zustand';
import { STORAGE_KEYS } from '../lib/constants';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  hydrateTheme: () => void;
}

function applyThemeClass(theme: ThemeMode): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function getInitialTheme(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // Ignore storage errors
  }
  return 'light';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  setTheme: (theme) => {
    applyThemeClass(theme);
    try {
      window.localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {
      // Ignore storage errors
    }
    set({ theme });
  },
  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },
  hydrateTheme: () => {
    const initial = getInitialTheme();
    applyThemeClass(initial);
    set({ theme: initial });
  },
}));
