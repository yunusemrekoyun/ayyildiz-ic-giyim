import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import AdminModal from "../common/AdminModal.jsx";
import AlertBanner from "../../ui/AlertBanner.jsx";
import { faqApi } from "../../../api/faq.js";

const KEYWORDS_SEPARATOR = ", ";

const buildIdString = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && typeof value.toString === "function") {
    const str = value.toString();
    if (str && str !== "[object Object]") return str;
  }
  return null;
};

const buildSectionKey = (section, index = 0) =>
  buildIdString(section?.id) ??
  buildIdString(section?._id) ??
  section?.key ??
  `section_${index}`;

const buildItemKey = (item, parentKey, index = 0) =>
  buildIdString(item?.id) ??
  buildIdString(item?._id) ??
  item?.key ??
  `${parentKey}_item_${index}`;

const buildSectionsStructure = (faq) => {
  const sections = Array.isArray(faq?.sections) ? faq.sections : [];
  return sections.map((section, si) => {
    const key = buildSectionKey(section, si);
    return {
      key,
      _id: section?.id ?? section?._id ?? null,
      title: section?.title ?? "",
      subtitle: section?.subtitle ?? "",
      items: (Array.isArray(section?.items) ? section.items : []).map(
        (item, qi) => {
          const itemKey = buildItemKey(item, key, qi);
          return {
            key: itemKey,
            _id: item?.id ?? item?._id ?? null,
            question: item?.question ?? "",
            answer: item?.answer ?? "",
          };
        }
      ),
    };
  });
};

const createEmptyDraft = (structure = []) => {
  const sections = {};
  structure.forEach((section) => {
    sections[section.key] = {
      title: "",
      subtitle: "",
      items: section.items.reduce((acc, item) => {
        acc[item.key] = { question: "", answer: "" };
        return acc;
      }, {}),
    };
  });
  return {
    heroTitle: "",
    heroIntro: "",
    sections,
    seo: { title: "", description: "", keywords: "" },
  };
};

const normalizeSeoKeywords = (value) => {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(KEYWORDS_SEPARATOR);
  }
  return String(value ?? "");
};

const createBaseSnapshot = (faq, structure = []) => {
  const sections = {};
  structure.forEach((section) => {
    sections[section.key] = {
      title: section.title,
      subtitle: section.subtitle,
      items: section.items.reduce((acc, item) => {
        acc[item.key] = {
          question: item.question,
          answer: item.answer,
        };
        return acc;
      }, {}),
    };
  });
  return {
    heroTitle: faq?.heroTitle ?? "",
    heroIntro: faq?.heroIntro ?? "",
    sections,
    seo: {
      title: faq?.seo?.title ?? "",
      description: faq?.seo?.description ?? "",
      keywords: normalizeSeoKeywords(faq?.seo?.keywords || []),
    },
  };
};

const createTranslationDrafts = (faq, langs = [], structure = []) => {
  const translations = faq?.translations || {};
  const drafts = {};
  langs.forEach(({ value }) => {
    drafts[value] = buildDraftFromTranslation(translations[value], structure);
  });
  return drafts;
};

function buildDraftFromTranslation(translation, structure = []) {
  const draft = createEmptyDraft(structure);
  if (!translation) return draft;

  draft.heroTitle = translation.heroTitle ?? "";
  draft.heroIntro = translation.heroIntro ?? "";
  if (translation.seo) {
    draft.seo = {
      title: translation.seo.title ?? "",
      description: translation.seo.description ?? "",
      keywords: normalizeSeoKeywords(translation.seo.keywords),
    };
  }

  if (Array.isArray(translation.sections)) {
    const map = new Map();
    translation.sections.forEach((section, index) => {
      map.set(buildSectionKey(section, index), section);
    });
    // eslint-disable-next-line no-unused-vars
    structure.forEach((section, sectionIndex) => {
      const localized = map.get(section.key);
      if (!localized) return;
      const target = draft.sections[section.key] || {
        title: "",
        subtitle: "",
        items: {},
      };
      if (localized.title !== undefined) {
        target.title = localized.title ?? "";
      }
      if (localized.subtitle !== undefined) {
        target.subtitle = localized.subtitle ?? "";
      }
      if (Array.isArray(localized.items)) {
        const itemMap = new Map();
        localized.items.forEach((item, itemIndex) => {
          itemMap.set(buildItemKey(item, section.key, itemIndex), item);
        });
        // eslint-disable-next-line no-unused-vars
        section.items.forEach((item, itemIndex) => {
          const localizedItem = itemMap.get(item.key);
          const targetItem = target.items[item.key] || {
            question: "",
            answer: "",
          };
          if (localizedItem) {
            if (localizedItem.question !== undefined) {
              targetItem.question = localizedItem.question ?? "";
            }
            if (localizedItem.answer !== undefined) {
              targetItem.answer = localizedItem.answer ?? "";
            }
          }
          target.items[item.key] = targetItem;
        });
      }
      draft.sections[section.key] = target;
    });
  }

  return draft;
}

