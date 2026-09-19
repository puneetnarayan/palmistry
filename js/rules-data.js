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
      "A shorter heart line is traditionally associated with focusing love and affection on a close few rather than spreading it widely. It's read as someone who shows care through consistency rather than grand gestures.",
    medium:
      "A medium-length heart line traditionally suggests a balanced emotional style — caring but measured, neither guarded nor overly expressive. You weigh your feelings before acting on them.",
    long:
      "A long, well-formed heart line is traditionally read as warmth and openness in relationships, and a tendency to lead with feeling. It's associated with generosity and wearing your emotions visibly.",
    broken:
      " Multiple fragments along the line are traditionally linked to emotional ups and downs rather than one steady course — a history of recalibrating what matters to you in relationships.",
  },
  head: {
    notDetected:
      "No clear head line was detected in this photo. Try retaking it with the palm flatter and better lit for a fuller reading.",
    short:
      "A shorter head line is traditionally associated with quick, practical decision-making and a preference for concrete action over lengthy deliberation. You trust instinct over overthinking.",
    medium:
      "A medium-length head line traditionally suggests a balance between practical and reflective thinking — able to plan carefully but not paralyzed by it.",
    long:
      "A long head line is traditionally read as a thoughtful, analytical mindset that likes to explore ideas thoroughly before acting. It's associated with curiosity and a preference for depth over speed.",
    broken:
      " Breaks along the line are traditionally associated with shifts in focus or periods of changed thinking over time — evidence of a mind that has reinvented its approach more than once.",
  },
  life: {
    notDetected:
      "No clear life line was detected. This is often a photo-angle issue — the life line curves close to the thumb and can be easy to miss.",
    short:
      "A shorter-appearing life line arc is traditionally read as focused, intense bursts of energy rather than a slow and steady pace — it is not traditionally linked to lifespan, despite the name. Energy comes in concentrated waves rather than a constant hum.",
    medium:
      "A medium life line arc traditionally suggests a steady, adaptable approach to health and daily energy — consistent stamina rather than dramatic highs and lows.",
    long:
      "A long, deep life line arc is traditionally associated with vitality and resilience, and a strong connection to physical wellbeing.",
    broken:
      " Gaps in the arc are traditionally linked to major life changes or transitions rather than any negative event — chapters that end cleanly before the next one begins.",
  },
  fate: {
    notDetected:
      "No clear fate line was detected — many people don't have a strong one, which traditionally suggests a less fixed, more self-directed path rather than following one set course.",
    short:
      "A shorter fate line is traditionally read as a path shaped more by personal choice early on than by a single steady career or direction. Circumstance mattered less than deliberate choices.",
    medium:
      "A medium fate line traditionally suggests a generally steady direction with room for change — purposeful, but not rigid about the route.",
    long:
      "A long, unbroken fate line is traditionally associated with a strong sense of direction and consistent purpose, often read as someone who commits early and follows through.",
    broken:
      " Interruptions along the line are traditionally read as notable changes in direction or circumstance — deliberate pivots rather than a single unbroken path.",
  },
};

// Derived from the angular spread of the segments matched to a line: a tight
// spread reads as a straighter line, a wide spread as a more curved one.
export const SHAPE_RULES = {
  heart: {
    straight:
      " Its relatively straight path is traditionally read as directness in how you express affection — you tend to say what you feel plainly.",
    curved:
      " Its curved path is traditionally read as a more expressive, demonstrative emotional style — feelings that show visibly rather than staying private.",
  },
  head: {
    straight:
      " A straighter path is traditionally associated with linear, logical thinking that favors clear, realistic conclusions.",
    curved:
      " A curved path is traditionally associated with imaginative, associative thinking that connects ideas in less obvious ways.",
  },
  life: {
    straight:
      " A straighter arc close to the thumb is traditionally read as caution and a preference for the familiar.",
    curved:
      " A wider, more curved arc is traditionally read as an outgoing nature and openness to new experience.",
  },
  fate: {
    straight:
      " Its straight course is traditionally read as a direction chosen early and rarely questioned.",
    curved:
      " Its curving course is traditionally read as a direction that has adjusted in response to circumstance rather than staying fixed.",
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

// Holistic closing paragraph, chosen by how many lines leaned "long" vs
// "short" overall. Purely a synthesis of the per-line bins already shown —
// no new detection signal, just a readable summary of the pattern.
export const SUMMARY_RULES = {
  mostlyLong:
    "Taken together, the lines detected lean toward length and continuity across the board — traditionally read as a palm belonging to someone deliberate and steady, who commits fully once a direction is chosen.",
  mostlyShort:
    "Taken together, the lines detected lean shorter and more concentrated — traditionally read as a palm belonging to someone who operates in focused bursts rather than one long steady line, adapting quickly as things change.",
  mixed:
    "Taken together, the lines detected show a mix of lengths rather than one dominant pattern — traditionally read as a balance between steadiness and adaptability, drawing on different strengths depending on the situation.",
  insufficient:
    "Too few lines were detected to draw a holistic pattern this time — try retaking the photo following the tips above for a fuller overall reading.",
};
