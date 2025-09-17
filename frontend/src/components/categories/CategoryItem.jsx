// src/components/categories/CategoryItem.jsx
import { Link } from "react-router-dom";

export default function CategoryItem({ title, image, to = "#" }) {
  return (
    <Link to={to} className="group block">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <img
          src={image}
          alt={title}
          className="h-72 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          draggable="false"
        />
      </div>
      <div className="mt-5 text-center">
        <h3 className="text-xl font-semibold tracking-tight text-primary">
          {title}
        </h3>
      </div>
    </Link>
  );
}
