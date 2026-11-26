import type { ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { ClayCard, Logo } from '../../components/ui';
import { cn } from '../../lib/utils';

interface AuthLayoutProps {
  heading: string;
  subheading: string;
  children: ReactNode;
}

export function AuthLayout({ heading, subheading, children }: AuthLayoutProps) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[var(--bg-canvas)] px-4 py-10 transition-colors duration-200">
      {/* Faint decorative curved lines & minimal confetti dots */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full select-none"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          d="M-80 210C220 90 480 320 820 170C1120 40 1320 220 1520 130"
          stroke="var(--accent-primary)"
          strokeOpacity="0.08"
          strokeWidth="1.2"
        />
        <path
          d="M-60 720C280 580 540 820 880 680C1160 564 1340 720 1520 640"
          stroke="var(--accent-primary)"
          strokeOpacity="0.075"
          strokeWidth="1.2"
        />
        <circle cx="320" cy="190" r="5" fill="var(--accent-primary)" fillOpacity="0.22" />
        <circle cx="1110" cy="240" r="4.5" fill="var(--semantic-mint)" fillOpacity="0.34" />
        <circle cx="290" cy="700" r="4" fill="var(--semantic-mint)" fillOpacity="0.28" />
        <circle cx="1150" cy="690" r="5" fill="var(--accent-secondary)" fillOpacity="0.28" />
        <path
          d="M1040 170H1052M1046 164V176"
          stroke="var(--accent-primary)"
          strokeOpacity="0.24"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M360 755H372M366 749V761"
          stroke="var(--accent-primary)"
          strokeOpacity="0.2"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* Top-right segmented theme toggle */}
      <div className="fixed right-4 top-4 z-20 sm:right-6 sm:top-6">
        <div
          role="group"
          aria-label="Color theme"
          className="inline-flex items-center rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-0.5 shadow-[var(--shadow-clay-sm)]"
        >
          <button
            type="button"
            onClick={() => setTheme('light')}
            aria-label="Light mode"
            aria-pressed={theme === 'light'}
            className={cn(
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded-[11px] transition-all',
              theme === 'light'
                ? 'bg-[var(--bg-surface)] text-[var(--accent-primary)] shadow-[var(--shadow-clay-sm)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            <Sun className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            aria-label="Dark mode"
            aria-pressed={theme === 'dark'}
            className={cn(
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded-[11px] transition-all',
              theme === 'dark'
                ? 'bg-[var(--bg-surface)] text-[var(--accent-secondary)] shadow-[var(--shadow-clay-sm)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            <Moon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <main className="relative z-10 w-full max-w-[440px]">
        <ClayCard padding="lg" className="w-full">
          <div className="flex flex-col items-center text-center">
            <Logo variant="full" size="md" />
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-[var(--text-primary)] text-balance">
              {heading}
            </h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{subheading}</p>
          </div>

          <div className="mt-7">{children}</div>
        </ClayCard>
      </main>
    </div>
  );
}
