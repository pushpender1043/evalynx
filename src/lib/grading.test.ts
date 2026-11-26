import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEffectiveTestStatus,
  computeRemainingSeconds,
  formatTimerSeconds,
  generateQuestionsCsvTemplate,
  generateSixCharJoinCode,
  gradeAttempt,
  gradeSingleQuestion,
  parseQuestionsCsv,
  shuffleArray,
  validateTestForPublish,
} from './grading';
import type { BuilderQuestion, PublicQuestion, QuestionAnswerKeyEntry } from '../types';

const sampleQuestions: PublicQuestion[] = [
  {
    id: 'q1',
    order: 0,
    type: 'mcq',
    prompt: 'Binary search complexity?',
    options: [
      { id: 'a', text: 'O(1)' },
      { id: 'b', text: 'O(log n)' },
    ],
    marks: 4,
    negativeMarks: 1,
    difficulty: 'easy',
    topic: 'Searching',
  },
  {
    id: 'q2',
    order: 1,
    type: 'multi_select',
    prompt: 'Select balanced trees',
    options: [
      { id: 'a', text: 'AVL' },
      { id: 'b', text: 'Red-Black' },
      { id: 'c', text: 'Linked List' },
    ],
    marks: 4,
    negativeMarks: 1,
    difficulty: 'medium',
    topic: 'Trees',
  },
  {
    id: 'q3',
    order: 2,
    type: 'true_false',
    prompt: 'BFS uses a queue',
    options: [
      { id: 't', text: 'True' },
      { id: 'f', text: 'False' },
    ],
    marks: 2,
    negativeMarks: 0.5,
    difficulty: 'easy',
    topic: 'Graphs',
  },
  {
    id: 'q4',
    order: 3,
    type: 'short_answer',
    prompt: 'Explain memoization.',
    options: [],
    marks: 5,
    negativeMarks: 0,
    difficulty: 'medium',
    topic: 'DP',
  },
];

const sampleKey: Record<string, QuestionAnswerKeyEntry> = {
  q1: { correctAnswers: ['b'], explanation: 'Halves search space' },
  q2: { correctAnswers: ['a', 'b'], explanation: 'Both self-balance' },
  q3: { correctAnswers: ['t'], explanation: 'FIFO queue' },
  q4: { correctAnswers: [], explanation: 'Caching subproblems' },
};

test('gradeSingleQuestion scores MCQ, multi-select, true/false with and without negative marking', () => {
  // Correct MCQ
  const r1 = gradeSingleQuestion(sampleQuestions[0], sampleKey.q1, { selectedOptionIds: ['b'], updatedAtMs: 1 }, true);
  assert.equal(r1.outcome, 'correct');
  assert.equal(r1.marksAwarded, 4);

  // Wrong MCQ with negative marking enabled
  const r2 = gradeSingleQuestion(sampleQuestions[0], sampleKey.q1, { selectedOptionIds: ['a'], updatedAtMs: 1 }, true);
  assert.equal(r2.outcome, 'wrong');
  assert.equal(r2.marksAwarded, -1);
  assert.equal(r2.negativeApplied, 1);

  // Wrong MCQ with negative marking disabled
  const r3 = gradeSingleQuestion(sampleQuestions[0], sampleKey.q1, { selectedOptionIds: ['a'], updatedAtMs: 1 }, false);
  assert.equal(r3.outcome, 'wrong');
  assert.equal(r3.marksAwarded, 0);

  // Multi-select order-independent exact match
  const r4 = gradeSingleQuestion(sampleQuestions[1], sampleKey.q2, { selectedOptionIds: ['b', 'a'], updatedAtMs: 1 }, true);
  assert.equal(r4.outcome, 'correct');
  assert.equal(r4.marksAwarded, 4);

  // Partial multi-select is marked wrong with negative penalty
  const r5 = gradeSingleQuestion(sampleQuestions[1], sampleKey.q2, { selectedOptionIds: ['a'], updatedAtMs: 1 }, true);
  assert.equal(r5.outcome, 'wrong');
  assert.equal(r5.marksAwarded, -1);

  // Skipped question never incurs negative penalty
  const r6 = gradeSingleQuestion(sampleQuestions[0], sampleKey.q1, undefined, true);
  assert.equal(r6.outcome, 'skipped');
  assert.equal(r6.marksAwarded, 0);

  // Subjective question marked pending_review
  const r7 = gradeSingleQuestion(sampleQuestions[3], sampleKey.q4, { textAnswer: 'Caches overlapping results', updatedAtMs: 1 }, true);
  assert.equal(r7.outcome, 'pending_review');
  assert.equal(r7.evaluatedBy, 'pending');
});

