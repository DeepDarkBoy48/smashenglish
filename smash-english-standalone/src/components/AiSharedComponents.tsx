
import React from 'react';
import { Sparkles } from 'lucide-react';

export const CompactDictionaryResult: React.FC<{ result: any }> = ({ result }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2 border-b border-gray-100 dark:border-gray-800/60 pb-2">
        <h4 className="text-xl font-bold text-gray-900 dark:text-white leading-none">{result.word}</h4>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{result.phonetic}</span>
      </div>
      
      <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pt-2">
        {result.entries.map((entry: any, eIdx: number) => (
          <div key={eIdx} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                {entry.partOfSpeech}
              </span>
            </div>
            <div className="space-y-3 pl-1">
              {entry.definitions.map((def: any, dIdx: number) => (
                <div key={dIdx} className="text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-300 dark:text-gray-600 font-bold shrink-0">{dIdx + 1}.</span>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200 leading-snug">{def.meaning}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{def.explanation}</p>
                    </div>
                  </div>
                  <div className="mt-1.5 ml-6 p-2 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-100 dark:border-gray-800/60/50">
                    <p className="text-xs text-gray-600 dark:text-gray-300 italic">"{def.example}"</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{def.exampleTranslation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 快速上下文查词结果展示组件
export const QuickLookupDisplay: React.FC<{ result: any; isPinned?: boolean; hideContext?: boolean }> = ({ result, isPinned = false, hideContext = false }) => {
  const lookupWord = String(result?.word || '').trim();
  const baseForm = String(result?.baseForm || '').trim();
  const displayWord = baseForm || lookupWord;
  const currentForm = lookupWord && lookupWord.toLowerCase() !== displayWord.toLowerCase() ? lookupWord : '';

  return (
    <div className={`border rounded-xl ${isPinned ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 p-3.5' : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800/80 border-blue-200 dark:border-blue-900/50 rounded-xl p-4 shadow-sm'}`}>
      {/* 单词标题与词性/成分标签 */}
      <div className={`flex flex-wrap items-start gap-1.5 ${isPinned ? 'mb-2.5' : 'mb-3'}`}>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 dark:text-blue-300">原型</div>
          <span className={`font-bold text-blue-700 dark:text-blue-400 ${isPinned ? 'text-lg' : 'text-xl'}`}>
            {displayWord}
          </span>
          {currentForm && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              当前词形 <span className="font-semibold text-gray-700 dark:text-gray-200">{currentForm}</span>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {result.grammarRole && (
            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-[11px] font-medium rounded-full border border-indigo-200 dark:border-indigo-800/50">
              {result.grammarRole}
            </span>
          )}
        </div>
      </div>

      {/* 原句展示 */}
      {result.originalSentence && !hideContext && (
        <div className="mb-3 rounded-lg border border-gray-100 bg-white/90 px-3 py-3 dark:border-gray-700/50 dark:bg-gray-800/60">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">原句</div>
          <p className="text-sm text-gray-900 dark:text-gray-100 leading-7 font-normal pr-1">
            {(() => {
              const text = result.originalSentence;
              const word = result.word;
              if (!word) return `"${text}"`;
              
              // Use regex to case-insensitively find the word
              const parts = text.split(new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
              return (
                <>
                  "
                  {parts.map((part: string, i: number) => 
                    part.toLowerCase() === word.toLowerCase() ? (
                      <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded text-gray-900 dark:text-white">
                        {part}
                      </span>
                    ) : (
                      part
                    )
                  )}
                  "
                </>
              );
            })()}
          </p>
        </div>
      )}
      
      {/* 释义与词性 */}
      <div className={`${isPinned ? 'mb-2.5' : 'mb-3'}`}>
        <div className={`font-semibold text-gray-800 dark:text-gray-100 flex items-baseline gap-2 ${isPinned ? 'text-sm' : 'text-base'}`}>
          <span>{result.contextMeaning}</span>
          {result.partOfSpeech && (
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500 italic ml-1">
              ({result.partOfSpeech})
            </span>
          )}
        </div>
      </div>

      {result.englishDefinition && (
        <div className={`${isPinned ? 'mb-2.5' : 'mb-3'} rounded-lg border border-emerald-100/70 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/20`}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/90 dark:text-emerald-300/90">
            English Definition
          </div>
          <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100 leading-6">
            {result.englishDefinition}
          </p>
        </div>
      )}

      {/* 解释 */}
      <div className={`rounded-lg p-2.5 border ${isPinned ? 'bg-white/80 dark:bg-gray-900/30 border-blue-100/50 dark:border-gray-800' : 'bg-white/60 dark:bg-gray-900/40 border-blue-100/50 dark:border-gray-700'}`}>
        <div className="text-xs text-gray-600 dark:text-gray-300 leading-6">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span className="text-blue-500 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">为什么</span>
          </div>
          <p className="pl-2 border-l-2 border-blue-100 dark:border-blue-900/50">
            {result.explanation}
          </p>
        </div>
      </div>

      {/* 其他释义 */}
      {result.otherMeanings && result.otherMeanings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-1.5 mb-2 text-gray-500 dark:text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500/80 dark:text-blue-400/80">其他常见释义 & 例句</span>
          </div>
          <div className="space-y-2">
            {result.otherMeanings.map((m: any, idx: number) => (
              <div key={idx} className="flex flex-col gap-1 rounded-lg bg-white/50 px-2.5 py-2 dark:bg-gray-900/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{m.meaning}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">({m.partOfSpeech})</span>
                </div>
                {m.example && (
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-6 pl-2 border-l border-gray-200 dark:border-gray-700">
                    "{m.example}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>

  );
};
