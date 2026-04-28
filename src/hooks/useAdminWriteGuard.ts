import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Wraps admin write actions:
 * - viewer: blocks entirely (returns false)
 * - superadmin: runs immediately
 * - admin: opens password modal; runs only after verified
 *
 * Usage:
 *   const { request, modalProps } = useAdminWriteGuard();
 *   request(() => doSomething());
 *   ...
 *   <SessionPasswordModal {...modalProps} />
 */
export function useAdminWriteGuard() {
  const { isSuperAdmin, isViewer } = useAuth();
  const [pending, setPending] = useState<(() => void | Promise<void>) | null>(null);

  const request = useCallback(
    (action: () => void | Promise<void>) => {
      if (isViewer) return false;
      if (isSuperAdmin) {
        void action();
        return true;
      }
      setPending(() => action);
      return true;
    },
    [isSuperAdmin, isViewer],
  );

  const onSuccess = useCallback(() => {
    const p = pending;
    setPending(null);
    if (p) void p();
  }, [pending]);

  const onCancel = useCallback(() => setPending(null), []);

  return {
    request,
    canWrite: !isViewer,
    modalProps: { isOpen: pending !== null, onSuccess, onCancel },
  };
}
