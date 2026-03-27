import React, { useEffect, useRef, useState } from 'react';
import { 
  getSavedWordsService, 
  deleteSavedWordService, 
  updateSavedWordService, 
  batchDeleteSavedWordsService,
  exportSavedWordsService,
  importSavedWordsService
} from '../services/geminiService';
import type { SavedWord, SavedWordEncounter } from '../types';
import {
  Trash2, Edit2, Check, X, Search,
  ChevronLeft, ChevronRight,
  BookOpen, ExternalLink, Download, Upload, Loader2
} from 'lucide-react';
import { getSavedWordEncounters, getSavedWordLatestLookup } from '../utils/savedWords';
import type { QuickLookupResult } from '../types';

export const WordsManagementPage: React.FC = () => {
  const DETAIL_SIDEBAR_MIN_WIDTH = 440;
  const DETAIL_SIDEBAR_MAX_WIDTH = 980;
  const DETAIL_SIDEBAR_DEFAULT_WIDTH = 680;
  const DETAIL_SIDEBAR_DESKTOP_BREAKPOINT = 1024;

  const [words, setWords] = useState<SavedWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<{ word: string; meaning: string; englishDefinition: string }>({
    word: '',
    meaning: '',
    englishDefinition: ''
  });
  const [activeWordId, setActiveWordId] = useState<number | null>(null);
  const [activeEncounterIndex, setActiveEncounterIndex] = useState(0);
  const [detailSidebarWidth, setDetailSidebarWidth] = useState(DETAIL_SIDEBAR_DEFAULT_WIDTH);
  const [isDetailSidebarResizing, setIsDetailSidebarResizing] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= DETAIL_SIDEBAR_DESKTOP_BREAKPOINT : true
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchWords();
  }, []);

  useEffect(() => {
    const handleViewportResize = () => {
      if (typeof window === 'undefined') return;
      setIsDesktopViewport(window.innerWidth >= DETAIL_SIDEBAR_DESKTOP_BREAKPOINT);

      const dynamicMax = Math.max(
        DETAIL_SIDEBAR_MIN_WIDTH,
        Math.min(DETAIL_SIDEBAR_MAX_WIDTH, window.innerWidth - 260)
      );
      setDetailSidebarWidth(prev => Math.min(prev, dynamicMax));
    };

    handleViewportResize();
    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, []);

  useEffect(() => {
    if (!isDetailSidebarResizing || !isDesktopViewport) return;

    const handleMouseMove = (event: MouseEvent) => {
      const dynamicMax = Math.max(
        DETAIL_SIDEBAR_MIN_WIDTH,
        Math.min(DETAIL_SIDEBAR_MAX_WIDTH, window.innerWidth - 260)
      );
      const rawWidth = window.innerWidth - event.clientX;
      const clampedWidth = Math.min(dynamicMax, Math.max(DETAIL_SIDEBAR_MIN_WIDTH, rawWidth));
      setDetailSidebarWidth(clampedWidth);
    };

    const stopResizing = () => setIsDetailSidebarResizing(false);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isDetailSidebarResizing, isDesktopViewport]);

  useEffect(() => {
    if (!activeWordId) return;
    const onEscClose = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveWordId(null);
    };
    window.addEventListener('keydown', onEscClose);
    return () => window.removeEventListener('keydown', onEscClose);
  }, [activeWordId]);

  const fetchWords = async () => {
    setIsLoading(true);
    try {
      const data = await getSavedWordsService();
      setWords(data.words);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个单词吗？')) return;
    try {
      await deleteSavedWordService(id);
      setWords(words.filter(w => w.id !== id));
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } catch (err) {
      alert('删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个单词吗？`)) return;
    try {
      await batchDeleteSavedWordsService(selectedIds);
      setWords(words.filter(w => !selectedIds.includes(w.id)));
      setSelectedIds([]);
    } catch (err) {
      alert('批量删除失败');
    }
  };

  const handleStartEdit = (word: SavedWord) => {
    const latestLookup = getSavedWordLatestLookup(word);
    setEditingId(word.id);
    setEditFormData({
      word: word.word,
      meaning: latestLookup?.contextMeaning || '',
      englishDefinition: latestLookup?.englishDefinition || ''
    });
  };

  const handleSaveEdit = async (id: number) => {
    try {
      const updatedWord = await updateSavedWordService(id, {
        word: editFormData.word,
        data: {
          contextMeaning: editFormData.meaning,
          englishDefinition: editFormData.englishDefinition
        }
      });

      setWords(words.map(w => w.id === id ? updatedWord : w));
      setEditingId(null);
    } catch (err) {
      alert('保存失败');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredWords.map(w => w.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const filteredWords = words.filter(w => 
    w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (getSavedWordLatestLookup(w)?.contextMeaning || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (getSavedWordLatestLookup(w)?.englishDefinition || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEncounters = (word: SavedWord): SavedWordEncounter[] => getSavedWordEncounters(word);

  const activeWord = activeWordId ? (words.find(w => w.id === activeWordId) || null) : null;
  const activeWordEncounters = activeWord ? getEncounters(activeWord) : [];
  const safeEncounterIndex = Math.min(activeEncounterIndex, Math.max(activeWordEncounters.length - 1, 0));
  const activeEncounter = activeWordEncounters[safeEncounterIndex];
  const activeLookup: QuickLookupResult | null = activeEncounter?.lookup || (activeWord ? getSavedWordLatestLookup(activeWord) : null);
  const activeSourceUrl = activeEncounter?.url;

  const openWordDetail = (word: SavedWord) => {
    if (editingId === word.id) return;
    setActiveWordId(word.id);
    setActiveEncounterIndex(0);
  };

  const startResizeDetailSidebar = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDesktopViewport) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDetailSidebarResizing(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setImportSummary(null);
    try {
      const payload = await exportSavedWordsService();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeDate = (payload.exported_at || new Date().toISOString()).replace(/[:\s]/g, '-');
      a.href = url;
      a.download = `smash-english-words-${safeDate}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePickImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportSummary(null);
    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);
      const payload = Array.isArray(parsed) ? { words: parsed } : parsed;

      if (!payload || !Array.isArray(payload.words)) {
        throw new Error('无效 JSON 格式，缺少 words 数组');
      }

      const result = await importSavedWordsService(payload);
      setImportSummary(`导入完成：共 ${result.total} 条，新增 ${result.imported}，合并 ${result.merged}，跳过 ${result.skipped}`);
      await fetchWords();
    } catch (err) {
      console.error(err);
      alert('导入失败，请确认文件是从词库导出的 JSON，或包含合法的 words 数组。');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-serif">词库汇总管理</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">全量单词的增删改查与批量复核</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              onClick={handlePickImportFile}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all active:scale-95 disabled:opacity-60"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              导入 JSON
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 rounded-xl font-bold text-sm hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-all active:scale-95 disabled:opacity-60"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              导出 JSON
            </button>
            {selectedIds.length > 0 && (
              <button 
                onClick={handleBatchDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                批量删除 ({selectedIds.length})
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜索单词、中释或英释..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all w-64"
              />
            </div>
          </div>
        </div>

        {importSummary && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-300">
            {importSummary}
          </div>
        )}

        {/* Table Container */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                      checked={selectedIds.length === filteredWords.length && filteredWords.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">单词</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">上下文释义</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">英英释义</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">收录时间</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">复习进度</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="px-6 py-8">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredWords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="w-8 h-8 opacity-20" />
                        <p>未找到匹配的单词</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredWords.map((word) => {
                    const latestLookup = getSavedWordLatestLookup(word);
                    return (
                    <tr
                      key={word.id}
                      onClick={() => openWordDetail(word)}
                      className={`group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer ${selectedIds.includes(word.id) ? 'bg-pink-50/20 dark:bg-pink-900/10' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                          checked={selectedIds.includes(word.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleSelectOne(word.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        {editingId === word.id ? (
                          <input 
                            type="text"
                            value={editFormData.word}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditFormData({ ...editFormData, word: e.target.value })}
                            className="w-full px-2 py-1 bg-white dark:bg-black border border-pink-500 rounded text-sm font-bold"
                          />
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white">{word.word}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-black">{latestLookup?.partOfSpeech}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                         {editingId === word.id ? (
                          <input 
                            type="text"
                            value={editFormData.meaning}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditFormData({ ...editFormData, meaning: e.target.value })}
                            className="w-full px-2 py-1 bg-white dark:bg-black border border-pink-500 rounded text-sm"
                          />
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400 text-sm line-clamp-1">
                            {latestLookup?.contextMeaning}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === word.id ? (
                          <input
                            type="text"
                            value={editFormData.englishDefinition}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditFormData({ ...editFormData, englishDefinition: e.target.value })}
                            className="w-full px-2 py-1 bg-white dark:bg-black border border-emerald-500 rounded text-sm"
                          />
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400 text-sm line-clamp-1">
                            {latestLookup?.englishDefinition || '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400 text-xs font-medium">
                          {word.created_at?.split(' ')[0]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="w-12 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-pink-500 rounded-full" 
                                style={{ width: `${Math.min(100, (word.reps / 10) * 100)}%` }}
                              />
                           </div>
                           <span className="text-[10px] font-bold text-gray-400">{word.reps} 次复习</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingId === word.id ? (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveEdit(word.id);
                                }}
                                className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(null);
                                }}
                                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(word);
                                }}
                                className="p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-lg transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(word.id);
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer / Pagination */}
          <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
             <span>共计 {filteredWords.length} 个单词</span>
             <div className="flex items-center gap-2">
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50" disabled>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                   <span className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded font-bold text-gray-900 dark:text-white">1</span>
                </div>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50" disabled>
                  <ChevronRight className="w-4 h-4" />
                </button>
             </div>
          </div>
        </div>

        {activeWord && (
          <div className="fixed inset-0 z-50 pointer-events-none">
            <div
              className="absolute inset-0 bg-black/45 pointer-events-auto lg:bg-transparent lg:pointer-events-none"
              onClick={() => setActiveWordId(null)}
            />
            <aside
              className="absolute right-0 top-0 h-full w-full sm:w-[min(100vw,640px)] lg:w-auto pointer-events-auto bg-white dark:bg-[#0d1117] border-l border-gray-200 dark:border-gray-800/60 shadow-[0_8px_48px_rgba(15,23,42,0.22)]"
              style={isDesktopViewport ? { width: `${detailSidebarWidth}px` } : undefined}
            >
              <div
                onMouseDown={startResizeDetailSidebar}
                className="hidden lg:flex absolute left-0 top-0 h-full w-4 -translate-x-1/2 items-center justify-center cursor-col-resize group"
                title="拖拽调整侧边栏宽度"
              >
                <div className={`h-20 w-1 rounded-full transition-colors ${isDetailSidebarResizing ? 'bg-pink-400' : 'bg-transparent group-hover:bg-pink-300'}`} />
              </div>

              <div className="relative h-full overflow-y-auto p-6 md:p-8">
                <button
                  onClick={() => setActiveWordId(null)}
                  className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-start justify-between gap-4 pr-10">
                  <div className="space-y-3">
                    <div className="text-xs font-black tracking-wider text-gray-400 uppercase">词汇详情</div>
                    {(() => {
                      const lookupWord = String(activeWord.word || '').trim();
                      const baseForm = String(activeLookup?.baseForm || '').trim();
                      const displayWord = baseForm || lookupWord;
                      const currentForm = lookupWord && lookupWord.toLowerCase() !== displayWord.toLowerCase() ? lookupWord : '';

                      return (
                        <div className="space-y-1">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">原型</div>
                          <h2 className="text-4xl font-black text-gray-900 dark:text-white">{displayWord}</h2>
                          {currentForm && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              当前词形 <span className="font-semibold text-gray-700 dark:text-gray-200">{currentForm}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-pink-50 text-pink-600 border border-pink-100 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-900/30 uppercase">
                        {activeLookup?.partOfSpeech || 'N/A'}
                      </span>
                      {activeLookup?.grammarRole && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-900/30">
                          {activeLookup.grammarRole}
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                        收录 {activeEncounter?.created_at?.split(' ')[0] || activeWord.created_at?.split(' ')[0] || '-'}
                      </span>
                    </div>
                  </div>

                  {activeWordEncounters.length > 1 && (
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">
                      <button
                        onClick={() => setActiveEncounterIndex(prev => Math.max(0, prev - 1))}
                        disabled={safeEncounterIndex <= 0}
                        className="p-1.5 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-black text-gray-600 dark:text-gray-300 min-w-[52px] text-center">
                        {safeEncounterIndex + 1}/{activeWordEncounters.length}
                      </span>
                      <button
                        onClick={() => setActiveEncounterIndex(prev => Math.min(activeWordEncounters.length - 1, prev + 1))}
                        disabled={safeEncounterIndex >= activeWordEncounters.length - 1}
                        className="p-1.5 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">文中释义</div>
                    <p className="text-xl font-bold text-pink-600 dark:text-pink-400">
                      {activeLookup?.contextMeaning || '暂无释义'}
                    </p>
                  </div>

                  {activeLookup?.englishDefinition && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">英英释义</div>
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3 text-sm text-emerald-950 dark:text-emerald-100 leading-7">
                        {activeLookup.englishDefinition}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">原句上下文</div>
                    <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm text-gray-900 dark:text-gray-100 leading-7">
                      "{activeEncounter?.context || '暂无上下文'}"
                    </div>
                  </div>

                  {activeLookup?.explanation && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">AI 深度解析</div>
                      <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-6">
                        {activeLookup.explanation}
                      </div>
                    </div>
                  )}

                  {!!activeLookup?.otherMeanings?.length && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">其他常见释义</div>
                      <div className="space-y-2">
                        {activeLookup.otherMeanings.map((meaning: any, idx: number) => (
                          <div key={idx} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {meaning.partOfSpeech && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                                  {meaning.partOfSpeech}
                                </span>
                              )}
                              <span className="font-bold text-gray-900 dark:text-white">{meaning.meaning || '—'}</span>
                            </div>
                            {meaning.example && (
                              <p className="mt-1.5 text-xs text-gray-700 dark:text-gray-300 leading-6">"{meaning.example}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {activeEncounter?.note_id && <span>note #{activeEncounter.note_id}</span>}
                      {activeEncounter?.reading_id && <span>reading #{activeEncounter.reading_id}</span>}
                      {activeEncounter?.video_id && <span>video #{activeEncounter.video_id}</span>}
                    </div>
                    {activeSourceUrl && (
                      <a
                        href={activeSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-pink-600 hover:text-pink-500"
                      >
                        查看来源 <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};
