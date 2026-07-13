import assert from "node:assert/strict";
import test from "node:test";
import { PresidioClient } from "../src/server/services/presidioClient.js";

test("Presidio client sends final text and explicit language, filters scores, and maps Unicode offsets", async () => {
  const text = "🙂 john@example.com";
  let requestUrl = "";
  let requestBody = "";
  const fetchMock: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = String(init?.body);
    return new Response(JSON.stringify([
      { entity_type: "EMAIL_ADDRESS", start: 2, end: 18, score: 1 },
      { entity_type: "URL", start: 7, end: 18, score: 0.49 }
    ]), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
  const client = new PresidioClient("http://presidio-analyzer:3000", 0.5, fetchMock);

  const findings = await client.analyze(text, "en");

  assert.equal(requestUrl, "http://presidio-analyzer:3000/analyze");
  assert.deepEqual(JSON.parse(requestBody), { text, language: "en" });
  assert.deepEqual(findings, [{
    type: "EMAIL_ADDRESS",
    text: "john@example.com",
    start: 3,
    end: 19,
    score: 1,
    source: "presidio"
  }]);
});

test("Presidio client rejects non-array responses without including response content", async () => {
  const fetchMock: typeof fetch = async () => new Response(JSON.stringify({ detail: "bad request" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
  const client = new PresidioClient("http://127.0.0.1:5002", 0.5, fetchMock);

  await assert.rejects(client.analyze("sensitive text", "en"), /invalid response/);
});
