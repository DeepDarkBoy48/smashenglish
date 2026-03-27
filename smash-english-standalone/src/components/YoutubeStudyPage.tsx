import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause,
  FileUp,
  Settings2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Languages,
  Target,
  Navigation
} from 'lucide-react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { parseSRT, optimizeSubtitles } from '../utils/srtParser';
import type { SubtitleItem } from '../utils/srtParser';
import {
  translateService,
  rapidLookupService,
  analyzeSentenceService,
  quickLookupService,
  getNotebookDetailService,
  getSavedWordsService
} from '../services/geminiService';
import type { AnalysisResult, QuickLookupResult, VideoNotebook } from '../types';
import { ResultDisplay } from './ResultDisplay';
import { QuickLookupDisplay } from './AiSharedComponents';
import { buildLocalEncounter, getSavedWordEncounters, upsertLocalSavedWord } from '../utils/savedWords';

// Extend Window interface for YouTube API
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface YoutubeStudyPageProps {
  onTriggerAnalysis?: (text: string, wasPaused?: boolean) => void;
  onTriggerDictionary?: (word: string, context: string, wasPaused?: boolean) => void;
  isAiAssistantOpen?: boolean;
  onToggleAi?: (open: boolean) => void;
  playerRefExternal?: React.MutableRefObject<any>;
  isImmersive?: boolean;
  onImmersiveChange?: (immersive: boolean) => void;
  notebookId?: number | null;
  initialNotebookData?: VideoNotebook | null;
  onBack?: () => void;
}

