import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, CalendarPlus, Mic, Hash, LogOut } from "lucide-react";
import logoUrl from "@/assets/hiren-kundli-logo.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { listBookingsForUser } from "@/lib/firestore";
import { ProtectedRoute } from "@/components/auth/RouteGuards";

type NavItem = { to: string; label: string; icon: typeof Home; dynamic?: boolean };

const baseItems: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: Home },
  { to: "/app/book", label: "Book Session", icon: CalendarPlus },
  { to: "/app/voice-room", label: "Voice Room", icon: Mic },
];

export function AppLayout() {
  return (
    <ProtectedRoute>
      <AppLayoutInner />
    </ProtectedRoute>
  );
}

function AppLayoutInner() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [myUid, setMyUid] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listBookingsForUser(user.uid)
      .then((bs) => {
        const withUid = bs.find((b) => b.generated_uid);
        setMyUid(withUid?.generated_uid ?? null);
      })
      .catch(() => setMyUid(null));
  }, [user]);

  const items: NavItem[] = [
    ...baseItems,
    { to: myUid ? `/app/uid/${myUid}` : "/app", label: "My UID", icon: Hash, dynamic: true },
  ];
  const isVoiceRoom = pathname.startsWith("/app/voice-room");

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const isActive = (to: string) => {
    if (to === "/app") return pathname === "/app";
    return pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card/30 backdrop-blur-xl md:flex">
        <Link to="/" className="flex items-center gap-3 border-b px-5 py-5">
          <img src={logoUrl} alt="Hiren Kundli" className="h-10 w-10 rounded-full object-cover ring-1 ring-primary/40" />
          <div className="leading-tight">
            <div className="hk-gold-text font-serif text-base font-bold">Hiren Kundli</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Your App</div>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((it) => {
            const active = isActive(it.to);
            const Icon = it.icon;
            const disabled = it.label === "My UID" && !myUid;
            const cls = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`;
            if (disabled) {
              return (
                <span key={it.label} className={cls} aria-disabled="true">
                  <Icon className="h-4 w-4" />
                  <span>{it.label}</span>
                </span>
              );
            }
            return (
              <Link key={it.label} to={it.to} className={cls}>
                <Icon className="h-4 w-4" />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
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
      <header className={`sticky top-0 z-30 items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden ${isVoiceRoom ? "hidden" : "flex"}`}>
        <Link to="/" className="flex items-center gap-2">
          <img src={logoUrl} alt="Hiren Kundli" className="h-8 w-8 rounded-full object-cover ring-1 ring-primary/40" />
          <span className="hk-gold-text font-serif text-sm font-bold">Hiren Kundli</span>
        </Link>
        <button onClick={handleSignOut} className="text-xs text-muted-foreground" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Main */}
      <main className={`md:pl-64 ${isVoiceRoom ? "pb-0" : "pb-20 md:pb-0"}`}>
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className={`fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur-xl md:hidden ${isVoiceRoom ? "hidden" : "flex"}`}>
        {items.map((it) => {
          const active = isActive(it.to);
          const Icon = it.icon;
          const disabled = it.label === "My UID" && !myUid;
          const cls = `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
            active ? "text-primary" : "text-muted-foreground"
          } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`;
          if (disabled) {
            return (
              <span key={it.label} className={cls} aria-label={it.label} aria-disabled="true">
                <Icon className="h-5 w-5" />
                <span>{it.label}</span>
              </span>
            );
          }
          return (
            <Link key={it.label} to={it.to} aria-label={it.label} className={cls}>
              <Icon className="h-5 w-5" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
