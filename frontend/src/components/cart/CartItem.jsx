export default function CartItem({ item, onQty, onRemove }) {
  const inc = () => onQty(item.id, item.qty + 1);
  const dec = () => onQty(item.id, item.qty - 1);

  const lineTotal = (item.price * item.qty).toFixed(2);

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
        <p className="font-semibold text-primary">€{item.price.toFixed(2)}</p>
        <p className="mt-2 text-sm text-secondary">Total</p>
        <p className="font-semibold text-primary">€{lineTotal}</p>
      </div>
    </li>
  );
}
