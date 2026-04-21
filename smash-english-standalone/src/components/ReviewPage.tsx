import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  getTodayReviewService, 
  submitReviewFeedbackService,
  getReviewPromptService,
  importReviewArticleService,
  getReviewReadAloudAudioService
} from '../services/geminiService';
import type { TodayReviewResponse, SavedWord } from '../types';
import {
  Loader2, ArrowLeft, BrainCircuit, Sparkles,
  CheckCircle2, Trophy, X,
  MessageSquare, Headphones, BookType, LayoutGrid, RotateCcw,
  Mic2, BookText, Copy, ClipboardCheck, FilePlus, Volume2, Square
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getSavedWordLatestEncounter } from '../utils/savedWords';
import type { QuickLookupResult } from '../types';

interface ReviewPageProps {
  onBack: () => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({ onBack }) => {
  const [reviewData, setReviewData] = useState<TodayReviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackStatus, setFeedbackStatus] = useState<Record<number, number>>({}); // wordId -> rating
  const [prompt, setPrompt] = useState<string | null>(null);
  const [isPromptLoading, setIsPromptLoading] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [reviewMode, setReviewMode] = useState<'article' | 'cards'>('article');
  const [flippedIds, setFlippedIds] = useState<Set<number>>(new Set());
  const [activeModalWordId, setActiveModalWordId] = useState<number | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [loadingReadAloudWordId, setLoadingReadAloudWordId] = useState<number | null>(null);
  const [speakingWordId, setSpeakingWordId] = useState<number | null>(null);
  const readAloudCacheRef = useRef<Map<string, string>>(new Map());
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const readAloudRequestIdRef = useRef(0);

  useEffect(() => {
    fetchTodayReview();
  }, []);

