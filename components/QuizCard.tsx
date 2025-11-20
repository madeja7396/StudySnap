import React, { useState, useEffect } from 'react';
import { QuizItem } from '../types';
import { generateInteractiveHint } from '../services/geminiService';

interface QuizCardProps {
  item: QuizItem;
  onNext: () => void;
  isLast: boolean;
  onUpdateItem: (updatedItem: QuizItem) => void; // Callback to save hints
}

const QuizCard: React.FC<QuizCardProps> = ({ item, onNext, isLast, onUpdateItem }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentHintLevel, setCurrentHintLevel] = useState(0); // 0 = no hint, 1-3 = active
  const [loadingHint, setLoadingHint] = useState(false);

  // Reset local state when the question changes
  useEffect(() => {
    setShowAnswer(false);
    setCurrentHintLevel(0);
    setLoadingHint(false);
  }, [item.id]);

  const handleGetHint = async () => {
    const nextLevel = currentHintLevel + 1;
    if (nextLevel > 3) return;

    // Check if we already have this hint cached
    // generatedHints[0] corresponds to level 1
    const cachedHint = item.generatedHints[nextLevel - 1];

    if (cachedHint) {
        setCurrentHintLevel(nextLevel);
        return;
    }

    setLoadingHint(true);
    try {
      const hintText = await generateInteractiveHint(item.question, item.answer, nextLevel, item.originalContext);
      
      // Create a new copy of item with the new hint
      const newHints = [...item.generatedHints];
      newHints[nextLevel - 1] = hintText;
      
      const updatedItem = { ...item, generatedHints: newHints };
      
      // Update parent state and local storage
      onUpdateItem(updatedItem);
      setCurrentHintLevel(nextLevel);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHint(false);
    }
  };

  const renderHintContent = () => {
      if (loadingHint) return "AIがヒントを生成しています...";
      if (currentHintLevel === 0) return null;
      return item.generatedHints[currentHintLevel - 1];
  };

  const getHintColor = (level: number) => {
      switch(level) {
          case 1: return "bg-blue-100 text-blue-700 border-blue-200";
          case 2: return "bg-yellow-100 text-yellow-700 border-yellow-200";
          case 3: return "bg-red-100 text-red-700 border-red-200";
          default: return "bg-gray-100 text-gray-700";
      }
  };

  const getHintLabel = (level: number) => {
      switch(level) {
          case 1: return "ヒント Lv.1 (概念)";
          case 2: return "ヒント Lv.2 (属性)";
          case 3: return "ヒント Lv.3 (核心)";
          default: return "ヒント";
      }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-slide-up perspective-1000">
      {/* Card Container */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col min-h-[450px]">
        
        {/* Header Status */}
        <div className="bg-primary/5 p-4 flex justify-between items-center border-b border-gray-100">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">問題</span>
          {item.originalContext && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full truncate max-w-[120px]">
              出典あり
            </span>
          )}
        </div>

        {/* Question Area */}
        <div className="p-6 flex-grow flex flex-col justify-center items-center text-center">
          <h2 className="text-2xl font-bold text-gray-800 leading-relaxed mb-4">
            {item.question}
          </h2>
        </div>

        {/* Hint Area */}
        { (currentHintLevel > 0 || loadingHint) && (
           <div className={`mx-4 mb-4 p-4 rounded-xl border animate-slide-up relative ${loadingHint ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 shadow-inner'}`}>
              <div className="flex items-start gap-3">
                 <div className={`p-1.5 rounded-full text-xs font-bold flex-shrink-0 ${getHintColor(currentHintLevel)}`}>
                    {loadingHint ? "..." : `Lv.${currentHintLevel}`}
                 </div>
                 <div className="flex-1">
                    <p className="text-xs text-gray-400 font-bold mb-1">
                       {loadingHint ? "AI思考中..." : getHintLabel(currentHintLevel)}
                    </p>
                    <p className="text-gray-800 text-sm font-medium leading-relaxed">
                        {renderHintContent()}
                    </p>
                 </div>
              </div>
           </div>
        )}

        {/* Answer Reveal Area */}
        {showAnswer && (
          <div className="mx-4 mb-6 p-5 bg-green-50 rounded-xl border border-green-100 animate-slide-up">
             <p className="text-xs font-bold text-green-600 mb-1 uppercase">答え</p>
             <p className="text-lg font-bold text-gray-800">{item.answer}</p>
             {item.originalContext && (
                 <div className="mt-2 pt-2 border-t border-green-100">
                     <p className="text-xs text-green-800/60 mb-0.5">元のテキスト:</p>
                     <p className="text-xs text-green-800 italic">{item.originalContext}</p>
                 </div>
             )}
          </div>
        )}

        {/* Controls */}
        <div className="p-4 bg-gray-50 flex flex-col gap-3">
          
          {!showAnswer ? (
             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleGetHint}
                  disabled={loadingHint || currentHintLevel >= 3}
                  className="py-3 px-4 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold shadow-sm active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${currentHintLevel >= 3 ? 'text-gray-300' : 'text-yellow-500'}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.854 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.462 1.509 1.333 1.509 2.316V18" />
                  </svg>
                  {currentHintLevel === 0 ? "ヒント" : currentHintLevel < 3 ? `次のヒント` : "ヒント切れ"}
                </button>
                <button 
                  onClick={() => setShowAnswer(true)}
                  className="py-3 px-4 rounded-xl bg-primary text-white font-semibold shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  答えを見る
                </button>
             </div>
          ) : (
            <button 
              onClick={onNext}
              className="w-full py-4 px-4 rounded-xl bg-gray-900 text-white font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
            >
              {isLast ? "完了" : "次の問題へ"}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizCard;