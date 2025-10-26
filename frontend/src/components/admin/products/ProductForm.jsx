import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import AdminModal from "../common/AdminModal";
import TagInput from "../common/TagInput";
import ColorSelector from "./ColorSelector.jsx";
import {
  dedupeColors,
  getColorInfo,
  normalizeColorValue,
} from "../../../utils/colors.js";
import { SUPPORTED_LANGUAGES } from "../../../i18n/config.js";

const BASE_LANGUAGE = SUPPORTED_LANGUAGES[0]?.code || "tr";
const BASE_LANGUAGE_LABEL =
  SUPPORTED_LANGUAGES.find((lang) => lang.code === BASE_LANGUAGE)?.label ||
  "Default";
const TRANSLATION_LANGUAGES = SUPPORTED_LANGUAGES.filter(
  (lang) => lang.code !== BASE_LANGUAGE
);

const emptyTranslation = {
  name: "",
  description: "",
  careInstructions: "",
  details: "",
  attributeTitle: "",
  attributeValues: "",
};

const createTranslationState = () =>
  TRANSLATION_LANGUAGES.reduce((acc, lang) => {
    acc[lang.code] = { ...emptyTranslation };
    return acc;
  }, {});

const splitLines = (value) => {
  if (!value) return [];
  if (Array.isArray(value))
    return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string")
    return value
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  return [];
};

const joinLines = (value) => {
  if (!value) return "";
  if (Array.isArray(value)) return value.join("\n");
  return String(value);
};

const makeKey = ({ color, size, attributeValue }) =>
  [color || "", size || "", attributeValue || ""].join("||");

