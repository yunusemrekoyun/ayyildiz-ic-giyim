import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import AdminModal from "../common/AdminModal.jsx";
import AlertBanner from "../../ui/AlertBanner.jsx";
import { campaignApi } from "../../../api/campaigns.js";

const EMPTY_DRAFT = {
  name: "",
  description: "",
  badge: "",
  ctaText: "",
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

function createBaseDraft(campaign) {
  if (!campaign) return null;
  return {
    name: campaign.name ?? "",
    description: campaign.description ?? "",
    badge: campaign.badge ?? "",
    ctaText: campaign.ctaText ?? "",
  };
}

function createTranslationDrafts(campaign, langs = []) {
  const drafts = {};
  langs.forEach(({ value }) => {
    drafts[value] = { ...EMPTY_DRAFT };
  });

  if (!campaign) return drafts;
  const translations = campaign.translations || {};
  langs.forEach(({ value }) => {
    const t = translations[value] || {};
    drafts[value] = {
      name: t.name ?? "",
      description: t.description ?? "",
      badge: t.badge ?? "",
      ctaText: t.ctaText ?? "",
    };
  });

  return drafts;
}

export default function CampaignTranslationModal({
  open,
  loading,
  error,
  campaign,
  baseLang = "tr",
  langs = [],
  onClose,
  onUpdated,
}) {
  const [currentCampaign, setCurrentCampaign] = useState(campaign);
  const [drafts, setDrafts] = useState(() =>
    createTranslationDrafts(campaign, langs)
  );
  const [savingMap, setSavingMap] = useState({});
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setCurrentCampaign(campaign);
    setDrafts(createTranslationDrafts(campaign, langs));
    setSavingMap({});
    setAlert(null);
  }, [campaign, langs]);

  const baseDraft = useMemo(
    () => createBaseDraft(currentCampaign),
    [currentCampaign]
  );
  const savedDrafts = useMemo(
    () => createTranslationDrafts(currentCampaign, langs),
    [currentCampaign, langs]
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
    if (!currentCampaign?.id) {
      setAlert({
        variant: "danger",
        message:
          "Kampanya kimliği bulunamadı. Lütfen pencereyi kapatıp tekrar deneyin.",
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
        badge: draft.badge ?? "",
        ctaText: draft.ctaText ?? "",
      };
      await campaignApi.update(currentCampaign.id, payload, lang);
      const refreshed = await campaignApi.get(currentCampaign.id, baseLang);
      setCurrentCampaign(refreshed);
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
      title="Kampanya çevirileri"
      description={
        currentCampaign?.name
          ? `“${currentCampaign.name}” için diğer dillerde gösterilen içerikleri düzenleyin.`
          : "Kampanya çeviri varyantlarını yönetin."
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
      ) : !currentCampaign ? (
        <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-admin-muted)]">
          Kampanya verisi bulunamadı.
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
            Dil çevirisi kaydedilmezse kullanıcılar Türkçe metni görmeye devam
            eder.
          </p>

          {langs.map(({ value, label }) => {
            const draft = drafts[value] || EMPTY_DRAFT;
            const saved = savedDrafts[value] || EMPTY_DRAFT;
            const isDirty =
              draft.name !== saved.name ||
              draft.description !== saved.description ||
              draft.badge !== saved.badge ||
              draft.ctaText !== saved.ctaText;
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
                      {saved.name || "Türkçe metin kullanılıyor"}
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
                      value={draft.name}
                      onChange={(event) =>
                        handleFieldChange(value, "name", event.target.value)
                      }
                      maxLength={120}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="Örn. Yeni sezon görünümü"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                      Açıklama ({label})
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
                      rows={3}
                      className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      placeholder="Kısa kampanya açıklaması"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                        Rozet metni ({label})
                      </span>
                      <input
                        value={draft.badge}
                        onChange={(event) =>
                          handleFieldChange(value, "badge", event.target.value)
                        }
                        maxLength={40}
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                        placeholder="Örn. %15 OFF"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                        CTA metni ({label})
                      </span>
                      <input
                        value={draft.ctaText}
                        onChange={(event) =>
                          handleFieldChange(
                            value,
                            "ctaText",
                            event.target.value
                          )
                        }
                        maxLength={60}
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                        placeholder="Örn. Hemen keşfet"
                      />
                    </label>
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
