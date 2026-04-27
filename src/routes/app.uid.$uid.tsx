import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/RouteGuards";
import { lookupUid, type UidRecord } from "@/lib/firestore";

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

  useEffect(() => {
    lookupUid(uid)
      .then(setRec)
      .catch((e) => setErr(e instanceof Error ? e.message : "Lookup failed."))
      .finally(() => setLoading(false));
  }, [uid]);

  return (
    <section className="hk-container py-12 md:py-16">
      <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
      <h1 className="hk-gold-text mt-3 font-serif text-3xl md:text-4xl">UID {uid}</h1>

      {loading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
      {err && <p className="mt-6 text-sm text-destructive">{err}</p>}
      {!loading && !rec && <p className="mt-6 text-sm text-muted-foreground">No record found for this UID.</p>}
      {rec && (
        <dl className="mt-8 grid max-w-2xl gap-3 rounded-3xl border bg-card/40 p-6 text-sm">
          <Row k="Session" v={`${rec.session_full_name} (${rec.session_code})`} />
          <Row k="Date of Birth" v={rec.date_of_birth} />
          <Row k="Time of Birth" v={rec.time_of_birth} />
          <Row k="Place of Birth" v={rec.place_of_birth} />
          <Row k="City Code" v={rec.city_code} />
          {rec.notes && <Row k="Notes" v={rec.notes} />}
        </dl>
      )}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 border-b border-border/50 py-2 last:border-b-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
