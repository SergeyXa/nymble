import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { depersonalize } from "../src/server/transform.js";
import type { Dictionary } from "../src/server/types.js";

const starterText =
  "Alex Morgan, Chief Technology Officer at Example Systems Ltd, will share the project update with the team in Paris.";

test("tracked dictionary template contains work and personal examples", async () => {
  const raw = await readFile(new URL("../data/dictionaries.json", import.meta.url), "utf8");
  const template = JSON.parse(raw) as { dictionaries: Dictionary[] };

  assert.deepEqual(template.dictionaries.map((dictionary) => dictionary.name), ["{Work}", "{Personal}"]);

  const work = template.dictionaries[0];
  assert.deepEqual(work.entries.map((entry) => entry.placeholder), ["ES company", "AM name", "D1 role"]);
  assert.equal(
    depersonalize(starterText, work.entries).resultText,
    "{AM name}, {D1 role} at {ES company}, will share the project update with the team in Paris."
  );
});
