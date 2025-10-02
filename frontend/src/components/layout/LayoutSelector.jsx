// src/components/layout/LayoutSelector.jsx
import { useEffect, useState } from "react";
import {
  Outlet,
  useLocation,
  Navigate,
  useSearchParams,
} from "react-router-dom";
import RootLayout from "./RootLayout";
import AdminLayout from "./AdminLayout";
import {
  authApi,
  getUser as getUserCache,
  setUser as setUserCache,
  getAccessToken,
  refreshAccessToken,
} from "../../api";

export default function LayoutSelector() {
  const location = useLocation();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const isAdminSection = /^\/admin(\/|$)/.test(location.pathname);

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

  const role = (user?.role || "user").toLowerCase();

  // --- ADMIN GUARD ---
  if (isAdminSection) {
    // login değil → login sayfasına yönlendir (redirect ile geri döner)
    if (!user) {
      const redirect = encodeURIComponent(location.pathname + location.search);
      return (
        <Navigate to={`/account?view=login&redirect=${redirect}`} replace />
      );
    }
    // login ama admin değil → ana sayfaya
    if (role !== "admin") {
      return <Navigate to="/" replace />;
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
