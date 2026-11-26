import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { TestItem } from '../../types';
import { ClayCard } from '../ui';
import { cn, formatDateTime } from '../../lib/utils';

interface CalendarWidgetProps {
  tests: TestItem[];
  title?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function CalendarWidget({ tests, title = 'Calendar' }: CalendarWidgetProps) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const testsByDay = useMemo(() => {
    const map = new Map<number, TestItem[]>();
    tests.forEach((t) => {
      const d = new Date(t.scheduledAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dayNum = d.getDate();
        const prev = map.get(dayNum) ?? [];
        prev.push(t);
        map.set(dayNum, prev);
      }
    });
    return map;
  }, [tests, year, month]);

  const selectedTests = testsByDay.get(selectedDay) ?? [];
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const changeMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setCursor(next);
    setSelectedDay(1);
  };

  return (
    <ClayCard className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
              {title}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">{monthLabel}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[11px] bg-[var(--bg-surface-tinted)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[11px] bg-[var(--bg-surface-tinted)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((day) => (
            <span key={day} className="py-1 text-[11px] font-semibold text-[var(--text-muted)]">
              {day}
            </span>
          ))}
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-8" />;
            }
            const hasEvents = testsByDay.has(day);
            const isToday =
              day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = day === selectedDay;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                aria-label={`${day} ${monthLabel}${hasEvents ? ' (scheduled test)' : ''}`}
                className={cn(
                  'relative mx-auto flex h-8 w-8 cursor-pointer flex-col items-center justify-center rounded-[11px] text-xs font-semibold tabular-nums transition-all',
                  isSelected
                    ? 'bg-[var(--accent-primary)] text-white shadow-[0_6px_14px_rgba(108,92,231,0.28)]'
                    : isToday
                      ? 'bg-[var(--tile-lavender)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-tinted)]'
                )}
              >
                <span>{day}</span>
                {hasEvents && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 h-1 w-2.5 rounded-full',
                      isSelected ? 'bg-white' : 'bg-[var(--semantic-mint)]'
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day agenda below calendar */}
      <div className="mt-4 border-t border-[var(--border-subtle)] pt-3.5">
        {selectedTests.length > 0 ? (
          <div className="space-y-2">
            {selectedTests.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-[14px] bg-[var(--bg-surface-tinted)] px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-primary)]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                      {formatDateTime(t.scheduledAt)} · {t.code}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-[14px] bg-[var(--bg-surface-tinted)] px-3 py-2.5 text-xs text-[var(--text-muted)]">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />
            <span>
              No tests on {selectedDay} {cursor.toLocaleDateString('en-IN', { month: 'short' })}.
            </span>
          </div>
        )}
      </div>
    </ClayCard>
  );
}
