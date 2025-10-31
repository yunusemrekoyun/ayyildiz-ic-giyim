/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import { PlusCircle, RefreshCw, Search } from "lucide-react";
import { categoryApi } from "../../api/categories";
import { productApi } from "../../api/products";
import { stocksApi } from "../../api/stocks"; // ✅ yeni: stokları buradan okuyacağız
import ProductTable from "../../components/admin/products/ProductTable";
import ProductForm from "../../components/admin/products/ProductForm";
import { flattenCategoryTree } from "../../utils/catalog.js";
import AlertBanner from "../../components/ui/AlertBanner.jsx";
import { useConfirm } from "../../components/ui/ConfirmDialog.jsx";

export default function AdminProducts() {
  const confirm = useConfirm();
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
  const [deleteDialog, setDeleteDialog] = useState(null);

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
      setBanner({ variant: "danger", message: extractMessage(error) });
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

      // Yeni backend ile shape farklılıklarını normalize et
      const normalized =
        (data.products || []).map((p) => ({
          id: p.id || p._id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          isActive: p.isActive,
          category: p.category || p.categoryId || null,
          images: p.images || p.media || [],
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          setsCount: Number(p.setsCount ?? p.setCount ?? 0) || 0,
        })) || [];

      setProducts(normalized);
      setPagination(
        data.pagination || {
          page: 1,
          pages: 1,
          limit: 20,
          total: normalized.length,
        }
      );
    } catch (error) {
      setBanner({ variant: "danger", message: extractMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = async (product) => {
    try {
      const full = await productApi.get(product.id || product.slug);
      const normalizedColors = normalizeOptionList(full.colors);
      const normalizedSizes = normalizeOptionList(full.sizes);
      const attrObj = full.customAttribute || {
        title: "",
        values: [],
        show: false,
      };
      const attrValues = normalizeOptionList(attrObj.values);
      const fullNormalized = {
        id: full.id || full._id,
        name: full.name,
        slug: full.slug,
        price: full.price,
        isActive: full.isActive,
        description: full.description || "",
        careInstructions: full.careInstructions || "",
        details: normalizeDetailsList(full.details),
        colors: normalizedColors,
        sizes: normalizedSizes,
        showColors: full.showColors ?? true,
        showSizes: full.showSizes ?? true,
        customAttribute: {
          title: attrObj.title || "",
          values: attrValues,
          show: attrObj.show ?? false,
        },
        category: full.category || full.categoryId || "",
        images: full.images || full.media || [],
        // inventory artık product’ın içinde değil; aşağıda stok API’den okuyoruz
      };

      // ✅ stokları StockItem tablosundan çek
      const stockRes = await stocksApi.list({
        ownerModel: "Product",
        owner: fullNormalized.id,
      });
      const inventory = (stockRes.items || []).map((it) => ({
        color: it.color ?? null,
        size: it.size ?? null,
        attributeValue: it.attributeValue ?? null,
        stock: Number(it.qtyOnHand) || 0,
      }));

      setEditingProduct({ ...fullNormalized, inventory });
      setModalOpen(true);
    } catch (err) {
      console.error("Product load failed:", err);
      setBanner({ variant: "danger", message: extractMessage(err) });
    }
  };

  const handleDeleteProduct = async (product) => {
    const ok = await confirm({
      title: "Ürünü sil",
      description: `“${product.name}” silinsin mi? Bu işlem geri alınamaz.`,
      confirmText: "Sil",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await productApi.remove(product.id || product.slug);
      setBanner({ variant: "warning", message: "Ürün silindi" });
      await loadProducts(pagination.page);
    } catch (error) {
      const payload = parseErrorPayload(error);
      if (payload?.requiresResolution && Array.isArray(payload.sets)) {
        setDeleteDialog({
          product,
          sets: payload.sets,
          loading: false,
        });
        return;
      }
      setBanner({
        variant: "danger",
        message: payload?.message || extractMessage(error),
      });
    }
  };

  const handleResolveDelete = async (action) => {
    if (!deleteDialog) return;
    if (action === "cancel") {
      setDeleteDialog(null);
      return;
    }

    const actionParam = action === "delete_sets" ? "delete_sets" : "detach";
    setDeleteDialog((prev) => ({ ...prev, loading: true }));

    try {
      await productApi.remove(deleteDialog.product.id || deleteDialog.product.slug, {
        setAction: actionParam,
      });
      setDeleteDialog(null);
      setBanner({
        variant: "success",
        message:
          actionParam === "delete_sets"
            ? "Ürün ve bağlı setler silindi"
            : "Ürün setlerden kaldırıldı ve silindi",
      });
      await loadProducts(pagination.page);
    } catch (error) {
      const payload = parseErrorPayload(error);
      setBanner({
        variant: "danger",
        message: payload?.message || extractMessage(error),
      });
      setDeleteDialog(null);
    }
  };

  // ✅ Form’dan gelen kaydetme artık stokları ayrı kaydeder
  const handleSaveProduct = async ({ productPayload, stockLines }) => {
    // productPayload: sadece ürün alanları (stok hariç)
    // stockLines: [{ color, size, attributeValue, qtyOnHand }, ...]
    if (editingProduct?.id) {
      const updated = await productApi.update(
        editingProduct.id,
        productPayload
      );
      // Stok replace
      await stocksApi.replace({
        ownerModel: "Product",
        owner: editingProduct.id,
        items: stockLines,
      });
      setBanner({ variant: "success", message: "Ürün güncellendi" });
      await loadProducts(pagination.page);
    } else {
      const created = await productApi.create(productPayload);
      // ✅ Cevap şekline göre ID yakala (çeşitli backend varyantlarına dayanıklı)
      const newId =
        created?.id ||
        created?._id ||
        created?.product?.id ||
        created?.product?._id ||
        null;

      let ownerId = newId;
      if (!ownerId) {
        const slug =
          created?.slug ||
          created?.product?.slug ||
          created?.data?.slug ||
          null;
        if (slug) {
          const full = await productApi.get(slug);
          ownerId = full?.id || full?._id || null;
        }
      }

      if (ownerId && stockLines?.length) {
        await stocksApi.replace({
          ownerModel: "Product",
          owner: ownerId,
          items: stockLines,
        });
      }
      setBanner({ variant: "success", message: "Ürün oluşturuldu" });
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
            Ürünler
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-admin-muted)]">
            Mağaza kataloğundaki ürünleri ekleyin, düzenleyin ve yönetin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadProducts(pagination.page)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
          >
            <RefreshCw className="h-4 w-4" /> Yenile
          </button>
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            <PlusCircle className="h-4 w-4" /> Yeni ürün
          </button>
        </div>
      </header>

      <div className="grid gap-4 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4 shadow-sm md:grid-cols-3">
        <label className="md:col-span-1 flex items-center gap-2 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5">
          <Search className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Ürün ara"
            className="w-full border-0 bg-transparent text-sm text-[var(--color-text-admin)] outline-none"
          />
        </label>
        <label className="md:col-span-1 flex items-center gap-2 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5">
          <span className="text-sm text-[var(--color-text-admin-muted)]">
            Kategori
          </span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="flex-1 border-0 bg-transparent text-sm text-[var(--color-text-admin)] outline-none"
          >
            <option value="">Tüm kategoriler</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-1 flex items-center justify-end text-xs text-[var(--color-text-admin-muted)]">
          {pagination.total} ürün • sayfa {pagination.page} / {pagination.pages}
        </div>
      </div>

      {banner && (
        <AlertBanner
          variant={banner.variant}
          message={banner.message}
          onClose={() => setBanner(null)}
        />
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
            Önceki
          </button>
          <button
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-60"
          >
            Sonraki
          </button>
        </div>
      )}

      <ProductForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveProduct} // ✅ artık product+stock ayrı gelecek
        initialProduct={editingProduct}
        categories={categoryOptions}
      />

      {deleteDialog && (
        <DeleteProductResolutionModal
          product={deleteDialog.product}
          sets={deleteDialog.sets}
          loading={deleteDialog.loading}
          onResolve={handleResolveDelete}
        />
      )}
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

function DeleteProductResolutionModal({ product, sets = [], loading = false, onResolve }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] shadow-xl">
        <header className="border-b border-[var(--color-border-admin)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-admin)]">
            Ürün setlerde kullanılıyor
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-admin-muted)]">
            “{product?.name || "Ürün"}” aşağıdaki setlere ekli. Devam etmek için bir seçenek belirleyin.
          </p>
        </header>

        <div className="max-h-64 overflow-y-auto px-5 py-4">
          {sets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border-admin)] px-4 py-6 text-center text-sm text-[var(--color-text-admin-muted)]">
              Bu ürün başka setlerde görünmüyor.
            </div>
          ) : (
            <ul className="space-y-3">
              {sets.map((set) => (
                <li
                  key={set.id || set.slug || set.name}
                  className="rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-surface-light)] px-4 py-3"
                >
                  <div className="text-sm font-semibold text-[var(--color-text-admin)]">
                    {set.name || "Set"}
                  </div>
                  <div className="text-xs text-[var(--color-text-admin-muted)]">
                    {set.slug ? `/${set.slug}` : ""}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-admin-muted)]">
                    Ürün adedi: {set.productCount ?? "-"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t border-[var(--color-border-admin)] bg-[var(--color-surface-light)] px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => onResolve?.("detach")}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-60"
          >
            Ürünü setlerden çıkar
          </button>
          <button
            type="button"
            onClick={() => onResolve?.("delete_sets")}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
          >
            Setleri de sil
          </button>
          <button
            type="button"
            onClick={() => onResolve?.("cancel")}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-60"
          >
            Vazgeç
          </button>
        </footer>
      </div>
    </div>
  );
}

function normalizeOptionList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter((item) => item.length);
      }
    } catch {
      // fall back to delimiter split
    }
    return trimmed
      .split(/[,;\r?\n]+/)
      .map((item) => item.trim())
      .filter((item) => item.length);
  }
  return [];
}

function normalizeDetailsList(details) {
  if (!details) return [];
  if (Array.isArray(details)) {
    return details
      .map((item) => String(item).trim())
      .filter((item) => item.length);
  }
  if (typeof details === "string") {
    const trimmed = details.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter((item) => item.length);
      }
    } catch {
      // fall back to newline split
    }
    return trimmed
      .split(/\r?\n+/)
      .map((item) => item.trim())
      .filter((item) => item.length);
  }
  return [];
}

function extractMessage(error) {
  const payload = parseErrorPayload(error);
  if (payload?.message) return payload.message;
  if (!error) return "Beklenmeyen hata";
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function parseErrorPayload(error) {
  if (!error) return null;
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : null;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
