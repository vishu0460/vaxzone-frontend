const AUTH_STORAGE_KEYS = ["accessToken", "refreshToken", "role", "email", "name"];

const getStorageValue = (key) =>
  window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);

const removeStoredAuth = () => {
  AUTH_STORAGE_KEYS.forEach((key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  });
};

const notifyAuthChanged = () => {
  window.dispatchEvent(new Event("vaxzone:auth-changed"));
};

export function setAuth(data, options = {}) {
  const normalizedData = data && typeof data === "object" && "data" in data ? data.data : data;
  const normalizedName = normalizedData?.name || normalizedData?.fullName || normalizedData?.userName || "";
  const shouldRemember = options?.remember !== false;
  const storage = shouldRemember ? window.localStorage : window.sessionStorage;

  removeStoredAuth();

  if (!normalizedData?.accessToken || !normalizedData?.refreshToken) {
    return;
  }

  storage.setItem("accessToken", normalizedData.accessToken);
  storage.setItem("refreshToken", normalizedData.refreshToken);
  storage.setItem("role", normalizedData.role || "");
  storage.setItem("email", normalizedData.email || "");
  if (normalizedName) {
    storage.setItem("name", normalizedName);
  }

  notifyAuthChanged();
}

export function clearAuth() {
  removeStoredAuth();
  notifyAuthChanged();
}

export function getAccessToken() {
  return getStorageValue("accessToken");
}

export function getRefreshToken() {
  return getStorageValue("refreshToken");
}

export function getRole() {
  return getStorageValue("role");
}

export function getDefaultAuthenticatedPath(role = getRole()) {
  const normalizedRole = String(role || "").toUpperCase();

  if (normalizedRole === "SUPER_ADMIN") {
    return "/admin/dashboard";
  }

  if (normalizedRole === "ADMIN") {
    return "/admin/bookings";
  }

  return "/user/bookings";
}

export function getName() {
  return getStorageValue("name");
}

export function getEmail() {
  return getStorageValue("email");
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function useAuth() {
  return {
    accessToken: getAccessToken(),
    refreshToken: getRefreshToken(),
    role: getRole(),
    name: getName(),
    email: getEmail(),
    isAuthenticated: isAuthenticated(),
    setAuth,
    clearAuth
  };
}
