import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';

mkdirSync('.git/hooks', { recursive: true });
writeFileSync('.git/hooks/pre-commit', '#!/bin/sh\nnpm run lint\n');
chmodSync('.git/hooks/pre-commit', 0o755);
console.log('Installed .git/hooks/pre-commit');
