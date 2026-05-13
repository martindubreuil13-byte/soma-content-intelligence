from openai import OpenAI
from dotenv import load_dotenv
import json
import os
import random
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
model = "gpt-4.1-mini"
required_fields = ["linkedin", "facebook", "instagram", "tiktok"]

visual_archetypes = {
    "Documentary Workspace": {
        "style": "observational documentary realism in a lived-in workspace",
        "framing": "medium-wide or over-the-shoulder framing with natural desk context",
        "emotion": "focused, slightly tired, capable operator energy",
        "composition": "real laptop or notebook activity, subtle ALPA UI integration, practical clutter",
        "cues": "natural window light, imperfect surfaces, real posture, non-staged environment",
    },
    "Close-Up Operational Detail": {
        "style": "photographic macro/detail realism around work tools and decision moments",
        "framing": "tight crop on hands, screen edge, notes, search results, or lead workflow details",
        "emotion": "precision, concentration, small operational win",
        "composition": "tactile details and partial UI visibility instead of a full staged scene",
        "cues": "fingerprints, paper texture, screen reflections, worn keyboard, believable depth of field",
    },
    "Emotional Friction": {
        "style": "grounded editorial realism showing the strain of manual lead hunting",
        "framing": "human-centered frame with visible tension in posture or expression",
        "emotion": "frustration, fatigue, urgency without melodrama",
        "composition": "messy workflow elements contrasted with a calmer ALPA screen moment",
        "cues": "late inboxes, scattered notes, tired eyes, imperfect lighting, real workspace pressure",
    },
    "Quiet Success": {
        "style": "restrained realism after a practical breakthrough",
        "framing": "calm medium shot or quiet detail with room to breathe",
        "emotion": "relief, clarity, low-key confidence",
        "composition": "cleaner workspace state, subtle screen confirmation, human presence not posing",
        "cues": "soft natural light, relaxed shoulders, less clutter, believable operational calm",
    },
    "Editorial Minimalism": {
        "style": "premium editorial photography with restraint",
        "framing": "clean portrait or carefully composed object scene with negative space",
        "emotion": "clear, sharp, composed, not flashy",
        "composition": "minimal props, subtle device screen, one strong focal point",
        "cues": "muted palette, real textures, controlled light, no ad-like typography",
    },
    "Creator POV": {
        "style": "creator-native first-person realism",
        "framing": "POV angle, handheld feel, screen or phone partially in frame",
        "emotion": "immediate, candid, in-the-moment work energy",
        "composition": "hands, device, messy surroundings, quick workflow proof",
        "cues": "slight motion, natural phone perspective, imperfect framing, lived-in context",
    },
    "Mobile Hustle": {
        "style": "mobile-first real-world productivity without polish",
        "framing": "vertical phone-led composition with strong focal point",
        "emotion": "fast, practical, moving between tasks",
        "composition": "phone UI in hand, real environment around it, no floating overlays",
        "cues": "street light, cafe table, thumb interaction, realistic screen glare",
    },
    "Late Night Operator": {
        "style": "low-light documentary realism around late work sessions",
        "framing": "intimate desk or laptop scene with subdued shadows",
        "emotion": "fatigue, persistence, quiet focus",
        "composition": "small pool of light, ALPA screen integrated into real late-night workflow",
        "cues": "dim lamp, coffee residue, tired posture, realistic monitor glow without sci-fi effects",
    },
    "Coffee Shop Workflow": {
        "style": "relatable real-world work scene in a cafe or casual third place",
        "framing": "medium shot or table-level detail with environmental texture",
        "emotion": "practical momentum, everyday operator energy",
        "composition": "laptop or phone on cafe table, subtle ALPA UI, background life softly present",
        "cues": "ceramic cup, ambient daylight, imperfect table, candid posture",
    },
    "Transit / On-The-Go Work": {
        "style": "documentary mobile work in motion",
        "framing": "vertical or tight environmental frame in transit, airport, rideshare, or walkway",
        "emotion": "resourceful, time-sensitive, practical",
        "composition": "phone-first workflow, surroundings imply movement, no futuristic visuals",
        "cues": "motion blur, natural public light, one-handed phone use, imperfect framing",
    },
}

compatible_archetype_blends = [
    ("Documentary Workspace", "Close-Up Operational Detail"),
    ("Documentary Workspace", "Emotional Friction"),
    ("Close-Up Operational Detail", "Quiet Success"),
    ("Editorial Minimalism", "Quiet Success"),
    ("Creator POV", "Close-Up Operational Detail"),
    ("Creator POV", "Mobile Hustle"),
    ("Mobile Hustle", "Transit / On-The-Go Work"),
    ("Late Night Operator", "Close-Up Operational Detail"),
    ("Coffee Shop Workflow", "Mobile Hustle"),
]

