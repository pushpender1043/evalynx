import { AppShell } from '../components/layout/AppShell';
import { StudentResultView } from '../features/tests/results/StudentResultView';

export function StudentResultPage() {
  return (
    <AppShell>
      <StudentResultView />
    </AppShell>
  );
}
