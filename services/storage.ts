import { QuizSet } from '../types';

const STORAGE_KEY = 'studysnap_history_v1';

export const saveQuizSet = (quizSet: QuizSet): void => {
  const history = loadHistory();
  // Check if exists, update if so
  const existingIndex = history.findIndex(q => q.id === quizSet.id);
  if (existingIndex >= 0) {
    history[existingIndex] = quizSet;
  } else {
    history.unshift(quizSet); // Add to top
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

export const loadHistory = (): QuizSet[] => {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const deleteQuizSet = (id: string): QuizSet[] => {
  const history = loadHistory().filter(q => q.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
};

export const updateQuizSetItem = (setId: string, updatedItem: any) => {
    const history = loadHistory();
    const setIndex = history.findIndex(s => s.id === setId);
    if (setIndex >= 0) {
        const itemIndex = history[setIndex].items.findIndex(i => i.id === updatedItem.id);
        if (itemIndex >= 0) {
            history[setIndex].items[itemIndex] = updatedItem;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        }
    }
};