// src/components/home-comments/HomeProductCommentItem.jsx
export default function HomeProductCommentItem({
  name,
  quote,
  rating = 5,
  avatar = "/avatar-default.png",
}) {
  return (
    <article className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
      {/* Avatar */}
      <div className="mx-auto mb-5 h-16 w-16 overflow-hidden rounded-full ring-1 ring-black/10">
        <img
          src={avatar}
          alt={name}
          className="h-full w-full object-cover"
          draggable="false"
        />
      </div>

      {/* Stars */}
      <div className="mb-4 flex items-center justify-center gap-1 text-accent">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            viewBox="0 0 20 20"
            className={`h-5 w-5 ${
              i < rating ? "fill-current" : "fill-transparent stroke-current"
            }`}
            aria-hidden="true"
          >
            <path
              strokeWidth="1.2"
              d="M10 2.5l2.39 4.84 5.34.78-3.86 3.76.91 5.31L10 14.98 4.22 17.2l.91-5.31L1.27 8.12l5.34-.78L10 2.5z"
            />
          </svg>
        ))}
      </div>

      {/* Quote */}
      <p className="mx-auto max-w-md italic leading-relaxed text-gray-600">
        “{quote}”
      </p>

      {/* Name */}
      <p className="mt-4 font-semibold text-primary">– {name}</p>
    </article>
  );
}
