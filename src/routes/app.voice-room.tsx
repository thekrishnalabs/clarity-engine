import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Mic, MicOff, LogOut, Send } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import {
  joinVoiceRoom,
  leaveVoiceRoom,
  sendVoiceMessage,
  setMyMuteState,
  subscribeMessages,
  subscribeParticipants,
  subscribeVoiceRoom,
  tsToDate,
  type VoiceMessage,
  type VoiceParticipant,
  type VoiceRoom,
} from "@/lib/firestore";

export const Route = createFileRoute("/app/voice-room")({
  head: () => ({ meta: [{ title: "Voice Room — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ProtectedRoute>
      <VoiceRoomPage />
    </ProtectedRoute>
  ),
});

function VoiceRoomPage() {
  const { user } = useAuth();
  const [room, setRoom] = useState<VoiceRoom | null>(null);
  const [pwd, setPwd] = useState("");
  const [granted, setGranted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [participants, setParticipants] = useState<(VoiceParticipant & { id: string })[]>([]);
  const [messages, setMessages] = useState<(VoiceMessage & { id: string })[]>([]);
  const [text, setText] = useState("");
  const joinedRef = useRef(false);

  const initials = useMemo(() => {
    const src = (user?.displayName || user?.email || "U").trim();
    const parts = src.split(/\s+/);
    return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
  }, [user]);
  const myName = (user?.displayName || user?.email || "Guest").split("@")[0];
  const me = participants.find((p) => p.id === user?.uid);
  const isMuted = me?.isMuted ?? false;

  useEffect(() => {
    const u = subscribeVoiceRoom(setRoom);
    return u;
  }, []);

  useEffect(() => {
    if (!granted || !user) return;
    const u1 = subscribeParticipants(setParticipants);
    const u2 = subscribeMessages(setMessages, 50);

    if (!joinedRef.current) {
      joinedRef.current = true;
      joinVoiceRoom(user.uid, { name: myName, initials }).catch(() => {});
    }
    const cleanup = () => leaveVoiceRoom(user.uid).catch(() => {});
    window.addEventListener("beforeunload", cleanup);
    return () => {
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
      joinedRef.current = false;
      u1(); u2();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granted, user]);

  function tryEnter(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!room) return;
    if (participants.length >= room.max_seats) return setErr("Room is full.");
    if (pwd === room.room_password) setGranted(true);
    else setErr("Wrong password.");
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    await sendVoiceMessage({ name: myName, initials, text: text.trim(), userId: user.uid });
    setText("");
  }

  async function toggleMute() {
    if (!user) return;
    await setMyMuteState(user.uid, !isMuted);
  }

  async function leave() {
    if (user) await leaveVoiceRoom(user.uid).catch(() => {});
    setGranted(false);
  }

  // Pre-entry states
  if (!room || !room.is_active) {
    return (
      <section className="hk-container py-12 md:py-16">
        <p className="hk-gold-text text-xs uppercase tracking-[0.3em]">Voice Room</p>
        <h1 className="hk-gold-text mt-2 font-serif text-3xl md:text-4xl">Protected Voice Space</h1>
        <div className="mt-8 max-w-md rounded-3xl border bg-card/40 p-6">
          <p className="text-sm text-muted-foreground">The voice room is currently closed. Check back later.</p>
        </div>
      </section>
    );
  }

  if (!granted) {
    return (
      <section className="hk-container py-12 md:py-16">
        <p className="hk-gold-text text-xs uppercase tracking-[0.3em]">Voice Room</p>
        <h1 className="hk-gold-text mt-2 font-serif text-3xl md:text-4xl">{room.room_name}</h1>
        <form onSubmit={tryEnter} className="mt-8 max-w-md rounded-3xl border bg-card/40 p-6">
          <label className="grid gap-2 text-sm font-medium">
            Room password
            <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required className="rounded-xl border bg-background px-4 py-3" />
          </label>
          <button className="hk-button-primary mt-4 w-full rounded-full px-6 py-3 font-semibold">Enter Room</button>
          {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        </form>
      </section>
    );
  }

  // In-room
  const seats = Array.from({ length: room.max_seats }, (_, i) => participants[i] ?? null);
  const isFull = participants.length >= room.max_seats;

  return (
    <section className="hk-container py-8 pb-32 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative h-2.5 w-2.5 rounded-full bg-red-500">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" />
          </span>
          <h1 className="hk-gold-text font-serif text-xl md:text-2xl">LIVE — {room.room_name}</h1>
        </div>
        <span className="text-sm text-muted-foreground">{participants.length} / {room.max_seats} seats</span>
      </div>

      {isFull && !me && (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">Room is full</div>
      )}

      {/* Seats grid 4-4-2 */}
      <div className="mt-6 grid grid-cols-4 gap-4 md:grid-cols-5">
        {seats.map((p, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            {p ? (
              <>
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card text-sm font-bold text-primary shadow-[0_0_0_2px_var(--primary)]">
                    {p.initials}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background ${p.isMuted ? "bg-muted-foreground/60" : "bg-primary"}`}>
                    {p.isMuted ? <MicOff className="h-2.5 w-2.5" /> : <Mic className="h-2.5 w-2.5" />}
                  </span>
                </div>
                <span className="max-w-[70px] truncate text-[11px] text-foreground/80">{p.name}</span>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border bg-background/30" />
                <span className="text-[10px] text-muted-foreground">Empty</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Chat */}
      <div className="mt-10 rounded-2xl border bg-card/40 p-5">
        <h2 className="font-serif text-base">Chat</h2>
        <ul className="mt-3 max-h-[40vh] space-y-2 overflow-y-auto pr-2">
          {[...messages].reverse().map((m) => {
            const t = tsToDate(m.createdAt);
            return (
              <li key={m.id} className="flex items-start gap-2 text-sm">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{m.initials}</span>
                <div>
                  <p className="text-xs"><span className="font-semibold text-primary">{m.name}</span>: <span className="text-foreground/90">{m.text}</span></p>
                  <p className="text-[10px] text-muted-foreground">{t ? formatDistanceToNow(t, { addSuffix: true }) : ""}</p>
                </div>
              </li>
            );
          })}
          {messages.length === 0 && <li className="text-xs text-muted-foreground">No messages yet.</li>}
        </ul>
        <form onSubmit={send} className="mt-3 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="flex-1 rounded-full border bg-background px-4 py-2 text-sm" />
          <button type="submit" className="hk-button-primary inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold">
            <Send className="h-3.5 w-3.5" /> Send
          </button>
        </form>
      </div>

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur-xl md:left-64">
        <div className="hk-container flex items-center justify-between gap-3">
          <button
            onClick={toggleMute}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-bold transition ${
              isMuted ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
            }`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <button onClick={leave} className="inline-flex items-center gap-2 rounded-full border border-destructive/60 px-5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> Leave Room
          </button>
        </div>
      </div>
    </section>
  );
}
