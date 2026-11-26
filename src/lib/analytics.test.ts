import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeClassComparison,
  computeStudentAnalytics,
  computeStudentRank,
  computeTestAnalytics,
  serializeTestAnalyticsToCsv,
} from './analytics';
import type { PublicQuestion, StudentResultItem, TestAttempt, TestItem } from '../types';

const sampleTest: TestItem = {
  id: 't1',
  title: 'DSA Midterm',
  subject: 'Algorithms',
  category: 'DSA',
  code: 'DSA101',
  professorId: 'p1',
  professorName: 'Dr. Rao',
  published: true,
  status: 'live',
  scheduledAt: '2026-11-20T09:00:00.000Z',
  startTime: '2026-11-20T09:00:00.000Z',
  endTime: '2026-11-25T09:00:00.000Z',
  durationMinutes: 30,
  totalMarks: 10,
  passingMarks: 5,
  questionCount: 2,
  enrolledCount: 3,
  submittedCount: 3,
  settings: {
    durationMinutes: 30,
    startTime: '2026-11-20T09:00:00.000Z',
    endTime: '2026-11-25T09:00:00.000Z',
    shuffleQuestions: false,
    shuffleOptions: false,
    negativeMarking: false,
    attemptLimit: 1,
    showResultMode: 'immediate',
    passingMarks: 5,
    showRankToStudents: true,
  },
  proctoring: {
    enabled: true,
    fullscreenRequired: true,
    maxTabSwitches: 3,
    blockCopyPaste: true,
    webcamEnabled: false,
    autoSubmitOnLimit: true,
  },
};

const sampleQuestions: PublicQuestion[] = [
  {
    id: 'q1',
    order: 0,
    type: 'mcq',
    prompt: 'Time complexity of binary search?',
    options: [
      { id: 'a', text: 'O(log n)' },
      { id: 'b', text: 'O(n)' },
    ],
    marks: 5,
    negativeMarks: 0,
    difficulty: 'easy',
    topic: 'Searching',
  },
  {
    id: 'q2',
    order: 1,
    type: 'mcq',
    prompt: 'Worst-case complexity of quicksort?',
    options: [
      { id: 'a', text: 'O(n^2)' },
      { id: 'b', text: 'O(n log n)' },
    ],
    marks: 5,
    negativeMarks: 0,
    difficulty: 'hard',
    topic: 'Sorting',
  },
];

function makeAttempt(
  id: string,
  studentId: string,
  score: number,
  percentage: number,
  passed: boolean,
  timeTakenSeconds: number,
  q1Outcome: 'correct' | 'wrong',
  q2Outcome: 'correct' | 'wrong',
  riskLevel: 'low' | 'medium' | 'high' = 'low'
): TestAttempt {
  return {
    id,
    testId: 't1',
    testTitle: 'DSA Midterm',
    testCode: 'DSA101',
    subject: 'Algorithms',
    professorId: 'p1',
    studentId,
    studentName: `Student ${studentId}`,
    studentEmail: `${studentId}@test.edu`,
    attemptNumber: 1,
    status: 'evaluated',
    startedAtMs: 1000,
    durationMinutes: 30,
    submittedAtMs: 1000 + timeTakenSeconds * 1000,
    timeTakenSeconds,
    questionOrder: ['q1', 'q2'],
    optionOrders: {},
    answers: {},
    flaggedQuestionIds: [],
    score,
    totalMarks: 10,
    percentage,
    passed,
    correctCount: (q1Outcome === 'correct' ? 1 : 0) + (q2Outcome === 'correct' ? 1 : 0),
    wrongCount: (q1Outcome === 'wrong' ? 1 : 0) + (q2Outcome === 'wrong' ? 1 : 0),
    skippedCount: 0,
    pendingReviewCount: 0,
    questionGrades: {
      q1: {
        questionId: 'q1',
        type: 'mcq',
        outcome: q1Outcome,
        marksAwarded: q1Outcome === 'correct' ? 5 : 0,
        maxMarks: 5,
        negativeApplied: 0,
        evaluatedBy: 'auto',
      },
      q2: {
        questionId: 'q2',
        type: 'mcq',
        outcome: q2Outcome,
        marksAwarded: q2Outcome === 'correct' ? 5 : 0,
        maxMarks: 5,
        negativeApplied: 0,
        evaluatedBy: 'auto',
      },
    },
    showResultMode: 'immediate',
    resultPublishedToStudent: true,
    riskLevel,
    integrityScore: riskLevel === 'high' ? 40 : 100,
    violationCount: riskLevel === 'high' ? 3 : 0,
  };
}

