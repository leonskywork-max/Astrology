/**
 * Адаптер Google Gemini под наш LlmClient интерфейс.
 *
 * Использует @google/generative-ai SDK.
 * Бесплатный тир: 1500 req/day для Gemini 2.0 Flash, ~50 req/day для 2.5 Pro.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../utils/config.ts';
import { logger } from '../utils/logger.ts';
import type { GenerateOptions, GenerateResult, LlmClient, ModelTier } from './client.ts';

/**
 * Маппинг наших тиров на конкретные модели Gemini.
 * Меняется в одном месте при апгрейде моделей.
 */
/**
 * Free tier ограничения (на 2026-05):
 * - gemini-2.5-pro: НЕДОСТУПЕН в free tier (limit: 0)
 * - gemini-2.5-flash: 10 req/min, 250 req/day — хорошее качество, наш quality
 * - gemini-2.5-flash-lite: 15 req/min, 1000 req/day — для массовых задач
 *
 * Если в будущем перейдём на paid — обновить quality на 2.5-pro.
 */
const MODEL_BY_TIER: Record<ModelTier, string> = {
  quality: 'gemini-2.5-flash',
  fast: 'gemini-2.5-flash-lite',
};

const DEFAULT_TEMPERATURE: Record<ModelTier, number> = {
  quality: 0.85,
  fast: 0.9,
};

/**
 * ВАЖНО для Gemini 2.5: эти модели имеют thinking-режим,
 * который расходует часть maxOutputTokens на reasoning.
 * Для креативного письма thinking не нужен — отключаем через
 * thinkingConfig.thinkingBudget = 0 ниже.
 *
 * Эти числа = чистый ответ (без thinking budget).
 */
const DEFAULT_MAX_TOKENS: Record<ModelTier, number> = {
  quality: 4000,
  fast: 800,
};

export function createGeminiClient(): LlmClient {
  const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

  return {
    async generate(opts: GenerateOptions): Promise<GenerateResult> {
      const tier: ModelTier = opts.tier ?? 'quality';
      const modelName = MODEL_BY_TIER[tier];
      const temperature = opts.temperature ?? DEFAULT_TEMPERATURE[tier];
      const maxOutputTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS[tier];

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: opts.systemPrompt,
        generationConfig: {
          temperature,
          maxOutputTokens,
          // Отключаем thinking — задача креативная, reasoning не нужен.
          // Это значит весь maxOutputTokens идёт на сам ответ.
          // SDK тип может не знать про thinkingConfig (новое поле) — приводим к any.
          thinkingConfig: { thinkingBudget: 0 },
        } as unknown as Parameters<typeof genAI.getGenerativeModel>[0]['generationConfig'],
      });

      const startedAt = Date.now();
      let lastError: unknown;

      // Простой retry: 3 попытки с backoff
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await model.generateContent(opts.userPrompt);
          const response = result.response;
          const text = response.text();

          const usage = response.usageMetadata ?? {
            promptTokenCount: 0,
            candidatesTokenCount: 0,
            totalTokenCount: 0,
          };

          const elapsedMs = Date.now() - startedAt;
          logger.info(
            {
              provider: 'gemini',
              model: modelName,
              tier,
              inputTokens: usage.promptTokenCount,
              outputTokens: usage.candidatesTokenCount,
              elapsedMs,
              attempt,
            },
            'LLM generation success',
          );

          return {
            text,
            usage: {
              inputTokens: usage.promptTokenCount,
              outputTokens: usage.candidatesTokenCount,
            },
            modelUsed: modelName,
          };
        } catch (err) {
          lastError = err;
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.warn(
            { err: errorMessage, attempt, model: modelName },
            'LLM generation attempt failed',
          );

          // Не ретраим на ошибках валидации/auth (4xx кроме 429)
          if (errorMessage.includes('400') || errorMessage.includes('401') || errorMessage.includes('403')) {
            throw err;
          }

          if (attempt < 3) {
            const backoffMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }

      throw new Error(
        `LLM generation failed after 3 attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      );
    },
  };
}
