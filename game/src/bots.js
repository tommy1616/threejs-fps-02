import { CONFIG } from './config.js';
import { MAP, createRayHit, raycastSolids } from './map.js';
import { moveActor } from './player.js';
import { fireHitscan, startReload } from './weapon.js';
import { smokeBlocks, throwGrenade } from './grenades.js';
import { emitNoise, emitSound } from './audio.js';

const NODES = new Map(MAP.waypoints.map((node) => [node.id, node]));
const sight = createRayHit();
const MOVE = CONFIG.movement;
const BOTS = CONFIG.bots;

const DEFENDER_HOLDS = ['aShort', 'bShort', 'mN', 'mC', 'mN'];

function clamp(value, min, max) {
 return value < min ? min : value > max ? max : value;
}

function nearestNode(x, z) {
 let best = MAP.waypoints[0];
 let bestDistance = Infinity;
 for (let index = 0; index < MAP.waypoints.length; index += 1) {
  const node = MAP.waypoints[index];
  const dx = node.x - x;
  const dz = node.z - z;
  const distance = dx * dx + dz * dz;
  if (distance < bestDistance) {
   bestDistance = distance;
   best = node;
  }
 }
 return best;
}

function pathTo(fromX, fromZ, targetId) {
 const start = nearestNode(fromX, fromZ).id;
 if (start === targetId) return [targetId];
 const queue = [start];
 const previous = new Map([[start, null]]);
 let found = false;
 for (let index = 0; index < queue.length && !found; index += 1) {
  const id = queue[index];
  const node = NODES.get(id);
  for (let link = 0; link < node.links.length; link += 1) {
   const next = node.links[link];
   if (previous.has(next)) continue;
   previous.set(next, id);
   if (next === targetId) { found = true; break; }
   queue.push(next);
  }
 }
 if (!previous.has(targetId)) return [];
 const path = [];
 let cursor = targetId;
 while (cursor) {
  path.push(cursor);
  cursor = previous.get(cursor);
 }
 path.reverse();
 return path;
}

function holdYawFor(nodeId) {
 if (nodeId === 'aSite') return -Math.PI * 0.5;
 if (nodeId === 'bSite') return Math.PI * 0.5;
 if (nodeId === 'aShort') return -0.6;
 if (nodeId === 'bShort') return 0.6;
 return Math.PI;
}

function turnToward(current, target, maxStep) {
 let delta = (target - current) % (Math.PI * 2);
 if (delta > Math.PI) delta -= Math.PI * 2;
 else if (delta < -Math.PI) delta += Math.PI * 2;
 return current + clamp(delta, -maxStep, maxStep);
}

function countAlive(state, team) {
 let count = 0;
 for (let index = 0; index < state.actors.length; index += 1) {
  const actor = state.actors[index];
  if (actor.alive && actor.team === team) count += 1;
 }
 return count;
}

function nearestEnemy(state, bot) {
 let best = null;
 let bestDistance = Infinity;
 for (let index = 0; index < state.actors.length; index += 1) {
  const actor = state.actors[index];
  if (!actor.alive || actor.team === bot.team) continue;
  const distance = Math.hypot(actor.position.x - bot.position.x, actor.position.z - bot.position.z);
  if (distance < bestDistance) {
   bestDistance = distance;
   best = actor;
  }
 }
 return best;
}

function shouldHunt(state, bot) {
 const enemyTeam = bot.team === 'vanguard' ? 'syndicate' : 'vanguard';
 if (bot.team === 'syndicate' && !state.objective.planted) {
  return state.match.phaseTime < 40 && bot.ai.prober;
 }
 if (countAlive(state, bot.team) > countAlive(state, enemyTeam)) return true;
 if (state.match.phaseTime < 45) return true;
 return false;
}

