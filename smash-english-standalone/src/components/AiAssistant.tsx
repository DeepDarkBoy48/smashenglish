
import React, { useRef, useEffect, useState } from 'react';
import { X, Send, Bot, Sparkles, Pin, PinOff, History, MessageSquare, Play, Plus } from 'lucide-react';
import type { Message, Thread } from '../types';
import { getChatResponseService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { ResultDisplay } from './ResultDisplay';
import { CompactDictionaryResult, QuickLookupDisplay } from './AiSharedComponents';

interface AiAssistantProps {
  currentContext: string | null;
  contextType: 'sentence' | 'word' | 'writing';
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  isPinned: boolean;
  onPinChange: (isPinned: boolean) => void;
  // Multi-thread additions
  threads: Thread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
  onResumeVideo?: () => void;
  activeTab?: string;
}

const CHIP_BASE = "flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center gap-2";
const CHIP_DEFAULT = `${CHIP_BASE} bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/10 hover:text-pink-600 dark:hover:text-pink-400 border border-transparent hover:border-pink-100 dark:hover:border-pink-900/30`;
const CHIP_PRIMARY = `${CHIP_BASE} bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-200 dark:shadow-none transform hover:-translate-y-0.5 active:translate-y-0`;

export const AiAssistant: React.FC<AiAssistantProps> = ({ 
  currentContext, 
  contextType,
  isOpen,
  onOpenChange,
  messages,
  onMessagesChange,
  isPinned,
  onPinChange,
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onResumeVideo,
  activeTab
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isThinking]);

  const handleSend = async (content: string) => {
    if (!content.trim() || isThinking) return;

    const userMsg: Message = { role: 'user', content: content };
    const newMessages = [...messages, userMsg];
    onMessagesChange(newMessages);
    setInputValue("");
    setIsThinking(true);

    try {
      const responseText = await getChatResponseService(newMessages, currentContext, content, contextType);
      onMessagesChange([...newMessages, { role: 'assistant', content: responseText }]);
    } catch (error) {
      onMessagesChange([...newMessages, { role: 'assistant', content: "抱歉，连接出了点问题，请稍后再试。" }]);
    } finally {
      setIsThinking(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const containerClasses = isPinned
    ? 'w-full h-full flex flex-col font-sans bg-white dark:bg-[#0d1117] border-l border-gray-200 dark:border-gray-800/60'
    : isOpen
      ? 'fixed z-50 inset-0 md:inset-auto md:bottom-6 md:right-6 flex flex-col items-end font-sans'
      : 'fixed z-50 bottom-6 right-6 flex flex-col items-end font-sans';

  const cardClasses = isPinned
    ? 'w-full h-full flex flex-col overflow-hidden bg-white dark:bg-[#0d1117] transition-all duration-500 ease-out'
    : `w-full h-full md:w-[480px] md:h-[min(850px,85vh)] md:mb-4 bg-white dark:bg-[#0d1117] md:rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-none border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden transition-all duration-500 ease-out transform ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`;

  const renderSuggestions = () => {
    const hasVideoControl = messages.some(m => m.type === 'video_control');

    return (
      <>
        {hasVideoControl && activeTab === 'youtube' && (
          <button 
            onClick={onResumeVideo} 
            className={`${CHIP_PRIMARY} animate-in fade-in zoom-in duration-300`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>继续播放视频</span>
          </button>
        )}
        {contextType === 'sentence' ? (
          <>
            <button onClick={() => handleSend("解释一下这个句子的语法结构")} className={CHIP_DEFAULT}>✨ 解释语法结构</button>
            <button onClick={() => handleSend("这句话里的重点单词有哪些？")} className={CHIP_DEFAULT}>📖 重点单词</button>
          </>
        ) : contextType === 'word' ? (
          <>
            <button onClick={() => handleSend("帮我造几个不同的例句")} className={CHIP_DEFAULT}>📝 生成更多例句</button>
            <button onClick={() => handleSend("这个词有什么同义词？")} className={CHIP_DEFAULT}>🔄 同义词辨析</button>
          </>
        ) : (
          <>
            <button onClick={() => handleSend("这篇文章的语气是否足够正式？")} className={CHIP_DEFAULT}>👔 检查语气</button>
            <button onClick={() => handleSend("有哪些表达可以更地道一些？")} className={CHIP_DEFAULT}>🌟 优化地道表达</button>
          </>
        )}
      </>
    );
  };

  const renderPinnedHeader = () => (
    <div className="p-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between bg-white dark:bg-[#0d1117] shrink-0">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-pink-600" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <h2 className="font-bold text-gray-900 dark:text-white tracking-tight">
            {activeThreadId ? "会话详情" : "AI 助手"}
          </h2>
          {activeThreadId && (
             <span className="text-[10px] font-medium text-pink-600/60 dark:text-pink-400/60 uppercase tracking-widest leading-none mt-1">
               {contextType === 'sentence' ? 'Grammar' : contextType === 'word' ? 'Vocabulary' : 'Writing'}
             </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => setShowHistory(!showHistory)} 
          className={`p-2 rounded-xl transition-all duration-200 ${showHistory ? 'bg-pink-600 text-white shadow-lg shadow-pink-200 dark:shadow-none' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500'}`}
          title="历史记录"
        >
          <History className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onPinChange(!isPinned)} 
          className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 text-gray-400 dark:text-gray-500"
          title="取消固定"
        >
          <PinOff className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onPinChange(false)} 
          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 text-gray-400 hover:text-red-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderFloatingHeader = () => (
    <div className="px-6 py-5 flex justify-between items-center bg-white dark:bg-[#0d1117] z-10 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-pink-600" />
        </div>
        <span className="font-bold text-gray-900 dark:text-gray-100 tracking-tight">AI 助手</span>
      </div>
      <div className="flex items-center gap-1">
        <button 
          onClick={() => setShowHistory(!showHistory)} 
          className={`p-2 rounded-xl transition-all duration-200 ${showHistory ? 'bg-pink-600 text-white shadow-lg shadow-pink-200' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500'}`}
          title="历史记录"
        >
          <History className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onPinChange(!isPinned)} 
          className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 text-gray-400 dark:text-gray-500"
          title="固定侧边栏"
        >
          <Pin className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onOpenChange(false)} 
          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 text-gray-400 hover:text-red-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className={containerClasses}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #f1f5f9; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #1e293b; }
        .markdown-body p { margin-bottom: 0.75em; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .message-appear { animation: messageIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes messageIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {(isOpen || isPinned) && (
        <>
          <div className={cardClasses}>
          {isPinned ? renderPinnedHeader() : renderFloatingHeader()}

          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
            {showHistory && (
              <div className="absolute inset-0 bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-xl z-30 flex flex-col animate-in fade-in slide-in-from-top-4 duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
                <div className="px-6 py-5 flex items-center justify-between border-b border-gray-50 dark:border-gray-800/60">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">对话历史</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        onNewChat();
                        setShowHistory(false);
                      }} 
                      className="p-2 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-xl text-pink-600 transition-all duration-200"
                      title="开启新对话"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all">
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {threads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center animate-in fade-in duration-700">
                       <MessageSquare className="w-16 h-16 mb-4 opacity-5" />
                       <p className="text-sm font-medium tracking-wide">在这里探索你的学习足迹</p>
                    </div>
                  ) : (
                    threads.map((thread: Thread) => (
                      <button
                        key={thread.id}
                        onClick={() => {
                          onSelectThread(thread.id);
                          setShowHistory(false);
                        }}
                        className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border ${
                          activeThreadId === thread.id 
                            ? 'bg-pink-50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-900/30' 
                            : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${
                            thread.contextType === 'sentence' ? 'bg-indigo-400' : 'bg-emerald-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate leading-snug">
                              {thread.title}
                            </p>
                            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">
                              {new Date(thread.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className={`flex-1 overflow-y-auto space-y-8 custom-scrollbar transition-colors ${isPinned ? 'px-6 py-6 bg-white dark:bg-[#0d1117]' : 'px-6 py-8 bg-white dark:bg-[#0d1117]'}`}>
              {messages.length === 0 && !isThinking && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-300 dark:text-gray-600 space-y-6 animate-in fade-in duration-1000">
                  <div className="w-20 h-20 rounded-[2.5rem] bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
                    <Bot className="w-10 h-10 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold tracking-widest uppercase opacity-40">随时准备为你效劳</p>
                    <p className="text-xs mt-2 opacity-30">输入问题或点击左侧内容开始分析</p>
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} message-appear`}>
                  {msg.type === 'analysis_result' && msg.data ? (
                    <div className="w-full">
                       <div className={`overflow-hidden transition-all duration-300 ${isPinned ? 'bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl' : 'bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl'}`}>
                          <ResultDisplay result={msg.data} compact={true} />
                       </div>
                    </div>
                  ) : msg.type === 'dictionary_result' && msg.data ? (
                    <div className="w-full">
                       <div className={`overflow-hidden transition-all duration-300 ${isPinned ? 'bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl p-4' : 'bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl p-6'}`}>
                          <CompactDictionaryResult result={msg.data} />
                       </div>
                    </div>
                  ) : msg.type === 'quick_lookup_result' && msg.data ? (
                    <div className="w-full">
                       <QuickLookupDisplay result={msg.data} isPinned={isPinned} />
                    </div>
                  ) : msg.type === 'video_control' ? null : (
                    <div className={`text-sm leading-relaxed transition-all duration-300 ${
                      msg.role === 'user' 
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-3 rounded-2xl rounded-tr-none max-w-[85%] font-medium'
                        : 'bg-white dark:bg-transparent text-gray-800 dark:text-gray-200 w-full markdown-body py-2'
                    }`}>
                      {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                    </div>
                  )}
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start items-center gap-4 animate-pulse">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-bounce" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600/50 dark:text-pink-400/50">正在深度思考</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {!isThinking && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
            <div className={`px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0 transition-colors ${isPinned ? 'bg-white dark:bg-[#0d1117] border-t border-gray-100 dark:border-gray-800/60' : 'bg-gray-50 dark:bg-gray-800/50 border-t border-gray-50 dark:border-gray-700/50'}`}>
              {renderSuggestions()}
            </div>
          )}

          <form onSubmit={onSubmit} className="p-6 pt-2 bg-white dark:bg-[#0d1117] shrink-0">
            <div className="relative flex items-center group">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="在此输入你的疑惑..."
                className="w-full pl-6 pr-14 py-4 rounded-[1.25rem] bg-gray-50 dark:bg-gray-900/80 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900/30 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
              <button 
                type="submit" 
                disabled={!inputValue.trim() || isThinking} 
                className="absolute right-2 p-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl disabled:opacity-20 disabled:grayscale transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          </div>
        </>
      )}

      {!isPinned && activeTab !== 'youtube' && (
        <button
          onClick={() => onOpenChange(!isOpen)}
          className={`group w-14 h-14 rounded-2xl shadow-2xl transition-all duration-500 flex items-center justify-center relative overflow-hidden transform ${isOpen ? 'rotate-180 scale-90 translate-y-4 opacity-0 pointer-events-none' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-110 active:scale-95'}`}
        >
          {isOpen ? <X className="w-6 h-6 relative z-10" /> : <Sparkles className="w-6 h-6 relative z-10" />}
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-600/20 to-violet-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </button>
      )}
    </div>
  );
};
