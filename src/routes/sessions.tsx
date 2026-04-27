import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHero, CtaBand } from "@/components/hiren/Section";
import { SessionCard } from "@/components/hiren/SessionCard";
import { sessionPlans } from "@/data/hiren";

type TabKey = "individual" | "couple" | "multi";

const TAB_KEYS: TabKey[] = ["individual", "couple", "multi"];

export const Route = createFileRoute("/sessions")({
  head: () => ({ meta: [
    { title: "Sessions — Hiren Kundli" },
    { name: "description", content: "Choose a Hiren Kundli clarity session by duration, question depth, people count, and included dimensions." },
    { property: "og:title", content: "Hiren Kundli Sessions" },
    { property: "og:description", content: "Premium clarity sessions from Bronze to VIP Platinum." },
  ] }),
  validateSearch: (search: Record<string, unknown>): { tab?: TabKey } => {
    const raw = search.tab;
    if (TAB_KEYS.includes(raw as TabKey)) return { tab: raw as TabKey };
    return {};
  },
  component: SessionsPage,
});

const groups: Record<TabKey, { label: string; sessions: string[] }> = {
  individual: { label: "Individual", sessions: ["Bronze", "Silver", "Silver Prime", "Silver Prime Lite"] },
  couple: { label: "Couple", sessions: ["Gold", "Gold Prime"] },
  multi: { label: "Multi-Person", sessions: ["Platinum", "VIP Platinum"] },
};

const JOINT_NOTE = "⚠️ Important: Couple and multi-person sessions require birth details of all individuals. These sessions work because the author decodes the kundlis dimensionally interconnected — not separately. Getting separate individual sessions for each person will NOT produce the same depth of insight as a joint session.";

function SessionsPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/sessions" });
  const setTab = (next: TabKey) => navigate({ search: { tab: next } });
  const activeNames = groups[tab].sessions;
  const visiblePlans = sessionPlans.filter((p) => activeNames.includes(p.name));

  return (
    <>
      <PageHero eyebrow="Session depth" title="Choose the right clarity depth." body="Each session is structured by time, questions, people covered, and the dimensions included. Select based on the complexity of your decision context." />

      <section className="hk-container pb-12">
        <div className="mb-6 flex flex-wrap gap-2">
          {(Object.keys(groups) as TabKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${tab === key ? "hk-button-primary" : "hk-button-outline"}`}
            >
              {groups[key].label}
            </button>
          ))}
        </div>

        {(tab === "couple" || tab === "multi") && (
          <div className="mb-6 hk-panel rounded-2xl border-l-4 border-primary p-5 text-sm leading-6 text-muted-foreground">
            {JOINT_NOTE}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {visiblePlans.map((plan) => <SessionCard key={plan.name} plan={plan} />)}
        </div>
      </section>

      <CtaBand title="Need the free SPL route first?" body="Apply for Silver Prime Lite if you want one structured starting point before a paid session." cta="Apply for SPL" />
    </>
  );
}