preferred_visual_archetypes = {
    "linkedin": ["Documentary Workspace", "Close-Up Operational Detail", "Quiet Success", "Editorial Minimalism", "Late Night Operator"],
    "facebook": ["Emotional Friction", "Coffee Shop Workflow", "Documentary Workspace", "Quiet Success", "Mobile Hustle"],
    "instagram": ["Editorial Minimalism", "Quiet Success", "Close-Up Operational Detail", "Coffee Shop Workflow", "Late Night Operator"],
    "tiktok": ["Creator POV", "Mobile Hustle", "Transit / On-The-Go Work", "Close-Up Operational Detail", "Coffee Shop Workflow"],
}

concept_angles = {
    "Time Compression": {
        "narrative": "manual research hours collapsing into one clean operational moment",
        "emotion": "relief, speed, reclaimed focus",
        "situations": "cold coffee beside fresh leads, old research tabs next to a concise result, a clock showing work finished early",
        "tension": "the old slow grind versus a faster lead flow",
        "goal": "make ALPA feel like time returned to the operator",
    },
    "Operational Freedom": {
        "narrative": "lead generation continuing while the operator is away from the desk",
        "emotion": "independence, calm control, lightness",
        "situations": "checking leads between errands, laptop closed while the workflow is handled, weekend plans not interrupted",
        "tension": "business still needs momentum without trapping the operator",
        "goal": "show work moving without constant manual presence",
    },
    "Momentum": {
        "narrative": "small lead actions building into visible forward motion",
        "emotion": "pace, confidence, practical progress",
        "situations": "fresh notifications, updated lead list, operator moving from planning to outreach",
        "tension": "stuck pipeline versus steady next steps",
        "goal": "communicate that lead flow is active and usable",
    },
    "Escaping Busywork": {
        "narrative": "the operator stepping out of repetitive lead-search tasks",
        "emotion": "release, clarity, reduced mental load",
        "situations": "messy manual notes pushed aside, browser tabs reduced, a cleaner workflow replacing copy-paste work",
        "tension": "repetitive admin work versus higher-value selling",
        "goal": "make the cost of busywork visible without exaggeration",
    },
    "Quiet Efficiency": {
        "narrative": "a restrained workflow doing its job without spectacle",
        "emotion": "calm competence, trust, composure",
        "situations": "simple desk, one useful screen, relaxed posture after a task completes",
        "tension": "noisy tools versus understated operational clarity",
        "goal": "show effectiveness through subtle, believable details",
    },
    "Mobile Operator": {
        "narrative": "the operator managing lead flow from a phone in real life",
        "emotion": "resourceful, direct, in control",
        "situations": "rideshare, airport seat, sidewalk pause, phone in hand between meetings",
        "tension": "work cannot wait for the perfect desk setup",
        "goal": "make mobile productivity feel practical instead of performative",
    },
    "Reclaiming Time": {
        "narrative": "time once spent hunting leads becoming personal or strategic time",
        "emotion": "breathing room, grounded satisfaction",
        "situations": "evening light, closed laptop, family table edge, gym bag or weekend bag nearby",
        "tension": "lead work spilling into life versus work contained",
        "goal": "show the human value of removing manual prospecting",
    },
    "Passive Prospecting": {
        "narrative": "qualified leads arriving while the operator is focused elsewhere",
        "emotion": "quiet confidence, ease, background momentum",
        "situations": "leads arrive during a call, while coffee sits untouched, while the operator reviews strategy",
        "tension": "pipeline creation usually demands constant attention",
        "goal": "show lead generation as a calm background engine",
    },
    "Speed Advantage": {
        "narrative": "finding useful leads before competitors or delays slow the business down",
        "emotion": "alertness, decisiveness, sharp timing",
        "situations": "ready-to-contact leads before a meeting, quick decision at a laptop, phone ready for outreach",
        "tension": "late response versus timely action",
        "goal": "make fast lead access feel operationally valuable",
    },
    "Async Productivity": {
        "narrative": "work advancing across gaps in the day without a formal work session",
        "emotion": "flexibility, continuity, calm pace",
        "situations": "between calls, waiting room, lunch counter, short pause during travel",
        "tension": "fragmented days versus continuous progress",
        "goal": "show useful progress happening in realistic in-between moments",
    },
    "Work-Life Contrast": {
        "narrative": "the pressure of business contrasted with ordinary life still happening",
        "emotion": "human, balanced, quietly hopeful",
        "situations": "evening kitchen table, weekend bag near a laptop, child drawing beside a closed notebook",
        "tension": "business demands competing with life outside work",
        "goal": "show ALPA as a tool that respects real life",
    },
    "Lead Hunting Fatigue": {
        "narrative": "the emotional cost of searching, verifying, and organizing prospects manually",
        "emotion": "fatigue, friction, honest pressure",
        "situations": "crowded tabs, crossed-out notebook lists, missed call alerts, tired posture",
        "tension": "manual hunting drains energy before selling even starts",
        "goal": "make the old problem visually specific and relatable",
    },
    "Business While Living": {
        "narrative": "business development continuing through ordinary movement and life",
        "emotion": "ease, agency, everyday confidence",
        "situations": "airport gate, train platform, school pickup wait, walking between appointments",
        "tension": "growth work tied to a desk versus growth work fitting the day",
        "goal": "show practical business continuity in real environments",
    },
    "Silent Momentum": {
        "narrative": "progress is visible through small cues rather than dramatic action",
        "emotion": "subtle confidence, trust, low-noise progress",
        "situations": "updated lead count, quiet notification, tidy next-step notes, relaxed operator glance",
        "tension": "loud effort versus quiet results",
        "goal": "communicate progress without hype or fake urgency",
    },
    "Workflow Relief": {
        "narrative": "the moment a cluttered lead workflow becomes manageable",
        "emotion": "relief, order, mental space",
        "situations": "notes sorted, laptop screen simplified, shoulders relaxing, old spreadsheet beside cleaner ALPA flow",
        "tension": "chaos and scattered research versus one calmer path",
        "goal": "make operational clarity feel emotionally real",
    },
}

