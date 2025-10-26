import { useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useEffect } from "react";

export default function LanguageSwitcher({ variant = "header" }) {
  const { language, setLanguage, languages } = useLanguage();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () =>
      languages.map((item) => ({
        ...item,
        label: item.label,
      })),
    [languages]
  );

  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handle = (event) => {
      if (!ref.current) return;
      if (ref.current.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [open]);

  const active = options.find((item) => item.code === language) || options[0];

  const baseClass =
    variant === "header"
      ? "inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary hover:bg-surface-hover transition"
      : "inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-secondary hover:text-primary";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={baseClass}
        onClick={() => setOpen((value) => !value)}
        aria-label={t("languageSwitcher.aria")}
      >
        <span>{active?.label ?? language.toUpperCase()}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <ul className="absolute right-0 mt-2 min-w-[140px] overflow-hidden rounded-md border border-border bg-white shadow-lg z-[120]">
          {options.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                onClick={() => {
                  setLanguage(item.code);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm ${
                  item.code === active?.code
                    ? "bg-surface-light text-primary font-semibold"
                    : "text-secondary hover:bg-surface-hover"
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
