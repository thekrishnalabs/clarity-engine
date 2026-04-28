import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { getFbAuth, isAdminEmail } from "@/lib/firebase";
import { getAdminRole, type AdminRoleType } from "@/lib/firestore";
import { getFirebaseAnalytics } from "@/services/analyticsService";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  adminRole: AdminRoleType | null;
  isSuperAdmin: boolean;
  isAdmin: boolean; // strictly the "admin" role (not superadmin, not viewer)
  isViewer: boolean;
  isAnyAdmin: boolean; // any of superadmin | admin | viewer
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<AdminRoleType | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFbAuth(), (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });
    void getFirebaseAnalytics();
    return unsubscribe;
  }, []);

  useEffect(() => {
    const email = user?.email;
    if (!email) {
      setAdminRole(null);
      return;
    }
    setRoleLoading(true);
    getAdminRole(email)
      .then(({ role }) => {
        // Hard-coded superadmin fallback so seed user always works.
        if (!role && isAdminEmail(email)) {
          setAdminRole("superadmin");
        } else {
          setAdminRole(role);
        }
      })
      .catch(() => {
        setAdminRole(isAdminEmail(email) ? "superadmin" : null);
      })
      .finally(() => setRoleLoading(false));
  }, [user?.email]);

  const signOut = async () => {
    await firebaseSignOut(getFbAuth());
  };

  const isSuperAdmin = adminRole === "superadmin";
  const isAdmin = adminRole === "admin";
  const isViewer = adminRole === "viewer";
  const isAnyAdmin = adminRole !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading || roleLoading,
        adminRole,
        isSuperAdmin,
        isAdmin,
        isViewer,
        isAnyAdmin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
