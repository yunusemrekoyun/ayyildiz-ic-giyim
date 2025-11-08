import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import AdminModal from "../common/AdminModal.jsx";
import AlertBanner from "../../ui/AlertBanner.jsx";
import privacyApi from "../../../api/privacy.js";

const joinParagraphs = (arr = []) => arr.filter(Boolean).join("\n\n");
const splitParagraphs = (value = "") =>
  value
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);

const keywordsToText = (arr = []) => arr.filter(Boolean).join(", ");
const textToKeywords = (value = "") =>
  value
    .split(/[,\n]/)
    .map((token) => token.trim())
    .filter(Boolean);

const buildSectionsStructure = (page) => {
  const sections = Array.isArray(page?.sections) ? page.sections : [];
  return sections.map((section, index) => ({
    index,
    id: section?.id || `section_${index}`,
    title: section?.title ?? "",
    content: Array.isArray(section?.content)
      ? section.content.map((p) => String(p ?? ""))
      : [],
  }));
};

const mapById = (sections = []) => {
  const map = new Map();
  if (!Array.isArray(sections)) return map;
  sections.forEach((section, index) => {
    const key = section?.id || `__idx_${index}`;
    map.set(key, {
      title: section?.title ?? "",
      content: Array.isArray(section?.content)
        ? section.content.map((p) => String(p ?? ""))
        : [],
    });
  });
  return map;
};

const createEmptyDraft = (structure = []) => ({
  heroTitle: "",
  heroIntro: "",
  sections: structure.map((section) => ({
    id: section.id,
    title: "",
    content: [],
  })),
  footerHtml: "",
  seo: {
    title: "",
    description: "",
    keywords: "",
  },
});

const createBaseSnapshot = (page = {}, baseLang = "tr") => {
  const translations = page?.translations || {};
  const baseSections = buildSectionsStructure(page);
  const trSections = mapById(translations[baseLang]?.sections || []);

  const mergedSections = baseSections.map((section) => {
    const localized = trSections.get(section.id);
    return {
      id: section.id,
      title: localized?.title || section.title || "",
      content: localized?.content?.length
        ? localized.content
        : section.content || [],
    };
  });

  return {
    heroTitle: translations[baseLang]?.heroTitle ?? page?.heroTitle ?? "",
    heroIntro: translations[baseLang]?.heroIntro ?? page?.heroIntro ?? "",
    sections: mergedSections,
    footerHtml: translations[baseLang]?.footerHtml ?? page?.footerHtml ?? "",
    seo: {
      title: translations[baseLang]?.seo?.title ?? page?.seo?.title ?? "",
      description:
        translations[baseLang]?.seo?.description ??
        page?.seo?.description ??
        "",
      keywords: translations[baseLang]?.seo?.keywords?.length
        ? translations[baseLang].seo.keywords
        : page?.seo?.keywords || [],
    },
  };
};

const createTranslationDrafts = (page, langs = [], structure = []) => {
  const translations = page?.translations || {};
  const drafts = {};
  langs.forEach(({ value }) => {
    const bucket = translations[value] || {};
    const sectionMap = mapById(bucket.sections || []);
    drafts[value] = {
      heroTitle: bucket.heroTitle ?? "",
      heroIntro: bucket.heroIntro ?? "",
      sections: structure.map((section) => ({
        id: section.id,
        title: sectionMap.get(section.id)?.title ?? "",
        content: sectionMap.get(section.id)?.content || [],
      })),
      footerHtml: bucket.footerHtml ?? "",
      seo: {
        title: bucket.seo?.title ?? "",
        description: bucket.seo?.description ?? "",
        keywords: keywordsToText(bucket.seo?.keywords || []),
      },
    };
  });
  return drafts;
};

