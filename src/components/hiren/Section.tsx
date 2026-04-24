import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, body, children }: { eyebrow?: string; title: string; body: string; children?: ReactNode }) {
  return (
    <section className="hk-container py-14 md:py-20">
      {eyebrow && <p className="hk-eyebrow mb-4">{eyebrow}</p>}
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <h1 className="hk-heading max-w-4xl text-5xl md:text-7xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{body}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export function CtaBand({ title = "Start with a structured clarity session.", body = "Choose the depth that matches your decision context and move with a cleaner map.", cta = "View Sessions" }) {
  return (
    <section className="hk-container py-12">
      <div className="hk-panel rounded-3xl p-8 md:flex md:items-center md:justify-between md:gap-8 md:p-10">
        <div>
          <h2 className="hk-heading text-3xl md:text-4xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">{body}</p>
        </div>
        <Link to="/sessions" className="hk-button-primary mt-6 inline-flex rounded-full px-6 py-3 font-semibold transition md:mt-0">
          {cta}
        </Link>
      </div>
    </section>
  );
}
