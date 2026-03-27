import React, { useEffect, useState } from 'react';
import { AlertCircle, Brain, Key, RotateCcw, Settings2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { getFeatureLlmConfigsService } from '@/services/geminiService';
import type { FeatureLLMConfig, LlmFeatureKey, UserFeatureLLMOverrides } from '@/types';
import {
  MODEL_OPTIONS,
  THINKING_LEVEL_OPTIONS,
  clearStoredApiKey,
  clearStoredLlmOverrides,
  getStoredApiKey,
  getStoredLlmOverrides,
  setStoredApiKey,
  setStoredLlmOverrides
} from '@/utils/llmConfig';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODEL_LABELS: Record<(typeof MODEL_OPTIONS)[number], string> = {
  'gemini-3-flash-preview': 'Gemini 3 Flash',
  'gemini-3.1-flash-lite-preview': 'Gemini 3.1 Flash Lite'
};

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [featureConfigs, setFeatureConfigs] = useState<FeatureLLMConfig[]>([]);
  const [overrides, setOverrides] = useState<UserFeatureLLMOverrides>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setApiKey(getStoredApiKey());
    setOverrides(getStoredLlmOverrides());
    setIsSaved(false);
    setLoadError('');
    setIsLoading(true);

    getFeatureLlmConfigsService()
      .then((response) => {
        setFeatureConfigs(response.features || []);
      })
      .catch((error) => {
        console.error('Failed to load LLM configs:', error);
        setLoadError('模型配置读取失败，当前无法展示后端默认值。');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen]);

  const handleOverrideChange = (feature: LlmFeatureKey, field: 'model' | 'thinking_level', value: string) => {
    setOverrides((current) => {
      const nextFeatureConfig = {
        ...(current[feature] || {}),
        [field]: value
      };

      const next = { ...current };
      const shouldClearModel = !nextFeatureConfig.model || nextFeatureConfig.model === featureConfigs.find((item) => item.feature === feature)?.model;
      const shouldClearThinking =
        !nextFeatureConfig.thinking_level ||
        nextFeatureConfig.thinking_level === featureConfigs.find((item) => item.feature === feature)?.thinking_level;

      if (shouldClearModel) {
        delete nextFeatureConfig.model;
      }

      if (shouldClearThinking) {
        delete nextFeatureConfig.thinking_level;
      }

      if (Object.keys(nextFeatureConfig).length === 0) {
        delete next[feature];
      } else {
        next[feature] = nextFeatureConfig;
      }

      return next;
    });
    setIsSaved(false);
  };

  const handleResetFeature = (feature: LlmFeatureKey) => {
    setOverrides((current) => {
      const next = { ...current };
      delete next[feature];
      return next;
    });
    setIsSaved(false);
  };

  const handleSave = () => {
    setStoredApiKey(apiKey);
    setStoredLlmOverrides(overrides);
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleResetAll = () => {
    clearStoredApiKey();
    clearStoredLlmOverrides();
    setApiKey('');
    setOverrides({});
    setIsSaved(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-[min(92vh,920px)] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl dark:bg-[#13151a]">
        <div className="flex items-center justify-between border-b border-black/5 bg-[linear-gradient(135deg,#f8fafc_0%,#fff7ed_60%,#f3f4f6_100%)] px-5 py-4 dark:border-white/5 dark:bg-[linear-gradient(135deg,#171923_0%,#111827_55%,#1f2937_100%)]">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
              <Settings2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-black tracking-[-0.04em] text-gray-950 dark:text-white">API 与模型设置</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
                所有功能都可以分别选择模型和思考等级。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-white/70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-4">
            <section className="rounded-3xl border border-black/5 bg-[#f8fafc] p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-white/70">
                <Key className="h-4 w-4" />
                Gemini API Key
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="在此输入您的 Gemini API Key..."
                className="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-mono outline-none transition focus:border-black focus:ring-2 focus:ring-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/30 dark:focus:ring-white/10"
              />
              <p className="mt-3 flex items-center gap-1 text-[11px] leading-relaxed text-gray-500 dark:text-white/45">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                Key 与模型覆盖都只保存在当前浏览器的 localStorage，不写入服务器数据库。
              </p>
            </section>

            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-500/10">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                <div className="space-y-2 text-xs leading-5 text-amber-900 dark:text-amber-100">
                  <p>如果您不填写 Key，系统会尝试使用公共演示 Key，但可能受到限额影响。</p>
                  <p>修改模型后，请优先使用您自己的 Key，否则高配模型可能更容易触发失败或限流。</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-black/5 bg-[#f8fafc] p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
                <Sparkles className="h-4 w-4" />
                Thinking Level 说明
              </div>
              <div className="mt-3 space-y-2 text-xs leading-5 text-gray-600 dark:text-white/60">
                <p><span className="font-semibold text-gray-900 dark:text-white">default</span> 让模型自行决定。</p>
                <p><span className="font-semibold text-gray-900 dark:text-white">minimal</span> 最快，适合翻译和极速查词。</p>
                <p><span className="font-semibold text-gray-900 dark:text-white">low / medium / high</span> 推理更深，但更慢、更贵。</p>
              </div>
            </section>

            <section className="rounded-3xl border border-black/5 bg-white p-4 dark:border-white/5 dark:bg-white/[0.02]">
              <div className="flex flex-col gap-3 border-b border-black/5 pb-4 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Brain className="h-4 w-4" />
                    功能级 LLM 配置
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-white/45">
                    每个功能都可以单独选择固定模型和 thinking level。
                  </p>
                </div>
                <button
                  onClick={handleResetAll}
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  恢复默认
                </button>
              </div>

              <div className="mt-4">
                {isLoading ? (
                  <div className="rounded-2xl border border-dashed border-black/10 px-6 py-10 text-center text-sm text-gray-500 dark:border-white/10 dark:text-white/45">
                    正在读取后端默认 LLM 配置...
                  </div>
                ) : loadError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {loadError}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {featureConfigs.map((featureConfig) => {
                      const override = overrides[featureConfig.feature] || {};
                      const selectedModel = override.model || featureConfig.model;
                      const selectedThinkingLevel = override.thinking_level || featureConfig.thinking_level;
                      const hasOverride = Boolean(override.model || override.thinking_level);

                      return (
                        <div
                          key={featureConfig.feature}
                          className="rounded-3xl border border-black/5 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)]"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-black tracking-[-0.03em] text-gray-950 dark:text-white">{featureConfig.label}</h4>
                                {hasOverride ? (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                    已自定义
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500 dark:bg-white/5 dark:text-white/40">
                                    跟随后端默认
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-white/60">{featureConfig.description}</p>
                              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                                <div className="rounded-2xl border border-black/5 bg-white/80 px-3 py-2 dark:border-white/5 dark:bg-black/10">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-white/30">默认配置</p>
                                  <p className="mt-1 font-mono text-[13px] text-gray-900 dark:text-white">{featureConfig.model}</p>
                                  <p className="mt-1 text-gray-500 dark:text-white/45">thinking: {featureConfig.thinking_level}</p>
                                </div>
                                <div className="rounded-2xl border border-black/5 bg-[#fff7ed] px-3 py-2 dark:border-white/5 dark:bg-[#1b1610]">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-300">当前生效</p>
                                  <p className="mt-1 font-mono text-[13px] text-gray-900 dark:text-white">{selectedModel}</p>
                                  <p className="mt-1 text-gray-500 dark:text-white/45">thinking: {selectedThinkingLevel}</p>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleResetFeature(featureConfig.feature)}
                              disabled={!hasOverride}
                              className="inline-flex items-center gap-2 self-start rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              重置此项
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <label className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-white/35">
                                模型
                              </span>
                              <select
                                value={selectedModel}
                                onChange={(e) => handleOverrideChange(featureConfig.feature, 'model', e.target.value)}
                                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/30 dark:focus:ring-white/10"
                              >
                                {MODEL_OPTIONS.map((model) => (
                                  <option key={model} value={model}>
                                    {MODEL_LABELS[model]} ({model})
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-white/35">
                                Thinking Level
                              </span>
                              <select
                                value={selectedThinkingLevel}
                                onChange={(e) => handleOverrideChange(featureConfig.feature, 'thinking_level', e.target.value)}
                                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/5 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/30 dark:focus:ring-white/10"
                              >
                                {THINKING_LEVEL_OPTIONS.map((level) => (
                                  <option key={level} value={level}>
                                    {level}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="flex gap-3 border-t border-black/5 bg-[#f8fafc] px-4 py-4 dark:border-white/5 dark:bg-white/[0.02] sm:px-5">
          <button
            onClick={handleResetAll}
            className="rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/5"
          >
            清空 Key 与自定义配置
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition ${
              isSaved ? 'bg-emerald-500 text-white' : 'bg-black text-white hover:opacity-90 dark:bg-white dark:text-black'
            }`}
          >
            {isSaved ? '已保存' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
};
