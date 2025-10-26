import { resolveRequestLanguage, DEFAULT_LANGUAGE } from "../utils/i18n.js";

export function attachLocale(req, res, next) {
  try {
    req.locale = resolveRequestLanguage(req) || DEFAULT_LANGUAGE;
  } catch (error) {
    req.locale = DEFAULT_LANGUAGE;
  }
  next();
}
