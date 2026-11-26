import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  Compass,
  UserCheck,
  GraduationCap,
} from 'lucide-react';
import { validateEmail, validatePassword } from '../../lib/validators';
import { isRunningInIframe } from '../../lib/firebaseErrors';
import { useAuthStore } from '../../store/authStore';
import { ClayButton, ClayInput, Modal } from '../../components/ui';
import { AuthErrorAlert } from './AuthErrorAlert';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export function LoginForm() {
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const enterDemoMode = useAuthStore((s) => s.enterDemoMode);
  const loading = useAuthStore((s) => s.loading);
  const authError = useAuthStore((s) => s.error);
  const authErrorCode = useAuthStore((s) => s.errorCode);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [forgotOpen, setForgotOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [enteringDemo, setEnteringDemo] = useState<'professor' | 'student' | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const inIframe = isRunningInIframe();

  const resolveDestination = (role: string) => {
    const from =
      location.state && typeof location.state === 'object' && 'from' in location.state
        ? (location.state as { from?: unknown }).from
        : undefined;
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
      return from;
    }
    return role === 'professor' ? '/professor/dashboard' : '/student/dashboard';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    const emailCheck = validateEmail(email);
    const passCheck = validatePassword(password);
    if (!emailCheck.valid || !passCheck.valid) {
      setFieldErrors({ email: emailCheck.error, password: passCheck.error });
      return;
    }
    setFieldErrors({});
    try {
      const profile = await login({ email, password });
      if (profile) {
        navigate(resolveDestination(profile.role), { replace: true });
      } else {
        navigate('/choose-role', { state: location.state, replace: true });
      }
    } catch {
      // Friendly error displayed via AuthErrorAlert
    }
  };

  const handleGoogle = async () => {
    clearError();
    try {
      const result = await loginWithGoogle();
      if (result.redirected) return;
      if (result.needsRole) {
        navigate('/choose-role', { state: location.state, replace: true });
      } else if (result.user) {
        navigate(resolveDestination(result.user.role), { replace: true });
      }
    } catch {
      // Friendly error displayed via AuthErrorAlert; email form remains unaffected
    }
  };

  const handleSelectDemo = async (role: 'professor' | 'student') => {
    setEnteringDemo(role);
    try {
      await enterDemoMode(role);
      setDemoModalOpen(false);
      navigate(role === 'professor' ? '/professor/dashboard' : '/student/dashboard', {
        replace: true,
      });
    } finally {
      setEnteringDemo(null);
    }
  };

  return (
    <div className="space-y-5">
      <AuthErrorAlert error={authError} errorCode={authErrorCode} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <ClayInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
          }}
          placeholder="name@example.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={fieldErrors.email}
          autoComplete="email"
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-[var(--text-primary)]"
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="cursor-pointer text-xs font-semibold text-[var(--accent-primary)] hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <ClayInput
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            placeholder="Enter your password"
            leftIcon={<Lock className="h-4 w-4" />}
            error={fieldErrors.password}
            autoComplete="current-password"
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="cursor-pointer rounded-xl p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
        </div>

        <ClayButton type="submit" variant="primary" className="w-full" loading={loading}>
          Sign in
        </ClayButton>
      </form>

      <div className="flex items-center gap-3 py-0.5">
        <span className="h-px flex-1 bg-[var(--text-muted)]/20" aria-hidden="true" />
        <span className="text-xs font-medium text-[var(--text-muted)]">or</span>
        <span className="h-px flex-1 bg-[var(--text-muted)]/20" aria-hidden="true" />
      </div>

      <div className="space-y-2.5">
        <ClayButton
          variant="secondary"
          className="w-full"
          onClick={handleGoogle}
          disabled={loading}
          leftIcon={
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46c-.28 1.5-1.12 2.77-2.38 3.62v3h3.85c2.25-2.08 3.57-5.14 3.57-8.65z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.85-3c-1.07.72-2.44 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.97H1.28v3.1C3.25 21.29 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.25 14.27A7.2 7.2 0 0 1 4.88 12c0-.79.14-1.56.37-2.27v-3.1H1.28A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.28 5.37l3.97-3.1z"
              />
              <path
                fill="#EA4335"
                d="M12 4.76c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.71 1.28 6.63l3.97 3.1c.95-2.85 3.61-4.97 6.75-4.97z"
              />
            </svg>
          }
        >
          Continue with Google
        </ClayButton>

        {inIframe && (
          <div className="clay-inset flex flex-wrap items-center justify-between gap-2 rounded-[16px] px-3.5 py-2.5 text-[11px] text-[var(--text-secondary)]">
            <span>Open the app in a new tab to use Google sign-in</span>
            <a
              href={typeof window !== 'undefined' ? window.location.href : '/login'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 font-bold text-[var(--accent-primary)] hover:underline"
            >
              <span>Open in new tab</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        )}

        <ClayButton
          variant="ghost"
          size="sm"
          className="w-full"
          disabled={loading}
          leftIcon={<Compass className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />}
          onClick={() => setDemoModalOpen(true)}
        >
          Explore demo
        </ClayButton>
      </div>

      <p className="pt-1 text-center text-xs text-[var(--text-secondary)]">
        New to Evalynx?{' '}
        <Link
          to="/signup"
          state={location.state}
          className="font-semibold text-[var(--accent-primary)] hover:underline"
        >
          Create an account
        </Link>
      </p>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} defaultEmail={email} />

      <Modal
        open={demoModalOpen}
        onClose={() => !enteringDemo && setDemoModalOpen(false)}
        title="Explore Evalynx demo"
        description="Preview the workspace with realistic sample data. Read-only — no account required."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={Boolean(enteringDemo)}
            onClick={() => void handleSelectDemo('professor')}
            className="clay-surface-sm flex cursor-pointer flex-col items-start rounded-[22px] p-5 text-left transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <div className="clay-inset flex h-10 w-10 items-center justify-center rounded-[14px] text-[var(--accent-primary)]">
              <UserCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="mt-3 text-sm font-bold text-[var(--text-primary)]">
              View as Professor
            </span>
            <span className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
              Inspect tests, analytics charts, submissions, and grading rubrics.
            </span>
          </button>

          <button
            type="button"
            disabled={Boolean(enteringDemo)}
            onClick={() => void handleSelectDemo('student')}
            className="clay-surface-sm flex cursor-pointer flex-col items-start rounded-[22px] p-5 text-left transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <div className="clay-inset flex h-10 w-10 items-center justify-center rounded-[14px] text-[var(--semantic-mint-text)]">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="mt-3 text-sm font-bold text-[var(--text-primary)]">
              View as Student
            </span>
            <span className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
              Browse upcoming tests, topic mastery, and detailed result breakdowns.
            </span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