  const fetchTodayReview = async () => {
    setIsLoading(true);
    try {
      const data = await getTodayReviewService();
      setReviewData(data);
      
      const initialFeedback: Record<number, number> = {};
      const todayStr = new Date().toISOString().split('T')[0];
      data.words.forEach(w => {
        if (w.last_review && w.last_review.startsWith(todayStr)) {
          initialFeedback[w.id] = 2; // 默认 Good
        }
      });
      setFeedbackStatus(initialFeedback);
    } catch (err) {
      console.error(err);
      alert('无法获取今日复习内容');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (wordId: number, rating: number) => {
    if (feedbackStatus[wordId]) return;
    try {
      await submitReviewFeedbackService({ word_id: wordId, rating });
      setFeedbackStatus((prev: Record<number, number>) => ({ ...prev, [wordId]: rating }));
    } catch (err) {
      alert('提交反馈失败');
    }
  };

  const handleGetPrompt = async () => {
    setIsPromptLoading(true);
    try {
      const data = await getReviewPromptService();
      setPrompt(data.prompt);
    } catch (err) {
      alert('获取 Prompt 失败');
    } finally {
      setIsPromptLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleImport = async () => {
    if (!importJson.trim()) return;
    setIsImporting(true);
    try {
      const data = JSON.parse(importJson);
      await importReviewArticleService({
        title: data.title,
        content: data.content,
        article_type: data.article_type
      } as any);
      alert('导入成功！');
      setImportJson('');
      setPrompt(null);
      fetchTodayReview();
    } catch (err) {
      console.error(err);
      alert('导入失败：请确保输入的是正确的 JSON 格式');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('确定要重新生成吗？这将清空当前文章内容。')) return;
    try {
      if (reviewData?.article?.id) {
        await importReviewArticleService({
          title: `${new Date().toISOString().split('T')[0]} 复习计划`,
          content: '',
          article_type: 'none'
        } as any);
      }
      setPrompt(null);
      fetchTodayReview();
    } catch (err) {
      alert('操作失败');
    }
  };

  const completedCount = useMemo(() => {
    return Object.keys(feedbackStatus).length;
  }, [feedbackStatus]);

  const remainingWords = useMemo(() => {
    if (!reviewData) return [];
    return reviewData.words.filter((word) => !feedbackStatus[word.id]);
  }, [reviewData, feedbackStatus]);

  const currentCard = remainingWords[currentCardIndex] ?? null;

  useEffect(() => {
    if (currentCardIndex >= remainingWords.length) {
      setCurrentCardIndex(Math.max(remainingWords.length - 1, 0));
    }
  }, [currentCardIndex, remainingWords.length]);

  const stopReadAloud = () => {
    readAloudRequestIdRef.current += 1;
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    setSpeakingWordId(null);
    setLoadingReadAloudWordId(null);
  };

  useEffect(() => {
    return () => {
      stopReadAloud();
      for (const url of readAloudCacheRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      readAloudCacheRef.current.clear();
    };
  }, []);

  const getReadAloudText = (word: SavedWord, lookup: QuickLookupResult | null) => {
    return String(lookup?.baseForm || word.word || '').trim();
  };

  const renderHighlightedContext = (context: string, word: string) => {
    const safeContext = String(context || '').trim();
    const safeWord = String(word || '').trim();

    if (!safeContext) {
      return '当前单词暂时没有可展示的语境。';
    }

    if (!safeWord) {
      return safeContext;
    }

    const escapedWord = safeWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return safeContext.split(new RegExp(`(${escapedWord})`, 'gi')).map((part, index) => {
      if (part.toLowerCase() !== safeWord.toLowerCase()) {
        return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
      }

      return (
        <span
          key={`${part}-${index}`}
          className="rounded-lg bg-pink-100 px-1.5 py-0.5 font-bold text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
        >
          {part}
        </span>
      );
    });
  };

  const handlePlayReadAloud = async (word: SavedWord, lookup: QuickLookupResult | null) => {
    const text = getReadAloudText(word, lookup);
    if (!text) {
      alert('当前单词缺少可朗读内容');
      return;
    }

    if (speakingWordId === word.id) {
      stopReadAloud();
      return;
    }

    stopReadAloud();
    const requestId = readAloudRequestIdRef.current;
    setLoadingReadAloudWordId(word.id);

    try {
      let audioUrl = readAloudCacheRef.current.get(text);
      if (!audioUrl) {
        const audioBlob = await getReviewReadAloudAudioService(text);
        if (requestId !== readAloudRequestIdRef.current) return;
        audioUrl = URL.createObjectURL(audioBlob);
        readAloudCacheRef.current.set(text, audioUrl);
      }

      if (requestId !== readAloudRequestIdRef.current) return;

      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      audio.onended = () => {
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
          setSpeakingWordId(null);
        }
      };
      audio.onerror = () => {
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
          setSpeakingWordId(null);
        }
      };

      setSpeakingWordId(word.id);
      await audio.play();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || '朗读失败，请稍后重试');
    } finally {
      setLoadingReadAloudWordId((current) => (current === word.id ? null : current));
    }
  };

  const renderReadAloudButton = (word: SavedWord, lookup: QuickLookupResult | null, className: string) => {
    const isLoading = loadingReadAloudWordId === word.id;
    const isSpeaking = speakingWordId === word.id;
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          handlePlayReadAloud(word, lookup);
        }}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSpeaking ? (
          <Square className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
        <span>{isLoading ? '生成中...' : isSpeaking ? '停止朗读' : '朗读'}</span>
      </button>
    );
  };