export default function PrivacyTranslationModal({
  open,
  loading,
  error,
  privacy,
  baseLang = "tr",
  langs = [],
  onClose,
  onUpdated,
}) {
  const structure = useMemo(() => buildSectionsStructure(privacy), [privacy]);
  const baseSnapshot = useMemo(
    () => createBaseSnapshot(privacy, baseLang),
    [privacy, baseLang]
  );
  const [drafts, setDrafts] = useState(() =>
    createTranslationDrafts(privacy, langs, structure)
  );
  const [savedDrafts, setSavedDrafts] = useState(() =>
    createTranslationDrafts(privacy, langs, structure)
  );
  const [savingMap, setSavingMap] = useState({});
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const nextDrafts = createTranslationDrafts(privacy, langs, structure);
    setDrafts(nextDrafts);
    setSavedDrafts(nextDrafts);
    setSavingMap({});
    setAlert(null);
  }, [privacy, langs, structure]);

  const handleFieldChange = (lang, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        ...(prev[lang] || createEmptyDraft(structure)),
        [field]: value,
      },
    }));
  };

  const handleSectionFieldChange = (lang, index, field, value) => {
    setDrafts((prev) => {
      const existing = prev[lang] || createEmptyDraft(structure);
      const sections =
        existing.sections || createEmptyDraft(structure).sections;
      const nextSections = sections.map((section, idx) =>
        idx === index ? { ...section, [field]: value } : section
      );
      return {
        ...prev,
        [lang]: {
          ...existing,
          sections: nextSections,
        },
      };
    });
  };

  const handleSectionContentChange = (lang, index, value) => {
    const paragraphs = splitParagraphs(value);
    handleSectionFieldChange(lang, index, "content", paragraphs);
  };

  const handleSeoFieldChange = (lang, field, value) => {
    setDrafts((prev) => {
      const existing = prev[lang] || createEmptyDraft(structure);
      return {
        ...prev,
        [lang]: {
          ...existing,
          seo: {
            ...(existing.seo || {}),
            [field]: value,
          },
        },
      };
    });
  };

  const handleCopyFromBase = (lang) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        heroTitle: baseSnapshot.heroTitle || "",
        heroIntro: baseSnapshot.heroIntro || "",
        sections:
          baseSnapshot.sections?.map((section) => ({
            id: section.id,
            title: section.title || "",
            content: [...(section.content || [])],
          })) ||
          structure.map((section) => ({
            id: section.id,
            title: "",
            content: [],
          })),
        footerHtml: baseSnapshot.footerHtml || "",
        seo: {
          title: baseSnapshot.seo?.title || "",
          description: baseSnapshot.seo?.description || "",
          keywords: keywordsToText(baseSnapshot.seo?.keywords || []),
        },
      },
    }));
  };

  const handleReset = (lang) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: savedDrafts[lang] || createEmptyDraft(structure),
    }));
  };

  const buildPayloadFromDraft = (draft) => ({
    heroTitle: (draft.heroTitle || "").trim(),
    heroIntro: (draft.heroIntro || "").trim(),
    sections: structure.map((section, index) => {
      const source = draft.sections?.[index] || { title: "", content: [] };
      return {
        id: section.id,
        title: (source.title || "").trim(),
        content: (source.content || []).map((p) => p.trim()).filter(Boolean),
      };
    }),
    footerHtml: draft.footerHtml || "",
    seo: {
      title: (draft.seo?.title || "").trim(),
      description: (draft.seo?.description || "").trim(),
      keywords: textToKeywords(draft.seo?.keywords || ""),
    },
  });

  const handleSave = async (lang) => {
    const draft = drafts[lang];
    if (!draft) return;
    setSavingMap((prev) => ({ ...prev, [lang]: true }));
    setAlert(null);
    try {
      const payload = buildPayloadFromDraft(draft);
      await privacyApi.upsert(
        { translations: JSON.stringify({ [lang]: payload }) },
        lang
      );
      setSavedDrafts((prev) => ({
        ...prev,
        [lang]: draft,
      }));
      setAlert({
        variant: "success",
        message: `${lang.toUpperCase()} çevirisi kaydedildi`,
      });
      await onUpdated?.();
    } catch (err) {
      setAlert({
        variant: "danger",
        message: err?.message || "Çeviri kaydedilemedi",
      });
    } finally {
      setSavingMap((prev) => ({ ...prev, [lang]: false }));
    }
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Gizlilik Politikası çevirileri"
      description="Hero, bölümler, alt bilgi ve SEO metinleri seçtiğiniz dil için kaydedilir. Boş alanlarda Türkçe içerik gösterilmeye devam edilir."
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
        >
          Kapat
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[var(--color-text-admin-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="ml-2 text-sm">İçerik yükleniyor…</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
          {error}
        </div>
      ) : !privacy ? (
        <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-admin-muted)]">
          Gizlilik içeriği bulunamadı.
        </div>
      ) : (
        <div className="space-y-4">
          {alert && (
            <AlertBanner
              variant={alert.variant}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          )}

          {langs.map(({ value, label }) => {
            const draft = drafts[value] || createEmptyDraft(structure);
            const saved = savedDrafts[value] || createEmptyDraft(structure);
            const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);
            const isSaving = Boolean(savingMap[value]);

            return (
              <div
                key={value}
                className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-admin)] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-admin)]">
                      {label}
                    </p>
                    <p className="text-xs text-[var(--color-text-admin-muted)]">
                      Hero başlığı: {draft.heroTitle || "(boş)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyFromBase(value)}
                      className="rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
                    >
                      TR'den kopyala
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReset(value)}
                      className="rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
                      disabled={!isDirty}
                    >
                      Kaydedileni geri al
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave(value)}
                      className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                      disabled={!isDirty || isSaving}
                    >
                      {isSaving ? "Kaydediliyor" : "Kaydet"}
                    </button>
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                        Hero başlığı ({label})
                      </span>
                      <input
                        value={draft.heroTitle}
                        onChange={(event) =>
                          handleFieldChange(
                            value,
                            "heroTitle",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                        placeholder="Gizlilik Politikası"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                        Hero alt başlığı ({label})
                      </span>
                      <input
                        value={draft.heroIntro}
                        onChange={(event) =>
                          handleFieldChange(
                            value,
                            "heroIntro",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                        placeholder="Kısa açıklama"
                      />
                    </label>
                  </div>

                  {structure.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-xs text-[var(--color-text-admin-muted)]">
                      Önce Türkçe içerikte en az bir bölüm ekleyin.
                    </div>
                  ) : (
                    structure.map((section, index) => {
                      const current = draft.sections?.[index] || {
                        title: "",
                        content: [],
                      };
                      const baseSection =
                        baseSnapshot.sections?.[index] || section;
                      return (
                        <div
                          key={`section-${section.id || index}`}
                          className="space-y-2 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-surface-light)] p-4"
                        >
                          <div className="text-xs font-semibold text-[var(--color-text-admin)]">
                            Bölüm {index + 1} – {section.id || "(id yok)"}
                          </div>
                          <p className="text-[11px] text-[var(--color-text-admin-muted)]">
                            TR başlık: {baseSection.title || "(boş)"}
                          </p>
                          <input
                            value={current.title}
                            onChange={(event) =>
                              handleSectionFieldChange(
                                value,
                                index,
                                "title",
                                event.target.value
                              )
                            }
                            placeholder="Çeviri başlığı"
                            className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                          />
                          <p className="text-[11px] text-[var(--color-text-admin-muted)]">
                            TR içerik:{" "}
                            {joinParagraphs(baseSection.content).slice(
                              0,
                              160
                            ) || "(boş)"}
                          </p>
                          <textarea
                            rows={4}
                            value={joinParagraphs(current.content)}
                            onChange={(event) =>
                              handleSectionContentChange(
                                value,
                                index,
                                event.target.value
                              )
                            }
                            placeholder="Paragrafları iki satır boşlukla ayırın"
                            className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                          />
                        </div>
                      );
                    })
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Alt bilgi HTML ({label})
                    </label>
                    <textarea
                      rows={4}
                      value={draft.footerHtml || ""}
                      onChange={(event) =>
                        handleFieldChange(
                          value,
                          "footerHtml",
                          event.target.value
                        )
                      }
                      placeholder="HTML veya düz metin girebilirsiniz"
                      className="mt-1 w-full rounded-2xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                    />
                  </div>

                  <div className="space-y-2 rounded-2xl border border-[var(--color-border-admin)] bg-white p-4">
                    <p className="text-sm font-semibold text-[var(--color-text-admin)]">
                      SEO ({label})
                    </p>
                    <input
                      value={draft.seo?.title || ""}
                      onChange={(event) =>
                        handleSeoFieldChange(value, "title", event.target.value)
                      }
                      placeholder="SEO başlığı"
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                    />
                    <textarea
                      rows={3}
                      value={draft.seo?.description || ""}
                      onChange={(event) =>
                        handleSeoFieldChange(
                          value,
                          "description",
                          event.target.value
                        )
                      }
                      placeholder="SEO açıklaması"
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                    />
                    <input
                      value={draft.seo?.keywords || ""}
                      onChange={(event) =>
                        handleSeoFieldChange(
                          value,
                          "keywords",
                          event.target.value
                        )
                      }
                      placeholder="Anahtar kelimeler (virgülle ayırın)"
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminModal>
  );
}
