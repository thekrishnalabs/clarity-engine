// Firebase configuration & initialization (modular SDK v9+).
// Values come from VITE_* environment variables when available, with
// hardcoded publishable fallbacks so the app works on every host
// (preview, Vercel, custom domains) without manual env setup.
//
// NOTE: Firebase web config values are PUBLISHABLE — they are designed
// to be shipped to the browser. Real security comes from Firebase Auth
// rules and Firestore Security Rules.
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? "AIzaSyBglwWFK0JFJLhV8_2M9986t2jPcFERsnk",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "hirenkundli-66005.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "hirenkundli-66005",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "hirenkundli-66005.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "270901111701",
  appId: env.VITE_FIREBASE_APP_ID ?? "1:270901111701:web:fedfebfd91a7c83268649c",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-VYCYEDVDJ9",
};

let _app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}
