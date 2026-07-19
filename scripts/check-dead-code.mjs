import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync("git ls-files ':!:node_modules' ':!:game-repo/node_modules'", { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const duplicates = files.filter((file) => file.startsWith('game-repo/') && existsSync(file.replace('game-repo/', '')));
if (duplicates.length > 0) {
  console.warn(`Detected ${duplicates.length} duplicated files under game-repo/. Source-of-truth decision required.`);
}
console.log('Dead-code heuristic completed');
