import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHero } from "@/components/hiren/Section";
import { sessionPlans } from "@/data/hiren";

export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>) => ({ session: typeof search.session === "string" ? search.session : "" }),
  head: () => ({ meta: [
    { title: "Book Session — Hiren Kundli" },
    { name: "description", content: "Book a Hiren Kundli clarity session. Cashfree payment placeholder included for approval readiness." },
    { property: "og:title", content: "Book a Hiren Kundli Session" },
    { property: "og:description", content: "Select your session and share the details needed for booking." },
  ] }),
  component: BookPage,
});

function BookPage() {
  const search = Route.useSearch();
  const defaultSession = useMemo(() => sessionPlans.some((p) => p.name === search.session) ? search.session : sessionPlans[0].name, [search.session]);
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <PageHero eyebrow="Booking" title="Reserve your clarity session." body="Select a session, share the basic details, and continue when payment is connected. Cashfree payment will be added in the next integration step." />
      <section className="hk-container grid gap-6 pb-16 lg:grid-cols-[1fr_0.8fr]">
        <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }} className="hk-panel rounded-3xl p-6 md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Session"><select name="session" defaultValue={defaultSession} className="hk-input w-full rounded-xl px-4 py-3">{sessionPlans.map((plan) => <option key={plan.name}>{plan.name}</option>)}</select></Field>
            <Field label="Name"><input required name="name" className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            <Field label="WhatsApp Number"><input required name="phone" className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            <Field label="Date of Birth"><input required type="date" name="dob" className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            <Field label="Time of Birth"><input name="time" type="time" className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            <Field label="Place of Birth"><input name="place" className="hk-input w-full rounded-xl px-4 py-3" /></Field>
          </div>
          <button className="hk-button-primary mt-7 rounded-full px-6 py-3 font-semibold transition">Continue to Payment</button>
          {submitted && <p className="mt-5 rounded-2xl border p-4 text-sm text-muted-foreground">Booking details saved for preview. Cashfree payment connection will be added later.</p>}
        </form>
        <aside className="hk-panel rounded-3xl p-6">
          <p className="hk-eyebrow">Payment placeholder</p>
          <h2 className="hk-heading mt-4 text-4xl">Cashfree ready area</h2>
          <p className="mt-4 leading-7 text-muted-foreground">This page includes the required booking flow and policy routes. The final payment action can be wired once Cashfree credentials and approval steps are ready.</p>
        </aside>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-foreground">{label}{children}</label>;
}
