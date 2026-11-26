export const GOOGLE_REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/unauthorized-domain',
  'auth/operation-not-supported-in-this-environment',
]);

export class AuthMappedError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null) {
    super(message);
    this.name = 'AuthMappedError';
    this.code = code;
  }
}

export function extractFirebaseErrorCode(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string') {
    return (error as { code: string }).code.toLowerCase();
  }
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/\((auth\/[a-z0-9-]+|[a-z0-9-]+\/[a-z0-9-]+)\)/i);
  return match ? match[1].toLowerCase() : null;
}

export function isUnauthorizedDomainError(error: unknown): boolean {
  return extractFirebaseErrorCode(error) === 'auth/unauthorized-domain';
}

export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function shouldFallbackToRedirect(error: unknown, alreadyAttemptedRedirect: boolean): boolean {
  if (alreadyAttemptedRedirect) return false;
  const code = extractFirebaseErrorCode(error);
  return Boolean(code && GOOGLE_REDIRECT_FALLBACK_CODES.has(code));
}

export function mapFirebaseError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const code = extractFirebaseErrorCode(error);

  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Add this domain in Firebase Console > Authentication > Settings > Authorized domains, then try again.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password. Please check your credentials and try again.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes before trying again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled before finishing.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Redirecting to Google sign-in...';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in window is already open. Please complete or close it.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is disabled. Enable it in Firebase Console > Authentication > Sign-in method.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'Popup sign-in is not supported in this browser environment. Try opening the app in a new tab.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your institution administrator.';
    case 'auth/requires-recent-login':
      return 'Please sign in again to complete this security-sensitive action.';
    case 'auth/configuration-not-found':
    case 'auth/invalid-api-key':
      return 'Firebase Authentication is not properly configured. Check your Firebase environment variables.';
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'Access denied by Firestore security rules. Verify your Firestore rules for this collection.';
    case 'unavailable':
    case 'firestore/unavailable':
      return 'Unable to reach the database right now. Please check your connection and try again.';
    default:
      break;
  }

  if (error instanceof Error) {
    const msg = error.message.trim();
    if (!msg || /^Firebase:\s*Error/i.test(msg) || /auth\/[a-z-]+/i.test(msg)) {
      return fallback;
    }
    return msg;
  }

  return fallback;
}
