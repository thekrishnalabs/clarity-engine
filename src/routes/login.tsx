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

  const handleApple = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
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
    <Section title="Sign in" eyebrow="Access" description="Sign in to manage your sessions, applications, and clarity reports.">
      <div className="mx-auto w-full max-w-md">
        <div className="hk-panel rounded-2xl p-8">
          <button
            onClick={handleApple}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
            aria-label="Sign in with Apple"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M16.365 1.43c0 1.14-.43 2.21-1.16 3.01-.78.86-2.04 1.52-3.06 1.44-.13-1.11.42-2.27 1.13-3.02.79-.84 2.13-1.46 3.09-1.43zM20.5 17.06c-.56 1.29-.83 1.87-1.55 3.02-1 1.59-2.41 3.57-4.16 3.59-1.55.02-1.95-1.01-4.06-1-2.11.01-2.55 1.02-4.1 1-1.75-.02-3.08-1.81-4.08-3.4C-.21 16.5-.51 11.06 1.6 8.16c1.5-2.06 3.86-3.27 6.07-3.27 2.25 0 3.67 1.23 5.53 1.23 1.81 0 2.91-1.23 5.51-1.23 1.97 0 4.05 1.07 5.53 2.93-4.86 2.66-4.07 9.59-3.74 9.24z"/>
            </svg>
            {loading ? "Redirecting…" : "Sign in with Apple"}
          </button>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </Section>
  );
}
