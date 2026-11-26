import { useEffect, useState, type FormEvent } from 'react';
import { LogOut, Save, AlertCircle } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import {
  Avatar,
  ClayBadge,
  ClayButton,
  ClayCard,
  ClayInput,
  Toggle,
} from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useUIStore } from '../store/uiStore';
import { validateFullName } from '../lib/validators';
import { mapFirebaseError } from '../lib/firebaseErrors';
import { triggerDemoWriteGuard } from '../features/demo';

export function SettingsShellPage() {
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore((s) => s.isDemo);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const pushToast = useUIStore((s) => s.pushToast);

  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setDepartment(user?.department || '');
  }, [user?.name, user?.department]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (triggerDemoWriteGuard('edit profile settings')) return;
    const check = validateFullName(name);
    if (!check.valid) {
      setNameError(check.error);
      return;
    }
    setNameError(undefined);
    setSaveError(null);
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        department: department.trim(),
      });
      pushToast({
        title: 'Profile updated',
        description: 'Your changes have been saved to Firestore.',
        tone: 'success',
      });
    } catch (err) {
      setSaveError(mapFirebaseError(err, 'Unable to save profile changes. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Settings
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage your profile, appearance, and account session.
          </p>
        </div>

        {/* Profile Form Card */}
        <ClayCard>
          <div className="flex flex-wrap items-center gap-4 pb-5">
            <Avatar
              name={user?.name || 'Evalynx'}
              src={user?.photoURL || user?.avatarUrl}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-[var(--text-primary)]">
                  {user?.name}
                </h2>
                {user?.role && (
                  <ClayBadge tone="purple" className="capitalize">
                    {user.role}
                  </ClayBadge>
                )}
              </div>
              <p className="truncate text-xs text-[var(--text-secondary)]">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4" noValidate>
            {saveError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-xs font-medium text-[var(--semantic-coral-text)] shadow-[var(--shadow-clay-sm)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{saveError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ClayInput
                label="Full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(undefined);
                }}
                placeholder="Your full name"
                error={nameError}
              />
              <ClayInput
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science"
              />
            </div>

            <div className="flex justify-end pt-2">
              <ClayButton
                type="submit"
                variant="primary"
                size="sm"
                loading={saving}
                leftIcon={<Save className="h-4 w-4" aria-hidden="true" />}
              >
                Save changes
              </ClayButton>
            </div>
          </form>
        </ClayCard>

        {/* Appearance Card */}
        <ClayCard>
          <h2 className="text-base font-bold text-[var(--text-primary)]">Appearance</h2>
          <div className="mt-4">
            <Toggle
              checked={theme === 'dark'}
              onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              label="Dark mode"
              description="Switch between soft lavender light mode and deep indigo dark mode."
            />
          </div>
        </ClayCard>

        {/* Session Card */}
        <ClayCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {isDemo ? 'Demo session' : 'Session'}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {isDemo
                ? 'Exit the read-only preview and return to the sign-in screen.'
                : 'Sign out from this browser and clear your local workspace state.'}
            </p>
          </div>
          <ClayButton
            variant="danger"
            size="sm"
            leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
            onClick={() => void logout()}
            className="self-start sm:self-auto"
          >
            {isDemo ? 'Exit demo' : 'Sign out'}
          </ClayButton>
        </ClayCard>
      </div>
    </AppShell>
  );
}
