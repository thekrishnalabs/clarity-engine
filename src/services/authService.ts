// Firebase Authentication service — Google/Apple Sign-In via popup ONLY.
//
// IMPORTANT: We never use signInWithRedirect, because this app is often
// embedded inside an iframe (Lovable preview, etc.) where redirect-based
// OAuth is blocked by the browser's third-party storage partitioning and
// by Google's `frame-ancestors` policy. A popup always opens as a top-level
// browsing context and works reliably across embedded and standalone hosts.
import {
  AuthErrorCodes,
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  setPersistence,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseApp } from "./firebaseConfig";

let _auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth is browser-only in this app.");
  }
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

/** True when the app is rendered inside an <iframe> (e.g. Lovable preview). */
function isInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin access throws — that itself means we're framed.
    return true;
  }
}

/**
 * If we're inside an iframe (preview/sandbox), Google's OAuth screen refuses
 * to render and popups opened from the iframe inherit a partitioned storage
 * context that blocks Firebase's postMessage handshake. The fix: re-open the
 * current page in a brand-new top-level tab so the user can sign in there.
 */
function openInNewTabIfFramed(): boolean {
  if (!isInIframe()) return false;
  const url = window.location.href;
  // `noopener` ensures the new tab is fully top-level and not a child window.
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export async function signInWithGoogle(): Promise<UserCredential | null> {
  if (openInNewTabIfFramed()) return null;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithProvider(provider);
}

export async function signInWithApple(): Promise<UserCredential | null> {
  if (openInNewTabIfFramed()) return null;
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return signInWithProvider(provider);
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

export function getAuthErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
  if (code === "auth/invalid-credential") {
    return "Sign-in rejected — invalid or mismatched provider credentials.";
  }
  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized for sign-in. Add it in Firebase Auth settings.";
  }
  if (code === "auth/popup-blocked") {
    return "Popup blocked by your browser. Please allow popups for this site and try again.";
  }
  if (code === "auth/popup-closed-by-user" || code === AuthErrorCodes.POPUP_CLOSED_BY_USER) {
    return "Sign-in was cancelled.";
  }
  if (code === "auth/cancelled-popup-request") {
    return "Another sign-in attempt is already in progress.";
  }
  if (code === "auth/operation-not-supported-in-this-environment") {
    return "Sign-in isn't supported here. Open the site in a new browser tab and try again.";
  }
  return error instanceof Error ? error.message : "Sign-in failed.";
}

async function signInWithProvider(
  provider: GoogleAuthProvider | OAuthProvider,
): Promise<UserCredential | null> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  // Popup-only. No redirect fallback — redirect breaks inside iframes and
  // on sandboxed hosts.
  return await signInWithPopup(auth, provider);
}

// Admin allow-list for UI gating; mirror this in Firestore Security Rules.
export const ADMIN_EMAILS = ["hirenkundliofficial@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
