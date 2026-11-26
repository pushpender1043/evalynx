import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  validatePassword,
  validateFullName,
  validateTestJoinCode,
  normalizeTestCode,
  validateDraftTestInput,
} from './validators';
import {
  classifyIntegrityRisk,
  computeCountdown,
  filterTests,
  computeProfessorStats,
  serializeTestsToCsv,
} from './analytics';
import type { TestItem } from '../types';

const sampleTests: TestItem[] = [
  {
    id: 't1',
    title: 'DSA Mid-Sem: Trees & Graphs',
    subject: 'CS-204 Data Structures',
    category: 'DSA',
    code: 'DSA-402',
    professorId: 'prof-1',
    professorName: 'Dr. Ananya Deshmukh',
    published: true,
    status: 'live',
    scheduledAt: '2026-11-21T10:00:00.000Z',
    startTime: '2026-11-21T10:00:00.000Z',
    endTime: '2026-11-28T10:00:00.000Z',
    durationMinutes: 90,
    totalMarks: 100,
    passingMarks: 40,
    questionCount: 40,
    enrolledCount: 118,
    submittedCount: 64,
    averageScore: 78.4,
    settings: {
      durationMinutes: 90,
      startTime: '2026-11-21T10:00:00.000Z',
      endTime: '2026-11-28T10:00:00.000Z',
      shuffleQuestions: false,
      shuffleOptions: false,
      negativeMarking: false,
      attemptLimit: 1,
      showResultMode: 'immediate',
      passingMarks: 40,
    },
    proctoring: {
      enabled: true,
      fullscreenRequired: true,
      maxTabSwitches: 2,
      blockCopyPaste: true,
      webcamEnabled: true,
      autoSubmitOnLimit: true,
    },
  },
  {
    id: 't2',
    title: 'Quantitative Aptitude Placement Mock',
    subject: 'TP-101 Career Readiness',
    category: 'Aptitude',
    code: 'APT-205',
    professorId: 'prof-1',
    professorName: 'Dr. Ananya Deshmukh',
    published: true,
    status: 'completed',
    scheduledAt: '2026-11-15T09:00:00.000Z',
    startTime: '2026-11-15T09:00:00.000Z',
    endTime: '2026-11-16T09:00:00.000Z',
    durationMinutes: 60,
    totalMarks: 60,
    passingMarks: 24,
    questionCount: 30,
    enrolledCount: 142,
    submittedCount: 139,
    averageScore: 81.6,
    settings: {
      durationMinutes: 60,
      startTime: '2026-11-15T09:00:00.000Z',
      endTime: '2026-11-16T09:00:00.000Z',
      shuffleQuestions: true,
      shuffleOptions: true,
      negativeMarking: true,
      attemptLimit: 1,
      showResultMode: 'after_review',
      passingMarks: 24,
    },
    proctoring: {
      enabled: true,
      fullscreenRequired: true,
      maxTabSwitches: 3,
      blockCopyPaste: true,
      webcamEnabled: false,
      autoSubmitOnLimit: true,
    },
  },
];

test('validateEmail accepts valid institutional emails and rejects malformed input', () => {
  assert.equal(validateEmail('ananya.deshmukh@iitb.ac.in').valid, true);
  assert.equal(validateEmail('').valid, false);
  assert.equal(validateEmail('not-an-email').valid, false);
});

test('validatePassword enforces minimum length', () => {
  assert.equal(validatePassword('secret123').valid, true);
  assert.equal(validatePassword('12345').valid, false);
  assert.equal(validatePassword('').valid, false);
});

test('validateFullName enforces bounds', () => {
  assert.equal(validateFullName('Rohan Kulkarni').valid, true);
  assert.equal(validateFullName('A').valid, false);
  assert.equal(validateFullName('   ').valid, false);
});

test('validateTestJoinCode normalizes and validates exam codes', () => {
  assert.equal(normalizeTestCode(' dsa-402 '), 'DSA-402');
  assert.equal(validateTestJoinCode('dsa-402').valid, true);
  assert.equal(validateTestJoinCode('APT-205').valid, true);
  assert.equal(validateTestJoinCode('KX7M2P').valid, true);
  assert.equal(validateTestJoinCode('12345').valid, false);
  assert.equal(validateTestJoinCode('').valid, false);
});

test('validateDraftTestInput rejects invalid test creation fields', () => {
  const errors = validateDraftTestInput({
    title: 'Hi',
    subject: '',
    durationMinutes: 5,
    totalMarks: 999,
  });
  assert.ok(errors.title);
  assert.ok(errors.subject);
  assert.ok(errors.durationMinutes);
  assert.ok(errors.totalMarks);

  const ok = validateDraftTestInput({
    title: 'Operating Systems Quiz 3',
    subject: 'CS-301 Operating Systems',
    durationMinutes: 45,
    totalMarks: 50,
  });
  assert.equal(Object.keys(ok).length, 0);
});

test('classifyIntegrityRisk maps scores to low, medium, high thresholds', () => {
  assert.equal(classifyIntegrityRisk(88), 'high');
  assert.equal(classifyIntegrityRisk(70), 'high');
  assert.equal(classifyIntegrityRisk(55), 'medium');
  assert.equal(classifyIntegrityRisk(20), 'low');
});

test('computeCountdown formats future durations and marks elapsed times as Live Now', () => {
  const now = new Date('2026-11-20T10:00:00.000Z').getTime();
  const future = computeCountdown('2026-11-20T12:30:15.000Z', now);
  assert.equal(future.isExpired, false);
  assert.equal(future.hours, 2);
  assert.equal(future.minutes, 30);
  assert.equal(future.seconds, 15);
  assert.equal(future.label, '02h 30m 15s');

  const past = computeCountdown('2026-11-20T09:00:00.000Z', now);
  assert.equal(past.isExpired, true);
  assert.equal(past.label, 'Live Now');
});

test('filterTests filters by status and search text', () => {
  assert.equal(filterTests(sampleTests, 'all', '').length, 2);
  assert.equal(filterTests(sampleTests, 'live', '').length, 1);
  assert.equal(filterTests(sampleTests, 'all', 'APT-205').length, 1);
  assert.equal(filterTests(sampleTests, 'draft', 'DSA').length, 0);
});

test('computeProfessorStats returns zeroes on empty data and accurate aggregates on real data', () => {
  const emptyStats = computeProfessorStats([]);
  assert.equal(emptyStats.totalTests, 0);
  assert.equal(emptyStats.activeTests, 0);
  assert.equal(emptyStats.totalStudents, 0);
  assert.equal(emptyStats.averageScore, 0);

  const stats = computeProfessorStats(sampleTests);
  assert.equal(stats.totalTests, 2);
  assert.equal(stats.activeTests, 1);
  assert.equal(stats.totalStudents, 260);
  assert.equal(stats.averageScore, 80);

  const csv = serializeTestsToCsv(sampleTests);
  assert.ok(csv.includes('DSA-402'));
  assert.ok(csv.includes('APT-205'));
});
