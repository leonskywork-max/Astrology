/**
 * Генерация гороскопа дня по солнечному знаку.
 * Использует prompts/horoscope_day.md + TONE.md.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { getLlmClient } from './client.ts';
import { logger } from '../utils/logger.ts';
import type { CurrentSky } from '../astro/transits.ts';
import { ZODIAC_SIGNS_RU, type ZodiacSign } from '../astro/zodiac.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');

let cachedSystemPrompt: string | null = null;

async function loadSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  const [tone, prompt] = await Promise.all([
    readFile(resolve(PROJECT_ROOT, 'prompts/TONE.md'), 'utf-8'),
    readFile(resolve(PROJECT_ROOT, 'prompts/horoscope_day.md'), 'utf-8'),
  ]);
  cachedSystemPrompt = `# TONE.md\n\n${tone}\n\n---\n\n# horoscope_day.md\n\n${prompt}`;
  return cachedSystemPrompt;
}

export interface GenerateHoroscopeInput {
  sunSign: ZodiacSign;
  sky: CurrentSky;
  date?: Date;
  userName?: string;
  userGender?: 'female' | 'male' | 'neutral';
}

export async function generateDailyHoroscope(
  input: GenerateHoroscopeInput,
): Promise<string> {
  const systemPrompt = await loadSystemPrompt();
  const client = await getLlmClient();

  const date = input.date ?? new Date();
  const dateStr = date.toISOString().slice(0, 10);

  const userPrompt = buildUserPrompt(input, dateStr);

  logger.info(
    { sunSign: input.sunSign, date: dateStr },
    'Generating daily horoscope',
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
      sunSign: input.sunSign,
      length: result.text.length,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
    'Horoscope generated',
  );

  return result.text;
}

function buildUserPrompt(input: GenerateHoroscopeInput, dateStr: string): string {
  const { sunSign, sky, userName, userGender = 'female' } = input;
  const signRu = ZODIAC_SIGNS_RU[sunSign];

  const lines: string[] = [];
  lines.push(`Гороскоп дня для пользователя астробота Numen.`);
  lines.push('');
  lines.push(`Сегодня: ${dateStr}`);
  lines.push(`Солнечный знак: ${signRu} (${sunSign})`);
  if (userName) lines.push(`Имя: ${userName}`);
  lines.push(`Пол: ${userGender}`);
  lines.push('');
  lines.push('Астропогода:');
  lines.push(
    `- Луна в ${ZODIAC_SIGNS_RU[sky.moon.sign]} (${sky.moon.degree.toFixed(1)}°)`,
  );
  lines.push(
    `- Меркурий в ${ZODIAC_SIGNS_RU[sky.mercury.sign]}${sky.mercury.retrograde ? ' (ретроградный)' : ''}`,
  );
  lines.push(
    `- Венера в ${ZODIAC_SIGNS_RU[sky.venus.sign]}${sky.venus.retrograde ? ' (ретроградная)' : ''}`,
  );
  lines.push(
    `- Марс в ${ZODIAC_SIGNS_RU[sky.mars.sign]}${sky.mars.retrograde ? ' (ретроградный)' : ''}`,
  );
  lines.push(
    `- Юпитер в ${ZODIAC_SIGNS_RU[sky.jupiter.sign]}${sky.jupiter.retrograde ? ' (ретроградный)' : ''}`,
  );
  lines.push(
    `- Сатурн в ${ZODIAC_SIGNS_RU[sky.saturn.sign]}${sky.saturn.retrograde ? ' (ретроградный)' : ''}`,
  );
  if (sky.retrogrades.length > 0) {
    lines.push(`Ретрограды сегодня: ${sky.retrogrades.join(', ')}`);
  }
  lines.push('');
  lines.push('Напиши гороскоп по структуре из системного промпта.');
  lines.push('');
  lines.push('КРИТИЧНО:');
  lines.push(`- Согласуй ВСЕ глаголы и прилагательные с полом ${userGender}.`);
  lines.push(`  Для female: «ты сделала», «ты сама», «уверенной».`);
  lines.push(`  Для male: «ты сделал», «ты сам», «уверенным».`);
  lines.push('- Длина строго 400-700 знаков.');
  lines.push('- Без эмодзи, без эзо-клише.');

  return lines.join('\n');
}
