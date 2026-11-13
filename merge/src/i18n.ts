export type Lang = 'en' | 'ru';
let lang: Lang = 'en';
export const setLang = (l: string | undefined) => (lang = l && l.toLowerCase().startsWith('ru') ? 'ru' : 'en');
export const getLang = () => lang;

const S = {
  en: {
    score: 'Score',
    best: 'Best',
    next: 'Next',
    hint: 'Move, then tap to drop.\nTwo same memes merge!',
    hammer: 'Smash',
    shake: 'Shake',
    hammerPick: 'Tap a meme to smash it',
    over: 'The jar is full!',
    revive: 'Clear the top',
    reviveSub: 'and keep playing',
    again: 'Play again',
    newBest: 'NEW BEST!',
    biggest: 'Your biggest meme',
    merges: 'Merges',
    share: 'Screenshot your biggest meme and flex',
    unlocked: 'NEW MEME:',
    combo: 'COMBO',
    noAd: 'Ad is not available right now',
    adClosed: 'Ad closed early: no reward',
    paused: 'Paused',
    signIn: 'Sign in',
    signInLong: 'Sign in to keep progress',
    resume: 'Continue',
    restart: 'New game',
    chain: 'Merge chain',
    jackpot: 'DOUBLE BOSS! +500',
  },
  ru: {
    score: 'Очки',
    best: 'Рекорд',
    next: 'Дальше',
    hint: 'Двигай и тапни, чтобы бросить.\nДва одинаковых мема сливаются!',
    hammer: 'Разбить',
    shake: 'Встряхнуть',
    hammerPick: 'Тапни по мему, чтобы разбить',
    over: 'Банка заполнена!',
    revive: 'Очистить верх',
    reviveSub: 'и играть дальше',
    again: 'Ещё раз',
    newBest: 'НОВЫЙ РЕКОРД!',
    biggest: 'Твой самый большой мем',
    merges: 'Слияний',
    share: 'Сделай скрин и похвастайся',
    unlocked: 'НОВЫЙ МЕМ:',
    combo: 'КОМБО',
    noAd: 'Реклама сейчас недоступна',
    adClosed: 'Реклама закрыта раньше: без награды',
    paused: 'Пауза',
    signIn: 'Войти',
    signInLong: 'Войти, чтобы сохранить прогресс',
    resume: 'Продолжить',
    restart: 'Новая игра',
    chain: 'Цепочка',
    jackpot: 'ДВА БОССА! +500',
  },
} as const;

export type Key = keyof (typeof S)['en'];
export const t = (k: Key) => S[lang][k];

/** Title on the game-over card by the biggest tier reached */
const TITLES = {
  en: ['Crumb Collector', 'Certified NPC', 'Bean Enjoyer', 'Donut Dealer', 'Cookie Crumbler', 'Pizza Party', 'Too Cool', 'Rizz Lord', 'Sigma Grindset', 'Aura Farmer', 'FINAL BOSS'],
  ru: ['Собиратель крошек', 'Сертифицированный NPC', 'Любитель бобов', 'Пончиковый барон', 'Печенькин', 'Пицца-пати', 'Слишком крут', 'Лорд Ризза', 'Сигма-путь', 'Фермер ауры', 'ФИНАЛЬНЫЙ БОСС'],
};
export const titleFor = (tier: number) => TITLES[lang][Math.max(0, Math.min(10, tier))];
