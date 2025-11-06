import { useAdminLang } from "../../context/LangContext.jsx";

const OPTIONS = [
  { value: "tr", label: "TR" },
  { value: "en", label: "EN" },
  { value: "de", label: "DE" },
];

export default function AdminLanguageSwitcher({ className }) {
  const { adminLang, setAdminLang } = useAdminLang();

  return (
    <div
      className={[
        "flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-2 py-1.5 text-xs font-medium text-[var(--color-text-admin)] shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="hidden sm:inline text-[var(--color-text-admin-muted)]">
        İçerik dili
      </span>
      <div className="flex overflow-hidden rounded-full border border-[var(--color-border-admin)]/40">
        {OPTIONS.map((option) => {
          const active = option.value === adminLang;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setAdminLang(option.value)}
              className={[
                "px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                active
                  ? "bg-[var(--color-primary)] text-white ring-[var(--color-primary)]"
                  : "bg-transparent text-[var(--color-text-admin-muted)] hover:bg-[var(--color-bg-hover)]",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={active}
            >
              {option.label.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
