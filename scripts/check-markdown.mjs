import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync("git ls-files '*.md' ':!:game-repo/**'", { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
let failed = false;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (!text.startsWith('#')) {
    console.error(`${file}: markdown files must start with a top-level heading`);
    failed = true;
  }
  if (/\t/.test(text)) {
    console.error(`${file}: tabs are not allowed in markdown`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`Validated ${files.length} markdown files`);
