import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { categoryApi } from "../../api/categories";
import CategoryTree from "../../components/admin/categories/CategoryTree";
import CategoryForm from "../../components/admin/categories/CategoryForm";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import LoadingOverlay from "../../components/ui/LoadingOverlay.jsx";
import { useConfirm } from "../../components/ui/ConfirmDialog.jsx";
import {
  collectDescendantIds,
  flattenCategoryTree,
} from "../../utils/catalog.js";
import i18n from "../../i18n/config.js";

export default function AdminCategories() {
  const confirm = useConfirm();
  const { t } = useTranslation();
  const [tree, setTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [banner, setBanner] = useState(null);

  const parentOptions = useMemo(() => {
    const flat = flattenCategoryTree(tree);
    const disabledSet = new Set();

    if (selectedCategory?.id) {
      disabledSet.add(selectedCategory.id);
      collectDescendantIds(tree, selectedCategory.id).forEach((id) =>
        disabledSet.add(id)
      );
    }

    return flat.map((item) => ({
      id: item.id,
      label: item.name,
      level: item.level,
      disabled:
        item.node.level >= 2 ||
        (selectedCategory ? disabledSet.has(item.id) : false),
    }));
  }, [tree, selectedCategory]);

  const handleSelect = useCallback(async (node) => {
    if (!node?.id) return;
    setSelectedId(node.id);
    setLoadingCategory(true);
    try {
      const detail = await categoryApi.get(node.id, {
        includeLocalized: true,
      });
      setSelectedCategory(detail);
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
      setSelectedCategory(null);
    } finally {
      setLoadingCategory(false);
    }
  }, []);

  const loadTree = useCallback(async (nextSelectId) => {
    setLoadingTree(true);
    try {
      const data = await categoryApi.tree({ includeLocalized: true });
      setTree(data);
      if (nextSelectId) {
        await handleSelect({ id: nextSelectId });
      }
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    } finally {
      setLoadingTree(false);
    }
  }, [handleSelect]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (selectedCategory?.id) {
        await categoryApi.update(selectedCategory.id, payload);
        setBanner({
          variant: "success",
          message: t("admin.categories.updated"),
        });
        await loadTree(selectedCategory.id);
      } else {
        const created = await categoryApi.create(payload);
        setBanner({
          variant: "success",
          message: t("admin.categories.created"),
        });
        setSelectedCategory(null);
        await loadTree(created.id);
      }
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory?.id) return;
    const ok = await confirm({
      title: t("admin.categories.deleteConfirmTitle", {
        name: selectedCategory.name,
      }),
      description: t("admin.categories.deleteConfirmText"),
      confirmText: t("admin.common.delete"),
      tone: "danger",
    });
    if (!ok) return;

    setSaving(true);
    try {
      await categoryApi.remove(selectedCategory.id);
      setBanner({
        variant: "warning",
        message: t("admin.categories.deleted"),
      });
      setSelectedCategory(null);
      setSelectedId(null);
      await loadTree();
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text-admin)]">
          {t("admin.categories.pageTitle")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-admin-muted)]">
          {t("admin.categories.pageSubtitle")}
        </p>
      </header>

      {banner && (
        <AlertBanner
          variant={banner.variant}
          message={banner.message}
          onClose={() => setBanner(null)}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="relative xl:col-span-4">
          <LoadingOverlay show={loadingTree} />
          <CategoryTree
            items={tree}
            selectedId={selectedId}
            onSelect={handleSelect}
            onCreateRoot={() => {
              setSelectedCategory(null);
              setSelectedId(null);
            }}
          />
        </div>
        <div className="relative xl:col-span-8">
          <LoadingOverlay
            show={saving || (loadingCategory && Boolean(selectedId))}
          />
          <CategoryForm
            category={selectedCategory}
            parentOptions={parentOptions}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
            submitting={saving}
            loading={loadingCategory && Boolean(selectedId)}
            onCancelEdit={() => {
              setSelectedCategory(null);
              setSelectedId(null);
            }}
          />
        </div>
      </div>
    </section>
  );
}

function extractMessage(error) {
  if (!error) return i18n.t("common.genericError");
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.message) return parsed.message;
    } catch (e) {
      console.error(e);
      /* ignore */
    }
    return error.message;
  }
  return String(error || "") || i18n.t("common.genericError");
}
