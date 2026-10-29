export function selectAvailableDictionaryId(
  dictionaries: Array<{ id: string }>,
  selectedDictionaryId: string
): string {
  return dictionaries.some((dictionary) => dictionary.id === selectedDictionaryId)
    ? selectedDictionaryId
    : dictionaries[0]?.id || "";
}
