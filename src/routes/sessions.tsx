import { createFileRoute } from "@tanstack/react-router";
import { PageHero, CtaBand } from "@/components/hiren/Section";
import { SessionCard } from "@/components/hiren/SessionCard";
import { sessionPlans } from "@/data/hiren";

export const Route = createFileRoute("/sessions")({
  head: () => ({ meta: [
    { title: "Sessions — Hiren Kundli" },
    { name: "description", content: "Choose a Hiren Kundli clarity session by duration, question depth, people count, and included dimensions." },
    { property: "og:title", content: "Hiren Kundli Sessions" },
    { property: "og:description", content: "Premium clarity sessions from Bronze to VIP Platinum." },
  ] }),
  component: SessionsPage,
});

function SessionsPage() {
  return (
    <>
      <PageHero eyebrow="Session depth" title="Choose the right clarity depth." body="Each session is structured by time, questions, people covered, and the dimensions included. Select based on the complexity of your decision context." />
      <section className="hk-container grid gap-5 pb-12 md:grid-cols-2 xl:grid-cols-4">
        {sessionPlans.map((plan) => <SessionCard key={plan.name} plan={plan} />)}
      </section>
      <CtaBand title="Need the free SPL route first?" body="Apply for Silver Prime Lite if you want one structured starting point before a paid session." cta="Apply for SPL" />
    </>
  );
}
