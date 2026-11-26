import { Bell, CheckCheck, ShieldAlert, FileCheck2, CalendarClock, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { EmptyNotificationsIllustration } from '../illustrations';
import { EmptyState } from '../ui';
import { cn } from '../../lib/utils';

const categoryIcons = {
  integrity: ShieldAlert,
  result: FileCheck2,
  test: CalendarClock,
  system: Bell,
};

const categoryTint = {
  integrity: 'bg-[var(--semantic-coral-soft)] text-[var(--semantic-coral-text)]',
  result: 'bg-[var(--semantic-mint-soft)] text-[var(--semantic-mint-text)]',
  test: 'bg-[var(--tile-lavender)] text-[var(--accent-primary)]',
  system: 'bg-[var(--tile-lavender)] text-[var(--accent-primary)]',
};

export function NotificationDrawer() {
  const user = useAuthStore((s) => s.user);
  const open = useUIStore((s) => s.notificationsOpen);
  const setOpen = useUIStore((s) => s.setNotificationsOpen);
  const notifications = useUIStore((s) => s.notifications);
  const markAllRead = useUIStore((s) => s.markAllNotificationsRead);

  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
    >
      <div
        className="fixed inset-0 bg-[#14123A]/30 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div className="clay-card relative z-10 flex h-full w-full max-w-md flex-col p-6">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Notifications</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Updates from your assessments and grading activity
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[12px] bg-[var(--bg-surface-tinted)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {notifications.length > 0 && (
          <div className="mt-4 mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">
              {unreadCount} unread
            </span>
            {user && unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead(user.uid)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-soft)]"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Mark all read</span>
              </button>
            )}
          </div>
        )}

        <div className="evx-panel-scroll flex-1 space-y-2.5 overflow-y-auto pr-1 pt-2">
          {notifications.length === 0 ? (
            <EmptyState
              embedded
              compact
              illustration={<EmptyNotificationsIllustration size={128} />}
              title="All caught up"
              description="Exam schedules, submissions, and score updates will appear here automatically."
            />
          ) : (
            notifications.map((item) => {
              const Icon = categoryIcons[item.category];
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex gap-3 rounded-[20px] border p-4 transition-colors',
                    item.read
                      ? 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                      : 'border-[var(--accent-primary)]/20 bg-[var(--bg-surface-tinted)]'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]',
                      categoryTint[item.category]
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                      {item.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
