export const DICTIONARIES_UPDATED_MESSAGE = "nymble:dictionaries-updated";

type DictionariesUpdatedMessage = {
  type: typeof DICTIONARIES_UPDATED_MESSAGE;
};

export function publishDictionariesUpdated(): void {
  const message: DictionariesUpdatedMessage = { type: DICTIONARIES_UPDATED_MESSAGE };

  if ("BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel(DICTIONARIES_UPDATED_MESSAGE);
      channel.postMessage(message);
      channel.close();
      return;
    } catch (_error) {
      // Fall back to the direct popup-to-opener channel below.
    }
  }

  if (window.opener && window.opener !== window && !window.opener.closed) {
    window.opener.postMessage(message, window.location.origin);
  }
}

export function subscribeToDictionaryUpdates(onUpdate: () => void): () => void {
  let channel: BroadcastChannel | undefined;

  if ("BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel(DICTIONARIES_UPDATED_MESSAGE);
      channel.addEventListener("message", (event) => {
        if (isDictionariesUpdatedMessage(event.data)) {
          onUpdate();
        }
      });
    } catch (_error) {
      channel = undefined;
    }
  }

  const handleWindowMessage = (event: MessageEvent) => {
    if (event.origin === window.location.origin && isDictionariesUpdatedMessage(event.data)) {
      onUpdate();
    }
  };
  window.addEventListener("message", handleWindowMessage);

  return () => {
    channel?.close();
    window.removeEventListener("message", handleWindowMessage);
  };
}

export function isDictionariesUpdatedMessage(value: unknown): value is DictionariesUpdatedMessage {
  return Boolean(
    value
      && typeof value === "object"
      && "type" in value
      && value.type === DICTIONARIES_UPDATED_MESSAGE
  );
}
