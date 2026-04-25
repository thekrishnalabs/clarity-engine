import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CircleDot, Layers3, Users } from "lucide-react";
import logo from "@/assets/hiren-kundli-logo.jpg";
import { CtaBand } from "@/components/hiren/Section";
import { dimensionLinks, dimensionImages } from "@/data/hiren";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Hiren Kundli — Decode Your Patterns" },
    { name: "description", content: "A clarity-based system for understanding patterns and making structured decisions." },
    { property: "og:title", content: "Decode Your Patterns. Decide Your Direction." },
    { property: "og:description", content: "Start with yourself, your relationship, or a multi-person clarity map." },
  ] }),
  component: Index,
});

function Index() {
  const entries = [
    { icon: CircleDot, title: "For Yourself", body: "Understand the repeating personal patterns behind hesitation, effort, and confusion." },
    { icon: Users, title: "For Your Relationship", body: "See the interaction reality clearly before making emotional or practical decisions." },
    { icon: Layers3, title: "For Multiple People", body: "Map complex dynamics across family, work, or shared decision environments." },
  ];

  return (
    <>
      <section className="hk-container grid gap-10 py-14 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="hk-eyebrow">Decision clarity engine</p>
          <h1 className="hk-heading mt-5 text-5xl md:text-7xl">Decode Your Patterns. <span className="hk-gold-text">Decide Your Direction.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">Hiren Kundli is a calm, structured system for reading patterns, identifying decision friction, and choosing the next direction with more clarity.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/apply" className="hk-button-primary inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition">Start with Yourself <ArrowRight className="size-4" /></Link>
            <Link to="/sessions" className="hk-button-outline inline-flex rounded-full px-6 py-3 font-semibold transition">View Sessions</Link>
          </div>
        </div>
        <div className="hk-panel relative overflow-hidden rounded-3xl p-7">
          <div className="absolute right-8 top-8 h-40 w-40 rounded-full border border-gold/30 hk-orbit" />
          <img src={logo} alt="Hiren Kundli pattern mark" className="relative mx-auto aspect-square w-full max-w-md rounded-3xl object-cover opacity-95" />
        </div>
      </section>

      <section className="hk-container grid gap-4 py-8 md:grid-cols-3">
        {entries.map((entry) => {
          const Icon = entry.icon;
          return (
            <article key={entry.title} className="hk-panel hk-card-hover rounded-3xl p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border text-gold"><Icon className="size-5" /></div>
              <h2 className="font-serif text-2xl font-bold">{entry.title}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{entry.body}</p>
            </article>
          );
        })}
      </section>

      <section className="hk-container py-12">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="hk-eyebrow">Dimensions + depth</p>
            <h2 className="hk-heading mt-4 text-4xl md:text-5xl">A layered map for decisions, not predictions.</h2>
            <p className="mt-5 text-muted-foreground leading-8">Each dimension decodes one layer: experience, orientation, patterns, relationship reality, and deeper system-level dynamics. Higher sessions include more dimensions and more time for structured questions.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {dimensionLinks.slice(0, 8).map((dimension) => (
              <Link key={dimension.slug} to="/dimension/$slug" params={{ slug: dimension.slug }} className="hk-panel hk-card-hover group overflow-hidden rounded-2xl">
                <div className="relative h-32 overflow-hidden">
                  <img src={dimensionImages[dimension.slug]} alt={`${dimension.title} dimension`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                </div>
                <div className="p-5">
                  <div className="hk-gold-text font-semibold">{dimension.title}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{dimension.question}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
