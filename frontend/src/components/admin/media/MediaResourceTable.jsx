import { Trash2, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBytesShort } from "./MediaUsageCard";

export default function MediaResourceTable({
  resources = [],
  loading = false,
  onDelete,
  onLoadMore,
  hasMore,
}) {
  const { t } = useTranslation();
  if (loading && !resources.length) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-hover)]"
          />
        ))}
      </div>
    );
  }

  if (!resources.length) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-6 py-12 text-center">
        <p className="max-w-md text-sm text-[var(--color-text-admin-muted)]">
          {t("admin.media.noAssets")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] shadow-sm">
      <table className="min-w-full divide-y divide-[var(--color-border-admin)]/70 text-sm">
        <thead className="bg-[var(--color-bg-hover)]/60 text-[var(--color-text-admin-muted)]">
          <tr>
            <th className="px-4 py-3 text-left font-medium">
              {t("admin.media.table.asset")}
            </th>
            <th className="px-4 py-3 text-left font-medium">
              {t("admin.media.table.folder")}
            </th>
            <th className="px-4 py-3 text-left font-medium">
              {t("admin.media.table.size")}
            </th>
            <th className="px-4 py-3 text-left font-medium">
              {t("admin.media.table.created")}
            </th>
            <th className="px-4 py-3 text-right font-medium">
              {t("admin.media.table.actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-admin)]/60 text-[var(--color-text-admin)]">
          {resources.map((resource) => (
            <tr key={resource.publicId} className="hover:bg-[var(--color-bg-hover)]/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {resource.secureUrl ? (
                <img
                  src={resource.secureUrl}
                  alt={resource.publicId}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-lg bg-[var(--color-bg-hover)] text-[var(--color-text-admin-muted)]">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{resource.publicId}</div>
                    <div className="mt-0.5 text-xs text-[var(--color-text-admin-muted)]">
                      {resource.format?.toUpperCase()} • {resource.resourceType}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-[var(--color-text-admin-muted)]">
                {resource.folder || t("admin.media.folderRoot")}
              </td>
              <td className="px-4 py-3">{formatBytesShort(resource.bytes)}</td>
              <td className="px-4 py-3 text-[var(--color-text-admin-muted)]">
                {formatDate(resource.createdAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onDelete?.(resource)}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> {t("admin.common.delete")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <div className="border-t border-[var(--color-border-admin)]/70 bg-[var(--color-bg-admin)]/40 px-4 py-3 text-center">
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-4 py-2 text-sm font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)] disabled:opacity-60"
                >
                  {t("admin.common.loadMore")}
                </button>
        </div>
      )}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
