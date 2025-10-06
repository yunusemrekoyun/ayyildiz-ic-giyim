import React from "react";

export default function QtyStepper({
  value = 1,
  min = 1,
  max = 99,
  onChange,
  className = "",
}) {
  const dec = () => onChange?.(Math.max(min, Number(value) - 1 || 0));
  const inc = () => onChange?.(Math.min(max, Number(value) + 1 || 0));

  const canDec = Number(value) > min;
  const canInc = Number(value) < max;

  return (
    <div className={["inline-flex items-center gap-2", className].join(" ")}>
      <button
        type="button"
        aria-label="Decrease"
        onClick={dec}
        disabled={!canDec}
        className="h-8 w-8 rounded-full border border-border bg-white text-base leading-none
                   hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
      >
        −
      </button>

      <div className="w-8 text-center text-sm font-semibold tabular-nums">
        {value}
      </div>

      <button
        type="button"
        aria-label="Increase"
        onClick={inc}
        disabled={!canInc}
        className="h-8 w-8 rounded-full border border-border bg-white text-base leading-none
                   hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}
