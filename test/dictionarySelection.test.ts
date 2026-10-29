import assert from "node:assert/strict";
import test from "node:test";
import { selectAvailableDictionaryId } from "../src/client/composer/dictionarySelection.js";

const dictionaries = [{ id: "work" }, { id: "personal" }];

test("dictionary refresh preserves the selected dictionary when it still exists", () => {
  assert.equal(selectAvailableDictionaryId(dictionaries, "personal"), "personal");
});

test("dictionary refresh falls back to the first dictionary when the selection was removed", () => {
  assert.equal(selectAvailableDictionaryId(dictionaries, "removed"), "work");
  assert.equal(selectAvailableDictionaryId([], "removed"), "");
});
