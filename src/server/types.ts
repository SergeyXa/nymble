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

export type SaveDictionaryEntry = {
  id?: string;
  placeholder: string;
  values: Array<string | { value: string }>;
};

export type SaveDictionary = {
  id?: string;
  name: string;
  entries: SaveDictionaryEntry[];
};

export type DictionaryResponse = {
  dictionaries: Dictionary[];
};

export type TransformDirection = "depersonalize" | "personalize";

export type Replacement = {
  sourceText: string;
  replacementText: string;
  placeholder: string;
  start: number;
  end: number;
};

export type TransformResponse = {
  resultText: string;
  replacements: Replacement[];
  warnings: string[];
  unresolvedPlaceholders: string[];
};
