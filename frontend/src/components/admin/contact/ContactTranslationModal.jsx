import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import AdminModal from "../../../components/admin/common/AdminModal.jsx";
import AlertBanner from "../../ui/AlertBanner.jsx";
import { contactPageApi } from "../../../api/contact.js";

const BLOCKS = [
  { key: "addressBlock", label: "Adres Bloğu" },
  { key: "hoursBlock", label: "Çalışma Saatleri Bloğu" },
  { key: "emailBlock", label: "E-posta Bloğu" },
  { key: "phoneBlock", label: "Telefon Bloğu" },
];

const arrayToText = (lines = []) =>
  Array.isArray(lines)
    ? lines
        .map((line) => String(line ?? "").trim())
        .filter(Boolean)
        .join("\n")
    : "";

const textToArray = (value) =>
  String(value || "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const emptyBlocks = () =>
  BLOCKS.reduce((acc, { key }) => {
    acc[key] = { title: "", lines: "" };
    return acc;
  }, {});

const EMPTY_DRAFT = {
  heroTitle: "",
  heroSubtitle: "",
  successMessage: "",
  blocks: emptyBlocks(),
};

function createBaseDraft(contact) {
  if (!contact) return null;
  const draft = {
    heroTitle: contact.heroTitle ?? "",
    heroSubtitle: contact.heroSubtitle ?? "",
    successMessage: contact.successMessage ?? "",
    blocks: emptyBlocks(),
  };
  BLOCKS.forEach(({ key }) => {
    const baseBlock = contact[key] || {};
    draft.blocks[key] = {
      title: baseBlock.title ?? "",
      lines: arrayToText(baseBlock.lines),
    };
  });
  return draft;
}

function createTranslationDrafts(contact, langs = []) {
  const drafts = {};
  langs.forEach(({ value }) => {
    drafts[value] = {
      ...EMPTY_DRAFT,
      blocks: emptyBlocks(),
    };
  });

  if (!contact) return drafts;

  langs.forEach(({ value }) => {
    const translation = contact.translations?.[value] || {};
    drafts[value] = {
      heroTitle: translation.heroTitle ?? "",
      heroSubtitle: translation.heroSubtitle ?? "",
      successMessage: translation.successMessage ?? "",
      blocks: BLOCKS.reduce((acc, { key }) => {
        const block = translation[key] || {};
        acc[key] = {
          title: block.title ?? "",
          lines: arrayToText(block.lines),
        };
        return acc;
      }, {}),
    };
  });

  return drafts;
}

export default function ContactTranslationModal({
  open,
  loading,
  error,
  contact,
  baseLang = "tr",
  langs = [],
  onClose,
  onUpdated,
}) {
  const [currentContact, setCurrentContact] = useState(contact);
  const [drafts, setDrafts] = useState(() =>
    createTranslationDrafts(contact, langs)
  );
  const [savingMap, setSavingMap] = useState({});
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setCurrentContact(contact);
    setDrafts(createTranslationDrafts(contact, langs));
    setSavingMap({});
    setAlert(null);
  }, [contact, langs]);

  const baseDraft = useMemo(
    () => createBaseDraft(currentContact),
    [currentContact]
  );
  const savedDrafts = useMemo(
    () => createTranslationDrafts(currentContact, langs),
    [currentContact, langs]
  );

  const handleFieldChange = (lang, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        ...(prev[lang] || { ...EMPTY_DRAFT, blocks: emptyBlocks() }),
        [field]: value,
        blocks: prev[lang]?.blocks || emptyBlocks(),
      },
    }));
  };

  const handleBlockChange = (lang, blockKey, field, value) => {
    setDrafts((prev) => {
      const existing = prev[lang] || { ...EMPTY_DRAFT, blocks: emptyBlocks() };
      const block = existing.blocks?.[blockKey] || { title: "", lines: "" };
      return {
        ...prev,
        [lang]: {
          ...existing,
          blocks: {
            ...(existing.blocks || {}),
            [blockKey]: {
              ...block,
              [field]: value,
            },
          },
        },
      };
    });
  };

  const handleCopyFromBase = (lang) => {
    if (!baseDraft) return;
    setDrafts((prev) => ({
      ...prev,
      [lang]: {
        heroTitle: baseDraft.heroTitle,
        heroSubtitle: baseDraft.heroSubtitle,
        successMessage: baseDraft.successMessage,
        blocks: BLOCKS.reduce((acc, { key }) => {
          acc[key] = {
            title: baseDraft.blocks[key].title,
            lines: baseDraft.blocks[key].lines,
          };
          return acc;
        }, {}),
      },
    }));
  };

  const handleReset = (lang) => {
    setDrafts((prev) => ({
      ...prev,
      [lang]: savedDrafts[lang] || { ...EMPTY_DRAFT, blocks: emptyBlocks() },
    }));
  };

  const handleSave = async (lang) => {
    const draft = drafts[lang] || { ...EMPTY_DRAFT, blocks: emptyBlocks() };
    setSavingMap((prev) => ({ ...prev, [lang]: true }));
    setAlert(null);
    try {
      const buildBlockPayload = (blockKey) => ({
        title: (draft.blocks?.[blockKey]?.title ?? "").trim(),
        lines: textToArray(draft.blocks?.[blockKey]?.lines ?? ""),
      });

      const payload = {
        heroTitle: (draft.heroTitle ?? "").trim(),
        heroSubtitle: draft.heroSubtitle ?? "",
        successMessage: draft.successMessage ?? "",
        addressBlock: buildBlockPayload("addressBlock"),
        hoursBlock: buildBlockPayload("hoursBlock"),
        emailBlock: buildBlockPayload("emailBlock"),
        phoneBlock: buildBlockPayload("phoneBlock"),
      };

      await contactPageApi.upsert(
        { translations: JSON.stringify({ [lang]: payload }) },
        lang
      );
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
      title="İletişim çevirileri"
      description="Hero metinleri, blok başlıkları ve mesajlar seçilen dil için kaydedilir. Boş bırakılan alanlarda Türkçe metinler görüntülenir."
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
      ) : !currentContact ? (
        <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-6 text-center text-sm text-[var(--color-text-admin-muted)]">
          İletişim ayarları bulunamadı.
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
            const draft = drafts[value] || {
              ...EMPTY_DRAFT,
              blocks: emptyBlocks(),
            };
            const saved = savedDrafts[value] || {
              ...EMPTY_DRAFT,
              blocks: emptyBlocks(),
            };
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
                      Son kaydedilen başlık: {saved.heroTitle || "Türkçe metin"}
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
                        placeholder="Örn. Bize ulaşın"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--color-text-admin-muted)]">
                        Başarılı form mesajı ({label})
                      </span>
                      <input
                        value={draft.successMessage}
                        onChange={(event) =>
                          handleFieldChange(
                            value,
                            "successMessage",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                        placeholder="Teşekkür mesajı"
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

                  {BLOCKS.map(({ key, label: blockLabel }) => {
                    const baseBlock = currentContact?.[key] || {
                      title: "",
                      lines: [],
                    };
                    const blockDraft = draft.blocks?.[key] || {
                      title: "",
                      lines: "",
                    };
                    return (
                      <div
                        key={key}
                        className="space-y-2 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-surface-light)] p-3"
                      >
                        <p className="text-xs font-semibold text-[var(--color-text-admin)]">
                          {blockLabel}
                        </p>
                        <span className="text-[11px] text-[var(--color-text-admin-muted)]">
                          Varsayılan başlık: {baseBlock.title || "—"}
                        </span>
                        <input
                          value={blockDraft.title}
                          onChange={(event) =>
                            handleBlockChange(
                              value,
                              key,
                              "title",
                              event.target.value
                            )
                          }
                          placeholder={`${blockLabel} başlığı`}
                          className="rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                        />
                        <span className="text-[11px] text-[var(--color-text-admin-muted)] whitespace-pre-line">
                          Varsayılan satırlar:
                          {"\n"}
                          {baseBlock.lines?.length
                            ? baseBlock.lines.join("\n")
                            : "—"}
                        </span>
                        <textarea
                          value={blockDraft.lines}
                          onChange={(event) =>
                            handleBlockChange(
                              value,
                              key,
                              "lines",
                              event.target.value
                            )
                          }
                          rows={4}
                          placeholder="Her satırı yeni bir satıra yazın"
                          className="rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminModal>
  );
}
