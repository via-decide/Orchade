import { addNpc, advanceNpcRoutines, createVillager, initialNpcState } from '../api';

let state = addNpc(initialNpcState, createVillager('ioren', 'Ioren', 'merchant', 'ioren-flat'));
state = advanceNpcRoutines(state, 8, 'sunny', 'spring');
if (state.profiles.ioren.currentActivity !== 'work') throw new Error('merchant should work at 08:00');
state = advanceNpcRoutines(state, 14, 'storm', 'summer');
if (state.profiles.ioren.currentActivity !== 'shelter') throw new Error('NPC should shelter during storms');
