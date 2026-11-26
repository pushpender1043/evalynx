import { AppShell } from '../components/layout/AppShell';
import { TestSubmissionsView } from '../features/tests/results/TestSubmissionsView';

export function TestSubmissionsPage() {
  return (
    <AppShell>
      <TestSubmissionsView />
    </AppShell>
  );
}
