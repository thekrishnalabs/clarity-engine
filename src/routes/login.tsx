import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { lovable } from "@/integrations/lovable";
import { PageHero } from "@/components/hiren/Section";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — Hiren Kundli" },
      { name: "description", content: "Sign in to Hiren Kundli to access your clarity sessions and applications." },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Sign in failed. Please try again.");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/" });
    } catch {
      toast.error("Sign in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <PageHero eyebrow="Access" title="Sign in" body="Sign in to manage your sessions, applications, and clarity reports." />
      <section className="hk-container pb-20">
        <div className="mx-auto w-full max-w-md">
          <div className="hk-panel rounded-2xl p-8">
            <button
              onClick={() => handleOAuth("google")}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
              aria-label="Sign in with Google"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.48-1.13 2.73-2.41 3.58v2.97h3.89c2.28-2.1 3.57-5.19 3.57-8.79z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.89-2.97c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09C3.25 21.3 7.31 24 12 24z"/>
                <path fill="#FBBC05" d="M5.27 14.32c-.24-.72-.38-1.49-.38-2.32s.14-1.6.38-2.32V6.59H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.41l4.01-3.09z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.23 0 12 0 7.31 0 3.25 2.7 1.26 6.59l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
              </svg>
              {loading ? "Redirecting…" : "Sign in with Google"}
            </button>
            <button
              onClick={() => handleOAuth("apple")}
              disabled={loading}
              className="mt-3 flex w-full items-center justify-center gap-3 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/90 disabled:opacity-60"
              aria-label="Sign in with Apple"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M16.365 1.43c0 1.14-.49 2.27-1.27 3.07-.85.87-2.24 1.55-3.39 1.46-.13-1.13.42-2.31 1.18-3.07.84-.85 2.27-1.5 3.48-1.46zM20.5 17.36c-.6 1.39-.89 2.01-1.66 3.24-1.07 1.71-2.58 3.84-4.46 3.86-1.66.02-2.09-1.08-4.35-1.07-2.26.01-2.73 1.09-4.39 1.07-1.88-.02-3.31-1.95-4.38-3.66C-1.7 16.99-2 11.34.71 8.34c1.31-1.46 3.36-2.39 5.32-2.39 2.04 0 3.32 1.12 5 1.12 1.62 0 2.61-1.12 4.97-1.12 1.78 0 3.66.97 5 2.65-4.4 2.41-3.69 8.7.5 8.76z"/>
              </svg>
              {loading ? "Redirecting…" : "Sign in with Apple"}
            </button>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              By continuing you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
