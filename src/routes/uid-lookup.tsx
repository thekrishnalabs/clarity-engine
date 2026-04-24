import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { PageHero } from "@/components/hiren/Section";
import { supabase } from "@/integrations/supabase/client";

const uidSchema = z.string().uuid("Enter a valid UID.");

export const Route = createFileRoute("/uid-lookup")({
  head: () => ({ meta: [
    { title: "UID Lookup — Hiren Kundli" },
    { name: "description", content: "Check the status of a Hiren Kundli SPL application by UID." },
    { property: "og:title", content: "UID Lookup — Hiren Kundli" },
    { property: "og:description", content: "Fetch your SPL application status securely by UID." },
  ] }),
  component: UidLookupPage,
});

function UidLookupPage() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    const uid = new FormData(event.currentTarget).get("uid")?.toString().trim() ?? "";
    const parsed = uidSchema.safeParse(uid);
    if (!parsed.success) {
      setStatus(parsed.error.issues[0]?.message ?? "Enter a valid UID.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("lookup_spl_application", { _id: parsed.data });
    if (error) setStatus("Lookup could not be completed right now.");
    else if (!data || data.length === 0) setStatus("No application found for this UID.");
    else setStatus(`Status: ${data[0].status}. Submitted: ${new Date(data[0].created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST.`);
    setLoading(false);
  }

  return (
    <>
      <PageHero eyebrow="UID lookup" title="Check your application status." body="Enter the UID received after SPL submission to view the current status." />
      <section className="hk-container pb-16">
        <form onSubmit={lookup} className="hk-panel max-w-2xl rounded-3xl p-6 md:p-8">
          <label className="grid gap-2 text-sm font-medium">UID<input name="uid" className="hk-input rounded-xl px-4 py-3" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>
          <button className="hk-button-primary mt-6 rounded-full px-6 py-3 font-semibold transition">{loading ? "Checking..." : "Fetch Status"}</button>
          {status && <p className="mt-5 rounded-2xl border p-4 text-muted-foreground">{status}</p>}
        </form>
      </section>
    </>
  );
}
