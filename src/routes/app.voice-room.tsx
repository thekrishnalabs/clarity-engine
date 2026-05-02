import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import cosmicBg from "@/assets/cosmic-bg.png";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  ChevronDown,
  Coins,
  Crown,
  Gift,
  Hand,
  Headphones,
  Lock,
  LogOut,
  MessageCircle,
  Mic,
  MicOff,
  Plus,
  Radio,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  ShieldOff,
  Smile,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  AudioPresets,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from "livekit-client";
import { ProtectedRoute } from "@/components/auth/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_VOICE_ROOM_ID,
  createVoiceRoom,
  joinVoiceRoom,
  kickParticipant,
  leaveSeat,
  leaveVoiceRoom,
  sendReaction,
  sendVoiceGift,
  sendVoiceMessage,
  setHandRaised,
  setMyDeafenState,
  setMyMuteState,
  setMySpeakingState,
  setRoomFreeJoin,
  setRoomPrivacy,
  subscribeGifts,
  subscribeMessages,
  subscribeParticipants,
  subscribeVoiceRoom,
  subscribeVoiceRooms,
  takeSeat,
  toggleSeatLock,
  tsToDate,
  type VoiceGift,
  type VoiceMessage,
  type VoiceParticipant,
  type VoiceRoom,
} from "@/lib/firestore";
import { createLiveKitToken } from "@/server/livekit.functions";

