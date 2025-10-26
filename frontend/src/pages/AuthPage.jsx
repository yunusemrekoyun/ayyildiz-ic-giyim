// src/pages/AuthPage.jsx
import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";
import { authApi } from "../api/auth";

export default function AuthPage({ initialView = "register", onAuthSuccess }) {
  const [view, setView] = useState(initialView);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // /account?view=login&redirect=/admin/xyz gibi geldiğinde
  const redirectTarget = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const r = sp.get("redirect");
    return r && r.startsWith("/") ? r : null;
  }, [location.search]);

  const handleRegister = async (vals) => {
    setError("");
    try {
      const [firstName, ...rest] = (vals.name || "").trim().split(" ");
      const lastName = rest.join(" ") || "-";

      await authApi.register({
        firstName,
        lastName,
        email: vals.email,
        phone: vals.phone || "",
        password: vals.pass,
        role: "user",
      });

      // Guard'tan geldiyse oraya dön; değilse standart akış
      if (redirectTarget) {
        navigate(redirectTarget, { replace: true });
      } else {
        onAuthSuccess?.();
      }
    } catch (e) {
      setError(parseErr(e, t("common.genericError")));
    }
  };

  const handleLogin = async (vals) => {
    setError("");
    try {
      await authApi.login({
        email: vals.email,
        password: vals.pass,
      });

      // Guard'tan geldiyse oraya dön; değilse standart akış
      if (redirectTarget) {
        navigate(redirectTarget, { replace: true });
      } else {
        onAuthSuccess?.();
      }
    } catch (e) {
      setError(parseErr(e, t("common.genericError")));
    }
  };

  return (
    <section className="bg-surface-light/60">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h1 className="text-center font-serif text-3xl font-extrabold text-primary">
            {view === "login"
              ? t("authPage.loginTitle")
              : t("authPage.registerTitle")}
          </h1>
          <p className="mt-2 text-center text-secondary">
            {view === "login"
              ? t("authPage.loginSubtitle")
              : t("authPage.registerSubtitle")}
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-surface-light p-3 text-sm text-accent">
              {error}
            </div>
          )}

          <div className="mt-6">
            {view === "login" ? (
              <LoginForm
                onSubmit={handleLogin}
                loadingText={t("authForm.loginLoading")}
              />
            ) : (
              <RegisterForm
                onSubmit={handleRegister}
                loadingText={t("authForm.registerLoading")}
              />
            )}
          </div>

          <div className="mt-6 text-center text-sm">
            {view === "login" ? (
              <span className="text-secondary">
                {t("authPage.switchToRegister")}
                <button
                  className="text-accent hover:text-accent-hover underline"
                  onClick={() => setView("register")}
                >
                  {t("authPage.createAccount")}
                </button>
              </span>
            ) : (
              <span className="text-secondary">
                {t("authPage.switchToLogin")}
                <button
                  className="text-accent hover:text-accent-hover underline"
                  onClick={() => setView("login")}
                >
                  {t("authPage.loginAccount")}
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function parseErr(e, fallback) {
  try {
    const msg = JSON.parse(e.message)?.message;
    if (msg) return msg;
  } catch {
    // ignore
  }
  return e.message?.replace(/^Error:\s?/, "") || fallback;
}
