import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import AdminModal from "../common/AdminModal.jsx";
import AlertBanner from "../../ui/AlertBanner.jsx";
import { termsApi } from "../../../api/terms";

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
    title: section?.title ?? "",
    paragraphs: Array.isArray(section?.paragraphs)
      ? section.paragraphs.map((p) => String(p ?? ""))
      : [],
  }));
};

const createBaseSnapshot = (page = {}, baseLang = "tr") => {
  const translations = page?.translations || {};
  const baseSections = buildSectionsStructure(page);
  const trSections = Array.isArray(translations[baseLang]?.sections)
    ? translations[baseLang].sections.map((section) => ({
        title: section?.title ?? "",
        paragraphs: Array.isArray(section?.paragraphs)
          ? section.paragraphs.map((p) => String(p ?? ""))
          : [],
      }))
    : [];

  const mergedSections = baseSections.map((section, index) => {
    const localized = trSections[index];
    return {
      title: localized?.title || section.title || "",
      paragraphs: localized?.paragraphs?.length
        ? localized.paragraphs
        : section.paragraphs || [],
    };
  });

  return {
    heroTitle: translations[baseLang]?.heroTitle ?? page?.heroTitle ?? "",
    heroIntro: translations[baseLang]?.heroIntro ?? page?.heroIntro ?? "",
    sections: mergedSections,
    footerNote: translations[baseLang]?.footerNote ?? page?.footerNote ?? "",
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
    drafts[value] = {
      heroTitle: bucket.heroTitle ?? "",
      heroIntro: bucket.heroIntro ?? "",
      sections: structure.map((section, index) => {
        const localized = Array.isArray(bucket.sections)
          ? bucket.sections[index]
          : null;
        return {
          title: localized?.title ?? "",
          paragraphs: Array.isArray(localized?.paragraphs)
            ? localized.paragraphs.map((p) => String(p ?? ""))
            : [],
        };
      }),
      footerNote: bucket.footerNote ?? "",
      seo: {
        title: bucket.seo?.title ?? "",
        description: bucket.seo?.description ?? "",
        keywords: keywordsToText(bucket.seo?.keywords || []),
      },
    };
  });
  return drafts;
};

