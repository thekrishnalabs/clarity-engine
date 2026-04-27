import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export const Route = createFileRoute("/apply")({
  head: () => ({ meta: [{ title: "Apply for Silver Prime Lite — Hiren Kundli" }] }),
  component: ApplyPage,
});

type Question = {
  id: string;
  label: string;
  type: "text" | "tel" | "textarea" | "select";
  required: boolean;
  options?: string[];
};

const QUESTIONS: Question[] = [
  { id: "q1", label: "What is your full name?", type: "text", required: true },
  { id: "q2", label: "What is your WhatsApp number?", type: "tel", required: true },
  { id: "q3", label: "What is your date of birth? (DD/MM/YYYY)", type: "text", required: true },
  { id: "q4", label: "What is your approximate time of birth? (or write 'Unknown')", type: "text", required: true },
  { id: "q5", label: "What is your place of birth?", type: "text", required: true },
  { id: "q6", label: "What is the primary situation or confusion you are carrying right now?", type: "textarea", required: true },
  { id: "q7", label: "How long has this situation been active in your life?", type: "text", required: true },
  { id: "q8", label: "Have you tried to resolve this before? What happened?", type: "textarea", required: true },
  { id: "q9", label: "What kind of clarity would feel useful right now — emotional, practical, or both?", type: "textarea", required: true },
  { id: "q10", label: "Is there a relationship involved in this situation? If yes, briefly describe.", type: "textarea", required: false },
  { id: "q11", label: "Have you had any clarity session (with anyone) before?", type: "select", options: ["No, this is my first", "Yes, once or twice", "Yes, multiple times"], required: true },
  { id: "q12", label: "What do you expect from a 20-minute session?", type: "textarea", required: true },
  { id: "q13", label: "Why do you feel Silver Prime Lite is the right starting point for you?", type: "textarea", required: true },
];

function ApplyPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  function handleChange(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit() {
    const missing = QUESTIONS.filter((q) => q.required && !answers[q.id]?.trim());
    if (missing.length > 0) {
      alert(`Please answer all required questions. Missing ${missing.length}.`);
      return;
    }
    setStatus("submitting");
    try {
      await addDoc(collection(getDb(), "spl_applications"), {
        ...answers,
        submitted_at: serverTimestamp(),
        status: "pending",
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section className="hk-container flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <div className="hk-gold-text text-5xl">✦</div>
        <h1 className="hk-gold-text mt-6 font-serif text-3xl font-bold">Application Submitted</h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Your Silver Prime Lite application has been received. Hiren will review it and reach out on WhatsApp within 48 hours.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">You do not need to do anything else.</p>
        <Link to="/" className="hk-button-outline mt-8 rounded-full px-6 py-3 text-sm font-semibold">
          Back to Home
        </Link>
      </section>
    );
  }

  return (
    <section className="hk-container py-12 md:py-20">
      <div className="max-w-2xl">
        <p className="hk-gold-text text-xs uppercase tracking-[0.3em]">Application</p>
        <h1 className="hk-gold-text mt-3 font-serif text-4xl font-bold">Silver Prime Lite</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          This session is given selectively — not sold. Fill this form honestly. Hiren reviews each
          application before approving. If approved, you will be contacted on WhatsApp.
        </p>
        <div className="mt-5 rounded-2xl border border-primary/20 bg-card/40 p-4 text-sm text-muted-foreground">
          ✦ 13 questions · Takes about 10 minutes · Be specific — vague answers reduce approval chances
        </div>
      </div>

      <div className="mt-10 max-w-2xl space-y-8">
        {QUESTIONS.map((q, i) => (
          <div key={q.id} className="rounded-2xl border bg-card/40 p-6">
            <label className="block">
              <span className="hk-gold-text text-xs uppercase tracking-wider">
                Question {i + 1}{!q.required ? " (Optional)" : ""}
              </span>
              <p className="mt-2 font-serif text-lg text-foreground">{q.label}</p>
            </label>
            <div className="mt-4">
              {q.type === "textarea" && (
                <textarea
                  rows={4}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  placeholder="Write your answer here..."
                />
              )}
              {q.type === "text" && (
                <input
                  type="text"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  placeholder="Your answer..."
                />
              )}
              {q.type === "tel" && (
                <input
                  type="tel"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  placeholder="+91 XXXXX XXXXX"
                />
              )}
              {q.type === "select" && (
                <div className="mt-1 flex flex-col gap-2">
                  {q.options?.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleChange(q.id, opt)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                        answers[q.id] === opt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="pt-4">
          {status === "error" && (
            <p className="mb-4 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">
              Something went wrong. Please try again.
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === "submitting"}
            className="hk-button-primary w-full rounded-full py-4 text-base font-semibold disabled:opacity-60"
          >
            {status === "submitting" ? "Submitting…" : "Submit Application →"}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Submitting does not guarantee approval. Hiren reviews every application personally.
          </p>
        </div>
      </div>
    </section>
  );
}
