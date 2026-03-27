import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { InputArea } from './components/InputArea';
import { ResultDisplay } from './components/ResultDisplay';
import { DictionaryPage } from './components/DictionaryPage';
import { WritingPage } from './components/WritingPage';
import { SavedWordsPage } from './components/SavedWordsPage';
import { IntensiveReadingPage } from './components/IntensiveReadingPage';
import { WordsManagementPage } from './components/WordsManagementPage';
import { TranslationPage } from './components/TranslationPage';

import { AiAssistant } from './components/AiAssistant';
import { YoutubeStudyPage } from './components/YoutubeStudyPage';
import { VideoNotebookPage } from './components/VideoNotebookPage';
import { ReadingNotebookPage } from './components/ReadingNotebookPage';
import { analyzeSentenceService, quickLookupService } from './services/geminiService';
import type { AnalysisResult, DictionaryResult, WritingResult, QuickLookupResult, Thread, Message, VideoNotebook, ReadingNotebook } from './types';
import { ThemeProvider } from './components/ThemeContext';
import { Sparkles, BookOpen, AlertCircle } from 'lucide-react';

// 预加载的示例分析结果
const DEMO_RESULT: AnalysisResult = {
  englishSentence: "Regular exercise can improve confidence.",
  chineseTranslation: "规律的运动可以提升自信。",
  sentencePattern: "S + V + O (主谓宾)",
  mainTense: "Present Simple (一般现在时)",
  chunks: [
    { text: "Regular exercise", grammarDescription: "名词短语", partOfSpeech: "名词短语", role: "主语" },
    { text: "can improve", grammarDescription: "情态动词短语", partOfSpeech: "情态动词短语", role: "谓语" },
    { text: "confidence.", grammarDescription: "名词", partOfSpeech: "名词", role: "宾语" }
  ],
  detailedTokens: [
    { text: "Regular", partOfSpeech: "ADJECTIVE", role: "定语", meaning: "规律的，经常的", explanation: "形容词，修饰名词 'exercise'，表示规律的、经常性的。" },
    { text: "exercise", partOfSpeech: "NOUN", role: "主语", meaning: "运动，锻炼", explanation: "名词，意为运动、锻炼。在此句中作主语。" },
    { text: "can", partOfSpeech: "MODAL VERB", role: "情态动词", meaning: "能，可以", explanation: "情态动词，表示能力或可能性，后面接动词原形。" },
    { text: "improve", partOfSpeech: "VERB", role: "谓语动词", meaning: "改善，提高", explanation: "动词原形，意为改善、提高。与 'can' 共同构成谓语动词短语。" },
    { text: "confidence", partOfSpeech: "NOUN", role: "宾语", meaning: "自信，信心", explanation: "名词，意为自信、信心。作动词 'improve' 的宾语。" }
  ]
};

