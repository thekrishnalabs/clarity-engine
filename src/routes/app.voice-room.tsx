import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/RouteGuards";
import { getVoiceRoom, type VoiceRoom } from "@/lib/firestore";

export const Route = createFileRoute("/app/voice-room")({
  head: () => ({ meta: [{ title: "Voice Room — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ProtectedRoute>
      <VoiceRoomPage />
    </ProtectedRoute>
  ),
});

function VoiceRoomPage() {
  const [room, setRoom] = useState<VoiceRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [pwd, setPwd] = useState("");
  const [granted, setGranted] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getVoiceRoom()
      .then(setRoom)
      .catch(() => setErr("Failed to load voice room."))
      .finally(() => setLoading(false));
  }, []);

  function tryEnter(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!room) return;
    if (pwd === room.room_password) {
      setGranted(true);
    } else {
      setErr("Wrong password.");
    }
  }

  return (
    <section className="hk-container py-12 md:py-16">
      <p className="hk-gold-text text-xs uppercase tracking-[0.3em]">Voice Room</p>
      <h1 className="hk-gold-text mt-2 font-serif text-3xl md:text-4xl">Protected Voice Space</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">10 seats. Password-protected. Active only when Hiren opens it.</p>

      {loading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}

      {!loading && (!room || !room.is_active) && (
        <div className="mt-8 max-w-md rounded-3xl border bg-card/40 p-6">
          <p className="text-sm text-muted-foreground">The voice room is currently closed. Check back later.</p>
        </div>
      )}

      {!loading && room?.is_active && !granted && (
        <form onSubmit={tryEnter} className="mt-8 max-w-md rounded-3xl border bg-card/40 p-6">
          <h2 className="font-serif text-xl">{room.room_name}</h2>
          <label className="mt-4 grid gap-2 text-sm font-medium">
            Room password
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
              className="rounded-xl border bg-background px-4 py-3"
            />
          </label>
          <button className="hk-button-primary mt-4 w-full rounded-full px-6 py-3 font-semibold">Enter Room</button>
          {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        </form>
      )}

      {granted && room && (
        <div className="mt-8 max-w-md rounded-3xl border border-primary/40 bg-card/40 p-6">
          <h2 className="hk-gold-text font-serif text-xl">{room.room_name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">You are inside. Up to {room.max_seats} seats.</p>
          <p className="mt-4 rounded-xl border bg-background/40 p-3 text-xs text-muted-foreground">
            Voice connection UI will be activated here when the room is live.
          </p>
        </div>
      )}
    </section>
  );
}
