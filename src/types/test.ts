import type { RiskLevel } from './result';

export type TestStatus = 'draft' | 'scheduled' | 'live' | 'completed';

export type TestCategory = 'DSA' | 'Aptitude' | 'Core CS' | 'Mathematics' | 'Coding';

export type ShowResultMode = 'immediate' | 'after_review';

export type ViolationType =
  | 'tab_switch'
  | 'window_blur'
  | 'fullscreen_exit'
  | 'copy'
  | 'paste'
  | 'cut'
  | 'right_click'
  | 'shortcut_blocked'
  | 'page_reload';

export interface ProctoringPolicy {
  enabled: boolean;
  fullscreenRequired: boolean;
  maxTabSwitches: number;
  blockCopyPaste: boolean;
  webcamEnabled: boolean;
  autoSubmitOnLimit: boolean;
}

export interface TestSettings {
  durationMinutes: number;
  startTime: string;
  endTime: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  negativeMarking: boolean;
  attemptLimit: number;
  showResultMode: ShowResultMode;
  passingMarks: number;
  showRankToStudents?: boolean;
}

export interface TestItem {
  id: string;
  title: string;
  subject: string;
  description?: string;
  instructions?: string;
  category: TestCategory;
  code: string;
  professorId: string;
  professorName: string;
  published: boolean;
  status: TestStatus;
  scheduledAt: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  questionCount: number;
  enrolledCount: number;
  submittedCount: number;
  averageScore?: number;
  joinedStudentIds?: string[];
  settings: TestSettings;
  proctoring: ProctoringPolicy;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttemptAnswer {
  selectedOptionIds?: string[];
  textAnswer?: string;
  updatedAtMs: number;
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'auto_submitted' | 'evaluated';

export interface QuestionGradeDetail {
  questionId: string;
  type: 'mcq' | 'multi_select' | 'true_false' | 'short_answer' | 'long_answer';
  outcome: 'correct' | 'wrong' | 'skipped' | 'pending_review';
  marksAwarded: number;
  maxMarks: number;
  negativeApplied: number;
  feedback?: string;
  evaluatedBy: 'auto' | 'professor' | 'pending';
}

export interface AttemptViolation {
  id: string;
  attemptId: string;
  testId: string;
  studentId: string;
  professorId: string;
  type: ViolationType;
  label: string;
  details?: string;
  questionNumber: number;
  strikeNumber: number;
  timestampMs: number;
  timestampIso: string;
}

export interface TestAttempt {
  id: string;
  testId: string;
  testTitle: string;
  testCode: string;
  subject: string;
  professorId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAtMs: number;
  durationMinutes: number;
  submittedAtMs?: number;
  timeTakenSeconds?: number;
  questionOrder: string[];
  optionOrders: Record<string, string[]>;
  answers: Record<string, AttemptAnswer>;
  flaggedQuestionIds: string[];
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  pendingReviewCount: number;
  questionGrades: Record<string, QuestionGradeDetail>;
  showResultMode: ShowResultMode;
  resultPublishedToStudent: boolean;
  // Day 3 Proctoring & Integrity fields
  proctoringEnabled?: boolean;
  violationCount?: number;
  tabSwitchCount?: number;
  integrityScore?: number;
  riskLevel?: RiskLevel;
  primaryViolationReason?: string;
  autoSubmitReason?: string;
  professorFlagged?: boolean;
  professorFlagCleared?: boolean;
  professorFlagNote?: string;
  professorReviewedAtMs?: number;
}