export default function ProductForm({
  open,
  onClose,
  onSubmit,
  initialProduct = null,
  categories = [],
}) {
  const isEditing = Boolean(initialProduct?.id);
  const { t, i18n } = useTranslation();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [careInstructions, setCareInstructions] = useState("");
  const [detailsInput, setDetailsInput] = useState("");
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [showColors, setShowColors] = useState(true);
  const [showSizes, setShowSizes] = useState(true);
  const [attributeTitle, setAttributeTitle] = useState("");
  const [attributeValues, setAttributeValues] = useState([]);
  const [showAttribute, setShowAttribute] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [newImages, setNewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImageIds, setRemoveImageIds] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localized, setLocalized] = useState(() => createTranslationState());
  const [initialLocalizedCodes, setInitialLocalizedCodes] = useState([]);
  const currencyFormatter = useMemo(() => {
    const locale = i18n.language || navigator.language || "tr-TR";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    });
  }, [i18n.language]);

  useEffect(() => {
    if (!open) return;
    setName(initialProduct?.name ?? "");
    setPrice(initialProduct?.price != null ? String(initialProduct.price) : "");
    setCategoryId(resolveCategoryId(initialProduct?.category));
    setDescription(initialProduct?.description ?? "");
    setCareInstructions(initialProduct?.careInstructions ?? "");
    setDetailsInput((initialProduct?.details || []).join("\n"));
    const inv = initialProduct?.inventory || [];
    const invColors = dedupeColors(inv.map((i) => i.color).filter(Boolean));
    const invSizes = Array.from(
      new Set(inv.map((i) => i.size).filter(Boolean))
    );
    const invAttrs = Array.from(
      new Set(inv.map((i) => i.attributeValue).filter(Boolean))
    );

    setColors(
      dedupeColors(
        (initialProduct?.colors?.length ? initialProduct.colors : invColors) ||
          []
      )
    );
    setSizes(
      (initialProduct?.sizes?.length ? initialProduct.sizes : invSizes) || []
    );
    setShowColors(initialProduct?.showColors ?? true);
    setShowSizes(initialProduct?.showSizes ?? true);
    const attr = initialProduct?.customAttribute || {};
    setAttributeTitle(attr.title || "");
    setAttributeValues((attr.values?.length ? attr.values : invAttrs) || []);
    setShowAttribute(attr.show ?? false);
    setInventory(
      (initialProduct?.inventory || []).map((item) => ({
        color: normalizeColorValue(item.color),
        size: sanitizeOption(item.size),
        attributeValue: sanitizeOption(item.attributeValue),
        stock: Number(item.stock) || 0,
      }))
    );
    setInventoryOpen((initialProduct?.inventory || []).length > 1);
    setIsActive(initialProduct?.isActive ?? true);
    setExistingImages(initialProduct?.images || []);
    setNewImages([]);
    setRemoveImageIds([]);
    setError("");
    setSubmitting(false);

    const translations = createTranslationState();
    const existingCodes = [];
    TRANSLATION_LANGUAGES.forEach(({ code }) => {
      const entry = initialProduct?.localized?.[code];
      if (!entry || typeof entry !== "object") return;
      const custom = entry.customAttribute || {};
      const translation = {
        name: entry.name ?? "",
        description: entry.description ?? "",
        careInstructions: entry.careInstructions ?? "",
        details: joinLines(entry.details),
        attributeTitle: custom.title ?? "",
        attributeValues: joinLines(custom.values),
      };
      translations[code] = translation;
      if (
        translation.name?.trim() ||
        translation.description?.trim() ||
        translation.careInstructions?.trim() ||
        translation.details?.trim() ||
        translation.attributeTitle?.trim() ||
        translation.attributeValues?.trim()
      ) {
        existingCodes.push(code);
      }
    });
    setLocalized(translations);
    setInitialLocalizedCodes(existingCodes);
  }, [initialProduct, open]);

  useEffect(() => {
    return () => {
      newImages.forEach((image) => URL.revokeObjectURL(image.preview));
    };
  }, [newImages]);

  const attributeActive = useMemo(() => {
    return (
      showAttribute &&
      Boolean(attributeTitle.trim()) &&
      attributeValues.length > 0
    );
  }, [showAttribute, attributeTitle, attributeValues.length]);
  useEffect(() => {
    if (!open) return;
    const inv = initialProduct?.inventory || [];

    // Düzenleme modunda inventory'den fallback havuzları
    const invColors = Array.from(
      new Set(inv.map((i) => i?.color).filter(Boolean))
    );
    const invSizes = Array.from(
      new Set(inv.map((i) => i?.size).filter(Boolean))
    );
    const invAttrs = Array.from(
      new Set(inv.map((i) => i?.attributeValue).filter(Boolean))
    );

    // Listeleri şu öncelikle kur:
    // 1) Kullanıcının seçtikleri
    // 2) (Edit modunda) Inventory’den türeyenler
    // 3) Hiçbiri yoksa [null] (Default varyant)
    const colorList = showColors
      ? colors.length
        ? colors
        : isEditing && invColors.length
        ? invColors
        : [null]
      : [null];

    const sizeList = showSizes
      ? sizes.length
        ? sizes
        : isEditing && invSizes.length
        ? invSizes
        : [null]
      : [null];

    const attributeList = attributeActive
      ? attributeValues.length
        ? attributeValues
        : isEditing && invAttrs.length
        ? invAttrs
        : [null]
      : [null];

    const nextCombos = [];
    colorList.forEach((color) => {
      sizeList.forEach((size) => {
        attributeList.forEach((attributeValue) => {
          nextCombos.push({
            color: showColors ? normalizeColorValue(color) : null,
            size: sanitizeOption(size),
            attributeValue: sanitizeOption(attributeValue),
          });
        });
      });
    });

    setInventory((prev) => {
      // Mevcut stokları anahtara göre birleştir (renk/beden/opsiyon normalize!)
      const aggregated = new Map();
      prev.forEach((item) => {
        const colorValue = showColors ? normalizeColorValue(item.color) : null;
        const sizeValue = showSizes ? sanitizeOption(item.size) : null;
        const attrVal = attributeActive
          ? sanitizeOption(item.attributeValue)
          : null;
        const k = makeKey({
          color: colorValue,
          size: sizeValue,
          attributeValue: attrVal,
        });
        aggregated.set(k, (aggregated.get(k) || 0) + (Number(item.stock) || 0));
      });

      // Yeni kombinasyon listesine stokları dök
      return nextCombos.map((combo) => ({
        ...combo,
        stock: aggregated.get(makeKey(combo)) || 0,
      }));
    });
  }, [
    open,
    colors,
    sizes,
    attributeValues,
    showColors,
    showSizes,
    attributeActive,
    isEditing,
    initialProduct?.inventory,
  ]);
  const totalImages = useMemo(
    () => existingImages.length + newImages.length,
    [existingImages.length, newImages.length]
  );

  const handleImageSelection = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = Math.max(
      0,
      8 - (existingImages.length + newImages.length)
    );
    if (remainingSlots <= 0) {
      setError(t("admin.products.errors.maxImages"));
      return;
    }

    const mapped = files
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remainingSlots)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));

    if (!mapped.length) return;
    setNewImages((prev) => [...prev, ...mapped]);
    setError("");
  };

  const removeExistingImage = (image) => {
    setExistingImages((prev) =>
      prev.filter((item) => item.publicId !== image.publicId)
    );
    setRemoveImageIds((prev) => [...prev, image.publicId]);
    setError("");
  };

  const removeNewImage = (image) => {
    setNewImages((prev) => {
      const next = prev.filter((item) => item.preview !== image.preview);
      URL.revokeObjectURL(image.preview);
      return next;
    });
    setError("");
  };

  const handleTranslationChange = (langCode, field, value) => {
    setLocalized((prev) => ({
      ...prev,
      [langCode]: {
        ...(prev[langCode] || { ...emptyTranslation }),
        [field]: value,
      },
    }));
  };

  const handleStockChange = (comboKey, value) => {
    const numeric = Math.max(0, Math.floor(Number(value)));
    setInventory((prev) =>
      prev.map((item) =>
        makeKey(item) === comboKey
          ? { ...item, stock: Number.isFinite(numeric) ? numeric : 0 }
          : item
      )
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("admin.products.errors.nameRequired"));
      return;
    }
    const priceValue = Number(price);
    if (Number.isNaN(priceValue) || priceValue < 0) {
      setError(t("admin.products.errors.priceInvalid"));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const normalizedColors = dedupeColors(colors);

      const payload = {
        name: name.trim(),
        price: priceValue,
        category: categoryId || "",
        description,
        careInstructions,
        details: detailsInput
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean),
        colors: showColors ? normalizedColors : [],
        sizes,
        showColors,
        showSizes,
        customAttribute: {
          title: attributeTitle.trim(),
          values: attributeValues,
          show:
            showAttribute &&
            attributeTitle.trim() &&
            attributeValues.length > 0,
        },
        inventory: inventory.map((item) => ({
          color:
            showColors && item.color ? normalizeColorValue(item.color) : null,
          size: showSizes && item.size ? item.size : null,
          attributeValue:
            attributeActive && item.attributeValue ? item.attributeValue : null,
          stock: Number(item.stock) || 0,
        })),
        isActive,
        images: newImages.map((item) => item.file),
        removeImagePublicIds: removeImageIds,
      };

      const localizedPayload = {};
      TRANSLATION_LANGUAGES.forEach(({ code }) => {
        const entry = localized[code] || emptyTranslation;
        const normalizedEntry = {
          name: entry.name?.trim() || "",
          description: entry.description?.trim() || "",
          careInstructions: entry.careInstructions?.trim() || "",
          details: splitLines(entry.details),
          attributeTitle: entry.attributeTitle?.trim() || "",
          attributeValues: splitLines(entry.attributeValues),
        };

        const hasContent =
          normalizedEntry.name ||
          normalizedEntry.description ||
          normalizedEntry.careInstructions ||
          normalizedEntry.details.length > 0 ||
          normalizedEntry.attributeTitle ||
          normalizedEntry.attributeValues.length > 0;

        if (hasContent || initialLocalizedCodes.includes(code)) {
          localizedPayload[code] = {
            name: normalizedEntry.name,
            description: normalizedEntry.description,
            careInstructions: normalizedEntry.careInstructions,
            details: normalizedEntry.details,
            customAttribute: {
              title: normalizedEntry.attributeTitle,
              values: normalizedEntry.attributeValues,
            },
          };
        }
      });

      if (Object.keys(localizedPayload).length) {
        payload.localized = localizedPayload;
      }

      await onSubmit?.(payload);
      onClose?.();
    } catch (err) {
      const message =
        extractMessage(err) || t("admin.products.saveError");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const variantColumns = useMemo(() => {
    const columns = [];
    if (showColors && colors.length)
      columns.push({ key: "color", label: t("admin.products.colors") });
    if (showSizes && sizes.length)
      columns.push({ key: "size", label: t("admin.products.sizes") });
    if (attributeActive)
      columns.push({
        key: "attributeValue",
        label: attributeTitle || t("admin.products.attributeValues"),
      });
    if (!columns.length)
      columns.push({ key: "variant", label: t("admin.products.variant") });
    return columns;
  }, [
    showColors,
    colors.length,
    showSizes,
    sizes.length,
    attributeActive,
    attributeTitle,
    t,
  ]);

  const renderVariantValue = (columnKey, combo) => {
    if (columnKey === "variant") return t("admin.products.variantDefault");
    if (columnKey === "color") {
      return <ColorBadge value={combo.color} />;
    }
    return combo[columnKey] || "—";
  };

  return (
    <AdminModal
      open={open}
      onClose={() => {
        if (submitting) return;
        onClose?.();
      }}
      title={
        isEditing
          ? t("admin.products.modalTitleEdit")
          : t("admin.products.modalTitleCreate")
      }
      description={t("admin.products.modalDescription")}
      footer={
        <>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
            disabled={submitting}
          >
            {t("admin.common.cancel")}
          </button>
          <button
            type="submit"
            form="admin-product-form"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {submitting
              ? t("admin.products.modalSaving")
              : isEditing
              ? t("admin.products.modalUpdate")
              : t("admin.products.modalCreate")}
          </button>
        </>
      }
    >
      <form
        id="admin-product-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                {t("admin.products.name")}
                <span className="text-[var(--color-accent)]">*</span>
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={160}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                placeholder={t("admin.products.namePlaceholder")}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                {t("admin.products.price")}
                <span className="text-[var(--color-accent)]">*</span>
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                placeholder={t("admin.products.pricePlaceholder")}
              />
              {price && !Number.isNaN(Number(price)) && (
                <p className="mt-1 text-xs text-[var(--color-text-admin-muted)]">
                  {currencyFormatter.format(Number(price))}
                </p>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                {t("admin.products.category")}
              </span>
              <select
                value={categoryId || ""}
                onChange={(event) => setCategoryId(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
              >
                <option value="">{t("admin.products.noCategory")}</option>
                {categories.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--color-text-admin)]">
                {t("admin.products.visibility")}
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-border-admin)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <span className="text-sm text-[var(--color-text-admin)]">
                  {isActive
                    ? t("admin.products.visible")
                    : t("admin.products.hidden")}
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                {t("admin.products.description")}
              </span>
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                placeholder={t("admin.products.descriptionPlaceholder")}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                {t("admin.products.care")}
              </span>
              <textarea
                rows={3}
                value={careInstructions}
                onChange={(event) => setCareInstructions(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                placeholder={t("admin.products.carePlaceholder")}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                {t("admin.products.details")}
              </span>
              <textarea
                rows={4}
                value={detailsInput}
                onChange={(event) => setDetailsInput(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                placeholder={t("admin.products.detailsPlaceholder")}
              />
              <p className="mt-1 text-xs text-[var(--color-text-admin-muted)]">
                {t("admin.products.detailsHelper")}
              </p>
            </label>
          </div>
        </div>

        {TRANSLATION_LANGUAGES.length > 0 && (
          <div className="mt-8 space-y-4 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-5">
            <div>
              <h3 className="text-base font-semibold text-[var(--color-text-admin)]">
                {t("admin.products.translations")}
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-admin-muted)]">
                {t("admin.products.translationsHelper", {
                  base: BASE_LANGUAGE_LABEL,
                })}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {TRANSLATION_LANGUAGES.map(({ code, label }) => {
                const values = localized[code] || emptyTranslation;
                const clearing =
                  initialLocalizedCodes.includes(code) &&
                  !(
                    values.name?.trim() ||
                    values.description?.trim() ||
                    values.careInstructions?.trim() ||
                    values.details?.trim() ||
                    values.attributeTitle?.trim() ||
                    values.attributeValues?.trim()
                  );

                return (
                  <div
                    key={code}
                    className="space-y-3 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--color-text-admin)]">
                        {label}
                      </span>
                      {clearing && (
                        <span className="text-[10px] uppercase text-[var(--color-text-admin-muted)]">
                          {t("admin.products.translationClears")}
                        </span>
                      )}
                    </div>

                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-admin-muted)]">
                        {t("admin.products.name")}
                      </span>
                      <input
                        value={values.name}
                        onChange={(event) =>
                          handleTranslationChange(
                            code,
                            "name",
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                        placeholder={label}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-admin-muted)]">
                        {t("admin.products.description")}
                      </span>
                      <textarea
                        rows={3}
                        value={values.description}
                        onChange={(event) =>
                          handleTranslationChange(
                            code,
                            "description",
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-admin-muted)]">
                        {t("admin.products.care")}
                      </span>
                      <textarea
                        rows={2}
                        value={values.careInstructions}
                        onChange={(event) =>
                          handleTranslationChange(
                            code,
                            "careInstructions",
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-admin-muted)]">
                        {t("admin.products.details")}
                      </span>
                      <textarea
                        rows={3}
                        value={values.details}
                        onChange={(event) =>
                          handleTranslationChange(
                            code,
                            "details",
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                        placeholder={t("admin.products.detailsHelper")}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-admin-muted)]">
                        {t("admin.products.attributeTitle")}
                      </span>
                      <input
                        value={values.attributeTitle}
                        onChange={(event) =>
                          handleTranslationChange(
                            code,
                            "attributeTitle",
                            event.target.value
                          )
                        }
                        disabled={!showAttribute}
                        className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)] disabled:opacity-60"
                        placeholder={t("admin.products.attributeTitlePlaceholder")}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-admin-muted)]">
                        {t("admin.products.attributeValues")}
                      </span>
                      <textarea
                        rows={2}
                        value={values.attributeValues}
                        onChange={(event) =>
                          handleTranslationChange(
                            code,
                            "attributeValues",
                            event.target.value
                          )
                        }
                        disabled={!showAttribute}
                        className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)] disabled:opacity-60"
                        placeholder={t("admin.products.attributeValuesPlaceholder")}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <SelectionCard
            title={t("admin.products.colors")}
            description={t("admin.products.colorsDescription")}
            checked={showColors}
            toggleLabel={t("admin.products.selectionShow")}
            onToggle={() => setShowColors((prev) => !prev)}
          >
            <ColorSelector
              values={colors}
              onChange={setColors}
              disabled={!showColors}
            />
            <p className="text-[11px] text-[var(--color-text-admin-muted)]">
              {t("admin.products.colorsHelper")}
            </p>
          </SelectionCard>

          <SelectionCard
            title={t("admin.products.sizes")}
            description={t("admin.products.sizesDescription")}
            checked={showSizes}
            toggleLabel={t("admin.products.selectionShow")}
            onToggle={() => setShowSizes((prev) => !prev)}
          >
            <TagInput
              label={t("admin.products.sizesLabel")}
              values={sizes}
              onChange={setSizes}
              placeholder={t("admin.products.sizesPlaceholder")}
              helper={t("admin.products.sizesHelper")}
              disabled={!showSizes}
            />
          </SelectionCard>

          <SelectionCard
            title={t("admin.products.attribute")}
            description={t("admin.products.attributeDescription")}
            checked={showAttribute}
            toggleLabel={t("admin.products.selectionShow")}
            onToggle={() => setShowAttribute((prev) => !prev)}
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
                {t("admin.products.attributeTitle")}
              </span>
              <input
                value={attributeTitle}
                onChange={(event) => setAttributeTitle(event.target.value)}
                disabled={!showAttribute}
                className="w-full rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)] disabled:opacity-60"
                placeholder={t("admin.products.attributeTitlePlaceholder")}
              />
            </label>
            <TagInput
              label={t("admin.products.attributeOptionsLabel")}
              values={attributeValues}
              onChange={setAttributeValues}
              placeholder={t("admin.products.attributeOptionsPlaceholder")}
              helper={t("admin.products.attributeOptionsHelper")}
              disabled={!showAttribute || !attributeTitle.trim()}
            />
          </SelectionCard>
        </div>

        <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text-admin)]">
                {t("admin.products.inventorySectionTitle")}
              </h4>
              <p className="text-xs text-[var(--color-text-admin-muted)]">
                {t("admin.products.inventorySectionDescription")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInventoryOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
            >
              {inventoryOpen
                ? t("admin.products.inventoryHide")
                : t("admin.products.inventoryShow")}
            </button>
          </div>
          {inventoryOpen && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border-admin)]/70 text-sm">
                <thead className="bg-[var(--color-bg-hover)]/60 text-[var(--color-text-admin-muted)]">
                  <tr>
                    {variantColumns.map((column) => (
                      <th
                        key={column.key}
                        className="px-3 py-2 text-left font-medium"
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left font-medium">
                      {t("admin.products.inventoryStock")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-admin)]/60 text-[var(--color-text-admin)]">
                  {inventory.map((combo) => {
                    const comboKey = makeKey(combo);
                    return (
                      <tr key={comboKey}>
                        {variantColumns.map((column) => (
                          <td key={column.key} className="px-3 py-2">
                            {renderVariantValue(column.key, combo)}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={combo.stock}
                            onChange={(event) =>
                              handleStockChange(comboKey, event.target.value)
                            }
                            className="w-32 rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--color-text-admin)]">
              {t("admin.products.mediaTitle")}
            </h4>
            <span className="text-xs text-[var(--color-text-admin-muted)]">
              {t("admin.products.mediaCount", {
                count: totalImages,
                limit: 8,
              })}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-admin-muted)]">
            {t("admin.products.mediaHelp")}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--color-border-admin)] px-4 py-3 text-sm text-[var(--color-text-admin)] hover:border-[var(--color-text-admin)]">
              <Upload className="h-4 w-4" />
              {t("admin.products.mediaAdd")}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelection}
              />
            </label>
            {existingImages.map((image) => (
              <figure
                key={image.publicId}
                className="relative overflow-hidden rounded-xl border border-[var(--color-border-admin)]"
              >
                <img
                  src={image.url}
                  alt={image.publicId}
                  className="h-24 w-24 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(image)}
                  className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-xs font-semibold text-white"
                >
                  {t("admin.common.remove")}
                </button>
              </figure>
            ))}
            {newImages.map((image) => (
              <figure
                key={image.preview}
                className="relative overflow-hidden rounded-xl border border-[var(--color-border-admin)]"
              >
                <img
                  src={image.preview}
                  alt={t("admin.products.mediaNewAlt")}
                  className="h-24 w-24 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeNewImage(image)}
                  className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-xs font-semibold text-white"
                >
                  {t("admin.common.remove")}
                </button>
              </figure>
            ))}
            {!existingImages.length && !newImages.length && (
              <div className="grid h-24 w-24 place-items-center rounded-xl border border-dashed border-[var(--color-border-admin)] text-[var(--color-text-admin-muted)]">
                <ImagePlus className="h-6 w-6" />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-[var(--color-bg-hover)] px-4 py-3 text-sm text-[var(--color-accent)]">
            {error}
          </div>
        )}
      </form>
    </AdminModal>
  );
}

function resolveCategoryId(category) {
  if (!category) return "";
  if (typeof category === "string") return category;
  return category?.id || category?._id || "";
}

function sanitizeOption(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function extractMessage(error) {
  if (!error) return "";
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.message) return parsed.message;
    } catch (e) {
      console.error(e);
      /* ignore */
    }
    return error.message;
  }
  return String(error);
}

function SelectionCard({
  title,
  description,
  checked,
  onToggle,
  toggleLabel,
  children,
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text-admin)]">
            {title}
          </h4>
          <p className="text-xs text-[var(--color-text-admin-muted)]">
            {description}
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-admin)]">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="h-4 w-4 rounded border-[var(--color-border-admin)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
          />
          {toggleLabel}
        </label>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function ColorBadge({ value }) {
  const info = getColorInfo(value);
  if (!info.value) {
    return <span className="text-[var(--color-text-admin-muted)]">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        className="h-4 w-4 rounded-full border border-white/70 shadow-inner"
        style={{ background: info.swatch }}
        aria-hidden="true"
      />
      <span>{info.label}</span>
    </span>
  );
}
