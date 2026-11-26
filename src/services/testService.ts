import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import {
  DemoReadOnlyError,
  getActiveDemoRole,
  isDemoModeActive,
  triggerDemoWriteGuard,
} from '../features/demo/demoStore';
import { computeStudentRank } from '../lib/analytics';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { computeEffectiveTestStatus, generateSixCharJoinCode } from '../lib/grading';
import { normalizeTestCode } from '../lib/validators';
import type {
  AppNotification,
  BuilderQuestion,
  CreateTestDraftInput,
  PerformancePoint,
  ProctoringPolicy,
  PublicQuestion,
  QuestionAnswerKeyEntry,
  ShowResultMode,
  StudentResultItem,
  SubmissionSummary,
  TestAnswerKeyDoc,
  TestCategory,
  TestItem,
  TestSettings,
  TestStatus,
  TopicMastery,
  UserProfile,
} from '../types';
import { isFirebaseConfigured, requireFirebaseDb, requireFirebaseStorage } from './firebase';

export function toIsoString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' && Number.isFinite(val)) return new Date(val).toISOString();
  if (
    val &&
    typeof val === 'object' &&
    'toDate' in val &&
    typeof (val as { toDate: () => Date }).toDate === 'function'
  ) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function mapTestDoc(id: string, data: Record<string, unknown>): TestItem {
  const proctoringRaw = (data.proctoring as Record<string, unknown> | undefined) ?? {};
  const settingsRaw = (data.settings as Record<string, unknown> | undefined) ?? {};

  const durationMinutes =
    typeof settingsRaw.durationMinutes === 'number'
      ? settingsRaw.durationMinutes
      : typeof data.durationMinutes === 'number'
        ? data.durationMinutes
        : 60;

  const startTime =
    typeof settingsRaw.startTime === 'string'
      ? settingsRaw.startTime
      : typeof data.startTime === 'string'
        ? data.startTime
        : toIsoString(data.scheduledAt);

  const defaultEndIso = new Date(new Date(startTime).getTime() + 7 * 86400 * 1000).toISOString();
  const endTime =
    typeof settingsRaw.endTime === 'string'
      ? settingsRaw.endTime
      : typeof data.endTime === 'string'
        ? data.endTime
        : defaultEndIso;

  const published =
    typeof data.published === 'boolean'
      ? data.published
      : data.status === 'live' || data.status === 'scheduled' || data.status === 'completed';

  const status: TestStatus = computeEffectiveTestStatus({
    published,
    startTime,
    endTime,
    scheduledAt: startTime,
  });

  const category: TestCategory =
    data.category === 'DSA' ||
    data.category === 'Aptitude' ||
    data.category === 'Core CS' ||
    data.category === 'Mathematics' ||
    data.category === 'Coding'
      ? data.category
      : 'Core CS';

  const showResultMode: ShowResultMode =
    settingsRaw.showResultMode === 'after_review' ? 'after_review' : 'immediate';

  const totalMarks = typeof data.totalMarks === 'number' ? data.totalMarks : 0;
  const passingMarks =
    typeof settingsRaw.passingMarks === 'number'
      ? settingsRaw.passingMarks
      : typeof data.passingMarks === 'number'
        ? data.passingMarks
        : Math.round(totalMarks * 0.4);

  const settings: TestSettings = {
    durationMinutes,
    startTime,
    endTime,
    shuffleQuestions: Boolean(settingsRaw.shuffleQuestions ?? false),
    shuffleOptions: Boolean(settingsRaw.shuffleOptions ?? false),
    negativeMarking: Boolean(settingsRaw.negativeMarking ?? false),
    attemptLimit:
      typeof settingsRaw.attemptLimit === 'number' && settingsRaw.attemptLimit >= 1
        ? settingsRaw.attemptLimit
        : 1,
    showResultMode,
    passingMarks,
    showRankToStudents: Boolean(settingsRaw.showRankToStudents ?? false),
  };

  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Untitled Assessment',
    subject: typeof data.subject === 'string' ? data.subject : '',
    description: typeof data.description === 'string' ? data.description : '',
    instructions: typeof data.instructions === 'string' ? data.instructions : '',
    category,
    code: typeof data.code === 'string' ? data.code : '',
    professorId: typeof data.professorId === 'string' ? data.professorId : '',
    professorName: typeof data.professorName === 'string' ? data.professorName : '',
    published,
    status,
    scheduledAt: startTime,
    startTime,
    endTime,
    durationMinutes,
    totalMarks,
    passingMarks,
    questionCount: typeof data.questionCount === 'number' ? data.questionCount : 0,
    enrolledCount: typeof data.enrolledCount === 'number' ? data.enrolledCount : 0,
    submittedCount: typeof data.submittedCount === 'number' ? data.submittedCount : 0,
    averageScore: typeof data.averageScore === 'number' ? data.averageScore : undefined,
    joinedStudentIds: Array.isArray(data.joinedStudentIds)
      ? (data.joinedStudentIds as string[])
      : [],
    settings,
    proctoring: {
      enabled: Boolean(proctoringRaw.enabled ?? false),
      fullscreenRequired: Boolean(proctoringRaw.fullscreenRequired ?? true),
      maxTabSwitches:
        typeof proctoringRaw.maxTabSwitches === 'number' && proctoringRaw.maxTabSwitches >= 1
          ? proctoringRaw.maxTabSwitches
          : 3,
      blockCopyPaste: Boolean(proctoringRaw.blockCopyPaste ?? true),
      webcamEnabled: Boolean(proctoringRaw.webcamEnabled ?? false),
      autoSubmitOnLimit: Boolean(proctoringRaw.autoSubmitOnLimit ?? true),
    },
    createdAt: data.createdAt ? toIsoString(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? toIsoString(data.updatedAt) : undefined,
  };
}

