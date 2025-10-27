import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, Plus } from "lucide-react";
import { campaignApi } from "../../api/campaigns";
import { productApi } from "../../api/products";
import { setApi } from "../../api/sets";
import { categoryApi } from "../../api/categories";
import { discountApi } from "../../api/discounts";
import { flattenCategoryTree } from "../../utils/catalog.js";
import CampaignCard from "../../components/admin/campaigns/CampaignCard.jsx";
import CampaignForm from "../../components/admin/campaigns/CampaignForm.jsx";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import { useConfirm } from "../../components/ui/ConfirmDialog.jsx";
import { useLocalizedPath } from "../../hooks/useLocalizedPath.js";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
});

export default function AdminCampaigns() {
  const { siteCode, buildPath } = useLocalizedPath();
  const confirm = useConfirm();
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [banner, setBanner] = useState(null);

  const [productOptions, setProductOptions] = useState([]);
  const [setOptions, setSetOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [discountOptions, setDiscountOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [formMode, setFormMode] = useState("create");
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    loadCampaigns();
    loadOptions();
  }, [siteCode]);

  const sortedCampaigns = useMemo(
    () =>
      [...campaigns].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      ),
    [campaigns]
  );

  const activeCount = useMemo(
    () => campaigns.filter((campaign) => campaign.isActive).length,
    [campaigns]
  );

  async function loadCampaigns() {
    setLoadingCampaigns(true);
    try {
      const data = await campaignApi.listManage({ includeInactive: true });
      setCampaigns(data);
    } catch (error) {
      setBanner({
        variant: "danger",
        message: extractMessage(error),
      });
    } finally {
      setLoadingCampaigns(false);
    }
  }

  async function loadOptions() {
    setLoadingOptions(true);
    try {
      const [productRes, setRes, categoryRes, discountRes] = await Promise.all([
        productApi.list(
          { limit: 500, includeHidden: true },
          { siteCode, auth: true }
        ),
        setApi.list({ includeHidden: true, siteCode }),
        categoryApi.tree({}, { siteCode, auth: true }),
        discountApi.list(),
      ]);

      const mappedProducts = (productRes.products || []).map((product) => ({
        id: String(product.id || product._id || "").trim(),
        label: product.name || "Unnamed product",
        hint: currency.format(product.finalPrice ?? product.price ?? 0),
      }));
      setProductOptions(mappedProducts);

      const mappedSets = (
        Array.isArray(setRes) ? setRes : setRes?.sets || []
      ).map((set) => ({
        id: String(set.id || set._id || "").trim(),
        label: set.name || "Untitled set",
        hint: currency.format(set.finalPrice ?? set.price ?? 0),
      }));
      setSetOptions(mappedSets);

      const flatCategories = flattenCategoryTree(categoryRes || []);
      const mappedCategories = flatCategories
        .map((item) => {
          const catId = item.id || item._id || item.value;
          if (!catId) return null;
          const label =
            (Array.isArray(item.path) && item.path.length
              ? item.path.join(" / ")
              : item.label || item.name || String(catId)) || "Unnamed";
          const hint =
            typeof item.level === "number"
              ? `Level ${item.level + 1}`
              : undefined;
          return { id: String(catId), label, hint };
        })
        .filter(Boolean);
      setCategoryOptions(mappedCategories);

      const mappedDiscounts = (discountRes || []).map((discount) => ({
        id: discount.id,
        label: discount.name,
        hint: `${discount.percentage}% off`,
        appliesTo: discount.appliesTo || {},
      }));
      setDiscountOptions(mappedDiscounts);
    } catch (error) {
      setBanner({
        variant: "danger",
        message: extractMessage(error),
      });
    } finally {
      setLoadingOptions(false);
    }
  }

  function openCreateForm() {
    setFormMode("create");
    setEditingCampaign(null);
  }

  function openEditForm(campaign) {
    setFormMode("edit");
    setEditingCampaign(campaign);
  }

  async function handleToggleActive(campaign) {
    try {
      const updated = await campaignApi.update(campaign.id, {
        isActive: !campaign.isActive,
      });
      setCampaigns((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      if (editingCampaign?.id === updated.id) {
        setEditingCampaign(updated);
      }
      setBanner({
        variant: "success",
        message: `Campaign “${updated.name}” is now ${
          updated.isActive ? "active" : "hidden"
        }.`,
      });
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    }
  }

  async function handleDelete(campaign) {
    const ok = await confirm({
      title: "Delete campaign",
      description: `Delete “${campaign.name}”? This action cannot be undone.`,
      tone: "danger",
      confirmText: "Delete",
    });
    if (!ok) return;
    try {
      await campaignApi.remove(campaign.id);
      setCampaigns((prev) => prev.filter((item) => item.id !== campaign.id));
      if (editingCampaign?.id === campaign.id) {
        openCreateForm();
      }
      setBanner({
        variant: "warning",
        message: `Campaign “${campaign.name}” deleted.`,
      });
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    }
  }

  async function handleMove(campaign, direction) {
    const list = sortedCampaigns;
    const from = list.findIndex((item) => item.id === campaign.id);
    const to = from + direction;
    if (to < 0 || to >= list.length) return;

    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    const nextWithOrder = next.map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    setCampaigns((prev) =>
      prev.map((item) => nextWithOrder.find((it) => it.id === item.id) || item)
    );

    try {
      await campaignApi.reorder(
        nextWithOrder.map((item) => ({
          id: item.id,
          sortOrder: item.sortOrder,
        }))
      );
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
      loadCampaigns();
    }
  }

  async function handleFormSubmit(payload) {
    setFormSubmitting(true);
    try {
      if (formMode === "create") {
        const created = await campaignApi.create(payload);
        setCampaigns((prev) => [...prev, created]);
        setBanner({
          variant: "success",
          message: `Campaign “${created.name}” created.`,
        });
        openCreateForm();
      } else if (editingCampaign?.id) {
        const updated = await campaignApi.update(editingCampaign.id, payload);
        setCampaigns((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        setEditingCampaign(updated);
        setBanner({
          variant: "success",
          message: `Campaign “${updated.name}” updated.`,
        });
      }
    } catch (error) {
      const message = extractMessage(error);
      setBanner({ variant: "danger", message });
      throw new Error(message);
    } finally {
      setFormSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs uppercase tracking-wide text-[var(--color-text-admin-muted)]">
            <Megaphone className="h-4 w-4" />
            Campaigns
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--color-text-admin)]">
            Home Campaign Manager
          </h1>
          <p className="text-sm text-[var(--color-text-admin-muted)]">
            Configure home page campaign cards and their destinations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={buildPath("/admin/campaigns/layout")}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
          >
            Layout
          </Link>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-text-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-admin)] hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New campaign
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <div className="rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-admin)] pb-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-admin)]">
                  Campaigns overview
                </p>
                <p className="text-xs text-[var(--color-text-admin-muted)]">
                  {activeCount} active • {campaigns.length} total
                </p>
              </div>
              <button
                type="button"
                onClick={loadCampaigns}
                className="text-xs text-[var(--color-text-admin-muted)] underline-offset-2 hover:underline"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {loadingCampaigns ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[280px] animate-pulse rounded-2xl bg-[var(--color-bg-admin)]/60"
                  />
                ))
              ) : sortedCampaigns.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6 text-center text-sm text-[var(--color-text-admin-muted)]">
                  No campaigns yet. Create your first campaign to replace the
                  placeholder cards on the home page.
                </div>
              ) : (
                sortedCampaigns.map((campaign, index) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onEdit={() => openEditForm(campaign)}
                    onDelete={() => handleDelete(campaign)}
                    onToggleActive={() => handleToggleActive(campaign)}
                    onMoveUp={() => handleMove(campaign, -1)}
                    onMoveDown={() => handleMove(campaign, +1)}
                    disableMoveUp={index === 0}
                    disableMoveDown={index === sortedCampaigns.length - 1}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-5">
          <CampaignForm
            mode={formMode}
            initialCampaign={editingCampaign}
            onSubmit={handleFormSubmit}
            onCancel={
              formMode === "edit"
                ? () => {
                    openCreateForm();
                  }
                : undefined
            }
            submitting={formSubmitting}
            productOptions={productOptions}
            setOptions={setOptions}
            categoryOptions={categoryOptions}
            discountOptions={discountOptions}
          />

          {loadingOptions && (
            <div className="mt-3 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-3 text-xs text-[var(--color-text-admin-muted)]">
              Loading selection options…
            </div>
          )}
        </div>
      </div>
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