function chooseAdvanceNode(state, bot, hunt) {
 const ai = bot.ai;
 const objective = state.objective;
 let target = ai.objectiveNode || ai.holdNode || 'mC';
 if (objective.planted) {
  target = objective.site === 'B' ? 'bSite' : 'aSite';
 } else if (bot.team === 'vanguard') {
  target = objective.state === 'ground'
   ? nearestNode(objective.x, objective.z).id
   : objective.attackSite === 'B' ? 'bSite' : 'aSite';
  if (hunt) {
   const enemy = nearestEnemy(state, bot);
   if (enemy) target = nearestNode(enemy.position.x, enemy.position.z).id;
  }
 } else if (hunt) {
  const enemy = nearestEnemy(state, bot);
  if (enemy) target = nearestNode(enemy.position.x, enemy.position.z).id;
 }
 const here = nearestNode(bot.position.x, bot.position.z).id;
 if (target === here && !objective.planted) {
  target = target === 'aSite' ? 'bSite' : target === 'bSite' ? 'aSite'
   : ai.objectiveNode === 'bSite' ? 'aSite' : 'bSite';
 }
 return target;
}

function setRoute(state, bot, targetId, nextState = 'patrol') {
 const ai = bot.ai;
 let route = pathTo(bot.position.x, bot.position.z, targetId);
 if (route.length === 0) route = [targetId];
 ai.route = route;
 ai.routeIndex = 0;
 ai.state = nextState;
 ai.holdTimer = 0;
 ai.stuckTimer = 0;
 ai.stuckX = bot.position.x;
 ai.stuckZ = bot.position.z;
}

function updateStuck(state, bot, dt) {
 const ai = bot.ai;
 if (ai.state === 'engage' || ai.state === 'hold') {
  ai.stuckTimer = 0;
  return;
 }
 ai.stuckTimer += dt;
 if (ai.stuckTimer < 2) return;
 const moved = Math.hypot(bot.position.x - ai.stuckX, bot.position.z - ai.stuckZ);
 ai.stuckTimer = 0;
 ai.stuckX = bot.position.x;
 ai.stuckZ = bot.position.z;
 if (moved > 0.6) return;
 if (ai.routeIndex + 1 < ai.route.length) {
  ai.routeIndex += 1;
 } else {
  setRoute(state, bot, chooseAdvanceNode(state, bot, shouldHunt(state, bot)), 'patrol');
 }
}

export function resetBots(state) {
 let defenderIndex = 0;
 const marks = { vanguard: false, syndicate: false };
 for (let index = 0; index < state.bots.length; index += 1) {
  const bot = state.bots[index];
  let target;
  if (bot.team === 'vanguard') {
   target = state.objective.attackSite === 'B' ? 'bSite' : 'aSite';
  } else {
   target = DEFENDER_HOLDS[defenderIndex % DEFENDER_HOLDS.length];
   defenderIndex += 1;
  }
  const ai = bot.ai;
  ai.state = 'patrol';
  ai.targetId = null;
  ai.route = pathTo(bot.spawn.x, bot.spawn.z, target);
  if (ai.route.length === 0) ai.route = [target];
  ai.routeIndex = 0;
  ai.holdNode = target;
  ai.objectiveNode = target === 'aShort' ? 'aSite' : target === 'bShort' ? 'bSite' : target;
  ai.holdYaw = holdYawFor(target);
  ai.reaction = 0;
  ai.aimError = BOTS.aimError;
  ai.think = state.rng() * 0.12;
  ai.searchTime = 0;
  ai.lastSeenX = bot.spawn.x;
  ai.lastSeenZ = bot.spawn.z;
  ai.holdTimer = 0;
  ai.stuckTimer = 0;
  ai.stuckX = bot.spawn.x;
  ai.stuckZ = bot.spawn.z;
  ai.marksman = !marks[bot.team];
  marks[bot.team] = true;
  ai.prober = bot.team === 'syndicate' && defenderIndex <= 2;
  ai.nadeTimer = 3 + state.rng() * 6;
  ai.smoked = false;
  ai.gather = 0;
  bot.slot = bot.slots[0] ? 0 : 1;
 }
}

function canSee(state, bot, target) {
 const eyeY = bot.position.y + bot.eye;
 const tx = target.position.x;
 const ty = target.position.y + target.eye - 0.12;
 const tz = target.position.z;
 const dx = tx - bot.position.x;
 const dy = ty - eyeY;
 const dz = tz - bot.position.z;
 const distance = Math.hypot(dx, dy, dz);
 if (distance < 0.01 || distance > BOTS.viewDistance) return false;
 if (smokeBlocks(state, bot.position.x, eyeY, bot.position.z, tx, ty, tz)) return false;
 raycastSolids(bot.position.x, eyeY, bot.position.z, dx / distance, dy / distance, dz / distance, distance, sight);
 return !sight.hit || sight.distance >= distance - 0.4;
}

