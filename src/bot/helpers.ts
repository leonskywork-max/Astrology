/**
 * Общие хэлперы для bot-хэндлеров.
 */

import type { Context } from 'telegraf';

/**
 * Экранирует HTML-спецсимволы. Используется чтобы LLM-выдача безопасно
 * легла в Telegram HTML без поломок тегов.
 *
 * Telegram HTML понимает только конкретный набор тегов (b, i, code, и т.д.),
 * остальное должно быть escaped.
 */
export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Делит длинный текст по абзацам на N примерно равных групп.
 * Сохраняет логическую целостность (абзацы не режутся).
 */
export function splitIntoChunks(text: string, n: number): string[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= n) return paragraphs;

  const perChunk = Math.ceil(paragraphs.length / n);
  const chunks: string[] = [];
  for (let i = 0; i < paragraphs.length; i += perChunk) {
    chunks.push(paragraphs.slice(i, i + perChunk).join('\n\n'));
  }
  return chunks;
}

/**
 * Отправляет длинный текст HTML несколькими сообщениями с typing-эффектом
 * и паузой между ними. Первое сообщение может иметь префикс-заголовок.
 */
export async function sendInChunks(
  ctx: Context,
  text: string,
  opts: { chunks?: number; firstPrefix?: string; pauseMs?: number } = {},
): Promise<void> {
  const { chunks = 3, firstPrefix, pauseMs = 5_000 } = opts;
  const parts = splitIntoChunks(text, chunks);

  for (let i = 0; i < parts.length; i++) {
    const prefix = i === 0 && firstPrefix ? `<b>${escapeHtml(firstPrefix)}</b>\n\n` : '';
    await ctx.replyWithHTML(prefix + escapeHtml(parts[i]!));

    if (i < parts.length - 1) {
      await ctx.sendChatAction('typing');
      await sleep(pauseMs);
    }
  }
}
