import { RULES, LINE_LABELS, INTRO, CONFIDENCE_NOTE } from "./rules-data.js";

function lengthBin(lengthRatio) {
  if (lengthRatio < 0.35) return "short";
  if (lengthRatio < 0.7) return "medium";
  return "long";
}

function confidenceBin(confidence) {
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.4) return "medium";
  return "low";
}

export function generateReading(features, confidence) {
  const sections = [];

  for (const key of Object.keys(LINE_LABELS)) {
    const f = features[key];
    const rule = RULES[key];
    let text;

    if (!f || !f.detected) {
      text = rule.notDetected;
    } else {
      text = rule[lengthBin(f.lengthRatio)];
      if (f.segmentCount >= 3) {
        text += rule.broken;
      }
    }

    sections.push({ key, label: LINE_LABELS[key], text });
  }

  return {
    intro: INTRO,
    confidenceNote: CONFIDENCE_NOTE[confidenceBin(confidence)],
    sections,
  };
}
