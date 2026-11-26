import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  Check,
  Copy,
  Edit3,
  Link as LinkIcon,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { EmptyTestsIllustration } from '../../../components/illustrations';
import type { TestCategory, TestItem, TestStatus } from '../../../types';
import { computeEffectiveTestStatus } from '../../../lib/grading';
import { mapFirebaseError } from '../../../lib/firebaseErrors';
import { cn, formatDateTime } from '../../../lib/utils';
import { testService } from '../../../services/testService';
import { triggerDemoWriteGuard } from '../../demo';
import { useAuthStore } from '../../../store/authStore';
import { useUIStore } from '../../../store/uiStore';
import {
  ClayBadge,
  ClayButton,
  ClayCard,
  EmptyState,
  Modal,
  Skeleton,
} from '../../../components/ui';

type FilterTab = 'all' | TestStatus;

const STATUS_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'live', label: 'Live' },
  { id: 'completed', label: 'Completed' },
];

const CATEGORIES: Array<'all' | TestCategory> = [
  'all',
  'DSA',
  'Aptitude',
  'Core CS',
  'Mathematics',
  'Coding',
];

export function ProfessorTestsView() {
  const user = useAuthStore((s) => s.user);
  const tests = useUIStore((s) => s.tests);
  const testsLoaded = useUIStore((s) => s.testsLoaded);
  const workspaceError = useUIStore((s) => s.workspaceError);
  const globalSearch = useUIStore((s) => s.searchQuery);
  const loadWorkspaceData = useUIStore((s) => s.loadWorkspaceData);
  const pushToast = useUIStore((s) => s.pushToast);

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TestCategory>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TestItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const enrichedTests = useMemo(
    () =>
      tests.map((t) => ({
        ...t,
        status: computeEffectiveTestStatus(t),
      })),
    [tests]
  );

  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      all: enrichedTests.length,
      draft: 0,
      scheduled: 0,
      live: 0,
      completed: 0,
    };
    enrichedTests.forEach((t) => {
      counts[t.status] += 1;
    });
    return counts;
  }, [enrichedTests]);

  const filteredTests = useMemo(() => {
    const q = (localSearch || globalSearch).trim().toLowerCase();
    return enrichedTests.filter((t) => {
      if (activeTab !== 'all' && t.status !== activeTab) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [enrichedTests, activeTab, categoryFilter, localSearch, globalSearch]);

  const handleCopy = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      pushToast({ title: `${label} copied`, description: text, tone: 'success' });
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      pushToast({ title: 'Copy failed', description: 'Copy manually from the card.', tone: 'warning' });
    }
  };

  const handleDuplicate = async (item: TestItem) => {
    if (triggerDemoWriteGuard('duplicate a test')) return;
    if (!user) return;
    setDuplicatingId(item.id);
    try {
      const cloned = await testService.duplicateTest(item.id, user);
      await loadWorkspaceData(user);
      pushToast({
        title: 'Test duplicated',
        description: `"${cloned.title}" saved as a draft.`,
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Could not duplicate test',
        description: mapFirebaseError(err),
        tone: 'danger',
      });
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !user) return;
    setDeleting(true);
    try {
      await testService.deleteTest(deleteTarget.id);
      await loadWorkspaceData(user);
      pushToast({
        title: 'Test deleted',
        description: `"${deleteTarget.title}" was removed from Firestore.`,
        tone: 'success',
      });
      setDeleteTarget(null);
    } catch (err) {
      pushToast({
        title: 'Delete failed',
        description: mapFirebaseError(err),
        tone: 'danger',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Tests
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Create, schedule, duplicate, and evaluate your assessments.
          </p>
        </div>

        <ClayButton
          variant="navy"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            if (triggerDemoWriteGuard('create a test')) return;
            navigate('/professor/tests/new');
          }}
          className="self-start sm:self-auto"
        >
          Create test
        </ClayButton>
      </div>

      {workspaceError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-xs font-medium text-[var(--semantic-coral-text)] shadow-[var(--shadow-clay-sm)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{workspaceError}</span>
        </div>
      )}

      {/* Filter Bar: Status Tabs + Search + Category */}
      <ClayCard className="space-y-4">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Test status">
          {STATUS_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all tabular-nums',
                  active
                    ? 'clay-btn-primary text-white'
                    : 'clay-surface-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                {tab.label} ({tabCounts[tab.id]})
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="clay-inset relative flex flex-1 items-center md:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Filter by title, subject, or join code..."
              aria-label="Filter tests"
              className="h-10 w-full rounded-[18px] bg-transparent pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                  categoryFilter === cat
                    ? 'clay-inset bg-[var(--accent-soft)] text-[var(--accent-soft-text)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                {cat === 'all' ? 'All categories' : cat}
              </button>
            ))}
          </div>
        </div>
      </ClayCard>

      {/* Tests Grid */}
      {!testsLoaded ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : filteredTests.length === 0 ? (
        <EmptyState
          illustration={<EmptyTestsIllustration size={136} />}
          title={
            enrichedTests.length === 0
              ? 'No tests yet'
              : `No ${activeTab === 'all' ? '' : activeTab + ' '}tests match your filters`
          }
          description={
            enrichedTests.length === 0
              ? 'Create your first assessment in the Test Builder to generate a join code and start evaluating students.'
              : 'Try switching tabs or clearing your search and category filters.'
          }
          actionLabel={enrichedTests.length === 0 ? 'Create your first test' : undefined}
          onAction={
            enrichedTests.length === 0 ? () => navigate('/professor/tests/new') : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredTests.map((item) => {
            const shareLink = `${window.location.origin}/join/${item.code}`;
            return (
              <ClayCard key={item.id} className="flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tabular text-xs font-extrabold tracking-wider text-[var(--accent-primary)]">
                        {item.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleCopy(`code-${item.id}`, item.code, 'Join code')}
                        aria-label={`Copy join code ${item.code}`}
                        className="cursor-pointer rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                      >
                        {copiedId === `code-${item.id}` ? (
                          <Check className="h-3.5 w-3.5 text-[var(--semantic-mint-text)]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopy(`link-${item.id}`, shareLink, 'Join link')}
                        aria-label={`Copy shareable link for ${item.title}`}
                        className="cursor-pointer rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                      >
                        {copiedId === `link-${item.id}` ? (
                          <Check className="h-3.5 w-3.5 text-[var(--semantic-mint-text)]" />
                        ) : (
                          <LinkIcon className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <ClayBadge
                      tone={
                        item.status === 'live'
                          ? 'mint'
                          : item.status === 'scheduled'
                            ? 'purple'
                            : item.status === 'draft'
                              ? 'amber'
                              : 'neutral'
                      }
                      className="capitalize"
                    >
                      {item.status}
                    </ClayBadge>
                  </div>

                  <h2 className="mt-3 text-base font-bold text-[var(--text-primary)]">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {item.subject || 'General'} · {item.category}
                  </p>

                  <div className="clay-inset mt-3.5 grid grid-cols-3 gap-2 rounded-[16px] p-3 text-center text-xs tabular-nums">
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)]">Questions</p>
                      <p className="font-bold text-[var(--text-primary)]">{item.questionCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)]">Marks</p>
                      <p className="font-bold text-[var(--text-primary)]">{item.totalMarks}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)]">Duration</p>
                      <p className="font-bold text-[var(--text-primary)]">
                        {item.durationMinutes}m
                      </p>
                    </div>
                  </div>

                  <p className="mt-2.5 text-[11px] text-[var(--text-muted)]">
                    {formatDateTime(item.startTime)} → {formatDateTime(item.endTime)}
                  </p>
                </div>

                {/* Action Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <ClayButton
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/professor/tests/${item.id}/submissions`)}
                    leftIcon={<Users className="h-3.5 w-3.5" />}
                    className="flex-1"
                  >
                    Submissions
                  </ClayButton>
                  <ClayButton
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/professor/tests/${item.id}/edit`)}
                    leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                  >
                    Edit
                  </ClayButton>
                  <ClayButton
                    variant="icon"
                    size="sm"
                    onClick={() => navigate(`/professor/tests/${item.id}/analytics`)}
                    aria-label={`Analytics for ${item.title}`}
                    title="Test analytics"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </ClayButton>
                  <ClayButton
                    variant="icon"
                    size="sm"
                    loading={duplicatingId === item.id}
                    onClick={() => void handleDuplicate(item)}
                    aria-label={`Duplicate ${item.title}`}
                    title="Duplicate test"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </ClayButton>
                  <ClayButton
                    variant="icon"
                    size="sm"
                    onClick={() => {
                      if (triggerDemoWriteGuard('delete a test')) return;
                      setDeleteTarget(item);
                    }}
                    aria-label={`Delete ${item.title}`}
                    title="Delete test"
                    className="text-[var(--semantic-coral-text)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </ClayButton>
                </div>
              </ClayCard>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete assessment?"
        description={
          deleteTarget
            ? `This permanently deletes "${deleteTarget.title}", its questions, and its private answer key from Firestore.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2.5 pt-2">
          <ClayButton variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
            Cancel
          </ClayButton>
          <ClayButton
            variant="danger"
            size="sm"
            loading={deleting}
            onClick={() => void handleConfirmDelete()}
          >
            Delete test
          </ClayButton>
        </div>
      </Modal>
    </div>
  );
}
