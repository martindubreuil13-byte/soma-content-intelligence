import type { ContentChannel } from "@/lib/content-types";

export type VisualSelection = {
  visualArchetype: string;
  conceptAngle: string;
  archetypeBrief: string;
  conceptBrief: string;
};

type Archetype = {
  style: string;
  framing: string;
  emotion: string;
  composition: string;
  cues: string;
};

type ConceptAngle = {
  narrative: string;
  emotion: string;
  situations: string;
  tension: string;
  goal: string;
};

const visualArchetypes: Record<string, Archetype> = {
  "Documentary Workspace": {
    style: "observational documentary realism in a lived-in workspace",
    framing: "medium-wide or over-the-shoulder framing with natural desk context",
    emotion: "focused, slightly tired, capable operator energy",
    composition: "real laptop or notebook activity, subtle ALPA UI integration, practical clutter",
    cues: "natural window light, imperfect surfaces, real posture, non-staged environment"
  },
  "Close-Up Operational Detail": {
    style: "photographic macro/detail realism around work tools and decision moments",
    framing: "tight crop on hands, screen edge, notes, search results, or lead workflow details",
    emotion: "precision, concentration, small operational win",
    composition: "tactile details and partial UI visibility instead of a full staged scene",
    cues: "fingerprints, paper texture, screen reflections, worn keyboard, believable depth of field"
  },
  "Emotional Friction": {
    style: "grounded editorial realism showing the strain of manual lead hunting",
    framing: "human-centered frame with visible tension in posture or expression",
    emotion: "frustration, fatigue, urgency without melodrama",
    composition: "messy workflow elements contrasted with a calmer ALPA screen moment",
    cues: "late inboxes, scattered notes, tired eyes, imperfect lighting, real workspace pressure"
  },
  "Quiet Success": {
    style: "restrained realism after a practical breakthrough",
    framing: "calm medium shot or quiet detail with room to breathe",
    emotion: "relief, clarity, low-key confidence",
    composition: "cleaner workspace state, subtle screen confirmation, human presence not posing",
    cues: "soft natural light, relaxed shoulders, less clutter, believable operational calm"
  },
  "Editorial Minimalism": {
    style: "premium editorial photography with restraint",
    framing: "clean portrait or carefully composed object scene with negative space",
    emotion: "clear, sharp, composed, not flashy",
    composition: "minimal props, subtle device screen, one strong focal point",
    cues: "muted palette, real textures, controlled light, no ad-like typography"
  },
  "Creator POV": {
    style: "creator-native first-person realism",
    framing: "POV angle, handheld feel, screen or phone partially in frame",
    emotion: "immediate, candid, in-the-moment work energy",
    composition: "hands, device, messy surroundings, quick workflow proof",
    cues: "slight motion, natural phone perspective, imperfect framing, lived-in context"
  },
  "Mobile Hustle": {
    style: "mobile-first real-world productivity without polish",
    framing: "vertical phone-led composition with strong focal point",
    emotion: "fast, practical, moving between tasks",
    composition: "phone UI in hand, real environment around it, no floating overlays",
    cues: "street light, cafe table, thumb interaction, realistic screen glare"
  },
  "Late Night Operator": {
    style: "low-light documentary realism around late work sessions",
    framing: "intimate desk or laptop scene with subdued shadows",
    emotion: "fatigue, persistence, quiet focus",
    composition: "small pool of light, ALPA screen integrated into real late-night workflow",
    cues: "dim lamp, coffee residue, tired posture, realistic monitor glow without sci-fi effects"
  },
  "Coffee Shop Workflow": {
    style: "relatable real-world work scene in a cafe or casual third place",
    framing: "medium shot or table-level detail with environmental texture",
    emotion: "practical momentum, everyday operator energy",
    composition: "laptop or phone on cafe table, subtle ALPA UI, background life softly present",
    cues: "ceramic cup, ambient daylight, imperfect table, candid posture"
  },
  "Transit / On-The-Go Work": {
    style: "documentary mobile work in motion",
    framing: "vertical or tight environmental frame in transit, airport, rideshare, or walkway",
    emotion: "resourceful, time-sensitive, practical",
    composition: "phone-first workflow, surroundings imply movement, no futuristic visuals",
    cues: "motion blur, natural public light, one-handed phone use, imperfect framing"
  }
};

