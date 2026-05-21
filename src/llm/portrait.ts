/**
 * Генерация полноценного натального портрета через LLM.
 *
 * Собирает контекст:
 * - System: prompts/TONE.md (главный гайд голоса)
 * - System: prompts/natal_portrait.md (структура и требования)
 * - System: выжимки из knowledge/astrology/ для планет/знаков из карты
 * - User: данные карты конкретного юзера + имя + пол
 *
 * Возвращает текст портрета в Олеся-тоне с объяснением каждого термина.
 * Сохранение в БД — отвечает caller (saveChartPortrait в onboarding).
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { NatalChart } from '../astro/chart.ts';
import { ZODIAC_SIGNS_RU } from '../astro/zodiac.ts';
import { formatPosition } from '../astro/zodiac.ts';
import { getLlmClient } from './client.ts';
import { logger } from '../utils/logger.ts';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

let cachedSystemPrompt: string | null = null;

/**
 * Загрузка TONE.md + natal_portrait.md один раз и сборка системного промпта.
 * Кешируется на всю жизнь процесса — файлы не меняются в рантайме.
 */
async function loadSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) return cachedSystemPrompt;

  const tone = await readFile(join(PROJECT_ROOT, 'prompts', 'TONE.md'), 'utf-8');
  const portraitPrompt = await readFile(
    join(PROJECT_ROOT, 'prompts', 'natal_portrait.md'),
    'utf-8',
  );

  cachedSystemPrompt = [
    '# Тон Numen (главный гайд голоса)',
    '',
    tone,
    '',
    '---',
    '',
    '# Инструкция: натальный портрет',
    '',
    portraitPrompt,
  ].join('\n');

  return cachedSystemPrompt;
}

export interface GeneratePortraitOptions {
  chart: NatalChart;
  /** Имя пользователя для обращения (опц.). Если есть — используем по тексту */
  userName?: string;
  /** Пол для согласования глаголов и прилагательных */
  userGender?: 'female' | 'male' | 'neutral';
}

/**
 * Главная функция: на вход карта → на выход текст портрета в Олеся-тоне.
 */
export async function generateNatalPortrait(opts: GeneratePortraitOptions): Promise<string> {
  const { chart, userName, userGender = 'female' } = opts;

  const client = await getLlmClient();
  const systemPrompt = await loadSystemPrompt();
  const userPrompt = buildUserPrompt({ chart, userName, userGender });

  logger.info({ userName, userGender, userPromptLength: userPrompt.length }, 'Generating natal portrait');

  const result = await client.generate({
    systemPrompt,
    userPrompt,
    tier: 'quality',
    temperature: 0.85,
    maxTokens: 2500,
  });

  logger.info(
    {
      portraitLength: result.text.length,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      model: result.modelUsed,
    },
    'Natal portrait generated',
  );

  return result.text;
}

