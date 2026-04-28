import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Eye, EyeOff, X, Trash2 } from "lucide-react";
import { AdminRoute } from "@/components/auth/RouteGuards";
import { AdminLayout } from "@/components/hiren/AdminLayout";
import { SessionPasswordModal } from "@/components/admin/SessionPasswordModal";
import { useAdminWriteGuard } from "@/hooks/useAdminWriteGuard";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteVoiceMessage,
  kickParticipant,
  setVoiceRoom,
  setVoiceRoomActive,
  subscribeMessages,
  subscribeParticipants,
  subscribeVoiceRoom,
  tsToDate,
  type VoiceMessage,
  type VoiceParticipant,
  type VoiceRoom,
} from "@/lib/firestore";

export const Route = createFileRoute("/shyam/voice")({
  head: () => ({ meta: [{ title: "Admin Voice Room — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminRoute>
      <AdminLayout>
        <VoiceAdmin />
      </AdminLayout>
    </AdminRoute>
  ),
});

function VoiceAdmin() {
  const { user, isViewer } = useAuth();
  const { request, modalProps } = useAdminWriteGuard();
  const [room, setRoom] = useState<VoiceRoom | null>(null);
  const [participants, setParticipants] = useState<(VoiceParticipant & { id: string })[]>([]);
  const [messages, setMessages] = useState<(VoiceMessage & { id: string })[]>([]);
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const u1 = subscribeVoiceRoom(setRoom);
    const u2 = subscribeParticipants(setParticipants);
    const u3 = subscribeMessages(setMessages, 20);
    return () => { u1(); u2(); u3(); };
  }, []);

  function toggle() {
    if (!room) return;
    request(async () => {
      setBusy(true);
      try {
        await setVoiceRoomActive(!room.is_active, user?.email);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Failed.");
      } finally {
        setBusy(false);
      }
    });
  }

  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      room_name: String(fd.get("room_name") || "Hiren Voice Room"),
      room_password: String(fd.get("room_password") || ""),
      max_seats: Number(fd.get("max_seats") || 10),
    };
    request(async () => {
      setBusy(true);
      setMsg(null);
      try {
        await setVoiceRoom(payload, user?.email);
        setMsg("Saved.");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Failed.");
      } finally {
        setBusy(false);
      }
    });
  }

  function guardedKick(id: string) {
    request(() => kickParticipant(id, user?.email).catch(() => {}));
  }
  function guardedDeleteMsg(id: string) {
    request(() => deleteVoiceMessage(id, user?.email).catch(() => {}));
  }

  return (
    <section className="hk-container py-10 md:py-12">
      <h1 className="hk-gold-text font-serif text-3xl md:text-4xl">Voice Room</h1>

      {/* Status hero */}
      <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-3xl border bg-card/40 p-8 md:flex-row md:p-10">
        <div className="flex items-center gap-4">
          <span className={`relative flex h-12 w-12 items-center justify-center rounded-full ${room?.is_active ? "bg-primary/20" : "bg-muted/40"}`}>
            <span className={`h-4 w-4 rounded-full ${room?.is_active ? "bg-primary" : "bg-muted-foreground/50"}`} />
            {room?.is_active && <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />}
          </span>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
            <p className="hk-gold-text font-serif text-2xl">{room?.is_active ? "ROOM IS LIVE" : "Room is Closed"}</p>
          </div>
        </div>
        <button
          disabled={busy || !room}
          onClick={toggle}
          className={`rounded-full px-6 py-3 text-sm font-semibold transition disabled:opacity-50 ${
            room?.is_active
              ? "bg-destructive text-destructive-foreground hover:brightness-110"
              : "hk-button-primary"
          }`}
        >
          {room?.is_active ? "Close Room" : "Open Room"}
        </button>
      </div>

      {/* Settings */}
      <form onSubmit={onSave} className="mt-8 grid max-w-xl gap-4 rounded-3xl border bg-card/40 p-6">
        <h2 className="font-serif text-lg">Settings</h2>
        <label className="grid gap-2 text-sm font-medium">
          Room Name
          <input
            name="room_name"
            defaultValue={room?.room_name ?? "Hiren Voice Room"}
            key={room?.room_name ?? "rn"}
            className="rounded-xl border bg-background px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Password
          <div className="relative">
            <input
              name="room_password"
              type={showPwd ? "text" : "password"}
              defaultValue={room?.room_password ?? ""}
              key={room?.room_password ?? "pw"}
              required
              className="w-full rounded-xl border bg-background px-4 py-3 pr-12"
            />
            <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Max Seats
          <input
            name="max_seats"
            type="number"
            min={1}
            max={50}
            defaultValue={room?.max_seats ?? 10}
            key={room?.max_seats ?? "ms"}
            className="rounded-xl border bg-background px-4 py-3"
          />
        </label>
        <button disabled={busy} className="hk-button-primary rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60">
          {busy ? "Saving…" : "Save Settings"}
        </button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </form>

      {room?.is_active && (
        <>
          {/* Participants */}
          <div className="mt-8 rounded-3xl border bg-card/40 p-6">
            <h2 className="font-serif text-lg">
              Participants <span className="text-sm text-muted-foreground">({participants.length} / {room.max_seats})</span>
            </h2>
            <ul className="mt-4 grid gap-2">
              {participants.map((p) => {
                const j = tsToDate(p.joinedAt);
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/40 p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">{p.initials}</span>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">Joined {j ? formatDistanceToNow(j, { addSuffix: true }) : "—"}</p>
                      </div>
                    </div>
                    {!isViewer && (
                      <button onClick={() => guardedKick(p.id)} title="Remove" className="rounded-full border border-destructive/50 p-2 text-destructive hover:bg-destructive/10">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
              {participants.length === 0 && <li className="rounded-xl border border-dashed bg-background/20 p-4 text-center text-xs text-muted-foreground">No one in the room.</li>}
            </ul>
          </div>

          {/* Messages */}
          <div className="mt-6 rounded-3xl border bg-card/40 p-6">
            <h2 className="font-serif text-lg">Messages</h2>
            <ul className="mt-4 space-y-2">
              {messages.map((m) => {
                const t = tsToDate(m.createdAt);
                return (
                  <li key={m.id} className="flex items-start justify-between gap-3 rounded-xl border bg-background/40 p-3">
                    <div className="min-w-0">
                      <p className="text-xs"><span className="font-semibold text-primary">{m.name}</span>: <span className="text-foreground">{m.text}</span></p>
                      <p className="text-[10px] text-muted-foreground">{t ? formatDistanceToNow(t, { addSuffix: true }) : ""}</p>
                    </div>
                    {!isViewer && (
                      <button onClick={() => guardedDeleteMsg(m.id)} className="rounded-full border border-destructive/40 p-1.5 text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </li>
                );
              })}
              {messages.length === 0 && <li className="rounded-xl border border-dashed bg-background/20 p-4 text-center text-xs text-muted-foreground">No messages yet.</li>}
            </ul>
          </div>
        </>
      )}
      <SessionPasswordModal {...modalProps} />
    </section>
  );
}