export default function TermsTranslationModal({
  open,
  loading,
  error,
  terms,
  baseLang = "tr",
  langs = [],
  onClose,
  onUpdated,
}) {
  const structure = useMemo(() => buildSectionsStructure(terms), [terms]);
  const baseSnapshot = useMemo(
    () => createBaseSnapshot(terms, baseLang),
    [terms, baseLang]
  );
  const [drafts, setDrafts] = useState(() =>
    createTranslationDrafts(terms, langs, structure)
  );
  const [savedDrafts, setSavedDrafts] = useState(() =>
    createTranslationDrafts(terms, langs, structure)
  );
  const [savingMap, setSavingMap] = useState({});
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const nextDrafts = createTranslationDrafts(terms, langs, structure);
    setDrafts(nextDrafts);
    setSavedDrafts(nextDrafts);
    setSavingMap({});
    setAlert(null);
  }, [terms, langs, structure]);

  const handleFieldChange = (lang, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        ...(prev[lang] ||
          createTranslationDrafts(terms, [lang], structure)[lang]),
        [field]: value,
      },
    }));
  };

  const handleSectionChange = (lang, index, field, value) => {
    setDrafts((prev) => {
      const existing =
        prev[lang] || createTranslationDrafts(terms, [lang], structure)[lang];
      const sections =
        existing.sections ||
        structure.map(() => ({ title: "", paragraphs: [] }));
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

const handleSeoFieldChange = (lang, field, value) => {
  setDrafts((prev) => {
    const existing =
      prev[lang] || createTranslationDrafts(terms, [lang], structure)[lang];
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

const updateParagraphDraft = (lang, sectionIndex, producer) => {
  setDrafts((prev) => {
    const fallback = createTranslationDrafts(terms, [lang], structure)[lang];
    const existing = prev[lang] || fallback;
    const sections =
      existing.sections?.length === structure.length
        ? existing.sections.map((section) => ({
            ...section,
            paragraphs: Array.isArray(section.paragraphs)
              ? [...section.paragraphs]
              : [],
          }))
        : structure.map(() => ({ title: "", paragraphs: [] }));

    const target = sections[sectionIndex] || { title: "", paragraphs: [] };
    const nextParagraphs = producer(
      Array.isArray(target.paragraphs) ? [...target.paragraphs] : []
    );
    sections[sectionIndex] = { ...target, paragraphs: nextParagraphs };

    return {
      ...prev,
      [lang]: {
        ...existing,
        sections,
      },
    };
  });
};

const handleParagraphChange = (lang, sectionIndex, paragraphIndex, value) => {
  updateParagraphDraft(lang, sectionIndex, (paragraphs) => {
    const next = [...paragraphs];
    while (next.length <= paragraphIndex) {
      next.push("");
    }
    next[paragraphIndex] = value;
    return next;
  });
};

const addParagraphField = (lang, sectionIndex) => {
  updateParagraphDraft(lang, sectionIndex, (paragraphs) => [...paragraphs, ""]);
};

const removeParagraphField = (lang, sectionIndex, paragraphIndex) => {
  updateParagraphDraft(lang, sectionIndex, (paragraphs) => {
    const next = [...paragraphs];
    if (paragraphIndex >= 0 && paragraphIndex < next.length) {
      next.splice(paragraphIndex, 1);
    }
    return next;
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
            title: section.title || "",
            paragraphs: [...(section.paragraphs || [])],
          })) || structure.map(() => ({ title: "", paragraphs: [] })),
        footerNote: baseSnapshot.footerNote || "",
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
      [lang]:
        savedDrafts[lang] ||
        createTranslationDrafts(terms, [lang], structure)[lang],
    }));
  };

  const buildPayloadFromDraft = (draft) => ({
    heroTitle: (draft.heroTitle || "").trim(),
    heroIntro: (draft.heroIntro || "").trim(),
    sections: (draft.sections || []).map((section) => ({
      title: (section.title || "").trim(),
      paragraphs: (section.paragraphs || [])
        .map((p) => p.trim())
        .filter(Boolean),
    })),
    footerNote: draft.footerNote || "",
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
      await termsApi.upsert(
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
      title="Kullanım Koşulları çevirileri"
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
      ) : !terms ? (
        <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-admin-muted)]">
          Kullanım koşulları içeriği bulunamadı.
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
            const draft =
              drafts[value] ||
              createTranslationDrafts(terms, [value], structure)[value];
            const saved =
              savedDrafts[value] ||
              createTranslationDrafts(terms, [value], structure)[value];
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
                      Son başlık: {draft.heroTitle || "(boş)"}
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
                        placeholder="Kullanım Koşulları"
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                        Hero girişi ({label})
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
                        placeholder="Kısa açıklama"
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
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
                        paragraphs: [],
                      };
                      const baseSection =
                        baseSnapshot.sections?.[index] || section;
                      const baseParagraphs = Array.isArray(
                        baseSection.paragraphs
                      )
                        ? baseSection.paragraphs
                        : [];
                      const translationParagraphs = Array.isArray(
                        current.paragraphs
                      )
                        ? current.paragraphs
                        : [];
                      const paragraphCount = Math.max(
                        baseParagraphs.length,
                        translationParagraphs.length,
                        1
                      );
                      return (
                        <div
                          key={`section-${index}`}
                          className="space-y-2 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-surface-light)] p-4"
                        >
                          <div className="text-xs font-semibold text-[var(--color-text-admin)]">
                            Bölüm {index + 1}
                          </div>
                          <p className="text-[11px] text-[var(--color-text-admin-muted)]">
                            TR başlık: {baseSection.title || "(boş)"}
                          </p>
                          <input
                            value={current.title}
                            onChange={(event) =>
                              handleSectionChange(
                                value,
                                index,
                                "title",
                                event.target.value
                              )
                            }
                            placeholder="Çeviri başlığı"
                            className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                          />
                          <div className="space-y-2">
                            {Array.from({
                              length: paragraphCount || 1,
                            }).map((_, paragraphIndex) => {
                              const trText =
                                baseParagraphs[paragraphIndex] || "";
                              const valueText =
                                translationParagraphs[paragraphIndex] || "";
                              const canRemove =
                                paragraphCount > 1 ||
                                paragraphIndex >= baseParagraphs.length;
                              return (
                                <div
                                  key={`section-${index}-paragraph-${paragraphIndex}`}
                                  className="space-y-1 rounded-xl border border-[var(--color-border-admin)] bg-white p-3"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold text-[var(--color-text-admin-muted)]">
                                      TR paragraf {paragraphIndex + 1}:{" "}
                                      <span className="font-normal text-[var(--color-text-admin)]">
                                        {trText || "(boş)"}
                                      </span>
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeParagraphField(
                                          value,
                                          index,
                                          paragraphIndex
                                        )
                                      }
                                      disabled={!canRemove}
                                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-40"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Sil
                                    </button>
                                  </div>
                                  <textarea
                                    rows={3}
                                    value={valueText}
                                    onChange={(event) =>
                                      handleParagraphChange(
                                        value,
                                        index,
                                        paragraphIndex,
                                        event.target.value
                                      )
                                    }
                                    placeholder="Çeviri paragrafı"
                                    className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                                  />
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => addParagraphField(value, index)}
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Paragraf ekle
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Alt not ({label})
                    </label>
                    <textarea
                      rows={3}
                      value={draft.footerNote || ""}
                      onChange={(event) =>
                        handleFieldChange(
                          value,
                          "footerNote",
                          event.target.value
                        )
                      }
                      placeholder="Alt bilgi veya not"
                      className="mt-1 w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
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
