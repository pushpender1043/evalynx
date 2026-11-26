// Phase 6 Placeholder Module — Gemini AI Question Generation & Subjective Grading contracts.
// All Gemini SDK calls will execute server-side behind /api/ai/* routes.

import type { DifficultyLevel, QuestionType } from '../../types';

export interface AiQuestionGenerationRequest {
  subject: string;
  topic: string;
  difficulty: DifficultyLevel;
  questionType: QuestionType;
  count: number;
  language: 'en' | 'hi';
}

export interface AiSubjectiveGradeSuggestion {
  suggestedMarks: number;
  maxMarks: number;
  rubricNotes: string;
  confidence: number;
}

export const PHASE_6_AI_ENGINE_STATUS = 'planned' as const;
