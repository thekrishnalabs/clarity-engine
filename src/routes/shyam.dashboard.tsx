import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AdminRoute } from "@/components/auth/RouteGuards";
import { AdminLayout } from "@/components/hiren/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  attachUidToBooking,
  createUidRecord,
  listAllBookings,
  listAllPosts,
  listSplApplications,
  setVoiceRoomActive,
  subscribeVoiceRoom,
  tsToDate,
  type SessionBooking,
  type AdminPost,
  type SplApplication,
  type VoiceRoom,
} from "@/lib/firestore";
import { cityCodeFrom, generateUid } from "@/lib/uid";

export const Route = createFileRoute("/shyam/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminRoute>
      <AdminLayout>
        <Dashboard />
      </AdminLayout>
    </AdminRoute>
  ),
});

function Dashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<(SessionBooking & { id: string })[]>([]);
  const [apps, setApps] = useState<(SplApplication & { id: string })[]>([]);
  const [posts, setPosts] = useState<(AdminPost & { id: string })[]>([]);
  const [room, setRoom] = useState<VoiceRoom | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    try {
      const [b, a, p] = await Promise.all([
        listAllBookings(user?.email),
        listSplApplications(user?.email).catch(() => []),
        listAllPosts(user?.email).catch(() => []),
      ]);
      setBookings(b);
      setApps(a);
      setPosts(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    loadAll();
    const unsub = subscribeVoiceRoom(setRoom);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = bookings.filter((b) => b.status === "pending").length;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const splPending = apps.filter((a) => a.status === "pending").length;

  const lastPostDate = posts[0] ? tsToDate(posts[0].created_at) : null;

  async function toggleRoom() {
    if (!room) return;
    setBusy(true);
    try {
      await setVoiceRoomActive(!room.is_active, user?.email);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function generateUidFor(b: SessionBooking & { id: string }) {
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
        user_firebase_uid: b.user_firebase_uid ?? null,
        notes: b.notes,
      }, user?.email);
      await attachUidToBooking(b.id, uid, user?.email);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to generate UID.");
    }
  }

  return (
    <section className="hk-container py-10 md:py-12">
      <p className="hk-gold-text text-xs uppercase tracking-[0.3em]">Admin</p>
      <h1 className="hk-gold-text mt-2 font-serif text-3xl md:text-4xl">Dashboard</h1>

      {err && <p className="mt-4 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{err}</p>}

      {/* Stats grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Bookings" value={bookings.length}>
          <p className="mt-2 text-xs text-muted-foreground">
            {pending} pending · {confirmed} confirmed · {completed} completed
          </p>
        </StatCard>

        <StatCard label="SPL Applications" value={apps.length}>
          <p className="mt-2 text-xs text-muted-foreground">{splPending} pending review</p>
        </StatCard>

        <div className="rounded-2xl border bg-card/40 p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Voice Room</p>
          <div className="mt-3 flex items-center gap-2">
            <span className={`relative h-2.5 w-2.5 rounded-full ${room?.is_active ? "bg-primary" : "bg-muted-foreground/40"}`}>
              {room?.is_active && <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />}
            </span>
            <span className="font-serif text-lg">{room?.is_active ? "LIVE" : "Closed"}</span>
          </div>
          <button
            disabled={busy || !room}
            onClick={toggleRoom}
            className={`mt-3 w-full rounded-full px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
              room?.is_active
                ? "border border-destructive/60 text-destructive hover:bg-destructive/10"
                : "hk-button-primary"
            }`}
          >
            {room?.is_active ? "Close Room" : "Open Room"}
          </button>
        </div>

        <StatCard label="Posts Published" value={posts.filter((p) => p.is_published).length}>
          <p className="mt-2 text-xs text-muted-foreground">
            {lastPostDate ? `Last: ${formatDistanceToNow(lastPostDate, { addSuffix: true })}` : "No posts yet"}
          </p>
        </StatCard>
      </div>

      {/* Recent bookings */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl">Recent Bookings</h2>
          <Link to="/shyam/bookings" className="text-xs text-primary">View all →</Link>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border bg-card/40">
          <table className="min-w-full text-sm">
            <thead className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">UID</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 5).map((b) => {
                const d = tsToDate(b.created_at);
                return (
                  <tr key={b.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{b.user_name}</td>
                    <td className="px-4 py-3">{b.session_full_name}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {d ? formatDistanceToNow(d, { addSuffix: true }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {b.generated_uid ? (
                        <span className="font-mono text-[11px] text-primary">{b.generated_uid.slice(0, 12)}…</span>
                      ) : (
                        <button
                          onClick={() => generateUidFor(b)}
                          className="hk-button-primary rounded-full px-3 py-1 text-[11px] font-semibold"
                        >
                          Generate UID
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {bookings.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">No bookings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending SPL */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl">Pending SPL Applications</h2>
          <Link to="/shyam/bookings" className="text-xs text-primary">Review all →</Link>
        </div>
        <ul className="mt-4 grid gap-3">
          {apps.filter((a) => a.status === "pending").slice(0, 3).map((a) => {
            const d = tsToDate(a.submitted_at);
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/40 p-4">
                <div>
                  <p className="font-medium">{a.q1}</p>
                  <p className="text-xs text-muted-foreground">{a.q2}</p>
                </div>
                <p className="text-xs text-muted-foreground">{d ? formatDistanceToNow(d, { addSuffix: true }) : ""}</p>
              </li>
            );
          })}
          {apps.filter((a) => a.status === "pending").length === 0 && (
            <li className="rounded-2xl border border-dashed bg-card/20 p-4 text-center text-xs text-muted-foreground">
              No pending applications.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function StatCard({ label, value, children }: { label: string; value: number; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card/40 p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="hk-gold-text mt-2 font-serif text-3xl md:text-4xl">{value}</p>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: SessionBooking["status"] }) {
  const map: Record<SessionBooking["status"], string> = {
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    completed: "bg-muted/40 text-muted-foreground border-border",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${map[status]}`}>
      {status}
    </span>
  );
}
