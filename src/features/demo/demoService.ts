import { normalizeTestCode } from '../../lib/validators';
import type {
  AppNotification,
  AttemptViolation,
  BuilderQuestion,
  IntegrityAlert,
  PerformancePoint,
  PublicQuestion,
  QuestionAnswerKeyEntry,
  QuestionBankItem,
  StudentResultItem,
  SubmissionSummary,
  TestAttempt,
  TestItem,
  TopicMastery,
  UserProfile,
} from '../../types';
import {
  DEMO_ATTEMPTS,
  DEMO_INTEGRITY_ALERTS,
  DEMO_PERFORMANCE_TREND,
  DEMO_PROFESSOR_NOTIFICATIONS,
  DEMO_PROFESSOR_SUBMISSIONS,
  DEMO_PROFESSOR_USER,
  DEMO_QUESTION_BANK,
  DEMO_QUESTIONS_BY_TEST,
  DEMO_STUDENT_NOTIFICATIONS,
  DEMO_STUDENT_RESULTS,
  DEMO_STUDENT_TOPIC_MASTERY,
  DEMO_STUDENT_USER,
  DEMO_TESTS,
  DEMO_VIOLATIONS_BY_ATTEMPT,
  getDemoAnswerKey,
} from './demoData';
import type { DemoRole } from './demoStore';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toPublicQuestion(q: BuilderQuestion): PublicQuestion {
  return {
    id: q.id,
    order: q.order,
    type: q.type,
    prompt: q.prompt,
    imageUrl: q.imageUrl,
    options: clone(q.options),
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    difficulty: q.difficulty,
    topic: q.topic,
    rubric: q.rubric,
  };
}

export const demoService = {
  getDemoUser(role: DemoRole): UserProfile {
    return clone(role === 'professor' ? DEMO_PROFESSOR_USER : DEMO_STUDENT_USER);
  },

  listTestsForUser(role: DemoRole): TestItem[] {
    if (role === 'professor') {
      return clone(DEMO_TESTS);
    }
    return clone(DEMO_TESTS.filter((t) => t.published));
  },

  getTestById(testId: string): TestItem | null {
    const found = DEMO_TESTS.find((t) => t.id === testId);
    return found ? clone(found) : null;
  },

  findTestByCode(rawCode: string): TestItem | null {
    const normalized = normalizeTestCode(rawCode);
    const found = DEMO_TESTS.find((t) => t.code.toUpperCase() === normalized);
    return found ? clone(found) : null;
  },

  getTestQuestionsPublic(testId: string): PublicQuestion[] {
    const qs = DEMO_QUESTIONS_BY_TEST[testId] ?? [];
    return qs.map(toPublicQuestion);
  },

  getTestAnswerKey(testId: string): Record<string, QuestionAnswerKeyEntry> {
    return getDemoAnswerKey(testId);
  },

  getTestWithPrivateKey(testId: string): { test: TestItem; questions: BuilderQuestion[] } | null {
    const test = this.getTestById(testId);
    if (!test) return null;
    const questions = clone(DEMO_QUESTIONS_BY_TEST[testId] ?? []);
    return { test, questions };
  },

  getProfessorDashboardData(): {
    submissions: SubmissionSummary[];
    performanceTrend: PerformancePoint[];
  } {
    return {
      submissions: clone(DEMO_PROFESSOR_SUBMISSIONS),
      performanceTrend: clone(DEMO_PERFORMANCE_TREND),
    };
  },

  getStudentDashboardData(): {
    topicMastery: TopicMastery[];
    recentResults: StudentResultItem[];
  } {
    return {
      topicMastery: clone(DEMO_STUDENT_TOPIC_MASTERY),
      recentResults: clone(DEMO_STUDENT_RESULTS),
    };
  },

  getStudentAllResults(): StudentResultItem[] {
    return clone(DEMO_STUDENT_RESULTS);
  },

  getNotifications(role: DemoRole): AppNotification[] {
    return clone(role === 'professor' ? DEMO_PROFESSOR_NOTIFICATIONS : DEMO_STUDENT_NOTIFICATIONS);
  },

  getIntegrityAlerts(): IntegrityAlert[] {
    return clone(DEMO_INTEGRITY_ALERTS);
  },

  getStudentAttemptsForTest(testId: string): TestAttempt[] {
    return clone(
      DEMO_ATTEMPTS.filter(
        (a) => a.testId === testId && a.studentId === DEMO_STUDENT_USER.uid
      )
    );
  },

  listTestSubmissions(testId: string): TestAttempt[] {
    return clone(DEMO_ATTEMPTS.filter((a) => a.testId === testId));
  },

  listAllProfessorAttempts(): TestAttempt[] {
    return clone(DEMO_ATTEMPTS);
  },

  listAttemptViolations(attemptId: string): AttemptViolation[] {
    return clone(DEMO_VIOLATIONS_BY_ATTEMPT[attemptId] ?? []);
  },

  getStudentRankForTest(testId: string, studentId: string): { rank: number; totalStudents: number } {
    const submissions = DEMO_ATTEMPTS.filter(
      (a) => a.testId === testId && a.status !== 'in_progress'
    );
    if (submissions.length === 0) return { rank: 0, totalStudents: 0 };
    const sorted = [...submissions].sort((a, b) => b.percentage - a.percentage);
    const mine = sorted.find((s) => s.studentId === studentId);
    if (!mine) return { rank: 0, totalStudents: sorted.length };
    const better = sorted.filter((s) => s.percentage > mine.percentage).length;
    return { rank: better + 1, totalStudents: sorted.length };
  },

  loadResultDetail(
    attemptId: string,
    viewerRole: 'professor' | 'student'
  ): {
    attempt: TestAttempt;
    test: TestItem;
    questions: PublicQuestion[];
    answerKey: Record<string, QuestionAnswerKeyEntry> | null;
  } {
    const attempt = DEMO_ATTEMPTS.find((a) => a.id === attemptId);
    if (!attempt) {
      throw new Error('Demo submission not found.');
    }
    const test = this.getTestById(attempt.testId);
    if (!test) {
      throw new Error('Demo assessment not found.');
    }
    const questions = this.getTestQuestionsPublic(test.id);
    const answerKey =
      viewerRole === 'professor' || attempt.status === 'evaluated'
        ? this.getTestAnswerKey(test.id)
        : null;
    return { attempt: clone(attempt), test, questions, answerKey };
  },

  listProfessorBank(): QuestionBankItem[] {
    return clone(DEMO_QUESTION_BANK);
  },
};
