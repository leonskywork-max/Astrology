/**
 * Утилиты для работы со знаками зодиака.
 */

export const ZODIAC_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

export const ZODIAC_SIGNS_RU: Record<ZodiacSign, string> = {
  Aries: 'Овен',
  Taurus: 'Телец',
  Gemini: 'Близнецы',
  Cancer: 'Рак',
  Leo: 'Лев',
  Virgo: 'Дева',
  Libra: 'Весы',
  Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец',
  Capricorn: 'Козерог',
  Aquarius: 'Водолей',
  Pisces: 'Рыбы',
};

/**
 * Конвертирует эклиптическую долготу в знак + градус внутри знака.
 *
 * Пример: 57.08 → { sign: 'Taurus', degree: 27.08 }
 *         185.5 → { sign: 'Libra', degree: 5.5 }
 */
export function longitudeToSign(longitude: number): { sign: ZodiacSign; degree: number } {
  const norm = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const degree = norm - signIndex * 30;
  return { sign: ZODIAC_SIGNS[signIndex]!, degree };
}

/**
 * Форматирует позицию для отображения: "Taurus 27°05'"
 */
export function formatPosition(longitude: number, lang: 'en' | 'ru' = 'ru'): string {
  const { sign, degree } = longitudeToSign(longitude);
  const deg = Math.floor(degree);
  const min = Math.floor((degree - deg) * 60);
  const signName = lang === 'ru' ? ZODIAC_SIGNS_RU[sign] : sign;
  return `${signName} ${deg}°${min.toString().padStart(2, '0')}'`;
}
