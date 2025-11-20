export interface QuizItem {
  id: string;
  question: string;
  answer: string;
  originalContext?: string;
  generatedHints: string[]; // Cache for hints (index 0 = level 1, index 1 = level 2...)
}

export interface QuizSet {
  id: string;
  title: string;
  createdAt: number;
  items: QuizItem[];
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  QUIZ_ACTIVE = 'QUIZ_ACTIVE',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface ProcessingStatus {
  step: 'uploading' | 'analyzing' | 'generating' | 'ready';
  message: string;
}