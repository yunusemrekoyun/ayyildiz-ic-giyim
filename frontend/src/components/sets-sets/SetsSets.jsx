// src/components/home-sets/HomeSets.jsx
import { useMemo, useState } from "react";
import SetsSetItem from "../sets-sets/SetsSetItem";

const pillBase =
  "inline-flex items-center rounded-full border px-4 py-2 text-sm transition";
const pillActive = "bg-accent border-accent text-white shadow";
const pillIdle = "border-border text-primary hover:bg-surface-hover";

export default function HomeSets({
  title = "Trousseau Packages",
  subtitle,
  tabs = [],
  items = [],
}) {
  const [active, setActive] = useState(tabs[0] ?? "All");

  const shown = useMemo(() => {
    if (active === "All") return items;
    return items.filter((i) => i.tags?.includes(active));
  }, [active, items]);

  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-6 py-14">
      <div className="rounded-2xl bg-surface-light p-6 sm:p-10 ring-1 ring-black/5">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-4xl font-serif font-extrabold tracking-tight text-primary">
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto mt-3 max-w-2xl text-secondary">{subtitle}</p>
          )}
        </div>

        {/* Pills */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`${pillBase} ${active === t ? pillActive : pillIdle}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {shown.map((s, i) => (
            <SetsSetItem key={i} {...s} />
          ))}
          {shown.length === 0 && (
            <div className="col-span-full grid place-items-center rounded-xl border border-dashed border-border p-10 text-secondary">
              No packages match this filter.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
