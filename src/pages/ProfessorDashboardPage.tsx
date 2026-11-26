import { AppShell } from '../components/layout/AppShell';
import { ProfessorDashboardView } from '../features/professor/ProfessorDashboardView';

export function ProfessorDashboardPage() {
  return (
    <AppShell>
      <ProfessorDashboardView />
    </AppShell>
  );
}
