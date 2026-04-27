import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Lock } from "lucide-react";
import type { Dimension } from "@/data/dimensions";
import { dimensionContent } from "@/data/dimensionContent";
import { dimensionImages } from "@/data/hiren";

type Props = {
  open: boolean;
  dimensions: Dimension[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
};

export function DimensionDetailView({
  open,
  dimensions,
  index,
  onClose,
  onIndexChange,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const d = dimensions[index];
  const content = useMemo(
    () => (d ? dimensionContent[d.slug] : undefined),
    [d],
  );
  const heroImg = d ? dimensionImages[d.slug] : undefined;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset scroll on dimension change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0 });
    setProgress(0);
    setShowHint(true);
  }, [index, open]);

  // Track scroll progress
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const p = max > 0 ? el.scrollTop / max : 0;
    setProgress(p);
    if (el.scrollTop > 40) setShowHint(false);
  };

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < dimensions.length - 1)
        onIndexChange(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, dimensions.length, onClose, onIndexChange]);

  if (!open || !d || !content) return null;

  // Swipe nav — only triggers on a clear horizontal gesture, never on vertical scroll/tap
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const end = e.changedTouches[0];
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    const elapsed = Date.now() - start.t;
    // Require: meaningful horizontal travel, dominant over vertical, and a real swipe gesture (not a slow drag)
    if (Math.abs(dx) < 80) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.6) return;
    if (elapsed > 600) return;
    if (dx < 0 && index < dimensions.length - 1) onIndexChange(index + 1);
    else if (dx > 0 && index > 0) onIndexChange(index - 1);
  };

  const totalLayers = content.layers.length;
  const filledLayers = Math.min(
    totalLayers,
    Math.max(1, Math.ceil(progress * totalLayers + 0.001)),
  );

  const isAshra = d.slug === "ashra";

  const node = (
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`${d.name} dimension`}
    >
      {/* Sticky header */}
      <header className="absolute inset-x-0 top-0 z-20 border-b border-primary/15 bg-background/70 backdrop-blur-md">
        <div className="hk-container flex h-14 items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="hk-button-outline inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="hk-gold-text truncate font-serif text-sm font-semibold md:text-base">
              {d.name}
            </p>
            <p className="truncate text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {d.level}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => index > 0 && onIndexChange(index - 1)}
              disabled={index === 0}
              className="hk-button-outline rounded-full p-1.5 disabled:opacity-30"
              aria-label="Previous dimension"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() =>
                index < dimensions.length - 1 && onIndexChange(index + 1)
              }
              disabled={index === dimensions.length - 1}
              className="hk-button-outline rounded-full p-1.5 disabled:opacity-30"
              aria-label="Next dimension"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-[2px] w-full bg-primary/10">
          <div
            className="h-full bg-gradient-to-r from-primary/60 to-primary transition-[width] duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </header>

      {/* Scrollable content — touch handlers live here so vertical scroll is never hijacked at the dialog root */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="absolute inset-0 overflow-y-auto pt-14"
      >
        {/* Hero visual */}
        <div className="relative">
          <div className="relative h-[55vh] min-h-[320px] w-full overflow-hidden md:h-[65vh]">
            {heroImg ? (
              <img
                src={heroImg}
                alt={`${d.name} dimension visual`}
                loading="eager"
                decoding="async"
                className="h-full w-full animate-scale-in object-cover"
              />
            ) : (
              <div className="h-full w-full bg-card" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/30 via-background/10 to-background" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

            <div className="absolute inset-x-0 bottom-0 px-5 pb-8 md:px-10 md:pb-14">
              <div className="hk-container px-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/40 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-primary backdrop-blur-sm">
                  {d.level}
                  {isAshra && <Lock className="h-3 w-3" />}
                </span>
                <h1 className="hk-gold-text mt-3 font-serif text-4xl font-bold leading-tight md:text-6xl">
                  {d.name}
                </h1>
                <p className="mt-2 max-w-xl text-sm text-foreground/80 md:text-base">
                  {content.subtitle}
                </p>
              </div>
            </div>

            {showHint && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                <div className="flex animate-fade-in flex-col items-center gap-1 text-[10px] uppercase tracking-[0.25em] text-primary/80">
                  <span>Scroll to go deeper</span>
                  <ChevronDown className="h-4 w-4 animate-bounce" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Editorial body — minimal boxes, more typography */}
        <article className="hk-container max-w-3xl space-y-16 pb-24 pt-12 md:space-y-20 md:pt-16">
          {/* Core Insight — pull-quote, no box */}
          <section className="relative">
            <p className="hk-gold-text text-[10px] uppercase tracking-[0.4em]">
              Core Insight
            </p>
            <div className="mt-5 flex gap-5 md:gap-7">
              <span
                aria-hidden
                className="hk-gold-text shrink-0 font-serif text-5xl leading-none md:text-7xl"
              >
                “
              </span>
              <p className="font-serif text-xl italic leading-relaxed text-foreground/90 md:text-2xl">
                {content.coreInsight}
              </p>
            </div>
            <div className="mt-7 h-px w-16 bg-gradient-to-r from-primary/60 to-transparent" />
          </section>

          {/* Deep Breakdown — flowing sections separated by hairlines, not card grids */}
          <section className="space-y-10">
            <p className="hk-gold-text text-[10px] uppercase tracking-[0.4em]">
              Deep Breakdown
            </p>
            <BreakdownBlock
              label="What it represents"
              body={content.represents}
            />
            <BreakdownBlock
              label="How it affects decisions"
              body={content.affectsDecisions}
            />
            <BreakdownBlock
              label="Real-life pattern"
              body={content.realLifePattern}
            />
          </section>

          {/* Depth Layers — kept as cards because they unfold structurally */}
          <section>
            <div className="flex items-end justify-between gap-3">
              <p className="hk-gold-text text-[10px] uppercase tracking-[0.4em]">
                Depth Layers
              </p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                {filledLayers} / {totalLayers} unfolded
              </p>
            </div>
            <div className="mt-5 space-y-3">
              {content.layers.map((layer, i) => {
                const active = i < filledLayers;
                return (
                  <div
                    key={layer.level}
                    className={`rounded-2xl border p-5 transition-all duration-500 ${
                      active
                        ? "border-primary/40 bg-card/60 opacity-100"
                        : "border-border/40 bg-card/15 opacity-55"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                          active
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                        {layer.level}
                      </p>
                    </div>
                    <h3 className="hk-gold-text mt-3 font-serif text-lg font-semibold">
                      {layer.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                      {layer.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Reflection Prompt — luxurious centered moment, no box */}
          <section className="relative py-6 text-center">
            <p className="hk-gold-text text-[10px] uppercase tracking-[0.4em]">
              Reflection
            </p>
            <p className="mx-auto mt-6 max-w-2xl font-serif text-2xl leading-snug text-foreground md:text-3xl">
              {content.reflection}
            </p>
            <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          </section>

          {/* Action — single elegant box (this is the only call-to-act) */}
          <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/30 to-transparent p-6 md:p-9">
            <p className="hk-gold-text text-[10px] uppercase tracking-[0.4em]">
              Action
            </p>
            <p className="mt-3 font-serif text-lg leading-relaxed text-foreground/95 md:text-xl">
              {content.action}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {d.session}
              </span>
              <span className="hk-gold-text text-xs">·</span>
              <span className="text-xs text-primary">{d.sessionCode}</span>
            </div>
          </section>

          {/* Footer nav between dimensions */}
          <nav className="flex items-center justify-between gap-3 pt-6">
            <button
              onClick={() => index > 0 && onIndexChange(index - 1)}
              disabled={index === 0}
              className="hk-button-outline inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              {index > 0 ? dimensions[index - 1].name : "Start"}
            </button>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {index + 1} / {dimensions.length}
            </p>
            <button
              onClick={() =>
                index < dimensions.length - 1 && onIndexChange(index + 1)
              }
              disabled={index === dimensions.length - 1}
              className="hk-button-outline inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-30"
            >
              {index < dimensions.length - 1
                ? dimensions[index + 1].name
                : "End"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </article>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

function BreakdownBlock({ label, body }: { label: string; body: string }) {
  return (
    <div className="border-l border-primary/30 pl-5 md:pl-6">
      <p className="text-[10px] uppercase tracking-[0.3em] text-primary/85">
        {label}
      </p>
      <p className="mt-3 text-base leading-relaxed text-foreground/90 md:text-lg">
        {body}
      </p>
    </div>
  );
}
