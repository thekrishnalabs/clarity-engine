import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminRoute } from "@/components/auth/RouteGuards";
import { attachUidToBooking, createUidRecord, listAllBookings, type SessionBooking } from "@/lib/firestore";
import { cityCodeFrom, generateUid } from "@/lib/uid";

export const Route = createFileRoute("/shyam/bookings")({
  head: () => ({ meta: [{ title: "Admin Bookings — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminRoute>
      <BookingsAdmin />
    </AdminRoute>
  ),
});

function BookingsAdmin() {
  const [items, setItems] = useState<(SessionBooking & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listAllBookings());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function generate(b: SessionBooking & { id: string }) {
    setBusyId(b.id);
    try {
      const cityCode = cityCodeFrom(b.place_of_birth);
      const uid = generateUid({
        sessionCode: b.session_code,
        dateOfBirth: b.date_of_birth,
        cityCode,
      });
      await createUidRecord({
        uid,
        session_code: b.session_code,
        session_full_name: b.session_full_name,
        date_of_birth: b.date_of_birth,
        time_of_birth: b.time_of_birth,
        place_of_birth: b.place_of_birth,
        city_code: cityCode,
        user_name: b.user_name,
        user_phone: b.user_phone,
        user_lovable_uid: b.user_lovable_uid ?? null,
        notes: b.notes,
      });
      await attachUidToBooking(b.id, uid);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to generate UID.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="hk-container py-12 md:py-16">
      <h1 className="hk-gold-text font-serif text-3xl md:text-4xl">Bookings</h1>
      {loading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
      {err && <p className="mt-6 text-sm text-destructive">{err}</p>}

      <ul className="mt-8 grid gap-4">
        {items.map((b) => (
          <li key={b.id} className="rounded-2xl border bg-card/40 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="hk-gold-text font-serif text-lg">{b.user_name}</p>
                <p className="text-xs text-muted-foreground">{b.user_phone} · {b.user_email}</p>
                <p className="mt-1 text-sm">{b.session_full_name} ({b.session_code})</p>
              </div>
              <span className="rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider">{b.status}</span>
            </div>
            <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
              <span>DOB: {b.date_of_birth}</span>
              <span>TOB: {b.time_of_birth}</span>
              <span>Place: {b.place_of_birth}</span>
            </div>
            <p className="mt-3 whitespace-pre-line rounded-xl border bg-background/40 p-3 text-sm">{b.notes}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {b.generated_uid ? (
                <span className="text-sm text-primary">UID: {b.generated_uid}</span>
              ) : (
                <button
                  disabled={busyId === b.id}
                  onClick={() => generate(b)}
                  className="hk-button-primary rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {busyId === b.id ? "Generating…" : "Generate UID"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
