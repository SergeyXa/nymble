import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchAppConfig, fetchDictionaries, transformText } from "./api";
import { resultAnnotations, sourceAnnotations } from "./annotations";
import type { AnnotatedEditorHandle } from "./AnnotatedEditor";
import { ComposerPane } from "./ComposerPane";
import type {
  AppConfig,
  Dictionary,
  LeakFinding,
  Replacement,
  TransformDirection
} from "./types";

const initialConfig: AppConfig = {
  leakDetection: {
    enabled: false,
    provider: "presidio",
    defaultLanguage: "en",
    supportedLanguages: ["en"]
  }
};

export function Page() {
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [selectedDictionaryId, setSelectedDictionaryId] = useState("");
  const [direction, setDirection] = useState<TransformDirection>("depersonalize");
  const [sourceText, setSourceText] = useState("");
  const [resultText, setResultText] = useState("");
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [leakFindings, setLeakFindings] = useState<LeakFinding[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>(initialConfig);
  const [leakDetectionLanguage, setLeakDetectionLanguage] = useState("en");
  const [status, setStatus] = useState("");
  const sourceEditorRef = useRef<AnnotatedEditorHandle>(null);

  const currentDictionary = useMemo(
    () => dictionaries.find((dictionary) => dictionary.id === selectedDictionaryId),
    [dictionaries, selectedDictionaryId]
  );

  useEffect(() => {
    let cancelled = false;
    setStatus("Loading dictionaries...");

    Promise.all([fetchDictionaries(), fetchAppConfig()])
      .then(([items, loadedConfig]) => {
        if (cancelled) {
          return;
        }
        setDictionaries(items);
        setSelectedDictionaryId(items[0]?.id || "");
        setAppConfig(loadedConfig);
        setLeakDetectionLanguage(loadedConfig.leakDetection.defaultLanguage);
        setStatus(items.length ? "" : "Create a dictionary first.");
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setStatus(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (!currentDictionary) {
        setResultText("");
        setReplacements([]);
        resetLeakDetectionResult();
        setStatus("Create a dictionary first.");
        return;
      }

      if (!sourceText.trim()) {
        setResultText("");
        setReplacements([]);
        resetLeakDetectionResult();
        setStatus("");
        return;
      }

      setStatus("Working...");
      setLeakFindings([]);
      setWarnings([]);
      transformText(direction, currentDictionary.id, sourceText, leakDetectionLanguage, controller.signal)
        .then((payload) => {
          setResultText(payload.resultText || "");
          setReplacements(payload.replacements || []);
          setLeakFindings(payload.leakFindings || []);
          setWarnings(payload.warnings || []);
          setStatus("");
        })
        .catch((error: Error) => {
          if (error.name !== "AbortError") {
            setStatus(error.message);
          }
        });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [currentDictionary, direction, sourceText, leakDetectionLanguage]);

  function resetLeakDetectionResult() {
    setLeakFindings([]);
    setWarnings([]);
  }

  function selectTab(side: "source" | "target", tabId: string) {
    if (tabId === "original") {
      setDirection(side === "source" ? "depersonalize" : "personalize");
    } else {
      setSelectedDictionaryId(tabId);
      setDirection(side === "source" ? "personalize" : "depersonalize");
    }

    setResultText("");
    setReplacements([]);
    resetLeakDetectionResult();
  }

  function swapDirection() {
    setDirection((current) => (current === "depersonalize" ? "personalize" : "depersonalize"));
    setSourceText(resultText);
    setResultText("");
    setReplacements([]);
    resetLeakDetectionResult();
  }

  function clearText() {
    setSourceText("");
    setResultText("");
    setReplacements([]);
    resetLeakDetectionResult();
    setStatus("");
    sourceEditorRef.current?.focus();
  }

  async function pasteText() {
    try {
      updateSourceText(await navigator.clipboard.readText());
      sourceEditorRef.current?.focus();
      setStatus("Pasted");
    } catch (_error) {
      sourceEditorRef.current?.focus();
      setStatus("Paste failed. Use keyboard paste.");
    }
  }

  function updateSourceText(value: string) {
    setSourceText(value);
    resetLeakDetectionResult();
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(resultText);
      setStatus("Copied");
    } catch (_error) {
      setStatus("Copy failed.");
    }
  }

  return (
    <main className="container composer-page py-4 py-lg-5">
      <header className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Nymble</h1>
          <p className="text-secondary mb-0">Depersonalize text before sharing it with AI tools.</p>
        </div>
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <a className="btn btn-outline-secondary btn-sm" href="/dictionaries">
            Edit dictionaries
          </a>
        </div>
      </header>

      <section className="composer-shell border rounded-3 bg-white shadow-sm">
        <div className="composer-grid">
          <ComposerPane
            side="source"
            value={sourceText}
            annotations={sourceAnnotations(replacements)}
            dictionaries={dictionaries}
            selectedDictionaryId={selectedDictionaryId}
            direction={direction}
            placeholder="Paste text here"
            editorRef={sourceEditorRef}
            afterTabs={appConfig.leakDetection.enabled && direction === "depersonalize" ? (
              <select
                id="leakDetectionLanguage"
                className="form-select form-select-sm leak-language-select"
                value={leakDetectionLanguage}
                aria-label="Leak detection language"
                title="Leak detection language"
                onChange={(event) => setLeakDetectionLanguage(event.target.value)}
              >
                {appConfig.leakDetection.supportedLanguages.map((language) => (
                  <option key={language} value={language}>{language}</option>
                ))}
                <option value="off">off</option>
              </select>
            ) : undefined}
            action={
              <>
                <button
                  className="btn btn-outline-secondary btn-sm icon-button"
                  type="button"
                  aria-label="Clear"
                  title="Clear"
                  onClick={clearText}
                >
                  <i className="bi bi-trash" aria-hidden="true"></i>
                </button>
                <button
                  className="btn btn-outline-primary btn-sm icon-button"
                  type="button"
                  aria-label="Paste"
                  title="Paste"
                  onClick={pasteText}
                >
                  <i className="bi bi-box-arrow-in-down-right" aria-hidden="true"></i>
                </button>
              </>
            }
            onChange={updateSourceText}
            onSelectTab={selectTab}
          />

          <div className="swap-cell">
            <button
              className="btn btn-outline-secondary btn-sm icon-button"
              type="button"
              aria-label="Swap direction"
              title="Swap direction"
              onClick={swapDirection}
            >
              <i className="bi bi-arrow-left-right" aria-hidden="true"></i>
            </button>
          </div>

          <ComposerPane
            side="target"
            value={resultText}
            annotations={resultAnnotations(replacements, resultText, direction, leakFindings)}
            dictionaries={dictionaries}
            selectedDictionaryId={selectedDictionaryId}
            direction={direction}
            readOnly
            placeholder="Result appears here"
            action={
              <button
                className="btn btn-outline-primary btn-sm icon-button"
                type="button"
                aria-label="Copy"
                title="Copy"
                onClick={copyText}
              >
                <i className="bi bi-box-arrow-up-right" aria-hidden="true"></i>
              </button>
            }
            onSelectTab={selectTab}
          />
        </div>
      </section>

      {appConfig.leakDetection.enabled && direction === "depersonalize" && warnings.length ? (
        <section className="leak-warning mt-3" aria-live="polite">
          {warnings.map((warning) => (
            <div className="small text-warning-emphasis" key={warning}>{warning}</div>
          ))}
        </section>
      ) : null}

      {status ? (
        <section className="mt-3 d-flex justify-content-end">
          <span className="small text-secondary" role="status">
            {status}
          </span>
        </section>
      ) : null}
    </main>
  );
}
