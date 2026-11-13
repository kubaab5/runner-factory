import { save } from './save';

export const haptic = {
  light() {
    if (save.data.settings.haptics) navigator.vibrate?.(10);
  },
  medium() {
    if (save.data.settings.haptics) navigator.vibrate?.(25);
  },
  error() {
    if (save.data.settings.haptics) navigator.vibrate?.([30, 40, 30]);
  },
  success() {
    if (save.data.settings.haptics) navigator.vibrate?.(40);
  },
};
