import { createFileRoute } from "@tanstack/react-router";
import { SessionDetail, DIM } from "@/components/hiren/SessionDetail";

export const Route = createFileRoute("/sessions/gold")({
  head: () => ({ meta: [{ title: "Gold Session — Hiren Kundli" }] }),
  component: () => (
    <SessionDetail
      eyebrow="Couple · 2 People"
      name="Gold"
      price="₹1200"
      duration="110 min"
      questions="50 questions"
      scope="2 people"
      dimensions={[
        { ...DIM.experience, number: 1 },
        { ...DIM.orientation, number: 2 },
        { ...DIM.pattern, number: 3 },
        { ...DIM.relationshipReality, number: 4 },
      ]}
    />
  ),
});
