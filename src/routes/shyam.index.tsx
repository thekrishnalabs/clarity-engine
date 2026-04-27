import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuthErrorMessage, signInWithFirebaseApple, signInWithFirebaseGoogle } from "@/lib/firebase";

export const Route = createFileRoute("/shyam/")({
  head: () => ({ meta: [{ title: "Admin — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: ShyamSignIn,
});

function ShyamSignIn() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (user && isAdmin) navigate({ to: "/shyam/dashboard" });
  }, [user, isAdmin, isLoading, navigate]);

  async function signIn(provider: "google" | "apple") {
    setErr(null);
    setBusy(true);
    try {
      const credential = provider === "google" ? await signInWithFirebaseGoogle() : await signInWithFirebaseApple();
      if (credential) navigate({ to: "/shyam/dashboard" });
    } catch (e) {
      setErr(getFirebaseAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="hk-container flex min-h-[70vh] flex-col items-center justify-center py-16">
      <div className="w-full max-w-sm rounded-3xl border bg-card/40 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 text-primary">🔒</div>
        <h1 className="hk-gold-text mt-4 font-serif text-2xl">Admin Access</h1>
        <p className="mt-1 text-sm text-muted-foreground">Restricted — Authorized only</p>

        <button
          disabled={busy}
          onClick={() => signIn("google")}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-60"
        >
          {busy ? "Connecting…" : "Sign in with Google"}
        </button>

        <button
          disabled={busy}
          onClick={() => signIn("apple")}
          className="mt-3 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground transition hover:bg-muted disabled:opacity-60"
        >
          {busy ? "Connecting…" : "Sign in with Apple"}
        </button>

        {user && !isAdmin && (
          <p className="mt-5 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">
            Access denied. Not an authorized admin.
          </p>
        )}
        {err && <p className="mt-5 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{err}</p>}
      </div>
    </section>
  );
}
