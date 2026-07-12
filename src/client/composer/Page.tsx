import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchDictionaries, transformText } from "./api";
import { resultAnnotations, sourceAnnotations } from "./annotations";
import type { AnnotatedEditorHandle } from "./AnnotatedEditor";
import { ComposerPane } from "./ComposerPane";
import type { Dictionary, Replacement, TransformDirection } from "./types";

export function Page() {
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [selectedDictionaryId, setSelectedDictionaryId] = useState("");
  const [direction, setDirection] = useState<TransformDirection>("depersonalize");
  const [sourceText, setSourceText] = useState("");
  const [resultText, setResultText] = useState("");
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [status, setStatus] = useState("");
  const sourceEditorRef = useRef<AnnotatedEditorHandle>(null);

  const currentDictionary = useMemo(
    () => dictionaries.find((dictionary) => dictionary.id === selectedDictionaryId),
    [dictionaries, selectedDictionaryId]
  );

  useEffect(() => {
    let cancelled = false;
    setStatus("Loading dictionaries...");

    fetchDictionaries()
      .then((items) => {
        if (cancelled) {
          return;
        }
        setDictionaries(items);
        setSelectedDictionaryId(items[0]?.id || "");
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
        setStatus("Create a dictionary first.");
        return;
      }

      if (!sourceText.trim()) {
        setResultText("");
        setReplacements([]);
        setStatus("");
        return;
      }

      setStatus("Working...");
      transformText(direction, currentDictionary.id, sourceText, controller.signal)
        .then((payload) => {
          setResultText(payload.resultText || "");
          setReplacements(payload.replacements || []);
          const count = payload.replacements?.length || 0;
          setStatus(`${currentDictionary.name}: ${count === 1 ? "1 replacement" : `${count} replacements`}`);
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
  }, [currentDictionary, direction, sourceText]);

  function selectTab(side: "source" | "target", tabId: string) {
    if (tabId === "original") {
      setDirection(side === "source" ? "depersonalize" : "personalize");
    } else {
      setSelectedDictionaryId(tabId);
      setDirection(side === "source" ? "personalize" : "depersonalize");
    }

    setResultText("");
    setReplacements([]);
  }

  function swapDirection() {
    setDirection((current) => (current === "depersonalize" ? "personalize" : "depersonalize"));
    setSourceText(resultText);
    setResultText("");
    setReplacements([]);
  }

  function clearText() {
    setSourceText("");
    setResultText("");
    setReplacements([]);
    setStatus("");
    sourceEditorRef.current?.focus();
  }

  async function pasteText() {
    try {
      setSourceText(await navigator.clipboard.readText());
      sourceEditorRef.current?.focus();
      setStatus("Pasted");
    } catch (_error) {
      sourceEditorRef.current?.focus();
      setStatus("Paste failed. Use keyboard paste.");
    }
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
      <header className="d-flex align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Nymble</h1>
          <p className="text-secondary mb-0">Depersonalize text before sharing it with AI tools.</p>
        </div>
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <button
            className="btn btn-primary btn-sm icon-button"
            type="button"
            aria-label="Clear"
            title="Clear"
            onClick={clearText}
          >
            <i className="bi bi-x-lg" aria-hidden="true"></i>
          </button>
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
            action={
              <button
                className="btn btn-outline-primary btn-sm icon-button"
                type="button"
                aria-label="Paste"
                title="Paste"
                onClick={pasteText}
              >
                <i className="bi bi-box-arrow-in-down-right" aria-hidden="true"></i>
              </button>
            }
            onChange={setSourceText}
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
            annotations={resultAnnotations(replacements, resultText)}
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

      <section className="mt-3 d-flex justify-content-end">
        <span className="small text-secondary" role="status">
          {status}
        </span>
      </section>
    </main>
  );
}
