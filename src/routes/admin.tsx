import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { PageHero } from "@/components/hiren/Section";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email/send";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type SplApp = {
  id: string;
  phone: string;
  dob: string;
  email: string | null;
  status: string;
  uid: string | null;
  approved_at: string | null;
  created_at: string;
  answers: Record<string, string>;
};

type Booking = {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  tob: string;
  place: string;
  session: string;
  amount: number;
  payment_status: string;
  uid: string | null;
  notes: string | null;
  created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [apps, setApps] = useState<SplApp[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<"spl" | "bookings">("spl");
  const [busy, setBusy] = useState<string>("");
  const [toast, setToast] = useState<string>("");

  const loadData = useCallback(async () => {
    const [{ data: appData, error: appErr }, { data: bookData, error: bookErr }] = await Promise.all([
      supabase.rpc("admin_list_spl_applications"),
      supabase.rpc("admin_list_bookings"),
    ]);
    if (!appErr && appData) setApps(appData as SplApp[]);
    if (!bookErr && bookData) setBookings(bookData as Booking[]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const verify = async (userId: string | null) => {
      if (!userId) {
        if (cancelled) return;
        setIsAdmin(false);
        setAuthChecked(true);
        navigate({ to: "/admin/login" });
        return;
      }
      // Try claiming first-admin (no-op if one already exists)
      try { await supabase.rpc("claim_first_admin"); } catch { /* ignore */ }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      const admin = !!roles;
      setIsAdmin(admin);
      setAuthChecked(true);
      if (admin) loadData();
    };

    // Listener first
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      // Defer to avoid deadlocks
      setTimeout(() => { verify(session?.user?.id ?? null); }, 0);
    });

    // Then initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      verify(session?.user?.id ?? null);
    }).catch(() => {
      if (!cancelled) {
        setAuthChecked(true);
        navigate({ to: "/admin/login" });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate, loadData]);

  async function approve(app: SplApp) {
    if (!confirm(`Approve application for ${app.phone}? This generates a UID and sends email if address is on file.`)) return;
    setBusy(app.id);
    setToast("");
    try {
      const { data, error } = await supabase.rpc("approve_spl_application", { _id: app.id });
      if (error) throw error;
      const result = data as { ok: boolean; uid?: string; email?: string; message?: string };
      if (!result.ok) {
        setToast(result.message ?? "Could not approve.");
      } else if (result.uid && app.email) {
        try {
          await sendTransactionalEmail({
            templateName: "spl-approval",
            recipientEmail: app.email,
            idempotencyKey: `spl-approval-${app.id}`,
            templateData: { uid: result.uid },
          });
          setToast(`Approved. UID: ${result.uid} — email queued to ${app.email}.`);
        } catch (e: any) {
          setToast(`Approved. UID: ${result.uid} — email failed: ${e.message}`);
        }
      } else if (result.uid) {
        setToast(`Approved. UID: ${result.uid}. No email on file — message via WhatsApp manually.`);
      }
      await loadData();
    } catch (e: any) {
      setToast(e.message ?? "Approval failed.");
    } finally {
      setBusy("");
    }
  }

  async function reject(app: SplApp) {
    if (!confirm(`Reject application for ${app.phone}?`)) return;
    setBusy(app.id);
    try {
      const { error } = await supabase.rpc("reject_spl_application", { _id: app.id });
      if (error) throw error;
      setToast("Application rejected.");
      await loadData();
    } catch (e: any) {
      setToast(e.message ?? "Rejection failed.");
    } finally {
      setBusy("");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  if (!authChecked) {
    return <div className="hk-container py-20 text-muted-foreground">Verifying access...</div>;
  }

  if (!isAdmin) {
    return (
      <>
        <PageHero eyebrow="Restricted" title="Admin role required." body="Your account does not have the admin role yet. Ask your developer to grant it." />
        <div className="hk-container pb-16">
          <button onClick={signOut} className="hk-button-outline rounded-full px-5 py-2 text-sm">Sign out</button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHero eyebrow="Admin dashboard" title="Review applications & bookings." body="Approve SPL clarity applications, generate UIDs, and view paid session bookings.">
        <div className="flex flex-wrap gap-3">
          <Link to="/" className="hk-button-outline rounded-full px-4 py-2 text-sm">Back to site</Link>
          <button onClick={signOut} className="hk-button-outline rounded-full px-4 py-2 text-sm">Sign out</button>
        </div>
      </PageHero>

      <section className="hk-container pb-16">
        <div className="mb-6 flex gap-2">
          <button onClick={() => setTab("spl")} className={`rounded-full border px-5 py-2 text-sm font-semibold ${tab === "spl" ? "hk-button-primary" : ""}`}>
            SPL Applications ({apps.length})
          </button>
          <button onClick={() => setTab("bookings")} className={`rounded-full border px-5 py-2 text-sm font-semibold ${tab === "bookings" ? "hk-button-primary" : ""}`}>
            Bookings ({bookings.length})
          </button>
        </div>

        {toast && <div className="mb-5 rounded-2xl border p-4 text-sm">{toast}</div>}

        {tab === "spl" && (
          <div className="grid gap-4">
            {apps.length === 0 && <p className="text-muted-foreground">No applications yet.</p>}
            {apps.map((app) => (
              <article key={app.id} className="hk-panel rounded-3xl p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="hk-eyebrow">{new Date(app.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
                    <h3 className="mt-1 font-mono text-lg">{app.phone}</h3>
                    <p className="text-sm text-muted-foreground">DOB: {app.dob} {app.email && `· ${app.email}`}</p>
                    {app.uid && <p className="hk-gold-text mt-1 font-mono text-sm">{app.uid}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs uppercase ${app.status === "approved" ? "hk-gold-text" : app.status === "rejected" ? "text-muted-foreground" : ""}`}>
                      {app.status}
                    </span>
                    {app.status === "pending" && (
                      <div className="flex gap-2">
                        <button disabled={busy === app.id} onClick={() => approve(app)} className="hk-button-primary rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-60">Approve</button>
                        <button disabled={busy === app.id} onClick={() => reject(app)} className="hk-button-outline rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-60">Reject</button>
                      </div>
                    )}
                  </div>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">View answers</summary>
                  <div className="mt-3 grid gap-2 text-sm">
                    {Object.entries(app.answers || {}).map(([k, v]) => (
                      <div key={k} className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">{k}</div>
                        <div className="mt-1 whitespace-pre-wrap">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}

        {tab === "bookings" && (
          <div className="grid gap-4">
            {bookings.length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
            {bookings.map((b) => (
              <article key={b.id} className="hk-panel rounded-3xl p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="hk-eyebrow">{new Date(b.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
                    <h3 className="mt-1 text-lg font-semibold">{b.name} · {b.session}</h3>
                    <p className="text-sm text-muted-foreground">{b.phone} · {b.email}</p>
                    <p className="text-sm text-muted-foreground">DOB {b.dob} · {b.tob} · {b.place}</p>
                    {b.uid && <p className="hk-gold-text mt-1 font-mono text-sm">{b.uid}</p>}
                  </div>
                  <div className="text-right">
                    <div className="hk-gold-text font-serif text-2xl">₹{b.amount}</div>
                    <span className="mt-2 inline-block rounded-full border px-3 py-1 text-xs uppercase">{b.payment_status}</span>
                  </div>
                </div>
                {b.notes && <p className="mt-3 rounded-xl border p-3 text-sm text-muted-foreground">{b.notes}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
