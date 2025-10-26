import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function RegisterForm({ onSubmit, loadingText }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!agree || !name || !email || !pass) return;
    setLoading(true);
    try {
      await onSubmit?.({ name, email, pass, phone });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-primary">
          {t("authForm.fullName")}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border bg-contact-bg px-3 py-2 text-primary outline-none placeholder:text-secondary/60"
          placeholder={t("authForm.namePlaceholder")}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-primary">
          {t("authForm.email")}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-contact-bg px-3 py-2 text-primary outline-none placeholder:text-secondary/60"
          placeholder={t("authForm.emailPlaceholder")}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-primary">
          {t("authForm.phone")}
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-border bg-contact-bg px-3 py-2 text-primary outline-none placeholder:text-secondary/60"
          placeholder={t("authForm.phonePlaceholder")}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-primary">
          {t("authForm.password")}
        </label>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="w-full rounded-lg border border-border bg-contact-bg px-3 py-2 text-primary outline-none placeholder:text-secondary/60"
          placeholder={t("authForm.passwordPlaceholder")}
          required
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-secondary">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1"
        />
        {t("authForm.agree")}
      </label>

      <button
        type="submit"
        disabled={!agree || loading}
        className="mt-2 w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {loading
          ? loadingText || t("authForm.registerLoading")
          : t("authForm.registerButton")}
      </button>
    </form>
  );
}
