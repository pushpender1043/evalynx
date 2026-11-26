import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  GraduationCap,
  UserCheck,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { validateEmail, validateFullName, validatePassword } from '../../lib/validators';
import { isRunningInIframe } from '../../lib/firebaseErrors';
import { useAuthStore } from '../../store/authStore';
import { ClayButton, ClayInput } from '../../components/ui';
import { cn } from '../../lib/utils';
import { AuthErrorAlert } from './AuthErrorAlert';

export function SignupForm() {
  const signup = useAuthStore((s) => s.signup);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const loading = useAuthStore((s) => s.loading);
  const authError = useAuthStore((s) => s.error);
  const authErrorCode = useAuthStore((s) => s.errorCode);
  const clearError = useAuthStore((s) => s.clearError);

  const [role, setRole] = useState<'professor' | 'student'>('professor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const navigate = useNavigate();
  const location = useLocation();
  const inIframe = isRunningInIframe();

  const resolveDestination = (userRole: string) => {
    const from =
      location.state && typeof location.state === 'object' && 'from' in location.state
        ? (location.state as { from?: unknown }).from
        : undefined;
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
      return from;
    }
    return userRole === 'professor' ? '/professor/dashboard' : '/student/dashboard';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    const nameCheck = validateFullName(name);
    const emailCheck = validateEmail(email);
    const passCheck = validatePassword(password);

    if (!nameCheck.valid || !emailCheck.valid || !passCheck.valid) {
      setErrors({
        name: nameCheck.error,
        email: emailCheck.error,
        password: passCheck.error,
      });
      return;
    }

    setErrors({});
    try {
      const profile = await signup({ name, email, password, role });
      navigate(resolveDestination(profile.role), { replace: true });
    } catch {
      // Friendly error displayed via AuthErrorAlert
    }
  };

  const handleGoogleSignup = async () => {
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
      // Friendly error displayed via AuthErrorAlert; email signup remains unaffected
    }
  };

  return (
    <div className="space-y-5">
      <AuthErrorAlert error={authError} errorCode={authErrorCode} />

      {/* Role Selector */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-[var(--text-primary)]">
          I am signing up as
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole('professor')}
            aria-pressed={role === 'professor'}
            className={cn(
              'flex cursor-pointer flex-col items-start rounded-[20px] p-4 text-left transition-all duration-150',
              role === 'professor'
                ? 'clay-inset bg-[var(--accent-soft)] ring-2 ring-[var(--accent-primary)]/40'
                : 'clay-surface-sm'
            )}
          >
            <UserCheck
              className={cn(
                'h-5 w-5',
                role === 'professor' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'
              )}
              aria-hidden="true"
            />
            <span className="mt-2 text-sm font-bold text-[var(--text-primary)]">Professor</span>
            <span className="text-xs text-[var(--text-secondary)]">Create & grade tests</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('student')}
            aria-pressed={role === 'student'}
            className={cn(
              'flex cursor-pointer flex-col items-start rounded-[20px] p-4 text-left transition-all duration-150',
              role === 'student'
                ? 'clay-inset bg-[var(--accent-soft)] ring-2 ring-[var(--accent-primary)]/40'
                : 'clay-surface-sm'
            )}
          >
            <GraduationCap
              className={cn(
                'h-5 w-5',
                role === 'student' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'
              )}
              aria-hidden="true"
            />
            <span className="mt-2 text-sm font-bold text-[var(--text-primary)]">Student</span>
            <span className="text-xs text-[var(--text-secondary)]">Take tests & view scores</span>
          </button>
        </div>
      </fieldset>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <ClayInput
          label="Full name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
          }}
          placeholder="Your full name"
          leftIcon={<User className="h-4 w-4" />}
          error={errors.name}
          autoComplete="name"
        />

        <ClayInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
          }}
          placeholder="name@example.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email}
          autoComplete="email"
        />

        <ClayInput
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
          }}
          placeholder="At least 6 characters"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.password}
          autoComplete="new-password"
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

        <ClayButton type="submit" variant="primary" className="w-full" loading={loading}>
          Create account
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
          onClick={handleGoogleSignup}
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
              href={typeof window !== 'undefined' ? window.location.href : '/signup'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 font-bold text-[var(--accent-primary)] hover:underline"
            >
              <span>Open in new tab</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>

      <p className="pt-1 text-center text-xs text-[var(--text-secondary)]">
        Already have an account?{' '}
        <Link
          to="/login"
          state={location.state}
          className="font-semibold text-[var(--accent-primary)] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