function isRetaker(state, bot) {
 const objective = state.objective;
 let best = null;
 let bestDistance = Infinity;
 for (let index = 0; index < state.actors.length; index += 1) {
  const actor = state.actors[index];
  if (!actor.alive || actor.team !== 'syndicate') continue;
  const distance = Math.hypot(actor.position.x - objective.x, actor.position.z - objective.z);
  if (distance < bestDistance) { bestDistance = distance; best = actor; }
 }
 return best === bot;
}

function acquireTarget(state, bot) {
 const fx = -Math.sin(bot.yaw);
 const fz = -Math.cos(bot.yaw);
 const cosHalfFov = Math.cos(BOTS.fov * 0.5);
 let best = null;
 let bestDistance = BOTS.viewDistance;

 for (let index = 0; index < state.actors.length; index += 1) {
  const target = state.actors[index];
  if (!target.alive || target.team === bot.team) continue;
  const dx = target.position.x - bot.position.x;
  const dz = target.position.z - bot.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance > bestDistance || distance < 0.01) continue;
  const dot = (dx * fx + dz * fz) / distance;
  if (dot < cosHalfFov) continue;
  if (!canSee(state, bot, target)) continue;
  best = target;
  bestDistance = distance;
 }
 return best;
}

function hearNoise(state, bot) {
 const noises = state.noises.items;
 for (let index = 0; index < noises.length; index += 1) {
  const noise = noises[index];
  if (!noise.active || noise.ttl <= 0 || noise.team === bot.team) continue;
  const dx = noise.x - bot.position.x;
  const dz = noise.z - bot.position.z;
  if (Math.hypot(dx, dz) > Math.min(BOTS.hearingRadius, noise.radius)) continue;
  bot.ai.state = 'search';
  bot.ai.targetId = null;
  bot.ai.lastSeenX = noise.x;
  bot.ai.lastSeenZ = noise.z;
  bot.ai.searchTime = 3;
  bot.ai.route = pathTo(bot.position.x, bot.position.z, nearestNode(noise.x, noise.z).id);
  bot.ai.routeIndex = 0;
  return;
 }
}

function stepRoute(bot, dt) {
 const ai = bot.ai;
 const node = ai.routeIndex < ai.route.length ? NODES.get(ai.route[ai.routeIndex]) : null;
 if (!node) {
  if (ai.state === 'patrol') {
   ai.state = 'hold';
   ai.holdTimer = 5;
  }
  return false;
 }
 const dx = node.x - bot.position.x;
 const dz = node.z - bot.position.z;
 const distance = Math.hypot(dx, dz);
 if (distance < 1.2) {
  ai.routeIndex += 1;
  if (ai.routeIndex >= ai.route.length) {
   ai.state = ai.state === 'search' ? 'search' : 'hold';
   if (ai.state === 'hold') ai.holdTimer = 5;
   return false;
  }
  return true;
 }
 const inv = 1 / distance;
 moveActor(bot, dx * inv, dz * inv, MOVE.walkSpeed * 0.82, dt, false);
 bot.yaw = turnToward(bot.yaw, Math.atan2(-dx, -dz), dt * 5.5);
 return true;
}

function aimAt(bot, target, dt, rng) {
 const eyeY = bot.position.y + bot.eye;
 const dx = target.position.x - bot.position.x;
 const dy = target.position.y + target.eye * 0.72 - eyeY;
 const dz = target.position.z - bot.position.z;
 const length = Math.hypot(dx, dy, dz) || 1;
 const targetSpeed = Math.hypot(target.velocity.x, target.velocity.z);
 const error = bot.ai.aimError * (1 + Math.hypot(dx, dz) / 40 + Math.min(1, targetSpeed / 5) * 0.8);
 const jitterX = (rng() * 2 - 1) * error;
 const jitterY = (rng() * 2 - 1) * error;
 const desiredYaw = Math.atan2(-dx, -dz) + jitterX;
 const desiredPitch = Math.asin(clamp(dy / length, -1, 1)) + jitterY;
 bot.yaw = turnToward(bot.yaw, desiredYaw, dt * 9);
 bot.pitch = clamp(turnToward(bot.pitch, desiredPitch, dt * 9), -CONFIG.view.pitchLimit, CONFIG.view.pitchLimit);
}

