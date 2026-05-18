import Anthropic from '@anthropic-ai/sdk';
import { config } from '../utils/config.ts';

export const claude = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

export const CLAUDE_MODELS = {
  /** Качественные задачи: натальный портрет, синастрия, лонгриды */
  quality: 'claude-sonnet-4-6',
  /** Массовые задачи: дневные push, гороскопы знаков */
  fast: 'claude-haiku-4-5-20251001',
} as const;

export type ClaudeModel = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS];
