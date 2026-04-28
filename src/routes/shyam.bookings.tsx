import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Copy, MessageSquare, X, ExternalLink } from "lucide-react";
import { AdminRoute } from "@/components/auth/RouteGuards";
import { AdminLayout } from "@/components/hiren/AdminLayout";
import { SessionPasswordModal } from "@/components/admin/SessionPasswordModal";
import { useAdminWriteGuard } from "@/hooks/useAdminWriteGuard";
import { useAuth } from "@/contexts/AuthContext";
import {
  attachUidToBooking,
  createUidRecord,
  listAllBookings,
  listSplApplications,
  setBookingStatus,
  setSplApplicationStatus,
  tsToDate,
  type SessionBooking,
  type SplApplication,
} from "@/lib/firestore";
import { cityCodeFrom, generateUid } from "@/lib/uid";

export const Route = createFileRoute("/shyam/bookings")({
  head: () => ({ meta: [{ title: "Admin Bookings — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminRoute>
      <AdminLayout>
        <BookingsAdmin />
      </AdminLayout>
    </AdminRoute>
  ),
});

type Tab = "bookings" | "spl";
type StatusFilter = "all" | SessionBooking["status"];

const SESSION_TIER_COLORS: Record<string, string> = {
  Bronze: "bg-amber-700/20 text-amber-300 border-amber-700/40",
  Silver: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  "Silver Prime": "bg-blue-400/15 text-blue-200 border-blue-400/40",
  "Silver Prime Lite": "bg-blue-400/10 text-blue-200 border-blue-400/30",
  Gold: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  "Gold Prime": "bg-yellow-400/20 text-yellow-200 border-yellow-400/50",
  Platinum: "bg-purple-500/15 text-purple-300 border-purple-500/40",
  "VIP Platinum": "bg-primary/20 text-primary border-primary/50",
};

function BookingsAdmin() {
  const [tab, setTab] = useState<Tab>("bookings");

  return (
    <section className="hk-container py-10 md:py-12">
      <h1 className="hk-gold-text font-serif text-3xl md:text-4xl">Bookings</h1>

      <div className="mt-6 inline-flex rounded-full border bg-card/40 p-1 text-sm">
        <button
          onClick={() => setTab("bookings")}
          className={`rounded-full px-4 py-1.5 transition ${tab === "bookings" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Session Bookings
        </button>
        <button
          onClick={() => setTab("spl")}
          className={`rounded-full px-4 py-1.5 transition ${tab === "spl" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          SPL Applications
        </button>
      </div>

      <div className="mt-6">{tab === "bookings" ? <BookingsTab /> : <SplTab />}</div>
    </section>
  );
}

function BookingsTab() {
  const { user, isViewer } = useAuth();
  const { request, modalProps } = useAdminWriteGuard();
  const [items, setItems] = useState<(SessionBooking & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesItem, setNotesItem] = useState<(SessionBooking & { id: string }) | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listAllBookings(user?.email));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    return items.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!b.user_name.toLowerCase().includes(q) && !b.user_phone.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, search]);

  function generate(b: SessionBooking & { id: string }) {
    request(async () => {
      setBusyId(b.id);
      try {
        const cityCode = cityCodeFrom(b.place_of_birth);
        const uid = generateUid({ sessionCode: b.session_code, dateOfBirth: b.date_of_birth, cityCode });
        await createUidRecord({
          uid,
          session_code: b.session_code,
          session_full_name: b.session_full_name,
          date_of_birth: b.date_of_birth,
          time_of_birth: b.time_of_birth,
          place_of_birth: b.place_of_birth,
          city_code: cityCode,
          user_name: b.user_name,
          user_phone: b.user_phone,
          user_firebase_uid: b.user_firebase_uid ?? null,
          notes: b.notes,
        }, user?.email);
        await attachUidToBooking(b.id, uid, user?.email);
        await refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed.");
      } finally {
        setBusyId(null);
      }
    });
  }

  function changeStatus(id: string, status: SessionBooking["status"]) {
    request(async () => {
      try {
        await setBookingStatus(id, status, user?.email);
        await refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed.");
      }
    });
  }

  function whatsappLink(b: SessionBooking & { id: string }) {
    const phone = b.user_phone.replace(/\D/g, "");
    const msg = `Namaste ${b.user_name} 🙏\n\nYour Hiren Kundli session has been confirmed.\n\nSession: ${b.session_full_name}\nYour UID: ${b.generated_uid ?? "(pending generation)"}\n\nKeep this UID safe — it is your session identifier.\nHiren will reach out shortly.\n\n— Hiren Kundli`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {(["all", "pending", "confirmed", "completed"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider transition ${
              statusFilter === s ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone…"
          className="ml-auto rounded-full border bg-background px-4 py-1.5 text-xs"
        />
      </div>

      {err && <p className="mb-3 text-sm text-destructive">{err}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="overflow-x-auto rounded-2xl border bg-card/40">
        <table className="min-w-[900px] text-sm">
          <thead className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">UID</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const d = tsToDate(b.created_at);
              const tier = SESSION_TIER_COLORS[b.session_full_name] ?? "border-border text-foreground";
              return (
                <tr key={b.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{b.user_name}</td>
                  <td className="px-4 py-3 text-xs">
                    <a href={whatsappLink(b)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-foreground hover:text-primary">
                      {b.user_phone} <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${tier}`}>{b.session_full_name}</span>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{d ? format(d, "MMM d, yyyy") : "—"}</td>
                  <td className="px-4 py-3">
                    {b.generated_uid ? (
                      <button onClick={() => copy(b.generated_uid!)} className="inline-flex items-center gap-1 font-mono text-[11px] text-primary">
                        {b.generated_uid.slice(0, 12)}… <Copy className="h-3 w-3" />
                      </button>
                    ) : !isViewer ? (
                      <button
                        disabled={busyId === b.id}
                        onClick={() => generate(b)}
                        className="hk-button-primary rounded-full px-3 py-1 text-[11px] font-semibold disabled:opacity-60"
                      >
                        {busyId === b.id ? "…" : "Generate UID"}
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a href={whatsappLink(b)} target="_blank" rel="noreferrer" title="WhatsApp" className="rounded-full border p-1.5 text-muted-foreground hover:text-primary">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </a>
                      {!isViewer ? (
                        <select
                          value={b.status}
                          onChange={(e) => changeStatus(b.id, e.target.value as SessionBooking["status"])}
                          className="rounded-full border bg-background px-2 py-1 text-[11px]"
                        >
                          <option value="pending">pending</option>
                          <option value="confirmed">confirmed</option>
                          <option value="completed">completed</option>
                        </select>
                      ) : (
                        <span className="rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground">{b.status}</span>
                      )}
                      <button onClick={() => setNotesItem(b)} title="Notes" className="rounded-full border p-1.5 text-muted-foreground hover:text-primary">
                        <span className="text-xs">📋</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">No bookings.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {notesItem && (
        <Modal onClose={() => setNotesItem(null)}>
          <div className="space-y-3">
            <h3 className="hk-gold-text font-serif text-xl">{notesItem.user_name}</h3>
            <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <span>Phone: {notesItem.user_phone}</span>
              <span>Session: {notesItem.session_full_name}</span>
              <span>DOB: {notesItem.date_of_birth}</span>
              <span>TOB: {notesItem.time_of_birth}</span>
              <span>Place: {notesItem.place_of_birth}</span>
              <span>Status: {notesItem.status}</span>
              {notesItem.generated_uid && <span>UID: {notesItem.generated_uid}</span>}
            </div>
            <div className="rounded-xl border bg-background/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
              <p className="mt-2 whitespace-pre-line text-sm">{notesItem.notes}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <a href={whatsappLink(notesItem)} target="_blank" rel="noreferrer" className="hk-button-primary rounded-full px-4 py-2 text-xs font-semibold">
                WhatsApp
              </a>
              <button onClick={() => setNotesItem(null)} className="rounded-full border px-4 py-2 text-xs">Close</button>
            </div>
          </div>
        </Modal>
      )}
      <SessionPasswordModal {...modalProps} />
    </>
  );
}

function SplTab() {
  const { user, isViewer } = useAuth();
  const { request, modalProps } = useAdminWriteGuard();
  const [apps, setApps] = useState<(SplApplication & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<(SplApplication & { id: string }) | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setApps(await listSplApplications(user?.email));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  function update(id: string, status: SplApplication["status"]) {
    request(async () => {
      setBusyId(id);
      try {
        await setSplApplicationStatus(id, status, user?.email);
        await refresh();
        if (viewing?.id === id) setViewing(null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed.");
      } finally {
        setBusyId(null);
      }
    });
  }

  function waLink(a: SplApplication, approved: boolean) {
    const phone = (a.q2 || "").replace(/\D/g, "");
    const msg = approved
      ? `Namaste ${a.q1} 🙏\n\nYour Silver Prime Lite application has been approved by Hiren.\n\nWe will share your session details on WhatsApp shortly.\n\n— Hiren Kundli`
      : `Namaste ${a.q1} 🙏\n\nThank you for applying for Silver Prime Lite.\nAt this time your application has not been selected.\nYou are welcome to explore other sessions when ready.\n\n— Hiren Kundli`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  const QUESTIONS = [
    "Full name",
    "WhatsApp number",
    "Date of birth",
    "Time of birth",
    "Place of birth",
    "What is the situation you are carrying?",
    "How long has it been going on?",
    "What have you tried before?",
    "What clarity are you seeking?",
    "Is a relationship involved?",
    "Have you taken sessions with Hiren before?",
    "What do you expect from this session?",
    "Why Silver Prime Lite specifically?",
  ];

  return (
    <>
      {err && <p className="mb-3 text-sm text-destructive">{err}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="overflow-x-auto rounded-2xl border bg-card/40">
        <table className="min-w-[700px] text-sm">
          <thead className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Applied</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => {
              const d = tsToDate(a.submitted_at);
              return (
                <tr key={a.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{a.q1}</td>
                  <td className="px-4 py-3 text-xs">{a.q2}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{d ? format(d, "MMM d, yyyy") : "—"}</td>
                  <td className="px-4 py-3"><SplPill status={a.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setViewing(a)} className="rounded-full border px-3 py-1 text-[11px]">View</button>
                      {a.status === "pending" && !isViewer && (
                        <>
                          <button disabled={busyId === a.id} onClick={() => update(a.id, "approved")} className="rounded-full bg-emerald-600/20 px-3 py-1 text-[11px] text-emerald-300 disabled:opacity-50">Approve</button>
                          <button disabled={busyId === a.id} onClick={() => update(a.id, "rejected")} className="rounded-full bg-destructive/20 px-3 py-1 text-[11px] text-destructive disabled:opacity-50">Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && apps.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No applications.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <Modal onClose={() => setViewing(null)}>
          <div className="space-y-4">
            <h3 className="hk-gold-text font-serif text-xl">{viewing.q1}</h3>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
              {QUESTIONS.map((q, i) => {
                const key = `q${i + 1}` as keyof SplApplication;
                const a = viewing[key] as string | undefined;
                if (!a) return null;
                return (
                  <div key={key} className="rounded-xl border bg-background/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Q{i + 1}. {q}</p>
                    <p className="mt-1 whitespace-pre-line text-sm">{a}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {!isViewer && (
                <>
                  <button onClick={() => update(viewing.id, "approved")} className="rounded-full bg-emerald-600/20 px-4 py-2 text-xs font-semibold text-emerald-300">Approve</button>
                  <button onClick={() => update(viewing.id, "rejected")} className="rounded-full bg-destructive/20 px-4 py-2 text-xs font-semibold text-destructive">Reject</button>
                </>
              )}
              <a href={waLink(viewing, true)} target="_blank" rel="noreferrer" className="hk-button-primary rounded-full px-4 py-2 text-xs font-semibold">Message on WhatsApp</a>
              <button onClick={() => setViewing(null)} className="ml-auto rounded-full border px-4 py-2 text-xs">Close</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function StatusPill({ status }: { status: SessionBooking["status"] }) {
  const map: Record<SessionBooking["status"], string> = {
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    completed: "bg-muted/40 text-muted-foreground border-border",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${map[status]}`}>{status}</span>
  );
}

function SplPill({ status }: { status: SplApplication["status"] }) {
  const map = {
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    rejected: "bg-destructive/15 text-destructive border-destructive/40",
  } as const;
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${map[status]}`}>{status}</span>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl rounded-3xl border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
