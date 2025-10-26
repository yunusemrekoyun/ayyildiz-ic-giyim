const SUPPORTED_LANGUAGES = ["tr", "en", "de"];
const DEFAULT_LANGUAGE = "tr";

export function normalizeLocale(value) {
  if (!value) return null;
  if (typeof value !== "string") return null;
  const primary = value.trim().toLowerCase();
  if (!primary) return null;
  const candidate = primary.split(/[._-]/)[0];
  if (SUPPORTED_LANGUAGES.includes(candidate)) return candidate;
  return null;
}

function parseAcceptLanguage(header) {
  if (!header || typeof header !== "string") return [];
  return header
    .split(",")
    .map((part) => part.trim().split(";")[0])
    .map((item) => normalizeLocale(item))
    .filter(Boolean);
}

export function resolveRequestLanguage(req) {
  const queryLang = normalizeLocale(req?.query?.lang);
  if (queryLang) return queryLang;

  const headerLangs = parseAcceptLanguage(req?.headers?.["accept-language"]);
  if (headerLangs.length) return headerLangs[0];

  const cookieLang = normalizeLocale(req?.cookies?.lang);
  if (cookieLang) return cookieLang;

  return DEFAULT_LANGUAGE;
}

export function parseLocalizedPayload(value) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch (error) {
      return null;
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return null;
}

export function toLocalizedObject(localized) {
  if (!localized) return {};
  if (localized instanceof Map) {
    return Object.fromEntries(localized.entries());
  }
  if (typeof localized === "object") return localized;
  return {};
}

const isDefined = (value) => value !== undefined && value !== null;

export function pickLocalizedField(doc, field, lang, fallbackLang = DEFAULT_LANGUAGE) {
  if (!doc) return undefined;
  const localized = toLocalizedObject(doc.localized);
  const current = localized[lang]?.[field];
  if (isDefined(current)) return current;

  if (lang !== fallbackLang) {
    const fallback = localized[fallbackLang]?.[field];
    if (isDefined(fallback)) return fallback;
  }

  return doc[field];
}

export function pickLocalizedObject(doc, lang) {
  const localized = toLocalizedObject(doc?.localized);
  if (localized[lang]) return localized[lang];
  if (lang !== DEFAULT_LANGUAGE && localized[DEFAULT_LANGUAGE]) {
    return localized[DEFAULT_LANGUAGE];
  }
  return {};
}

export function assignLocalizedFields(doc, lang, values, allowedFields = null) {
  if (!doc || !values) return;
  const normalizedLang = normalizeLocale(lang) || DEFAULT_LANGUAGE;
  const target = allowedFields
    ? Object.fromEntries(
        Object.entries(values).filter(([key]) => allowedFields.includes(key))
      )
    : { ...values };

  if (!doc.localized || typeof doc.localized !== "object") {
    doc.localized = {};
  } else if (doc.localized instanceof Map) {
    doc.localized = Object.fromEntries(doc.localized.entries());
  }

  const existing = doc.localized[normalizedLang] || {};
  doc.localized[normalizedLang] = { ...existing, ...target };
  if (typeof doc.markModified === "function") {
    doc.markModified("localized");
  }
}

export function assignLocalizedBulk(doc, localizedPayload, allowedFields = null) {
  if (!doc || !localizedPayload) return;
  Object.entries(localizedPayload).forEach(([lang, values]) => {
    if (!values || typeof values !== "object") return;
    assignLocalizedFields(doc, lang, values, allowedFields);
  });
}

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE };

export function sanitizeLocalizedStrings(fields, payload) {
  if (!Array.isArray(fields) || fields.length === 0) return {};
  if (!payload || typeof payload !== "object") return {};

  const result = {};
  Object.entries(payload).forEach(([lang, values]) => {
    const code = normalizeLocale(lang);
    if (!code || typeof values !== "object" || Array.isArray(values)) return;

    const subset = {};
    fields.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(values, field)) return;
      const raw = values[field];
      subset[field] = raw != null ? String(raw) : "";
    });

    if (Object.keys(subset).length > 0) {
      result[code] = subset;
    }
  });

  return result;
}
