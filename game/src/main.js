import { CONFIG } from './config.js';
import { createGameState, readonlyView } from './state.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { createFixedLoop } from './loop.js';
import { applyLook, stepPlayer } from './player.js';
import { stepWeapons } from './weapon.js';
import { pushKillFeed, stepCombat } from './combat.js';
import { stepBots } from './bots.js';
import { restartMatch, startMatch, stepRounds } from './rounds.js';

const params = new URLSearchParams(window.location.search);
const requestedShot = params.get('shot');
const shot = requestedShot === 'start' || requestedShot === 'play' || requestedShot === 'end' ? requestedShot : null;
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;
const testMode = params.get('test') === '1';

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
  player.spread = 0.006;
  player.slots[0].mag = 21;
  player.slots[0].reserve = 63;
  player.slots[0].kick = 0.35;
  state.ui.message = 'ROUND 5';
  state.ui.messageTime = 999;
  pushKillFeed(
    state,
    { name: 'Juno', team: 'vanguard' },
    { name: 'Crow', team: 'syndicate' },
    'Harrow AR',
    true,
  );
  pushKillFeed(
    state,
    { name: 'Vesper', team: 'syndicate' },
    { name: 'Halyard', team: 'vanguard' },
    'Kestrel P9',
    false,
  );

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

function advanceWorld(state, dt) {
  state.tick += 1;
  state.time += dt;
  for (let index = 0; index < state.actors.length; index += 1) {
    const actor = state.actors[index];
    actor.prevPosition.copy(actor.position);
    actor.prevYaw = actor.yaw;
    actor.prevPitch = actor.pitch;
  }
  if (state.phase === 'live') stepBots(state, dt);
  stepCombat(state, dt);
  stepRounds(state, dt);
  state.ui.hitMarker = Math.max(0, state.ui.hitMarker - dt);
  state.ui.messageTime = Math.max(0, state.ui.messageTime - dt);
}

function setupEndShot() {
  startMatch(state);
  let elapsed = 0;
  while (state.phase !== 'roundEnd' && elapsed < 126) {
    advanceWorld(state, CONFIG.fixedDt);
    elapsed += CONFIG.fixedDt;
  }
  state.ui.overlay = 'roundEnd';
  state.ui.hudVisible = true;
  state.view.mode = 'player';
  if (state.match.phaseTime <= 0) state.match.phaseTime = CONFIG.round.roundEndSeconds;

  const player = state.player;
  player.alive = true;
  player.health = Math.max(player.health, 55);
  player.position.set(-11.5, 0, -6.5);
  player.prevPosition.copy(player.position);
  player.yaw = 1.14;
  player.prevYaw = 1.14;
  player.pitch = -0.04;
  player.prevPitch = -0.04;
}

function setupTest() {
  startMatch(state);
  const rounds = [];
  let elapsed = 0;
  let liveElapsed = 0;
  let moved = false;
  let autoNext = false;
  let respawnFull = true;
  let deathsMark = 0;

  while (rounds.length < 3 && elapsed < 600) {
    const previousPhase = state.phase;
    if (state.phase === 'live') liveElapsed += CONFIG.fixedDt;
    advanceWorld(state, CONFIG.fixedDt);
    elapsed += CONFIG.fixedDt;

    for (let index = 0; index < state.bots.length; index += 1) {
      const bot = state.bots[index];
      if (Math.hypot(bot.position.x - bot.spawn.x, bot.position.z - bot.spawn.z) > 2.5) moved = true;
    }

    if (previousPhase === 'roundEnd' && state.phase === 'freeze') {
      autoNext = true;
      for (let index = 0; index < state.actors.length; index += 1) {
        const actor = state.actors[index];
        if (!actor.alive || actor.health !== 100) respawnFull = false;
      }
    }

    if (state.phase === 'roundEnd' && previousPhase !== 'roundEnd') {
      let totalDeaths = 0;
      let vanguardAlive = 0;
      let syndicateAlive = 0;
      for (let index = 0; index < state.actors.length; index += 1) {
        const actor = state.actors[index];
        totalDeaths += actor.deaths;
        if (!actor.alive) continue;
        if (actor.team === 'vanguard') vanguardAlive += 1;
        else syndicateAlive += 1;
      }
      rounds.push({
        round: state.match.round,
        winner: state.match.winner,
        reason: state.match.reason,
        liveTime: Number(liveElapsed.toFixed(1)),
        kills: totalDeaths - deathsMark,
        alive: `${vanguardAlive}-${syndicateAlive}`,
      });
      deathsMark = totalDeaths;
      liveElapsed = 0;
    }
  }

  const summary = {
    seed: state.seed,
    rounds,
    moved,
    autoNext: autoNext && rounds.length >= 3,
    respawnFull,
    phase: state.phase,
    bots: state.bots.length,
  };
  document.title = `BOTS ${JSON.stringify(summary)}`;
  document.body.dataset.summary = JSON.stringify(summary);
  state.ui.overlay = 'none';
  state.ui.hudVisible = true;
  state.view.mode = 'player';
  frozen = true;
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
if (testMode) setupTest();

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
    if (!started) {
      started = true;
      startMatch(state);
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
  if (state.phase === 'matchOver') restartMatch(state);
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
  state.tick += 1;
  state.time += dt;

  for (let index = 0; index < state.actors.length; index += 1) {
    const actor = state.actors[index];
    actor.prevPosition.copy(actor.position);
    actor.prevYaw = actor.yaw;
    actor.prevPitch = actor.pitch;
  }

  if (state.phase === 'live') {
    if (snapshot) {
      stepPlayer(state, snapshot, dt);
      stepWeapons(state, snapshot, dt);
    }
    stepBots(state, dt);
  }
  stepCombat(state, dt);
  stepRounds(state, dt);
  state.ui.hitMarker = Math.max(0, state.ui.hitMarker - dt);
  state.ui.messageTime = Math.max(0, state.ui.messageTime - dt);
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
