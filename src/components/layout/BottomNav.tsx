import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Bell,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../lib/utils';

/**
 * Mobile (<768px) floating bottom navigation bar:
 * Purple rounded-24px pill, max 5 icons, active item = white rounded square with purple icon.
 */
export function BottomNav() {
  const user = useAuthStore((s) => s.user);
  const notifications = useUIStore((s) => s.notifications);
  const notificationsOpen = useUIStore((s) => s.notificationsOpen);
  const setNotificationsOpen = useUIStore((s) => s.setNotificationsOpen);
  const location = useLocation();
  const navigate = useNavigate();

  const isProfessor = user?.role === 'professor';
  const base = isProfessor ? '/professor' : '/student';
  const unreadCount = notifications.filter((n) => !n.read).length;

  const items = [
    { id: 'dashboard', label: 'Dashboard', path: `${base}/dashboard`, icon: LayoutDashboard },
    { id: 'tests', label: 'Tests', path: `${base}/tests`, icon: FileText },
    { id: 'analytics', label: isProfessor ? 'Analytics' : 'Results', path: `${base}/analytics`, icon: BarChart3 },
    {
      id: 'notifications',
      label: 'Alerts',
      icon: Bell,
      badgeDot: unreadCount > 0,
      onClick: () => setNotificationsOpen(!notificationsOpen),
    },
    { id: 'settings', label: 'Settings', path: `${base}/settings`, icon: Settings },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      data-testid="mobile-bottom-nav"
      className="fixed inset-x-4 bottom-3 z-40 mx-auto flex max-w-md items-center justify-around rounded-[24px] bg-gradient-to-r from-[#6C5CE7] to-[#7A6CF0] px-3 py-2 shadow-[0_14px_34px_rgba(108,92,231,0.34)] md:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.id === 'notifications'
            ? notificationsOpen
            : item.path
              ? item.id === 'dashboard'
                ? location.pathname === item.path
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
              : false;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.onClick) {
                item.onClick();
              } else if (item.path) {
                navigate(item.path);
              }
            }}
            aria-label={item.label}
            aria-current={active && item.path ? 'page' : undefined}
            className={cn(
              'relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-[14px] transition-all duration-150',
              active
                ? 'bg-white text-[#6C5CE7] shadow-[0_6px_14px_rgba(20,18,58,0.18)]'
                : 'text-white/75 hover:bg-white/15 hover:text-white'
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.65} aria-hidden="true" />
            {item.badgeDot && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#5CC9A7] ring-2',
                  active ? 'ring-white' : 'ring-[#6C5CE7]'
                )}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
