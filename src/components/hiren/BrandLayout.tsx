import { Link, Outlet } from "@tanstack/react-router";
import logoUrl from "@/assets/hiren-kundli-logo.jpg";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/sessions", label: "Sessions" },
  { to: "/dimensions", label: "Dimensions" },
  { to: "/about", label: "About" },
] as const;

export function BrandLayout() {
  const { user } = useAuth();
  return (
    <div className="hk-shell">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="hk-container flex min-h-20 items-center justify-between gap-4 py-3">
          <Link to="/" className="flex items-center gap-3" aria-label="Hiren Kundli home">
            <img
              src={logoUrl}
              alt="Hiren Kundli"
              className="h-11 w-11 rounded-full object-cover ring-1 ring-primary/40"
            />
            <div className="leading-tight">
              <div className="hk-gold-text font-serif text-xl font-bold tracking-wide">Hiren Kundli</div>
              <div className="text-xs text-muted-foreground">Decoding Time · Karma · Decisions</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} activeProps={{ className: "hk-gold-text" }} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Link to="/app" className="hk-button-primary rounded-full px-5 py-2 text-sm font-semibold">
                My Dashboard
              </Link>
            ) : (
              <Link to="/get-started" className="hk-button-outline rounded-full px-5 py-2 text-sm font-semibold">
                Get Started
              </Link>
            )}
          </div>
        </div>
        <nav className="hk-container flex gap-3 overflow-x-auto pb-3 text-sm text-muted-foreground lg:hidden">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} activeProps={{ className: "hk-gold-text" }} className="shrink-0 rounded-full border px-3 py-1.5">
              {item.label}
            </Link>
          ))}
          {user ? (
            <Link to="/app" className="shrink-0 rounded-full border border-primary/60 px-3 py-1.5 text-primary">My Dashboard</Link>
          ) : (
            <Link to="/get-started" className="shrink-0 rounded-full border px-3 py-1.5">Get Started</Link>
          )}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t py-10">
        <div className="hk-container grid gap-6 text-sm text-muted-foreground md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="hk-gold-text font-serif text-xl font-bold">Hiren Kundli</div>
            <p className="mt-2 max-w-2xl">Decoding Time · Karma · Decisions. A structured decision clarity system — no prediction language, no fear, no clichés.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/contact">Contact</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/refund">Refund</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
