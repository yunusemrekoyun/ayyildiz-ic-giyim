import { useEffect, useMemo, useState } from "react";
import { authApi, getUser, setUser, userDetailsApi } from "../api";
import {
  Heart,
  User as UserIcon,
  Trash2,
  Pencil,
  Plus,
  LogOut,
  Mail,
  Phone,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const TABS = ["Overview", "Orders", "Addresses", "Wishlist"];
const normalizeTab = (raw) => {
  if (!raw) return null;
  const t = String(raw).toLowerCase();
  if (["wishlist", "favorites", "favoriler"].includes(t)) return "Wishlist";
  if (["addresses", "address", "adresler"].includes(t)) return "Addresses";
  if (["orders", "siparisler"].includes(t)) return "Orders";
  if (["overview", "profil"].includes(t)) return "Overview";
  return null;
};

/* ---------- avatar helpers ---------- */
function normalizeUrl(u) {
  if (!u) return null;
  try {
    if (/^https?:\/\//i.test(u)) return u;
    if (/^data:image\//i.test(u)) return u;
    if (/^\/\//.test(u)) return window.location.protocol + u;
    const apiBase = import.meta.env.VITE_API_URL || "";
    const origin = apiBase.replace(/\/api\/?$/i, "");
    const path = u.startsWith("/") ? u : `/${u}`;
    return `${origin}${path}`;
  } catch {
    return u;
  }
}
function extractAvatarUrl(any) {
  if (!any) return null;
  if (typeof any === "string") return normalizeUrl(any);

  if (any.avatarUrl) return normalizeUrl(any.avatarUrl);
  const a =
    any.avatar ||
    any.profile?.avatar ||
    any.details?.avatar ||
    any.user?.avatar;
  if (a) return normalizeUrl(a.secure_url || a.url || a.path || a.avatarUrl);

  if (any.url || any.secure_url || any.path)
    return normalizeUrl(any.secure_url || any.url || any.path);

  return null;
}

export default function UserAccountPage({ onLogout }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const urlTab =
    normalizeTab(searchParams.get("tab")) ||
    normalizeTab(location.hash.replace(/^#/, "")) ||
    normalizeTab(location.state?.tab);
  const [active, setActive] = useState(urlTab || TABS[0]);
  const [user, setUserState] = useState(getUser());
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [favorites, setFavorites] = useState({ products: [], sets: [] });
  const [busy, setBusy] = useState(false);

  // 1) URL -> sekme senkronu (sadece location değiştiğinde)
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const nextFromUrl =
      normalizeTab(sp.get("tab")) ||
      normalizeTab(location.hash.replace(/^#/, "")) ||
      normalizeTab(location.state?.tab);
    if (nextFromUrl) {
      setActive(nextFromUrl);
    }
    // NOT: burada active'e bağımlı değiliz; sadece URL değişince çalışsın
  }, [location.search, location.hash, location.state]);

  // 2) Verileri çekme (mount'ta 1 kez)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 1) me()
        const me = await authApi.me();
        if (mounted && me) setUserState(me);
        const avatarFromMe = extractAvatarUrl(me);

        // 2) user-details
        const all = await userDetailsApi.getAll();
        if (!mounted) return;

        const avatarUrl =
          all?.avatar?.url ||
          all?.profile?.avatar?.url ||
          all?.profile?.avatarUrl ||
          avatarFromMe ||
          null;

        if (all?.user) {
          setProfile({
            firstName: all.user.firstName,
            lastName: all.user.lastName,
            email: all.user.email,
            phone: all.user.phone,
            avatarUrl,
          });
        } else if (all?.profile) {
          setProfile({
            ...all.profile,
            avatarUrl: avatarUrl,
          });
        } else {
          setProfile({ avatarUrl });
        }

        setAddresses(all.addresses || []);
        const fav = await userDetailsApi.favorites();
        setFavorites(fav);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const avatarSrc = profile?.avatarUrl || extractAvatarUrl(user) || null;

  const initials = useMemo(() => {
    const f = profile?.firstName || user?.firstName || user?.name || "?";
    const l = (profile?.lastName || user?.lastName || "").slice(0, 1);
    return `${(f || "?").slice(0, 1)}${l}`.toUpperCase();
  }, [profile, user]);

  if (loading) {
    return (
      <section className="bg-surface-light/60">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <aside className="md:col-span-3">
              <div className="rounded-2xl border border-border bg-white p-4 space-y-4">
                <div className="rounded-xl border border-border bg-contact-bg p-4">
                  <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-surface animate-pulse" />
                  <div className="h-4 w-2/3 bg-surface rounded mx-auto animate-pulse" />
                  <div className="mt-2 h-3 w-1/2 bg-surface rounded mx-auto animate-pulse" />
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 rounded-lg bg-surface animate-pulse"
                  />
                ))}
                <div className="h-10 rounded-full border border-border" />
              </div>
            </aside>
            <div className="md:col-span-9">
              <div className="rounded-2xl border border-border bg-white p-6 h-[520px] animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const sidebarUserName =
    profile?.firstName || user?.firstName
      ? `${profile?.firstName || user?.firstName} ${
          profile?.lastName || user?.lastName || ""
        }`.trim()
      : user?.name || "—";

  const sidebarEmail = profile?.email || user?.email || "—";

  return (
    <section className="bg-surface-light/60">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Sidebar */}
          <aside className="md:col-span-3">
            <div className="rounded-2xl border border-border bg-white p-4">
              <div className="rounded-xl border border-border bg-contact-bg p-4 text-center">
                <div className="relative mx-auto mb-2 h-16 w-16 rounded-full bg-surface grid place-items-center text-primary font-semibold overflow-hidden">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "";
                        e.currentTarget.style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent) parent.innerText = initials;
                      }}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="font-semibold text-primary">
                  {sidebarUserName}
                </div>
                <div className="text-sm text-secondary">{sidebarEmail}</div>
              </div>

              <ul className="mt-4 space-y-2">
                {TABS.map((t) => (
                  <li key={t}>
                    <button
                      className={[
                        "w-full rounded-lg px-3 py-2 text-left text-sm",
                        active === t
                          ? "bg-surface-hover text-primary"
                          : "hover:bg-surface-hover text-secondary",
                        busy ? "opacity-60 pointer-events-none" : "",
                      ].join(" ")}
                      onClick={() => setActive(t)}
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>

              <button
                onClick={onLogout}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-primary hover:bg-surface-hover"
                disabled={busy}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>

          {/* Content */}
          <div className="md:col-span-9">
            <div className="rounded-2xl border border-border bg-white p-6 relative">
              <BusyBar show={busy} />
              <div
                className={
                  busy
                    ? "pointer-events-none opacity-60 transition"
                    : "transition"
                }
              >
                {active === "Overview" && (
                  <Overview
                    user={user}
                    profile={profile}
                    avatarSrc={avatarSrc}
                    onSave={async (payload) => {
                      try {
                        setBusy(true);
                        // 1) Text alanları
                        await userDetailsApi.updateProfile({
                          firstName: payload.firstName,
                          lastName: payload.lastName,
                          email: payload.email,
                          phone: payload.phone,
                        });

                        // 2) Avatar dosyası varsa yükle
                        if (payload.avatarFile) {
                          const av = await userDetailsApi.uploadAvatar(
                            payload.avatarFile
                          );
                          if (av?.url) {
                            setProfile((p) => ({
                              ...(p || {}),
                              avatarUrl: av.url,
                            }));
                          }
                        }

                        // auth user’ı güncelle (ad/soyad/email değişmiş olabilir)
                        const freshMe = await authApi.me();
                        if (freshMe) {
                          setUser(freshMe);
                          setUserState(freshMe);
                        }
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                )}

                {active === "Orders" && <Orders />}

                {active === "Addresses" && (
                  <Addresses
                    addresses={addresses}
                    onCreate={async (payload) => {
                      const created = await userDetailsApi.createAddress(
                        payload
                      );
                      setAddresses((prev) => [created, ...prev]);
                    }}
                    onUpdate={async (id, payload) => {
                      const updated = await userDetailsApi.updateAddress(
                        id,
                        payload
                      );
                      setAddresses((prev) =>
                        prev.map((a) => (a.id === id ? updated : a))
                      );
                    }}
                    onDelete={async (id) => {
                      await userDetailsApi.deleteAddress(id);
                      setAddresses((prev) => prev.filter((a) => a.id !== id));
                    }}
                  />
                )}

                {active === "Wishlist" && (
                  <Wishlist
                    favorites={favorites}
                    onToggle={async (type, id) => {
                      await userDetailsApi.toggleFavorite({ type, id });
                      const fresh = await userDetailsApi.favorites();
                      setFavorites(fresh);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===================== Overview ===================== */
function Overview({ user, profile, avatarSrc, onSave }) {
  const [form, setForm] = useState({
    firstName: profile?.firstName ?? user?.firstName ?? "",
    lastName: profile?.lastName ?? user?.lastName ?? "",
    email: profile?.email ?? user?.email ?? "",
    phone: profile?.phone ?? user?.phone ?? "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setForm({
      firstName: profile?.firstName ?? user?.firstName ?? "",
      lastName: profile?.lastName ?? user?.lastName ?? "",
      email: profile?.email ?? user?.email ?? "",
      phone: profile?.phone ?? user?.phone ?? "",
    });
  }, [profile, user]);

  const onChange = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    setMessage(null);
    try {
      await onSave({ ...form, avatarFile, removeAvatar });
      setAvatarFile(null);
      setRemoveAvatar(false);
      setMessage({ type: "success", text: "Profile updated" });
    } catch (err) {
      setMessage({ type: "error", text: extractErr(err) });
    } finally {
      setSaving(false);
    }
  };
  const currentAvatarPreview = avatarFile
    ? URL.createObjectURL(avatarFile)
    : avatarSrc;

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-primary">Account Overview</h2>
      <p className="mt-2 text-secondary">
        Update your personal info and profile picture.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {message && (
          <div
            className={[
              "rounded-lg px-3 py-2 text-sm",
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200",
            ].join(" ")}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="First Name"
            value={form.firstName}
            onChange={(v) => onChange("firstName", v)}
            icon={<UserIcon className="h-4 w-4 text-secondary" />}
          />
          <Field
            label="Last Name"
            value={form.lastName}
            onChange={(v) => onChange("lastName", v)}
            icon={<UserIcon className="h-4 w-4 text-secondary" />}
          />
        </div>

        <Field
          label="Email"
          value={form.email}
          onChange={(v) => onChange("email", v)}
          icon={<Mail className="h-4 w-4 text-secondary" />}
          help="Changing email may require verification later."
        />

        <Field
          label="Phone"
          value={form.phone}
          onChange={(v) => onChange("phone", v)}
          icon={<Phone className="h-4 w-4 text-secondary" />}
        />

        <div className="rounded-xl border border-border bg-contact-bg p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-surface overflow-hidden grid place-items-center">
                {currentAvatarPreview ? (
                  <img
                    src={currentAvatarPreview}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-5 w-5 text-secondary" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-primary">
                  Profile Photo
                </div>
                <div className="text-xs text-secondary">
                  JPG/PNG, tek görsel. Front’ta sıkıştırıp gönderebilirsin.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(avatarSrc || currentAvatarPreview) && (
                <button
                  type="button"
                  onClick={() => setRemoveAvatar((s) => !s)}
                  className={[
                    "rounded-full px-3 py-1.5 text-sm border",
                    removeAvatar
                      ? "border-rose-300 text-rose-700 bg-rose-50"
                      : "border-border text-primary hover:bg-surface-hover",
                  ].join(" ")}
                >
                  {removeAvatar ? "Will remove" : "Remove"}
                </button>
              )}

              <label className="inline-flex cursor-pointer items-center rounded-full border border-border bg-white px-3 py-1.5 text-sm hover:bg-surface-hover">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
                Upload
              </label>
            </div>
          </div>

          {avatarFile && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-white p-2">
              <div className="truncate text-sm text-primary">
                {avatarFile.name}
              </div>
              <button
                type="button"
                onClick={() => setAvatarFile(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-hover"
              >
                <X className="h-4 w-4 text-secondary" />
              </button>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

/* ===================== Orders (placeholder) ===================== */
function Orders() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-primary">Orders</h2>
      <p className="mt-2 text-secondary">You don't have any orders yet.</p>
    </div>
  );
}

/* ===================== Addresses ===================== */
function Addresses({ addresses, onCreate, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyAddress());
  const [saving, setSaving] = useState(false);

  const startNew = () => {
    setForm(emptyAddress());
    setEditing("new");
  };
  const startEdit = (addr) => {
    setForm({
      ...addr,
      addressLine1: addr.addressLine || addr.addressLine1 || "",
      addressLine2: addr.addressLine2 || "",
      state: addr.district || addr.state || "",
    });
    setEditing(addr.id);
  };

  const cancel = () => {
    setEditing(null);
    setForm(emptyAddress());
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      if (editing === "new") {
        await onCreate(cleanAddress(form));
      } else {
        await onUpdate(editing, cleanAddress(form));
      }
      cancel();
    } catch (err) {
      alert(extractErr(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-primary">Addresses</h2>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-primary hover:bg-surface-hover"
        >
          <Plus className="h-4 w-4" />
          Add New
        </button>
      </div>

      {addresses.length === 0 && !editing && (
        <p className="mt-2 text-secondary">No saved addresses.</p>
      )}

      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <li
            key={a.id}
            className="rounded-xl border border-border bg-contact-bg p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-primary">{a.fullName}</div>
                <div className="mt-1 text-sm text-secondary whitespace-pre-line">
                  {a.addressLine || a.addressLine1}
                </div>
                <div className="mt-1 text-sm text-secondary">
                  {a.city}, {a.district || a.state || "-"} {a.postalCode}
                </div>
                <div className="text-sm text-secondary">{a.country}</div>
                {a.phone && (
                  <div className="text-sm text-secondary">📞 {a.phone}</div>
                )}
                {a.isDefault && (
                  <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                    Default
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(a)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-hover"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4 text-secondary" />
                </button>
                <button
                  onClick={() => onDelete(a.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-hover"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <form
          onSubmit={submit}
          className="mt-6 rounded-2xl border border-border bg-white p-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AField
              label="Full Name"
              value={form.fullName}
              onChange={(v) => setForm((s) => ({ ...s, fullName: v }))}
              required
            />
            <AField
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
            />
            <AField
              label="Address Line 1"
              value={form.addressLine1}
              onChange={(v) => setForm((s) => ({ ...s, addressLine1: v }))}
              required
              wide
            />
            <AField
              label="Address Line 2"
              value={form.addressLine2}
              onChange={(v) => setForm((s) => ({ ...s, addressLine2: v }))}
              wide
            />
            <AField
              label="City"
              value={form.city}
              onChange={(v) => setForm((s) => ({ ...s, city: v }))}
              required
            />
            <AField
              label="State/Province"
              value={form.state}
              onChange={(v) => setForm((s) => ({ ...s, state: v }))}
            />
            <AField
              label="Postal Code"
              value={form.postalCode}
              onChange={(v) => setForm((s) => ({ ...s, postalCode: v }))}
              required
            />
            <AField
              label="Country"
              value={form.country}
              onChange={(v) => setForm((s) => ({ ...s, country: v }))}
              required
            />
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-sm text-primary">
            <input
              type="checkbox"
              checked={!!form.isDefault}
              onChange={(e) =>
                setForm((s) => ({ ...s, isDefault: e.target.checked }))
              }
            />
            Set as default address
          </label>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {editing === "new" ? "Save Address" : "Update Address"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-full border border-border px-4 py-2 text-sm text-primary hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ===================== Wishlist ===================== */
function Wishlist({ favorites, onToggle }) {
  const products = favorites.products || [];
  const sets = favorites.sets || [];
  const isEmpty = products.length === 0 && sets.length === 0;

  return (
    <div>
      <h2 className="text-xl font-semibold text-primary">Wishlist</h2>
      {isEmpty && (
        <p className="mt-2 text-secondary">Your wishlist is empty.</p>
      )}

      {products.length > 0 && (
        <>
          <h3 className="mt-6 mb-3 text-sm font-semibold text-secondary/80">
            Products
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <FavCard
                key={`p-${p.id || p._id}`}
                title={p.name}
                price={p.price}
                image={p.images?.[0]?.url || p.images?.[0] || null}
                href={`/product/${p.slug || p.id || p._id}`}
                onRemove={() => onToggle("product", p.id || p._id)}
              />
            ))}
          </div>
        </>
      )}

      {sets.length > 0 && (
        <>
          <h3 className="mt-8 mb-3 text-sm font-semibold text-secondary/80">
            Sets
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {sets.map((s) => (
              <FavCard
                key={`s-${s.id || s._id}`}
                title={s.name}
                price={s.price}
                image={s.images?.[0]?.url || s.images?.[0] || null}
                href={`/set/${s.slug || s.id || s._id}`}
                onRemove={() => onToggle("set", s.id || s._id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ===================== UI helpers ===================== */
function BusyBar({ show }) {
  if (!show) return null;
  return (
    <div className="relative -mt-6 -mx-6 mb-4 h-0.5 overflow-hidden rounded-t-2xl">
      <div className="absolute inset-0 bg-accent/20" />
      <div
        className="absolute inset-y-0 left-0 w-1/3 bg-accent animate-[progress_1.2s_ease-in-out_infinite]"
        style={{ maskImage: "linear-gradient(90deg, transparent, #000)" }}
      />
      <style>{`
        @keyframes progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
      `}</style>
    </div>
  );
}

function Field({ label, value, onChange, icon, help }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-primary">
        {label}
      </span>
      <div className="flex items-center rounded-lg border border-border bg-contact-bg px-3 py-2">
        {icon && <span className="mr-2">{icon}</span>}
        <input
          className="w-full border-none bg-transparent text-sm outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {help && (
        <span className="mt-1 block text-xs text-secondary">{help}</span>
      )}
    </label>
  );
}

function AField({ label, value, onChange, required, wide }) {
  return (
    <label className={wide ? "sm:col-span-2 block" : "block"}>
      <span className="mb-1 block text-sm font-medium text-primary">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <input
        className="w-full rounded-lg border border-border bg-contact-bg px-3 py-2 text-sm outline-none"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  );
}

function FavCard({ title, price, image, href, onRemove }) {
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-white">
      <Link to={href} className="block">
        <div className="aspect-square w-full overflow-hidden bg-surface">
          {image ? (
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center text-secondary/70">
              No image
            </div>
          )}
        </div>
      </Link>
      <div className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-primary">
            {title}
          </div>
          <div className="text-xs text-secondary">
            €{Number(price || 0).toFixed(2)}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-hover"
          title="Remove from wishlist"
        >
          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
        </button>
      </div>
    </div>
  );
}

function emptyAddress() {
  return {
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    isDefault: false,
  };
}

function cleanAddress(a) {
  return {
    fullName: String(a.fullName || "").trim(),
    phone: String(a.phone || "").trim(),
    addressLine: String(
      [a.addressLine1, a.addressLine2]
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .join(" ")
    ),
    city: String(a.city || "").trim(),
    district: String(a.state || "").trim(),
    postalCode: String(a.postalCode || "").trim(),
    country: String(a.country || "").trim(),
    isDefault: !!a.isDefault,
  };
}

function extractErr(e) {
  try {
    const text = e?.message || String(e);
    const parsed = JSON.parse(text);
    return parsed?.message || text;
  } catch {
    return e?.message || "Unexpected error";
  }
}
