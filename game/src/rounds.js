// rounds.js — round flow.
import { CONFIG } from './config.js';
import { resetBots } from './bots.js';
import { setupCharge } from './objective.js';
import { createWeapon, DEFAULT_WEAPON } from './weapons.js';
import { addMoney, botBuy, ECONOMY } from './economy.js';
import { emitSound } from './audio.js';

const MOVE = CONFIG.movement;
const ROUND = CONFIG.round;

function aliveCount(state, team) {
	let count = 0;
	for (let index = 0; index < state.actors.length; index += 1) {
		const actor = state.actors[index];
		if (actor.alive && actor.team === team) count += 1;
	}
	return count;
}

function resetActor(state, actor) {
	const survived = actor.alive && state.match.roundsPlayed > 0;
	actor.position.set(actor.spawn.x, 0, actor.spawn.z);
	actor.prevPosition.copy(actor.position);
	actor.velocity.set(0, 0, 0);
	actor.yaw = actor.spawn.yaw;
	actor.prevYaw = actor.yaw;
	actor.pitch = 0;
	actor.prevPitch = 0;
	actor.eye = MOVE.standEye;
	actor.height = MOVE.standHeight;
	actor.crouching = false;
	actor.onGround = true;
	actor.alive = true;
	actor.health = 100;
	actor.spread = 0;
	actor.scoped = false;
	actor.shotIndex = 0;
	actor.shake = 0;
	actor.stepTimer = 0;
	actor.recoilPitch = 0;
	actor.recoilYaw = 0;
	if (!survived) {
		actor.slots[0] = null;
		actor.slots[1] = createWeapon(DEFAULT_WEAPON);
		actor.grenades.frag = 0;
		actor.grenades.smoke = 0;
		actor.armor = 0;
		actor.helmet = false;
		actor.kit = false;
	}
	actor.slot = actor.slots[0] ? 0 : 1;
	actor.lastSlot = actor.slot;
	for (let index = 0; index < 2; index += 1) {
		const weapon = actor.slots[index];
		if (!weapon) continue;
		weapon.mag = weapon.magazine;
		weapon.reserve = weapon.reserveMax;
		weapon.reloadLeft = 0;
		weapon.fireCooldown = 0;
		weapon.emptyClick = 0;
		weapon.kick = 0;
		weapon.muzzleFlash = 0;
	}
}

function clearPools(state) {
	for (let index = 0; index < state.tracers.length; index += 1) state.tracers[index].active = false;
	for (let index = 0; index < state.noises.items.length; index += 1) state.noises.items[index].active = false;
	for (let index = 0; index < state.killFeed.items.length; index += 1) state.killFeed.items[index].active = false;
	for (let index = 0; index < state.grenades.length; index += 1) state.grenades[index].active = false;
	for (let index = 0; index < state.smokes.length; index += 1) state.smokes[index].active = false;
	for (let index = 0; index < state.blasts.length; index += 1) state.blasts[index].active = false;
	for (let index = 0; index < state.sounds.length; index += 1) state.sounds[index].active = false;
}

function swapPlayer(state) {
	const player = state.player;
	let bot = state.bots.find((actor) => actor.id === state.match.swappedBotId)
		?? state.bots.find((actor) => actor.team !== player.team);
	if (!bot) return;
	const team = player.team;
	player.team = bot.team;
	bot.team = team;
	const spawn = player.spawn;
	player.spawn = bot.spawn;
	bot.spawn = spawn;
	state.match.swappedBotId = player.team === 'vanguard' ? null : bot.id;
}

export function startRound(state) {
	const switched = state.match.round === 8 && !state.match.sidesSwitched;
	if (switched) {
		swapPlayer(state);
		state.match.sidesSwitched = true;
	}
	state.phase = 'freeze';
	state.match.phaseTime = ROUND.freezeSeconds;
	state.match.setupTime = 35;
	state.match.winner = null;
	state.match.reason = '';
	state.ui.overlay = 'none';
	state.ui.hudVisible = true;
	state.ui.buyOpen = false;
	state.ui.message = switched ? 'SIDES SWITCHED' : `ROUND ${state.match.round}`;
	state.ui.messageTime = switched ? 4 : 2;
	for (let index = 0; index < state.actors.length; index += 1) resetActor(state, state.actors[index]);
	clearPools(state);
	setupCharge(state);
	resetBots(state);
	botBuy(state);
	emitSound(state, 'roundStart', state.player.position.x, 1, state.player.position.z);
}

