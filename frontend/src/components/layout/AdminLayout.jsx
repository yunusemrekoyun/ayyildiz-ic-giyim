// src/components/layout/AdminLayout.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tags,
  Images,
  Settings,
  BarChart3,
  Bell,
  Search,
  Home,
  LogOut,
} from "lucide-react";
import { authApi } from "../../api/auth";
import { getUser as getUserCache } from "../../api/client";

/**
 * AdminLayout
 * - Sadece admin paleti değişkenleri kullanır (bg-admin, text-admin, bg-card, bg-hover, bg-sidebar, text-sidebar, text-admin-muted, border-admin)
 */
export default function AdminLayout({ children, title, subtitle, actions }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [me, setMe] = useState(getUserCache());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await authApi.me();
        if (mounted && res) setMe(res);
      } catch {
        // guard zaten LayoutSelector'da
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (!parts[0]) return [];
    return parts.map((p, i) => ({
      label: pretty(p),
      href: "/" + parts.slice(0, i + 1).join("/"),
    }));
  }, [location.pathname]);

  const menu = [
    {
      label: "Overview",
      items: [
        { to: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
        { to: "/admin/analytics", label: "Analytics", Icon: BarChart3 },
      ],
    },
    {
      label: "Catalog",
      items: [
        { to: "/admin/products", label: "Products", Icon: Package },
        { to: "/admin/categories", label: "Categories", Icon: Tags },
        { to: "/admin/sets", label: "Sets", Icon: Images },
        { to: "/admin/media", label: "Media", Icon: Images },
      ],
    },
    {
      label: "Sales",
      items: [
        { to: "/admin/orders", label: "Orders", Icon: ShoppingCart },
        { to: "/admin/customers", label: "Customers", Icon: Users },
      ],
    },
    {
      label: "Settings",
      items: [{ to: "/admin/settings", label: "Settings", Icon: Settings }],
    },
  ];

  async function handleLogout() {
    await authApi.logout();
    navigate("/account?view=login", { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-admin)] text-[var(--color-text-admin)]">
      {/* SIDEBAR (Desktop) */}
      <aside
        className={[
          "relative hidden md:flex md:flex-col bg-[var(--color-bg-sidebar)] text-[var(--color-text-sidebar)] transition-[width] duration-300",
          sidebarCollapsed ? "md:w-20" : "md:w-72",
          "shadow-sm h-screen",
        ].join(" ")}
      >
        {/* Brand / Collapse */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border-admin)]/20">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10">
              <Images className="h-5 w-5 text-[var(--color-text-sidebar)]" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg font-semibold tracking-tight">
                Admin Panel
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarCollapsed((s) => !s)}
            className="hidden md:inline-flex rounded-lg p-2 hover:bg-white/10"
            aria-label="Toggle sidebar"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Menu (scrollable orta alan) */}
        <nav className="flex-1 overflow-y-auto py-3">
          {menu.map((group) => (
            <div key={group.label} className="mt-2">
              {!sidebarCollapsed && (
                <div className="px-4 py-2 text-[12px] uppercase tracking-wider text-[var(--color-text-sidebar)]/70">
                  {group.label}
                </div>
              )}
              <ul className="px-2">
                {group.items.map((it) => (
                  <li key={it.to}>
                    <NavItem
                      to={it.to}
                      label={it.label}
                      Icon={it.Icon}
                      collapsed={sidebarCollapsed}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* FOOTER: her zaman en altta görünür */}
        <div className="mt-auto sticky bottom-0 border-t border-[var(--color-border-admin)]/20 bg-[var(--color-bg-sidebar)]/95 backdrop-blur">
          {/* User mini card */}
          <div className="p-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 hover:bg-white/15 transition-colors">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-[var(--color-text-sidebar)] font-semibold">
                {getInitials(me)}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {me?.firstName
                      ? `${me.firstName} ${me.lastName || ""}`.trim()
                      : "—"}
                  </div>
                  <div className="truncate text-xs text-[var(--color-text-sidebar)]/70">
                    {me?.email || ""}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ana sayfa butonu */}
          <div className="px-3 pb-3">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-xl bg-white/10 p-3 hover:bg-white/15 transition-colors"
              title="Ana sayfaya dön"
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/15">
                <Home className="h-5 w-5 text-[var(--color-text-sidebar)]" />
              </div>
              {!sidebarCollapsed && (
                <span className="text-sm font-semibold">Ana sayfa</span>
              )}
            </Link>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      <MobileDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        menu={menu}
        me={me}
      />

      {/* MAIN */}
      <div className="flex min-w-0 flex-1 min-h-0 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="inline-flex md:hidden rounded-lg p-2 text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Breadcrumbs items={breadcrumbs} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* search */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] pl-3 pr-2 py-1.5">
              <Search className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
              <input
                placeholder="Search in admin…"
                className="w-44 border-0 text-sm outline-none placeholder:text-[var(--color-text-admin-muted)]"
              />
            </div>
            <button className="rounded-full p-2 hover:bg-[var(--color-bg-hover)]">
              <Bell className="h-5 w-5 text-[var(--color-text-admin-muted)]" />
            </button>

            {/* user menu */}
            <UserMenu me={me} onLogout={handleLogout} />
          </div>
        </header>

        {/* Scrollable page area (header + content birlikte kendi içinde scroll) */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Page header */}
          <div className="border-b border-[var(--color-border-admin)] bg-[var(--color-bg-admin)]">
            <div className="mx-auto max-w-[1400px] px-4 py-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-[var(--color-text-admin)]">
                    {title ||
                      pageTitleFromBreadcrumb(breadcrumbs) ||
                      "Overview"}
                  </h1>
                  {subtitle && (
                    <p className="mt-1 text-sm text-[var(--color-text-admin-muted)]">
                      {subtitle}
                    </p>
                  )}
                </div>
                {actions && (
                  <div className="flex items-center gap-2">{actions}</div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <main className="min-h-0">
            <div className="mx-auto max-w-[1400px] px-4 py-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Sub Components ----------------- */

// eslint-disable-next-line no-unused-vars
function NavItem({ to, label, Icon, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 rounded-lg px-3 py-2 my-0.5",
          isActive
            ? "bg-[var(--color-bg-card)] text-[var(--color-bg-sidebar)]"
            : "text-[var(--color-text-sidebar)] hover:bg-white/10",
        ].join(" ")
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

function MobileDrawer({ open, onClose, menu, me }) {
  return (
    <div
      className={[
        "md:hidden fixed inset-0 z-50",
        open ? "" : "pointer-events-none",
      ].join(" ")}
    >
      {/* Backdrop */}
      <div
        className={[
          "absolute inset-0 bg-black/40 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={[
          "absolute left-0 top-0 h-full w-[85%] max-w-80 bg-[var(--color-bg-sidebar)] text-[var(--color-text-sidebar)] shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-admin)]/20">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10">
              <Images className="h-5 w-5 text-[var(--color-text-sidebar)]" />
            </div>
            <span className="text-lg font-semibold">Admin Panel</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="overflow-y-auto pb-4">
          {menu.map((group) => (
            <div key={group.label} className="mt-2">
              <div className="px-4 py-2 text-[12px] uppercase tracking-wider text-[var(--color-text-sidebar)]/70">
                {group.label}
              </div>
              <ul className="px-2">
                {group.items.map((it) => (
                  <li key={it.to}>
                    <NavLink
                      to={it.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-3 rounded-lg px-3 py-2 my-0.5",
                          isActive
                            ? "bg-[var(--color-bg-card)] text-[var(--color-bg-sidebar)]"
                            : "text-[var(--color-text-sidebar)] hover:bg-white/10",
                        ].join(" ")
                      }
                    >
                      <it.Icon className="h-5 w-5" />
                      <span>{it.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="border-t border-[var(--color-border-admin)]/20 p-3 mt-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-[var(--color-text-sidebar)] font-semibold">
                {getInitials(me)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {me?.firstName
                    ? `${me.firstName} ${me.lastName || ""}`.trim()
                    : "—"}
                </div>
                <div className="truncate text-xs text-[var(--color-text-sidebar)]/70">
                  {me?.email || ""}
                </div>
              </div>
            </div>
          </div>

          {/* Go to Home (Mobile) */}
          <div className="border-t border-[var(--color-border-admin)]/20 p-3">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl bg-white/10 p-3 hover:bg-white/15 transition-colors"
              title="Ana sayfaya dön"
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/15">
                <Home className="h-5 w-5 text-[var(--color-text-sidebar)]" />
              </div>
              <span className="text-sm font-semibold">Ana sayfa</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserMenu({ me, onLogout }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onDoc = () => setOpen(false);
    if (open) document.addEventListener("click", onDoc, { once: true });
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-2 py-1.5 hover:bg-[var(--color-bg-hover)]"
      >
        <div className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-bg-admin)] text-[var(--color-text-admin)] text-xs font-semibold">
          {getInitials(me)}
        </div>
        <span className="hidden sm:block text-sm text-[var(--color-text-admin)]">
          {me?.firstName || "User"}
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] shadow-lg">
          <div className="px-4 py-3">
            <div className="text-sm font-semibold text-[var(--color-text-admin)]">
              {me?.firstName
                ? `${me.firstName} ${me.lastName || ""}`.trim()
                : "—"}
            </div>
            <div className="truncate text-xs text-[var(--color-text-admin-muted)]">
              {me?.email}
            </div>
          </div>
          <div className="h-px bg-[var(--color-border-admin)]" />
          <MenuItem to="/admin/settings">Profile & Settings</MenuItem>
          <MenuItem to="/admin/dashboard">Admin Home</MenuItem>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-[var(--color-bg-hover)]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ to, children }) {
  return (
    <Link
      to={to}
      className="block px-4 py-2.5 text-sm text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
    >
      {children}
    </Link>
  );
}

function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav className="flex items-center gap-1 text-sm text-[var(--color-text-admin-muted)]">
      {items.map((b, i) => {
        const last = i === items.length - 1;
        return (
          <span key={b.href} className="flex items-center">
            {!last ? (
              <Link
                to={b.href}
                className="hover:text-[var(--color-text-admin)]"
              >
                {b.label}
              </Link>
            ) : (
              <span className="text-[var(--color-text-admin)] font-medium">
                {b.label}
              </span>
            )}
            {!last && (
              <span className="mx-2 text-[var(--color-text-admin-muted)]">
                /
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/* ----------------- Helpers ----------------- */

function pretty(seg) {
  return seg.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function getInitials(u) {
  const a = (u?.firstName || u?.name || "").trim();
  const b = (u?.lastName || "").trim();
  const res =
    (a ? a[0] : "") + (b ? b[0] : a ? a.split(" ")[1]?.[0] || "" : "");
  return (res || "U").toUpperCase();
}

function pageTitleFromBreadcrumb(bc) {
  if (!bc?.length) return null;
  return pretty(bc[bc.length - 1].label);
}
