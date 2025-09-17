import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import UserAccountPage from "../../pages/UserAccountPage";
import AuthPage from "../../pages/AuthPage";
import { authApi, getAccessToken, refreshAccessToken } from "../../api";

export default function AuthSelector() {
  const [ready, setReady] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // logout query
  useEffect(() => {
    (async () => {
      if (params.get("view") === "logout") {
        await authApi.logout();
        navigate("/account?view=login", { replace: true });
        setIsLogged(false);
      }
    })();
  }, [params, navigate]);

  // açılışta token var mı → /me ile doğrula; yoksa refresh dene
  useEffect(() => {
    (async () => {
      try {
        if (!getAccessToken()) {
          const ok = await refreshAccessToken(); // cookie varsa yeni access al
          if (!ok) {
            setIsLogged(false);
            setReady(true);
            return;
          }
        }
        const me = await authApi.me();
        setIsLogged(Boolean(me?.user));
      } catch {
        setIsLogged(false);
      } finally {
        setReady(true);
      }
    })();
  }, [params]);

  if (!ready) return null;

  if (isLogged)
    return (
      <UserAccountPage
        onLogout={async () => {
          await authApi.logout();
          navigate("/account?view=login", { replace: true });
          setIsLogged(false);
        }}
      />
    );

  const initialView = params.get("view") === "login" ? "login" : "register";
  return (
    <AuthPage
      initialView={initialView}
      onAuthSuccess={() => {
        setIsLogged(true);
        navigate("/account", { replace: true });
      }}
    />
  );
}
