import React, { useState, useEffect, useCallback } from 'react';
import CameraInput from './components/CameraInput';
import QuizCard from './components/QuizCard';
import ProgressBar from './components/ProgressBar';
import { generateQuizFromImage } from './services/geminiService';
import { loadHistory, saveQuizSet, deleteQuizSet, updateQuizSetItem } from './services/storage';
import { QuizItem, QuizSet, AppState } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  // Active Quiz State
  const [currentQuizSet, setCurrentQuizSet] = useState<QuizSet | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // History State
  const [history, setHistory] = useState<QuizSet[]>([]);

  // UI State
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, [appState]); // Reload when state changes (e.g. after finishing a quiz)

  const handleImageSelected = useCallback(async (base64: string) => {
    setAppState(AppState.PROCESSING);
    setLoadingMessage("画像を解析しています...");
    setError(null);

    try {
      await new Promise(r => setTimeout(r, 800)); // UX delay
      
      setLoadingMessage("AIが問題を生成中...");
      const newQuizSet = await generateQuizFromImage(base64);
      
      if (!newQuizSet.items || newQuizSet.items.length === 0) {
        throw new Error("問題が生成されませんでした。別の画像を試してください。");
      }

      // Save to local storage immediately
      saveQuizSet(newQuizSet);
      setHistory(loadHistory());

      // Start quiz
      startQuiz(newQuizSet);

    } catch (e: any) {
      setError(e.message || "エラーが発生しました。");
      setAppState(AppState.ERROR);
    }
  }, []);

  const startQuiz = (quizSet: QuizSet) => {
    setCurrentQuizSet(quizSet);
    setCurrentQuestionIndex(0);
    setAppState(AppState.QUIZ_ACTIVE);
  };

  const handleHistorySelect = (quizSet: QuizSet) => {
    startQuiz(quizSet);
  };

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteQuizSet(id);
    setHistory(updated);
  };

  const handleNextQuestion = () => {
    if (!currentQuizSet) return;
    if (currentQuestionIndex < currentQuizSet.items.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setAppState(AppState.COMPLETED);
    }
  };

  // Callback when QuizCard generates a new hint to persist it
  const handleUpdateQuizItem = (updatedItem: QuizItem) => {
    if (!currentQuizSet) return;
    
    // Update active state
    const updatedItems = [...currentQuizSet.items];
    updatedItems[currentQuestionIndex] = updatedItem;
    const updatedSet = { ...currentQuizSet, items: updatedItems };
    setCurrentQuizSet(updatedSet);

    // Persist to storage
    updateQuizSetItem(currentQuizSet.id, updatedItem);
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setCurrentQuizSet(null);
    setCurrentQuestionIndex(0);
    setError(null);
  };

  // --- Render Views ---

  const renderIdle = () => (
    <div className="flex flex-col flex-grow p-6 w-full max-w-lg mx-auto">
      {/* Header Area */}
      <div className="flex flex-col items-center text-center space-y-4 mb-8 mt-4">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">StudySnap AI</h1>
        <p className="text-sm text-gray-500">
          学習資料を撮影して、<br/>あなただけの問題集を作成しましょう。
        </p>
      </div>

      {/* Camera Input */}
      <div className="mb-10">
        <CameraInput onImageSelected={handleImageSelected} />
      </div>

      {/* History List */}
      <div className="flex-grow">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">過去の問題集</h3>
        {history.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">まだ履歴がありません</p>
          </div>
        ) : (
          <div className="space-y-3 pb-20">
            {history.map((set) => (
              <div 
                key={set.id}
                onClick={() => handleHistorySelect(set)}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
                    {set.items.length}問
                  </div>
                  <div className="flex-col overflow-hidden">
                     <h4 className="font-bold text-gray-800 truncate pr-2">{set.title}</h4>
                     <p className="text-xs text-gray-400">
                       {new Date(set.createdAt).toLocaleDateString('ja-JP')} • 未回答あり
                     </p>
                  </div>
                </div>
                <button 
                  onClick={(e) => handleDeleteHistory(e, set.id)}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="flex flex-col items-center justify-center flex-grow p-6 text-center">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary animate-pulse">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
      </div>
      <h2 className="text-xl font-bold text-gray-800 animate-pulse-fast">{loadingMessage}</h2>
      <p className="text-sm text-gray-400 mt-2">この処理には少し時間がかかります</p>
    </div>
  );

  const renderQuiz = () => (
    <div className="flex flex-col flex-grow p-6 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
         <button onClick={resetApp} className="text-sm font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            戻る
         </button>
         <span className="text-sm font-bold text-primary max-w-[180px] truncate">
           {currentQuizSet?.title}
         </span>
      </div>

      {currentQuizSet && (
        <>
          <ProgressBar current={currentQuestionIndex} total={currentQuizSet.items.length} />
          
          <QuizCard 
            item={currentQuizSet.items[currentQuestionIndex]} 
            onNext={handleNextQuestion}
            isLast={currentQuestionIndex === currentQuizSet.items.length - 1}
            onUpdateItem={handleUpdateQuizItem}
          />
        </>
      )}
    </div>
  );

  const renderCompleted = () => (
    <div className="flex flex-col items-center justify-center flex-grow p-6 text-center space-y-6 animate-slide-up">
       <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
       </div>
       <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">お疲れ様でした！</h2>
        <p className="text-gray-600">今回の学習セッションは終了です。</p>
        <p className="text-sm text-gray-400 mt-2">問題集は履歴に保存されました。</p>
       </div>
       
       <div className="flex flex-col w-full max-w-xs gap-3 mt-8">
         <button 
            onClick={resetApp}
            className="w-full py-4 px-6 rounded-xl bg-primary text-white font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
         >
            ホームに戻る
         </button>
       </div>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center flex-grow p-6 text-center">
      <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">エラーが発生しました</h3>
      <p className="text-gray-600 mb-8 max-w-xs mx-auto">{error}</p>
      <button 
        onClick={resetApp}
        className="py-3 px-8 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all"
      >
        ホームに戻る
      </button>
    </div>
  );

  return (
    <main className="flex-grow flex flex-col min-h-[100dvh] bg-background">
      {appState === AppState.IDLE && renderIdle()}
      {appState === AppState.PROCESSING && renderProcessing()}
      {appState === AppState.QUIZ_ACTIVE && renderQuiz()}
      {appState === AppState.COMPLETED && renderCompleted()}
      {appState === AppState.ERROR && renderError()}
    </main>
  );
};

export default App;