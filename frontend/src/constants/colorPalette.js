export const COLOR_PALETTE = [
  { name: "Black", value: "#000000" },
  { name: "Charcoal", value: "#333333" },
  { name: "White", value: "#FFFFFF" },
  { name: "Ivory", value: "#F8F4E3" },
  { name: "Silver", value: "#C0C0C0" },
  { name: "Gold", value: "#D4AF37" },
  { name: "Champagne", value: "#F7E7CE" },
  { name: "Taupe", value: "#8B7650" },
  { name: "Chocolate", value: "#7B3F00" },
  { name: "Terracotta", value: "#D86C4B" },
  { name: "Tangerine", value: "#FF7F32" },
  { name: "Sunflower", value: "#FFC300" },
  { name: "Olive", value: "#808000" },
  { name: "Emerald", value: "#2ECC71" },
  { name: "Teal", value: "#1ABC9C" },
  { name: "Seafoam", value: "#7FD1AE" },
  { name: "Sky Blue", value: "#87CEEB" },
  { name: "Royal Blue", value: "#4169E1" },
  { name: "Navy", value: "#1C3151" },
  { name: "Lavender", value: "#B497BD" },
  { name: "Lilac", value: "#C8A2C8" },
  { name: "Fuchsia", value: "#C2185B" },
  { name: "Blush Pink", value: "#F4C2C2" },
  { name: "Coral", value: "#FF6F61" },
  { name: "Crimson", value: "#B80F0A" },
];

export const COLOR_VALUE_LOOKUP = new Map(
  COLOR_PALETTE.map((entry) => [entry.value.toUpperCase(), entry])
);

export const COLOR_NAME_LOOKUP = new Map(
  COLOR_PALETTE.map((entry) => [entry.name.toLowerCase(), entry])
);
