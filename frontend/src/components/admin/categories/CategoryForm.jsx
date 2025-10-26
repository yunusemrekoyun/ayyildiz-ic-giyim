import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../../../i18n/config.js";

const BASE_LANGUAGE = SUPPORTED_LANGUAGES[0]?.code || "tr";
const BASE_LANGUAGE_LABEL =
  SUPPORTED_LANGUAGES.find((lang) => lang.code === BASE_LANGUAGE)?.label ||
  "Default";
const TRANSLATION_LANGUAGES = SUPPORTED_LANGUAGES.filter(
  (lang) => lang.code !== BASE_LANGUAGE
);

const createInitialLocalizedState = () =>
  TRANSLATION_LANGUAGES.reduce((acc, lang) => {
    acc[lang.code] = { name: "" };
    return acc;
  }, {});

export default function CategoryForm({
  category,
  parentOptions = [],
  onSubmit,
  onDelete,
  submitting = false,
  loading = false,
  onCancelEdit,
}) {
  const isEditing = Boolean(category?.id);
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [localized, setLocalized] = useState(() =>
    createInitialLocalizedState()
  );
  const [initialLocalizedCodes, setInitialLocalizedCodes] = useState([]);

  useEffect(() => {
    setName(category?.name ?? "");
    setParent(category?.parent ?? "");
    setRemoveImage(false);
    setImageFile(null);
    setPreviewUrl(category?.image?.url ?? "");
    setError("");
    const nextLocalized = createInitialLocalizedState();
    const existingCodes = [];
    TRANSLATION_LANGUAGES.forEach(({ code }) => {
      const entry = category?.localized?.[code];
      const value = entry?.name ?? "";
      nextLocalized[code] = { name: value };
      if (value && value.trim()) existingCodes.push(code);
    });
    setLocalized(nextLocalized);
    setInitialLocalizedCodes(existingCodes);
  }, [category]);

  useEffect(() => {
    if (!imageFile) return undefined;
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const parentHelper = useMemo(() => {
    if (!category) return t("admin.categories.parentHelperNone");
    if (category.level === 0) return t("admin.categories.parentHelperRoot");
    if (category.level === 1) return t("admin.categories.parentHelperSecond");
    return t("admin.categories.parentHelperLeaf");
  }, [category, t]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("admin.categories.errors.nameRequired"));
      return;
    }
    setError("");

    const payload = {
      name: name.trim(),
      parent: parent || "",
    };

    const localizedPayload = {};
    TRANSLATION_LANGUAGES.forEach(({ code }) => {
      const value = (localized[code]?.name || "").trim();
      if (value || initialLocalizedCodes.includes(code)) {
        localizedPayload[code] = { name: value };
      }
    });

    if (Object.keys(localizedPayload).length) {
      payload.localized = localizedPayload;
    }

    if (imageFile) payload.image = imageFile;
    if (isEditing && removeImage && !imageFile) payload.removeImage = true;

    await onSubmit?.(payload, {
      reset: () => {
        setName("");
        setParent("");
        setImageFile(null);
        setRemoveImage(false);
        setPreviewUrl("");
        setLocalized(createInitialLocalizedState());
        setInitialLocalizedCodes([]);
      },
    });
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("admin.categories.imageError"));
      return;
    }
    setImageFile(file);
    setRemoveImage(false);
  };

  const handleClearImage = () => {
    setImageFile(null);
    setPreviewUrl("");
    if (isEditing && category?.image) {
      setRemoveImage(true);
    }
  };

  const handleLocalizedNameChange = (langCode, value) => {
    setLocalized((prev) => ({
      ...prev,
      [langCode]: {
        ...(prev[langCode] || {}),
        name: value,
      },
    }));
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] shadow-sm">
      <div className="flex items-start justify-between border-b border-[var(--color-border-admin)] px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-admin)]">
            {isEditing
              ? t("admin.categories.formTitleEdit")
              : t("admin.categories.formTitleCreate")}
          </h3>
          <p className="text-sm text-[var(--color-text-admin-muted)]">
            {isEditing
              ? t("admin.categories.formSubtitleEdit")
              : t("admin.categories.formSubtitleCreate")}
          </p>
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
          >
            {t("admin.common.createNew")}
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
        {loading ? (
          <div className="space-y-3">
            <div className="h-11 animate-pulse rounded-xl bg-[var(--color-bg-hover)]" />
            <div className="h-11 animate-pulse rounded-xl bg-[var(--color-bg-hover)]" />
            <div className="h-32 animate-pulse rounded-xl bg-[var(--color-bg-hover)]" />
          </div>
        ) : (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                {t("admin.categories.name")}
                <span className="text-[var(--color-accent)]">*</span>
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                placeholder={t("admin.categories.namePlaceholder")}
              />
            </label>

            {TRANSLATION_LANGUAGES.length > 0 && (
              <div className="rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-[var(--color-text-admin)]">
                    {t("admin.categories.addTranslation")}
                  </span>
                  <p className="text-xs text-[var(--color-text-admin-muted)]">
                    {t("admin.categories.translationHelper", {
                      base: BASE_LANGUAGE_LABEL,
                    })}
                  </p>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {TRANSLATION_LANGUAGES.map(({ code, label }) => (
                    <label key={code} className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-admin-muted)]">
                        {label}
                      </span>
                      <input
                        value={localized[code]?.name || ""}
                        onChange={(event) =>
                          handleLocalizedNameChange(code, event.target.value)
                        }
                        maxLength={120}
                        className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                        placeholder={label}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                {t("admin.categories.parent")}
              </span>
              <select
                value={parent || ""}
                onChange={(event) => setParent(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
              >
                <option value="">{t("admin.categories.noParent")}</option>
                {parentOptions.map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                    disabled={option.disabled}
                  >
                    {"".padStart(option.level * 3, " ")}
                    {option.level > 0 ? "• " : ""}
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[var(--color-text-admin-muted)]">
                {parentHelper}
              </p>
            </label>

            <div>
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                {t("admin.categories.thumbnail")}
              </span>
              <p className="mb-2 text-xs text-[var(--color-text-admin-muted)]">
                {t("admin.categories.thumbnailHelp")}
              </p>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--color-border-admin)] px-4 py-3 text-sm text-[var(--color-text-admin)] hover:border-[var(--color-text-admin)]">
                  <Upload className="h-4 w-4" />
                  {t("admin.categories.upload")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
                {(previewUrl || category?.image) && (
                  <div className="relative overflow-hidden rounded-xl border border-[var(--color-border-admin)]">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="h-24 w-24 object-cover"
                      />
                    ) : (
                      <div className="grid h-24 w-24 place-items-center bg-[var(--color-bg-hover)] text-[var(--color-text-admin-muted)]">
                        <ImagePlus className="h-6 w-6" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-xs font-semibold text-white"
                    >
                      {t("admin.common.remove")}
                    </button>
                  </div>
                )}
                {isEditing && category?.image && !previewUrl && !removeImage && (
                  <div className="overflow-hidden rounded-xl border border-[var(--color-border-admin)]">
                    <img
                      src={category.image.url}
                      alt={category.name}
                      className="h-24 w-24 object-cover"
                    />
                  </div>
                )}
                {removeImage && !imageFile && (
                  <span className="inline-flex items-center rounded-full bg-[var(--color-bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--color-text-admin)]">
                    {t("admin.categories.removeImage")}
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="rounded-xl bg-[var(--color-bg-hover)] px-4 py-3 text-sm text-[var(--color-accent)]">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          {isEditing && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              {t("admin.common.delete")}
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
            >
              {submitting ? t("admin.common.saving") : t("admin.common.save")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
