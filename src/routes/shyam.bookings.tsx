import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminRoute } from "@/components/auth/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import {
  attachUidToBooking,
  createUidRecord,
  listAllBookings,
  listSplApplications,
  setSplApplicationStatus,
  type SessionBooking,
  type SplApplication,
} from "@/lib/firestore";
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
  const { user } = useAuth();
  const [items, setItems] = useState<(SessionBooking & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listAllBookings(user?.email));
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
      }, user?.email);
      await attachUidToBooking(b.id, uid, user?.email);
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

      <SplApplicationsSection />
    </section>
  );
}

function SplApplicationsSection() {
  const { user } = useAuth();
  const [apps, setApps] = useState<(SplApplication & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setApps(await listSplApplications(user?.email));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function updateStatus(id: string, status: SplApplication["status"]) {
    setBusyId(id);
    try {
      await setSplApplicationStatus(id, status, user?.email);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update status.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-16">
      <h2 className="hk-gold-text font-serif text-2xl md:text-3xl">SPL Applications</h2>
      <p className="mt-1 text-sm text-muted-foreground">Silver Prime Lite — selective approval queue.</p>

      {loading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}

      <ul className="mt-6 grid gap-4">
        {apps.map((a) => (
          <li key={a.id} className="rounded-2xl border bg-card/40 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="hk-gold-text font-serif text-lg">{a.q1}</p>
                <p className="text-xs text-muted-foreground">WhatsApp: {a.q2}</p>
                <p className="mt-1 text-xs text-muted-foreground">DOB: {a.q3} · TOB: {a.q4} · Place: {a.q5}</p>
              </div>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${
                  a.status === "approved"
                    ? "border-primary/60 text-primary"
                    : a.status === "rejected"
                    ? "border-destructive/60 text-destructive"
                    : ""
                }`}
              >
                {a.status}
              </span>
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground">View answers</summary>
              <div className="mt-3 grid gap-2 rounded-xl border bg-background/40 p-3 text-sm">
                <p><strong>Situation:</strong> {a.q6}</p>
                <p><strong>How long:</strong> {a.q7}</p>
                <p><strong>Tried before:</strong> {a.q8}</p>
                <p><strong>Clarity needed:</strong> {a.q9}</p>
                {a.q10 && <p><strong>Relationship involved:</strong> {a.q10}</p>}
                <p><strong>Previous sessions:</strong> {a.q11}</p>
                <p><strong>Expectation:</strong> {a.q12}</p>
                <p><strong>Why SPL:</strong> {a.q13}</p>
              </div>
            </details>
            {a.status === "pending" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  disabled={busyId === a.id}
                  onClick={() => updateStatus(a.id, "approved")}
                  className="hk-button-primary rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  disabled={busyId === a.id}
                  onClick={() => updateStatus(a.id, "rejected")}
                  className="rounded-full border border-destructive/60 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
        {!loading && apps.length === 0 && (
          <li className="rounded-2xl border border-dashed bg-card/20 p-6 text-center text-sm text-muted-foreground">
            No applications yet.
          </li>
        )}
      </ul>
    </div>
  );
}
