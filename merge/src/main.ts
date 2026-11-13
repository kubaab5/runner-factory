import './style.css';
import { loadSave } from './core/save';
import { setLang } from './i18n';
import { bridge, initBridge } from './platform/bridge';

// Bridge first, then the save (one storage.get), then the game code and assets.
(async () => {
  await initBridge();
  setLang(bridge()?.platform.language ?? navigator.language);
  await loadSave();
  const { startApp } = await import('./app');
  await startApp();
})();