compatible_concept_angle_blends = [
    ("Time Compression", "Reclaiming Time"),
    ("Operational Freedom", "Business While Living"),
    ("Momentum", "Speed Advantage"),
    ("Escaping Busywork", "Workflow Relief"),
    ("Quiet Efficiency", "Silent Momentum"),
    ("Mobile Operator", "Async Productivity"),
    ("Reclaiming Time", "Work-Life Contrast"),
    ("Passive Prospecting", "Silent Momentum"),
    ("Lead Hunting Fatigue", "Escaping Busywork"),
    ("Business While Living", "Mobile Operator"),
]

preferred_concept_angles = {
    "linkedin": ["Time Compression", "Quiet Efficiency", "Speed Advantage", "Workflow Relief", "Silent Momentum", "Lead Hunting Fatigue"],
    "facebook": ["Reclaiming Time", "Work-Life Contrast", "Escaping Busywork", "Operational Freedom", "Workflow Relief"],
    "instagram": ["Reclaiming Time", "Quiet Efficiency", "Work-Life Contrast", "Silent Momentum", "Time Compression"],
    "tiktok": ["Mobile Operator", "Async Productivity", "Business While Living", "Speed Advantage", "Passive Prospecting"],
}

def load_intelligence_list(filename):
    """Load a JSON list from memory/intelligence/, return empty list on error."""
    filepath = os.path.join("memory", "intelligence", filename)
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []

def load_brand_intelligence():
    """Load all Brand Intelligence files from memory/intelligence/."""
    return {
        "icps": load_intelligence_list("icps.json"),
        "angles": load_intelligence_list("angles.json"),
        "hook_styles": load_intelligence_list("hook-styles.json"),
        "cta_styles": load_intelligence_list("cta-styles.json"),
        "negative_constraints": load_intelligence_list("negative-constraints.json"),
    }

def filter_active_by_platform(records, channel, platform_key):
    """Return active records matching the channel's platform affinity, or all active if no match."""
    active = [r for r in records if r.get("isActive", True)]
    with_affinity = [r for r in active if channel in r.get(platform_key, [])]
    return with_affinity if with_affinity else active

def weighted_select(items, key="performanceScore", n=3):
    """Weighted random selection without replacement.

    Items with higher performanceScore are chosen more often, but every item has
    at least weight=1 so lower-scoring combinations still appear occasionally
    (controlled experimentation). This prevents the engine from always picking
    the same patterns even as confidence scores rise.
    """
    if not items:
        return []
    n = min(n, len(items))
    if n == len(items):
        return list(items)
    weights = [max(1, item.get(key, 0) + 1) for item in items]
    selected = []
    pool = list(zip(items, weights))
    for _ in range(n):
        if not pool:
            break
        total = sum(w for _, w in pool)
        pick = random.uniform(0, total)
        cumulative = 0.0
        chosen_idx = 0
        for i, (_, weight) in enumerate(pool):
            cumulative += weight
            if pick <= cumulative:
                chosen_idx = i
                break
        selected.append(pool[chosen_idx][0])
        pool.pop(chosen_idx)
    return selected

