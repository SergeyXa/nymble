import React from "react";
import { AnnotatedEditor, AnnotatedEditorHandle } from "./AnnotatedEditor";
import { DictionaryTabs } from "./DictionaryTabs";
import type { Dictionary, TextAnnotation, TransformDirection } from "./types";

type ComposerPaneProps = {
  side: "source" | "target";
  value: string;
  annotations: TextAnnotation[];
  dictionaries: Dictionary[];
  selectedDictionaryId: string;
  direction: TransformDirection;
  readOnly?: boolean;
  placeholder: string;
  editorRef?: React.Ref<AnnotatedEditorHandle>;
  action: React.ReactNode;
  onChange?: (value: string) => void;
  onSelectTab: (side: "source" | "target", tabId: string) => void;
};

export function ComposerPane({
  side,
  value,
  annotations,
  dictionaries,
  selectedDictionaryId,
  direction,
  readOnly = false,
  placeholder,
  editorRef,
  action,
  onChange,
  onSelectTab
}: ComposerPaneProps) {
  return (
    <>
      <div className={`pane-header pane-header-${side === "source" ? "left" : "right"}`}>
        <DictionaryTabs
          side={side}
          dictionaries={dictionaries}
          selectedDictionaryId={selectedDictionaryId}
          direction={direction}
          onSelect={onSelectTab}
        />
        {action}
      </div>
      <div className={`${side}-editor editor-cell`}>
        <AnnotatedEditor
          ref={editorRef}
          value={value}
          annotations={annotations}
          readOnly={readOnly}
          placeholder={placeholder}
          autoFocus={side === "source"}
          onChange={onChange}
        />
      </div>
    </>
  );
}
