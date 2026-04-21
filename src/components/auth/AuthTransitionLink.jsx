import React from "react";
import { Link } from "react-router-dom";

let authTransitionCleanupTimer = null;

export function markAuthTransition(direction) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.authTransition = direction;

  if (typeof window !== "undefined") {
    window.clearTimeout(authTransitionCleanupTimer);
    authTransitionCleanupTimer = window.setTimeout(() => {
      delete document.documentElement.dataset.authTransition;
    }, 2400);
  }
}

export default function AuthTransitionLink({
  direction,
  onClick,
  state,
  ...props
}) {
  const nextState = {
    ...(state && typeof state === "object" ? state : {}),
    authTransitionDirection: direction,
    authTransitionSource: "auth-switch"
  };

  return (
    <Link
      {...props}
      state={nextState}
      viewTransition
      onClick={(event) => {
        markAuthTransition(direction);
        onClick?.(event);
      }}
    />
  );
}
