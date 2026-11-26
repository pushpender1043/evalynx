import type {
  ClassComparisonPoint,
  PerTestAnalytics,
  PublicQuestion,
  QuestionAccuracyStat,
  RiskLevel,
  ScoreDistributionBucket,
  StudentProgressPoint,
  StudentResultItem,
  TestAttempt,
  TestItem,
  TestStatus,
  TopicMastery,
  WeakTopicItem,
} from '../types';

export function classifyIntegrityRisk(score: number): RiskLevel {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export interface CountdownParts {
  isExpired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
}

export function computeCountdown(targetIso: string, nowMs: number = Date.now()): CountdownParts {
  const targetMs = new Date(targetIso).getTime();
  const diffMs = targetMs - nowMs;

  if (Number.isNaN(targetMs) || diffMs <= 0) {
    return {
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: 'Live Now',
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const label =
    days > 0
      ? `${days}d ${pad(hours)}h ${pad(minutes)}m`
      : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  return { isExpired: false, days, hours, minutes, seconds, label };
}

export function filterTests(
  tests: TestItem[],
  statusFilter: TestStatus | 'all',
  searchQuery: string
): TestItem[] {
  const q = searchQuery.trim().toLowerCase();
  return tests.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.subject.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });
}

export function computeProfessorStats(tests: TestItem[]) {
  const totalTests = tests.length;
  const activeTests = tests.filter((t) => t.status === 'live' || t.status === 'scheduled').length;
  const totalStudents = tests.reduce((sum, t) => sum + (t.enrolledCount || 0), 0);
  const scoredTests = tests.filter((t) => typeof t.averageScore === 'number');
  const averageScore =
    scoredTests.length > 0
      ? Math.round(
          (scoredTests.reduce((acc, t) => acc + (t.averageScore ?? 0), 0) / scoredTests.length) * 10
        ) / 10
      : 0;

  return {
    totalTests,
    activeTests,
    totalStudents,
    averageScore,
  };
}

function roundOneDecimal(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function computeTestAnalytics(
  test: TestItem,
  questions: PublicQuestion[],
  allAttempts: TestAttempt[]
): PerTestAnalytics {
  const completed = allAttempts.filter((a) => a.status !== 'in_progress');
  const evaluated = completed.filter((a) => a.status === 'evaluated');
  const submissionCount = completed.length;

  const distributionBuckets: Array<{ range: string; min: number; max: number; count: number }> = [
    { range: '0-20%', min: 0, max: 20, count: 0 },
    { range: '21-40%', min: 21, max: 40, count: 0 },
    { range: '41-60%', min: 41, max: 60, count: 0 },
    { range: '61-80%', min: 61, max: 80, count: 0 },
    { range: '81-100%', min: 81, max: 100, count: 0 },
  ];

  let sumPct = 0;
  let sumMarks = 0;
  let highestPercent = 0;
  let highestMarks = 0;
  let lowestPercent = submissionCount > 0 ? 100 : 0;
  let lowestMarks = submissionCount > 0 ? test.totalMarks : 0;
  let passedCount = 0;
  let sumTime = 0;
  let timedCount = 0;
  let highRiskCount = 0;
  let flaggedCount = 0;

  completed.forEach((att, idx) => {
    const pct = Math.max(0, Math.min(100, att.percentage));
    sumPct += pct;
    sumMarks += att.score;

    if (idx === 0 || pct > highestPercent) highestPercent = pct;
    if (idx === 0 || att.score > highestMarks) highestMarks = att.score;
    if (idx === 0 || pct < lowestPercent) lowestPercent = pct;
    if (idx === 0 || att.score < lowestMarks) lowestMarks = att.score;

    if (att.passed) passedCount += 1;
    if (typeof att.timeTakenSeconds === 'number' && att.timeTakenSeconds > 0) {
      sumTime += att.timeTakenSeconds;
      timedCount += 1;
    }
    if (att.riskLevel === 'high' && !att.professorFlagCleared) highRiskCount += 1;
    if (att.professorFlagged && !att.professorFlagCleared) flaggedCount += 1;

    const bucket =
      distributionBuckets.find((b) => pct >= b.min && pct <= b.max) ??
      distributionBuckets[pct <= 20 ? 0 : distributionBuckets.length - 1];
    bucket.count += 1;
  });

  const scoreDistribution: ScoreDistributionBucket[] = distributionBuckets.map((b) => ({
    range: b.range,
    count: b.count,
    percentage: submissionCount > 0 ? Math.round((b.count / submissionCount) * 100) : 0,
  }));

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  const questionStats: QuestionAccuracyStat[] = sortedQuestions.map((q, idx) => {
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let pendingCount = 0;
    let gradedResponses = 0;

    completed.forEach((att) => {
      const grade = att.questionGrades?.[q.id];
      if (!grade) {
        skippedCount += 1;
        return;
      }
      if (grade.outcome === 'correct') {
        correctCount += 1;
        gradedResponses += 1;
      } else if (grade.outcome === 'wrong') {
        wrongCount += 1;
        gradedResponses += 1;
      } else if (grade.outcome === 'pending_review') {
        pendingCount += 1;
      } else {
        skippedCount += 1;
        gradedResponses += 1;
      }
    });

    const denominator = gradedResponses > 0 ? gradedResponses : submissionCount;
    const accuracyPercent = denominator > 0 ? Math.round((correctCount / denominator) * 100) : 0;

    return {
      questionId: q.id,
      questionNumber: idx + 1,
      prompt: q.prompt,
      topic: q.topic || 'General',
      type: q.type,
      difficulty: q.difficulty,
      maxMarks: q.marks,
      attempts: submissionCount,
      correctCount,
      wrongCount,
      skippedCount,
      pendingCount,
      accuracyPercent,
    };
  });

  const hardestQuestions =
    submissionCount > 0
      ? [...questionStats]
          .sort((a, b) => a.accuracyPercent - b.accuracyPercent || b.wrongCount - a.wrongCount)
          .slice(0, 5)
      : [];

  return {
    testId: test.id,
    testTitle: test.title,
    subject: test.subject,
    submissionCount,
    evaluatedCount: evaluated.length,
    averagePercent: submissionCount > 0 ? roundOneDecimal(sumPct / submissionCount) : 0,
    averageMarks: submissionCount > 0 ? roundOneDecimal(sumMarks / submissionCount) : 0,
    totalMarks: test.totalMarks,
    highestPercent: submissionCount > 0 ? roundOneDecimal(highestPercent) : 0,
    highestMarks: submissionCount > 0 ? roundOneDecimal(highestMarks) : 0,
    lowestPercent: submissionCount > 0 ? roundOneDecimal(lowestPercent) : 0,
    lowestMarks: submissionCount > 0 ? roundOneDecimal(lowestMarks) : 0,
    passRate: submissionCount > 0 ? Math.round((passedCount / submissionCount) * 100) : 0,
    averageTimeSeconds: timedCount > 0 ? Math.round(sumTime / timedCount) : 0,
    highRiskCount,
    flaggedCount,
    scoreDistribution,
    questionStats,
    hardestQuestions,
  };
}

export function computeClassComparison(
  tests: TestItem[],
  allAttempts: TestAttempt[]
): ClassComparisonPoint[] {
  const byTest = new Map<string, TestAttempt[]>();
  allAttempts.forEach((a) => {
    if (a.status === 'in_progress') return;
    const list = byTest.get(a.testId) ?? [];
    list.push(a);
    byTest.set(a.testId, list);
  });

  const points: ClassComparisonPoint[] = [];
  tests.forEach((t) => {
    const subs = byTest.get(t.id) ?? [];
    if (subs.length === 0) return;
    const avg = roundOneDecimal(subs.reduce((s, a) => s + a.percentage, 0) / subs.length);
    const highest = roundOneDecimal(Math.max(...subs.map((a) => a.percentage)));
    const lowest = roundOneDecimal(Math.min(...subs.map((a) => a.percentage)));
    const passRate = Math.round((subs.filter((a) => a.passed).length / subs.length) * 100);

    points.push({
      testId: t.id,
      testShortName: t.title.length > 16 ? `${t.title.slice(0, 15)}…` : t.title,
      fullTitle: t.title,
      subject: t.subject,
      submissionCount: subs.length,
      averagePercent: avg,
      highestPercent: highest,
      lowestPercent: lowest,
      passRate,
    });
  });

  return points;
}

export function computeStudentRank(
  targetStudentId: string,
  testResults: Array<{ studentId: string; score: number; percentage: number }>
): { rank: number; totalStudents: number } {
  if (testResults.length === 0) return { rank: 0, totalStudents: 0 };

  // Take best result per student for fair ranking
  const bestByStudent = new Map<string, { score: number; percentage: number }>();
  testResults.forEach((r) => {
    const prev = bestByStudent.get(r.studentId);
    if (!prev || r.score > prev.score || (r.score === prev.score && r.percentage > prev.percentage)) {
      bestByStudent.set(r.studentId, { score: r.score, percentage: r.percentage });
    }
  });

  const target = bestByStudent.get(targetStudentId);
  if (!target) return { rank: 0, totalStudents: bestByStudent.size };

  let strictlyBetter = 0;
  bestByStudent.forEach((entry) => {
    if (
      entry.score > target.score ||
      (entry.score === target.score && entry.percentage > target.percentage)
    ) {
      strictlyBetter += 1;
    }
  });

  return {
    rank: strictlyBetter + 1,
    totalStudents: bestByStudent.size,
  };
}

export function computeStudentAnalytics(results: StudentResultItem[]): {
  progressOverTime: StudentProgressPoint[];
  topicMastery: TopicMastery[];
  weakTopics: WeakTopicItem[];
  averagePercentage: number;
} {
  const chronological = [...results].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const progressOverTime: StudentProgressPoint[] = chronological.map((r) => {
    const dt = new Date(r.date);
    const dateLabel = Number.isNaN(dt.getTime())
      ? 'Recent'
      : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return {
      attemptId: r.id,
      testId: r.testId,
      testShortName: r.testTitle.length > 14 ? `${r.testTitle.slice(0, 13)}…` : r.testTitle,
      testTitle: r.testTitle,
      subject: r.subject,
      dateLabel,
      dateIso: r.date,
      score: r.score,
      totalMarks: r.totalMarks,
      percentage: r.percentage,
      rank: r.showRank && r.rank > 0 ? r.rank : undefined,
      totalStudents: r.showRank && r.totalStudents > 0 ? r.totalStudents : undefined,
      showRank: Boolean(r.showRank),
    };
  });

  const topicMap = new Map<string, { subject: string; sum: number; count: number }>();
  results.forEach((r) => {
    (r.topicBreakdown ?? []).forEach((item) => {
      if (!item.topic) return;
      const prev = topicMap.get(item.topic) ?? { subject: r.subject, sum: 0, count: 0 };
      prev.sum += item.percentage;
      prev.count += 1;
      topicMap.set(item.topic, prev);
    });
  });

  const topicMastery: TopicMastery[] = Array.from(topicMap.entries())
    .map(([topic, agg], index) => {
      const pct = Math.round(agg.sum / agg.count);
      const accent: 'mint' | 'purple' | 'amber' =
        pct >= 80 ? 'mint' : pct >= 60 ? 'purple' : 'amber';
      return {
        id: `topic-${index}-${topic.toLowerCase().replace(/\s+/g, '-')}`,
        topic,
        subject: agg.subject,
        masteryPercent: pct,
        testsTaken: agg.count,
        accent,
      };
    })
    .sort((a, b) => b.masteryPercent - a.masteryPercent);

  const weakTopics: WeakTopicItem[] = topicMastery
    .filter((t) => t.masteryPercent < 70)
    .sort((a, b) => a.masteryPercent - b.masteryPercent)
    .map((t) => ({
      topic: t.topic,
      subject: t.subject,
      accuracyPercent: t.masteryPercent,
      testsTaken: t.testsTaken,
      recommendedQuestions: t.masteryPercent < 45 ? 10 : 5,
    }));

  const averagePercentage =
    results.length > 0
      ? roundOneDecimal(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
      : 0;

  return {
    progressOverTime,
    topicMastery,
    weakTopics,
    averagePercentage,
  };
}

function escapeCsvCell(val: string | number | boolean | undefined | null): string {
  const str = val === undefined || val === null ? '' : String(val);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function serializeTestsToCsv(tests: TestItem[]): string {
  const headers = [
    'Code',
    'Title',
    'Subject',
    'Category',
    'Status',
    'Duration (min)',
    'Total Marks',
    'Enrolled',
    'Avg Score (%)',
  ];
  const rows = tests.map((t) =>
    [
      t.code,
      t.title,
      t.subject,
      t.category,
      t.status,
      t.durationMinutes,
      t.totalMarks,
      t.enrolledCount,
      t.averageScore ?? 'N/A',
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function serializeTestAnalyticsToCsv(
  analytics: PerTestAnalytics,
  submissions: TestAttempt[]
): string {
  const lines: string[] = [];

  lines.push('SECTION,Metric,Value');
  lines.push(['SUMMARY', 'Test Title', analytics.testTitle].map(escapeCsvCell).join(','));
  lines.push(['SUMMARY', 'Subject', analytics.subject].map(escapeCsvCell).join(','));
  lines.push(['SUMMARY', 'Submissions', analytics.submissionCount].map(escapeCsvCell).join(','));
  lines.push(
    ['SUMMARY', 'Average Score (%)', `${analytics.averagePercent}%`].map(escapeCsvCell).join(',')
  );
  lines.push(
    ['SUMMARY', 'Highest Score (%)', `${analytics.highestPercent}%`].map(escapeCsvCell).join(',')
  );
  lines.push(
    ['SUMMARY', 'Lowest Score (%)', `${analytics.lowestPercent}%`].map(escapeCsvCell).join(',')
  );
  lines.push(['SUMMARY', 'Pass Rate (%)', `${analytics.passRate}%`].map(escapeCsvCell).join(','));
  lines.push(
    ['SUMMARY', 'Average Time (sec)', analytics.averageTimeSeconds].map(escapeCsvCell).join(',')
  );

  lines.push('');
  lines.push('QUESTION_ANALYTICS,Q#,Topic,Type,Correct,Wrong,Skipped,Accuracy (%)');
  analytics.questionStats.forEach((q) => {
    lines.push(
      [
        'QUESTION',
        `Q${q.questionNumber}`,
        q.topic,
        q.type,
        q.correctCount,
        q.wrongCount,
        q.skippedCount,
        `${q.accuracyPercent}%`,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });

  lines.push('');
  lines.push(
    'SUBMISSIONS,Student Name,Email,Score,Total Marks,Percentage,Passed,Time (sec),Violations,Integrity Score,Risk Level,Flagged'
  );
  submissions
    .filter((s) => s.status !== 'in_progress')
    .forEach((s) => {
      lines.push(
        [
          'SUBMISSION',
          s.studentName,
          s.studentEmail,
          s.score,
          s.totalMarks,
          `${s.percentage}%`,
          s.passed ? 'Yes' : 'No',
          s.timeTakenSeconds ?? 0,
          s.violationCount ?? 0,
          s.integrityScore ?? 100,
          s.riskLevel ?? 'low',
          s.professorFlagged && !s.professorFlagCleared ? 'Yes' : 'No',
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    });

  return lines.join('\n');
}