def select_intelligence_for_channel(channel, intelligence):
    """Select ICPs, angles, hooks, CTAs, and constraints for a channel using weighted randomness."""
    icps = filter_active_by_platform(intelligence["icps"], channel, "platforms")
    angles = filter_active_by_platform(intelligence["angles"], channel, "platformAffinity")
    hooks = [h for h in intelligence["hook_styles"] if h.get("isActive", True)]
    ctas = [c for c in intelligence["cta_styles"] if c.get("isActive", True)]
    constraints = [n for n in intelligence["negative_constraints"] if n.get("isActive", True)]

    return {
        "icps": weighted_select(icps, key="performanceScore", n=3),
        "angles": weighted_select(angles, key="performanceScore", n=3),
        "hooks": weighted_select(hooks, key="performanceScore", n=4),
        "ctas": weighted_select(ctas, key="performanceScore", n=2),
        "constraints": constraints,
    }

def build_intelligence_block_for_channel(selected):
    """Build a concise per-channel intelligence block for the prompt."""
    lines = []

    if selected["icps"]:
        lines.append("  Target audience — write for one of these:")
        for icp in selected["icps"]:
            desc = icp.get("description", "")
            pains = icp.get("painPoints", [])[:2]
            triggers = icp.get("emotionalTriggers", [])[:2]
            detail = f"{icp['label']}: {desc}"
            if pains:
                detail += f" | Pain: {', '.join(pains)}"
            if triggers:
                detail += f" | Triggers: {', '.join(triggers)}"
            lines.append(f"    • {detail}")

    if selected["angles"]:
        lines.append("  Content angle — pick the most relevant:")
        for angle in selected["angles"]:
            lines.append(f"    • {angle['label']}: {angle.get('description', '')}")

    if selected["hooks"]:
        lines.append("  Hook style — open with one of these:")
        for hook in selected["hooks"]:
            lines.append(f"    • {hook['label']}: \"{hook.get('example', '')}\"")

    if selected["ctas"]:
        lines.append("  CTA style — close with one of these (keep the official ALPA URL exactly):")
        for cta in selected["ctas"]:
            lines.append(f"    • {cta['label']}: \"{cta.get('example', '')}\"")

    if selected["constraints"]:
        lines.append("  Never use:")
        for c in selected["constraints"]:
            examples = c.get("examples", [])[:3]
            lines.append(f"    • {c['label']}: {', '.join(examples)}")

    return "\n".join(lines)

def build_full_intelligence_prompt(channel_selections):
    """Build the full per-channel Brand Intelligence block for the prompt."""
    has_data = any(
        channel_selections[ch]["icps"] or channel_selections[ch]["angles"]
        for ch in required_fields
    )
    if not has_data:
        return ""

    sections = [
        "Brand Intelligence — per-channel targeting (use this to direct caption writing):",
        "These are strategic guidelines. Combine them with your channel behavior rules and visual prompt system.",
    ]
    for channel in required_fields:
        block = build_intelligence_block_for_channel(channel_selections[channel])
        if block:
            sections.append(f"\n  [{channel.upper()}]")
            sections.append(block)

    return "\n".join(sections)

def build_generation_context(channel_selections):
    """Build the generation_context dict for meta.json — one entry per channel."""
    now = datetime.now().isoformat()
    ctx = {}
    for channel in required_fields:
        sel = channel_selections[channel]
        ctx[channel] = {
            "attempt": 1,
            "source": "initial_generation",
            "active_icp_ids": [icp["id"] for icp in sel["icps"]],
            "active_angle_ids": [a["id"] for a in sel["angles"]],
            "active_hook_ids": [h["id"] for h in sel["hooks"]],
            "active_cta_ids": [c["id"] for c in sel["ctas"]],
            "active_constraint_ids": [n["id"] for n in sel["constraints"]],
            "generated_at": now,
        }
    return ctx

def format_archetype_brief(name):
    archetype = visual_archetypes[name]
    return (
        f"{name} — visual style: {archetype['style']}; "
        f"framing: {archetype['framing']}; "
        f"emotional tone: {archetype['emotion']}; "
        f"composition: {archetype['composition']}; "
        f"realism cues: {archetype['cues']}."
    )

def choose_visual_archetypes():
    selected = {}
    channel_briefs = []

    for channel in required_fields:
        preferred = preferred_visual_archetypes[channel]
        should_blend = random.random() < 0.25
        possible_blends = [
            blend
            for blend in compatible_archetype_blends
            if blend[0] in preferred or blend[1] in preferred
        ]

        if should_blend and possible_blends:
            first, second = random.choice(possible_blends)
            selected[channel] = f"{first} + {second}"
            brief = f"Visual archetype blend: {format_archetype_brief(first)} Blend with: {format_archetype_brief(second)}"
        else:
            archetype_name = random.choice(preferred)
            selected[channel] = archetype_name
            brief = f"Visual archetype: {format_archetype_brief(archetype_name)}"

        channel_briefs.append(f"- {channel}: {brief}")

    return selected, "\n".join(channel_briefs)

def format_concept_angle_brief(name):
    concept = concept_angles[name]
    return (
        f"{name} — narrative: {concept['narrative']}; "
        f"emotion: {concept['emotion']}; "
        f"situational cues: {concept['situations']}; "
        f"tension: {concept['tension']}; "
        f"goal: {concept['goal']}."
    )

