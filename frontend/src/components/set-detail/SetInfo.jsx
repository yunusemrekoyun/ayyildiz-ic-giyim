import DiscountBadge from "../ui/DiscountBadge.jsx";

export default function SetInfo({
  name,
  price,
  finalPrice,
  discount,
  stock,
  description,
}) {
  const basePrice = Number(price ?? 0);
  const computedFinal = Number(finalPrice ?? basePrice);
  const showStrike = Number.isFinite(basePrice) && computedFinal < basePrice;
  const priceFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-primary">
        {name}
      </h1>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-accent">
            {priceFormatter.format(computedFinal)}
          </span>
          {showStrike && (
            <span className="text-base text-secondary/60 line-through">
              {priceFormatter.format(basePrice)}
            </span>
          )}
        </div>
        {showStrike && (
          <DiscountBadge percentage={discount} size="sm" />
        )}
        <div
          className={[
            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
            stock > 0
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
          ].join(" ")}
        >
          {stock > 0
            ? `In stock: ${
                stock >= Number.MAX_SAFE_INTEGER / 2 ? "∞" : stock
              }`
            : "Out of stock"}
        </div>
      </div>

      {description && (
        <p className="mt-3 text-[15px] leading-relaxed text-secondary">
          {description}
        </p>
      )}
    </div>
  );
}
