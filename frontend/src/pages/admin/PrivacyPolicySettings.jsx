import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import privacyApi from "../../api/privacy.js";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Globe,
  Sparkles,
  ShieldCheck,
  GripVertical,
  Info,
  Tags,
  ToggleLeft,
  ToggleRight,
  Eye,
} from "lucide-react";
import { Link } from "react-router-dom";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
};

/* -------------------- PAGE -------------------- */

export default function PrivacySettings() {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_MODEL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const tips = useMemo(
    () => toArray(t("admin.privacy.tips.items", { returnObjects: true })),
    [t]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await privacyApi.manage();
        if (!mounted) return;
        setForm(normalizeIncoming(data));
      } catch (err) {
        setBanner({
          variant: "danger",
          message:
            extractMessage(err, t) || t("admin.privacy.messages.loadError"),
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [t]);

  const canSave = useMemo(() => !!form.heroTitle.trim(), [form.heroTitle]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = normalizeOutgoing(form);
      const updated = await privacyApi.upsert(payload);
      setForm(normalizeIncoming(updated));
      setBanner({
        variant: "success",
        message: t("admin.privacy.messages.saveSuccess"),
      });
    } catch (err) {
      setBanner({
        variant: "danger",
        message:
          extractMessage(err, t) || t("admin.privacy.messages.saveError"),
      });
    } finally {
      setSaving(false);
    }
  }

  function toggleActive() {
    setForm((p) => ({ ...p, isActive: !p.isActive }));
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* --- LEFT MAIN --- */}
      <div className="xl:col-span-8">
        {/* Header */}
        <div className="rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs text-[var(--color-text-admin-muted)]">
              <ShieldCheck className="h-4 w-4" />
              {t("admin.privacy.badge")}
            </div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-admin)]">
              {t("admin.privacy.headerTitle")}
            </h1>
            <p className="text-sm text-[var(--color-text-admin-muted)]">
              {t("admin.privacy.headerDescription.before")}
              <code className="rounded bg-[var(--color-bg-hover)] px-1 py-0.5">
                /privacy
              </code>
              {t("admin.privacy.headerDescription.after")}
            </p>
          </div>

          {banner && (
            <div
              className={`mt-4 rounded-xl border p-4 text-sm ${
                banner.variant === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {banner.message}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!canSave || saving || loading}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-text-admin)] px-5 py-2 text-sm font-semibold text-[var(--color-bg-admin)] hover:opacity-90 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving
                ? t("admin.privacy.buttons.saving")
                : t("admin.privacy.buttons.save")}
            </button>

            <Link
              to="/privacy"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-5 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
            >
              <Eye className="h-4 w-4" />
              {t("admin.privacy.buttons.preview")}
            </Link>

            <button
              onClick={toggleActive}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
            >
              {form.isActive ? (
                <>
                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                  {t("admin.privacy.buttons.active")}
                </>
              ) : (
                <>
                  <ToggleLeft className="h-4 w-4 text-rose-600" />
                  {t("admin.privacy.buttons.inactive")}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="mt-6 rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-[var(--color-text-admin-muted)]" />
            <h2 className="text-lg font-semibold">
              {t("admin.privacy.hero.cardTitle")}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-6">
              <Label>{t("admin.privacy.hero.fields.titleLabel")}</Label>
              <Input
                value={form.heroTitle}
                onChange={(e) =>
                  setForm((p) => ({ ...p, heroTitle: e.target.value }))
                }
                placeholder={t("admin.privacy.hero.fields.titlePlaceholder")}
              />
            </div>
            <div className="md:col-span-6">
              <Label>{t("admin.privacy.hero.fields.subtitleLabel")}</Label>
              <Input
                value={form.heroIntro}
                onChange={(e) =>
                  setForm((p) => ({ ...p, heroIntro: e.target.value }))
                }
                placeholder={t("admin.privacy.hero.fields.subtitlePlaceholder")}
              />
            </div>
          </div>
        </div>

        {/* Sections */}
        <SectionsEditor
          sections={form.sections}
          onChange={(next) => setForm((p) => ({ ...p, sections: next }))}
        />

        {/* Footer HTML */}
        <FooterEditor
          value={form.footerHtml}
          onChange={(v) => setForm((p) => ({ ...p, footerHtml: v }))}
        />

        {/* SEO */}
        <SEOEditor
          seo={form.seo}
          onChange={(next) => setForm((p) => ({ ...p, seo: next }))}
        />
      </div>

      {/* --- RIGHT SIDEBAR --- */}
      <aside className="xl:col-span-4">
        <div className="sticky top-4 rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
          <h3 className="text-lg font-semibold">
            {t("admin.privacy.tips.title")}
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-admin-muted)]">
            {tips.map((item, index) => (
              <li key={`privacy-tip-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

/* -------------------- COMPONENTS -------------------- */

function SectionsEditor({ sections = [], onChange }) {
  const { t } = useTranslation();
  function addSection() {
    onChange([...sections, { id: "", title: "", content: [""] }]);
  }
  function updateSection(i, patch) {
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function removeSection(i) {
    onChange(sections.filter((_, idx) => idx !== i));
  }
  function move(i, dir) {
    const t = i + dir;
    if (t < 0 || t >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(i, 1);
    next.splice(t, 0, item);
    onChange(next);
  }

  return (
    <div className="mt-6 rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--color-text-admin-muted)]" />
          <h2 className="text-lg font-semibold">
            {t("admin.privacy.sections.title")}
          </h2>
        </div>
        <button
          onClick={addSection}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-text-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-admin)] hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t("admin.privacy.sections.add")}
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border-admin)] p-6 text-sm text-[var(--color-text-admin-muted)]">
          {t("admin.privacy.sections.empty")}
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((s, i) => (
            <article
              key={i}
              className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)]/40 p-4"
            >
              <div className="flex justify-between">
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-admin-muted)]">
                  <GripVertical className="h-4 w-4" />
                  {t("admin.privacy.sections.itemLabel", { index: i + 1 })}
                </div>
                <div className="flex items-center gap-2">
                  <IconButton
                    onClick={() => move(i, -1)}
                    title={t("admin.privacy.sections.actions.moveUp")}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    onClick={() => move(i, +1)}
                    title={t("admin.privacy.sections.actions.moveDown")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    danger
                    title={t("admin.privacy.sections.actions.remove")}
                    onClick={() => removeSection(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Label>{t("admin.privacy.sections.idLabel")}</Label>
                  <Input
                    value={s.id}
                    onChange={(e) =>
                      updateSection(i, { id: e.target.value.trim() })
                    }
                    placeholder={t("admin.privacy.sections.idPlaceholder")}
                  />
                </div>
                <div className="md:col-span-8">
                  <Label>{t("admin.privacy.sections.titleLabel")}</Label>
                  <Input
                    value={s.title}
                    onChange={(e) =>
                      updateSection(i, { title: e.target.value })
                    }
                    placeholder={t("admin.privacy.sections.titlePlaceholder")}
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label>{t("admin.privacy.sections.contentLabel")}</Label>
                <MultiText
                  values={s.content || []}
                  onChange={(vals) => updateSection(i, { content: vals })}
                  placeholder={t("admin.privacy.sections.paragraphPlaceholder")}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function FooterEditor({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="mt-6 rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
      <h2 className="mb-4 text-lg font-semibold">
        {t("admin.privacy.footer.title")}
      </h2>
      <textarea
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("admin.privacy.footer.placeholder")}
        className="w-full rounded-2xl border border-[var(--color-border-admin)] bg-white px-4 py-3 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)] focus:ring-2 focus:ring-[var(--color-text-admin)]/10"
      />
    </div>
  );
}

function SEOEditor({ seo, onChange }) {
  const { t } = useTranslation();
  const [kwInput, setKwInput] = useState("");
  function addKeyword() {
    const v = kwInput.trim();
    if (!v) return;
    onChange({
      ...seo,
      keywords: Array.from(new Set([...(seo.keywords || []), v])),
    });
    setKwInput("");
  }
  function removeKeyword(k) {
    onChange({
      ...seo,
      keywords: (seo.keywords || []).filter((x) => x !== k),
    });
  }
  return (
    <div className="mt-6 rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
      <div className="mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-[var(--color-text-admin-muted)]" />
        <h2 className="text-lg font-semibold">
          {t("admin.privacy.seo.title")}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-6">
          <Label>{t("admin.privacy.seo.metaTitle")}</Label>
          <Input
            value={seo.title}
            onChange={(e) => onChange({ ...seo, title: e.target.value })}
            placeholder={t("admin.privacy.seo.metaTitlePlaceholder")}
          />
        </div>
        <div className="md:col-span-6">
          <Label>{t("admin.privacy.seo.metaDescription")}</Label>
          <Input
            value={seo.description}
            onChange={(e) => onChange({ ...seo, description: e.target.value })}
            placeholder={t("admin.privacy.seo.metaDescriptionPlaceholder")}
          />
        </div>
      </div>
      <div className="mt-4">
        <Label>{t("admin.privacy.seo.keywords")}</Label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {(seo.keywords || []).map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] px-3 py-1 text-xs font-semibold text-[var(--color-text-admin)]"
            >
              <Tags className="h-3.5 w-3.5" />
              {k}
              <button
                onClick={() => removeKeyword(k)}
                aria-label={t("admin.privacy.seo.removeKeyword")}
                className="rounded-full p-1 hover:bg-[var(--color-bg-hover)]"
              >
                ✕
              </button>
            </span>
          ))}
          <div className="inline-flex items-center gap-2">
            <input
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              placeholder={t("admin.privacy.seo.keywordPlaceholder")}
              className="rounded-full border border-[var(--color-border-admin)] bg-white px-3 py-1 text-xs outline-none focus:border-[var(--color-text-admin)]"
            />
            <button
              onClick={addKeyword}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs font-semibold hover:bg-[var(--color-bg-hover)]"
            >
              <Plus className="h-3.5 w-3.5" /> {t("admin.privacy.seo.addKeyword")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- TINY UI -------------------- */

function Label({ children }) {
  return (
    <label className="block text-sm font-semibold text-[var(--color-text-admin)]">
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder }) {
  return (
    <input
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      className="mt-2 w-full rounded-2xl border border-[var(--color-border-admin)] bg-white px-4 py-3 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)] focus:ring-2 focus:ring-[var(--color-text-admin)]/10"
    />
  );
}

function IconButton({ children, onClick, danger, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-full border px-2 py-1 text-[var(--color-text-admin)] transition hover:bg-[var(--color-bg-hover)] ${
        danger
          ? "border-rose-300 text-rose-600 hover:bg-rose-50"
          : "border-[var(--color-border-admin)]"
      }`}
    >
      {children}
    </button>
  );
}

function MultiText({ values = [], onChange, placeholder }) {
  const { t } = useTranslation();
  function setValue(i, v) {
    onChange(values.map((x, idx) => (idx === i ? v : x)));
  }
  function add() {
    onChange([...(values || []), ""]);
  }
  function remove(i) {
    onChange(values.filter((_, idx) => idx !== i));
  }
  function move(i, dir) {
    const target = i + dir;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    const [it] = next.splice(i, 1);
    next.splice(target, 0, it);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {(values || []).map((v, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea
            rows={3}
            value={v}
            onChange={(e) => setValue(i, e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-2xl border border-[var(--color-border-admin)] bg-white px-4 py-3 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)] focus:ring-2 focus:ring-[var(--color-text-admin)]/10"
          />
          <div className="mt-1 flex flex-col gap-1">
            <IconButton
              onClick={() => move(i, -1)}
              title={t("admin.privacy.sections.actions.moveUp")}
            >
              <ChevronUp className="h-4 w-4" />
            </IconButton>
            <IconButton
              onClick={() => move(i, +1)}
              title={t("admin.privacy.sections.actions.moveDown")}
            >
              <ChevronDown className="h-4 w-4" />
            </IconButton>
            <IconButton
              onClick={() => remove(i)}
              danger
              title={t("admin.privacy.sections.actions.remove")}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      ))}
      <button
        onClick={add}
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs font-semibold hover:bg-[var(--color-bg-hover)]"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("admin.privacy.sections.addParagraph")}
      </button>
    </div>
  );
}

/* -------------------- MODEL & NORMALIZERS -------------------- */

const EMPTY_MODEL = {
  heroTitle: "",
  heroIntro: "",
  sections: [], // [{id,title,content:[...]}]
  footerHtml: "",
  seo: { title: "", description: "", keywords: [] },
  isActive: true,
};

function normalizeIncoming(data) {
  const safe = { ...EMPTY_MODEL, ...(data || {}) };
  safe.heroTitle = String(safe.heroTitle || "");
  safe.heroIntro = String(safe.heroIntro || "");
  safe.footerHtml = String(safe.footerHtml || "");
  safe.sections = Array.isArray(safe.sections)
    ? safe.sections.map((s) => ({
        id: String(s?.id || "").trim(),
        title: String(s?.title || "").trim(),
        content: Array.isArray(s?.content)
          ? s.content.map((p) => String(p ?? ""))
          : [],
      }))
    : [];
  safe.seo = {
    title: String(safe.seo?.title || ""),
    description: String(safe.seo?.description || ""),
    keywords: Array.isArray(safe.seo?.keywords) ? safe.seo.keywords : [],
  };
  safe.isActive = safe.isActive !== false;
  return safe;
}

function normalizeOutgoing(form) {
  return {
    heroTitle: String(form.heroTitle || "").trim(),
    heroIntro: String(form.heroIntro || "").trim(),
    footerHtml: String(form.footerHtml || ""),
    sections: (form.sections || []).map((s) => ({
      id: String(s.id || "").trim(),
      title: String(s.title || "").trim(),
      content: (s.content || []).map((p) => String(p ?? "")),
    })),
    seo: {
      title: String(form.seo?.title || "").trim(),
      description: String(form.seo?.description || "").trim(),
      keywords: (form.seo?.keywords || []).map((k) => String(k ?? "")),
    },
    isActive: !!form.isActive,
  };
}

function extractMessage(err, t) {
  if (!err) return t("common.genericError");
  try {
    const parsed = JSON.parse(String(err.message || err));
    if (parsed?.message) return parsed.message;
  } catch {
    // ignore
  }
  return err?.message || t("common.genericError");
}
