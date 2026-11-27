import test from 'node:test';
import assert from 'node:assert/strict';
import type { BuilderQuestion } from '../types';
import { validateTestForPublish, validateTestPublishIssues } from './testValidation';

function makeValidQuestions(): BuilderQuestion[] {
  return [
    {
      id: 'q1',
      order: 0,
      type: 'mcq',
      prompt: 'What is the time complexity of binary search?',
      options: [
        { id: 'a', text: 'O(1)' },
        { id: 'b', text: 'O(log n)' },
      ],
      correctAnswers: ['b'],
      marks: 4,
      negativeMarks: 1,
      difficulty: 'easy',
      topic: 'Searching',
      explanation: 'Halves search space each step.',
    },
    {
      id: 'q2',
      order: 1,
      type: 'multi_select',
      prompt: 'Select stable sorting algorithms.',
      options: [
        { id: 'a', text: 'Merge Sort' },
        { id: 'b', text: 'Insertion Sort' },
        { id: 'c', text: 'Heap Sort' },
      ],
      correctAnswers: ['a', 'b'],
      marks: 4,
      negativeMarks: 0,
      difficulty: 'medium',
      topic: 'Sorting',
      explanation: 'Merge and Insertion sort preserve equal element order.',
    },
    {
      id: 'q3',
      order: 2,
      type: 'true_false',
      prompt: 'BFS uses a queue.',
      options: [
        { id: 't', text: 'True' },
        { id: 'f', text: 'False' },
      ],
      correctAnswers: ['t'],
      marks: 2,
      negativeMarks: 0,
      difficulty: 'easy',
      topic: 'Graphs',
      explanation: '',
    },
    {
      id: 'q4',
      order: 3,
      type: 'long_answer',
      prompt: 'Explain amortized analysis for dynamic arrays.',
      options: [],
      correctAnswers: [],
      marks: 5,
      negativeMarks: 0,
      difficulty: 'hard',
      topic: 'Amortized Analysis',
      explanation: '',
      rubric: '3 pts aggregate bound, 2 pts potential function.',
    },
  ];
}

test('validateTestPublishIssues passes for valid test with full or open-ended schedule', () => {
  const full = validateTestPublishIssues({
    title: 'DSA Midterm',
    subject: 'CS301',
    durationMinutes: 60,
    startTime: '2026-12-01T10:00:00.000Z',
    endTime: '2026-12-01T12:00:00.000Z',
    attemptLimit: 1,
    passingMarks: 6,
    questions: makeValidQuestions(),
  });
  assert.equal(full.length, 0);

  const openEnded = validateTestPublishIssues({
    title: 'DSA Practice Quiz',
    subject: 'CS301',
    durationMinutes: 30,
    startTime: '2026-12-01T10:00:00.000Z',
    endTime: null,
    attemptLimit: 2,
    passingMarks: 5,
    questions: makeValidQuestions(),
  });
  assert.equal(openEnded.length, 0);

  const unscheduled = validateTestPublishIssues({
    title: 'Unscheduled Practice',
    subject: 'CS301',
    durationMinutes: 20,
    startTime: '',
    endTime: '',
    attemptLimit: 1,
    passingMarks: 0,
    questions: makeValidQuestions(),
  });
  assert.equal(unscheduled.length, 0);
});

test('validateTestPublishIssues blocks missing title, empty questions, and invalid schedule', () => {
  const issues = validateTestPublishIssues({
    title: '  ',
    subject: 'CS301',
    durationMinutes: 45,
    startTime: '2026-12-01T14:00:00.000Z',
    endTime: '2026-12-01T12:00:00.000Z',
    attemptLimit: 1,
    passingMarks: 0,
    questions: [],
  });

  assert.ok(issues.some((i) => i.step === 0 && i.field === 'title'));
  assert.ok(issues.some((i) => i.step === 1 && i.field === 'questions'));
  assert.ok(issues.some((i) => i.step === 2 && i.field === 'endTime'));
});

test('validateTestForPublish flags objective questions missing answers, empty prompts, and zero marks', () => {
  const badQuestions: BuilderQuestion[] = [
    {
      id: 'q1',
      order: 0,
      type: 'mcq',
      prompt: '',
      options: [
        { id: 'a', text: 'Only one option' },
        { id: 'b', text: '' },
      ],
      correctAnswers: [],
      marks: 0,
      negativeMarks: 0,
      difficulty: 'easy',
      topic: 'General',
      explanation: '',
    },
    {
      id: 'q2',
      order: 1,
      type: 'true_false',
      prompt: 'Is 2 + 2 = 4?',
      options: [
        { id: 't', text: 'True' },
        { id: 'f', text: 'False' },
      ],
      correctAnswers: [],
      marks: 2,
      negativeMarks: 0,
      difficulty: 'easy',
      topic: 'Math',
      explanation: '',
    },
    {
      id: 'q3',
      order: 2,
      type: 'multi_select',
      prompt: 'Choose primes',
      options: [
        { id: 'a', text: '2' },
        { id: 'b', text: '3' },
      ],
      correctAnswers: [],
      marks: 3,
      negativeMarks: 0,
      difficulty: 'easy',
      topic: 'Math',
      explanation: '',
    },
  ];

  const messages = validateTestForPublish({
    title: 'Validation Suite',
    subject: 'Math',
    durationMinutes: 30,
    startTime: null,
    endTime: null,
    attemptLimit: 1,
    passingMarks: 10, // exceeds total marks (5)
    questions: badQuestions,
  });

  assert.ok(messages.some((m) => m.includes('Question 1: Question text is required')));
  assert.ok(messages.some((m) => m.includes('Question 1: Marks must be greater than 0')));
  assert.ok(messages.some((m) => m.includes('Question 1: Provide at least 2 non-empty')));
  assert.ok(messages.some((m) => m.includes('Question 2: Select True or False')));
  assert.ok(messages.some((m) => m.includes('Question 3: Select at least one correct answer')));
  assert.ok(messages.some((m) => m.includes('Passing marks must be between 0 and total marks')));
});
