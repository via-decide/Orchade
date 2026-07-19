import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { execSync } from 'node:child_process';

const files = execSync("git ls-files ':!:node_modules' ':!:game-repo/node_modules'", { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const assets = files.filter((file) => /\.(png|jpg|jpeg|gif|svg|webp|mp3|wav|ogg|glb|gltf)$/.test(file));
const searchable = files.filter((file) => /\.(ts|tsx|js|jsx|css|html|md|json)$/.test(file));
const haystack = searchable.map((file) => readFileSync(file, 'utf8')).join('\n');
const unused = assets.filter((asset) => !haystack.includes(basename(asset)) && !haystack.includes(asset));
if (unused.length) {
  console.warn(`Potential unused assets:\n${unused.map((asset) => `- ${asset}`).join('\n')}`);
}
console.log(`Checked ${assets.length} assets`);