  const renderContentWithHighlights = () => {
    if (!reviewData?.article) return null;
    const { words } = reviewData;
    return (
      <div className="prose prose-lg prose-pink dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            strong: ({ node, ...props }) => {
              const text = props.children;
              const wordStr = Array.isArray(text) ? text.join('') : String(text);
              const wordObj = words.find((w: SavedWord) => w.word.toLowerCase() === wordStr.toLowerCase());
              if (wordObj) {
                const isFinished = !!feedbackStatus[wordObj.id];
                return (
                  <button
                    onClick={() => {
                      setActiveModalWordId(wordObj.id);
                    }}
                    className={`font-bold transition-all px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 ${isFinished
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-b-2 border-green-500'
                        : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-b-2 border-pink-500 hover:scale-105'
                      }`}
                  >
                    {props.children}
                    {isFinished && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                );
              }
              return <strong className="font-bold text-gray-900 dark:text-white" {...props} />;
            },
            h1: ({ node, ...props }) => <h1 className="text-4xl font-serif font-bold mt-8 mb-4 text-gray-900 dark:text-white" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-3xl font-serif font-bold mt-8 mb-4 text-gray-900 dark:text-white" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-2xl font-serif font-bold mt-6 mb-3 text-pink-600 dark:text-pink-400" {...props} />,
            h4: ({ node, ...props }) => <h4 className="text-xl font-bold mt-4 mb-2 text-gray-700 dark:text-gray-300" {...props} />,
            p: ({ node, ...props }) => {
              const content = props.children;
              const textContent = Array.isArray(content) ? content.join('') : String(content);
              if (textContent.startsWith('Host:') || textContent.includes('**Host:**')) {
                return <p className="mb-4 leading-relaxed text-base text-gray-700 dark:text-gray-300" {...props} />;
              }
              return <p className="mb-6 leading-relaxed text-lg text-gray-700 dark:text-gray-300" {...props} />;
            },
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-blue-400 bg-blue-50/50 dark:bg-blue-900/10 pl-6 pr-4 py-4 my-6 italic text-gray-700 dark:text-gray-300 rounded-r-2xl" {...props} />
            ),
            hr: ({ node, ...props }) => (
              <hr className="my-12 border-t-2 border-gray-200 dark:border-gray-800" {...props} />
            ),
            ul: ({ node, ...props }) => <ul className="space-y-2 my-6" {...props} />,
            li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
            code: ({ node, ...props }: any) => {
              const inline = !props.className;
              return inline 
                ? <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400" {...props} />
                : <code className="block p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-mono overflow-x-auto" {...props} />;
            }
          }}
        >
          {reviewData.article.content}
        </ReactMarkdown>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        <p className="text-gray-500 animate-pulse">AI 正在为你准备今日特供复习文章...</p>
      </div>
    );
  }

  if (!reviewData || reviewData.words.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Trophy className="w-10 h-10 text-yellow-500" />
        </div>
        <div>
            <h2 className="text-2xl font-bold">今日任务完成！</h2>
            <p className="text-gray-500 mt-2">你还没有待复习的新词，请继续保持学习！</p>
        </div>
        <button onClick={onBack} className="px-6 py-2 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-all">返回收藏夹</button>
      </div>
    );
  }

  const { article, words } = reviewData;
  const currentCardOrder = currentCard ? Math.min(completedCount + currentCardIndex + 1, words.length) : completedCount;
  const cardProgressPercent = words.length ? Math.max((currentCardOrder / words.length) * 100, 4) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pb-32 animate-in fade-in slide-in-from-right-4 duration-500 px-4">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 border-b border-gray-100 dark:border-gray-800 px-2">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-pink-500 transition-colors group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium hidden md:inline">退出挑战</span>
        </button>

        <div className="flex items-center gap-1 p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-xl w-full md:w-auto justify-center">
          <button onClick={() => setReviewMode('article')} className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${reviewMode === 'article' ? 'bg-white dark:bg-gray-700 text-pink-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <BookType className="w-4 h-4" /> AI 文章模式
          </button>
          <button onClick={() => setReviewMode('cards')} className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${reviewMode === 'cards' ? 'bg-white dark:bg-gray-700 text-pink-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <LayoutGrid className="w-4 h-4" /> 单词卡片模式
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-300">
            <span className="text-gray-400 dark:text-gray-500">已完成</span>
            <span className="text-pink-500">{completedCount} / {words.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
            {article?.article_type === 'podcast' && <Mic2 className="w-5 h-5" />}
            {article?.article_type === 'interview' && <Headphones className="w-5 h-5" />}
            {article?.article_type === 'debate' && <MessageSquare className="w-5 h-5" />}
            {article?.article_type && (['blog', 'news'].includes(article.article_type)) && <BookText className="w-5 h-5" />}
            {!article && <BrainCircuit className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {reviewMode === 'article' ? (
        <>
          <header className="space-y-4 text-center py-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-50 dark:bg-pink-900/20 text-pink-500 rounded-full text-[10px] font-bold ring-1 ring-pink-100 dark:ring-pink-900/30 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              {(article && article.content) ? `今日特供 · ${article.article_type.toUpperCase()}` : "等待内容导入"}
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight px-4">
              {(article && article.content) ? article.title : "手动导入 AI 复习内容"}
            </h1>
          </header>

          {article?.content ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
               <button onClick={handleRegenerate} className="absolute top-6 right-6 z-10 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-pink-200 dark:border-pink-900 text-pink-600 dark:text-pink-400 rounded-xl text-sm font-bold hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all shadow-lg">
                <Sparkles className="w-4 h-4" /> 重新生成
              </button>
              {renderContentWithHighlights()}
            </div>
          ) : (
            <div className="space-y-8">
               <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <MessageSquare className="w-5 h-5 text-pink-500" />
                       <h3 className="font-bold">1. 获取 AI 复习 Prompt</h3>
                    </div>
                    {prompt && (
                      <button onClick={handleCopyPrompt} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isCopied ? 'bg-green-500 text-white' : 'bg-pink-500 text-white hover:bg-pink-600'}`}>
                         {isCopied ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                         {isCopied ? '已复制' : '复制 Prompt'}
                      </button>
                    )}
                  </div>
                  {!prompt ? (
                    <button onClick={handleGetPrompt} disabled={isPromptLoading} className="w-full py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 hover:text-pink-500 hover:border-pink-200 transition-all flex flex-col items-center gap-2">
                       {isPromptLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Sparkles className="w-8 h-8" />}
                       <span className="font-bold">点击生成今日复习 Prompt</span>
                    </button>
                  ) : (
                    <div className="bg-gray-50 dark:bg-black/40 rounded-2xl p-4 max-h-48 overflow-y-auto border border-gray-100 dark:border-gray-800">
                       <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans leading-relaxed">{prompt}</pre>
                    </div>
                  )}
               </div>

               <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2">
                      <FilePlus className="w-5 h-5 text-blue-500" />
                      <h3 className="font-bold">2. 导入 AI 生成的结果 (JSON)</h3>
                  </div>
                  <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)} placeholder='在此粘贴 AI 返回的 JSON 代码块...' className="w-full h-40 bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm font-code focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
                  <button onClick={handleImport} disabled={isImporting || !importJson.trim()} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all disabled:opacity-50">
                    {isImporting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "导入并刷新文章"}
                  </button>
               </div>
            </div>
          )}
        </>
      ) : (
        <section className="space-y-3 pt-1">
           {currentCard ? (
             (() => {
               const item = currentCard;
               const isFlipped = flippedIds.has(item.id);
               const latestEncounter = getSavedWordLatestEncounter(item);
               const activeLookup: QuickLookupResult | null = latestEncounter?.lookup ?? null;
               const activeContext = latestEncounter?.context || '';
               const readAloudText = getReadAloudText(item, activeLookup);
               const baseForm = String(activeLookup?.baseForm || '').trim();
               const displayWord = baseForm || String(item.word || '').trim();
               const currentForm = displayWord && item.word.toLowerCase() !== displayWord.toLowerCase() ? item.word : '';
               const feedbackOptions = [
                 {
                   rating: 1,
                   emoji: '😫',
                   label: 'Again',
                   className: 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/30',
                 },
                 {
                   rating: 2,
                   emoji: '🤔',
                   label: 'Hard',
                   className: 'border-orange-100 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300 dark:hover:bg-orange-950/30',
                 },
                 {
                   rating: 3,
                   emoji: '🙂',
                   label: 'Good',
                   className: 'border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300 dark:hover:bg-blue-950/30',
                 },
                 {
                   rating: 4,
                   emoji: '🤩',
                   label: 'Easy',
                   className: 'border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/30',
                 },
               ] as const;
               return (
                 <div className="px-2">
                   <div className="mx-auto max-w-4xl">
                     <div
                       key={item.id}
                       id={`word-card-${item.id}`}
                       className="overflow-hidden rounded-[2.25rem] border border-gray-200/80 bg-white shadow-[0_32px_100px_-56px_rgba(15,23,42,0.5)] dark:border-gray-800 dark:bg-gray-950"
                     >
                       <div className="border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90 sm:px-6">
                         <div className="flex flex-wrap items-center gap-3">
                           <div className="flex min-w-0 items-center gap-3">
                             <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-sm font-black text-white dark:bg-white dark:text-gray-900">
                               {currentCardOrder}
                             </div>
                             <div className="min-w-0">
                               <div className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">Current Card</div>
                               <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                 第 {currentCardOrder} 张 / 共 {words.length} 张
                               </div>
                             </div>
                           </div>
                           <div className="ml-auto inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-600 dark:bg-pink-900/20 dark:text-pink-300">
                             剩 {remainingWords.length}
                           </div>
                         </div>
                         <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                           <div
                             className="h-full rounded-full bg-gradient-to-r from-gray-900 via-pink-500 to-orange-400 transition-all duration-500 dark:from-white dark:via-pink-400 dark:to-orange-300"
                             style={{ width: `${cardProgressPercent}%` }}
                           />
                         </div>
                       </div>

                       <div className="border-b border-gray-100 bg-gradient-to-br from-slate-50 via-white to-pink-50/70 px-5 py-6 dark:border-gray-800 dark:from-gray-950 dark:via-gray-950 dark:to-pink-950/10 sm:px-6 sm:py-7">
                         <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                           <div className="min-w-0 space-y-4">
                             <div className="flex flex-wrap items-center gap-2">
                               <span className="inline-flex items-center rounded-full border border-pink-100 bg-pink-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-pink-600 dark:border-pink-900/30 dark:bg-pink-900/20 dark:text-pink-300">
                                 Flash Review
                               </span>
                               {currentForm && (
                                 <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                                   当前词形 {currentForm}
                                 </span>
                               )}
                             </div>

                             <div className="space-y-2">
                               <h3 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                                 {displayWord || item.word}
                               </h3>
                               {readAloudText && readAloudText.toLowerCase() !== item.word.toLowerCase() && (
                                 <div className="text-sm text-gray-500 dark:text-gray-400">
                                   朗读将使用原型 <span className="font-semibold text-gray-700 dark:text-gray-200">{readAloudText}</span>
                                 </div>
                               )}
                             </div>

                             <div className="max-w-2xl space-y-2">
                               <div className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">Recall Prompt</div>
                               <p className="text-sm leading-7 text-gray-500 dark:text-gray-400 sm:text-base">
                                 先看单词和例句，自己想一想它在这个语境里的意思，再展开查看答案和解析。
                               </p>
                             </div>
                           </div>

                           <div className="flex flex-col items-stretch gap-3 sm:flex-row lg:w-52 lg:flex-col">
                             {renderReadAloudButton(
                               item,
                               activeLookup,
                               'inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-600 transition hover:bg-blue-100 dark:border-blue-900/30 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50'
                             )}
                             <button
                               type="button"
                               onClick={() =>
                                 setFlippedIds((prev) => {
                                   const next = new Set(prev);
                                   if (next.has(item.id)) {
                                     next.delete(item.id);
                                   } else {
                                     next.add(item.id);
                                   }
                                   return next;
                                 })
                               }
                               className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                                 isFlipped
                                   ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                                   : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
                               }`}
                             >
                               {isFlipped ? <RotateCcw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                               {isFlipped ? '收起解析' : '查看释义'}
                             </button>
                           </div>
                         </div>
                       </div>

                       <div className="space-y-6 px-5 py-6 dark:bg-gray-950 sm:px-6 sm:py-7">
                         <div className="rounded-[1.75rem] border border-gray-200/80 bg-slate-50/85 p-5 dark:border-gray-800 dark:bg-gray-900/70">
                           <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">
                             <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                             Context
                           </div>
                           <p className="text-base leading-8 text-gray-700 dark:text-gray-200 sm:text-lg">
                             {renderHighlightedContext(activeContext, item.word)}
                           </p>
                         </div>

                         {isFlipped ? (
                           <div className="space-y-5">
                             <div className="space-y-4 rounded-[1.75rem] border border-pink-100 bg-pink-50/80 p-5 dark:border-pink-900/30 dark:bg-pink-950/10">
                               <div className="flex flex-wrap items-center gap-2">
                                 {activeLookup?.partOfSpeech && (
                                   <span className="inline-flex items-center rounded-full border border-pink-100 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-pink-600 dark:border-pink-900/30 dark:bg-gray-900 dark:text-pink-300">
                                     {activeLookup.partOfSpeech}
                                   </span>
                                 )}
                                 {activeLookup?.grammarRole && (
                                   <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-600 dark:border-indigo-900/30 dark:bg-indigo-900/20 dark:text-indigo-300">
                                     {activeLookup.grammarRole}
                                   </span>
                                 )}
                               </div>
                               <div>
                                 <div className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">Meaning In Context</div>
                                 <p className="mt-2 text-2xl font-bold leading-tight text-pink-600 dark:text-pink-400 sm:text-3xl">
                                   {activeLookup?.contextMeaning || '当前语境释义暂未生成'}
                                 </p>
                               </div>
                             </div>

                             {activeLookup?.englishDefinition && (
                               <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50/80 p-5 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                                 <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">
                                   English Definition
                                 </div>
                                 <p className="mt-3 text-sm leading-7 text-emerald-950 dark:text-emerald-100 sm:text-[15px]">
                                   {activeLookup.englishDefinition}
                                 </p>
                               </div>
                             )}

                             <div className="rounded-[1.75rem] border border-gray-200/80 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/70">
                               <div className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">AI Explanation</div>
                               <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300 sm:text-[15px]">
                                 {activeLookup?.explanation || '当前单词暂时没有解析内容。'}
                               </p>
                             </div>

                             {activeLookup?.otherMeanings && activeLookup.otherMeanings.length > 0 && (
                               <div className="grid gap-3 sm:grid-cols-2">
                                 {activeLookup.otherMeanings.map((m: any, idx: number) => (
                                   <div key={idx} className="rounded-[1.5rem] border border-gray-200/80 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                                     <div className="text-sm font-bold text-gray-900 dark:text-white">{m.meaning}</div>
                                     <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">"{m.example}"</p>
                                   </div>
                                 ))}
                               </div>
                             )}

                             <div className="border-t border-gray-100 pt-5 dark:border-gray-800">
                               <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">Rate This Word</div>
                               <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                 {feedbackOptions.map((option) => (
                                   <button
                                     key={option.rating}
                                     onClick={() => handleFeedback(item.id, option.rating)}
                                     className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-[1.5rem] border px-3 py-4 text-center transition-all ${option.className}`}
                                   >
                                     <span className="text-2xl">{option.emoji}</span>
                                     <span className="text-xs font-black uppercase tracking-[0.12em]">{option.label}</span>
                                   </button>
                                 ))}
                               </div>
                             </div>
                           </div>
                         ) : (
                           <button
                             type="button"
                             onClick={() => setFlippedIds((prev) => new Set(prev).add(item.id))}
                             className="flex w-full items-center justify-center gap-3 rounded-[1.75rem] border border-dashed border-pink-200 bg-pink-50/70 px-5 py-6 text-left text-pink-600 transition hover:bg-pink-100 dark:border-pink-900/30 dark:bg-pink-950/10 dark:text-pink-300 dark:hover:bg-pink-950/20"
                           >
                             <Sparkles className="h-5 w-5 shrink-0" />
                             <div>
                               <div className="text-sm font-bold">展开查看完整释义、英英定义和 AI 解析</div>
                               <div className="mt-1 text-xs text-pink-500/80 dark:text-pink-300/80">评分区会在展开后出现在卡片底部，不再挤在一个滚动容器里。</div>
                             </div>
                           </button>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>
               );
             })()
           ) : (
             <div className="mx-auto max-w-2xl rounded-[2rem] border border-green-100 bg-white p-10 text-center shadow-xl dark:border-green-900/30 dark:bg-gray-900">
               <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                 <CheckCircle2 className="h-8 w-8" />
               </div>
               <h3 className="text-2xl font-bold text-gray-900 dark:text-white">这轮单词卡片已经全部完成</h3>
               <p className="mt-2 text-sm text-gray-500">当前页面没有待处理的卡片了，可以返回文章模式复盘，或者直接完成今日挑战。</p>
             </div>
           )}
        </section>
      )}

      {completedCount === words.length && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in zoom-in-50 duration-500">
          <div className="bg-gradient-to-tr from-green-500 to-emerald-400 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 text-white">
            <Trophy className="w-8 h-8" />
            <div>
              <div className="font-bold text-lg">挑战完成！</div>
              <div className="text-xs opacity-90">今日复习的所有单词已全部吸收</div>
            </div>
            <button onClick={onBack} className="ml-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all">完成</button>
          </div>
        </div>
      )}

      {/* Article Mode Word Card Modal */}
      {activeModalWordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
           <div 
             className="absolute inset-0 bg-black/40 backdrop-blur-md"
             onClick={() => setActiveModalWordId(null)}
           />
           <div className="relative w-full max-w-lg bg-white dark:bg-gray-950 border-2 border-pink-100 dark:border-pink-900/30 rounded-[2.5rem] p-8 flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh]">
              {/* Close Button */}
              <button 
                onClick={() => setActiveModalWordId(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>

              {(() => {
                const item = words.find(w => w.id === activeModalWordId);
                if (!item) return null;
                const latestEncounter = getSavedWordLatestEncounter(item);
                const activeLookup: QuickLookupResult | null = latestEncounter?.lookup ?? null;
                const lookupWord = String(item.word || '').trim();
                const baseForm = String(activeLookup?.baseForm || '').trim();
                const displayWord = baseForm || lookupWord;
                const currentForm = lookupWord && lookupWord.toLowerCase() !== displayWord.toLowerCase() ? lookupWord : '';
                return (
                  <>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30 px-3 py-1 rounded-full border border-pink-100 dark:border-pink-800/20 uppercase">
                            {activeLookup?.partOfSpeech}
                          </span>
                          {activeLookup?.grammarRole && (
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/20 uppercase">
                              {activeLookup.grammarRole}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">原型</div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{displayWord}</h3>
                            {renderReadAloudButton(
                              item,
                              activeLookup,
                              'inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-100 dark:border-blue-900/30 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50'
                            )}
                          </div>
                          {currentForm && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              当前词形 <span className="font-semibold text-gray-700 dark:text-gray-200">{currentForm}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">文中释义</div>
                          <p className="text-xl font-bold text-pink-600 dark:text-pink-400 leading-tight">
                            {activeLookup?.contextMeaning}
                          </p>
                        </div>

                        {activeLookup?.englishDefinition && (
                          <div className="space-y-2">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">英英释义</div>
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl text-sm text-emerald-950 dark:text-emerald-100 leading-6 border border-emerald-100 dark:border-emerald-900/30">
                              {activeLookup.englishDefinition}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI 深度解析</div>
                          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl text-xs text-gray-600 dark:text-gray-400 leading-6 border border-gray-100 dark:border-gray-800">
                            {activeLookup?.explanation}
                          </div>
                        </div>

                        {activeLookup?.otherMeanings && activeLookup.otherMeanings.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">其他常见释义</div>
                            <div className="space-y-2">
                              {activeLookup.otherMeanings.map((m: any, idx: number) => (
                                <div key={idx} className="flex flex-col gap-1 rounded-xl bg-gray-50/70 px-3 py-2 dark:bg-gray-900/40">
                                   <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{m.meaning}</span>
                                   <p className="text-xs text-gray-700 dark:text-gray-300 leading-6">"{m.example}"</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-50 dark:border-gray-900">
                      <div className="grid grid-cols-4 gap-3">
                        <button 
                          onClick={() => { handleFeedback(item.id, 1); setActiveModalWordId(null); }} 
                          className="flex flex-col items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-red-100 dark:border-red-900/30 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">😫</span>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Again</span>
                        </button>
                        <button 
                          onClick={() => { handleFeedback(item.id, 2); setActiveModalWordId(null); }} 
                          className="flex flex-col items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all border border-orange-100 dark:border-orange-900/30 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">🤔</span>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Hard</span>
                        </button>
                        <button 
                          onClick={() => { handleFeedback(item.id, 3); setActiveModalWordId(null); }} 
                          className="flex flex-col items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all border border-blue-100 dark:border-blue-900/30 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">🙂</span>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Good</span>
                        </button>
                        <button 
                          onClick={() => { handleFeedback(item.id, 4); setActiveModalWordId(null); }} 
                          className="flex flex-col items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all border border-green-100 dark:border-green-900/30 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">🤩</span>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Easy</span>
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
           </div>
        </div>
      )}
    </div>
  );
};
