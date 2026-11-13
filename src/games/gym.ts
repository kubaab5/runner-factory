import { humanSvg, wrap } from '../art/hero';
import type { GameConfig } from '../engine/types';

const SKIN = '#E8B48F';
const dumbbell = wrap(`<rect x="22" y="44" width="56" height="12" rx="5" fill="#9AA4B2" stroke="#22344D" stroke-width="4"/><rect x="8" y="26" width="18" height="48" rx="6" fill="#3A4A6B" stroke="#22344D" stroke-width="4"/><rect x="74" y="26" width="18" height="48" rx="6" fill="#3A4A6B" stroke="#22344D" stroke-width="4"/>`);
const donut = wrap(`<circle cx="50" cy="54" r="40" fill="#E0A96D" stroke="#22344D" stroke-width="5"/><path d="M14 46 Q20 18 50 16 Q80 18 86 46 Q76 40 70 48 Q60 40 52 48 Q42 40 34 48 Q24 40 14 46 Z" fill="#FF7EB6" stroke="#22344D" stroke-width="4"/><circle cx="50" cy="54" r="12" fill="#6B3A2A" stroke="#22344D" stroke-width="4"/><path d="M30 30 l6 3 M58 26 l5 -4 M70 36 l5 3 M42 24 l-3 -5" stroke="#FFF" stroke-width="4" stroke-linecap="round"/>`);
const kettle = wrap(`<path d="M30 70 Q30 46 50 46 Q70 46 70 70 Q70 100 50 100 Q30 100 30 70 Z" transform="translate(0,30)" fill="#3A4A6B" stroke="#22344D" stroke-width="4"/><path d="M36 82 Q36 52 50 52 Q64 52 64 82" stroke="#22344D" stroke-width="8" fill="none"/>`, '0 0 100 140');
const bench = wrap(`<rect x="10" y="90" width="80" height="14" rx="5" fill="#E63946" stroke="#22344D" stroke-width="4"/><rect x="18" y="104" width="8" height="34" fill="#22344D"/><rect x="74" y="104" width="8" height="34" fill="#22344D"/><rect x="40" y="40" width="6" height="52" fill="#9AA4B2"/><rect x="10" y="34" width="80" height="8" rx="3" fill="#9AA4B2" stroke="#22344D" stroke-width="3"/><rect x="2" y="22" width="12" height="32" rx="4" fill="#3A4A6B"/><rect x="86" y="22" width="12" height="32" rx="4" fill="#3A4A6B"/>`, '0 0 100 140');
const shaker = wrap(`<path d="M32 40 H68 L64 128 Q64 136 56 136 H44 Q36 136 36 128 Z" fill="#4DA3FF" stroke="#22344D" stroke-width="4"/><rect x="30" y="24" width="40" height="18" rx="5" fill="#22344D"/><rect x="44" y="12" width="12" height="14" rx="3" fill="#22344D"/><rect x="40" y="70" width="20" height="30" rx="4" fill="#fff" opacity="0.8"/>`, '0 0 100 140');

const B = (s: Partial<Parameters<typeof humanSvg>[0]>, top: string) =>
  humanSvg({ shoulder: 40, waist: 32, arm: 15, skin: SKIN, shirt: top, pants: '#2D2D3A', hair: '#2B1D14', face: 'smile', headband: '#E63946', ...s });

