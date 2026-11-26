import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  DemoReadOnlyError,
  isDemoModeActive,
  triggerDemoWriteGuard,
} from '../features/demo/demoStore';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { computeEffectiveTestStatus, gradeAttempt, shuffleArray } from '../lib/grading';
import { computeIntegrityMetrics, VIOLATION_LABELS } from '../lib/proctoring';
import type {
  AttemptAnswer,
  AttemptStatus,
  AttemptViolation,
  IntegrityAlert,
  PublicQuestion,
  QuestionAnswerKeyEntry,
  QuestionGradeDetail,
  RiskLevel,
  ShowResultMode,
  TestAttempt,
  TestItem,
  UserProfile,
  ViolationType,
} from '../types';
import { requireFirebaseDb } from './firebase';
import { testService } from './testService';

function toMillis(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const parsed = new Date(val).getTime();
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }
  if (
    val &&
    typeof val === 'object' &&
    'toMillis' in val &&
    typeof (val as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (val as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function mapAttemptDoc(id: string, data: Record<string, unknown>): TestAttempt {
  const status: AttemptStatus =
    data.status === 'submitted' ||
    data.status === 'auto_submitted' ||
    data.status === 'evaluated'
      ? data.status
      : 'in_progress';

  const showResultMode: ShowResultMode =
    data.showResultMode === 'after_review' ? 'after_review' : 'immediate';

  return {
    id,
    testId: typeof data.testId === 'string' ? data.testId : '',
    testTitle: typeof data.testTitle === 'string' ? data.testTitle : 'Assessment',
    testCode: typeof data.testCode === 'string' ? data.testCode : '',
    subject: typeof data.subject === 'string' ? data.subject : '',
    professorId: typeof data.professorId === 'string' ? data.professorId : '',
    studentId: typeof data.studentId === 'string' ? data.studentId : '',
    studentName: typeof data.studentName === 'string' ? data.studentName : 'Student',
    studentEmail: typeof data.studentEmail === 'string' ? data.studentEmail : '',
    attemptNumber: typeof data.attemptNumber === 'number' ? data.attemptNumber : 1,
    status,
    startedAtMs: toMillis(data.startedAt ?? data.startedAtMs),
    durationMinutes: typeof data.durationMinutes === 'number' ? data.durationMinutes : 60,
    submittedAtMs: data.submittedAt ? toMillis(data.submittedAt) : undefined,
    timeTakenSeconds:
      typeof data.timeTakenSeconds === 'number' ? data.timeTakenSeconds : undefined,
    questionOrder: Array.isArray(data.questionOrder) ? (data.questionOrder as string[]) : [],
    optionOrders:
      data.optionOrders && typeof data.optionOrders === 'object'
        ? (data.optionOrders as Record<string, string[]>)
        : {},
    answers:
      data.answers && typeof data.answers === 'object'
        ? (data.answers as Record<string, AttemptAnswer>)
        : {},
    flaggedQuestionIds: Array.isArray(data.flaggedQuestionIds)
      ? (data.flaggedQuestionIds as string[])
      : [],
    score: typeof data.score === 'number' ? data.score : 0,
    totalMarks: typeof data.totalMarks === 'number' ? data.totalMarks : 0,
    percentage: typeof data.percentage === 'number' ? data.percentage : 0,
    passed: Boolean(data.passed),
    correctCount: typeof data.correctCount === 'number' ? data.correctCount : 0,
    wrongCount: typeof data.wrongCount === 'number' ? data.wrongCount : 0,
    skippedCount: typeof data.skippedCount === 'number' ? data.skippedCount : 0,
    pendingReviewCount: typeof data.pendingReviewCount === 'number' ? data.pendingReviewCount : 0,
    questionGrades:
      data.questionGrades && typeof data.questionGrades === 'object'
        ? (data.questionGrades as Record<string, QuestionGradeDetail>)
        : {},
    showResultMode,
    resultPublishedToStudent: Boolean(data.resultPublishedToStudent),
    proctoringEnabled: Boolean(data.proctoringEnabled ?? false),
    violationCount: typeof data.violationCount === 'number' ? data.violationCount : 0,
    tabSwitchCount: typeof data.tabSwitchCount === 'number' ? data.tabSwitchCount : 0,
    integrityScore: typeof data.integrityScore === 'number' ? data.integrityScore : 100,
    riskLevel:
      data.riskLevel === 'high' || data.riskLevel === 'medium' || data.riskLevel === 'low'
        ? (data.riskLevel as RiskLevel)
        : 'low',
    primaryViolationReason:
      typeof data.primaryViolationReason === 'string' ? data.primaryViolationReason : '',
    autoSubmitReason:
      typeof data.autoSubmitReason === 'string' && data.autoSubmitReason
        ? data.autoSubmitReason
        : undefined,
    professorFlagged: Boolean(data.professorFlagged ?? false),
    professorFlagCleared: Boolean(data.professorFlagCleared ?? false),
    professorFlagNote:
      typeof data.professorFlagNote === 'string' ? data.professorFlagNote : '',
    professorReviewedAtMs:
      typeof data.professorReviewedAtMs === 'number' ? data.professorReviewedAtMs : undefined,
  };
}

function mapViolationDoc(
  id: string,
  attemptId: string,
  data: Record<string, unknown>
): AttemptViolation {
  const validTypes = new Set<ViolationType>([
    'tab_switch',
    'window_blur',
    'fullscreen_exit',
    'copy',
    'paste',
    'cut',
    'right_click',
    'shortcut_blocked',
    'page_reload',
  ]);
  const type: ViolationType =
    typeof data.type === 'string' && validTypes.has(data.type as ViolationType)
      ? (data.type as ViolationType)
      : 'tab_switch';
  const timestampMs = toMillis(data.timestampMs ?? data.timestamp);

  return {
    id,
    attemptId,
    testId: typeof data.testId === 'string' ? data.testId : '',
    studentId: typeof data.studentId === 'string' ? data.studentId : '',
    professorId: typeof data.professorId === 'string' ? data.professorId : '',
    type,
    label: typeof data.label === 'string' && data.label ? data.label : VIOLATION_LABELS[type],
    details: typeof data.details === 'string' && data.details ? data.details : undefined,
    questionNumber: typeof data.questionNumber === 'number' ? data.questionNumber : 1,
    strikeNumber: typeof data.strikeNumber === 'number' ? data.strikeNumber : 1,
    timestampMs,
    timestampIso: new Date(timestampMs).toISOString(),
  };
}

function applyAttemptOrdering(
  questions: PublicQuestion[],
  attempt: TestAttempt
): PublicQuestion[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const orderedIds =
    attempt.questionOrder.length > 0
      ? attempt.questionOrder.filter((id) => byId.has(id))
      : questions.map((q) => q.id);

  // Append any question missing from order
  questions.forEach((q) => {
    if (!orderedIds.includes(q.id)) orderedIds.push(q.id);
  });

  return orderedIds.map((id) => {
    const q = byId.get(id)!;
    const optOrder = attempt.optionOrders[id];
    if (!optOrder || optOrder.length === 0 || q.options.length === 0) {
      return q;
    }
    const optById = new Map(q.options.map((o) => [o.id, o]));
    const orderedOpts = optOrder
      .map((oId) => optById.get(oId))
      .filter((o): o is NonNullable<typeof o> => Boolean(o));
    q.options.forEach((o) => {
      if (!orderedOpts.some((x) => x.id === o.id)) orderedOpts.push(o);
    });
    return { ...q, options: orderedOpts };
  });
}

export const attemptService = {
  async getStudentAttemptsForTest(testId: string, studentId: string): Promise<TestAttempt[]> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.getStudentAttemptsForTest(testId);
    }
    const db = requireFirebaseDb();
    try {
      const snap = await getDocs(
        query(collection(db, 'attempts'), where('studentId', '==', studentId))
      );
      return snap.docs
        .map((d) => mapAttemptDoc(d.id, d.data() as Record<string, unknown>))
        .filter((a) => a.testId === testId)
        .sort((a, b) => b.startedAtMs - a.startedAtMs);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attempts');
    }
  },

  async listTestSubmissions(testId: string, professorId: string): Promise<TestAttempt[]> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.listTestSubmissions(testId);
    }
    const db = requireFirebaseDb();
    try {
      const snap = await getDocs(
        query(collection(db, 'attempts'), where('professorId', '==', professorId))
      );
      return snap.docs
        .map((d) => mapAttemptDoc(d.id, d.data() as Record<string, unknown>))
        .filter((a) => a.testId === testId)
        .sort((a, b) => (b.submittedAtMs ?? b.startedAtMs) - (a.submittedAtMs ?? a.startedAtMs));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attempts');
    }
  },

  async listAllProfessorAttempts(professorId: string): Promise<TestAttempt[]> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.listAllProfessorAttempts();
    }
    const db = requireFirebaseDb();
    try {
      const snap = await getDocs(
        query(collection(db, 'attempts'), where('professorId', '==', professorId))
      );
      return snap.docs
        .map((d) => mapAttemptDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => (b.submittedAtMs ?? b.startedAtMs) - (a.submittedAtMs ?? a.startedAtMs));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attempts');
    }
  },

  async listProfessorIntegrityAlerts(professorId: string): Promise<IntegrityAlert[]> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.getIntegrityAlerts();
    }
    const attempts = await this.listAllProfessorAttempts(professorId);
    const alerts: IntegrityAlert[] = [];

    attempts.forEach((a) => {
      const vCount = a.violationCount ?? 0;
      const flagged = Boolean(a.professorFlagged);
      const cleared = Boolean(a.professorFlagCleared);
      if (vCount === 0 && !flagged) return;

      const integrityScore = a.integrityScore ?? 100;
      const riskLevel: RiskLevel =
        flagged && !cleared
          ? a.riskLevel === 'high'
            ? 'high'
            : 'medium'
          : (a.riskLevel ?? 'low');

      const baseReason = a.primaryViolationReason || (flagged ? 'Manually flagged by professor' : 'Proctoring event logged');
      const reasonText =
        vCount > 0
          ? `${baseReason} (${vCount} ${vCount === 1 ? 'warning' : 'warnings'})`
          : baseReason;

      alerts.push({
        id: a.id,
        attemptId: a.id,
        testId: a.testId,
        studentId: a.studentId,
        studentName: a.studentName,
        enrollmentId: a.studentEmail,
        testTitle: a.testTitle,
        integrityScore,
        riskScore: Math.max(0, 100 - integrityScore),
        riskLevel,
        primaryReason: reasonText,
        violationCount: vCount,
        flaggedAt: new Date(a.submittedAtMs ?? a.startedAtMs).toISOString(),
        reviewed: Boolean(cleared || a.professorReviewedAtMs),
        professorFlagged: flagged,
        professorFlagCleared: cleared,
        professorFlagNote: a.professorFlagNote || '',
        isSample: false,
      });
    });

    const severityRank: Record<RiskLevel, number> = { high: 3, medium: 2, low: 1 };
    return alerts.sort((a, b) => {
      const aActive = a.professorFlagCleared ? 0 : 1;
      const bActive = b.professorFlagCleared ? 0 : 1;
      if (bActive !== aActive) return bActive - aActive;
      if (severityRank[b.riskLevel] !== severityRank[a.riskLevel]) {
        return severityRank[b.riskLevel] - severityRank[a.riskLevel];
      }
      return new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime();
    });
  },

  async listAttemptViolations(attemptId: string): Promise<AttemptViolation[]> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.listAttemptViolations(attemptId);
    }
    const db = requireFirebaseDb();
    try {
      const snap = await getDocs(collection(db, 'attempts', attemptId, 'violations'));
      return snap.docs
        .map((d) => mapViolationDoc(d.id, attemptId, d.data() as Record<string, unknown>))
        .sort((a, b) => a.timestampMs - b.timestampMs);
    } catch {
      // Non-fatal fallback if subcollection rules are not yet published
      return [];
    }
  },

  async logViolation(params: {
    attemptId: string;
    testId: string;
    testTitle: string;
    studentId: string;
    studentName: string;
    professorId: string;
    type: ViolationType;
    details?: string;
    questionNumber: number;
    strikeNumber: number;
    allViolationTypesSoFar: ViolationType[];
  }): Promise<{
    violation: AttemptViolation;
    integrityScore: number;
    riskLevel: RiskLevel;
  }> {
    if (triggerDemoWriteGuard('log proctoring violation')) {
      throw new DemoReadOnlyError('log proctoring violation');
    }
    const db = requireFirebaseDb();
    const label = VIOLATION_LABELS[params.type];
    const timestampMs = Date.now();
    const metrics = computeIntegrityMetrics(
      params.allViolationTypesSoFar.map((t) => ({ type: t }))
    );

    let createdId = `vio-${timestampMs}`;
    try {
      const docRef = await addDoc(collection(db, 'attempts', params.attemptId, 'violations'), {
        attemptId: params.attemptId,
        testId: params.testId,
        studentId: params.studentId,
        professorId: params.professorId,
        type: params.type,
        label,
        details: params.details || '',
        questionNumber: params.questionNumber,
        strikeNumber: params.strikeNumber,
        timestamp: serverTimestamp(),
        timestampMs,
      });
      createdId = docRef.id;
    } catch (error) {
      // Even if subcollection rule fails, still attempt updating summary on attempt doc below
      console.warn('Could not write violation subcollection doc:', error);
    }

    try {
      await updateDoc(doc(db, 'attempts', params.attemptId), {
        violationCount: metrics.violationCount,
        tabSwitchCount: metrics.tabSwitchCount,
        integrityScore: metrics.integrityScore,
        riskLevel: metrics.riskLevel,
        primaryViolationReason: label,
        lastSyncedAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn('Could not update attempt integrity metrics:', error);
    }

    if (metrics.riskLevel === 'high' || params.strikeNumber >= 2) {
      testService
        .createNotification({
          userId: params.professorId,
          title: `Integrity alert — ${params.studentName}`,
          message: `${label} logged (warning ${params.strikeNumber}) during ${params.testTitle}.`,
          category: 'integrity',
        })
        .catch(() => {});
    }

    return {
      violation: {
        id: createdId,
        attemptId: params.attemptId,
        testId: params.testId,
        studentId: params.studentId,
        professorId: params.professorId,
        type: params.type,
        label,
        details: params.details,
        questionNumber: params.questionNumber,
        strikeNumber: params.strikeNumber,
        timestampMs,
        timestampIso: new Date(timestampMs).toISOString(),
      },
      integrityScore: metrics.integrityScore,
      riskLevel: metrics.riskLevel,
    };
  },

  async updateProfessorIntegrityReview(
    attemptId: string,
    payload: { flagged: boolean; cleared: boolean; note: string }
  ): Promise<void> {
    if (triggerDemoWriteGuard('update integrity flag')) {
      throw new DemoReadOnlyError('update integrity flag');
    }
    const db = requireFirebaseDb();
    try {
      await updateDoc(doc(db, 'attempts', attemptId), {
        professorFlagged: payload.flagged,
        professorFlagCleared: payload.cleared,
        professorFlagNote: payload.note.trim(),
        professorReviewedAtMs: Date.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attempts/${attemptId}`);
    }
  },

  async startOrResumeAttempt(params: {
    test: TestItem;
    student: UserProfile;
  }): Promise<{ attempt: TestAttempt; resumed: boolean }> {
    if (triggerDemoWriteGuard('start a test attempt')) {
      throw new DemoReadOnlyError('start a test attempt');
    }
    const { test, student } = params;
    const db = requireFirebaseDb();

    if (!test.published) {
      throw new Error('This assessment has not been published yet.');
    }

    const existing = await this.getStudentAttemptsForTest(test.id, student.uid);
    const activeAttempt = existing.find((a) => a.status === 'in_progress');
    if (activeAttempt) {
      return { attempt: activeAttempt, resumed: true };
    }

    const effectiveStatus = computeEffectiveTestStatus(test);
    if (effectiveStatus === 'scheduled') {
      throw new Error('This assessment has not started yet. Check the scheduled start time.');
    }
    if (effectiveStatus === 'completed') {
      throw new Error('This assessment window has already closed.');
    }

    if (existing.length >= test.settings.attemptLimit) {
      throw new Error(
        `You have used all ${test.settings.attemptLimit} allowed ${
          test.settings.attemptLimit === 1 ? 'attempt' : 'attempts'
        } for this test.`
      );
    }

    const publicQuestions = await testService.getTestQuestionsPublic(test.id);
    if (publicQuestions.length === 0) {
      throw new Error('This test does not have any questions yet.');
    }

    const questionOrder = test.settings.shuffleQuestions
      ? shuffleArray(publicQuestions.map((q) => q.id))
      : publicQuestions.map((q) => q.id);

    const optionOrders: Record<string, string[]> = {};
    if (test.settings.shuffleOptions) {
      publicQuestions.forEach((q) => {
        if (q.type === 'mcq' || q.type === 'multi_select') {
          optionOrders[q.id] = shuffleArray(q.options.map((o) => o.id));
        }
      });
    }

    const attemptRef = doc(collection(db, 'attempts'));
    try {
      // Record student join on test document (best-effort if rules allow)
      const alreadyJoined = (test.joinedStudentIds ?? []).includes(student.uid);
      if (!alreadyJoined) {
        await updateDoc(doc(db, 'tests', test.id), {
          joinedStudentIds: arrayUnion(student.uid),
          enrolledCount: increment(1),
        }).catch(() => {
          // Non-blocking if strict rules restrict student writes to tests/{id}
        });
      }

      await setDoc(attemptRef, {
        testId: test.id,
        testTitle: test.title,
        testCode: test.code,
        subject: test.subject,
        professorId: test.professorId,
        studentId: student.uid,
        studentName: student.name,
        studentEmail: student.email,
        attemptNumber: existing.length + 1,
        status: 'in_progress',
        startedAt: serverTimestamp(),
        lastSyncedAt: serverTimestamp(),
        durationMinutes: test.settings.durationMinutes,
        questionOrder,
        optionOrders,
        answers: {},
        flaggedQuestionIds: [],
        score: 0,
        totalMarks: test.totalMarks,
        percentage: 0,
        passed: false,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: publicQuestions.length,
        pendingReviewCount: 0,
        questionGrades: {},
        showResultMode: test.settings.showResultMode,
        resultPublishedToStudent: false,
        proctoringEnabled: Boolean(test.proctoring.enabled),
        violationCount: 0,
        tabSwitchCount: 0,
        integrityScore: 100,
        riskLevel: 'low',
        primaryViolationReason: '',
        professorFlagged: false,
        professorFlagCleared: false,
        professorFlagNote: '',
      });

      const freshSnap = await getDocFromServer(attemptRef).catch(() => getDoc(attemptRef));
      const attempt = mapAttemptDoc(
        freshSnap.id,
        (freshSnap.data() as Record<string, unknown>) ?? {}
      );
      return { attempt, resumed: false };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `attempts/${attemptRef.id}`);
    }
  },

  async loadAttemptSession(attemptId: string): Promise<{
    attempt: TestAttempt;
    test: TestItem;
    questions: PublicQuestion[];
    serverOffsetMs: number;
  }> {
    const db = requireFirebaseDb();
    const attemptRef = doc(db, 'attempts', attemptId);
    try {
      const initialSnap = await getDoc(attemptRef);
      if (!initialSnap.exists()) {
        throw new Error('Assessment attempt not found.');
      }

      let rawData = initialSnap.data() as Record<string, unknown>;
      let serverOffsetMs = 0;

      // Refresh server timestamp to anchor client clock against Firestore server time
      if (rawData.status === 'in_progress') {
        await updateDoc(attemptRef, { lastSyncedAt: serverTimestamp() }).catch(() => {});
        const serverSnap = await getDocFromServer(attemptRef).catch(() => getDoc(attemptRef));
        if (serverSnap.exists()) {
          rawData = serverSnap.data() as Record<string, unknown>;
          if (rawData.lastSyncedAt) {
            serverOffsetMs = toMillis(rawData.lastSyncedAt) - Date.now();
          }
        }
      }

      const attempt = mapAttemptDoc(attemptId, rawData);
      const test = await testService.getTestById(attempt.testId);
      if (!test) {
        throw new Error('The test associated with this attempt could not be found.');
      }

      const publicQuestions = await testService.getTestQuestionsPublic(test.id);
      const orderedQuestions = applyAttemptOrdering(publicQuestions, attempt);

      return { attempt, test, questions: orderedQuestions, serverOffsetMs };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `attempts/${attemptId}`);
    }
  },

  async saveAttemptProgress(
    attemptId: string,
    patch: {
      answers: Record<string, AttemptAnswer>;
      flaggedQuestionIds: string[];
    }
  ): Promise<void> {
    if (triggerDemoWriteGuard('save attempt progress')) {
      throw new DemoReadOnlyError('save attempt progress');
    }
    const db = requireFirebaseDb();
    try {
      await updateDoc(doc(db, 'attempts', attemptId), {
        answers: patch.answers,
        flaggedQuestionIds: patch.flaggedQuestionIds,
        lastSyncedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attempts/${attemptId}`);
    }
  },

  async submitAttempt(params: {
    attemptId: string;
    answers: Record<string, AttemptAnswer>;
    flaggedQuestionIds: string[];
    autoSubmitted: boolean;
    autoSubmitReason?: string;
  }): Promise<TestAttempt> {
    if (triggerDemoWriteGuard('submit an assessment')) {
      throw new DemoReadOnlyError('submit an assessment');
    }
    const db = requireFirebaseDb();
    const attemptRef = doc(db, 'attempts', params.attemptId);

    try {
      const snap = await getDoc(attemptRef);
      if (!snap.exists()) {
        throw new Error('Attempt not found.');
      }
      const existing = mapAttemptDoc(snap.id, snap.data() as Record<string, unknown>);
      if (existing.status !== 'in_progress') {
        return existing;
      }

      // Step 1: Lock attempt immediately so answers are immutable after submission
      const lockStatus: AttemptStatus = params.autoSubmitted ? 'auto_submitted' : 'submitted';
      await updateDoc(attemptRef, {
        answers: params.answers,
        flaggedQuestionIds: params.flaggedQuestionIds,
        status: lockStatus,
        ...(params.autoSubmitReason ? { autoSubmitReason: params.autoSubmitReason } : {}),
        submittedAt: serverTimestamp(),
      });

      const lockedSnap = await getDocFromServer(attemptRef).catch(() => getDoc(attemptRef));
      const lockedAttempt = mapAttemptDoc(
        lockedSnap.id,
        (lockedSnap.data() as Record<string, unknown>) ?? {}
      );
      const submittedAtMs = lockedAttempt.submittedAtMs ?? Date.now();
      const timeTakenSeconds = Math.max(
        1,
        Math.min(
          lockedAttempt.durationMinutes * 60,
          Math.round((submittedAtMs - lockedAttempt.startedAtMs) / 1000)
        )
      );

      // Step 2: Load test & questions, then attempt objective auto-grading via answerKey
      const [test, publicQuestions] = await Promise.all([
        testService.getTestById(lockedAttempt.testId),
        testService.getTestQuestionsPublic(lockedAttempt.testId),
      ]);

      let answerKey: Record<string, QuestionAnswerKeyEntry> | null = null;
      try {
        answerKey = await testService.getTestAnswerKey(lockedAttempt.testId);
      } catch {
        // Strict server-only rules block client answerKey read; professor grading view will evaluate.
        answerKey = null;
      }

      if (answerKey && test) {
        const graded = gradeAttempt({
          questions: publicQuestions,
          answerKey,
          answers: params.answers,
          negativeMarkingEnabled: test.settings.negativeMarking,
          passingMarks: test.settings.passingMarks,
        });

        const finalStatus: AttemptStatus = graded.hasPendingReview ? lockStatus : 'evaluated';
        const showResultToStudent =
          test.settings.showResultMode === 'immediate' || !graded.hasPendingReview;

        const updatePayload = {
          status: finalStatus,
          timeTakenSeconds,
          score: graded.score,
          totalMarks: graded.totalMarks,
          percentage: graded.percentage,
          passed: graded.passed,
          correctCount: graded.correctCount,
          wrongCount: graded.wrongCount,
          skippedCount: graded.skippedCount,
          pendingReviewCount: graded.pendingReviewCount,
          questionGrades: graded.questionGrades,
          showResultMode: test.settings.showResultMode,
          resultPublishedToStudent: showResultToStudent,
        };

        await updateDoc(attemptRef, updatePayload);

        // Upsert results/{attemptId} summary for Professor & Student dashboards
        await setDoc(doc(db, 'results', params.attemptId), {
          attemptId: params.attemptId,
          testId: test.id,
          testTitle: test.title,
          subject: test.subject,
          professorId: test.professorId,
          studentId: lockedAttempt.studentId,
          studentName: lockedAttempt.studentName,
          enrollmentId: lockedAttempt.studentEmail,
          score: graded.score,
          totalMarks: graded.totalMarks,
          percentage: graded.percentage,
          passed: graded.passed,
          status: graded.hasPendingReview ? 'pending_eval' : 'evaluated',
          tabSwitches: lockedAttempt.tabSwitchCount ?? 0,
          violationCount: lockedAttempt.violationCount ?? 0,
          integrityScore: lockedAttempt.integrityScore ?? 100,
          riskLevel: lockedAttempt.riskLevel ?? 'low',
          topicBreakdown: graded.topicBreakdown,
          publishedAt: serverTimestamp(),
        }).catch(() => {});

        // Best-effort increment submittedCount on test doc
        await updateDoc(doc(db, 'tests', test.id), {
          submittedCount: increment(1),
        }).catch(() => {});

        return {
          ...lockedAttempt,
          ...updatePayload,
          answers: params.answers,
          flaggedQuestionIds: params.flaggedQuestionIds,
        };
      }

      // Fallback when answerKey is strictly server-private: lock as submitted pending review
      await updateDoc(attemptRef, {
        timeTakenSeconds,
        pendingReviewCount: publicQuestions.length,
        resultPublishedToStudent: false,
      });

      return {
        ...lockedAttempt,
        timeTakenSeconds,
        answers: params.answers,
        flaggedQuestionIds: params.flaggedQuestionIds,
        pendingReviewCount: publicQuestions.length,
        resultPublishedToStudent: false,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attempts/${params.attemptId}`);
    }
  },

  async loadResultDetail(
    attemptId: string,
    viewerRole: 'professor' | 'student'
  ): Promise<{
    attempt: TestAttempt;
    test: TestItem;
    questions: PublicQuestion[];
    answerKey: Record<string, QuestionAnswerKeyEntry> | null;
  }> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.loadResultDetail(attemptId, viewerRole);
    }
    const db = requireFirebaseDb();
    try {
      const snap = await getDoc(doc(db, 'attempts', attemptId));
      if (!snap.exists()) {
        throw new Error('Submission not found.');
      }
      const attempt = mapAttemptDoc(snap.id, snap.data() as Record<string, unknown>);
      const [test, publicQuestions] = await Promise.all([
        testService.getTestById(attempt.testId),
        testService.getTestQuestionsPublic(attempt.testId),
      ]);
      if (!test) {
        throw new Error('Assessment not found.');
      }

      const orderedQuestions = applyAttemptOrdering(publicQuestions, attempt);

      const canViewKey =
        viewerRole === 'professor' ||
        (attempt.status !== 'in_progress' &&
          (test.settings.showResultMode === 'immediate' || attempt.status === 'evaluated'));

      let answerKey: Record<string, QuestionAnswerKeyEntry> | null = null;
      if (canViewKey) {
        try {
          answerKey = await testService.getTestAnswerKey(test.id);
        } catch {
          answerKey = null;
        }
      }

      return { attempt, test, questions: orderedQuestions, answerKey };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `attempts/${attemptId}`);
    }
  },

  async saveProfessorManualGrades(params: {
    attemptId: string;
    test: TestItem;
    questions: PublicQuestion[];
    answerKey: Record<string, QuestionAnswerKeyEntry>;
    attempt: TestAttempt;
    manualGrades: Record<string, { marksAwarded: number; feedback?: string }>;
  }): Promise<TestAttempt> {
    if (triggerDemoWriteGuard('save manual grades')) {
      throw new DemoReadOnlyError('save manual grades');
    }
    const db = requireFirebaseDb();
    const { attemptId, test, questions, answerKey, attempt, manualGrades } = params;

    const graded = gradeAttempt({
      questions,
      answerKey,
      answers: attempt.answers,
      negativeMarkingEnabled: test.settings.negativeMarking,
      passingMarks: test.settings.passingMarks,
      manualGrades,
    });

    const finalStatus: AttemptStatus = graded.hasPendingReview ? 'submitted' : 'evaluated';
    const updatePayload = {
      status: finalStatus,
      score: graded.score,
      totalMarks: graded.totalMarks,
      percentage: graded.percentage,
      passed: graded.passed,
      correctCount: graded.correctCount,
      wrongCount: graded.wrongCount,
      skippedCount: graded.skippedCount,
      pendingReviewCount: graded.pendingReviewCount,
      questionGrades: graded.questionGrades,
      resultPublishedToStudent: true,
    };

    try {
      await updateDoc(doc(db, 'attempts', attemptId), updatePayload);

      await setDoc(
        doc(db, 'results', attemptId),
        {
          attemptId,
          testId: test.id,
          testTitle: test.title,
          subject: test.subject,
          professorId: test.professorId,
          studentId: attempt.studentId,
          studentName: attempt.studentName,
          enrollmentId: attempt.studentEmail,
          score: graded.score,
          totalMarks: graded.totalMarks,
          percentage: graded.percentage,
          passed: graded.passed,
          status: graded.hasPendingReview ? 'pending_eval' : 'evaluated',
          topicBreakdown: graded.topicBreakdown,
          publishedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Recompute test averageScore across evaluated submissions
      const allSubmissions = await this.listTestSubmissions(test.id, test.professorId);
      const evaluated = allSubmissions.filter((s) => s.status === 'evaluated');
      if (evaluated.length > 0) {
        const avg = Math.round(
          evaluated.reduce((acc, s) => acc + s.percentage, 0) / evaluated.length
        );
        await testService.updateTestMetrics(test.id, {
          submittedCount: allSubmissions.filter((s) => s.status !== 'in_progress').length,
          averageScore: avg,
        });
      }

      return { ...attempt, ...updatePayload };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attempts/${attemptId}`);
    }
  },
};
