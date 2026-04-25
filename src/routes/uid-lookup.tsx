import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHero } from "@/components/hiren/Section";
import { supabase } from "@/integrations/supabase/client";

type LookupRow = {
  id: string;
  created_at: string;
  status: string;
  uid: string | null;
  approved_at: string | null;
};

export const Route = createFileRoute("/uid-lookup")({
  head: () => ({ meta: [
    { title: "UID Lookup — Hiren Kundli" },
    { name: "description", content: "Check the status of a Hiren Kundli SPL application by UID or reference ID." },
  ] }),
  component: UidLookupPage,
});

function UidLookupPage() {
  const [result, setResult] = useState<LookupRow | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setSearched(true);
    const q = new FormData(event.currentTarget).get("uid")?.toString().trim() ?? "";
    if (q.length < 4) {
      setError("Enter a valid UID or reference ID.");
      setLoading(false);
      return;
    }
    const { data, error: rpcErr } = await supabase.rpc("lookup_spl_application", { _q: q });
    if (rpcErr) setError("Lookup could not be completed right now.");
    else if (!data || data.length === 0) setError("No application found for this UID.");
    else setResult(data[0] as LookupRow);
    setLoading(false);
  }

  return (
    <>
      <PageHero eyebrow="UID lookup" title="Check your application status." body="Enter the UID or reference ID you received after submitting your SPL application." />
      <section className="hk-container grid gap-6 pb-16 md:grid-cols-[1fr_1fr]">
        <form onSubmit={lookup} className="hk-panel rounded-3xl p-6 md:p-8">
          <label className="grid gap-2 text-sm font-medium">
            UID / Reference ID
            <input name="uid" className="hk-input rounded-xl px-4 py-3 font-mono" placeholder="HK-SPL-20260101-AB12 or reference UUID" />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">Enter the reference ID you received after submitting your SPL application (e.g. HK-SPL-20260101-AB12).</p>
          <button disabled={loading} className="hk-button-primary mt-6 rounded-full px-6 py-3 font-semibold transition disabled:opacity-60">
            {loading ? "Checking..." : "Fetch Status"}
          </button>
          {error && <p className="mt-5 rounded-2xl border border-destructive/40 p-4 text-sm text-destructive">{error}</p>}
        </form>

        <aside className="hk-panel rounded-3xl p-6 md:p-8">
          {!searched && (
            <div className="text-muted-foreground">
              <p className="hk-eyebrow">How it works</p>
              <ul className="mt-4 grid gap-3 text-sm leading-6">
                <li>• <strong className="text-foreground">Pending</strong> — your application is in the daily review queue.</li>
                <li>• <strong className="text-foreground">Approved</strong> — your UID is generated; next-step instructions appear here.</li>
                <li>• <strong className="text-foreground">Rejected</strong> — this slot was not selected; you may reapply later.</li>
              </ul>
            </div>
          )}

          {loading && !result && (
            <p className="text-sm italic text-muted-foreground">Checking...</p>
          )}

          {result && <StatusCard row={result} />}
        </aside>
      </section>
    </>
  );
}

function StatusCard({ row }: { row: LookupRow }) {
  const submitted = new Date(row.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const approved = row.approved_at ? new Date(row.approved_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : null;
  const tone =
    row.status === "approved" ? "hk-gold-text" :
    row.status === "rejected" ? "text-muted-foreground" : "text-foreground";

  return (
    <div>
      <p className="hk-eyebrow">Status</p>
      <p className={`mt-2 font-serif text-4xl capitalize ${tone}`}>{row.status}</p>
      <p className="mt-2 text-xs text-muted-foreground">Submitted {submitted} IST</p>

      {row.status === "pending" && (
        <div className="mt-6 rounded-2xl border p-4 text-sm leading-6 text-muted-foreground">
          Your application is in the queue. We review batches daily — if selected, an invitation will reach you within 24 hours.
        </div>
      )}

      {row.status === "approved" && (
        <div className="mt-6 grid gap-4">
          <div className="rounded-2xl border p-4">
            <p className="text-xs uppercase text-muted-foreground">Your UID</p>
            <p className="hk-gold-text mt-1 break-all font-mono text-xl">{row.uid ?? "—"}</p>
            {approved && <p className="mt-2 text-xs text-muted-foreground">Approved {approved} IST</p>}
          </div>
          <div className="rounded-2xl border p-4 text-sm leading-6 text-muted-foreground">
            <p className="text-foreground font-semibold">Next step</p>
            <ol className="mt-2 grid gap-1">
              <li>1. Save your UID securely.</li>
              <li>2. Watch your WhatsApp for the invitation message.</li>
              <li>3. Confirm the appointment slot when contacted.</li>
            </ol>
          </div>
        </div>
      )}

      {row.status === "rejected" && (
        <div className="mt-6 rounded-2xl border p-4 text-sm leading-6 text-muted-foreground">
          This slot was not selected. You're welcome to reapply on a future day, or explore a paid session via the Book page for guaranteed access.
        </div>
      )}
    </div>
  );
}
