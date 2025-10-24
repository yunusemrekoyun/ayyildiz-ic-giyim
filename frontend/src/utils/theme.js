// src/utils/theme.js

// DOM'a CSS değişkenlerini uygular
export function applyThemeVars({ store = {}, admin = {} } = {}) {
  const root = document.documentElement;
  const setMany = (scopeEl, varsObj) => {
    Object.entries(varsObj || {}).forEach(([k, v]) => {
      if (k && typeof v === "string") scopeEl.style.setProperty(k, v);
    });
  };

  // storefront tarafı (global)
  setMany(root, store);

  // admin isimlendirmen "admin" scope içinde değil değişken adları zaten var(--color-...) biçiminde.
  // admin tarafı için de aynı root'a yazıyoruz (admin sayfaları bunları kullanıyor)
  setMany(root, admin);
}

// hazır preset -> applyThemeVars formatına dönüştür
export function presetToVars(preset) {
  return {
    store: preset.store, // { '--color-primary': '#...' ... }
    admin: preset.admin, // { '--color-bg-admin': '#...' ... }
  };
}
