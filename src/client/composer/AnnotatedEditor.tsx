import { basicSetup } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import { Compartment, EditorState, Extension, RangeSetBuilder, StateField } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  keymap,
  placeholder as placeholderExtension,
  ViewUpdate
} from "@codemirror/view";
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { TextAnnotation } from "./types";

export type AnnotatedEditorHandle = {
  focus: () => void;
};

type AnnotatedEditorProps = {
  value: string;
  annotations: TextAnnotation[];
  readOnly?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  onChange?: (value: string) => void;
};

export const AnnotatedEditor = forwardRef<AnnotatedEditorHandle, AnnotatedEditorProps>(
  ({ value, annotations, readOnly = false, placeholder = "", autoFocus = false, onChange }, ref) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const readOnlyCompartment = useRef(new Compartment());
    const annotationsCompartment = useRef(new Compartment());

    onChangeRef.current = onChange;

    useImperativeHandle(ref, () => ({
      focus() {
        viewRef.current?.focus();
      }
    }));

    useEffect(() => {
      if (!hostRef.current) {
        return undefined;
      }

      const view = new EditorView({
        parent: hostRef.current,
        state: EditorState.create({
          doc: value,
          extensions: [
            basicSetup,
            keymap.of([indentWithTab]),
            placeholder ? placeholderExtension(placeholder) : [],
            EditorView.lineWrapping,
            EditorView.updateListener.of((update: ViewUpdate) => {
              if (update.docChanged) {
                onChangeRef.current?.(update.state.doc.toString());
              }
            }),
            readOnlyCompartment.current.of(readOnlyExtension(readOnly)),
            annotationsCompartment.current.of(annotationExtension(annotations))
          ]
        })
      });

      viewRef.current = view;
      if (autoFocus) {
        view.focus();
      }

      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, []);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) {
        return;
      }

      const currentValue = view.state.doc.toString();
      if (currentValue !== value) {
        view.dispatch({
          changes: { from: 0, to: currentValue.length, insert: value }
        });
      }
    }, [value]);

    useEffect(() => {
      viewRef.current?.dispatch({
        effects: readOnlyCompartment.current.reconfigure(readOnlyExtension(readOnly))
      });
    }, [readOnly]);

    useEffect(() => {
      viewRef.current?.dispatch({
        effects: annotationsCompartment.current.reconfigure(annotationExtension(annotations))
      });
    }, [annotations]);

    return <div className="annotated-editor" ref={hostRef} />;
  }
);

function readOnlyExtension(readOnly: boolean): Extension {
  return [EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)];
}

function annotationExtension(annotations: TextAnnotation[]): Extension {
  const field = StateField.define<DecorationSet>({
    create(state) {
      return buildDecorations(state.doc.length, annotations);
    },
    update(value) {
      return value;
    },
    provide: (decorations) => EditorView.decorations.from(decorations)
  });

  return field;
}

function buildDecorations(docLength: number, annotations: TextAnnotation[]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const sorted = annotations
    .filter((annotation) => annotation.start >= 0 && annotation.end > annotation.start && annotation.end <= docLength)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  for (const annotation of sorted) {
    builder.add(
      annotation.start,
      annotation.end,
      Decoration.mark({
        class: `pii-token pii-token--${annotation.kind}`,
        attributes: annotation.label ? { title: annotation.label } : undefined
      })
    );
  }

  return builder.finish();
}
