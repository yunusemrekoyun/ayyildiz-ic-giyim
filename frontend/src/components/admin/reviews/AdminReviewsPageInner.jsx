import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  RefreshCcw,
  Star,
  Trash2,
  User,
  Clock3,
} from "lucide-react";
import { reviewApi } from "../../../api/reviews";
import AlertBanner from "../../ui/AlertBanner.jsx";
import { useConfirm } from "../../ui/ConfirmDialog.jsx";

const DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const LIST_LIMIT = 10;

export default function AdminReviewsPageInner() {
  const confirm = useConfirm();
  const [summary, setSummary] = useState({ pending: 0, approved: 0, total: 0 });
  const [banner, setBanner] = useState(null);

  const [carouselLoading, setCarouselLoading] = useState(true);
  const [carouselItems, setCarouselItems] = useState([]);

  const [pendingPage, setPendingPage] = useState(1);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingData, setPendingData] = useState({
    reviews: [],
    pagination: { page: 1, pages: 1, total: 0, limit: LIST_LIMIT },
  });

  const [approvedPage, setApprovedPage] = useState(1);
  const [approvedLoading, setApprovedLoading] = useState(true);
  const [approvedData, setApprovedData] = useState({
    reviews: [],
    pagination: { page: 1, pages: 1, total: 0, limit: LIST_LIMIT },
  });

  const [actionLoading, setActionLoading] = useState({});

  const loadSummary = useCallback(async () => {
    try {
      const data = await reviewApi.summary();
      setSummary({
        pending: data.pending ?? 0,
        approved: data.approved ?? 0,
        total: data.total ?? 0,
      });
    } catch (error) {
      setBanner({
        variant: "danger",
        message: error?.message || "Failed to load review summary.",
      });
    }
  }, []);

  const loadCarousel = useCallback(async () => {
    setCarouselLoading(true);
    try {
      const data = await reviewApi.listPending({ limit: 10 });
      setCarouselItems(data?.reviews || []);
    } catch (error) {
      setBanner({
        variant: "danger",
        message: error?.message || "Unable to load pending review slider.",
      });
    } finally {
      setCarouselLoading(false);
    }
  }, []);

  const loadPendingList = useCallback(
    async (page = 1) => {
      setPendingLoading(true);
      try {
        const data = await reviewApi.listAdmin({
          status: "pending",
          page,
          limit: LIST_LIMIT,
        });
        const pagination = normalizePagination(data?.pagination, page);
        if (page > pagination.pages && pagination.pages >= 1) {
          setPendingPage(pagination.pages);
          return;
        }
        setPendingData({
          reviews: data?.reviews || [],
          pagination,
        });
      } catch (error) {
        setBanner({
          variant: "danger",
          message: error?.message || "Failed to load pending reviews.",
        });
        setPendingData((prev) => ({
          ...prev,
          reviews: [],
          pagination: { page: 1, pages: 1, total: 0, limit: LIST_LIMIT },
        }));
      } finally {
        setPendingLoading(false);
      }
    },
    []
  );

  const loadApprovedList = useCallback(
    async (page = 1) => {
      setApprovedLoading(true);
      try {
        const data = await reviewApi.listAdmin({
          status: "approved",
          page,
          limit: LIST_LIMIT,
        });
        const pagination = normalizePagination(data?.pagination, page);
        if (page > pagination.pages && pagination.pages >= 1) {
          setApprovedPage(pagination.pages);
          return;
        }
        setApprovedData({
          reviews: data?.reviews || [],
          pagination,
        });
      } catch (error) {
        setBanner({
          variant: "danger",
          message: error?.message || "Failed to load approved reviews.",
        });
        setApprovedData((prev) => ({
          ...prev,
          reviews: [],
          pagination: { page: 1, pages: 1, total: 0, limit: LIST_LIMIT },
        }));
      } finally {
        setApprovedLoading(false);
      }
    },
    []
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadSummary(),
      loadCarousel(),
      loadPendingList(pendingPage),
      loadApprovedList(approvedPage),
    ]);
  }, [loadSummary, loadCarousel, loadPendingList, loadApprovedList, pendingPage, approvedPage]);

  useEffect(() => {
    loadSummary();
    loadCarousel();
  }, [loadSummary, loadCarousel]);

  useEffect(() => {
    loadPendingList(pendingPage);
  }, [loadPendingList, pendingPage]);

  useEffect(() => {
    loadApprovedList(approvedPage);
  }, [loadApprovedList, approvedPage]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Pending",
        value: summary.pending,
        Icon: Clock3,
        tone: "bg-amber-500/10 text-amber-500",
      },
      {
        label: "Approved",
        value: summary.approved,
        Icon: CheckCircle2,
        tone: "bg-emerald-500/10 text-emerald-500",
      },
      {
        label: "Total",
        value: summary.total,
        Icon: MessageSquare,
        tone: "bg-sky-500/10 text-sky-500",
      },
    ],
    [summary]
  );

  const handleApprove = useCallback(
    async (review) => {
      if (!review?.id) return;
      setActionLoading((prev) => ({ ...prev, [review.id]: "approve" }));
      try {
        const updated = await reviewApi.approve(review.id);
        const resolved = updated || review;
        const reviewerName = getReviewerName(resolved);
        const target = getTargetMeta(resolved);
        setBanner({
          variant: "success",
          message: `Review for ${target.name} (${targetTypeLabel(
            target.type
          )}) from ${reviewerName} approved.`,
        });
        await Promise.all([
          loadSummary(),
          loadCarousel(),
          loadPendingList(pendingPage),
          loadApprovedList(approvedPage),
        ]);
      } catch (error) {
        setBanner({
          variant: "danger",
          message: error?.message || "Failed to approve review.",
        });
      } finally {
        setActionLoading((prev) => removeKey(prev, review.id));
      }
    },
    [approvedPage, loadApprovedList, loadCarousel, loadPendingList, loadSummary, pendingPage]
  );

  const handleDelete = useCallback(
    async (review) => {
      if (!review?.id) return;
      const target = getTargetMeta(review);
      const reviewerName = getReviewerName(review);
      const ok = await confirm({
        title: "Delete review",
        description: `Delete review for ${target.name} (${targetTypeLabel(
          target.type
        )}) from ${reviewerName}?`,
        tone: "danger",
        confirmText: "Delete",
      });
      if (!ok) return;

      setActionLoading((prev) => ({ ...prev, [review.id]: "delete" }));
      try {
        await reviewApi.remove(review.id);
        setBanner({
          variant: "warning",
          message: `Review for ${target.name} from ${reviewerName} deleted.`,
        });
        await Promise.all([
          loadSummary(),
          loadCarousel(),
          loadPendingList(pendingPage),
          loadApprovedList(approvedPage),
        ]);
      } catch (error) {
        setBanner({
          variant: "danger",
          message: error?.message || "Failed to delete review.",
        });
      } finally {
        setActionLoading((prev) => removeKey(prev, review.id));
      }
    },
    [approvedPage, confirm, loadApprovedList, loadCarousel, loadPendingList, loadSummary, pendingPage]
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Review Moderation</h1>
            <p className="text-sm text-[var(--color-text-admin-muted)]">
              Approve, reject and track customer feedback across the store.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh data
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {summaryCards.map((item) => {
            const MetricIcon = item.Icon;
            return (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border-admin)]/60 bg-[var(--color-bg-admin)]/40 p-4"
              >
                <div>
                  <div className="text-xs uppercase tracking-wide text-[var(--color-text-admin-muted)]">
                    {item.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--color-text-admin)]">
                    {item.value}
                  </div>
                </div>
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${item.tone}`}>
                  <MetricIcon className="h-5 w-5" />
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {banner ? (
        <AlertBanner
          variant={banner.variant}
          message={banner.message}
          onClose={() => setBanner(null)}
        />
      ) : null}

      <PendingReviewCarousel
        reviews={carouselItems}
        loading={carouselLoading}
        onApprove={handleApprove}
        onDelete={handleDelete}
        actionLoading={actionLoading}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReviewListSection
          title="Pending reviews"
          subtitle="Queued reviews waiting for approval."
          reviews={pendingData.reviews}
          loading={pendingLoading}
          pagination={pendingData.pagination}
          onPageChange={setPendingPage}
          onApprove={handleApprove}
          onDelete={handleDelete}
          actionLoading={actionLoading}
          showApprove
        />

        <ReviewListSection
          title="Approved reviews"
          subtitle="Published reviews currently visible on the site."
          reviews={approvedData.reviews}
          loading={approvedLoading}
          pagination={approvedData.pagination}
          onPageChange={setApprovedPage}
          onDelete={handleDelete}
          actionLoading={actionLoading}
        />
      </div>
    </div>
  );
}

function PendingReviewCarousel({
  reviews,
  loading,
  onApprove,
  onDelete,
  actionLoading,
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [reviews]);

  useEffect(() => {
    if (!reviews?.length) return undefined;
    const interval = setInterval(() => {
      setActiveIndex((prev) =>
        reviews.length ? (prev + 1) % reviews.length : 0
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [reviews]);

  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
        <div className="flex flex-col gap-4">
          <div className="h-6 w-48 animate-pulse rounded-full bg-[var(--color-bg-hover)]" />
          <div className="h-36 w-full animate-pulse rounded-2xl bg-[var(--color-bg-hover)]" />
        </div>
      </section>
    );
  }

  if (!reviews?.length) {
    return (
      <section className="rounded-3xl border border-dashed border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6 text-center text-sm text-[var(--color-text-admin-muted)]">
        No pending reviews awaiting moderation.
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border-admin)] bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-card)]/60 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-admin)]">
            Pending review spotlight
          </h2>
          <p className="text-sm text-[var(--color-text-admin-muted)]">
            Reviews rotate automatically; take action directly from here.
          </p>
        </div>
        <div className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-admin-muted)] md:flex">
          {activeIndex + 1} / {reviews.length}
        </div>
      </div>

      <div className="relative mt-6 h-full min-h-[240px]">
        {reviews.map((review, index) => {
          const isActive = index === activeIndex;
          const actionState = actionLoading[review.id];
          const target = getTargetMeta(review);
          const reviewerName = getReviewerName(review);
          return (
            <article
              key={review.id}
              className={`absolute inset-0 flex flex-col gap-6 rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)]/80 p-6 shadow transition-all duration-500 ${
                isActive
                  ? "translate-x-0 opacity-100"
                  : "pointer-events-none translate-x-10 opacity-0"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-bg-admin)]/30">
                      <User className="h-6 w-6 text-[var(--color-text-admin)]" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-[var(--color-text-admin)]">
                        {reviewerName}
                      </div>
                      <div className="text-xs text-[var(--color-text-admin-muted)]">
                        {review.user?.email || "No email"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--color-border-admin)]/60 bg-white/10 p-4 text-sm text-[var(--color-text-admin)]">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--color-text-admin-muted)]">
                      <Package className="h-4 w-4" />
                      <span>{target.name}</span>
                      <span className="rounded-full border border-[var(--color-border-admin)] px-2 py-0.5 text-[9px] font-semibold tracking-widest text-[var(--color-text-admin-muted)]">
                        {targetTypeLabel(target.type)}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-line leading-relaxed">
                      {review.body || review.title || "No message"}
                    </p>
                  </div>
                </div>

                <aside className="flex w-full max-w-xs flex-col justify-between rounded-2xl border border-[var(--color-border-admin)]/60 bg-[var(--color-bg-admin)]/40 p-4">
                  <div className="space-y-3 text-sm text-[var(--color-text-admin)]">
                    <div className="flex items-center gap-2">
                      {renderRating(review.rating)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-admin-muted)]">
                      <Clock3 className="h-4 w-4" />
                      {formatDateTime(review.createdAt)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-admin-muted)]">
                      <Mail className="h-4 w-4" />
                      {review.user?.email || "—"}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onApprove(review)}
                      disabled={Boolean(actionState)}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {actionState === "approve" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(review)}
                      disabled={Boolean(actionState)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-400 px-4 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {actionState === "delete" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </aside>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {reviews.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 w-6 rounded-full transition-colors ${
              index === activeIndex
                ? "bg-[var(--color-text-admin)]"
                : "bg-[var(--color-border-admin)]"
            }`}
            aria-label={`Show review ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

function ReviewListSection({
  title,
  subtitle,
  reviews,
  loading,
  pagination,
  onPageChange,
  onApprove,
  onDelete,
  actionLoading,
  showApprove = false,
}) {
  return (
    <section className="flex h-full flex-col gap-4 rounded-3xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] p-6">
      <header>
        <h3 className="text-lg font-semibold text-[var(--color-text-admin)]">
          {title}
        </h3>
        <p className="text-sm text-[var(--color-text-admin-muted)]">
          {subtitle}
        </p>
      </header>

      <div className="flex-1 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-[var(--color-bg-hover)]"
            />
          ))
        ) : reviews.length ? (
          reviews.map((review) => {
            const actionState = actionLoading[review.id];
            const target = getTargetMeta(review);
            const reviewerName = getReviewerName(review);
            return (
              <article
                key={review.id}
                className="rounded-2xl border border-[var(--color-border-admin)]/50 bg-[var(--color-bg-admin)]/40 p-4"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-base font-semibold text-[var(--color-text-admin)]">
                        {reviewerName}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-admin-muted)]">
                        <Mail className="h-4 w-4" />
                        {review.user?.email || "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-500">
                      {renderRating(review.rating)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--color-border-admin)]/40 bg-white/10 p-3 text-sm text-[var(--color-text-admin)]">
                    {review.body || review.title || "No message provided."}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-admin-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {target.name}
                      <span className="rounded-full border border-[var(--color-border-admin)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest">
                        {targetTypeLabel(target.type)}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-4 w-4" />
                      {formatDateTime(review.createdAt)}
                    </span>
                    {review.approvedAt ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        {formatDateTime(review.approvedAt)}
                      </span>
                    ) : null}
                    {review.approvedBy?.name ? (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {review.approvedBy.name}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {showApprove ? (
                      <button
                        type="button"
                        onClick={() => onApprove(review)}
                        disabled={Boolean(actionState)}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
                      >
                        {actionState === "approve" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Approve
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onDelete(review)}
                      disabled={Boolean(actionState)}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-400 px-4 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {actionState === "delete" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-admin)] bg-[var(--color-bg-admin)]/30 p-6 text-center text-sm text-[var(--color-text-admin-muted)]">
            No reviews in this state.
          </div>
        )}
      </div>

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--color-border-admin)]/50 pt-4 text-xs text-[var(--color-text-admin-muted)]">
        <div>
          {pagination.total} total • Page {pagination.page} of {pagination.pages}
        </div>
        <PaginationControls pagination={pagination} onPageChange={onPageChange} />
      </footer>
    </section>
  );
}

