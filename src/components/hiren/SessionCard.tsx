import { Link } from "@tanstack/react-router";
import type { SessionPlan } from "@/data/hiren";

export function SessionCard({ plan }: { plan: SessionPlan }) {
  return (
    <article className="hk-panel hk-card-hover flex h-full flex-col rounded-3xl p-6">
      {plan.featured && <span className="mb-4 w-fit rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Popular clarity depth</span>}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-bold">{plan.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{plan.people}</p>
        </div>
        <div className="hk-gold-text text-right text-3xl font-bold">{plan.price}</div>
      </div>
      <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
        <div className="flex justify-between border-b pb-3"><span>Duration</span><strong className="text-foreground">{plan.duration}</strong></div>
        {plan.questions && <div className="flex justify-between border-b pb-3"><span>Questions</span><strong className="text-foreground">{plan.questions}</strong></div>}
        <div className="flex justify-between border-b pb-3"><span>Scope</span><strong className="text-foreground">{plan.people}</strong></div>
      </div>
      <div className="mt-6">
        <h3 className="hk-gold-text text-sm font-semibold">Included dimensions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {plan.dimensions.map((dimension) => (
            <span key={dimension} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{dimension}</span>
          ))}
        </div>
      </div>
      <Link to="/get-started" className="hk-button-primary mt-8 inline-flex justify-center rounded-full px-5 py-3 font-semibold transition">
        Book Session
      </Link>
    </article>
  );
}
