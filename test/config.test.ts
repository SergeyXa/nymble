import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/server/config.js";

test("leak detection configuration is read from environment variables", () => {
  const original = { ...process.env };

  try {
    process.env.LEAK_DETECTION_ENABLED = "true";
    process.env.LEAK_DETECTION_PROVIDER = "presidio";
    process.env.PRESIDIO_ANALYZER_URL = "http://presidio-analyzer:3000/";
    process.env.PRESIDIO_DEFAULT_LANGUAGE = "fr";
    process.env.PRESIDIO_SUPPORTED_LANGUAGES = "en,fr";
    process.env.PRESIDIO_SCORE_THRESHOLD = "0.7";

    assert.deepEqual(loadConfig().leakDetection, {
      enabled: true,
      provider: "presidio",
      presidioAnalyzerUrl: "http://presidio-analyzer:3000",
      defaultLanguage: "fr",
      supportedLanguages: ["fr", "en"],
      scoreThreshold: 0.7
    });
  } finally {
    process.env = original;
  }
});

test("disabled provider prevents detector calls even if enabled flag is true", () => {
  const original = { ...process.env };

  try {
    process.env.LEAK_DETECTION_ENABLED = "true";
    process.env.LEAK_DETECTION_PROVIDER = "disabled";
    assert.equal(loadConfig().leakDetection.enabled, false);
  } finally {
    process.env = original;
  }
});
