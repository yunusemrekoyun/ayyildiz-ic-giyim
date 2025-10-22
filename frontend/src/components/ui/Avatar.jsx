import { useEffect, useMemo, useState } from "react";

const COLOR_POOL = [
  "#F97316",
  "#F59E0B",
  "#10B981",
  "#14B8A6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#0EA5E9",
  "#3B82F6",
];

function stringToColor(input) {
  if (!input) return "#475569";
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLOR_POOL.length;
  return COLOR_POOL[index];
}

function extractInitials(name) {
  if (!name) return "?";
  const cleaned = String(name).trim();
  if (!cleaned) return "?";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) {
    const single = words[0].replace(/[^A-Za-zÇĞİÖŞÜçğıöşüİı]/g, "");
    const letters = single.slice(0, 2);
    return letters ? letters.toUpperCase() : "?";
  }
  const first = words[0].charAt(0);
  const last = words[words.length - 1].charAt(0);
  const letters = `${first}${last}`.replace(/[^A-Za-zÇĞİÖŞÜçğıöşüİı]/g, "");
  return letters ? letters.toUpperCase() : "?";
}

export default function Avatar({
  src,
  name,
  alt,
  size,
  className = "",
  fallbackClassName = "",
  textClassName = "",
  style,
}) {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [src]);

  const resolvedSrc = useMemo(() => {
    if (!src) return null;
    if (typeof src === "string") return src;
    if (typeof src === "object") {
      if (src.secure_url) return src.secure_url;
      if (src.url) return src.url;
      if (src.path) return src.path;
    }
    return null;
  }, [src]);

  const showFallback = !resolvedSrc || errored;
  const initials = useMemo(() => extractInitials(name), [name]);
  const backgroundColor = useMemo(() => stringToColor(name), [name]);

  const combinedStyle = {
    ...style,
    ...(size ? { width: size, height: size } : null),
    ...(showFallback ? { backgroundColor } : null),
  };

  return (
    <div
      className={[
        "relative grid place-items-center overflow-hidden rounded-full text-sm font-semibold uppercase",
        showFallback ? "text-white" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={combinedStyle}
      aria-label={alt || name || "Avatar"}
    >
      {showFallback ? (
        <span className={["select-none", fallbackClassName, textClassName].filter(Boolean).join(" ")}>
          {initials}
        </span>
      ) : (
        <img
          src={resolvedSrc}
          alt={alt || name || "Avatar"}
          className="h-full w-full object-cover"
          draggable="false"
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
