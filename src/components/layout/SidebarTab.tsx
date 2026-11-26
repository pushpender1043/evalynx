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

interface SidebarItem {
  id: string;
  label: string;
  path?: string;
  icon: typeof LayoutDashboard;
  badgeDot?: boolean;
  onClick?: () => void;
}

/**
 * Attached purple left-edge sidebar tab with exact S-curve concave fillets
 * merging smoothly into the Main Shell Panel's left border.
 * No logo, no logout (logout lives in the topbar profile menu).
 */
export function SidebarTab() {
  const user = useAuthStore((s) => s.user);
  const notifications = useUIStore((s) => s.notifications);
  const notificationsOpen = useUIStore((s) => s.notificationsOpen);
  const setNotificationsOpen = useUIStore((s) => s.setNotificationsOpen);
  const location = useLocation();
  const navigate = useNavigate();

  const isProfessor = user?.role === 'professor';
  const base = isProfessor ? '/professor' : '/student';
  const unreadCount = notifications.filter((n) => !n.read).length;

  const items: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: `${base}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      id: 'tests',
      label: 'Tests',
      path: `${base}/tests`,
      icon: FileText,
    },
    {
      id: 'analytics',
      label: isProfessor ? 'Analytics' : 'Results',
      path: `${base}/analytics`,
      icon: BarChart3,
    },
    {
      id: 'notifications',
      label: unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications',
      icon: Bell,
      badgeDot: unreadCount > 0,
      onClick: () => setNotificationsOpen(!notificationsOpen),
    },
    {
      id: 'settings',
      label: 'Settings',
      path: `${base}/settings`,
      icon: Settings,
    },
  ];

  // Exact SVG geometry: 84px width, 62px S-curve concave fillets top & bottom
  const itemSize = 44;
  const gap = 16;
  const innerPaddingY = 24;
  const fillet = 62;
  const innerHeight = items.length * itemSize + (items.length - 1) * gap + innerPaddingY * 2;
  const totalHeight = innerHeight + fillet * 2;
  const w = 84;

  // S-curve path with exact vertical tangents at x=0 (merges flush into left wall) and x=84 (merges into straight tab)
  const curvePath = [
    `M -2 0`,
    `L 0 0`,
    `C 0 38, ${w} 24, ${w} ${fillet + 10}`,
    `L ${w} ${totalHeight - fillet - 10}`,
    `C ${w} ${totalHeight - 24}, 0 ${totalHeight - 38}, 0 ${totalHeight}`,
    `L -2 ${totalHeight}`,
    `Z`,
  ].join(' ');

  const isItemActive = (item: SidebarItem) => {
    if (item.id === 'notifications') return notificationsOpen;
    if (!item.path) return false;
    if (item.id === 'dashboard') {
      return location.pathname === item.path;
    }
    return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
  };

  return (
    <aside
      aria-label="Primary navigation"
      data-testid="attached-sidebar-tab"
      className="relative flex w-[84px] shrink-0 select-none flex-col items-center justify-center"
      style={{ height: totalHeight }}
    >
      {/* Inline SVG S-curve purple silhouette flush to the panel's left border */}
      <svg
        width={w}
        height={totalHeight}
        viewBox={`0 0 ${w} ${totalHeight}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="evx-sidebar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7A6CF0" />
            <stop offset="100%" stopColor="#6C5CE7" />
          </linearGradient>
        </defs>
        <path d={curvePath} fill="url(#evx-sidebar-grad)" />
        {/* Very subtle inner vertical highlight along right edge */}
        <path
          d={`M ${w - 1} ${fillet + 16} L ${w - 1} ${totalHeight - fillet - 16}`}
          stroke="rgba(255, 255, 255, 0.16)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>

      {/* Navigation icons */}
      <nav
        aria-label="Workspace menu"
        className="relative z-10 flex flex-col items-center gap-4"
        style={{ paddingTop: fillet + innerPaddingY, paddingBottom: fillet + innerPaddingY }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);

          return (
            <div key={item.id} className="group relative flex items-center justify-center">
              <button
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
                aria-expanded={item.id === 'notifications' ? notificationsOpen : undefined}
                className={cn(
                  'relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-[16px] transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#6C5CE7]',
                  active
                    ? 'bg-white text-[#6C5CE7] shadow-[0_8px_18px_rgba(20,18,58,0.18)]'
                    : 'text-white/75 hover:bg-white/[0.13] hover:text-white'
                )}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={1.6} aria-hidden="true" />
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

              {/* Hover & keyboard focus tooltip */}
              <span
                role="tooltip"
                className={cn(
                  'pointer-events-none absolute left-[calc(100%+14px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-xl bg-[#14123A] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(20,18,58,0.22)]',
                  'opacity-0 translate-x-1 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100'
                )}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
