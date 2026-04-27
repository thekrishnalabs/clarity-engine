import { Link } from "@tanstack/react-router";
import { dimensionImages } from "@/data/hiren";

export type SessionDimension = {
  /** key in dimensionImages */
  imageKey: string;
  /** route slug for /dimensions/$slug */
  routeSlug: string;
  number: number;
  title: string;
  question: string;
};

export type SessionDetailProps = {
  eyebrow: string;
  name: string;
  price: string;
  duration: string;
  questions?: string;
  scope: string;
  /** When provided, replaces the standard Book CTA */
  ctaOverride?: { label: string; to: string };
  /** Optional banner shown above the hero (e.g. SPL apply notice) */
  banner?: string;
  dimensions: SessionDimension[];
};

export function SessionDetail({
  eyebrow,
  name,
  price,
  duration,
  questions,
  scope,
  ctaOverride,
  banner,
  dimensions,
}: SessionDetailProps) {
  return (
    <section className="hk-container py-12 md:py-20">
      <Link to="/sessions" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Sessions
      </Link>

      {banner && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground/85">
          {banner}
        </div>
      )}

      {/* Hero */}
      <div className="mt-8 rounded-3xl border border-primary/30 bg-card/40 p-8 md:p-12">
        <p className="hk-gold-text text-xs uppercase tracking-[0.3em]">{eyebrow}</p>
        <h1 className="hk-gold-text mt-3 font-serif text-5xl font-bold">{name}</h1>
        <p className="mt-2 text-4xl font-bold text-foreground">{price}</p>
        <div className="mt-6 grid max-w-sm gap-3 text-sm text-muted-foreground">
          <div className="flex justify-between border-b pb-2">
            <span>Duration</span>
            <strong className="text-foreground">{duration}</strong>
          </div>
          {questions && (
            <div className="flex justify-between border-b pb-2">
              <span>Questions</span>
              <strong className="text-foreground">{questions}</strong>
            </div>
          )}
          <div className="flex justify-between pb-2">
            <span>Scope</span>
            <strong className="text-foreground">{scope}</strong>
          </div>
        </div>
        {ctaOverride ? (
          <Link
            to={ctaOverride.to}
            className="hk-button-primary mt-8 inline-flex rounded-full px-8 py-3 font-semibold"
          >
            {ctaOverride.label}
          </Link>
        ) : (
          <Link
            to="/get-started"
            className="hk-button-primary mt-8 inline-flex rounded-full px-8 py-3 font-semibold"
          >
            Book {name} Session →
          </Link>
        )}
      </div>

      {/* Dimensions */}
      <div className="mt-12">
        <h2 className="hk-gold-text font-serif text-2xl font-bold">Included Dimensions</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Click any dimension to understand what it decodes.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {dimensions.map((d) => (
            <Link
              key={d.imageKey}
              to="/dimensions/$slug"
              params={{ slug: d.routeSlug }}
              className="group overflow-hidden rounded-2xl border bg-card/40 transition hover:border-primary/50"
            >
              <img
                src={dimensionImages[d.imageKey]}
                alt={`${d.title} Dimension`}
                className="h-40 w-full object-cover opacity-80 transition group-hover:opacity-100"
              />
              <div className="p-5">
                <p className="hk-gold-text text-xs uppercase tracking-wider">
                  Dimension {d.number}
                </p>
                <h3 className="hk-gold-text mt-1 font-serif text-xl font-semibold">{d.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d.question}</p>
                <span className="mt-4 inline-flex text-xs text-primary opacity-70 transition group-hover:opacity-100">
                  Explore this dimension →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Shared dimension catalog used by every session page
export const DIM = {
  experience: {
    imageKey: "experience",
    routeSlug: "experience",
    title: "Experience",
    question: "What keeps shaping your lived experience?",
  },
  orientation: {
    imageKey: "orientation",
    routeSlug: "orientation",
    title: "Orientation",
    question: "Which direction naturally brings cleaner decisions?",
  },
  pattern: {
    imageKey: "pattern",
    routeSlug: "pattern",
    title: "Pattern",
    question: "Which pattern repeats before confusion appears?",
  },
  patternDirection: {
    imageKey: "pattern-direction",
    routeSlug: "direction",
    title: "Pattern Direction",
    question: "Where does the repeating pattern point next?",
  },
  relationshipReality: {
    imageKey: "relationship-reality",
    routeSlug: "relationship-reality",
    title: "Relationship Reality",
    question: "What is actually happening between two people?",
  },
  relationshipDirection: {
    imageKey: "relationship-direction",
    routeSlug: "relationship-direction",
    title: "Relationship Direction",
    question: "What direction creates more clarity in the relationship?",
  },
  karmic: {
    imageKey: "karmic",
    routeSlug: "karmic",
    title: "Karmic",
    question: "Which deep pattern is asking to be understood?",
  },
  karmicSystem: {
    imageKey: "karmic-system",
    routeSlug: "karmic-systems",
    title: "Karmic System",
    question: "How do multiple deep patterns interact as a system?",
  },
} as const;
