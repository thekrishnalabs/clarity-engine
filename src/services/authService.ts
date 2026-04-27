// Firebase Authentication service — Google Sign-In via popup.
import {
  AuthErrorCodes,
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
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

export async function signInWithGoogle(): Promise<UserCredential | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithProvider(provider);
}

export async function signInWithApple(): Promise<UserCredential | null> {
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
    return "This domain is not authorized for sign-in.";
  }
  if (code === AuthErrorCodes.POPUP_CLOSED_BY_USER) {
    return "Sign-in was cancelled.";
  }
  return error instanceof Error ? error.message : "Sign-in failed.";
}

async function signInWithProvider(
  provider: GoogleAuthProvider | OAuthProvider,
): Promise<UserCredential | null> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    const code = typeof e === "object" && e !== null && "code" in e
      ? String((e as { code?: unknown }).code)
      : "";
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw e;
  }
}

// Admin allow-list for UI gating; mirror this in Firestore Security Rules.
export const ADMIN_EMAILS = ["hirenkundliofficial@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
