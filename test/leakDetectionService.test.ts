import assert from "node:assert/strict";
import test from "node:test";
import type { LeakDetectionConfig } from "../src/server/config.js";
import { LeakDetectionService, resolveOverlappingFindings } from "../src/server/services/leakDetectionService.js";
import type { LeakDetector } from "../src/server/services/presidioClient.js";
import type { LeakFinding } from "../src/server/types.js";

test("overlap resolution keeps the higher-confidence email and ignores placeholders", () => {
  const text = "{CEO} john@example.com";
  const findings = [
    finding("PERSON", 1, 4, 0.99, text),
    finding("URL", 11, 22, 0.5, text),
    finding("EMAIL_ADDRESS", 6, 22, 1, text)
  ];

  assert.deepEqual(resolveOverlappingFindings(findings, text), [
    finding("EMAIL_ADDRESS", 6, 22, 1, text)
  ]);
});

test("service uses a supported selected language", async () => {
  let receivedLanguage = "";
  const detector: LeakDetector = {
    async analyze(_text, language) {
      receivedLanguage = language;
      return [];
    }
  };
  const service = new LeakDetectionService(config(), detector);

  const result = await service.analyze("No leaks", "fr");

  assert.equal(receivedLanguage, "fr");
  assert.equal(result.status, "completed");
});

test("service falls back to the default language for unsupported values", async () => {
  let receivedLanguage = "";
  const detector: LeakDetector = {
    async analyze(_text, language) {
      receivedLanguage = language;
      return [];
    }
  };
  const service = new LeakDetectionService(config(), detector);

  await service.analyze("No leaks", "de");

  assert.equal(receivedLanguage, "en");
});

test("service returns an unavailable warning when detector fails", async () => {
  let errorCount = 0;
  const detector: LeakDetector = {
    async analyze() {
      throw new Error("connection refused");
    }
  };
  const service = new LeakDetectionService(config(), detector, () => {
    errorCount += 1;
  });

  const result = await service.analyze("john@example.com", "en");

  assert.deepEqual(result, {
    findings: [],
    warnings: ["Leak detection unavailable."],
    status: "unavailable"
  });
  assert.equal(errorCount, 1);
});

test("disabled service does not call its detector", async () => {
  let calls = 0;
  const detector: LeakDetector = {
    async analyze() {
      calls += 1;
      return [];
    }
  };
  const service = new LeakDetectionService({ ...config(), enabled: false }, detector);

  const result = await service.analyze("john@example.com", "en");

  assert.equal(calls, 0);
  assert.equal(result.status, "disabled");
});

test("off language selection does not call its detector", async () => {
  let calls = 0;
  const detector: LeakDetector = {
    async analyze() {
      calls += 1;
      return [];
    }
  };
  const service = new LeakDetectionService(config(), detector);

  const result = await service.analyze("john@example.com", "off");

  assert.equal(calls, 0);
  assert.deepEqual(result, { findings: [], warnings: [], status: "disabled" });
});

function config(): LeakDetectionConfig {
  return {
    enabled: true,
    provider: "presidio",
    presidioAnalyzerUrl: "http://127.0.0.1:5002",
    defaultLanguage: "en",
    supportedLanguages: ["en", "fr"],
    scoreThreshold: 0.5
  };
}

function finding(
  type: string,
  start: number,
  end: number,
  score: number,
  text: string
): LeakFinding {
  return {
    type,
    start,
    end,
    score,
    text: text.slice(start, end),
    source: "presidio"
  };
}
