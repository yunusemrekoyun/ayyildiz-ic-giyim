// src/components/cart/CartItem.jsx
export default function CartItem({ item, onQty, onRemove }) {
  const inc = () => onQty(item.lineId, item.qty + 1);
  const dec = () => onQty(item.lineId, item.qty - 1);

  const qty = Number(item.qty) || 0;
  const unitFinal = Number(item.price) || 0;
  const unitOriginal = Number(
    item.originalPrice != null ? item.originalPrice : item.price
  );
  const showStrike = unitFinal < unitOriginal;
  const lineTotal = unitFinal * qty;
  const originalTotal = unitOriginal * qty;

  return (
    <li className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-12">
      {/* Görsel */}
      <div className="sm:col-span-2">
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <img
            src={item.image}
            alt={item.title}
            className="aspect-square w-full object-cover"
            draggable="false"
          />
        </div>
      </div>

      {/* Bilgiler */}
      <div className="sm:col-span-7">
        <h4 className="text-base font-semibold text-primary">{item.title}</h4>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
          {item.colorHex && (
            <span className="inline-flex items-center gap-1 text-secondary">
              Color:
              <span
                className="ml-1 inline-block h-3 w-3 rounded-full ring-1 ring-border"
                style={{ backgroundColor: item.colorHex }}
              />
              <span className="text-secondary/80">{item.color}</span>
            </span>
          )}
          {item.size && (
            <span className="text-secondary">Size: {item.size}</span>
          )}
          {item.attribute && (
            <span className="text-secondary">Option: {item.attribute}</span>
          )}
        </div>

        {/* Miktar + Kaldır */}
        <div className="mt-3 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-contact-bg px-3 py-1.5">
            <button onClick={dec} className="px-1 text-primary">
              –
            </button>
            <span className="w-6 text-center text-primary">{item.qty}</span>
            <button onClick={inc} className="px-1 text-primary">
              +
            </button>
          </div>

          <button
            onClick={onRemove}
            className="text-sm text-secondary hover:text-accent"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Fiyatlar */}
      <div className="sm:col-span-3 sm:text-right">
        <p className="text-sm text-secondary">Unit</p>
        <div className="flex items-baseline gap-2 sm:justify-end">
          <span className="font-semibold text-primary">
            €{unitFinal.toFixed(2)}
          </span>
          {showStrike && (
            <span className="text-xs text-secondary/60 line-through">
              €{unitOriginal.toFixed(2)}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-secondary">Total</p>
        <div className="flex items-baseline gap-2 sm:justify-end">
          <span className="font-semibold text-primary">
            €{lineTotal.toFixed(2)}
          </span>
          {showStrike && (
            <span className="text-xs text-secondary/60 line-through">
              €{originalTotal.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
