// src/components/home-products/HomeProductItem.jsx
import { Link } from "react-router-dom";

export default function HomeProductItem({
  to = "#",
  image,
  title,
  subtitle,
  price,
}) {
  return (
    <Link
      to={to}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:shadow-md"
    >
      {/* Görsel */}
      <img
        src={image}
        alt={title}
        className="h-48 w-full object-cover md:h-56"
        draggable="false"
      />

      {/* Alt içerik paneli */}
      <div className="flex flex-col gap-1 p-4">
        <h3 className="text-[15px] font-semibold tracking-tight text-primary">
          {title}
        </h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
        <span className="pt-2 text-sm font-semibold text-accent">
          {price}
        </span>
      </div>
    </Link>
  );
}
