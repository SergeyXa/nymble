import type { Replacement, TextAnnotation } from "./types";

export function sourceAnnotations(replacements: Replacement[]): TextAnnotation[] {
  return replacements.map((replacement) => ({
    start: replacement.start,
    end: replacement.end,
    kind: "placeholder",
    source: "dictionary",
    label: replacement.placeholder
  }));
}

export function resultAnnotations(replacements: Replacement[], resultText: string): TextAnnotation[] {
  const placeholderAnnotations = resultPlaceholderAnnotations(resultText);
  const replacementAnnotations = replacements.map((replacement) => ({
    start: replacement.resultStart,
    end: replacement.resultEnd,
    kind: "replacement" as const,
    source: "dictionary",
    label: replacement.placeholder
  })).filter((replacement) => !placeholderAnnotations.some((placeholder) => placeholder.start < replacement.end && replacement.start < placeholder.end));

  return [...replacementAnnotations, ...placeholderAnnotations].sort((a, b) => a.start - b.start);
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