def choose_concept_angles():
    selected = {}
    channel_briefs = []

    for channel in required_fields:
        preferred = preferred_concept_angles[channel]
        should_blend = random.random() < 0.20
        possible_blends = [
            blend
            for blend in compatible_concept_angle_blends
            if blend[0] in preferred or blend[1] in preferred
        ]

        if should_blend and possible_blends:
            first, second = random.choice(possible_blends)
            selected[channel] = f"{first} + {second}"
            brief = f"Concept angle blend: {format_concept_angle_brief(first)} Blend with: {format_concept_angle_brief(second)}"
        else:
            concept_name = random.choice(preferred)
            selected[channel] = concept_name
            brief = f"Concept angle: {format_concept_angle_brief(concept_name)}"

        channel_briefs.append(f"- {channel}: {brief}")

    return selected, "\n".join(channel_briefs)

def format_preference_memory(preferences):
    labels = {
        "preferred_visual_styles": "Preferred visual styles",
        "avoid_visual_patterns": "Recent rejected visual patterns",
        "preferred_caption_tones": "Preferred caption tones",
        "avoid_caption_patterns": "Recent rejected caption patterns",
        "preferred_emotional_themes": "Preferred emotional themes",
        "operator_notes": "Operator notes",
    }
    sections = []

    for key, label in labels.items():
        values = preferences.get(key)

        if isinstance(values, list):
            clean_values = [str(value).strip() for value in values if str(value).strip()]

            if clean_values:
                sections.append(f"{label}: " + "; ".join(clean_values))

    last_updated = preferences.get("last_updated")

    if isinstance(last_updated, str) and last_updated.strip():
        sections.append(f"Last updated: {last_updated.strip()}")

    if not sections:
        return "No distilled operator preference memory yet."

    return "\n".join(f"- {section}" for section in sections)

def load_preference_memory():
    preference_path = "memory/preferences.json"

    if not os.path.exists(preference_path):
        return "No distilled operator preference memory yet."

    try:
        with open(preference_path, "r") as file:
            preferences = json.load(file)
    except (OSError, json.JSONDecodeError):
        return "No distilled operator preference memory yet."

    if not isinstance(preferences, dict):
        return "No distilled operator preference memory yet."

    return format_preference_memory(preferences)


def load_training_injections():
    """Load active training injections and build a prompt block with specialized tag routing.

    Visual/composition tags → image prompt guidance.
    Tone/strategic/audience tags → caption guidance.
    Constraints → all generation.
    """
    injection_path = os.path.join("memory", "training-injections.json")
    if not os.path.exists(injection_path):
        return ""

    try:
        with open(injection_path, "r") as f:
            injections = json.load(f)
    except (OSError, json.JSONDecodeError):
        return ""

    if not isinstance(injections, list):
        return ""

    active = [
        inj for inj in injections
        if isinstance(inj, dict) and inj.get("active", False)
        and inj.get("appliesTo") in ("all", "caption", "image", "poster")
    ]

    if not active:
        return ""

    lines = ["Training Injections — operator-curated creative intelligence (apply across all channels):"]

    positive = [i for i in active if i.get("type") != "negative_training"]
    negative = [i for i in active if i.get("type") == "negative_training"]

    for inj in positive:
        inj_type = str(inj.get("type", "")).replace("_", " ").upper()
        label = inj.get("label", "")
        notes = inj.get("notes", "")
        source = inj.get("sourceText", "")
        preferences = inj.get("extractedPreferences", [])
        tags = inj.get("extractedTags", [])

        # Specialized tag arrays from enhanced analysis
        visual_tags = inj.get("extractedVisualTags", [])
        composition_tags = inj.get("extractedCompositionTags", [])
        tone_tags = inj.get("extractedToneTags", [])
        strategic_signals = inj.get("extractedStrategicSignals", [])
        audience_signals = inj.get("extractedAudienceSignals", [])

        lines.append(f"\n  [{inj_type}] {label}")
        if notes:
            lines.append(f"  Context: {notes}")
        if source:
            snippet = source[:200] + "…" if len(source) > 200 else source
            lines.append(f"  Reference: {snippet}")

        # Visual guidance (influences image/visual_prompt generation)
        visual_combined = visual_tags[:4] + composition_tags[:2]
        if visual_combined:
            lines.append(f"  Visual style: {', '.join(visual_combined)}")

        # Caption/tone guidance
        caption_signals = tone_tags[:3] + strategic_signals[:2] + audience_signals[:2]
        if caption_signals:
            lines.append(f"  Tone & strategy: {'; '.join(caption_signals)}")

        if preferences:
            lines.append(f"  Apply: {'; '.join(preferences[:4])}")
        if tags and not (visual_combined or caption_signals):
            lines.append(f"  Signals: {', '.join(tags[:5])}")

    if negative:
        lines.append("\n  NEVER replicate these patterns:")
        for inj in negative:
            label = inj.get("label", "")
            notes = inj.get("notes", "")
            constraints = inj.get("extractedConstraints", [])
            tags = inj.get("extractedTags", [])
            lines.append(f"  • {label}{': ' + notes if notes else ''}")
            if constraints:
                lines.append(f"    Avoid: {'; '.join(constraints[:4])}")
            elif tags:
                lines.append(f"    Avoid: {', '.join(tags[:4])}")

    return "\n".join(lines)

