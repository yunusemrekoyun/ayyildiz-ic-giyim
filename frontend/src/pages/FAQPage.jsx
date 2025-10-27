// src/pages/FAQPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, HelpCircle } from "lucide-react";
import BreadCrumb from "../components/shop/BreadCrumb";
import { faqApi } from "../api/faq";
import { useLocalizedPath } from "../hooks/useLocalizedPath.js";
import { DEFAULT_SITE_CODE, SITE_CODES } from "../constants/sites.js";

export default function FAQPage() {
  const { lng } = useParams();
  const [data, setData] = useState(null); // { heroTitle, heroIntro, sections: [...], isActive }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { buildPath } = useLocalizedPath();
  const normalizedSite = (lng || DEFAULT_SITE_CODE).toLowerCase();
  const siteCode = SITE_CODES.includes(normalizedSite)
    ? normalizedSite
    : DEFAULT_SITE_CODE;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await faqApi.public({ siteCode });
        if (!mounted) return;
        setData(res || null);
      } catch (e) {
        if (!mounted) return;
        setError(extractMessage(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [siteCode]);

  const title = data?.heroTitle?.trim() || "Frequently Asked Questions";
  const intro = data?.heroIntro?.trim() || "";
  const sections = Array.isArray(data?.sections) ? data.sections : [];
  const isActive = data?.isActive !== false; // undefined ise aktif say

  return (
    <main className="bg-surface-light/60">
      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6">
        <BreadCrumb
          items={[{ label: "Home", to: buildPath("") }, { label: "FAQ" }]}
        />
      </section>

      <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-14">
        <div className="rounded-2xl border border-border bg-white/90 p-8 sm:p-12 shadow-sm">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
              <HelpCircle className="h-6 w-6" />
            </span>

            {/* Loading / Error / Title */}
            {loading ? (
              <>
                <div className="h-8 w-72 animate-pulse rounded bg-surface" />
                <div className="mt-3 h-5 w-[600px] max-w-full animate-pulse rounded bg-surface" />
              </>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                {error}
              </div>
            ) : (
              <>
                <h1 className="font-serif text-4xl font-extrabold tracking-tight text-primary">
                  {title}
                </h1>
                {intro ? (
                  <p className="mt-3 max-w-3xl text-secondary">{intro}</p>
                ) : (
                  <p className="mt-3 max-w-3xl text-secondary">
                    Find quick answers about orders, shipping, returns and
                    product care. Need more help?{" "}
                    <a
                      href={buildPath("/contact")}
                      className="text-accent underline"
                    >
                      our contact page
                    </a>
                    .
                  </p>
                )}
              </>
            )}
          </div>

          {/* Body */}
          <div className="mt-10 space-y-8">
            {loading ? (
              // skeleton
              Array.from({ length: 3 }).map((_, si) => (
                <div key={si}>
                  <div className="h-6 w-56 animate-pulse rounded bg-surface" />
                  <div className="mt-4 rounded-2xl border border-border bg-surface-light p-4">
                    {Array.from({ length: 2 }).map((_, qi) => (
                      <div key={qi} className="mb-4 last:mb-0">
                        <div className="h-5 w-full animate-pulse rounded bg-white" />
                        <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-white/80" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : !isActive ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
                FAQ page is currently not active.
              </div>
            ) : sections.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-6 text-center text-secondary">
                No FAQ content yet.
              </div>
            ) : (
              sections.map((section) => (
                <FAQSection
                  key={section.id || section.title}
                  section={section}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function FAQSection({ section }) {
  const items = Array.isArray(section.items) ? section.items : [];
  return (
    <div>
      <h2 className="font-serif text-2xl font-semibold text-primary">
        {section.title || "Untitled Section"}
      </h2>
      <div className="mt-4 divide-y divide-border/70 rounded-2xl border border-border bg-surface-light">
        {items.length ? (
          items.map((item) => (
            <FAQItem key={item.id || item.question} item={item} />
          ))
        ) : (
          <div className="px-4 py-4 text-sm text-secondary">
            No questions in this section.
          </div>
        )}
      </div>
    </div>
  );
}

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  const q = item?.question || "Untitled question";
  const a = item?.answer || "";
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-primary transition hover:bg-white"
        aria-expanded={open}
      >
        <span className="font-medium">{q}</span>
        <ChevronDown
          className={`h-5 w-5 transition-transform ${
            open ? "rotate-180 text-accent" : "text-secondary"
          }`}
        />
      </button>
      {open ? (
        <div className="px-4 pb-5 text-sm text-secondary sm:px-6">
          {a || <em className="text-secondary/70">No answer yet.</em>}
        </div>
      ) : null}
    </div>
  );
}

function extractMessage(err) {
  if (!err) return "Unexpected error";
  try {
    const parsed = JSON.parse(String(err.message || err));
    if (parsed?.message) return parsed.message;
  } catch {
    // ignore
  }
  return err.message || String(err);
}
