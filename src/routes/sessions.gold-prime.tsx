import { createFileRoute } from "@tanstack/react-router";
import { SessionDetail, DIM } from "@/components/hiren/SessionDetail";

export const Route = createFileRoute("/sessions/gold-prime")({
  head: () => ({ meta: [{ title: "Gold Prime Session — Hiren Kundli" }] }),
  component: () => (
    <SessionDetail
      eyebrow="Couple · 2 People"
      name="Gold Prime"
      price="₹1799"
      duration="170 min"
      questions="99 questions"
      scope="2 people"
      dimensions={[
        { ...DIM.experience, number: 1 },
        { ...DIM.patternDirection, number: 2 },
        { ...DIM.relationshipReality, number: 3 },
        { ...DIM.relationshipDirection, number: 4 },
      ]}
    />
  ),
});
