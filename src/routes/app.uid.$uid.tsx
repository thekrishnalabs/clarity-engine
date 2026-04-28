import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Copy, Check, Share2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/RouteGuards";
import logoUrl from "@/assets/hiren-kundli-logo.jpg";
import { lookupUid, tsToDate, type UidRecord } from "@/lib/firestore";

export const Route = createFileRoute("/app/uid/$uid")({
  head: () => ({ meta: [{ title: "UID — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ProtectedRoute>
      <UidPage />
    </ProtectedRoute>
  ),
});

function UidPage() {
  const { uid } = Route.useParams();
  const [rec, setRec] = useState<(UidRecord & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    lookupUid(uid)
      .then(setRec)
      .catch((e) => setErr(e instanceof Error ? e.message : "Lookup failed."))
      .finally(() => setLoading(false));
  }, [uid]);

  function copyUid() {
    navigator.clipboard.writeText(uid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function shareSession() {
    if (!rec) return;
    const text = `Booked: ${rec.session_full_name} with Hiren Kundli | ${rec.place_of_birth} | ${format(new Date(), "MMM d, yyyy")}`;
    navigator.clipboard.writeText(text).then(() => {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }).catch(() => {});
  }

  const issuedDate = rec ? tsToDate(rec.created_at) : null;

  return (
    <section className="hk-container py-8 md:py-12">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>

      {loading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
      {err && <p className="mt-6 text-sm text-destructive">{err}</p>}
      {!loading && !rec && <p className="mt-6 text-sm text-muted-foreground">No record found for this UID.</p>}

      {rec && (
        <>
          <div className="mx-auto mt-6 max-w-[480px] rounded-3xl border border-primary/30 bg-card/40 p-7 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <img src={logoUrl} alt="Hiren Kundli" className="h-12 w-12 rounded-full ring-1 ring-primary/40" />
              <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Session Identity Record</p>
            </div>

            <div className="mt-6 text-center">
              <p className="hk-gold-text break-all font-mono text-xl font-bold tracking-wider md:text-2xl">{uid}</p>
              <button
                onClick={copyUid}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-xs text-primary hover:bg-primary/10"
              >
                {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy UID</>}
              </button>
            </div>

            <div className="my-6 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <dl className="grid gap-2.5 text-sm">
              <Row k="Session Name" v={rec.session_full_name} />
              <Row k="Session Code" v={rec.session_code} />
              <Row k="Place" v={rec.place_of_birth} />
              <Row k="Issued" v={issuedDate ? format(issuedDate, "MMMM d, yyyy") : "—"} />
              <div className="grid grid-cols-[140px_1fr] gap-4 py-1">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
                    Confirmed ✓
                  </span>
                </dd>
              </div>
            </dl>

            <div className="my-6 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <p className="text-center text-xs text-muted-foreground">This UID is your session identifier. Keep it private.</p>
          </div>

          <div className="mx-auto mt-8 max-w-[480px]">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Dimensions included in your session</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/dimensions" className="rounded-full border border-border px-3 py-1 text-xs text-foreground/80 hover:border-primary/50 hover:text-primary">Explore Dimensions →</Link>
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-[480px] text-center">
            <button
              onClick={shareSession}
              className="hk-button-outline inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              <Share2 className="h-4 w-4" />
              {shared ? "Copied to clipboard!" : "Share Session"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 py-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-foreground">{v}</dd>
    </div>
  );
}
