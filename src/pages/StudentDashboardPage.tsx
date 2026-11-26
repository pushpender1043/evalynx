import { AppShell } from '../components/layout/AppShell';
import { StudentDashboardView } from '../features/student/StudentDashboardView';

export function StudentDashboardPage() {
  return (
    <AppShell>
      <StudentDashboardView />
    </AppShell>
  );
}
