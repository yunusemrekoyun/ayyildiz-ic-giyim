// src/components/set-detail/SetSummary.jsx
import React, { useMemo } from "react";
import QtyStepper from "./QtyStepper";
import { useCart } from "../../hooks/useCart";

export default function SetSummary({
  setDoc,
  price = 0,
  stock = null,
  quantity = 1,
  maxStock = 99,
  onChangeQuantity,
}) {
  const { addToCart } = useCart();

  const hasStockInfo = stock !== null && stock !== undefined;
  const canBuy = (hasStockInfo ? stock > 0 : true) && quantity >= 1;

  const priceText = useMemo(() => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "EUR",
      }).format(Number(price || 0));
    } catch {
      return `€${Number(price || 0).toFixed(2)}`;
    }
  }, [price]);

  const handleAdd = () => {
    if (!setDoc) return;
    addToCart(setDoc, {
      qty: quantity,
    });
  };

  return (
    <div className="rounded-xl bg-surface/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Qty */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-secondary">Quantity</span>
          <QtyStepper
            value={quantity}
            min={1}
            max={Math.min(maxStock || 99, 999)}
            onChange={onChangeQuantity}
          />
        </div>

        {/* Price + CTA */}
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-primary">{priceText}</div>
          <button
            type="button"
            disabled={!canBuy}
            onClick={handleAdd}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white
                       hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
