// Backward-compatible shim that re-exports from the modular service files.
// New code should import directly from `@/services/*`.
export {
  getFirebaseAuth as getFbAuth,
  signInWithGoogle as signInWithFirebaseGoogle,
  signInWithApple as signInWithFirebaseApple,
  getAuthErrorMessage as getFirebaseAuthErrorMessage,
  signOutUser,
  ADMIN_EMAILS,
  isAdminEmail,
} from "@/services/authService";

export {
  getFirestoreDb as getDb,
  getFirebaseStorage as getFbStorage,
} from "@/services/firestoreService";
