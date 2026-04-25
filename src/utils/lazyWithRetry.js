const CHUNK_LOAD_ERROR_PATTERN = /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\d]+ failed/i;

export const lazyWithRetry = (importFactory, cacheKey = "default") => () =>
  importFactory().catch((error) => {
    if (typeof window === "undefined" || !CHUNK_LOAD_ERROR_PATTERN.test(String(error?.message || ""))) {
      throw error;
    }

    const retryStorageKey = `vaxzone:lazy-retry:${cacheKey}`;
    const hasRetried = window.sessionStorage.getItem(retryStorageKey) === "1";

    if (!hasRetried) {
      window.sessionStorage.setItem(retryStorageKey, "1");
      window.location.reload();
      return new Promise(() => {});
    }

    window.sessionStorage.removeItem(retryStorageKey);
    throw error;
  });
