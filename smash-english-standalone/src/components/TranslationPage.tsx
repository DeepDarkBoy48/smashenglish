import React, { useState, useCallback } from 'react';
import { Copy, Check, Info, RefreshCw, ChevronDown, SendHorizonal } from 'lucide-react';
import { translateAdvancedService } from '../services/geminiService';

const LANGUAGES = [
  { code: 'auto', name: '自动识别' },
  { code: 'zh', name: 'Chinese (Simplified, China)' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
];


interface TranslationPageProps {
  sourceText: string;
  setSourceText: (text: string) => void;
  translatedText: string;
  setTranslatedText: (text: string) => void;
}

export const TranslationPage: React.FC<TranslationPageProps> = ({
  sourceText,
  setSourceText,
  translatedText,
  setTranslatedText
}) => {
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleTranslate = useCallback(async (text: string) => {
    if (!text.trim()) {
      setTranslatedText('');
      return;
    }

    setIsLoading(true);
    try {
      const result = await translateAdvancedService({
        text,
        source_lang: sourceLang,
        target_lang: targetLang
      });
      setTranslatedText(result.translation);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedText('Error during translation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [sourceLang, targetLang]);

  const onTranslateClick = () => {
    handleTranslate(sourceText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onTranslateClick();
    }
  };

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };


  return (
    <div className="w-full max-w-6xl mx-auto px-2 md:px-4 py-0 md:py-2 animate-fade-in flex flex-col flex-1">
      {/* Container */}
      <div className="bg-white dark:bg-[#121212] rounded-3xl md:rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl flex flex-col flex-1 p-3 md:p-5 lg:p-6 transition-colors duration-300">
        
        {/* Header - Language Selection */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-3 md:mb-6 gap-2 md:gap-4">
          <div className="w-full sm:flex-1 min-w-0 relative">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full bg-gray-50/50 dark:bg-white/5 text-gray-900 dark:text-white/90 border border-gray-100 dark:border-white/10 rounded-xl md:rounded-2xl pl-3 md:pl-5 pr-8 md:pr-10 py-2 md:py-3.5 appearance-none focus:outline-none focus:ring-1 focus:ring-black/5 dark:focus:ring-white/10 transition-all cursor-pointer font-medium text-sm md:text-base truncate"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-white dark:bg-[#1a1a1a]">
                  {lang.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 dark:text-white/40 pointer-events-none" />
          </div>

          <button
            onClick={handleSwapLanguages}
            className="p-1.5 sm:p-2.5 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg md:rounded-xl transition-all text-gray-400 dark:text-white/60 hover:text-gray-900 dark:hover:text-white shrink-0 group"
          >
            <RefreshCw className="w-4 h-4 md:w-5 md:h-5 group-active:rotate-180 transition-transform duration-500 rotate-90 sm:rotate-0" />
          </button>

          <div className="w-full sm:flex-1 min-w-0 relative">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full bg-gray-50/50 dark:bg-white/5 text-gray-900 dark:text-white/90 border border-gray-100 dark:border-white/10 rounded-xl md:rounded-2xl pl-3 md:pl-5 pr-8 md:pr-10 py-2 md:py-3.5 appearance-none focus:outline-none focus:ring-1 focus:ring-black/5 dark:focus:ring-white/10 transition-all cursor-pointer font-medium text-sm md:text-base truncate"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-white dark:bg-[#1a1a1a]">
                  {lang.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 dark:text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Translation Area */}
        <div className="flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-4 lg:gap-6 flex-1 mb-3 md:mb-4 min-h-0">
          {/* Source Text Area */}
          <div className="relative group flex flex-col bg-gray-50/30 dark:bg-white/[0.02] rounded-2xl md:rounded-3xl border border-gray-100 dark:border-white/5 focus-within:ring-2 focus-within:ring-gray-100 dark:focus-within:ring-white/5 transition-all min-h-[160px] md:min-h-0 h-full">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or paste text to translate"
              className="flex-1 bg-transparent text-gray-900 dark:text-white/90 p-4 md:p-6 pb-12 md:pb-16 resize-none focus:outline-none text-base md:text-lg leading-relaxed placeholder:text-gray-400 dark:placeholder:text-white/20"
            />
            <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 flex items-center gap-2 md:gap-3">
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-white/10 text-[10px] md:text-xs font-mono uppercase tracking-widest hidden md:flex">
                <span>{sourceText.length} chars</span>
              </div>
              <button
                onClick={onTranslateClick}
                disabled={!sourceText.trim() || isLoading}
                className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg md:rounded-xl active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none group border border-zinc-200 dark:border-zinc-700/50"
              >
                <span className="text-xs md:text-sm font-semibold">Translate</span>
                <SendHorizonal className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-500 dark:text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                <div className="hidden lg:flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-600 text-[10px] text-zinc-500 dark:text-zinc-400 opacity-70">
                  <span className="translate-y-[0.5px]">↵</span>
                </div>
              </button>
            </div>
          </div>

          {/* Target Text Area */}
          <div className="relative group flex flex-col bg-gray-50/50 dark:bg-white/[0.04] rounded-2xl md:rounded-3xl border border-gray-100 dark:border-white/5 transition-all min-h-[160px] md:min-h-0 h-full">
            <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar relative">
              {isLoading ? (
                <div className="flex items-center gap-2 text-gray-400 dark:text-white/30 animate-pulse">
                   <RefreshCw className="w-4 h-4 animate-spin" />
                   <span className="text-base md:text-lg">Translating...</span>
                </div>
              ) : translatedText ? (
                <div className="text-gray-900 dark:text-white/90 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-serif">
                  {translatedText}
                </div>
              ) : (
                <div className="text-gray-400 dark:text-white/10 text-base md:text-lg italic select-none">
                  Translation will appear here
                </div>
              )}

              {/* Copy Button */}
              {translatedText && !isLoading && (
                <button
                  onClick={handleCopy}
                  className="absolute bottom-2 right-2 md:bottom-4 md:right-4 p-2 md:p-2.5 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-transparent rounded-lg md:rounded-xl transition-all text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white group"
                  title="Copy Translation"
                >
                  {isCopied ? <Check className="w-4 h-4 md:w-5 md:h-5 text-green-600" /> : <Copy className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              )}
            </div>
            
            <div className="px-4 py-1.5 md:py-2 flex justify-end items-center text-gray-400 dark:text-white/10 text-[9px] md:text-xs font-mono uppercase tracking-widest">
              <span>Output</span>
            </div>
          </div>
        </div>


      </div>
      
      {/* Footer Info */}
      <div className="mt-3 md:mt-4 mb-1 flex items-center justify-center gap-2 text-gray-400 dark:text-white/20 text-[10px] md:text-xs">
        <Info className="w-3 h-3 md:w-3.5 md:h-3.5" />
        <span>Powered by Advanced AI for natural translations</span>
      </div>
    </div>
  );
};
