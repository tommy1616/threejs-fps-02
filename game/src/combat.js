import { CONFIG } from './config.js';
import { dropCharge } from './objective.js';

const FEED_SECONDS = 6;

export function pushKillFeed(state, killer, victim, weapon, headshot) {
  const feed = state.killFeed;
  const entry = feed.items[feed.head];
  entry.active = true;
  entry.killer = killer ? killer.name : 'World';
  entry.victim = victim.name;
  entry.killerTeam = killer ? killer.team : null;
  entry.victimTeam = victim.team;
  entry.weapon = weapon;
  entry.headshot = headshot;
  entry.ttl = FEED_SECONDS;
  entry.maxTtl = FEED_SECONDS;
  feed.head = (feed.head + 1) % feed.items.length;
}

export function applyDamage(state, victim, amount, attacker, weaponName, part) {
  if (!victim.alive || amount <= 0) return false;
  let damage = amount;
  if (victim.armor > 0) {
    const absorbed = Math.min(victim.armor, damage * 0.5);
    victim.armor -= absorbed;
    damage -= absorbed;
  }
  victim.health -= damage;
  victim.lastAttackerId = attacker ? attacker.id : null;

  if (victim.health > 0) return false;

  victim.health = 0;
  victim.alive = false;
  victim.deaths += 1;
  victim.velocity.set(0, 0, 0);
  dropCharge(state, victim);
  if (attacker && attacker !== victim) {
    attacker.kills += 1;
    attacker.money = Math.min(CONFIG.economy.maxMoney, attacker.money + CONFIG.economy.killReward);
  }
  pushKillFeed(state, attacker, victim, weaponName, part === 'head');
  return true;
}

export function stepCombat(state, dt) {
  const feed = state.killFeed;
  for (let index = 0; index < feed.items.length; index += 1) {
    const entry = feed.items[index];
    if (!entry.active) continue;
    entry.ttl -= dt;
    if (entry.ttl <= 0) entry.active = false;
  }
  const noises = state.noises.items;
  for (let index = 0; index < noises.length; index += 1) {
    const noise = noises[index];
    if (!noise.active) continue;
    noise.ttl -= dt;
    if (noise.ttl <= 0) noise.active = false;
  }
}
