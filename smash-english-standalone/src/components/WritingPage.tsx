
import React, { useState, useEffect, useRef } from 'react';
import { PenTool, Copy, CheckCircle2, AlertTriangle, Lightbulb, Sparkles, Loader2, Wand2, ArrowRight, X, Quote, MousePointerClick, Info, FileText, ArrowDown, ChevronDown, Split, BookOpen, Eye } from 'lucide-react';
import type { WritingResult, WritingMode, WritingSegment, AnalysisResult, PageMode } from '../types';
import { evaluateWritingService, analyzeSentenceService } from '../services/geminiService';
import { ResultDisplay } from './ResultDisplay';

interface WritingPageProps {
    initialResult: WritingResult | null;
    onResultChange: (result: WritingResult | null) => void;
}

const MODES: { value: WritingMode; label: string; shortLabel: string }[] = [
    { value: 'fix', label: '基础纠错', shortLabel: '纠错' },
];

// 预设的 Demo 数据 - 基础纠错演示
const DEMO_WRITING_RESULT: WritingResult = {
    mode: "fix",
    generalFeedback: "The text shows several grammatical errors, including subject-verb agreement, verb tense, article usage, and prepositions. Sentence structure can also be improved for clarity. Pay attention to basic sentence construction and common grammatical patterns.",
    segments: [
        { type: "change", text: "Nowadays", original: "Nowdays", reason: "拼写错误。", category: "grammar" },
        { type: "unchanged", text: ", the debate about government should " },
        { type: "change", text: "provide", original: "giving", reason: "动词形式不正确，应使用动词原形。", category: "grammar" },
        { type: "unchanged", text: " free health" },
        { type: "change", text: "care", original: " healthy care", reason: "healthy (健康的) 是形容词，health (健康) 是名词，此处应使用名词作复合词。", category: "vocabulary" },
        { type: "unchanged", text: " for everyone or individuals should pay " },
        { type: "change", text: "the", original: "", reason: "此处需要定冠词。", category: "grammar" },
        { type: "unchanged", text: " cost by " },
        { type: "change", text: "themselves", original: "self", reason: "反身代词应与主语保持一致，individuals应使用themselves。", category: "grammar" },
        { type: "unchanged", text: " has gained heavy attention. Both sides of " },
        { type: "change", text: "the", original: "", reason: "此处需要定冠词。", category: "grammar" },
        { type: "unchanged", text: " argument " },
        { type: "change", text: "present", original: "presenting", reason: "句子缺少谓语动词，应使用动词原形。", category: "grammar" },
        { type: "unchanged", text: " compelling viewpoint, and " },
        { type: "change", text: "it", original: "", reason: "it作为形式主语，指代后面的不定式。", category: "grammar" },
        { type: "unchanged", text: " is crucial to examin" },
        { type: "change", text: "e", original: "ing", reason: "在 to 后，动词应使用原形。", category: "grammar" },
        { type: "unchanged", text: " them critically before " },
        { type: "change", text: "arriving at", original: "arrive a", reason: "arriving at 是一个常用搭配，表示「达成」或「得出」某个结论。", category: "grammar" },
        { type: "unchanged", text: " a conclusion." },
        { type: "unchanged", text: "\n\n" },
        { type: "unchanged", text: "On one hand, those who agree" },
        { type: "change", text: " with", original: "s", reason: "agree with是固定搭配，且who指代those，谓语动词应使用原形。", category: "collocation" },
        { type: "unchanged", text: " free health" },
        { type: "change", text: "care", original: " healthy care", reason: "healthy (健康的) 是形容词，health (健康) 是名词，此处应使用名词作复合词。", category: "vocabulary" },
        { type: "unchanged", text: " argue that it is a foundation" },
        { type: "change", text: "al", original: "", reason: "此处需要形容词，foundational（基础的）更合适。", category: "grammar" },
        { type: "unchanged", text: " right that should be access" },
        { type: "change", text: "ible", original: "", reason: "此处应使用形容词accessible（可获得的），而非名词access。", category: "grammar" },
        { type: "unchanged", text: " to all citizens no matter their socio-economic status. They believ" },
        { type: "change", text: "e", original: "ing", reason: "句子缺少谓语动词，应使用动词原形。", category: "grammar" },
        { type: "unchanged", text: " that health" },
        { type: "change", text: "care", original: " healthy care", reason: "healthy (健康的) 是形容词，health (健康) 是名词，此处应使用名词作复合词。", category: "vocabulary" },
        { type: "unchanged", text: " is a critical service that ensure" },
        { type: "change", text: "s", original: "", reason: "主语service是单数，谓语动词应加s。", category: "grammar" },
        { type: "unchanged", text: " the well-being of individuals and society. " },
        { type: "change", text: "If the", original: "Because", reason: "原句逻辑不通顺，Because引起的是原因状语从句，与主句结构不匹配。此处应改为条件句。", category: "grammar" },
        { type: "unchanged", text: " government provide" },
        { type: "change", text: "s", original: "", reason: "主语government是单数，谓语动词应加s。", category: "grammar" },
        { type: "unchanged", text: " free health care, " },
        { type: "change", text: "it", original: "so", reason: "使用it作主语，so在此处为多余。", category: "grammar" },
        { type: "unchanged", text: " can ensure that no one " },
        { type: "change", text: "is", original: "", reason: "被动语态缺少be动词。", category: "grammar" },
        { type: "unchanged", text: " denied medical treat" },
        { type: "change", text: "ment", original: "", reason: "treatment（治疗）是名词，treat是动词。", category: "vocabulary" },
        { type: "unchanged", text: " because " },
        { type: "change", text: "of", original: "", reason: "because后接从句，because of后接名词短语。", category: "grammar" },
        { type: "unchanged", text: " no money. This can result " },
        { type: "change", text: "in", original: "to", reason: "result in 是固定搭配，表示「导致」。", category: "collocation" },
        { type: "unchanged", text: " a healthier population, reduce" },
        { type: "change", text: "d", original: "", reason: "此处应使用形容词形式，作定语修饰absent。", category: "grammar" },
        { type: "unchanged", text: " work absent" },
        { type: "change", text: "eeism", original: "", reason: "absenteeism（缺勤）是名词，absent是形容词。", category: "vocabulary" },
        { type: "unchanged", text: ", and rais" },
        { type: "change", text: "ed", original: "ing", reason: "与前面reduced work absenteeism并列，应使用过去分词作形容词。", category: "grammar" },
        { type: "unchanged", text: " productivity." }
    ]
};

