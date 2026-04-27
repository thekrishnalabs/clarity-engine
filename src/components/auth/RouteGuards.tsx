import { Navigate } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/get-started" />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user || !isAdmin) return <Navigate to="/shyam" />;
  return <>{children}</>;
}
