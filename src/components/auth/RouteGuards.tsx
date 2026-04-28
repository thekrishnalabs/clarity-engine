import { Navigate, useLocation } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05050f]">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-xs text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/get-started" search={{ redirect: location.pathname }} replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAnyAdmin, isLoading, roleLoading } = useAuth();
  if (isLoading || roleLoading) return <FullScreenLoader />;
  if (!user || !isAnyAdmin) return <Navigate to="/shyam" replace />;
  return <>{children}</>;
}

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin, isLoading, roleLoading } = useAuth();
  if (isLoading || roleLoading) return <FullScreenLoader />;
  if (!user || !isSuperAdmin) return <Navigate to="/shyam/dashboard" replace />;
  return <>{children}</>;
}
