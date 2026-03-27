
import React, { useState, useRef } from 'react';
import type { AnalysisResult, AnalysisChunk, Correction } from '../types';
import { Volume2, Copy, BookOpen, Sparkles, AlertTriangle, CheckCircle2, GitMerge, Clock } from 'lucide-react';

interface ResultDisplayProps {
    result: AnalysisResult;
    compact?: boolean;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, compact = false }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result.englishSentence);
    };

    const speakText = () => {
        // 检查浏览器是否支持 Web Speech API
        if (!('speechSynthesis' in window)) {
            alert('您的浏览器不支持语音合成功能');
            return;
        }

        // 如果正在播放，停止当前播放
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        // 创建新的语音合成实例
        const utterance = new SpeechSynthesisUtterance(result.englishSentence);

        // 配置语音参数
        utterance.lang = 'en-US'; // 英语
        utterance.rate = 0.9; // 语速 (0.1 - 10)
        utterance.pitch = 1; // 音调 (0 - 2)
        utterance.volume = 1; // 音量 (0 - 1)

        // 尝试选择英语语音（如果可用）
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(voice =>
            voice.lang.startsWith('en') && voice.name.includes('English')
        );
        if (englishVoice) {
            utterance.voice = englishVoice;
        }

        // 事件监听
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => {
            setIsSpeaking(false);
            console.error('语音播放出错');
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className={`space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ${compact ? 'pb-4' : ''}`}>

            {/* Grammar Correction Card (Conditional) */}
            {result.correction && !compact && (
                <CorrectionCard correction={result.correction} />
            )}

            {/* Visualization Card */}
            <div className={`bg-white dark:bg-[#0d1117] shadow-xl shadow-gray-200/40 dark:shadow-gray-900/40 border border-gray-100 dark:border-gray-800/60 overflow-hidden relative transition-colors ${compact ? 'rounded-xl md:rounded-2xl' : 'rounded-2xl md:rounded-[2rem]'}`}>

                {/* Header / Controls */}
                <div className={`bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-4 transition-colors ${compact ? 'px-5 py-4' : 'px-8 py-6'}`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xs font-bold text-pink-500 dark:text-pink-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                语法分析结果
                            </h2>
                            <div className={`text-gray-700 dark:text-gray-300 font-medium tracking-wide leading-relaxed ${compact ? 'text-sm' : 'text-lg'}`}>
                                {result.chineseTranslation}
                            </div>

                            {/* Sentence Tags: Pattern & Tense */}
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                                {result.sentencePattern && (
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 text-[10px] sm:text-xs font-bold shadow-xs">
                                        <GitMerge className="w-2.5 h-2.5 sm:w-3 h-3" />
                                        <span>{result.sentencePattern}</span>
                                    </div>
                                )}
                                {result.mainTense && (
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-800 text-teal-700 dark:text-teal-400 text-[10px] sm:text-xs font-bold shadow-xs">
                                        <Clock className="w-2.5 h-2.5 sm:w-3 h-3" />
                                        <span>{result.mainTense}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start md:self-center">
                            <button
                                onClick={speakText}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-medium transition-all text-xs ${isSpeaking ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400 ring-2 ring-pink-200 dark:ring-pink-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/30 hover:text-pink-600 dark:hover:text-pink-400'}`}
                                title="朗读"
                            >
                                <Volume2 className={`w-3 h-3 ${isSpeaking ? 'animate-pulse' : ''}`} />
                                <span>{isSpeaking ? '朗读中...' : '朗读'}</span>
                            </button>
                            {!compact && (
                                <button onClick={copyToClipboard} className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-all" title="复制">
                                    <Copy className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Visualizer (Chunks) */}
                <div className={`flex flex-col justify-center items-center bg-white dark:bg-[#0d1117] transition-colors ${compact ? 'p-6 overflow-x-auto' : 'p-8 md:p-16'}`}>
                    <div className={`flex flex-wrap items-start justify-center leading-none ${compact ? 'gap-x-4 gap-y-8' : 'gap-x-8 gap-y-14'}`}>
                        {result.chunks.map((chunk, index) => (
                            <ChunkColumn key={index} chunk={chunk} compact={compact} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown Table (Lexical Units) */}
            <div className={`bg-white dark:bg-[#0d1117] border border-gray-100 dark:border-gray-800/60 shadow-lg shadow-gray-200/30 dark:shadow-gray-900/30 transition-colors ${compact ? 'rounded-2xl p-4' : 'rounded-[2rem] p-8'}`}>
                <div className={`flex items-center gap-2 sm:gap-3 border-b border-gray-100 dark:border-gray-800/60 ${compact ? 'mb-3 pb-2' : 'mb-6 md:mb-8 pb-4'}`}>
                    <div className={`rounded-xl bg-pink-50 dark:bg-pink-950/50 flex items-center justify-center text-pink-600 dark:text-pink-400 ${compact ? 'w-7 h-7' : 'w-10 h-10'}`}>
                        <BookOpen className={`${compact ? 'w-3.5 h-3.5' : 'w-6 h-6'}`} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-gray-800 dark:text-gray-200 ${compact ? 'text-sm' : 'text-lg md:text-xl'}`}>逐词/意群详解</h3>
                        {!compact && <p className="text-gray-400 dark:text-gray-500 text-xs hidden sm:block">深入理解重点词组与固定搭配</p>}
                    </div>
                </div>

                <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                    {result.detailedTokens.map((token, idx) => (
                        <div key={idx} className="group flex flex-col bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-pink-200 dark:hover:border-pink-700 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-pink-100/20 dark:hover:shadow-pink-900/10 transition-all duration-300 overflow-hidden">
                            {/* Card Header */}
                            <div className={`border-b border-gray-100/50 dark:border-gray-700/50 group-hover:border-pink-50 dark:group-hover:border-pink-900/50 ${compact ? 'p-3' : 'p-5'}`}>
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <span className={`font-serif text-gray-800 dark:text-gray-200 font-medium tracking-tight leading-tight break-words ${compact ? 'text-xl' : 'text-2xl'}`}>{token.text}</span>
                                    <span className="flex-shrink-0 px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider group-hover:bg-pink-100 dark:group-hover:bg-pink-900/50 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                                        {token.partOfSpeech}
                                    </span>
                                </div>
                                <div className={`text-pink-600 dark:text-pink-400 font-bold mt-1 ${compact ? 'text-base' : 'text-base'}`}>
                                    {token.meaning}
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className={`bg-white dark:bg-[#0d1117] flex-grow flex flex-col gap-2 transition-colors ${compact ? 'p-3' : 'p-5'}`}>
                                {!compact && (
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">句法成分</span>
                                    </div>
                                )}
                                <div className="text-xs text-gray-800 dark:text-gray-200 font-medium bg-gray-50 dark:bg-gray-800 inline-block self-start px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-700">
                                    {token.role}
                                </div>

                                <div className={`${compact ? 'mt-1' : 'mt-2'}`}>
                                    {!compact && (
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">解析</span>
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {token.explanation}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ChunkColumn: React.FC<{ chunk: AnalysisChunk; compact: boolean }> = ({ chunk, compact }) => {
    return (
        <div className="flex flex-col items-center text-center group">
            {/* Top: English Text */}
            <div className={`${compact ? 'text-lg sm:text-xl md:text-2xl pb-1.5 mb-2' : 'text-2xl sm:text-3xl md:text-5xl px-2 pb-3 sm:pb-4 mb-3 sm:mb-4'} font-serif text-gray-800 dark:text-gray-200 border-b-[3px] border-pink-100 dark:border-pink-800 group-hover:border-pink-300 dark:group-hover:border-pink-600 transition-colors font-medium tracking-tight`}>
                {chunk.text}
            </div>

            {/* Bottom: Grammar Annotation */}
            <div className="flex flex-col gap-1.5">
                <span className={`${compact ? 'text-xs px-2 py-0.5' : 'text-base px-3 py-1'} font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/50 rounded-lg`}>
                    {chunk.grammarDescription}
                </span>
                <span className={`${compact ? 'text-[10px]' : 'text-sm'} text-gray-400 dark:text-gray-500 font-medium`}>
                    {chunk.role}
                </span>
            </div>
        </div>
    );
};

const CorrectionCard: React.FC<{ correction: Correction }> = ({ correction }) => {
    return (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 rounded-2xl p-5 md:p-6 mb-8 relative overflow-hidden transition-colors">
            {/* Decorative sidebar */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400 dark:bg-amber-500"></div>

            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                {/* Icon Area */}
                <div className="shrink-0">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center ring-4 ring-amber-50 dark:ring-amber-900/30">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-grow space-y-4">
                    <div>
                        <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                            语法自动修正
                            <span className="text-xs font-normal text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">
                                {correction.errorType}
                            </span>
                        </h3>
                        <p className="text-amber-800/80 dark:text-amber-300/80 text-sm mt-1 leading-relaxed">{correction.reason}</p>
                    </div>

                    {/* Diff Display */}
                    <div className="bg-white dark:bg-[#0d1117] rounded-xl p-4 border border-amber-100 dark:border-amber-800/50 shadow-sm transition-colors">
                        <div className="font-serif text-xl leading-relaxed text-gray-800 dark:text-gray-200">
                            {correction.changes.map((change, idx) => {
                                if (change.type === 'remove') {
                                    return (
                                        <span key={idx} className="line-through decoration-red-400/50 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-1 py-0.5 rounded mx-0.5 text-[0.9em]" title="删除">
                                            {change.text}
                                        </span>
                                    );
                                }
                                if (change.type === 'add') {
                                    return (
                                        <span key={idx} className="text-green-700 dark:text-green-400 font-semibold bg-green-100 dark:bg-green-950/50 px-1.5 py-0.5 rounded mx-0.5 border border-green-200/50 dark:border-green-800/50" title="添加">
                                            {change.text}
                                        </span>
                                    );
                                }
                                // Keep
                                return <span key={idx} className="text-gray-700 dark:text-gray-300">{change.text}</span>;
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-amber-700/70 dark:text-amber-400/70">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>下方可视化与详解基于修正后的句子生成</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
