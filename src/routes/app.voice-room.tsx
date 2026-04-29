import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Mic, MicOff, LogOut, Send, Hand, Volume2, VolumeX, MessageCircle, Crown, Plus } from "lucide-react";
import {
  Room,
  RoomEvent,
  Track,
  type LocalAudioTrack,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from "livekit-client";
import { ProtectedRoute } from "@/components/auth/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import {
  joinVoiceRoom,
  leaveVoiceRoom,
  sendVoiceMessage,
  setMyMuteState,
  setMySpeakingState,
  subscribeMessages,
  subscribeParticipants,
  subscribeVoiceRoom,
  tsToDate,
  type VoiceMessage,
  type VoiceParticipant,
  type VoiceRoom,
} from "@/lib/firestore";
import { executeRecaptcha } from "@/lib/recaptcha";
import { verifyRecaptcha } from "@/server/recaptcha.functions";
import { createLiveKitToken } from "@/server/livekit.functions";

export const Route = createFileRoute("/app/voice-room")({
  head: () => ({ meta: [{ title: "Voice Room — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ProtectedRoute>
      <VoiceRoomPage />
    </ProtectedRoute>
  ),
});

const ROOM_ID = "main_room";

function VoiceRoomPage() {
  const { user, isAnyAdmin } = useAuth();
  const [room, setRoom] = useState<VoiceRoom | null>(null);
  const [pwd, setPwd] = useState("");
  const [granted, setGranted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [participants, setParticipants] = useState<(VoiceParticipant & { id: string })[]>([]);
  const [messages, setMessages] = useState<(VoiceMessage & { id: string })[]>([]);
  const [text, setText] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const lkRoomRef = useRef<Room | null>(null);
  const localTrackRef = useRef<LocalAudioTrack | null>(null);
  const joinedRef = useRef(false);

  const initials = useMemo(() => {
    const src = (user?.displayName || user?.email || "U").trim();
    const parts = src.split(/\s+/);
    return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
  }, [user]);
  const myName = (user?.displayName || user?.email || "Guest").split("@")[0];
  const me = participants.find((p) => p.id === user?.uid);
  const isMuted = me?.isMuted ?? true;
  const isHost = me?.role === "host" || isAnyAdmin;

  // Realtime room config
  useEffect(() => {
    const u = subscribeVoiceRoom(setRoom);
    return u;
  }, []);

  // Realtime participants + messages once granted
  useEffect(() => {
    if (!granted || !user) return;
    const u1 = subscribeParticipants(setParticipants);
    const u2 = subscribeMessages(setMessages, 80);
    return () => { u1(); u2(); };
  }, [granted, user]);

  // Join + LiveKit connect
  useEffect(() => {
    if (!granted || !user || joinedRef.current) return;
    joinedRef.current = true;
    setConnecting(true);
    const role = isAnyAdmin ? "host" : "listener";
    (async () => {
      try {
        await joinVoiceRoom(user.uid, {
          name: myName,
          initials,
          photoURL: user.photoURL,
          role,
        });
        const tokenRes = await createLiveKitToken({
          data: {
            identity: user.uid,
            name: myName,
            room: ROOM_ID,
            canPublish: role === "host",
          },
        });
        if (!tokenRes.ok) {
          console.error("[livekit] token error", tokenRes.error);
          setErr(tokenRes.error);
          return;
        }
        const lkRoom = new Room({ adaptiveStream: true, dynacast: true });
        lkRoomRef.current = lkRoom;

        lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          const ids = new Set(speakers.map((s) => s.identity));
          // Only update my own state to keep writes light.
          const speakingNow = ids.has(user.uid);
          setMySpeakingState(user.uid, speakingNow).catch(() => {});
        });
        lkRoom.on(RoomEvent.TrackSubscribed, (track, _pub: RemoteTrackPublication, _p: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach() as HTMLAudioElement;
            el.autoplay = true;
            el.style.display = "none";
            document.body.appendChild(el);
          }
        });
        lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((el) => el.remove());
        });

        await lkRoom.connect(tokenRes.url, tokenRes.token);
        console.log("[livekit] connected as", role);
      } catch (e) {
        console.error("[voice-room] join failed", e);
        setErr(e instanceof Error ? e.message : "Failed to join.");
      } finally {
        setConnecting(false);
      }
    })();

    const cleanup = async () => {
      try {
        if (localTrackRef.current) {
          localTrackRef.current.stop();
          localTrackRef.current = null;
        }
        await lkRoomRef.current?.disconnect();
        lkRoomRef.current = null;
      } catch { /* noop */ }
      await leaveVoiceRoom(user.uid).catch(() => {});
      joinedRef.current = false;
    };
    window.addEventListener("beforeunload", cleanup);
    return () => {
      window.removeEventListener("beforeunload", cleanup);
      void cleanup();
    };
  }, [granted, user, isAnyAdmin, initials, myName]);

  async function tryEnter(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!room) return;
    if (participants.length >= room.max_seats) return setErr("Room is full.");
    if (pwd !== room.room_password) return setErr("Wrong password.");
    try {
      const token = await executeRecaptcha("JOIN");
      if (!token) return setErr("Security check failed. Please refresh and try again.");
      const verdict = await verifyRecaptcha({ data: { token, action: "JOIN" } });
      if (!verdict.ok) return setErr("Security verification failed. Please try again.");
      setGranted(true);
    } catch {
      setErr("Security verification failed. Please try again.");
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    await sendVoiceMessage({ name: myName, initials, text: text.trim(), userId: user.uid, photoURL: user.photoURL });
    setText("");
  }

  async function toggleMute() {
    if (!user || !lkRoomRef.current) return;
    const lp = lkRoomRef.current.localParticipant;
    if (isMuted) {
      // Try to publish mic. Will fail silently for listeners (no canPublish grant).
      try {
        await lp.setMicrophoneEnabled(true);
        await setMyMuteState(user.uid, false);
      } catch (e) {
        console.warn("[livekit] cannot unmute (listener?)", e);
        setErr("Only speakers can talk. Tap 'Raise Hand' to request.");
      }
    } else {
      await lp.setMicrophoneEnabled(false);
      await setMyMuteState(user.uid, true);
    }
  }

  async function leave() {
    if (user) await leaveVoiceRoom(user.uid).catch(() => {});
    try { await lkRoomRef.current?.disconnect(); } catch { /* noop */ }
    setGranted(false);
  }

  function toggleSpeaker() {
    setSpeakerOn((on) => {
      const next = !on;
      document.querySelectorAll<HTMLAudioElement>("audio").forEach((a) => { a.muted = !next; });
      return next;
    });
  }

  // Pre-entry states
  if (!room || !room.is_active) {
    return (
      <CosmicShell>
        <div className="hk-container py-16 text-center">
          <p className="hk-eyebrow">Voice Room</p>
          <h1 className="hk-gold-text mt-3 font-serif text-3xl md:text-5xl">Karmic Space is Closed</h1>
          <p className="mt-4 text-sm text-muted-foreground">The room is currently silent. Return when Hiren opens the gate.</p>
        </div>
      </CosmicShell>
    );
  }

  if (!granted) {
    return (
      <CosmicShell>
        <div className="hk-container flex flex-col items-center justify-center py-16">
          <p className="hk-eyebrow">Hiren Kundli</p>
          <h1 className="hk-gold-text mt-3 text-center font-serif text-4xl md:text-5xl">{room.room_name}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Talk · Connect · Decode together</p>
          <form onSubmit={tryEnter} className="mt-10 w-full max-w-md rounded-3xl border border-primary/20 bg-card/40 p-6 backdrop-blur-xl">
            <label className="grid gap-2 text-sm font-medium">
              <span className="hk-gold-text">Room password</span>
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
                className="rounded-2xl border border-primary/20 bg-background/60 px-4 py-3 outline-none focus:border-primary"
              />
            </label>
            <button className="hk-button-primary mt-5 w-full rounded-full px-6 py-3 font-semibold shadow-[0_0_40px_-10px] shadow-primary/60">
              Enter the Karmic Space
            </button>
            {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
          </form>
        </div>
      </CosmicShell>
    );
  }

  // In-room
  const seats = Array.from({ length: room.max_seats }, (_, i) => participants[i] ?? null);

  return (
    <CosmicShell>
      <section className="hk-container relative pb-40 pt-8 md:pt-12">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="hk-eyebrow flex items-center gap-2">
              <span className="relative h-2.5 w-2.5 rounded-full bg-red-500">
                <span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" />
              </span>
              LIVE
            </p>
            <h1 className="hk-gold-text mt-1 font-serif text-2xl md:text-4xl">{room.room_name}</h1>
            <p className="text-xs text-muted-foreground">Live Karmic Discussion · {participants.length}/{room.max_seats}</p>
          </div>
          <button
            onClick={leave}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/60 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive backdrop-blur hover:bg-destructive/20"
          >
            <LogOut className="h-4 w-4" /> Leave
          </button>
        </div>

        {connecting && <p className="mt-3 text-xs text-muted-foreground">Connecting to the cosmic frequency…</p>}
        {err && <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{err}</p>}

        {/* Grid */}
        <div className={`mt-8 grid gap-6 ${chatOpen ? "lg:grid-cols-[1fr_360px]" : ""}`}>
          <div className="rounded-3xl border border-primary/15 bg-card/30 p-6 backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
              {seats.map((p, i) =>
                p ? <ParticipantTile key={p.id} p={p} isMe={p.id === user?.uid} /> : <InviteSlot key={`empty-${i}`} index={i} />,
              )}
            </div>
          </div>

          {/* Chat panel */}
          {chatOpen && (
            <aside className="rounded-3xl border border-primary/15 bg-card/30 p-5 backdrop-blur-xl">
              <h2 className="hk-gold-text font-serif text-base">Live Chat</h2>
              <ul className="mt-3 max-h-[48vh] space-y-3 overflow-y-auto pr-1">
                {[...messages].reverse().map((m) => {
                  const t = tsToDate(m.createdAt);
                  return (
                    <li key={m.id} className="flex items-start gap-2.5">
                      <Avatar name={m.name} initials={m.initials} photoURL={(m as VoiceMessage & { photoURL?: string | null }).photoURL ?? null} size={28} />
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-semibold text-primary">{m.name}</span>
                          {t && <span className="ml-2">{formatDistanceToNow(t, { addSuffix: true })}</span>}
                        </p>
                        <p className="mt-0.5 break-words rounded-2xl rounded-tl-sm bg-background/50 px-3 py-1.5 text-sm text-foreground/90">
                          {m.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
                {messages.length === 0 && <li className="text-xs text-muted-foreground">No messages yet. Say hello ✨</li>}
              </ul>
              <form onSubmit={send} className="mt-3 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 rounded-full border border-primary/20 bg-background/60 px-4 py-2 text-sm outline-none focus:border-primary"
                />
                <button type="submit" className="hk-button-primary inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </aside>
          )}
        </div>

        {/* Floating control bar */}
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 md:left-64">
          <div className="flex items-center gap-2 rounded-full border border-primary/25 bg-background/70 px-3 py-2 shadow-[0_20px_60px_-20px] shadow-primary/40 backdrop-blur-xl">
            <ControlButton onClick={toggleMute} active={!isMuted} label={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </ControlButton>
            <ControlButton onClick={toggleSpeaker} active={speakerOn} label={speakerOn ? "Speaker on" : "Speaker off"}>
              {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </ControlButton>
            <ControlButton onClick={() => setHandRaised((h) => !h)} active={handRaised} label="Raise hand">
              <Hand className="h-5 w-5" />
            </ControlButton>
            <ControlButton onClick={() => setChatOpen((c) => !c)} active={chatOpen} label="Chat">
              <MessageCircle className="h-5 w-5" />
            </ControlButton>
            <button
              onClick={leave}
              className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg hover:brightness-110"
              aria-label="Leave room"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        {isHost && <p className="mt-6 text-center text-[11px] text-muted-foreground">You joined as Host — you can publish audio.</p>}
      </section>
    </CosmicShell>
  );
}

/* ---------------- Sub-components ---------------- */

function CosmicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="hk-starfield absolute inset-0 -z-10" />
      <div
        className="absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at 30% 0%, color-mix(in oklab, var(--gold) 14%, transparent), transparent 50%), radial-gradient(ellipse at 80% 100%, color-mix(in oklab, var(--gold) 10%, transparent), transparent 55%)",
        }}
      />
      {children}
    </div>
  );
}

function Avatar({ name, initials, photoURL, size = 64 }: { name: string; initials: string; photoURL?: string | null; size?: number }) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-full bg-card text-sm font-bold text-primary"
      style={{ height: size, width: size }}
      aria-label={name}
    >
      {photoURL ? <img src={photoURL} alt={name} className="h-full w-full object-cover" /> : <span>{initials}</span>}
    </div>
  );
}

function ParticipantTile({ p, isMe }: { p: VoiceParticipant & { id: string }; isMe: boolean }) {
  const speaking = !!p.isSpeaking && !p.isMuted;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <span
          className={`absolute -inset-1 rounded-full transition ${
            speaking ? "animate-pulse bg-[radial-gradient(circle,var(--color-gold)_0%,transparent_70%)] opacity-90" : "opacity-0"
          }`}
        />
        <div className={`relative rounded-full ${speaking ? "ring-2 ring-primary shadow-[0_0_30px_-2px] shadow-primary/70 scale-105" : "ring-1 ring-primary/30"} transition-transform`}>
          <Avatar name={p.name} initials={p.initials} photoURL={p.photoURL ?? null} size={64} />
        </div>
        {p.role === "host" && (
          <span className="absolute -top-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Crown className="h-3 w-3" />
          </span>
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background ${
            p.isMuted ? "bg-muted-foreground/70" : "bg-primary"
          }`}
        >
          {p.isMuted ? <MicOff className="h-2.5 w-2.5" /> : <Mic className="h-2.5 w-2.5" />}
        </span>
      </div>
      <span className={`max-w-[80px] truncate text-[11px] ${isMe ? "text-primary" : "text-foreground/80"}`}>
        {isMe ? "You" : p.name}
      </span>
    </div>
  );
}

function InviteSlot({ index }: { index: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-primary/30 bg-background/30 text-primary/60"
        title={`Empty seat ${index + 1}`}
      >
        <Plus className="h-5 w-5" />
      </div>
      <span className="text-[10px] text-muted-foreground">Invite</span>
    </div>
  );
}

function ControlButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_24px_-4px] shadow-primary/70"
          : "bg-card/80 text-foreground hover:bg-card"
      }`}
    >
      {children}
    </button>
  );
}
