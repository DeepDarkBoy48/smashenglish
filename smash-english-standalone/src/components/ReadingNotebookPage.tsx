import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  BookOpen, 
  FileText, 
  Trash2, 
  Search, 
  Loader2, 
  Clock,
  ArrowRight,
  Edit2
} from 'lucide-react';
import { listReadingNotebooksService, deleteReadingNotebookService } from '../services/geminiService';
import type { ReadingNotebook } from '../types';

interface ReadingNotebookPageProps {
  onSelectNotebook: (notebook: ReadingNotebook) => void;
}

export const ReadingNotebookPage: React.FC<ReadingNotebookPageProps> = ({ onSelectNotebook }) => {
  const [notebooks, setNotebooks] = useState<ReadingNotebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const fetchNotebooks = async () => {
    try {
      setLoading(true);
      const response = await listReadingNotebooksService();
      setNotebooks(response.notebooks);
    } catch (error) {
      console.error('Failed to fetch reading notebooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除这个精读笔记本吗？此操作不可撤销。')) return;

    try {
      await deleteReadingNotebookService(id);
      setNotebooks(prev => prev.filter(nb => nb.id !== id));
    } catch (error) {
      console.error('Failed to delete notebook:', error);
    }
  };

  const filteredNotebooks = notebooks.filter(nb => 
    nb.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-[#0d1117]">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sm:px-8 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md transition-colors">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-pink-500" />
              精读笔记本
            </h1>
            <p className="text-sm text-gray-500 mt-1">管理你的精读文章与学习记录</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜索精读笔记..." 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => onSelectNotebook({ id: 0, title: '', content: '', source_url: '', cover_image_url: '', description: '', word_count: 0, created_at: '', updated_at: '' } as any)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>开始新精读</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
              <p className="text-gray-500 mt-4 animate-pulse">正在加载精读列表...</p>
            </div>
          ) : filteredNotebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-white/30 dark:bg-gray-900/10 transition-all">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">暂无精读笔记</h3>
              <p className="text-sm text-gray-500 mt-2">粘贴一篇文章或者输入链接，开始你的精读之旅</p>
              <button 
                onClick={() => onSelectNotebook({ id: 0 } as any)}
                className="mt-6 px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                开始第一篇
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredNotebooks.map((notebook) => (
                <div 
                  key={notebook.id}
                  onClick={() => onSelectNotebook(notebook)}
                  className="group relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-pink-500/30 transition-all duration-300 cursor-pointer overflow-hidden p-5"
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="p-2.5 bg-pink-50 dark:bg-pink-900/20 rounded-xl text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform duration-300">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNotebook({ ...notebook, _forceEdit: true } as any);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        title="编辑原文"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, notebook.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="删除笔记"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors font-serif text-lg leading-snug">
                    {notebook.title}
                  </h3>

                  {notebook.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 font-sans leading-relaxed">
                      {notebook.description}
                    </p>
                  )}
                  
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{notebook.created_at.split(' ')[0]}</span>
                    </div>
                    <div className="flex items-center gap-1 text-pink-600 dark:text-pink-400 font-bold text-xs uppercase tracking-wider">
                      <span>阅读</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