test('computeTestAnalytics matches raw submission stats, distribution, and hardest questions', () => {
  const attempts = [
    makeAttempt('a1', 's1', 10, 100, true, 600, 'correct', 'correct', 'low'),
    makeAttempt('a2', 's2', 5, 50, true, 900, 'correct', 'wrong', 'high'),
    makeAttempt('a3', 's3', 0, 0, false, 300, 'wrong', 'wrong', 'low'),
  ];

  const stats = computeTestAnalytics(sampleTest, sampleQuestions, attempts);
  assert.equal(stats.submissionCount, 3);
  assert.equal(stats.averagePercent, 50);
  assert.equal(stats.highestPercent, 100);
  assert.equal(stats.lowestPercent, 0);
  assert.equal(stats.passRate, 67);
  assert.equal(stats.averageTimeSeconds, 600);
  assert.equal(stats.highRiskCount, 1);

  // Q1: 2/3 correct (67%), Q2: 1/3 correct (33%) -> Q2 must be hardest
  assert.equal(stats.questionStats[0].accuracyPercent, 67);
  assert.equal(stats.questionStats[1].accuracyPercent, 33);
  assert.equal(stats.hardestQuestions[0].questionId, 'q2');

  const csv = serializeTestAnalyticsToCsv(stats, attempts);
  assert.match(csv, /DSA Midterm/);
  assert.match(csv, /Student s2/);

  const comparison = computeClassComparison([sampleTest], attempts);
  assert.equal(comparison.length, 1);
  assert.equal(comparison[0].averagePercent, 50);
});

test('computeStudentRank handles ties and best-attempt selection fairly', () => {
  const res = computeStudentRank('s2', [
    { studentId: 's1', score: 10, percentage: 100 },
    { studentId: 's2', score: 8, percentage: 80 },
    { studentId: 's3', score: 8, percentage: 80 },
    { studentId: 's4', score: 5, percentage: 50 },
  ]);
  assert.equal(res.rank, 2);
  assert.equal(res.totalStudents, 4);
});

test('computeStudentAnalytics builds chronological progress, topic rings, and weak topics', () => {
  const results: StudentResultItem[] = [
    {
      id: 'r2',
      testId: 't2',
      testTitle: 'Test 2',
      subject: 'DSA',
      date: '2026-11-21T10:00:00.000Z',
      score: 9,
      totalMarks: 10,
      percentage: 90,
      rank: 1,
      totalStudents: 20,
      showRank: true,
      topicBreakdown: [
        { topic: 'Trees', percentage: 95 },
        { topic: 'Dynamic Programming', percentage: 40 },
      ],
      status: 'distinction',
    },
    {
      id: 'r1',
      testId: 't1',
      testTitle: 'Test 1',
      subject: 'DSA',
      date: '2026-11-18T10:00:00.000Z',
      score: 6,
      totalMarks: 10,
      percentage: 60,
      rank: 8,
      totalStudents: 20,
      showRank: false,
      topicBreakdown: [{ topic: 'Dynamic Programming', percentage: 50 }],
      status: 'passed',
    },
  ];

  const analytics = computeStudentAnalytics(results);
  assert.equal(analytics.averagePercentage, 75);
  assert.equal(analytics.progressOverTime[0].testId, 't1');
  assert.equal(analytics.progressOverTime[0].rank, undefined); // showRank=false
  assert.equal(analytics.progressOverTime[1].rank, 1); // showRank=true
  assert.equal(analytics.weakTopics.length, 1);
  assert.equal(analytics.weakTopics[0].topic, 'Dynamic Programming');
  assert.equal(analytics.weakTopics[0].accuracyPercent, 45);
});
