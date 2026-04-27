import { createFileRoute } from "@tanstack/react-router";
import { SessionDetail, DIM } from "@/components/hiren/SessionDetail";

export const Route = createFileRoute("/sessions/platinum")({
  head: () => ({ meta: [{ title: "Platinum Session — Hiren Kundli" }] }),
  component: () => (
    <SessionDetail
      eyebrow="Multi-Person · 3 People"
      name="Platinum"
      price="₹2800"
      duration="220 min"
      scope="3 people"
      dimensions={[
        { ...DIM.experience, number: 1 },
        { ...DIM.relationshipDirection, number: 2 },
        { ...DIM.karmic, number: 3 },
      ]}
    />
  ),
});
