import { test } from "node:test";
import assert from "node:assert/strict";
import { validateFile, CONSTRAINTS } from "../js/upload.js";

test("accepts a valid jpeg under the size limit", () => {
  const result = validateFile({ type: "image/jpeg", size: 1024 * 1024 });
  assert.equal(result.ok, true);
});

test("rejects an unsupported file type", () => {
  const result = validateFile({ type: "application/pdf", size: 1024 });
  assert.equal(result.ok, false);
  assert.match(result.message, /Unsupported file type/);
});

test("rejects a file over the max size", () => {
  const result = validateFile({ type: "image/png", size: CONSTRAINTS.maxBytes + 1 });
  assert.equal(result.ok, false);
  assert.match(result.message, /too large/);
});
