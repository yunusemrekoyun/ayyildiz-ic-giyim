import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import AdminModal from "../common/AdminModal.jsx";
import AlertBanner from "../../ui/AlertBanner.jsx";
import { heroApi } from "../../../api/heroes.js";

const EMPTY_DRAFT = {
  title: "",
  subtitle: "",
  buttonText: "",
};

function extractMessage(error) {
  if (!error) return "Beklenmeyen hata";
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.message) return parsed.message;
    } catch {
      /* ignore */
    }
    return error.message;
  }
  if (typeof error === "string") return error;
  return String(error);
}

function createBaseDraft(hero) {
  if (!hero) return null;
  return {
    title: hero.title ?? "",
    subtitle: hero.subtitle ?? "",
    buttonText: hero.buttonText ?? "",
  };
}

function createTranslationDrafts(hero, langs = []) {
  const drafts = {};
  langs.forEach(({ value }) => {
    drafts[value] = { ...EMPTY_DRAFT };
  });

  if (!hero) return drafts;
  const translations = hero.translations || {};
  langs.forEach(({ value }) => {
    const t = translations[value] || {};
    drafts[value] = {
      title: t.title ?? "",
      subtitle: t.subtitle ?? "",
      buttonText: t.buttonText ?? "",
    };
  });
  return drafts;
}

export default function HeroTranslationModal({
  open,
  loading,
  error,
  hero,
  baseLang = "tr",
  langs = [],
  onClose,
  onUpdated,
}) {
  const [currentHero, setCurrentHero] = useState(hero);
  const [drafts, setDrafts] = useState(() =>
    createTranslationDrafts(hero, langs)
  );
  const [savingMap, setSavingMap] = useState({});
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setCurrentHero(hero);
    setDrafts(createTranslationDrafts(hero, langs));
    setSavingMap({});
    setAlert(null);
  }, [hero, langs]);

  const baseDraft = useMemo(() => createBaseDraft(currentHero), [currentHero]);
  const savedDrafts = useMemo(
    () => createTranslationDrafts(currentHero, langs),
    [currentHero, langs]
  );

  const handleFieldChange = (lang, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        ...(prev[lang] || EMPTY_DRAFT),
        [field]: value,
      },
    }));
  };

  const handleCopyFromBase = (lang) => {
    if (!baseDraft) return;
    setDrafts((prev) => ({
      ...prev,
      [lang]: { ...baseDraft },
    }));
  };

  const handleReset = (lang) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: savedDrafts[lang] || { ...EMPTY_DRAFT },
    }));
  };

  const handleSave = async (lang) => {
    if (!currentHero || !currentHero.id) {
      setAlert({
        variant: "danger",
        message:
          "Hero kaydı bulunamadı. Lütfen pencereyi kapatıp tekrar deneyin.",
      });
      return;
    }

    const draft = drafts[lang] || EMPTY_DRAFT;
    setSavingMap((prev) => ({ ...prev, [lang]: true }));
    setAlert(null);
    try {
      const payload = {
        title: (draft.title ?? "").trim(),
        subtitle: draft.subtitle ?? "",
        buttonText: draft.buttonText ?? "",
      };
      await heroApi.update(currentHero.id, payload, lang);
      const refreshed = await heroApi.get(currentHero.id, baseLang);
      setCurrentHero(refreshed);
      setDrafts(createTranslationDrafts(refreshed, langs));
      setAlert({
        variant: "success",
        message: `${lang.toUpperCase()} çevirisi kaydedildi`,
      });
      await onUpdated?.(refreshed);
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
      title="Hero çevirileri"
      description={
        currentHero?.title
          ? `“${currentHero.title}” için farklı dil metinlerini yönetin.`
          : "Hero çeviri varyantlarını düzenleyin."
      }
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
      ) : !currentHero ? (
        <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-admin-muted)]">
          Hero verisi bulunamadı.
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

          <p className="text-xs text-[var(--color-text-admin-muted)]">
            Bir dil için çeviri kaydedilmezse ziyaretçiler Türkçe içerik görmeye
            devam eder.
          </p>

          {langs.map(({ value, label }) => {
            const draft = drafts[value] || EMPTY_DRAFT;
            const saved = savedDrafts[value] || EMPTY_DRAFT;
            const isDirty =
              draft.title !== saved.title ||
              draft.subtitle !== saved.subtitle ||
              draft.buttonText !== saved.buttonText;
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
                      Kaydedilen başlık:{" "}
                      {saved.title || "Türkçe metin kullanılıyor"}
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
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Başlık ({label})
                    </span>
                    <input
                      value={draft.title}
                      onChange={(event) =>
                        handleFieldChange(value, "title", event.target.value)
                      }
                      maxLength={160}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="Örn. Etkileyici başlık"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Alt başlık ({label})
                    </span>
                    <textarea
                      value={draft.subtitle}
                      onChange={(event) =>
                        handleFieldChange(value, "subtitle", event.target.value)
                      }
                      rows={3}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="Kısa açıklama"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Buton metni ({label})
                    </span>
                    <input
                      value={draft.buttonText}
                      onChange={(event) =>
                        handleFieldChange(
                          value,
                          "buttonText",
                          event.target.value
                        )
                      }
                      maxLength={60}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="Örn. Şimdi keşfet"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminModal>
  );
}
