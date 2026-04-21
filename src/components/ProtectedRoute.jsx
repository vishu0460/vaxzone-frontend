import React from "react";
import { Navigate } from "react-router-dom";
import { getRole, isAuthenticated } from "../utils/auth";

export default function ProtectedRoute({ children, roles }) {
  if (!isAuthenticated()) {
    const redirect = typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/";
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  const role = getRole();
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}
