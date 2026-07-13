import assert from "node:assert/strict";
import test from "node:test";
import { resultAnnotations } from "../src/client/composer/annotations.js";
import type { LeakFinding, Replacement } from "../src/client/composer/types.js";

const replacement: Replacement = {
  sourceText: "TT",
  replacementText: "{T company}",
  placeholder: "{T company}",
  start: 0,
  end: 2,
  resultStart: 0,
  resultEnd: 11
};

test("depersonalized results highlight detector findings as leaks, not placeholders", () => {
  const text = "{T company} john@example.com";
  const leak: LeakFinding = {
    type: "EMAIL_ADDRESS",
    text: "john@example.com",
    start: 12,
    end: 28,
    score: 1,
    source: "presidio"
  };

  const annotations = resultAnnotations([replacement], text, "depersonalize", [leak]);

  assert.deepEqual(annotations.map(({ kind, start, end }) => ({ kind, start, end })), [
    { kind: "replacement", start: 0, end: 11 },
    { kind: "leak", start: 12, end: 28 }
  ]);
});

test("personalized results retain unresolved-placeholder highlighting", () => {
  const annotations = resultAnnotations([], "Ask {CEO}", "personalize", []);

  assert.deepEqual(annotations.map(({ kind, start, end }) => ({ kind, start, end })), [
    { kind: "result-placeholder", start: 4, end: 9 }
  ]);
});
