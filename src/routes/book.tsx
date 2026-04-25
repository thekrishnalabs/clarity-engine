import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { PageHero } from "@/components/hiren/Section";
import { sessionPlans } from "@/data/hiren";
import { supabase } from "@/integrations/supabase/client";

// Paid sessions only — SPL is excluded (use /apply for SPL).
const paidSessions = sessionPlans.filter((p) => p.name !== "Silver Prime Lite");

const bookingSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z.string().trim().min(8, "Valid WhatsApp number required").max(20),
  email: z.string().trim().email("Valid email required").max(180),
  dob: z.string().min(1, "Date of birth required"),
  tob: z.string().min(1, "Time of birth required"),
  place: z.string().trim().min(2, "Place of birth required").max(180),
  session: z.string().min(2),
  notes: z.string().trim().max(700).optional(),
});

function priceForSession(name: string): number {
  const plan = paidSessions.find((p) => p.name === name);
  if (!plan) return 0;
  return parseInt(plan.price.replace(/[^0-9]/g, ""), 10) || 0;
}

export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>) => ({ session: typeof search.session === "string" ? search.session : "" }),
  head: () => ({ meta: [
    { title: "Book a Session — Hiren Kundli" },
    { name: "description", content: "Book a paid Hiren Kundli clarity session. Choose a plan, share birth details, and we will reach out with payment details." },
    { property: "og:title", content: "Book a Hiren Kundli Session" },
    { property: "og:description", content: "Reserve a paid clarity session — Bronze through VIP Platinum." },
  ] }),
  component: BookPage,
});

function BookPage() {
  const search = Route.useSearch();
  const defaultSession = useMemo(
    () => paidSessions.some((p) => p.name === search.session) ? search.session : paidSessions[0].name,
    [search.session],
  );
  const [session, setSession] = useState(defaultSession);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const amount = priceForSession(session);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const fd = new FormData(event.currentTarget);
    const parsed = bookingSchema.safeParse({
      name: fd.get("name")?.toString() ?? "",
      phone: fd.get("phone")?.toString() ?? "",
      email: fd.get("email")?.toString() ?? "",
      dob: fd.get("dob")?.toString() ?? "",
      tob: fd.get("tob")?.toString() ?? "",
      place: fd.get("place")?.toString() ?? "",
      session: fd.get("session")?.toString() ?? "",
      notes: fd.get("notes")?.toString() || undefined,
    });

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Please check the form.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("submit_booking", {
      _name: parsed.data.name,
      _phone: parsed.data.phone,
      _email: parsed.data.email,
      _dob: parsed.data.dob,
      _tob: parsed.data.tob,
      _place: parsed.data.place,
      _session: parsed.data.session,
      _amount: priceForSession(parsed.data.session),
      _notes: parsed.data.notes ?? null,
    });

    if (error) {
      setMessage("Could not save your booking. Please try again.");
    } else {
      const result = data as { ok: boolean; message?: string };
      setMessage(result.message ?? "Booking saved.");
      if (result.ok) event.currentTarget.reset();
    }
    setLoading(false);
  }

  return (
    <>
      <PageHero
        eyebrow="Book a session"
        title="Reserve your paid clarity session."
        body="Choose a session, share the basic birth details, and we will reach out within 24 hours with payment details and the next step. For the one-time application-based Silver Prime Lite, use Apply instead."
      />
      <section className="hk-container grid gap-6 pb-16 lg:grid-cols-[1fr_0.75fr]">
        <form onSubmit={submit} className="hk-panel rounded-3xl p-6 md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Session">
              <select name="session" value={session} onChange={(e) => setSession(e.target.value)} className="hk-input w-full rounded-xl px-4 py-3">
                {paidSessions.map((plan) => (
                  <option key={plan.name} value={plan.name}>{plan.name} — {plan.price}</option>
                ))}
              </select>
            </Field>
            <Field label="Full Name"><input required name="name" maxLength={120} className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            <Field label="WhatsApp Number"><input required name="phone" inputMode="tel" maxLength={20} className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            <Field label="Email"><input required name="email" type="email" maxLength={180} className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            <Field label="Date of Birth"><input required type="date" name="dob" className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            <Field label="Time of Birth"><input required type="time" name="tob" className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            <div className="md:col-span-2">
              <Field label="Place of Birth"><input required name="place" maxLength={180} className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Notes (optional)"><textarea name="notes" maxLength={700} rows={3} className="hk-input w-full resize-none rounded-xl px-4 py-3" /></Field>
            </div>
          </div>
          <button disabled={loading} className="hk-button-primary mt-7 rounded-full px-6 py-3 font-semibold transition disabled:opacity-60">
            {loading ? "Sending..." : `Reserve ${session} — ₹${amount}`}
          </button>
          {message && <p className="mt-5 rounded-2xl border p-4 text-sm text-muted-foreground">{message}</p>}
        </form>

        <aside className="hk-panel rounded-3xl p-6">
          <p className="hk-eyebrow">Selected session</p>
          <h2 className="hk-heading mt-3 text-3xl">{session}</h2>
          <div className="hk-gold-text mt-2 font-serif text-3xl">₹{amount}</div>
          <ul className="mt-5 grid gap-2 text-sm text-muted-foreground">
            {paidSessions.find((p) => p.name === session)?.dimensions.map((d) => <li key={d}>• {d}</li>)}
          </ul>
          <p className="mt-6 text-xs leading-6 text-muted-foreground">
            Your details are stored securely. Payment is finalised over WhatsApp. A unique session UID is generated and shared once payment is confirmed.
          </p>
        </aside>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-foreground">{label}{children}</label>;
}
