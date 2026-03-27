import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Video, 
  FileText, 
  Trash2, 
  Search, 
  Loader2, 
  Clock,
  PlayCircle,
  Edit2
} from 'lucide-react';
import { listNotebooksService, createNotebookService, updateNotebookService, deleteNotebookService } from '../services/geminiService';
import type { VideoNotebook } from '../types';

interface VideoNotebookPageProps {
  onSelectNotebook: (notebook: VideoNotebook) => void;
}

export const VideoNotebookPage: React.FC<VideoNotebookPageProps> = ({ onSelectNotebook }) => {
  const [notebooks, setNotebooks] = useState<VideoNotebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newSrtContent, setNewSrtContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<VideoNotebook | null>(null);

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const fetchNotebooks = async () => {
    try {
      setLoading(true);
      const response = await listNotebooksService();
      setNotebooks(response.notebooks);
    } catch (error) {
      console.error('Failed to fetch notebooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newVideoUrl || !newSrtContent) return;

    setIsCreating(true);
    try {
      // Extract videoId for thumbnail
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = newVideoUrl.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;

      const notebookData = {
        title: newTitle,
        video_url: newVideoUrl,
        video_id: videoId,
        srt_content: newSrtContent,
        thumbnail_url: videoId ? `https://img.youtube.com/vi/${videoId}/0.jpg` : null
      };

      if (editingNotebook) {
        await updateNotebookService(editingNotebook.id, notebookData);
      } else {
        await createNotebookService(notebookData);
      }
      
      setIsModalOpen(false);
      setEditingNotebook(null);
      setNewTitle('');
      setNewVideoUrl('');
      setNewSrtContent('');
      fetchNotebooks();
    } catch (error) {
      console.error('Failed to save notebook:', error);
      alert('保存失败，请检查输入并重试');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingNotebook(null);
    setNewTitle('');
    setNewVideoUrl('');
    setNewSrtContent('');
    setIsModalOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, notebook: VideoNotebook) => {
    e.stopPropagation();
    setEditingNotebook(notebook);
    setNewTitle(notebook.title);
    setNewVideoUrl(notebook.video_url);
    setNewSrtContent(notebook.srt_content || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除这个笔记本吗？此操作不可撤销。')) return;

    try {
      await deleteNotebookService(id);
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sm:px-8 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Video className="w-6 h-6 text-pink-500" />
              视频学习笔记本
            </h1>
            <p className="text-sm text-gray-500 mt-1">管理你的视频学习资料与字幕库</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜索笔记本..." 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>新建笔记本</span>
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
              <p className="text-gray-500 mt-4 animate-pulse">正在加载笔记本列表...</p>
            </div>
          ) : filteredNotebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-white/30 dark:bg-gray-900/10">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                <Video className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">暂无笔记本</h3>
              <p className="text-sm text-gray-500 mt-2">点击“新建笔记本”开始你的视频学习之旅</p>
              <button 
                onClick={handleOpenCreate}
                className="mt-6 px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                立刻创建一个
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredNotebooks.map((notebook) => (
                <div 
                  key={notebook.id}
                  onClick={() => onSelectNotebook(notebook)}
                  className="group relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-pink-500/30 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video relative overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {notebook.thumbnail_url ? (
                      <img 
                        src={notebook.thumbnail_url} 
                        alt={notebook.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Video className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                      <PlayCircle className="w-12 h-12 text-white opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                        {notebook.title}
                      </h3>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleEdit(e, notebook)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                          title="编辑笔记本"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, notebook.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="删除笔记本"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-auto flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{notebook.created_at.split(' ')[0]}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>字幕已导入</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isCreating && setIsModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingNotebook ? '编辑视频笔记本' : '新建视频笔记本'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingNotebook ? '修改笔记本的基础信息或字幕内容' : '关联 YouTube 视频并导入 SRT 字幕文件'}
              </p>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">标题</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  placeholder="给这组学习资料起个名字" 
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">YouTube 视频链接</label>
                <input 
                  required
                  type="url" 
                  placeholder="https://www.youtube.com/watch?v=..." 
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">SRT 字幕内容</label>
                  <label className="text-xs text-pink-600 dark:text-pink-400 font-medium cursor-pointer hover:underline">
                    <input 
                      type="file" 
                      accept=".srt" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setNewSrtContent(ev.target?.result as string);
                          reader.readAsText(file);
                        }
                      }}
                    />
                    选择文件上传
                  </label>
                </div>
                <textarea 
                  required
                  placeholder="在此粘贴 SRT 内容..." 
                  className="w-full h-40 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  value={newSrtContent}
                  onChange={(e) => setNewSrtContent(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button 
                  type="button"
                  disabled={isCreating}
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  disabled={isCreating || !newTitle || !newVideoUrl || !newSrtContent}
                  className="flex-[2] py-3 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-lg shadow-pink-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>正在保存...</span>
                    </>
                  ) : (
                    <span>{editingNotebook ? '保存修改' : '开始学习'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
