import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import AdminModal from "../common/AdminModal.jsx";
import AlertBanner from "../../ui/AlertBanner.jsx";
import { aboutApi } from "../../../api/about.js";

const EMPTY_DRAFT = {
  heroTitle: "",
  heroSubtitle: "",
  materialsTitle: "",
  materialsText: "",
  materialsBullets: "",
  ctaTitle: "",
  ctaSubtitle: "",
  dotBlocks: [],
  stats: [],
  ctas: [],
};

const arrayToText = (value) =>
  Array.isArray(value) ? value.filter(Boolean).join("\n") : "";

const textToArray = (value) =>
  String(value || "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

function createBaseDraft(about) {
  if (!about) return null;
  return {
    heroTitle: about.heroTitle ?? "",
    heroSubtitle: about.heroSubtitle ?? "",
    materialsTitle: about.materialsTitle ?? "",
    materialsText: about.materialsText ?? "",
    materialsBullets: arrayToText(about.materialsBullets),
    ctaTitle: about.ctaTitle ?? "",
    ctaSubtitle: about.ctaSubtitle ?? "",
    dotBlocks: (about.dotBlocks || []).map((block) => ({
      title: block?.title ?? "",
      text: block?.text ?? "",
    })),
    stats: (about.stats || []).map((stat) => ({
      value: stat?.value ?? "",
      label: stat?.label ?? "",
    })),
    ctas: (about.ctas || []).map((cta) => ({
      text: cta?.text ?? "",
    })),
  };
}

function createTranslationDrafts(about, langs = []) {
  const baseDotBlocks = about?.dotBlocks || [];
  const baseStats = about?.stats || [];
  const baseCtas = about?.ctas || [];
  const drafts = {};

  langs.forEach(({ value }) => {
    const translation = about?.translations?.[value] || {};
    drafts[value] = {
      heroTitle: translation.heroTitle ?? "",
      heroSubtitle: translation.heroSubtitle ?? "",
      materialsTitle: translation.materialsTitle ?? "",
      materialsText: translation.materialsText ?? "",
      materialsBullets: arrayToText(translation.materialsBullets),
      ctaTitle: translation.ctaTitle ?? "",
      ctaSubtitle: translation.ctaSubtitle ?? "",
      dotBlocks: baseDotBlocks.map((_, idx) => {
        const localized = translation.dotBlocks?.[idx] || {};
        return {
          title: localized.title ?? "",
          text: localized.text ?? "",
        };
      }),
      stats: baseStats.map((_, idx) => {
        const localized = translation.stats?.[idx] || {};
        return {
          value: localized.value ?? "",
          label: localized.label ?? "",
        };
      }),
      ctas: baseCtas.map((_, idx) => {
        const localized = translation.ctas?.[idx] || {};
        return {
          text: localized.text ?? "",
        };
      }),
    };
  });

  return drafts;
}

export default function AboutTranslationModal({
  open,
  loading,
  error,
  about,
  baseLang = "tr",
  langs = [],
  onClose,
  onUpdated,
}) {
  const [currentAbout, setCurrentAbout] = useState(about);
  const [drafts, setDrafts] = useState(() =>
    createTranslationDrafts(about, langs)
  );
  const [savingMap, setSavingMap] = useState({});
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setCurrentAbout(about);
    setDrafts(createTranslationDrafts(about, langs));
    setSavingMap({});
    setAlert(null);
  }, [about, langs]);

  const baseDraft = useMemo(
    () => createBaseDraft(currentAbout),
    [currentAbout]
  );
  const baseDotBlocks = currentAbout?.dotBlocks || [];
  const baseStats = currentAbout?.stats || [];
  const baseCtas = currentAbout?.ctas || [];
  const savedDrafts = useMemo(
    () => createTranslationDrafts(currentAbout, langs),
    [currentAbout, langs]
  );

  const handleFieldChange = (lang, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        ...(prev[lang] || { ...EMPTY_DRAFT }),
        [field]: value,
      },
    }));
  };

  const handleNestedChange = (lang, field, index, key, value) => {
    setDrafts((prev) => {
      const existing = prev[lang] || { ...EMPTY_DRAFT };
      const list = Array.isArray(existing[field]) ? [...existing[field]] : [];
      const target = { ...(list[index] || {}) };
      target[key] = value;
      list[index] = target;
      return {
        ...prev,
        [lang]: {
          ...existing,
          [field]: list,
        },
      };
    });
  };

  const handleCopyFromBase = (lang) => {
    if (!baseDraft) return;
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        ...baseDraft,
        materialsBullets: baseDraft.materialsBullets ?? "",
      },
    }));
  };

  const handleReset = (lang) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: savedDrafts[lang] || { ...EMPTY_DRAFT },
    }));
  };

  const handleSave = async (lang) => {
    if (!currentAbout) {
      setAlert({
        variant: "danger",
        message: "Kayıt bulunamadı. Lütfen pencereyi kapatıp tekrar deneyin.",
      });
      return;
    }
    const draft = drafts[lang] || {};
    console.log("[TRANSLATION MODAL] save lang:", lang, "draft:", draft);
    setSavingMap((prev) => ({ ...prev, [lang]: true }));
    setAlert(null);
    try {
      const payload = {
        heroTitle: (draft.heroTitle ?? "").trim(),
        heroSubtitle: draft.heroSubtitle ?? "",
        materialsTitle: (draft.materialsTitle ?? "").trim(),
        materialsText: draft.materialsText ?? "",
        materialsBullets: textToArray(draft.materialsBullets),
        ctaTitle: (draft.ctaTitle ?? "").trim(),
        ctaSubtitle: draft.ctaSubtitle ?? "",
        dotBlocks: baseDotBlocks.map((_, idx) => ({
          title: (draft.dotBlocks?.[idx]?.title ?? "").trim(),
          text: draft.dotBlocks?.[idx]?.text ?? "",
        })),
        stats: baseStats.map((_, idx) => ({
          value: (draft.stats?.[idx]?.value ?? "").trim(),
          label: (draft.stats?.[idx]?.label ?? "").trim(),
        })),
        ctas: baseCtas.map((_, idx) => ({
          text: (draft.ctas?.[idx]?.text ?? "").trim(),
        })),
      };

      await aboutApi.updateTranslations(payload, lang);

      const normalizedDraft = {
        heroTitle: payload.heroTitle,
        heroSubtitle: payload.heroSubtitle,
        materialsTitle: payload.materialsTitle,
        materialsText: payload.materialsText,
        materialsBullets: arrayToText(payload.materialsBullets),
        ctaTitle: payload.ctaTitle,
        ctaSubtitle: payload.ctaSubtitle,
        dotBlocks: payload.dotBlocks.map((block) => ({
          title: block.title,
          text: block.text,
        })),
        stats: payload.stats.map((stat) => ({
          value: stat.value,
          label: stat.label,
        })),
        ctas: payload.ctas.map((cta) => ({
          text: cta.text,
        })),
      };

      setDrafts((prev) => ({
        ...prev,
        [lang]: normalizedDraft,
      }));

      setCurrentAbout((prev) => {
        if (!prev) return prev;
        const nextTranslations = {
          ...(prev.translations || {}),
          [lang]: {
            ...(prev.translations?.[lang] || {}),
            heroTitle: payload.heroTitle,
            heroSubtitle: payload.heroSubtitle,
            materialsTitle: payload.materialsTitle,
            materialsText: payload.materialsText,
            materialsBullets: payload.materialsBullets,
            ctaTitle: payload.ctaTitle,
            ctaSubtitle: payload.ctaSubtitle,
            dotBlocks: payload.dotBlocks,
            stats: payload.stats,
            ctas: payload.ctas,
          },
        };
        return {
          ...prev,
          translations: nextTranslations,
        };
      });

      const refreshed = await aboutApi.get(baseLang);
      const nextAbout = refreshed?.about || refreshed;
      setCurrentAbout(nextAbout);
      setAlert({
        variant: "success",
        message: `${lang.toUpperCase()} çevirisi kaydedildi`,
      });
      await onUpdated?.(nextAbout);
    } catch (err) {
      setAlert({ variant: "danger", message: extractMessage(err) });
    } finally {
      setSavingMap((prev) => ({ ...prev, [lang]: false }));
    }
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Hakkımızda çevirileri"
      description="Her dil için hero, hikaye ve CTA metinlerini düzenleyin. Boş bırakılan alanlarda Türkçe metin gösterilmeye devam eder."
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
      ) : !currentAbout ? (
        <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-admin-muted)]">
          Hakkımızda verisi bulunamadı.
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
            const draft = drafts[value] || { ...EMPTY_DRAFT };
            const saved = savedDrafts[value] || { ...EMPTY_DRAFT };
            const isDirty =
              JSON.stringify(draft) !== JSON.stringify(saved || {});
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
                      Kaydedilen başlık: {saved?.heroTitle || "Türkçe metin"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyFromBase(value)}
                      className="rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
                      disabled={!baseDraft}
                    >
                      TR'den kopyala
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReset(value)}
                      className="rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
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
                  <div className="grid gap-4 sm:grid-cols-2">
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
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                        placeholder="Örn. Zamansız zarafet"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                        CTA başlığı ({label})
                      </span>
                      <input
                        value={draft.ctaTitle}
                        onChange={(event) =>
                          handleFieldChange(
                            value,
                            "ctaTitle",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                        placeholder="Örn. Koleksiyonu keşfet"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Hero alt başlık ({label})
                    </span>
                    <textarea
                      value={draft.heroSubtitle}
                      onChange={(event) =>
                        handleFieldChange(
                          value,
                          "heroSubtitle",
                          event.target.value
                        )
                      }
                      rows={3}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="Kısa açıklama"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      CTA alt başlık ({label})
                    </span>
                    <textarea
                      value={draft.ctaSubtitle}
                      onChange={(event) =>
                        handleFieldChange(
                          value,
                          "ctaSubtitle",
                          event.target.value
                        )
                      }
                      rows={2}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="CTA açıklaması"
                    />
                  </label>

                  {baseDotBlocks.length > 0 && (
                    <div className="space-y-3 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-surface-light)] p-3">
                      <p className="text-xs font-semibold text-[var(--color-text-admin)]">
                        Hikaye blokları
                      </p>
                      {baseDotBlocks.map((block, idx) => (
                        <div
                          key={idx}
                          className="space-y-2 rounded-lg border border-dashed border-[var(--color-border-admin)] p-3"
                        >
                          <p className="text-xs text-[var(--color-text-admin-muted)]">
                            Blok {idx + 1}: {block.title || "Başlık yok"}
                          </p>
                          <input
                            value={draft.dotBlocks?.[idx]?.title ?? ""}
                            onChange={(event) =>
                              handleNestedChange(
                                value,
                                "dotBlocks",
                                idx,
                                "title",
                                event.target.value
                              )
                            }
                            placeholder="Yeni başlık"
                            className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                          />
                          <textarea
                            value={draft.dotBlocks?.[idx]?.text ?? ""}
                            onChange={(event) =>
                              handleNestedChange(
                                value,
                                "dotBlocks",
                                idx,
                                "text",
                                event.target.value
                              )
                            }
                            placeholder="Yeni metin"
                            rows={3}
                            className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {baseStats.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-surface-light)] p-3">
                      <p className="text-xs font-semibold text-[var(--color-text-admin)]">
                        İstatistik etiketleri
                      </p>
                      {baseStats.map((stat, idx) => (
                        <div key={idx} className="grid gap-2">
                          <span className="text-[11px] text-[var(--color-text-admin-muted)]">
                            Varsayılan değer: {stat.value}
                          </span>
                          <input
                            value={draft.stats?.[idx]?.value ?? ""}
                            onChange={(event) =>
                              handleNestedChange(
                                value,
                                "stats",
                                idx,
                                "value",
                                event.target.value
                              )
                            }
                            placeholder="Yeni değer"
                            className="rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                          />
                          <input
                            value={draft.stats?.[idx]?.label ?? ""}
                            onChange={(event) =>
                              handleNestedChange(
                                value,
                                "stats",
                                idx,
                                "label",
                                event.target.value
                              )
                            }
                            placeholder="Etiket"
                            className="rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-surface-light)] p-3">
                    <p className="text-xs font-semibold text-[var(--color-text-admin)]">
                      Materyaller bölümü
                    </p>
                    <input
                      value={draft.materialsTitle}
                      onChange={(event) =>
                        handleFieldChange(
                          value,
                          "materialsTitle",
                          event.target.value
                        )
                      }
                      placeholder="Materyaller başlığı"
                      className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                    />
                    <textarea
                      value={draft.materialsText}
                      onChange={(event) =>
                        handleFieldChange(
                          value,
                          "materialsText",
                          event.target.value
                        )
                      }
                      rows={3}
                      placeholder="Materyaller metni"
                      className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                    />
                    <textarea
                      value={draft.materialsBullets}
                      onChange={(event) =>
                        handleFieldChange(
                          value,
                          "materialsBullets",
                          event.target.value
                        )
                      }
                      rows={3}
                      placeholder="Madde başlıklarını her satıra bir tane gelecek şekilde girin."
                      className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                    />
                  </div>

                  {baseCtas.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-surface-light)] p-3">
                      <p className="text-xs font-semibold text-[var(--color-text-admin)]">
                        CTA kartları
                      </p>
                      {baseCtas.map((cta, idx) => (
                        <div key={idx} className="space-y-1">
                          <span className="text-[11px] text-[var(--color-text-admin-muted)]">
                            Link: {cta.to}
                          </span>
                          <input
                            value={draft.ctas?.[idx]?.text ?? ""}
                            onChange={(event) =>
                              handleNestedChange(
                                value,
                                "ctas",
                                idx,
                                "text",
                                event.target.value
                              )
                            }
                            placeholder="CTA metni"
                            className="rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminModal>
  );
}
