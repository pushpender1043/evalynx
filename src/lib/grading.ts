import type {
  AttemptAnswer,
  BuilderQuestion,
  DifficultyLevel,
  PublicQuestion,
  QuestionAnswerKeyEntry,
  QuestionGradeDetail,
  TestStatus,
} from '../types';

import { validateTestForPublish } from './testValidation';

export { validateTestForPublish };

const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a 6-character uppercase alphanumeric join code avoiding ambiguous characters (0/O, 1/I/L).
 */
export function generateSixCharJoinCode(rng: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    const idx = Math.floor(rng() * JOIN_CODE_ALPHABET.length);
    out += JOIN_CODE_ALPHABET[idx];
  }
  return out;
}

/**
 * Compute live test status strictly from `published` flag and start/end schedule timestamps.
 */
export function computeEffectiveTestStatus(
  input: {
    published: boolean;
    startTime?: string;
    endTime?: string;
    scheduledAt?: string;
  },
  nowMs: number = Date.now()
): TestStatus {
  if (!input.published) return 'draft';

  const startMs = new Date(input.startTime || input.scheduledAt || '').getTime();
  const endMs = new Date(input.endTime || '').getTime();

  if (!Number.isNaN(endMs) && nowMs > endMs) {
    return 'completed';
  }
  if (!Number.isNaN(startMs) && nowMs < startMs) {
    return 'scheduled';
  }
  return 'live';
}

export function isObjectiveQuestionType(type: PublicQuestion['type']): boolean {
  return type === 'mcq' || type === 'multi_select' || type === 'true_false';
}

export function hasAnswerContent(
  type: PublicQuestion['type'],
  answer: AttemptAnswer | undefined
): boolean {
  if (!answer) return false;
  if (isObjectiveQuestionType(type)) {
    return Array.isArray(answer.selectedOptionIds) && answer.selectedOptionIds.length > 0;
  }
  return typeof answer.textAnswer === 'string' && answer.textAnswer.trim().length > 0;
}

