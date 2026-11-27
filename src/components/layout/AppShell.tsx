import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { DemoBanner, DemoWriteGuardModal, triggerDemoWriteGuard } from '../../features/demo';
import { ShellLayout } from './ShellLayout';
import { SidebarTab } from './SidebarTab';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { NotificationDrawer } from './NotificationDrawer';
import { ToastContainer } from '../ui';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const user = useAuthStore((s) => s.user);
  const loadWorkspaceData = useUIStore((s) => s.loadWorkspaceData);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      void loadWorkspaceData(user);
    }
  }, [user, loadWorkspaceData]);

  const handlePrimaryAction = () => {
    if (user?.role === 'professor') {
      if (triggerDemoWriteGuard('create a test')) return;
      navigate('/professor/tests/new');
    } else {
      navigate('/student/dashboard');
      window.setTimeout(() => {
        document.getElementById('join-code-input')?.focus();
      }, 120);
    }
  };

  return (
    <>
      <ShellLayout sidebar={<SidebarTab />}>
        <Topbar onPrimaryAction={handlePrimaryAction} />

        <div className="flex flex-1 flex-col gap-5 px-4 pb-24 pt-5 sm:px-6 md:pb-8 lg:px-8">
          <DemoBanner />

          <main key={location.pathname} className="evx-fade-up flex-1">
            {children}
          </main>
        </div>
      </ShellLayout>

      <BottomNav />
      <NotificationDrawer />
      <DemoWriteGuardModal />
      <ToastContainer />
    </>
  );
}
