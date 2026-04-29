import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Mic,
  MicOff,
  LogOut,
  Send,
  Hand,
  Volume2,
  VolumeX,
  MessageCircle,
  Crown,
  Users,
  Radio,
} from "lucide-react";
import {
  Room,
  RoomEvent,
  Track,
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
import { createLiveKitToken } from "@/server/livekit.functions";

export const Route = createFileRoute("/app/voice-room")({
  head: () => ({
    meta: [
      { title: "Voice Chat Room — Hiren Kundli" },
      { name: "robots", content: "noindex" },
    ],
  }),
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
  const [participants, setParticipants] = useState<(VoiceParticipant & { id: string })[]>([]);
  const [messages, setMessages] = useState<(VoiceMessage & { id: string })[]>([]);
  const [text, setText] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const lkRoomRef = useRef<Room | null>(null);
  const joinedRef = useRef(false);
  const chatScrollRef = useRef<HTMLUListElement | null>(null);

  const initials = useMemo(() => {
    const src = (user?.displayName || user?.email || "U").trim();
    const parts = src.split(/\s+/);
    return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
  }, [user]);
  const myName = (user?.displayName || user?.email || "Guest").split("@")[0];
  const me = participants.find((p) => p.id === user?.uid);
  const isMuted = me?.isMuted ?? true;
  const isHost = me?.role === "host" || isAnyAdmin;

  // Realtime room config (informational only — no gating)
  useEffect(() => subscribeVoiceRoom(setRoom), []);

  // Realtime participants + messages
  useEffect(() => {
    if (!user) return;
    const u1 = subscribeParticipants(setParticipants);
    const u2 = subscribeMessages(setMessages, 80);
    return () => {
      u1();
      u2();
    };
  }, [user]);

  // Auto-join + connect to LiveKit
  useEffect(() => {
    if (!user || joinedRef.current) return;
    joinedRef.current = true;
    setConnecting(true);
    const role: "host" | "listener" = isAnyAdmin ? "host" : "listener";

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
            canPublish: true, // allow everyone to talk; host moderation later
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
          setMySpeakingState(user.uid, ids.has(user.uid)).catch(() => {});
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
        console.log("[livekit] connected");
      } catch (e) {
        console.error("[voice-room] join failed", e);
        setErr(e instanceof Error ? e.message : "Failed to join the room.");
      } finally {
        setConnecting(false);
      }
    })();

    const cleanup = async () => {
      try {
        await lkRoomRef.current?.disconnect();
        lkRoomRef.current = null;
      } catch {
        /* noop */
      }
      await leaveVoiceRoom(user.uid).catch(() => {});
      joinedRef.current = false;
    };
    window.addEventListener("beforeunload", cleanup);
    return () => {
      window.removeEventListener("beforeunload", cleanup);
      void cleanup();
    };
  }, [user, isAnyAdmin, initials, myName]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    await sendVoiceMessage({
      name: myName,
      initials,
      text: text.trim(),
      userId: user.uid,
      photoURL: user.photoURL,
    });
    setText("");
  }

  async function toggleMute() {
    if (!user || !lkRoomRef.current) return;
    const lp = lkRoomRef.current.localParticipant;
    try {
      if (isMuted) {
        await lp.setMicrophoneEnabled(true);
        await setMyMuteState(user.uid, false);
      } else {
        await lp.setMicrophoneEnabled(false);
        await setMyMuteState(user.uid, true);
      }
    } catch (e) {
      console.warn("[livekit] mic toggle failed", e);
      setErr("Microphone permission denied. Allow mic access in your browser.");
    }
  }

  async function leave() {
    if (user) await leaveVoiceRoom(user.uid).catch(() => {});
    try {
      await lkRoomRef.current?.disconnect();
    } catch {
      /* noop */
    }
    window.history.length > 1 ? window.history.back() : window.location.assign("/app");
  }

  function toggleSpeaker() {
    setSpeakerOn((on) => {
      const next = !on;
      document.querySelectorAll<HTMLAudioElement>("audio").forEach((a) => {
        a.muted = !next;
      });
      return next;
    });
  }

  const roomTitle = room?.room_name || "Voice Chat Room";

  return (
    <CosmicShell>
      <section className="hk-container relative pb-40 pt-6 md:pt-10">
        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/20 bg-card/40 px-4 py-3 backdrop-blur-xl md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Radio className="h-5 w-5" />
            </span>
            <div>
              <h1 className="hk-gold-text font-serif text-lg leading-tight md:text-2xl">
                {roomTitle}
              </h1>
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500">
                  <span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" />
                </span>
                LIVE
                <span className="opacity-60">·</span>
                <Users className="h-3 w-3" />
                {participants.length} listening
              </p>
            </div>
          </div>
          <button
            onClick={leave}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/60 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive backdrop-blur hover:bg-destructive/20"
          >
            <LogOut className="h-4 w-4" /> Leave Room
          </button>
        </header>

        {connecting && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Connecting to the cosmic frequency…
          </p>
        )}
        {err && (
          <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-center text-xs text-destructive">
            {err}
          </p>
        )}

        {/* Layout: avatar grid + chat */}
        <div className={`mt-6 grid gap-6 ${chatOpen ? "lg:grid-cols-[1fr_360px]" : ""}`}>
          {/* Participant grid */}
          <div className="rounded-3xl border border-primary/15 bg-card/30 p-6 backdrop-blur-xl md:p-8">
            {participants.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                You're the first one here. Invite others to join ✨
              </p>
            ) : (
              <div className="grid grid-cols-3 justify-items-center gap-x-3 gap-y-8 sm:grid-cols-4 md:grid-cols-5">
                {participants.map((p) => (
                  <ParticipantTile key={p.id} p={p} isMe={p.id === user?.uid} />
                ))}
              </div>
            )}
          </div>

          {/* Chat panel */}
          {chatOpen && (
            <aside className="rounded-3xl border border-primary/15 bg-card/30 p-5 backdrop-blur-xl">
              <h2 className="hk-gold-text font-serif text-base">Live Chat</h2>
              <ul
                ref={chatScrollRef}
                className="mt-3 max-h-[48vh] space-y-3 overflow-y-auto pr-1"
              >
                {[...messages].reverse().map((m) => {
                  const t = tsToDate(m.createdAt);
                  return (
                    <li key={m.id} className="flex items-start gap-2.5">
                      <Avatar
                        name={m.name}
                        initials={m.initials}
                        photoURL={(m as VoiceMessage & { photoURL?: string | null }).photoURL ?? null}
                        size={28}
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-semibold text-primary">{m.name}</span>
                          {t && (
                            <span className="ml-2">
                              {formatDistanceToNow(t, { addSuffix: true })}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 break-words rounded-2xl rounded-tl-sm bg-background/50 px-3 py-1.5 text-sm text-foreground/90">
                          {m.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
                {messages.length === 0 && (
                  <li className="text-xs text-muted-foreground">
                    No messages yet. Say hello ✨
                  </li>
                )}
              </ul>
              <form onSubmit={send} className="mt-3 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 rounded-full border border-primary/20 bg-background/60 px-4 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="hk-button-primary inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold"
                >
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

        {isHost && (
          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            You're a Host — you can moderate this room.
          </p>
        )}
      </section>
    </CosmicShell>
  );
}

/* ---------------- Sub-components ---------------- */

function CosmicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0418]">
      <div className="hk-starfield absolute inset-0 -z-10" />
      <div
        className="absolute inset-0 -z-10 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse at 30% 0%, color-mix(in oklab, var(--gold) 18%, transparent), transparent 50%), radial-gradient(ellipse at 80% 100%, color-mix(in oklab, var(--gold) 12%, transparent), transparent 55%), radial-gradient(ellipse at 50% 50%, rgba(80,30,140,0.35), transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}

function Avatar({
  name,
  initials,
  photoURL,
  size = 64,
}: {
  name: string;
  initials: string;
  photoURL?: string | null;
  size?: number;
}) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-full bg-card text-sm font-bold text-primary"
      style={{ height: size, width: size }}
      aria-label={name}
    >
      {photoURL ? (
        <img src={photoURL} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function ParticipantTile({
  p,
  isMe,
}: {
  p: VoiceParticipant & { id: string };
  isMe: boolean;
}) {
  const speaking = !!p.isSpeaking && !p.isMuted;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {speaking && (
          <span className="absolute -inset-2 animate-pulse rounded-full bg-[radial-gradient(circle,var(--color-gold)_0%,transparent_70%)] opacity-90" />
        )}
        <div
          className={`relative rounded-full transition-transform ${
            speaking
              ? "scale-105 ring-2 ring-[color:var(--gold)] shadow-[0_0_30px_-2px_var(--gold)]"
              : "ring-2 ring-primary/40"
          }`}
        >
          <Avatar name={p.name} initials={p.initials} photoURL={p.photoURL ?? null} size={72} />
        </div>
        {p.role === "host" && (
          <span className="absolute -top-2 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-[color:var(--gold)] text-background shadow-md">
            <Crown className="h-3.5 w-3.5" />
          </span>
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background ${
            p.isMuted ? "bg-muted-foreground/70 text-background" : "bg-[color:var(--gold)] text-background"
          }`}
        >
          {p.isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
        </span>
      </div>
      <span className={`max-w-[88px] truncate text-xs ${isMe ? "text-primary font-semibold" : "text-foreground/85"}`}>
        {isMe ? "You" : p.name}
      </span>
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
