import { CONFIG } from './config.js';
import { resetBots } from './bots.js';

const MOVE = CONFIG.movement;
const ROUND = CONFIG.round;
const ECONOMY = CONFIG.economy;

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
  actor.armor = actor.isPlayer ? 0 : 50;
  actor.spread = 0;
  actor.recoilPitch = 0;
  actor.recoilYaw = 0;
  actor.lastAttackerId = null;
  for (let index = 0; index < actor.slots.length; index += 1) {
    const weapon = actor.slots[index];
    if (!survived) {
      weapon.mag = weapon.magazine;
      weapon.reserve = weapon.reserveMax;
    }
    weapon.reloadLeft = 0;
    weapon.fireCooldown = 0;
    weapon.emptyClick = 0;
    weapon.kick = 0;
    weapon.muzzleFlash = 0;
  }
}

function clearPools(state) {
  for (let index = 0; index < state.tracers.length; index += 1) state.tracers[index].active = false;
  for (let index = 0; index < state.impacts.length; index += 1) state.impacts[index].active = false;
  for (let index = 0; index < state.noises.items.length; index += 1) state.noises.items[index].active = false;
  for (let index = 0; index < state.killFeed.items.length; index += 1) state.killFeed.items[index].active = false;
}

export function startRound(state) {
  state.phase = 'freeze';
  state.match.phaseTime = ROUND.freezeSeconds;
  state.match.winner = null;
  state.match.reason = '';
  state.objective.state = 'idle';
  state.objective.site = null;
  state.objective.planted = false;
  state.objective.timer = 0;
  state.ui.overlay = 'none';
  state.ui.hudVisible = true;
  state.ui.buyOpen = false;
  state.ui.message = `ROUND ${state.match.round}`;
  state.ui.messageTime = 2;

  for (let index = 0; index < state.actors.length; index += 1) resetActor(state, state.actors[index]);
  clearPools(state);
  resetBots(state);
}

export function startMatch(state) {
  state.match.round = 1;
  state.match.roundsPlayed = 0;
  state.match.score.vanguard = 0;
  state.match.score.syndicate = 0;
  state.match.winner = null;
  state.match.reason = '';
  state.match.lossStreak.vanguard = 1;
  state.match.lossStreak.syndicate = 1;
  state.money.vanguard = ECONOMY.startMoney;
  state.money.syndicate = ECONOMY.startMoney;
  for (let index = 0; index < state.actors.length; index += 1) {
    state.actors[index].money = ECONOMY.startMoney;
    state.actors[index].kills = 0;
    state.actors[index].deaths = 0;
    state.actors[index].slot = 0;
  }
  startRound(state);
}

function awardMoney(state, winner) {
  const loser = winner === 'vanguard' ? 'syndicate' : 'vanguard';
  state.match.lossStreak[loser] = Math.min(4, state.match.lossStreak[loser] + 1);
  state.match.lossStreak[winner] = 1;
  const lossReward = Math.min(
    ECONOMY.lossMax,
    ECONOMY.lossBase + (state.match.lossStreak[loser] - 1) * ECONOMY.lossStep,
  );
  state.money[winner] = Math.min(ECONOMY.maxMoney, state.money[winner] + ECONOMY.teamWinReward);
  state.money[loser] = Math.min(ECONOMY.maxMoney, state.money[loser] + lossReward);
  for (let index = 0; index < state.actors.length; index += 1) {
    const actor = state.actors[index];
    const reward = actor.team === winner ? ECONOMY.teamWinReward : lossReward;
    actor.money = Math.min(ECONOMY.maxMoney, actor.money + reward);
  }
}

export function endRound(state, winner, reason) {
  if (state.phase !== 'live') return;
  state.phase = 'roundEnd';
  state.match.phaseTime = ROUND.roundEndSeconds;
  state.match.winner = winner;
  state.match.reason = reason;
  state.match.score[winner] += 1;
  state.match.roundsPlayed += 1;
  state.ui.overlay = 'roundEnd';
  state.ui.hudVisible = true;
  awardMoney(state, winner);
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
    state.match.phaseTime = Math.max(0, state.match.phaseTime - dt);
    const vanguard = aliveCount(state, 'vanguard');
    const syndicate = aliveCount(state, 'syndicate');
    if (syndicate === 0) endRound(state, 'vanguard', 'Vanguard eliminated the Syndicate.');
    else if (vanguard === 0) endRound(state, 'syndicate', 'Syndicate eliminated Vanguard.');
    else if (state.match.phaseTime === 0) endRound(state, 'vanguard', 'Time expired — Vanguard hold the depot.');
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
