import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { JsonDictionaryStore } from "../src/server/dictionaryStore.js";

test("keeps dictionary values that differ only by case", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "nymble-dictionary-store-"));
  const store = new JsonDictionaryStore(path.join(directory, "dictionaries.json"));

  try {
    const saved = await store.saveDictionary([
      {
        name: "Test",
        entries: [{ placeholder: "company", values: ["Acme", "acme", "ACME", "Acme"] }]
      }
    ]);

    assert.deepEqual(saved.dictionaries[0].entries[0].values.map(({ value }) => value), ["Acme", "acme", "ACME"]);

    const stored = await store.getDictionary();
    assert.deepEqual(stored.dictionaries[0].entries[0].values.map(({ value }) => value), ["Acme", "acme", "ACME"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
