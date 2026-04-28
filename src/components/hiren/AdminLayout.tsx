import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, ClipboardList, FileText, Mic, Search, LogOut, Menu, X, Shield, Crown } from "lucide-react";
import { useState } from "react";
import logoUrl from "@/assets/hiren-kundli-logo.jpg";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { to: "/shyam/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/shyam/bookings", label: "Bookings", icon: ClipboardList },
  { to: "/shyam/posts", label: "Posts", icon: FileText },
  { to: "/shyam/voice", label: "Voice Room", icon: Mic },
  { to: "/shyam/uid-search", label: "UID Search", icon: Search },
] as const;

const SUPER_NAV = [{ to: "/shyam/roles", label: "Role Management", icon: Shield }] as const;

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut, adminRole, isSuperAdmin, isViewer } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/shyam" });
  };

  const renderItem = (it: { to: string; label: string; icon: typeof LayoutDashboard }, onClick?: () => void) => {
    const active = isActive(it.to);
    const Icon = it.icon;
    return (
      <Link
        key={it.to}
        to={it.to}
        onClick={onClick}
        className={`flex items-center gap-3 rounded-r-lg border-l-[3px] px-4 py-2.5 text-sm transition-colors ${
          active
            ? "border-primary bg-primary/10 text-primary"
            : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
        <span>{it.label}</span>
      </Link>
    );
  };

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex-1 space-y-1 p-3">
      {NAV.map((it) => renderItem(it, onClick))}
      {isSuperAdmin && SUPER_NAV.map((it) => renderItem(it, onClick))}
    </nav>
  );

  const RoleBadge = () => {
    if (!adminRole) return null;
    if (adminRole === "superadmin")
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
          <Crown className="h-3 w-3" /> Superadmin
        </span>
      );
    if (adminRole === "viewer")
      return (
        <span className="inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          Viewer
        </span>
      );
    return (
      <span className="inline-flex rounded-full border border-blue-400/50 bg-blue-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-300">
        Admin
      </span>
    );
  };
  void isViewer;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card/30 backdrop-blur-xl md:flex">
        <Link to="/shyam/dashboard" className="flex items-center gap-3 border-b px-5 py-5">
          <img src={logoUrl} alt="Hiren Kundli" className="h-10 w-10 rounded-full object-cover ring-1 ring-primary/40" />
          <div className="leading-tight">
            <div className="hk-gold-text font-serif text-base font-bold">Hiren Kundli</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin Panel</div>
          </div>
        </Link>
        <NavList />
        <div className="border-t p-3">
          <p className="mb-2 truncate px-2 text-[11px] text-muted-foreground" title={user?.email ?? ""}>
            {user?.email ?? ""}
          </p>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-foreground">
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/shyam/dashboard" className="flex items-center gap-2">
          <img src={logoUrl} alt="Hiren Kundli" className="h-8 w-8 rounded-full object-cover ring-1 ring-primary/40" />
          <span className="hk-gold-text font-serif text-sm font-bold">Admin</span>
        </Link>
        <button onClick={handleSignOut} aria-label="Sign out" className="text-muted-foreground">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <aside
            className="absolute inset-y-0 left-0 flex w-72 flex-col border-r bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <span className="hk-gold-text font-serif text-base font-bold">Admin Panel</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList onClick={() => setOpen(false)} />
            <div className="border-t p-3">
              <p className="mb-2 truncate px-2 text-[11px] text-muted-foreground">{user?.email ?? ""}</p>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="md:pl-60">{children}</main>
    </div>
  );
}
