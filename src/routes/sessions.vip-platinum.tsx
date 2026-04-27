import { createFileRoute } from "@tanstack/react-router";
import { SessionDetail, DIM } from "@/components/hiren/SessionDetail";

export const Route = createFileRoute("/sessions/vip-platinum")({
  head: () => ({ meta: [{ title: "VIP Platinum Session — Hiren Kundli" }] }),
  component: () => (
    <SessionDetail
      eyebrow="Multi-Person · 4 People"
      name="VIP Platinum"
      price="₹4999"
      duration="280 min"
      scope="4 people"
      dimensions={[
        { ...DIM.experience, number: 1 },
        { ...DIM.orientation, number: 2 },
        { ...DIM.pattern, number: 3 },
        { ...DIM.patternDirection, number: 4 },
        { ...DIM.relationshipReality, number: 5 },
        { ...DIM.relationshipDirection, number: 6 },
        { ...DIM.karmic, number: 7 },
        { ...DIM.karmicSystem, number: 8 },
      ]}
    />
  ),
});
