import { test } from "node:test";
import assert from "node:assert/strict";
import { generateReading } from "../js/rules.js";
import { LINE_LABELS } from "../js/rules-data.js";

test("generateReading returns one section per line, in a stable order", () => {
  const reading = generateReading({}, 0.9);
  assert.equal(reading.sections.length, Object.keys(LINE_LABELS).length);
  assert.deepEqual(
    reading.sections.map((s) => s.key),
    Object.keys(LINE_LABELS)
  );
});

test("undetected line falls back to the notDetected text", () => {
  const reading = generateReading({ heart: { detected: false } }, 0.9);
  const heart = reading.sections.find((s) => s.key === "heart");
  assert.match(heart.text, /No clear heart line/);
});

test("long, unbroken line does not append the broken-line note", () => {
  const reading = generateReading(
    { head: { detected: true, lengthRatio: 0.9, segmentCount: 1 } },
    0.9
  );
  const head = reading.sections.find((s) => s.key === "head");
  assert.doesNotMatch(head.text, /Breaks along the line/);
});

test("fragmented line (segmentCount >= 5) appends the broken-line note", () => {
  const reading = generateReading(
    { life: { detected: true, lengthRatio: 0.5, segmentCount: 6 } },
    0.9
  );
  const life = reading.sections.find((s) => s.key === "life");
  assert.match(life.text, /Gaps in the arc/);
});

test("confidence note reflects detection confidence", () => {
  const high = generateReading({}, 0.9);
  const low = generateReading({}, 0.1);
  assert.notEqual(high.confidenceNote, low.confidenceNote);
});