export function stepBots(state, dt) {
 for (let index = 0; index < state.bots.length; index += 1) {
  const bot = state.bots[index];
  const ai = bot.ai;
  if (!bot.alive) {
   ai.state = 'dead';
   continue;
  }
  if (bot.team === 'vanguard' && ai.gather > 0 && state.phase === 'live') {
   ai.gather -= dt;
   bot.velocity.x = 0;
   bot.velocity.z = 0;
   bot.stepTimer = 0;
   continue;
  }

  const weapon = bot.slots[bot.slot] || bot.slots[1];
  bot.scoped = Boolean(weapon.scope && ai.state === 'engage');
  weapon.fireCooldown = Math.max(0, weapon.fireCooldown - dt);
  weapon.muzzleFlash = Math.max(0, weapon.muzzleFlash - dt);
  weapon.kick += (0 - weapon.kick) * Math.min(1, dt * 18);
  bot.recoilPitch += (0 - bot.recoilPitch) * Math.min(1, dt * weapon.recoilRecovery);
  bot.recoilYaw += (0 - bot.recoilYaw) * Math.min(1, dt * weapon.recoilRecovery);
  bot.spread += (weapon.baseSpread - bot.spread) * Math.min(1, dt * weapon.spreadRecovery);

  if (weapon.reloadLeft > 0) {
   weapon.reloadLeft = Math.max(0, weapon.reloadLeft - dt);
   if (weapon.reloadLeft === 0) {
    const taken = Math.min(weapon.magazine - weapon.mag, weapon.reserve);
    weapon.mag += taken;
    weapon.reserve -= taken;
   }
  }

  ai.nadeTimer -= dt;
  if (ai.nadeTimer <= 0) {
   ai.nadeTimer = 6 + state.rng() * 8;
   if (bot.grenades.frag > 0 && ai.state === 'engage') {
    const dx = ai.lastSeenX - bot.position.x;
    const dz = ai.lastSeenZ - bot.position.z;
    if (Math.hypot(dx, dz) > 5) {
     bot.yaw = Math.atan2(-dx, -dz);
     bot.pitch = 0.22;
     throwGrenade(state, bot, 'frag', true);
    }
   } else if (bot.grenades.smoke > 0 && bot.team === 'vanguard' && !ai.smoked
    && state.objective.state === 'carried' && state.objective.carrierId === bot.id) {
    const site = MAP.sites[state.objective.attackSite || 'A'];
    const dx = site.plantX - bot.position.x;
    const dz = site.plantZ - bot.position.z;
    bot.yaw = Math.atan2(-dx, -dz);
    bot.pitch = 0.2;
    if (throwGrenade(state, bot, 'smoke', true)) ai.smoked = true;
   }
  }

  const carrying = state.objective.state === 'carried' && state.objective.carrierId === bot.id;
  ai.think -= dt;
  if (ai.think <= 0 && state.match.setupTime <= 0) {
   ai.think = 0.1 + state.rng() * 0.06;
   const seen = acquireTarget(state, bot);
   if (seen) {
    if (ai.targetId !== seen.id) {
     ai.targetId = seen.id;
     ai.reaction = BOTS.reactionTime * (0.75 + state.rng() * 0.55);
     ai.aimError = BOTS.aimError * 1.7;
       }
    ai.state = carrying ? 'patrol' : 'engage';
    ai.lastSeenX = seen.position.x;
    ai.lastSeenZ = seen.position.z;
   } else if (ai.state !== 'search') {
    if (ai.state === 'engage') {
     ai.state = 'search';
     ai.targetId = null;
     ai.searchTime = 3.2;
     ai.route = pathTo(bot.position.x, bot.position.z, nearestNode(ai.lastSeenX, ai.lastSeenZ).id);
     ai.routeIndex = 0;
    } else {
     hearNoise(state, bot);
    }
   }
  }

  let target = null;
  if (ai.targetId) {
   for (let actorIndex = 0; actorIndex < state.actors.length; actorIndex += 1) {
    const actor = state.actors[actorIndex];
    if (actor.id === ai.targetId && actor.alive) { target = actor; break; }
   }
  }

  if (carrying && ai.state === 'engage') {
   setRoute(state, bot, state.objective.attackSite === 'B' ? 'bSite' : 'aSite', 'patrol');
  }
  if (target && canSee(state, bot, target) && !carrying) {
   ai.state = 'engage';
   bot.velocity.x = 0;
   bot.velocity.z = 0;
   ai.reaction = Math.max(0, ai.reaction - dt);
   ai.aimError = Math.max(0.0035, ai.aimError * Math.max(0, 1 - dt * 1.9));
   aimAt(bot, target, dt, state.rng);
   if (ai.reaction <= 0 && weapon.reloadLeft === 0) {
    if (weapon.mag > 0) {
     if (weapon.fireCooldown <= 0) {
      fireHitscan(state, bot, weapon);
      weapon.fireCooldown *= 2.6;
     }
    } else if (weapon.reserve > 0) {
     startReload(state, bot, true);
    }
   }
  } else {
   if (state.objective.planted && bot.team === 'syndicate' && isRetaker(state, bot)) {
    const dx = state.objective.x - bot.position.x;
    const dz = state.objective.z - bot.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 1.1) {
     const inv = 1 / (distance || 1);
     moveActor(bot, dx * inv, dz * inv, MOVE.walkSpeed * 0.86, dt, false);
    } else {
     bot.velocity.x = 0;
     bot.velocity.z = 0;
    }
    bot.yaw = turnToward(bot.yaw, Math.atan2(-dx, -dz), dt * 8);
    ai.state = 'hold';
    updateStuck(state, bot, dt);
    continue;
   }
   if (ai.state === 'engage' && !carrying) {
    ai.state = 'search';
    ai.targetId = null;
    ai.searchTime = 3.2;
    ai.route = pathTo(bot.position.x, bot.position.z, nearestNode(ai.lastSeenX, ai.lastSeenZ).id);
    ai.routeIndex = 0;
   }
   if (ai.state === 'search') {
    ai.searchTime -= dt;
    if (!stepRoute(bot, dt)) {
     bot.velocity.x = 0;
     bot.velocity.z = 0;
     if (ai.searchTime <= 0) setRoute(state, bot, chooseAdvanceNode(state, bot, true), 'patrol');
    }
   } else if (ai.state === 'hold') {
    bot.velocity.x = 0;
    bot.velocity.z = 0;
    ai.holdTimer -= dt;
    if (ai.holdTimer <= 0) {
     setRoute(state, bot, chooseAdvanceNode(state, bot, shouldHunt(state, bot)), 'patrol');
    } else {
     const scan = Math.sin(state.time * 0.7 + index * 1.3) * 0.42;
     bot.yaw = turnToward(bot.yaw, ai.holdYaw + scan, dt * 2.2);
     bot.pitch += (0 - bot.pitch) * Math.min(1, dt * 4);
    }
   } else {
    const moving = stepRoute(bot, dt);
    if (!moving) {
     bot.velocity.x = 0;
     bot.velocity.z = 0;
     const scan = Math.sin(state.time * 0.7 + index * 1.3) * 0.42;
     bot.yaw = turnToward(bot.yaw, ai.holdYaw + scan, dt * 2.2);
     bot.pitch += (0 - bot.pitch) * Math.min(1, dt * 4);
    }
   }
  }

  if (ai.state !== 'engage') bot.shotIndex = 0;
  const crouch = ai.state === 'hold' || ai.state === 'engage';
  if (crouch !== bot.crouching) {
   bot.crouching = crouch;
   bot.height = crouch ? MOVE.crouchHeight : MOVE.standHeight;
  }
  bot.eye += ((crouch ? MOVE.crouchEye : MOVE.standEye) - bot.eye) * Math.min(1, dt * 8);
  const speed = Math.hypot(bot.velocity.x, bot.velocity.z);
  if (bot.onGround && !bot.crouching && speed > 2.6) {
   bot.stepTimer -= dt;
   if (bot.stepTimer <= 0) {
    bot.stepTimer = 0.42;
    emitNoise(state, bot.position.x, bot.position.z, bot.team, bot.id, 1.4, 9);
    emitSound(state, 'step', bot.position.x, bot.position.y + 0.1, bot.position.z);
   }
  } else {
   bot.stepTimer = 0;
  }
  updateStuck(state, bot, dt);
 }
}
