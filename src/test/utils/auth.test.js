import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAuth, setAuth } from "../../utils/auth";

const createStorageMock = () => {
  const storage = new Map();

  return {
    getItem: vi.fn((key) => (storage.has(key) ? storage.get(key) : null)),
    setItem: vi.fn((key, value) => {
      storage.set(key, String(value));
    }),
    removeItem: vi.fn((key) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    })
  };
};

describe("auth storage", () => {
  const sampleAuth = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    role: "USER",
    email: "user@example.com",
    fullName: "Test User"
  };

  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: createStorageMock(),
      configurable: true
    });
    Object.defineProperty(window, "sessionStorage", {
      value: createStorageMock(),
      configurable: true
    });
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    clearAuth();
    vi.restoreAllMocks();
  });

  it("stores auth in localStorage when remember is enabled", () => {
    setAuth(sampleAuth, { remember: true });

    expect(window.localStorage.getItem("accessToken")).toBe(sampleAuth.accessToken);
    expect(window.localStorage.getItem("refreshToken")).toBe(sampleAuth.refreshToken);
    expect(window.localStorage.getItem("name")).toBe(sampleAuth.fullName);
    expect(window.sessionStorage.getItem("accessToken")).toBeNull();
  });

  it("stores auth in sessionStorage when remember is disabled", () => {
    setAuth(sampleAuth, { remember: false });

    expect(window.sessionStorage.getItem("accessToken")).toBe(sampleAuth.accessToken);
    expect(window.sessionStorage.getItem("refreshToken")).toBe(sampleAuth.refreshToken);
    expect(window.sessionStorage.getItem("name")).toBe(sampleAuth.fullName);
    expect(window.localStorage.getItem("accessToken")).toBeNull();
  });

  it("clears previous auth before writing new storage mode", () => {
    setAuth(sampleAuth, { remember: true });
    setAuth({ ...sampleAuth, accessToken: "new-access", refreshToken: "new-refresh" }, { remember: false });

    expect(window.localStorage.getItem("accessToken")).toBeNull();
    expect(window.sessionStorage.getItem("accessToken")).toBe("new-access");
    expect(window.sessionStorage.getItem("refreshToken")).toBe("new-refresh");
  });
});
