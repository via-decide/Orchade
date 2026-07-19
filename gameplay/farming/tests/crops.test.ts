import { createHybridCropDefinition, getCropDefinition } from '../api';

const basic = getCropDefinition('Basic');
const quartz = getCropDefinition('Quartz-Fern');
const hybrid = createHybridCropDefinition(basic, quartz);

if (!hybrid.seasons.includes('winter')) throw new Error('hybrid seasons should merge parents');
if (hybrid.harvests !== Math.max(basic.harvests, quartz.harvests)) throw new Error('hybrid harvests should use best parent');
if (getCropDefinition('missing').id !== 'Basic') throw new Error('unknown crops should fall back safely');