const App: React.FC = () => {
  // Initial routing helper
  const getInitialRoute = () => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const word = params.get('word');

    if (path === '/intensive-reading' || path.startsWith('/intensive-reading')) {
      return { tab: 'reading' as const, id: id ? parseInt(id) : null, word: word };
    } else if (path === '/video-study' || path.startsWith('/video-study')) {
      return { tab: 'youtube' as const, id: id ? parseInt(id) : null };
    } else if (path === '/dictionary') {
      return { tab: 'dictionary' as const, id: null };
    } else if (path === '/writing') {
      return { tab: 'writing' as const, id: null };
    } else if (path === '/saved-words') {
      return { tab: 'saved-words' as const, id: null };
    } else if (path === '/words-management') {
      return { tab: 'words-management' as const, id: null };
    } else if (path === '/translate') {
      return { tab: 'translate' as const, id: null };
    }
    return { tab: 'analyzer' as const, id: null };
  };

  const initialRoute = getInitialRoute();

  const [activeTab, setActiveTab] = useState<'analyzer' | 'dictionary' | 'writing' | 'youtube' | 'saved-words' | 'reading' | 'words-management' | 'translate'>(initialRoute.tab);

  // Analyzer State - 使用预加载的示例数据作为初始值
  const [isAnalyzerLoading, setIsAnalyzerLoading] = useState(false);
  const [analyzerResult, setAnalyzerResult] = useState<AnalysisResult | null>(DEMO_RESULT);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);

  // Immersive Mode State
  const [isImmersive, setIsImmersive] = useState(false);

  // Dictionary State
  const [dictionaryResult, setDictionaryResult] = useState<DictionaryResult | null>(null);

  // Video Player Ref (for top-level control)
  const playerRef = React.useRef<any>(null);

  // Writing State
  const [writingResult, setWritingResult] = useState<WritingResult | null>(null);

  // Translation State (Lifted for AI context)
  const [translateSource, setTranslateSource] = useState('');
  const [translateTarget, setTranslateTarget] = useState('');

  // AI Assistant State (Lifted Multi-thread)
  const [aiIsOpen, setAiIsOpen] = useState(false);
  const [aiIsPinned, setAiIsPinned] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Video Notebook State
  const [selectedNotebook, setSelectedNotebook] = useState<VideoNotebook | null>(
    initialRoute.tab === 'youtube' && initialRoute.id ? { id: initialRoute.id } as any : null
  );

  // Reading Notebook State
  const [selectedReadingNotebook, setSelectedReadingNotebook] = useState<ReadingNotebook | null>(
    initialRoute.tab === 'reading' && initialRoute.id ? { id: initialRoute.id } as any : null
  );

  const [highlightedWord, setHighlightedWord] = useState<string | null>(initialRoute.word || null);

  // Helper to get active thread
  const activeThread = threads.find(t => t.id === activeThreadId) || null;

  // Use a ref to track the latest activeThreadId for a stable closure in async calls
  const activeThreadIdRef = useRef<string | null>(activeThreadId);
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  // Determine AI Assistant Context
  let assistantContextContent: string | null = null;
  let contextType: 'sentence' | 'word' | 'writing' = 'sentence';

  if (activeTab === 'analyzer') {
    assistantContextContent = analyzerResult?.englishSentence || null;
    contextType = 'sentence';
  } else if (activeTab === 'dictionary') {
    assistantContextContent = dictionaryResult?.word || null;
    contextType = 'word';
  } else if (activeTab === 'writing') {
    assistantContextContent = writingResult?.segments.map(s => s.text).join('') || null;
    contextType = 'writing';
  } else if (activeTab === 'translate') {
    assistantContextContent = translateSource ? `原文: ${translateSource}\n译文: ${translateTarget}` : null;
    contextType = 'sentence';
  } else if (activeTab === 'youtube') {
    // Youtube tab context is handled via the trigger functions, 
    // but default to sentence for general chat
    contextType = 'sentence';
  }

  // Unified messages handler for AI Assistant
  const handleAssistantMessagesChange = useCallback((newMsgs: Message[]) => {
    const currentId = activeThreadIdRef.current;
    
    if (currentId) {
      // Update existing thread
      setThreads(prev => prev.map(t => t.id === currentId ? { ...t, messages: newMsgs } : t));
    } else {
      // No active thread, create a new one
      const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Update ref immediately so the second call (AI response) sees the new ID
      activeThreadIdRef.current = newId;
      setActiveThreadId(newId);
      
      const newThread: Thread = {
        id: newId,
        title: newMsgs[0]?.content.slice(0, 20) || "新对话",
        messages: newMsgs,
        context: assistantContextContent,
        contextType: contextType,
        timestamp: Date.now()
      };
      setThreads(prev => [newThread, ...prev]);
    }
  }, [assistantContextContent, contextType]);

  // Basic Routing Logic
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      const word = params.get('word');

      if (path === '/intensive-reading' || path.startsWith('/intensive-reading')) {
        setActiveTab('reading');
        if (id) {
          setSelectedReadingNotebook({ id: parseInt(id) } as any);
        }
        if (word) {
           setHighlightedWord(word);
        }
      } else if (path === '/video-study' || path.startsWith('/video-study')) {
        setActiveTab('youtube');
        if (id) {
          setSelectedNotebook({ id: parseInt(id) } as any);
        }
      } else if (path === '/dictionary') {
        setActiveTab('dictionary');
      } else if (path === '/writing') {
        setActiveTab('writing');
      } else if (path === '/saved-words') {
        setActiveTab('saved-words');
      } else if (path === '/words-management') {
        setActiveTab('words-management');
      } else if (path === '/translate') {
        setActiveTab('translate');
      } else {
        setActiveTab('analyzer');
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Update URL when state changes
  useEffect(() => {
    let path = '/';
    const params = new URLSearchParams();

    if (activeTab === 'reading') {
      path = '/intensive-reading';
      if (selectedReadingNotebook?.id) {
        params.set('id', selectedReadingNotebook.id.toString());
      }
      if (highlightedWord) {
        params.set('word', highlightedWord);
      }
    } else if (activeTab === 'youtube') {
      path = '/video-study';
      if (selectedNotebook?.id) {
        params.set('id', selectedNotebook.id.toString());
      }
    } else if (activeTab === 'dictionary') {
      path = '/dictionary';
    } else if (activeTab === 'writing') {
      path = '/writing';
    } else if (activeTab === 'saved-words') {
      path = '/saved-words';
    } else if (activeTab === 'words-management') {
      path = '/words-management';
    } else if (activeTab === 'translate') {
      path = '/translate';
    }

    const queryString = params.toString();
    const newUrl = `${path}${queryString ? '?' + queryString : ''}`;
    
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.pushState({}, '', newUrl);
    }
  }, [activeTab, selectedNotebook?.id, selectedReadingNotebook?.id]);

  // Handle tab changes to "clear context" for the AI assistant
  useEffect(() => {
    setActiveThreadId(null);
  }, [activeTab]);

  const [analysisCache, setAnalysisCache] = useState<Record<string, AnalysisResult>>({});
  const [quickLookupCache, setQuickLookupCache] = useState<Record<string, QuickLookupResult>>({});

  const handleAnalyze = async (sentence: string) => {
    if (!sentence.trim() || isAnalyzerLoading) return;

    setIsAnalyzerLoading(true);
    setAnalyzerError(null);
    setAnalyzerResult(null);

    try {
      const data = await analyzeSentenceService(sentence);
      setAnalyzerResult(data);
    } catch (err: any) {
      console.error(err);
      setAnalyzerError(err.message || "分析失败，请稍后再试。");
    } finally {
      setIsAnalyzerLoading(false);
    }
  };

  // Trigger Analysis via AI Assistant
  const handleTriggerAnalysis = async (text: string, wasPaused?: boolean) => {
    // 1. Create a new thread for this analysis
    const threadId = Date.now().toString();
    const initialMessages: Message[] = [
      { role: 'assistant', content: `正在为你分析句子：\n> "${text}"` }
    ];

    if (wasPaused) {
      initialMessages.push({
        role: 'assistant',
        content: '视频已暂停，点击按钮继续播放',
        type: 'video_control'
      });
    }

    const newThread: Thread = {
      id: threadId,
      title: `句法分析: ${text.slice(0, 20)}${text.length > 20 ? '...' : ''}`,
      messages: initialMessages,
      context: text,
      contextType: 'sentence',
      timestamp: Date.now()
    };

    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(threadId);
    setAiIsOpen(true);

    // 2. Check Cache
    if (analysisCache[text]) {
      setThreads(prev => prev.map(t => t.id === threadId ? {
        ...t,
        messages: [{
          role: 'assistant',
          content: `已从缓存加载句法分析：`,
          type: 'analysis_result',
          data: analysisCache[text]
        }]
      } : t));
      return;
    }

    // 3. Perform AI Analysis
    try {
      const result = await analyzeSentenceService(text);
      setAnalysisCache(prev => ({ ...prev, [text]: result }));
      setThreads(prev => prev.map(t => t.id === threadId ? {
        ...t,
        messages: [{
          role: 'assistant',
          content: `已完成句法分析：`,
          type: 'analysis_result',
          data: result
        }]
      } : t));
    } catch (err: any) {
      setThreads(prev => prev.map(t => t.id === threadId ? {
        ...t,
        messages: [{ role: 'assistant', content: `分析失败: ${err.message || '未知错误'}` }]
      } : t));
    }
  };

  // Trigger Quick Lookup via AI Assistant (with context)
  const handleTriggerDictionary = async (word: string, context: string, wasPaused?: boolean) => {
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
    if (!cleanWord) return;

    const cacheKey = `${cleanWord}::${context}`;

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(cleanWord);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }

    // Find if there's an active thread of type 'word' that has less than 10 words
    const currentThread = threads.find(t => t.id === activeThreadId);
    // ... (rest of logic)
    
    let threadId: string;
    
    // Check if we should reuse thread
    const existingWordThread = (currentThread?.contextType === 'word' && currentThread.id === activeThreadId) ? currentThread : null;
    const lookupCount = existingWordThread?.messages.filter(m => m.type === 'quick_lookup_result').length || 0;

    if (existingWordThread && lookupCount < 10) {
      threadId = existingWordThread.id;
      const newMessages: Message[] = [...existingWordThread.messages, { role: 'assistant', content: `正在查询 **${cleanWord}**...` }];
      if (wasPaused) {
        newMessages.push({ role: 'assistant', content: '视频已暂停', type: 'video_control' });
      }
      setThreads(prev => prev.map(t => t.id === threadId ? {
        ...t,
        messages: newMessages
      } : t));
    } else {
      threadId = Date.now().toString();
      const initialMessages: Message[] = [{ role: 'assistant', content: `正在查询 **${cleanWord}** 在当前上下文中的含义...` }];
      if (wasPaused) {
        initialMessages.push({ role: 'assistant', content: '视频已暂停', type: 'video_control' });
      }
      const newThread: Thread = {
        id: threadId,
        title: `单词查询: ${cleanWord}`,
        messages: initialMessages,
        context: context,
        contextType: 'word',
        timestamp: Date.now()
      };
      setThreads(prev => [newThread, ...prev]);
      setActiveThreadId(threadId);
    }
    
    setAiIsOpen(true);

    // 2. Check Cache
    if (quickLookupCache[cacheKey]) {
       const cachedResult = { ...quickLookupCache[cacheKey], originalSentence: context };
       setThreads(prev => prev.map(t => t.id === threadId ? {
         ...t,
         messages: [...t.messages.filter(m => !m.content.includes(`正在查询 **${cleanWord}**`)), {
           role: 'assistant',
           content: `查词结果：`,
           type: 'quick_lookup_result',
           data: cachedResult
         }]
       } : t));
       return;
    }

    // 3. Perform Quick Lookup
    try {
      let currentUrl = window.location.href;
      let readingId: number | undefined = undefined;
      let videoId: number | undefined = undefined;

      if (activeTab === 'reading' && selectedReadingNotebook?.id) {
        readingId = selectedReadingNotebook.id;
        currentUrl = `/intensive-reading?id=${readingId}&word=${encodeURIComponent(cleanWord)}`;
      } else if (activeTab === 'youtube') {
        if (selectedNotebook?.id) {
          videoId = selectedNotebook.id;
        }
        if (playerRef.current?.getVideoData) {
          const videoData = playerRef.current.getVideoData();
          const vId = videoData.video_id;
          const currentTime = Math.floor(playerRef.current.getCurrentTime());
          currentUrl = `https://www.youtube.com/watch?v=${vId}&t=${currentTime}s`;
        } else if (selectedNotebook?.video_id) {
          currentUrl = `https://www.youtube.com/watch?v=${selectedNotebook.video_id}`;
        }
      }
      
      const result = await quickLookupService(cleanWord, context, currentUrl, readingId, videoId);
      const resultWithSentence = { ...result, originalSentence: context };
      setQuickLookupCache(prev => ({ ...prev, [cacheKey]: result }));

      setThreads(prev => prev.map(t => t.id === threadId ? {
        ...t,
        messages: [...t.messages.filter(m => !m.content.includes(`正在查询 **${cleanWord}**`)), {
          role: 'assistant',
          content: `查词结果：`,
          type: 'quick_lookup_result',
          data: resultWithSentence
        }]
      } : t));
    } catch (err: any) {
      setThreads(prev => prev.map(t => t.id === threadId ? {
        ...t,
        messages: [...t.messages, { role: 'assistant', content: `查词失败: ${err.message || '未知错误'}` }]
      } : t));
    }
  };

  // Reconstruct context logic moved above



  // Dynamic container padding based on active tab
  const getContainerPadding = () => {
    if (isImmersive) return 'p-0';
    if (activeTab === 'youtube' || activeTab === 'reading') {
      return 'xl:px-4 xl:py-2 px-0 py-0'; // Minimal padding for full-page modes
    }
    return 'px-2 py-4 md:px-4 md:py-8';
  };

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="h-full flex flex-col bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-200 font-sans transition-colors overflow-hidden">
        {!isImmersive && (
          <Header
            activeTab={activeTab}
            onNavigate={setActiveTab}
          />
        )}

        <div className="flex-1 flex overflow-hidden relative">
          <main className={`flex-1 ${activeTab === 'youtube' || activeTab === 'reading' ? 'overflow-hidden' : 'overflow-y-auto'} ${getContainerPadding()} flex flex-col ${activeTab === 'youtube' || activeTab === 'reading' || isImmersive ? 'gap-0' : 'gap-6 md:gap-8'} relative transition-all duration-300 ease-in-out ${activeTab === 'writing' || activeTab === 'youtube' || activeTab === 'reading' ? '' : 'items-center'}`}>

            {activeTab === 'analyzer' && (
              <div className="w-full max-w-5xl flex flex-col gap-8">
                {/* Hero Section */}
                <div className="text-center space-y-4 mb-4">
                  <div className="inline-flex items-center justify-center p-2 bg-pink-50 dark:bg-pink-950/50 rounded-full text-pink-600 dark:text-pink-400 mb-2">
                    <Sparkles className="w-5 h-5 mr-2" />
                    <span className="text-sm font-medium">AI 驱动的英语语法分析</span>
                  </div>
                  <h1 className="text-2xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-50 font-serif">
                    英语句子成分可视化
                  </h1>
                  <p className="text-sm md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    输入任何英语句子，立刻解析其主谓宾定状补结构。
                    <br className="hidden md:block" />适合英语学习者、教师及语言爱好者。
                  </p>
                </div>

                {/* Input Section */}
                <div className="w-full max-w-2xl mx-auto">
                  <InputArea onAnalyze={handleAnalyze} isLoading={isAnalyzerLoading} initialValue={DEMO_RESULT.englishSentence} />
                </div>

                {/* Results Section */}
                <div className="w-full">
                  {isAnalyzerLoading && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
                      <p className="text-gray-500 dark:text-gray-400 animate-pulse">正在分析句子结构...</p>
                    </div>
                  )}

                  {analyzerError && (
                    <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3 text-red-700 dark:text-red-400 max-w-2xl mx-auto">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium">分析出错</h3>
                        <p className="text-sm mt-1 opacity-90">{analyzerError}</p>
                      </div>
                    </div>
                  )}

                  {analyzerResult && !isAnalyzerLoading && (
                    <div className="animate-fade-in">
                      <ResultDisplay result={analyzerResult} />
                    </div>
                  )}

                  {!analyzerResult && !isAnalyzerLoading && !analyzerError && (
                    <div className="text-center py-12 opacity-40 flex flex-col items-center">
                      <BookOpen className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
                      <p>暂无分析结果，请在上方输入句子。</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dictionary' && (
              <DictionaryPage
                initialResult={dictionaryResult}
                onResultChange={setDictionaryResult}
              />
            )}

            {activeTab === 'writing' && (
              <WritingPage
                initialResult={writingResult}
                onResultChange={setWritingResult}
              />
            )}

            {activeTab === 'youtube' && (
              selectedNotebook ? (
                <YoutubeStudyPage 
                  onTriggerAnalysis={handleTriggerAnalysis} 
                  onTriggerDictionary={handleTriggerDictionary}
                  isAiAssistantOpen={aiIsOpen}
                  onToggleAi={setAiIsOpen}
                  playerRefExternal={playerRef}
                  isImmersive={isImmersive}
                  onImmersiveChange={setIsImmersive}
                  notebookId={selectedNotebook.id}
                  initialNotebookData={selectedNotebook}
                  onBack={() => setSelectedNotebook(null)}
                />
              ) : (
                <VideoNotebookPage onSelectNotebook={setSelectedNotebook} />
              )
            )}

            {activeTab === 'translate' && (
              <TranslationPage 
                sourceText={translateSource}
                setSourceText={setTranslateSource}
                translatedText={translateTarget}
                setTranslatedText={setTranslateTarget}
              />
            )}

            {activeTab === 'saved-words' && (
              <SavedWordsPage />
            )}

            {activeTab === 'words-management' && (
              <WordsManagementPage />
            )}

            {activeTab === 'reading' && (
              selectedReadingNotebook ? (
                <IntensiveReadingPage 
                  initialNotebookData={selectedReadingNotebook}
                  onBack={() => {
                    setSelectedReadingNotebook(null);
                    setHighlightedWord(null);
                  }}
                  initialHighlightedWord={highlightedWord || undefined}
                />
              ) : (
                <ReadingNotebookPage onSelectNotebook={setSelectedReadingNotebook} />
              )
            )}
          </main>

          {/* Pinned AI Assistant Sidebar */}
          {aiIsPinned && (
            <div className="hidden xl:block w-[400px] 2xl:w-[450px] shrink-0 border-l border-gray-200 dark:border-gray-800/60 bg-white dark:bg-[#0d1117] z-20 transition-all duration-300">
              <AiAssistant
                currentContext={activeThread?.context || assistantContextContent}
                contextType={activeThread?.contextType || contextType}
                isOpen={aiIsOpen}
                onOpenChange={setAiIsOpen}
                messages={activeThread?.messages || []}
                onMessagesChange={handleAssistantMessagesChange}
                isPinned={true}
                onPinChange={setAiIsPinned}
                threads={threads}
                activeThreadId={activeThreadId}
                onSelectThread={setActiveThreadId}
                onNewChat={() => {
                  setActiveThreadId(null);
                }}
                onResumeVideo={() => {
                  if (playerRef.current) playerRef.current.playVideo();
                }}
                activeTab={activeTab}
              />
            </div>
          )}
        </div>

        {/* Floating AI Assistant (Controlled) - Show if not pinned OR if on small screen where pinned is hidden */}
        {(!aiIsPinned || (typeof window !== 'undefined' && window.innerWidth < 1280)) && (
          <AiAssistant
            currentContext={activeThread?.context || assistantContextContent}
            contextType={activeThread?.contextType || contextType}
            isOpen={aiIsOpen}
            onOpenChange={setAiIsOpen}
            messages={activeThread?.messages || []}
            onMessagesChange={handleAssistantMessagesChange}
            isPinned={false}
            onPinChange={setAiIsPinned}
            threads={threads}
            activeThreadId={activeThreadId}
            onSelectThread={setActiveThreadId}
            onNewChat={() => setActiveThreadId(null)}
            onResumeVideo={() => {
              if (playerRef.current) playerRef.current.playVideo();
            }}
            activeTab={activeTab}
          />
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
