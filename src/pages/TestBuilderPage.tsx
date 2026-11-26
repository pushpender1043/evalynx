import { AppShell } from '../components/layout/AppShell';
import { TestBuilderView } from '../features/tests/builder/TestBuilderView';

export function TestBuilderPage() {
  return (
    <AppShell>
      <TestBuilderView />
    </AppShell>
  );
}
