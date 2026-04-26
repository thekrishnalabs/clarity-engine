import { createFileRoute, Link } from "@tanstack/react-router";
import { dimensions } from "@/data/dimensions";

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
          Each dimension unlocks a different layer of understanding. Start where
          you are — go only as deep as you need.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {dimensions.map((d) => (
          <Link
            key={d.slug}
            to="/dimensions/$slug"
            params={{ slug: d.slug }}
            className="group rounded-2xl border bg-card/40 p-6 transition hover:border-primary/50 hover:bg-card/60"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {d.level}
              </span>
              <span className="hk-gold-text text-xs">{d.sessionCode}</span>
            </div>
            <h2 className="hk-gold-text mt-3 font-serif text-2xl font-semibold">
              {d.name}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">{d.session}</p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/80">
              {d.purpose}
            </p>
            <span className="mt-6 inline-flex text-sm text-primary opacity-80 transition group-hover:opacity-100">
              Explore Dimension →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
