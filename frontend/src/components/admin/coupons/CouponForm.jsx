import { useEffect, useState } from "react";
import AdminModal from "../common/AdminModal";
import AlertBanner from "../../ui/AlertBanner.jsx";

export default function CouponForm({
  open,
  onClose,
  onSubmit,
  submitting = false,
  initialCoupon = null,
}) {
  const isEditing = Boolean(initialCoupon?.id);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [percentage, setPercentage] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCode(initialCoupon?.code ?? "");
    setDescription(initialCoupon?.description ?? "");
    setPercentage(
      initialCoupon?.percentage != null
        ? String(initialCoupon.percentage)
        : ""
    );
    setMinSubtotal(
      initialCoupon?.minSubtotal != null
        ? String(initialCoupon.minSubtotal)
        : ""
    );
    setActive(initialCoupon?.active ?? true);
    setError("");
  }, [open, initialCoupon]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!code.trim()) {
      setError("Coupon code is required");
      return;
    }
    const perc = Number(percentage);
    if (!Number.isFinite(perc) || perc <= 0 || perc > 100) {
      setError("Percentage must be between 1 and 100");
      return;
    }
    const min = Number(minSubtotal || 0);
    if (!Number.isFinite(min) || min < 0) {
      setError("Minimum subtotal must be zero or greater");
      return;
    }

    setError("");
    onSubmit?.({
      code: code.trim().toUpperCase(),
      description: description.trim(),
      percentage: perc,
      minSubtotal: min,
      active,
    });
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit coupon" : "Create coupon"}
      description="Generate unique codes that apply percentage discounts at checkout."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="coupon-form"
            className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
            disabled={submitting}
          >
            {isEditing ? "Save changes" : "Create coupon"}
          </button>
        </>
      }
    >
      <form id="coupon-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <AlertBanner
            variant="danger"
            message={error}
            onClose={() => setError("")}
          />
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
            Code
          </span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={32}
            className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
            placeholder="SUMMER20"
            disabled={submitting || isEditing}
          />
          <p className="mt-1 text-xs text-[var(--color-text-admin-muted)]">
            Codes are stored in uppercase and must be unique.
          </p>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
              Percentage
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2">
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={percentage}
                onChange={(event) => setPercentage(event.target.value)}
                className="w-full border-0 bg-transparent text-sm text-[var(--color-text-admin)] outline-none"
                placeholder="10"
                disabled={submitting}
              />
              <span className="text-sm text-[var(--color-text-admin-muted)]">%</span>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
              Minimum subtotal (optional)
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={minSubtotal}
              onChange={(event) => setMinSubtotal(event.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
              placeholder="0"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-[var(--color-text-admin-muted)]">
              Leave empty to allow usage on any cart total.
            </p>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--color-text-admin)]">
            Description
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-admin)] outline-none focus:border-[var(--color-text-admin)]"
            placeholder="Internal notes"
            disabled={submitting}
          />
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-admin)]">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border-admin)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            disabled={submitting}
          />
          Active immediately
        </label>
      </form>
    </AdminModal>
  );
}