function buildUserPrompt(opts: GeneratePortraitOptions): string {
  const { chart, userName, userGender } = opts;

  const planetLine = (label: string, p: { sign: string; degree: number; house: number; retrograde: boolean }): string => {
    const ru = ZODIAC_SIGNS_RU[p.sign as keyof typeof ZODIAC_SIGNS_RU];
    const retro = p.retrograde ? ' ℞ ретроградный' : '';
    return `- ${label}: ${ru} ${p.degree.toFixed(2)}° в ${p.house}-м доме${retro}`;
  };

  const lines: string[] = [
    'Данные карты для портрета:',
    '',
  ];

  if (userName) lines.push(`- Имя: ${userName}`);
  if (userGender) {
    const genderRu =
      userGender === 'female' ? 'женский' : userGender === 'male' ? 'мужской' : 'нейтральный';
    lines.push(`- Пол для согласования: ${genderRu}`);
  }
  lines.push('');

  lines.push('Планеты:');
  lines.push(planetLine('Солнце', chart.sun));
  lines.push(planetLine('Луна', chart.moon));
  lines.push(planetLine('Меркурий', chart.mercury));
  lines.push(planetLine('Венера', chart.venus));
  lines.push(planetLine('Марс', chart.mars));
  lines.push(planetLine('Юпитер', chart.jupiter));
  lines.push(planetLine('Сатурн', chart.saturn));
  lines.push(planetLine('Уран', chart.uranus));
  lines.push(planetLine('Нептун', chart.neptune));
  lines.push(planetLine('Плутон', chart.pluto));
  lines.push('');

  if (chart.timeAccurate) {
    const ascRu = ZODIAC_SIGNS_RU[chart.ascendant.sign];
    const mcRu = ZODIAC_SIGNS_RU[chart.midheaven.sign];
    lines.push('Угловые точки:');
    lines.push(`- Восход (Асцендент): ${ascRu} ${chart.ascendant.degree.toFixed(2)}°`);
    lines.push(`- MC (Середина Неба): ${mcRu} ${chart.midheaven.degree.toFixed(2)}°`);
    lines.push('');
  } else {
    lines.push('Угловые точки (Восход, MC): НЕ РАССЧИТАНЫ — пользователь не указал точное время рождения.');
    lines.push('ВАЖНО: НЕ упоминай в портрете Восход и MC. Сделай раздел "Что считывают другие в мире" короче или замени его на наблюдение про Меркурий (как ты говоришь).');
    lines.push('');
  }

  if (chart.aspects.length > 0) {
    lines.push('Топ-7 аспектов (самые точные):');
    chart.aspects.slice(0, 7).forEach((aspect) => {
      lines.push(
        `- ${aspect.planetA} ${aspect.type} ${aspect.planetB} (орб ${aspect.orb.toFixed(2)}°)`,
      );
    });
    lines.push('');
  }

  // Финальные строгие напоминания — LLM иногда забывает в длинном контексте
  const genderRu =
    userGender === 'female' ? 'женский' : userGender === 'male' ? 'мужской' : 'нейтральный';
  const genderExamples =
    userGender === 'male'
      ? 'Пиши "ты сделал", "ты понял", "ты сам", "ты беспомощным" (НЕ беспомощной), "твой суперсила" → "твоя суперсила" (это слово женского рода)'
      : userGender === 'female'
      ? 'Пиши "ты сделала", "ты поняла", "ты сама", "ты беспомощной"'
      : 'Избегай глаголов прошедшего времени и прилагательных с указанием рода. Используй настоящее время и нейтральные конструкции';

  lines.push('');
  lines.push('━━━ КРИТИЧЕСКИЕ ТРЕБОВАНИЯ К ВЫДАЧЕ ━━━');
  lines.push('');
  lines.push(`1. ПОЛ для согласования: ${genderRu}. ${genderExamples}. Проверь КАЖДЫЙ глагол и прилагательное в тексте перед отправкой.`);
  lines.push('');
  lines.push('2. ДЛИНА: строго 1000-1800 знаков. Не больше. Если получается длиннее — сократи разделы про Венеру/Марс или Сатурн.');
  lines.push('');
  lines.push('3. СОГЛАСОВАНИЕ ПРИЛАГАТЕЛЬНЫХ С РОДОМ СУЩЕСТВИТЕЛЬНОГО: "сила" → твоя/моя; "момент" → твой/мой; "карта" → твоя/моя.');
  lines.push('');
  lines.push('4. ТОН: тёплый разговорный, как близкая подруга. Никаких "энергий", "вселенной", "звёзды говорят". Никаких ярлыков типа "ты Козерог — значит трудоголик".');
  lines.push('');
  lines.push('5. ОБЪЯСНЕНИЯ ТЕРМИНОВ: каждое астрологическое слово (Солнце, Луна, Венера, Сатурн, аспекты, дома) — объясни в скобках при ПЕРВОМ упоминании. Второй раз — без объяснения.');
  lines.push('');
  lines.push('Сгенерируй портрет.');

  return lines.join('\n');
}
