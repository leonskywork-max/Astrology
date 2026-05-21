/**
 * Колода Таро Райдера-Уэйта — 78 карт (22 старших + 56 младших).
 * Случайная выборка с reversed-вероятностью 50%.
 *
 * База интерпретаций — в knowledge/tarot/major_arcana.md + minor_arcana.md.
 * Здесь только сама колода и логика выбора.
 */

export interface TarotCard {
  /** Канонический id для базы знаний и сохранения в БД */
  id: string;
  /** Русское имя для отображения */
  nameRu: string;
  /** Английское имя для интернационального */
  nameEn: string;
  /** Масть для младших */
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles' | 'major';
}

export interface TarotDraw {
  card: TarotCard;
  reversed: boolean;
}

// 22 старших аркана
const MAJOR: TarotCard[] = [
  { id: 'fool', nameRu: 'Шут', nameEn: 'The Fool', suit: 'major' },
  { id: 'magician', nameRu: 'Маг', nameEn: 'The Magician', suit: 'major' },
  { id: 'high_priestess', nameRu: 'Жрица', nameEn: 'The High Priestess', suit: 'major' },
  { id: 'empress', nameRu: 'Императрица', nameEn: 'The Empress', suit: 'major' },
  { id: 'emperor', nameRu: 'Император', nameEn: 'The Emperor', suit: 'major' },
  { id: 'hierophant', nameRu: 'Иерофант', nameEn: 'The Hierophant', suit: 'major' },
  { id: 'lovers', nameRu: 'Влюблённые', nameEn: 'The Lovers', suit: 'major' },
  { id: 'chariot', nameRu: 'Колесница', nameEn: 'The Chariot', suit: 'major' },
  { id: 'strength', nameRu: 'Сила', nameEn: 'Strength', suit: 'major' },
  { id: 'hermit', nameRu: 'Отшельник', nameEn: 'The Hermit', suit: 'major' },
  { id: 'wheel', nameRu: 'Колесо Фортуны', nameEn: 'Wheel of Fortune', suit: 'major' },
  { id: 'justice', nameRu: 'Справедливость', nameEn: 'Justice', suit: 'major' },
  { id: 'hanged_man', nameRu: 'Повешенный', nameEn: 'The Hanged Man', suit: 'major' },
  { id: 'death', nameRu: 'Смерть', nameEn: 'Death', suit: 'major' },
  { id: 'temperance', nameRu: 'Умеренность', nameEn: 'Temperance', suit: 'major' },
  { id: 'devil', nameRu: 'Дьявол', nameEn: 'The Devil', suit: 'major' },
  { id: 'tower', nameRu: 'Башня', nameEn: 'The Tower', suit: 'major' },
  { id: 'star', nameRu: 'Звезда', nameEn: 'The Star', suit: 'major' },
  { id: 'moon', nameRu: 'Луна', nameEn: 'The Moon', suit: 'major' },
  { id: 'sun', nameRu: 'Солнце', nameEn: 'The Sun', suit: 'major' },
  { id: 'judgement', nameRu: 'Суд', nameEn: 'Judgement', suit: 'major' },
  { id: 'world', nameRu: 'Мир', nameEn: 'The World', suit: 'major' },
];

// 56 младших арканов: 4 масти × (Туз, 2-10, Паж, Рыцарь, Королева, Король)
const SUITS = [
  { key: 'wands' as const, ru: 'Жезлов', en: 'of Wands' },
  { key: 'cups' as const, ru: 'Кубков', en: 'of Cups' },
  { key: 'swords' as const, ru: 'Мечей', en: 'of Swords' },
  { key: 'pentacles' as const, ru: 'Пентаклей', en: 'of Pentacles' },
];

const RANKS = [
  { key: 'ace', ru: 'Туз', en: 'Ace' },
  { key: 'two', ru: 'Двойка', en: 'Two' },
  { key: 'three', ru: 'Тройка', en: 'Three' },
  { key: 'four', ru: 'Четвёрка', en: 'Four' },
  { key: 'five', ru: 'Пятёрка', en: 'Five' },
  { key: 'six', ru: 'Шестёрка', en: 'Six' },
  { key: 'seven', ru: 'Семёрка', en: 'Seven' },
  { key: 'eight', ru: 'Восьмёрка', en: 'Eight' },
  { key: 'nine', ru: 'Девятка', en: 'Nine' },
  { key: 'ten', ru: 'Десятка', en: 'Ten' },
  { key: 'page', ru: 'Паж', en: 'Page' },
  { key: 'knight', ru: 'Рыцарь', en: 'Knight' },
  { key: 'queen', ru: 'Королева', en: 'Queen' },
  { key: 'king', ru: 'Король', en: 'King' },
];

const MINOR: TarotCard[] = SUITS.flatMap((suit) =>
  RANKS.map((rank) => ({
    id: `${rank.key}_of_${suit.key}`,
    nameRu: `${rank.ru} ${suit.ru}`,
    nameEn: `${rank.en} ${suit.en}`,
    suit: suit.key,
  })),
);

export const DECK: readonly TarotCard[] = [...MAJOR, ...MINOR];

/**
 * Тянет одну случайную карту.
 *
 * Старшие арканы выпадают слегка чаще для шеринговой способности
 * (как Co-Star Tarot day): weighted random ~30% bias на major.
 * Reversed — 50%.
 */
export function drawDailyCard(seed?: number): TarotDraw {
  const rand: () => number =
    seed === undefined ? Math.random : seededRandom(seed);

  // Weighted: 30% chance to draw from major (22 cards, normally 22/78=28%)
  const useMajor = rand() < 0.3;
  const pool = useMajor ? MAJOR : MINOR;
  const card = pool[Math.floor(rand() * pool.length)]!;
  const reversed = rand() < 0.5;

  return { card, reversed };
}

/**
 * Seedable PRNG для тестов (детерминированно).
 * Алгоритм mulberry32 — простой и достаточный.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Форматирует карту для показа в Telegram.
 */
export function formatCardName(draw: TarotDraw): string {
  const reversed = draw.reversed ? ' (перевёрнутая)' : '';
  return `${draw.card.nameRu}${reversed}`;
}

/**
 * Дата → seed для детерминированной карты дня
 * (один юзер видит одну и ту же карту в течение дня).
 */
export function dailyCardForUser(userId: number, date: Date = new Date()): TarotDraw {
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const dateNum = parseInt(dateStr.replace(/-/g, ''), 10);
  const seed = (userId ^ dateNum) >>> 0;
  return drawDailyCard(seed);
}
