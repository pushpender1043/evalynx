import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../features/auth/AuthLayout';
import { SignupForm } from '../features/auth/SignupForm';
import { useAuthStore } from '../store/authStore';
import { Loader } from '../components/ui';

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

export function SignupPage() {
  const user = useAuthStore((s) => s.user);
  const pendingOAuthUser = useAuthStore((s) => s.pendingOAuthUser);
  const initialized = useAuthStore((s) => s.initialized);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!initialized) return;
    if (user) {
      const fallback = user.role === 'professor' ? '/professor/dashboard' : '/student/dashboard';
      navigate(getSafeRedirect(location.state, fallback), { replace: true });
    } else if (pendingOAuthUser) {
      navigate('/choose-role', { state: location.state, replace: true });
    }
  }, [initialized, user, pendingOAuthUser, navigate, location.state]);

  if (!initialized || user) {
    return <Loader fullscreen />;
  }

  return (
    <AuthLayout
      heading="Create your account"
      subheading="Get started with Evalynx in seconds."
    >
      <SignupForm />
    </AuthLayout>
  );
}
