export type Dimension = {
  slug: string;
  name: string;
  level: string;
  session: string;
  sessionCode: string;
  purpose: string;
  unlocks: string[];
  blocks: string[];
  tone: string[];
  idealFor: string[];
};

export const dimensions: Dimension[] = [
  {
    slug: "experience",
    name: "Experience",
    level: "Level 0",
    session: "Silver Prime Lite (Application Only)",
    sessionCode: "SPL",
    purpose: "What is happening with me right now — at the surface level?",
    unlocks: [
      "Present-moment life snapshot",
      "Identification of dominant confusion",
      "One primary tension or imbalance",
      "How decoding works",
      "Grounded emotional reflection",
    ],
    blocks: [
      "Future predictions",
      "Decision guidance",
      "Relationship outcomes",
      "Timing windows",
      "Karmic explanations",
    ],
    tone: ["Safe", "Light", "Curiosity-friendly", "Reassuring"],
    idealFor: [
      "New to the system",
      "Feeling confused but not ready for depth",
      "Want to test clarity",
      "Seeking orientation not answers",
    ],
  },
  {
    slug: "orientation",
    name: "Orientation",
    level: "Level 1",
    session: "Bronze (₹249)",
    sessionCode: "BR",
    purpose:
      "Where exactly am I standing right now, and how did recent phases shape this?",
    unlocks: [
      "Current life position overview",
      "Recent past phase analysis",
      "Root cause of active confusion",
      "Why things reached this point",
      "Directional awareness (present-focused)",
    ],
    blocks: [
      "Future predictions",
      "Timelines or dates",
      "Relationship compatibility",
      "Karmic explanations",
      "Final decisions",
    ],
    tone: ["Stabilizing", "Grounded", "Explanatory", "Non-dramatic"],
    idealFor: [
      "Feel lost or stuck",
      "Want clarity without pressure",
      "Need grounding before decisions",
      "Not ready for deeper pattern analysis",
    ],
  },
  {
    slug: "pattern",
    name: "Pattern",
    level: "Level 2",
    session: "Silver (₹500)",
    sessionCode: "SI",
    purpose:
      "Why do similar situations, emotions, or blocks keep showing up in my life again and again?",
    unlocks: [
      "Recurring life themes",
      "Behavioural and psychological cycles",
      "Past → present linkage",
      "Why effort doesn't change outcomes",
      "Core pattern keeping the loop active",
    ],
    blocks: [
      "Exact future timelines",
      "Decision deadlines",
      "Relationship futures",
      "Karmic causes",
      "Final answers",
    ],
    tone: ["Analytical", "Structured", "Neutral", "Non-emotional"],
    idealFor: [
      "Stuck in loops",
      "Tried multiple approaches",
      "Want to understand why nothing changes",
      "Ready to see yourself objectively",
    ],
  },
  {
    slug: "direction",
    name: "Direction",
    level: "Level 3",
    session: "Silver Prime (₹800)",
    sessionCode: "SP",
    purpose:
      "Given what has happened and is happening — where is life moving, and what choices actually matter?",
    unlocks: [
      "Past + present integration",
      "Future direction (current birth only)",
      "Decision windows (not fixed dates)",
      "Supportive vs resistant phases",
      "Consequence-aware guidance",
    ],
    blocks: [
      "Relationship compatibility",
      "Third-person involvement",
      "Karmic causes",
      "Absolute predictions",
      "Destiny-style claims",
    ],
    tone: ["Objective", "Calm", "Responsibility-oriented", "Non-emotional"],
    idealFor: [
      "Understand your patterns",
      "Want to make informed decisions",
      "Ready to accept consequences",
      "Seeking direction not reassurance",
    ],
  },
  {
    slug: "relationship-reality",
    name: "Relationship Reality",
    level: "Level 4",
    session: "Gold (₹1200)",
    sessionCode: "GD",
    purpose:
      "What is actually happening between us — emotionally and practically — right now, without illusion?",
    unlocks: [
      "Emotional compatibility (current state)",
      "Practical alignment (values, effort, priorities)",
      "Stability vs instability indicators",
      "Strength points and friction zones",
      "Power balance and emotional roles",
    ],
    blocks: [
      "Relationship future predictions",
      "Marriage/separation decisions",
      "Past-life karmic explanations",
      "Destiny language",
      "Third-person triangulation",
    ],
    tone: [
      "Neutral",
      "Emotionally non-reactive",
      "Fair to both",
      "Non-judgmental",
    ],
    idealFor: [
      "Feeling confused in a relationship",
      "Suspecting imbalance",
      "Wanting clarity without pressure",
      "Not ready for a final decision",
    ],
  },
  {
    slug: "relationship-direction",
    name: "Relationship Direction",
    level: "Level 5",
    session: "Gold Prime (₹1799)",
    sessionCode: "GP",
    purpose:
      "Where is this connection heading — and what decision actually makes sense?",
    unlocks: [
      "Relationship future direction",
      "Marriage vs separation logic",
      "Commitment feasibility",
      "Decision pressure points",
      "Timing clarity (windows not promises)",
    ],
    blocks: [
      "Emotional reassurance",
      "Romantic promises",
      "Past-life explanations",
      "Family karma",
      "Moral judgement",
    ],
    tone: ["Serious", "Calm", "Non-emotional", "Consequence-aware"],
    idealFor: [
      "Indecision causing harm",
      "Emotional looping",
      "Time pressure exists",
      "Clarity required to act",
    ],
  },
  {
    slug: "karmic",
    name: "Karmic",
    level: "Level 6",
    session: "Platinum (₹2800)",
    sessionCode: "PL",
    purpose:
      "Why does this situation exist at a level that cannot be explained by current-life patterns alone?",
    unlocks: [
      "Past-life causal linkage (only if structurally indicated)",
      "Repeating soul-level roles",
      "Carry-forward tendencies",
      "Multi-person karmic entanglement (up to 3)",
      "Why a pattern feels inevitable despite effort",
    ],
    blocks: [
      "Moral judgement",
      "Reward-punishment framing",
      "Fear-based karma language",
      "Entertainment-style past-life stories",
      "Details without resolution value",
    ],
    tone: ["Minimal", "Calm", "Precise", "Emotionally neutral"],
    idealFor: [
      "Patterns persist across unrelated contexts",
      "Effort hasn't changed outcomes",
      "Emotional charge is disproportionate",
      "Surface explanations have failed",
    ],
  },
  {
    slug: "karmic-systems",
    name: "Karmic Systems",
    level: "Level 7",
    session: "VIP Platinum (₹4999)",
    sessionCode: "VIP",
    purpose:
      "Why does this issue exist as part of a larger system — family, business, lineage — and how can it be resolved?",
    unlocks: [
      "Family or lineage karmic structures",
      "Business/partnership karmic systems",
      "Long-running unresolved obligations",
      "Repeating patterns across generations",
      "Resolution pathways requiring conscious restructuring",
    ],
    blocks: [
      "Fatalistic conclusions",
      "Emotional reassurance",
      "Simplified explanations",
      "Individual blame",
      "Sensational past-life narratives",
    ],
    tone: ["Calm authority", "Grounded", "Non-reactive", "Solution-oriented"],
    idealFor: [
      "Issue repeats beyond individual choice",
      "Multiple people structurally involved",
      "Responsibility spans generations",
      "Long-term decisions unavoidable",
    ],
  },
  {
    slug: "ashra",
    name: "Ashra",
    level: "Beyond Level 7",
    session: "Invite Only — Not Purchasable",
    sessionCode: "ASHRA",
    purpose: "What remains unresolved even after all dimensions are complete?",
    unlocks: [
      "Final clarity without layered explanation",
      "Direct recognition of truth (non-analytical)",
      "Collapse of confusion into one stable understanding",
      "Resolution without narrative expansion",
    ],
    blocks: [
      "Step-by-step explanations",
      "Karmic storytelling",
      "Emotional reassurance",
      "Repeated clarification",
    ],
    tone: ["Minimal", "Absolute calm", "Non-performative", "Non-explanatory"],
    idealFor: [
      "All other dimensions completed",
      "Seeking final, non-narrative clarity",
      "Invitation extended by Hiren",
    ],
  },
];

export const getDimension = (slug: string) =>
  dimensions.find((d) => d.slug === slug);
