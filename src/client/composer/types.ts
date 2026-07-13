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
  leakFindings: LeakFinding[];
  warnings: string[];
  leakDetectionStatus: LeakDetectionStatus;
};

export type LeakFinding = {
  type: string;
  text: string;
  start: number;
  end: number;
  score: number;
  source: "presidio";
};

export type LeakDetectionStatus = "disabled" | "not-run" | "completed" | "unavailable";

export type AppConfig = {
  leakDetection: {
    enabled: boolean;
    provider: string;
    defaultLanguage: string;
    supportedLanguages: string[];
  };
};

export type TextAnnotation = {
  start: number;
  end: number;
  kind: "placeholder" | "replacement" | "result-placeholder" | "leak" | "person" | "email" | "phone" | "organization" | "unknown";
  source: "dictionary" | "ner" | "leak-detection";
  label?: string;
  confidence?: number;
};
