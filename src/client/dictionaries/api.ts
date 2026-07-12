import type { DictionariesResponse, EditableDictionary } from "./types";

export async function fetchDictionaries(): Promise<DictionariesResponse> {
  const response = await fetch("/api/dictionaries");
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Load failed");
  }

  return payload;
}

export async function saveDictionaries(dictionaries: EditableDictionary[]): Promise<DictionariesResponse> {
  const response = await fetch("/api/dictionaries", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dictionaries: dictionaries.map((dictionary) => ({
        id: dictionary.id,
        name: dictionary.name.trim(),
        entries: dictionary.entries.map((entry) => ({
          id: entry.id,
          placeholder: entry.placeholder,
          values: entry.values
            .split(/\r?\n/)
            .map((value) => value.trim())
            .filter(Boolean)
        }))
      }))
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Save failed");
  }

  return payload;
}