export function roundMarks(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Pure grading function for a single question.
 */
export function gradeSingleQuestion(
  question: PublicQuestion,
  keyEntry: QuestionAnswerKeyEntry | undefined,
  answer: AttemptAnswer | undefined,
  negativeMarkingEnabled: boolean
): QuestionGradeDetail {
  const maxMarks = Math.max(0, Number(question.marks) || 0);
  const negativePenalty =
    negativeMarkingEnabled && Number(question.negativeMarks) > 0
      ? Math.abs(Number(question.negativeMarks))
      : 0;

  if (!hasAnswerContent(question.type, answer)) {
    return {
      questionId: question.id,
      type: question.type,
      outcome: 'skipped',
      marksAwarded: 0,
      maxMarks,
      negativeApplied: 0,
      evaluatedBy: isObjectiveQuestionType(question.type) ? 'auto' : 'pending',
    };
  }

  if (!isObjectiveQuestionType(question.type)) {
    return {
      questionId: question.id,
      type: question.type,
      outcome: 'pending_review',
      marksAwarded: 0,
      maxMarks,
      negativeApplied: 0,
      evaluatedBy: 'pending',
    };
  }

  const expected = [...(keyEntry?.correctAnswers ?? [])].map((v) => v.trim()).filter(Boolean).sort();
  const actual = [...(answer?.selectedOptionIds ?? [])].map((v) => v.trim()).filter(Boolean).sort();

  const isCorrect =
    expected.length > 0 &&
    expected.length === actual.length &&
    expected.every((val, index) => val === actual[index]);

  if (isCorrect) {
    return {
      questionId: question.id,
      type: question.type,
      outcome: 'correct',
      marksAwarded: roundMarks(maxMarks),
      maxMarks,
      negativeApplied: 0,
      evaluatedBy: 'auto',
    };
  }

  return {
    questionId: question.id,
    type: question.type,
    outcome: 'wrong',
    marksAwarded: roundMarks(-negativePenalty),
    maxMarks,
    negativeApplied: roundMarks(negativePenalty),
    evaluatedBy: 'auto',
  };
}

export interface AttemptGradingSummary {
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  pendingReviewCount: number;
  hasPendingReview: boolean;
  questionGrades: Record<string, QuestionGradeDetail>;
  topicBreakdown: Array<{ topic: string; percentage: number }>;
}

/**
 * Pure grading function for a full student attempt.
 * Preserves any professor manual overrides when recomputing totals.
 */
export function gradeAttempt(params: {
  questions: PublicQuestion[];
  answerKey: Record<string, QuestionAnswerKeyEntry>;
  answers: Record<string, AttemptAnswer>;
  negativeMarkingEnabled: boolean;
  passingMarks: number;
  manualGrades?: Record<string, { marksAwarded: number; feedback?: string }>;
}): AttemptGradingSummary {
  const { questions, answerKey, answers, negativeMarkingEnabled, passingMarks, manualGrades } =
    params;

  let rawScore = 0;
  let totalMarks = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let pendingReviewCount = 0;

  const questionGrades: Record<string, QuestionGradeDetail> = {};
  const topicTotals = new Map<string, { earned: number; max: number }>();

  for (const question of questions) {
    const maxMarks = Math.max(0, Number(question.marks) || 0);
    totalMarks += maxMarks;

    let grade = gradeSingleQuestion(
      question,
      answerKey[question.id],
      answers[question.id],
      negativeMarkingEnabled
    );

    const manual = manualGrades?.[question.id];
    if (manual && Number.isFinite(manual.marksAwarded)) {
      const clamped = roundMarks(Math.max(0, Math.min(maxMarks, manual.marksAwarded)));
      grade = {
        ...grade,
        outcome: clamped > 0 ? 'correct' : 'wrong',
        marksAwarded: clamped,
        negativeApplied: 0,
        feedback: manual.feedback?.trim() || '',
        evaluatedBy: 'professor',
      };
    }

    questionGrades[question.id] = grade;
    rawScore += grade.marksAwarded;

    if (grade.outcome === 'correct') correctCount += 1;
    else if (grade.outcome === 'wrong') wrongCount += 1;
    else if (grade.outcome === 'skipped') skippedCount += 1;
    else if (grade.outcome === 'pending_review') pendingReviewCount += 1;

    const topicName = question.topic?.trim() || 'General';
    const prev = topicTotals.get(topicName) ?? { earned: 0, max: 0 };
    prev.earned += Math.max(0, grade.marksAwarded);
    prev.max += maxMarks;
    topicTotals.set(topicName, prev);
  }

  const score = roundMarks(rawScore);
  const percentage =
    totalMarks > 0 ? Math.max(0, Math.min(100, Math.round((score / totalMarks) * 100))) : 0;
  const passed = score >= (Number.isFinite(passingMarks) ? passingMarks : 0);

  const topicBreakdown = Array.from(topicTotals.entries())
    .filter(([, v]) => v.max > 0)
    .map(([topic, v]) => ({
      topic,
      percentage: Math.max(0, Math.min(100, Math.round((v.earned / v.max) * 100))),
    }));

  return {
    score,
    totalMarks: roundMarks(totalMarks),
    percentage,
    passed,
    correctCount,
    wrongCount,
    skippedCount,
    pendingReviewCount,
    hasPendingReview: pendingReviewCount > 0,
    questionGrades,
    topicBreakdown,
  };
}

/**
 * Fisher-Yates shuffle returning a new array without mutating the source.
 */
export function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Compute remaining attempt seconds from server-anchored start time.
 */
export function computeRemainingSeconds(
  startedAtMs: number,
  durationMinutes: number,
  nowServerMs: number
): number {
  const endMs = startedAtMs + durationMinutes * 60 * 1000;
  return Math.max(0, Math.ceil((endMs - nowServerMs) / 1000));
}

export function formatTimerSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

/**
 * Generate a downloadable CSV template for bulk question import.
 */
export function generateQuestionsCsvTemplate(): string {
  const headers = [
    'type',
    'prompt',
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'correct',
    'marks',
    'negativeMarks',
    'difficulty',
    'topic',
    'explanation',
    'rubric',
  ];
  const sampleRows = [
    [
      'mcq',
      'What is the worst-case time complexity of binary search?',
      'O(1)',
      'O(log n)',
      'O(n)',
      'O(n log n)',
      'B',
      '2',
      '0.5',
      'easy',
      'Searching',
      'Binary search halves the search interval on each comparison.',
      '',
    ],
    [
      'multi_select',
      'Which of the following are balanced binary search trees?',
      'AVL Tree',
      'Red-Black Tree',
      'Singly Linked List',
      'B-Tree',
      'A|B|D',
      '4',
      '1',
      'medium',
      'Trees',
      'AVL, Red-Black, and B-Trees maintain logarithmic height.',
      '',
    ],
    [
      'true_false',
      'Breadth-First Search uses a queue data structure.',
      'True',
      'False',
      '',
      '',
      'True',
      '1',
      '0',
      'easy',
      'Graphs',
      'BFS explores nodes level by level using a FIFO queue.',
      '',
    ],
    [
      'short_answer',
      'Define memoization in dynamic programming in 2 sentences.',
      '',
      '',
      '',
      '',
      '',
      '3',
      '0',
      'medium',
      'Dynamic Programming',
      'Caching overlapping subproblem results to avoid redundant recursion.',
      'Award 2 marks for caching subproblems and 1 mark for avoiding recomputation.',
    ],
  ];

  const escape = (cell: string) =>
    /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;

  return [headers.join(','), ...sampleRows.map((row) => row.map(escape).join(','))].join('\n');
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const text = csvText.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((c) => c.length > 0)) {
    rows.push(row);
  }
  return rows;
}

