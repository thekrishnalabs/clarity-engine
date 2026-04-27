// Rich, interactive content per dimension. Sourced from Engine v2.6 spec.
// Used by DimensionDetailView modal.

export type DimensionLayer = {
  level: string; // "Layer 1"
  title: string;
  body: string;
};

export type DimensionContent = {
  slug: string;
  subtitle: string;
  coreInsight: string;
  represents: string;
  affectsDecisions: string;
  realLifePattern: string;
  reflection: string;
  action: string;
  layers: DimensionLayer[];
};

export const dimensionContent: Record<string, DimensionContent> = {
  experience: {
    slug: "experience",
    subtitle: "The Entry Lens — Depth Level 0",
    coreInsight:
      "Before clarity, there is only noise. This dimension is not here to solve anything — it is here to let you feel, for the first time, what structured understanding actually feels like.",
    represents:
      "The present-moment surface of your life. The dominant confusion, the one tension that quietly directs everything else. It is awareness without analysis.",
    affectsDecisions:
      "When you cannot name what is happening inside you, every decision becomes reactive. This dimension makes the invisible visible — so the next choice you make comes from observation, not pressure.",
    realLifePattern:
      "You wake up busy but unclear. You move through the day responding to inputs, never authoring them. Energy is spent, but direction is missing. Experience reveals where that drain originates.",
    reflection:
      "If you removed every external pressure for one day, what would still feel unresolved inside you?",
    action:
      "Stop trying to fix what you have not yet seen clearly. Sit with one observation today — not to act on it, but to let it become precise.",
    layers: [
      {
        level: "Layer 1",
        title: "Surface Snapshot",
        body: "What is active in your life right now — the loudest theme that is taking the most emotional bandwidth.",
      },
      {
        level: "Layer 2",
        title: "Dominant Confusion",
        body: "The one repeating question your mind keeps returning to, even when you try to move past it.",
      },
      {
        level: "Layer 3",
        title: "Felt Imbalance",
        body: "Where something feels heavier than it should — the silent tension shaping your tone, sleep, and choices.",
      },
    ],
  },
  orientation: {
    slug: "orientation",
    subtitle: "Situational Grounding — Depth Level 1",
    coreInsight:
      "You cannot move correctly until you know exactly where you are standing. Orientation removes the fog so the ground beneath your decisions becomes solid.",
    represents:
      "Your current life position and the recent phases that produced it. It is not prediction — it is geography. A precise map of where this moment sits inside your timeline.",
    affectsDecisions:
      "Most wrong decisions are not bad decisions — they are correct decisions made from the wrong location. Orientation prevents that mismatch.",
    realLifePattern:
      "You feel busy but lost. Plans get made and unmade. Effort exists but momentum does not. Orientation shows why the same energy is producing inconsistent direction.",
    reflection:
      "What part of your life are you treating as stable, that has actually shifted in the last twelve months?",
    action:
      "Re-anchor before you re-strategize. Name your current position out loud, in three sentences, before making any next move.",
    layers: [
      {
        level: "Layer 1",
        title: "Present Position",
        body: "An honest reading of where your life currently sits — emotionally, practically, directionally.",
      },
      {
        level: "Layer 2",
        title: "Recent Phase Trace",
        body: "The last 12–24 months mapped as forces — what shaped you, what drained you, what built quietly.",
      },
      {
        level: "Layer 3",
        title: "Root of Confusion",
        body: "Why the present moment feels unclear — the structural reason, not the emotional one.",
      },
    ],
  },
  pattern: {
    slug: "pattern",
    subtitle: "Repetition Logic — Depth Level 2",
    coreInsight:
      "Life is not random. Different situations, same emotional shape — that is not coincidence, that is signature. Pattern reveals the signature.",
    represents:
      "The repeating cycles inside your behaviour, relationships, and decisions. The structural reason effort keeps producing the same outcome in different costumes.",
    affectsDecisions:
      "Without seeing the pattern, you keep choosing differently and arriving identically. Pattern dissolves that loop by exposing the rule beneath your choices.",
    realLifePattern:
      "New job, same exhaustion. New relationship, same disappointment. New plan, same collapse point. The variables changed; the structure did not. That structure is the pattern.",
    reflection:
      "If you described your last three biggest setbacks in one sentence each — what word would unintentionally repeat?",
    action:
      "Stop redesigning your circumstances and start mapping your responses. Pattern breaks when it is named — not when it is fought.",
    layers: [
      {
        level: "Layer 1",
        title: "Recurring Themes",
        body: "The two or three storylines your life keeps writing, regardless of where you are or who you are with.",
      },
      {
        level: "Layer 2",
        title: "Behavioural Cycle",
        body: "The trigger → response → cost loop that runs automatically below conscious choice.",
      },
      {
        level: "Layer 3",
        title: "Past → Present Linkage",
        body: "How an old protective response, useful once, is now silently producing today's stuck point.",
      },
    ],
  },
  direction: {
    slug: "direction",
    subtitle: "Choice & Timing — Depth Level 3",
    coreInsight:
      "The future is not a prediction. It is the consequence of choices made under specific conditions. Direction shows you those conditions before you choose.",
    represents:
      "The integration of your past and present into a forward arc. Supportive phases, resistant phases, decision windows — not fixed dates, but real timing intelligence.",
    affectsDecisions:
      "When you understand which doors are opening and which are closing, urgency disappears. Direction replaces panic with sequencing.",
    realLifePattern:
      "You are at a fork — career, location, commitment — and every option looks equally valid in your head. Direction makes the structural difference between them visible.",
    reflection:
      "Which decision are you postponing because you do not yet know whether the timing is right or wrong?",
    action:
      "Choose the decision that survives the longest scrutiny — not the one that calms the loudest emotion right now.",
    layers: [
      {
        level: "Layer 1",
        title: "Past + Present Integration",
        body: "Your trajectory, read as one continuous line — so the future stops feeling disconnected from what you have lived.",
      },
      {
        level: "Layer 2",
        title: "Decision Windows",
        body: "Phases where action lands cleanly and phases where the same action will be expensive.",
      },
      {
        level: "Layer 3",
        title: "Consequence Mapping",
        body: "The structural cost of each major option — not what you want, but what each path will actually require.",
      },
    ],
  },
  "relationship-reality": {
    slug: "relationship-reality",
    subtitle: "Two-Person Dynamics — Depth Level 4",
    coreInsight:
      "Relationships do not fail from lack of love. They fail from unread reality. This dimension reads what is actually happening between you — without illusion, without blame.",
    represents:
      "The current emotional and practical truth of a connection — compatibility, alignment, stability, friction, and the quiet roles each person is playing.",
    affectsDecisions:
      "Most relationship decisions are made on hope or fear. Relationship Reality replaces both with observation, so commitment or distance becomes informed instead of reactive.",
    realLifePattern:
      "On the surface, things are functional. Underneath, one person is over-investing, one is over-withdrawing, and both are calling it normal. Reality names that imbalance precisely.",
    reflection:
      "If this relationship had no shared history, no future expectation — only today — would you still choose it?",
    action:
      "Stop negotiating with the version of them you imagined. Respond to the version of them that actually exists.",
    layers: [
      {
        level: "Layer 1",
        title: "Emotional Compatibility",
        body: "How both nervous systems actually meet — not how you wish they did.",
      },
      {
        level: "Layer 2",
        title: "Practical Alignment",
        body: "Values, effort, priorities, and lifestyle structure — the unglamorous indicators of real fit.",
      },
      {
        level: "Layer 3",
        title: "Power Balance",
        body: "Who carries, who consumes, who decides — and the friction the imbalance is quietly producing.",
      },
    ],
  },
  "relationship-direction": {
    slug: "relationship-direction",
    subtitle: "Decision Pressure — Depth Level 5",
    coreInsight:
      "When indecision in a relationship lasts too long, it becomes its own form of harm. This dimension brings the decision into focus — calmly, structurally, finally.",
    represents:
      "Where this connection is heading, what commitment would actually require, and the timing windows in which a decision lands cleanly versus expensively.",
    affectsDecisions:
      "Marriage, separation, distance, continuation — these stop being emotional verdicts and become structural choices with visible consequences.",
    realLifePattern:
      "You have already had the same conversation seven times. Nothing is resolving. The relationship is being maintained by avoidance. Direction ends that loop with one clear read.",
    reflection:
      "What are you afraid you will lose if you stop postponing the decision — and is it worth what you are losing by postponing it?",
    action:
      "Move when the decision is structurally clear, not when the emotion is loud. The right call rarely arrives with adrenaline.",
    layers: [
      {
        level: "Layer 1",
        title: "Direction Read",
        body: "Where the connection is structurally pointing — toward integration, plateau, or quiet exit.",
      },
      {
        level: "Layer 2",
        title: "Commitment Feasibility",
        body: "Whether the structure can actually hold the weight of long-term commitment — not whether you both want it to.",
      },
      {
        level: "Layer 3",
        title: "Timing Window",
        body: "The phase in which the decision can be made cleanly, and the cost of moving outside it.",
      },
    ],
  },
  karmic: {
    slug: "karmic",
    subtitle: "Cause Beyond Current Life — Depth Level 6",
    coreInsight:
      "Some patterns refuse to dissolve no matter how much insight you apply. That is the signal. Karmic does not entertain — it locates the cause that current-life logic cannot reach.",
    represents:
      "Past-life causal linkage, repeating soul-level roles, and multi-person karmic entanglement — opened only when structurally necessary, never for curiosity.",
    affectsDecisions:
      "When you understand a pattern is carry-forward, you stop blaming yourself for not solving it through effort. Different effort becomes possible.",
    realLifePattern:
      "Same person, different face. Same trap, different decade. Same emotional charge, disproportionate to the trigger. Karmic explains what current-life therapy cannot fully resolve.",
    reflection:
      "Which recurring situation in your life feels older than your own age — as if you walked into it already exhausted?",
    action:
      "Stop trying to win the pattern. Recognize it, return what is not yours, and refuse to renew the contract.",
    layers: [
      {
        level: "Layer 1",
        title: "Carry-Forward Trace",
        body: "The tendency carried in from before — not as story, as structural pull.",
      },
      {
        level: "Layer 2",
        title: "Repeating Role",
        body: "The role you keep being cast into across unrelated relationships — and why.",
      },
      {
        level: "Layer 3",
        title: "Entanglement Map",
        body: "Up to three people whose karmic structure is interlocked with yours, and the binding logic between you.",
      },
    ],
  },
  "karmic-systems": {
    slug: "karmic-systems",
    subtitle: "System-Level Resolution — Depth Level 7",
    coreInsight:
      "Some issues are not yours alone. They belong to a family, a lineage, a partnership system. Karmic Systems decodes the structure — and the resolution path within it.",
    represents:
      "Family and business karmic systems, long-running unresolved obligations, and patterns that repeat across generations or partnerships.",
    affectsDecisions:
      "Decisions stop being personal verdicts and become system-aware moves. You stop carrying what was never yours, and you stop dropping what genuinely is.",
    realLifePattern:
      "The same financial collapse in three generations. The same business partnership disintegration in three ventures. The same unspoken rule running an entire family. Systems makes the rulebook visible.",
    reflection:
      "Which pattern in your family or partnerships repeats so reliably that you have started treating it as personality?",
    action:
      "Resolve at the level of the structure, not the symptom. Restructure the contract — financial, emotional, or operational — that keeps regenerating the loop.",
    layers: [
      {
        level: "Layer 1",
        title: "System Map",
        body: "The lineage or partnership structure as a whole — every node, every binding contract.",
      },
      {
        level: "Layer 2",
        title: "Repeating Generational Pattern",
        body: "What has crossed generations or ventures unchanged, and the function it has been serving.",
      },
      {
        level: "Layer 3",
        title: "Resolution Pathway",
        body: "The conscious restructuring required for the system to stop reproducing the issue.",
      },
    ],
  },
  ashra: {
    slug: "ashra",
    subtitle: "Beyond Depth Level 7 — Invite Only",
    coreInsight:
      "Ashra does not add information. It collapses complexity into one stable understanding — the recognition that no further explanation is needed.",
    represents:
      "A separate access state, not a higher level. It exists for the moment when all dimensions have been exhausted and only one thing remains: direct clarity.",
    affectsDecisions:
      "Decisions stop being decisions. The next move becomes obvious — not impressive, not mystical, just unmistakable.",
    realLifePattern:
      "You have done the work. You have seen the patterns, the directions, the karmic threads. You no longer need more layers — you need the silence on the other side of them.",
    reflection:
      "What would remain true if every explanation, every framework, every story was removed?",
    action:
      "Stop seeking. Recognize. Then act from that recognition without needing to justify it.",
    layers: [
      {
        level: "State 1",
        title: "Collapse",
        body: "The dissolution of layered explanation into one direct seeing.",
      },
      {
        level: "State 2",
        title: "Recognition",
        body: "Truth that does not need to be proven — only acknowledged.",
      },
      {
        level: "State 3",
        title: "Closure",
        body: "The end of seeking. Not because answers stopped — because they became unnecessary.",
      },
    ],
  },
};
