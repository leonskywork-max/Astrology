/**
 * Генерация интерпретации карты Таро дня через LLM.
 * Использует prompts/tarot_day.md как системный промпт + TONE.md для голоса.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { getLlmClient } from './client.ts';
import { logger } from '../utils/logger.ts';
import type { TarotDraw } from '../astro/tarot.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');

let cachedSystemPrompt: string | null = null;

async function loadSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) return cachedSystemPrompt;

  const [tone, tarotPrompt] = await Promise.all([
    readFile(resolve(PROJECT_ROOT, 'prompts/TONE.md'), 'utf-8'),
    readFile(resolve(PROJECT_ROOT, 'prompts/tarot_day.md'), 'utf-8'),
  ]);

  cachedSystemPrompt = `# TONE.md (главный документ голоса)\n\n${tone}\n\n---\n\n# tarot_day.md (системный промпт карты Таро дня)\n\n${tarotPrompt}`;
  return cachedSystemPrompt;
}

export interface GenerateTarotInput {
  draw: TarotDraw;
  userName?: string;
  userGender?: 'female' | 'male' | 'neutral';
  date?: Date;
}

export async function generateTarotInterpretation(
  input: GenerateTarotInput,
): Promise<string> {
  const systemPrompt = await loadSystemPrompt();
  const client = await getLlmClient();

  const date = input.date ?? new Date();
  const dateStr = date.toISOString().slice(0, 10);

  const userPrompt = buildUserPrompt(input, dateStr);

  logger.info(
    { card: input.draw.card.id, reversed: input.draw.reversed, userName: input.userName },
    'Generating tarot interpretation',
  );

  const result = await client.generate({
    systemPrompt,
    userPrompt,
    tier: 'fast',
    temperature: 0.85,
    maxTokens: 800,
  });

  logger.info(
    {
      portraitLength: result.text.length,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      model: result.modelUsed,
    },
    'Tarot interpretation generated',
  );

  return result.text;
}

function buildUserPrompt(input: GenerateTarotInput, dateStr: string): string {
  const { draw, userName, userGender = 'female' } = input;
  const position = draw.reversed ? 'перевёрнутая' : 'прямая';

  const lines: string[] = [];
  lines.push(`Карта дня для пользователя астробота Numen.`);
  lines.push('');
  lines.push(`Сегодня: ${dateStr}`);
  if (userName) lines.push(`Имя пользователя: ${userName}`);
  lines.push(`Пол пользователя: ${userGender}`);
  lines.push('');
  lines.push(`Карта: ${draw.card.nameRu} (${draw.card.nameEn})`);
  lines.push(`Положение: ${position}`);
  lines.push('');
  lines.push('Напиши интерпретацию по структуре из системного промпта.');
  lines.push('');
  lines.push('КРИТИЧНО:');
  lines.push(`- Согласуй ВСЕ глаголы и прилагательные с полом ${userGender}.`);
  lines.push(
    '  Для female: «ты сделала», «ты сама», «была», «уверенной».',
  );
  lines.push('  Для male: «ты сделал», «ты сам», «был», «уверенным».');
  lines.push(
    '  Для neutral: избегай прошедшего времени и прилагательных в личной форме.',
  );
  if (draw.reversed) {
    lines.push('- Карта ПЕРЕВЁРНУТАЯ — обязательно отрази инверсию смысла.');
  }
  lines.push('- Длина строго 300-600 знаков.');
  lines.push('- Без эмодзи, без эзо-клише, без приговоров.');

  return lines.join('\n');
}
