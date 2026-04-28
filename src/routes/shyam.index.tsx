import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFbAuth, getFirebaseAuthErrorMessage, signInWithFirebaseGoogle, signOutUser } from "@/lib/firebase";
import { getAdminRole } from "@/lib/firestore";
import { executeRecaptcha } from "@/lib/recaptcha";
import { verifyRecaptcha } from "@/server/recaptcha.functions";

export const Route = createFileRoute("/shyam/")({
  head: () => ({ meta: [{ title: "Admin — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: ShyamSignIn,
});

function ShyamSignIn() {
  const navigate = useNavigate();
  const { user, isAnyAdmin, isLoading, roleLoading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || roleLoading) return;
    if (user && isAnyAdmin) navigate({ to: "/shyam/dashboard" });
  }, [user, isAnyAdmin, isLoading, roleLoading, navigate]);

  async function signIn() {
    setErr(null);
    setBusy(true);
    try {
      const token = await executeRecaptcha("ADMIN_LOGIN");
      if (!token) throw new Error("Security check failed. Please refresh and try again.");
      const verdict = await verifyRecaptcha({ data: { token, action: "ADMIN_LOGIN" } });
      if (!verdict.ok) throw new Error("Security verification failed. Please try again.");
      const credential = await signInWithFirebaseGoogle();
      const email = credential?.user.email ?? null;
      if (!email) {
        setBusy(false);
        return;
      }
      const { role, isActive } = await getAdminRole(email);
      // Allow seed superadmin email even if Firestore doc not yet created
      const seedSuper = email.toLowerCase() === "hirenkundliofficial@gmail.com";
      if ((!role || !isActive) && !seedSuper) {
        await signOutUser().catch(() => {});
        setErr("Access denied. You are not an authorized admin.");
        setBusy(false);
        return;
      }
      navigate({ to: "/shyam/dashboard" });
    } catch (e) {
      setErr(getFirebaseAuthErrorMessage(e));
      setBusy(false);
    }
  }
  void getFbAuth;

  return (
    <section className="hk-container flex min-h-[70vh] flex-col items-center justify-center py-16">
      <div className="w-full max-w-sm rounded-3xl border bg-card/40 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 text-primary">🔒</div>
        <h1 className="hk-gold-text mt-4 font-serif text-2xl">Admin Access</h1>
        <p className="mt-1 text-sm text-muted-foreground">Restricted — Authorized only</p>

        <button
          disabled={busy}
          onClick={signIn}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-60"
        >
          {busy ? "Connecting…" : "Sign in with Google"}
        </button>

        {user && !isAnyAdmin && !isLoading && !roleLoading && (
          <p className="mt-5 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">
            Access denied. Not an authorized admin.
          </p>
        )}
        {err && <p className="mt-5 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{err}</p>}
      </div>
    </section>
  );
}
