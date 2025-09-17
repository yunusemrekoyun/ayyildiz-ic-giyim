import { useEffect, useState } from "react";
import { authApi, getUser } from "../api";

const TABS = ["Overview", "Orders", "Addresses", "Wishlist"];

export default function UserAccountPage({ onLogout }) {
  const [active, setActive] = useState(TABS[0]);
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    let mounted = true;
    authApi
      .me()
      .then((res) => {
        if (mounted && res?.user) setUser(res.user);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const initials =
    (user?.firstName || user?.name || "?")[0] + (user?.lastName?.[0] || "");

  return (
    <section className="bg-surface-light/60">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Sidebar */}
          <aside className="md:col-span-3">
            <div className="rounded-2xl border border-border bg-white p-4">
              <div className="rounded-xl border border-border bg-contact-bg p-4 text-center">
                <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-surface grid place-items-center text-primary font-semibold">
                  {initials}
                </div>
                <div className="font-semibold text-primary">
                  {user?.firstName
                    ? `${user.firstName} ${user.lastName || ""}`.trim()
                    : user?.name || "—"}
                </div>
                <div className="text-sm text-secondary">{user?.email}</div>
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
                className="mt-4 w-full rounded-full border border-border px-4 py-2 text-sm text-primary hover:bg-surface-hover"
              >
                Logout
              </button>
            </div>
          </aside>

          {/* Content */}
          <div className="md:col-span-9">
            <div className="rounded-2xl border border-border bg-white p-6">
              {active === "Overview" && <Overview user={user} />}
              {active === "Orders" && <Orders />}
              {active === "Addresses" && <Addresses />}
              {active === "Wishlist" && <Wishlist />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Overview({ user }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-primary">Account Overview</h2>
      <p className="mt-2 text-secondary">
        Welcome back{user?.firstName ? `, ${user.firstName}` : ""}! Here you can
        manage your orders, addresses and wishlist.
      </p>
    </div>
  );
}
function Orders() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-primary">Orders</h2>
      <p className="mt-2 text-secondary">You don't have any orders yet.</p>
    </div>
  );
}
function Addresses() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-primary">Addresses</h2>
      <p className="mt-2 text-secondary">No saved addresses.</p>
    </div>
  );
}
function Wishlist() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-primary">Wishlist</h2>
      <p className="mt-2 text-secondary">Your wishlist is empty.</p>
    </div>
  );
}
