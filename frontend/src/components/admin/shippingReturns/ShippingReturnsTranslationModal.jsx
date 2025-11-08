import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import AdminModal from "../common/AdminModal.jsx";
import AlertBanner from "../../ui/AlertBanner.jsx";
import { shippingReturnsApi } from "../../../api/shippingReturns.js";

const KEYWORDS_SEPARATOR = ", ";

const joinParagraphs = (arr = []) => arr.filter(Boolean).join("\n\n");
const splitParagraphs = (value = "") =>
  value
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);

const joinLines = (arr = []) => arr.filter(Boolean).join("\n");
const splitLines = (value = "") =>
  value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const keywordsToText = (arr = []) =>
  arr.filter(Boolean).join(KEYWORDS_SEPARATOR);
const textToKeywords = (value = "") =>
  value
    .split(/[,\n]/)
    .map((token) => token.trim())
    .filter(Boolean);

const htmlToPlainText = (html = "") =>
  String(html || "")
    .replace(/<br\s*\/?>(\r?\n)?/gi, "\n")
    .replace(/<\/?p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();

const convertTextToHtml = (raw = "") => {
  const escaped = String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withBreaks = escaped.replace(/\n/g, "<br>");

  const withMailLinks = withBreaks.replace(
    /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi,
    `<a href="mailto:$1" class="text-accent underline">$1</a>`
  );

  return withMailLinks.replace(
    /\b(https?:\/\/[^\s<]+|www\.[^\s<]+)\b/gi,
    (match) => {
      const href = match.startsWith("http") ? match : `https://${match}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-accent underline">${match}</a>`;
    }
  );
};

const buildSectionsStructure = (page) => {
  const sections = Array.isArray(page?.sections) ? page.sections : [];
  return sections.map((section, index) => ({
    index,
    title: section?.title ?? "",
    paragraphs: Array.isArray(section?.paragraphs)
      ? section.paragraphs.map((p) => String(p ?? ""))
      : [],
    listHeading: section?.list?.heading ?? "",
    listItems: Array.isArray(section?.list?.items)
      ? section.list.items.map((item) => String(item ?? ""))
      : [],
  }));
};

const createEmptyDraft = (structure = []) => ({
  heroTitle: "",
  heroSubtitle: "",
  sections: structure.map(() => ({
    title: "",
    paragraphs: [],
    listHeading: "",
    listItems: [],
  })),
  quickFacts: [],
  sidebarContact: {
    hoursText: "",
    note: "",
  },
  seo: {
    title: "",
    description: "",
    keywords: "",
  },
});

const createBaseSnapshot = (page, baseLang = "tr") => {
  const translations = page?.translations || {};
  const trSnapshot = translations[baseLang] || {};
  const baseSections = buildSectionsStructure(page);
  const trSections = buildSectionsStructure({ sections: trSnapshot.sections });

  const mergedSections = baseSections.map((baseSection, index) => {
    const localized = trSections[index];
    return {
      title: localized?.title || baseSection.title || "",
      paragraphs: localized?.paragraphs?.length
        ? localized.paragraphs
        : baseSection.paragraphs || [],
      listHeading: localized?.listHeading || baseSection.listHeading || "",
      listItems: localized?.listItems?.length
        ? localized.listItems
        : baseSection.listItems || [],
    };
  });

  const baseQuickFacts = Array.isArray(page?.sidebar?.quickFacts)
    ? page.sidebar.quickFacts
    : [];

  const trQuickFacts = Array.isArray(trSnapshot.quickFacts)
    ? trSnapshot.quickFacts
    : [];

  const noteHtml =
    trSnapshot.sidebarContact?.note ??
    trSnapshot.sidebar?.helpBoxHtml ??
    page?.sidebar?.helpBoxHtml ??
    page?.sidebarContact?.note ??
    "";

  return {
    heroTitle: trSnapshot.heroTitle ?? page?.heroTitle ?? "",
    heroSubtitle:
      trSnapshot.heroSubtitle ??
      trSnapshot.heroIntro ??
      page?.heroSubtitle ??
      "",
    sections: mergedSections,
    quickFacts: trQuickFacts.length ? trQuickFacts : baseQuickFacts,
    sidebarContact: {
      hoursText:
        trSnapshot.sidebarContact?.hoursText ??
        page?.sidebarContact?.hoursText ??
        "",
      note: htmlToPlainText(noteHtml),
    },
    seo: {
      title: trSnapshot.seo?.title ?? page?.seo?.title ?? "",
      description: trSnapshot.seo?.description ?? page?.seo?.description ?? "",
      keywords: trSnapshot.seo?.keywords?.length
        ? trSnapshot.seo.keywords
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
      heroSubtitle: bucket.heroSubtitle ?? bucket.heroIntro ?? "",
      sections: structure.map((section, index) => {
        const tSection = Array.isArray(bucket.sections)
          ? bucket.sections[index]
          : null;
        return {
          title: tSection?.title ?? "",
          paragraphs: Array.isArray(tSection?.paragraphs)
            ? tSection.paragraphs.map((p) => String(p ?? ""))
            : [],
          listHeading: tSection?.list?.heading ?? "",
          listItems: Array.isArray(tSection?.list?.items)
            ? tSection.list.items.map((item) => String(item ?? ""))
            : [],
        };
      }),
      quickFacts: Array.isArray(bucket.quickFacts)
        ? bucket.quickFacts.map((item) => String(item ?? ""))
        : [],
      sidebarContact: {
        hoursText: bucket.sidebarContact?.hoursText ?? "",
        note: htmlToPlainText(
          bucket.sidebar?.helpBoxHtml ?? bucket.sidebarContact?.note ?? ""
        ),
      },
      seo: {
        title: bucket.seo?.title ?? "",
        description: bucket.seo?.description ?? "",
        keywords: keywordsToText(bucket.seo?.keywords || []),
      },
    };
  });
  return drafts;
};

