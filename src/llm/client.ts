/**
 * Абстракция над LLM-провайдером.
 *
 * Один интерфейс для бизнес-логики, под капотом можно подключать
 * Gemini, Anthropic, OpenAI-compatible (Ollama, OpenRouter, DeepSeek).
 *
 * Текущая стратегия:
 * - Dev и production: Gemini (бесплатный тир хватает на старт)
 * - Anthropic как fallback если Gemini не справляется с тоном
 * - В будущем при необходимости — OpenAI-compatible через адаптер
 *
 * Переключение через env LLM_PROVIDER без правки бизнес-кода.
 */

import { config, features } from '../utils/config.ts';
import { logger } from '../utils/logger.ts';

export type ModelTier = 'quality' | 'fast';

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  /** Качество (Sonnet/Pro) или скорость (Haiku/Flash) */
  tier?: ModelTier;
  /** 0..1, выше = вариативнее. Default 0.85 для качества, 0.9 для массовых */
  temperature?: number;
  /** Максимум токенов в ответе. Default 2000 для quality, 400 для fast */
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  modelUsed: string;
}

export interface LlmClient {
  generate(opts: GenerateOptions): Promise<GenerateResult>;
}

let cached: LlmClient | null = null;

/**
 * Возвращает текущий LLM-клиент. Создаётся лениво.
 * Падает с осмысленной ошибкой, если ни один провайдер не настроен.
 */
export async function getLlmClient(): Promise<LlmClient> {
  if (cached) return cached;

  if (config.llm.provider === 'gemini') {
    if (!features.gemini) {
      throw new Error(
        'GEMINI_API_KEY не задан. Получи ключ на https://aistudio.google.com/app/apikey и положи в .env',
      );
    }
    const { createGeminiClient } = await import('./gemini.ts');
    cached = createGeminiClient();
    logger.info({ provider: 'gemini' }, 'LLM client initialized');
    return cached;
  }

  if (config.llm.provider === 'anthropic') {
    if (!features.anthropic) {
      throw new Error('ANTHROPIC_API_KEY не задан');
    }
    throw new Error(
      'Anthropic adapter не реализован. Сейчас используется Gemini. Поменяй LLM_PROVIDER=gemini в .env',
    );
  }

  throw new Error(`Unknown LLM_PROVIDER: ${config.llm.provider}`);
}

/**
 * Сбросить кеш. Используется в тестах или если меняем провайдера в рантайме.
 */
export function resetLlmClient(): void {
  cached = null;
}
