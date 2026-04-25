import experienceImg from "@/assets/dimensions/experience.jpg";
import orientationImg from "@/assets/dimensions/orientation.jpg";
import patternImg from "@/assets/dimensions/pattern.jpg";
import patternDirectionImg from "@/assets/dimensions/pattern-direction.jpg";
import relationshipRealityImg from "@/assets/dimensions/relationship-reality.jpg";
import relationshipDirectionImg from "@/assets/dimensions/relationship-direction.jpg";
import karmicImg from "@/assets/dimensions/karmic.jpg";
import karmicSystemImg from "@/assets/dimensions/karmic-system.jpg";

export const dimensionImages: Record<string, string> = {
  experience: experienceImg,
  orientation: orientationImg,
  pattern: patternImg,
  "pattern-direction": patternDirectionImg,
  "relationship-reality": relationshipRealityImg,
  "relationship-direction": relationshipDirectionImg,
  karmic: karmicImg,
  "karmic-system": karmicSystemImg,
};

export type SessionPlan = {
  name: string;
  price: string;
  duration: string;
  questions?: string;
  people: string;
  dimensions: string[];
  featured?: boolean;
};

export const dimensionMeta = {
  experience: {
    title: "Experience",
    question: "What keeps shaping your lived experience?",
    decodes: ["Recurring pressure points", "Personal response loops", "Where clarity gets interrupted"],
    not: ["It does not predict events", "It does not label you", "It does not replace personal choice"],
    tone: "Grounded, reflective, and focused on what can be observed in your patterns.",
    sessions: ["Bronze", "Silver", "Silver Prime", "Silver Prime Lite", "Gold", "Gold Prime", "Platinum", "VIP Platinum"],
  },
  orientation: {
    title: "Orientation",
    question: "Which direction naturally brings cleaner decisions?",
    decodes: ["Decision tendencies", "Mental orientation under pressure", "Useful starting points for action"],
    not: ["It does not force a path", "It does not promise outcomes", "It does not use fear-based guidance"],
    tone: "Precise, calm, and practical for choosing next steps.",
    sessions: ["Bronze", "Silver", "Silver Prime", "Gold", "Gold Prime", "Platinum", "VIP Platinum"],
  },
  pattern: {
    title: "Pattern",
    question: "Which pattern repeats before confusion appears?",
    decodes: ["Repeating personal cycles", "Trigger-response structures", "Where effort loses direction"],
    not: ["It does not blame anyone", "It does not create dependency", "It does not make absolute claims"],
    tone: "Structured and neutral, designed to make repetition visible.",
    sessions: ["Silver", "Silver Prime", "Gold", "Gold Prime", "Platinum", "VIP Platinum"],
  },
  "pattern-direction": {
    title: "Pattern Direction",
    question: "Where does the repeating pattern point next?",
    decodes: ["Decision consequences", "Better sequencing", "Corrective clarity points"],
    not: ["It does not guarantee results", "It does not predict fixed futures", "It does not remove responsibility"],
    tone: "Action-aware without being dramatic or prescriptive.",
    sessions: ["Silver Prime", "Gold Prime", "Platinum", "VIP Platinum"],
  },
  "relationship-reality": {
    title: "Relationship Reality",
    question: "What is actually happening between two people?",
    decodes: ["Interaction patterns", "Mismatch areas", "Emotional and practical friction points"],
    not: ["It does not judge compatibility as fate", "It does not assign blame", "It does not replace communication"],
    tone: "Clear, respectful, and reality-first.",
    sessions: ["Gold", "Gold Prime", "Platinum", "VIP Platinum"],
  },
  "relationship-direction": {
    title: "Relationship Direction",
    question: "What direction creates more clarity in the relationship?",
    decodes: ["Decision routes", "Boundaries and expectations", "Next-step alignment"],
    not: ["It does not promise a relationship outcome", "It does not manipulate decisions", "It does not use emotional pressure"],
    tone: "Mature, calm, and decision-oriented.",
    sessions: ["Gold Prime", "Platinum", "VIP Platinum"],
  },
  karmic: {
    title: "Karmic",
    question: "Which deep pattern is asking to be understood?",
    decodes: ["Long-running behavioral themes", "Inherited or repeated response styles", "Areas needing conscious correction"],
    not: ["It does not use superstition", "It does not define your worth", "It does not remove agency"],
    tone: "Depth-oriented, but always sober and structured.",
    sessions: ["Platinum", "VIP Platinum"],
  },
  "karmic-system": {
    title: "Karmic System",
    question: "How do multiple deep patterns interact as a system?",
    decodes: ["Interconnected pattern maps", "Multi-person dynamics", "Complex decision environments"],
    not: ["It does not mystify complexity", "It does not create fixed conclusions", "It does not replace professional support"],
    tone: "Comprehensive, careful, and system-level.",
    sessions: ["VIP Platinum"],
  },
} as const;

export type DimensionSlug = keyof typeof dimensionMeta;

export const dimensionLinks = Object.entries(dimensionMeta).map(([slug, item]) => ({
  slug: slug as DimensionSlug,
  title: item.title,
  question: item.question,
}));

export const sessionPlans: SessionPlan[] = [
  { name: "Bronze", price: "₹249", duration: "40 min", questions: "10 questions", people: "1 person", dimensions: ["Experience", "Orientation"] },
  { name: "Silver", price: "₹500", duration: "70 min", questions: "25 questions", people: "1 person", dimensions: ["Experience", "Orientation", "Pattern"] },
  { name: "Silver Prime", price: "₹800", duration: "100 min", questions: "40 questions", people: "1 person", dimensions: ["Experience", "Orientation", "Pattern", "Pattern Direction"], featured: true },
  { name: "Silver Prime Lite", price: "FREE", duration: "20 min", questions: "3 questions", people: "1 time only", dimensions: ["Experience"] },
  { name: "Gold", price: "₹1200", duration: "110 min", questions: "50 questions", people: "2 people", dimensions: ["Experience", "Orientation", "Pattern", "Relationship Reality"] },
  { name: "Gold Prime", price: "₹1800", duration: "170 min", questions: "99 questions", people: "2 people", dimensions: ["Experience", "Pattern Direction", "Relationship Reality", "Relationship Direction"], featured: true },
  { name: "Platinum", price: "₹2800", duration: "220 min", people: "3 people", dimensions: ["Experience", "Relationship Direction", "Karmic"] },
  { name: "VIP Platinum", price: "₹4999", duration: "280 min", people: "4 people", dimensions: ["All dimensions", "Karmic System", "Multi-person pattern map"] },
];
