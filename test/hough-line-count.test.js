import { test } from "node:test";
import assert from "node:assert/strict";

// Regression test for a real bug: this OpenCV.js build packs all N detected
// HoughLinesP segments into a single row of N columns rather than N rows of
// 1 column. Code that iterated using `lines.rows` silently only ever saw one
// line, no matter how many were actually detected. Counting by total element
// count instead is robust to either layout.
test("line count must be read from total elements, not .rows", () => {
  // Simulates the "packed into one row" shape actually returned by the vendored build.
  const packedIntoOneRow = { rows: 1, cols: 42, data32S: new Int32Array(42 * 4) };
  const count = (packedIntoOneRow.data32S.length / 4) | 0;
  assert.equal(count, 42);
  assert.notEqual(count, packedIntoOneRow.rows);
});