function mapPublicQuestionDoc(id: string, data: Record<string, unknown>): PublicQuestion {
  const validTypes = new Set(['mcq', 'multi_select', 'true_false', 'short_answer', 'long_answer']);
  const type = (
    typeof data.type === 'string' && validTypes.has(data.type) ? data.type : 'mcq'
  ) as PublicQuestion['type'];

  const difficulty =
    data.difficulty === 'easy' || data.difficulty === 'hard' ? data.difficulty : 'medium';

  const rawOptions = Array.isArray(data.options)
    ? (data.options as Array<{ id?: string; text?: string }>)
    : [];

  return {
    id,
    order: typeof data.order === 'number' ? data.order : 0,
    type,
    prompt: typeof data.prompt === 'string' ? data.prompt : '',
    imageUrl: typeof data.imageUrl === 'string' && data.imageUrl ? data.imageUrl : undefined,
    options: rawOptions.map((o, idx) => ({
      id: typeof o.id === 'string' && o.id ? o.id : `opt-${idx}`,
      text: typeof o.text === 'string' ? o.text : '',
    })),
    marks: typeof data.marks === 'number' ? data.marks : 1,
    negativeMarks: typeof data.negativeMarks === 'number' ? data.negativeMarks : 0,
    difficulty,
    topic: typeof data.topic === 'string' ? data.topic : 'General',
    rubric: typeof data.rubric === 'string' ? data.rubric : undefined,
  };
}

export interface SaveTestBuilderPayload {
  testId?: string;
  professor: UserProfile;
  title: string;
  subject: string;
  description: string;
  instructions: string;
  category: TestCategory;
  code?: string;
  settings: TestSettings;
  proctoring?: ProctoringPolicy;
  questions: BuilderQuestion[];
  publish: boolean;
}