export const YoutubeStudyPage: React.FC<YoutubeStudyPageProps> = ({
  onTriggerAnalysis,
  onTriggerDictionary,
  isAiAssistantOpen,
  onToggleAi,
  playerRefExternal,
  isImmersive,
  onImmersiveChange,
  notebookId,
  initialNotebookData,
  onBack
}) => {
  // --- State ---
  // Column 1: Video
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const playerRefInternal = useRef<any>(null);
  const playerRef = playerRefExternal || playerRefInternal;
  const subtitleContainerRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isYTApiReady, setIsYTApiReady] = useState(false);
  const [isLoadingNotebook, setIsLoadingNotebook] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Column 2: Subtitles
  const [srtContent, setSrtContent] = useState('');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isWordSearchEnabled, setIsWordSearchEnabled] = useState(false);
  const [isBigTextMode, setIsBigTextMode] = useState(false);
  const [isPauseOnClickEnabled, setIsPauseOnClickEnabled] = useState(false);
  const [isFastLookupEnabled, setIsFastLookupEnabled] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<number>>(new Set());
  const [fastLookupResults, setFastLookupResults] = useState<Record<string, any>>({});
  const [fastLookupLoading, setFastLookupLoading] = useState<Record<string, boolean>>({});

  // Big Text Mode AI Results
  const [bigTextAnalysisResults, setBigTextAnalysisResults] = useState<Record<number, AnalysisResult>>({});
  const [bigTextDictionaryResults, setBigTextDictionaryResults] = useState<Record<string, QuickLookupResult>>({});
  const [isBigTextAnalyzing, setIsBigTextAnalyzing] = useState<Record<number, boolean>>({});
  const [isBigTextLookupLoading, setIsBigTextLookupLoading] = useState<Record<string, boolean>>({});
  const [bigTextResultOrder, setBigTextResultOrder] = useState<{type: 'analysis' | 'dictionary', key: string | number}[]>([]);
  const [isInlineAiEnabled, setIsInlineAiEnabled] = useState(true);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 0 });
  const lastScrollIndexRef = useRef<number>(0);
  const isManualJumpRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const activeSubtitleIdRef = useRef<number | null>(null);
  const [savedWordsSet, setSavedWordsSet] = useState<Set<string>>(new Set());
  const [savedWordsList, setSavedWordsList] = useState<any[]>([]);
  const [showSavedHighlights, setShowSavedHighlights] = useState(() => {
    const saved = localStorage.getItem('smash_english_show_saved_highlights');
    return saved === null ? true : saved === 'true';
  });
  const [highlightScope, setHighlightScope] = useState<'global' | 'notebook'>(() => {
    return (localStorage.getItem('smash_english_highlight_scope') as 'global' | 'notebook') || 'global';
  });

  const toolsRef = useRef<HTMLDivElement>(null);

  // Close tools dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Effects ---

  // Fetch saved words for highlighting
  useEffect(() => {
    localStorage.setItem('smash_english_show_saved_highlights', showSavedHighlights.toString());
    localStorage.setItem('smash_english_highlight_scope', highlightScope);
  }, [showSavedHighlights, highlightScope]);

  useEffect(() => {
    const fetchSavedWords = async () => {
      try {
        const data = await getSavedWordsService();
        setSavedWordsList(data.words);
        updateActiveHighlights(data.words, highlightScope);
      } catch (err) {
        console.error('Failed to fetch saved words:', err);
      }
    };
    fetchSavedWords();
  }, []);

  const updateActiveHighlights = (words: any[], scope: 'global' | 'notebook') => {
    if (scope === 'global') {
      const wordSet = new Set(words.map(w => w.word.toLowerCase().trim()));
      setSavedWordsSet(wordSet);
    } else {
      const filtered = words.filter(w => getSavedWordEncounters(w).some(enc => enc.video_id === notebookId));
      const wordSet = new Set(filtered.map(w => w.word.toLowerCase().trim()));
      setSavedWordsSet(wordSet);
    }
  };

  useEffect(() => {
    updateActiveHighlights(savedWordsList, highlightScope);
  }, [highlightScope, notebookId, savedWordsList]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedVideoUrl = localStorage.getItem('smash_english_video_url');
    const savedVideoId = localStorage.getItem('smash_english_video_id');
    const savedSrtContent = localStorage.getItem('smash_english_srt_content');

    if (!notebookId) {
      if (savedVideoUrl) setVideoUrl(savedVideoUrl);
      if (savedVideoId) setVideoId(savedVideoId);
      if (savedSrtContent) {
        setSrtContent(savedSrtContent);
        const parsed = parseSRT(savedSrtContent);
        setSubtitles(optimizeSubtitles(parsed));
      }
    } else {
      // For notebooks, try to load from cache first
      const cachedSrt = localStorage.getItem(`smash_english_cached_srt_${notebookId}`);
      if (cachedSrt) {
        setSrtContent(cachedSrt);
        const parsed = parseSRT(cachedSrt);
        setSubtitles(optimizeSubtitles(parsed));
      }

      if (initialNotebookData) {
        setVideoUrl(initialNotebookData.video_url);
        if (initialNotebookData.video_id) setVideoId(initialNotebookData.video_id);
      }
    }
  }, [notebookId, initialNotebookData]);

  // Load specific notebook details (especially SRT)
  useEffect(() => {
    if (notebookId) {
      const fetchNotebook = async () => {
        // Only show loading if we don't even have cached subtitles
        if (subtitles.length === 0) setIsLoadingNotebook(true);
        try {
          const nb = await getNotebookDetailService(notebookId);
          setVideoUrl(nb.video_url);
          if (nb.video_id) setVideoId(nb.video_id);
          if (nb.srt_content) {
            // Update cache only if changed
            if (nb.srt_content !== srtContent) {
              setSrtContent(nb.srt_content);
              const parsed = parseSRT(nb.srt_content);
              setSubtitles(optimizeSubtitles(parsed));
              localStorage.setItem(`smash_english_cached_srt_${notebookId}`, nb.srt_content);
            }
          }
        } catch (error) {
          console.error('Failed to load notebook:', error);
        } finally {
          setIsLoadingNotebook(false);
        }
      };
      fetchNotebook();
    }
  }, [notebookId, srtContent, subtitles.length]);

  // Save state to localStorage (only if NOT in notebook mode)
  useEffect(() => {
    if (videoUrl && !notebookId) localStorage.setItem('smash_english_video_url', videoUrl);
  }, [videoUrl, notebookId]);

  useEffect(() => {
    if (videoId && !notebookId) localStorage.setItem('smash_english_video_id', videoId);
  }, [videoId, notebookId]);

  useEffect(() => {
    if (srtContent && !notebookId) localStorage.setItem('smash_english_srt_content', srtContent);
  }, [srtContent, notebookId]);


  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsYTApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsYTApiReady(true);
    };
  }, []);

  // Initialize Player when videoId changes and API is ready
  const initializePlayer = useCallback(() => {
    if (!videoId || !isYTApiReady) return;

    const playerContainer = document.getElementById('youtube-player');
    if (!playerContainer) return;

    // If the container is an iframe, it means the YouTube API has already initialized it.
    // If it's a div, it's a fresh element from React and we need to create a new player.
    const isAlreadyInitialized = playerContainer.tagName === 'IFRAME';

    if (playerRef.current && isAlreadyInitialized) {
      try {
        playerRef.current.loadVideoById(videoId);
        return;
      } catch (e) {
        console.warn('Failed to load video on existing player, re-initializing...', e);
      }
    }

    // Reset ready state
    setIsPlayerReady(false);

    // Destroy old instance if it exists but is no longer valid or we're re-initializing
    if (playerRef.current && typeof playerRef.current.destroy === 'function') {
      try {
        playerRef.current.destroy();
      } catch (e) {
        // Ignore errors during destruction
      }
    }

    // Create new player
    new window.YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        'playsinline': 1,
        'modestbranding': 1,
        'rel': 0
      },
      events: {
        'onReady': (event: any) => {
          playerRef.current = event.target;
          setIsPlayerReady(true);
          
          // Restore playback position
          const posKey = notebookId ? `smash_english_pos_notebook_${notebookId}` : `smash_english_pos_video_${videoId}`;
          const savedPos = localStorage.getItem(posKey);
          if (savedPos) {
            const time = parseFloat(savedPos);
            if (!isNaN(time) && time > 0) {
              // We use a small timeout to ensure video is loaded
              setTimeout(() => {
                event.target.seekTo(time, true);
              }, 100);
            }
          }
        },
        'onStateChange': (event: any) => {
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
        }
      }
    });
  }, [videoId, isYTApiReady, playerRef]);

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      // We don't necessarily want to set playerRef.current to null here 
      // if it's shared externally, but the instance itself is dead.
      // However, it's safer to clear it so consumers don't call dead methods.
      if (playerRef.current) {
        if (typeof playerRef.current.destroy === 'function') {
          try {
            playerRef.current.destroy();
          } catch (e) {}
        }
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  // Sync active subtitle ID ref
  useEffect(() => {
    activeSubtitleIdRef.current = activeSubtitleId;
  }, [activeSubtitleId]);

  // Sync active subtitle with video time
  useEffect(() => {
    let interval: any;
    if (isPlayerReady) {
      interval = setInterval(() => {
        // If we just manually jumped, don't let polling override the highlight until the player settles
        if (isManualJumpRef.current) return;

        const currentTime = playerRef.current?.getCurrentTime?.();
        if (typeof currentTime === 'number') {
          if (subtitles.length > 0) {
            const currentId = activeSubtitleIdRef.current;
            const currentSub = currentId !== null ? subtitles.find(s => s.id === currentId) : null;
            
            // Optimization: If current time is still within the current subtitle (with a tiny grace buffer), stay there
            if (currentSub && currentTime >= currentSub.startTime - 0.1 && currentTime <= currentSub.endTime + 0.1) {
              return;
            }

            // Find match
            const newSub = subtitles.find(sub => currentTime >= sub.startTime && currentTime <= sub.endTime);
            if (newSub && newSub.id !== currentId) {
              setActiveSubtitleId(newSub.id);
            }
          }

          // Save Position (every ~1s is enough, polling is at 200ms)
          if (currentTime > 1 && Math.floor(currentTime * 5) % 5 === 0) {
            const posKey = notebookId ? `smash_english_pos_notebook_${notebookId}` : `smash_english_pos_video_${videoId}`;
            localStorage.setItem(posKey, currentTime.toString());
          }
        }
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlayerReady, subtitles, notebookId, videoId]);

  // Handle auto-resume when assistant closes in popup mode
  useEffect(() => {
    if (!isAiAssistantOpen && isPauseOnClickEnabled && playerRef.current && isPlayerReady) {
      // In a real app, we might want more complex logic here to only resume if WE paused it
      // but for simplicity:
      if (playerRef.current.getPlayerState?.() === window.YT.PlayerState.PAUSED) {
        playerRef.current.playVideo();
      }
    }
  }, [isAiAssistantOpen, isPauseOnClickEnabled, isPlayerReady]);

  const scrollToActiveSubtitle = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    if (activeSubtitleId && virtuosoRef.current && subtitles.length > 0) {
      const index = subtitles.findIndex(s => s.id === activeSubtitleId);
      if (index !== -1) {
        isProgrammaticScrollRef.current = true;
        virtuosoRef.current.scrollToIndex({
          index,
          align: 'start',
          behavior
        });
        setIsAutoScrollEnabled(true);
        // Reset flag after scroll settles
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 500);
      }
    }
  }, [activeSubtitleId, subtitles]);

  // Scroll to active subtitle
  useEffect(() => {
    if (isAutoScrollEnabled && activeSubtitleId && virtuosoRef.current && subtitles.length > 0) {
      const index = subtitles.findIndex(s => s.id === activeSubtitleId);
      if (index !== -1) {
        const isOutOfRange = index < visibleRange.startIndex || index >= (visibleRange.endIndex - 1);
        
        if (isOutOfRange) {
          const distance = Math.abs(index - lastScrollIndexRef.current);
          const pageSize = Math.max(visibleRange.endIndex - visibleRange.startIndex, 1) || 10;
          const behavior = distance > pageSize ? 'auto' : 'smooth';

          isProgrammaticScrollRef.current = true;
          virtuosoRef.current.scrollToIndex({
            index,
            align: 'start',
            behavior
          });
          // Reset flag after scroll settles
          setTimeout(() => {
            isProgrammaticScrollRef.current = false;
          }, 500);
        }
        lastScrollIndexRef.current = index;
      }
    }
  }, [activeSubtitleId, subtitles, visibleRange.startIndex, visibleRange.endIndex, isAutoScrollEnabled]);

  // Keyboard shortcuts for video control
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if typing in an input or textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).isContentEditable
      );

      if (isTyping) return;

      if (event.code === 'Space') {
        if (playerRef.current && isPlayerReady && typeof playerRef.current.getPlayerState === 'function') {
          event.preventDefault();
          const state = playerRef.current.getPlayerState();
          // YT.PlayerState.PLAYING is 1, YT.PlayerState.PAUSED is 2
          if (state === 1) {
            playerRef.current.pauseVideo();
          } else {
            playerRef.current.playVideo();
          }
        }
      } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        if (subtitles.length > 0 && playerRef.current && isPlayerReady) {
          event.preventDefault();
          const currentIndex = activeSubtitleId !== null 
            ? subtitles.findIndex(s => s.id === activeSubtitleId) 
            : -1;
          
          let targetIndex = -1;
          if (event.code === 'ArrowLeft') {
            targetIndex = currentIndex > 0 ? currentIndex - 1 : 0;
          } else {
            targetIndex = currentIndex < subtitles.length - 1 ? currentIndex + 1 : subtitles.length - 1;
          }

          if (targetIndex !== -1 && targetIndex !== currentIndex) {
            const targetSub = subtitles[targetIndex];
            handleJumpToTime(targetSub.startTime, targetSub.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayerReady, playerRef, subtitles, activeSubtitleId]);

  const handleTogglePlay = () => {
    if (playerRef.current && isPlayerReady) {
      const state = playerRef.current.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };


  // --- Handlers ---

  const handleVideoUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = videoUrl.match(regExp);
    if (match && match[2].length === 11) {
      setVideoId(match[2]);
    } else {
      alert('无效的 YouTube URL');
    }
  };


  const handleSrtPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setSrtContent(content);
    const parsed = parseSRT(content);
    setSubtitles(optimizeSubtitles(parsed));
  };

  const handleJumpToTime = (startTime: number, subId?: number) => {
    if (playerRef.current && isPlayerReady) {
      if (subId !== undefined) {
        setActiveSubtitleId(subId);
        // When manually jumping to a subtitle, we should re-enable auto scroll
        setIsAutoScrollEnabled(true);
      }
      
      // Set manual jump flag to prevent polling from fighting with the manual seek
      isManualJumpRef.current = true;
      
      playerRef.current.seekTo(startTime, true);
      playerRef.current.playVideo();
      
      // Release the lock after a short delay
      setTimeout(() => {
        isManualJumpRef.current = false;
      }, 400);
    }
  };

  const handleAnalyze = async (sub: SubtitleItem) => {
    let wasPaused = false;
    if (isPauseOnClickEnabled && playerRef.current && isPlayerReady) {
      playerRef.current.pauseVideo();
      wasPaused = true;
    }

    // If Inline AI is DISABLED or AI Assistant is already OPEN, send to sidebar.
    if ((!isInlineAiEnabled || isAiAssistantOpen) && onTriggerAnalysis) {
      const cleanText = sub.text.replace(/\n/g, ' ');
      onTriggerAnalysis(cleanText, wasPaused);
      return;
    }

    // Always use local analysis for a better inline experience (when AI assistant is closed)
    if (bigTextAnalysisResults[sub.id]) return;
    setIsBigTextAnalyzing(prev => ({ ...prev, [sub.id]: true }));
    try {
      const cleanText = sub.text.replace(/\n/g, ' ');
      const result = await analyzeSentenceService(cleanText);
      setBigTextAnalysisResults(prev => ({ ...prev, [sub.id]: result }));
      setBigTextResultOrder(prev => [
        { type: 'analysis', key: sub.id },
        ...prev.filter(i => !(i.type === 'analysis' && i.key === sub.id))
      ]);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsBigTextAnalyzing(prev => ({ ...prev, [sub.id]: false }));
    }
  };

  const handleTranslate = async (sub: SubtitleItem) => {
    if (translatingIds.has(sub.id) || translations[sub.id]) return;

    // Pause video when translating only if enabled
    if (isPauseOnClickEnabled && playerRef.current && isPlayerReady) {
      playerRef.current.pauseVideo();
    }

    setTranslatingIds(prev => new Set(prev).add(sub.id));
    try {
      const result = await translateService(sub.text);
      setTranslations(prev => ({
        ...prev,
        [sub.id]: result.translation
      }));
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev);
        next.delete(sub.id);
        return next;
      });
    }
  };

  const handleWordClick = async (word: string, context: string, e: React.MouseEvent) => {
    if (!isWordSearchEnabled && !isFastLookupEnabled) return;
    e.stopPropagation();

    let wasPaused = false;
    if (isPauseOnClickEnabled && playerRef.current && isPlayerReady) {
      playerRef.current.pauseVideo();
      wasPaused = true;
    }

    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
    if (!cleanWord) return;

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(cleanWord);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }

    // If Inline AI is DISABLED or AI Assistant is already OPEN, send word lookup to sidebar.
    if ((!isInlineAiEnabled || isAiAssistantOpen) && isWordSearchEnabled && !isFastLookupEnabled && onTriggerDictionary) {
      onTriggerDictionary(cleanWord, context, wasPaused);
      return;
    }

    if (isWordSearchEnabled && !isFastLookupEnabled) {
      const cacheKey = `${cleanWord}-${context}`;
      if (bigTextDictionaryResults[cacheKey]) return;

      setIsBigTextLookupLoading(prev => ({ ...prev, [cacheKey]: true }));
      try {
        const currentTime = Math.floor(playerRef.current?.getCurrentTime() || 0);
        const currentUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}&t=${currentTime}s` : window.location.href;
        const result = await quickLookupService(cleanWord, context, currentUrl, undefined, notebookId || undefined);
        setBigTextDictionaryResults(prev => ({
          ...prev,
          [cacheKey]: { ...result, originalSentence: context, url: currentUrl }
        }));
        
        // Update local list for immediate highlight
        const encounter = buildLocalEncounter(
          cleanWord,
          context,
          { ...result, word: result.word || cleanWord },
          {
            url: currentUrl,
            video_id: notebookId || undefined
          }
        );
        setSavedWordsList(prev => upsertLocalSavedWord(prev, cleanWord, encounter));

        setBigTextResultOrder(prev => [
          { type: 'dictionary', key: cacheKey },
          ...prev.filter(i => !(i.type === 'dictionary' && i.key === cacheKey))
        ]);
      } catch (error) {
        console.error('Dictionary lookup failed:', error);
      } finally {
        setIsBigTextLookupLoading(prev => ({ ...prev, [cacheKey]: false }));
      }
      return;
    }

    if (isFastLookupEnabled) {
      const cacheKey = `${word}-${context}`;
      if (fastLookupResults[cacheKey]) return;

      setFastLookupLoading(prev => ({ ...prev, [cacheKey]: true }));
      try {
        const result = await rapidLookupService(word, context);
        setFastLookupResults(prev => ({ ...prev, [cacheKey]: result }));
      } catch (error) {
        console.error('Fast lookup failed:', error);
      } finally {
        setFastLookupLoading(prev => ({ ...prev, [cacheKey]: false }));
      }
    }
  };

  const renderSubtitleText = (text: string, context: string) => {
    if (!isWordSearchEnabled && !isFastLookupEnabled && !showSavedHighlights) return text;

    // Split by words but keep punctuation as separate or attached
    const words = text.split(/(\s+)/);
    return words.map((part, idx) => {
      if (/\s+/.test(part)) return part;
      const match = part.match(/^([a-zA-Z0-9'-]+)(.*)$/);
      if (match) {
        const [_, word, punct] = match;
        const cacheKey = `${word}-${context}`;
        const result = fastLookupResults[cacheKey];
        const isLoading = fastLookupLoading[cacheKey];

        const isSaved = showSavedHighlights && savedWordsSet.has(word.toLowerCase());

        return (
          <React.Fragment key={idx}>
            <span
              className={`hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded px-0.5 cursor-pointer transition-all text-gray-900 dark:text-gray-100 font-medium ${isSaved ? 'bg-yellow-400 dark:bg-yellow-600/40 ring-1 ring-yellow-400/30' : ''} ${isFastLookupEnabled ? 'border-b border-dashed border-gray-400 dark:border-gray-600' : 'underline decoration-dotted decoration-gray-400 dark:decoration-gray-600 underline-offset-4'} active:bg-yellow-300 dark:active:bg-yellow-800`}
              onClick={(e) => handleWordClick(word, context, e)}
            >
              {word}
            </span>
            {result && (
              <span className="mx-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm rounded-md font-bold animate-fade-in inline-flex items-center gap-1.5 shadow-sm border border-indigo-100 dark:border-indigo-800/50 align-baseline translate-y-[-1px]">
                <span className="opacity-70 text-xs font-mono">{result.p}</span>
                <span>{result.m}</span>
              </span>
            )}
            {isLoading && (
              <Loader2 className="inline w-3 h-3 animate-spin text-gray-400 ml-1" />
            )}
            {punct}
          </React.Fragment>
        );
      }
      return part;
    });
  };

  // --- Drag and Drop Handlers ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.srt')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          setSrtContent(content);
          const parsed = parseSRT(content);
          setSubtitles(optimizeSubtitles(parsed));
        };
        reader.readAsText(file);
      } else {
        alert('请上传 .srt 格式的字幕文件');
      }
    }
    // Reset input value so the same file can be selected again if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.srt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setSrtContent(content);
          const parsed = parseSRT(content);
          setSubtitles(optimizeSubtitles(parsed));
        };
        reader.readAsText(file);
      } else {
        alert('请上传 .srt 格式的字幕文件');
      }
    }
  };

  return (
    <div className={`flex-1 flex flex-col lg:landscape:flex-row ${isImmersive ? 'gap-0' : 'gap-3 lg:landscape:gap-4'} overflow-hidden min-h-0 relative`}>
      {/* 移除全屏阻塞加载遮罩 */}
      {/* Column 1: Video Player */}
      <div className={`flex-none lg:landscape:flex-[1.8] bg-white dark:bg-[#0d1117] ${isImmersive ? '' : 'lg:rounded-2xl shadow-sm lg:border'} border-b border-gray-200 dark:border-gray-800/60 flex flex-col transition-all duration-300 relative group`}>
        {/* Floating Integrated Controls */}
        <div className="absolute top-2 right-2 z-30 flex items-center gap-2 pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)]">
          <div className="relative" ref={toolsRef}>
            <button 
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs lg:text-sm font-semibold backdrop-blur-md shadow-lg active:scale-95 ${isToolsOpen ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600' : 'bg-black/40 dark:bg-black/60 text-white/90 border-white/10 hover:bg-black/70'}`}
            >
              <Settings2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span>设置</span>
            </button>

            {isToolsOpen && (
              <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 p-1.5 sm:p-2 py-2 sm:py-3 flex flex-col gap-0.5 sm:gap-1 animate-in fade-in slide-in-from-top-2">
                {/* Search Mode */}
                <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer" onClick={() => {
                  if (!isWordSearchEnabled) {
                    setIsFastLookupEnabled(false);
                  }
                  setIsWordSearchEnabled(!isWordSearchEnabled);
                }}>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">查词模式</span>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${isWordSearchEnabled ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 ${isWordSearchEnabled ? 'bg-white dark:bg-black' : 'bg-white'} rounded-full transition-transform ${isWordSearchEnabled ? 'translate-x-5' : ''}`} />
                  </div>
                </div>

                {/* Fast Lookup Mode */}
                <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer" onClick={() => {
                  if (!isFastLookupEnabled) {
                    setIsWordSearchEnabled(false);
                  }
                  setIsFastLookupEnabled(!isFastLookupEnabled);
                }}>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">极速查词</span>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${isFastLookupEnabled ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 ${isFastLookupEnabled ? 'bg-white dark:bg-black' : 'bg-white'} rounded-full transition-transform ${isFastLookupEnabled ? 'translate-x-5' : ''}`} />
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2" />

                {/* Click Pause */}
                <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer" onClick={() => setIsPauseOnClickEnabled(!isPauseOnClickEnabled)}>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">点击暂停</span>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${isPauseOnClickEnabled ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 ${isPauseOnClickEnabled ? 'bg-white dark:bg-black' : 'bg-white'} rounded-full transition-transform ${isPauseOnClickEnabled ? 'translate-x-5' : ''}`} />
                  </div>
                </div>

                {/* Big Text Mode */}
                <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer" onClick={() => setIsBigTextMode(!isBigTextMode)}>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">大字模式</span>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${isBigTextMode ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 ${isBigTextMode ? 'bg-white dark:bg-black' : 'bg-white'} rounded-full transition-transform ${isBigTextMode ? 'translate-x-5' : ''}`} />
                  </div>
                </div>

                {/* Inline AI Cards Toggle */}
                <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer" onClick={() => setIsInlineAiEnabled(!isInlineAiEnabled)}>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">内联 AI 卡片</span>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${isInlineAiEnabled ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 ${isInlineAiEnabled ? 'bg-white dark:bg-black' : 'bg-white'} rounded-full transition-transform ${isInlineAiEnabled ? 'translate-x-5' : ''}`} />
                  </div>
                </div>

                {/* Auto Scroll */}
                <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer" onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">自动跟读</span>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${isAutoScrollEnabled ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 ${isAutoScrollEnabled ? 'bg-white dark:bg-black' : 'bg-white'} rounded-full transition-transform ${isAutoScrollEnabled ? 'translate-x-5' : ''}`} />
                  </div>
                </div>

                {/* Saved Highlights */}
                <div className="px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer" onClick={() => setShowSavedHighlights(!showSavedHighlights)}>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">已存高亮</span>
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${showSavedHighlights ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                      <div className={`absolute top-1 left-1 w-3 h-3 ${showSavedHighlights ? 'bg-white dark:bg-black' : 'bg-white'} rounded-full transition-transform ${showSavedHighlights ? 'translate-x-5' : ''}`} />
                    </div>
                  </div>
                  
                  {showSavedHighlights && (
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                      <button
                        onClick={() => setHighlightScope('global')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          highlightScope === 'global'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        全局
                      </button>
                      <button
                        onClick={() => setHighlightScope('notebook')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          highlightScope === 'notebook'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        本视频
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2" />

                {/* Relocate to current time */}
                <button 
                  onClick={() => {
                    scrollToActiveSubtitle('auto');
                    setIsToolsOpen(false);
                  }}
                  className="px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors text-left w-full"
                >
                  <Navigation className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">定位当前时间</span>
                </button>

                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2" />

                {/* Immersive Mode */}
                <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer" onClick={() => onImmersiveChange?.(!isImmersive)}>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">沉浸模式</span>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${isImmersive ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isImmersive ? 'translate-x-5' : ''}`} />
                  </div>
                </div>

                {/* Back to Notebook List */}
                {onBack && (
                  <>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2" />
                    <button 
                      onClick={onBack}
                      className="px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors text-left w-full"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-500 rotate-180" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">退出学习</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className={`bg-black relative aspect-video lg:landscape:aspect-auto lg:landscape:flex-1 min-h-0 overflow-hidden flex items-center justify-center w-full`}>
          {!videoId ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center p-4 lg:p-6 text-center bg-gray-100 dark:bg-[#0d1117]">
                <div className="w-full max-w-md">
                   <form onSubmit={handleVideoUrlSubmit} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="输入 YouTube URL..."
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                      />
                      <button type="submit" className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors">
                        加载
                      </button>
                   </form>
                   <p className="mt-2 lg:mt-4 text-[10px] lg:text-sm text-gray-500">示例: https://www.youtube.com/watch?v=...</p>
                </div>
             </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="relative w-full h-auto aspect-video max-w-full max-h-full">
                <div id="youtube-player" className="absolute inset-0 w-full h-full"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column 2: Subtitles */}
      <div 
        className={`flex-1 bg-white dark:bg-[#0d1117] ${isImmersive ? '' : 'lg:rounded-2xl shadow-sm lg:border-2'} flex flex-col overflow-hidden transition-all min-h-0 relative group ${isDragging ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-transparent lg:border-gray-200 dark:lg:border-gray-800/60'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex-1 overflow-hidden relative" ref={subtitleContainerRef}>
          {isDragging && (
            <div className="absolute inset-0 bg-blue-100/80 dark:bg-blue-900/80 flex flex-col items-center justify-center z-20 pointer-events-none">
              <FileUp className="w-16 h-16 text-blue-500 mb-4 animate-bounce" />
              <p className="text-blue-600 dark:text-blue-300 font-medium text-lg">释放鼠标上传 .srt 文件</p>
            </div>
          )}

          {/* Minimalist Vertical Floating AI Actions for Current Sentence */}
          {!isBigTextMode && subtitles.length > 0 && activeSubtitleId && (
            (() => {
              const activeSub = subtitles.find(s => s.id === activeSubtitleId);
              if (!activeSub) return null;
              return (
                <div className="absolute bottom-4 right-4 z-40 flex flex-col items-stretch bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
                  <button
                    onClick={() => handleAnalyze(activeSub)}
                    className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700 border-b border-gray-100 dark:border-gray-800"
                    title="句法分析"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">分析</span>
                  </button>
                  
                  <button
                    onClick={() => handleTranslate(activeSub)}
                    disabled={translatingIds.has(activeSub.id) || !!translations[activeSub.id]}
                    className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:bg-gray-200 dark:active:bg-gray-700 border-b border-gray-100 dark:border-gray-800 ${
                      translations[activeSub.id]
                        ? 'text-gray-400 cursor-not-allowed opacity-60'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                    title="极速翻译"
                  >
                    {translatingIds.has(activeSub.id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Languages className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[10px] font-bold">{translations[activeSub.id] ? '已译' : '翻译'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onToggleAi?.(true);
                    }}
                    className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700"
                    title="问问 AI"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 opacity-80" />
                    <span className="text-[10px] font-bold">问 AI</span>
                  </button>
                </div>
              );
            })()
          )}
          
          {(() => {
            const activeIndex = subtitles.findIndex(s => s.id === activeSubtitleId);
            const isActiveVisible = activeIndex !== -1 && activeIndex >= visibleRange.startIndex && activeIndex < visibleRange.endIndex;
            
            if (!isAutoScrollEnabled && !isActiveVisible && subtitles.length > 0 && activeSubtitleId) {
              return (
                <button
                  onClick={() => scrollToActiveSubtitle()}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 active:scale-95 transition-all text-sm font-bold"
                >
                  <Target className="w-4 h-4" />
                  <span>回正</span>
                </button>
              );
            }
            return null;
          })()}

          {!subtitles.length ? (
            <div className="h-full flex flex-col p-4 items-center justify-center overflow-y-auto">
              {isLoadingNotebook ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">正在加载云端字幕...</p>
                </div>
              ) : (
                <div className="w-full max-sm text-center">
                <div 
                  className="mb-6 p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-all rounded-xl bg-gray-50/50 dark:bg-gray-800/50 group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".srt"
                    className="hidden"
                  />
                  <FileUp className="w-12 h-12 text-gray-400 group-hover:text-blue-500 mx-auto mb-3 transition-colors" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">拖拽 .srt 文件到此处</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs group-hover:text-blue-400/70 dark:group-hover:text-blue-400/70 transition-colors">或点击此处选择文件上传</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white dark:bg-[#0d1117] text-xs text-gray-400">或者</span>
                  </div>
                </div>
                <textarea
                  className="mt-4 w-full h-32 p-4 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800/60 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  placeholder="在此粘贴 SRT 字幕内容..."
                  value={srtContent}
                  onChange={handleSrtPaste}
                />
                </div>
              )}
            </div>
          ) : isBigTextMode ? (
             <div className="h-full flex flex-col items-center bg-gray-50/30 dark:bg-black/20 relative">
                {activeSubtitleId && subtitles.length > 0 && (() => {
                    const currentIndex = subtitles.findIndex(s => s.id === activeSubtitleId);
                    const handlePrev = () => {
                      if (currentIndex > 0) {
                        const prevSub = subtitles[currentIndex - 1];
                        handleJumpToTime(prevSub.startTime, prevSub.id);
                      }
                    };
                    const handleNext = () => {
                      if (currentIndex < subtitles.length - 1) {
                        const nextSub = subtitles[currentIndex + 1];
                        handleJumpToTime(nextSub.startTime, nextSub.id);
                      }
                    };
                    return (
                      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
                        <button 
                          onClick={handlePrev}
                          disabled={currentIndex <= 0}
                          className="pointer-events-auto p-2 rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-0 disabled:pointer-events-none transition-all hover:scale-110 active:scale-95 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 bg-white/40 dark:bg-black/20 backdrop-blur-sm"
                          title="上一句"
                        >
                          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                        </button>

                        <button 
                          onClick={handleTogglePlay}
                          className="pointer-events-auto p-2 sm:p-3 rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/80 text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-all hover:scale-110 active:scale-95 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 bg-white/40 dark:bg-black/20 backdrop-blur-sm"
                          title={isPlaying ? "暂停" : "播放"}
                        >
                          {isPlaying ? (
                            <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
                          ) : (
                            <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
                          )}
                        </button>

                        <button 
                          onClick={handleNext}
                          disabled={currentIndex >= subtitles.length - 1}
                          className="pointer-events-auto p-2 rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-0 disabled:pointer-events-none transition-all hover:scale-110 active:scale-95 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 bg-white/40 dark:bg-black/20 backdrop-blur-sm"
                          title="下一句"
                        >
                          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                        </button>
                      </div>
                    );
                })()}

                <div className="flex-1 w-full overflow-y-auto p-4 sm:p-8 flex flex-col items-center text-center">
                  <div className="flex-1" />
                  {activeSubtitleId ? (
                    (() => {
                        const activeSub = subtitles.find(s => s.id === activeSubtitleId);
                        if (!activeSub) return <div className="text-gray-400">Waiting for subtitle...</div>;
                        
                        return (
                          <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in w-full max-w-4xl py-4 sm:py-8">
                             <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-800 dark:text-gray-100 leading-tight tracking-wide px-10 sm:px-16">
                                {renderSubtitleText(activeSub.text, activeSub.text)}
                             </p>
                             {isWordSearchEnabled && (
                               <div className="text-sm text-gray-500 dark:text-gray-400 mt-4 font-medium flex items-center justify-center gap-2">
                                 <Sparkles className="w-4 h-4" />
                                 <span>点击单词查询释义</span>
                               </div>
                             )}
                             <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-2 sm:mt-4">
                               <button 
                                 onClick={() => handleAnalyze(activeSub)}
                                 className="px-6 py-2.5 bg-pink-100 hover:bg-pink-200 text-pink-700 dark:bg-pink-900/30 dark:hover:bg-pink-900/50 dark:text-pink-300 rounded-full font-medium transition-colors flex items-center gap-2"
                               >
                                  <Sparkles className="w-4 h-4" />
                                  <span>句法分析</span>
                               </button>
                               <button 
                                 onClick={() => handleTranslate(activeSub)}
                                 className={`px-6 py-2.5 rounded-full font-medium transition-colors flex items-center gap-2 
                                   ${translations[activeSub.id] 
                                     ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600' 
                                     : 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300'} 
                                   ${translatingIds.has(activeSub.id) ? 'animate-pulse opacity-70' : ''}`}
                                 disabled={translatingIds.has(activeSub.id) || !!translations[activeSub.id]}
                               >
                                  <Languages className="w-4 h-4" />
                                  <span>{translatingIds.has(activeSub.id) ? '翻译中...' : translations[activeSub.id] ? '已翻译' : '极速翻译'}</span>
                               </button>
                             </div>
                             {translations[activeSub.id] && (
                               <div className="mt-4 sm:mt-8 p-4 sm:p-6 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700/50 animate-fade-in shadow-sm text-left">
                                 <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                                   {translations[activeSub.id]}
                                 </p>
                               </div>
                             )}
  
                             {/* Ordered Results (Analysis & Dictionary) */}
                             <div className="mt-6 flex flex-col gap-6 w-full">
                                {/* Show loading states first as they are transient */}
                                {isBigTextAnalyzing[activeSub.id] && (
                                  <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-pink-100 dark:border-pink-900/30 animate-pulse flex flex-col items-center gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                                    <p className="text-gray-500 text-sm font-medium">正在进行深度句法分析...</p>
                                  </div>
                                )}
                                {Object.entries(isBigTextLookupLoading).map(([key, isLoading]) => {
                                  if (isLoading && key.endsWith(`-${activeSub.text}`)) {
                                    const word = key.split('-')[0];
                                    return (
                                      <div key={key} className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-3 animate-pulse">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                        <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">正在查询 "{word}"...</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
  
                                {/* Ordered content: latest on top */}
                                {bigTextResultOrder.map((item) => {
                                  if (item.type === 'analysis' && item.key === activeSub.id) {
                                    const result = bigTextAnalysisResults[item.key as number];
                                    if (!result) return null;
                                    return (
                                      <div key={`analysis-${item.key}`} className="animate-in fade-in slide-in-from-top-4 duration-500">
                                        <ResultDisplay result={result} compact={true} />
                                      </div>
                                    );
                                  }
                                  if (item.type === 'dictionary' && typeof item.key === 'string' && item.key.endsWith(`-${activeSub.text}`)) {
                                    const result = bigTextDictionaryResults[item.key];
                                    if (!result) return null;
                                    return (
                                      <div key={`dict-${item.key}`} className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <QuickLookupDisplay result={result} hideContext={true} />
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                             </div>
                          </div>
                        );
                    })()
                  ) : (
                    <div className="text-xl text-gray-400 dark:text-gray-600 font-medium">
                      等待播放...
                    </div>
                  )}
                  <div className="flex-1" />
                </div>
             </div>
          ) : (
            <Virtuoso
              style={{ height: '100%' }}
              className="pb-[env(safe-area-inset-bottom)]"
              data={subtitles}
              ref={virtuosoRef}
              rangeChanged={setVisibleRange}
              onScroll={() => {
                if (isAutoScrollEnabled) {
                  // If user manually scrolls more than a tiny bit, disable auto-scroll
                  // This is a bit tricky with logic but we'll try to detect direct user interaction
                }
              }}
              isScrolling={(scrolling) => {
                // When user is actively scrolling (not programmatic), disable auto tracking
                if (scrolling && isAutoScrollEnabled && !isProgrammaticScrollRef.current) {
                  setIsAutoScrollEnabled(false);
                }
              }}
              itemContent={(_index, sub) => (
                <div 
                  id={`subtitle-${sub.id}`} 
                  className={`group relative p-2 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800/60 ${activeSubtitleId === sub.id ? 'bg-gray-50 dark:bg-gray-800/50 border-l-4 border-l-black dark:border-l-white pl-1.5 sm:pl-2.5' : 'pl-2 sm:pl-3'}`}
                >
                  <div className="flex flex-col gap-2 min-w-0 pr-2">
                    <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 leading-relaxed select-text group/text relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJumpToTime(sub.startTime, sub.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 mr-2 bg-blue-100/50 hover:bg-blue-200/70 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-md transition-all border border-blue-200/50 dark:border-blue-700/50 align-baseline -translate-y-[1px] hover:scale-105 active:scale-95 shadow-sm"
                        title="点击跳转播放"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span className="font-mono font-bold text-xs sm:text-sm">
                          {new Date(sub.startTime * 1000).toISOString().substr(14, 5)}
                        </span>
                      </button>

                      {renderSubtitleText(sub.text, sub.text)}
                      
                      {/* Inline subtle buttons */}
                      <span className={`inline-flex items-center gap-1.5 ml-2 align-middle transition-opacity duration-200 ${activeSubtitleId === sub.id ? 'opacity-100' : 'opacity-0 group-hover/text:opacity-100'}`}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAnalyze(sub); }}
                          className="p-1 text-pink-500/60 hover:text-pink-600 dark:text-pink-400/50 dark:hover:text-pink-400 transition-colors"
                          title="句法分析"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleTranslate(sub); }}
                          className={`p-1 transition-colors 
                            ${translations[sub.id] 
                              ? 'text-gray-300 cursor-not-allowed dark:text-gray-600' 
                              : 'text-blue-500/60 hover:text-blue-600 dark:text-blue-400/50 dark:hover:text-blue-400'}
                            ${translatingIds.has(sub.id) ? 'animate-pulse' : ''}`}
                          disabled={translatingIds.has(sub.id) || !!translations[sub.id]}
                          title={translations[sub.id] ? "已翻译" : "极速翻译"}
                        >
                          <Languages className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </p>
                      
                      {translations[sub.id] && (
                        <div className="p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-gray-100/50 dark:border-gray-700/30 animate-fade-in mt-1">
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium">
                            {translations[sub.id]}
                          </p>
                        </div>
                      )}

                      {/* Local AI results for regular list (Ordered) */}
                      <div className="flex flex-col gap-3 mt-2">
                        {/* Loading States */}
                        {isBigTextAnalyzing[sub.id] && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-pink-100 dark:border-pink-900/30 animate-pulse flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                            <p className="text-gray-400 text-xs">正在分析句法...</p>
                          </div>
                        )}
                        {Object.entries(isBigTextLookupLoading).map(([key, isLoading]) => {
                          if (isLoading && key.endsWith(`-${sub.text}`)) {
                            const word = key.split('-')[0];
                            return (
                              <div key={key} className="p-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30 flex items-center gap-2 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                <span className="text-blue-500 text-xs font-medium">查询 "{word}"...</span>
                              </div>
                            );
                          }
                          return null;
                        })}

                        {/* Results in Order: Latest on Top */}
                        {bigTextResultOrder.map((item) => {
                          if (item.type === 'analysis' && item.key === sub.id) {
                            const result = bigTextAnalysisResults[item.key as number];
                            if (!result) return null;
                            return (
                              <div key={`analysis-${item.key}`} className="animate-in fade-in slide-in-from-top-1 duration-300">
                                <ResultDisplay result={result} compact={true} />
                              </div>
                            );
                          }
                          if (item.type === 'dictionary' && typeof item.key === 'string' && item.key.endsWith(`-${sub.text}`)) {
                            const result = bigTextDictionaryResults[item.key];
                            if (!result) return null;
                            return (
                              <div key={`dict-${item.key}`} className="animate-in fade-in slide-in-from-top-1 duration-300">
                                <QuickLookupDisplay result={result} hideContext={true} />
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
};
