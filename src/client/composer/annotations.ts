import type { LeakFinding, Replacement, TextAnnotation, TransformDirection } from "./types";

export function sourceAnnotations(replacements: Replacement[]): TextAnnotation[] {
  return replacements.map((replacement) => ({
    start: replacement.start,
    end: replacement.end,
    kind: "placeholder",
    source: "dictionary",
    label: replacement.placeholder
  }));
}

export function resultAnnotations(
  replacements: Replacement[],
  resultText: string,
  direction: TransformDirection,
  leakFindings: LeakFinding[]
): TextAnnotation[] {
  if (direction === "depersonalize") {
    return [
      ...replacementAnnotations(replacements),
      ...leakAnnotations(leakFindings)
    ].sort((a, b) => a.start - b.start);
  }

  const placeholderAnnotations = resultPlaceholderAnnotations(resultText);
  const transformedAnnotations = replacementAnnotations(replacements)
    .filter((replacement) => !placeholderAnnotations.some((placeholder) => (
      placeholder.start < replacement.end && replacement.start < placeholder.end
    )));

  return [...transformedAnnotations, ...placeholderAnnotations].sort((a, b) => a.start - b.start);
}

function replacementAnnotations(replacements: Replacement[]): TextAnnotation[] {
  return replacements.map((replacement) => ({
    start: replacement.resultStart,
    end: replacement.resultEnd,
    kind: "replacement",
    source: "dictionary",
    label: replacement.placeholder
  }));
}

function leakAnnotations(findings: LeakFinding[]): TextAnnotation[] {
  return findings.map((finding) => ({
    start: finding.start,
    end: finding.end,
    kind: "leak",
    source: "leak-detection",
    label: `Possible leak: ${finding.type} (${Math.round(finding.score * 100)}%)`,
    confidence: finding.score
  }));
}

function resultPlaceholderAnnotations(text: string): TextAnnotation[] {
  const annotations: TextAnnotation[] = [];

  for (const match of text.matchAll(/\{.+?\}/g)) {
    const start = match.index;
    annotations.push({
      start,
      end: start + match[0].length,
      kind: "result-placeholder",
      source: "dictionary"
    });
  }

  return annotations;
}
