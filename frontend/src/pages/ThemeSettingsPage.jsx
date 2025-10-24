// src/pages/admin/ThemeSettingsPage.jsx
import { useEffect, useState } from "react";
import { themeApi } from "../api/theme";
import { applyThemeVars, presetToVars } from "../utils/theme";
import {
  CheckCircle2,
  Loader2,
  Save,
  PaintBucket,
  Sparkles,
} from "lucide-react";

/**
 * Hazır paletler: mevcut index.css'teki renkler "rose" preset’i olarak alındı.
 * İstersen burada palette’leri çoğaltabilirsin.
 */
const THEME_PRESETS = [
  {
    key: "rose",
    name: "Rose (Current)",
    store: {
      "--color-primary": "#5C2A35",
      "--color-secondary": "#8A4D5B",
      "--color-accent": "#D87C82",
      "--color-accent-hover": "#C4646D",
      "--color-surface": "#F0D9D9",
      "--color-surface-light": "#F9ECEC",
      "--color-surface-hover": "#FFF6F6",
      "--color-border": "#E1BFC2",
      "--color-contact-bg": "#FFF9F8",
    },
    admin: {
      "--color-bg-admin": "#FDF7F9",
      "--color-text-admin": "#3B0A24",
      "--color-bg-card": "#FFFFFF",
      "--color-bg-hover": "#FDE2E7",
      "--color-bg-sidebar": "#9D174D",
      "--color-text-sidebar": "#FFFFFF",
      "--color-text-admin-muted": "#6B7280",
      "--color-border-admin": "#FBCFE8",
    },
    swatch: ["#5C2A35", "#D87C82", "#F0D9D9", "#9D174D"],
  },
  {
    key: "forest",
    name: "Forest",
    store: {
      "--color-primary": "#064E3B",
      "--color-secondary": "#0F766E",
      "--color-accent": "#10B981",
      "--color-accent-hover": "#059669",
      "--color-surface": "#ECFDF5",
      "--color-surface-light": "#F0FFF9",
      "--color-surface-hover": "#FFFFFF",
      "--color-border": "#A7F3D0",
      "--color-contact-bg": "#F0FFF9",
    },
    admin: {
      "--color-bg-admin": "#F8FFFC",
      "--color-text-admin": "#052E27",
      "--color-bg-card": "#FFFFFF",
      "--color-bg-hover": "#D1FAE5",
      "--color-bg-sidebar": "#065F46",
      "--color-text-sidebar": "#FFFFFF",
      "--color-text-admin-muted": "#64748B",
      "--color-border-admin": "#A7F3D0",
    },
    swatch: ["#064E3B", "#10B981", "#ECFDF5", "#065F46"],
  },
  {
    key: "ocean",
    name: "Ocean",
    store: {
      "--color-primary": "#0C4A6E",
      "--color-secondary": "#0369A1",
      "--color-accent": "#38BDF8",
      "--color-accent-hover": "#0EA5E9",
      "--color-surface": "#F0F9FF",
      "--color-surface-light": "#F5FBFF",
      "--color-surface-hover": "#FFFFFF",
      "--color-border": "#BAE6FD",
      "--color-contact-bg": "#F5FBFF",
    },
    admin: {
      "--color-bg-admin": "#F7FBFF",
      "--color-text-admin": "#0B2A45",
      "--color-bg-card": "#FFFFFF",
      "--color-bg-hover": "#E0F2FE",
      "--color-bg-sidebar": "#0EA5E9",
      "--color-text-sidebar": "#FFFFFF",
      "--color-text-admin-muted": "#64748B",
      "--color-border-admin": "#BAE6FD",
    },
    swatch: ["#0C4A6E", "#38BDF8", "#F0F9FF", "#0EA5E9"],
  },
  {
    key: "grape",
    name: "Grape",
    store: {
      "--color-primary": "#4C1D95",
      "--color-secondary": "#6D28D9",
      "--color-accent": "#A78BFA",
      "--color-accent-hover": "#8B5CF6",
      "--color-surface": "#F5F3FF",
      "--color-surface-light": "#F8F7FF",
      "--color-surface-hover": "#FFFFFF",
      "--color-border": "#DDD6FE",
      "--color-contact-bg": "#F8F7FF",
    },
    admin: {
      "--color-bg-admin": "#FBFAFF",
      "--color-text-admin": "#2B1762",
      "--color-bg-card": "#FFFFFF",
      "--color-bg-hover": "#EDE9FE",
      "--color-bg-sidebar": "#6D28D9",
      "--color-text-sidebar": "#FFFFFF",
      "--color-text-admin-muted": "#6B7280",
      "--color-border-admin": "#E9D5FF",
    },
    swatch: ["#4C1D95", "#A78BFA", "#F5F3FF", "#6D28D9"],
  },
];

