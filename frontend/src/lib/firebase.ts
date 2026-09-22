import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// ── Firebase config loaded from environment variables ─────────────────────────
// Values live in frontend/.env (git-ignored). Copy from the Firebase console:
// Project Settings → Your apps → SDK setup and configuration.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.projectId) {
  console.error(
    '[CafeFlow] ⚠️  VITE_FIREBASE_PROJECT_ID is not set. ' +
    'Copy the VITE_FIREBASE_* variables from .env.example into your .env file.'
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

// Use the designated firestore database ID if specified in config
// When running against emulators (VITE_USE_EMULATOR=true), always use the
// default database because the emulator does not support named databases.
const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true';

export const db = getFirestore(app);

export const storage = getStorage(app);

// Cloud Functions instance — used to call httpsCallable functions from the client
export const functions = getFunctions(app);

// Connect to Firebase Emulator Suite when VITE_USE_EMULATOR=true
// This block only runs once (getApps().length guard above ensures single init)
if (useEmulator) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: false });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.info('[CafeFlow] 🔧 Connected to Firebase Emulator Suite (auth:9099, firestore:8080, functions:5001, storage:9199)');
  } catch (e) {
    // Already connected (e.g. hot reload) — safe to ignore
  }
}

export default app;