export const Route = createFileRoute("/app/voice-room")({
  head: () => ({
    meta: [
      { title: "Voice Room — Hiren Kundli" },
      { name: "description", content: "Premium live voice room for Hiren Kundli members." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <VoiceRoomPage />
    </ProtectedRoute>
  ),
});

const REACTIONS = ["✨", "🙏", "🔥", "❤️", "👏", "😂"];
const ROOM_CATEGORIES = ["Open Talk", "Astrology", "Guidance", "VIP", "Meditation"];
const GIFTS = [
  { id: "diya", name: "Diya", emoji: "🪔", amount: 11 },
  { id: "rose", name: "Rose", emoji: "🌹", amount: 21 },
  { id: "star", name: "Star", emoji: "⭐", amount: 51 },
  { id: "crown", name: "Crown", emoji: "👑", amount: 101 },
  { id: "gem", name: "Gem", emoji: "💎", amount: 501 },
  { id: "rocket", name: "Rocket", emoji: "🚀", amount: 1001 },
];

function VoiceRoomPage() {
  const { user, isAnyAdmin, adminRole } = useAuth();
  const [activeRoomId, setActiveRoomId] = useState(DEFAULT_VOICE_ROOM_ID);
  const [rooms, setRooms] = useState<(VoiceRoom & { id: string })[]>([]);
  const [room, setRoom] = useState<VoiceRoom | null>(null);
  const [participants, setParticipants] = useState<(VoiceParticipant & { id: string })[]>([]);
  const [messages, setMessages] = useState<(VoiceMessage & { id: string })[]>([]);
  const [gifts, setGifts] = useState<(VoiceGift & { id: string })[]>([]);
  const [text, setText] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [deafened, setDeafened] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [localMicOn, setLocalMicOn] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);

  const lkRoomRef = useRef<Room | null>(null);
  const joinedRoomRef = useRef<string | null>(null);
  const connectPromiseRef = useRef<Promise<Room> | null>(null);
  const chatScrollRef = useRef<HTMLUListElement | null>(null);
  const audioElsRef = useRef<HTMLAudioElement[]>([]);
  const localMicStreamRef = useRef<MediaStream | null>(null);
  const analyserStopRef = useRef<(() => void) | null>(null);
  const speakerOnRef = useRef(true);
  const deafenedRef = useRef(false);

  const initials = useMemo(() => {
    const src = (user?.displayName || user?.email || "U").trim();
    const parts = src.split(/\s+/);
    return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
  }, [user]);
  const myName = (user?.displayName || user?.email || "Guest").split("@")[0];
  const me = participants.find((p) => p.id === user?.uid);
  const isMuted = me?.isMuted ?? !localMicOn;
  const isHost = adminRole === "superadmin" || adminRole === "admin" || isAnyAdmin || room?.ownerId === user?.uid;
  const handRaised = !!me?.handRaised;
  const mySeat = me?.seatIndex ?? null;
  const totalSeats = Math.max(8, Math.min(room?.max_seats ?? 12, 24));
  const lockedSeats = useMemo(() => new Set(room?.locked_seats ?? []), [room?.locked_seats]);
  const seatMap = useMemo(() => {
    const map = new Map<number, VoiceParticipant & { id: string }>();
    participants.forEach((p) => {
      if (typeof p.seatIndex === "number") map.set(p.seatIndex, p);
    });
    return map;
  }, [participants]);
  const lobby = participants.filter((p) => p.seatIndex == null && p.id !== user?.uid);
  const topGifted = [...participants].sort((a, b) => (b.gifted ?? 0) - (a.gifted ?? 0)).slice(0, 3);

  useEffect(() => {
    speakerOnRef.current = speakerOn;
    deafenedRef.current = deafened;
  }, [speakerOn, deafened]);

  useEffect(() => subscribeVoiceRooms(setRooms), []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("hk-active-voice-room");
      if (saved) setActiveRoomId(saved);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("hk-active-voice-room", activeRoomId);
    } catch {
      /* noop */
    }
  }, [activeRoomId]);

  useEffect(() => {
    const u1 = subscribeVoiceRoom(setRoom, activeRoomId);
    const u2 = subscribeParticipants(setParticipants, activeRoomId);
    const u3 = subscribeMessages(setMessages, 100, activeRoomId);
    const u4 = subscribeGifts(setGifts, 40, activeRoomId);
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [activeRoomId]);

  const stopLocalMic = useCallback(() => {
    analyserStopRef.current?.();
    analyserStopRef.current = null;
    localMicStreamRef.current?.getTracks().forEach((track) => track.stop());
    localMicStreamRef.current = null;
    setLocalMicOn(false);
  }, []);

  const cleanupAudioRoom = useCallback(async () => {
    const roomId = joinedRoomRef.current;
    stopLocalMic();
    try {
      await lkRoomRef.current?.disconnect();
    } catch {
      /* noop */
    }
    audioElsRef.current.forEach((el) => el.remove());
    audioElsRef.current = [];
    lkRoomRef.current = null;
    connectPromiseRef.current = null;
    setConnectionState(ConnectionState.Disconnected);
    setAudioReady(false);
    if (user && roomId) await leaveVoiceRoom(user.uid, roomId).catch(() => {});
    joinedRoomRef.current = null;
  }, [stopLocalMic, user]);

  const attachRemoteTrack = useCallback((track: { kind: Track.Kind; attach: () => HTMLElement }) => {
    if (track.kind !== Track.Kind.Audio) return;
    const el = track.attach() as HTMLAudioElement;
    el.autoplay = true;
    el.setAttribute("playsinline", "true");
    el.muted = !speakerOnRef.current || deafenedRef.current;
    el.style.display = "none";
    document.body.appendChild(el);
    audioElsRef.current.push(el);
    void el.play().catch(() => setInfo("Tap speaker/audio once to hear everyone."));
  }, []);

  const createClientRoom = useCallback(() => {
    const lkRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      stopLocalTrackOnUnpublish: true,
      publishDefaults: {
        audioPreset: AudioPresets.speech,
        dtx: true,
        red: true,
      },
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    lkRoom.on(RoomEvent.ConnectionStateChanged, setConnectionState);
    lkRoom.on(RoomEvent.SignalReconnecting, () => setInfo("Audio reconnecting…"));
    lkRoom.on(RoomEvent.Reconnected, () => setInfo("Audio reconnected."));
    lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      if (!user) return;
      const ids = new Set(speakers.map((speaker) => speaker.identity));
      setMySpeakingState(user.uid, ids.has(user.uid), activeRoomId).catch(() => {});
    });
    lkRoom.on(RoomEvent.TrackSubscribed, (track, _pub: RemoteTrackPublication, _p: RemoteParticipant) => {
      attachRemoteTrack(track);
    });
    lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => {
        audioElsRef.current = audioElsRef.current.filter((node) => node !== el);
        el.remove();
      });
    });
    lkRoom.on(RoomEvent.Disconnected, () => setConnectionState(ConnectionState.Disconnected));
    return lkRoom;
  }, [activeRoomId, attachRemoteTrack, user]);

  const connectToAudio = useCallback(async () => {
    if (!user) throw new Error("Please sign in first.");
    if (lkRoomRef.current?.state === ConnectionState.Connected && joinedRoomRef.current === activeRoomId) return lkRoomRef.current;
    if (connectPromiseRef.current && joinedRoomRef.current === activeRoomId) return connectPromiseRef.current;

    setConnecting(true);
    setErr(null);
    const promise = (async () => {
      if (joinedRoomRef.current && joinedRoomRef.current !== activeRoomId) await cleanupAudioRoom();
      const role: "host" | "listener" = isHost ? "host" : "listener";
      await joinVoiceRoom(user.uid, { name: myName, initials, photoURL: user.photoURL, role }, activeRoomId);
      const tokenRes = await createLiveKitToken({
        data: {
          identity: user.uid,
          name: myName,
          room: activeRoomId,
          canPublish: true,
        },
      });
      if (!tokenRes.ok) throw new Error(tokenRes.error);
      const lkRoom = createClientRoom();
      lkRoomRef.current = lkRoom;
      joinedRoomRef.current = activeRoomId;
      setConnectionState(lkRoom.state);
      await lkRoom.connect(tokenRes.url, tokenRes.token, { autoSubscribe: true });
      setConnectionState(lkRoom.state);
      return lkRoom;
    })();

    connectPromiseRef.current = promise;
    try {
      return await promise;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not connect to voice service.");
      throw e;
    } finally {
      setConnecting(false);
      connectPromiseRef.current = null;
    }
  }, [activeRoomId, cleanupAudioRoom, createClientRoom, initials, isHost, myName, user]);

  useEffect(() => {
    if (!user) return;
    void connectToAudio().catch(() => {});
    const cleanup = () => {
      void cleanupAudioRoom();
    };
    window.addEventListener("beforeunload", cleanup);
    return () => {
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
    };
  }, [activeRoomId, cleanupAudioRoom, connectToAudio, user]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages.length, chatOpen]);

  useEffect(() => {
    if (!info && !err) return;
    const t = window.setTimeout(() => {
      setInfo(null);
      setErr(null);
    }, 4200);
    return () => window.clearTimeout(t);
  }, [info, err]);

  function resumeBlockedAudio() {
    audioElsRef.current.forEach((el) => {
      el.muted = !speakerOn || deafened;
      void el.play().catch(() => {});
    });
  }

  function startLocalSpeakingMeter(stream: MediaStream) {
    analyserStopRef.current?.();
    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let raf = 0;
      let lastSpeaking = false;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, n) => sum + n, 0) / data.length;
        const speaking = avg > 18;
        if (speaking !== lastSpeaking && user) {
          lastSpeaking = speaking;
          setMySpeakingState(user.uid, speaking, activeRoomId).catch(() => {});
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
      analyserStopRef.current = () => {
        cancelAnimationFrame(raf);
        source.disconnect();
        void audioContext.close().catch(() => {});
      };
    } catch {
      analyserStopRef.current = null;
    }
  }

  async function publishMicFromGesture() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not support microphone capture.");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });
    const track = stream.getAudioTracks()[0];
    if (!track) throw new Error("No microphone track found.");
    const lkRoom = await connectToAudio();
    const existing = lkRoom.localParticipant.getTrackPublication(Track.Source.Microphone);
    const existingTrack = existing?.track?.mediaStreamTrack;
    if (existingTrack) await lkRoom.localParticipant.unpublishTrack(existingTrack, true);
    await lkRoom.localParticipant.publishTrack(track, {
      source: Track.Source.Microphone,
      name: "microphone",
      dtx: true,
      red: true,
    });
    localMicStreamRef.current = stream;
    startLocalSpeakingMeter(stream);
    return lkRoom;
  }

  async function toggleMute() {
    if (!user || micBusy) return;
    setMicBusy(true);
    setErr(null);
    setInfo(null);
    try {
      void lkRoomRef.current?.startAudio().catch(() => {});
      resumeBlockedAudio();
      const shouldEnable = !localMicOn;
      if (!shouldEnable) {
        const pub = lkRoomRef.current?.localParticipant.getTrackPublication(Track.Source.Microphone);
        const mediaTrack = pub?.track?.mediaStreamTrack;
        if (mediaTrack) await lkRoomRef.current?.localParticipant.unpublishTrack(mediaTrack, true);
        stopLocalMic();
        await setMyMuteState(user.uid, true, activeRoomId).catch(() => {});
        return;
      }

      const firstFree = mySeat == null
        ? Array.from({ length: totalSeats }, (_, idx) => idx).find((idx) => !seatMap.has(idx) && !lockedSeats.has(idx))
        : mySeat;
      if (firstFree == null) {
        setInfo("All seats are full right now.");
        return;
      }

      await publishMicFromGesture();
      setLocalMicOn(true);
      setAudioReady(true);
      if (mySeat == null) {
        const ok = await takeSeat(user.uid, firstFree, activeRoomId);
        if (!ok) setInfo("Mic is on, but that seat was taken. Pick another seat.");
      }
      await setMyMuteState(user.uid, false, activeRoomId).catch(() => {});
      setInfo("Mic is live — others can hear you now.");
    } catch (e) {
      stopLocalMic();
      const error = e as DOMException & { name?: string; message?: string };
      let msg = error?.message || "Could not enable microphone.";
      if (error?.name === "NotAllowedError") msg = "Mic permission denied. Tap site settings and allow microphone.";
      else if (error?.name === "NotFoundError") msg = "No microphone found on this device.";
      else if (error?.name === "NotReadableError") msg = "Microphone is already in use by another app.";
      else if (error?.name === "SecurityError") msg = "Mic works only on secure HTTPS links.";
      setErr(msg);
    } finally {
      setMicBusy(false);
    }
  }

  async function unlockAudio() {
    try {
      const lkRoom = await connectToAudio();
      await lkRoom.startAudio();
      resumeBlockedAudio();
      setAudioReady(true);
      setInfo("Speaker audio is ready.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start audio.");
    }
  }

  async function leave() {
    await cleanupAudioRoom();
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/app");
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    await sendVoiceMessage({
      name: myName,
      initials,
      text: text.trim(),
      userId: user.uid,
      photoURL: user.photoURL,
    }, activeRoomId);
    setText("");
  }

  function toggleSpeaker() {
    setSpeakerOn((on) => {
      const next = !on;
      audioElsRef.current.forEach((a) => {
        a.muted = !next || deafened;
      });
      if (next) resumeBlockedAudio();
      return next;
    });
  }

  async function toggleDeafen() {
    const next = !deafened;
    setDeafened(next);
    audioElsRef.current.forEach((a) => {
      a.muted = next || !speakerOn;
    });
    if (user) await setMyDeafenState(user.uid, next, activeRoomId).catch(() => {});
  }

  async function onSeatClick(idx: number) {
    if (!user) return;
    const occupant = seatMap.get(idx);
    if (occupant) return;
    if (lockedSeats.has(idx)) {
      setInfo("This seat is locked.");
      return;
    }
    if (room && room.free_join === false && !isHost) {
      setInfo("Free join is off. Raise your hand for the host.");
      return;
    }
    const ok = await takeSeat(user.uid, idx, activeRoomId);
    if (!ok) setInfo("Seat just got taken — try another.");
  }

  async function onLeaveSeat() {
    if (!user) return;
    const pub = lkRoomRef.current?.localParticipant.getTrackPublication(Track.Source.Microphone);
    const mediaTrack = pub?.track?.mediaStreamTrack;
    if (mediaTrack) await lkRoomRef.current?.localParticipant.unpublishTrack(mediaTrack, true).catch(() => {});
    stopLocalMic();
    await leaveSeat(user.uid, activeRoomId);
  }

  async function onRaiseHand() {
    if (!user) return;
    await setHandRaised(user.uid, !handRaised, activeRoomId);
  }

  async function onReact(emoji: string) {
    if (!user) return;
    setReactionsOpen(false);
    await sendReaction(user.uid, emoji, activeRoomId);
  }

  async function onGift(gift: (typeof GIFTS)[number]) {
    if (!user) return;
    const target = participants.find((p) => p.seatIndex === 0) ?? participants.find((p) => p.role === "host") ?? null;
    await sendVoiceGift({
      giftId: gift.id,
      giftName: gift.name,
      emoji: gift.emoji,
      amount: gift.amount,
      fromUserId: user.uid,
      fromName: myName,
      toUserId: target?.id ?? null,
      toName: target?.name ?? null,
    }, activeRoomId);
    await sendReaction(user.uid, gift.emoji, activeRoomId).catch(() => {});
    setGiftOpen(false);
    setInfo(`${gift.name} sent.`);
  }

  async function onShare() {
    const url = window.location.href;
    const shareData = { title: room?.room_name || "Hiren Voice Room", text: "Join my Hiren Kundli voice room ✨", url };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(url);
        setInfo("Room link copied.");
      }
    } catch {
      /* user dismissed */
    }
  }

  async function onCreateRoom(data: { name: string; category: string; seats: number; announcement: string }) {
    if (!user) return;
    const clean = data.name.trim() || `${myName}'s Room`;
    const id = `room_${user.uid.slice(0, 8)}_${Date.now().toString(36)}`.slice(0, 48);
    await createVoiceRoom({
      roomId: id,
      room_name: clean,
      ownerId: user.uid,
      ownerName: myName,
      max_seats: data.seats,
      category: data.category,
      announcement: data.announcement,
    });
    setActiveRoomId(id);
    setCreateOpen(false);
    setRoomPickerOpen(false);
  }

  const roomTitle = room?.room_name || "Hiren Voice Room";
  const roomShortId = activeRoomId.replace(/^room_/, "").slice(0, 8).toUpperCase();
  const connected = connectionState === ConnectionState.Connected;
  const audioStatus = connected ? (localMicOn ? "Speaking" : audioReady ? "Listening" : "Tap audio") : connecting ? "Connecting" : "Offline";

  return (
    <CosmicShell>
      <section className="relative mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-6xl flex-col px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3 md:min-h-screen md:px-5 md:pb-28 md:pt-5">
        <header className="relative z-10 overflow-hidden rounded-2xl border border-primary/20 bg-card/55 shadow-luxury backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 px-3 py-3 md:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setRoomPickerOpen((v) => !v)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/15 text-primary"
                aria-label="Open rooms"
              >
                <Radio className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <button onClick={() => setRoomPickerOpen((v) => !v)} className="flex max-w-full items-center gap-1 text-left" aria-label="Switch room">
                  <h1 className="hk-gold-text truncate font-serif text-lg leading-tight md:text-2xl">{roomTitle}</h1>
                  <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                </button>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground md:text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold tracking-wider text-destructive"><span className="h-1.5 w-1.5 rounded-full bg-destructive" />LIVE</span>
                  <span>ID {roomShortId}</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{participants.length}</span>
                  <span className="inline-flex items-center gap-1"><Wifi className="h-3 w-3" />{audioStatus}</span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <IconBtn label="Share" onClick={onShare}><Share2 className="h-4 w-4" /></IconBtn>
              {isHost && <IconBtn label="Settings" onClick={() => setSettingsOpen(true)}><Settings className="h-4 w-4" /></IconBtn>}
              <button onClick={leave} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-destructive/55 bg-destructive/10 px-3 text-xs font-semibold text-destructive hover:bg-destructive/20" aria-label="Leave room">
                <X className="h-4 w-4" /><span className="hidden sm:inline">Leave</span>
              </button>
            </div>
          </div>
          {room?.announcement && <div className="border-t border-primary/10 px-4 py-2 text-xs text-foreground/75"><Bell className="mr-1 inline h-3.5 w-3.5 text-primary" />{room.announcement}</div>}
        </header>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_18rem]">
          <main className="min-w-0">
            {(err || info) && <StatusToast kind={err ? "error" : "info"} text={err || info || ""} />}

            {roomPickerOpen && (
              <RoomDock
                rooms={rooms}
                activeRoomId={activeRoomId}
                onSelect={(id) => {
                  setActiveRoomId(id);
                  setRoomPickerOpen(false);
                }}
                onCreate={() => setCreateOpen(true)}
              />
            )}

            <div className="mt-3 rounded-3xl border border-primary/15 bg-card/35 p-3 shadow-luxury backdrop-blur-xl md:p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Stage seats</p>
                  <p className="text-xs text-foreground/70">Tap any open orbit to sit. Mic starts from the golden button.</p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-background/35 px-2.5 py-1 text-[11px] text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> {totalSeats} seats
                </div>
              </div>
              <div className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4">
                {Array.from({ length: totalSeats }).map((_, idx) => {
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
                        await leaveSeat(occupant.id, activeRoomId).catch(() => {});
                        setInfo(`${occupant.name} removed from seat.`);
                      }}
                      onToggleLock={async () => {
                        if (!user?.email) return;
                        await toggleSeatLock(idx, !locked, user.email, activeRoomId);
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <RoomMetric icon={<Users className="h-4 w-4" />} label="Listeners" value={participants.length} />
              <RoomMetric icon={<Hand className="h-4 w-4" />} label="Raised hands" value={participants.filter((p) => p.handRaised).length} />
              <RoomMetric icon={<Coins className="h-4 w-4" />} label="Gifts" value={gifts.length} />
            </div>

            {lobby.length > 0 && <LobbyStrip lobby={lobby} />}
          </main>

          <aside className="hidden min-w-0 space-y-3 lg:block">
            <SidePanel title="Top supporters">
              <div className="space-y-2">
                {topGifted.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-2xl border border-primary/10 bg-background/35 p-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-[11px] text-primary">{i + 1}</span>
                    <Avatar name={p.name} initials={p.initials} photoURL={p.photoURL ?? null} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.gifted ?? 0} coins</p>
                    </div>
                  </div>
                ))}
                {topGifted.length === 0 && <p className="text-xs text-muted-foreground">No supporters yet.</p>}
              </div>
            </SidePanel>
            <SidePanel title="Recent gifts">
              <GiftFeed gifts={gifts.slice(0, 5)} />
            </SidePanel>
          </aside>
        </div>

        {!audioReady && connected && (
          <button onClick={unlockAudio} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/15 px-4 py-3 text-sm font-semibold text-primary shadow-luxury backdrop-blur-xl hover:bg-primary/25">
            <Zap className="h-4 w-4" /> Start listening
          </button>
        )}

        <FloatingControls
          micOn={localMicOn && !isMuted}
          micBusy={micBusy}
          connected={connected || !connecting}
          speakerOn={speakerOn && !deafened}
          deafened={deafened}
          chatOpen={chatOpen}
          giftOpen={giftOpen}
          handRaised={handRaised}
          reactionsOpen={reactionsOpen}
          hasSeat={mySeat != null}
          onMic={toggleMute}
          onSpeaker={toggleSpeaker}
          onDeafen={toggleDeafen}
          onChat={() => setChatOpen((v) => !v)}
          onGift={() => setGiftOpen((v) => !v)}
          onRaiseHand={onRaiseHand}
          onReactions={() => setReactionsOpen((v) => !v)}
          onLeaveSeat={onLeaveSeat}
          onLeave={leave}
          onReact={onReact}
        />

        {chatOpen && <ChatPanel messages={messages} chatScrollRef={chatScrollRef} text={text} setText={setText} onSend={send} onClose={() => setChatOpen(false)} />}
        {giftOpen && <GiftPanel gifts={GIFTS} recent={gifts.slice(0, 3)} onGift={onGift} onClose={() => setGiftOpen(false)} />}
        {createOpen && <CreateRoomSheet onClose={() => setCreateOpen(false)} onCreate={onCreateRoom} />}
        {isHost && settingsOpen && <HostSettings room={room} participants={participants} adminEmail={user?.email ?? null} roomId={activeRoomId} onClose={() => setSettingsOpen(false)} onInfo={setInfo} />}
        <ReactionLayer participants={participants} gifts={gifts} />
      </section>
    </CosmicShell>
  );
}

function CosmicShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-85" style={{ backgroundImage: `url(${cosmicBg})` }} aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--gold)_14%,transparent),transparent_44%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_72%,transparent),var(--background)_84%)]" aria-hidden />
      <div className="hk-starfield" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function StatusToast({ kind, text }: { kind: "info" | "error"; text: string }) {
  return (
    <p className={`rounded-2xl border p-3 text-center text-xs ${kind === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10 text-primary"}`}>
      {text}
    </p>
  );
}

function Avatar({ name, initials, photoURL, size = 64 }: { name: string; initials: string; photoURL?: string | null; size?: number }) {
  return (
    <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/25 bg-card text-xs font-bold text-primary" style={{ height: size, width: size }} aria-label={name}>
      {photoURL ? <img src={photoURL} alt={name} loading="lazy" className="h-full w-full object-cover" /> : <span>{initials}</span>}
    </div>
  );
}

function SeatTile({ index, occupant, locked, isMe, isHost, onClick, onKick, onToggleLock }: {
  index: number;
  occupant: (VoiceParticipant & { id: string }) | null;
  locked: boolean;
  isMe: boolean;
  isHost: boolean;
  onClick: () => void;
  onKick: () => void;
  onToggleLock: () => void;
}) {
  if (!occupant) {
    return (
      <div className="group flex min-w-0 flex-col items-center gap-2">
        <button onClick={onClick} disabled={locked} className={`relative grid h-[72px] w-[72px] place-items-center rounded-full border border-dashed transition sm:h-[82px] sm:w-[82px] ${locked ? "cursor-not-allowed border-muted-foreground/30 bg-background/30 opacity-60" : "border-primary/30 bg-background/35 hover:border-primary hover:bg-primary/10"}`} aria-label={locked ? `Seat ${index + 1} locked` : `Take seat ${index + 1}`}>
          {locked ? <Lock className="h-5 w-5 text-muted-foreground" /> : <Plus className="h-6 w-6 text-primary/80 transition group-hover:scale-110" />}
          {isHost && (
            <button onClick={(e) => { e.stopPropagation(); onToggleLock(); }} className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-primary/30 bg-background text-primary shadow" aria-label={locked ? "Unlock seat" : "Lock seat"}>
              {locked ? <ShieldOff className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
            </button>
          )}
        </button>
        <span className="max-w-full truncate text-[10px] text-muted-foreground">{locked ? "Locked" : `Seat ${index + 1}`}</span>
      </div>
    );
  }

  const speaking = !!occupant.isSpeaking && !occupant.isMuted;
  return (
    <div className="group flex min-w-0 flex-col items-center gap-2">
      <div className="relative">
        {speaking && <span className="absolute -inset-3 animate-pulse rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_55%,transparent),transparent_70%)]" />}
        <div className={`relative rounded-full transition ${speaking ? "scale-105 ring-2 ring-primary shadow-[0_0_32px_-4px_var(--gold)]" : "ring-2 ring-primary/35"}`}>
          <Avatar name={occupant.name} initials={occupant.initials} photoURL={occupant.photoURL ?? null} size={74} />
        </div>
        {occupant.role === "host" && <span className="absolute -top-2 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow"><Crown className="h-3.5 w-3.5" /></span>}
        {occupant.handRaised && <span className="absolute -left-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground shadow"><Hand className="h-3.5 w-3.5" /></span>}
        <span className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background ${occupant.isMuted ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
          {occupant.isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
        </span>
        {isHost && !isMe && <button onClick={onKick} className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition group-hover:opacity-100" aria-label="Remove from seat"><X className="h-3 w-3" /></button>}
      </div>
      <span className={`max-w-[86px] truncate text-[11px] ${isMe ? "font-semibold text-primary" : "text-foreground/85"}`}>{isMe ? "You" : occupant.name}</span>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} aria-label={label} title={label} className="grid h-10 w-10 place-items-center rounded-full border border-primary/20 bg-background/45 text-foreground hover:bg-primary/10">{children}</button>;
}

function ControlButton({ onClick, active, label, disabled, children }: { onClick: () => void; active: boolean; label: string; disabled?: boolean; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} disabled={disabled} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-45 ${active ? "bg-primary text-primary-foreground shadow-[0_0_26px_-4px] shadow-primary/70" : "bg-card/90 text-foreground hover:bg-card"}`}>
      {children}
    </button>
  );
}

function FloatingControls(props: {
  micOn: boolean;
  micBusy: boolean;
  connected: boolean;
  speakerOn: boolean;
  deafened: boolean;
  chatOpen: boolean;
  giftOpen: boolean;
  handRaised: boolean;
  reactionsOpen: boolean;
  hasSeat: boolean;
  onMic: () => void;
  onSpeaker: () => void;
  onDeafen: () => void;
  onChat: () => void;
  onGift: () => void;
  onRaiseHand: () => void;
  onReactions: () => void;
  onLeaveSeat: () => void;
  onLeave: () => void;
  onReact: (emoji: string) => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-2 md:left-64">
      <div className="relative flex max-w-[calc(100vw-1rem)] items-center gap-1.5 overflow-x-auto rounded-full border border-primary/25 bg-background/88 px-2 py-2 shadow-luxury backdrop-blur-xl">
        <ControlButton onClick={props.onMic} active={props.micOn} label={props.micOn ? "Mute" : "Turn mic on"} disabled={props.micBusy || !props.connected}>{props.micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</ControlButton>
        <ControlButton onClick={props.onSpeaker} active={props.speakerOn} label={props.speakerOn ? "Speaker on" : "Speaker off"}>{props.speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</ControlButton>
        <ControlButton onClick={props.onDeafen} active={props.deafened} label="Deafen"><Headphones className="h-5 w-5" /></ControlButton>
        <ControlButton onClick={props.onGift} active={props.giftOpen} label="Gifts"><Gift className="h-5 w-5" /></ControlButton>
        <ControlButton onClick={props.onReactions} active={props.reactionsOpen} label="Reactions"><Smile className="h-5 w-5" /></ControlButton>
        <ControlButton onClick={props.onRaiseHand} active={props.handRaised} label="Raise hand"><Hand className="h-5 w-5" /></ControlButton>
        <ControlButton onClick={props.onChat} active={props.chatOpen} label="Chat"><MessageCircle className="h-5 w-5" /></ControlButton>
        {props.hasSeat && <button onClick={props.onLeaveSeat} className="h-11 shrink-0 rounded-full bg-card/90 px-3 text-[11px] font-semibold text-foreground hover:bg-card">Leave seat</button>}
        <button onClick={props.onLeave} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg hover:brightness-110" aria-label="Leave room"><LogOut className="h-5 w-5" /></button>
        {props.reactionsOpen && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-2xl border border-primary/25 bg-background/95 p-2 shadow-xl backdrop-blur-xl">
            <div className="flex gap-1.5">
              {REACTIONS.map((e) => <button key={e} onClick={() => props.onReact(e)} className="grid h-10 w-10 place-items-center rounded-full text-xl hover:bg-primary/10" aria-label={`React ${e}`}>{e}</button>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RoomDock({ rooms, activeRoomId, onSelect, onCreate }: { rooms: (VoiceRoom & { id: string })[]; activeRoomId: string; onSelect: (id: string) => void; onCreate: () => void }) {
  return (
    <div className="mt-3 rounded-3xl border border-primary/20 bg-background/88 p-3 shadow-luxury backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="hk-gold-text font-serif text-base">Voice rooms</h2>
        <button onClick={onCreate} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Plus className="h-3.5 w-3.5" />Create</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => (
          <button key={r.id} onClick={() => onSelect(r.id)} className={`rounded-2xl border p-3 text-left transition ${r.id === activeRoomId ? "border-primary bg-primary/10" : "border-primary/10 bg-card/35 hover:border-primary/35"}`}>
            <p className="truncate text-sm font-semibold text-foreground">{r.room_name}</p>
            <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground"><Users className="h-3 w-3" />{r.listenerCount ?? 0} live · {r.category ?? "Open"}</p>
          </button>
        ))}
        {rooms.length === 0 && <p className="text-xs text-muted-foreground">No rooms yet.</p>}
      </div>
    </div>
  );
}

function RoomMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-card/35 p-3 backdrop-blur"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">{icon}</span><div><p className="text-lg font-semibold">{value}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p></div></div>;
}

function LobbyStrip({ lobby }: { lobby: (VoiceParticipant & { id: string })[] }) {
  return (
    <div className="mt-3 rounded-3xl border border-primary/15 bg-card/30 p-3 backdrop-blur-xl">
      <p className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">Lobby — {lobby.length}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {lobby.map((p) => <div key={p.id} className="flex shrink-0 items-center gap-2 rounded-full border border-primary/15 bg-background/40 py-1 pl-1 pr-3"><Avatar name={p.name} initials={p.initials} photoURL={p.photoURL ?? null} size={30} /><span className="max-w-24 truncate text-xs">{p.name}</span>{p.handRaised && <Hand className="h-3 w-3 text-primary" />}</div>)}
      </div>
    </div>
  );
}

function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-primary/15 bg-card/35 p-4 shadow-luxury backdrop-blur-xl"><h2 className="hk-gold-text mb-3 font-serif text-base">{title}</h2>{children}</section>;
}

function GiftFeed({ gifts }: { gifts: (VoiceGift & { id: string })[] }) {
  return <div className="space-y-2">{gifts.map((g) => <div key={g.id} className="rounded-2xl border border-primary/10 bg-background/35 p-2 text-xs"><span className="mr-1 text-lg">{g.emoji}</span><span className="font-semibold text-primary">{g.fromName}</span> sent {g.giftName}</div>)}{gifts.length === 0 && <p className="text-xs text-muted-foreground">No gifts yet.</p>}</div>;
}

function ChatPanel({ messages, chatScrollRef, text, setText, onSend, onClose }: { messages: (VoiceMessage & { id: string })[]; chatScrollRef: React.RefObject<HTMLUListElement | null>; text: string; setText: (v: string) => void; onSend: (e: FormEvent) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[72vh] w-full max-w-xl flex-col rounded-t-3xl border border-primary/25 bg-background/96 shadow-luxury backdrop-blur-xl md:left-64 md:right-4 md:bottom-24 md:max-w-md md:rounded-3xl" role="dialog" aria-label="Live chat">
      <div className="flex items-center justify-between border-b border-primary/15 px-4 py-3"><h2 className="hk-gold-text font-serif text-base">Live Chat</h2><button onClick={onClose} aria-label="Close chat" className="grid h-8 w-8 place-items-center rounded-full hover:bg-primary/10"><X className="h-4 w-4" /></button></div>
      <ul ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">{[...messages].reverse().map((m) => { const t = tsToDate(m.createdAt); return <li key={m.id} className="flex items-start gap-2.5"><Avatar name={m.name} initials={m.initials} photoURL={(m as VoiceMessage & { photoURL?: string | null }).photoURL ?? null} size={30} /><div className="min-w-0"><p className="text-[11px] text-muted-foreground"><span className="font-semibold text-primary">{m.name}</span>{t && <span className="ml-2">{formatDistanceToNow(t, { addSuffix: true })}</span>}</p><p className="mt-0.5 break-words rounded-2xl rounded-tl-sm bg-card/70 px-3 py-1.5 text-sm text-foreground/90">{m.text}</p></div></li>; })}{messages.length === 0 && <li className="text-xs text-muted-foreground">No messages yet.</li>}</ul>
      <form onSubmit={onSend} className="flex gap-2 border-t border-primary/15 p-3"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="min-w-0 flex-1 rounded-full border border-primary/20 bg-background/60 px-4 py-2 text-sm outline-none focus:border-primary" /><button type="submit" className="hk-button-primary inline-flex h-10 w-10 items-center justify-center rounded-full"><Send className="h-4 w-4" /></button></form>
    </div>
  );
}

function GiftPanel({ gifts, recent, onGift, onClose }: { gifts: typeof GIFTS; recent: (VoiceGift & { id: string })[]; onGift: (gift: (typeof GIFTS)[number]) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-xl rounded-t-3xl border border-primary/25 bg-background/96 p-4 shadow-luxury backdrop-blur-xl md:left-64 md:right-4 md:bottom-24 md:max-w-md md:rounded-3xl">
      <div className="mb-3 flex items-center justify-between"><h2 className="hk-gold-text font-serif text-base">Send gift</h2><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-primary/10" aria-label="Close gifts"><X className="h-4 w-4" /></button></div>
      <div className="grid grid-cols-3 gap-2">{gifts.map((gift) => <button key={gift.id} onClick={() => onGift(gift)} className="rounded-2xl border border-primary/15 bg-card/40 p-3 text-center hover:border-primary/40 hover:bg-primary/10"><span className="text-2xl">{gift.emoji}</span><span className="mt-1 block text-xs font-semibold">{gift.name}</span><span className="text-[10px] text-muted-foreground">{gift.amount} coins</span></button>)}</div>
      {recent.length > 0 && <div className="mt-4"><p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Recent</p><GiftFeed gifts={recent} /></div>}
    </div>
  );
}

function CreateRoomSheet({ onClose, onCreate }: { onClose: () => void; onCreate: (data: { name: string; category: string; seats: number; announcement: string }) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(ROOM_CATEGORIES[0]);
  const [seats, setSeats] = useState(12);
  const [announcement, setAnnouncement] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm md:items-center" onClick={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onCreate({ name, category, seats, announcement }); }} className="w-full max-w-md rounded-t-3xl border border-primary/25 bg-background/96 p-5 shadow-luxury md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="hk-gold-text font-serif text-lg">Create voice room</h2><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-primary/10"><X className="h-4 w-4" /></button></div>
        <label className="grid gap-1.5 text-sm font-medium">Room name<input value={name} onChange={(e) => setName(e.target.value)} className="hk-input rounded-2xl px-4 py-3" placeholder="My cosmic room" /></label>
        <label className="mt-3 grid gap-1.5 text-sm font-medium">Category<select value={category} onChange={(e) => setCategory(e.target.value)} className="hk-input rounded-2xl px-4 py-3">{ROOM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="mt-3 grid gap-1.5 text-sm font-medium">Seats<input type="number" min={8} max={24} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="hk-input rounded-2xl px-4 py-3" /></label>
        <label className="mt-3 grid gap-1.5 text-sm font-medium">Announcement<textarea value={announcement} onChange={(e) => setAnnouncement(e.target.value)} className="hk-input min-h-20 rounded-2xl px-4 py-3" placeholder="Welcome note" /></label>
        <button className="hk-button-primary mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold">Create room</button>
      </form>
    </div>
  );
}

function ReactionLayer({ participants, gifts }: { participants: (VoiceParticipant & { id: string })[]; gifts: (VoiceGift & { id: string })[] }) {
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
        setActive((cur) => [...cur, { id: p.id, emoji: r.emoji, key: r.at, left: 18 + Math.random() * 64 }]);
        window.setTimeout(() => setActive((cur) => cur.filter((x) => x.key !== r.at)), 2400);
      }
    });
  }, [participants]);
  useEffect(() => {
    const latest = gifts[0];
    if (!latest?.createdAt) return;
    const key = Date.now();
    setActive((cur) => [...cur, { id: latest.id, emoji: latest.emoji, key, left: 18 + Math.random() * 64 }]);
    window.setTimeout(() => setActive((cur) => cur.filter((x) => x.key !== key)), 2600);
  }, [gifts]);
  return <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">{active.map((a) => <span key={`${a.id}-${a.key}`} className="absolute bottom-24 text-4xl" style={{ left: `${a.left}%`, animation: "hk-float-up 2.3s ease-out forwards" }}>{a.emoji}</span>)}<style>{`@keyframes hk-float-up{0%{transform:translateY(0) scale(.8);opacity:0}15%{opacity:1}100%{transform:translateY(-240px) scale(1.2);opacity:0}}`}</style></div>;
}

function HostSettings({ room, participants, adminEmail, roomId, onClose, onInfo }: { room: VoiceRoom | null; participants: (VoiceParticipant & { id: string })[]; adminEmail: string | null; roomId: string; onClose: () => void; onInfo: (s: string) => void }) {
  const freeJoin = room?.free_join !== false;
  const isPrivate = !!room?.is_private;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div className="max-h-[86vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-primary/25 bg-background/96 p-5 shadow-luxury md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="hk-gold-text font-serif text-lg">Host controls</h2><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-primary/10" aria-label="Close"><X className="h-4 w-4" /></button></div>
        <div className="space-y-3"><ToggleRow label="Free join" checked={freeJoin} onChange={async (v) => { await setRoomFreeJoin(v, adminEmail, roomId); onInfo(v ? "Free join enabled." : "Free join disabled."); }} /><ToggleRow label="Private room" checked={isPrivate} onChange={async (v) => { await setRoomPrivacy(v, adminEmail, roomId); onInfo(v ? "Room set to private." : "Room set to public."); }} /></div>
        <div className="mt-5"><h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Manage users</h3><ul className="space-y-2">{participants.length === 0 && <li className="text-xs text-muted-foreground">No one in the room.</li>}{participants.map((p) => <li key={p.id} className="flex items-center justify-between rounded-2xl border border-primary/15 bg-card/40 p-2"><div className="flex min-w-0 items-center gap-2.5"><Avatar name={p.name} initials={p.initials} photoURL={p.photoURL ?? null} size={32} /><div className="min-w-0"><p className="truncate text-sm">{p.name}</p><p className="text-[11px] text-muted-foreground">{p.role === "host" ? "Host" : p.seatIndex != null ? `Seat ${p.seatIndex + 1}` : "Lobby"}{p.handRaised && " · ✋"}</p></div></div><button onClick={async () => { await kickParticipant(p.id, adminEmail, roomId); onInfo(`${p.name} removed.`); }} className="rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/20">Remove</button></li>)}</ul></div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center justify-between rounded-2xl border border-primary/15 bg-card/40 p-3"><span className="text-sm">{label}</span><button onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-primary" : "bg-muted"}`} aria-pressed={checked} aria-label={label} type="button"><span className={`inline-block h-5 w-5 transform rounded-full bg-background transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} /></button></label>;
}
