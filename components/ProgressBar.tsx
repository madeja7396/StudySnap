import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percentage = Math.min(100, Math.max(0, ((current + 1) / total) * 100));

  return (
    <div className="w-full max-w-md mx-auto mb-6 px-1">
      <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
        <span>Progress</span>
        <span>{current + 1} / {total}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;