// main.js — boot and wiring.
import { createGameState, readonlyView } from './state.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { createFixedLoop } from './loop.js';
import { applyLook } from './player.js';
import { restartMatch, startMatch } from './rounds.js';
import { buyItem, canBuy } from './economy.js';
import { SHOP } from './weapons.js';
import { advance } from './simulation.js';

const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;
const state = createGameState(seed);
const shot = params.get('shot');
const dev = Boolean(shot) || params.has('test') || params.has('idle') || params.has('dev');
let frozen = dev;
const hud = createHud();
let started = false;
let snapshot = null;

const world = createWorld(document.getElementById('game'), state);
const input = dev ? null : createInput(world.domElement, onLockChange);

if (dev) {
	window.__stage = {
		state,
		advance,
		freeze() { frozen = true; },
		unfreeze() { frozen = false; },
	};
}

window.__game = Object.freeze({
	state: readonlyView(state),
	get tick() { return state.tick; },
	get phase() { return state.phase; },
	get seed() { return state.seed; },
	get shot() { return shot; },
	get frozen() { return frozen; },
});

function setBuyOpen(open) {
	if (dev || !input) return;
	if (open) {
		if (!canBuy(state, state.player)) return;
		state.ui.buyOpen = true;
		state.player.scoped = false;
		if (document.pointerLockElement) document.exitPointerLock();
	} else {
		state.ui.buyOpen = false;
		if (started) input.requestLock();
	}
}

function onLockChange(locked) {
	if (dev) return;
	if (locked) {
		if (!started) {
			started = true;
			startMatch(state);
		}
		state.ui.overlay = 'none';
		state.ui.hudVisible = true;
		state.view.mode = 'player';
		state.ui.buyOpen = false;
	} else if (started && !state.ui.buyOpen) {
		state.ui.overlay = 'pause';
	}
}

hud.onDeploy(() => {
	if (dev || !input) return;
	if (state.phase === 'matchOver') restartMatch(state);
	input.requestLock();
});
hud.onBuy((id) => {
	if (state.ui.buyOpen) buyItem(state, state.player, id);
});
hud.onBuyClose(() => setBuyOpen(false));
hud.onBuyButton(() => setBuyOpen(true));

function beginFrame() {
	if (dev) return;
	snapshot = input.takeSnapshot();
	if (state.ui.buyOpen) {
		if (!canBuy(state, state.player)) setBuyOpen(false);
		else if (snapshot.slotPressed > 0) {
			const item = SHOP[snapshot.slotPressed - 1];
			if (item) buyItem(state, state.player, item.id);
		}
		snapshot.slotPressed = 0;
		snapshot.firePressed = false;
	}
	if (snapshot.buyPressed) {
		if (state.ui.buyOpen) setBuyOpen(false);
		else setBuyOpen(true);
	}
	if (!state.ui.buyOpen && snapshot.locked
		&& state.ui.overlay === 'none' && state.view.mode === 'player') {
		if (snapshot.lookDX !== 0 || snapshot.lookDY !== 0) {
			applyLook(state.player, snapshot.lookDX, snapshot.lookDY);
		}
	}
	if (snapshot.enterPressed && state.phase === 'matchOver') restartMatch(state);
	snapshot.enterPressed = false;
	snapshot.buyPressed = false;
	snapshot.lookDX = 0;
	snapshot.lookDY = 0;
}

function simulate(state, dt) {
	if (frozen) return;
	const overlay = state.ui.overlay;
	if (overlay === 'menu' || overlay === 'pause' || overlay === 'matchOver') return;
	advance(state, dt, snapshot);
}

let firstFrame = true;

function render(alpha) {
	world.render(state, alpha);
	hud.sync(state);
	if (firstFrame) {
		firstFrame = false;
		document.body.dataset.ready = '1';
		window.__shotReady = true;
	}
}

createFixedLoop({ state, simulate, render, beginFrame }).start();
