import type { DictionaryEntry, Replacement, TransformResponse } from "./types.js";

type Candidate = {
  value: string;
  placeholder: string;
};

export function depersonalize(text: string, entries: DictionaryEntry[]): TransformResponse {
  const candidates = entries
    .flatMap((entry) => entry.values.map((value) => ({ value: value.value, placeholder: entry.placeholder })))
    .filter((candidate) => candidate.value.length > 0)
    .sort((a, b) => b.value.length - a.value.length);

  const replacements: Replacement[] = [];
  let resultText = "";
  let cursor = 0;

  while (cursor < text.length) {
    if (text[cursor] === "{") {
      const end = text.indexOf("}", cursor + 1);
      if (end !== -1) {
        resultText += text.slice(cursor, end + 1);
        cursor = end + 1;
        continue;
      }
    }

    const match = findCandidateAt(text, cursor, candidates);
    if (match) {
      const sourceText = text.slice(cursor, cursor + match.value.length);
      const resultStart = resultText.length;
      replacements.push({
        sourceText,
        replacementText: match.placeholder,
        placeholder: match.placeholder,
        start: cursor,
        end: cursor + match.value.length,
        resultStart,
        resultEnd: resultStart + match.placeholder.length
      });
      resultText += match.placeholder;
      cursor += match.value.length;
    } else {
      resultText += text[cursor];
      cursor += 1;
    }
  }

  return { resultText, replacements };
}

export function personalize(text: string, entries: DictionaryEntry[]): TransformResponse {
  const primaryValues = new Map(
    entries
      .filter((entry) => entry.values[0]?.value)
      .map((entry) => [entry.placeholder.toLocaleLowerCase(), entry] as const)
  );

  const replacements: Replacement[] = [];
  let resultText = "";
  let cursor = 0;

  for (const match of text.matchAll(/\{[^{}\r\n]+\}/g)) {
    const placeholder = match[0];
    const offset = match.index;
    resultText += text.slice(cursor, offset);
    const entry = primaryValues.get(placeholder.toLocaleLowerCase());
    if (!entry) {
      resultText += placeholder;
      cursor = offset + placeholder.length;
      continue;
    }

    const replacementText = entry.values[0].value;
    const resultStart = resultText.length;
    replacements.push({
      sourceText: placeholder,
      replacementText,
      placeholder: entry.placeholder,
      start: offset,
      end: offset + placeholder.length,
      resultStart,
      resultEnd: resultStart + replacementText.length
    });
    resultText += replacementText;
    cursor = offset + placeholder.length;
  }

  resultText += text.slice(cursor);

  return { resultText, replacements };
}

function findCandidateAt(text: string, start: number, candidates: Candidate[]): Candidate | undefined {
  for (const candidate of candidates) {
    if (text.startsWith(candidate.value, start) && hasWholeWordBoundaries(text, start, candidate.value.length)) {
      return candidate;
    }
  }

  return undefined;
}

function hasWholeWordBoundaries(text: string, start: number, length: number): boolean {
  return !isWordChar(text[start - 1]) && !isWordChar(text[start + length]);
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}_]/u.test(char);
}
