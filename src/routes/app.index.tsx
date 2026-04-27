import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import { listBookingsForUser, listPublishedPosts, type AdminPost, type SessionBooking } from "@/lib/firestore";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Your App — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ProtectedRoute>
      <AppHome />
    </ProtectedRoute>
  ),
});

function AppHome() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<(AdminPost & { id: string })[]>([]);
  const [bookings, setBookings] = useState<(SessionBooking & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const [p, b] = await Promise.all([listPublishedPosts(20), listBookingsForUser(user.uid)]);
        setPosts(p);
        setBookings(b);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const displayName = user?.displayName ?? user?.email ?? "there";

  return (
    <section className="hk-container py-12 md:py-16">
      <p className="hk-gold-text text-xs uppercase tracking-[0.3em]">Your App</p>
      <h1 className="hk-gold-text mt-2 font-serif text-3xl md:text-4xl">Welcome back, {displayName}</h1>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-serif text-xl">Latest from Hiren</h2>
          {loading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
          {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
          {!loading && posts.length === 0 && (
            <p className="mt-4 rounded-xl border bg-card/40 p-4 text-sm text-muted-foreground">No updates yet. Check back soon.</p>
          )}
          <ul className="mt-4 grid gap-4">
            {posts.map((p) => (
              <li key={p.id} className="rounded-2xl border bg-card/40 p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-primary/40 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                    {p.type.replace("_", " ")}
                  </span>
                </div>
                <h3 className="hk-gold-text mt-3 font-serif text-lg">{p.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{p.content}</p>
              </li>
            ))}
          </ul>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border bg-card/40 p-5">
            <h3 className="font-serif text-lg">Your Sessions</h3>
            {loading ? (
              <p className="mt-2 text-sm text-muted-foreground">Loading sessions…</p>
            ) : bookings.length === 0 ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">No bookings yet.</p>
                <Link to="/app/book" className="hk-button-primary mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold">
                  Book your first session →
                </Link>
              </>
            ) : (
              <ul className="mt-3 space-y-3">
                {bookings.map((b) => (
                  <li key={b.id} className="rounded-xl border bg-background/40 p-3">
                    <p className="text-sm font-semibold">{b.session_full_name}</p>
                    <p className="text-xs text-muted-foreground">Status: {b.status}</p>
                    {b.generated_uid && (
                      <Link to="/app/uid/$uid" params={{ uid: b.generated_uid }} className="mt-1 block text-xs text-primary">
                        UID: {b.generated_uid} →
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-card/40 p-5">
            <h3 className="font-serif text-lg">Voice Room</h3>
            <p className="mt-2 text-sm text-muted-foreground">Join the protected voice space (10 seats).</p>
            <Link to="/app/voice-room" className="hk-button-outline mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold">
              Enter Voice Room →
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
