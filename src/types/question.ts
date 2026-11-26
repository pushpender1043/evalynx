export type QuestionType =
  | 'mcq'
  | 'multi_select'
  | 'true_false'
  | 'short_answer'
  | 'long_answer'
  | 'coding';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string;
  text: string;
}

/**
 * Student-safe question document stored in `tests/{testId}/questions/{questionId}`.
 * NEVER contains `correctAnswers` or `explanation`.
 */
export interface PublicQuestion {
  id: string;
  order: number;
  type: Exclude<QuestionType, 'coding'>;
  prompt: string;
  imageUrl?: string;
  options: QuestionOption[];
  marks: number;
  negativeMarks: number;
  difficulty: DifficultyLevel;
  topic: string;
  rubric?: string;
}

/**
 * Answer key entry stored exclusively in `tests/{testId}/private/answerKey`.
 */
export interface QuestionAnswerKeyEntry {
  correctAnswers: string[];
  explanation: string;
}

export interface TestAnswerKeyDoc {
  professorId: string;
  answers: Record<string, QuestionAnswerKeyEntry>;
  updatedAt?: unknown;
}

/**
 * Full editable question model used inside the Professor Test Builder.
 */
export interface BuilderQuestion extends PublicQuestion {
  correctAnswers: string[];
  explanation: string;
  savedToBank?: boolean;
}

export interface QuestionBankItem {
  id: string;
  ownerId: string;
  subject: string;
  topic: string;
  type: Exclude<QuestionType, 'coding'>;
  difficulty: DifficultyLevel;
  prompt: string;
  imageUrl?: string;
  options: QuestionOption[];
  correctAnswers: string[];
  marks: number;
  negativeMarks: number;
  explanation: string;
  rubric?: string;
  aiGenerated: boolean;
  tags: string[];
  createdAt: string;
}
