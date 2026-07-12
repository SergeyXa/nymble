const form = document.querySelector("#dictionaryForm");
const dictionariesContainer = document.querySelector("#dictionaries");
const dictionaryTemplate = document.querySelector("#dictionaryTemplate");
const entryTemplate = document.querySelector("#entryTemplate");
const addDictionaryButton = document.querySelector("#addDictionaryButton");
const status = document.querySelector("#status");

function addDictionary(dictionary = { name: "", entries: [] }) {
  const fragment = dictionaryTemplate.content.cloneNode(true);
  const element = fragment.querySelector(".dictionary-block");
  const nameInput = fragment.querySelector(".dictionary-name-input");
  const entriesContainer = fragment.querySelector(".entries");
  const addEntryButton = fragment.querySelector(".add-entry-button");
  const deleteDictionaryButton = fragment.querySelector(".delete-dictionary-button");

  element.dataset.id = dictionary.id || "";
  nameInput.value = dictionary.name;
  addEntryButton.addEventListener("click", () => {
    const entry = addEntry(entriesContainer);
    entry.querySelector(".placeholder-input").focus();
  });
  deleteDictionaryButton.addEventListener("click", () => element.remove());

  for (const entry of dictionary.entries || []) {
    addEntry(entriesContainer, entry);
  }
  if (!dictionary.entries?.length) {
    addEntry(entriesContainer);
  }

  dictionariesContainer.append(fragment);
  return element;
}

function addEntry(container, entry = { placeholder: "", values: [] }) {
  const fragment = entryTemplate.content.cloneNode(true);
  const element = fragment.querySelector(".dictionary-entry");
  const placeholderInput = fragment.querySelector(".placeholder-input");
  const valuesInput = fragment.querySelector(".values-input");
  const deleteButton = fragment.querySelector(".delete-entry-button");

  element.dataset.id = entry.id || "";
  placeholderInput.value = entry.placeholder;
  valuesInput.value = entry.values.map((value) => value.value || value).join("\n");
  deleteButton.addEventListener("click", () => element.remove());

  container.append(fragment);
  return element;
}

async function loadDictionary() {
  status.textContent = "Loading...";
  try {
    const response = await fetch("/api/dictionary");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Load failed");
    }

    dictionariesContainer.innerHTML = "";
    for (const dictionary of payload.dictionaries || []) {
      addDictionary(dictionary);
    }
    if (!payload.dictionaries?.length) {
      addDictionary({ name: "Default", entries: [] });
    }
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
  }
}

function collectDictionaries() {
  return [...dictionariesContainer.querySelectorAll(".dictionary-block")].map((dictionary, index) => {
    const name = dictionary.querySelector(".dictionary-name-input").value.trim() || `Dictionary ${index + 1}`;
    const entries = [...dictionary.querySelectorAll(".dictionary-entry")].map((entry) => {
      const placeholder = entry.querySelector(".placeholder-input").value;
      const values = entry
        .querySelector(".values-input")
        .value.split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean);

      return { id: entry.dataset.id || undefined, placeholder, values };
    });

    return { id: dictionary.dataset.id || undefined, name, entries };
  });
}

function countPlaceholders(dictionaries) {
  return dictionaries.reduce((total, dictionary) => total + dictionary.entries.length, 0);
}

addDictionaryButton.addEventListener("click", () => {
  const dictionary = addDictionary({ name: "", entries: [] });
  dictionary.querySelector(".dictionary-name-input").focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "Saving...";

  try {
    const response = await fetch("/api/dictionary", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dictionaries: collectDictionaries() })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Save failed");
    }

    dictionariesContainer.innerHTML = "";
    for (const dictionary of payload.dictionaries) {
      addDictionary(dictionary);
    }
    status.textContent = `Saved ${payload.dictionaries.length} dictionaries, ${countPlaceholders(payload.dictionaries)} placeholders`;
  } catch (error) {
    status.textContent = error.message;
  }
});

loadDictionary();
