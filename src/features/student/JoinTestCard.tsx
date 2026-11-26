import { useState, type FormEvent } from 'react';
import { KeyRound, ArrowRight } from 'lucide-react';
import { normalizeTestCode, validateTestJoinCode } from '../../lib/validators';
import { mapFirebaseError } from '../../lib/firebaseErrors';
import { testService } from '../../services/testService';
import type { TestItem } from '../../types';
import { ClayButton, ClayCard, ClayInput } from '../../components/ui';

interface JoinTestCardProps {
  onTestMatched: (test: TestItem) => void;
}

export function JoinTestCard({ onTestMatched }: JoinTestCardProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    const check = validateTestJoinCode(code);
    if (!check.valid) {
      setError(check.error);
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      const normalized = normalizeTestCode(code);
      const match = await testService.findTestByCode(normalized);
      if (!match) {
        setError(`No assessment found for code "${normalized}". Double-check with your professor.`);
        return;
      }
      onTestMatched(match);
    } catch (err) {
      setError(mapFirebaseError(err, 'Unable to look up that test code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClayCard className="flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
            Join with code
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Enter the 6-character code shared by your professor
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--tile-lavender)] text-[var(--accent-primary)]">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      <form
        onSubmit={handleJoin}
        className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-start"
        noValidate
      >
        <div className="flex-1">
          <ClayInput
            id="join-code-input"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError(undefined);
            }}
            placeholder="e.g. KX7M2P"
            aria-label="Test join code"
            error={error}
            className="font-mono-tabular uppercase tracking-wider"
          />
        </div>
        <ClayButton
          type="submit"
          variant="navy"
          loading={loading}
          rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          className="sm:w-auto"
        >
          Join
        </ClayButton>
      </form>
    </ClayCard>
  );
}
