import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID as string | undefined;

function hasValidEnv(val: string | undefined, placeholder?: string): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (placeholder && trimmed === placeholder) return false;
  return true;
}

export const isFirebaseConfigured = Boolean(
  hasValidEnv(firebaseConfig.apiKey, 'your_firebase_api_key') &&
    hasValidEnv(firebaseConfig.projectId, 'your_project_id') &&
    hasValidEnv(firebaseConfig.appId, 'your_app_id')
);

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;
let firebaseStorage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = databaseId ? getFirestore(firebaseApp, databaseId) : getFirestore(firebaseApp);
  if (firebaseConfig.storageBucket) {
    firebaseStorage = getStorage(firebaseApp);
  }
}

export interface FirebaseEnvPresence {
  VITE_FIREBASE_API_KEY: boolean;
  VITE_FIREBASE_AUTH_DOMAIN: boolean;
  VITE_FIREBASE_PROJECT_ID: boolean;
  VITE_FIREBASE_STORAGE_BUCKET: boolean;
  VITE_FIREBASE_MESSAGING_SENDER_ID: boolean;
  VITE_FIREBASE_APP_ID: boolean;
}

/**
 * Returns strictly boolean presence flags for Firebase env vars.
 * Never returns or logs actual config values.
 */
export function getFirebaseEnvPresence(): FirebaseEnvPresence {
  return {
    VITE_FIREBASE_API_KEY: hasValidEnv(firebaseConfig.apiKey, 'your_firebase_api_key'),
    VITE_FIREBASE_AUTH_DOMAIN: hasValidEnv(firebaseConfig.authDomain, 'your_project.firebaseapp.com'),
    VITE_FIREBASE_PROJECT_ID: hasValidEnv(firebaseConfig.projectId, 'your_project_id'),
    VITE_FIREBASE_STORAGE_BUCKET: hasValidEnv(firebaseConfig.storageBucket),
    VITE_FIREBASE_MESSAGING_SENDER_ID: hasValidEnv(firebaseConfig.messagingSenderId),
    VITE_FIREBASE_APP_ID: hasValidEnv(firebaseConfig.appId, 'your_app_id'),
  };
}

export function getFirebaseInitStatus() {
  return {
    configured: isFirebaseConfigured,
    appInitialized: Boolean(firebaseApp),
    authReady: Boolean(firebaseAuth),
    firestoreReady: Boolean(firebaseDb),
    storageReady: Boolean(firebaseStorage),
  };
}

export function requireFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    throw new Error(
      'Firebase is not configured yet. Add your VITE_FIREBASE_* environment variables and restart the app.'
    );
  }
  return firebaseAuth;
}

export function requireFirebaseDb(): Firestore {
  if (!firebaseDb) {
    throw new Error(
      'Firestore is not configured yet. Add your VITE_FIREBASE_* environment variables and restart the app.'
    );
  }
  return firebaseDb;
}

export function requireFirebaseStorage(): FirebaseStorage {
  if (!firebaseStorage) {
    throw new Error(
      'Firebase Storage is not configured. Add VITE_FIREBASE_STORAGE_BUCKET and enable Storage in Firebase Console.'
    );
  }
  return firebaseStorage;
}

export { firebaseApp, firebaseAuth, firebaseDb, firebaseStorage };
