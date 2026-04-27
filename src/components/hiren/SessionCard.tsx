import { Link } from "@tanstack/react-router";
import type { SessionPlan } from "@/data/hiren";

const sessionSlugMap: Record<string, string> = {
  "Bronze": "/sessions/bronze",
  "Silver": "/sessions/silver",
  "Silver Prime": "/sessions/silver-prime",
  "Silver Prime Lite": "/sessions/silver-prime-lite",
  "Gold": "/sessions/gold",
  "Gold Prime": "/sessions/gold-prime",
  "Platinum": "/sessions/platinum",
  "VIP Platinum": "/sessions/vip-platinum",
};

const dimensionSlugMap: Record<string, string> = {
  "Experience": "experience",
  "Orientation": "orientation",
  "Pattern": "pattern",
  "Pattern Direction": "direction",
  "Relationship Reality": "relationship-reality",
  "Relationship Direction": "relationship-direction",
  "Karmic": "karmic",
  "Karmic System": "karmic-systems",
};

export function SessionCard({ plan }: { plan: SessionPlan }) {
  const sessionTo = sessionSlugMap[plan.name] ?? "/sessions";
  const isLite = plan.name === "Silver Prime Lite";

  return (
    <article className="hk-panel hk-card-hover flex h-full flex-col rounded-3xl p-6">
      {plan.featured && (
        <span className="mb-4 w-fit rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
          Popular clarity depth
        </span>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-bold">{plan.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{plan.people}</p>
        </div>
        <div className="hk-gold-text text-right text-3xl font-bold">{plan.price}</div>
      </div>
      <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
        <div className="flex justify-between border-b pb-3">
          <span>Duration</span>
          <strong className="text-foreground">{plan.duration}</strong>
        </div>
        {plan.questions && (
          <div className="flex justify-between border-b pb-3">
            <span>Questions</span>
            <strong className="text-foreground">{plan.questions}</strong>
          </div>
        )}
        <div className="flex justify-between border-b pb-3">
          <span>Scope</span>
          <strong className="text-foreground">{plan.people}</strong>
        </div>
      </div>
      <div className="mt-6">
        <h3 className="hk-gold-text text-sm font-semibold">Included dimensions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {plan.dimensions.map((dimension) => {
            const slug = dimensionSlugMap[dimension];
            if (slug) {
              return (
                <Link
                  key={dimension}
                  to="/dimensions/$slug"
                  params={{ slug }}
                  className="rounded-full border border-primary/30 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {dimension}
                </Link>
              );
            }
            return (
              <span
                key={dimension}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground"
              >
                {dimension}
              </span>
            );
          })}
        </div>
      </div>
      <Link
        to={sessionTo}
        className="hk-button-primary mt-8 inline-flex justify-center rounded-full px-5 py-3 font-semibold transition"
      >
        {isLite ? "Apply for This Session →" : "View & Book →"}
      </Link>
    </article>
  );
}
