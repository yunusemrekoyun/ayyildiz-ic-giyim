import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import AdminModal from "../common/AdminModal.jsx";
import AlertBanner from "../../ui/AlertBanner.jsx";
import { setApi } from "../../../api/sets.js";

const EMPTY_DRAFT = {
  name: "",
  description: "",
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

function createBaseDraft(setItem) {
  if (!setItem) return null;
  return {
    name: setItem.name ?? "",
    description: setItem.description ?? "",
  };
}

function createTranslationDrafts(setItem, langs = []) {
  const drafts = {};
  langs.forEach(({ value }) => {
    drafts[value] = { ...EMPTY_DRAFT };
  });

  if (!setItem) return drafts;
  const translations = setItem.translations || {};
  langs.forEach(({ value }) => {
    const t = translations[value] || {};
    drafts[value] = {
      name: t.name ?? "",
      description: t.description ?? "",
    };
  });

  return drafts;
}

export default function SetTranslationModal({
  open,
  loading,
  error,
  setItem,
  baseLang = "tr",
  langs = [],
  onClose,
  onUpdated,
}) {
  const [currentSet, setCurrentSet] = useState(setItem);
  const [drafts, setDrafts] = useState(() =>
    createTranslationDrafts(setItem, langs)
  );
  const [savingMap, setSavingMap] = useState({});
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setCurrentSet(setItem);
    setDrafts(createTranslationDrafts(setItem, langs));
    setSavingMap({});
    setAlert(null);
  }, [setItem, langs]);

  const baseDraft = useMemo(
    () => createBaseDraft(currentSet),
    [currentSet]
  );

  const savedDrafts = useMemo(
    () => createTranslationDrafts(currentSet, langs),
    [currentSet, langs]
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
    if (!currentSet) {
      setAlert({
        variant: "danger",
        message: "Set verisi bulunamadı. Lütfen pencereyi kapatıp tekrar deneyin.",
      });
      return;
    }
    const draft = drafts[lang] || EMPTY_DRAFT;
    setSavingMap((prev) => ({ ...prev, [lang]: true }));
    setAlert(null);
    try {
      const payload = {
        name: (draft.name ?? "").trim(),
        description: draft.description ?? "",
      };
      await setApi.update(currentSet, payload, lang);
      const refreshed = await setApi.get(currentSet, baseLang);
      setCurrentSet(refreshed);
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
      title="Set çevirileri"
      description={
        currentSet?.name
          ? `“${currentSet.name}” için diğer dillerde görünen metinleri düzenleyin.`
          : "Set çeviri varyantlarını yönetin."
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
      ) : !currentSet ? (
        <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-admin-muted)]">
          Set verisi bulunamadı.
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
            Bir çeviri kaydedilmezse müşteriler varsayılan Türkçe metni görmeye devam eder.
          </p>

          {langs.map(({ value, label }) => {
            const draft = drafts[value] || EMPTY_DRAFT;
            const saved = savedDrafts[value] || EMPTY_DRAFT;
            const isDirty =
              draft.name !== saved.name ||
              draft.description !== saved.description;
            const isSaving = Boolean(savingMap[value]);
            const summary = saved.name || "Türkçe metin kullanılıyor";

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
                      Kaydedilen başlık: {summary}
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
                      Set adı ({label})
                    </span>
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        handleFieldChange(value, "name", event.target.value)
                      }
                      maxLength={160}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="örn. Cozy Lounge Set"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Set açıklaması ({label})
                    </span>
                    <textarea
                      value={draft.description}
                      onChange={(event) =>
                        handleFieldChange(
                          value,
                          "description",
                          event.target.value
                        )
                      }
                      rows={4}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="Müşterilere bu set hakkında kısa bilgi verin."
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
