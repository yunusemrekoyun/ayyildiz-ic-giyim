import { useEffect, useMemo, useState } from "react";
import { TicketPercent, PlusCircle, RefreshCw } from "lucide-react";
import { couponApi } from "../../api/coupons";
import CouponTable from "../../components/admin/coupons/CouponTable.jsx";
import CouponForm from "../../components/admin/coupons/CouponForm.jsx";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import { useConfirm } from "../../components/ui/ConfirmDialog.jsx";

export default function AdminCoupons() {
  const confirm = useConfirm();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const list = await couponApi.list();
      setCoupons(list);
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const activeCount = useMemo(
    () => coupons.filter((coupon) => coupon.active).length,
    [coupons]
  );

  const openCreateModal = () => {
    setEditingCoupon(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCoupon(null);
    setFormSubmitting(false);
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setModalOpen(true);
  };

  const handleDelete = async (coupon) => {
    const ok = await confirm({
      title: "Delete coupon",
      description: `Remove code “${coupon.code}”?`,
      confirmText: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await couponApi.remove(coupon.id);
      setCoupons((prev) => prev.filter((item) => item.id !== coupon.id));
      setBanner({ variant: "warning", message: "Coupon deleted" });
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      const updated = await couponApi.update(coupon.id, {
        active: !coupon.active,
      });
      setCoupons((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setBanner({
        variant: "success",
        message: updated.active
          ? `Coupon ${updated.code} activated`
          : `Coupon ${updated.code} deactivated`,
      });
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    }
  };

  const handleSubmit = async (payload) => {
    if (formSubmitting) return;
    setFormSubmitting(true);
    try {
      if (editingCoupon?.id) {
        const updated = await couponApi.update(editingCoupon.id, payload);
        setCoupons((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        setBanner({ variant: "success", message: "Coupon updated" });
      } else {
        const created = await couponApi.create(payload);
        setCoupons((prev) => [created, ...prev]);
        setBanner({ variant: "success", message: "Coupon created" });
      }
      closeModal();
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
      setFormSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--color-bg-hover)]">
            <TicketPercent className="h-6 w-6 text-[var(--color-text-admin)]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-admin)]">
              Coupons
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-admin-muted)]">
              Configure code-based promotions with optional minimum cart rules.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCoupons}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            <PlusCircle className="h-4 w-4" /> New coupon
          </button>
        </div>
      </header>

      {banner && (
        <AlertBanner
          variant={banner.variant}
          message={banner.message}
          onClose={() => setBanner(null)}
        />
      )}

      <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-admin)] pb-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-admin)]">
              Active coupons
            </p>
            <p className="text-xs text-[var(--color-text-admin-muted)]">
              {activeCount} active • {coupons.length} total
            </p>
          </div>
        </div>
        <div className="pt-4">
          <CouponTable
            coupons={coupons}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        </div>
      </div>

      <CouponForm
        open={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitting={formSubmitting}
        initialCoupon={editingCoupon}
      />
    </section>
  );
}

function extractMessage(error) {
  if (!error) return "Unexpected error";
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.message) return parsed.message;
    } catch {
      /* ignore */
    }
    return error.message;
  }
  return String(error);
}
