import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { orderApi } from "../../../api/orders";
import OrderDetailsModal from "../../../components/orders/OrderDetailsModal";

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const state = String(status || "created").toLowerCase();
  const classes = {
    created: "bg-surface text-primary border-border",
    pending: "bg-surface text-primary border-border",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    processing: "bg-amber-50 text-amber-700 border-amber-200",
    shipped: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-slate-900 text-white border-slate-800",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const cls = classes[state] || classes.created;
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {t(`account.orders.status.${state}`, {
        defaultValue:
          state.charAt(0).toUpperCase() + state.slice(1).toLowerCase(),
      })}
    </span>
  );
}

export default function OrdersSection() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const locale = i18n.language || navigator.language || "tr-TR";
  const currency = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      }),
    [locale]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await orderApi.mine();
        if (mounted) setOrders(list);
      } catch (error) {
        console.error("orders.mine error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-primary">
          {t("account.orders.title")}
        </h2>
        <div className="mt-4 h-28 rounded-xl border border-border bg-surface animate-pulse" />
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-primary">
          {t("account.orders.title")}
        </h2>
        <p className="mt-2 text-secondary">{t("account.orders.empty")}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-primary">
        {t("account.orders.title")}
      </h2>

      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border overflow-hidden">
        {orders.map((order) => {
          const id = order.id || order._id;
          const number = order.orderNumber || order.number || String(id).slice(-6);
          const created = order.createdAt
            ? new Date(order.createdAt).toLocaleString(locale)
            : "-";
          const totalAmount = Number(order.totals?.grand ?? order.total ?? 0);
          const status = String(order.status || "created");
          const shippingCost = Number(order.shipping || 0);
          return (
            <li
              key={id}
              className="bg-white p-4 sm:flex sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-primary">
                  {t("account.orders.orderNumber", { number })}
                </div>
                <div className="mt-0.5 text-xs text-secondary flex flex-wrap items-center gap-1">
                  <span>{created}</span>
                  <span>•</span>
                  <StatusBadge status={status} />
                  {order.shippingName && (
                    <span className="text-secondary">
                      •{" "}
                      {t("account.orders.shipping", {
                        name: order.shippingName,
                        price: currency.format(shippingCost),
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 sm:mt-0 flex items-center gap-3">
                <div className="text-sm text-primary font-semibold">
                  {t("account.orders.total", {
                    total: currency.format(totalAmount),
                  })}
                </div>
                <button
                  onClick={() => setSelectedId(id)}
                  className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm text-primary hover:bg-surface-hover"
                >
                  {t("account.orders.viewDetails")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {selectedId && (
        <OrderDetailsModal
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
