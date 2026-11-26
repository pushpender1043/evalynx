import { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  Copy,
  GripVertical,
  ImagePlus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { BuilderQuestion, DifficultyLevel } from '../../../types';
import { ClayBadge, ClayButton, ClayInput } from '../../../components/ui';
import { cn } from '../../../lib/utils';

interface QuestionEditorCardProps {
  question: BuilderQuestion;
  index: number;
  totalCount: number;
  negativeMarkingEnabled: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onChange: (updated: BuilderQuestion) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSaveToBank: () => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
}

const QUESTION_TYPES: Array<{
  value: BuilderQuestion['type'] | 'coding';
  label: string;
  disabled?: boolean;
}> = [
  { value: 'mcq', label: 'MCQ (Single)' },
  { value: 'multi_select', label: 'Multiple-Correct' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'long_answer', label: 'Long Answer' },
  { value: 'coding', label: 'Coding', disabled: true },
];

const DIFFICULTIES: DifficultyLevel[] = ['easy', 'medium', 'hard'];

export function QuestionEditorCard({
  question,
  index,
  totalCount,
  negativeMarkingEnabled,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onChange,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSaveToBank,
  onUploadImage,
}: QuestionEditorCardProps) {
  const [savingBank, setSavingBank] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTypeChange = (nextType: BuilderQuestion['type']) => {
    if (nextType === question.type) return;

    if (nextType === 'true_false') {
      onChange({
        ...question,
        type: nextType,
        options: [
          { id: 'opt-true', text: 'True' },
          { id: 'opt-false', text: 'False' },
        ],
        correctAnswers: ['opt-true'],
      });
      return;
    }

    if (nextType === 'short_answer' || nextType === 'long_answer') {
      onChange({
        ...question,
        type: nextType,
        options: [],
        correctAnswers: [],
        negativeMarks: 0,
      });
      return;
    }

    // mcq or multi_select
    const existingOpts =
      question.options.length >= 2 && question.type !== 'true_false'
        ? question.options
        : [
            { id: `opt-${Date.now()}-a`, text: '' },
            { id: `opt-${Date.now()}-b`, text: '' },
            { id: `opt-${Date.now()}-c`, text: '' },
            { id: `opt-${Date.now()}-d`, text: '' },
          ];
    const nextCorrect =
      nextType === 'mcq' ? question.correctAnswers.slice(0, 1) : question.correctAnswers;

    onChange({
      ...question,
      type: nextType,
      options: existingOpts,
      correctAnswers: nextCorrect.filter((id) => existingOpts.some((o) => o.id === id)),
    });
  };

  const toggleCorrectOption = (optionId: string) => {
    if (question.type === 'mcq' || question.type === 'true_false') {
      onChange({ ...question, correctAnswers: [optionId] });
      return;
    }
    const exists = question.correctAnswers.includes(optionId);
    const next = exists
      ? question.correctAnswers.filter((id) => id !== optionId)
      : [...question.correctAnswers, optionId];
    onChange({ ...question, correctAnswers: next });
  };

  const handleOptionTextChange = (optionId: string, text: string) => {
    onChange({
      ...question,
      options: question.options.map((o) => (o.id === optionId ? { ...o, text } : o)),
    });
  };

  const handleAddOption = () => {
    const nextOpt = { id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, text: '' };
    onChange({ ...question, options: [...question.options, nextOpt] });
  };

  const handleRemoveOption = (optionId: string) => {
    if (question.options.length <= 2) return;
    onChange({
      ...question,
      options: question.options.filter((o) => o.id !== optionId),
      correctAnswers: question.correctAnswers.filter((id) => id !== optionId),
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    setUploadingImage(true);
    try {
      const url = await onUploadImage(file);
      onChange({ ...question, imageUrl: url });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Unable to upload image.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBankClick = async () => {
    setSavingBank(true);
    try {
      await onSaveToBank();
    } finally {
      setSavingBank(false);
    }
  };

  const isObjective =
    question.type === 'mcq' || question.type === 'multi_select' || question.type === 'true_false';

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      aria-label={`Question ${index + 1}`}
      className={cn(
        'clay-card p-5 sm:p-6 transition-all duration-150',
        isDragging && 'opacity-55 scale-[0.99]'
      )}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="clay-surface-sm flex h-9 w-9 cursor-grab items-center justify-center text-[var(--text-muted)] active:cursor-grabbing"
            title="Drag to reorder"
            aria-hidden="true"
          >
            <GripVertical className="h-4 w-4" />
          </span>
          <div>
            <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
              Question {index + 1}
            </span>
            <span className="ml-2 text-xs font-semibold text-[var(--text-muted)] tabular-nums">
              {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <ClayButton
            variant="secondary"
            size="sm"
            loading={savingBank}
            onClick={() => void handleBankClick()}
            leftIcon={
              question.savedToBank ? (
                <BookmarkCheck className="h-3.5 w-3.5 text-[var(--semantic-mint-text)]" />
              ) : (
                <BookmarkPlus className="h-3.5 w-3.5" />
              )
            }
          >
            {question.savedToBank ? 'Saved to Bank' : 'Save to Bank'}
          </ClayButton>

          <ClayButton
            variant="icon"
            size="sm"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={`Move question ${index + 1} up`}
            title="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </ClayButton>
          <ClayButton
            variant="icon"
            size="sm"
            onClick={onMoveDown}
            disabled={index === totalCount - 1}
            aria-label={`Move question ${index + 1} down`}
            title="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </ClayButton>
          <ClayButton
            variant="icon"
            size="sm"
            onClick={onDuplicate}
            aria-label={`Duplicate question ${index + 1}`}
            title="Duplicate question"
          >
            <Copy className="h-3.5 w-3.5" />
          </ClayButton>
          <ClayButton
            variant="icon"
            size="sm"
            onClick={onDelete}
            aria-label={`Delete question ${index + 1}`}
            title="Delete question"
            className="text-[var(--semantic-coral-text)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </ClayButton>
        </div>
      </div>

      {/* Question Type Selector */}
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Question type">
        {QUESTION_TYPES.map((t) => {
          const active = question.type === t.value;
          if (t.disabled) {
            return (
              <button
                key={t.value}
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full bg-[var(--bg-surface-muted)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-muted)] opacity-60"
              >
                <span>{t.label}</span>
                <span className="rounded-full bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px]">
                  Later
                </span>
              </button>
            );
          }
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTypeChange(t.value as BuilderQuestion['type'])}
              className={cn(
                'cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                active
                  ? 'clay-btn-primary text-white'
                  : 'clay-surface-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Prompt + Optional Image */}
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor={`q-prompt-${question.id}`}
            className="block text-xs font-semibold text-[var(--text-primary)]"
          >
            Question text
          </label>
          <textarea
            id={`q-prompt-${question.id}`}
            rows={3}
            value={question.prompt}
            onChange={(e) => onChange({ ...question, prompt: e.target.value })}
            placeholder="Write a clear question prompt..."
            className="clay-inset w-full rounded-[18px] px-4 py-3 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
          />
          <ClayButton
            variant="secondary"
            size="sm"
            loading={uploadingImage}
            onClick={() => fileInputRef.current?.click()}
            leftIcon={<ImagePlus className="h-3.5 w-3.5" />}
          >
            {question.imageUrl ? 'Replace image' : 'Attach image'}
          </ClayButton>
          {question.imageUrl && (
            <ClayButton
              variant="ghost"
              size="sm"
              onClick={() => onChange({ ...question, imageUrl: undefined })}
              leftIcon={<X className="h-3.5 w-3.5" />}
            >
              Remove image
            </ClayButton>
          )}
          {imageError && (
            <span role="alert" className="text-xs font-medium text-[var(--semantic-coral-text)]">
              {imageError}
            </span>
          )}
        </div>

        {question.imageUrl && (
          <div className="clay-inset inline-block overflow-hidden rounded-[18px] p-2">
            <img
              src={question.imageUrl}
              alt={`Question ${index + 1} illustration`}
              className="max-h-48 rounded-[14px] object-contain"
            />
          </div>
        )}
      </div>

      {/* Options Editor for Objective Questions */}
      {isObjective && (
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {question.type === 'multi_select'
                ? 'Options (check all correct answers)'
                : 'Options (select the correct answer)'}
            </span>
            {question.correctAnswers.length === 0 && (
              <ClayBadge tone="coral">Select correct answer</ClayBadge>
            )}
          </div>

          <div className="space-y-2.5">
            {question.options.map((opt, optIdx) => {
              const isCorrect = question.correctAnswers.includes(opt.id);
              const letter = String.fromCharCode(65 + optIdx);
              return (
                <div key={opt.id} className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleCorrectOption(opt.id)}
                    aria-label={`Mark option ${letter} as correct for question ${index + 1}`}
                    aria-pressed={isCorrect}
                    className={cn(
                      'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[14px] text-xs font-bold transition-all',
                      isCorrect
                        ? 'bg-[var(--semantic-mint)] text-white shadow-[var(--shadow-clay-sm)]'
                        : 'clay-surface-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {isCorrect ? <Check className="h-4 w-4" /> : letter}
                  </button>

                  {question.type === 'true_false' ? (
                    <div className="clay-inset flex-1 rounded-[18px] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)]">
                      {opt.text}
                    </div>
                  ) : (
                    <div className="flex-1">
                      <ClayInput
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                        placeholder={`Option ${letter}`}
                        aria-label={`Question ${index + 1} option ${letter}`}
                      />
                    </div>
                  )}

                  {question.type !== 'true_false' && question.options.length > 2 && (
                    <ClayButton
                      variant="icon"
                      size="sm"
                      onClick={() => handleRemoveOption(opt.id)}
                      aria-label={`Remove option ${letter}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </ClayButton>
                  )}
                </div>
              );
            })}
          </div>

          {question.type !== 'true_false' && question.options.length < 6 && (
            <ClayButton
              variant="ghost"
              size="sm"
              onClick={handleAddOption}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add option
            </ClayButton>
          )}
        </div>
      )}

      {/* Scoring & Metadata Grid */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ClayInput
          label="Marks"
          type="number"
          min={1}
          max={100}
          step="0.5"
          value={String(question.marks)}
          onChange={(e) => onChange({ ...question, marks: Math.max(0, Number(e.target.value)) })}
        />
        <ClayInput
          label={negativeMarkingEnabled ? 'Negative marks' : 'Negative marks (off)'}
          type="number"
          min={0}
          max={50}
          step="0.25"
          disabled={!isObjective}
          value={String(isObjective ? question.negativeMarks : 0)}
          onChange={(e) =>
            onChange({ ...question, negativeMarks: Math.max(0, Number(e.target.value)) })
          }
        />
        <ClayInput
          label="Topic tag"
          value={question.topic}
          onChange={(e) => onChange({ ...question, topic: e.target.value })}
          placeholder="e.g. Graphs"
        />
        <div className="space-y-1.5">
          <span className="block text-xs font-semibold text-[var(--text-primary)]">
            Difficulty
          </span>
          <div className="clay-inset flex h-[46px] items-center gap-1 rounded-[18px] p-1">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => onChange({ ...question, difficulty: diff })}
                className={cn(
                  'flex-1 cursor-pointer rounded-[14px] py-1.5 text-xs font-semibold capitalize transition-all',
                  question.difficulty === diff
                    ? 'clay-surface-sm text-[var(--accent-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Explanation & Subjective Rubric */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor={`q-exp-${question.id}`}
            className="block text-xs font-semibold text-[var(--text-primary)]"
          >
            Explanation (shown in result review)
          </label>
          <textarea
            id={`q-exp-${question.id}`}
            rows={2}
            value={question.explanation}
            onChange={(e) => onChange({ ...question, explanation: e.target.value })}
            placeholder="Optional explanation for the correct solution..."
            className="clay-inset w-full rounded-[18px] px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>

        {(question.type === 'long_answer' || question.type === 'short_answer') && (
          <div className="space-y-1.5">
            <label
              htmlFor={`q-rubric-${question.id}`}
              className="block text-xs font-semibold text-[var(--text-primary)]"
            >
              Grading rubric
            </label>
            <textarea
              id={`q-rubric-${question.id}`}
              rows={2}
              value={question.rubric || ''}
              onChange={(e) => onChange({ ...question, rubric: e.target.value })}
              placeholder="Key points & mark distribution for manual grading..."
              className="clay-inset w-full rounded-[18px] px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>
        )}
      </div>
    </article>
  );
}
