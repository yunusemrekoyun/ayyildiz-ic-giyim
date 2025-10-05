// src/components/admin/users/UserTable.jsx
import {
  Eye,
  Mail,
  Phone,
  ShieldCheck,
  ShieldOff,
  UserX,
  Undo2,
} from "lucide-react";
import { formatDate, formatRelative, roleBadge } from "./helpers.js";

export default function UserTable({
  users = [],
  loading = false,
  onSelect,
  onChangeRole,
  onSoftDelete, // NEW
  onRestore, // NEW
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
      <table className="w-full min-w-[820px] table-fixed divide-y divide-[var(--color-border-admin)]/70 text-sm">
        {" "}
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
            const isDeleted = Boolean(user.isDeleted);
            const disableRoleChange =
              (isSelf && user.role === "admin") || isPending || isDeleted;

            return (
              <tr
                key={user.id}
                className={`transition-colors ${
                  isDeleted
                    ? "bg-[var(--color-bg-hover)]/30"
                    : "hover:bg-[var(--color-bg-hover)]/50"
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-full text-base font-semibold ${
                        isDeleted
                          ? "bg-[var(--color-border-admin)]/40 text-[var(--color-text-admin-muted)]"
                          : "bg-[var(--color-bg-hover)]"
                      }`}
                    >
                      {user.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-semibold ${
                            isDeleted ? "line-through opacity-70" : ""
                          }`}
                        >
                          {user.fullName || "—"}
                        </p>
                        {isDeleted && user.deletedAlias ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            as{" "}
                            <span className="italic">{user.deletedAlias}</span>
                          </span>
                        ) : null}
                        {isDeleted ? (
                          <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                            <UserX className="h-3 w-3" /> Deleted
                          </span>
                        ) : null}
                      </div>
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
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                      roleMeta.className
                    } ${isDeleted ? "opacity-60" : ""}`}
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
                        isDeleted
                          ? "Deleted accounts cannot change role"
                          : isSelf && user.role === "admin"
                          ? "You cannot revoke your own admin rights"
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

                    {!isDeleted ? (
                      <button
                        onClick={() => onSoftDelete?.(user)}
                        disabled={isSelf || isPending}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        title={
                          isSelf
                            ? "You cannot delete yourself"
                            : "Deactivate (soft delete)"
                        }
                      >
                        {isPending ? (
                          "Working..."
                        ) : (
                          <>
                            <UserX className="h-4 w-4" /> Delete
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => onRestore?.(user)}
                        disabled={isPending}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                        title="Restore account"
                      >
                        {isPending ? (
                          "Working..."
                        ) : (
                          <>
                            <Undo2 className="h-4 w-4" /> Restore
                          </>
                        )}
                      </button>
                    )}
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