function PaginationControls({ pagination, onPageChange }) {
  const { page = 1, pages = 1 } = pagination || {};
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
      >
        ‹ Prev
      </button>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(pages, page + 1))}
        disabled={page >= pages}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-admin)] px-3 py-1 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
      >
        Next ›
      </button>
    </div>
  );
}

function normalizePagination(pagination = {}, fallbackPage = 1) {
  const page = Math.max(1, Number(pagination.page || fallbackPage || 1));
  const limit = Math.max(1, Number(pagination.limit || LIST_LIMIT));
  const total = Math.max(0, Number(pagination.total || 0));
  const pages = Math.max(1, Number(pagination.pages || Math.ceil(total / limit) || 1));
  return { page, limit, total, pages };
}

function removeKey(map, key) {
  const next = { ...map };
  delete next[key];
  return next;
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return DATE_FORMATTER.format(new Date(value));
  } catch {
    return "—";
  }
}

function getTargetMeta(review) {
  if (!review) {
    return { name: "Unknown item", type: "product" };
  }
  const type =
    review.target?.type ||
    (review.set ? "set" : "product");
  const name =
    review.target?.name ||
    review.product?.name ||
    review.set?.name ||
    "Unknown item";
  return { name, type };
}

function getReviewerName(review) {
  if (!review) return "customer";
  return review.user?.name || "customer";
}

function targetTypeLabel(type) {
  return type === "set" ? "Set" : "Product";
}

function renderRating(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${
            index < value ? "fill-amber-400 text-amber-400" : "text-[var(--color-border-admin)]"
          }`}
        />
      ))}
      <span className="text-xs text-[var(--color-text-admin-muted)]">{value.toFixed(1)}</span>
    </>
  );
}
