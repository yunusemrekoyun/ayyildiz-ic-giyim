// src/components/home-sets/HomeSetItem.jsx
export default function HomeSetItem({ image, title, desc, includes, compact }) {
  if (compact) {
    // Daha minimal kart
    return (
      <article className="overflow-hidden rounded-xl bg-white ring-1 ring-border hover:shadow-sm transition">
        <img
          src={image}
          alt={title}
          className="h-36 w-full object-cover md:h-40"
          draggable="false"
        />
        <div className="p-3">
          <h3 className="line-clamp-1 text-[15px] font-semibold tracking-tight text-primary">
            {title}
          </h3>
          {desc && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-secondary">
              {desc}
            </p>
          )}
          {includes && (
            <p className="mt-2 line-clamp-1 text-[11px] text-secondary/90">
              <span className="font-medium text-primary">Includes:</span>{" "}
              {includes}
            </p>
          )}
        </div>
      </article>
    );
  }

  // Eski (standard) görünüm
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <img
        src={image}
        alt={title}
        className="h-56 w-full object-cover md:h-64"
        draggable="false"
      />
      <div className="p-6">
        <h3 className="text-2xl font-semibold tracking-tight text-primary">
          {title}
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-secondary">
          {desc}
        </p>
        {includes && (
          <p className="mt-3 text-sm text-secondary">
            <span className="font-medium text-primary">Includes:</span>{" "}
            {includes}
          </p>
        )}
      </div>
    </article>
  );
}
