// src/pages/CheckoutPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BreadCrumb from "../components/shop/BreadCrumb";
import { useCart } from "../hooks/useCart";
import { userDetailsApi, orderApi } from "../api";

export default function CheckoutPage() {
  const navigate = useNavigate();

  // Cart verisini oku
  const cart = useCart() || {};
  const itemsRaw = Array.isArray(cart.items) ? cart.items : [];

  // API'ye gidecek satırlar (id/kind/qty)
  const checkoutItems = useMemo(
    () =>
      itemsRaw.map((it) => {
        const kind =
          it.kind || (it.productId ? "product" : it.setId ? "set" : "product");
        const id = it.productId || it.setId || it.id || it._id;
        const qty =
          Number(it.qty ?? it.quantity ?? it.count ?? it.amount ?? it.q ?? 1) ||
          1;
        return { kind, id, qty };
      }),
    [itemsRaw]
  );

  // UI'de göstereceğimiz satırlar (isim/fiyat)
  const lines = useMemo(
    () =>
      itemsRaw.map((it) => {
        const qty =
          Number(it.qty ?? it.quantity ?? it.count ?? it.amount ?? it.q ?? 1) ||
          1;

        const unitPrice =
          Number(
            it.price ??
              it.unitPrice ??
              it.unit_price ??
              it.product?.price ??
              it.set?.price ??
              0
          ) || 0;

        const name =
          it.name ?? it.title ?? it.product?.name ?? it.set?.name ?? "Item";

        return { name, qty, unitPrice };
      }),
    [itemsRaw]
  );

  // Toplamlar: cart verisi varsa onu kullan, yoksa hesapla
  const computedSubtotal = useMemo(
    () => lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
    [lines]
  );
  const subtotal = Number(cart.subtotal ?? computedSubtotal) || 0;
  const shipping = Number(cart.shipping ?? 0) || 0;
  const total = Number(cart.total ?? subtotal + shipping) || 0;

  // Adresler
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  // Adresleri çek
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await userDetailsApi.listAddresses();
        if (!mounted) return;
        setAddresses(list);
        setAddressId(list.find((a) => a.isDefault)?.id || list[0]?.id || "");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Sepet boşsa karta geri dön
  useEffect(() => {
    if (!lines.length && !loading) navigate("/cart", { replace: true });
  }, [lines, loading, navigate]);

  if (loading) {
    return (
      <section className="bg-surface-light/60">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-12">
          <div className="h-40 rounded-2xl border border-border bg-white animate-pulse" />
        </div>
      </section>
    );
  }

  const canPlace = !!addressId && checkoutItems.length > 0 && !placing;

  const placeOrder = async () => {
    try {
      setPlacing(true);
      const order = await orderApi.create({
        addressId,
        items: checkoutItems,
      });
      // (opsiyonel) burada cart context'inizde sepeti temizleyebilirsiniz.
      navigate(`/checkout/success?order=${order.id}`, { replace: true });
    } catch (e) {
      // 401 ise login’e gönder
      if (String(e?.message || "").includes("401")) {
        navigate(`/account?view=login&redirect=/checkout`, { replace: true });
        return;
      }
      alert("Order failed: " + (e?.message || "Unknown error"));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <section className="bg-surface-light/60">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
        <BreadCrumb
          items={[{ label: "Home", to: "/" }, { label: "Checkout" }]}
        />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-16 grid gap-6 md:grid-cols-12">
        {/* Address / Details */}
        <div className="md:col-span-7 lg:col-span-8">
          <div className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-xl font-semibold text-primary">
              Delivery Address
            </h2>

            {addresses.length === 0 ? (
              <p className="mt-3 text-secondary">
                No saved address. Please add one from{" "}
                <a
                  className="text-accent underline"
                  href="/account?tab=Addresses"
                >
                  Account &gt; Addresses
                </a>
                .
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className="flex gap-3 rounded-xl border border-border bg-contact-bg p-3"
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={addressId === a.id}
                      onChange={() => setAddressId(a.id)}
                    />
                    <div>
                      <div className="font-medium text-primary">
                        {a.fullName}
                      </div>
                      <div className="text-sm text-secondary whitespace-pre-line">
                        {a.addressLine ||
                          `${a.addressLine1 || ""} ${
                            a.addressLine2 || ""
                          }`.trim()}
                      </div>
                      <div className="text-sm text-secondary">
                        {a.city}
                        {a.district ? `, ${a.district}` : ""} {a.postalCode}{" "}
                        {a.country}
                      </div>
                      {a.phone && (
                        <div className="text-sm text-secondary">
                          📞 {a.phone}
                        </div>
                      )}
                      {a.isDefault && (
                        <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200">
                          Default
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="md:col-span-5 lg:col-span-4">
          <div className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-xl font-semibold text-primary">
              Order Summary
            </h2>

            <ul className="mt-4 space-y-3 max-h-56 overflow-auto pr-1">
              {lines.map((it, idx) => (
                <li key={idx} className="flex justify-between text-sm">
                  <span className="text-primary truncate">
                    {it.name} × {it.qty}
                  </span>
                  <span className="text-secondary">
                    €{Number(it.unitPrice * it.qty).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-border pt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary">Subtotal</span>
                <span className="text-primary">€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Shipping</span>
                <span className="text-primary">€{shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span className="text-primary">Total</span>
                <span className="text-primary">€{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              disabled={!canPlace}
              className="mt-5 w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
              onClick={placeOrder}
            >
              {placing ? "Placing..." : "Place Order"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
