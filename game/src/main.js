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
import { stepObjective } from './objective.js';
import { buyItem, canBuy } from './economy.js';
import { createWeapon, SHOP, WEAPONS } from './weapons.js';
import { stepGrenades } from './grenades.js';

const params = new URLSearchParams(window.location.search);
const requestedShot = params.get('shot');
const shot = ['start', 'play', 'end', 'plant', 'defuse', 'buy', 'nade'].includes(requestedShot) ? requestedShot : null;
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

function givePrimary(player, id = 'harrow') {
  player.slots[0] = createWeapon(WEAPONS.find((weapon) => weapon.id === id));
  player.slot = 0;
}

function liveShot(round, v, s, time) {
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
  liveShot(5, 2, 2, 83);
  const player = state.player;
  placeActor(player, 0, 14.2, 0, -0.015);
  player.health = 84;
  player.armor = 62;
  player.money = 2600;
  givePrimary(player);
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
  if (state.phase === 'live') {
    stepBots(state, dt);
    stepGrenades(state, dt);
  }
  stepCombat(state, dt);
  stepObjective(state, null, dt);
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
  givePrimary(player);
  player.position.set(-11.5, 0, -6.5);
  player.prevPosition.copy(player.position);
  player.yaw = 1.14;
  player.prevYaw = 1.14;
  player.pitch = -0.04;
  player.prevPitch = -0.04;
}

function placeTeam(state, team, spots) {
  const actors = state.actors.filter((actor) => actor.team === team && !actor.isPlayer);
  for (let index = 0; index < actors.length && index < spots.length; index += 1) {
    const spot = spots[index];
    placeActor(actors[index], spot[0], spot[1], spot[2]);
  }
}

function setupPlantShot() {
  liveShot(3, 1, 1, 74);
  const player = state.player;
  placeActor(player, -15, -12.2, 2.58, -0.14);
  player.team = 'vanguard';
  player.health = 92;
  player.armor = 35;
  player.money = 2100;
  givePrimary(player);
  player.slots[0].mag = 18;
  player.slots[0].reserve = 60;

  Object.assign(state.objective, {
    state: 'carried', site: 'A', attackSite: 'A', carrierId: player.id,
    planted: false, timer: 0, plantProgress: 0.6, defuseProgress: 0,
    hint: 'Hold E to plant', result: null, x: player.position.x, z: player.position.z,
  });

  placeTeam(state, 'vanguard', [[-18.5, -6, 1.2], [-13, -10.5, 0.6], [-19.5, -11.5, 1.4], [-12, -6, 0.9]]);
  placeTeam(state, 'syndicate', [[-20.5, -9, -1.6], [-14, -5, -2.2], [-13, -13, -2.8], [-20, -14, -1.4], [-11, -9, -2.1]]);
}

function setupDefuseShot() {
  liveShot(9, 4, 4, 74);
  const player = state.player;
  player.team = 'syndicate';
  placeActor(player, -14.9, -9.4, 2.0, -0.4);
  player.health = 76;
  player.armor = 40;
  player.money = 3900;
  givePrimary(player);
  player.slots[0].mag = 14;
  player.slots[0].reserve = 45;

  Object.assign(state.objective, {
    state: 'planted', site: 'A', attackSite: 'A', carrierId: null,
    planted: true, timer: 31, plantProgress: 1, defuseProgress: 0.55,
    defuserId: player.id, hint: 'Defusing relay charge', result: null,
    x: -16.2, z: -8.8,
  });

  placeTeam(state, 'syndicate', [[-19, -6, 1.9], [-13.5, -11.5, 0.7], [-20.5, -12, 1.4], [-12, -6.5, 1.0]]);
  placeTeam(state, 'vanguard', [[-20, -4.5, -2.2], [-12, -8.5, -1.6], [-18, -13.5, -2.6], [-11, -13, -1.9], [-16, -3.5, -3.0]]);
}