export const gym: GameConfig = {
  id: 'gym',
  title: { ru: 'Качалка Раш', en: 'Gym Rush', ky: 'Спортзал Раш' },
  tagline: { ru: 'Из дрища в качка — и арм-рестлинг с боссом!', en: 'From noodle to beast — then arm-wrestle the boss!', ky: 'Арыктан күчтүүгө — анан босс менен күрөш!' },
  unit: { ru: 'силы', en: 'power', ky: 'күч' },
  start: 10,
  step: 1,
  palette: { skyTop: '#6EC6FF', skyBottom: '#D8F1FB', ground: '#7BC67E', road: '#D9C8B4', roadEdge: '#E63946', stripe: '#FFFFFF', good: '#2BB673', bad: '#E63946', accent: '#FFB703', ink: '#22344D', panel: '#FFFDF8' },
  thresholds: [0, 30, 90, 250, 700, 2000],
  tiers: [
    { ru: 'Дрищ', en: 'Noodle', ky: 'Арык' },
    { ru: 'Новичок', en: 'Rookie', ky: 'Жаңы баштоочу' },
    { ru: 'Крепыш', en: 'Sturdy', ky: 'Бекем' },
    { ru: 'Качок', en: 'Buff', ky: 'Булчуңдуу' },
    { ru: 'Гора мышц', en: 'Muscle Mountain', ky: 'Булчуң тоосу' },
    { ru: 'Титан', en: 'Titan', ky: 'Титан' },
  ],
  hero: (tier, top) => {
    const p = [
      { shoulder: 26, waist: 22, arm: 8, face: 'wow' as const, headband: undefined },
      { shoulder: 34, waist: 28, arm: 12, face: 'smile' as const },
      { shoulder: 44, waist: 32, arm: 17, biceps: 9, face: 'smile' as const },
      { shoulder: 54, waist: 34, arm: 21, biceps: 13, face: 'smug' as const, flex: true },
      { shoulder: 64, waist: 36, arm: 25, biceps: 17, face: 'smug' as const, flex: true },
      { shoulder: 72, waist: 38, arm: 28, biceps: 20, face: 'smug' as const, flex: true, shades: true },
    ][tier];
    return B(p, top);
  },
  skins: [
    { name: { ru: 'Майка', en: 'Tank top', ky: 'Майка' }, color: '#FFB703', price: 0 },
    { name: { ru: 'Синяя', en: 'Blue', ky: 'Көк' }, color: '#4DA3FF', price: 150 },
    { name: { ru: 'Зелёная', en: 'Green', ky: 'Жашыл' }, color: '#2BB673', price: 300 },
    { name: { ru: 'Розовая', en: 'Pink', ky: 'Кызгылт' }, color: '#FF7EB6', price: 500 },
    { name: { ru: 'Чёрная', en: 'Black', ky: 'Кара' }, color: '#2D2D3A', price: 800 },
    { name: { ru: 'Золотая', en: 'Gold', ky: 'Алтын' }, color: '#FFD166', price: 1200 },
  ],
  pickup: { svg: dumbbell, n: 1 },
  hazard: { svg: donut, n: 5 },
  boss: {
    name: { ru: 'Тренер Бульдозер', en: 'Coach Bulldozer', ky: 'Машыктыруучу Бульдозер' },
    svg: humanSvg({ shoulder: 76, waist: 56, belly: 14, arm: 30, biceps: 20, skin: '#C98E6B', shirt: '#E63946', pants: '#2D2D3A', hair: '#111', face: 'angry', flex: true }),
  },
  decor: [kettle, bench, shaker],
  winLines: {
    ru: ['Тощий, но дерзкий!', 'Первая победа в зале', 'Бицепс заметили!', 'Качок. Девочки смотрят', 'Футболка трещит по швам', 'Ты сломал спортзал'],
    en: ['Skinny but bold!', 'First gym win', 'The biceps got noticed!', 'Buff. People are staring', 'Shirt is tearing apart', 'You broke the gym'],
    ky: ['Арык, бирок тайманбас!', 'Залдагы биринчи жеңиш', 'Бицепсти байкашты!', 'Булчуңдуу. Баары карап жатат', 'Футболка жыртылып жатат', 'Сен спортзалды сындырдың'],
  },
  loseLines: {
    ru: ['Бульдозер сильнее. Ешь меньше пончиков', 'Рука не выдержала', 'Пропустил день ног'],
    en: ['The Bulldozer won. Fewer donuts', 'Your arm gave up', 'Skipped leg day'],
    ky: ['Бульдозер күчтүү. Пончикти азыраак же', 'Колуң чыдабады', 'Бут күнүн өткөрүп жибердиң'],
  },
  emoji: '💪',
};