const conceptAngles: Record<string, ConceptAngle> = {
  "Time Compression": {
    narrative: "manual research hours collapsing into one clean operational moment",
    emotion: "relief, speed, reclaimed focus",
    situations: "cold coffee beside fresh leads, old research tabs next to a concise result, a clock showing work finished early",
    tension: "the old slow grind versus a faster lead flow",
    goal: "make ALPA feel like time returned to the operator"
  },
  "Operational Freedom": {
    narrative: "lead generation continuing while the operator is away from the desk",
    emotion: "independence, calm control, lightness",
    situations: "checking leads between errands, laptop closed while the workflow is handled, weekend plans not interrupted",
    tension: "business still needs momentum without trapping the operator",
    goal: "show work moving without constant manual presence"
  },
  Momentum: {
    narrative: "small lead actions building into visible forward motion",
    emotion: "pace, confidence, practical progress",
    situations: "fresh notifications, updated lead list, operator moving from planning to outreach",
    tension: "stuck pipeline versus steady next steps",
    goal: "communicate that lead flow is active and usable"
  },
  "Escaping Busywork": {
    narrative: "the operator stepping out of repetitive lead-search tasks",
    emotion: "release, clarity, reduced mental load",
    situations: "messy manual notes pushed aside, browser tabs reduced, a cleaner workflow replacing copy-paste work",
    tension: "repetitive admin work versus higher-value selling",
    goal: "make the cost of busywork visible without exaggeration"
  },
  "Quiet Efficiency": {
    narrative: "a restrained workflow doing its job without spectacle",
    emotion: "calm competence, trust, composure",
    situations: "simple desk, one useful screen, relaxed posture after a task completes",
    tension: "noisy tools versus understated operational clarity",
    goal: "show effectiveness through subtle, believable details"
  },
  "Mobile Operator": {
    narrative: "the operator managing lead flow from a phone in real life",
    emotion: "resourceful, direct, in control",
    situations: "rideshare, airport seat, sidewalk pause, phone in hand between meetings",
    tension: "work cannot wait for the perfect desk setup",
    goal: "make mobile productivity feel practical instead of performative"
  },
  "Reclaiming Time": {
    narrative: "time once spent hunting leads becoming personal or strategic time",
    emotion: "breathing room, grounded satisfaction",
    situations: "evening light, closed laptop, family table edge, gym bag or weekend bag nearby",
    tension: "lead work spilling into life versus work contained",
    goal: "show the human value of removing manual prospecting"
  },
  "Passive Prospecting": {
    narrative: "qualified leads arriving while the operator is focused elsewhere",
    emotion: "quiet confidence, ease, background momentum",
    situations: "leads arrive during a call, while coffee sits untouched, while the operator reviews strategy",
    tension: "pipeline creation usually demands constant attention",
    goal: "show lead generation as a calm background engine"
  },
  "Speed Advantage": {
    narrative: "finding useful leads before competitors or delays slow the business down",
    emotion: "alertness, decisiveness, sharp timing",
    situations: "ready-to-contact leads before a meeting, quick decision at a laptop, phone ready for outreach",
    tension: "late response versus timely action",
    goal: "make fast lead access feel operationally valuable"
  },
  "Async Productivity": {
    narrative: "work advancing across gaps in the day without a formal work session",
    emotion: "flexibility, continuity, calm pace",
    situations: "between calls, waiting room, lunch counter, short pause during travel",
    tension: "fragmented days versus continuous progress",
    goal: "show useful progress happening in realistic in-between moments"
  },
  "Work-Life Contrast": {
    narrative: "the pressure of business contrasted with ordinary life still happening",
    emotion: "human, balanced, quietly hopeful",
    situations: "evening kitchen table, weekend bag near a laptop, child drawing beside a closed notebook",
    tension: "business demands competing with life outside work",
    goal: "show ALPA as a tool that respects real life"
  },
  "Lead Hunting Fatigue": {
    narrative: "the emotional cost of searching, verifying, and organizing prospects manually",
    emotion: "fatigue, friction, honest pressure",
    situations: "crowded tabs, crossed-out notebook lists, missed call alerts, tired posture",
    tension: "manual hunting drains energy before selling even starts",
    goal: "make the old problem visually specific and relatable"
  },
  "Business While Living": {
    narrative: "business development continuing through ordinary movement and life",
    emotion: "ease, agency, everyday confidence",
    situations: "airport gate, train platform, school pickup wait, walking between appointments",
    tension: "growth work tied to a desk versus growth work fitting the day",
    goal: "show practical business continuity in real environments"
  },
  "Silent Momentum": {
    narrative: "progress is visible through small cues rather than dramatic action",
    emotion: "subtle confidence, trust, low-noise progress",
    situations: "updated lead count, quiet notification, tidy next-step notes, relaxed operator glance",
    tension: "loud effort versus quiet results",
    goal: "communicate progress without hype or fake urgency"
  },
  "Workflow Relief": {
    narrative: "the moment a cluttered lead workflow becomes manageable",
    emotion: "relief, order, mental space",
    situations: "notes sorted, laptop screen simplified, shoulders relaxing, old spreadsheet beside cleaner ALPA flow",
    tension: "chaos and scattered research versus one calmer path",
    goal: "make operational clarity feel emotionally real"
  }
};

