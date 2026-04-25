import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  ] }),
  component: ApplyPage,
});

type SlotStatus = { used: number; limit: number; remaining: number; resets_at: string };

function useSlotStatus() {
  const [status, setStatus] = useState<SlotStatus | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.rpc("spl_today_status");
      if (!cancelled && data) setStatus(data as SlotStatus);
    };
    load();
    const intv = setInterval(load, 30000);
    const tickIntv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { cancelled = true; clearInterval(intv); clearInterval(tickIntv); };
  }, []);

  let countdown = "—";
  if (status?.resets_at) {
    const diff = Math.max(0, new Date(status.resets_at).getTime() - Date.now());
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    countdown = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  // touch tick to satisfy linter and force re-render
  void tick;
  return { status, countdown, refresh: async () => {
    const { data } = await supabase.rpc("spl_today_status");
    if (data) setStatus(data as SlotStatus);
  } };
}

function ApplyPage() {
  const { status, countdown, refresh } = useSlotStatus();
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState<{ id: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const remaining = status?.remaining ?? 10;
  const used = status?.used ?? 0;
  const seatsFull = remaining <= 0;

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccess(null);
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
      setErrorMsg(parsed.error.issues[0]?.message ?? "Please complete all fields.");
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
      setErrorMsg("Submission could not be completed. Please try again shortly.");
    } else {
      const result = data as { ok?: boolean; message?: string; id?: string };
      if (result.ok && result.id) {
        setSuccess({ id: result.id, message: result.message ?? "Application received." });
        event.currentTarget.reset();
        refresh();
      } else {
        setErrorMsg(result.message ?? "Submission failed.");
      }
    }
    setLoading(false);
  }

  if (success) {
    return (
      <>
        <PageHero eyebrow="Application received" title="You're in the queue." body="Your SPL application has been recorded. Save the reference below — you can check status anytime on the UID page." />
        <section className="hk-container pb-20">
          <div className="hk-panel rounded-3xl p-6 md:p-8">
            <p className="hk-eyebrow">Reference ID</p>
            <p className="hk-gold-text mt-2 break-all font-mono text-2xl">{success.id}</p>
            <p className="mt-4 text-muted-foreground">{success.message}</p>
            <ol className="mt-6 grid gap-2 text-sm text-muted-foreground">
              <li>1. Copy your Reference ID and keep it safe.</li>
              <li>2. Check your status anytime at <span className="hk-gold-text">/uid-lookup</span>.</li>
              <li>3. If selected, you'll receive an invitation within 24 hours.</li>
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/uid-lookup" className="hk-button-primary rounded-full px-5 py-2 text-sm font-semibold">Check status</a>
              <button onClick={() => setSuccess(null)} className="hk-button-outline rounded-full px-5 py-2 text-sm font-semibold">Submit another</button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero eyebrow="SPL system" title="Apply for Silver Prime Lite." body="A one-time clarity route with 10 seats per day. Share the pattern, the attempted fixes, and the decision you are avoiding." />

      <section className="hk-container pb-6">
        <div className="hk-panel grid gap-4 rounded-3xl p-5 md:grid-cols-3 md:p-6">
          <div>
            <p className="hk-eyebrow">Today's slots</p>
            <p className="mt-2 font-serif text-3xl">
              <span className="hk-gold-text">{remaining}</span>
              <span className="text-muted-foreground">/{status?.limit ?? 10}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{used} taken so far</p>
          </div>
          <div>
            <p className="hk-eyebrow">Resets in (IST)</p>
            <p className="mt-2 font-mono text-3xl">{countdown}</p>
            <p className="mt-1 text-xs text-muted-foreground">Next 10 open at 00:00 IST</p>
          </div>
          <div>
            <p className="hk-eyebrow">Status</p>
            <p className={`mt-2 font-serif text-3xl ${seatsFull ? "text-muted-foreground" : "hk-gold-text"}`}>{seatsFull ? "Full" : "Open"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{seatsFull ? "Come back tomorrow" : "Submit while open"}</p>
          </div>
        </div>
      </section>

      <section className="hk-container pb-16">
        <form onSubmit={submitApplication} className="hk-panel rounded-3xl p-6 md:p-8">
          <fieldset disabled={seatsFull} className={seatsFull ? "opacity-60" : ""}>
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
            <button disabled={loading || seatsFull} className="hk-button-primary mt-8 rounded-full px-6 py-3 font-semibold transition disabled:opacity-60">
              {seatsFull ? "Seats full — try tomorrow" : loading ? "Submitting..." : "Submit SPL Application"}
            </button>
          </fieldset>
          {errorMsg && <div className="mt-6 rounded-2xl border border-destructive/40 p-4 text-destructive">{errorMsg}</div>}
        </form>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-foreground">{label}{children}</label>;
}
