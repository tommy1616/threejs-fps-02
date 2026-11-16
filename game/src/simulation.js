import { stepPlayer } from './player.js';
import { stepWeapons } from './weapon.js';
import { stepBots } from './bots.js';
import { stepGrenades } from './grenades.js';
import { stepCombat } from './combat.js';
import { stepObjective } from './objective.js';
import { stepRounds } from './rounds.js';

export function advance(state, dt, input = null) {
	state.tick += 1;
	state.time += dt;
	for (let index = 0; index < state.actors.length; index += 1) {
		const actor = state.actors[index];
		actor.prevPosition.copy(actor.position);
		actor.prevYaw = actor.yaw;
		actor.prevPitch = actor.pitch;
	}
	if (state.phase === 'live' || state.phase === 'freeze') {
		if (input && !state.ui.buyOpen) {
			stepPlayer(state, input, dt);
			if (state.phase === 'live') stepWeapons(state, input, dt);
		}
		if (state.phase === 'live') {
			stepBots(state, dt);
			stepGrenades(state, dt);
		}
	}
	stepCombat(state, dt);
	stepObjective(state, input, dt);
	stepRounds(state, dt);
	state.ui.hitMarker = Math.max(0, state.ui.hitMarker - dt);
	state.ui.messageTime = Math.max(0, state.ui.messageTime - dt);
}
