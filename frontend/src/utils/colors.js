import {
  COLOR_PALETTE,
  COLOR_NAME_LOOKUP,
  COLOR_VALUE_LOOKUP,
} from "../constants/colorPalette.js";

const HEX_REGEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value) {
  if (typeof value !== "string") return false;
  return HEX_REGEX.test(value.trim());
}

function expandHex(hex) {
  if (!hex) return null;
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    return cleaned
      .split("")
      .map((char) => char + char)
      .join("")
      .toUpperCase();
  }
  if (cleaned.length === 6) {
    return cleaned.toUpperCase();
  }
  return null;
}

export function normalizeColorValue(input) {
  if (input === undefined || input === null) return null;
  const value = String(input).trim();
  if (!value) return null;

  const paletteByName = COLOR_NAME_LOOKUP.get(value.toLowerCase());
  if (paletteByName) return paletteByName.value.toUpperCase();

  const paletteByValue = COLOR_VALUE_LOOKUP.get(value.toUpperCase());
  if (paletteByValue) return paletteByValue.value.toUpperCase();

  if (isHexColor(value)) {
    const expanded = expandHex(value);
    return expanded ? `#${expanded}` : null;
  }

  return value;
}

export function dedupeColors(list = []) {
  const seen = new Set();
  const result = [];
  list.forEach((item) => {
    const normalized = normalizeColorValue(item);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result;
}

export function getColorInfo(rawValue) {
  const normalized = normalizeColorValue(rawValue);
  if (!normalized) {
    return {
      value: null,
      label: "",
      swatch: "",
      isHex: false,
    };
  }

  const paletteMatch = COLOR_VALUE_LOOKUP.get(normalized.toUpperCase());
  const label = paletteMatch?.name || String(rawValue || normalized);
  const swatch =
    paletteMatch?.value ||
    (isHexColor(normalized) ? normalized : String(rawValue || normalized));

  return {
    value: normalized,
    label,
    swatch,
    isHex: isHexColor(swatch),
  };
}

export function colorListToInfo(list = []) {
  return dedupeColors(list).map((value) => getColorInfo(value));
}

export function formatColorLabel(value) {
  const info = getColorInfo(value);
  return info.label;
}

export { COLOR_PALETTE };
