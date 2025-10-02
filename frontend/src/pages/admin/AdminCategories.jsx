import { useEffect, useMemo, useState } from "react";
import { categoryApi } from "../../api";
import CategoryTree from "../../components/admin/categories/CategoryTree";
import CategoryForm from "../../components/admin/categories/CategoryForm";
import {
  collectDescendantIds,
  flattenCategoryTree,
} from "../../utils/catalog.js";

export default function AdminCategories() {
  const [tree, setTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    refreshTree();
  }, []);

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
        item.node.level >= 2 || (selectedCategory ? disabledSet.has(item.id) : false),
    }));
  }, [tree, selectedCategory]);

  const handleSelect = async (node) => {
    if (!node?.id) return;
    setSelectedId(node.id);
    setLoadingCategory(true);
    try {
      const detail = await categoryApi.get(node.id);
      setSelectedCategory(detail);
    } catch (error) {
      setBanner({ type: "error", message: extractMessage(error) });
      setSelectedCategory(null);
    } finally {
      setLoadingCategory(false);
    }
  };

  const refreshTree = async (nextSelectId) => {
    setLoadingTree(true);
    try {
      const data = await categoryApi.tree();
      setTree(data);
      if (nextSelectId) {
        await handleSelect({ id: nextSelectId });
      }
    } catch (error) {
      setBanner({ type: "error", message: extractMessage(error) });
    } finally {
      setLoadingTree(false);
    }
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (selectedCategory?.id) {
        await categoryApi.update(selectedCategory.id, payload);
        setBanner({ type: "success", message: "Category updated" });
        await refreshTree(selectedCategory.id);
      } else {
        const created = await categoryApi.create(payload);
        setBanner({ type: "success", message: "Category created" });
        setSelectedCategory(null);
        await refreshTree(created.id);
      }
    } catch (error) {
      setBanner({ type: "error", message: extractMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory?.id) return;
    const confirmed = window.confirm(
      "Deleting this category is permanent. Continue?"
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await categoryApi.remove(selectedCategory.id);
      setBanner({ type: "success", message: "Category deleted" });
      setSelectedCategory(null);
      setSelectedId(null);
      await refreshTree();
    } catch (error) {
      setBanner({ type: "error", message: extractMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text-admin)]">
          Categories
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-admin-muted)]">
          Manage the three-level catalog tree and optional thumbnails.
        </p>
      </header>

      {banner && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            banner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <CategoryTree
            items={tree}
            selectedId={selectedId}
            onSelect={handleSelect}
            onCreateRoot={() => {
              setSelectedCategory(null);
              setSelectedId(null);
            }}
          />
          {loadingTree && (
            <p className="mt-3 text-xs text-[var(--color-text-admin-muted)]">
              Updating tree...
            </p>
          )}
        </div>
        <div className="xl:col-span-8">
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
  if (!error) return "Unexpected error";
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.message) return parsed.message;
    } catch (_) {
      /* ignore */
    }
    return error.message;
  }
  return String(error);
}
