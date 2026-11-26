import { AppShell } from '../components/layout/AppShell';
import { StudentAnalyticsView } from '../features/analytics/StudentAnalyticsView';

export function StudentAnalyticsPage() {
  return (
    <AppShell>
      <StudentAnalyticsView />
    </AppShell>
  );
}
