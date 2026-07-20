import type { LeakDetectionConfig } from "../config.js";
import type { LeakDetectionStatus, LeakFinding } from "../types.js";
import { PresidioClient, type LeakDetector } from "./presidioClient.js";

export type LeakDetectionResult = {
  findings: LeakFinding[];
  warnings: string[];
  status: LeakDetectionStatus;
};

export type LeakDetectionErrorHandler = (error: unknown) => void;

export class LeakDetectionService {
  constructor(
    private readonly config: LeakDetectionConfig,
    private readonly detector: LeakDetector | undefined,
    private readonly onError: LeakDetectionErrorHandler = () => undefined
  ) {}

  async analyze(text: string, requestedLanguage?: string): Promise<LeakDetectionResult> {
    if (!this.config.enabled) {
      return { findings: [], warnings: [], status: "disabled" };
    }

    if (requestedLanguage === "off") {
      return { findings: [], warnings: [], status: "disabled" };
    }

    if (!this.detector) {
      this.onError(new Error(`Unsupported leak detection provider: ${this.config.provider}`));
      return unavailableResult();
    }

    if (!text) {
      return { findings: [], warnings: [], status: "completed" };
    }

    const language = this.config.supportedLanguages.includes(requestedLanguage || "")
      ? requestedLanguage as string
      : this.config.defaultLanguage;

    try {
      const findings = await this.detector.analyze(text, language);
      return {
        findings: resolveOverlappingFindings(findings, text),
        warnings: [],
        status: "completed"
      };
    } catch (error) {
      this.onError(error);
      return unavailableResult();
    }
  }
}

export function createLeakDetectionService(
  config: LeakDetectionConfig,
  onError?: LeakDetectionErrorHandler
): LeakDetectionService {
  const detector = config.provider === "presidio"
    ? new PresidioClient(config.presidioAnalyzerUrl, config.scoreThreshold, globalThis.fetch, config.ignoredEntities)
    : undefined;

  return new LeakDetectionService(config, detector, onError);
}

export function resolveOverlappingFindings(findings: LeakFinding[], text: string): LeakFinding[] {
  const placeholderSpans = [...text.matchAll(/\{[^{}\r\n]+\}/g)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length
  }));

  const prioritized = findings
    .filter((finding) => isValidFinding(finding, text.length))
    .filter((finding) => !placeholderSpans.some((span) => overlaps(finding, span)))
    .sort((a, b) => b.score - a.score
      || (b.end - b.start) - (a.end - a.start)
      || entityPriority(b.type) - entityPriority(a.type)
      || a.start - b.start);
  const accepted: LeakFinding[] = [];

  for (const finding of prioritized) {
    if (!accepted.some((existing) => overlaps(finding, existing))) {
      accepted.push(finding);
    }
  }

  return accepted.sort((a, b) => a.start - b.start || a.end - b.end);
}

function unavailableResult(): LeakDetectionResult {
  return {
    findings: [],
    warnings: ["Leak detection unavailable."],
    status: "unavailable"
  };
}

function isValidFinding(finding: LeakFinding, textLength: number): boolean {
  return Number.isInteger(finding.start)
    && Number.isInteger(finding.end)
    && finding.start >= 0
    && finding.end > finding.start
    && finding.end <= textLength;
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

function entityPriority(type: string): number {
  switch (type) {
    case "EMAIL_ADDRESS":
    case "PHONE_NUMBER":
    case "CREDIT_CARD":
    case "IBAN_CODE":
      return 2;
    case "URL":
      return 1;
    default:
      return 0;
  }
}
