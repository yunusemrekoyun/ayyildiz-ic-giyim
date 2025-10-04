import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import AdminModal from "../../components/admin/common/AdminModal.jsx";
import UserStats from "../../components/admin/users/UserStats.jsx";
import UserTable from "../../components/admin/users/UserTable.jsx";
import UserProfileDetails from "../../components/admin/users/UserProfileDetails.jsx";
import { getUser as getCachedUser, userApi } from "../../api.js";

const LIMIT_OPTIONS = [10, 20, 50, 100];
const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "user", label: "Customers" },
  { value: "admin", label: "Administrators" },
];
const SORT_OPTIONS = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A-Z" },
  { value: "role", label: "Role" },
];

export default function AdminCustomers() {
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sort, setSort] = useState("recent");
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingUserId, setPendingUserId] = useState(null);

  const debouncedSearch = useDebounce(searchValue, 400);
  const me = useMemo(() => getCachedUser(), []);

  const loadUsers = useCallback(
    async (page = 1, overrides = {}) => {
      setLoading(true);
      try {
        const resolvedLimit = overrides.limit ?? limit;
        const resolvedRole =
          overrides.role !== undefined ? overrides.role : roleFilter;
        const resolvedSort = overrides.sort ?? sort;
        const resolvedSearch =
          overrides.search !== undefined ? overrides.search : debouncedSearch;

        const params = {
          page,
          limit: resolvedLimit,
          sort: resolvedSort,
        };
        if (resolvedRole) params.role = resolvedRole;
        if (resolvedSearch) params.search = resolvedSearch;
        const data = await userApi.list(params);
        setUsers(data.users || []);
        setMetrics(data.metrics || {});
        setPagination({
          page: data.pagination?.page || page,
          pages: data.pagination?.pages || 1,
          total: data.pagination?.total || 0,
          limit: resolvedLimit,
        });
      } catch (error) {
        setBanner({ type: "error", message: extractMessage(error) });
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, limit, roleFilter, sort]
  );

  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  const handleChangeRole = async (user, nextRole) => {
    setPendingUserId(user.id);
    try {
      const updated = await userApi.update(user.id, { role: nextRole });
      setUsers((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setMetrics((prev) => {
        if (!prev) return prev;
        if (user.role === updated.role) return prev;
        const diff = updated.role === "admin" ? 1 : -1;
        return {
          ...prev,
          adminUsers:
            prev.adminUsers !== undefined
              ? Math.max(0, (prev.adminUsers || 0) + diff)
              : prev.adminUsers,
        };
      });
      if (selectedUser?.id === updated.id) {
        setSelectedUser(updated);
      }
      setBanner({
        type: "success",
        message:
          updated.role === "admin"
            ? `${updated.fullName || updated.email} is now an administrator`
            : `${updated.fullName || updated.email} downgraded to customer`,
      });
    } catch (error) {
      setBanner({ type: "error", message: extractMessage(error) });
    } finally {
      setPendingUserId(null);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setDetailOpen(true);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.pages) return;
    setPagination((prev) => ({ ...prev, page }));
    loadUsers(page);
  };

  const handleRefresh = () => {
    loadUsers(pagination.page);
  };

  const handleClearFilters = () => {
    setSearchValue("");
    setRoleFilter("");
    setSort("recent");
    setLimit(20);
    setPagination((prev) => ({ ...prev, page: 1, limit: 20 }));
  };

  const filtersActive =
    Boolean(roleFilter) ||
    Boolean(searchValue) ||
    sort !== "recent" ||
    limit !== 20;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-admin)]">
            Customers
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-admin-muted)]">
            View your entire customer base, search, filter and adjust roles in a
            single glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          {filtersActive && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
            >
              <Filter className="h-4 w-4" /> Clear filters
            </button>
          )}
        </div>
      </header>

      <UserStats metrics={metrics} />

      <div className="grid gap-4 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-4 shadow-sm md:grid-cols-4">
        <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5">
          <Search className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
          <input
            value={searchValue}
            onChange={(event) => {
              setSearchValue(event.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Search name, email or phone"
            className="w-full border-0 bg-transparent text-sm text-[var(--color-text-admin)] outline-none"
          />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5">
          <SlidersHorizontal className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-full border-0 bg-transparent text-sm text-[var(--color-text-admin)] outline-none"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5">
          <SlidersHorizontal className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-full border-0 bg-transparent text-sm text-[var(--color-text-admin)] outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-3 py-2.5">
          <span className="text-sm text-[var(--color-text-admin-muted)]">
            Per page
          </span>
          <select
            value={limit}
            onChange={(event) => {
              const value = Number(event.target.value) || 20;
              setLimit(value);
              setPagination((prev) => ({ ...prev, page: 1, limit: value }));
            }}
            className="w-full border-0 bg-transparent text-sm text-[var(--color-text-admin)] outline-none"
          >
            {LIMIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {banner && (
        <div
          className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
            banner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <span>{banner.message}</span>
          <button
            onClick={() => setBanner(null)}
            className="text-xs font-semibold uppercase tracking-wide"
          >
            Close
          </button>
        </div>
      )}

      <UserTable
        users={users}
        loading={loading}
        onSelect={handleSelectUser}
        onChangeRole={handleChangeRole}
        currentUserId={me?.id}
        pendingUserId={pendingUserId}
      />

      {pagination.pages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-admin)] md:flex-row">
          <div>
            {pagination.total} users • page {pagination.page} of {pagination.pages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm hover:bg-[var(--color-bg-hover)] disabled:opacity-60"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm hover:bg-[var(--color-bg-hover)] disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <AdminModal
        open={detailOpen && Boolean(selectedUser)}
        onClose={() => {
          setDetailOpen(false);
          setSelectedUser(null);
        }}
        title="Customer details"
        description={selectedUser?.email}
      >
        <UserProfileDetails user={selectedUser} />
      </AdminModal>
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
    } catch {
      /* ignore */
    }
    return error.message;
  }
  return String(error);
}
