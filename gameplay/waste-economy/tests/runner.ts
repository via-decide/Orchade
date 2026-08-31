/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { runCompostingTests } from './composting.test';
import { runContaminationTests } from './contamination.test';
import { runRoutingTests } from './routing.test';

const suites = [
  { name: 'Composting', run: runCompostingTests },
  { name: 'Contamination', run: runContaminationTests },
  { name: 'Routing', run: runRoutingTests },
];

let totalPassed = 0;
let totalFailed = 0;

console.log('\n═══ Waste Economy Module Tests ═══\n');

for (const suite of suites) {
  console.log(`▸ ${suite.name}`);
  const { passed, failed, results } = suite.run();
  for (const r of results) console.log(r);
  totalPassed += passed;
  totalFailed += failed;
  console.log('');
}

console.log(`═══ Results: ${totalPassed} passed, ${totalFailed} failed ═══\n`);

if (totalFailed > 0) {
  process.exit(1);
}