export function startMatch(state) {
	if (state.match.sidesSwitched) swapPlayer(state);
	state.match.sidesSwitched = false;
	state.match.swappedBotId = null;
	state.match.round = 1;
	state.match.roundsPlayed = 0;
	state.match.score.vanguard = 0;
	state.match.score.syndicate = 0;
	state.match.winner = null;
	state.match.reason = '';
	state.match.lossStreak.vanguard = 1;
	state.match.lossStreak.syndicate = 1;
	for (let index = 0; index < state.actors.length; index += 1) {
		state.actors[index].money = ECONOMY.start;
		state.actors[index].kills = 0;
		state.actors[index].deaths = 0;
		state.actors[index].slot = 0;
	}
	startRound(state);
}

function awardMoney(state, winner, objectiveWin) {
	const loser = winner === 'vanguard' ? 'syndicate' : 'vanguard';
	const loss = ECONOMY.losses[Math.min(ECONOMY.losses.length - 1, state.match.lossStreak[loser] - 1)];
	state.match.lossStreak[loser] = Math.min(5, state.match.lossStreak[loser] + 1);
	state.match.lossStreak[winner] = 1;
	const win = objectiveWin ? ECONOMY.objectiveWin : ECONOMY.win;
	for (let index = 0; index < state.actors.length; index += 1) {
		const actor = state.actors[index];
		addMoney(actor, actor.team === winner ? win : loss);
	}
}

export function endRound(state, winner, reason, objectiveWin = false) {
	if (state.phase !== 'live') return;
	state.phase = 'roundEnd';
	state.match.phaseTime = ROUND.roundEndSeconds;
	state.match.winner = winner;
	state.match.reason = reason;
	state.match.score[winner] += 1;
	state.match.roundsPlayed += 1;
	state.player.scoped = false;
	state.ui.overlay = 'roundEnd';
	state.ui.hudVisible = true;
	emitSound(state, 'roundEnd', state.player.position.x, 1, state.player.position.z);
	awardMoney(state, winner, objectiveWin);
	if (state.objective.wasPlanted) {
		for (let index = 0; index < state.actors.length; index += 1) {
			if (state.actors[index].team === 'vanguard') addMoney(state.actors[index], ECONOMY.plant);
		}
	}
}

export function restartMatch(state) {
	startMatch(state);
}

export function stepRounds(state, dt) {
	if (state.phase === 'freeze') {
		state.match.phaseTime = Math.max(0, state.match.phaseTime - dt);
		if (state.match.phaseTime === 0) {
			state.phase = 'live';
			state.match.phaseTime = ROUND.liveSeconds;
			state.ui.message = '';
			state.ui.messageTime = 0;
		}
		return;
	}

	if (state.phase === 'live') {
		const objective = state.objective;
		if (objective.result) {
			const result = objective.result;
			objective.result = null;
			endRound(state, result.winner, result.reason, true);
			return;
		}
		state.match.setupTime = Math.max(0, state.match.setupTime - dt);
		if (!objective.planted) state.match.phaseTime = Math.max(0, state.match.phaseTime - dt);
		const vanguard = aliveCount(state, 'vanguard');
		const syndicate = aliveCount(state, 'syndicate');
		if (objective.planted) return;
		if (syndicate === 0) endRound(state, 'vanguard', 'Vanguard eliminated the Syndicate.');
		else if (vanguard === 0) endRound(state, 'syndicate', 'Syndicate eliminated Vanguard before the charge.');
		else if (state.match.phaseTime === 0) endRound(state, 'syndicate', 'Time expired — Syndicate hold the depot.');
		return;
	}

	if (state.phase === 'roundEnd') {
		state.match.phaseTime = Math.max(0, state.match.phaseTime - dt);
		if (state.match.phaseTime > 0) return;
		if (state.match.score.vanguard >= ROUND.roundsToWin || state.match.score.syndicate >= ROUND.roundsToWin) {
			state.phase = 'matchOver';
			state.match.winner = state.match.score.vanguard > state.match.score.syndicate ? 'vanguard' : 'syndicate';
			state.ui.overlay = 'matchOver';
			state.ui.hudVisible = true;
		} else {
			state.match.round += 1;
			startRound(state);
		}
	}
}
