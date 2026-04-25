import { Link, Outlet } from "@tanstack/react-router";
import logo from "@/assets/hiren-kundli-logo.jpg";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/sessions", label: "Sessions" },
  { to: "/apply", label: "Apply" },
  { to: "/book", label: "Book" },
  { to: "/uid-lookup", label: "UID" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function BrandLayout() {
  return (
    <div className="hk-shell">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="hk-container flex min-h-20 items-center justify-between gap-4 py-3">
          <Link to="/" className="flex items-center gap-3" aria-label="Hiren Kundli home">
            <img src={logo} alt="Hiren Kundli logo" className="h-12 w-12 rounded-full border object-cover" />
            <div className="leading-tight">
              <div className="hk-gold-text font-serif text-xl font-bold">Hiren Kundli</div>
              <div className="text-xs text-muted-foreground">Clarity • Patterns • Decisions</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} activeProps={{ className: "hk-gold-text" }} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link to="/sessions" className="hk-button-outline hidden rounded-full px-5 py-2 text-sm font-semibold transition md:inline-flex">
            Book Session
          </Link>
        </div>
        <nav className="hk-container flex gap-3 overflow-x-auto pb-3 text-sm text-muted-foreground lg:hidden">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} activeProps={{ className: "hk-gold-text" }} className="shrink-0 rounded-full border px-3 py-1.5">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t py-10">
        <div className="hk-container grid gap-6 text-sm text-muted-foreground md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="hk-gold-text font-serif text-xl font-bold">Hiren Kundli</div>
            <p className="mt-2 max-w-2xl">A structured decision clarity system. No prediction language, no fear, no clichés.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/refund">Refund</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/admin/login" className="text-xs opacity-60 hover:opacity-100">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
