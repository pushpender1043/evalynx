import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Search,
  Sun,
  Moon,
  Bell,
  Settings,
  Plus,
  KeyRound,
  LogOut,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';
import { PROFESSOR_NAV_TABS, STUDENT_NAV_TABS } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useUIStore } from '../../store/uiStore';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { Avatar, ClayButton, Logo } from '../ui';
import { cn } from '../../lib/utils';

interface TopbarProps {
  onPrimaryAction: () => void;
}

/**
 * Light, flat top bar sitting directly inside the Layer 2 shell panel.
 * Features: Evalynx logo mark (36px), text tabs with purple 2px rounded underline active state,
 * subtle 1px-bordered search/command input with Ctrl K hint, segmented Light/Dark toggle,
 * bell + settings icons, dark navy primary CTA, and account dropdown.
 */
export function Topbar({ onPrimaryAction }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore((s) => s.isDemo);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const notifications = useUIStore((s) => s.notifications);
  const notificationsOpen = useUIStore((s) => s.notificationsOpen);
  const setNotificationsOpen = useUIStore((s) => s.setNotificationsOpen);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const isProfessor = user?.role === 'professor';
  const navTabs = isProfessor ? PROFESSOR_NAV_TABS : STUDENT_NAV_TABS;
  const unreadCount = notifications.filter((n) => !n.read).length;

  useKeyboardShortcut('k', () => {
    searchInputRef.current?.focus();
  });

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)]/75 bg-[var(--bg-panel)]/95 px-4 py-3.5 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 lg:flex-nowrap">
        {/* Left: Small 36px logo mark + underline text tabs */}
        <div className="flex min-w-0 items-center gap-5">
          <button
            type="button"
            onClick={() => navigate(isProfessor ? '/professor/dashboard' : '/student/dashboard')}
            aria-label="Go to Evalynx dashboard"
            className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
          >
            <Logo variant="icon" size="sm" />
            <span className="text-base font-extrabold tracking-tight text-[var(--text-primary)] lg:hidden">
              Evalynx
            </span>
          </button>

          <nav aria-label="Workspace sections" className="hidden items-center gap-6 lg:flex">
            {navTabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.id === 'dashboard'}
                className={({ isActive }) =>
                  cn(
                    'relative py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-md',
                    isActive
                      ? 'text-[var(--text-primary)] after:absolute after:inset-x-0 after:-bottom-[1px] after:h-[2.5px] after:rounded-full after:bg-[var(--accent-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Center: Clean 1px lavender-bordered search / command input */}
        <div className="order-3 w-full md:order-2 md:max-w-xs md:flex-1 lg:max-w-sm">
          <div className="clay-inset relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3.5 h-4 w-4 text-[var(--text-muted)]"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tests or type a command"
              aria-label="Search tests or type a command"
              className="h-10 w-full rounded-[16px] bg-transparent pl-10 pr-16 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none sm:text-sm"
            />
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-tinted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] sm:inline-block"
            >
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Right: Segmented Light/Dark toggle, Bell, Settings, Dark Navy Primary CTA, Profile */}
        <div className="order-2 flex shrink-0 items-center gap-2 sm:gap-2.5 md:order-3">
          {/* Segmented Light / Dark Toggle */}
          <div
            role="group"
            aria-label="Color theme"
            className="inline-flex items-center rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface-tinted)] p-0.5"
          >
            <button
              type="button"
              onClick={() => setTheme('light')}
              aria-label="Light mode"
              aria-pressed={theme === 'light'}
              className={cn(
                'flex h-8 w-8 cursor-pointer items-center justify-center rounded-[11px] transition-all duration-150',
                theme === 'light'
                  ? 'bg-[var(--bg-surface)] text-[var(--accent-primary)] shadow-[var(--shadow-clay-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <Sun className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              aria-label="Dark mode"
              aria-pressed={theme === 'dark'}
              className={cn(
                'flex h-8 w-8 cursor-pointer items-center justify-center rounded-[11px] transition-all duration-150',
                theme === 'dark'
                  ? 'bg-[var(--bg-surface)] text-[var(--accent-secondary)] shadow-[var(--shadow-clay-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <Moon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          {/* Notification bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label={`Open notifications (${unreadCount} unread)`}
              aria-expanded={notificationsOpen}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[14px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-tinted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
            </button>
            {unreadCount > 0 && (
              <span className="pointer-events-none absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--semantic-mint)] px-1 text-[9px] font-bold text-[#14123A] tabular-nums">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Settings shortcut icon */}
          <button
            type="button"
            onClick={() => navigate(isProfessor ? '/professor/settings' : '/student/settings')}
            aria-label="Workspace settings"
            className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-[14px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-tinted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] sm:flex"
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
          </button>

          {/* Single Dark Navy Primary CTA */}
          <ClayButton
            variant="navy"
            size="sm"
            onClick={onPrimaryAction}
            leftIcon={
              isProfessor ? (
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              )
            }
            className="px-3.5 sm:px-4"
          >
            {isProfessor ? 'Create test' : 'Join test'}
          </ClayButton>

          {/* Profile Avatar & Dropdown */}
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                aria-label="Open account menu"
                aria-expanded={profileMenuOpen}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-1 pr-2 transition-colors hover:bg-[var(--bg-surface-tinted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              >
                <Avatar name={user.name} src={user.photoURL} size="sm" />
                <ChevronDown
                  className="hidden h-3.5 w-3.5 text-[var(--text-muted)] sm:block"
                  aria-hidden="true"
                />
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  className="clay-card absolute right-0 z-50 mt-2.5 w-60 p-2.5"
                >
                  <div className="rounded-[16px] bg-[var(--bg-surface-tinted)] px-3.5 py-3">
                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">{user.name}</p>
                    <p className="truncate text-xs text-[var(--text-secondary)]">{user.email}</p>
                    <p className="mt-1 text-[11px] font-semibold capitalize text-[var(--accent-primary)]">
                      {user.role}
                    </p>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate(isProfessor ? '/professor/settings' : '/student/settings');
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-[12px] px-3 py-2 text-left text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface-tinted)]"
                    >
                      <UserIcon className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
                      <span>Profile & Settings</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        void logout();
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-[12px] px-3 py-2 text-left text-xs font-semibold text-[var(--semantic-coral-text)] transition-colors hover:bg-[var(--semantic-coral-soft)]"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      <span>{isDemo ? 'Exit demo' : 'Sign out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
