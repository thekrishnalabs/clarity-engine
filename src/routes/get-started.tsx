import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import logoUrl from "@/assets/hiren-kundli-logo.jpg";

export const Route = createFileRoute("/get-started")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" && search.redirect.startsWith("/") ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Get Started — Hiren Kundli" },
      { name: "description", content: "Begin your session journey. Continue with Google or Apple." },
    ],
  }),
  component: GetStartedPage,
});

function GetStartedPage() {
  const search = Route.useSearch();
  const redirect = search.redirect ?? "/app";
  const { user, isLoading } = useAuth();
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) window.location.assign(redirect);
  }, [user, isLoading, redirect]);

  async function signIn(provider: "google" | "apple") {
    setError(null);
    setBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}${redirect}`,
      });
      if (result.error) {
        setError(result.error.message ?? "Sign-in failed.");
        setBusy(null);
        return;
      }
      if (result.redirected) return;
      window.location.assign(redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
      setBusy(null);
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
          disabled={busy !== null}
          onClick={() => signIn("google")}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.57 2.69-3.88 2.69-6.61z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.99-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"/>
          </svg>
          {busy === "google" ? "Connecting…" : "Continue with Google"}
        </button>

        <button
          disabled={busy !== null}
          onClick={() => signIn("apple")}
          className="mt-3 flex w-full items-center justify-center gap-3 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-900 disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16.365 1.43c0 1.14-.49 2.27-1.36 3.1-.92.87-2.36 1.55-3.5 1.46-.13-1.13.45-2.34 1.34-3.18.94-.9 2.49-1.55 3.52-1.38zm4.05 17.24c-.6 1.36-.89 1.97-1.66 3.18-1.08 1.69-2.6 3.79-4.49 3.81-1.68.02-2.11-1.1-4.39-1.09-2.28.02-2.76 1.11-4.44 1.09-1.89-.02-3.34-1.92-4.42-3.61C-2.05 17.92-2.34 12.05.13 8.93 1.4 7.36 3.4 6.35 5.5 6.31c1.71-.03 3.32 1.16 4.39 1.16 1.06 0 3.05-1.43 5.14-1.22.88.04 3.34.36 4.92 2.7-4.32 2.36-3.62 8.59 1.07 9.72z"/>
          </svg>
          {busy === "apple" ? "Connecting…" : "Continue with Apple"}
        </button>

        {error && <p className="mt-4 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}

        <p className="mt-6 text-center text-xs text-muted-foreground">By continuing, you agree to our terms.</p>
      </div>
    </section>
  );
}