function PresetCard({ preset, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      className={[
        "w-full rounded-2xl border p-4 text-left transition",
        active
          ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30"
          : "border-[var(--color-border-admin)] hover:bg-[var(--color-bg-hover)]",
        "bg-[var(--color-bg-card)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold">{preset.name}</div>
        {active ? (
          <CheckCircle2 className="h-5 w-5 text-[var(--color-accent)]" />
        ) : (
          <PaintBucket className="h-5 w-5 text-[var(--color-text-admin-muted)]" />
        )}
      </div>
      <div className="mt-3 flex gap-2">
        {preset.swatch.map((c) => (
          <span
            key={c}
            className="h-7 w-7 rounded-md border border-[var(--color-border-admin)]"
            style={{ background: c }}
          />
        ))}
      </div>
    </button>
  );
}

export default function ThemeSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeKey, setActiveKey] = useState("rose"); // fallback
  const [previewKey, setPreviewKey] = useState(null);

  //   const activePreset = useMemo(
  //     () =>
  //       THEME_PRESETS.find((p) => p.key === (previewKey || activeKey)) ||
  //       THEME_PRESETS[0],
  //     [activeKey, previewKey]
  //   );

  // İlk yüklemede backend'deki aktif temayı çek
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const server = await themeApi.get();
        if (!mounted) return;

        const key = server?.activeKey || "rose";
        setActiveKey(key);

        // DOM'a uygula (sayfaya yansısın)
        const storeVars =
          server?.storeVars?.reduce(
            (acc, v) => ({ ...acc, [v.key]: v.value }),
            {}
          ) || {};
        const adminVars =
          server?.adminVars?.reduce(
            (acc, v) => ({ ...acc, [v.key]: v.value }),
            {}
          ) || {};
        applyThemeVars({ store: storeVars, admin: adminVars });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Önizleme: kullanıcı kartlara tıklayınca hemen DOM'a uygula
  useEffect(() => {
    if (!previewKey) return;
    const preset = THEME_PRESETS.find((p) => p.key === previewKey);
    if (!preset) return;
    applyThemeVars(presetToVars(preset));
  }, [previewKey]);

  async function handleSave() {
    const preset = THEME_PRESETS.find(
      (p) => p.key === (previewKey || activeKey)
    );
    if (!preset) return;

    setSaving(true);
    try {
      // backend'e storeVars/adminVars formatında gönder
      const body = {
        activeKey: preset.key,
        storeVars: Object.entries(preset.store).map(([key, value]) => ({
          key,
          value,
        })),
        adminVars: Object.entries(preset.admin).map(([key, value]) => ({
          key,
          value,
        })),
      };
      const saved = await themeApi.saveActive(body);

      // aktif anahtarı güncelle
      setActiveKey(saved?.activeKey || preset.key);
      setPreviewKey(null);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
        <div className="flex items-center gap-2 text-[var(--color-text-admin-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading theme…
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-8">
        <div className="rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs text-[var(--color-text-admin-muted)]">
              <Sparkles className="h-4 w-4" />
              Appearance
            </div>
            <h2 className="text-2xl font-semibold">Theme & Colors</h2>
            <p className="text-sm text-[var(--color-text-admin-muted)]">
              Pick a palette to instantly restyle storefront and admin surface.
              Your choice persists globally.
            </p>
          </div>

          {/* Preset grid */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {THEME_PRESETS.map((p) => (
              <PresetCard
                key={p.key}
                preset={p}
                active={(previewKey || activeKey) === p.key}
                onSelect={(pp) => setPreviewKey(pp.key)}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || (!previewKey && activeKey)}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-text-admin)] px-5 py-2 text-sm font-semibold text-[var(--color-bg-admin)] hover:opacity-90 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save as Active
            </button>
            {previewKey && (
              <button
                onClick={() => {
                  // önizlemeyi iptal et, aktif temayı geri bas
                  setPreviewKey(null);
                  const preset = THEME_PRESETS.find((p) => p.key === activeKey);
                  if (preset) applyThemeVars(presetToVars(preset));
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-5 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
              >
                Cancel Preview
              </button>
            )}
          </div>

          {/* Live preview card */}
          <div className="mt-8 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] p-5">
            <div className="text-sm text-[var(--color-text-admin-muted)]">
              Live preview
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-3">
                <div className="text-xs text-[var(--color-text-admin-muted)]">
                  Primary
                </div>
                <div
                  className="mt-2 h-10 rounded-lg"
                  style={{ background: "var(--color-primary)" }}
                />
              </div>
              <div className="rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-3">
                <div className="text-xs text-[var(--color-text-admin-muted)]">
                  Accent
                </div>
                <div
                  className="mt-2 h-10 rounded-lg"
                  style={{ background: "var(--color-accent)" }}
                />
              </div>
              <div className="rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-3">
                <div className="text-xs text-[var(--color-text-admin-muted)]">
                  Sidebar
                </div>
                <div
                  className="mt-2 h-10 rounded-lg"
                  style={{ background: "var(--color-bg-sidebar)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* tips */}
      <aside className="xl:col-span-4">
        <div className="rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
          <h3 className="text-lg font-semibold">Tips</h3>
          <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-admin-muted)]">
            <li>Preview lets you try palettes without saving.</li>
            <li>Saving makes your choice persistent for everyone.</li>
            <li>You can extend presets in code later.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
