import { create } from 'zustand';

export type DemoRole = 'professor' | 'student';

const DEMO_SESSION_KEY = 'evalynx_demo_role';

function readStoredDemoRole(): DemoRole | null {
  try {
    const val = window.sessionStorage.getItem(DEMO_SESSION_KEY);
    return val === 'professor' || val === 'student' ? val : null;
  } catch {
    return null;
  }
}

function writeStoredDemoRole(role: DemoRole | null): void {
  try {
    if (role) {
      window.sessionStorage.setItem(DEMO_SESSION_KEY, role);
    } else {
      window.sessionStorage.removeItem(DEMO_SESSION_KEY);
    }
  } catch {
    // Ignore restricted sessionStorage environments
  }
}

export class DemoReadOnlyError extends Error {
  readonly isDemoReadOnly = true;
  constructor(action?: string) {
    super(
      action
        ? `This is a demo. Create a free account to ${action}.`
        : 'This is a demo. Create a free account to do this.'
    );
    this.name = 'DemoReadOnlyError';
  }
}

export function isDemoReadOnlyError(err: unknown): boolean {
  return (
    err instanceof DemoReadOnlyError ||
    (typeof err === 'object' &&
      err !== null &&
      'isDemoReadOnly' in err &&
      (err as { isDemoReadOnly?: unknown }).isDemoReadOnly === true)
  );
}

interface DemoState {
  demoRole: DemoRole | null;
  writeGuardOpen: boolean;
  writeGuardAction: string | null;
  enterDemo: (role: DemoRole) => void;
  exitDemo: () => void;
  openWriteGuard: (action?: string) => void;
  closeWriteGuard: () => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  demoRole: readStoredDemoRole(),
  writeGuardOpen: false,
  writeGuardAction: null,

  enterDemo: (role) => {
    writeStoredDemoRole(role);
    set({ demoRole: role, writeGuardOpen: false, writeGuardAction: null });
  },

  exitDemo: () => {
    writeStoredDemoRole(null);
    set({ demoRole: null, writeGuardOpen: false, writeGuardAction: null });
  },

  openWriteGuard: (action) => {
    set({ writeGuardOpen: true, writeGuardAction: action ?? null });
  },

  closeWriteGuard: () => {
    set({ writeGuardOpen: false, writeGuardAction: null });
  },
}));

export function isDemoModeActive(): boolean {
  return useDemoStore.getState().demoRole !== null;
}

export function getActiveDemoRole(): DemoRole | null {
  return useDemoStore.getState().demoRole;
}

export function triggerDemoWriteGuard(action?: string): boolean {
  if (!isDemoModeActive()) return false;
  useDemoStore.getState().openWriteGuard(action);
  return true;
}
