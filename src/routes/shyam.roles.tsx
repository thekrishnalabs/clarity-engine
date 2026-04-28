import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { Crown, Shield, Eye, Trash2, RotateCcw, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { SuperAdminRoute } from "@/components/auth/RouteGuards";
import { AdminLayout } from "@/components/hiren/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAdminSessionPassword,
  listAdminRoles,
  revokeAdminRole,
  restoreAdminRole,
  setAdminRole,
  tsToDate,
  updateAdminSessionPassword,
  type AdminRoleRecord,
} from "@/lib/firestore";

export const Route = createFileRoute("/shyam/roles")({
  head: () => ({ meta: [{ title: "Role Management — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <SuperAdminRoute>
      <AdminLayout>
        <RolesPage />
      </AdminLayout>
    </SuperAdminRoute>
  ),
});

function RolesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<(AdminRoleRecord & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "viewer">("admin");

  const [pwd, setPwd] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdEditing, setPwdEditing] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [currentPwdLen, setCurrentPwdLen] = useState(0);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const list = await listAdminRoles();
      setRows(list);
      const cur = await getAdminSessionPassword();
      setCurrentPwdLen(cur.length);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addMember(e: FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    setBusy(true);
    setErr(null);
    try {
      await setAdminRole(newEmail.trim(), newRole, newName.trim(), user.email);
      setNewEmail("");
      setNewName("");
      setNewRole("admin");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRole(r: AdminRoleRecord & { id: string }) {
    if (!user?.email || r.role === "superadmin") return;
    const next: "admin" | "viewer" = r.role === "admin" ? "viewer" : "admin";
    setBusy(true);
    try {
      await setAdminRole(r.email, next, r.displayName, user.email);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(r: AdminRoleRecord & { id: string }) {
    if (r.role === "superadmin") return;
    if (!confirm(`Revoke access for ${r.email}?`)) return;
    setBusy(true);
    try {
      await revokeAdminRole(r.email);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function restore(r: AdminRoleRecord & { id: string }) {
    setBusy(true);
    try {
      await restoreAdminRole(r.email);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    setPwdMsg(null);
    if (pwd.length < 6) return setPwdMsg("Password must be at least 6 characters.");
    if (pwd !== pwdConfirm) return setPwdMsg("Passwords do not match.");
    setBusy(true);
    try {
      await updateAdminSessionPassword(pwd, user.email);
      setPwd("");
      setPwdConfirm("");
      setPwdEditing(false);
      setPwdMsg("Updated.");
      await refresh();
    } catch (e) {
      setPwdMsg(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="hk-container py-10 md:py-12">
      <h1 className="hk-gold-text font-serif text-3xl md:text-4xl">Role Management</h1>
      <p className="mt-1 text-sm text-muted-foreground">Control who can access the admin panel.</p>

      {err && <p className="mt-4 rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{err}</p>}

      {/* Add member */}
      <form onSubmit={addMember} className="mt-8 grid gap-4 rounded-3xl border bg-card/40 p-6">
        <h2 className="font-serif text-lg">Add New Member</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="email"
            required
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="rounded-xl border bg-background px-4 py-3 text-sm"
          />
          <input
            required
            placeholder="Display name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-xl border bg-background px-4 py-3 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(["admin", "viewer"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setNewRole(r)}
              className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition ${
                newRole === r
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <button disabled={busy} className="hk-button-primary w-fit rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60">
          {busy ? "Saving…" : "Add Member"}
        </button>
      </form>

      {/* Members table */}
      <div className="mt-8 overflow-x-auto rounded-3xl border bg-card/40">
        <table className="min-w-[760px] text-sm">
          <thead className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSelf = r.email === user?.email?.toLowerCase();
              const d = tsToDate(r.addedAt);
              return (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{r.displayName || "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={r.role} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{d ? format(d, "MMM d, yyyy") : "—"}</td>
                  <td className="px-4 py-3">
                    {r.isActive ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">Active</span>
                    ) : (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-destructive">Revoked</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.role === "superadmin" || isSelf ? (
                      <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[10px] uppercase text-primary">You</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {r.isActive && (
                          <button
                            disabled={busy}
                            onClick={() => toggleRole(r)}
                            className="rounded-full border px-3 py-1 text-[11px] hover:bg-muted/40"
                          >
                            → {r.role === "admin" ? "Viewer" : "Admin"}
                          </button>
                        )}
                        {r.isActive ? (
                          <button
                            disabled={busy}
                            onClick={() => revoke(r)}
                            className="inline-flex items-center gap-1 rounded-full border border-destructive/50 px-3 py-1 text-[11px] text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" /> Revoke
                          </button>
                        ) : (
                          <button
                            disabled={busy}
                            onClick={() => restore(r)}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 px-3 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/10"
                          >
                            <RotateCcw className="h-3 w-3" /> Restore
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">No members yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Session password */}
      <div className="mt-10 rounded-3xl border bg-card/40 p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-lg">Session Password</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Required for non-superadmin admins to perform write actions.
        </p>

        {!pwdEditing ? (
          <div className="mt-4 flex items-center gap-3">
            <span className="font-mono text-sm tracking-widest text-muted-foreground">
              {"•".repeat(Math.max(currentPwdLen, 8))}
            </span>
            <button onClick={() => setPwdEditing(true)} className="rounded-full border px-4 py-1.5 text-xs hover:bg-muted/40">
              Change Password
            </button>
          </div>
        ) : (
          <form onSubmit={savePassword} className="mt-4 grid max-w-md gap-3">
            <input
              type="password"
              required
              placeholder="New password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="rounded-xl border bg-background px-4 py-3 text-sm"
            />
            <input
              type="password"
              required
              placeholder="Confirm new password"
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              className="rounded-xl border bg-background px-4 py-3 text-sm"
            />
            <div className="flex gap-2">
              <button disabled={busy} className="hk-button-primary rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60">
                {busy ? "Saving…" : "Update"}
              </button>
              <button
                type="button"
                onClick={() => { setPwdEditing(false); setPwd(""); setPwdConfirm(""); setPwdMsg(null); }}
                className="rounded-full border px-5 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {pwdMsg && <p className="mt-3 text-sm text-muted-foreground">{pwdMsg}</p>}
      </div>
    </section>
  );
}

function RoleBadge({ role }: { role: "superadmin" | "admin" | "viewer" }) {
  if (role === "superadmin")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
        <Crown className="h-3 w-3" /> Superadmin
      </span>
    );
  if (role === "admin")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/50 bg-blue-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300">
        <Shield className="h-3 w-3" /> Admin
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      <Eye className="h-3 w-3" /> Viewer
    </span>
  );
}