// 对应 Demo 数据的原始文本
const DEMO_ORIGINAL_TEXT = `Nowdays, the debate about government should giving free healthy care for everyone or individuals should pay cost by self has gained heavy attention. Both sides of argument presenting compelling viewpoint, and is crucial to examining them critically before arrive a conclusion.

On one hand, those who agrees free healthy care argue that it is a foundation right that should be access to all citizens no matter their socio-economic status. They believing that healthy care is a critical service that ensure the well-being of individuals and society. Because government provide free health care, so can ensure that no one denied medical treat because no money. This can result to a healthier population, reduce work absent, and raising productivity.`;

const PAGE_MODES: { value: PageMode; label: string; icon: React.FC<{ className?: string }>; description: string }[] = [
    { value: 'writing', label: '写作纠错', icon: PenTool, description: '智能纠正语法错误' },
    { value: 'reading', label: '文章精读', icon: BookOpen, description: '深度分析句法结构' },
];

type ViewMode = 'diff' | 'syntax';

export const WritingPage: React.FC<WritingPageProps> = ({ initialResult, onResultChange }) => {
    // 直接使用 Demo 数据作为初始状态
    const [inputText, setInputText] = useState(DEMO_ORIGINAL_TEXT);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode] = useState<WritingMode>('fix');
    const [result, setResult] = useState<WritingResult | null>(initialResult ?? DEMO_WRITING_RESULT);

    // Page Mode State (写作纠错 / 文章精读)
    const [pageMode, setPageMode] = useState<PageMode>('writing');
    const [isPageModeDropdownOpen, setIsPageModeDropdownOpen] = useState(false);
    const pageModeDropdownRef = useRef<HTMLDivElement>(null);

    // Reading Mode State (文章精读专用)
    const [readingModeActive, setReadingModeActive] = useState(false);
    const [readingText, setReadingText] = useState("");

    // View Mode State
    const [viewMode, setViewMode] = useState<ViewMode>('diff');
    const [showOriginal, setShowOriginal] = useState(false);

    // Diff Selection State
    const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

    // Syntax Analysis State
    const [activeSentence, setActiveSentence] = useState<string | null>(null);
    const [syntaxResult, setSyntaxResult] = useState<AnalysisResult | null>(null);
    const [isSyntaxLoading, setIsSyntaxLoading] = useState(false);
    const [syntaxCache, setSyntaxCache] = useState<Record<string, AnalysisResult>>({});

    // Mobile UI State
    const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

    // 页面加载时通知父组件初始 Demo 数据
    useEffect(() => {
        if (!initialResult) {
            onResultChange(DEMO_WRITING_RESULT);
        }
    }, []);

    useEffect(() => {
        // Reset sub-states when result changes
        setActiveSegmentIndex(null);
        setActiveSentence(null);
        setSyntaxResult(null);
        setSyntaxCache({}); // Clear cache when result changes
        setViewMode('diff');
    }, [result]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pageModeDropdownRef.current && !pageModeDropdownRef.current.contains(event.target as Node)) {
                setIsPageModeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAnalyze = async () => {
        if (!inputText.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setShowOriginal(false);

        try {
            const data = await evaluateWritingService(inputText, mode);
            setResult(data);
            onResultChange(data);
        } catch (err: any) {
            setError(err.message || "分析失败，请稍后再试。");
        } finally {
            setIsLoading(false);
        }
    };

    // Demo 演示 - 使用预设数据进行提前渲染
    const handleDemo = () => {
        setInputText(DEMO_ORIGINAL_TEXT);
        setResult(DEMO_WRITING_RESULT);
        onResultChange(DEMO_WRITING_RESULT);
        setError(null);
        setShowOriginal(false);
    };

    const handleSyntaxAnalyze = async (sentence: string) => {
        if (sentence === activeSentence && syntaxResult) return; // Already loaded
        if (isSyntaxLoading) return; // Prevent duplicate requests

        setActiveSentence(sentence);

        // Check cache first
        if (syntaxCache[sentence]) {
            setSyntaxResult(syntaxCache[sentence]);
            return;
        }

        setSyntaxResult(null);
        setIsSyntaxLoading(true);

        try {
            // Reuse model level for nested syntax analysis too
            const data = await analyzeSentenceService(sentence);
            setSyntaxResult(data);
            // Update cache
            setSyntaxCache(prev => ({ ...prev, [sentence]: data }));
        } catch (err) {
            console.error(err);
            // In a real app, maybe show a toast
        } finally {
            setIsSyntaxLoading(false);
        }
    };

    const copyFullText = () => {
        if (!result) return;
        const fullText = result.segments.map(s => s.text).join('');
        navigator.clipboard.writeText(fullText);
    };

    const handleReset = () => {
        setInputText("");  // 清空输入框的 Demo 文本
        setResult(null);
        onResultChange(null);
        setActiveSegmentIndex(null);
        setShowOriginal(false);
        setViewMode('diff');
        setSyntaxResult(null);
        setActiveSentence(null);
        // Reset reading mode
        setReadingModeActive(false);
        setReadingText("");
        setSyntaxCache({});
    };

    // 文章精读模式 - 开始分析
    const handleStartReading = () => {
        if (!inputText.trim()) return;
        setReadingText(inputText);
        setReadingModeActive(true);
        setSyntaxCache({});
        setActiveSentence(null);
        setSyntaxResult(null);
    };

    // 页面模式切换
    const handlePageModeChange = (newMode: PageMode) => {
        if (newMode === pageMode) {
            setIsPageModeDropdownOpen(false);
            return;
        }
        // Reset all states when switching modes
        handleReset();
        setPageMode(newMode);
        setIsPageModeDropdownOpen(false);
    };

    const isIeltsMode = (_m: WritingMode) => false;
    const isDiffView = viewMode === 'diff';

    return (
        <div className="w-full h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)] flex flex-col gap-2 md:gap-4 animate-fade-in font-sans">
            {/* Header - Centered Layout (Compact on Mobile) */}
            <div className="flex flex-col items-center shrink-0 gap-3 md:gap-6 mb-1 md:mb-2">
                <div className="text-center">
                    <h1 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 font-serif flex items-center justify-center gap-2">
                        {pageMode === 'writing' ? (
                            <PenTool className="w-5 h-5 md:w-6 md:h-6 text-pink-500 dark:text-pink-400" />
                        ) : (
                            <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-amber-500 dark:text-amber-400" />
                        )}
                        {pageMode === 'writing' ? 'AI 写作润色' : 'AI 文章精读'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1 md:mt-2">
                        {PAGE_MODES.find(m => m.value === pageMode)?.description}
                    </p>
                </div>

                {/* Page Mode Dropdown Selector */}
                <div className="relative" ref={pageModeDropdownRef}>
                    <button
                        onClick={() => setIsPageModeDropdownOpen(!isPageModeDropdownOpen)}
                        className={`
                            flex items-center gap-1.5 md:gap-2 pl-3 md:pl-4 pr-2 md:pr-3 py-2 md:py-2.5
                            rounded-xl text-xs md:text-sm font-bold
                            border shadow-sm transition-all
                            ${pageMode === 'writing'
                                ? 'bg-green-50 dark:bg-green-950/50 text-green-900 dark:text-green-200 border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50'
                                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-100 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                            }
                        `}
                    >
                        {pageMode === 'writing' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 dark:text-green-400" />
                        ) : (
                            <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-600 dark:text-amber-400" />
                        )}
                        {PAGE_MODES.find(m => m.value === pageMode)?.label}
                        <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform ${isPageModeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isPageModeDropdownOpen && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
                            {PAGE_MODES.map((m) => {
                                const Icon = m.icon;
                                const isActive = pageMode === m.value;
                                return (
                                    <button
                                        key={m.value}
                                        onClick={() => handlePageModeChange(m.value)}
                                        className={`
                                            w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors
                                            ${isActive
                                                ? (m.value === 'writing' ? 'bg-green-50 dark:bg-green-950/50 text-green-900 dark:text-green-200' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200')
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                            }
                                        `}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? (m.value === 'writing' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400') : 'text-slate-400 dark:text-slate-500'}`} />
                                        <div>
                                            <div className="font-bold">{m.label}</div>
                                            <div className="text-xs text-slate-400 dark:text-slate-500">{m.description}</div>
                                        </div>
                                        {isActive && (
                                            <CheckCircle2 className={`w-4 h-4 ml-auto ${m.value === 'writing' ? 'text-green-500 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 shrink-0 self-center">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="flex-grow flex flex-col overflow-hidden relative min-h-0">
                {/* Input View - 写作纠错模式 */}
                {pageMode === 'writing' && (
                    <div className={`flex flex-col gap-2 md:gap-3 transition-all duration-500 h-full ${result ? 'hidden' : 'w-full mx-auto max-w-4xl'}`}>
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">原文输入</label>
                            <span className="text-[10px] md:text-xs text-slate-300 dark:text-slate-600">{inputText.length} 字符</span>
                        </div>
                        <div className="flex-grow relative pb-16 md:pb-0">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="请在此粘贴或输入英语文章/段落..."
                                className="w-full h-full p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed resize-none focus:ring-4 focus:ring-pink-50 dark:focus:ring-pink-900/50 focus:border-pink-300 dark:focus:border-pink-700 outline-none shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-600 font-serif whitespace-pre-wrap transition-colors"
                                disabled={isLoading}
                            />
                            {/* Desktop: Inline Buttons */}
                            <div className="hidden md:flex absolute bottom-4 right-4 items-center gap-3">
                                <button
                                    onClick={handleDemo}
                                    disabled={isLoading}
                                    className="px-4 py-3 rounded-xl font-medium shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                >
                                    <Lightbulb className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                                    <span>Demo 演示</span>
                                </button>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={!inputText.trim() || isLoading}
                                    className={`px-6 py-3 rounded-xl font-medium shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white
                                        ${isIeltsMode(mode) ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-indigo-900' : 'bg-green-600 hover:bg-green-700 shadow-green-200 dark:shadow-green-900'}
                                    `}
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isIeltsMode(mode) ? <Wand2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />)}
                                    <span>{isIeltsMode(mode) ? '开始升格' : '开始纠错'}</span>
                                </button>
                            </div>
                            {/* Mobile: Fixed Bottom Buttons */}
                            <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-white via-white dark:from-slate-950 dark:via-slate-950 to-transparent pt-6">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleDemo}
                                        disabled={isLoading}
                                        className="px-3 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    >
                                        <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                        <span className="text-sm">Demo</span>
                                    </button>
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={!inputText.trim() || isLoading}
                                        className={`flex-1 px-4 py-2.5 rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white
                                            ${isIeltsMode(mode) ? 'bg-indigo-600 shadow-indigo-200 dark:shadow-indigo-900' : 'bg-green-600 shadow-green-200 dark:shadow-green-900'}
                                        `}
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isIeltsMode(mode) ? <Wand2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />)}
                                        <span className="text-sm">{isIeltsMode(mode) ? '开始升格' : '开始纠错'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Input View - 文章精读模式 */}
                {pageMode === 'reading' && !readingModeActive && (
                    <div className="flex flex-col gap-2 md:gap-3 transition-all duration-500 h-full w-full mx-auto max-w-4xl">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] md:text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">文章输入</label>
                            <span className="text-[10px] md:text-xs text-slate-300 dark:text-slate-600">{inputText.length} 字符</span>
                        </div>
                        <div className="flex-grow relative pb-16 md:pb-0">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="请在此粘贴或输入要精读的英语文章..."
                                className="w-full h-full p-4 md:p-6 rounded-xl md:rounded-2xl border border-amber-100 dark:border-amber-800/50 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed resize-none focus:ring-4 focus:ring-amber-50 dark:focus:ring-amber-900/50 focus:border-amber-300 dark:focus:border-amber-700 outline-none shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-600 font-serif whitespace-pre-wrap transition-colors"
                            />
                            {/* Desktop: Inline Button */}
                            <div className="hidden md:block absolute bottom-4 right-4">
                                <button
                                    onClick={handleStartReading}
                                    disabled={!inputText.trim()}
                                    className="px-6 py-3 rounded-xl font-medium shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-amber-900"
                                >
                                    <BookOpen className="w-5 h-5" />
                                    <span>开始精读</span>
                                </button>
                            </div>
                            {/* Mobile: Fixed Bottom Button */}
                            <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-white via-white dark:from-slate-950 dark:via-slate-950 to-transparent pt-6">
                                <button
                                    onClick={handleStartReading}
                                    disabled={!inputText.trim()}
                                    className="w-full px-4 py-2.5 rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white bg-amber-500 shadow-amber-200 dark:shadow-amber-900"
                                >
                                    <BookOpen className="w-4 h-4" />
                                    <span className="text-sm">开始精读</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Result View (Split) */}
                {result && (
                    <div className="w-full h-full flex flex-col gap-2 md:gap-4 animate-slide-in-right min-h-0 w-full">
                        {/* Controls Bar - Mobile Optimized */}
                        <div className="shrink-0 px-1">
                            {/* Mobile: Horizontal Scrollable Controls */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                                {/* Left: Mode Label & Count */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <label className={`text-xs md:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 md:gap-2 ${isIeltsMode(result.mode) ? 'text-indigo-600 dark:text-indigo-400' : 'text-green-600 dark:text-green-400'}`}>
                                        {isIeltsMode(result.mode) ? <Wand2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                                        <span className="hidden sm:inline">{MODES.find(m => m.value === result.mode)?.label || '结果'}</span>
                                        <span className="sm:hidden">{MODES.find(m => m.value === result.mode)?.shortLabel || '纠错'}</span>
                                    </label>
                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                        {result.segments.filter(s => s.type === 'change').length} 处修改
                                    </span>
                                </div>

                                {/* Divider */}
                                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0 hidden md:block"></div>

                                {/* Action Buttons - Scrollable on Mobile */}
                                <div className="flex items-center gap-1.5 md:gap-3 ml-auto shrink-0">
                                    {isDiffView && (
                                        <button
                                            onClick={() => setShowOriginal(!showOriginal)}
                                            className={`text-[10px] md:text-xs flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-colors font-medium border shadow-sm whitespace-nowrap ${showOriginal ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-800 dark:border-slate-100 hover:bg-slate-900 dark:hover:bg-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                        >
                                            <Eye className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                            <span className="hidden sm:inline">{showOriginal ? '返回修订' : '查看原文'}</span>
                                            <span className="sm:hidden">原文</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={copyFullText}
                                        className="text-[10px] md:text-xs flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-colors font-medium shadow-sm whitespace-nowrap"
                                    >
                                        <Copy className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                        <span className="hidden sm:inline">复制全文</span>
                                        <span className="sm:hidden">复制</span>
                                    </button>
                                    {/* Desktop: 大按钮 */}
                                    <button
                                        onClick={handleReset}
                                        className="hidden md:flex px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all items-center gap-2 text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl hover:scale-105 active:scale-100"
                                    >
                                        <PenTool className="w-5 h-5" />
                                        <span>开始我的纠错</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Grid Container - 50/50 Split on Desktop, Full + Drawer on Mobile */}
                        <div className="flex-grow min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6 relative">

                            {/* LEFT COLUMN: Text View (Diff or Syntax) */}
                            <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border overflow-hidden shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 h-full transition-colors ${isIeltsMode(result.mode) ? 'border-indigo-100/80 dark:border-indigo-800/50' : 'border-green-100/80 dark:border-green-800/50'}`}>
                                {/* Header / Mode Switcher */}
                                <div className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 px-3 md:px-6 py-2 md:py-3 flex flex-wrap items-center justify-between text-[10px] md:text-sm text-slate-500 dark:text-slate-400 shrink-0 gap-1.5 md:gap-2 transition-colors">

                                    {/* Mode Toggle */}
                                    <div className="flex p-0.5 md:p-1 bg-slate-200/60 dark:bg-slate-700/60 rounded-lg">
                                        <button
                                            onClick={() => setViewMode('diff')}
                                            className={`px-2 md:px-3 py-0.5 md:py-1 rounded-md text-[10px] md:text-xs font-bold transition-all flex items-center gap-1 md:gap-1.5 ${viewMode === 'diff' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            <Split className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                            <span className="hidden sm:inline">改写对比 (Diff)</span>
                                            <span className="sm:hidden">Diff</span>
                                        </button>
                                        <button
                                            onClick={() => setViewMode('syntax')}
                                            className={`px-2 md:px-3 py-0.5 md:py-1 rounded-md text-[10px] md:text-xs font-bold transition-all flex items-center gap-1 md:gap-1.5 ${viewMode === 'syntax' ? 'bg-white dark:bg-slate-600 text-pink-600 dark:text-pink-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                            句法分析
                                        </button>
                                    </div>

                                    {/* Legend - Hidden on Mobile */}
                                    {viewMode === 'diff' && !showOriginal && (
                                        <div className="hidden md:flex items-center gap-4 ml-auto">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400/50 dark:bg-slate-500/50"></span>
                                                <span className="line-through opacity-70">原文</span>
                                            </div>
                                            <ArrowRight className="w-3 h-3 opacity-30" />
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${isIeltsMode(result.mode) ? 'bg-indigo-500' : 'bg-green-500'}`}></span>
                                                <span className={`font-bold ${isIeltsMode(result.mode) ? 'text-indigo-700 dark:text-indigo-400' : 'text-green-700 dark:text-green-400'}`}>
                                                    修改后
                                                </span>
                                            </div>
                                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                                                <MousePointerClick className="w-3 h-3" />
                                                <span className="text-[10px]">点击详情</span>
                                            </div>
                                        </div>
                                    )}
                                    {/* Mobile Legend Hint */}
                                    {viewMode === 'diff' && !showOriginal && (
                                        <div className="flex md:hidden items-center gap-1 ml-auto text-slate-400 dark:text-slate-500">
                                            <MousePointerClick className="w-2.5 h-2.5" />
                                            <span className="text-[9px]">点击详情</span>
                                        </div>
                                    )}
                                    {viewMode === 'syntax' && (
                                        <div className="flex items-center gap-1 md:gap-2 ml-auto text-pink-500/70 dark:text-pink-400/70 text-[9px] md:text-xs">
                                            <MousePointerClick className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                            <span className="hidden sm:inline">点击任意句子查看句法结构</span>
                                            <span className="sm:hidden">点击句子分析</span>
                                        </div>
                                    )}
                                </div>

                                {/* Scrollable Text Area */}
                                <div className="p-4 md:p-10 overflow-y-auto custom-scrollbar flex-grow pb-20 lg:pb-4">
                                    <div className="font-serif text-base md:text-xl leading-relaxed md:leading-loose text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                                        {viewMode === 'diff' ? (
                                            showOriginal ? (
                                                inputText
                                            ) : (
                                                result.segments.map((segment, idx) => (
                                                    <UnifiedSegmentRenderer
                                                        key={idx}
                                                        segment={segment}
                                                        mode={result.mode}
                                                        isActive={activeSegmentIndex === idx}
                                                        onClick={() => {
                                                            if (segment.type === 'change') {
                                                                setActiveSegmentIndex(idx);
                                                                setIsMobileDetailOpen(true);
                                                            }
                                                        }}
                                                    />
                                                ))
                                            )
                                        ) : (
                                            <SyntaxModeTextRenderer
                                                fullText={result.segments.map(s => s.text).join('')}
                                                activeSentence={activeSentence}
                                                onSentenceClick={(s) => {
                                                    handleSyntaxAnalyze(s);
                                                    setIsMobileDetailOpen(true);
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Details Panel - Desktop */}
                            <div className="hidden lg:flex flex-col h-full min-h-0">
                                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/30 dark:shadow-slate-900/30 h-full overflow-hidden flex flex-col relative transition-colors">

                                    {/* Header */}
                                    <div className={`px-5 py-4 border-b shrink-0 flex items-center gap-2 transition-colors ${viewMode === 'syntax' ? 'bg-pink-50/50 dark:bg-pink-950/30 border-pink-100 dark:border-pink-800/50' : (isIeltsMode(result.mode) ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-800/50' : 'bg-green-50/50 dark:bg-green-950/30 border-green-100 dark:border-green-800/50')}`}>
                                        {viewMode === 'syntax' ? (
                                            <>
                                                <div className="p-1 rounded-md bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400">
                                                    <Split className="w-4 h-4" />
                                                </div>
                                                <h3 className="font-bold text-sm text-pink-900 dark:text-pink-200">句法分析</h3>
                                            </>
                                        ) : (
                                            activeSegmentIndex !== null ? (
                                                <>
                                                    <div className={`p-1 rounded-md ${isIeltsMode(result.mode) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'}`}>
                                                        <Sparkles className="w-4 h-4" />
                                                    </div>
                                                    <h3 className={`font-bold text-sm ${isIeltsMode(result.mode) ? 'text-indigo-900 dark:text-indigo-200' : 'text-green-900 dark:text-green-200'}`}>修改详情</h3>
                                                </>
                                            ) : (
                                                <>
                                                    <div className={`p-1 rounded-md ${isIeltsMode(result.mode) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'}`}>
                                                        <Lightbulb className="w-4 h-4" />
                                                    </div>
                                                    <h3 className={`font-bold text-sm ${isIeltsMode(result.mode) ? 'text-indigo-900 dark:text-indigo-200' : 'text-green-900 dark:text-green-200'}`}>AI 点评</h3>
                                                </>
                                            )
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="overflow-y-auto custom-scrollbar flex-grow bg-slate-50/30 dark:bg-slate-800/30 relative transition-colors">
                                        {viewMode === 'syntax' ? (
                                            <div className="p-0 h-full">
                                                {isSyntaxLoading ? (
                                                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500 gap-3">
                                                        <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
                                                        <p className="text-sm">正在解析句子结构...</p>
                                                    </div>
                                                ) : syntaxResult ? (
                                                    <ResultDisplay result={syntaxResult} compact={true} />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-50">
                                                        <MousePointerClick className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                                                        <p className="text-slate-500 dark:text-slate-400 text-sm">请点击左侧文章中的<br />任意句子进行分析</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-5">
                                                {activeSegmentIndex !== null ? (
                                                    <DetailContent
                                                        segment={result.segments[activeSegmentIndex]}
                                                        mode={result.mode}
                                                    />
                                                ) : (
                                                    <GeneralFeedbackContent
                                                        feedback={result.generalFeedback}
                                                        mode={result.mode}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Hint (Diff Mode Only) */}
                                    {viewMode === 'diff' && activeSegmentIndex === null && (
                                        <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 transition-colors">
                                            点击左侧 <span className={`${isIeltsMode(result.mode) ? 'text-indigo-500 dark:text-indigo-400' : 'text-green-500 dark:text-green-400'} font-bold`}>高亮区域</span> 查看具体修改原因
                                        </div>
                                    )}
                                    {viewMode === 'diff' && activeSegmentIndex !== null && (
                                        <button
                                            onClick={() => setActiveSegmentIndex(null)}
                                            className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700 transition-colors font-medium"
                                        >
                                            返回整体点评
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* MOBILE: Floating Action Button */}
                            <div className="lg:hidden fixed bottom-20 right-4 z-40 flex flex-col gap-2">
                                {/* Detail Toggle Button */}
                                <button
                                    onClick={() => setIsMobileDetailOpen(!isMobileDetailOpen)}
                                    className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${isMobileDetailOpen
                                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                                        : (viewMode === 'syntax'
                                            ? 'bg-pink-500 text-white'
                                            : 'bg-green-500 text-white')
                                        }`}
                                >
                                    {isMobileDetailOpen ? (
                                        <ChevronDown className="w-5 h-5" />
                                    ) : (
                                        <Sparkles className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* MOBILE: Bottom Drawer for Details */}
                            <div
                                className={`lg:hidden fixed inset-x-0 bottom-0 z-30 transition-transform duration-300 ease-out ${isMobileDetailOpen ? 'translate-y-0' : 'translate-y-full'
                                    }`}
                            >
                                <div className="bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-700 shadow-2xl h-[75vh] flex flex-col">
                                    {/* Drawer Handle */}
                                    <div
                                        className="flex justify-center py-2 cursor-pointer"
                                        onClick={() => setIsMobileDetailOpen(false)}
                                    >
                                        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                    </div>

                                    {/* Header */}
                                    <div className={`px-4 py-3 border-b shrink-0 flex items-center justify-between transition-colors ${viewMode === 'syntax' ? 'bg-pink-50/50 dark:bg-pink-950/30 border-pink-100 dark:border-pink-800/50' : (isIeltsMode(result.mode) ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-800/50' : 'bg-green-50/50 dark:bg-green-950/30 border-green-100 dark:border-green-800/50')}`}>
                                        <div className="flex items-center gap-2">
                                            {viewMode === 'syntax' ? (
                                                <>
                                                    <div className="p-1 rounded-md bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400">
                                                        <Split className="w-4 h-4" />
                                                    </div>
                                                    <h3 className="font-bold text-sm text-pink-900 dark:text-pink-200">句法分析</h3>
                                                </>
                                            ) : (
                                                activeSegmentIndex !== null ? (
                                                    <>
                                                        <div className={`p-1 rounded-md ${isIeltsMode(result.mode) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'}`}>
                                                            <Sparkles className="w-4 h-4" />
                                                        </div>
                                                        <h3 className={`font-bold text-sm ${isIeltsMode(result.mode) ? 'text-indigo-900 dark:text-indigo-200' : 'text-green-900 dark:text-green-200'}`}>修改详情</h3>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className={`p-1 rounded-md ${isIeltsMode(result.mode) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'}`}>
                                                            <Lightbulb className="w-4 h-4" />
                                                        </div>
                                                        <h3 className={`font-bold text-sm ${isIeltsMode(result.mode) ? 'text-indigo-900 dark:text-indigo-200' : 'text-green-900 dark:text-green-200'}`}>AI 点评</h3>
                                                    </>
                                                )
                                            )}
                                        </div>
                                        {viewMode === 'diff' && activeSegmentIndex !== null && (
                                            <button
                                                onClick={() => setActiveSegmentIndex(null)}
                                                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                返回整体点评
                                            </button>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="overflow-y-auto flex-grow bg-slate-50/30 dark:bg-slate-800/30">
                                        {viewMode === 'syntax' ? (
                                            <div className="p-0 h-full">
                                                {isSyntaxLoading ? (
                                                    <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500 gap-3">
                                                        <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
                                                        <p className="text-sm">正在解析句子结构...</p>
                                                    </div>
                                                ) : syntaxResult ? (
                                                    <ResultDisplay result={syntaxResult} compact={true} />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-48 p-6 text-center opacity-50">
                                                        <MousePointerClick className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                                                        <p className="text-slate-500 dark:text-slate-400 text-sm">请点击文章中的任意句子进行分析</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-4">
                                                {activeSegmentIndex !== null ? (
                                                    <DetailContent
                                                        segment={result.segments[activeSegmentIndex]}
                                                        mode={result.mode}
                                                    />
                                                ) : (
                                                    <GeneralFeedbackContent
                                                        feedback={result.generalFeedback}
                                                        mode={result.mode}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Safe Area Padding for iOS */}
                                    <div className="h-6 bg-white dark:bg-slate-900"></div>
                                </div>
                            </div>

                            {/* Mobile Backdrop */}
                            {isMobileDetailOpen && (
                                <div
                                    className="lg:hidden fixed inset-0 bg-black/20 dark:bg-black/40 z-20"
                                    onClick={() => setIsMobileDetailOpen(false)}
                                />
                            )}

                        </div>

                        {/* Mobile: Fixed Bottom Start Button */}
                        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-white via-white dark:from-slate-950 dark:via-slate-950 to-transparent pt-8">
                            <button
                                onClick={handleReset}
                                className="w-full px-5 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:scale-98"
                            >
                                <PenTool className="w-5 h-5" />
                                <span>开始我的纠错</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Reading Mode View - 文章精读模式 */}
                {pageMode === 'reading' && readingModeActive && (
                    <div className="w-full h-full flex flex-col gap-2 md:gap-4 animate-slide-in-right min-h-0">
                        {/* Controls Bar */}
                        <div className="flex justify-between items-center px-1 shrink-0">
                            <div className="flex items-center gap-2 md:gap-3">
                                <label className="text-xs md:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 md:gap-2 text-amber-600 dark:text-amber-400">
                                    <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    文章精读
                                </label>
                            </div>

                            <div className="flex items-center gap-2 md:gap-3">
                                <button
                                    onClick={handleReset}
                                    className="text-[10px] md:text-xs flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5 md:w-4 md:h-4" /> 重新选择
                                </button>
                            </div>
                        </div>

                        {/* Main Grid Container - 50/50 Split on Desktop, Full + Drawer on Mobile */}
                        <div className="flex-grow min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6 relative">

                            {/* LEFT COLUMN: Text View */}
                            <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-amber-100/80 dark:border-amber-800/50 overflow-hidden shadow-xl shadow-amber-100/30 dark:shadow-amber-900/20 h-full transition-colors">
                                {/* Header */}
                                <div className="bg-amber-50/50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-800/50 px-3 md:px-6 py-2 md:py-3 flex flex-wrap items-center justify-between text-[10px] md:text-sm text-slate-500 dark:text-slate-400 shrink-0 gap-1.5 md:gap-2 transition-colors">
                                    <div className="flex items-center gap-1.5 md:gap-2 text-amber-700 dark:text-amber-400 font-bold">
                                        <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                        原文阅读
                                    </div>
                                    <div className="flex items-center gap-1 md:gap-2 text-amber-500/70 dark:text-amber-400/70 text-[9px] md:text-xs">
                                        <MousePointerClick className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                        <span className="hidden sm:inline">点击任意句子查看句法结构</span>
                                        <span className="sm:hidden">点击句子分析</span>
                                    </div>
                                </div>

                                {/* Scrollable Text Area */}
                                <div className="p-4 md:p-10 overflow-y-auto custom-scrollbar flex-grow pb-20 lg:pb-4">
                                    <div className="font-serif text-base md:text-xl leading-relaxed md:leading-loose text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                                        <SyntaxModeTextRenderer
                                            fullText={readingText}
                                            activeSentence={activeSentence}
                                            onSentenceClick={(s) => {
                                                handleSyntaxAnalyze(s);
                                                setIsMobileDetailOpen(true);
                                            }}
                                            themeColor="amber"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Details Panel - Desktop Only */}
                            <div className="hidden lg:flex flex-col h-full min-h-0">
                                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/30 dark:shadow-slate-900/30 h-full overflow-hidden flex flex-col relative transition-colors">

                                    {/* Header */}
                                    <div className="px-5 py-4 border-b shrink-0 flex items-center gap-2 bg-amber-50/50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-800/50 transition-colors">
                                        <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                                            <Split className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">句法分析</h3>
                                    </div>

                                    {/* Content */}
                                    <div className="overflow-y-auto custom-scrollbar flex-grow bg-slate-50/30 dark:bg-slate-800/30 relative transition-colors">
                                        <div className="p-0 h-full">
                                            {isSyntaxLoading ? (
                                                <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500 gap-3">
                                                    <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                                                    <p className="text-sm">正在解析句子结构...</p>
                                                </div>
                                            ) : syntaxResult ? (
                                                <ResultDisplay result={syntaxResult} compact={true} />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-50">
                                                    <MousePointerClick className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                                                    <p className="text-slate-500 dark:text-slate-400 text-sm">请点击左侧文章中的<br />任意句子进行分析</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* MOBILE: Floating Action Button */}
                            <div className="lg:hidden fixed bottom-20 right-4 z-40 flex flex-col gap-2">
                                <button
                                    onClick={() => setIsMobileDetailOpen(!isMobileDetailOpen)}
                                    className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${isMobileDetailOpen
                                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                                        : 'bg-amber-500 text-white'
                                        }`}
                                >
                                    {isMobileDetailOpen ? (
                                        <ChevronDown className="w-5 h-5" />
                                    ) : (
                                        <Sparkles className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* MOBILE: Bottom Drawer for Details */}
                            <div
                                className={`lg:hidden fixed inset-x-0 bottom-0 z-30 transition-transform duration-300 ease-out ${isMobileDetailOpen ? 'translate-y-0' : 'translate-y-full'
                                    }`}
                            >
                                <div className="bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-700 shadow-2xl h-[75vh] flex flex-col">
                                    {/* Drawer Handle */}
                                    <div
                                        className="flex justify-center py-2 cursor-pointer"
                                        onClick={() => setIsMobileDetailOpen(false)}
                                    >
                                        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                    </div>

                                    {/* Header */}
                                    <div className="px-4 py-3 border-b shrink-0 flex items-center gap-2 bg-amber-50/50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-800/50 transition-colors">
                                        <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                                            <Split className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">句法分析</h3>
                                    </div>

                                    {/* Content */}
                                    <div className="overflow-y-auto flex-grow bg-slate-50/30 dark:bg-slate-800/30">
                                        <div className="p-0 h-full">
                                            {isSyntaxLoading ? (
                                                <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500 gap-3">
                                                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                                                    <p className="text-sm">正在解析句子结构...</p>
                                                </div>
                                            ) : syntaxResult ? (
                                                <ResultDisplay result={syntaxResult} compact={true} />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-48 p-6 text-center opacity-50">
                                                    <MousePointerClick className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                                                    <p className="text-slate-500 dark:text-slate-400 text-sm">请点击文章中的任意句子进行分析</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Safe Area Padding for iOS */}
                                    <div className="h-6 bg-white dark:bg-slate-900"></div>
                                </div>
                            </div>

                            {/* Mobile Backdrop */}
                            {isMobileDetailOpen && (
                                <div
                                    className="lg:hidden fixed inset-0 bg-black/20 dark:bg-black/40 z-20"
                                    onClick={() => setIsMobileDetailOpen(false)}
                                />
                            )}

                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 20px;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

// --- Renderers ---

const SyntaxModeTextRenderer: React.FC<{
    fullText: string;
    activeSentence: string | null;
    onSentenceClick: (s: string) => void;
    themeColor?: 'pink' | 'amber';
}> = ({ fullText, activeSentence, onSentenceClick, themeColor = 'pink' }) => {
    // Use Intl.Segmenter to split sentences
    const segmenter = new (Intl as any).Segmenter('en', { granularity: 'sentence' });
    const sentences = Array.from(segmenter.segment(fullText)) as { segment: string }[];

    // Theme color classes
    const themeClasses = themeColor === 'amber'
        ? {
            active: 'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 ring-2 ring-amber-200 dark:ring-amber-700 shadow-sm font-medium',
            hover: 'hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 text-slate-600 dark:text-slate-400 active:bg-amber-100 dark:active:bg-amber-900/50'
        }
        : {
            active: 'bg-pink-100 dark:bg-pink-900/50 text-pink-900 dark:text-pink-200 ring-2 ring-pink-200 dark:ring-pink-700 shadow-sm font-medium',
            hover: 'hover:bg-pink-50 dark:hover:bg-pink-950/50 hover:text-pink-700 dark:hover:text-pink-300 text-slate-600 dark:text-slate-400 active:bg-pink-100 dark:active:bg-pink-900/50'
        };

    return (
        <>
            {sentences.map((seg, idx) => {
                const text = seg.segment;
                const isWhitespace = /^\s+$/.test(text);

                // Don't make whitespace clickable
                if (isWhitespace) return <span key={idx}>{text}</span>;

                const isActive = activeSentence === text;

                return (
                    <span
                        key={idx}
                        onClick={() => onSentenceClick(text)}
                        className={`
                            transition-all duration-200 cursor-pointer rounded px-0.5 md:px-1 decoration-clone
                            ${isActive ? themeClasses.active : themeClasses.hover}
                        `}
                    >
                        {text}
                    </span>
                );
            })}
        </>
    );
};

const UnifiedSegmentRenderer: React.FC<{
    segment: WritingSegment;
    mode: WritingMode;
    isActive: boolean;
    onClick: () => void;
}> = ({ segment, mode, isActive, onClick }) => {

    if (segment.type === 'unchanged') {
        // Safely render text including whitespace/newlines
        return <span>{segment.text}</span>;
    }

    const isIelts = mode.startsWith('ielts');

    const themeClasses = isIelts
        ? {
            bg: isActive ? 'bg-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900 scale-105' : 'bg-indigo-50 dark:bg-indigo-950/50',
            border: isActive ? 'border-indigo-600 dark:border-indigo-500' : 'border-indigo-100 dark:border-indigo-800',
            text: isActive ? 'text-white' : 'text-indigo-900 dark:text-indigo-200',
            hover: !isActive ? 'hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700' : '',
            original: isActive ? 'text-indigo-200 decoration-indigo-300' : 'text-slate-500 dark:text-slate-400 decoration-slate-400/50 dark:decoration-slate-500/50',
            arrow: isActive ? 'text-indigo-300' : 'text-indigo-300 dark:text-indigo-400'
        }
        : {
            bg: isActive ? 'bg-green-600 shadow-md shadow-green-200 dark:shadow-green-900 scale-105' : 'bg-green-50 dark:bg-green-950/50',
            border: isActive ? 'border-green-600 dark:border-green-500' : 'border-green-100 dark:border-green-800',
            text: isActive ? 'text-white' : 'text-green-900 dark:text-green-200',
            hover: !isActive ? 'hover:bg-green-100 dark:hover:bg-green-900/50 hover:border-green-300 dark:hover:border-green-700' : '',
            original: isActive ? 'text-green-200 decoration-green-300' : 'text-slate-500 dark:text-slate-400 decoration-slate-400/50 dark:decoration-slate-500/50',
            arrow: isActive ? 'text-green-300' : 'text-green-300 dark:text-green-400'
        };

    return (
        <span
            className={`
                relative inline-flex items-center gap-1 md:gap-2 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg border transition-all duration-200 cursor-pointer align-middle mx-0.5 my-0.5 md:my-1 select-none text-sm md:text-base
                ${themeClasses.bg} ${themeClasses.border} ${themeClasses.text} ${themeClasses.hover}
            `}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
        >
            {segment.original && (
                <span className={`line-through decoration-2 text-[0.85em] md:text-[0.9em] transition-colors ${themeClasses.original}`}>
                    {segment.original}
                </span>
            )}

            {segment.original && segment.text && (
                <ArrowRight className={`w-2.5 h-2.5 md:w-3.5 md:h-3.5 shrink-0 ${themeClasses.arrow}`} />
            )}

            {segment.text && (
                <span className="font-bold">
                    {segment.text}
                </span>
            )}
        </span>
    );
};

const GeneralFeedbackContent: React.FC<{ feedback: string; mode: WritingMode }> = ({ feedback, mode }) => {
    const isIelts = mode.startsWith('ielts');
    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                <Quote className={`w-6 h-6 md:w-8 md:h-8 mb-2 md:mb-3 opacity-20 ${isIelts ? 'text-indigo-600 dark:text-indigo-400' : 'text-green-600 dark:text-green-400'}`} />
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base font-medium">
                    {feedback}
                </p>
            </div>

            <div className="space-y-2 md:space-y-3">
                <h4 className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">使用指南</h4>
                <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-1.5 md:gap-2">
                        <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full mt-1.5 shrink-0 ${isIelts ? 'bg-indigo-400' : 'bg-green-400'}`}></div>
                        <span>点击文中的彩色区域，查看详细的修改建议和原因。</span>
                    </li>
                    <li className="flex items-start gap-1.5 md:gap-2">
                        <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full mt-1.5 shrink-0 bg-slate-300 dark:bg-slate-600"></div>
                        <span>点击复制按钮可以一键复制修改后的全文。</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

const DetailContent: React.FC<{ segment: WritingSegment; mode: WritingMode }> = ({ segment, mode }) => {
    const isIelts = mode.startsWith('ielts');
    const themeColors = isIelts ? {
        text: 'text-indigo-700 dark:text-indigo-300',
        bg: 'bg-indigo-50 dark:bg-indigo-950/30',
        border: 'border-indigo-100 dark:border-indigo-800',
        tagBg: 'bg-indigo-100 dark:bg-indigo-900/50',
        tagText: 'text-indigo-600 dark:text-indigo-400',
        originalBorder: 'border-indigo-300 dark:border-indigo-700'
    } : {
        text: 'text-green-700 dark:text-green-300',
        bg: 'bg-green-50 dark:bg-green-950/30',
        border: 'border-green-100 dark:border-green-800',
        tagBg: 'bg-green-100 dark:bg-green-900/50',
        tagText: 'text-green-600 dark:text-green-400',
        originalBorder: 'border-blue-300 dark:border-blue-700'
    };

    return (
        <div className="flex flex-col items-center space-y-3 md:space-y-4 animate-in slide-in-from-right-4 duration-300 py-2 md:py-4">

            {/* Original Bubble */}
            <div className="w-full flex flex-col items-start">
                <span className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 mb-1 md:mb-1.5 ml-1 uppercase tracking-wide">原文</span>
                <div className={`relative w-full p-3 md:p-4 rounded-xl md:rounded-2xl border-2 bg-white dark:bg-slate-800 text-center shadow-sm transition-colors ${themeColors.originalBorder} border-opacity-60`}>
                    <p className="text-slate-500 dark:text-slate-400 line-through decoration-red-300 dark:decoration-red-500 decoration-2 font-serif text-base md:text-lg break-words">
                        {segment.original || <span className="italic opacity-30 text-sm">None</span>}
                    </p>
                </div>
            </div>

            {/* Down Arrow */}
            <div className="text-slate-300 dark:text-slate-600 animate-bounce-slow">
                <ArrowDown className="w-5 h-5 md:w-6 md:h-6" />
            </div>

            {/* Revised Bubble */}
            <div className="w-full flex flex-col items-start">
                <span className={`text-[10px] md:text-xs font-bold mb-1 md:mb-1.5 ml-1 uppercase tracking-wide ${themeColors.tagText}`}>修改后</span>
                <div className={`w-full p-3 md:p-4 rounded-xl md:rounded-2xl border-2 bg-white dark:bg-slate-800 text-center shadow-sm transition-colors ${themeColors.text} ${themeColors.border} bg-opacity-30`}>
                    <p className="font-serif text-lg md:text-xl font-bold break-words">
                        {segment.text}
                    </p>
                </div>
            </div>

            {/* Category Tag */}
            <div className="py-1 md:py-2">
                <span className={`text-[9px] md:text-[10px] font-bold uppercase px-2.5 md:px-3 py-1 md:py-1.5 rounded-full ${themeColors.tagBg} ${themeColors.tagText} tracking-wider shadow-sm`}>
                    {segment.category || 'SUGGESTION'}
                </span>
            </div>

            {/* Reason Box */}
            <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg md:rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mt-1 md:mt-2 transition-colors">
                <div className="bg-slate-100 dark:bg-slate-700 px-3 md:px-4 py-1.5 md:py-2 border-b border-slate-200 dark:border-slate-600 flex items-center gap-1.5 md:gap-2 transition-colors">
                    <Info className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">修改原因</span>
                </div>
                <div className="p-3 md:p-4">
                    <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-relaxed text-justify">
                        {segment.reason || "AI 建议优化表达以更符合语境。"}
                    </p>
                </div>
            </div>
        </div>
    );
};
