import { useState, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import type { TestCategory } from '../../types';
import { validateDraftTestInput } from '../../lib/validators';
import { mapFirebaseError } from '../../lib/firebaseErrors';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { ClayButton, ClayInput, Modal } from '../../components/ui';

const CATEGORIES: TestCategory[] = ['DSA', 'Aptitude', 'Core CS', 'Mathematics', 'Coding'];

export function CreateTestModal() {
  const user = useAuthStore((s) => s.user);
  const open = useUIStore((s) => s.createTestModalOpen);
  const setOpen = useUIStore((s) => s.setCreateTestModalOpen);
  const createDraftTest = useUIStore((s) => s.createDraftTest);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TestCategory>('DSA');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [totalMarks, setTotalMarks] = useState('50');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setErrors({});
    setSubmitError(null);
    setOpen(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const duration = Number(durationMinutes);
    const marks = Number(totalMarks);
    const validationErrors = validateDraftTestInput({
      title,
      subject,
      durationMinutes: duration,
      totalMarks: marks,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      const scheduledAt = new Date(Date.now() + 86400 * 1000 * 2).toISOString();
      await createDraftTest(
        {
          title,
          subject,
          category,
          durationMinutes: duration,
          totalMarks: marks,
          scheduledAt,
        },
        user
      );
      setTitle('');
      setSubject('');
      setDurationMinutes('60');
      setTotalMarks('50');
      setOpen(false);
    } catch (err) {
      setSubmitError(mapFirebaseError(err, 'Could not save the test draft. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create new test"
      description="Save a draft assessment to Firestore with a generated join code."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-xs font-medium text-[var(--semantic-coral-text)] shadow-[var(--shadow-clay-sm)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        )}

        <ClayInput
          label="Test title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
          }}
          placeholder="e.g. Midterm Assessment"
          error={errors.title}
        />

        <ClayInput
          label="Course / Subject"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
          }}
          placeholder="e.g. Data Structures"
          error={errors.subject}
        />

        <div className="space-y-2">
          <span className="block text-xs font-semibold text-[var(--text-primary)]">
            Category
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  category === cat
                    ? 'clay-btn-primary text-white'
                    : 'clay-surface-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ClayInput
            label="Duration (minutes)"
            type="number"
            min={10}
            max={360}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            error={errors.durationMinutes}
          />
          <ClayInput
            label="Total marks"
            type="number"
            min={5}
            max={500}
            value={totalMarks}
            onChange={(e) => setTotalMarks(e.target.value)}
            error={errors.totalMarks}
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <ClayButton variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </ClayButton>
          <ClayButton type="submit" variant="primary" size="sm" loading={submitting}>
            Save draft
          </ClayButton>
        </div>
      </form>
    </Modal>
  );
}
