import type { Dictionary, TransformDirection, TransformResponse } from "./types";

export async function fetchDictionaries(): Promise<Dictionary[]> {
  const response = await fetch("/api/dictionaries");
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Load failed");
  }

  return payload.dictionaries || [];
}

export async function transformText(
  direction: TransformDirection,
  dictionaryId: string,
  text: string,
  signal?: AbortSignal
): Promise<TransformResponse> {
  const response = await fetch("/api/transform", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction, dictionaryId, text }),
    signal
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Transform failed");
  }

  return payload;
}
