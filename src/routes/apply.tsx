import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { PageHero } from "@/components/hiren/Section";
import { supabase } from "@/integrations/supabase/client";

const prompts = [
  "Repeating problem in your life",
  "What have you tried",
  "Why it still repeats",
  "Which decision you are avoiding",
  "Biggest confusion area",
  "One clarity you want",
  "Describe your situation in 1 line",
  "External or internal problem",
  "Do you want change or just understanding",
] as const;

const applicationSchema = z.object({
  dob: z.string().min(1, "Date of birth is required"),
  time: z.string().min(1, "Time of birth is required"),
  place: z.string().trim().min(2, "Place of birth is required").max(120),
  phone: z.string().trim().min(8, "Enter a valid WhatsApp number").max(20),
  answers: z.record(z.string().trim().min(1).max(700)),
});

export const Route = createFileRoute("/apply")({
  head: () => ({ meta: [
    { title: "Apply for SPL — Hiren Kundli" },
    { name: "description", content: "Apply for the one-time Silver Prime Lite clarity route with 10 seats per day." },
    { property: "og:title", content: "Apply for SPL — Hiren Kundli" },
    { property: "og:description", content: "A one-time structured clarity application with limited daily seats." },
  ] }),
  component: ApplyPage,
});

function ApplyPage() {
  const [message, setMessage] = useState("");
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setUid("");
    const form = new FormData(event.currentTarget);
    const answers = Object.fromEntries(prompts.map((prompt, index) => [prompt, form.get(`answer-${index}`)?.toString() ?? ""]));
    const parsed = applicationSchema.safeParse({
      dob: form.get("dob")?.toString() ?? "",
      time: form.get("time")?.toString() ?? "",
      place: form.get("place")?.toString() ?? "",
      phone: form.get("phone")?.toString() ?? "",
      answers,
    });

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Please complete all fields.");
      setLoading(false);
      return;
    }

    const payload = {
      timeOfBirth: parsed.data.time,
      placeOfBirth: parsed.data.place,
      ...parsed.data.answers,
    };

    const { data, error } = await supabase.rpc("submit_spl_application", {
      _phone: parsed.data.phone,
      _dob: parsed.data.dob,
      _answers: payload,
    });

    if (error) {
      setMessage("Submission could not be completed. Please try again shortly.");
    } else {
      const result = data as { ok?: boolean; message?: string; id?: string };
      setMessage(result.message ?? "If selected, you will receive an invitation within 24 hours.");
      if (result.ok && result.id) setUid(result.id);
      if (result.ok) event.currentTarget.reset();
    }
    setLoading(false);
  }

  return (
    <>
      <PageHero eyebrow="SPL system" title="Apply for Silver Prime Lite." body="A one-time clarity route with 10 seats per day. Share the pattern, the attempted fixes, and the decision you are avoiding." />
      <section className="hk-container pb-16">
        <form onSubmit={submitApplication} className="hk-panel rounded-3xl p-6 md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Date of Birth"><input required name="dob" type="date" className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            <Field label="Time of Birth"><input required name="time" type="time" className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            <Field label="Place of Birth"><input required name="place" maxLength={120} className="hk-input w-full rounded-xl px-4 py-3" /></Field>
            <Field label="WhatsApp Number"><input required name="phone" inputMode="tel" maxLength={20} className="hk-input w-full rounded-xl px-4 py-3" /></Field>
          </div>
          <div className="mt-8 grid gap-5">
            {prompts.map((prompt, index) => (
              <Field key={prompt} label={`${index + 1}. ${prompt}`}>
                <textarea required name={`answer-${index}`} maxLength={700} rows={3} className="hk-input w-full resize-none rounded-xl px-4 py-3" />
              </Field>
            ))}
          </div>
          <button disabled={loading} className="hk-button-primary mt-8 rounded-full px-6 py-3 font-semibold transition disabled:opacity-60">{loading ? "Submitting..." : "Submit SPL Application"}</button>
          {message && <div className="mt-6 rounded-2xl border p-4 text-muted-foreground">{message}{uid && <div className="mt-2 text-sm"><span className="hk-gold-text font-semibold">UID:</span> {uid}</div>}</div>}
        </form>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-foreground">{label}{children}</label>;
}
