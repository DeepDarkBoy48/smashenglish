
import React, { useState, useRef } from 'react';
import { Search, Volume2, Book, Loader2, AlertCircle, BarChart3, Sparkles, Link2 } from 'lucide-react';
import type { DictionaryResult } from '../types';
import { lookupWordService } from '../services/geminiService';

// 预设的默认单词数据
const DEFAULT_WORD_DATA: DictionaryResult = {
    word: "take",
    phonetic: "/teɪk/",
    entries: [
        {
            partOfSpeech: "verb",
            cocaFrequency: "Top 100",
            definitions: [
                {
                    meaning: "to carry or move something or someone from one place to another",
                    explanation: "将某物或某人从一个地方带到另一个地方",
                    example: "Remember to take your umbrella with you, as it might rain later.",
                    exampleTranslation: "记得带上你的伞，稍后可能会下雨。"
                },
                {
                    meaning: "to get or obtain something",
                    explanation: "得到或获取某物",
                    example: "You need to take responsibility for your actions.",
                    exampleTranslation: "你需要为自己的行为负责。"
                },
                {
                    meaning: "to remove something or someone from a place",
                    explanation: "将某物或某人从一个地方移走",
                    example: "Please take your feet off the table.",
                    exampleTranslation: "请把你的脚从桌子上拿开。"
                },
                {
                    meaning: "to accept or agree to something",
                    explanation: "接受或同意某事",
                    example: "The company decided to take a chance on the innovative startup.",
                    exampleTranslation: "公司决定给这家创新型初创企业一个机会。"
                }
            ]
        },
        {
            partOfSpeech: "noun",
            cocaFrequency: "Rank 2382",
            definitions: [
                {
                    meaning: "the amount of money taken by a business from selling goods or services",
                    explanation: "企业通过销售商品或服务所获得的收入",
                    example: "The weekend's take was significantly higher than expected.",
                    exampleTranslation: "周末的收入远高于预期。"
                },
                {
                    meaning: "a scene or part of a film or television show that is recorded at one time",
                    explanation: "电影或电视节目中一次性录制的一个场景或部分",
                    example: "That was the fifth take of the same scene, but we finally got it right.",
                    exampleTranslation: "那是同一个场景的第五次拍摄，但我们终于拍对了。"
                }
            ]
        }
    ],
    collocations: [
        {
            phrase: "take into account",
            meaning: "to consider something when making a decision or judgment",
            example: "When planning your budget, remember to take into account unexpected expenses.",
            exampleTranslation: "在制定预算时，请记住将意外开支考虑在内。"
        },
        {
            phrase: "take part in",
            meaning: "to participate in an activity or event",
            example: "Many students decided to take part in the volunteer program.",
            exampleTranslation: "许多学生决定参加这个志愿项目。"
        },
        {
            phrase: "take advantage of",
            meaning: "to make good use of the opportunities that you have",
            example: "You should take advantage of the free workshops offered by the university.",
            exampleTranslation: "你应该好好利用大学提供的免费研讨会。"
        },
        {
            phrase: "take up",
            meaning: "to begin a new hobby, sport, or activity",
            example: "She decided to take up yoga to improve her flexibility.",
            exampleTranslation: "她决定开始练习瑜伽以提高她的柔韧性。"
        },
        {
            phrase: "take off",
            meaning: "to leave the ground (for an aircraft); to suddenly become successful",
            example: "The plane is scheduled to take off in thirty minutes. / Her new business really took off last year.",
            exampleTranslation: "飞机预定在三十分钟后起飞。/ 她的新业务去年发展非常迅速。"
        }
    ]
};

interface DictionaryPageProps {
    initialResult?: DictionaryResult | null;
    onResultChange?: (result: DictionaryResult | null) => void;
}

