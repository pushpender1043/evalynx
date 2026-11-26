import { useNavigate } from 'react-router-dom';
import { Eye, LogOut, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ClayButton } from '../../components/ui';
import { useDemoStore } from './demoStore';

export function DemoBanner() {
  const demoRole = useDemoStore((s) => s.demoRole);
  const exitDemoMode = useAuthStore((s) => s.exitDemoMode);
  const navigate = useNavigate();

  if (!demoRole) return null;

  const handleCreateAccount = () => {
    exitDemoMode();
    navigate('/signup', { replace: true });
  };

  const handleExit = () => {
    exitDemoMode();
    navigate('/login', { replace: true });
  };

  return (
    <div
      role="region"
      aria-label="Demo mode notice"
      data-testid="demo-mode-banner"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-surface-tinted)] px-4 py-3 sm:px-5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--bg-surface)] text-[var(--accent-primary)] shadow-[var(--shadow-clay-sm)]">
          <Eye className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--text-primary)] sm:text-sm">
            You are viewing a demo. Changes are not saved.
          </p>
          <p className="text-[11px] font-medium text-[var(--text-muted)]">
            Read-only {demoRole === 'professor' ? 'Professor' : 'Student'} preview · Sample data only
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <ClayButton
          variant="navy"
          size="sm"
          leftIcon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={handleCreateAccount}
        >
          Create free account
        </ClayButton>
        <ClayButton
          variant="secondary"
          size="sm"
          leftIcon={<LogOut className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={handleExit}
        >
          Exit demo
        </ClayButton>
      </div>
    </div>
  );
}
