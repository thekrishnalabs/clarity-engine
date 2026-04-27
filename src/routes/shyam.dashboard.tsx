import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminRoute } from "@/components/auth/RouteGuards";

export const Route = createFileRoute("/shyam/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminRoute>
      <Dashboard />
    </AdminRoute>
  ),
});

const cards = [
  { to: "/shyam/posts", title: "Posts", desc: "Publish announcements and insights." },
  { to: "/shyam/bookings", title: "Bookings", desc: "Review submissions and generate UIDs." },
  { to: "/shyam/voice", title: "Voice Room", desc: "Open or close the voice space." },
  { to: "/shyam/uid-search", title: "UID Search", desc: "Look up any UID record." },
] as const;

function Dashboard() {
  return (
    <section className="hk-container py-12 md:py-16">
      <p className="hk-gold-text text-xs uppercase tracking-[0.3em]">Admin</p>
      <h1 className="hk-gold-text mt-2 font-serif text-3xl md:text-4xl">Shyam Dashboard</h1>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="rounded-2xl border bg-card/40 p-6 transition hover:border-primary/50">
            <h2 className="hk-gold-text font-serif text-xl">{c.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
