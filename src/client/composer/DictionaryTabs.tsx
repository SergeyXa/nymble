import React from "react";
import type { Dictionary, TransformDirection } from "./types";

type Side = "source" | "target";

type DictionaryTabsProps = {
  side: Side;
  dictionaries: Dictionary[];
  selectedDictionaryId: string;
  direction: TransformDirection;
  onSelect: (side: Side, tabId: string) => void;
};

export function DictionaryTabs({
  side,
  dictionaries,
  selectedDictionaryId,
  direction,
  onSelect
}: DictionaryTabsProps) {
  const tabs = [{ id: "original", name: "Original" }, ...dictionaries];

  return (
    <div className="nav nav-tabs nav-tabs-compact" role="tablist" aria-label={side === "source" ? "Source" : "Target"}>
      {tabs.map((tab) => {
        const active = isActiveTab(side, tab.id, selectedDictionaryId, direction);
        return (
          <button
            className={`nav-link${active ? " active" : ""}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            key={tab.id}
            onClick={() => onSelect(side, tab.id)}
          >
            {tab.name}
          </button>
        );
      })}
    </div>
  );
}

function isActiveTab(
  side: Side,
  tabId: string,
  selectedDictionaryId: string,
  direction: TransformDirection
): boolean {
  if (direction === "depersonalize") {
    return side === "source" ? tabId === "original" : tabId === selectedDictionaryId;
  }

  return side === "source" ? tabId === selectedDictionaryId : tabId === "original";
}
