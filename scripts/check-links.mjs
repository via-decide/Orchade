import { existsSync, readFileSync } from 'node:fs';
import { dirname, normalize, join } from 'node:path';
import { execSync } from 'node:child_process';

const files = execSync("git ls-files '*.md' ':!:game-repo/**'", { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
let failed = false;
const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(linkPattern)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const [pathOnly] = target.split('#');
    if (!pathOnly) continue;
    const resolved = normalize(join(dirname(file), pathOnly));
    if (!existsSync(resolved)) {
      console.error(`${file}: broken local link ${target}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log(`Checked links in ${files.length} markdown files`);
