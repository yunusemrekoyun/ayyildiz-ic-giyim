import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { DEFAULT_SITE_CODE, SITE_CODES } from "../../constants/sites.js";

function buildRedirectTarget(pathname, search, hash) {
  const [, , ...rest] = pathname.split("/");
  const remainder = rest.filter(Boolean).join("/");
  const suffix = remainder ? `/${remainder}` : "";
  return `/${DEFAULT_SITE_CODE}${suffix}${search || ""}${hash || ""}`;
}

export default function LanguageGuard() {
  const { lng } = useParams();
  const location = useLocation();

  if (!lng) {
    const target = buildRedirectTarget(
      location.pathname,
      location.search,
      location.hash
    );
    return <Navigate to={target} replace />;
  }

  const normalized = lng.toLowerCase();

  if (!SITE_CODES.includes(normalized)) {
    const target = buildRedirectTarget(
      location.pathname,
      location.search,
      location.hash
    );
    return <Navigate to={target} replace />;
  }

  if (normalized !== lng) {
    const [, , ...rest] = location.pathname.split("/");
    const remainder = rest.filter(Boolean).join("/");
    const suffix = remainder ? `/${remainder}` : "";
    return (
      <Navigate
        to={`/${normalized}${suffix}${location.search || ""}${location.hash || ""}`}
        replace
      />
    );
  }

  return <Outlet />;
}
