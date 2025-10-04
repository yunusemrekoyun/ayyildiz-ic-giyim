import {
  Eye,
  Mail,
  Phone,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { formatDate, formatRelative, roleBadge } from "./helpers.js";

export default function UserTable({
  users = [],
  loading = false,
  onSelect,
  onChangeRole,
  currentUserId,
  pendingUserId,
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-2xl bg-[var(--color-bg-hover)]"
          />
        ))}
      </div>
    );
  }

  if (!users.length) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-[var(--color-border-admin)] bg-[var(--color-bg-card)] px-6 py-14 text-center">
        <div className="max-w-md space-y-2">
          <p className="text-base font-medium text-[var(--color-text-admin)]">
            No users yet
          </p>
          <p className="text-sm text-[var(--color-text-admin-muted)]">
            Invite shoppers or import customer lists to start building your
            community.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--color-border-admin)] bg-[var(--color-bg-card)] shadow-sm">
      <table className="min-w-[720px] divide-y divide-[var(--color-border-admin)]/70 text-sm">
        <thead className="bg-[var(--color-bg-hover)]/60 text-[var(--color-text-admin-muted)]">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-left font-medium">Contact</th>
            <th className="px-4 py-3 text-left font-medium">Role</th>
            <th className="px-4 py-3 text-left font-medium">Joined</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-admin)]/60 text-[var(--color-text-admin)]">
          {users.map((user) => {
            const roleMeta = roleBadge(user.role);
            const isSelf = currentUserId && currentUserId === user.id;
            const nextRole = user.role === "admin" ? "user" : "admin";
            const isPending = pendingUserId && pendingUserId === user.id;
            const disableRoleChange = (isSelf && user.role === "admin") || isPending;
            return (
              <tr
                key={user.id}
                className="hover:bg-[var(--color-bg-hover)]/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-bg-hover)] text-base font-semibold">
                      {user.initials}
                    </div>
                    <div>
                      <p className="font-semibold">{user.fullName || "—"}</p>
                      <p className="text-xs text-[var(--color-text-admin-muted)]">
                        ID #{user.id.slice(-6)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <a
                      href={`mailto:${user.email}`}
                      className="inline-flex items-center gap-2 text-sm text-[var(--color-text-admin)] hover:text-[var(--color-accent)]"
                    >
                      <Mail className="h-4 w-4 text-[var(--color-text-admin-muted)]" />
                      {user.email}
                    </a>
                    <div className="inline-flex items-center gap-2 text-xs text-[var(--color-text-admin-muted)]">
                      <Phone className="h-4 w-4" />
                      {user.phone || "—"}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${roleMeta.className}`}
                  >
                    {user.role === "admin" ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : null}
                    {roleMeta.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm">{formatDate(user.createdAt)}</div>
                  <div className="text-xs text-[var(--color-text-admin-muted)]">
                    {formatRelative(user.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onSelect?.(user)}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-admin)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-admin)] hover:bg-[var(--color-bg-hover)]"
                    >
                      <Eye className="h-4 w-4" /> View
                    </button>
                    <button
                      onClick={() => onChangeRole?.(user, nextRole)}
                      disabled={disableRoleChange || !onChangeRole}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        user.role === "admin"
                          ? "border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60 disabled:hover:bg-transparent"
                          : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                      }`}
                      title={
                        disableRoleChange
                          ? isPending
                            ? "Updating role..."
                            : "You cannot revoke your own admin rights"
                          : user.role === "admin"
                          ? "Revoke admin access"
                          : "Promote to admin"
                      }
                    >
                      {isPending ? (
                        <span className="text-[var(--color-text-admin-muted)]">
                          Updating...
                        </span>
                      ) : user.role === "admin" ? (
                        <>
                          <ShieldOff className="h-4 w-4" /> Remove admin
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" /> Make admin
                        </>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
