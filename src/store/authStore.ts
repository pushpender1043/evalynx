import { create } from 'zustand';
import { extractFirebaseErrorCode } from '../lib/firebaseErrors';
import { authService } from '../services/authService';
import { userService, extractFirstName } from '../services/userService';
import {
  getActiveDemoRole,
  triggerDemoWriteGuard,
  useDemoStore,
  type DemoRole,
} from '../features/demo/demoStore';
import type { AuthCredentials, PendingOAuthUser, SignupPayload, UserProfile } from '../types';
import { useUIStore } from './uiStore';

let activeAuthUnsubscribe: (() => void) | null = null;

interface AuthState {
  user: UserProfile | null;
  pendingOAuthUser: PendingOAuthUser | null;
  isDemo: boolean;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  lastAuthErrorCode: string | null;
  initAuth: () => () => void;
  enterDemoMode: (role: DemoRole) => Promise<UserProfile>;
  exitDemoMode: () => void;
  login: (credentials: AuthCredentials) => Promise<UserProfile | null>;
  signup: (payload: SignupPayload) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<{ redirected: boolean; needsRole: boolean; user: UserProfile | null }>;
  completeRoleSelection: (role: 'professor' | 'student', department?: string) => Promise<UserProfile>;
  updateProfile: (patch: { name?: string; department?: string; preferredLanguage?: 'en' | 'hi' }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

function attachRealAuthSubscription(
  set: (partial: Partial<AuthState>) => void
): () => void {
  activeAuthUnsubscribe?.();
  activeAuthUnsubscribe = authService.subscribeToAuth({
    onResolved: ({ user, pendingOAuthUser }) => {
      if (getActiveDemoRole()) return;
      set({ user, pendingOAuthUser, isDemo: false, initialized: true });
    },
    onError: (friendlyMessage, code) => {
      if (getActiveDemoRole()) return;
      set({
        error: friendlyMessage,
        errorCode: code,
        lastAuthErrorCode: code ?? 'unknown',
        initialized: true,
      });
    },
  });
  return () => {
    activeAuthUnsubscribe?.();
    activeAuthUnsubscribe = null;
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  pendingOAuthUser: null,
  isDemo: false,
  initialized: false,
  loading: false,
  error: null,
  errorCode: null,
  lastAuthErrorCode: null,

  initAuth: () => {
    const existingDemoRole = getActiveDemoRole();
    if (existingDemoRole) {
      // Restore demo session purely client-side without touching Firebase
      void import('../features/demo/demoService').then(({ demoService }) => {
        if (getActiveDemoRole() !== existingDemoRole) return;
        const demoUser = demoService.getDemoUser(existingDemoRole);
        set({
          user: demoUser,
          pendingOAuthUser: null,
          isDemo: true,
          initialized: true,
          error: null,
          errorCode: null,
        });
      });
      return () => {
        activeAuthUnsubscribe?.();
        activeAuthUnsubscribe = null;
      };
    }

    return attachRealAuthSubscription(set);
  },

  enterDemoMode: async (role) => {
    // Detach any Firebase listener while exploring demo so zero Firebase calls happen
    activeAuthUnsubscribe?.();
    activeAuthUnsubscribe = null;

    useUIStore.getState().clearWorkspace();
    useDemoStore.getState().enterDemo(role);

    const { demoService } = await import('../features/demo/demoService');
    const demoUser = demoService.getDemoUser(role);
    set({
      user: demoUser,
      pendingOAuthUser: null,
      isDemo: true,
      initialized: true,
      loading: false,
      error: null,
      errorCode: null,
    });
    return demoUser;
  },

  exitDemoMode: () => {
    useDemoStore.getState().exitDemo();
    useUIStore.getState().clearWorkspace();
    set({
      user: null,
      pendingOAuthUser: null,
      isDemo: false,
      loading: false,
      error: null,
      errorCode: null,
      initialized: true,
    });
    // Re-attach real Firebase auth listener cleanly for subsequent real sign-ins
    attachRealAuthSubscription(set);
  },

  login: async (credentials) => {
    if (get().isDemo) {
      useDemoStore.getState().exitDemo();
      useUIStore.getState().clearWorkspace();
    }
    set({ loading: true, error: null, errorCode: null });
    try {
      const result = await authService.loginWithEmail(credentials);
      set({
        user: result.user,
        pendingOAuthUser: result.pendingOAuthUser,
        isDemo: false,
        loading: false,
        initialized: true,
        error: null,
        errorCode: null,
      });
      return result.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
      const code = extractFirebaseErrorCode(err);
      set({
        loading: false,
        error: message,
        errorCode: code,
        lastAuthErrorCode: code ?? get().lastAuthErrorCode,
      });
      throw err;
    }
  },

  signup: async (payload) => {
    if (get().isDemo) {
      useDemoStore.getState().exitDemo();
      useUIStore.getState().clearWorkspace();
    }
    set({ loading: true, error: null, errorCode: null });
    try {
      const user = await authService.signupWithEmail(payload);
      set({
        user,
        pendingOAuthUser: null,
        isDemo: false,
        loading: false,
        initialized: true,
        error: null,
        errorCode: null,
      });
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create your account.';
      const code = extractFirebaseErrorCode(err);
      set({
        loading: false,
        error: message,
        errorCode: code,
        lastAuthErrorCode: code ?? get().lastAuthErrorCode,
      });
      throw err;
    }
  },

  loginWithGoogle: async () => {
    if (get().isDemo) {
      useDemoStore.getState().exitDemo();
      useUIStore.getState().clearWorkspace();
    }
    set({ loading: true, error: null, errorCode: null });
    try {
      const result = await authService.loginWithGoogle();
      if (result.redirected) {
        return { redirected: true, needsRole: false, user: null };
      }
      set({
        user: result.user,
        pendingOAuthUser: result.pendingOAuthUser,
        isDemo: false,
        loading: false,
        initialized: true,
        error: null,
        errorCode: null,
      });
      return {
        redirected: false,
        needsRole: Boolean(!result.user && result.pendingOAuthUser),
        user: result.user,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed.';
      const code = extractFirebaseErrorCode(err);
      set({
        loading: false,
        error: message,
        errorCode: code,
        lastAuthErrorCode: code ?? get().lastAuthErrorCode,
      });
      throw err;
    }
  },

  completeRoleSelection: async (role, department) => {
    const pending = get().pendingOAuthUser;
    if (!pending) {
      throw new Error('No pending Google account found. Please sign in again.');
    }
    set({ loading: true, error: null, errorCode: null });
    try {
      const user = await authService.completeGoogleRoleSelection(pending, role, department);
      set({
        user,
        pendingOAuthUser: null,
        isDemo: false,
        loading: false,
        initialized: true,
        error: null,
        errorCode: null,
      });
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to complete account setup.';
      const code = extractFirebaseErrorCode(err);
      set({
        loading: false,
        error: message,
        errorCode: code,
        lastAuthErrorCode: code ?? get().lastAuthErrorCode,
      });
      throw err;
    }
  },

  updateProfile: async (patch) => {
    if (triggerDemoWriteGuard('update your profile')) return;
    const current = get().user;
    if (!current) return;
    set({ loading: true, error: null, errorCode: null });
    try {
      await userService.updateUserProfile(current.uid, patch);
      const nextName = patch.name?.trim() || current.name;
      set({
        user: {
          ...current,
          ...patch,
          name: nextName,
          firstName: extractFirstName(nextName),
        },
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save profile changes.';
      const code = extractFirebaseErrorCode(err);
      set({
        loading: false,
        error: message,
        errorCode: code,
        lastAuthErrorCode: code ?? get().lastAuthErrorCode,
      });
      throw err;
    }
  },

  logout: async () => {
    if (get().isDemo) {
      get().exitDemoMode();
      return;
    }
    set({ loading: true, error: null, errorCode: null });
    try {
      await authService.logout();
      useUIStore.getState().clearWorkspace();
      set({
        user: null,
        pendingOAuthUser: null,
        isDemo: false,
        loading: false,
        error: null,
        errorCode: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign out.';
      const code = extractFirebaseErrorCode(err);
      set({
        loading: false,
        error: message,
        errorCode: code,
        lastAuthErrorCode: code ?? get().lastAuthErrorCode,
      });
    }
  },

  clearError: () => set({ error: null, errorCode: null }),
}));
