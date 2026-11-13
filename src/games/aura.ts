import { humanSvg, wrap } from '../art/hero';
import type { GameConfig } from '../engine/types';

const SKIN = '#F2C29B';

const sparkle = wrap(
  `<defs><radialGradient id="sg"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.5" stop-color="#C9A7FF"/><stop offset="1" stop-color="#7B5CFF" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="50" r="46" fill="url(#sg)"/><path d="M50 8 L58 42 L92 50 L58 58 L50 92 L42 58 L8 50 L42 42 Z" fill="#FFF7C2" stroke="#7B5CFF" stroke-width="4" stroke-linejoin="round"/>`,
);
// "cringe" blob: a wobbly green face hiding behind its hands
const cringe = wrap(
  `<path d="M14 70 Q8 34 34 22 Q50 12 66 22 Q92 34 86 70 Q80 92 50 92 Q20 92 14 70 Z" fill="#9BE564" stroke="#22344D" stroke-width="5"/><path d="M28 50 l10 6 M38 50 l-10 6 M62 50 l10 6 M72 50 l-10 6" stroke="#22344D" stroke-width="5" stroke-linecap="round"/><path d="M34 74 q8 -8 16 0 q8 8 16 0" stroke="#22344D" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M22 34 q-6 -10 2 -16 M78 34 q6 -10 -2 -16" stroke="#56B3F7" stroke-width="5" fill="none" stroke-linecap="round"/>`,
);

const lamp = wrap(`<rect x="45" y="30" width="10" height="106" fill="#3B3F5C"/><path d="M50 30 Q50 10 74 10" stroke="#3B3F5C" stroke-width="8" fill="none"/><ellipse cx="76" cy="16" rx="14" ry="8" fill="#FFE66D"/><ellipse cx="76" cy="22" rx="22" ry="6" fill="#FFE66D" opacity="0.35"/>`, '0 0 100 140');
const palm = wrap(`<path d="M52 140 Q46 90 54 50" stroke="#8D5A3B" stroke-width="10" fill="none"/><path d="M54 50 Q30 30 8 44 Q30 22 54 46 Q50 18 30 6 Q58 14 58 46 Q74 18 96 24 Q70 30 60 50 Q86 44 96 64 Q72 52 56 54 Z" fill="#3FBF7F" stroke="#22344D" stroke-width="3"/>`, '0 0 100 140');
const neon = wrap(`<rect x="10" y="20" width="80" height="54" rx="10" fill="#2A1B4D" stroke="#FF4FD8" stroke-width="6"/><path d="M50 66 C32 54 24 44 28 36 C32 28 44 28 50 38 C56 28 68 28 72 36 C76 44 68 54 50 66 Z" fill="none" stroke="#5CF2FF" stroke-width="6" stroke-linejoin="round"/><rect x="46" y="74" width="8" height="66" fill="#3B3F5C"/>`, '0 0 100 140');

const T = (s: Partial<Parameters<typeof humanSvg>[0]>, shirt: string) =>
  humanSvg({ shoulder: 40, waist: 32, arm: 15, skin: SKIN, shirt, pants: '#3A4A6B', hair: '#3B2A20', face: 'meh', ...s });

