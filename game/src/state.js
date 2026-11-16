import * as THREE from 'three';
import { CONFIG } from './config.js';
import { MAP } from './map.js';
import { mulberry32, normalizeSeed } from './rng.js';
import { WEAPONS } from './weapons.js';

const VANGUARD_NAMES = ['Brass', 'Halyard', 'Juno', 'Flint'];
const SYNDICATE_NAMES = ['Crow', 'Vesper', 'Moss', 'Dahl', 'Rook'];
const VANGUARD_ROLES = ['support', 'anchor', 'rotator', 'support'];
const SYNDICATE_ROLES = ['entry', 'support', 'anchor', 'rotator', 'support'];

function poseToward(px, py, pz, tx, ty, tz) {
  const dx = tx - px;
  const dy = ty - py;
  const dz = tz - pz;
  const length = Math.hypot(dx, dy, dz) || 1;
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.asin(Math.max(-1, Math.min(1, dy / length))),
  };
}

function makeWeapons() {
  return WEAPONS.map((def) => ({
    ...def,
    mag: def.magazine,
    reserve: def.reserve,
    reloadLeft: 0,
    fireCooldown: 0,
    emptyClick: 0,
    kick: 0,
    muzzleFlash: 0,
  }));
}

function createActor(id, name, team, isPlayer, spawn, role) {
  const position = new THREE.Vector3(spawn.x, 0, spawn.z);
  return {
    id,
    name,
    team,
    isPlayer,
    role,
    position,
    prevPosition: position.clone(),
    velocity: new THREE.Vector3(),
    yaw: spawn.yaw,
    prevYaw: spawn.yaw,
    pitch: 0,
    prevPitch: 0,
    eye: CONFIG.movement.standEye,
    height: CONFIG.movement.standHeight,
    crouching: false,
    onGround: true,
    health: 100,
    armor: isPlayer ? 0 : 50,
    alive: true,
    money: CONFIG.economy.startMoney,
    kills: 0,
    deaths: 0,
    slots: makeWeapons(),
    slot: 0,
    spread: 0,
    recoilPitch: 0,
    recoilYaw: 0,
    lastAttackerId: null,
  };
}

function createTracers() {
  return Array.from({ length: CONFIG.pools.tracers }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    dx: 0,
    dy: 0,
    dz: 1,
    length: 0,
    life: 0,
    maxLife: 0,
    team: null,
  }));
}

function createImpacts() {
  return Array.from({ length: CONFIG.pools.impacts }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    nx: 0,
    ny: 0,
    nz: 0,
    life: 0,
    maxLife: 0,
    kind: 'wall',
  }));
}

function createKillFeed() {
  return {
    head: 0,
    items: Array.from({ length: 6 }, () => ({
      active: false,
      killer: '',
      victim: '',
      killerTeam: null,
      victimTeam: null,
      weapon: '',
      headshot: false,
      ttl: 0,
      maxTtl: 0,
    })),
  };
}

export function createGameState(seed = 1) {
  const normalizedSeed = normalizeSeed(seed);
  const rng = mulberry32(normalizedSeed);
  const actors = [];

  const vanguardSpawns = MAP.spawns.vanguard;
  const syndicateSpawns = MAP.spawns.syndicate;
  const player = createActor('p0', 'Avery', 'vanguard', true, vanguardSpawns[0], 'entry');
  actors.push(player);

  for (let index = 1; index < vanguardSpawns.length; index += 1) {
    actors.push(createActor(
      `v${index}`,
      VANGUARD_NAMES[index - 1],
      'vanguard',
      false,
      vanguardSpawns[index],
      VANGUARD_ROLES[index - 1],
    ));
  }
  for (let index = 0; index < syndicateSpawns.length; index += 1) {
    actors.push(createActor(
      `s${index + 1}`,
      SYNDICATE_NAMES[index],
      'syndicate',
      false,
      syndicateSpawns[index],
      SYNDICATE_ROLES[index],
    ));
  }

  const menuLook = poseToward(19, 13, 25, 0, 0, -4);
  const bots = actors.filter((actor) => !actor.isPlayer);

  return {
    seed: normalizedSeed,
    rng,
    tick: 0,
    time: 0,
    phase: 'menu',
    mapName: MAP.name,
    actors,
    bots,
    player,
    match: {
      round: 1,
      phaseTime: CONFIG.round.liveSeconds,
      score: { vanguard: 0, syndicate: 0 },
      winner: null,
      reason: '',
      lossStreak: { vanguard: 1, syndicate: 1 },
    },
    money: {
      vanguard: CONFIG.economy.startMoney,
      syndicate: CONFIG.economy.startMoney,
    },
    objective: {
      state: 'idle',
      site: null,
      planted: false,
      timer: 0,
      planterId: null,
      defuserId: null,
    },
    sites: MAP.sites,
    callouts: MAP.callouts,
    view: {
      mode: 'menu',
      menuPose: {
        position: new THREE.Vector3(19, 13, 25),
        yaw: menuLook.yaw,
        pitch: menuLook.pitch,
      },
    },
    ui: {
      hudVisible: false,
      overlay: 'menu',
      buyOpen: false,
      hitMarker: 0,
      message: '',
      messageTime: 0,
    },
    tracers: createTracers(),
    impacts: createImpacts(),
    killFeed: createKillFeed(),
    events: [],
    stats: {
      shotsFired: 0,
      shotsHit: 0,
      botsAlive: 9,
    },
  };
}

const readonlyCache = new WeakMap();

export function readonlyView(value) {
  if (!value || typeof value !== 'object') return value;
  if (readonlyCache.has(value)) return readonlyCache.get(value);
  const proxy = new Proxy(value, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver);
      return result && typeof result === 'object' ? readonlyView(result) : result;
    },
    set() { return false; },
    deleteProperty() { return false; },
    defineProperty() { return false; },
    setPrototypeOf() { return false; },
  });
  readonlyCache.set(value, proxy);
  return proxy;
}
