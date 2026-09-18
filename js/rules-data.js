// Traditional palmistry interpretation text, keyed by line + trait bin.
// This content reflects folk/traditional practice, not scientific claims.

export const LINE_LABELS = {
  heart: "Heart Line",
  head: "Head Line",
  life: "Life Line",
  fate: "Fate Line",
};

export const RULES = {
  heart: {
    notDetected:
      "No clear heart line was detected. This usually means the photo angle or lighting hid it — traditionally an indistinct heart line is read as a reserved or private emotional style.",
    short:
      "A shorter heart line is traditionally associated with focusing love and affection on a close few rather than spreading it widely.",
    medium:
      "A medium-length heart line traditionally suggests a balanced emotional style — caring but measured, neither guarded nor overly expressive.",
    long:
      "A long, well-formed heart line is traditionally read as warmth and openness in relationships, and a tendency to lead with feeling.",
    broken:
      " Multiple fragments along the line are traditionally linked to emotional ups and downs rather than one steady course.",
  },
  head: {
    notDetected:
      "No clear head line was detected in this photo. Try retaking it with the palm flatter and better lit for a fuller reading.",
    short:
      "A shorter head line is traditionally associated with quick, practical decision-making and a preference for concrete action over lengthy deliberation.",
    medium:
      "A medium-length head line traditionally suggests a balance between practical and reflective thinking.",
    long:
      "A long head line is traditionally read as a thoughtful, analytical mindset that likes to explore ideas thoroughly before acting.",
    broken:
      " Breaks along the line are traditionally associated with shifts in focus or periods of changed thinking over time.",
  },
  life: {
    notDetected:
      "No clear life line was detected. This is often a photo-angle issue — the life line curves close to the thumb and can be easy to miss.",
    short:
      "A shorter-appearing life line arc is traditionally read as focused, intense bursts of energy rather than a slow and steady pace — it is not traditionally linked to lifespan.",
    medium:
      "A medium life line arc traditionally suggests a steady, adaptable approach to health and daily energy.",
    long:
      "A long, deep life line arc is traditionally associated with vitality and resilience.",
    broken:
      " Gaps in the arc are traditionally linked to major life changes or transitions rather than any negative event.",
  },
  fate: {
    notDetected:
      "No clear fate line was detected — many people don't have a strong one, which traditionally suggests a less fixed, more self-directed path rather than following one set course.",
    short:
      "A shorter fate line is traditionally read as a path shaped more by personal choice early on than by a single steady career or direction.",
    medium:
      "A medium fate line traditionally suggests a generally steady direction with room for change.",
    long:
      "A long, unbroken fate line is traditionally associated with a strong sense of direction and consistent purpose.",
    broken:
      " Interruptions along the line are traditionally read as notable changes in direction or circumstance.",
  },
};

export const INTRO =
  "Here is a traditional palmistry-style reading based on the lines detected in your photo. " +
  "Remember: this reflects folk tradition, not scientific or medical analysis.";

export const CONFIDENCE_NOTE = {
  high: "Detection confidence was good for this photo.",
  medium: "Detection confidence was moderate — some lines may have been partially missed.",
  low: "Detection confidence was low for this photo — consider retaking it for a fuller reading.",
};
