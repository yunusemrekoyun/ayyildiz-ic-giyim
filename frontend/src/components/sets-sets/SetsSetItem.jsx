import { Link } from "react-router-dom";

export default function SetsSetItem({ image, title, desc, includes, to }) {
  const isDisabled = !to;

  const Wrapper = ({ children }) =>
    isDisabled ? (
      <div className="block cursor-not-allowed opacity-70">{children}</div>
    ) : (
      <Link
        to={to}
        aria-label={title ? `Open ${title}` : "Open set"}
        className="group block"
      >
        {children}
      </Link>
    );

  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-sm transition">
      <Wrapper>
        <div className="overflow-hidden">
          <img
            src={image}
            alt={title || "Set"}
            className="h-56 w-full object-cover md:h-64 transition-transform duration-300 group-hover:scale-[1.02]"
            draggable="false"
          />
        </div>

        <div className="p-6">
          <h3 className="text-2xl font-semibold tracking-tight text-primary line-clamp-1">
            {title}
          </h3>

          {desc && (
            <p className="mt-2 text-[15px] leading-relaxed text-secondary line-clamp-2">
              {desc}
            </p>
          )}

          {includes && (
            <p className="mt-3 text-sm text-secondary line-clamp-1">
              <span className="font-medium text-primary">Includes:</span>{" "}
              {includes}
            </p>
          )}

          {!isDisabled && (
            <div className="mt-4 inline-flex items-center text-sm font-medium text-accent group-hover:underline">
              View details →
            </div>
          )}
        </div>
      </Wrapper>
    </article>
  );
}