export const testService = {
  async listTestsForUser(user: UserProfile): Promise<TestItem[]> {
    if (isDemoModeActive()) {
      const role = getActiveDemoRole() ?? (user.role === 'professor' ? 'professor' : 'student');
      const { demoService } = await import('../features/demo/demoService');
      return demoService.listTestsForUser(role);
    }
    if (!isFirebaseConfigured) return [];
    const db = requireFirebaseDb();
    const path = 'tests';
    try {
      const q =
        user.role === 'professor'
          ? query(collection(db, path), where('professorId', '==', user.uid))
          : query(collection(db, path), where('published', '==', true));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => mapTestDoc(d.id, d.data() as Record<string, unknown>));
      return items.sort(
        (a, b) =>
          new Date(b.updatedAt || b.scheduledAt).getTime() -
          new Date(a.updatedAt || a.scheduledAt).getTime()
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getTestById(testId: string): Promise<TestItem | null> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.getTestById(testId);
    }
    const db = requireFirebaseDb();
    const path = `tests/${testId}`;
    try {
      const snap = await getDoc(doc(db, 'tests', testId));
      if (!snap.exists()) return null;
      return mapTestDoc(snap.id, snap.data() as Record<string, unknown>);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async findTestByCode(rawCode: string): Promise<TestItem | null> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.findTestByCode(rawCode);
    }
    const db = requireFirebaseDb();
    const target = normalizeTestCode(rawCode);
    const path = 'tests';
    try {
      const q = query(collection(db, path), where('code', '==', target), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const docSnap = snap.docs[0];
      return mapTestDoc(docSnap.id, docSnap.data() as Record<string, unknown>);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async getTestQuestionsPublic(testId: string): Promise<PublicQuestion[]> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.getTestQuestionsPublic(testId);
    }
    const db = requireFirebaseDb();
    const path = `tests/${testId}/questions`;
    try {
      const snap = await getDocs(collection(db, 'tests', testId, 'questions'));
      return snap.docs
        .map((d) => mapPublicQuestionDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.order - b.order);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getTestAnswerKey(testId: string): Promise<Record<string, QuestionAnswerKeyEntry>> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.getTestAnswerKey(testId);
    }
    const db = requireFirebaseDb();
    const path = `tests/${testId}/private/answerKey`;
    try {
      const snap = await getDoc(doc(db, 'tests', testId, 'private', 'answerKey'));
      if (!snap.exists()) return {};
      const data = snap.data() as Partial<TestAnswerKeyDoc>;
      return data.answers ?? {};
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async getTestWithPrivateKey(testId: string): Promise<{
    test: TestItem;
    questions: BuilderQuestion[];
  } | null> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.getTestWithPrivateKey(testId);
    }
    const test = await this.getTestById(testId);
    if (!test) return null;
    const [publicQuestions, answerKey] = await Promise.all([
      this.getTestQuestionsPublic(testId),
      this.getTestAnswerKey(testId),
    ]);

    const questions: BuilderQuestion[] = publicQuestions.map((q) => {
      const key = answerKey[q.id];
      return {
        ...q,
        correctAnswers: key?.correctAnswers ?? [],
        explanation: key?.explanation ?? '',
      };
    });

    return { test, questions };
  },

  async saveTestBuilder(payload: SaveTestBuilderPayload): Promise<{
    test: TestItem;
    questions: BuilderQuestion[];
  }> {
    if (triggerDemoWriteGuard(payload.publish ? 'publish a test' : 'save test changes')) {
      throw new DemoReadOnlyError(payload.publish ? 'publish a test' : 'save test changes');
    }
    const db = requireFirebaseDb();
    const testRef = payload.testId
      ? doc(db, 'tests', payload.testId)
      : doc(collection(db, 'tests'));
    const testId = testRef.id;

    let code = payload.code?.trim().toUpperCase() || '';
    if (!code) {
      code = generateSixCharJoinCode();
    }

    const normalizedQuestions: BuilderQuestion[] = payload.questions.map((q, index) => ({
      ...q,
      order: index,
      marks: Math.max(0, Number(q.marks) || 0),
      negativeMarks: Math.max(0, Number(q.negativeMarks) || 0),
      topic: q.topic.trim() || 'General',
      prompt: q.prompt.trim(),
      explanation: q.explanation.trim(),
      rubric: q.rubric?.trim() || '',
    }));

    const totalMarks = normalizedQuestions.reduce((acc, q) => acc + q.marks, 0);
    const computedStatus = computeEffectiveTestStatus({
      published: payload.publish,
      startTime: payload.settings.startTime,
      endTime: payload.settings.endTime,
    });

    try {
      const existingSnap = payload.testId ? await getDoc(testRef) : null;
      const existingData = existingSnap?.exists()
        ? (existingSnap.data() as Record<string, unknown>)
        : null;

      const testDocData = {
        title: payload.title.trim() || 'Untitled Test',
        subject: payload.subject.trim(),
        description: payload.description.trim(),
        instructions: payload.instructions.trim(),
        category: payload.category,
        code,
        professorId: payload.professor.uid,
        professorName: payload.professor.name,
        published: payload.publish,
        status: computedStatus,
        scheduledAt: payload.settings.startTime,
        startTime: payload.settings.startTime,
        endTime: payload.settings.endTime,
        durationMinutes: payload.settings.durationMinutes,
        totalMarks,
        passingMarks: payload.settings.passingMarks,
        questionCount: normalizedQuestions.length,
        enrolledCount:
          typeof existingData?.enrolledCount === 'number' ? existingData.enrolledCount : 0,
        submittedCount:
          typeof existingData?.submittedCount === 'number' ? existingData.submittedCount : 0,
        ...(typeof existingData?.averageScore === 'number'
          ? { averageScore: existingData.averageScore }
          : {}),
        joinedStudentIds: Array.isArray(existingData?.joinedStudentIds)
          ? existingData.joinedStudentIds
          : [],
        settings: payload.settings,
        proctoring: payload.proctoring ??
          existingData?.proctoring ?? {
            enabled: false,
            fullscreenRequired: true,
            maxTabSwitches: 3,
            blockCopyPaste: true,
            webcamEnabled: false,
            autoSubmitOnLimit: true,
          },
        createdAt: existingData?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const batch = writeBatch(db);
      batch.set(testRef, testDocData, { merge: true });

      // Remove deleted questions if editing an existing test
      if (payload.testId) {
        const oldQuestionsSnap = await getDocs(collection(db, 'tests', testId, 'questions'));
        const nextIds = new Set(normalizedQuestions.map((q) => q.id));
        oldQuestionsSnap.docs.forEach((oldDoc) => {
          if (!nextIds.has(oldDoc.id)) {
            batch.delete(oldDoc.ref);
          }
        });
      }

      // Write student-safe question docs (NO correctAnswers, NO explanation!)
      const answerKeyMap: Record<string, QuestionAnswerKeyEntry> = {};
      normalizedQuestions.forEach((q) => {
        const qRef = doc(db, 'tests', testId, 'questions', q.id);
        batch.set(qRef, {
          id: q.id,
          order: q.order,
          type: q.type,
          prompt: q.prompt,
          imageUrl: q.imageUrl || null,
          options: q.options,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          difficulty: q.difficulty,
          topic: q.topic,
          rubric: q.rubric || null,
        });

        answerKeyMap[q.id] = {
          correctAnswers: q.correctAnswers,
          explanation: q.explanation,
        };
      });

      // Write private answer key in `tests/{id}/private/answerKey`
      const keyRef = doc(db, 'tests', testId, 'private', 'answerKey');
      batch.set(keyRef, {
        professorId: payload.professor.uid,
        answers: answerKeyMap,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      const savedTest = mapTestDoc(testId, {
        ...testDocData,
        updatedAt: new Date().toISOString(),
      });
      return { test: savedTest, questions: normalizedQuestions };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tests/${testId}`);
    }
  },

  async createDraftTest(input: CreateTestDraftInput, professor: UserProfile): Promise<TestItem> {
    const startTime = input.scheduledAt || new Date().toISOString();
    const endTime = new Date(new Date(startTime).getTime() + 7 * 86400 * 1000).toISOString();
    const result = await this.saveTestBuilder({
      professor,
      title: input.title,
      subject: input.subject,
      description: '',
      instructions: 'Read each question carefully before submitting.',
      category: input.category,
      settings: {
        durationMinutes: input.durationMinutes,
        startTime,
        endTime,
        shuffleQuestions: false,
        shuffleOptions: false,
        negativeMarking: false,
        attemptLimit: 1,
        showResultMode: 'immediate',
        passingMarks: Math.round(input.totalMarks * 0.4),
      },
      questions: [],
      publish: false,
    });
    return result.test;
  },

  async duplicateTest(testId: string, professor: UserProfile): Promise<TestItem> {
    if (triggerDemoWriteGuard('duplicate a test')) {
      throw new DemoReadOnlyError('duplicate a test');
    }
    const loaded = await this.getTestWithPrivateKey(testId);
    if (!loaded) {
      throw new Error('Test not found.');
    }

    const clonedQuestions: BuilderQuestion[] = loaded.questions.map((q, idx) => ({
      ...q,
      id: `q-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      order: idx,
    }));

    const result = await this.saveTestBuilder({
      professor,
      title: `${loaded.test.title} (Copy)`,
      subject: loaded.test.subject,
      description: loaded.test.description || '',
      instructions: loaded.test.instructions || '',
      category: loaded.test.category,
      settings: loaded.test.settings,
      proctoring: loaded.test.proctoring,
      questions: clonedQuestions,
      publish: false,
    });

    return result.test;
  },

  async deleteTest(testId: string): Promise<void> {
    if (triggerDemoWriteGuard('delete a test')) {
      throw new DemoReadOnlyError('delete a test');
    }
    const db = requireFirebaseDb();
    try {
      const qSnap = await getDocs(collection(db, 'tests', testId, 'questions'));
      const batch = writeBatch(db);
      qSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'tests', testId, 'private', 'answerKey'));
      batch.delete(doc(db, 'tests', testId));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tests/${testId}`);
    }
  },

  async uploadQuestionImage(
    professorId: string,
    testId: string,
    questionId: string,
    file: File
  ): Promise<string> {
    if (triggerDemoWriteGuard('upload question images')) {
      throw new DemoReadOnlyError('upload question images');
    }
    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload a valid image file (PNG, JPG, WebP, or GIF).');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image must be 5 MB or smaller.');
    }

    const storage = requireFirebaseStorage();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileRef = storageRef(
      storage,
      `question-images/${professorId}/${testId || 'draft'}/${questionId}-${Date.now()}-${safeName}`
    );

    await uploadBytes(fileRef, file, { contentType: file.type });
    return await getDownloadURL(fileRef);
  },

  async getProfessorDashboardData(professorId: string): Promise<{
    submissions: SubmissionSummary[];
    performanceTrend: PerformancePoint[];
  }> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.getProfessorDashboardData();
    }
    if (!isFirebaseConfigured) {
      return { submissions: [], performanceTrend: [] };
    }
    const db = requireFirebaseDb();

    try {
      const resultsSnap = await getDocs(
        query(collection(db, 'results'), where('professorId', '==', professorId), limit(50))
      );

      if (resultsSnap.empty) {
        return { submissions: [], performanceTrend: [] };
      }

      const submissions: SubmissionSummary[] = [];
      const byTest = new Map<
        string,
        {
          name: string;
          fullTitle: string;
          totalPct: number;
          highest: number;
          passed: number;
          count: number;
        }
      >();

      resultsSnap.docs.forEach((d) => {
        const raw = d.data() as Record<string, unknown>;
        const score = typeof raw.score === 'number' ? raw.score : 0;
        const totalMarks =
          typeof raw.totalMarks === 'number' && raw.totalMarks > 0 ? raw.totalMarks : 100;
        const percentage =
          typeof raw.percentage === 'number'
            ? raw.percentage
            : Math.round((score / totalMarks) * 100);
        const testTitle = typeof raw.testTitle === 'string' ? raw.testTitle : 'Assessment';
        const testId = typeof raw.testId === 'string' ? raw.testId : d.id;

        submissions.push({
          id: d.id,
          testId,
          studentId: typeof raw.studentId === 'string' ? raw.studentId : '',
          studentName: typeof raw.studentName === 'string' ? raw.studentName : 'Student',
          enrollmentId: typeof raw.enrollmentId === 'string' ? raw.enrollmentId : '',
          testTitle,
          submittedAt: toIsoString(raw.publishedAt),
          score: raw.status === 'pending_eval' ? null : score,
          totalMarks,
          status: raw.status === 'pending_eval' ? 'pending_eval' : 'evaluated',
          tabSwitches: typeof raw.tabSwitches === 'number' ? raw.tabSwitches : 0,
        });

        const group = byTest.get(testId) ?? {
          name: testTitle.slice(0, 14),
          fullTitle: testTitle,
          totalPct: 0,
          highest: 0,
          passed: 0,
          count: 0,
        };
        group.totalPct += percentage;
        group.highest = Math.max(group.highest, percentage);
        if (percentage >= 40) group.passed += 1;
        group.count += 1;
        byTest.set(testId, group);
      });

      submissions.sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

      const performanceTrend: PerformancePoint[] = Array.from(byTest.values()).map((g) => ({
        testShortName: g.name,
        fullTitle: g.fullTitle,
        classAverage: Math.round(g.totalPct / g.count),
        highestScore: Math.round(g.highest),
        passRate: Math.round((g.passed / g.count) * 100),
      }));

      return { submissions: submissions.slice(0, 6), performanceTrend };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'results');
    }
  },

  async getStudentDashboardData(studentId: string): Promise<{
    topicMastery: TopicMastery[];
    recentResults: StudentResultItem[];
  }> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.getStudentDashboardData();
    }
    if (!isFirebaseConfigured) {
      return { topicMastery: [], recentResults: [] };
    }
    const db = requireFirebaseDb();

    try {
      const resultsSnap = await getDocs(
        query(collection(db, 'results'), where('studentId', '==', studentId), limit(25))
      );

      if (resultsSnap.empty) {
        return { topicMastery: [], recentResults: [] };
      }

      const recentResults: StudentResultItem[] = [];
      const topicAgg = new Map<string, { subject: string; sum: number; count: number }>();

      resultsSnap.docs.forEach((d) => {
        const raw = d.data() as Record<string, unknown>;
        const score = typeof raw.score === 'number' ? raw.score : 0;
        const totalMarks =
          typeof raw.totalMarks === 'number' && raw.totalMarks > 0 ? raw.totalMarks : 100;
        const percentage =
          typeof raw.percentage === 'number'
            ? raw.percentage
            : Math.round((score / totalMarks) * 100);
        const subject = typeof raw.subject === 'string' ? raw.subject : 'General';
        const status: StudentResultItem['status'] =
          raw.status === 'pending_eval'
            ? 'needs_review'
            : percentage >= 85
              ? 'distinction'
              : percentage >= 40
                ? 'passed'
                : 'needs_review';

        const breakdown = Array.isArray(raw.topicBreakdown)
          ? (raw.topicBreakdown as Array<{ topic?: string; percentage?: number }>).filter(
              (item): item is { topic: string; percentage: number } =>
                typeof item.topic === 'string' && typeof item.percentage === 'number'
            )
          : [];

        recentResults.push({
          id: d.id,
          testId: typeof raw.testId === 'string' ? raw.testId : d.id,
          testTitle: typeof raw.testTitle === 'string' ? raw.testTitle : 'Assessment',
          subject,
          date: toIsoString(raw.publishedAt),
          score,
          totalMarks,
          percentage,
          rank: typeof raw.rank === 'number' ? raw.rank : 0,
          totalStudents: typeof raw.totalStudents === 'number' ? raw.totalStudents : 0,
          topicBreakdown: breakdown,
          status,
        });

        breakdown.forEach((item) => {
          const prev = topicAgg.get(item.topic) ?? { subject, sum: 0, count: 0 };
          prev.sum += item.percentage;
          prev.count += 1;
          topicAgg.set(item.topic, prev);
        });
      });

      recentResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const accents: Array<'purple' | 'mint' | 'amber'> = ['mint', 'purple', 'amber'];
      const topicMastery: TopicMastery[] = Array.from(topicAgg.entries())
        .slice(0, 3)
        .map(([topic, agg], index) => ({
          id: `topic-${index}`,
          topic,
          subject: agg.subject,
          masteryPercent: Math.round(agg.sum / agg.count),
          testsTaken: agg.count,
          accent: accents[index % accents.length],
        }));

      return { topicMastery, recentResults: recentResults.slice(0, 6) };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'results');
    }
  },

  async getStudentRankForTest(
    testId: string,
    studentId: string,
    showRankEnabled: boolean
  ): Promise<{ rank: number; totalStudents: number }> {
    if (!showRankEnabled) {
      return { rank: 0, totalStudents: 0 };
    }
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.getStudentRankForTest(testId, studentId);
    }
    if (!isFirebaseConfigured) return { rank: 0, totalStudents: 0 };
    const db = requireFirebaseDb();
    try {
      const snap = await getDocs(
        query(collection(db, 'results'), where('testId', '==', testId))
      );
      const entries = snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          studentId: typeof raw.studentId === 'string' ? raw.studentId : '',
          score: typeof raw.score === 'number' ? raw.score : 0,
          percentage: typeof raw.percentage === 'number' ? raw.percentage : 0,
        };
      });
      return computeStudentRank(studentId, entries);
    } catch {
      // Gracefully degrade if Firestore security rules haven't enabled peer results read yet
      return { rank: 0, totalStudents: 0 };
    }
  },

  async getStudentAnalyticsResults(
    studentId: string,
    publishedTests: TestItem[]
  ): Promise<StudentResultItem[]> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.getStudentAllResults();
    }
    if (!isFirebaseConfigured) return [];
    const db = requireFirebaseDb();

    try {
      const resultsSnap = await getDocs(
        query(collection(db, 'results'), where('studentId', '==', studentId), limit(100))
      );
      if (resultsSnap.empty) return [];

      const testById = new Map(publishedTests.map((t) => [t.id, t]));
      const items: StudentResultItem[] = resultsSnap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        const score = typeof raw.score === 'number' ? raw.score : 0;
        const totalMarks =
          typeof raw.totalMarks === 'number' && raw.totalMarks > 0 ? raw.totalMarks : 100;
        const percentage =
          typeof raw.percentage === 'number'
            ? raw.percentage
            : Math.round((score / totalMarks) * 100);
        const subject = typeof raw.subject === 'string' ? raw.subject : 'General';
        const testId = typeof raw.testId === 'string' ? raw.testId : d.id;
        const matchedTest = testById.get(testId);
        const showRank = Boolean(matchedTest?.settings.showRankToStudents);
        const status: StudentResultItem['status'] =
          raw.status === 'pending_eval'
            ? 'needs_review'
            : percentage >= 85
              ? 'distinction'
              : percentage >= 40
                ? 'passed'
                : 'needs_review';
        const breakdown = Array.isArray(raw.topicBreakdown)
          ? (raw.topicBreakdown as Array<{ topic?: string; percentage?: number }>).filter(
              (item): item is { topic: string; percentage: number } =>
                typeof item.topic === 'string' && typeof item.percentage === 'number'
            )
          : [];

        return {
          id: d.id,
          testId,
          testTitle: typeof raw.testTitle === 'string' ? raw.testTitle : 'Assessment',
          subject,
          date: toIsoString(raw.publishedAt),
          score,
          totalMarks,
          percentage,
          rank: typeof raw.rank === 'number' ? raw.rank : 0,
          totalStudents: typeof raw.totalStudents === 'number' ? raw.totalStudents : 0,
          showRank,
          topicBreakdown: breakdown,
          status,
        };
      });

      // Compute peer ranks ONLY for tests where professor enabled showRankToStudents
      const rankedTestIds = Array.from(
        new Set(items.filter((i) => i.showRank).map((i) => i.testId))
      );
      if (rankedTestIds.length > 0) {
        const rankMap = new Map<string, { rank: number; totalStudents: number }>();
        await Promise.all(
          rankedTestIds.map(async (tid) => {
            const r = await this.getStudentRankForTest(tid, studentId, true);
            rankMap.set(tid, r);
          })
        );
        items.forEach((item) => {
          if (item.showRank) {
            const r = rankMap.get(item.testId);
            if (r && r.rank > 0) {
              item.rank = r.rank;
              item.totalStudents = r.totalStudents;
            }
          } else {
            item.rank = 0;
            item.totalStudents = 0;
          }
        });
      }

      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'results');
    }
  },

  async getNotifications(uid: string): Promise<AppNotification[]> {
    if (isDemoModeActive()) {
      const role = getActiveDemoRole() ?? 'professor';
      const { demoService } = await import('../features/demo/demoService');
      return demoService.getNotifications(role);
    }
    if (!isFirebaseConfigured) return [];
    const db = requireFirebaseDb();
    const path = 'notifications';
    try {
      const snap = await getDocs(
        query(collection(db, path), where('userId', '==', uid), limit(20))
      );
      return snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          title: typeof raw.title === 'string' ? raw.title : 'Notification',
          message: typeof raw.message === 'string' ? raw.message : '',
          timeAgo: toIsoString(raw.createdAt),
          category:
            raw.category === 'integrity' ||
            raw.category === 'result' ||
            raw.category === 'test' ||
            raw.category === 'system'
              ? raw.category
              : 'system',
          read: Boolean(raw.read),
          role: 'all',
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async markAllNotificationsRead(
    _uid: string,
    current: AppNotification[]
  ): Promise<AppNotification[]> {
    if (triggerDemoWriteGuard('update notifications')) {
      throw new DemoReadOnlyError('update notifications');
    }
    if (!isFirebaseConfigured) return [];
    const db = requireFirebaseDb();
    const unread = current.filter((n) => !n.read);
    if (unread.length === 0) return current;
    try {
      const batch = writeBatch(db);
      unread.forEach((item) => {
        batch.update(doc(db, 'notifications', item.id), { read: true });
      });
      await batch.commit();
      return current.map((n) => ({ ...n, read: true }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  },

  // Helper to update aggregate stats cleanly
  async updateTestMetrics(
    testId: string,
    patch: { submittedCount?: number; averageScore?: number }
  ): Promise<void> {
    if (triggerDemoWriteGuard('update test metrics')) {
      throw new DemoReadOnlyError('update test metrics');
    }
    const db = requireFirebaseDb();
    await setDoc(doc(db, 'tests', testId), patch, { merge: true });
  },

  // Create notification helper
  async createNotification(payload: {
    userId: string;
    title: string;
    message: string;
    category: 'test' | 'result' | 'integrity' | 'system';
  }): Promise<void> {
    if (triggerDemoWriteGuard('create notifications')) {
      throw new DemoReadOnlyError('create notifications');
    }
    const db = requireFirebaseDb();
    await addDoc(collection(db, 'notifications'), {
      ...payload,
      read: false,
      createdAt: serverTimestamp(),
    });
  },
};
