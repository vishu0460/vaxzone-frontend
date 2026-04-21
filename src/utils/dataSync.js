const DATA_UPDATED_EVENT = "vaxzone:data-updated";
const DATA_UPDATED_STORAGE_KEY = "vaxzone:data-updated-at";
const DATA_UPDATED_CHANNEL = "vaxzone-data-sync";

let channel = null;

const getChannel = () => {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") {
    return null;
  }

  if (!channel) {
    channel = new window.BroadcastChannel(DATA_UPDATED_CHANNEL);
  }

  return channel;
};

export const debugDataSync = (label, payload) => {
  void label;
  void payload;
};

export const broadcastDataUpdated = (detail = {}) => {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    ...detail,
    updatedAt: Date.now()
  };

  window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT, { detail: payload }));

  try {
    window.localStorage.setItem(DATA_UPDATED_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    debugDataSync("localStorage broadcast failed", error);
  }

  getChannel()?.postMessage(payload);
};

export const subscribeToDataUpdates = (callback) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleWindowEvent = (event) => callback(event?.detail);
  const handleStorageEvent = (event) => {
    if (event.key !== DATA_UPDATED_STORAGE_KEY || !event.newValue) {
      return;
    }

    try {
      callback(JSON.parse(event.newValue));
    } catch {
      callback({ updatedAt: Date.now() });
    }
  };
  const handleChannelEvent = (event) => callback(event?.data);

  window.addEventListener(DATA_UPDATED_EVENT, handleWindowEvent);
  window.addEventListener("storage", handleStorageEvent);
  getChannel()?.addEventListener("message", handleChannelEvent);

  return () => {
    window.removeEventListener(DATA_UPDATED_EVENT, handleWindowEvent);
    window.removeEventListener("storage", handleStorageEvent);
    getChannel()?.removeEventListener("message", handleChannelEvent);
  };
};

export { DATA_UPDATED_EVENT };
