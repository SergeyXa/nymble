export type DictionaryValue = {
  id: string;
  value: string;
  position: number;
};

export type DictionaryEntry = {
  id: string;
  placeholder: string;
  values: DictionaryValue[];
};

export type Dictionary = {
  id: string;
  name: string;
  entries: DictionaryEntry[];
};

export type TransformDirection = "depersonalize" | "personalize";

export type Replacement = {
  sourceText: string;
  replacementText: string;
  placeholder: string;
  start: number;
  end: number;
  resultStart: number;
  resultEnd: number;
};

export type TransformResponse = {
  resultText: string;
  replacements: Replacement[];
};

export type TextAnnotation = {
  start: number;
  end: number;
  kind: "placeholder" | "replacement" | "result-placeholder" | "person" | "email" | "phone" | "organization" | "unknown";
  source: "dictionary" | "ner";
  label?: string;
  confidence?: number;
};
