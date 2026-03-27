import React, { useEffect, useState } from 'react';
import { 
  getDailyNotesService, 
  getNoteDetailService, 
  summarizeDailyNoteService,
  getSavedWordsService,
  deleteSavedWordEncounterService
} from '../services/geminiService';
import type { DailyNote, SavedWord, QuickLookupResult, OtherMeaning, SavedWordEncounter } from '../types';
import { 
  BookMarked, Clock, ChevronRight, ChevronLeft, MessageSquare, 
  Trash2, BookOpen, Loader2, Sparkles, Calendar, ArrowLeft, BrainCircuit, ExternalLink, Download, FileJson, FileCode, Filter, Search
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ReviewPage } from './ReviewPage';
import { getSavedWordEncounters, getSavedWordLatestLookup } from '../utils/savedWords';

export const SavedWordsPage: React.FC = () => {
  const [notes, setNotes] = useState<DailyNote[] | null>(null);
  const [selectedNote, setSelectedNote] = useState<{ note: DailyNote, words: SavedWord[] | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  
  // Master list states
  const [viewMode, setViewMode] = useState<'notebooks' | 'master'>('notebooks');
  const [allWords, setAllWords] = useState<SavedWord[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateQuery, setDateQuery] = useState('');
  const [isMasterLoading, setIsMasterLoading] = useState(false);
  const [currentEncounterIndex, setCurrentEncounterIndex] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const data = await getDailyNotesService();
      setNotes(data.notes);
    } catch (err: any) {
      console.error(err);
      alert('无法加载卡片列表，请稍后再试。');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllWords = async () => {
    if (allWords) return;
    setIsMasterLoading(true);
    try {
      const data = await getSavedWordsService();
      setAllWords(data.words);
    } catch (err) {
      console.error(err);
    } finally {
      setIsMasterLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'master') {
      fetchAllWords();
    }
  }, [viewMode]);

  const handleSelectNote = async (note: DailyNote) => {
    setSelectedNote({ note, words: null });
    try {
      const data = await getNoteDetailService(note.id);
      setSelectedNote(data);
    } catch (err) {
      console.error(err);
      alert('加载详情失败，请稍后再试。');
    } finally {
      // Done loading
    }
  };

  const handleSummarize = async () => {
    if (!selectedNote) return;
    setIsSummarizing(true);
    try {
      const data = await summarizeDailyNoteService(selectedNote.note.id);
      setSelectedNote({
        ...selectedNote,
        note: { 
          ...selectedNote.note, 
          title: data.title,
          summary: data.summary,
          content: data.content 
        }
      });
      fetchNotes();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const getEncounters = (item: SavedWord): SavedWordEncounter[] => getSavedWordEncounters(item);

  const getEncounterIndex = (item: SavedWord): number => {
    const encounters = getEncounters(item);
    const idx = currentEncounterIndex[item.id] ?? 0;
    return Math.min(Math.max(0, idx), Math.max(encounters.length - 1, 0));
  };

  const switchEncounter = (item: SavedWord, nextIndex: number) => {
    const total = getEncounters(item).length;
    const bounded = Math.min(Math.max(0, nextIndex), Math.max(total - 1, 0));
    setCurrentEncounterIndex(prev => ({ ...prev, [item.id]: bounded }));
  };

  const replaceWordInCollections = (updatedWord: SavedWord) => {
    setAllWords(prev => prev ? prev.map(w => w.id === updatedWord.id ? updatedWord : w) : prev);
    setSelectedNote(prev => prev ? {
      ...prev,
      words: prev.words ? prev.words.map(w => w.id === updatedWord.id ? updatedWord : w) : prev.words
    } : prev);
  };

  const removeWordFromCollections = (wordId: number) => {
    setAllWords(prev => prev ? prev.filter(w => w.id !== wordId) : prev);
    setSelectedNote(prev => prev ? {
      ...prev,
      words: prev.words ? prev.words.filter(w => w.id !== wordId) : prev.words
    } : prev);
    setCurrentEncounterIndex(prev => {
      const next = { ...prev };
      delete next[wordId];
      return next;
    });
  };

  const handleDeleteEncounter = async (item: SavedWord, encounter: SavedWordEncounter) => {
    if (!confirm('确定要删除当前来源卡片吗？')) return;
    try {
      const result = await deleteSavedWordEncounterService(item.id, encounter.key);
      if (result?.deleted) {
        removeWordFromCollections(item.id);
      } else if (result?.word) {
        replaceWordInCollections(result.word as SavedWord);
      }

      if (selectedNote) {
        const refreshed = await getNoteDetailService(selectedNote.note.id);
        setSelectedNote(refreshed);
      }
      fetchNotes();
    } catch (err) {
      alert('删除失败');
    }
  };

  const handleExportNote = (format: 'md' | 'json') => {
    if (!selectedNote || !selectedNote.words) return;
    const { note, words } = selectedNote;
    let content = '';
    let filename = `vocab_${note.day.replace(/-/g, '_')}`;

    if (format === 'md') {
      content = `# 今日词汇 (${words.length}) - ${note.day}\n\n`;
      words.forEach(item => {
        const encounters = getEncounters(item);
        content += `### ${item.word}\n\n`;
        encounters.forEach((enc, idx) => {
          const lookup = enc.lookup || ({} as QuickLookupResult);
          const meaning = lookup.contextMeaning || '';
          const englishDefinition = lookup.englishDefinition || '';
          const pos = lookup.partOfSpeech || '';
          const explanation = lookup.explanation || '';
          const sourceUrl = enc.url || '';
          const highlightedContext = (enc.context || '').replace(new RegExp(`(${item.word})`, 'gi'), '**$1**');
          content += `#### 来源 ${idx + 1}/${encounters.length}${pos ? ` [${pos.toUpperCase()}]` : ''}\n\n`;
          content += `**释义**: ${meaning}\n\n`;
          if (englishDefinition) content += `**英英释义**: ${englishDefinition}\n\n`;
          content += `> "${highlightedContext}"\n\n`;
          content += `**AI 解析**:\n${explanation}\n\n`;
          if (sourceUrl) content += `**来源**: [${sourceUrl}](${sourceUrl})\n\n`;
        });
        content += `---\n`;
      });
      filename += '.md';
    } else {
      content = JSON.stringify(words, null, 2);
      filename += '.json';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportAll = async (format: 'md' | 'json') => {
    setIsExporting(true);
    try {
      const data = await getSavedWordsService();
      if (!data.words || data.words.length === 0) {
        alert('没有可以导出的单词');
        return;
      }
      let content = '';
      let filename = `smash_english_export_${new Date().toISOString().split('T')[0]}`;

      if (format === 'md') {
        content = data.words.map(item => {
          const encounters = getEncounters(item);
          const encounterMd = encounters.map((enc, idx) => {
            const lookup = enc.lookup || ({} as QuickLookupResult);
            const meaning = lookup.contextMeaning || '';
            const englishDefinition = lookup.englishDefinition || '';
            const pos = lookup.partOfSpeech || '';
            const explanation = lookup.explanation || '';
            const sourceUrl = enc.url || '';
            const highlightedContext = (enc.context || '').replace(new RegExp(`(${item.word})`, 'gi'), '**$1**');
            return `## 来源 ${idx + 1}/${encounters.length}${pos ? ` [${pos.toUpperCase()}]` : ''}\n\n` +
              `**${meaning}**\n\n` +
              (englishDefinition ? `**英英释义**: ${englishDefinition}\n\n` : '') +
              `> "${highlightedContext}"\n\n` +
              `**AI 解析**:\n${explanation}\n\n` +
              (sourceUrl ? `**来源**: [${sourceUrl}](${sourceUrl})\n\n` : '');
          }).join('');

          return `# ${item.word}\n\n${encounterMd}---\n`;
        }).join('\n');
        filename += '.md';
      } else {
        content = JSON.stringify(data.words, null, 2);
        filename += '.json';
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const renderWordCard = (item: SavedWord) => {
    const encounters = getEncounters(item);
    if (encounters.length === 0) return null;
    const index = getEncounterIndex(item);
    const activeEncounter = encounters[index] || encounters[0];
    const data = (activeEncounter?.lookup || getSavedWordLatestLookup(item) || {}) as QuickLookupResult;
    const activeContext = activeEncounter?.context || '';
    const readingId = activeEncounter?.reading_id;
    const videoId = activeEncounter?.video_id;
    const sourceUrl = activeEncounter?.url;

    return (
      <div key={item.id} className="group relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 sm:p-8 hover:shadow-2xl hover:border-pink-200 dark:hover:border-pink-900/30 transition-all duration-500 flex flex-col h-full">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
          {encounters.length > 1 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/90 dark:bg-gray-800/90 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <button
                onClick={() => switchEncounter(item, index - 1)}
                disabled={index <= 0}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="上一来源"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-bold text-gray-500 min-w-[42px] text-center">
                {index + 1}/{encounters.length}
              </span>
              <button
                onClick={() => switchEncounter(item, index + 1)}
                disabled={index >= encounters.length - 1}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="下一来源"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            onClick={() => handleDeleteEncounter(item, activeEncounter)}
            className="text-gray-300 hover:text-red-500 transition-colors"
            title="删除当前来源"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {(() => {
          const lookupWord = String(item.word || '').trim();
          const baseForm = String(data?.baseForm || '').trim();
          const displayWord = baseForm || lookupWord;
          const currentForm = lookupWord && lookupWord.toLowerCase() !== displayWord.toLowerCase() ? lookupWord : '';

          return (
            <div className="mb-3 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">原型</div>
                  <h3 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 dark:text-white uppercase">{displayWord}</h3>
                  {currentForm && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      当前词形 <span className="font-semibold text-gray-700 dark:text-gray-200">{currentForm}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {data?.partOfSpeech && (
                    <span className="text-[10px] font-black text-pink-500 bg-pink-50 dark:bg-pink-900/20 px-2 py-1 rounded-md uppercase tracking-wider ring-1 ring-pink-100 dark:ring-pink-900/30">
                      {data.partOfSpeech}
                    </span>
                  )}
                  {data?.grammarRole && (
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md tracking-wider ring-1 ring-indigo-100 dark:ring-indigo-900/30">
                      {data.grammarRole}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="mb-4">
          <p className="text-lg sm:text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
            {data?.contextMeaning}
          </p>
        </div>

        {data?.englishDefinition && (
          <div className="mb-4 rounded-xl border border-emerald-100/70 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900/30 dark:bg-emerald-950/15">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-300">
              English Definition
            </div>
            <p className="mt-1 text-sm sm:text-base text-emerald-950 dark:text-emerald-100 leading-6">
              {data.englishDefinition}
            </p>
          </div>
        )}

        <div className="relative bg-gray-50 dark:bg-white/5 rounded-xl p-3.5 sm:p-4 mb-4 border border-gray-100 dark:border-white/5">
          <MessageSquare className="absolute -top-3 -left-3 w-8 h-8 text-pink-200/50 dark:text-pink-900/20 fill-current" />
          <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 leading-7 font-normal relative z-10">
            "{activeContext.split(new RegExp(`(${item.word})`, 'gi')).map((part, i) => 
              part.toLowerCase() === item.word.toLowerCase() 
                ? <span key={i} className="text-pink-600 dark:text-pink-400 font-bold decoration-pink-300 dark:decoration-pink-700 underline underline-offset-4 decoration-2">{part}</span>
                : part
            )}"
          </p>
        </div>

        <div className="space-y-3 flex-1">
          {data?.explanation && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                <Sparkles className="w-3 h-3 text-pink-400" />
                AI 深度解析
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-6 bg-pink-50/30 dark:bg-pink-900/5 rounded-xl p-3 border border-pink-100/50 dark:border-pink-900/20">
                <ReactMarkdown>{data.explanation}</ReactMarkdown>
              </div>
            </div>
          )}

          {data?.otherMeanings && data.otherMeanings.length > 0 && (
            <div className="space-y-2 pt-3">
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                <BookOpen className="w-3 h-3 text-indigo-400" />
                其他常用释义
              </div>
              <div className="grid gap-2">
                {data.otherMeanings.map((m: OtherMeaning, idx: number) => (
                  <div key={idx} className="bg-indigo-50/30 dark:bg-indigo-900/5 border border-indigo-100/50 dark:border-indigo-900/20 rounded-xl p-3 group/item hover:bg-white dark:hover:bg-gray-800 transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-black text-indigo-500 uppercase px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 rounded">
                        {m.partOfSpeech}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{m.meaning}</span>
                    </div>
                    {m.example && (
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-6">
                        "{m.example}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {readingId ? (
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800/50">
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <BookOpen className="w-3.5 h-3.5" />
              精读记事本
            </div>
            <a 
              href={`/intensive-reading?id=${readingId}&word=${encodeURIComponent(item.word)}`} 
              className="text-xs font-bold text-pink-500 hover:text-white dark:text-pink-400 py-1.5 px-3 hover:bg-pink-500 rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>回到文章精读</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : videoId ? (
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800/50">
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <BrainCircuit className="w-3.5 h-3.5" />
              视频学习
            </div>
            <a 
              href={`/video-study?id=${videoId}`} 
              className="text-xs font-bold text-pink-500 hover:text-white dark:text-pink-400 py-1.5 px-3 hover:bg-pink-500 rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>回到视频学习</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : sourceUrl ? (
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800/50">
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <ExternalLink className="w-3.5 h-3.5" />
              外部来源
            </div>
            <a 
              href={sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs font-bold text-pink-500 hover:text-white dark:text-pink-400 py-1.5 px-3 hover:bg-pink-500 rounded-xl transition-all flex items-center gap-1.5"
            >
              <span className="max-w-[150px] truncate">
                {sourceUrl.replace(/^https?:\/\//, '').split('/')[0]}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : null}
      </div>
    );
  };

  const filteredMasterWords = allWords?.filter(w => {
    const encounterMeanings = getEncounters(w).map(enc => enc.lookup?.contextMeaning || '').join(' ');
    const encounterEnglishDefinitions = getEncounters(w).map(enc => enc.lookup?.englishDefinition || '').join(' ');
    const matchesSearch = w.word.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          encounterMeanings.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          encounterEnglishDefinitions.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !dateQuery || (w.created_at && w.created_at.includes(dateQuery));
    return matchesSearch && matchesDate;
  }) || [];

  if (isLoading && !notes && !selectedNote) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">正在同步数据...</p>
      </div>
    );
  }

  if (showReview) {
    return <ReviewPage onBack={() => setShowReview(false)} />;
  }

  if (selectedNote) {
    const { note, words } = selectedNote;
    return (
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-right-4 duration-500 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button 
            onClick={() => setSelectedNote(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-pink-500 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">返回列表</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 p-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <button onClick={() => handleExportNote('md')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">导出 MD</span>
              </button>
              <button onClick={() => handleExportNote('json')} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300">
                <FileCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">导出 JSON</span>
              </button>
            </div>
          </div>
        </div>

        <header className="space-y-4">
           <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">
             {note.title || `${note.day} 的学习札记`}
           </h1>
           <div className="flex items-center gap-4">
             <div className="px-3 py-1 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full text-xs font-bold ring-1 ring-pink-100">
               {note.word_count} 个关键词
             </div>
             {!note.content && (
               <button onClick={handleSummarize} disabled={isSummarizing} className="flex items-center gap-2 px-3 py-1 bg-pink-500 text-white rounded-full text-xs font-bold shadow-lg shadow-pink-500/20">
                 {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                 AI 生成博客
               </button>
             )}
           </div>
        </header>

        {note.content && (
          <div className="bg-white/50 dark:bg-gray-900/30 backdrop-blur-xl border border-white/20 dark:border-gray-800/50 rounded-3xl p-8 shadow-xl shadow-black/5">
            {note.summary && (
              <div className="mb-8 p-6 bg-pink-50/50 dark:bg-pink-900/10 border-l-4 border-pink-400 rounded-r-2xl">
                <p className="text-lg font-medium text-pink-950 dark:text-pink-100 italic leading-relaxed">
                  {note.summary}
                </p>
              </div>
            )}
            <div className="markdown-body text-gray-700 dark:text-gray-300">
              <ReactMarkdown>{note.content}</ReactMarkdown>
            </div>
          </div>
        )}

        <section className="space-y-6">
           <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-pink-500" />
              <h2 className="text-2xl font-bold font-serif">当日词汇表</h2>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {!words ? (
                Array.from({ length: note.word_count || 3 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 h-48 animate-pulse" />
                ))
              ) : words.map((word) => renderWordCard(word))}
           </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-pink-500/20 transform rotate-3 flex-shrink-0">
            <BookMarked className="w-6 h-6 sm:w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-gray-900 dark:text-white">
              时光词库
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              记录您的每一次语言探索
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 ml-0 sm:ml-auto">
           <button onClick={() => handleExportAll('md')} disabled={isExporting} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold hover:border-pink-500 hover:text-pink-500 transition-all shadow-sm">
             {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
             导出 MD
           </button>
           <button onClick={() => handleExportAll('json')} disabled={isExporting} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold hover:border-pink-500 hover:text-pink-500 transition-all shadow-sm">
             {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
             导出 JSON
           </button>
           <a 
             href="/words-management"
             className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-400 text-white rounded-xl text-xs font-bold hover:shadow-lg transition-all"
           >
             <Filter className="w-4 h-4" />
             管理词库
           </a>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
          <button 
            onClick={() => setViewMode('notebooks')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'notebooks' ? 'bg-white dark:bg-gray-700 text-pink-600 shadow-sm' : 'text-gray-500'}`}
          >
            学习记录
          </button>
          <button 
            onClick={() => setViewMode('master')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'master' ? 'bg-white dark:bg-gray-700 text-pink-600 shadow-sm' : 'text-gray-500'}`}
          >
            复习总表
          </button>
        </div>

        {viewMode === 'master' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <input 
                type="text" 
                placeholder="搜索单词、中释或英释..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <div className="relative flex-1 sm:flex-none">
              <input 
                type="date" 
                value={dateQuery}
                onChange={(e) => setDateQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {viewMode === 'notebooks' ? (
          <>
            <div className="col-span-full">
              <div onClick={() => setShowReview(true)} className="group cursor-pointer relative overflow-hidden bg-gradient-to-r from-pink-500 to-orange-400 rounded-3xl p-8 shadow-2xl shadow-pink-500/20 transition-all hover:scale-[1.01]">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <BrainCircuit className="w-40 h-40" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
                  <div>
                    <h2 className="text-3xl font-serif font-bold mb-2">沉浸式 AI 复习</h2>
                    <p className="text-white/80">AI 为你准备了专属文章。立刻开启挑战。</p>
                  </div>
                  <button className="flex items-center gap-2 px-6 py-3 bg-white text-pink-600 rounded-2xl font-bold">
                    开始复习
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            {notes?.map((note) => (
              <div key={note.id} onClick={() => handleSelectNote(note)} className="group cursor-pointer relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-8 hover:shadow-2xl transition-all flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {note.day}
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-serif text-gray-900 dark:text-white group-hover:text-pink-500 transition-colors mb-2">
                    {note.title || `${note.day} 的学习记录`}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {note.summary || "点击查看详情"}
                  </p>
                </div>
                <div className="mt-auto pt-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-400">
                    收录 <span className="text-pink-500 text-lg ml-1 font-black">{note.word_count}</span> 个词
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-pink-500" />
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="col-span-full">
            {isMasterLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
                <p className="text-gray-400">正在汇总词库...</p>
              </div>
            ) : filteredMasterWords.length === 0 ? (
              <div className="py-20 text-center opacity-40">
                <Search className="w-12 h-12 mx-auto mb-4" />
                <p>未找到单词</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredMasterWords.map(word => renderWordCard(word))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
