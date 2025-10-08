// src/pages/CheckoutPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BreadCrumb from "../components/shop/BreadCrumb";
import AlertBanner from "../components/ui/AlertBanner.jsx";
import LoadingOverlay from "../components/ui/LoadingOverlay.jsx";
import { useCart } from "../hooks/useCart";
import { userDetailsApi } from "../api/userDetails";
import { orderApi } from "../api/orders";

export default function CheckoutPage() {
  const navigate = useNavigate();

  // Cart verisini oku
  const cart = useCart() || {};
  const {
    items: itemsRaw = [],
    subTotal = 0,
    total = 0,
    grandTotal = 0,
    coupon = null,
    couponDiscount = 0,
    shipping: shippingInfo = {},
    clearCart = () => {},
    clearCoupon = () => {},
  } = cart;

  // API'ye gidecek satırlar (id/kind/qty)
  const checkoutItems = useMemo(
    () =>
      itemsRaw
        .map((it) => {
          const rawKind =
            it.kind ||
            (it.productId ? "product" : it.setId ? "set" : undefined);
          const kind = rawKind === "set" ? "set" : "product";

          const rawId =
            it.ref ||
            it.id ||
            it.productId ||
            it.setId ||
            it._id ||
            it.product?._id ||
            it.set?._id;
          const id = rawId ? String(rawId).trim() : "";
          if (!id) return null;

          const qty = Math.max(
            1,
            Number(
              it.qty ?? it.quantity ?? it.count ?? it.amount ?? it.q ?? 1
            ) || 1
          );

          return { kind, id, qty };
        })
        .filter(Boolean),
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
  const subtotal = Number(subTotal ?? computedSubtotal) || 0;
  const shippingFee = shippingInfo?.fee ?? 0;
  const shippingName = shippingInfo?.name || "Shipping";
  const totalDue = Number(grandTotal || total || subtotal + shippingFee) || 0;

  // Sipariş başarı takip
  const orderPlacedRef = useRef(false);

  // Adresler
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [banner, setBanner] = useState(null);

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
    if (orderPlacedRef.current) return;
    if (!loading && lines.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [lines.length, loading, navigate]);

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
        couponCode: coupon?.code || null,
      });
      orderPlacedRef.current = true;
      clearCart();
      clearCoupon();
      navigate(`/checkout/success?order=${order.id}`, { replace: true });
    } catch (e) {
      // 401 ise login’e gönder
      if (String(e?.message || "").includes("401")) {
        navigate(`/account?view=login&redirect=/checkout`, { replace: true });
        return;
      }
      setBanner({
        variant: "danger",
        message: `Order failed: ${e?.message || "Unexpected error"}`,
      });
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

      {banner && (
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-2">
          <AlertBanner
            variant={banner.variant}
            message={banner.message}
            onClose={() => setBanner(null)}
          />
        </div>
      )}

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
                <span className="text-secondary">
                  {shippingName ? `Shipping (${shippingName})` : "Shipping"}
                </span>
                <span className="text-primary">€{shippingFee.toFixed(2)}</span>
              </div>
              {coupon && (
                <div className="flex justify-between text-rose-600">
                  <span className="text-sm">
                    Coupon ({coupon.code})
                  </span>
                  <span>– €{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold">
                <span className="text-primary">Total</span>
                <span className="text-primary">€{totalDue.toFixed(2)}</span>
              </div>
            </div>

            <div className="relative">
              <LoadingOverlay show={placing} />
              <button
                disabled={!canPlace || placing}
                className="mt-5 w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
                onClick={placeOrder}
              >
                {placing ? "Placing..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
