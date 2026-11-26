import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  DemoReadOnlyError,
  isDemoModeActive,
  triggerDemoWriteGuard,
} from '../features/demo/demoStore';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import type { BuilderQuestion, QuestionBankItem } from '../types';
import { requireFirebaseDb } from './firebase';
import { toIsoString } from './testService';

export const questionBankService = {
  async saveQuestionToBank(params: {
    ownerId: string;
    subject: string;
    question: BuilderQuestion;
  }): Promise<string> {
    if (triggerDemoWriteGuard('save questions to your Question Bank')) {
      throw new DemoReadOnlyError('save questions to your Question Bank');
    }
    const db = requireFirebaseDb();
    const path = 'questionBank';
    try {
      const ref = await addDoc(collection(db, path), {
        ownerId: params.ownerId,
        subject: params.subject.trim() || 'General',
        topic: params.question.topic.trim() || 'General',
        type: params.question.type,
        difficulty: params.question.difficulty,
        prompt: params.question.prompt.trim(),
        imageUrl: params.question.imageUrl || null,
        options: params.question.options,
        correctAnswers: params.question.correctAnswers,
        marks: params.question.marks,
        negativeMarks: params.question.negativeMarks,
        explanation: params.question.explanation.trim(),
        rubric: params.question.rubric?.trim() || null,
        aiGenerated: false,
        tags: [params.question.topic.trim() || 'General', params.question.difficulty],
        createdAt: serverTimestamp(),
      });
      return ref.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async listProfessorBank(ownerId: string): Promise<QuestionBankItem[]> {
    if (isDemoModeActive()) {
      const { demoService } = await import('../features/demo/demoService');
      return demoService.listProfessorBank();
    }
    const db = requireFirebaseDb();
    const path = 'questionBank';
    try {
      const snap = await getDocs(query(collection(db, path), where('ownerId', '==', ownerId)));
      return snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          ownerId: typeof raw.ownerId === 'string' ? raw.ownerId : ownerId,
          subject: typeof raw.subject === 'string' ? raw.subject : 'General',
          topic: typeof raw.topic === 'string' ? raw.topic : 'General',
          type: (typeof raw.type === 'string' ? raw.type : 'mcq') as QuestionBankItem['type'],
          difficulty:
            raw.difficulty === 'easy' || raw.difficulty === 'hard' ? raw.difficulty : 'medium',
          prompt: typeof raw.prompt === 'string' ? raw.prompt : '',
          imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
          options: Array.isArray(raw.options) ? (raw.options as QuestionBankItem['options']) : [],
          correctAnswers: Array.isArray(raw.correctAnswers)
            ? (raw.correctAnswers as string[])
            : [],
          marks: typeof raw.marks === 'number' ? raw.marks : 1,
          negativeMarks: typeof raw.negativeMarks === 'number' ? raw.negativeMarks : 0,
          explanation: typeof raw.explanation === 'string' ? raw.explanation : '',
          rubric: typeof raw.rubric === 'string' ? raw.rubric : undefined,
          aiGenerated: Boolean(raw.aiGenerated),
          tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
          createdAt: toIsoString(raw.createdAt),
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },
};