/**
 * Parse a bulk CSV file into BuilderQuestion drafts.
 */
export function parseQuestionsCsv(
  csvText: string,
  startingOrder = 0
): { questions: BuilderQuestion[]; errors: string[] } {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return {
      questions: [],
      errors: ['CSV must include a header row and at least one question row.'],
    };
  }

  const headerMap = new Map<string, number>();
  rows[0].forEach((h, i) => headerMap.set(h.toLowerCase().trim(), i));

  const getCol = (r: string[], name: string) => {
    const idx = headerMap.get(name.toLowerCase());
    return idx !== undefined ? (r[idx] ?? '').trim() : '';
  };

  const questions: BuilderQuestion[] = [];
  const errors: string[] = [];

  for (let rIdx = 1; rIdx < rows.length; rIdx += 1) {
    const r = rows[rIdx];
    const lineNum = rIdx + 1;
    const rawType = getCol(r, 'type').toLowerCase();
    const validTypes = new Set(['mcq', 'multi_select', 'true_false', 'short_answer', 'long_answer']);
    const type = (validTypes.has(rawType) ? rawType : 'mcq') as BuilderQuestion['type'];
    const prompt = getCol(r, 'prompt');

    if (!prompt) {
      errors.push(`Row ${lineNum}: Missing question prompt.`);
      continue;
    }

    const qId = `q-${Date.now()}-${rIdx}-${Math.random().toString(36).slice(2, 6)}`;
    const marks = Math.max(1, Number(getCol(r, 'marks')) || 1);
    const negativeMarks = Math.max(0, Number(getCol(r, 'negativeMarks')) || 0);
    const rawDiff = getCol(r, 'difficulty').toLowerCase();
    const difficulty: DifficultyLevel =
      rawDiff === 'easy' || rawDiff === 'hard' ? rawDiff : 'medium';
    const topic = getCol(r, 'topic') || 'General';
    const explanation = getCol(r, 'explanation');
    const rubric = getCol(r, 'rubric');

    let options: BuilderQuestion['options'] = [];
    let correctAnswers: string[] = [];

    if (type === 'true_false') {
      options = [
        { id: 'opt-true', text: 'True' },
        { id: 'opt-false', text: 'False' },
      ];
      const corr = getCol(r, 'correct').toLowerCase();
      correctAnswers = corr === 'false' || corr === 'b' ? ['opt-false'] : ['opt-true'];
    } else if (type === 'mcq' || type === 'multi_select') {
      const letters = ['A', 'B', 'C', 'D'];
      const rawOpts = [
        getCol(r, 'optionA'),
        getCol(r, 'optionB'),
        getCol(r, 'optionC'),
        getCol(r, 'optionD'),
      ];
      const letterToId = new Map<string, string>();
      rawOpts.forEach((text, i) => {
        if (!text) return;
        const optId = `opt-${letters[i].toLowerCase()}`;
        options.push({ id: optId, text });
        letterToId.set(letters[i], optId);
      });

      if (options.length < 2) {
        errors.push(`Row ${lineNum}: Objective question needs at least 2 options.`);
        continue;
      }

      const rawCorrect = getCol(r, 'correct')
        .split(/[|;,]/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      correctAnswers = rawCorrect
        .map((token) => letterToId.get(token) || options.find((o) => o.text.toUpperCase() === token)?.id || '')
        .filter(Boolean);
      if (type === 'mcq' && correctAnswers.length > 1) {
        correctAnswers = [correctAnswers[0]];
      }
    }

    questions.push({
      id: qId,
      order: startingOrder + questions.length,
      type,
      prompt,
      options,
      correctAnswers,
      marks,
      negativeMarks,
      difficulty,
      topic,
      explanation,
      rubric,
    });
  }

  return { questions, errors };
}
