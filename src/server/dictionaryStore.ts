import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type {
  Dictionary,
  DictionaryEntry,
  DictionaryResponse,
  SaveDictionary,
  SaveDictionaryEntry
} from "./types.js";

type StoredDictionaries = {
  dictionaries?: Dictionary[];
  entries?: DictionaryEntry[];
};

type NormalizedSaveDictionary = {
  id?: string;
  name: string;
  entries: NormalizedSaveEntry[];
};

type NormalizedSaveEntry = {
  id?: string;
  placeholder: string;
  values: string[];
};

export class DictionaryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DictionaryValidationError";
  }
}

export class JsonDictionaryStore {
  constructor(private readonly filePath: string) {}

  async getDictionary(): Promise<DictionaryResponse> {
    await this.ensureFile();
    const raw = await readFile(this.filePath, "utf8");
    const parsed = JSON.parse(raw) as StoredDictionaries;
    return { dictionaries: normalizeStoredDictionaries(parsed) };
  }

  async saveDictionary(dictionaries: SaveDictionary[]): Promise<DictionaryResponse> {
    const normalized = normalizeSaveDictionaries(dictionaries);
    const next: DictionaryResponse = {
      dictionaries: normalized.map((dictionary, index) => ({
        id: dictionary.id || stableId(`dictionary:${dictionary.name}:${index}`),
        name: dictionary.name,
        entries: dictionary.entries.map((entry) => ({
          id: entry.id || stableId(`${dictionary.name}:${entry.placeholder}`),
          placeholder: entry.placeholder,
          values: entry.values.map((value, position) => ({
            id: stableId(`${dictionary.name}:${entry.placeholder}:${position}:${value}`),
            value,
            position
          }))
        }))
      }))
    };

    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    await rename(tempPath, this.filePath);
    return next;
  }

  private async ensureFile(): Promise<void> {
    try {
      await readFile(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }

      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(
        this.filePath,
        JSON.stringify({ dictionaries: [{ id: stableId("dictionary:Default:0"), name: "Default", entries: [] }] }, null, 2) +
          "\n",
        "utf8"
      );
    }
  }
}

function normalizeSaveDictionaries(dictionaries: SaveDictionary[]): NormalizedSaveDictionary[] {
  const seen = new Set<string>();
  const result: NormalizedSaveDictionary[] = [];

  for (const [index, dictionary] of dictionaries.entries()) {
    const name = (dictionary.name || "").trim() || `Dictionary ${index + 1}`;
    const nameKey = name.toLocaleLowerCase();
    if (seen.has(nameKey)) {
      throw new DictionaryValidationError(`Duplicate dictionary name: ${name}`);
    }
    seen.add(nameKey);

    result.push({
      id: dictionary.id,
      name,
      entries: normalizeSaveEntries(dictionary.entries || [], name)
    });
  }

  if (!result.length) {
    result.push({ name: "Default", entries: [] });
  }

  return result;
}

function normalizeSaveEntries(entries: SaveDictionaryEntry[], dictionaryName: string): NormalizedSaveEntry[] {
  const seen = new Set<string>();
  const result: NormalizedSaveEntry[] = [];

  for (const entry of entries) {
    const placeholder = (entry.placeholder || "").trim();
    if (!placeholder) {
      continue;
    }
    validatePlaceholder(placeholder);

    const key = placeholder.toLocaleLowerCase();
    if (seen.has(key)) {
      throw new DictionaryValidationError(`Duplicate placeholder in ${dictionaryName}: ${placeholder}`);
    }
    seen.add(key);

    const values = dedupeValues((entry.values || []).map(readSaveValue).filter(Boolean));
    result.push({ id: entry.id, placeholder, values });
  }

  return sortEntries(result);
}

function sortEntries(entries: NormalizedSaveEntry[]): NormalizedSaveEntry[] {
  return [...entries].sort((left, right) => left.placeholder.localeCompare(right.placeholder));
}

function normalizeStoredDictionaries(stored: StoredDictionaries): Dictionary[] {
  const dictionaries = stored.dictionaries?.length
    ? stored.dictionaries
    : [{ id: stableId("dictionary:Default:0"), name: "Default", entries: stored.entries || [] }];

  return dictionaries.map((dictionary, index) => {
    const name = (dictionary.name || "").trim() || `Dictionary ${index + 1}`;
    return {
      id: dictionary.id || stableId(`dictionary:${name}:${index}`),
      name,
      entries: normalizeStoredEntries(dictionary.entries || [], name)
    };
  });
}

function normalizeStoredEntries(entries: DictionaryEntry[], dictionaryName: string): DictionaryEntry[] {
  return entries
    .map((entry) => ({
      id: entry.id || stableId(`${dictionaryName}:${entry.placeholder}`),
      placeholder: entry.placeholder,
      values: [...(entry.values || [])]
        .sort((a, b) => a.position - b.position)
        .map((value, position) => ({
          id: value.id || stableId(`${dictionaryName}:${entry.placeholder}:${position}:${value.value}`),
          value: value.value,
          position
        }))
    }))
    .sort((left, right) => left.placeholder.localeCompare(right.placeholder));
}

function readSaveValue(value: string | { value: string }): string {
  return (typeof value === "string" ? value : value.value || "").trim();
}

function validatePlaceholder(placeholder: string): void {
  if (!placeholder.startsWith("{") || !placeholder.endsWith("}")) {
    throw new DictionaryValidationError(`Placeholder must be wrapped in braces: ${placeholder}`);
  }
  const inner = placeholder.slice(1, -1);
  if (!inner.trim()) {
    throw new DictionaryValidationError("Placeholder cannot be empty");
  }
  if (inner.includes("{") || inner.includes("}") || /[\r\n]/.test(inner)) {
    throw new DictionaryValidationError(`Invalid placeholder: ${placeholder}`);
  }
}

function dedupeValues(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = value.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }

  return result;
}

function stableId(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}
