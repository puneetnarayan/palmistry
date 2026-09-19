import { RULES, SHAPE_RULES, SUMMARY_RULES, LINE_LABELS, INTRO, CONFIDENCE_NOTE } from "./rules-data.js";

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

function summarize(bins) {
  if (bins.length < 2) return SUMMARY_RULES.insufficient;
  const longCount = bins.filter((b) => b === "long").length;
  const shortCount = bins.filter((b) => b === "short").length;
  if (longCount >= bins.length - 1 && longCount > shortCount) return SUMMARY_RULES.mostlyLong;
  if (shortCount >= bins.length - 1 && shortCount > longCount) return SUMMARY_RULES.mostlyShort;
  return SUMMARY_RULES.mixed;
}

export function generateReading(features, confidence) {
  const sections = [];
  const detectedBins = [];

  for (const key of Object.keys(LINE_LABELS)) {
    const f = features[key];
    const rule = RULES[key];
    let text;

    if (!f || !f.detected) {
      text = rule.notDetected;
    } else {
      const bin = lengthBin(f.lengthRatio);
      detectedBins.push(bin);
      text = rule[bin];
      if (f.shape) {
        text += SHAPE_RULES[key][f.shape];
      }
      if (f.segmentCount >= 5) {
        text += rule.broken;
      }
    }

    sections.push({ key, label: LINE_LABELS[key], text });
  }

  return {
    intro: INTRO,
    confidenceNote: CONFIDENCE_NOTE[confidenceBin(confidence)],
    sections,
    summary: summarize(detectedBins),
  };
}
