import { loadSave } from './core/save';
import { initBridge } from './platform/bridge';

/* Order matters for Playgama: Bridge first, then the save, and only then the engine and assets. */
async function start() {
  const b = await initBridge();
  await loadSave();
  const { startGame } = await import('./game');
  await startGame(b?.platform.language, b?.platform.isAudioEnabled !== false);
}

void start();
