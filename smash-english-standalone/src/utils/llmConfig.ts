import type { ThinkingLevel, UserFeatureLLMOverrides } from '@/types';

export const API_KEY_STORAGE_KEY = 'smash_gemini_api_key';
export const LLM_OVERRIDES_STORAGE_KEY = 'smash_gemini_llm_overrides';

export const THINKING_LEVEL_OPTIONS: ThinkingLevel[] = ['default', 'minimal', 'low', 'medium', 'high'];
export const MODEL_OPTIONS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview'
] as const;

const VALID_MODELS = new Set<string>(MODEL_OPTIONS);

export const normalizeThinkingLevel = (value: string | null | undefined): ThinkingLevel => {
  const normalized = String(value || 'minimal').trim().toLowerCase();
  if (THINKING_LEVEL_OPTIONS.includes(normalized as ThinkingLevel)) {
    return normalized as ThinkingLevel;
  }
  return 'minimal';
};

export const getStoredApiKey = (): string => localStorage.getItem(API_KEY_STORAGE_KEY) || '';

export const setStoredApiKey = (apiKey: string) => {
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
};

export const clearStoredApiKey = () => {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
};

export const getStoredLlmOverrides = (): UserFeatureLLMOverrides => {
  const raw = localStorage.getItem(LLM_OVERRIDES_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([feature, config]) => {
        if (!config || typeof config !== 'object' || Array.isArray(config)) {
          return [];
        }

        const typedConfig = config as { model?: unknown; thinking_level?: unknown };

        const model = typeof typedConfig.model === 'string' ? typedConfig.model.trim() : '';
        const thinking_level = typedConfig.thinking_level ? normalizeThinkingLevel(String(typedConfig.thinking_level)) : undefined;
        const cleanedConfig = {
          ...(model && VALID_MODELS.has(model) ? { model } : {}),
          ...(thinking_level ? { thinking_level } : {})
        };

        return Object.keys(cleanedConfig).length > 0 ? [[feature, cleanedConfig]] : [];
      })
    ) as UserFeatureLLMOverrides;
  } catch {
    return {};
  }
};

export const setStoredLlmOverrides = (overrides: UserFeatureLLMOverrides) => {
  const cleaned = Object.fromEntries(
    Object.entries(overrides).flatMap(([feature, config]) => {
      if (!config) return [];
      const model = typeof config.model === 'string' ? config.model.trim() : '';
      const thinking_level = config.thinking_level ? normalizeThinkingLevel(config.thinking_level) : undefined;
      const nextConfig = {
        ...(model && VALID_MODELS.has(model) ? { model } : {}),
        ...(thinking_level ? { thinking_level } : {})
      };

      return Object.keys(nextConfig).length > 0 ? [[feature, nextConfig]] : [];
    })
  );

  if (Object.keys(cleaned).length === 0) {
    localStorage.removeItem(LLM_OVERRIDES_STORAGE_KEY);
    return;
  }

  localStorage.setItem(LLM_OVERRIDES_STORAGE_KEY, JSON.stringify(cleaned));
};

export const clearStoredLlmOverrides = () => {
  localStorage.removeItem(LLM_OVERRIDES_STORAGE_KEY);
};
