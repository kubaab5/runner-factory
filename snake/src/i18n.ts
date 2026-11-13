export type Lang = 'en' | 'ru';
let lang: Lang = 'en';
export const setLang = (l: string | undefined) => (lang = l && l.toLowerCase().startsWith('ru') ? 'ru' : 'en');
export const getLang = () => lang;

const S = {
  en: {
    play: 'PLAY',
    namePh: 'Your nickname',
    startBig: 'Start 3x longer',
    startBigOn: '3x length ready!',
    shop: 'Skins',
    best: 'Best',
    coins: 'Coins',
    length: 'Length',
    kills: 'Kills',
    rank: 'Rank',
    time: 'Time',
    top: 'Top snakes',
    you: 'You',
    boost: 'BOOST',
    hint: 'Steer with mouse or finger. Hold to boost. Make others crash into you!',
    hintTouch: 'Drag anywhere to steer. BOOST button to speed up.',
    cookedBy: 'Cooked by',
    wall: 'Skill issue: you hit the wall',
    revive: 'Revive',
    reviveSub: 'keep 70% length',
    x2: 'Coins x2',
    again: 'Play again',
    menu: 'Menu',
    earned: 'Coins earned',
    owned: 'Selected',
    equip: 'Equip',
    buy: 'Buy',
    tryAd: 'Try free 1 run',
    back: 'Back',
    skinsTab: 'Snakes',
    hatsTab: 'Accessories',
    noMoney: 'Not enough coins',
    newBest: 'NEW BEST!',
    shareHint: 'Screenshot this and flex your aura',
    paused: 'Paused',
  },
  ru: {
    play: 'ИГРАТЬ',
    namePh: 'Твой ник',
    startBig: 'Старт x3 длиннее',
    startBigOn: 'Старт x3 готов!',
    shop: 'Скины',
    best: 'Рекорд',
    coins: 'Монеты',
    length: 'Длина',
    kills: 'Килы',
    rank: 'Место',
    time: 'Время',
    top: 'Топ змей',
    you: 'Ты',
    boost: 'УСКОР.',
    hint: 'Рули мышкой или пальцем. Зажми для ускорения. Подрезай других!',
    hintTouch: 'Води пальцем по экрану. Кнопка УСКОР. — разгон.',
    cookedBy: 'Тебя приготовил',
    wall: 'Скилл ишью: врезался в стену',
    revive: 'Воскреснуть',
    reviveSub: 'сохранить 70% длины',
    x2: 'Монеты x2',
    again: 'Ещё раз',
    menu: 'Меню',
    earned: 'Заработано',
    owned: 'Выбрано',
    equip: 'Надеть',
    buy: 'Купить',
    tryAd: 'Бесплатно на 1 забег',
    back: 'Назад',
    skinsTab: 'Змеи',
    hatsTab: 'Аксессуары',
    noMoney: 'Не хватает монет',
    newBest: 'НОВЫЙ РЕКОРД!',
    shareHint: 'Сделай скрин и похвастайся аурой',
    paused: 'Пауза',
  },
} as const;

export type Key = keyof (typeof S)['en'];
export const t = (k: Key) => S[lang][k];

/** Kill feed lines: {k} killer, {v} victim */
const FEED = {
  en: ['{k} cooked {v}', '{v} had a skill issue', '{k} +1000 aura', '{v} became snacks', '{v}: NPC moment', '{k} is him', '{v} got ratioed by {k}', '{k} ate {v} for breakfast'],
  ru: ['{k} приготовил {v}', 'у {v} скилл ишью', '{k} +1000 ауры', '{v} стал закуской', '{v}: момент NPC', '{k} — это он', '{k} съел {v} на завтрак', '{v} ушёл трогать траву'],
};
const WALL = { en: ['{v} hugged the wall', '{v} forgot the map has edges'], ru: ['{v} обнял стену', '{v} не знал, что у карты есть край'] };

export function feedLine(killer: string | null, victim: string, r: number) {
  const list = killer ? FEED[lang] : WALL[lang];
  const s = list[Math.floor(r * list.length)];
  return s.replace('{k}', killer ?? '').replace('{v}', victim);
}

/** Big centre popups after the player kills someone (by streak) */
export const KILL_POP = {
  en: ['COOKED!', 'DOUBLE COOK!', 'TRIPLE COOK!', 'UNSTOPPABLE!', 'FINAL BOSS!'],
  ru: ['ПРИГОТОВЛЕН!', 'ДАБЛ!', 'ТРИПЛ!', 'НЕ ОСТАНОВИТЬ!', 'ФИНАЛЬНЫЙ БОСС!'],
};
export const killPop = (streak: number) => KILL_POP[lang][Math.min(KILL_POP[lang].length - 1, streak - 1)];

export const MILESTONES: Array<{ at: number; en: string; ru: string }> = [
  { at: 67, en: '6-7!', ru: '6-7!' },
  { at: 100, en: 'Not an NPC anymore', ru: 'Уже не NPC' },
  { at: 300, en: 'Side character', ru: 'Второстепенный герой' },
  { at: 670, en: '6-7 x10!', ru: '6-7 x10!' },
  { at: 1000, en: '+1000 AURA', ru: '+1000 АУРЫ' },
  { at: 2000, en: 'MAIN CHARACTER', ru: 'ГЛАВНЫЙ ГЕРОЙ' },
  { at: 4000, en: 'SIGMA SNAKE', ru: 'СИГМА-ЗМЕЯ' },
  { at: 6767, en: '6-7 LEGEND', ru: 'ЛЕГЕНДА 6-7' },
  { at: 10000, en: 'FINAL BOSS', ru: 'ФИНАЛЬНЫЙ БОСС' },
];

/** Death screen title by final length: the screenshot-worthy part */
const TITLES: Array<{ at: number; en: string; ru: string }> = [
  { at: 0, en: 'Certified NPC', ru: 'Сертифицированный NPC' },
  { at: 80, en: 'Tiny Worm', ru: 'Маленький червячок' },
  { at: 200, en: 'Snack Enjoyer', ru: 'Любитель закусок' },
  { at: 500, en: 'Side Character', ru: 'Второстепенный герой' },
  { at: 1000, en: 'Aura Farmer', ru: 'Фермер ауры' },
  { at: 2000, en: 'Main Character', ru: 'Главный герой' },
  { at: 4000, en: 'Sigma Snake', ru: 'Сигма-змея' },
  { at: 8000, en: 'Final Boss', ru: 'Финальный босс' },
];
export function titleFor(len: number) {
  let r = TITLES[0];
  for (const x of TITLES) if (len >= x.at) r = x;
  return r[lang];
}

export const BOT_NAMES = [
  'AuraFarmer', 'NPC_404', 'SkillIssue', 'MewingMaster', 'OhioWorm', 'SixSeven', 'TouchGrass', 'Rizzler',
  'NoodleArm', 'SnekGod', 'BigBrainBob', 'CertifiedNPC', 'MainCharacter', 'Bruh', 'Yapper', 'Goofy',
  'Delulu', 'NoCap', 'Chonk', 'Sneky', 'DangerNoodle', 'Spaghetti', 'BigDawg', 'Mid', 'Ratio', 'Wiggles',
  'SnackAttack', 'Sigma', 'Cooked', 'LilBro', 'HimHimself', 'Speedrun', 'Lag', 'AFK', 'xX_Snek_Xx', 'Unc',
];
