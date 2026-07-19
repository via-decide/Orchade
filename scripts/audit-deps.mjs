import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['audit', '--omit=dev', '--audit-level=moderate', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
const isEndpointFailure = /403 Forbidden|audit endpoint returned an error|ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(combinedOutput);

if (isEndpointFailure) {
  console.warn('Dependency audit could not reach the npm audit endpoint. Treating as an environment warning, not a repository failure.');
  console.warn(combinedOutput.split('\n').slice(0, 12).join('\n'));
  process.exit(0);
}

if (!combinedOutput) {
  console.log('npm audit produced no output.');
  process.exit(result.status ?? 0);
}

let auditJson;
try {
  auditJson = JSON.parse(result.stdout || '{}');
} catch {
  process.stdout.write(combinedOutput);
  process.exit(result.status ?? 1);
}

const vulnerabilities = auditJson.metadata?.vulnerabilities;
if (vulnerabilities) {
  const moderatePlus = (vulnerabilities.moderate || 0) + (vulnerabilities.high || 0) + (vulnerabilities.critical || 0);
  if (moderatePlus > 0) {
    console.error(`Dependency audit found ${moderatePlus} moderate/high/critical vulnerabilities.`);
    console.error(JSON.stringify(vulnerabilities, null, 2));
    process.exit(1);
  }
}

console.log('Dependency audit passed with no moderate/high/critical vulnerabilities.');