export default function ShippingReturnsTranslationModal({
  open,
  loading,
  error,
  page,
  baseLang = "tr",
  langs = [],
  onClose,
  onUpdated,
}) {
  const structure = useMemo(() => buildSectionsStructure(page), [page]);
  const baseSnapshot = useMemo(
    () => createBaseSnapshot(page || {}, baseLang),
    [page, baseLang]
  );

  const [drafts, setDrafts] = useState(() =>
    createTranslationDrafts(page, langs, structure)
  );
  const [savedDrafts, setSavedDrafts] = useState(() =>
    createTranslationDrafts(page, langs, structure)
  );
  const [savingMap, setSavingMap] = useState({});
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const nextDrafts = createTranslationDrafts(page, langs, structure);
    setDrafts(nextDrafts);
    setSavedDrafts(nextDrafts);
    setSavingMap({});
    setAlert(null);
  }, [page, langs, structure]);

  const handleFieldChange = (lang, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        ...(prev[lang] || createEmptyDraft(structure)),
        [field]: value,
      },
    }));
  };

  const handleSectionChange = (lang, index, patch) => {
    setDrafts((prev) => {
      const existing = prev[lang] || createEmptyDraft(structure);
      const sections =
        existing.sections ||
        structure.map(() => ({
          title: "",
          paragraphs: [],
          listHeading: "",
          listItems: [],
        }));
      const nextSections = sections.map((section, idx) =>
        idx === index ? { ...section, ...patch } : section
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

  const handleQuickFactsChange = (lang, value) => {
    handleFieldChange(lang, "quickFacts", splitLines(value));
  };

  const handleSidebarFieldChange = (lang, field, value) => {
    setDrafts((prev) => {
      const existing = prev[lang] || createEmptyDraft(structure);
      return {
        ...prev,
        [lang]: {
          ...existing,
          sidebarContact: {
            ...(existing.sidebarContact || {}),
            [field]: value,
          },
        },
      };
    });
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
        heroSubtitle: baseSnapshot.heroSubtitle || "",
        sections: structure.map((section, index) => ({
          title: section.title || baseSnapshot.sections?.[index]?.title || "",
          paragraphs:
            baseSnapshot.sections?.[index]?.paragraphs?.map((p) =>
              String(p ?? "")
            ) ||
            section.paragraphs ||
            [],
          listHeading:
            baseSnapshot.sections?.[index]?.listHeading ||
            section.listHeading ||
            "",
          listItems:
            baseSnapshot.sections?.[index]?.listItems?.map((item) =>
              String(item ?? "")
            ) ||
            section.listItems ||
            [],
        })),
        quickFacts: baseSnapshot.quickFacts || [],
        sidebarContact: {
          hoursText: baseSnapshot.sidebarContact?.hoursText || "",
          note: htmlToPlainText(baseSnapshot.sidebarContact?.note || ""),
        },
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

  const buildPayloadFromDraft = (draft) => {
    const heroSubtitle = (draft.heroSubtitle || "").trim();
    const quickFacts = (draft.quickFacts || [])
      .map((item) => item.trim())
      .filter(Boolean);
    const noteHtml = convertTextToHtml(draft.sidebarContact?.note || "");

    return {
      heroTitle: (draft.heroTitle || "").trim(),
      heroSubtitle,
      heroIntro: heroSubtitle,
      sections: (draft.sections || []).map((section) => ({
        title: (section.title || "").trim(),
        paragraphs: (section.paragraphs || [])
          .map((p) => p.trim())
          .filter(Boolean),
        list: {
          heading: (section.listHeading || "").trim(),
          items: (section.listItems || [])
            .map((item) => item.trim())
            .filter(Boolean),
        },
      })),
      quickFacts,
      sidebar: {
        quickFacts,
        helpBoxHtml: noteHtml,
      },
      sidebarContact: {
        hoursText: (draft.sidebarContact?.hoursText || "").trim(),
        note: noteHtml,
      },
      seo: {
        title: (draft.seo?.title || "").trim(),
        description: (draft.seo?.description || "").trim(),
        keywords: textToKeywords(draft.seo?.keywords || ""),
      },
    };
  };

  const handleSave = async (lang) => {
    const targetDraft = drafts[lang];
    if (!targetDraft) return;
    setSavingMap((prev) => ({ ...prev, [lang]: true }));
    setAlert(null);
    try {
      const payload = buildPayloadFromDraft(targetDraft);
      await shippingReturnsApi.upsert(
        { translations: JSON.stringify({ [lang]: payload }) },
        lang
      );
      setSavedDrafts((prev) => ({
        ...prev,
        [lang]: targetDraft,
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

  const renderSections = (lang, draft) => {
    if (!structure.length) {
      return (
        <div className="rounded-2xl border border-dashed border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-xs text-[var(--color-text-admin-muted)]">
          Önce Türkçe içerikte en az bir bölüm ekleyin.
        </div>
      );
    }

    return structure.map((section, index) => {
      const current = draft.sections?.[index] || {
        title: "",
        paragraphs: [],
        listHeading: "",
        listItems: [],
      };
      const baseSection = baseSnapshot.sections?.[index] || section;
      return (
        <div
          key={`section-${index}`}
          className="space-y-3 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-surface-light)] p-4"
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
              handleSectionChange(lang, index, { title: event.target.value })
            }
            placeholder="Çeviri başlığı"
            className="w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
          />
          <div>
            <p className="text-[11px] text-[var(--color-text-admin-muted)]">
              TR paragraflar:{" "}
              {joinParagraphs(baseSection.paragraphs).slice(0, 140) || "(boş)"}
            </p>
            <textarea
              rows={4}
              value={joinParagraphs(current.paragraphs)}
              onChange={(event) =>
                handleSectionChange(lang, index, {
                  paragraphs: splitParagraphs(event.target.value),
                })
              }
              placeholder="Paragrafları iki satır boşlukla ayırın"
              className="mt-1 w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
            />
          </div>
          <div>
            <p className="text-[11px] text-[var(--color-text-admin-muted)]">
              TR liste başlığı: {baseSection.listHeading || "(boş)"}
            </p>
            <input
              value={current.listHeading}
              onChange={(event) =>
                handleSectionChange(lang, index, {
                  listHeading: event.target.value,
                })
              }
              placeholder="Liste başlığı"
              className="mt-1 w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
            />
            <textarea
              rows={3}
              value={joinLines(current.listItems)}
              onChange={(event) =>
                handleSectionChange(lang, index, {
                  listItems: splitLines(event.target.value),
                })
              }
              placeholder="Liste öğelerini her satıra bir tane gelecek şekilde yazın"
              className="mt-2 w-full rounded-lg border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
            />
          </div>
        </div>
      );
    });
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Kargo & İade çevirileri"
      description="Hero, içerik bölümleri ve kenar çubuğu metinleri seçtiğiniz dil için kaydedilir. Boş alanlar için Türkçe içerik gösterilmeye devam eder."
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
      ) : !page ? (
        <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-admin-muted)]">
          Kargo ve iade içeriği bulunamadı.
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
            const isSaving = Boolean(savingMap[value]);
            const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

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
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                        placeholder="Örn. Shipping & Returns"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                        Hero alt başlığı ({label})
                      </span>
                      <input
                        value={draft.heroSubtitle}
                        onChange={(event) =>
                          handleFieldChange(
                            value,
                            "heroSubtitle",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                        placeholder="Kısa açıklama"
                      />
                    </label>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Hızlı bilgiler ({label})
                    </p>
                    <textarea
                      rows={3}
                      value={joinLines(draft.quickFacts)}
                      onChange={(event) =>
                        handleQuickFactsChange(value, event.target.value)
                      }
                      placeholder="Her satıra bir madde yazın"
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                    />
                  </div>

                  {renderSections(value, draft)}

                  <div className="space-y-2 rounded-2xl border border-[var(--color-border-admin)] bg-white p-4">
                    <p className="text-sm font-semibold text-[var(--color-text-admin)]">
                      Yardım kutusu
                    </p>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                        Çalışma saatleri ({label})
                      </span>
                      <input
                        value={draft.sidebarContact?.hoursText || ""}
                        onChange={(event) =>
                          handleSidebarFieldChange(
                            value,
                            "hoursText",
                            event.target.value
                          )
                        }
                        placeholder="Örn. Mon–Fri 09:00–18:00"
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                        Yardım notu / HTML destekli ({label})
                      </span>
                      <textarea
                        rows={4}
                        value={draft.sidebarContact?.note || ""}
                        onChange={(event) =>
                          handleSidebarFieldChange(
                            value,
                            "note",
                            event.target.value
                          )
                        }
                        placeholder="Kısa destek mesajı..."
                        className="w-full rounded-2xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
                      />
                    </label>
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
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
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
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
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
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-text-admin)]"
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
