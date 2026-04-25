import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHero } from "@/components/hiren/Section";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        if (data.session) {
          await supabase.rpc("claim_first_admin");
          navigate({ to: "/admin/dashboard" });
          return;
        }
        setMessage("Account created. Check your email to confirm, then sign in. The first confirmed admin will be auto-granted access.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await supabase.rpc("claim_first_admin");
        navigate({ to: "/admin/dashboard" });
      }
    } catch (err: any) {
      setMessage(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHero eyebrow="Admin" title="Admin access only." body="Sign in to review and approve SPL applications and view bookings. This area is restricted." />
      <section className="hk-container pb-16">
        <form onSubmit={handleSubmit} className="hk-panel max-w-md rounded-3xl p-6 md:p-8">
          <label className="grid gap-2 text-sm font-medium">Email
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="hk-input rounded-xl px-4 py-3" />
          </label>
          <label className="mt-4 grid gap-2 text-sm font-medium">Password
            <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="hk-input rounded-xl px-4 py-3" />
          </label>
          <button disabled={loading} className="hk-button-primary mt-6 w-full rounded-full px-6 py-3 font-semibold disabled:opacity-60">
            {loading ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground">
            {mode === "signin" ? "First admin? Create account →" : "Already have an account? Sign in →"}
          </button>
          {message && <p className="mt-5 rounded-2xl border p-4 text-sm text-muted-foreground">{message}</p>}
        </form>
      </section>
    </>
  );
}
