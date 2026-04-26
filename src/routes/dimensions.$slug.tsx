import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getDimension, type Dimension } from "@/data/dimensions";

export const Route = createFileRoute("/dimensions/$slug")({
  loader: ({ params }) => {
    const dimension = getDimension(params.slug);
    if (!dimension) throw notFound();
    return { dimension };
  },
  head: ({ loaderData }) => {
    const d = loaderData?.dimension;
    if (!d) return { meta: [{ title: "Dimension — Hiren Kundli" }] };
    return {
      meta: [
        { title: `${d.name} Dimension — Hiren Kundli` },
        { name: "description", content: d.purpose },
        { property: "og:title", content: `${d.name} — ${d.level}` },
        { property: "og:description", content: d.purpose },
      ],
    };
  },
  notFoundComponent: () => (
    <section className="hk-container py-24 text-center">
      <h1 className="hk-gold-text font-serif text-3xl">Dimension not found</h1>
      <Link to="/dimensions" className="mt-6 inline-block text-primary">
        ← Back to Dimensions
      </Link>
    </section>
  ),
  component: DimensionDetail,
});

function Section({
  title,
  items,
  variant = "list",
}: {
  title: string;
  items: string[];
  variant?: "list" | "chips" | "checklist";
}) {
  return (
    <div className="rounded-2xl border bg-card/40 p-6">
      <h3 className="hk-gold-text font-serif text-lg font-semibold">{title}</h3>
      {variant === "chips" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((it) => (
            <span
              key={it}
              className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-foreground/80"
            >
              {it}
            </span>
          ))}
        </div>
      ) : (
        <ul className="mt-4 space-y-2 text-sm text-foreground/85">
          {items.map((it) => (
            <li key={it} className="flex gap-3">
              <span className="hk-gold-text mt-[2px]">
                {variant === "checklist" ? "✓" : "•"}
              </span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DimensionDetail() {
  const { dimension } = Route.useLoaderData() as { dimension: Dimension };
  const d = dimension;

  return (
    <section className="hk-container py-12 md:py-20">
      <Link
        to="/dimensions"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Dimensions
      </Link>

      <header className="mt-8 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-primary/40 px-3 py-1 text-xs uppercase tracking-wider text-primary">
            {d.level}
          </span>
          <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            {d.session}
          </span>
        </div>
        <h1 className="hk-gold-text mt-5 font-serif text-4xl font-bold md:text-5xl">
          {d.name}
        </h1>
        <p className="mt-5 text-lg italic leading-relaxed text-foreground/85">
          “{d.purpose}”
        </p>
      </header>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <Section title="What This Dimension Unlocks" items={d.unlocks} />
        <Section title="What Stays Locked" items={d.blocks} />
        <Section title="Tone of This Session" items={d.tone} variant="chips" />
        <Section
          title="Ideal For You If…"
          items={d.idealFor}
          variant="checklist"
        />
      </div>

      <div className="mt-14 flex flex-col items-start gap-4 rounded-2xl border border-primary/30 bg-card/40 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="hk-gold-text font-serif text-2xl font-semibold">
            Book {d.name} Session
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {d.session}
          </p>
        </div>
        <Link
          to="/sessions"
          className="hk-button-outline rounded-full px-6 py-3 text-sm font-semibold"
        >
          View Sessions →
        </Link>
      </div>
    </section>
  );
}