const preferredVisualArchetypes: Record<ContentChannel, string[]> = {
  linkedin: ["Documentary Workspace", "Close-Up Operational Detail", "Quiet Success", "Editorial Minimalism", "Late Night Operator"],
  facebook: ["Emotional Friction", "Coffee Shop Workflow", "Documentary Workspace", "Quiet Success", "Mobile Hustle"],
  instagram: ["Editorial Minimalism", "Quiet Success", "Close-Up Operational Detail", "Coffee Shop Workflow", "Late Night Operator"],
  tiktok: ["Creator POV", "Mobile Hustle", "Transit / On-The-Go Work", "Close-Up Operational Detail", "Coffee Shop Workflow"]
};

const preferredConceptAngles: Record<ContentChannel, string[]> = {
  linkedin: ["Time Compression", "Quiet Efficiency", "Speed Advantage", "Workflow Relief", "Silent Momentum", "Lead Hunting Fatigue"],
  facebook: ["Reclaiming Time", "Work-Life Contrast", "Escaping Busywork", "Operational Freedom", "Workflow Relief"],
  instagram: ["Reclaiming Time", "Quiet Efficiency", "Work-Life Contrast", "Silent Momentum", "Time Compression"],
  tiktok: ["Mobile Operator", "Async Productivity", "Business While Living", "Speed Advantage", "Passive Prospecting"]
};

function chooseDifferent(options: string[], previous?: string) {
  const filtered = previous ? options.filter((option) => !previous.includes(option)) : options;
  const choices = filtered.length ? filtered : options;

  return choices[Math.floor(Math.random() * choices.length)];
}

function formatArchetypeBrief(name: string) {
  const archetype = visualArchetypes[name];

  return `${name}: ${archetype.style}; framing: ${archetype.framing}; emotion: ${archetype.emotion}; composition: ${archetype.composition}; realism cues: ${archetype.cues}.`;
}

function formatConceptBrief(name: string) {
  const concept = conceptAngles[name];

  return `${name}: narrative: ${concept.narrative}; emotion: ${concept.emotion}; situational cues: ${concept.situations}; tension: ${concept.tension}; goal: ${concept.goal}.`;
}

export function chooseVisualSelection(
  channel: ContentChannel,
  previousArchetype?: string,
  previousConceptAngle?: string
): VisualSelection {
  const visualArchetype = chooseDifferent(preferredVisualArchetypes[channel], previousArchetype);
  const conceptAngle = chooseDifferent(preferredConceptAngles[channel], previousConceptAngle);

  return {
    visualArchetype,
    conceptAngle,
    archetypeBrief: formatArchetypeBrief(visualArchetype),
    conceptBrief: formatConceptBrief(conceptAngle)
  };
}
