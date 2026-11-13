import type { Lang } from '../engine/types';
import { save } from '../core/save';

const ru = {
  level: 'Уровень',
  swipe: 'Веди пальцем, чтобы бежать',
  upgrades: 'Прокачка',
  skins: 'Скины',
  startUp: 'Старт',
  income: 'Доход',
  startBoost: 'Старт ×2 ▶',
  boostOn: 'Старт ×2 включён!',
  win: 'ПОБЕДА!',
  lose: 'Поражение',
  claim: 'Забрать',
  x3: '×3 ▶',
  revive: 'Реванш ▶',
  retry: 'Заново',
  next: 'Дальше',
  share: 'Похвастаться',
  shareText: 'У меня {v} {u}! Я «{t}» в игре {g}. Сможешь больше?',
  fight: 'БОЙ!',
  youAre: 'Ты — {t}!',
  buy: 'Купить',
  equip: 'Надеть',
  equipped: 'Надето',
  free: 'Бесплатно ▶',
  notEnough: 'Не хватает монет',
  freeIn: 'Бесплатно через {m} мин',
  settings: 'Настройки',
  sound: 'Звук',
  vibration: 'Вибрация',
  language: 'Язык',
  close: 'Закрыть',
  on: 'Вкл',
  off: 'Выкл',
  adBreak: 'Небольшой перерыв…',
  noAd: 'Реклама сейчас недоступна',
  vip: 'Без рекламы 20 мин: {a}/{b} ▶',
  vipActive: 'Без рекламы ещё {m} мин',
  boss: 'Босс',
  tierUp: '{t}!',
  lvl: 'ур.',
};
type Dict = typeof ru;
const en: Dict = {
  level: 'Level',
  swipe: 'Drag to run',
  upgrades: 'Upgrades',
  skins: 'Skins',
  startUp: 'Start',
  income: 'Income',
  startBoost: 'Start ×2 ▶',
  boostOn: 'Start ×2 is on!',
  win: 'VICTORY!',
  lose: 'Defeat',
  claim: 'Claim',
  x3: '×3 ▶',
  revive: 'Rematch ▶',
  retry: 'Retry',
  next: 'Next',
  share: 'Show off',
  shareText: 'I got {v} {u}! I am "{t}" in {g}. Can you beat it?',
  fight: 'FIGHT!',
  youAre: 'You are {t}!',
  buy: 'Buy',
  equip: 'Wear',
  equipped: 'Wearing',
  free: 'Free ▶',
  notEnough: 'Not enough coins',
  freeIn: 'Free in {m} min',
  settings: 'Settings',
  sound: 'Sound',
  vibration: 'Vibration',
  language: 'Language',
  close: 'Close',
  on: 'On',
  off: 'Off',
  adBreak: 'Short break…',
  noAd: 'No ad available right now',
  vip: 'No ads 20 min: {a}/{b} ▶',
  vipActive: 'Ad-free for {m} more min',
  boss: 'Boss',
  tierUp: '{t}!',
  lvl: 'lv.',
};
const ky: Dict = {
  level: 'Деңгээл',
  swipe: 'Чуркоо үчүн манжаңды жылдыр',
  upgrades: 'Күчөтүү',
  skins: 'Скиндер',
  startUp: 'Старт',
  income: 'Киреше',
  startBoost: 'Старт ×2 ▶',
  boostOn: 'Старт ×2 күйдү!',
  win: 'ЖЕҢИШ!',
  lose: 'Жеңилүү',
  claim: 'Алуу',
  x3: '×3 ▶',
  revive: 'Реванш ▶',
  retry: 'Кайра',
  next: 'Андан ары',
  share: 'Мактануу',
  shareText: 'Менде {v} {u}! Мен {g} оюнунда «{t}». Көбүрөөк аласыңбы?',
  fight: 'КҮРӨШ!',
  youAre: 'Сен — {t}!',
  buy: 'Сатып алуу',
  equip: 'Кийүү',
  equipped: 'Кийилди',
  free: 'Акысыз ▶',
  notEnough: 'Тыйын жетпейт',
  freeIn: '{m} мүнөттөн кийин акысыз',
  settings: 'Жөндөөлөр',
  sound: 'Үн',
  vibration: 'Дирилдөө',
  language: 'Тил',
  close: 'Жабуу',
  on: 'Күйүк',
  off: 'Өчүк',
  adBreak: 'Кыска тыныгуу…',
  noAd: 'Азыр жарнама жок',
  vip: 'Жарнамасыз 20 мүн: {a}/{b} ▶',
  vipActive: 'Дагы {m} мүн жарнамасыз',
  boss: 'Босс',
  tierUp: '{t}!',
  lvl: 'дең.',
};

const DICTS: Record<Lang, Dict> = { ru, en, ky };
export const LANGS: Lang[] = ['ru', 'en', 'ky'];
export const LANG_NAMES: Record<Lang, string> = { ru: 'Русский', en: 'English', ky: 'Кыргызча' };

let lang: Lang = 'en';
/** The language comes only from the platform (rule 3.4.2); English is the default and fallback (3.4.1). */
export function detectLang(platformLang?: string): Lang {
  const saved = save.data.settings.lang;
  if (saved) return saved;
  const l = (platformLang || 'en').slice(0, 2).toLowerCase();
  return l === 'ru' ? 'ru' : l === 'ky' ? 'ky' : 'en';
}
export const setLang = (l: Lang) => (lang = l);
export const getLang = () => lang;

export function t(key: keyof Dict, vars: Record<string, string | number> = {}): string {
  let s = DICTS[lang][key] ?? en[key];
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
export type StrKey = keyof Dict;
