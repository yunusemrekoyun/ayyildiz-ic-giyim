// src/context/CartProvider.jsx
import { useEffect, useMemo, useState } from "react";
import { CartContext } from "./CartContext";
import { shippingApi } from "../api";

// Varyantları ayırt eden benzersiz satır anahtarı
function makeLineId(id, { color = null, size = null, attribute = null } = {}) {
  const c = color ?? "";
  const s = size ?? "";
  const a = attribute ?? "";
  return `${id}|${c}|${s}|${a}`;
}

export default function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem("cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [shippingConfig, setShippingConfig] = useState({
    name: "Standard Shipping",
    fee: 0,
    freeThreshold: 0,
  });
  const [shippingLoading, setShippingLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const config = await shippingApi.getConfig();
        if (mounted && config) setShippingConfig(config);
      } catch {
        if (mounted) {
          setShippingConfig({
            name: "Standard Shipping",
            fee: 0,
            freeThreshold: 0,
          });
        }
      } finally {
        if (mounted) setShippingLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Ekle
  const addToCart = (product, options = {}) => {
    setItems((prev) => {
      const lineId = makeLineId(product.id, options);
      const existing = prev.find((it) => it.lineId === lineId);

      if (existing) {
        return prev.map((it) =>
          it.lineId === lineId
            ? { ...it, qty: Math.min(999, (it.qty || 0) + (options.qty || 1)) }
            : it
        );
      }

      const newItem = {
        lineId,
        id: product.id,
        title: product.name || product.title,
        image: product.images?.[0]?.url || "/pd-1.jpg",
        price: Number(product.price) || 0,
        qty: options.qty || 1,
        color: options.color || null,
        colorHex: options.colorHex || null,
        size: options.size || null,
        attribute: options.attribute || null,
      };

      return [...prev, newItem];
    });
  };

  // Sil
  const removeFromCart = (lineId) =>
    setItems((prev) => prev.filter((it) => it.lineId !== lineId));

  // Miktar değiştir
  const updateQty = (lineId, qty) =>
    setItems((prev) =>
      prev.map((it) =>
        it.lineId === lineId
          ? { ...it, qty: Math.max(1, Number(qty) || 1) }
          : it
      )
    );

  const clearCart = () => setItems([]);

  const totalItems = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0),
    [items]
  );
  const subTotal = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0),
        0
      ),
    [items]
  );

  const freeThreshold = Number(shippingConfig?.freeThreshold || 0);
  const baseShippingFee = Math.max(0, Number(shippingConfig?.fee || 0));

  const shippingFee = useMemo(() => {
    if (subTotal <= 0) return 0;
    if (freeThreshold > 0 && subTotal >= freeThreshold) return 0;
    return baseShippingFee;
  }, [subTotal, freeThreshold, baseShippingFee]);

  const total = useMemo(() => subTotal + shippingFee, [subTotal, shippingFee]);

  const refreshShipping = async () => {
    try {
      const config = await shippingApi.getConfig();
      setShippingConfig(config);
      return config;
    } catch (error) {
      setShippingConfig((prev) => prev);
      throw error;
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        totalItems,
        subTotal,
        total,
        shipping: {
          name: shippingConfig?.name || "Standard Shipping",
          fee: shippingFee,
          baseFee: baseShippingFee,
          freeThreshold,
          loading: shippingLoading,
          isFree: shippingFee === 0 && subTotal > 0,
        },
        refreshShipping,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
