import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ClayButton, Modal } from '../../components/ui';
import { useDemoStore } from './demoStore';

export function DemoWriteGuardModal() {
  const open = useDemoStore((s) => s.writeGuardOpen);
  const closeWriteGuard = useDemoStore((s) => s.closeWriteGuard);
  const exitDemoMode = useAuthStore((s) => s.exitDemoMode);
  const navigate = useNavigate();

  const handleCreateAccount = () => {
    closeWriteGuard();
    exitDemoMode();
    navigate('/signup', { replace: true });
  };

  return (
    <Modal
      open={open}
      onClose={closeWriteGuard}
      title="Demo mode is read-only"
      description="This is a demo. Create a free account to do this."
    >
      <div className="space-y-5">
        <div className="clay-inset flex items-start gap-3 rounded-[20px] p-4">
          <div className="clay-surface-sm flex h-10 w-10 shrink-0 items-center justify-center text-[var(--accent-primary)]">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            You can browse every dashboard, inspect tests, open submissions, and preview results.
            Sign up for a free Evalynx account to create assessments, save grades, or attempt live
            tests.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2.5">
          <ClayButton variant="secondary" size="sm" onClick={closeWriteGuard}>
            Continue exploring
          </ClayButton>
          <ClayButton
            variant="primary"
            size="sm"
            leftIcon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={handleCreateAccount}
          >
            Create free account
          </ClayButton>
        </div>
      </div>
    </Modal>
  );
}
