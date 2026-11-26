import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { STORAGE_KEYS } from '../lib/constants';
import {
  AuthMappedError,
  extractFirebaseErrorCode,
  mapFirebaseError,
  shouldFallbackToRedirect,
} from '../lib/firebaseErrors';
import type { AuthCredentials, PendingOAuthUser, SignupPayload, UserProfile } from '../types';
import { firebaseAuth, isFirebaseConfigured, requireFirebaseAuth } from './firebase';
import { userService } from './userService';

export interface AuthResolutionResult {
  user: UserProfile | null;
  pendingOAuthUser: PendingOAuthUser | null;
  redirected?: boolean;
}

function toPendingOAuthUser(fbUser: FirebaseUser): PendingOAuthUser {
  return {
    uid: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Evalynx User',
    email: fbUser.email || '',
    photoURL: fbUser.photoURL,
  };
}

function clearRedirectAttemptFlag(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.GOOGLE_REDIRECT_FLAG);
  } catch {
    // Ignore storage errors in restricted environments
  }
}

function hasAttemptedRedirect(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEYS.GOOGLE_REDIRECT_FLAG) === '1';
  } catch {
    return false;
  }
}

function markRedirectAttempted(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEYS.GOOGLE_REDIRECT_FLAG, '1');
  } catch {
    // Ignore storage errors
  }
}

function toMappedAuthError(error: unknown, fallback: string): AuthMappedError {
  return new AuthMappedError(mapFirebaseError(error, fallback), extractFirebaseErrorCode(error));
}

async function resolveProfileOrPending(fbUser: FirebaseUser): Promise<AuthResolutionResult> {
  const existing = await userService.getUserProfile(fbUser.uid);
  if (existing) {
    return { user: existing, pendingOAuthUser: null };
  }
  return { user: null, pendingOAuthUser: toPendingOAuthUser(fbUser) };
}

export const authService = {
  isConfigured(): boolean {
    return isFirebaseConfigured;
  },

  subscribeToAuth(callbacks: {
    onResolved: (result: AuthResolutionResult) => void;
    onError: (friendlyMessage: string, code: string | null) => void;
  }): () => void {
    if (!isFirebaseConfigured || !firebaseAuth) {
      callbacks.onResolved({ user: null, pendingOAuthUser: null });
      return () => {};
    }

    let cancelled = false;
    let unsub: (() => void) | null = null;

    const attachAuthListener = () => {
      if (cancelled) return;
      unsub = onAuthStateChanged(
        firebaseAuth!,
        async (fbUser) => {
          if (cancelled) return;
          if (!fbUser) {
            callbacks.onResolved({ user: null, pendingOAuthUser: null });
            return;
          }
          try {
            const resolved = await resolveProfileOrPending(fbUser);
            if (!cancelled) {
              callbacks.onResolved(resolved);
            }
          } catch (error) {
            if (!cancelled) {
              callbacks.onError(
                mapFirebaseError(error, 'Unable to load your profile. Please try again.'),
                extractFirebaseErrorCode(error)
              );
              callbacks.onResolved({ user: null, pendingOAuthUser: toPendingOAuthUser(fbUser) });
            }
          }
        },
        (error) => {
          if (!cancelled) {
            callbacks.onError(
              mapFirebaseError(error, 'Authentication session error.'),
              extractFirebaseErrorCode(error)
            );
            callbacks.onResolved({ user: null, pendingOAuthUser: null });
          }
        }
      );
    };

    const boot = async () => {
      if (hasAttemptedRedirect()) {
        try {
          await Promise.race([
            getRedirectResult(firebaseAuth!),
            new Promise((resolve) => window.setTimeout(resolve, 3500)),
          ]);
        } catch (error) {
          if (!cancelled) {
            callbacks.onError(
              mapFirebaseError(error, 'Google sign-in redirect failed. Please try again.'),
              extractFirebaseErrorCode(error)
            );
          }
        } finally {
          clearRedirectAttemptFlag();
        }
      }
      attachAuthListener();
    };

    void boot();

    return () => {
      cancelled = true;
      unsub?.();
    };
  },

  async loginWithEmail({ email, password }: AuthCredentials): Promise<AuthResolutionResult> {
    try {
      const auth = requireFirebaseAuth();
      const normalizedEmail = email.trim().toLowerCase();
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      return await resolveProfileOrPending(credential.user);
    } catch (error) {
      throw toMappedAuthError(error, 'Unable to sign in. Please check your credentials.');
    }
  },

  async signupWithEmail(payload: SignupPayload): Promise<UserProfile> {
    try {
      const auth = requireFirebaseAuth();
      const normalizedEmail = payload.email.trim().toLowerCase();
      const cleanName = payload.name.trim();
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, payload.password);
      await updateProfile(credential.user, { displayName: cleanName });

      const profile = await userService.createUserProfile({
        uid: credential.user.uid,
        name: cleanName,
        email: normalizedEmail,
        role: payload.role,
        department: payload.department,
        photoURL: credential.user.photoURL,
      });
      return profile;
    } catch (error) {
      throw toMappedAuthError(error, 'Unable to create your account. Please try again.');
    }
  },

  async loginWithGoogle(): Promise<AuthResolutionResult> {
    const auth = requireFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      clearRedirectAttemptFlag();
      return await resolveProfileOrPending(result.user);
    } catch (popupError) {
      if (shouldFallbackToRedirect(popupError, hasAttemptedRedirect())) {
        try {
          markRedirectAttempted();
          await signInWithRedirect(auth, provider);
          return { user: null, pendingOAuthUser: null, redirected: true };
        } catch (redirectError) {
          clearRedirectAttemptFlag();
          throw toMappedAuthError(redirectError, 'Google sign-in failed. Please try again.');
        }
      }
      clearRedirectAttemptFlag();
      throw toMappedAuthError(popupError, 'Google sign-in failed. Please try again.');
    }
  },

  async completeGoogleRoleSelection(
    pending: PendingOAuthUser,
    role: 'professor' | 'student',
    department?: string
  ): Promise<UserProfile> {
    try {
      return await userService.createUserProfile({
        uid: pending.uid,
        name: pending.name,
        email: pending.email,
        role,
        department,
        photoURL: pending.photoURL,
      });
    } catch (error) {
      throw toMappedAuthError(error, 'Unable to save your role. Please try again.');
    }
  },

  async sendPasswordReset(email: string): Promise<void> {
    try {
      const auth = requireFirebaseAuth();
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    } catch (error) {
      throw toMappedAuthError(error, 'Unable to send password reset email.');
    }
  },

  async logout(): Promise<void> {
    clearRedirectAttemptFlag();
    if (firebaseAuth) {
      try {
        await signOut(firebaseAuth);
      } catch (error) {
        throw toMappedAuthError(error, 'Unable to sign out right now.');
      }
    }
  },
};
