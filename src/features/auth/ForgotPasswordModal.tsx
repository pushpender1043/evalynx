import { useEffect, useState, type FormEvent } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';
import { validateEmail } from '../../lib/validators';
import { authService } from '../../services/authService';
import { ClayButton, ClayInput, Modal } from '../../components/ui';

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export function ForgotPasswordModal({
  open,
  onClose,
  defaultEmail = '',
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (open && defaultEmail) {
      setEmail(defaultEmail);
    }
  }, [open, defaultEmail]);

  const handleClose = () => {
    setSent(false);
    setError(undefined);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const check = validateEmail(email);
    if (!check.valid) {
      setError(check.error);
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await authService.sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Reset password"
      description="Enter your email address and we will send a password reset link."
    >
      {sent ? (
        <div className="space-y-5 py-2 text-center">
          <div className="clay-inset mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-[var(--semantic-mint-soft)] text-[var(--semantic-mint-text)]">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Reset link sent</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Check <span className="font-semibold text-[var(--text-primary)]">{email}</span> for
              recovery instructions.
            </p>
          </div>
          <ClayButton variant="primary" className="w-full" onClick={handleClose}>
            Back to Sign in
          </ClayButton>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <ClayInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(undefined);
            }}
            placeholder="name@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={error}
            autoComplete="email"
          />
          <div className="flex justify-end gap-3 pt-2">
            <ClayButton variant="secondary" onClick={handleClose}>
              Cancel
            </ClayButton>
            <ClayButton type="submit" variant="primary" loading={submitting}>
              Send reset link
            </ClayButton>
          </div>
        </form>
      )}
    </Modal>
  );
}
