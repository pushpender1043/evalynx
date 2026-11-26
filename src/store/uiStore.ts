import { create } from 'zustand';
import { isDemoReadOnlyError, triggerDemoWriteGuard } from '../features/demo/demoStore';
import { testService } from '../services/testService';
import type { AppNotification, CreateTestDraftInput, TestItem, UserProfile } from '../types';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

interface UIState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  createTestModalOpen: boolean;
  setCreateTestModalOpen: (open: boolean) => void;
  tests: TestItem[];
  testsLoaded: boolean;
  workspaceError: string | null;
  notifications: AppNotification[];
  toasts: ToastMessage[];
  loadWorkspaceData: (user: UserProfile) => Promise<void>;
  createDraftTest: (input: CreateTestDraftInput, professor: UserProfile) => Promise<TestItem>;
  markAllNotificationsRead: (uid: string) => Promise<void>;
  clearWorkspace: () => void;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  notificationsOpen: false,
  setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
  createTestModalOpen: false,
  setCreateTestModalOpen: (createTestModalOpen) => set({ createTestModalOpen }),
  tests: [],
  testsLoaded: false,
  workspaceError: null,
  notifications: [],
  toasts: [],

  loadWorkspaceData: async (user) => {
    set({ workspaceError: null });
    try {
      const [tests, notifications] = await Promise.all([
        testService.listTestsForUser(user),
        testService.getNotifications(user.uid),
      ]);
      set({ tests, notifications, testsLoaded: true, workspaceError: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load workspace data from Firestore.';
      set({ tests: [], notifications: [], testsLoaded: true, workspaceError: message });
    }
  },

  createDraftTest: async (input, professor) => {
    const created = await testService.createDraftTest(input, professor);
    set((state) => ({ tests: [created, ...state.tests] }));
    get().pushToast({
      title: 'Test draft created',
      description: `${created.title} (${created.code}) saved to Firestore.`,
      tone: 'success',
    });
    return created;
  },

  markAllNotificationsRead: async (uid) => {
    if (triggerDemoWriteGuard('update notifications')) return;
    try {
      const updated = await testService.markAllNotificationsRead(uid, get().notifications);
      set({ notifications: updated });
    } catch (err) {
      if (isDemoReadOnlyError(err)) return;
      get().pushToast({
        title: 'Could not update notifications',
        description: err instanceof Error ? err.message : 'Please try again.',
        tone: 'danger',
      });
    }
  },

  clearWorkspace: () =>
    set({
      searchQuery: '',
      notificationsOpen: false,
      createTestModalOpen: false,
      tests: [],
      testsLoaded: false,
      workspaceError: null,
      notifications: [],
    }),

  pushToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({ toasts: [...state.toasts.slice(-2), { ...toast, id }] }));
    window.setTimeout(() => {
      get().dismissToast(id);
    }, 4200);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
