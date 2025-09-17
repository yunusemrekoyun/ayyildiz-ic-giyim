// src/components/home-sets/HomeSets.jsx
import { useMemo, useState } from "react";
import HomeSetItem from "./HomeSetItem";

const pillBase =
  "inline-flex items-center rounded-full border px-4 py-2 text-sm transition";
const pillActive = "bg-accent border-accent text-white shadow";
const pillIdle = "border-border text-primary hover:bg-surface-hover";

export default function HomeSets({
  title = "Trousseau Packages",
  subtitle,
  tabs = [],
  items = [],
  variant = "standard", // "standard" | "compact"
  viewAllHref = "/sets",
}) {
  const [active, setActive] = useState(tabs[0] ?? "All");

  const shown = useMemo(() => {
    if (active === "All") return items;
    return items.filter((i) => i.tags?.includes(active));
  }, [active, items]);

  const isCompact = variant === "compact";

  return (
    <section
      className={[
        "mx-auto max-w-[1400px] px-4 sm:px-6",
        isCompact ? "py-10" : "py-14",
      ].join(" ")}
    >
      <div
        className={[
          "rounded-2xl ring-1 ring-black/5",
          isCompact ? "bg-white p-5" : "bg-surface-light p-6 sm:p-10",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className={isCompact ? "text-left" : "text-center w-full"}>
            <h2
              className={[
                "font-serif font-extrabold tracking-tight text-primary",
                isCompact ? "text-2xl" : "text-4xl",
              ].join(" ")}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className={[
                  "text-secondary",
                  isCompact
                    ? "mt-1 text-sm max-w-xl"
                    : "mx-auto mt-3 max-w-2xl",
                ].join(" ")}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* View all (compact’te üst sağda) */}
          {isCompact && (
            <a
              href={viewAllHref}
              className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-sm text-primary hover:bg-surface-hover"
            >
              View all
            </a>
          )}
        </div>

        {/* Pills */}
        <div
          className={[
            "mt-4 flex flex-wrap justify-center gap-2",
            isCompact && "justify-start",
          ].join(" ")}
        >
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={[
                pillBase,
                active === t ? pillActive : pillIdle,
                isCompact && "px-3 py-1 text-xs",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div
          className={[
            "mt-6 grid gap-4",
            isCompact
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              : "grid-cols-1 md:grid-cols-2 gap-6",
          ].join(" ")}
        >
          {shown.map((s, i) => (
            <HomeSetItem key={i} {...s} compact={isCompact} />
          ))}

          {shown.length === 0 && (
            <div className="col-span-full grid place-items-center rounded-xl border border-dashed border-border p-10 text-secondary">
              No packages match this filter.
            </div>
          )}
        </div>

        {/* View all (standard’ta altta) */}
        {!isCompact && (
          <div className="mt-8 text-center">
            <a
              href={viewAllHref}
              className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm text-primary hover:bg-surface-hover"
            >
              View all packages
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
