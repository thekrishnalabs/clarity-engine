// Firebase web SDK initialization.
// NOTE: These values are PUBLISHABLE config (not secrets).
// Real security comes from Firebase Auth + Firestore Security Rules.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  AuthErrorCodes,
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

function assertFirebaseConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Firebase config is missing from this deployment: ${missing.join(", ")}. Add FIREBASE_* or VITE_FIREBASE_* environment variables and redeploy.`);
  }
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function getFbApp(): FirebaseApp {
  if (_app) return _app;
  assertFirebaseConfig();
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

export function getDb(): Firestore {
  if (typeof window === "undefined") {
    throw new Error("Firestore is browser-only in this app.");
  }
  if (_db) return _db;
  _db = getFirestore(getFbApp());
  return _db;
}

export function getFbAuth(): Auth {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth is browser-only in this app.");
  }
  if (_auth) return _auth;
  _auth = getAuth(getFbApp());
  return _auth;
}

export async function signInWithFirebaseGoogle(): Promise<UserCredential | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithFirebaseProvider(provider);
}

export async function signInWithFirebaseApple(): Promise<UserCredential | null> {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return signInWithFirebaseProvider(provider);
}

export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code === "auth/invalid-credential") {
    return "Firebase rejected this sign-in because this deployment is using invalid or mismatched provider credentials.";
  }
  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized for Firebase sign-in.";
  }
  if (code === AuthErrorCodes.POPUP_CLOSED_BY_USER) {
    return "Sign-in was cancelled.";
  }
  return error instanceof Error ? error.message : "Sign-in failed.";
}

async function signInWithFirebaseProvider(provider: GoogleAuthProvider | OAuthProvider): Promise<UserCredential | null> {
  const auth = getFbAuth();
  await setPersistence(auth, browserLocalPersistence);
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: unknown }).code) : "";
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw e;
  }
}

export function getFbStorage(): FirebaseStorage {
  if (typeof window === "undefined") {
    throw new Error("Firebase Storage is browser-only in this app.");
  }
  if (_storage) return _storage;
  _storage = getStorage(getFbApp());
  return _storage;
}

// Admin allow-list for UI gating; keep the same email enforced in Firestore rules.
export const ADMIN_EMAILS = [
  "hirenkundliofficial@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
