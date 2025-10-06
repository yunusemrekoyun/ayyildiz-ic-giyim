export default function SetInfo({ name, price, stock, description }) {
  const priceText = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(price || 0);

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-primary">
        {name}
      </h1>

      <div className="mt-2 flex items-center gap-3">
        <div className="text-xl font-semibold text-primary">{priceText}</div>
        <div
          className={[
            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
            stock > 0
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
          ].join(" ")}
        >
          {stock > 0 ? `In stock: ${stock}` : "Out of stock"}
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
