import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { AdminRoute } from "@/components/auth/RouteGuards";
import { createPost, listAllPosts, setPostPublished, type AdminPost } from "@/lib/firestore";

export const Route = createFileRoute("/shyam/posts")({
  head: () => ({ meta: [{ title: "Admin Posts — Hiren Kundli" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminRoute>
      <PostsAdmin />
    </AdminRoute>
  ),
});

const TYPES: AdminPost["type"][] = ["announcement", "session_update", "insight", "dimension_note"];

function PostsAdmin() {
  const [posts, setPosts] = useState<(AdminPost & { id: string })[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    try {
      setPosts(await listAllPosts());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load posts.");
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      await createPost({
        title: String(fd.get("title") || "").trim(),
        content: String(fd.get("content") || "").trim(),
        type: String(fd.get("type") || "announcement") as AdminPost["type"],
        is_published: true,
      });
      e.currentTarget.reset();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="hk-container py-12 md:py-16">
      <h1 className="hk-gold-text font-serif text-3xl md:text-4xl">Posts</h1>

      <form onSubmit={onCreate} className="mt-8 grid max-w-2xl gap-4 rounded-3xl border bg-card/40 p-6">
        <label className="grid gap-2 text-sm font-medium">
          Title
          <input name="title" required className="rounded-xl border bg-background px-4 py-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Type
          <select name="type" className="rounded-xl border bg-background px-4 py-3">
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Content
          <textarea name="content" required rows={5} className="rounded-xl border bg-background px-4 py-3" />
        </label>
        <button disabled={busy} className="hk-button-primary rounded-full px-6 py-3 font-semibold disabled:opacity-60">
          {busy ? "Publishing…" : "Publish Post"}
        </button>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </form>

      <h2 className="mt-12 font-serif text-xl">All posts</h2>
      <ul className="mt-4 grid gap-3">
        {posts.map((p) => (
          <li key={p.id} className="rounded-2xl border bg-card/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.type}</span>
              <button
                onClick={async () => { await setPostPublished(p.id, !p.is_published); refresh(); }}
                className="text-xs text-primary"
              >
                {p.is_published ? "Unpublish" : "Publish"}
              </button>
            </div>
            <h3 className="hk-gold-text mt-2 font-serif text-lg">{p.title}</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">{p.content}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
