import type { LeakFinding } from "../types.js";

type PresidioFinding = {
  entity_type: string;
  start: number;
  end: number;
  score: number;
  analysis_explanation?: unknown;
};

export type LeakDetector = {
  analyze(text: string, language: string): Promise<LeakFinding[]>;
};

type Fetch = typeof globalThis.fetch;

export class PresidioClient implements LeakDetector {
  constructor(
    private readonly analyzerUrl: string,
    private readonly scoreThreshold: number,
    private readonly fetchImplementation: Fetch = globalThis.fetch
  ) {}

  async analyze(text: string, language: string): Promise<LeakFinding[]> {
    const response = await this.fetchImplementation(`${this.analyzerUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
      signal: AbortSignal.timeout(5_000)
    });

    if (!response.ok) {
      throw new Error(`Presidio analyzer returned HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("Presidio analyzer returned an invalid response");
    }

    const codePointOffsets = buildCodePointOffsets(text);
    const findings: LeakFinding[] = [];

    for (const item of payload) {
      if (!isPresidioFinding(item) || item.score < this.scoreThreshold) {
        continue;
      }

      const start = codePointOffsets[item.start];
      const end = codePointOffsets[item.end];
      if (start === undefined || end === undefined || end <= start) {
        continue;
      }

      findings.push({
        type: item.entity_type,
        text: text.slice(start, end),
        start,
        end,
        score: item.score,
        source: "presidio"
      });
    }

    return findings;
  }
}

function isPresidioFinding(value: unknown): value is PresidioFinding {
  if (!value || typeof value !== "object") {
    return false;
  }

  const finding = value as Partial<PresidioFinding>;
  return typeof finding.entity_type === "string"
    && Number.isInteger(finding.start)
    && Number.isInteger(finding.end)
    && typeof finding.start === "number"
    && typeof finding.end === "number"
    && finding.start >= 0
    && finding.end > finding.start
    && typeof finding.score === "number"
    && Number.isFinite(finding.score);
}

function buildCodePointOffsets(text: string): number[] {
  const offsets = [0];
  let utf16Offset = 0;

  for (const codePoint of text) {
    utf16Offset += codePoint.length;
    offsets.push(utf16Offset);
  }

  return offsets;
}
