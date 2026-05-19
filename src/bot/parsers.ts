/**
 * Парсеры пользовательского ввода для онбординга.
 * Гибко принимают разные форматы — пользователь не должен думать о синтаксисе.
 */

import { DateTime } from 'luxon';

/**
 * Парсит дату. Принимает:
 * - "15.03.1990"  (RU)
 * - "1990-03-15"  (ISO)
 * - "15/03/1990"  (slash)
 * - "15-03-1990"
 * - "1990.03.15"
 *
 * Возвращает дату в формате ISO "YYYY-MM-DD" или null если невалидно.
 */
export function parseBirthDate(input: string): string | null {
  const trimmed = input.trim();

  const formats = [
    'd.M.yyyy',
    'dd.MM.yyyy',
    'yyyy-MM-dd',
    'd/M/yyyy',
    'dd/MM/yyyy',
    'd-M-yyyy',
    'dd-MM-yyyy',
    'yyyy.MM.dd',
    'yyyy/MM/dd',
  ];

  for (const fmt of formats) {
    const dt = DateTime.fromFormat(trimmed, fmt);
    if (dt.isValid) {
      const year = dt.year;
      // Sanity: разумные годы для натальной карты
      if (year < 1900 || year > 2100) return null;
      return dt.toISODate();
    }
  }
  return null;
}

/**
 * Парсит время. Принимает:
 * - "12:30"
 * - "12.30"
 * - "12 30"
 * - "12:30:00"
 * - "не знаю", "хз", "skip", "-" → null
 *
 * Возвращает "HH:mm" или null если не знает / невалидно.
 */
export function parseBirthTime(input: string): string | null | 'invalid' {
  const trimmed = input.trim().toLowerCase();

  const unknownMarkers = ['не знаю', 'незнаю', 'хз', 'skip', '-', 'нет', 'no'];
  if (unknownMarkers.includes(trimmed)) return null;

  // Normalize separators to ":"
  const normalized = trimmed.replace(/[.\s]/g, ':');

  const formats = ['H:m', 'HH:mm', 'HH:mm:ss', 'H:m:s'];
  for (const fmt of formats) {
    const dt = DateTime.fromFormat(normalized, fmt);
    if (dt.isValid) {
      return `${dt.hour.toString().padStart(2, '0')}:${dt.minute.toString().padStart(2, '0')}`;
    }
  }
  return 'invalid';
}

/**
 * Парсит ответ "да/нет" свободной формой.
 */
export function parseYesNo(input: string): 'yes' | 'no' | null {
  const trimmed = input.trim().toLowerCase();
  const yes = ['да', 'верно', 'yes', 'y', 'д', 'правильно', 'ок', 'ok', '+'];
  const no = ['нет', 'no', 'n', 'н', 'неверно', 'неправильно', 'другое', '-'];
  if (yes.includes(trimmed)) return 'yes';
  if (no.includes(trimmed)) return 'no';
  return null;
}
