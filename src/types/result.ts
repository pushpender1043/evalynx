export type RiskLevel = 'low' | 'medium' | 'high';

export interface SubmissionSummary {
  id: string;
  testId: string;
  testTitle: string;
  studentId: string;
  studentName: string;
  enrollmentId: string;
  submittedAt: string;
  score: number | null;
  totalMarks: number;
  status: 'pending_eval' | 'evaluated';
  tabSwitches: number;
}

export interface IntegrityAlert {
  id: string;
  attemptId: string;
  testId: string;
  studentId: string;
  studentName: string;
  enrollmentId: string;
  testTitle: string;
  integrityScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  primaryReason: string;
  violationCount: number;
  flaggedAt: string;
  reviewed: boolean;
  professorFlagged?: boolean;
  professorFlagCleared?: boolean;
  professorFlagNote?: string;
  isSample?: boolean;
}

export interface PerformancePoint {
  testShortName: string;
  fullTitle: string;
  classAverage: number;
  highestScore: number;
  passRate: number;
}

export interface ScoreDistributionBucket {
  range: string;
  count: number;
  percentage: number;
}

export interface QuestionAccuracyStat {
  questionId: string;
  questionNumber: number;
  prompt: string;
  topic: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  maxMarks: number;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  pendingCount: number;
  accuracyPercent: number;
}

export interface PerTestAnalytics {
  testId: string;
  testTitle: string;
  subject: string;
  submissionCount: number;
  evaluatedCount: number;
  averagePercent: number;
  averageMarks: number;
  totalMarks: number;
  highestPercent: number;
  highestMarks: number;
  lowestPercent: number;
  lowestMarks: number;
  passRate: number;
  averageTimeSeconds: number;
  highRiskCount: number;
  flaggedCount: number;
  scoreDistribution: ScoreDistributionBucket[];
  questionStats: QuestionAccuracyStat[];
  hardestQuestions: QuestionAccuracyStat[];
}

export interface ClassComparisonPoint {
  testId: string;
  testShortName: string;
  fullTitle: string;
  subject: string;
  submissionCount: number;
  averagePercent: number;
  highestPercent: number;
  lowestPercent: number;
  passRate: number;
}

export interface StudentProgressPoint {
  attemptId: string;
  testId: string;
  testShortName: string;
  testTitle: string;
  subject: string;
  dateLabel: string;
  dateIso: string;
  score: number;
  totalMarks: number;
  percentage: number;
  rank?: number;
  totalStudents?: number;
  showRank?: boolean;
}

export interface TopicMastery {
  id: string;
  topic: string;
  subject: string;
  masteryPercent: number;
  testsTaken: number;
  accent: 'purple' | 'mint' | 'amber';
}

export interface StudentResultItem {
  id: string;
  testId: string;
  testTitle: string;
  subject: string;
  date: string;
  score: number;
  totalMarks: number;
  percentage: number;
  rank: number;
  totalStudents: number;
  showRank?: boolean;
  topicBreakdown?: Array<{ topic: string; percentage: number }>;
  status: 'passed' | 'distinction' | 'needs_review';
}

export interface LeaderboardEntry {
  rank: number;
  studentName: string;
  enrollmentId: string;
  avgScore: number;
  testsCompleted: number;
  isCurrentUser?: boolean;
}

export interface WeakTopicItem {
  topic: string;
  subject: string;
  accuracyPercent: number;
  testsTaken: number;
  recommendedQuestions: number;
}

export interface AppNotification {
  id: string;
  role: 'professor' | 'student' | 'all';
  title: string;
  message: string;
  category: 'test' | 'result' | 'integrity' | 'system';
  timeAgo: string;
  read: boolean;
}
