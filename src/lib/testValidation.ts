import type { BuilderQuestion } from '../types';

export interface PublishValidationInput {
  title: string;
  subject?: string;
  durationMinutes: number;
  startTime?: string | null;
  endTime?: string | null;
  attemptLimit: number;
  passingMarks: number;
  questions: BuilderQuestion[];
}

export interface PublishValidationIssue {
  step: 0 | 1 | 2;
  field: string;
  message: string;
  questionIndex?: number;
}

/**
 * Pure publish-readiness validator returning structured issues mapped to builder steps.
 * Supports optional/nullable startTime and endTime schedules.
 */
export function validateTestPublishIssues(
  params: PublishValidationInput
): PublishValidationIssue[] {
  const issues: PublishValidationIssue[] = [];

  const trimmedTitle = params.title.trim();
  if (!trimmedTitle) {
    issues.push({
      step: 0,
      field: 'title',
      message: 'Test title is required.',
    });
  } else if (trimmedTitle.length < 3) {
    issues.push({
      step: 0,
      field: 'title',
      message: 'Test title must be at least 3 characters.',
    });
  }

  if (params.subject !== undefined && !params.subject.trim()) {
    issues.push({
      step: 0,
      field: 'subject',
      message: 'Subject is required.',
    });
  }

  if (
    !Number.isFinite(params.durationMinutes) ||
    params.durationMinutes < 1 ||
    params.durationMinutes > 360
  ) {
    issues.push({
      step: 2,
      field: 'durationMinutes',
      message: 'Duration must be between 1 and 360 minutes.',
    });
  }

  if (
    !Number.isFinite(params.attemptLimit) ||
    params.attemptLimit < 1 ||
    params.attemptLimit > 20
  ) {
    issues.push({
      step: 2,
      field: 'attemptLimit',
      message: 'Attempt limit must be between 1 and 20.',
    });
  }

  // Optional schedule validation: startTime and endTime may be empty/null; if provided they must be valid dates, and end > start.
  const hasStart = Boolean(params.startTime && params.startTime.trim());
  const hasEnd = Boolean(params.endTime && params.endTime.trim());
  const startMs = hasStart ? new Date(params.startTime as string).getTime() : NaN;
  const endMs = hasEnd ? new Date(params.endTime as string).getTime() : NaN;

  if (hasStart && Number.isNaN(startMs)) {
    issues.push({
      step: 2,
      field: 'startTime',
      message: 'Start schedule date is invalid.',
    });
  }
  if (hasEnd && Number.isNaN(endMs)) {
    issues.push({
      step: 2,
      field: 'endTime',
      message: 'End schedule date is invalid.',
    });
  }
  if (hasStart && hasEnd && !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
    issues.push({
      step: 2,
      field: 'endTime',
      message: 'End schedule time must be after start time.',
    });
  }

  if (params.questions.length === 0) {
    issues.push({
      step: 1,
      field: 'questions',
      message: 'Add at least 1 question before publishing.',
    });
  }

  const totalMarks = params.questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
  if (
    !Number.isFinite(params.passingMarks) ||
    params.passingMarks < 0 ||
    (totalMarks > 0 && params.passingMarks > totalMarks)
  ) {
    issues.push({
      step: 2,
      field: 'passingMarks',
      message: `Passing marks must be between 0 and total marks (${totalMarks}).`,
    });
  }

  params.questions.forEach((q, idx) => {
    const num = idx + 1;
    if (!q.prompt.trim()) {
      issues.push({
        step: 1,
        field: `questions.${idx}.prompt`,
        questionIndex: idx,
        message: `Question ${num}: Question text is required.`,
      });
    }
    if (!Number.isFinite(q.marks) || q.marks <= 0) {
      issues.push({
        step: 1,
        field: `questions.${idx}.marks`,
        questionIndex: idx,
        message: `Question ${num}: Marks must be greater than 0.`,
      });
    }

    if (q.type === 'mcq' || q.type === 'multi_select') {
      const filledOptions = q.options.filter((o) => o.text.trim().length > 0);
      if (filledOptions.length < 2) {
        issues.push({
          step: 1,
          field: `questions.${idx}.options`,
          questionIndex: idx,
          message: `Question ${num}: Provide at least 2 non-empty answer options.`,
        });
      }
      const validIds = new Set(filledOptions.map((o) => o.id));
      const validCorrect = q.correctAnswers.filter((id) => validIds.has(id));
      if (validCorrect.length === 0) {
        issues.push({
          step: 1,
          field: `questions.${idx}.correctAnswers`,
          questionIndex: idx,
          message: `Question ${num}: Select at least one correct answer.`,
        });
      }
      if (q.type === 'mcq' && validCorrect.length > 1) {
        issues.push({
          step: 1,
          field: `questions.${idx}.correctAnswers`,
          questionIndex: idx,
          message: `Question ${num}: Single-choice MCQ can only have one correct answer.`,
        });
      }
    } else if (q.type === 'true_false') {
      const validIds = new Set(q.options.map((o) => o.id));
      const validCorrect = q.correctAnswers.filter((id) => validIds.has(id));
      if (validCorrect.length !== 1) {
        issues.push({
          step: 1,
          field: `questions.${idx}.correctAnswers`,
          questionIndex: idx,
          message: `Question ${num}: Select True or False as the correct answer.`,
        });
      }
    }
  });

  return issues;
}

/**
 * Convenience helper returning plain validation error strings.
 */
export function validateTestForPublish(params: PublishValidationInput): string[] {
  return validateTestPublishIssues(params).map((issue) => issue.message);
}
