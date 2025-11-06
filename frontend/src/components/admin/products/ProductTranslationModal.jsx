import { useEffect, useMemo, useState } from "react";
import { Loader2, Languages } from "lucide-react";
import AdminModal from "../common/AdminModal.jsx";
import AlertBanner from "../../ui/AlertBanner.jsx";
import { productApi } from "../../../api/products.js";
import {
  buildProductState,
  createBaseDraft,
  createTranslationDrafts,
  splitTextToArray,
} from "./productTranslationUtils.js";

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

const EMPTY_DRAFT = {
  name: "",
  description: "",
  careInstructions: "",
  details: "",
  customAttributeTitle: "",
  customAttributeValues: "",
};

export default function ProductTranslationModal({
  open,
  loading,
  error,
  product,
  baseLang = "tr",
  langs = [],
  onClose,
  onUpdated,
}) {
  const [currentProduct, setCurrentProduct] = useState(product);
  const [drafts, setDrafts] = useState(() => createTranslationDrafts(product, langs));
  const [savingMap, setSavingMap] = useState({});
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setCurrentProduct(product);
    setDrafts(createTranslationDrafts(product, langs));
    setSavingMap({});
    setAlert(null);
  }, [product, langs]);

  const baseDraft = useMemo(
    () => createBaseDraft(currentProduct),
    [currentProduct]
  );

  const savedDrafts = useMemo(
    () => createTranslationDrafts(currentProduct, langs),
    [currentProduct, langs]
  );

  const hasCustomAttribute = Boolean(currentProduct?.customAttribute?.show);

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
    const identifier =
      currentProduct?.id ||
      currentProduct?._id ||
      currentProduct?.slug ||
      "";
    if (!identifier) {
      setAlert({
        variant: "danger",
        message:
          "Ürün kimliği bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.",
      });
      return;
    }
    setSavingMap((prev) => ({ ...prev, [lang]: true }));
    setAlert(null);
    try {
      const draft = drafts[lang] || EMPTY_DRAFT;
      const payload = {
        name: (draft.name ?? "").trim(),
        description: draft.description ?? "",
        careInstructions: draft.careInstructions ?? "",
        details: splitTextToArray(draft.details),
        customAttribute: {
          title: (draft.customAttributeTitle ?? "").trim(),
          values: splitTextToArray(draft.customAttributeValues),
          show: hasCustomAttribute,
        },
      };

      await productApi.update(identifier, payload, lang);
      const refreshed = await productApi.get(identifier, baseLang);
      const normalized = buildProductState(
        refreshed,
        refreshed?.inventory || currentProduct?.inventory || []
      );
      setCurrentProduct(normalized);
      setDrafts(createTranslationDrafts(normalized, langs));
      setAlert({
        variant: "success",
        message: `${lang.toUpperCase()} çevirisi kaydedildi`,
      });
      await onUpdated?.(normalized);
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
      title="Ürün çevirileri"
      description={currentProduct ? currentProduct.name : "Ürün varyantlarını düzenleyin"}
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
      ) : !currentProduct ? (
        <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-admin-muted)]">
          Ürün verisi bulunamadı.
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
            const draft = drafts[value] || EMPTY_DRAFT;
            const saved = savedDrafts[value] || EMPTY_DRAFT;
            const isDirty =
              draft.name !== saved.name ||
              draft.description !== saved.description ||
              draft.careInstructions !== saved.careInstructions ||
              draft.details !== saved.details ||
              draft.customAttributeTitle !== saved.customAttributeTitle ||
              draft.customAttributeValues !== saved.customAttributeValues;
            const isSaving = Boolean(savingMap[value]);
            const summary = saved.name || "Türkçe metin kullanılıyor";

            return (
              <div
                key={value}
                className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)]"
              >
                <div className="flex flex-col gap-3 border-b border-[var(--color-border-admin)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-admin)]">
                      <Languages className="mr-2 inline h-4 w-4 text-[var(--color-text-admin-muted)]" />
                      {label}
                    </p>
                    <p className="text-xs text-[var(--color-text-admin-muted)]">
                      Kaydedilen: {summary}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                      Ürün adı ({label})
                    </span>
                    <input
                      value={draft.name}
                      onChange={(event) => handleFieldChange(value, "name", event.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="Lüks İpek Pijama"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Açıklama
                    </span>
                    <textarea
                      rows={3}
                      value={draft.description}
                      onChange={(event) => handleFieldChange(value, "description", event.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="Ürün sayfasında gösterilen kısa tanıtım."
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Bakım talimatları
                    </span>
                    <textarea
                      rows={3}
                      value={draft.careInstructions}
                      onChange={(event) => handleFieldChange(value, "careInstructions", event.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="Örneğin: Elde soğuk yıkayın, kurutma makinesi kullanmayın"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Detaylar (her satır bir madde)
                    </span>
                    <textarea
                      rows={4}
                      value={draft.details}
                      onChange={(event) => handleFieldChange(value, "details", event.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="Her satıra bir madde yazın"
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                        Özellik başlığı
                      </span>
                      <input
                        value={draft.customAttributeTitle}
                        onChange={(event) => handleFieldChange(value, "customAttributeTitle", event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)] disabled:opacity-60"
                        placeholder="Örn. Malzeme"
                        disabled={!hasCustomAttribute}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                        Özellik değerleri (her satır bir seçenek)
                      </span>
                      <textarea
                        rows={hasCustomAttribute ? 3 : 1}
                        value={draft.customAttributeValues}
                        onChange={(event) => handleFieldChange(value, "customAttributeValues", event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)] disabled:opacity-60"
                        placeholder="Örn. Pamuk, Saten"
                        disabled={!hasCustomAttribute}
                      />
                    </label>
                  </div>

                  {!hasCustomAttribute && (
                    <p className="text-xs text-[var(--color-text-admin-muted)]">
                      Bu üründe özel özellik seçeneği kullanılmıyor; başlık ve değerler boş bırakılabilir.
                    </p>
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