visual_archetype_selection, visual_archetype_prompt = choose_visual_archetypes()
concept_angle_selection, concept_angle_prompt = choose_concept_angles()

# Read raw idea
with open("inputs/raw-idea.txt", "r") as file:
    raw_idea = file.read()

# Read brand voice
with open("brand/alpa-voice.md", "r") as file:
    brand_voice = file.read()

# Read asset grounding notes
with open("assets/reference-notes/asset-map.md", "r") as file:
    asset_map = file.read()

# Read banned phrases
with open("brand/banned-phrases.md", "r") as file:
    banned_phrases = file.read()

# Read CTA library
with open("brand/cta-library.md", "r") as file:
    cta_library = file.read()

# Read distilled local preference memory
preference_memory = load_preference_memory()

# Load active training injections
training_injections = load_training_injections()
training_injections_block = f"\n{training_injections}\n" if training_injections else ""

# Load Brand Intelligence and build per-channel selection + prompt section
brand_intelligence = load_brand_intelligence()
channel_intelligence_selection = {ch: select_intelligence_for_channel(ch, brand_intelligence) for ch in required_fields}
intelligence_prompt_section = build_full_intelligence_prompt(channel_intelligence_selection)
intelligence_block = f"\n{intelligence_prompt_section}\n" if intelligence_prompt_section else ""

