import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  DemoReadOnlyError,
  getActiveDemoRole,
  isDemoModeActive,
  triggerDemoWriteGuard,
} from '../features/demo/demoStore';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import type { UserProfile, UserRole } from '../types';
import { requireFirebaseDb } from './firebase';

export function extractFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts[0]?.toLowerCase() === 'dr.' || parts[0]?.toLowerCase() === 'prof.') {
    return parts.slice(0, 2).join(' ');
  }
  return parts[0] || fullName;
}

export interface CreateUserProfileInput {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string | null;
  department?: string;
}

function mapDocToUserProfile(uid: string, raw: Record<string, unknown>): UserProfile {
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Evalynx User';
  const email = typeof raw.email === 'string' ? raw.email : '';
  const role: UserRole =
    raw.role === 'professor' || raw.role === 'student' || raw.role === 'admin'
      ? raw.role
      : 'student';
  const photoURL =
    typeof raw.photoURL === 'string'
      ? raw.photoURL
      : typeof raw.avatarUrl === 'string'
      ? raw.avatarUrl
      : undefined;

  let createdAt = new Date().toISOString();
  if (typeof raw.createdAt === 'string') {
    createdAt = raw.createdAt;
  } else if (
    raw.createdAt &&
    typeof raw.createdAt === 'object' &&
    'toDate' in raw.createdAt &&
    typeof (raw.createdAt as { toDate: () => Date }).toDate === 'function'
  ) {
    createdAt = (raw.createdAt as { toDate: () => Date }).toDate().toISOString();
  }

  return {
    uid,
    name,
    firstName: extractFirstName(name),
    email,
    role,
    department: typeof raw.department === 'string' ? raw.department : '',
    institution: typeof raw.institution === 'string' ? raw.institution : '',
    enrollmentId: typeof raw.enrollmentId === 'string' ? raw.enrollmentId : undefined,
    photoURL,
    avatarUrl: photoURL,
    preferredLanguage: raw.preferredLanguage === 'hi' ? 'hi' : 'en',
    createdAt,
  };
}

export const userService = {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (isDemoModeActive()) {
      const role = getActiveDemoRole();
      if (!role) return null;
      const { demoService } = await import('../features/demo/demoService');
      return demoService.getDemoUser(role);
    }
    const db = requireFirebaseDb();
    const path = `users/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;
      return mapDocToUserProfile(uid, snap.data() as Record<string, unknown>);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async createUserProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    if (triggerDemoWriteGuard('create a profile')) {
      throw new DemoReadOnlyError('create a profile');
    }
    const db = requireFirebaseDb();
    const path = `users/${input.uid}`;
    const cleanName = input.name.trim() || 'Evalynx User';
    const createdAtIso = new Date().toISOString();
    const photoURL = input.photoURL ?? null;

    const payload = {
      uid: input.uid,
      name: cleanName,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      department: input.department?.trim() || '',
      photoURL,
      preferredLanguage: 'en',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'users', input.uid), payload);
      return {
        uid: input.uid,
        name: cleanName,
        firstName: extractFirstName(cleanName),
        email: payload.email,
        role: input.role,
        department: payload.department,
        institution: '',
        photoURL: photoURL || undefined,
        avatarUrl: photoURL || undefined,
        preferredLanguage: 'en',
        createdAt: createdAtIso,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateUserProfile(
    uid: string,
    patch: { name?: string; department?: string; preferredLanguage?: 'en' | 'hi' }
  ): Promise<void> {
    if (triggerDemoWriteGuard('edit profile settings')) {
      throw new DemoReadOnlyError('edit profile settings');
    }
    const db = requireFirebaseDb();
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
};
