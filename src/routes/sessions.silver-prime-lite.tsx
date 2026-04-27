import { createFileRoute } from "@tanstack/react-router";
import { SessionDetail, DIM } from "@/components/hiren/SessionDetail";

export const Route = createFileRoute("/sessions/silver-prime-lite")({
  head: () => ({ meta: [{ title: "Silver Prime Lite — Hiren Kundli" }] }),
  component: () => (
    <SessionDetail
      eyebrow="Application Only · 1 Time Only"
      name="Silver Prime Lite"
      price="Application Only — Not Purchasable"
      duration="20 min"
      questions="3 questions"
      scope="1 person (1 time only)"
      banner="✦ This session is given selectively. Apply below to be considered. Hiren reviews every application personally."
      ctaOverride={{ label: "Apply for Silver Prime Lite →", to: "/apply" }}
      dimensions={[{ ...DIM.experience, number: 1 }]}
    />
  ),
});
