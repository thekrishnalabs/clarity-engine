import { createFileRoute } from "@tanstack/react-router";
import { SessionDetail, DIM } from "@/components/hiren/SessionDetail";

export const Route = createFileRoute("/sessions/silver")({
  head: () => ({ meta: [{ title: "Silver Session — Hiren Kundli" }] }),
  component: () => (
    <SessionDetail
      eyebrow="Individual · 1 Person"
      name="Silver"
      price="₹500"
      duration="70 min"
      questions="25 questions"
      scope="1 person"
      dimensions={[
        { ...DIM.experience, number: 1 },
        { ...DIM.orientation, number: 2 },
        { ...DIM.pattern, number: 3 },
      ]}
    />
  ),
});
