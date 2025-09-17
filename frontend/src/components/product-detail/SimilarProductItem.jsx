export default function SimilarProductItem({ image, title, price }) {
  return (
    <article className="overflow-hidden rounded-xl bg-white ring-1 ring-border hover:shadow-sm transition">
      <img
        src={image}
        alt={title}
        className="h-48 w-full object-cover"
        draggable="false"
      />
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-primary">
          {title}
        </h3>
        <p className="mt-1 text-sm font-semibold text-accent">{price}</p>
      </div>
    </article>
  );
}