export const DictionaryPage: React.FC<DictionaryPageProps> = ({ initialResult, onResultChange }) => {
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [localResult, setLocalResult] = useState<DictionaryResult | null>(initialResult ?? DEFAULT_WORD_DATA);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await lookupWordService(query);
            setLocalResult(data);
            onResultChange?.(data);
        } catch (err: any) {
            setError(err.message || "查询失败，请稍后再试。");
        } finally {
            setIsLoading(false);
        }
    };

    const speakText = (text: string) => {
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
        const utterance = new SpeechSynthesisUtterance(text);

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

    const result = localResult;

    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in pb-12">
            {/* Compact Header */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mb-4">
                <h1 className="flex items-center gap-2 text-lg md:text-xl font-bold text-gray-900 dark:text-gray-50 font-serif">
                    <Book className="w-4 h-4 md:w-5 md:h-5 text-pink-500" />
                    AI 智能词典
                </h1>
                <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500">
                    深度解析单词含义、词性搭配及地道例句
                </p>
            </div>

            {/* Search Box */}
            <div className="max-w-xl mb-6">
                <form onSubmit={handleSearch} className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="输入单词或词组 (例如: take up, resilience)"
                        className="w-full pl-5 pr-14 py-3 text-base rounded-2xl bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 focus:border-pink-400 dark:focus:border-pink-500 focus:ring-4 focus:ring-pink-50 dark:focus:ring-pink-900/50 transition-all outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="absolute right-2 top-2 bottom-2 px-4 bg-pink-600 dark:bg-pink-600 text-white rounded-xl hover:bg-pink-700 dark:hover:bg-pink-500 disabled:opacity-50 transition-colors flex items-center justify-center"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </button>
                </form>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 max-w-xl mx-auto mb-8">
                    <AlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                </div>
            )}

            {!result && !isLoading && !error && (
                <div className="text-center py-12 opacity-40 flex flex-col items-center">
                    <Book className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
                    <p>输入单词开始查询</p>
                </div>
            )}

            {/* Result Display */}
            {result && !isLoading && (
                <div className="bg-white dark:bg-[#0d1117] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800 transition-colors">
                        <div className="flex items-baseline gap-3 min-w-0">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50 font-serif tracking-tight truncate">{result.word}</h2>
                            <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">{result.phonetic}</span>
                        </div>
                        <button
                            onClick={() => speakText(result.word)}
                            className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center transition-colors ${isSpeaking ? 'bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400' : 'text-gray-400 dark:text-gray-500 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            title="播放发音"
                        >
                            {isSpeaking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                    </div>

                    {/* Entries */}
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {result.entries.map((entry, idx) => (
                            <div key={idx} className="px-5 py-4 group">

                                {/* Entry Header Row */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                        {entry.partOfSpeech}
                                    </span>

                                    {entry.cocaFrequency && (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-md border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <BarChart3 className="w-3 h-3" />
                                            {entry.cocaFrequency}
                                        </span>
                                    )}
                                </div>

                                {/* Definitions List */}
                                <ol className="space-y-4">
                                    {entry.definitions.map((def, dIdx) => (
                                        <li key={dIdx} className="grid grid-cols-[auto_1fr] gap-3">
                                            <span className="w-5 pt-px text-right text-sm font-medium text-gray-300 dark:text-gray-600 select-none">{dIdx + 1}.</span>

                                            <div className="min-w-0">
                                                {/* Meaning & Explanation */}
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">{def.meaning}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug mt-0.5">
                                                    {def.explanation}
                                                </p>

                                                {/* Example (left-border quote) */}
                                                <div className="mt-2 py-0.5 pl-3 border-l-2 border-gray-200 dark:border-gray-700 group-hover:border-pink-200 dark:group-hover:border-pink-800 transition-colors">
                                                    <p className="font-serif text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                        {def.example}
                                                    </p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-start gap-1.5">
                                                        <Sparkles className="w-3 h-3 mt-0.5 text-pink-400 shrink-0" />
                                                        {def.exampleTranslation}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        ))}
                    </div>

                    {/* Collocations Section */}
                    {result.collocations && result.collocations.length > 0 && (
                        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 transition-colors">
                            <div className="flex items-baseline gap-2 mb-3">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    <Link2 className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                                    常用搭配
                                </h3>
                                <span className="text-xs text-gray-400 dark:text-gray-500">地道表达与固定用法</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {result.collocations.map((col, idx) => (
                                    <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2.5 hover:border-violet-300 dark:hover:border-violet-700 transition-colors group">
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">{col.phrase}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{col.meaning}</span>
                                        </div>
                                        <p className="font-serif text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                                            "{col.example}"
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                            {col.exampleTranslation}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
