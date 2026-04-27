import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { AdminRoute } from "@/components/auth/RouteGuards";
import { lookupUid, type UidRecord } from "@/lib/firestore";

export const Route = createFileRoute("/shyam/uid-search")({
  head: () => ({ meta: [{ title: "Admin UID Search — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminRoute>
      <UidSearch />
    </AdminRoute>
  ),
});

function UidSearch() {
  const [q, setQ] = useState("");
  const [rec, setRec] = useState<(UidRecord & { id: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setRec(null);
    setBusy(true);
    try {
      const r = await lookupUid(q.trim());
      if (!r) setErr("No record found.");
      else setRec(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="hk-container py-12 md:py-16">
      <h1 className="hk-gold-text font-serif text-3xl md:text-4xl">UID Search</h1>
      <form onSubmit={onSearch} className="mt-8 flex max-w-xl gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="HK-SP-20250101-DEL-XXXX"
          required
          className="flex-1 rounded-xl border bg-background px-4 py-3"
        />
        <button disabled={busy} className="hk-button-primary rounded-full px-5 py-3 font-semibold">{busy ? "…" : "Search"}</button>
      </form>
      {err && <p className="mt-6 text-sm text-destructive">{err}</p>}
      {rec && (
        <pre className="mt-6 max-w-2xl overflow-auto rounded-2xl border bg-card/40 p-5 text-xs">
          {JSON.stringify(rec, null, 2)}
        </pre>
      )}
    </section>
  );
}
