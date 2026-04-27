import { createFileRoute } from "@tanstack/react-router";
import { SessionDetail, DIM } from "@/components/hiren/SessionDetail";

export const Route = createFileRoute("/sessions/silver-prime")({
  head: () => ({ meta: [{ title: "Silver Prime Session — Hiren Kundli" }] }),
  component: () => (
    <SessionDetail
      eyebrow="Individual · 1 Person"
      name="Silver Prime"
      price="₹800"
      duration="100 min"
      questions="40 questions"
      scope="1 person"
      dimensions={[
        { ...DIM.experience, number: 1 },
        { ...DIM.orientation, number: 2 },
        { ...DIM.pattern, number: 3 },
        { ...DIM.patternDirection, number: 4 },
      ]}
    />
  ),
});
