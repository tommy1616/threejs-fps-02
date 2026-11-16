// shots.js — screenshot/test setups.
import { CONFIG } from './config.js';
import { startMatch } from './rounds.js';
import { pushKillFeed } from './combat.js';
import { createWeapon, WEAPONS } from './weapons.js';
import { stepGrenades, throwGrenade } from './grenades.js';
import { advance } from './simulation.js';

const MOVE = CONFIG.movement;
const shotNames = ['start', 'play', 'plant', 'buy'];

function place(actor, x, z, yaw, pitch = 0) {
	actor.position.set(x, 0, z);
	actor.prevPosition.copy(actor.position);
	actor.velocity.set(0, 0, 0);
	actor.yaw = actor.prevYaw = yaw;
	actor.pitch = actor.prevPitch = pitch;
	actor.eye = MOVE.standEye;
	actor.height = MOVE.standHeight;
	actor.crouching = false;
	actor.onGround = true;
	actor.alive = true;
	actor.health = 100;
}

function primary(player, id = 'harrow', mag, reserve) {
	player.slots[0] = createWeapon(WEAPONS.find((weapon) => weapon.id === id));
	player.slot = 0;
	if (mag !== undefined) player.slots[0].mag = mag;
	if (reserve !== undefined) player.slots[0].reserve = reserve;
}

function live(state, round, v, s, time) {
	state.phase = 'live';
	state.view.mode = 'player';
	state.ui.hudVisible = true;
	state.ui.overlay = 'none';
	state.ui.message = '';
	state.ui.messageTime = 0;
	state.match.round = round;
	state.match.phaseTime = time;
	state.match.score.vanguard = v;
	state.match.score.syndicate = s;
}

function team(state, name, spots) {
	const actors = state.actors.filter((actor) => actor.team === name && !actor.isPlayer);
	for (let index = 0; index < actors.length && index < spots.length; index += 1) {
		place(actors[index], ...spots[index]);
	}
}

function tracer(state, index, a, b) {
	const item = state.tracers[index];
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const dz = b[2] - a[2];
	const length = Math.hypot(dx, dy, dz) || 1;
	Object.assign(item, {
		active: true,
		x: a[0],
		y: a[1],
		z: a[2],
		dx: dx / length,
		dy: dy / length,
		dz: dz / length,
		length,
		life: 10,
		maxLife: 10,
		team: 'vanguard',
	});
}

function start(state) {
	state.phase = 'menu';
	state.view.mode = 'menu';
	state.ui.hudVisible = false;
	state.ui.overlay = 'menu';
}

function play(state) {
	live(state, 5, 2, 2, 83);
	const player = state.player;
	place(player, 0, 14.2, 0, -0.015);
	Object.assign(player, { health: 84, armor: 62, money: 2600, spread: 0.006 });
	primary(player, 'harrow', 21, 63);
	player.slots[0].kick = 0.35;
	state.ui.message = 'ROUND 5';
	state.ui.messageTime = 999;
	pushKillFeed(state, { name: 'Juno', team: 'vanguard' }, { name: 'Crow', team: 'syndicate' }, 'Harrow AR', true);
	pushKillFeed(state, { name: 'Vesper', team: 'syndicate' }, { name: 'Halyard', team: 'vanguard' }, 'Kestrel P9', false);
	team(state, 'vanguard', [[-3.2, 7.4, 0.18], [3.2, 8, -0.22], [-8, 6.5, 0.08], [8, 7, -0.1]]);
	team(state, 'syndicate', [[-1.4, 6, Math.PI], [1.8, 7, Math.PI - 0.2], [-0.2, 3.6, Math.PI], [2.4, 4.8, Math.PI + 0.1], [-2.6, 8.8, Math.PI]]);
	tracer(state, 0, [0.28, 1.38, 13.5], [1.8, 1.18, 7]);
	tracer(state, 1, [-2.4, 1.31, 10.6], [1.4, 1.2, 6.2]);
}

function plant(state) {
	live(state, 3, 1, 1, 74);
	const player = state.player;
	place(player, -15, -12.2, 2.58, -0.14);
	player.team = 'vanguard';
	Object.assign(player, { health: 92, armor: 35, money: 2100 });
	primary(player, 'harrow', 18, 60);
	Object.assign(state.objective, {
		state: 'carried', site: 'A', attackSite: 'A', carrierId: player.id,
		planted: false, timer: 0, plantProgress: 0.6, defuseProgress: 0,
		hint: 'Hold E to plant', result: null, x: player.position.x, z: player.position.z,
	});
	team(state, 'vanguard', [[-18.5, -6, 1.2], [-13, -10.5, 0.6], [-19.5, -11.5, 1.4], [-12, -6, 0.9]]);
	team(state, 'syndicate', [[-20.5, -9, -1.6], [-14, -5, -2.2], [-13, -13, -2.8], [-20, -14, -1.4], [-11, -9, -2.1]]);
}

function buy(state) {
	state.phase = 'freeze';
	state.match.phaseTime = CONFIG.round.freezeSeconds;
	state.match.round = 3;
	state.match.score.vanguard = 1;
	state.match.score.syndicate = 1;
	state.view.mode = 'player';
	state.ui.hudVisible = true;
	state.ui.overlay = 'none';
	state.ui.buyOpen = true;
	state.ui.message = '';
	state.ui.messageTime = 0;
	const player = state.player;
	place(player, player.spawn.x, player.spawn.z, player.spawn.yaw);
	player.money = 4200;
}

const SHOTS = { start, play, plant, buy };

function publish(prefix, summary) {
	document.title = `${prefix} ${JSON.stringify(summary)}`;
	document.body.dataset.summary = JSON.stringify(summary);
}

