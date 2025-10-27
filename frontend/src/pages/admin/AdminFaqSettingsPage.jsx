// src/pages/admin/settings/AdminFaqSettingsPageInner.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DEFAULT_SITE_CODE, SITE_CODES } from "../../constants/sites.js";
import {
  FileQuestion,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  RefreshCcw,
  Type,
  MessageSquareText,
  Eye,
  Tags,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { faqApi } from "../../api/faq";

export default function AdminFaqSettingsPageInner() {
  const { lng } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [expanded, setExpanded] = useState({}); // section index -> open?

  const normalizedSite = (lng || DEFAULT_SITE_CODE).toLowerCase();
  const siteCode = SITE_CODES.includes(normalizedSite)
    ? normalizedSite
    : DEFAULT_SITE_CODE;

  // initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await faqApi.manage({ siteCode });
        if (mounted) {
          // sort güvenliği
          const sorted = {
            ...res,
            sections: [...(res.sections || [])]
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map((s) => ({
                ...s,
                items: [...(s.items || [])].sort(
                  (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
                ),
              })),
          };
          setData(sorted);
        }
      } catch (e) {
        setBanner({ ok: false, msg: e?.message || "Failed to load FAQ" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [siteCode]);

  const updateRoot = (patch) => setData((p) => ({ ...p, ...patch }));

  const toggleSection = (i) =>
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));

  const addSection = () => {
    const next = {
      title: "New Section",
      subtitle: "",
      isActive: true,
      sortOrder: (data?.sections?.length || 0) + 1,
      items: [],
    };
    updateRoot({ sections: [...(data?.sections || []), next] });
    setExpanded((prev) => ({ ...prev, [data?.sections?.length || 0]: true }));
  };

  const removeSection = (i) => {
    if (!confirm("Delete this section and its questions?")) return;
    const next = [...data.sections];
    next.splice(i, 1);
    updateRoot({ sections: next });
  };

  const updateSection = (i, patch) => {
    const next = [...data.sections];
    next[i] = { ...next[i], ...patch };
    updateRoot({ sections: next });
  };

  const addItem = (si) => {
    const sec = data.sections[si];
    const nextItem = {
      question: "New Question",
      answer: "",
      isActive: true,
      sortOrder: (sec.items?.length || 0) + 1,
    };
    updateSection(si, { items: [...(sec.items || []), nextItem] });
  };

  const updateItem = (si, qi, patch) => {
    const sec = data.sections[si];
    const items = [...(sec.items || [])];
    items[qi] = { ...items[qi], ...patch };
    updateSection(si, { items });
  };

  const removeItem = (si, qi) => {
    if (!confirm("Delete this question?")) return;
    const sec = data.sections[si];
    const items = [...(sec.items || [])];
    items.splice(qi, 1);
    updateSection(si, { items });
  };

  const save = async () => {
    setSaving(true);
    setBanner(null);
    try {
      // sortOrder’ları normalize et
      const normalized = {
        ...data,
        sections: (data.sections || []).map((s, si) => ({
          ...s,
          sortOrder: si + 1,
          items: (s.items || []).map((it, qi) => ({
            ...it,
            sortOrder: qi + 1,
          })),
        })),
      };
      const saved = await faqApi.upsert(normalized, { siteCode });
      setData(saved);
      setBanner({ ok: true, msg: "FAQ content saved successfully." });
    } catch (e) {
      setBanner({ ok: false, msg: e?.message || "Save failed" });
    } finally {
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const reset = async () => {
    if (!confirm("Discard changes and reload?")) return;
    setLoading(true);
    try {
      const fresh = await faqApi.manage({ siteCode });
      setData(fresh);
      setBanner(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-8 text-[var(--color-text-admin-muted)]">
        Loading FAQ configuration…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-8">
        <div className="rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6 shadow-sm">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs text-[var(--color-text-admin-muted)]">
              <FileQuestion className="h-4 w-4" />
              FAQ Settings
            </div>
            <h2 className="text-2xl font-semibold">FAQ Page Content</h2>
            <p className="text-sm text-[var(--color-text-admin-muted)]">
              Manage sections, questions & answers, and SEO metadata.
            </p>
          </div>

          {/* Banner */}
          {banner && (
            <div
              className={`mt-4 rounded-xl border p-3 text-sm ${
                banner.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {banner.msg}
            </div>
          )}

          {/* Global toggle */}
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)]/50 p-4">
            <div className="text-sm">
              <div className="font-semibold text-[var(--color-text-admin)]">
                Page Visibility
              </div>
              <div className="text-[var(--color-text-admin-muted)]">
                Toggle to publish/hide FAQ page globally.
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateRoot({ isActive: !data.isActive })}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--color-bg-hover)]"
            >
              {data.isActive ? (
                <>
                  <ToggleRight className="h-5 w-5 text-emerald-600" />
                  Active
                </>
              ) : (
                <>
                  <ToggleLeft className="h-5 w-5 text-rose-600" />
                  Inactive
                </>
              )}
            </button>
          </div>

          {/* Hero text */}
          <section className="mt-6 grid gap-4 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)]/50 p-5">
            <Field
              icon={Type}
              label="Hero Title"
              value={data.heroTitle || ""}
              onChange={(v) => updateRoot({ heroTitle: v })}
            />
            <TextArea
              icon={MessageSquareText}
              label="Intro / Hero Paragraph"
              value={data.heroIntro || ""}
              onChange={(v) => updateRoot({ heroIntro: v })}
              rows={3}
            />
          </section>

          {/* Sections */}
          <section className="mt-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text-admin)]">
                FAQ Sections
              </h3>
              <button
                onClick={addSection}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
              >
                <Plus className="h-4 w-4" /> Add Section
              </button>
            </div>

            {(data.sections || []).map((sec, si) => (
              <div
                key={si}
                className="overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] shadow-sm"
              >
                <button
                  onClick={() => toggleSection(si)}
                  className="flex w-full items-center justify-between border-b border-[var(--color-border-admin)] bg-white px-5 py-3 text-left hover:bg-[var(--color-bg-hover)]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        sec.isActive ? "bg-emerald-500" : "bg-rose-400"
                      }`}
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {sec.title || "Untitled section"}
                      </span>
                      {sec.subtitle ? (
                        <span className="text-xs text-[var(--color-text-admin-muted)]">
                          {sec.subtitle}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {expanded[si] ? (
                    <ChevronUp className="h-5 w-5 text-accent" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-[var(--color-text-admin-muted)]" />
                  )}
                </button>

                {expanded[si] && (
                  <div className="space-y-4 bg-[var(--color-bg-card)] p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Section Title"
                        value={sec.title || ""}
                        onChange={(v) => updateSection(si, { title: v })}
                      />
                      <Field
                        label="Subtitle"
                        value={sec.subtitle || ""}
                        onChange={(v) => updateSection(si, { subtitle: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-[var(--color-border-admin)]/70 bg-white px-3 py-2">
                      <div className="text-sm text-[var(--color-text-admin-muted)]">
                        Visibility
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateSection(si, { isActive: !sec.isActive })
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--color-bg-hover)]"
                      >
                        {sec.isActive ? (
                          <>
                            <ToggleRight className="h-4 w-4 text-emerald-600" />
                            Active
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 text-rose-600" />
                            Inactive
                          </>
                        )}
                      </button>
                    </div>

                    {/* Questions */}
                    <div className="mt-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Questions</h4>
                        <button
                          onClick={() => addItem(si)}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-2 py-1 text-xs font-semibold hover:bg-[var(--color-bg-hover)]"
                        >
                          <Plus className="h-3 w-3" /> Add Q&A
                        </button>
                      </div>

                      {(sec.items || []).map((it, qi) => (
                        <div
                          key={qi}
                          className="rounded-xl border border-[var(--color-border-admin)] bg-white p-3 transition hover:shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={it.question || ""}
                              onChange={(e) =>
                                updateItem(si, qi, { question: e.target.value })
                              }
                              placeholder="Question"
                              className="flex-1 rounded-md border-none bg-transparent text-sm font-medium outline-none"
                            />
                            <button
                              onClick={() =>
                                updateItem(si, qi, { isActive: !it.isActive })
                              }
                              className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                                it.isActive
                                  ? "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                                  : "border-rose-300 text-rose-600 hover:bg-rose-50"
                              }`}
                            >
                              {it.isActive ? "Active" : "Hidden"}
                            </button>
                            <button
                              onClick={() => removeItem(si, qi)}
                              className="rounded-full border border-rose-300 p-1.5 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={it.answer || ""}
                            onChange={(e) =>
                              updateItem(si, qi, { answer: e.target.value })
                            }
                            placeholder="Answer text"
                            className="mt-2 w-full rounded-md border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)] px-2 py-1 text-sm outline-none focus:border-accent"
                          />
                        </div>
                      ))}

                      {!sec.items?.length && (
                        <div className="rounded-xl border border-dashed border-[var(--color-border-admin)] p-3 text-center text-xs text-[var(--color-text-admin-muted)]">
                          No questions yet
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => removeSection(si)}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" /> Delete Section
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* SEO */}
          <section className="mt-8 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-admin)]/50 p-5">
            <h4 className="mb-2 text-lg font-semibold">SEO</h4>
            <Field
              icon={Eye}
              label="SEO Title"
              value={data.seo?.title || ""}
              onChange={(v) => updateRoot({ seo: { ...data.seo, title: v } })}
            />
            <TextArea
              label="SEO Description"
              value={data.seo?.description || ""}
              onChange={(v) =>
                updateRoot({ seo: { ...data.seo, description: v } })
              }
            />
            <Field
              icon={Tags}
              label="SEO Keywords (comma separated)"
              value={(data.seo?.keywords || []).join(", ")}
              onChange={(v) =>
                updateRoot({
                  seo: {
                    ...data.seo,
                    keywords: v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </section>

          {/* Save / Reset */}
          <div className="mt-6 flex justify-end gap-3 border-t border-[var(--color-border-admin)] pt-4">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-bg-hover)]"
            >
              <RefreshCcw className="h-4 w-4" /> Reset
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-text-admin)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bg-admin)] hover:opacity-90"
            >
              <Save className={`h-4 w-4 ${saving ? "animate-pulse" : ""}`} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="xl:col-span-4">
        <div className="sticky top-20 space-y-6">
          <TipsCard />
          <PreviewCard data={data} />
        </div>
      </aside>
    </div>
  );
}

/* ---- atoms ---- */
function Field({ icon: Icon, label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-[var(--color-text-admin-muted)]">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        {Icon && (
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3, icon: Icon }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-[var(--color-text-admin-muted)]">
        {label}
      </label>
      <div className="mt-1 flex items-start gap-2">
        {Icon && (
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </div>
    </div>
  );
}

function TipsCard() {
  return (
    <div className="rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6 shadow-sm">
      <h3 className="text-lg font-semibold">Tips</h3>
      <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-admin-muted)]">
        <li>Group similar topics (Orders, Shipping, Returns…)</li>
        <li>Keep questions concise and scannable.</li>
        <li>Answers should be short and clear.</li>
        <li>SEO description ~150 chars.</li>
      </ul>
    </div>
  );
}

function PreviewCard({ data }) {
  const totalQ =
    data?.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || 0;
  return (
    <div className="rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6 shadow-sm">
      <h3 className="text-lg font-semibold">Overview</h3>
      <div className="mt-3 space-y-1 text-sm text-[var(--color-text-admin-muted)]">
        <p>
          <strong>{data?.sections?.length || 0}</strong> sections
        </p>
        <p>
          <strong>{totalQ}</strong> total questions
        </p>
        <p>
          Last updated:{" "}
          {new Date(data?.updatedAt || Date.now()).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
