import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { AdminRoute } from "@/components/auth/RouteGuards";
import { getVoiceRoom, setVoiceRoom, type VoiceRoom } from "@/lib/firestore";

export const Route = createFileRoute("/shyam/voice")({
  head: () => ({ meta: [{ title: "Admin Voice Room — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminRoute>
      <VoiceAdmin />
    </AdminRoute>
  ),
});

function VoiceAdmin() {
  const [room, setRoom] = useState<VoiceRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getVoiceRoom().then(setRoom).finally(() => setLoading(false));
  }, []);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData(e.currentTarget);
      const data = {
        room_name: String(fd.get("room_name") || "Hiren Voice Room"),
        room_password: String(fd.get("room_password") || ""),
        max_seats: Number(fd.get("max_seats") || 10),
        is_active: fd.get("is_active") === "on",
      };
      await setVoiceRoom(data);
      setRoom(await getVoiceRoom());
      setMsg("Saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="hk-container py-16 text-sm text-muted-foreground">Loading…</p>;

  return (
    <section className="hk-container py-12 md:py-16">
      <h1 className="hk-gold-text font-serif text-3xl md:text-4xl">Voice Room</h1>
      <form onSubmit={onSave} className="mt-8 grid max-w-md gap-4 rounded-3xl border bg-card/40 p-6">
        <label className="grid gap-2 text-sm font-medium">
          Room Name
          <input name="room_name" defaultValue={room?.room_name ?? "Hiren Voice Room"} className="rounded-xl border bg-background px-4 py-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Password
          <input name="room_password" defaultValue={room?.room_password ?? ""} required className="rounded-xl border bg-background px-4 py-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Max Seats
          <input name="max_seats" type="number" min={1} max={50} defaultValue={room?.max_seats ?? 10} className="rounded-xl border bg-background px-4 py-3" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={room?.is_active ?? false} />
          Room is active (open to users)
        </label>
        <button disabled={busy} className="hk-button-primary rounded-full px-6 py-3 font-semibold disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </form>
    </section>
  );
}