# Build prompt
prompt = f"""
{brand_voice}

{asset_map}

{banned_phrases}

Mandatory CTA source:
Use the following CTA library as behavioral memory and the source of truth for CTA wording, CTA tone, and the official ALPA URL.
Every social post must follow it.

{cta_library}

Recent operator preferences:
{preference_memory}

Preference memory rules:
- Use preferences as directional guidance, not strict templates.
- Let recent approved patterns softly influence captions, visual prompts, realism direction, and emotional tone.
- Let recent rejected patterns help you avoid repeating disliked choices.
- Do not overfit, repeat identical styles, collapse creativity, or eliminate variation.
- Brand voice, realism rules, CTA rules, platform calibration, and asset grounding still take priority.
{training_injections_block}{intelligence_block}
Your task:
Create four channel-specific creative packages and return STRICT JSON only.

Required JSON schema:
{{
  "linkedin": {{
    "caption": "LinkedIn post text",
    "visual_prompt": "LinkedIn-specific image generation prompt"
  }},
  "facebook": {{
    "caption": "Facebook post text",
    "visual_prompt": "Facebook-specific image generation prompt"
  }},
  "instagram": {{
    "caption": "Instagram caption text",
    "visual_prompt": "Instagram-specific image generation prompt"
  }},
  "tiktok": {{
    "caption": "TikTok caption text",
    "visual_prompt": "TikTok-specific image generation prompt"
  }}
}}

Rules:
- Return only valid JSON.
- Do not wrap the JSON in markdown.
- Do not include ```json fences.
- Do not add commentary before or after the JSON.
- All four platform fields must exist.
- Each platform value must be an object with caption and visual_prompt strings.

Channel behavior:
- LinkedIn: operator-minded, clear, direct, with thoughtful pacing and enough depth to feel useful.
- Facebook: conversational, human, practical, slightly casual, and warmer than LinkedIn.
- Instagram: emotionally punchy, highly scannable, visual, creator-native, and reflective. Do not make it identical to TikTok.
- TikTok: concise, direct, hook-driven, and grounded.

CTA behavior rules:
- Every caption MUST end with a CTA.
- This applies to linkedin.caption, facebook.caption, instagram.caption, and tiktok.caption.
- The final CTA must include the official ALPA URL from the CTA library exactly as written.
- Do not omit the CTA.
- Do not replace the CTA with a vague brand mention.
- Do not invent a different URL.
- Use CTA language from the CTA library, or a natural variation that preserves its operational tone.
- The CTA should feel like a calm invitation, not a sales push.
- Avoid spammy, corporate, fake-urgent, or hype-driven CTA language.
- LinkedIn CTA: thoughtful and operator-minded.
- Facebook CTA: conversational and practical.
- Instagram CTA: shorter, scannable, and punchy.
- TikTok CTA: concise and direct.
- Visual prompts should not include traffic CTAs or URLs; they should stay image generation prompts.

Writing rhythm rules:
- Use natural paragraph spacing.
- Create visual breathing room between ideas.
- Break ideas into smaller readable chunks.
- Prefer short paragraphs over long structured blocks.
- Use occasional one-line emphasis paragraphs.
- Use pauses intentionally.
- Avoid dense walls of text.
- Optimize for mobile feed readability.
- Spacing is part of the storytelling.
- Rhythm matters more than perfect grammar.
- Write like a real founder/operator sharing thoughts.
- Keep the writing conversational, readable, and feed-native.
- Let the post breathe instead of compressing every idea together.
- Avoid AI motivational tone.
- Avoid corporate cadence.
- Avoid over-polished AI cadence.
- Do not add emojis everywhere.
- Do not become motivational-guru style.
- Do not become clickbait.

Visual prompt rules:
- Every platform must have its own visual_prompt.
- Each visual_prompt must be platform-aware and tailored to the caption, not a generic global visual.
- Combine two layers for each channel:
  1. Visual archetype = HOW the image looks.
  2. Concept angle = WHAT the image communicates.
- Use the selected visual archetype for visual style, framing, and realism.
- Use the selected concept angle for narrative idea, emotional direction, situational storytelling, and visual tension.
- Keep the final visual_prompt concise, practical, cinematic, and grounded; do not expose the full internal notes.
- Selected visual archetypes:
{visual_archetype_prompt}
- Selected concept angles:
{concept_angle_prompt}
- Each visual_prompt must be a complete manual image-generation brief with these exact section labels:
  Scene:
  Format:
  Reference assets to attach:
  Asset usage instructions:
  Realism rules:
  Avoid:
- Reference assets to attach must list the specific local asset files the user should upload for that image, using paths from the asset map.
- Do not force dashboard screenshots into every image.
- Allow logo-only integration, environmental branding, indirect ALPA presence, or no UI at all when conceptually stronger.
- Let asset usage follow the scene naturally.
- Use assets/logos/alpa-logo-white.png or assets/logos/alpa-logo-main.png only when a logo naturally belongs in the scene.
- Use assets/desktop-ui/alpa-dashboard-desktop-main.png when a laptop or desktop ALPA workflow appears.
- Use assets/desktop-ui/alpa-dashboard-desktop-leads.png when lead lists, results, or verified contact-ready leads are shown.
- Use assets/mobile-ui/alpa-dashboard-mobile-leads.png when a phone UI or mobile lead list appears.
- Use assets/mobile-ui/alpa-dashboard-mobile-search.png when mobile search or workflow appears.
- If no asset is needed for a specific scene, say "None required" under Reference assets to attach.
- Asset usage instructions must explain how to use the attached assets, for example: naturally composite the real ALPA screenshot into the device screen, preserve screenshot proportions, do not invent fake dashboard UI, use the logo subtly only if natural, avoid oversized branding.
- Generate more situational storytelling diversity: symbolic operational moments, environmental storytelling, real-life situations, subtle visual metaphors, and human behavioral moments.
- Strong examples include cold coffee while leads arrive, airport waiting area productivity, missed calls beside automated lead flow, old lead research notes beside a clean ALPA workflow, working while moving, or reclaiming evenings and weekends.
- Prefer believable realism over visual perfection.
- Prefer photographic realism, documentary-style realism, editorial realism, and grounded emotional storytelling.
- Use candid moments, natural lighting, believable fatigue, imperfect environments, realistic workspaces, real-world textures, authentic human posture, and authentic facial expressions.
- Keep the atmosphere subtly cinematic, not exaggerated or fantasy-driven.
- Make the scene feel like a real founder/operator environment, not a startup advertisement.
- Use the asset map as grounding memory: real ALPA screenshots and logos exist and should be referenced naturally when useful.
- Do not invent fake dashboards when real ALPA screenshot assets are available.
- Keep UI and branding subtle, believable, and operational.
- Prefer subtle UI integration over oversized logos or floating product overlays.
- Avoid generic split-screen concepts.
- Avoid fake AI SaaS aesthetics.
- Avoid randomness drift: no surrealism, fantasy aesthetics, abstract AI art, cyberpunk startup visuals, or overdesigned SaaS imagery.
- Avoid futuristic dashboards, holograms, glowing UI overlays, and startup fantasy aesthetics.
- Avoid AI-perfect humans, overdesigned typography, excessive floating text, and motivational poster energy.
- Avoid fake productivity porn.
- Avoid exaggerated cinematic effects.
- Avoid boring SaaS visuals.
- Avoid corporate stock-photo aesthetics.
- Make it suitable for high-end AI image generation.
- LinkedIn visual_prompt: Format should recommend 4:5 or landscape. Use desktop UI assets when relevant. Use documentary realism, subtle composition, authentic founder/operator feel, minimal overlays, and photographic credibility.
- Facebook visual_prompt: Format should recommend 4:5 or square. Use relatable realism and believable environments. Choose desktop or mobile assets depending on the scene.
- Instagram visual_prompt: Format should recommend 4:5 portrait. Use editorial realism, aesthetic restraint, emotionally strong but believable storytelling, and mobile or subtle desktop assets when useful.
- TikTok visual_prompt: Format should recommend 9:16 vertical. Use mobile-first composition, mobile UI assets when relevant, creator-native realism, dynamic but authentic framing, and less polished ad energy.

The content should feel:
- human
- sharp
- emotionally real
- operational

Avoid sounding like:
- generic SaaS marketing
- motivational LinkedIn influencers
- corporate AI copywriting

Raw idea:
{raw_idea}
"""

