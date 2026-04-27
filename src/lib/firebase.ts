// Firebase web SDK initialization.
// NOTE: These values are PUBLISHABLE config (not secrets).
// Real security comes from Firestore Security Rules + Lovable Cloud auth.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBglwWFK0JFJLhV8_2M9986t2jPcFERsnk",
  authDomain: "hirenkundli-66005.firebaseapp.com",
  projectId: "hirenkundli-66005",
  storageBucket: "hirenkundli-66005.firebasestorage.app",
  messagingSenderId: "270901111701",
  appId: "1:270901111701:web:fedfebfd91a7c83268649c",
  measurementId: "G-VYCYEDVDJ9",
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function getFbApp(): FirebaseApp {
  if (_app) return _app;
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
  const auth = getFbAuth();
  await setPersistence(auth, browserLocalPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: unknown }).code) : "";
    if (code === "auth/popup-blocked") {
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

// Hardcoded admin allow-list (kept on client AND enforced via Firestore rules).
export const ADMIN_EMAILS = [
  "hirenkundliofficial@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