function nadeTest(state) {
	live(state, 1, 0, 0, 100);
	state.match.setupTime = 0;
	const player = state.player;
	place(player, 0, 14, 0);
	player.grenades.frag = 1;
	throwGrenade(state, player, 'frag', false);
	let blastSeen = false;
	let fuseTime = null;
	for (let step = 0; step < 180; step += 1) {
		stepGrenades(state, CONFIG.fixedDt);
		if (!blastSeen && state.blasts.some((item) => item.active)) {
			blastSeen = true;
			fuseTime = Number(((step + 1) * CONFIG.fixedDt).toFixed(2));
		}
	}
	publish('NADE', {
		blastSeen,
		fuseTime,
		activeFrags: state.grenades.filter((item) => item.active && item.kind === 'frag').length,
	});
}

function idleTest(state) {
	startMatch(state);
	const carrier = state.objective.carrierId === 'p0';
	let elapsed = 0;
	let liveTime = 0;
	let contact = null;
	while (liveTime < 70 && elapsed < 200 && state.phase !== 'roundEnd' && state.phase !== 'matchOver') {
		const wasLive = state.phase === 'live';
		advance(state, CONFIG.fixedDt);
		elapsed += CONFIG.fixedDt;
		if (wasLive) liveTime += CONFIG.fixedDt;
		if (contact === null) {
			for (let index = 0; index < state.actors.length; index += 1) {
				const actor = state.actors[index];
				if (!actor.alive || actor.health < 100) {
					contact = liveTime;
					break;
				}
			}
		}
	}
	let kills = 0;
	let vAlive = 0;
	let sAlive = 0;
	for (let index = 0; index < state.actors.length; index += 1) {
		const actor = state.actors[index];
		kills += actor.deaths;
		if (!actor.alive) continue;
		if (actor.team === 'vanguard') vAlive += 1;
		else sAlive += 1;
	}
	publish('IDLE', {
		carrier,
		live: Number(liveTime.toFixed(1)),
		contact: contact === null ? null : Number(contact.toFixed(1)),
		kills,
		objective: state.objective.state,
		alive: `${vAlive}-${sAlive}`,
	});
}

function botsTest(state) {
	state.testMode = true;
	state.player.isPlayer = false;
	state.bots.push(state.player);
	startMatch(state);
	const rounds = [];
	let elapsed = 0;
	let liveTime = 0;
	let moved = false;
	let autoNext = false;
	let respawnFull = true;
	let deaths = 0;
	let planted = false;
	let site = null;
	let contact = null;
	while (rounds.length < 6 && elapsed < 1200) {
		const before = state.phase;
		if (state.phase === 'live') liveTime += CONFIG.fixedDt;
		advance(state, CONFIG.fixedDt);
		elapsed += CONFIG.fixedDt;
		if (contact === null && state.phase === 'live') {
			for (let index = 0; index < state.actors.length; index += 1) {
				const actor = state.actors[index];
				if (!actor.alive || actor.health < 100) {
					contact = liveTime;
					break;
				}
			}
		}
		if (['planted', 'defused', 'detonated'].includes(state.objective.state)) {
			planted = true;
			site = state.objective.site || site;
		}
		for (let index = 0; index < state.bots.length; index += 1) {
			const bot = state.bots[index];
			if (Math.hypot(bot.position.x - bot.spawn.x, bot.position.z - bot.spawn.z) > 2.5) moved = true;
		}
		if (before === 'roundEnd' && state.phase === 'freeze') {
			autoNext = true;
			for (let index = 0; index < state.actors.length; index += 1) {
				const actor = state.actors[index];
				if (!actor.alive || actor.health !== 100) respawnFull = false;
			}
			planted = false;
			site = null;
			contact = null;
		}
		if (state.phase === 'roundEnd' && before !== 'roundEnd') {
			let total = 0;
			let vAlive = 0;
			let sAlive = 0;
			for (let index = 0; index < state.actors.length; index += 1) {
				const actor = state.actors[index];
				total += actor.deaths;
				if (!actor.alive) continue;
				if (actor.team === 'vanguard') vAlive += 1;
				else sAlive += 1;
			}
			rounds.push({
				round: state.match.round,
				winner: state.match.winner,
				reason: state.match.reason,
				liveTime: Number(liveTime.toFixed(1)),
				contact: contact === null ? null : Number(contact.toFixed(1)),
				kills: total - deaths,
				alive: `${vAlive}-${sAlive}`,
				planted,
				site,
			});
			deaths = total;
			liveTime = 0;
		}
	}
	publish('BOTS', {
		seed: state.seed,
		rounds,
		moved,
		autoNext: autoNext && rounds.length >= 6,
		respawnFull,
		phase: state.phase,
		bots: state.bots.length,
	});
}

export function setupScenario(state, params) {
	const requested = params.get('shot');
	const shot = shotNames.includes(requested) ? requested : null;
	const carrier = params.get('carrier');
	state.forceCarrier = carrier === '1' ? 'player' : carrier === '0' ? 'bot' : null;
	let frozen = Boolean(shot);
	if (shot) SHOTS[shot](state);
	else if (params.get('test') === 'nade') {
		nadeTest(state);
		frozen = true;
	} else if (params.get('idle') === '1') {
		idleTest(state);
		frozen = true;
	} else if (params.get('test') === '1') {
		botsTest(state);
		frozen = true;
	}
	if (frozen && shot !== 'start') {
		if (state.ui.overlay === 'menu') state.ui.overlay = 'none';
		state.ui.hudVisible = true;
		state.view.mode = 'player';
	}
	return { shot, frozen };
}