# Send request to OpenAI
response = client.chat.completions.create(
    model=model,
    response_format={"type": "json_object"},
    messages=[
        {"role": "user", "content": prompt}
    ]
)

# Extract output
output = response.choices[0].message.content

def parse_content_json(raw_output):
    try:
        parsed = json.loads(raw_output)
    except json.JSONDecodeError as error:
        raise ValueError(f"OpenAI response was not valid JSON: {error}") from error

    if not isinstance(parsed, dict):
        raise ValueError("OpenAI response JSON must be an object.")

    missing_fields = [field for field in required_fields if field not in parsed]
    if missing_fields:
        raise ValueError(f"OpenAI response JSON is missing fields: {', '.join(missing_fields)}")

    invalid_fields = [field for field in required_fields if not isinstance(parsed[field], dict)]
    if invalid_fields:
        raise ValueError(f"OpenAI response platform fields must be objects: {', '.join(invalid_fields)}")

    invalid_fields = [
        field
        for field in required_fields
        if not isinstance(parsed[field].get("caption"), str)
        or not isinstance(parsed[field].get("visual_prompt"), str)
    ]
    if invalid_fields:
        raise ValueError(f"OpenAI response platform fields must include caption and visual_prompt strings: {', '.join(invalid_fields)}")

    content = {
        field: {
            "caption": parsed[field]["caption"].strip(),
            "visual_prompt": parsed[field]["visual_prompt"].strip(),
        }
        for field in required_fields
    }
    empty_fields = [
        f"{field}.{key}"
        for field in required_fields
        for key in ["caption", "visual_prompt"]
        if not content[field][key]
    ]
    if empty_fields:
        raise ValueError(f"OpenAI response JSON fields cannot be empty: {', '.join(empty_fields)}")

    return content

# Create dated output folder
timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
output_folder = f"outputs/{timestamp}"

os.makedirs(output_folder, exist_ok=True)

try:
    content = parse_content_json(output)
except ValueError as error:
    with open(f"{output_folder}/raw-response.txt", "w") as file:
        file.write(output or "")

    failure_metadata = {
        "timestamp": timestamp,
        "original_idea": raw_idea.strip(),
        "model": model,
        "generated_channels": [],
        "visual_archetypes": visual_archetype_selection,
        "concept_angles": concept_angle_selection,
        "generation_context": build_generation_context(channel_intelligence_selection),
        "error": str(error),
    }

    with open(f"{output_folder}/meta.json", "w") as file:
        json.dump(failure_metadata, file, ensure_ascii=False, indent=2)

    print("\n=== CONTENT GENERATION FAILED ===\n")
    print(str(error))
    print(f"\nRaw response saved in: {output_folder}/raw-response.txt")
    print(f"\n=== FILES SAVED IN: {output_folder} ===")
    raise

# Save channel-specific creative packages
for channel in required_fields:
    channel_folder = f"{output_folder}/{channel}"
    os.makedirs(channel_folder, exist_ok=True)

    with open(f"{channel_folder}/caption.txt", "w") as file:
        file.write(content[channel]["caption"])

    with open(f"{channel_folder}/visual_prompt.txt", "w") as file:
        file.write(content[channel]["visual_prompt"])

# Save structured full output
with open(f"{output_folder}/content-output.txt", "w") as file:
    json.dump(content, file, ensure_ascii=False, indent=2)

metadata = {
    "timestamp": timestamp,
    "original_idea": raw_idea.strip(),
    "model": model,
    "generated_channels": required_fields,
    "visual_archetypes": visual_archetype_selection,
    "concept_angles": concept_angle_selection,
    "generation_context": build_generation_context(channel_intelligence_selection),
}

with open(f"{output_folder}/meta.json", "w") as file:
    json.dump(metadata, file, ensure_ascii=False, indent=2)

# Print output
print("\n=== CONTENT GENERATED ===\n")
print(json.dumps(content, ensure_ascii=False, indent=2))

print(f"\n=== FILES SAVED IN: {output_folder} ===")
