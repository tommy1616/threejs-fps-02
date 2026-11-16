import { CONFIG } from './config.js';
import { createGameState, readonlyView } from './state.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { createFixedLoop } from './loop.js';
import { applyLook, stepPlayer } from './player.js';

const params = new URLSearchParams(window.location.search);
const requestedShot = params.get('shot');
const shot = requestedShot === 'start' || requestedShot === 'play' || requestedShot === 'end' ? requestedShot : null;
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

const state = createGameState(seed);
const hud = createHud();
let frozen = Boolean(shot);
let started = false;
let snapshot = null;

const MOVE = CONFIG.movement;

function placeActor(actor, x, z, yaw, pitch = 0) {
  actor.position.set(x, 0, z);
  actor.prevPosition.copy(actor.position);
  actor.velocity.set(0, 0, 0);
  actor.yaw = yaw;
  actor.prevYaw = yaw;
  actor.pitch = pitch;
  actor.prevPitch = pitch;
  actor.eye = MOVE.standEye;
  actor.height = MOVE.standHeight;
  actor.crouching = false;
  actor.onGround = true;
  actor.alive = true;
  actor.health = 100;
}

function setTracer(index, x, y, z, tx, ty, tz) {
  const tracer = state.tracers[index];
  const dx = tx - x;
  const dy = ty - y;
  const dz = tz - z;
  const length = Math.hypot(dx, dy, dz) || 1;
  tracer.active = true;
  tracer.x = x;
  tracer.y = y;
  tracer.z = z;
  tracer.dx = dx / length;
  tracer.dy = dy / length;
  tracer.dz = dz / length;
  tracer.length = length;
  tracer.life = 10;
  tracer.maxLife = 10;
  tracer.team = 'vanguard';
}

function setupPlayShot() {
  state.phase = 'live';
  state.view.mode = 'player';
  state.ui.hudVisible = true;
  state.ui.overlay = 'none';
  state.match.round = 5;
  state.match.phaseTime = 83;
  state.match.score.vanguard = 2;
  state.match.score.syndicate = 2;
  state.money.vanguard = 2600;
  state.money.syndicate = 3150;

  const player = state.player;
  placeActor(player, 0, 14.2, 0, -0.015);
  player.health = 84;
  player.armor = 62;
  player.money = 2600;
  player.slot = 0;
  player.slots[0].mag = 21;
  player.slots[0].reserve = 63;

  const vanguardSpots = [
    [-3.2, 7.4, 0.18],
    [3.2, 8, -0.22],
    [-8, 6.5, 0.08],
    [8, 7, -0.1],
  ];
  const syndicateSpots = [
    [-1.4, 6, Math.PI],
    [1.8, 7, Math.PI - 0.2],
    [-0.2, 3.6, Math.PI],
    [2.4, 4.8, Math.PI + 0.1],
    [-2.6, 8.8, Math.PI],
  ];

  const friends = state.actors.filter((actor) => actor.team === 'vanguard' && !actor.isPlayer);
  const enemies = state.actors.filter((actor) => actor.team === 'syndicate');
  for (let index = 0; index < friends.length; index += 1) {
    const spot = vanguardSpots[index];
    placeActor(friends[index], spot[0], spot[1], spot[2]);
  }
  for (let index = 0; index < enemies.length; index += 1) {
    const spot = syndicateSpots[index];
    placeActor(enemies[index], spot[0], spot[1], spot[2]);
  }

  setTracer(0, 0.28, 1.38, 13.5, 1.8, 1.18, 7);
  setTracer(1, -2.4, 1.31, 10.6, 1.4, 1.2, 6.2);
}

function setupEndShot() {
  state.phase = 'roundEnd';
  state.view.mode = 'player';
  state.ui.hudVisible = true;
  state.ui.overlay = 'roundEnd';
  state.match.round = 4;
  state.match.phaseTime = 0;
  state.match.score.vanguard = 1;
  state.match.score.syndicate = 0;
  state.match.winner = 'vanguard';
  state.match.reason = 'Surge charge defused at Brine Hall.';
  state.objective.state = 'defused';
  state.objective.site = 'A';

  const player = state.player;
  placeActor(player, -11.5, -6.5, 1.14, -0.04);
  player.health = 63;
  player.armor = 48;
  player.money = 3400;
  player.slots[0].mag = 11;
  player.slots[0].reserve = 33;

  const friends = state.actors.filter((actor) => actor.team === 'vanguard' && !actor.isPlayer);
  const spots = [
    [-15.7, -8.2, 2.4],
    [-14.2, -10.5, 1.6],
    [-18.5, -11.5, 0.5],
    [-13, -7, 2.0],
  ];
  for (let index = 0; index < friends.length; index += 1) {
    const spot = spots[index];
    placeActor(friends[index], spot[0], spot[1], spot[2]);
  }

  for (const actor of state.actors) {
    if (actor.team === 'syndicate') actor.alive = false;
  }
}

function setupStartShot() {
  state.phase = 'menu';
  state.view.mode = 'menu';
  state.ui.hudVisible = false;
  state.ui.overlay = 'menu';
}

if (shot === 'play') setupPlayShot();
else if (shot === 'end') setupEndShot();
else if (shot === 'start') setupStartShot();

const world = createWorld(document.getElementById('game'), state);
const input = shot ? null : createInput(world.domElement, onLockChange);

window.__game = Object.freeze({
  state: readonlyView(state),
  get tick() { return state.tick; },
  get phase() { return state.phase; },
  get seed() { return state.seed; },
  get shot() { return shot; },
  get frozen() { return frozen; },
});

function onLockChange(locked) {
  if (shot) return;
  if (locked) {
    started = true;
    if (state.phase === 'menu') {
      state.phase = 'live';
      state.match.phaseTime = CONFIG.round.liveSeconds;
    }
    state.ui.overlay = 'none';
    state.ui.hudVisible = true;
    state.view.mode = 'player';
    state.ui.buyOpen = false;
  } else if (started) {
    state.ui.overlay = 'pause';
  }
}

hud.onDeploy(() => {
  if (shot || !input) return;
  input.requestLock();
});

function beginFrame() {
  if (shot) return;
  snapshot = input.takeSnapshot();
  if (snapshot.locked && state.ui.overlay === 'none' && state.view.mode === 'player') {
    if (snapshot.lookDX !== 0 || snapshot.lookDY !== 0) {
      applyLook(state.player, snapshot.lookDX, snapshot.lookDY);
    }
    if (snapshot.buyPressed) state.ui.buyOpen = !state.ui.buyOpen;
  } else {
    state.ui.buyOpen = false;
  }
  snapshot.buyPressed = false;
  snapshot.lookDX = 0;
  snapshot.lookDY = 0;
}

function simulate(state, dt) {
  if (frozen || state.ui.overlay !== 'none') return;
  state.tick += 1;
  state.time += dt;

  for (let index = 0; index < state.actors.length; index += 1) {
    const actor = state.actors[index];
    actor.prevPosition.copy(actor.position);
    actor.prevYaw = actor.yaw;
    actor.prevPitch = actor.pitch;
  }

  if (snapshot) stepPlayer(state, snapshot, dt);
  if (state.phase === 'live') state.match.phaseTime = Math.max(0, state.match.phaseTime - dt);
  state.ui.hitMarker = Math.max(0, state.ui.hitMarker - dt);
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

const loop = createFixedLoop({
  state,
  simulate,
  render,
  beginFrame,
});

loop.start();
