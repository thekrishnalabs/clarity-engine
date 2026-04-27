import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { dimensions } from "@/data/dimensions";
import { dimensionImages } from "@/data/hiren";
import { DimensionDetailView } from "@/components/hiren/DimensionDetailView";
import { Layers } from "lucide-react";

export const Route = createFileRoute("/dimensions")({
  head: () => ({
    meta: [
      { title: "9 Dimensions of Clarity — Hiren Kundli" },
      {
        name: "description",
        content:
          "Each dimension unlocks a different layer of understanding — from present-moment orientation to karmic systems.",
      },
      { property: "og:title", content: "9 Dimensions of Clarity — Hiren Kundli" },
      {
        property: "og:description",
        content:
          "Explore the structured layers of decoding: Experience, Orientation, Pattern, Direction, Relationship, Karmic and beyond.",
      },
    ],
  }),
  component: DimensionsList,
});

function DimensionsList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="hk-container py-16 md:py-24">
      <div className="max-w-3xl">
        <p className="hk-gold-text text-xs uppercase tracking-[0.3em]">
          Dimensions
        </p>
        <h1 className="hk-gold-text mt-3 font-serif text-4xl font-bold md:text-5xl">
          9 Dimensions of Clarity
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Each dimension unlocks a different layer of understanding. Tap any
          card to enter the full visual experience.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {dimensions.map((d, i) => {
          const img = dimensionImages[d.slug];
          return (
            <button
              key={d.slug}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative overflow-hidden rounded-2xl border bg-card/40 text-left transition hover:border-primary/50 hover:bg-card/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {img && (
                <div className="relative h-44 w-full overflow-hidden">
                  <img
                    src={img}
                    alt={`${d.name} dimension visual`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-100"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background/60 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-primary backdrop-blur-sm">
                    <Layers className="h-3 w-3" />
                    Open
                  </span>
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {d.level}
                  </span>
                  <span className="hk-gold-text text-xs">{d.sessionCode}</span>
                </div>
                <h2 className="hk-gold-text mt-3 font-serif text-2xl font-semibold">
                  {d.name}
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {d.session}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-foreground/80">
                  {d.purpose}
                </p>
                <span className="mt-6 inline-flex text-sm text-primary opacity-80 transition group-hover:opacity-100">
                  Enter Dimension →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <DimensionDetailView
        open={openIndex !== null}
        dimensions={dimensions}
        index={openIndex ?? 0}
        onClose={() => setOpenIndex(null)}
        onIndexChange={(next) => setOpenIndex(next)}
      />
    </section>
  );
}
