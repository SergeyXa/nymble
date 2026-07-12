import React, { FormEvent, useEffect, useRef, useState } from "react";
import { fetchDictionaries, saveDictionaries } from "./api";
import type { Dictionary, EditableDictionary, EditableEntry } from "./types";

export function Page() {
  const nextLocalId = useRef(0);
  const [dictionaries, setDictionaries] = useState<EditableDictionary[]>([]);
  const [status, setStatus] = useState("");

  function createLocalId(prefix: string): string {
    nextLocalId.current += 1;
    return `${prefix}-${nextLocalId.current}`;
  }

  function createEntry(): EditableEntry {
    return { localId: createLocalId("entry"), placeholder: "", values: "" };
  }

  function createDictionary(): EditableDictionary {
    return { localId: createLocalId("dictionary"), name: "", entries: [createEntry()] };
  }

  function toEditableDictionary(dictionary: Dictionary): EditableDictionary {
    return {
      id: dictionary.id,
      localId: createLocalId("dictionary"),
      name: dictionary.name,
      entries: dictionary.entries.length
        ? dictionary.entries.map((entry) => ({
            id: entry.id,
            localId: createLocalId("entry"),
            placeholder: entry.placeholder,
            values: entry.values.map((value) => value.value).join("\n")
          }))
        : [createEntry()]
    };
  }

  useEffect(() => {
    let cancelled = false;
    setStatus("Loading...");

    fetchDictionaries()
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setDictionaries(payload.dictionaries.length ? payload.dictionaries.map(toEditableDictionary) : [createDictionary()]);
        setStatus("");
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

  function updateDictionary(localId: string, update: (dictionary: EditableDictionary) => EditableDictionary) {
    setDictionaries((current) => current.map((dictionary) => (dictionary.localId === localId ? update(dictionary) : dictionary)));
  }

  function updateEntry(dictionaryId: string, entryId: string, update: (entry: EditableEntry) => EditableEntry) {
    updateDictionary(dictionaryId, (dictionary) => ({
      ...dictionary,
      entries: dictionary.entries.map((entry) => (entry.localId === entryId ? update(entry) : entry))
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving...");

    try {
      const payload = await saveDictionaries(dictionaries);
      setDictionaries(payload.dictionaries.map(toEditableDictionary));
      setStatus(`Saved ${payload.dictionaries.length} dictionaries, ${countPlaceholders(payload.dictionaries)} placeholders`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  return (
    <main className="container dictionaries-page py-4 py-lg-5">
      <header className="dictionaries-header d-flex align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Dictionaries</h1>
          <p className="text-secondary mb-0">Manage dictionaries and their placeholder values.</p>
        </div>
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <span className="small text-secondary align-self-center" role="status">
            {status}
          </span>
          <button className="btn btn-primary btn-sm" type="submit" form="dictionariesForm">
            Save
          </button>
          <a className="btn btn-outline-secondary btn-sm icon-button" href="/" aria-label="Back to composer" title="Back to composer">
            <i className="bi bi-arrow-left" aria-hidden="true"></i>
          </a>
        </div>
      </header>

      <form id="dictionariesForm" className="vstack gap-3" onSubmit={handleSubmit}>
        <div className="vstack gap-4">
          {dictionaries.map((dictionary) => (
            <DictionaryCard
              key={dictionary.localId}
              dictionary={dictionary}
              onChangeName={(name) => updateDictionary(dictionary.localId, (current) => ({ ...current, name }))}
              onDelete={() => setDictionaries((current) => current.filter((item) => item.localId !== dictionary.localId))}
              onAddEntry={() => updateDictionary(dictionary.localId, (current) => ({ ...current, entries: [...current.entries, createEntry()] }))}
              onChangeEntry={(entryId, update) => updateEntry(dictionary.localId, entryId, update)}
              onDeleteEntry={(entryId) =>
                updateDictionary(dictionary.localId, (current) => ({
                  ...current,
                  entries: current.entries.filter((entry) => entry.localId !== entryId)
                }))
              }
            />
          ))}
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-outline-primary" type="button" onClick={() => setDictionaries((current) => [...current, createDictionary()])}>
            Add dictionary
          </button>
        </div>
      </form>
    </main>
  );
}

type DictionaryCardProps = {
  dictionary: EditableDictionary;
  onChangeName: (name: string) => void;
  onDelete: () => void;
  onAddEntry: () => void;
  onChangeEntry: (entryId: string, update: (entry: EditableEntry) => EditableEntry) => void;
  onDeleteEntry: (entryId: string) => void;
};

function DictionaryCard({ dictionary, onChangeName, onDelete, onAddEntry, onChangeEntry, onDeleteEntry }: DictionaryCardProps) {
  return (
    <section className="dictionary-block border rounded-3 bg-white shadow-sm p-3">
      <div className="dictionary-block-header d-flex flex-column flex-lg-row align-items-lg-end gap-3 mb-3">
        <div className="flex-grow-1">
          <label className="form-label">Dictionary name</label>
          <input className="form-control" maxLength={32} placeholder="Client A" value={dictionary.name} onChange={(event) => onChangeName(event.target.value)} />
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-danger icon-button" type="button" aria-label="Delete dictionary" title="Delete dictionary" onClick={onDelete}>
            <i className="bi bi-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div className="vstack gap-3">
        {dictionary.entries.map((entry) => (
          <EntryCard key={entry.localId} entry={entry} onChange={(update) => onChangeEntry(entry.localId, update)} onDelete={() => onDeleteEntry(entry.localId)} />
        ))}
      </div>
      <div className="d-flex justify-content-end mt-3">
        <button className="btn btn-outline-primary icon-button" type="button" aria-label="Add placeholder" title="Add placeholder" onClick={onAddEntry}>
          <i className="bi bi-plus-lg" aria-hidden="true"></i>
        </button>
      </div>
    </section>
  );
}

type EntryCardProps = {
  entry: EditableEntry;
  onChange: (update: (entry: EditableEntry) => EditableEntry) => void;
  onDelete: () => void;
};

function EntryCard({ entry, onChange, onDelete }: EntryCardProps) {
  return (
    <section className="dictionary-entry border rounded-3 p-3">
      <div className="row g-3">
        <div className="col-lg-4">
          <label className="form-label">Placeholder</label>
          <input className="form-control" placeholder="{CEO}" value={entry.placeholder} onChange={(event) => onChange((current) => ({ ...current, placeholder: event.target.value }))} />
        </div>
        <div className="col-lg-8">
          <label className="form-label">Values</label>
          <textarea className="form-control" rows={4} placeholder={"John Smith\nJohn"} value={entry.values} onChange={(event) => onChange((current) => ({ ...current, values: event.target.value }))} />
        </div>
      </div>
      <div className="text-end mt-3">
        <button className="btn btn-outline-danger btn-sm icon-button" type="button" aria-label="Delete placeholder" title="Delete placeholder" onClick={onDelete}>
          <i className="bi bi-trash" aria-hidden="true"></i>
        </button>
      </div>
    </section>
  );
}

function countPlaceholders(dictionaries: Dictionary[]): number {
  return dictionaries.reduce((total, dictionary) => total + dictionary.entries.length, 0);
}
