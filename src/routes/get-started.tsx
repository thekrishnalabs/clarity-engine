import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuthErrorMessage, signInWithFirebaseApple, signInWithFirebaseGoogle } from "@/lib/firebase";
import logoUrl from "@/assets/hiren-kundli-logo.jpg";

export const Route = createFileRoute("/get-started")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" && search.redirect.startsWith("/") ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Get Started — Hiren Kundli" },
      { name: "description", content: "Begin your session journey. Continue with Google." },
    ],
  }),
  component: GetStartedPage,
});

function GetStartedPage() {
  const search = Route.useSearch();
  const redirect = search.redirect ?? "/app";
  const { user, isLoading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) window.location.assign(redirect);
  }, [user, isLoading, redirect]);

  async function signIn(provider: "google" | "apple") {
    setError(null);
    setBusy(true);
    try {
      const credential = provider === "google" ? await signInWithFirebaseGoogle() : await signInWithFirebaseApple();
      if (credential) window.location.assign(redirect);
    } catch (e) {
      setError(getFirebaseAuthErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <section className="hk-container flex min-h-[80vh] flex-col items-center justify-center py-16">
      <img src={logoUrl} alt="Hiren Kundli" className="h-20 w-20 rounded-full ring-1 ring-primary/40" />
      <h1 className="hk-gold-text mt-6 font-serif text-3xl font-bold md:text-4xl">Hiren Kundli</h1>
      <p className="mt-2 text-sm text-muted-foreground">Decoding Time · Karma · Decisions</p>

      <div className="mt-10 w-full max-w-sm rounded-3xl border bg-card/40 p-6 md:p-8">
        <h2 className="text-center font-serif text-xl">Begin your session journey</h2>

        <button
          disabled={busy}
          onClick={() => signIn("google")}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.57 2.69-3.88 2.69-6.61z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.99-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"/>
          </svg>
          {busy ? "Connecting…" : "Continue with Google"}
        </button>

        <button
          disabled={busy}
          onClick={() => signIn("apple")}
          className="mt-3 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground transition hover:bg-muted disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M16.365 1.43c0 1.14-.467 2.213-1.185 3.03-.773.88-2.047 1.56-3.08 1.47-.13-1.092.38-2.24 1.088-3.035C13.973 2.01 15.318 1.335 16.365 1.43ZM20.83 17.12c-.56 1.28-.83 1.85-1.55 2.98-1.005 1.535-2.42 3.45-4.17 3.465-1.557.015-1.958-1.015-4.073-1.005-2.112.01-2.552 1.022-4.112 1.007-1.75-.015-3.087-1.742-4.092-3.277C.03 16.005-.265 10.97 1.515 8.215c1.265-1.958 3.26-3.102 5.14-3.102 1.912 0 3.115 1.047 4.697 1.047 1.535 0 2.47-1.05 4.682-1.05 1.672 0 3.445.91 4.705 2.482-4.135 2.267-3.465 8.172.09 9.527Z" />
          </svg>
          {busy ? "Connecting…" : "Continue with Apple"}
        </button>

        {error && <p className="mt-4 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}

        <p className="mt-6 text-center text-xs text-muted-foreground">By continuing, you agree to our terms.</p>
      </div>
    </section>
  );
}