const buildPayloadFromDraft = (draft, structure = []) => {
  const safeDraft = draft || createEmptyDraft(structure);
  const keywordArray = (safeDraft.seo?.keywords || "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    heroTitle: safeDraft.heroTitle?.trim?.() ?? "",
    heroIntro: safeDraft.heroIntro?.trim?.() ?? "",
    sections: structure.map((section) => {
      const source = safeDraft.sections?.[section.key] || {
        title: "",
        subtitle: "",
        items: {},
      };
      return {
        _id: section._id || section.key,
        title: source.title?.trim?.() ?? "",
        subtitle: source.subtitle?.trim?.() ?? "",
        items: section.items.map((item) => {
          const draftItem = source.items?.[item.key] || {
            question: "",
            answer: "",
          };
          return {
            _id: item._id || item.key,
            question: draftItem.question?.trim?.() ?? "",
            answer: draftItem.answer?.trim?.() ?? "",
          };
        }),
      };
    }),
    seo: {
      title: safeDraft.seo?.title?.trim?.() ?? "",
      description: safeDraft.seo?.description?.trim?.() ?? "",
      keywords: keywordArray,
    },
  };
};

export default function FaqTranslationModal({
  open,
  loading,
  error,
  faq,
  baseLang = "tr",
  langs = [],
  onClose,
  onUpdated,
}) {
  const baseLabel = (baseLang || "tr").toUpperCase();
  const [structure, setStructure] = useState(() => buildSectionsStructure(faq));
  const [drafts, setDrafts] = useState(() =>
    createTranslationDrafts(faq, langs, structure)
  );
  const [savedDrafts, setSavedDrafts] = useState(() =>
    createTranslationDrafts(faq, langs, structure)
  );
  const [savingMap, setSavingMap] = useState({});
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const nextStructure = buildSectionsStructure(faq);
    setStructure(nextStructure);
    const nextDrafts = createTranslationDrafts(faq, langs, nextStructure);
    setDrafts(nextDrafts);
    setSavedDrafts(nextDrafts);
    setSavingMap({});
    setAlert(null);
  }, [faq, langs]);

  const baseSnapshot = useMemo(
    () => createBaseSnapshot(faq, structure),
    [faq, structure]
  );

  const handleFieldChange = (lang, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        ...(prev[lang] || createEmptyDraft(structure)),
        [field]: value,
      },
    }));
  };

  const handleSectionFieldChange = (lang, sectionKey, field, value) => {
    setDrafts((prev) => {
      const existing = prev[lang] || createEmptyDraft(structure);
      const section = existing.sections?.[sectionKey] || {
        title: "",
        subtitle: "",
        items: {},
      };
      return {
        ...prev,
        [lang]: {
          ...existing,
          sections: {
            ...(existing.sections || {}),
            [sectionKey]: {
              ...section,
              [field]: value,
            },
          },
        },
      };
    });
  };

  const handleItemFieldChange = (lang, sectionKey, itemKey, field, value) => {
    setDrafts((prev) => {
      const existing = prev[lang] || createEmptyDraft(structure);
      const section = existing.sections?.[sectionKey] || {
        title: "",
        subtitle: "",
        items: {},
      };
      const item = section.items?.[itemKey] || {
        question: "",
        answer: "",
      };
      return {
        ...prev,
        [lang]: {
          ...existing,
          sections: {
            ...(existing.sections || {}),
            [sectionKey]: {
              ...section,
              items: {
                ...(section.items || {}),
                [itemKey]: {
                  ...item,
                  [field]: value,
                },
              },
            },
          },
        },
      };
    });
  };

  const handleSeoFieldChange = (lang, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        ...(prev[lang] || createEmptyDraft(structure)),
        seo: {
          ...(prev[lang]?.seo || { title: "", description: "", keywords: "" }),
          [field]: value,
        },
      },
    }));
  };

  const handleCopyFromBase = (lang) => {
    if (!baseSnapshot) return;
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        heroTitle: baseSnapshot.heroTitle,
        heroIntro: baseSnapshot.heroIntro,
        sections: JSON.parse(JSON.stringify(baseSnapshot.sections || {})),
        seo: { ...baseSnapshot.seo },
      },
    }));
  };

  const handleReset = (lang) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: savedDrafts[lang] || createEmptyDraft(structure),
    }));
  };

  const handleSave = async (lang) => {
    const draft = drafts[lang] || createEmptyDraft(structure);
    setSavingMap((prev) => ({ ...prev, [lang]: true }));
    setAlert(null);
    try {
      const payload = buildPayloadFromDraft(draft, structure);
      await faqApi.upsert(
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
      title="SSS çevirileri"
      description={`Hero metinleri, bölümler ve SEO alanları seçilen dil için kaydedilir. Boş bırakılan alanlarda ${baseLabel} içerik gösterilmeye devam edilir.`}
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
      ) : !faq ? (
        <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-admin-muted)]">
          SSS içeriği bulunamadı.
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

          {!structure.length && (
            <div className="rounded-2xl border border-dashed border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-xs text-[var(--color-text-admin-muted)]">
              Henüz bölüm eklenmemiş. Önce Türkçe içerikte bölümler oluşturun.
            </div>
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-admin)] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-admin)]">
                      {label}
                    </p>
                    <p className="text-xs text-[var(--color-text-admin-muted)]">
                      Hero başlık: {draft.heroTitle || "(boş)"}
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
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="SSS başlığı"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Hero açıklaması ({label})
                    </span>
                    <textarea
                      rows={3}
                      value={draft.heroIntro}
                      onChange={(event) =>
                        handleFieldChange(
                          value,
                          "heroIntro",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="Kısa giriş metni"
                    />
                  </label>

                  {structure.map((section) => {
                    const sectionDraft = draft.sections?.[section.key] || {
                      title: "",
                      subtitle: "",
                      items: {},
                    };
                    const baseSection = baseSnapshot.sections?.[section.key];
                    return (
                      <div
                        key={section.key}
                        className="space-y-2 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-surface-light)] p-3"
                      >
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-semibold text-[var(--color-text-admin)]">
                            {section.title || "Bölüm"}
                          </p>
                          <span className="text-[11px] text-[var(--color-text-admin-muted)]">
                            Varsayılan başlık: {baseSection?.title || "—"}
                          </span>
                        </div>
                        <input
                          value={sectionDraft.title}
                          onChange={(event) =>
                            handleSectionFieldChange(
                              value,
                              section.key,
                              "title",
                              event.target.value
                            )
                          }
                          placeholder="Bölüm başlığı"
                          className="rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                        />
                        <input
                          value={sectionDraft.subtitle}
                          onChange={(event) =>
                            handleSectionFieldChange(
                              value,
                              section.key,
                              "subtitle",
                              event.target.value
                            )
                          }
                          placeholder="Alt başlık"
                          className="rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                        />

                        {section.items.map((item) => {
                          const baseItem = baseSection?.items?.[item.key];
                          const itemDraft = sectionDraft.items?.[item.key] || {
                            question: "",
                            answer: "",
                          };
                          return (
                            <div
                              key={item.key}
                              className="space-y-1 rounded-xl border border-[var(--color-border-admin)] bg-white p-3"
                            >
                              <p className="text-[11px] font-semibold text-[var(--color-text-admin-muted)]">
                                Soru: {baseItem?.question || "—"}
                              </p>
                              <input
                                value={itemDraft.question}
                                onChange={(event) =>
                                  handleItemFieldChange(
                                    value,
                                    section.key,
                                    item.key,
                                    "question",
                                    event.target.value
                                  )
                                }
                                placeholder="Çevirilmiş soru"
                                className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                              />
                              <p className="text-[11px] font-semibold text-[var(--color-text-admin-muted)]">
                                Cevap referansı
                              </p>
                              <textarea
                                rows={3}
                                value={itemDraft.answer}
                                onChange={(event) =>
                                  handleItemFieldChange(
                                    value,
                                    section.key,
                                    item.key,
                                    "answer",
                                    event.target.value
                                  )
                                }
                                placeholder="Çevirilmiş cevap"
                                className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  <div className="rounded-2xl border border-[var(--color-border-admin)] bg-white p-3">
                    <p className="mb-2 text-sm font-semibold text-[var(--color-text-admin)]">
                      SEO ({label})
                    </p>
                    <input
                      value={draft.seo?.title || ""}
                      onChange={(event) =>
                        handleSeoFieldChange(value, "title", event.target.value)
                      }
                      placeholder="SEO başlığı"
                      className="mb-2 w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
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
                      className="mb-2 w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
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
                      placeholder="Anahtar kelimeler (virgül ile ayırın)"
                      className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
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
