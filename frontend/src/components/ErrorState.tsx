import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = '😵 SOMETHING WENT WRONG',
  message = "We couldn't load the requested content. Please check your connection and try again.",
  onRetry
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto text-center space-y-4 shadow-xl">
      <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
        <AlertTriangle size={32} />
      </div>
      <h3 className="font-heading text-xl text-white">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 mx-auto transition-colors"
        >
          <RefreshCw size={16} />
          <span>TRY AGAIN</span>
        </button>
      )}
    </div>
  );
};
