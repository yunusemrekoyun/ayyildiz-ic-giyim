// src/components/layout/LayoutSelector.jsx
import { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate, useSearchParams, useParams } from "react-router-dom";
import RootLayout from "./RootLayout";
import AdminLayout from "./AdminLayout";
import { authApi } from "../../api/auth";
import { DEFAULT_SITE_CODE, SITE_CODES } from "../../constants/sites.js";
import {
  getUser as getUserCache,
  setUser as setUserCache,
  getAccessToken,
  refreshAccessToken,
} from "../../api/client";

export default function LayoutSelector() {
  const location = useLocation();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const { lng } = useParams();
  const normalizedSite = (lng || DEFAULT_SITE_CODE).toLowerCase();
  const siteCode = SITE_CODES.includes(normalizedSite)
    ? normalizedSite
    : DEFAULT_SITE_CODE;

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const isAdminSection = pathSegments[1] === "admin";

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // 1) Cache’i oku (flicker azaltır)
        let u = getUserCache();

        // 2) Access yoksa refresh dene (cookie varsa alır)
        if (!getAccessToken()) {
          await refreshAccessToken();
        }

        // 3) Sunucudan daima doğrula (tek gerçek kaynak)
        const me = await authApi.me().catch(() => null);
        if (me) {
          setUserCache(me); // cache’i güncelle
          u = me;
        }

        if (mounted) setUser(u || null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // her route ve query değişiminde tekrar çalışır
  }, [location, params]);

  if (loading) return null;

  const roles = Array.isArray(user?.roles)
    ? user.roles.map((role) => String(role).toLowerCase())
    : [user?.role].filter(Boolean).map((role) => String(role).toLowerCase());
  const isAdmin = roles.includes("admin");

  // --- ADMIN GUARD ---
  if (isAdminSection) {
    // login değil → login sayfasına yönlendir (redirect ile geri döner)
    if (!user) {
      const redirect = encodeURIComponent(location.pathname + location.search);
      return (
        <Navigate
          to={`/${siteCode}/account?view=login&redirect=${redirect}`}
          replace
        />
      );
    }
    // login ama admin değil → ana sayfaya
    if (!isAdmin) {
      return <Navigate to={`/${siteCode}`} replace />;
    }
    // admin → AdminLayout
    return (
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    );
  }

  // --- PUBLIC (Root) LAYOUT ---
  return (
    <RootLayout>
      <Outlet />
    </RootLayout>
  );
}
