// Firebase Analytics service — browser-only, lazy-initialized.
// Uses isSupported() to avoid crashes in SSR or unsupported environments
// (e.g., some in-app browsers, or when measurementId is missing).
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getFirebaseApp } from "./firebaseConfig";

let _analytics: Analytics | null = null;
let _initPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (_analytics) return Promise.resolve(_analytics);
  if (_initPromise) return _initPromise;

  _initPromise = isSupported()
    .then((supported) => {
      if (!supported) return null;
      _analytics = getAnalytics(getFirebaseApp());
      return _analytics;
    })
    .catch(() => null);

  return _initPromise;
}
