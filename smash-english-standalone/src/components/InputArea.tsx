import React, { useState } from 'react';
import { Send, Shuffle } from 'lucide-react';

interface InputAreaProps {
  onAnalyze: (sentence: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

const PRESETS = [
  "Regular exercise can improve confidence.",
  "The quick brown fox jumps over the lazy dog.",
  "To learn a new language requires patience.",
  "Rich countries can provide people with many job opportunities.",
  "Reading books expands your mind."
];

export const InputArea: React.FC<InputAreaProps> = ({ onAnalyze, isLoading, initialValue = "" }) => {
  const [text, setText] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onAnalyze(text);
    }
  };

  const handlePreset = () => {
    const random = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    setText(random);
  };

  return (
    <div className="bg-white dark:bg-[#0d1117] rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 p-6 border border-gray-100 dark:border-gray-800/60 transition-colors">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入英语句子..."
            disabled={isLoading}
            className="w-full pl-6 pr-32 py-4 text-lg rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-pink-400 dark:focus:border-pink-500 focus:ring-4 focus:ring-pink-100 dark:focus:ring-pink-900/50 transition-all outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <div className="absolute right-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreset}
              disabled={isLoading}
              title="随机示例"
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-pink-500 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/50 rounded-lg transition-all disabled:opacity-50"
            >
              <Shuffle className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={isLoading || !text.trim()}
              className="bg-pink-600 hover:bg-pink-700 dark:bg-pink-600 dark:hover:bg-pink-500 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-pink-600"
            >
              <span>分析</span>
              {!isLoading && <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider self-center mr-2">试一试:</span>
        {PRESETS.slice(0, 3).map((preset, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (!isLoading) {
                setText(preset);
                onAnalyze(preset);
              }
            }}
            disabled={isLoading}
            className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-pink-200 dark:hover:border-pink-700 text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 px-3 py-1.5 rounded-full transition-all cursor-pointer truncate max-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
};