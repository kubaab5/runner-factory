import { wrap } from './hero';
import { soundOff, soundOn } from './icons_extra';

export const coinSvg = wrap(`<circle cx="50" cy="50" r="44" fill="#FFC93C" stroke="#C98A00" stroke-width="6"/><circle cx="50" cy="50" r="30" fill="none" stroke="#FFE38A" stroke-width="5"/><path d="M50 30 V70 M40 40 H58 Q64 40 64 46 Q64 52 56 52 H44 Q36 52 36 58 Q36 64 44 64 H62" stroke="#C98A00" stroke-width="6" fill="none" stroke-linecap="round"/>`);
export const icons: Record<string, string> = {
  soundOn,
  soundOff,
  gear: wrap(`<g transform="translate(50,50)">${Array.from({ length: 8 }, (_, i) => `<rect x="-7" y="-44" width="14" height="20" rx="4" fill="#fff" transform="rotate(${i * 45})"/>`).join('')}<circle r="28" fill="#fff"/><circle r="12" fill="#22344D"/></g>`),
  share: wrap(`<circle cx="72" cy="22" r="13" fill="#22344D"/><circle cx="72" cy="78" r="13" fill="#22344D"/><circle cx="26" cy="50" r="13" fill="#22344D"/><path d="M72 22 L26 50 L72 78" stroke="#22344D" stroke-width="7" fill="none"/>`),
  video: wrap(`<rect x="8" y="24" width="62" height="52" rx="10" fill="#fff"/><path d="M72 42 L94 28 V72 L72 58 Z" fill="#fff"/>`),
  hand: wrap(`<path d="M40 92 Q22 70 22 56 Q22 48 30 50 L40 60 V20 Q40 12 47 12 Q54 12 54 20 V46 Q54 40 61 40 Q68 40 68 47 V50 Q68 44 75 45 Q82 46 82 53 V72 Q82 92 64 92 Z" fill="#fff" stroke="#22344D" stroke-width="5" stroke-linejoin="round"/>`),
  lock: wrap(`<rect x="22" y="44" width="56" height="44" rx="8" fill="#8D99AE"/><path d="M34 44 V32 A16 16 0 0 1 66 32 V44" stroke="#8D99AE" stroke-width="9" fill="none"/>`),
};
