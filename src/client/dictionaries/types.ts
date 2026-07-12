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

export type DictionariesResponse = {
  dictionaries: Dictionary[];
};

export type EditableEntry = {
  id?: string;
  localId: string;
  placeholder: string;
  values: string;
};

export type EditableDictionary = {
  id?: string;
  localId: string;
  name: string;
  entries: EditableEntry[];
};
