// src/pages/CheckoutPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BreadCrumb from "../components/shop/BreadCrumb";
import AlertBanner from "../components/ui/AlertBanner.jsx";
import LoadingOverlay from "../components/ui/LoadingOverlay.jsx";
import { useCart } from "../hooks/useCart";
import { userDetailsApi } from "../api/userDetails";
import { orderApi } from "../api/orders";
import { loadPayPalSdk } from "../utils/paypal.js";

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

  const checkoutItems = useMemo(
    () =>
      itemsRaw
        .map((it) => {
          // kind
          const rawKind =
            it.kind ||
            (it.productId ? "product" : it.setId ? "set" : undefined);
          const kind = rawKind === "set" ? "set" : "product";

          // id
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

          // qty
          const qty = Math.max(
            1,
            Number(
              it.qty ?? it.quantity ?? it.count ?? it.amount ?? it.q ?? 1
            ) || 1
          );

          // <<< ÖNEMLİ: set satırları için selections ekle
          if (kind === "set") {
            const selections = Array.isArray(it.items)
              ? it.items
                  .map((s) => {
                    const productId =
                      s.productId ||
                      s.id ||
                      s._id ||
                      s.ref ||
                      s.product?._id ||
                      s.productId?._id;
                    if (!productId) return null;

                    return {
                      productId: String(productId),
                      color: s.color ?? null,
                      size: s.size ?? null,
                      attribute: s.attribute ?? null,
                      qtyInSet: Math.max(1, Number(s.qtyInSet || 1)),
                      // colorHex backend için şart değilse göndermene gerek yok;
                      // istiyorsan ekleyebilirsin:
                      // colorHex: s.colorHex ?? null,
                    };
                  })
                  .filter(Boolean)
              : [];

            return { kind, id, qty, selections };
          }

          // ürün satırı
          const variant = {
            color:
              it.color ??
              it.variant?.color ??
              it.selectedColor ??
              null,
            size: it.size ?? it.variant?.size ?? null,
            attribute:
              it.attribute ??
              it.variant?.attribute ??
              it.attributeValue ??
              null,
          };

          return { kind, id, qty, variant };
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
  const paypalButtonsRef = useRef(null);
  const paypalContainerRef = useRef(null);
  const paypalDraftRef = useRef(null);

  // Adresler
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [banner, setBanner] = useState(null);
  const [simulationMode, setSimulationMode] = useState("success");
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";
  const paypalCurrency = import.meta.env.VITE_PAYPAL_CURRENCY || "EUR";
  const paypalEnabled = Boolean(paypalClientId);
  const [paymentMethod, setPaymentMethod] = useState(
    paypalEnabled ? "paypal" : "cod"
  );
  const [paypalError, setPayPalError] = useState(null);
  const [paypalLoading, setPayPalLoading] = useState(false);
  const [paypalSummary, setPayPalSummary] = useState(null);

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

  useEffect(() => {
    if (paymentMethod !== "paypal") {
      setPayPalError(null);
      setPayPalSummary(null);
      paypalDraftRef.current = null;
      if (paypalButtonsRef.current) {
        paypalButtonsRef.current.close();
        paypalButtonsRef.current = null;
      }
      return;
    }

    if (!paypalEnabled) {
      setPayPalError("PayPal client ID is not configured on the frontend.");
      return;
    }

    if (!hasAddress || !hasItems) {
      setPayPalError(null);
      setPayPalSummary(null);
      paypalDraftRef.current = null;
      if (paypalButtonsRef.current) {
        paypalButtonsRef.current.close();
        paypalButtonsRef.current = null;
      }
      return;
    }

    let cancelled = false;
    setPayPalError(null);

    (async () => {
      try {
        const paypal = await loadPayPalSdk({
          clientId: paypalClientId,
          currency: paypalCurrency,
        });
        if (cancelled) return;

        if (paypalButtonsRef.current) {
          paypalButtonsRef.current.close();
          paypalButtonsRef.current = null;
        }

        const buttons = paypal.Buttons({
          style: {
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "pay",
          },
          onInit: (_, actions) => {
            if (!canUsePayPal) {
              actions.disable();
            } else {
              actions.enable();
            }
          },
          createOrder: async () => {
            setPayPalLoading(true);
            setPayPalSummary(null);
            try {
              const response = await orderApi.createPayPal({
                addressId,
                items: checkoutItems,
                couponCode: coupon?.code || null,
              });
              if (!response?.paypalOrderId || !response?.draftId) {
                throw new Error("Invalid PayPal order response");
              }
              paypalDraftRef.current = { id: response.draftId };
              setPayPalSummary(response.summary || null);
              return response.paypalOrderId;
            } catch (error) {
              const message = getErrorMessage(
                error,
                "Unable to create PayPal order"
              );
              setPayPalError(message);
              throw new Error(message);
            } finally {
              setPayPalLoading(false);
            }
          },
          onApprove: async (data) => {
            try {
              setPlacing(true);
              const draftId = paypalDraftRef.current?.id;
              if (!draftId) {
                throw new Error("PayPal checkout session could not be found");
              }
              const result = await orderApi.capturePayPal({
                paypalOrderId: data.orderID,
                draftId,
              });
              const orderData = result?.order;
              if (!orderData?.id) {
                throw new Error("Order confirmation was not returned");
              }
              orderPlacedRef.current = true;
              setPayPalError(null);
              setPayPalSummary(null);
              paypalDraftRef.current = null;
              clearCart();
              clearCoupon();
              navigate(`/checkout/success?order=${orderData.id}`, {
                replace: true,
              });
            } catch (error) {
              const message = getErrorMessage(
                error,
                "PayPal payment could not be completed"
              );
              setBanner({
                variant: "danger",
                message: `PayPal payment failed: ${message}`,
              });
            } finally {
              setPlacing(false);
            }
          },
          onCancel: () => {
            setPayPalError("PayPal payment was cancelled.");
          },
          onError: (error) => {
            const message = getErrorMessage(
              error,
              "Unexpected PayPal integration error"
            );
            setPayPalError(message);
          },
        });
        paypalButtonsRef.current = buttons;
        if (paypalContainerRef.current) {
          await buttons.render(paypalContainerRef.current);
        }
      } catch (error) {
        if (!cancelled) {
          setPayPalError(
            error?.message || "Unable to load PayPal payment buttons"
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (paypalButtonsRef.current) {
        paypalButtonsRef.current.close();
        paypalButtonsRef.current = null;
      }
    };
  }, [
    paymentMethod,
    paypalEnabled,
    paypalClientId,
    paypalCurrency,
    hasAddress,
    hasItems,
    addressId,
    checkoutItems,
    coupon?.code,
    canUsePayPal,
    clearCart,
    clearCoupon,
    navigate,
  ]);

  if (loading) {
    return (
      <section className="bg-surface-light/60">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-12">
          <div className="h-40 rounded-2xl border border-border bg-white animate-pulse" />
        </div>
      </section>
    );
  }

  const hasItems = checkoutItems.length > 0;
  const hasAddress = Boolean(addressId);
  const canPlaceOrder =
    paymentMethod === "cod" && hasAddress && hasItems && !placing;
  const canUsePayPal =
    paymentMethod === "paypal" && paypalEnabled && hasAddress && hasItems;

  const getErrorMessage = (error, fallback = "Unexpected error") => {
    let message = error?.message || fallback;
    if (typeof message === "string") {
      try {
        const parsed = JSON.parse(message);
        message = parsed?.message || message;
      } catch {
        // ignore
      }
    }
    return message;
  };

  const placeOrder = async () => {
    try {
      setPlacing(true);
      const order = await orderApi.create({
        addressId,
        items: checkoutItems,
        couponCode: coupon?.code || null,
        paymentSimulation:
          paymentMethod === "cod" ? simulationMode || null : null,
      });
      orderPlacedRef.current = true;
      clearCart();
      clearCoupon();
      navigate(`/checkout/success?order=${order.id}`, { replace: true });
    } catch (e) {
      const message = getErrorMessage(e);
      // 401 ise login’e gönder
      if (String(e?.message || "").includes("401")) {
        navigate(`/account?view=login&redirect=/checkout`, { replace: true });
        return;
      }
      setBanner({
        variant: "danger",
        message: `Order failed: ${message}`,
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
                  <span className="text-sm">Coupon ({coupon.code})</span>
                  <span>– €{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold">
                <span className="text-primary">Total</span>
                <span className="text-primary">€{totalDue.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-primary">
                Payment Method
              </h3>
              <div className="mt-3 space-y-2 text-sm text-secondary">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment-method"
                    value="paypal"
                    checked={paymentMethod === "paypal"}
                    onChange={() => setPaymentMethod("paypal")}
                    disabled={!paypalEnabled}
                  />
                  <span className="flex-1">
                    PayPal (Germany)
                    {!paypalEnabled && (
                      <span className="ml-2 text-xs text-rose-600">
                        Set VITE_PAYPAL_CLIENT_ID to enable.
                      </span>
                    )}
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment-method"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />
                  <span className="flex-1">Cash on Delivery</span>
                </label>
              </div>

              {paymentMethod === "paypal" && (
                <div className="mt-4">
                  <div className="relative rounded-xl border border-border bg-surface p-4">
                    <LoadingOverlay show={paypalLoading || placing} />
                    {paypalError && (
                      <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                        {paypalError}
                      </div>
                    )}
                    {paypalSummary && (
                      <div className="mb-3 space-y-1 text-xs text-secondary">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>
                            €
                            {Number(
                              paypalSummary.subtotal ?? subtotal
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shipping</span>
                          <span>
                            €
                            {Number(
                              paypalSummary.shipping ?? shippingFee
                            ).toFixed(2)}
                          </span>
                        </div>
                        {paypalSummary.discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>Discount</span>
                            <span>
                              − €
                              {Number(
                                paypalSummary.discountAmount
                              ).toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="mt-2 flex justify-between font-semibold text-primary">
                          <span>PayPal Total</span>
                          <span>
                            €
                            {Number(
                              paypalSummary.total ?? totalDue
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={paypalContainerRef} />
                    {!paypalError && (
                      <p className="mt-3 text-xs text-secondary">
                        You will complete your payment securely on PayPal.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {paymentMethod === "cod" && (
                <>
                  <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm">
                    <p className="font-semibold text-primary">
                      Payment Simulation
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      Choose how the mock payment should respond while testing
                      offline payments.
                    </p>
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center gap-2 text-secondary">
                        <input
                          type="radio"
                          name="simulation"
                          value="success"
                          checked={simulationMode === "success"}
                          onChange={() => setSimulationMode("success")}
                        />
                        <span>Simulate successful payment</span>
                      </label>
                      <label className="flex items-center gap-2 text-secondary">
                        <input
                          type="radio"
                          name="simulation"
                          value="failure"
                          checked={simulationMode === "failure"}
                          onChange={() => setSimulationMode("failure")}
                        />
                        <span>Simulate failed payment</span>
                      </label>
                    </div>
                  </div>

                  <div className="relative">
                    <LoadingOverlay show={placing} />
                    <button
                      disabled={!canPlaceOrder || placing}
                      className="mt-5 w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
                      onClick={placeOrder}
                    >
                      {placing ? "Placing..." : "Place Order"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
