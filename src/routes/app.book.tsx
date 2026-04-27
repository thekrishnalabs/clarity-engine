import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { ProtectedRoute } from "@/components/auth/RouteGuards";
import { useAuth } from "@/contexts/AuthContext";
import { createBooking } from "@/lib/firestore";

const SESSIONS = [
  { code: "FR", name: "Free Trial", price: 0 },
  { code: "BR", name: "Bronze", price: 499 },
  { code: "SI", name: "Silver", price: 999 },
  { code: "SPL", name: "Silver Prime Lite", price: 1499 },
  { code: "SP", name: "Silver Prime", price: 1999 },
  { code: "GD", name: "Gold", price: 2999 },
  { code: "GP", name: "Gold Prime", price: 3999 },
  { code: "PL", name: "Platinum", price: 4499 },
  { code: "VIP", name: "VIP Platinum", price: 4999 },
];

export const Route = createFileRoute("/app/book")({
  head: () => ({ meta: [{ title: "Book Session — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ProtectedRoute>
      <BookForm />
    </ProtectedRoute>
  ),
});

function BookForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const sessionCode = String(fd.get("session_code") || "");
      const session = SESSIONS.find((s) => s.code === sessionCode);
      if (!session) throw new Error("Pick a session.");
      await createBooking({
        user_name: String(fd.get("name") || "").trim(),
        user_phone: String(fd.get("phone") || "").trim(),
        user_email: user?.email ?? null,
        user_lovable_uid: user?.id ?? null,
        date_of_birth: String(fd.get("dob") || ""),
        time_of_birth: String(fd.get("tob") || ""),
        place_of_birth: String(fd.get("place") || "").trim(),
        session_code: session.code,
        session_full_name: session.name,
        notes: String(fd.get("notes") || "").trim(),
      });
      setMsg("Booking received. We'll contact you within 24 hours.");
      setTimeout(() => navigate({ to: "/app" }), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="hk-container py-12 md:py-16">
      <p className="hk-gold-text text-xs uppercase tracking-[0.3em]">Book Session</p>
      <h1 className="hk-gold-text mt-2 font-serif text-3xl md:text-4xl">Tell us your details</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        All fields are required for accurate decoding. Notes are mandatory — describe what you want clarity on.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid max-w-2xl gap-4 rounded-3xl border bg-card/40 p-6 md:p-8">
        <Field label="Full Name" name="name" required />
        <Field label="WhatsApp Number" name="phone" type="tel" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of Birth" name="dob" type="date" required />
          <Field label="Time of Birth" name="tob" type="time" required />
        </div>
        <Field label="Place of Birth (City, State, Country)" name="place" required />
        <label className="grid gap-2 text-sm font-medium">
          Session
          <select name="session_code" required className="rounded-xl border bg-background px-4 py-3">
            <option value="">Select a session…</option>
            {SESSIONS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name} — ₹{s.price}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          What do you want clarity on? (Required)
          <textarea
            name="notes"
            required
            minLength={20}
            rows={5}
            className="rounded-xl border bg-background px-4 py-3"
            placeholder="Be specific. Vague questions get vague clarity."
          />
        </label>

        <button disabled={submitting} className="hk-button-primary mt-2 rounded-full px-6 py-3 font-semibold disabled:opacity-60">
          {submitting ? "Submitting…" : "Submit Booking"}
        </button>

        {msg && <p className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">{msg}</p>}
        {err && <p className="rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{err}</p>}
      </form>
    </section>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input name={name} type={type} required={required} className="rounded-xl border bg-background px-4 py-3" />
    </label>
  );
}