function setupNadeShot() {
  liveShot(4, 2, 2, 62);
  const player = state.player;
  placeActor(player, -12.5, -5, 0.9, -0.08);
  givePrimary(player);
  player.health = 78;
  player.armor = 50;
  player.money = 3100;
  Object.assign(state.objective, {
    state: 'planted', planted: true, site: 'A', attackSite: 'A', timer: 28,
    plantProgress: 1, x: -17, z: -9, hint: '', result: null,
  });
  Object.assign(state.smokes[0], { active: true, x: -17, y: 1, z: -9, radius: 4.5, ttl: 12, maxTtl: 15 });
  Object.assign(state.blasts[0], { active: true, x: -15.5, y: 1, z: -7.5, ttl: 0.3, maxTtl: 0.35 });
  Object.assign(state.grenades[0], { active: true, kind: 'smoke', x: -13, y: 2.2, z: -7 });
  state.player.shake = 0.8;
}

function setupBuyShot() {
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
  placeActor(player, player.spawn.x, player.spawn.z, player.spawn.yaw);
  player.money = 4200;
}

function setupTest() {
  state.testMode = true;
  state.player.isPlayer = false;
  state.bots.push(state.player);
  startMatch(state);
  const rounds = [];
  let elapsed = 0;
  let liveElapsed = 0;
  let moved = false;
  let autoNext = false;
  let respawnFull = true;
  let deathsMark = 0;
  let planted = false;
  let plantSite = null;
  const loadout = (team) => {
    const counts = {};
    for (let index = 0; index < state.actors.length; index += 1) {
      const actor = state.actors[index];
      if (actor.team !== team) continue;
      const gun = actor.slots[0] || actor.slots[1];
      counts[gun.name] = (counts[gun.name] || 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => `${count}x ${name}`).join(', ');
  };
  let gear = { v: loadout('vanguard'), s: loadout('syndicate') };

  while (rounds.length < 4 && elapsed < 900) {
    const previousPhase = state.phase;
    if (state.phase === 'live') liveElapsed += CONFIG.fixedDt;
    advanceWorld(state, CONFIG.fixedDt);
    elapsed += CONFIG.fixedDt;

    if (state.objective.state === 'planted' || state.objective.state === 'defused' || state.objective.state === 'detonated') {
      planted = true;
      plantSite = state.objective.site ?? plantSite;
    }

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
      planted = false;
      plantSite = null;
      gear = { v: loadout('vanguard'), s: loadout('syndicate') };
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
        planted,
        site: plantSite,
        v: gear.v,
        s: gear.s,
      });
      deathsMark = totalDeaths;
      liveElapsed = 0;
    }
  }

  const summary = {
    seed: state.seed,
    rounds,
    moved,
    autoNext: autoNext && rounds.length >= 4,
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
else if (shot === 'plant') setupPlantShot();
else if (shot === 'defuse') setupDefuseShot();
else if (shot === 'buy') setupBuyShot();
else if (shot === 'nade') setupNadeShot();
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

function setBuyOpen(open) {
  if (shot || !input) return;
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
  } else if (started && !state.ui.buyOpen) {
    state.ui.overlay = 'pause';
  }
}

hud.onDeploy(() => {
  if (shot || !input) return;
  if (state.phase === 'matchOver') restartMatch(state);
  input.requestLock();
});
hud.onBuy((id) => {
  if (state.ui.buyOpen) buyItem(state, state.player, id);
});
hud.onBuyClose(() => setBuyOpen(false));
hud.onBuyButton(() => setBuyOpen(true));

function beginFrame() {
  if (shot) return;
  snapshot = input.takeSnapshot();
  if (state.ui.buyOpen) {
    if (!canBuy(state, state.player)) {
      setBuyOpen(false);
    } else if (snapshot.slotPressed > 0) {
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
  if (!state.ui.buyOpen && snapshot.locked && state.ui.overlay === 'none' && state.view.mode === 'player') {
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
  state.tick += 1;
  state.time += dt;

  for (let index = 0; index < state.actors.length; index += 1) {
    const actor = state.actors[index];
    actor.prevPosition.copy(actor.position);
    actor.prevYaw = actor.yaw;
    actor.prevPitch = actor.pitch;
  }

  if (state.phase === 'live' || state.phase === 'freeze') {
    if (snapshot && !state.ui.buyOpen) {
      stepPlayer(state, snapshot, dt);
      if (state.phase === 'live') stepWeapons(state, snapshot, dt);
    }
    if (state.phase === 'live') {
      stepBots(state, dt);
      stepGrenades(state, dt);
    }
  }
  stepCombat(state, dt);
  stepObjective(state, snapshot, dt);
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
