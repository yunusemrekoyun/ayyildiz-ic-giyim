import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { DEFAULT_SITE_CODE, SITE_CODES } from "../constants/sites.js";

function normalizeSiteCode(code) {
  const value = (code || DEFAULT_SITE_CODE).toLowerCase();
  return SITE_CODES.includes(value) ? value : DEFAULT_SITE_CODE;
}

export function useLocalizedPath() {
  const { lng } = useParams();
  const siteCode = normalizeSiteCode(lng);

  const buildPath = useCallback(
    (target = "") => {
      if (typeof target !== "string") return `/${siteCode}`;
      const trimmed = target.trim();
      if (!trimmed || trimmed === "/") {
        return `/${siteCode}`;
      }

      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
      }

      const sitePrefixPattern = new RegExp(`^/(${SITE_CODES.join("|")})(/|$)`, "i");
      if (sitePrefixPattern.test(trimmed)) {
        return trimmed;
      }

      const tokenIndex = trimmed.search(/[?#]/);
      const pathPart = tokenIndex >= 0 ? trimmed.slice(0, tokenIndex) : trimmed;
      const suffix = tokenIndex >= 0 ? trimmed.slice(tokenIndex) : "";

      const normalizedPath =
        pathPart && pathPart !== "/"
          ? pathPart.startsWith("/")
            ? pathPart
            : `/${pathPart}`
          : "";

      return `/${siteCode}${normalizedPath}${suffix}`;
    },
    [siteCode]
  );

  return { siteCode, buildPath };
}
