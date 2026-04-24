import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CtaBand, PageHero } from "@/components/hiren/Section";
import { dimensionMeta, type DimensionSlug } from "@/data/hiren";

export const Route = createFileRoute("/dimension/$slug")({
  head: ({ params }) => {
    const item = dimensionMeta[params.slug as DimensionSlug];
    return { meta: [
      { title: `${item?.title ?? "Dimension"} — Hiren Kundli` },
      { name: "description", content: item?.question ?? "A Hiren Kundli clarity dimension." },
      { property: "og:title", content: `${item?.title ?? "Dimension"} — Hiren Kundli` },
      { property: "og:description", content: item?.question ?? "A Hiren Kundli clarity dimension." },
    ] };
  },
  component: DimensionPage,
});

function DimensionPage() {
  const { slug } = Route.useParams();
  const item = dimensionMeta[slug as DimensionSlug];

  if (!item) {
    return (
      <section className="hk-container py-20">
        <div className="hk-panel rounded-3xl p-8">
          <p className="hk-eyebrow">Dimension not found</p>
          <h1 className="hk-heading mt-4 text-4xl">This clarity dimension is not available.</h1>
          <Link to="/sessions" className="hk-button-primary mt-6 inline-flex rounded-full px-6 py-3 font-semibold">View sessions</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHero eyebrow="Clarity dimension" title={item.question} body={`${item.title} is used to make one layer of your decision pattern easier to observe, name, and work with.`}>
        <div className="hk-panel rounded-3xl p-7">
          <p className="hk-gold-text font-semibold">Tone</p>
          <p className="mt-3 text-lg leading-8 text-muted-foreground">{item.tone}</p>
        </div>
      </PageHero>
      <section className="hk-container grid gap-5 pb-12 lg:grid-cols-3">
        <InfoPanel title="What this decodes" items={item.decodes} />
        <InfoPanel title="What this does NOT do" items={item.not} />
        <div className="hk-panel rounded-3xl p-6">
          <h2 className="hk-gold-text text-xl font-semibold">Which sessions include this</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {item.sessions.map((session) => <span key={session} className="rounded-full border px-3 py-1 text-sm text-muted-foreground">{session}</span>)}
          </div>
          <Link to="/sessions" className="hk-button-primary mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 font-semibold transition">Compare sessions <ArrowRight className="size-4" /></Link>
        </div>
      </section>
      <CtaBand />
    </>
  );
}

function InfoPanel({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="hk-panel rounded-3xl p-6">
      <h2 className="hk-gold-text text-xl font-semibold">{title}</h2>
      <ul className="mt-5 space-y-4 text-muted-foreground">
        {items.map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" /> <span>{item}</span></li>)}
      </ul>
    </div>
  );
}
