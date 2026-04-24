import { PageHero } from "@/components/hiren/Section";

export function PolicyPage({ title, points }: { title: string; points: string[] }) {
  return (
    <>
      <PageHero eyebrow="Policy" title={title} body="This page is included for transparent booking and payment approval requirements." />
      <section className="hk-container pb-16">
        <div className="hk-panel rounded-3xl p-6 md:p-8">
          <ul className="space-y-5 text-muted-foreground">
            {points.map((point) => <li key={point} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" /><span>{point}</span></li>)}
          </ul>
        </div>
      </section>
    </>
  );
}
