import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import { createBooking } from "@/lib/firestore";

type Session = {
  code: string;
  name: string;
  price: string;
  duration: string;
  people: string;
  depth: string;
  desc: string;
  dimensions: string[];
};

const SESSIONS: Session[] = [
  { code: "BR", name: "Bronze", price: "₹249", duration: "40 min", people: "1 person", depth: "Depth 1", desc: "First read of your patterns and orientation.", dimensions: ["Experience", "Orientation"] },
  { code: "SI", name: "Silver", price: "₹500", duration: "70 min", people: "1 person", depth: "Depth 2", desc: "Pattern visibility for cleaner decisions.", dimensions: ["Experience", "Orientation", "Pattern"] },
  { code: "SP", name: "Silver Prime", price: "₹800", duration: "100 min", people: "1 person", depth: "Depth 3", desc: "Where the repeating pattern is pointing next.", dimensions: ["Experience", "Orientation", "Pattern", "Pattern Direction"] },
  { code: "GD", name: "Gold", price: "₹1200", duration: "110 min", people: "2 people", depth: "Depth 3", desc: "Read the actual reality between two people.", dimensions: ["Experience", "Pattern", "Relationship Reality"] },
  { code: "GP", name: "Gold Prime", price: "₹1799", duration: "170 min", people: "2 people", depth: "Depth 4", desc: "Direction-clarity for the relationship.", dimensions: ["Pattern Direction", "Relationship Reality", "Relationship Direction"] },
  { code: "PL", name: "Platinum", price: "₹2800", duration: "220 min", people: "3 people", depth: "Depth 5", desc: "Karmic-layer depth for complex situations.", dimensions: ["Relationship Direction", "Karmic"] },
  { code: "VIP", name: "VIP Platinum", price: "₹4999", duration: "280 min", people: "4 people", depth: "Depth 6", desc: "Multi-person karmic system mapping.", dimensions: ["All", "Karmic System"] },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const Route = createFileRoute("/app/book")({
  head: () => ({ meta: [{ title: "Book Session — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ProtectedRoute>
      <BookFlow />
    </ProtectedRoute>
  ),
});

function BookFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<Session | null>(null);

  // Step 2 fields
  const [name, setName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);
  const [place, setPlace] = useState("");

  // Step 3
  const [notes, setNotes] = useState("");
  const [notesTouched, setNotesTouched] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 90 }, (_, i) => cur - 10 - i);
  }, []);

  const detailsValid = !!name.trim() && !!phone.trim() && !!day && !!month && !!year && !!place.trim() && (unknownTime || (!!hour && !!minute));
  const notesOk = notes.length >= 300;

  function appendChip(text: string) {
    setNotes((n) => (n ? n + "\n\n" + text + " " : text + " "));
  }

  async function submit() {
    if (!selected || !notesOk) return;
    setSubmitting(true);
    setErr(null);
    try {
      const dob = `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
      const tob = unknownTime ? "0000" : `${hour.padStart(2, "0")}${minute.padStart(2, "0")}`;
      await createBooking({
        user_name: name.trim(),
        user_phone: "+91" + phone.replace(/\D/g, ""),
        user_email: user?.email ?? null,
        user_firebase_uid: user?.uid ?? null,
        date_of_birth: dob,
        time_of_birth: tob,
        place_of_birth: place.trim(),
        session_code: selected.code,
        session_full_name: selected.name,
        notes: notes.trim(),
      });
      setSuccess(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success && selected) {
    return (
      <section className="hk-container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl text-primary">✦</div>
        <h1 className="hk-gold-text mt-4 font-serif text-3xl">Session Reserved</h1>
        <span className="mt-3 inline-block rounded-full border border-primary/50 px-3 py-1 text-xs uppercase tracking-wider text-primary">
          {selected.name}
        </span>
        <p className="mt-6 max-w-md text-sm text-muted-foreground">Hiren will confirm on WhatsApp within 24 hours.</p>
        <button onClick={() => navigate({ to: "/app" })} className="hk-button-primary mt-8 rounded-full px-6 py-3 text-sm font-semibold">
          Return to Dashboard →
        </button>
      </section>
    );
  }

  return (
    <section className="hk-container py-8 md:py-12">
      <p className="hk-gold-text text-xs uppercase tracking-[0.3em]">Book a Session</p>

      {/* Stepper */}
      <ol className="mt-4 flex flex-wrap items-center gap-2 text-xs md:gap-4">
        {[
          { n: 1, label: "Choose Session" },
          { n: 2, label: "Your Details" },
          { n: 3, label: "Your Situation" },
        ].map((s, i) => {
          const done = step > s.n;
          const cur = step === s.n;
          return (
            <li key={s.n} className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                cur ? "border-primary bg-primary text-primary-foreground"
                : done ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground"
              }`}>{done ? <Check className="h-3.5 w-3.5" /> : s.n}</span>
              <span className={cur ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
              {i < 2 && <span className="mx-1 h-px w-6 bg-border md:w-10" />}
            </li>
          );
        })}
      </ol>

      {err && <p className="mt-4 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{err}</p>}

      {/* Step 1 */}
      {step === 1 && (
        <div className="mt-8">
          <h2 className="font-serif text-2xl">Which session fits your situation?</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SESSIONS.map((s) => {
              const isSel = selected?.code === s.code;
              return (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setSelected(s)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    isSel ? "border-primary bg-primary/10" : "border-border bg-card/40 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="hk-gold-text font-serif text-xl">{s.name}</h3>
                    <span className="hk-gold-text font-serif text-2xl">{s.price}</span>
                  </div>
                  <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">{s.duration} · {s.people} · {s.depth}</p>
                  <p className="mt-3 text-sm text-foreground/80">{s.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {s.dimensions.map((d) => (
                      <span key={d} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{d}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex justify-end">
            <button
              disabled={!selected}
              onClick={() => setStep(2)}
              className="hk-button-primary rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-50"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="mt-8 grid max-w-2xl gap-5 rounded-3xl border bg-card/40 p-6">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border bg-background px-4 py-3" />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">WhatsApp Number</label>
            <div className="flex">
              <span className="rounded-l-xl border border-r-0 bg-background/60 px-3 py-3 text-sm text-muted-foreground">+91</span>
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-r-xl border bg-background px-4 py-3"
                placeholder="9876543210"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Date of Birth</label>
            <div className="grid grid-cols-3 gap-2">
              <select value={day} onChange={(e) => setDay(e.target.value)} className="rounded-xl border bg-background px-3 py-3">
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-xl border bg-background px-3 py-3">
                <option value="">Month</option>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-xl border bg-background px-3 py-3">
                <option value="">Year</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Time of Birth</label>
            <div className="flex flex-wrap items-center gap-2">
              <select disabled={unknownTime} value={hour} onChange={(e) => setHour(e.target.value)} className="rounded-xl border bg-background px-3 py-3 disabled:opacity-40">
                <option value="">Hour</option>
                {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}</option>)}
              </select>
              <select disabled={unknownTime} value={minute} onChange={(e) => setMinute(e.target.value)} className="rounded-xl border bg-background px-3 py-3 disabled:opacity-40">
                <option value="">Minute</option>
                {Array.from({ length: 60 }, (_, i) => i).map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
              </select>
              <label className="ml-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={unknownTime} onChange={(e) => setUnknownTime(e.target.checked)} />
                Unknown
              </label>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Place of Birth</label>
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="City, State, Country" className="w-full rounded-xl border bg-background px-4 py-3" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(1)} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <button
              disabled={!detailsValid}
              onClick={() => setStep(3)}
              className="hk-button-primary rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-50"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="mt-8 grid max-w-2xl gap-4 rounded-3xl border bg-card/40 p-6">
          <h2 className="font-serif text-2xl">What are you carrying?</h2>
          <p className="text-sm text-muted-foreground">Be honest and specific. This is what Hiren reads.</p>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => setNotesTouched(true)}
            rows={10}
            placeholder="Tell Hiren what's actually happening…"
            className={`rounded-xl border bg-background px-4 py-3 text-sm ${
              notesTouched && !notesOk ? "border-destructive" : notesOk ? "border-primary/60" : "border-border"
            }`}
          />
          <div className={`text-xs ${notesTouched && !notesOk ? "text-destructive" : notesOk ? "text-primary" : "text-muted-foreground"}`}>
            {notes.length} / 300 minimum
          </div>

          <div className="flex flex-wrap gap-2">
            {["What keeps repeating?", "What decision is pending?", "What feels stuck?"].map((c) => (
              <button key={c} type="button" onClick={() => appendChip(c)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
                {c}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={() => setStep(2)} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            <div className="flex flex-col items-end gap-1">
              {!notesOk && <p className="text-xs text-muted-foreground">Add {300 - notes.length} more characters to continue</p>}
              <button
                disabled={!notesOk || submitting}
                onClick={submit}
                className="hk-button-primary rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "Reserving…" : "Reserve Session →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Need to step away? Your draft stays here on this device. <Link to="/app" className="text-primary">Back to dashboard</Link>
      </p>
    </section>
  );
}
