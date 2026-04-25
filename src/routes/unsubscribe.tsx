import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHero } from "@/components/hiren/Section";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>) => ({ token: typeof search.token === "string" ? search.token : "" }),
  head: () => ({ meta: [{ title: "Unsubscribe — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"checking" | "valid" | "already" | "invalid" | "done" | "error">("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setState("valid");
        else if (d.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await res.json();
      if (d.success) setState("done");
      else if (d.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHero eyebrow="Email" title="Unsubscribe from Hiren Kundli emails." body="Confirm below to stop receiving emails at this address." />
      <section className="hk-container pb-16">
        <div className="hk-panel max-w-xl rounded-3xl p-6 md:p-8">
          {state === "checking" && <p className="text-muted-foreground">Checking link...</p>}
          {state === "valid" && (
            <>
              <p className="text-muted-foreground">Click below to confirm and stop all future emails to this address.</p>
              <button disabled={busy} onClick={confirm} className="hk-button-primary mt-5 rounded-full px-6 py-3 font-semibold disabled:opacity-60">
                {busy ? "Working..." : "Confirm Unsubscribe"}
              </button>
            </>
          )}
          {state === "done" && <p className="hk-gold-text font-semibold">You have been unsubscribed.</p>}
          {state === "already" && <p className="text-muted-foreground">This email is already unsubscribed.</p>}
          {state === "invalid" && <p className="text-muted-foreground">This unsubscribe link is invalid or expired.</p>}
          {state === "error" && <p className="text-muted-foreground">Something went wrong. Please try again later.</p>}
        </div>
      </section>
    </>
  );
}
