// src/components/cart/Cart.jsx
import { useMemo, useState } from "react";
import CartItem from "./CartItem";
import { useCart } from "../../hooks/useCart";
import { useNavigate } from "react-router-dom";
import { getUser } from "../../api";

const CURRENCY = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    n
  );

const FREE_SHIPPING_THRESHOLD = 300; // €300 üzeri kargo bedava
const SHIPPING_FEE = 9.9;

export default function Cart() {
  const navigate = useNavigate();
  const { items, updateQty, removeFromCart, subTotal } = useCart();

  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(null); // {code, type: 'percent'|'flat'|'invalid', value}

  // Sahte kupon örneği: ROSE10 => %10; BRIDE20 => €20
  const discount = useMemo(() => {
    if (!applied) return 0;
    if (applied.type === "percent") return (subTotal * applied.value) / 100;
    if (applied.type === "flat") return applied.value;
    return 0;
  }, [applied, subTotal]);

  const shipping =
    subTotal - discount >= FREE_SHIPPING_THRESHOLD || subTotal === 0
      ? 0
      : SHIPPING_FEE;

  const total = Math.max(0, subTotal - discount + shipping);

  const onQty = (lineId, next) => updateQty(lineId, next);
  const onRemove = (lineId) => removeFromCart(lineId);

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    if (code === "ROSE10") setApplied({ code, type: "percent", value: 10 });
    else if (code === "BRIDE20") setApplied({ code, type: "flat", value: 20 });
    else setApplied({ code, type: "invalid" });
    setCoupon("");
  };
  const clearCoupon = () => setApplied(null);

  // Boş sepet
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-contact-bg p-10 text-center">
        <h2 className="text-2xl font-serif font-extrabold text-primary">
          Your cart is empty
        </h2>
        <p className="mt-2 text-secondary">
          Discover our latest arrivals and curated trousseau packages.
        </p>
        <a
          href="/shop"
          className="mt-5 inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Continue Shopping
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
      {/* Sol: Ürün listesi */}
      <div className="md:col-span-8">
        <div className="rounded-2xl border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-primary">
              Shopping Cart
            </h2>
            <span className="text-sm text-secondary/80">
              {items.length} item{items.length > 1 ? "s" : ""}
            </span>
          </div>

          <ul className="divide-y divide-border/70">
            {items.map((it) => (
              <CartItem
                key={it.lineId}
                item={it}
                onQty={onQty}
                onRemove={() => onRemove(it.lineId)}
              />
            ))}
          </ul>

          {/* Kupon alanı */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4">
            <div className="flex flex-1 items-center gap-2">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Coupon code (ROSE10, BRIDE20)"
                className="flex-1 rounded-lg border border-border bg-contact-bg px-3 py-2 text-sm text-primary outline-none placeholder:text-secondary/60"
              />
              <button
                onClick={applyCoupon}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Apply
              </button>
              {applied && (
                <button
                  onClick={clearCoupon}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-primary hover:bg-surface-hover"
                >
                  Clear
                </button>
              )}
            </div>

            {applied?.code && (
              <span
                className={[
                  "text-sm",
                  applied.type === "invalid"
                    ? "text-red-500"
                    : "text-accent font-medium",
                ].join(" ")}
              >
                {applied.type === "invalid"
                  ? `Invalid code: ${applied.code}`
                  : `Applied: ${applied.code}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sağ: Sipariş Özeti */}
      <aside className="md:col-span-4">
        <div className="rounded-2xl border border-border bg-contact-bg p-5">
          <h3 className="mb-4 text-lg font-semibold text-primary">
            Order Summary
          </h3>

          {/* Progress to free shipping */}
          {subTotal > 0 && (
            <div className="mb-4 rounded-xl border border-border bg-white p-3">
              <p className="text-sm text-secondary">
                {subTotal - discount >= FREE_SHIPPING_THRESHOLD
                  ? "You’ve unlocked Free Shipping 🎉"
                  : `Spend ${CURRENCY(
                      Math.max(
                        0,
                        FREE_SHIPPING_THRESHOLD - (subTotal - discount)
                      )
                    )} more to get Free Shipping`}
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${Math.min(
                      100,
                      ((subTotal - discount) / FREE_SHIPPING_THRESHOLD) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={CURRENCY(subTotal)} />
            <Row
              label="Discount"
              value={discount ? `– ${CURRENCY(discount)}` : CURRENCY(0)}
            />
            <Row
              label="Shipping"
              value={shipping === 0 ? "Free" : CURRENCY(shipping)}
            />
            <div className="my-2 border-t border-border" />
            <Row label="Total" value={CURRENCY(total)} bold />
          </div>

          <button
            className="mt-4 w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            disabled={!items.length}
            onClick={() => {
              const user = getUser();
              if (!user) {
                navigate("/account?view=login&redirect=/checkout");
              } else {
                navigate("/checkout");
              }
            }}
          >
            Proceed to Checkout
          </button>

          <a
            href="/shop"
            className="mt-3 block text-center text-sm text-secondary hover:text-accent"
          >
            Continue Shopping
          </a>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-semibold text-primary" : "text-secondary"}>
        {label}
      </span>
      <span className={bold ? "font-semibold text-primary" : "text-primary"}>
        {value}
      </span>
    </div>
  );
}
