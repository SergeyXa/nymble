const sourceText = document.querySelector("#sourceText");
const resultText = document.querySelector("#resultText");
const sourceTabs = document.querySelector("#sourceTabs");
const targetTabs = document.querySelector("#targetTabs");
const swapButton = document.querySelector("#swapButton");
const clearButton = document.querySelector("#clearButton");
const pasteButton = document.querySelector("#pasteButton");
const copyButton = document.querySelector("#copyButton");
const status = document.querySelector("#status");
const warnings = document.querySelector("#warnings");

let dictionaries = [];
let selectedDictionaryId = "";
let direction = "depersonalize";
let transformTimer;

function currentDictionary() {
  return dictionaries.find((dictionary) => dictionary.id === selectedDictionaryId);
}

function renderTabs() {
  renderTabSet(sourceTabs, "source");
  renderTabSet(targetTabs, "target");
}

function renderTabSet(container, side) {
  container.innerHTML = "";

  const tabs = [{ id: "original", name: "Original" }, ...dictionaries];
  for (const tab of tabs) {
    const button = document.createElement("button");
    button.className = "nav-link";
    button.type = "button";
    button.role = "tab";
    button.textContent = tab.name;
    button.dataset.tabId = tab.id;

    if (isActiveTab(side, tab.id)) {
      button.classList.add("active");
      button.setAttribute("aria-selected", "true");
      button.setAttribute("aria-current", "page");
    } else {
      button.setAttribute("aria-selected", "false");
    }

    button.addEventListener("click", () => selectTab(side, tab.id));
    container.append(button);
  }
}

function isActiveTab(side, tabId) {
  if (direction === "depersonalize") {
    return side === "source" ? tabId === "original" : tabId === selectedDictionaryId;
  }

  return side === "source" ? tabId === selectedDictionaryId : tabId === "original";
}

function selectTab(side, tabId) {
  if (tabId === "original") {
    direction = side === "source" ? "depersonalize" : "personalize";
  } else {
    selectedDictionaryId = tabId;
    direction = side === "source" ? "personalize" : "depersonalize";
  }

  // There is intentionally one selectedDictionaryId for both panes.
  // That makes Original -> Dictionary and Dictionary -> Original possible,
  // while Dictionary A -> Dictionary B is unrepresentable in UI state.
  resultText.value = "";
  renderTabs();
  scheduleTransform();
}

function scheduleTransform() {
  window.clearTimeout(transformTimer);
  transformTimer = window.setTimeout(transformText, 180);
}

async function transformText() {
  const text = sourceText.value;
  const dictionary = currentDictionary();

  if (!dictionary) {
    resultText.value = "";
    renderWarnings(["Create a dictionary first."]);
    status.textContent = "";
    return;
  }

  if (!text.trim()) {
    resultText.value = "";
    renderWarnings([]);
    status.textContent = "";
    return;
  }

  status.textContent = "Working...";
  try {
    const response = await fetch("/api/transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, dictionaryId: dictionary.id, text })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Transform failed");
    }

    resultText.value = payload.resultText || "";
    renderWarnings(payload.warnings || []);
    const count = payload.replacements?.length || 0;
    status.textContent = `${dictionary.name}: ${count === 1 ? "1 replacement" : `${count} replacements`}`;
  } catch (error) {
    status.textContent = error.message;
  }
}

function renderWarnings(items) {
  warnings.innerHTML = "";
  if (!items.length) {
    return;
  }

  const box = document.createElement("div");
  box.className = "alert alert-warning py-2 mb-0";
  box.textContent = items.join(" ");
  warnings.append(box);
}

async function loadDictionaries() {
  status.textContent = "Loading dictionaries...";

  try {
    const response = await fetch("/api/dictionary");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Load failed");
    }

    dictionaries = payload.dictionaries || [];
    selectedDictionaryId = dictionaries[0]?.id || "";
    renderTabs();
    status.textContent = dictionaries.length ? "" : "Create a dictionary first.";
    scheduleTransform();
  } catch (error) {
    status.textContent = error.message;
  }
}

swapButton.addEventListener("click", () => {
  direction = direction === "depersonalize" ? "personalize" : "depersonalize";
  sourceText.value = resultText.value;
  resultText.value = "";
  renderTabs();
  scheduleTransform();
});

clearButton.addEventListener("click", () => {
  sourceText.value = "";
  resultText.value = "";
  warnings.innerHTML = "";
  status.textContent = "";
  sourceText.focus();
});

pasteButton.addEventListener("click", async () => {
  try {
    sourceText.value = await navigator.clipboard.readText();
    sourceText.focus();
    status.textContent = "Pasted";
    scheduleTransform();
  } catch (_error) {
    sourceText.focus();
    status.textContent = "Paste failed. Use keyboard paste.";
  }
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultText.value);
    status.textContent = "Copied";
  } catch (_error) {
    resultText.focus();
    resultText.select();
    status.textContent = "Copy failed. Result is selected.";
  }
});

sourceText.addEventListener("input", scheduleTransform);
loadDictionaries();
