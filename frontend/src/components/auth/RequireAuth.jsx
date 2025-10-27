// src/components/auth/RequireAuth.jsx
import { Navigate, useLocation } from "react-router-dom";
import { getUser } from "../../api/client";
import { useLocalizedPath } from "../../hooks/useLocalizedPath.js";

export default function RequireAuth({ children }) {
  const user = getUser();
  const location = useLocation();
  const { buildPath } = useLocalizedPath();

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate
        to={buildPath(`/account?view=login&redirect=${redirect}`)}
        replace
      />
    );
  }
  return children;
}
