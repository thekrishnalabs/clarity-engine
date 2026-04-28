import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuthErrorMessage, signInWithFirebaseGoogle } from "@/lib/firebase";
import { lovable } from "@/integrations/lovable";
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

  async function signIn() {
    setError(null);
    setBusy(true);
    try {
      const credential = await signInWithFirebaseGoogle();
      if (credential) window.location.assign(redirect);
    } catch (e) {
      setError(getFirebaseAuthErrorMessage(e));
      setBusy(false);
    }
  }

  async function signInApple() {
    setError(null);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin + redirect,
      });
      if (result.error) {
        setError(result.error.message ?? "Apple sign-in failed.");
        setBusy(false);
        return;
      }
      if (result.redirected) return; // browser is navigating
      window.location.assign(redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apple sign-in failed.");
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
          onClick={signIn}
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
          onClick={signInApple}
          className="mt-3 flex w-full items-center justify-center gap-3 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-60"
        >
          <svg width="16" height="18" viewBox="0 0 384 512" aria-hidden="true" fill="currentColor">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM256.4 84.5c30.1-35.7 27.4-68.2 26.5-79.9-26.6 1.5-57.4 18.1-75 38.5-19.4 21.9-30.8 49-28.3 78.9 28.7 2.2 54.9-12.6 76.8-37.5z"/>
          </svg>
          {busy ? "Connecting…" : "Continue with Apple"}
        </button>

        {error && <p className="mt-4 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}

        <p className="mt-6 text-center text-xs text-muted-foreground">By continuing, you agree to our terms.</p>
      </div>
    </section>
  );
}
