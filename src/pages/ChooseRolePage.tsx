import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, UserCheck } from 'lucide-react';
import { AuthLayout } from '../features/auth/AuthLayout';
import { AuthErrorAlert } from '../features/auth/AuthErrorAlert';
import { useAuthStore } from '../store/authStore';
import { ClayButton } from '../components/ui';
import { cn } from '../lib/utils';

function getSafeRedirect(state: unknown, fallback: string): string {
  const from =
    state && typeof state === 'object' && 'from' in state
      ? (state as { from?: unknown }).from
      : undefined;
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    return from;
  }
  return fallback;
}

export function ChooseRolePage() {
  const user = useAuthStore((s) => s.user);
  const pendingOAuthUser = useAuthStore((s) => s.pendingOAuthUser);
  const initialized = useAuthStore((s) => s.initialized);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const errorCode = useAuthStore((s) => s.errorCode);
  const completeRoleSelection = useAuthStore((s) => s.completeRoleSelection);
  const logout = useAuthStore((s) => s.logout);

  const [role, setRole] = useState<'professor' | 'student'>('professor');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!initialized) return;
    if (user) {
      const fallback = user.role === 'professor' ? '/professor/dashboard' : '/student/dashboard';
      navigate(getSafeRedirect(location.state, fallback), { replace: true });
      return;
    }
    if (!pendingOAuthUser) {
      navigate('/login', { state: location.state, replace: true });
    }
  }, [initialized, user, pendingOAuthUser, navigate, location.state]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const profile = await completeRoleSelection(role);
      const fallback = profile.role === 'professor' ? '/professor/dashboard' : '/student/dashboard';
      navigate(getSafeRedirect(location.state, fallback), { replace: true });
    } catch {
      // Friendly error surfaced in store
    }
  };

  return (
    <AuthLayout
      heading="Choose your role"
      subheading={
        pendingOAuthUser
          ? `Signed in as ${pendingOAuthUser.email}. Pick how you will use Evalynx.`
          : 'Pick how you will use Evalynx.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthErrorAlert error={error} errorCode={errorCode} />

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole('professor')}
            aria-pressed={role === 'professor'}
            className={cn(
              'flex cursor-pointer flex-col items-start rounded-[22px] p-5 text-left transition-all duration-150',
              role === 'professor'
                ? 'clay-inset bg-[var(--accent-soft)] ring-2 ring-[var(--accent-primary)]/40'
                : 'clay-surface-sm'
            )}
          >
            <UserCheck
              className={cn(
                'h-6 w-6',
                role === 'professor' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'
              )}
              aria-hidden="true"
            />
            <span className="mt-3 text-sm font-bold text-[var(--text-primary)]">Professor</span>
            <span className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Create tests & evaluate students
            </span>
          </button>

          <button
            type="button"
            onClick={() => setRole('student')}
            aria-pressed={role === 'student'}
            className={cn(
              'flex cursor-pointer flex-col items-start rounded-[22px] p-5 text-left transition-all duration-150',
              role === 'student'
                ? 'clay-inset bg-[var(--accent-soft)] ring-2 ring-[var(--accent-primary)]/40'
                : 'clay-surface-sm'
            )}
          >
            <GraduationCap
              className={cn(
                'h-6 w-6',
                role === 'student' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'
              )}
              aria-hidden="true"
            />
            <span className="mt-3 text-sm font-bold text-[var(--text-primary)]">Student</span>
            <span className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Join tests & track progress
            </span>
          </button>
        </div>

        <ClayButton type="submit" variant="primary" className="w-full" loading={loading}>
          Continue as {role === 'professor' ? 'Professor' : 'Student'}
        </ClayButton>

        <div className="text-center">
          <button
            type="button"
            onClick={() => void logout().then(() => navigate('/login', { replace: true }))}
            className="cursor-pointer text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
          >
            Use a different account
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
