import { createFileRoute } from "@tanstack/react-router";
import { SessionDetail, DIM } from "@/components/hiren/SessionDetail";

export const Route = createFileRoute("/sessions/bronze")({
  head: () => ({ meta: [{ title: "Bronze Session — Hiren Kundli" }] }),
  component: () => (
    <SessionDetail
      eyebrow="Individual · 1 Person"
      name="Bronze"
      price="₹249"
      duration="40 min"
      questions="10 questions"
      scope="1 person"
      dimensions={[
        { ...DIM.experience, number: 1 },
        { ...DIM.orientation, number: 2 },
      ]}
    />
  ),
});
