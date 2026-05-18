import Anthropic from '@anthropic-ai/sdk';
import { config, features } from '../utils/config.ts';

let cached: Anthropic | null = null;

/**
 * Возвращает Anthropic client. Создаётся лениво, чтобы при отсутствии
 * ANTHROPIC_API_KEY (а это норма на dev-машине Леона — см. правило проекта)
 * импорт не падал. Реальные LLM-вызовы должны быть только в production-окружении.
 */
export function getClaude(): Anthropic {
  if (!features.anthropic) {
    throw new Error(
      'ANTHROPIC_API_KEY не задан. На dev-машине это правило ' +
        '(см. feedback_anthropic_api_key_must_be_unset в auto-memory). ' +
        'LLM-вызовы запускать только на production.',
    );
  }
  if (!cached) {
    cached = new Anthropic({ apiKey: config.anthropic.apiKey });
  }
  return cached;
}

export const CLAUDE_MODELS = {
  /** Качественные задачи: натальный портрет, синастрия, лонгриды */
  quality: 'claude-sonnet-4-6',
  /** Массовые задачи: дневные push, гороскопы знаков */
  fast: 'claude-haiku-4-5-20251001',
} as const;

export type ClaudeModel = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS];
