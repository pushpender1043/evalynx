import { AppShell } from '../components/layout/AppShell';
import { SubmissionGradingView } from '../features/tests/results/SubmissionGradingView';

export function SubmissionGradingPage() {
  return (
    <AppShell>
      <SubmissionGradingView />
    </AppShell>
  );
}
