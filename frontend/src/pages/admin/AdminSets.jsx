/* eslint-disable no-useless-catch */
import { useEffect, useState } from "react";
import { PlusCircle, RefreshCw } from "lucide-react";
import { setApi } from "../../api/sets";
import { productApi } from "../../api/products";
import { categoryApi } from "../../api/categories";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import { useConfirm } from "../../components/ui/ConfirmDialog.jsx";
import SetTable from "../../components/admin/sets/SetTable";
import SetForm from "../../components/admin/sets/SetForm";

export default function AdminSets() {
  const confirm = useConfirm();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    loadSets();
    loadProducts();
    loadCategories();
  }, []);

  const loadSets = async () => {
    setLoading(true);
    try {
      const data = await setApi.list({ includeHidden: true });
      setSets(data);
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productApi.list({ limit: 200, includeHidden: true });
      setProducts(data.products || []);
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    }
  };

  const loadCategories = async () => {
    try {
      const tree = await categoryApi.tree();
      const flat = flattenTree(tree);
      setCategories(flat);
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    }
  };

  const handleCreate = () => {
    setEditingSet(null);
    setModalOpen(true);
  };

  const handleEdit = (set) => {
    setEditingSet(set);
    setModalOpen(true);
  };

  const handleDelete = async (set) => {
    const ok = await confirm({
      title: "Seti sil",
      description: `“${set.name}” silinsin mi? Bu işlem geri alınamaz.`,
      confirmText: "Sil",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await setApi.remove(set.id || set.slug);
      setBanner({ variant: "warning", message: "Set silindi" });
      await loadSets();
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    }
  };

  const handleSubmit = async (payload) => {
    try {
      if (editingSet?.id) {
        await setApi.update(editingSet.id, payload);
        setBanner({ variant: "success", message: "Set güncellendi" });
      } else {
        await setApi.create(payload);
        setBanner({ variant: "success", message: "Set oluşturuldu" });
      }
      setModalOpen(false);
      await loadSets();
      await loadProducts();
    } catch (error) {
      throw error;
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-admin)]">
            Setler
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-admin-muted)]">
            Özel koleksiyonları sergilemek için paket ürünler oluşturup yönetin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadSets}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
          >
            <RefreshCw className="h-4 w-4" /> Yenile
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            <PlusCircle className="h-5 w-5" /> Yeni set
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

      <SetTable
        sets={sets}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <SetForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        onDelete={editingSet ? () => handleDelete(editingSet) : undefined}
        initialSet={editingSet}
        products={products}
        categories={categories}
      />
    </section>
  );
}

function flattenTree(tree = [], path = []) {
  const result = [];
  tree.forEach((node) => {
    result.push({
      id: node.id,
      label: [...path, node.name].join(" / "),
    });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, [...path, node.name]));
    }
  });
  return result;
}

function extractMessage(error) {
  if (!error) return "Beklenmeyen hata";
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
  return String(error);
}
