// src/components/home-comments/HomeProductComments.jsx
import HomeProductCommentItem from "./HomeProductCommentItem";
import { useStaticTranslation } from "../../i18n/staticContent.js";

export default function HomeProductComments({ title, items = [] }) {
  const t = useStaticTranslation();
  const resolvedTitle = title ?? t("homeComments.title");

  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-6 py-16">
      <h2 className="mb-10 text-center font-serif text-3xl font-bold tracking-tight text-primary">
        {resolvedTitle}
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c, i) => (
          <HomeProductCommentItem key={i} {...c} />
        ))}
      </div>
    </section>
  );
}
