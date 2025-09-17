// src/components/home-sets/HomeSetItem.jsx
export default function HomeSetItem({ image, title, desc, includes }) {
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
