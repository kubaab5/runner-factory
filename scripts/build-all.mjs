// Builds every game into dist/<id>/ and zips it for portal upload (dist/<id>.zip).
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync } from 'node:fs';

const only = process.argv[2];
const ids = readdirSync('src/games').filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace('.ts', '')).filter((id) => !only || id === only);
rmSync('dist', { recursive: true, force: true });
for (const id of ids) {
  console.log(`▶ ${id}`);
  execSync(`npx vite build --logLevel warn`, { stdio: 'inherit', env: { ...process.env, VITE_GAME: id, OUT_DIR: `dist/${id}` } });
  // keep only this game's music track
  const music = readFileSync(`src/games/${id}.ts`, 'utf8').match(/music: '([^']+)'/)?.[1];
  for (const f of readdirSync(`dist/${id}/audio`)) if (f.startsWith('music') && !f.startsWith(`${music}.`)) rmSync(`dist/${id}/audio/${f}`);
  execSync(`cd dist/${id} && zip -qr ../${id}.zip .`);
}
console.log(`built: ${ids.join(', ')}`);
