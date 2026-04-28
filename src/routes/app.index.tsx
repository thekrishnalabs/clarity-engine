import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Copy, Check } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import {
  listBookingsForUser,
  listPublishedPosts,
  subscribeVoiceRoom,
  tsToDate,
  type AdminPost,
  type SessionBooking,
  type VoiceRoom,
} from "@/lib/firestore";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Your App — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ProtectedRoute>
      <AppHome />
    </ProtectedRoute>
  ),
});

const TYPE_BADGE: Record<AdminPost["type"], { label: string; cls: string }> = {
  announcement: { label: "Announcement", cls: "border-primary/60 text-primary" },
  session_update: { label: "Session Update", cls: "border-violet-400/60 text-violet-300" },
  insight: { label: "Insight", cls: "border-teal-400/60 text-teal-300" },
  dimension_note: { label: "Dimension Note", cls: "border-amber-400/60 text-amber-300" },
};

function AppHome() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<(AdminPost & { id: string })[]>([]);
  const [bookings, setBookings] = useState<(SessionBooking & { id: string })[]>([]);
  const [room, setRoom] = useState<VoiceRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setErr(null);
    Promise.all([listPublishedPosts(20), listBookingsForUser(user.uid)])
      .then(([p, b]) => { setPosts(p); setBookings(b); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
    const u = subscribeVoiceRoom(setRoom);
    return u;
  }, [user]);

  const displayName = user?.displayName ?? user?.email ?? "there";
  const initials = useMemo(() => {
    const src = (user?.displayName || user?.email || "U").trim();
    const parts = src.split(/\s+/);
    return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
  }, [user]);

  const activeBooking = bookings.find((b) => b.status === "confirmed") ?? bookings[0];
  const myUid = bookings.find((b) => b.generated_uid)?.generated_uid ?? null;
  const sessionActive = !!activeBooking;

  function copyUid() {
    if (!myUid) return;
    navigator.clipboard.writeText(myUid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <section className="hk-container py-8 md:py-12">
      {/* Greeting bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">{initials}</span>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Welcome back</p>
            <h1 className="hk-gold-text font-serif text-xl md:text-2xl">{displayName}</h1>
          </div>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
          sessionActive ? "border-primary/50 text-primary" : "border-border text-muted-foreground"
        }`}>
          <span className={`h-2 w-2 rounded-full ${sessionActive ? "bg-primary" : "bg-muted-foreground/50"}`} />
          {sessionActive ? "Session Active" : "No active session"}
        </span>
      </div>

      {/* Stats row */}
      <div className="mt-6 -mx-4 flex gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        <div className="min-w-[220px] flex-shrink-0 rounded-2xl border bg-card/40 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Your Session</p>
          <p className="mt-2 font-serif text-base">{activeBooking?.session_full_name ?? "None yet"}</p>
        </div>
        <div className="min-w-[220px] flex-shrink-0 rounded-2xl border bg-card/40 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Your UID</p>
          <p className="mt-2 truncate font-mono text-sm text-primary">{myUid ?? "Not generated yet"}</p>
        </div>
        <div className="min-w-[220px] flex-shrink-0 rounded-2xl border bg-card/40 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Voice Room</p>
          <p className="mt-2 inline-flex items-center gap-2 font-serif text-base">
            <span className={`relative h-2 w-2 rounded-full ${room?.is_active ? "bg-red-500" : "bg-muted-foreground/40"}`}>
              {room?.is_active && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" />}
            </span>
            {room?.is_active ? "LIVE" : "Closed"}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        {/* Left: feed */}
        <div className="lg:col-span-2">
          <h2 className="font-serif text-xl">From Hiren</h2>
          <div className="mt-1 h-0.5 w-12 bg-primary" />

          {loading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
          {err && <p className="mt-6 text-sm text-destructive">{err}</p>}
          {!loading && posts.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed bg-card/20 p-10 text-center">
              <p className="text-2xl text-primary">✦</p>
              <p className="mt-2 text-sm text-muted-foreground">Hiren hasn't posted yet. Check back soon.</p>
            </div>
          )}
          <ul className="mt-5 grid gap-4">
            {posts.map((p) => {
              const meta = TYPE_BADGE[p.type] ?? TYPE_BADGE.announcement;
              const d = tsToDate(p.created_at);
              return (
                <li key={p.id} className={`rounded-2xl border bg-card/40 p-5 ${meta.cls.includes("primary") ? "border-primary/30" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${meta.cls}`}>{meta.label}</span>
                    {d && <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(d, { addSuffix: true })}</span>}
                  </div>
                  <h3 className="hk-gold-text mt-3 font-serif text-lg">{p.title}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{p.content}</p>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right: cards */}
        <aside className="space-y-5">
          {/* Session card */}
          <div className="rounded-2xl border bg-card/40 p-5">
            {!activeBooking ? (
              <>
                <h3 className="font-serif text-lg">Ready to begin?</h3>
                <p className="mt-1 text-sm text-muted-foreground">Choose a session depth that matches your situation.</p>
                <Link to="/app/book" className="hk-button-primary mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold">
                  Book a Session →
                </Link>
              </>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Your Session</p>
                <p className="hk-gold-text mt-1 font-serif text-lg">{activeBooking.session_full_name}</p>
                <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                  activeBooking.status === "pending" ? "border-amber-500/40 text-amber-300"
                  : activeBooking.status === "confirmed" ? "border-emerald-500/40 text-emerald-300"
                  : "border-border text-muted-foreground"
                }`}>{activeBooking.status}</span>
                {activeBooking.generated_uid && (
                  <>
                    <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">UID</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="truncate rounded-lg bg-background/60 px-2 py-1 font-mono text-xs text-primary">{activeBooking.generated_uid}</code>
                      <button onClick={copyUid} className="rounded-full border p-1.5 text-muted-foreground hover:text-foreground">
                        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <Link to="/app/uid/$uid" params={{ uid: activeBooking.generated_uid }} className="mt-3 inline-block text-xs text-primary">
                      View full UID →
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Voice room card */}
          <div className="rounded-2xl border bg-card/40 p-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Voice Room</p>
            {room?.is_active ? (
              <>
                <p className="mt-2 inline-flex items-center gap-2 font-serif text-base text-red-400">
                  <span className="relative h-2.5 w-2.5 rounded-full bg-red-500">
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" />
                  </span>
                  LIVE NOW
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{room.room_name}</p>
                <Link to="/app/voice-room" className="hk-button-primary mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold">
                  Enter Voice Room →
                </Link>
              </>
            ) : (
              <>
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Closed
                </p>
                <p className="mt-1 text-xs text-muted-foreground">No session live right now</p>
              </>
            )}
          </div>

          {/* Quick links */}
          <div className="rounded-2xl border bg-card/40 p-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Quick Links</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/apply" className="text-foreground hover:text-primary">Apply for Silver Prime Lite →</Link></li>
              <li><Link to="/dimensions" className="text-foreground hover:text-primary">Explore Dimensions →</Link></li>
              <li><Link to="/sessions" className="text-foreground hover:text-primary">View All Sessions →</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
