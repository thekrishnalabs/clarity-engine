import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import cosmicBg from "@/assets/cosmic-bg.png";
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
  Lock,
  Plus,
  Smile,
  Share2,
  Settings,
  X,
  UserMinus,
  ShieldOff,
  ShieldCheck,
  Wifi,
  Zap,
} from "lucide-react";
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  AudioPresets,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from "livekit-client";
import { ProtectedRoute } from "@/components/auth/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import {
  joinVoiceRoom,
  kickParticipant,
  leaveSeat,
  leaveVoiceRoom,
  sendReaction,
  sendVoiceMessage,
  setHandRaised,
  setMyMuteState,
  setMySpeakingState,
  setRoomFreeJoin,
  setRoomPrivacy,
  subscribeMessages,
  subscribeParticipants,
  subscribeVoiceRoom,
  takeSeat,
  toggleSeatLock,
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
const REACTIONS = ["✨", "🙏", "🔥", "❤️", "👏", "😂"];

function VoiceRoomPage() {
  const { user, isAnyAdmin, adminRole } = useAuth();
  const [room, setRoom] = useState<VoiceRoom | null>(null);
  const [participants, setParticipants] = useState<(VoiceParticipant & { id: string })[]>([]);
  const [messages, setMessages] = useState<(VoiceMessage & { id: string })[]>([]);
  const [text, setText] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const lkRoomRef = useRef<Room | null>(null);
  const joinedRef = useRef(false);
  const chatScrollRef = useRef<HTMLUListElement | null>(null);
  const audioElsRef = useRef<HTMLAudioElement[]>([]);

  const initials = useMemo(() => {
    const src = (user?.displayName || user?.email || "U").trim();
    const parts = src.split(/\s+/);
    return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
  }, [user]);
  const myName = (user?.displayName || user?.email || "Guest").split("@")[0];
  const me = participants.find((p) => p.id === user?.uid);
  const isMuted = me?.isMuted ?? true;
  const isHost = adminRole === "superadmin" || adminRole === "admin" || isAnyAdmin;
  const handRaised = !!me?.handRaised;
  const mySeat = me?.seatIndex ?? null;

  const TOTAL_SEATS = room?.max_seats ?? 12;
  const lockedSeats = useMemo(() => new Set(room?.locked_seats ?? []), [room?.locked_seats]);
  const seatMap = useMemo(() => {
    const map = new Map<number, VoiceParticipant & { id: string }>();
    participants.forEach((p) => {
      if (typeof p.seatIndex === "number") map.set(p.seatIndex, p);
    });
    return map;
  }, [participants]);
  const lobby = participants.filter((p) => p.seatIndex == null && p.id !== user?.uid);

  // Realtime room config
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
            canPublish: true,
          },
        });
        if (!tokenRes.ok) {
          console.error("[livekit] token error", tokenRes.error);
          setErr(tokenRes.error);
          return;
        }
        const lkRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: { audioPreset: AudioPresets.speech },
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        lkRoomRef.current = lkRoom;
        setConnectionState(lkRoom.state);

        lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          const ids = new Set(speakers.map((s) => s.identity));
          setMySpeakingState(user.uid, ids.has(user.uid)).catch(() => {});
        });
        lkRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
          console.log("[livekit] connection state", state);
          setConnectionState(state);
        });
        lkRoom.on(RoomEvent.SignalReconnecting, () => setInfo("Reconnecting audio…"));
        lkRoom.on(RoomEvent.Reconnected, () => setInfo("Audio reconnected."));
        lkRoom.on(RoomEvent.TrackSubscribed, (track, _pub: RemoteTrackPublication, _p: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach() as HTMLAudioElement;
            el.autoplay = true;
            el.setAttribute("playsinline", "true");
            el.muted = !speakerOn;
            el.style.display = "none";
            document.body.appendChild(el);
            audioElsRef.current.push(el);
          }
        });
        lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((el) => {
            audioElsRef.current = audioElsRef.current.filter((node) => node !== el);
            el.remove();
          });
        });
        lkRoom.on(RoomEvent.Disconnected, () => {
          console.log("[livekit] disconnected — attempt rejoin");
          setConnectionState(ConnectionState.Disconnected);
        });

        await lkRoom.connect(tokenRes.url, tokenRes.token);
        console.log("[livekit] connected");
        setConnectionState(lkRoom.state);
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

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages.length]);

  // Auto-clear toast
  useEffect(() => {
    if (!info && !err) return;
    const t = setTimeout(() => {
      setInfo(null);
      setErr(null);
    }, 3500);
    return () => clearTimeout(t);
  }, [info, err]);

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

  async function ensureAudioUnlocked() {
    setAudioReady(true);
    await lkRoomRef.current?.startAudio().catch((e) => {
      console.warn("[livekit] startAudio failed", e);
    });
    audioElsRef.current.forEach((el) => {
      void el.play().catch(() => {});
    });
  }

  async function requestMicAccess() {
    await ensureAudioUnlocked();
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone is not supported in this browser.");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    stream.getTracks().forEach((track) => track.stop());
  }

  async function toggleMute() {
    if (!user || !lkRoomRef.current) return;
    let seatedNow = false;
    if (mySeat == null) {
      const firstFree = Array.from({ length: TOTAL_SEATS }, (_, idx) => idx).find((idx) => !seatMap.has(idx) && !lockedSeats.has(idx));
      if (firstFree == null) {
        setInfo("All seats are full right now.");
        return;
      }
      const seated = await takeSeat(user.uid, firstFree);
      if (!seated) {
        setInfo("Take a seat first to speak.");
        return;
      }
      seatedNow = true;
      setInfo(`Seat ${firstFree + 1} joined.`);
    }
    if (micBusy) return;
    setMicBusy(true);
    setErr(null);
    const lp = lkRoomRef.current.localParticipant;
    try {
      await requestMicAccess();
      const nextMuted = seatedNow ? false : !isMuted;
      await lp.setMicrophoneEnabled(!nextMuted);
      await setMyMuteState(user.uid, nextMuted);
      console.log("[livekit] mic state", nextMuted ? "muted" : "unmuted");
    } catch (e) {
      console.warn("[livekit] mic toggle failed", e);
      setErr(e instanceof Error ? e.message : "Microphone permission denied. Allow mic access in your browser.");
    } finally {
      setMicBusy(false);
    }
  }

  async function speakNow() {
    if (!user) return;
    await toggleMute();
  }

  async function leave() {
    if (user) await leaveVoiceRoom(user.uid).catch(() => {});
    try {
      await lkRoomRef.current?.disconnect();
    } catch {
      /* noop */
    }
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/app");
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

  async function onSeatClick(idx: number) {
    if (!user) return;
    const occupant = seatMap.get(idx);
    if (occupant) return; // occupied — handled elsewhere
    if (lockedSeats.has(idx)) {
      setInfo("This seat is locked.");
      return;
    }
    if (room && room.free_join === false && !isHost) {
      setInfo("Free join is off. Raise your hand for the host to invite you.");
      return;
    }
    const ok = await takeSeat(user.uid, idx);
    if (!ok) setInfo("Seat just got taken — try another.");
  }

  async function onLeaveSeat() {
    if (!user) return;
    try {
      await lkRoomRef.current?.localParticipant.setMicrophoneEnabled(false);
    } catch {
      /* noop */
    }
    await leaveSeat(user.uid);
  }

  async function onRaiseHand() {
    if (!user) return;
    await setHandRaised(user.uid, !handRaised);
  }

  async function onReact(emoji: string) {
    if (!user) return;
    setReactionsOpen(false);
    await sendReaction(user.uid, emoji);
  }

  async function onShare() {
    const url = window.location.href;
    const shareData = {
      title: room?.room_name || "Voice Chat Room",
      text: "Join me in the Hiren Kundli voice room ✨",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setInfo("Room link copied to clipboard.");
      }
    } catch {
      /* user dismissed */
    }
  }

  const roomTitle = room?.room_name || "Voice Chat Room";
  const roomShortId = ROOM_ID.slice(0, 6).toUpperCase();
  const connected = connectionState === ConnectionState.Connected;
  const audioStatus = connected ? (audioReady ? "Audio ready" : "Tap mic") : "Connecting";

  return (
    <CosmicShell>
      <section className="hk-container relative pb-48 pt-4 md:pt-8">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-2 rounded-3xl border border-primary/20 bg-card/40 px-3 py-2.5 backdrop-blur-xl md:px-5 md:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Radio className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="hk-gold-text truncate font-serif text-base leading-tight md:text-xl">
                {roomTitle}
              </h1>
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500">
                  <span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" />
                </span>
                <span className="font-semibold tracking-wider text-red-400">LIVE</span>
                <span className="opacity-50">·</span>
                <span>ID {roomShortId}</span>
                <span className="opacity-50">·</span>
                <Users className="h-3 w-3" /> {participants.length}
                <span className="opacity-50">·</span>
                <Wifi className="h-3 w-3" /> {audioStatus}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <IconBtn label="Share" onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </IconBtn>
            {isHost && (
              <IconBtn label="Settings" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
              </IconBtn>
            )}
            <button
              onClick={leave}
              className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-destructive/60 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive backdrop-blur hover:bg-destructive/20"
            >
              <X className="h-3.5 w-3.5" /> Leave
            </button>
          </div>
        </header>

        {connecting && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Connecting to the cosmic frequency…
          </p>
        )}
        {err && (
          <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-center text-xs text-destructive">
            {err}
          </p>
        )}
        {info && (
          <p className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-center text-xs text-primary">
            {info}
          </p>
        )}
        {!audioReady && connected && (
          <button
            onClick={speakNow}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-3xl border border-primary/35 bg-primary/15 px-4 py-3 text-sm font-semibold text-primary shadow-luxury backdrop-blur-xl hover:bg-primary/25"
          >
            <Zap className="h-4 w-4" /> Join audio and speak
          </button>
        )}

        {/* Seat grid */}
        <div className="mt-5 rounded-3xl border border-primary/15 bg-card/30 p-4 backdrop-blur-xl md:p-6">
          <div className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4 sm:gap-x-3">
            {Array.from({ length: TOTAL_SEATS }).map((_, idx) => {
              const occupant = seatMap.get(idx) ?? null;
              const locked = lockedSeats.has(idx);
              return (
                <SeatTile
                  key={idx}
                  index={idx}
                  occupant={occupant}
                  locked={locked}
                  isMe={occupant?.id === user?.uid}
                  isHost={isHost}
                  onClick={() => onSeatClick(idx)}
                  onKick={async () => {
                    if (!occupant || !user?.email) return;
                    await leaveSeat(occupant.id).catch(() => {});
                    setInfo(`${occupant.name} removed from seat.`);
                  }}
                  onToggleLock={async () => {
                    if (!user?.email) return;
                    await toggleSeatLock(idx, !locked, user.email);
                  }}
                />
              );
            })}
          </div>

          {/* Lobby strip */}
          {lobby.length > 0 && (
            <div className="mt-6 border-t border-primary/10 pt-4">
              <p className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                In the lobby — {lobby.length}
              </p>
              <div className="flex flex-wrap gap-3">
                {lobby.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-full border border-primary/15 bg-background/40 py-1 pl-1 pr-3">
                    <Avatar name={p.name} initials={p.initials} photoURL={p.photoURL ?? null} size={28} />
                    <span className="text-xs">{p.name}</span>
                    {p.handRaised && <Hand className="h-3 w-3 text-[color:var(--gold)]" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat overlay */}
        {chatOpen && (
          <ChatPanel
            messages={messages}
            chatScrollRef={chatScrollRef}
            text={text}
            setText={setText}
            onSend={send}
            onClose={() => setChatOpen(false)}
          />
        )}

        {/* Floating control bar */}
        <div className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 md:left-64">
          <div className="relative flex items-center gap-1.5 rounded-full border border-primary/25 bg-background/80 px-2.5 py-2 shadow-[0_20px_60px_-20px] shadow-primary/40 backdrop-blur-xl">
            <ControlButton onClick={toggleMute} active={!isMuted} label={isMuted ? "Unmute" : "Mute"} disabled={micBusy || !connected}>
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </ControlButton>
            <ControlButton onClick={toggleSpeaker} active={speakerOn} label={speakerOn ? "Speaker on" : "Speaker off"}>
              {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </ControlButton>
            <ControlButton onClick={() => setReactionsOpen((v) => !v)} active={reactionsOpen} label="Reactions">
              <Smile className="h-5 w-5" />
            </ControlButton>
            <ControlButton onClick={onRaiseHand} active={handRaised} label="Raise hand">
              <Hand className="h-5 w-5" />
            </ControlButton>
            <ControlButton onClick={() => setChatOpen((c) => !c)} active={chatOpen} label="Chat">
              <MessageCircle className="h-5 w-5" />
            </ControlButton>
            {mySeat != null && (
              <button
                onClick={onLeaveSeat}
                className="ml-1 inline-flex h-10 items-center justify-center rounded-full bg-card px-3 text-[11px] font-semibold text-foreground hover:bg-card/80"
                aria-label="Leave seat"
              >
                Leave seat
              </button>
            )}
            <button
              onClick={leave}
              className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg hover:brightness-110"
              aria-label="Leave room"
            >
              <LogOut className="h-5 w-5" />
            </button>

            {reactionsOpen && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 rounded-2xl border border-primary/25 bg-background/95 p-2 shadow-xl backdrop-blur-xl">
                <div className="flex gap-1.5">
                  {REACTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => onReact(e)}
                      className="grid h-10 w-10 place-items-center rounded-full text-xl hover:bg-primary/10"
                      aria-label={`React ${e}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating reaction bubbles */}
        <ReactionLayer participants={participants} />

        {/* Host settings */}
        {isHost && settingsOpen && (
          <HostSettings
            room={room}
            participants={participants}
            adminEmail={user?.email ?? null}
            onClose={() => setSettingsOpen(false)}
            onInfo={setInfo}
          />
        )}
      </section>
    </CosmicShell>
  );
}

/* ---------------- Sub-components ---------------- */

function CosmicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0418]">
      {/* Cosmic nebula background image */}
      <div
        className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${cosmicBg})` }}
        aria-hidden
      />
      {/* Dark veil so UI stays legible */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(10,4,24,0.35), rgba(10,4,24,0.78) 70%, rgba(5,2,14,0.92) 100%)",
        }}
        aria-hidden
      />
      {/* Gold glow accents */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-70 mix-blend-screen"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, color-mix(in oklab, var(--gold) 22%, transparent), transparent 45%), radial-gradient(ellipse at 85% 95%, color-mix(in oklab, var(--gold) 16%, transparent), transparent 50%)",
        }}
        aria-hidden
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
      className="flex items-center justify-center overflow-hidden rounded-full bg-card text-xs font-bold text-primary"
      style={{ height: size, width: size }}
      aria-label={name}
    >
      {photoURL ? (
        <img src={photoURL} alt={name} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function SeatTile({
  index,
  occupant,
  locked,
  isMe,
  isHost,
  onClick,
  onKick,
  onToggleLock,
}: {
  index: number;
  occupant: (VoiceParticipant & { id: string }) | null;
  locked: boolean;
  isMe: boolean;
  isHost: boolean;
  onClick: () => void;
  onKick: () => void;
  onToggleLock: () => void;
}) {
  // EMPTY
  if (!occupant) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onClick}
          disabled={locked}
          className={`group relative grid h-[68px] w-[68px] place-items-center rounded-full border border-dashed transition sm:h-[78px] sm:w-[78px] ${
            locked
              ? "cursor-not-allowed border-muted-foreground/30 bg-background/20 opacity-60"
              : "border-primary/30 bg-background/30 hover:border-[color:var(--gold)] hover:bg-primary/10"
          }`}
          aria-label={locked ? `Seat ${index + 1} locked` : `Take seat ${index + 1}`}
        >
          {locked ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Plus className="h-5 w-5 text-primary/70 transition group-hover:scale-110 group-hover:text-[color:var(--gold)]" />
          )}
          {isHost && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock();
              }}
              className="absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-primary/30 bg-background text-[10px] hover:bg-primary/20"
              aria-label={locked ? "Unlock seat" : "Lock seat"}
            >
              {locked ? <ShieldOff className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
            </button>
          )}
        </button>
        <span className="text-[10px] text-muted-foreground">{locked ? "Locked" : `Seat ${index + 1}`}</span>
      </div>
    );
  }

  // OCCUPIED
  const speaking = !!occupant.isSpeaking && !occupant.isMuted;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {speaking && (
          <span className="absolute -inset-2 animate-pulse rounded-full bg-[radial-gradient(circle,var(--color-gold)_0%,transparent_70%)] opacity-90" />
        )}
        <div
          className={`relative rounded-full transition-transform ${
            speaking
              ? "scale-105 ring-2 ring-[color:var(--gold)] shadow-[0_0_28px_-2px_var(--gold)]"
              : "ring-2 ring-primary/40"
          }`}
        >
          <Avatar name={occupant.name} initials={occupant.initials} photoURL={occupant.photoURL ?? null} size={70} />
        </div>
        {occupant.role === "host" && (
          <span className="absolute -top-2 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-[color:var(--gold)] text-background shadow-md">
            <Crown className="h-3.5 w-3.5" />
          </span>
        )}
        {occupant.handRaised && (
          <span className="absolute -top-1 -left-1 grid h-6 w-6 place-items-center rounded-full bg-[color:var(--gold)] text-background shadow">
            <Hand className="h-3.5 w-3.5" />
          </span>
        )}
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background ${
            occupant.isMuted ? "bg-muted-foreground/70 text-background" : "bg-[color:var(--gold)] text-background"
          }`}
        >
          {occupant.isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
        </span>

        {isHost && !isMe && (
          <button
            onClick={onKick}
            className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition group-hover:opacity-100"
            aria-label="Remove from seat"
            title="Remove from seat"
          >
            <UserMinus className="h-3 w-3" />
          </button>
        )}
      </div>
      <span className={`max-w-[84px] truncate text-[11px] ${isMe ? "text-[color:var(--gold)] font-semibold" : "text-foreground/85"}`}>
        {isMe ? "You" : occupant.name}
      </span>
    </div>
  );
}

function ControlButton({
  onClick,
  active,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={`flex h-10 w-10 items-center justify-center rounded-full transition disabled:opacity-40 ${
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_24px_-4px] shadow-primary/70"
          : "bg-card/80 text-foreground hover:bg-card"
      }`}
    >
      {children}
    </button>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-primary/20 bg-background/40 text-foreground hover:bg-primary/10"
    >
      {children}
    </button>
  );
}

function ChatPanel({
  messages,
  chatScrollRef,
  text,
  setText,
  onSend,
  onClose,
}: {
  messages: (VoiceMessage & { id: string })[];
  chatScrollRef: React.RefObject<HTMLUListElement | null>;
  text: string;
  setText: (v: string) => void;
  onSend: (e: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[70vh] w-full max-w-xl flex-col rounded-t-3xl border border-primary/25 bg-background/95 backdrop-blur-xl md:left-64 md:right-4 md:bottom-24 md:max-w-md md:rounded-3xl"
      role="dialog"
      aria-label="Live chat"
    >
      <div className="flex items-center justify-between border-b border-primary/15 px-4 py-3">
        <h2 className="hk-gold-text font-serif text-base">Live Chat</h2>
        <button onClick={onClose} aria-label="Close chat" className="grid h-8 w-8 place-items-center rounded-full hover:bg-primary/10">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
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
                <p className="mt-0.5 break-words rounded-2xl rounded-tl-sm bg-card/70 px-3 py-1.5 text-sm text-foreground/90">{m.text}</p>
              </div>
            </li>
          );
        })}
        {messages.length === 0 && <li className="text-xs text-muted-foreground">No messages yet. Say hello ✨</li>}
      </ul>
      <form onSubmit={onSend} className="flex gap-2 border-t border-primary/15 p-3">
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
    </div>
  );
}

function ReactionLayer({ participants }: { participants: (VoiceParticipant & { id: string })[] }) {
  const [active, setActive] = useState<{ id: string; emoji: string; key: number; left: number }[]>([]);
  const seenRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const now = Date.now();
    participants.forEach((p) => {
      const r = p.reaction;
      if (!r || !r.at) return;
      const last = seenRef.current.get(p.id) ?? 0;
      if (r.at > last && now - r.at < 5000) {
        seenRef.current.set(p.id, r.at);
        setActive((cur) => [
          ...cur,
          { id: p.id, emoji: r.emoji, key: r.at, left: 30 + Math.random() * 40 },
        ]);
        setTimeout(() => {
          setActive((cur) => cur.filter((x) => x.key !== r.at));
        }, 2400);
      }
    });
  }, [participants]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {active.map((a) => (
        <span
          key={`${a.id}-${a.key}`}
          className="absolute bottom-24 text-3xl"
          style={{
            left: `${a.left}%`,
            animation: "hk-float-up 2.2s ease-out forwards",
          }}
        >
          {a.emoji}
        </span>
      ))}
      <style>{`@keyframes hk-float-up { 0%{transform:translateY(0) scale(.8); opacity:0} 15%{opacity:1} 100%{transform:translateY(-220px) scale(1.15); opacity:0} }`}</style>
    </div>
  );
}

function HostSettings({
  room,
  participants,
  adminEmail,
  onClose,
  onInfo,
}: {
  room: VoiceRoom | null;
  participants: (VoiceParticipant & { id: string })[];
  adminEmail: string | null;
  onClose: () => void;
  onInfo: (s: string) => void;
}) {
  const freeJoin = room?.free_join !== false;
  const isPrivate = !!room?.is_private;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-primary/25 bg-background/95 p-5 backdrop-blur-xl md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="hk-gold-text font-serif text-lg">Host controls</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-primary/10" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <ToggleRow
            label="Free join (anyone can take a seat)"
            checked={freeJoin}
            onChange={async (v) => {
              await setRoomFreeJoin(v, adminEmail);
              onInfo(v ? "Free join enabled." : "Free join disabled.");
            }}
          />
          <ToggleRow
            label="Private room"
            checked={isPrivate}
            onChange={async (v) => {
              await setRoomPrivacy(v, adminEmail);
              onInfo(v ? "Room set to private." : "Room set to public.");
            }}
          />
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Manage users</h3>
          <ul className="space-y-2">
            {participants.length === 0 && <li className="text-xs text-muted-foreground">No one in the room.</li>}
            {participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl border border-primary/15 bg-card/40 p-2">
                <div className="flex items-center gap-2.5">
                  <Avatar name={p.name} initials={p.initials} photoURL={p.photoURL ?? null} size={32} />
                  <div className="min-w-0">
                    <p className="truncate text-sm">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.role === "host" ? "Host" : p.seatIndex != null ? `Seat ${p.seatIndex + 1}` : "Lobby"}
                      {p.handRaised && " · ✋"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await kickParticipant(p.id, adminEmail);
                    onInfo(`${p.name} removed.`);
                  }}
                  className="rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/20"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-primary/15 bg-card/40 p-3">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-[color:var(--gold)]" : "bg-muted-foreground/40"}`}
        aria-pressed={checked}
        aria-label={label}
        type="button"
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-background transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}