test('gradeAttempt aggregates objective auto-grading, pending review, and professor manual overrides', () => {
  const initial = gradeAttempt({
    questions: sampleQuestions,
    answerKey: sampleKey,
    answers: {
      q1: { selectedOptionIds: ['b'], updatedAtMs: 1 }, // +4
      q2: { selectedOptionIds: ['a'], updatedAtMs: 1 }, // -1 (wrong)
      q3: { selectedOptionIds: [], updatedAtMs: 1 }, // 0 (skipped)
      q4: { textAnswer: 'Store subproblem results in a table', updatedAtMs: 1 }, // pending
    },
    negativeMarkingEnabled: true,
    passingMarks: 6,
  });

  assert.equal(initial.score, 3);
  assert.equal(initial.totalMarks, 15);
  assert.equal(initial.correctCount, 1);
  assert.equal(initial.wrongCount, 1);
  assert.equal(initial.skippedCount, 1);
  assert.equal(initial.pendingReviewCount, 1);
  assert.equal(initial.hasPendingReview, true);
  assert.equal(initial.passed, false);

  // Apply professor manual grade for q4 (4/5 marks)
  const afterManual = gradeAttempt({
    questions: sampleQuestions,
    answerKey: sampleKey,
    answers: {
      q1: { selectedOptionIds: ['b'], updatedAtMs: 1 },
      q2: { selectedOptionIds: ['a'], updatedAtMs: 1 },
      q4: { textAnswer: 'Store subproblem results in a table', updatedAtMs: 1 },
    },
    negativeMarkingEnabled: true,
    passingMarks: 6,
    manualGrades: {
      q4: { marksAwarded: 4, feedback: 'Clear definition.' },
    },
  });

  assert.equal(afterManual.score, 7);
  assert.equal(afterManual.pendingReviewCount, 0);
  assert.equal(afterManual.hasPendingReview, false);
  assert.equal(afterManual.passed, true);
  assert.equal(afterManual.questionGrades.q4.feedback, 'Clear definition.');
  assert.equal(afterManual.questionGrades.q4.evaluatedBy, 'professor');
});

test('computeEffectiveTestStatus derives Draft, Scheduled, Live, and Completed from schedule', () => {
  const now = new Date('2026-11-21T12:00:00.000Z').getTime();

  assert.equal(computeEffectiveTestStatus({ published: false }, now), 'draft');
  assert.equal(
    computeEffectiveTestStatus(
      { published: true, startTime: '2026-11-21T14:00:00.000Z', endTime: '2026-11-21T16:00:00.000Z' },
      now
    ),
    'scheduled'
  );
  assert.equal(
    computeEffectiveTestStatus(
      { published: true, startTime: '2026-11-21T10:00:00.000Z', endTime: '2026-11-21T16:00:00.000Z' },
      now
    ),
    'live'
  );
  assert.equal(
    computeEffectiveTestStatus(
      { published: true, startTime: '2026-11-20T10:00:00.000Z', endTime: '2026-11-21T11:00:00.000Z' },
      now
    ),
    'completed'
  );
});

test('validateTestForPublish enforces at least 1 question and valid MCQ correct answers', () => {
  const emptyErrors = validateTestForPublish({
    title: 'Midterm',
    subject: 'Algorithms',
    durationMinutes: 60,
    startTime: '2026-11-21T10:00:00.000Z',
    endTime: '2026-11-21T12:00:00.000Z',
    attemptLimit: 1,
    passingMarks: 0,
    questions: [],
  });
  assert.ok(emptyErrors.some((e) => e.includes('at least 1 question')));

  const missingCorrect: BuilderQuestion[] = [
    {
      id: 'q1',
      order: 0,
      type: 'mcq',
      prompt: 'Pick one',
      options: [
        { id: 'a', text: 'One' },
        { id: 'b', text: 'Two' },
      ],
      correctAnswers: [],
      marks: 2,
      negativeMarks: 0,
      difficulty: 'easy',
      topic: 'Basics',
      explanation: '',
    },
  ];
  const mcqErrors = validateTestForPublish({
    title: 'Midterm',
    subject: 'Algorithms',
    durationMinutes: 60,
    startTime: '2026-11-21T10:00:00.000Z',
    endTime: '2026-11-21T12:00:00.000Z',
    attemptLimit: 1,
    passingMarks: 1,
    questions: missingCorrect,
  });
  assert.ok(mcqErrors.some((e) => e.includes('Select at least one correct answer')));
});

test('CSV template round-trips cleanly through parseQuestionsCsv', () => {
  const csv = generateQuestionsCsvTemplate();
  const parsed = parseQuestionsCsv(csv);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.questions.length, 4);
  assert.equal(parsed.questions[0].type, 'mcq');
  assert.deepEqual(parsed.questions[0].correctAnswers, ['opt-b']);
  assert.equal(parsed.questions[1].type, 'multi_select');
  assert.deepEqual(parsed.questions[1].correctAnswers, ['opt-a', 'opt-b', 'opt-d']);
  assert.equal(parsed.questions[2].type, 'true_false');
  assert.equal(parsed.questions[3].type, 'short_answer');
});

test('generateSixCharJoinCode, shuffleArray, and timer helpers behave deterministically', () => {
  const code = generateSixCharJoinCode();
  assert.equal(code.length, 6);
  assert.match(code, /^[A-Z0-9]{6}$/);

  const original = [1, 2, 3, 4, 5];
  const shuffled = shuffleArray(original);
  assert.equal(shuffled.length, 5);
  assert.deepEqual([...shuffled].sort(), original);

  assert.equal(computeRemainingSeconds(100_000, 10, 160_000), 540);
  assert.equal(computeRemainingSeconds(100_000, 1, 200_000), 0);
  assert.equal(formatTimerSeconds(540), '09:00');
  assert.equal(formatTimerSeconds(3661), '01:01:01');
});
