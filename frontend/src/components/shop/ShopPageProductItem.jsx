// src/components/shop/ShopPageProductItem.jsx
export default function ShopPageProductItem({ image, title, price }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-border shadow-sm transition hover:shadow-md">
      <img
        src={image}
        alt={title}
        className="h-80 w-full object-cover"
        draggable="false"
      />
      <div className="p-4">
        <h4 className="line-clamp-2 text-lg font-semibold tracking-tight text-primary">
          {title}
        </h4>
        <p className="mt-1 text-secondary">${price}</p>
      </div>
    </article>
  );
}
