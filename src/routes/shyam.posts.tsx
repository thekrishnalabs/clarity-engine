import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";
import { AdminRoute } from "@/components/auth/RouteGuards";
import { AdminLayout } from "@/components/hiren/AdminLayout";
import { SessionPasswordModal } from "@/components/admin/SessionPasswordModal";
import { useAdminWriteGuard } from "@/hooks/useAdminWriteGuard";
import { useAuth } from "@/contexts/AuthContext";
import {
  createPost,
  deletePost,
  listAllPosts,
  setPostPublished,
  tsToDate,
  updatePost,
  type AdminPost,
} from "@/lib/firestore";

export const Route = createFileRoute("/shyam/posts")({
  head: () => ({ meta: [{ title: "Admin Posts — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminRoute>
      <AdminLayout>
        <PostsAdmin />
      </AdminLayout>
    </AdminRoute>
  ),
});

const TYPES: { value: AdminPost["type"]; label: string; color: string }[] = [
  { value: "announcement", label: "Announcement", color: "border-primary/60 text-primary" },
  { value: "session_update", label: "Session Update", color: "border-violet-400/60 text-violet-300" },
  { value: "insight", label: "Insight", color: "border-teal-400/60 text-teal-300" },
  { value: "dimension_note", label: "Dimension Note", color: "border-amber-400/60 text-amber-300" },
];

function PostsAdmin() {
  const { user, isViewer } = useAuth();
  const { request, modalProps } = useAdminWriteGuard();
  const [posts, setPosts] = useState<(AdminPost & { id: string })[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<(AdminPost & { id: string }) | null>(null);
  const [type, setType] = useState<AdminPost["type"]>("announcement");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<(AdminPost & { id: string }) | null>(null);

  async function refresh() {
    try {
      setPosts(await listAllPosts(user?.email));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  function openNew() {
    setEditing(null);
    setType("announcement");
    setTitle("");
    setContent("");
    setPublished(true);
    setEditorOpen(true);
  }

  function openEdit(p: AdminPost & { id: string }) {
    setEditing(p);
    setType(p.type);
    setTitle(p.title);
    setContent(p.content);
    setPublished(p.is_published);
    setEditorOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onSave(e: FormEvent) {
    e.preventDefault();
    request(async () => {
      setBusy(true);
      setErr(null);
      try {
        if (editing) {
          await updatePost(editing.id, { title, content, type, is_published: published }, user?.email);
        } else {
          await createPost({ title, content, type, is_published: published }, user?.email);
        }
        setEditorOpen(false);
        setEditing(null);
        await refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed.");
      } finally {
        setBusy(false);
      }
    });
  }

  function togglePublish(p: AdminPost & { id: string }) {
    request(async () => {
      try {
        await setPostPublished(p.id, !p.is_published, user?.email);
        await refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed.");
      }
    });
  }

  function doDelete() {
    if (!confirmDelete) return;
    const target = confirmDelete;
    request(async () => {
      try {
        await deletePost(target.id, user?.email);
        setConfirmDelete(null);
        await refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed.");
      }
    });
  }

  return (
    <section className="hk-container py-10 md:py-12">
      <div className="flex items-center justify-between">
        <h1 className="hk-gold-text font-serif text-3xl md:text-4xl">Posts</h1>
        {!editorOpen && (
          <button onClick={openNew} className="hk-button-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> New Post
          </button>
        )}
      </div>

      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}

      {editorOpen && (
        <form onSubmit={onSave} className="mt-6 grid gap-4 rounded-3xl border bg-card/40 p-6">
          <h2 className="font-serif text-lg">{editing ? "Edit Post" : "New Post"}</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Title"
            className="rounded-xl border bg-background px-4 py-3 text-base"
          />
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-wider transition ${
                  type === t.value ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={10}
            placeholder="Write your post…"
            className="rounded-xl border bg-background px-4 py-3 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Publish immediately
          </label>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} className="hk-button-primary rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60">
              {busy ? "Saving…" : "Save Post"}
            </button>
            <button type="button" onClick={() => { setEditorOpen(false); setEditing(null); }} className="rounded-full border px-5 py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="mt-8 grid gap-3">
        {posts.map((p) => {
          const meta = TYPES.find((t) => t.value === p.type) ?? TYPES[0];
          const d = tsToDate(p.created_at);
          return (
            <li key={p.id} className="rounded-2xl border bg-card/40 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{d ? format(d, "MMM d, yyyy") : ""}</span>
                  <button onClick={() => togglePublish(p)} className="text-primary">
                    {p.is_published ? "Unpublish" : "Publish"}
                  </button>
                </div>
              </div>
              <h3 className="hk-gold-text mt-2 font-serif text-lg">{p.title}</h3>
              <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-foreground/80">{p.content}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => openEdit(p)} className="rounded-full border px-3 py-1 text-xs hover:bg-muted/40">Edit</button>
                <button onClick={() => setConfirmDelete(p)} className="rounded-full border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10">Delete</button>
              </div>
            </li>
          );
        })}
        {posts.length === 0 && <li className="rounded-2xl border border-dashed bg-card/20 p-6 text-center text-sm text-muted-foreground">No posts yet.</li>}
      </ul>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-3xl border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setConfirmDelete(null)} className="absolute right-4 top-4 text-muted-foreground"><X className="h-5 w-5" /></button>
            <h3 className="font-serif text-lg">Delete post?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Delete "{confirmDelete.title}"? This cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="rounded-full border px-4 py-2 text-sm">Cancel</button>
              <button onClick={doDelete} className="rounded-full bg-destructive px-4 py-2 text-sm text-destructive-foreground">Delete</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