export const aura: GameConfig = {
  id: 'aura',
  title: { ru: 'Aura Run', en: 'Aura Run', ky: 'Aura Run' },
  tagline: { ru: 'Набери ауру — уделай главного NPC!', en: 'Farm aura — beat the Main NPC!', ky: 'Аура чогулт — башкы NPCни жең!' },
  unit: { ru: 'ауры', en: 'aura', ky: 'аура' },
  start: 100,
  step: 10,
  palette: { skyTop: '#2B1E5C', skyBottom: '#B76CFF', ground: '#3B2B78', road: '#5A4AA8', roadEdge: '#FF4FD8', stripe: '#C9B8FF', good: '#3ED6A0', bad: '#FF4F6D', accent: '#FFD23F', ink: '#22344D', panel: '#FFFDF8' },
  thresholds: [0, 300, 900, 2500, 7000, 20000],
  tiers: [
    { ru: 'NPC', en: 'NPC', ky: 'NPC' },
    { ru: 'Норм тип', en: 'Decent', ky: 'Жакшы бала' },
    { ru: 'Харизма', en: 'Charismatic', ky: 'Харизма' },
    { ru: 'Сигма', en: 'Sigma', ky: 'Сигма' },
    { ru: 'Легенда ауры', en: 'Aura Legend', ky: 'Аура легендасы' },
    { ru: 'Бог ауры', en: 'Aura God', ky: 'Аура кудайы' },
  ],
  hero: (tier, skin, pose) => {
    const k = { kind: skin.kind, pose, skin: skin.kind ? '#F6EBD9' : SKIN, pants: skin.kind ? '#3A4A6B' : '#3A4A6B' };
    switch (tier) {
      case 0:
        return T({ ...k, face: 'meh', shoulder: 34, waist: 30, arm: 13 }, skin.kind ? skin.color : '#9AA4B2');
      case 1:
        return T({ ...k, face: 'smile' }, skin.color);
      case 2:
        return T({ ...k, face: 'smile', glow: { color: '#C9A7FF', r: 90, a: 0.55 } }, skin.color);
      case 3:
        return T({ ...k, face: 'smug', shades: true, glow: { color: '#B88CFF', r: 100, a: 0.75 } }, skin.color);
      case 4:
        return T({ ...k, face: 'smug', shades: true, glow: { color: '#FFD23F', r: 100, a: 0.85 }, crown: true }, skin.color);
      default:
        return T({ ...k, face: 'smug', shades: true, glow: { color: '#FFF4A3', r: 100, a: 1 }, halo: true, flex: !skin.kind }, skin.color);
    }
  },
  skins: [
    { name: { ru: 'Худи', en: 'Hoodie', ky: 'Худи' }, color: '#FF6B6B', price: 0 },
    { name: { ru: 'Мята', en: 'Mint', ky: 'Жалбыз' }, color: '#3ED6A0', price: 150 },
    { name: { ru: 'Банан', en: 'Banana', ky: 'Банан' }, color: '#FFD84D', price: 400, kind: 'banana' },
    { name: { ru: 'Огурчик', en: 'Pickle', ky: 'Бадыраң' }, color: '#7CC04B', price: 700, kind: 'pickle' },
    { name: { ru: 'Пельмень', en: 'Dumpling', ky: 'Чүчпара' }, color: '#F6EBD9', price: 1000, kind: 'dumpling' },
    { name: { ru: 'Тост', en: 'Toast', ky: 'Тост' }, color: '#F4D59B', price: 1500, kind: 'toast' },
  ],
  pickup: { svg: sparkle, n: 10 },
  hazard: { svg: cringe, n: 50 },
  boss: {
    name: { ru: 'Главный NPC', en: 'Main NPC', ky: 'Башкы NPC' },
    svg: humanSvg({ shoulder: 62, waist: 56, belly: 10, arm: 24, skin: '#C9CED6', shirt: '#6C7A89', pants: '#40495A', hair: '#7A8594', face: 'meh', extra: `<text x="150" y="40" font-family="sans-serif" font-weight="900" font-size="54" fill="#fff" stroke="#22344D" stroke-width="4">?</text>` }),
  },
  decor: [lamp, palm, neon],
  winLines: {
    ru: ['Минимальная аура, но победа есть', 'Ты больше не NPC', 'Аура +1000, чистая харизма', 'Сигма-походка активирована', 'Твоя аура видна из космоса', 'Аура настолько сильная, что телефон греется'],
    en: ['Barely any aura, but a win', 'You are no longer an NPC', '+1000 aura, pure charisma', 'Sigma walk activated', 'Your aura is visible from space', 'So much aura your phone is heating up'],
    ky: ['Аура аз, бирок жеңиш бар', 'Сен мындан ары NPC эмессиң', '+1000 аура, таза харизма', 'Сигма басуу иштеди', 'Сенин аураң космостон көрүнөт', 'Аура ушунчалык күчтүү, телефон ысыды'],
  },
  loseLines: {
    ru: ['−1000 ауры. NPC победил', 'Кринж. Попробуй ещё', 'Аура ушла в минус'],
    en: ['−1000 aura. The NPC won', 'Cringe. Try again', 'Aura went negative'],
    ky: ['−1000 аура. NPC жеңди', 'Кринж. Дагы аракет кыл', 'Аура минуска кетти'],
  },
  music: 'music1',
  emoji: '✨',
};
