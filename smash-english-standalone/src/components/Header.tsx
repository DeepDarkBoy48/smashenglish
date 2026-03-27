
import { Sparkles, Book, PenTool, Star, BookOpen, Languages, Settings } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ApiKeyModal } from './ApiKeyModal';
import { useState } from 'react';
import logoUrl from '../assets/smash-english-logo-transparent.png';

interface HeaderProps {
  activeTab: 'analyzer' | 'dictionary' | 'writing' | 'youtube' | 'saved-words' | 'reading' | 'words-management' | 'translate';
  onNavigate: (tab: 'analyzer' | 'dictionary' | 'writing' | 'youtube' | 'saved-words' | 'reading' | 'words-management' | 'translate') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onNavigate }) => {
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);



  return (
    <header className="bg-white dark:bg-[#0d1117] border-b border-gray-100 dark:border-gray-800/60 sticky top-0 z-10 transition-colors">
      <div className="container mx-auto px-2 sm:px-4 h-11 md:h-12 flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 cursor-pointer shrink-0 min-w-0"
          onClick={() => onNavigate('analyzer')}
        >
          <img
            src={logoUrl}
            alt="smash english logo"
            className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-xl shrink-0"
          />
          <div className="min-w-0">
            <span className="block font-black text-sm sm:text-[15px] md:text-base tracking-[-0.04em] text-gray-900 dark:text-gray-50 whitespace-nowrap leading-none">
              Smash English
            </span>
            <span className="hidden md:block text-[8px] font-semibold tracking-[0.1em] text-orange-500 dark:text-orange-300 whitespace-nowrap leading-none mt-0.5">
              Built by Xu Chenyang
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-4 flex-1 min-w-0 justify-end">
          <nav className="flex gap-0.5 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl overflow-x-auto no-scrollbar flex-1 max-w-fit">
            <button
              onClick={() => onNavigate('translate')}
              className={`whitespace-nowrap px-2 sm:px-3 md:px-4 py-1 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold transition-all flex items-center gap-1 flex-shrink-0 ${activeTab === 'translate'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Languages className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">翻译</span>
              <span className="sm:hidden">翻译</span>
            </button>
            <button
              onClick={() => onNavigate('youtube')}
              className={`whitespace-nowrap px-2 sm:px-3 md:px-4 py-1 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold transition-all flex items-center gap-1 flex-shrink-0 ${activeTab === 'youtube'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              视频跟读
            </button>
            <button
              onClick={() => onNavigate('reading')}
              className={`whitespace-nowrap px-2 sm:px-3 md:px-4 py-1 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold transition-all flex items-center gap-1 flex-shrink-0 ${activeTab === 'reading'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              精读
            </button>
            <button
              onClick={() => onNavigate('saved-words')}
              className={`whitespace-nowrap px-2 sm:px-3 md:px-4 py-1 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold transition-all flex items-center gap-1 flex-shrink-0 ${activeTab === 'saved-words'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              复习
            </button>
            <button
              onClick={() => onNavigate('analyzer')}
              className={`whitespace-nowrap px-2 sm:px-3 md:px-4 py-1 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold transition-all flex items-center gap-1 flex-shrink-0 ${activeTab === 'analyzer'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              句法
            </button>
            <button
              onClick={() => onNavigate('dictionary')}
              className={`whitespace-nowrap px-2 sm:px-3 md:px-4 py-1 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold transition-all flex items-center gap-1 flex-shrink-0 ${activeTab === 'dictionary'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Book className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              词典
            </button>
            <button
              onClick={() => onNavigate('writing')}
              className={`whitespace-nowrap px-2 sm:px-3 md:px-4 py-1 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold transition-all flex items-center gap-1 flex-shrink-0 ${activeTab === 'writing'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <PenTool className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              写作
            </button>
            <button
              onClick={() => onNavigate('words-management')}
              className={`whitespace-nowrap px-2 sm:px-3 md:px-4 py-1 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold transition-all flex items-center gap-1 flex-shrink-0 ${activeTab === 'words-management'
                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Book className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              词库
            </button>
          </nav>
          
          <button
            onClick={() => setIsApiModalOpen(true)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="API 设置"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <ThemeToggle />
        </div>

      </div>
      <ApiKeyModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} />
    </header>
  );
};
