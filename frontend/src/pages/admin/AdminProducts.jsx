import { useEffect, useMemo, useState } from "react";
import { PlusCircle, RefreshCw, Search } from "lucide-react";
import { categoryApi, productApi } from "../../api";
import ProductTable from "../../components/admin/products/ProductTable";
import ProductForm from "../../components/admin/products/ProductForm";
import { flattenCategoryTree } from "../../utils/catalog.js";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [categoryTree, setCategoryTree] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounce(searchValue, 400);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    limit: 20,
    total: 0,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, categoryFilter]);

  const categoryOptions = useMemo(() => {
    const flattened = flattenCategoryTree(categoryTree);
    return flattened.map((item) => ({
      id: item.id,
      label: item.path.join(" / "),
      level: item.level,
    }));
  }, [categoryTree]);

  const loadCategories = async () => {
    try {
      const data = await categoryApi.tree();
      setCategoryTree(data);
    } catch (error) {
      setBanner({ type: "error", message: extractMessage(error) });
    }
  };

  const loadProducts = async (page = 1) => {
    setLoading(true);
    try {
      const data = await productApi.list({
        page,
        limit: pagination.limit,
        search: debouncedSearch,
        category: categoryFilter,
        includeHidden: true,
      });
      setProducts(data.products || []);
      setPagination(data.pagination || { page: 1, pages: 1, limit: 20, total: 0 });
    } catch (error) {
      setBanner({ type: "error", message: extractMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Delete “${product.name}”? This action is irreversible.`
    );
    if (!confirmed) return;
    try {
      await productApi.remove(product.id || product.slug);
      setBanner({ type: "success", message: "Product deleted" });
      await loadProducts(pagination.page);
    } catch (error) {
      setBanner({ type: "error", message: extractMessage(error) });
    }
  };

  const handleSaveProduct = async (payload) => {
    if (editingProduct?.id) {
      await productApi.update(editingProduct.id, payload);
      setBanner({ type: "success", message: "Product updated" });
      await loadProducts(pagination.page);
    } else {
      await productApi.create(payload);
      setBanner({ type: "success", message: "Product created" });
      await loadProducts(1);
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.pages) return;
    loadProducts(page);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-admin)]">
            Products
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-admin-muted)]">
            Add, edit and curate items across the store catalog.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadProducts(pagination.page)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            <PlusCircle className="h-4 w-4" /> New product
          </button>
        </div>
      </header>

      <div className="grid gap-4 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4 shadow-sm md:grid-cols-3">
        <label className="md:col-span-1 flex items-center gap-2 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5">
          <Search className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search products"
            className="w-full border-0 bg-transparent text-sm text-[var(--color-text-admin)] outline-none"
          />
        </label>
        <label className="md:col-span-1 flex items-center gap-2 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5">
          <span className="text-sm text-[var(--color-text-admin-muted)]">
            Category
          </span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="flex-1 border-0 bg-transparent text-sm text-[var(--color-text-admin)] outline-none"
          >
            <option value="">All categories</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-1 flex items-center justify-end text-xs text-[var(--color-text-admin-muted)]">
          {pagination.total} products • page {pagination.page} of {pagination.pages}
        </div>
      </div>

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

      <ProductTable
        products={products}
        loading={loading}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
      />

      {pagination.pages > 1 && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-60"
          >
            Previous
          </button>
          <button
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-60"
          >
            Next
          </button>
        </div>
      )}

      <ProductForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveProduct}
        initialProduct={editingProduct}
        categories={categoryOptions}
      />
    </section>
  );
}

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
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
