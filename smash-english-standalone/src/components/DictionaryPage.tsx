
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
            <div className="text-center space-y-4 mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-50 font-serif">
                    AI 智能词典
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    深度解析单词含义、词性搭配及地道例句
                </p>
            </div>

            {/* Search Box */}
            <div className="max-w-xl mx-auto mb-12">
                <form onSubmit={handleSearch} className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="输入单词或词组 (例如: take up, resilience)"
                        className="w-full pl-5 pr-14 py-4 text-lg rounded-2xl bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 focus:border-pink-400 dark:focus:border-pink-500 focus:ring-4 focus:ring-pink-50 dark:focus:ring-pink-900/50 transition-all outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                <div className="bg-white dark:bg-[#0d1117] rounded-[2rem] shadow-xl shadow-gray-200/40 dark:shadow-gray-900/40 border border-gray-100 dark:border-gray-800/60 overflow-hidden transition-colors">
                    {/* Header */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
                        <div>
                            <h2 className="text-5xl font-bold text-gray-900 dark:text-gray-50 font-serif tracking-tight leading-none mb-3">{result.word}</h2>
                            <div className="text-xl text-gray-500 dark:text-gray-400 font-sans flex items-center gap-2 font-medium">
                                <span>{result.phonetic}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => speakText(result.word)}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm ${isSpeaking ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400 ring-4 ring-pink-50 dark:ring-pink-900/30' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-md'}`}
                            title="播放发音"
                        >
                            {isSpeaking ? <Loader2 className="w-6 h-6 animate-spin" /> : <Volume2 className="w-7 h-7" />}
                        </button>
                    </div>

                    {/* Entries */}
                    <div className="p-6 md:p-10 space-y-12">
                        {result.entries.map((entry, idx) => (
                            <div key={idx} className="group">

                                {/* Entry Header Row (New Layout) */}
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="bg-[#0d1117] dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-md shadow-gray-200 dark:shadow-gray-900">
                                        {entry.partOfSpeech}
                                    </span>

                                    {entry.cocaFrequency && (
                                        <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                                            <BarChart3 className="w-3.5 h-3.5" />
                                            {entry.cocaFrequency}
                                        </span>
                                    )}

                                    <div className="h-px bg-gray-100 dark:bg-gray-700 flex-grow ml-2"></div>
                                </div>

                                {/* Definitions List */}
                                <div className="space-y-8 pl-1 md:pl-2">
                                    {entry.definitions.map((def, dIdx) => (
                                        <div key={dIdx} className="relative grid grid-cols-[auto_1fr] gap-4">
                                            {/* Index Number */}
                                            <div className="flex justify-center pt-1">
                                                <span className="text-gray-300 dark:text-gray-600 font-bold text-lg font-serif select-none">{dIdx + 1}.</span>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                {/* Meaning & Explanation */}
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1 leading-snug">{def.meaning}</h3>
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                                        {def.explanation}
                                                    </p>
                                                </div>

                                                {/* Example Box */}
                                                <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700 group-hover/def hover:border-pink-100 dark:hover:border-pink-800 hover:bg-pink-50/30 dark:hover:bg-pink-950/20 transition-colors">
                                                    <p className="font-serif text-lg text-gray-800 dark:text-gray-200 mb-2 leading-relaxed">
                                                        {def.example}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-2">
                                                        <Sparkles className="w-3.5 h-3.5 mt-0.5 text-pink-400 shrink-0" />
                                                        {def.exampleTranslation}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Collocations Section */}
                    {result.collocations && result.collocations.length > 0 && (
                        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30 p-6 md:p-10 transition-colors">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center ring-4 ring-violet-50 dark:ring-violet-900/30">
                                    <Link2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">常用搭配 & 习惯用语</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">掌握地道表达与固定用法</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {result.collocations.map((col, idx) => (
                                    <div key={idx} className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-violet-200 dark:hover:border-violet-700 hover:shadow-lg hover:shadow-violet-100/20 dark:hover:shadow-violet-900/10 transition-all group">
                                        <div className="flex flex-col gap-1 mb-3">
                                            <span className="font-bold text-lg text-gray-800 dark:text-gray-200 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">{col.phrase}</span>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{col.meaning}</span>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700 group-hover:bg-violet-50/30 dark:group-hover:bg-violet-950/20 group-hover:border-violet-100 dark:group-hover:border-violet-800 transition-colors">
                                            <p className="font-serif text-gray-700 dark:text-gray-300 text-sm mb-1.5 leading-relaxed">
                                                "{col.example}"
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                {col.exampleTranslation}
                                            </p>
                                        </div>
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
