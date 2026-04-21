import toast from "react-hot-toast";

const getThemeValue = (name, fallback) => {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const baseOptions = {
  position: "top-right",
  duration: 3500
};

const buildToastStyle = () => ({
  borderRadius: "16px",
  padding: "14px 16px",
  background: getThemeValue("--toast-bg", "#ffffff"),
  color: getThemeValue("--toast-text", "#0f172a"),
  boxShadow: getThemeValue("--toast-shadow", "0 18px 45px rgba(15, 23, 42, 0.14)"),
  border: `1px solid ${getThemeValue("--toast-border", "rgba(226, 232, 240, 0.9)")}`,
  fontWeight: 600
});

export function successToast(message) {
  return toast.success(message, {
    ...baseOptions,
    style: buildToastStyle(),
    iconTheme: {
      primary: "#10b981",
      secondary: "#ffffff"
    }
  });
}

export function errorToast(message) {
  return toast.error(message, {
    ...baseOptions,
    duration: 4000,
    style: buildToastStyle(),
    iconTheme: {
      primary: "#ef4444",
      secondary: "#ffffff"
    }
  });
}

export function infoToast(message) {
  return toast(message, {
    ...baseOptions,
    style: buildToastStyle(),
    icon: "i"
  });
}
