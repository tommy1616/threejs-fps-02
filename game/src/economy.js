import { CONFIG } from './config.js';
import { SHOP, WEAPONS, createWeapon } from './weapons.js';

export const ECONOMY = Object.freeze({
  start: 800,
  cap: 16000,
  win: 3250,
  objectiveWin: 3500,
  losses: [1400, 1900, 2400, 2900, 3400],
  plant: 800,
});

const GUNS = Object.fromEntries(WEAPONS.map((weapon) => [weapon.id, weapon]));

export function addMoney(actor, amount) {
  actor.money = Math.max(0, Math.min(ECONOMY.cap, actor.money + amount));
}

function itemById(id) {
  return SHOP.find((item) => item.id === id);
}

export function canBuy(state, actor) {
  if (!actor.alive) return false;
  const distance = Math.hypot(actor.position.x - actor.spawn.x, actor.position.z - actor.spawn.z);
  if (distance > 7) return false;
  return state.phase === 'freeze'
    || (state.phase === 'live' && state.match.phaseTime > CONFIG.round.liveSeconds - 15);
}

export function buyItem(state, actor, id) {
  if (!canBuy(state, actor)) return false;
  const item = itemById(id);
  if (!item || actor.money < item.price) return false;
  if (item.defenders && actor.team !== 'syndicate') return false;

  if (item.category === 'PRIMARY' || item.category === 'SIDEARM') {
    const slot = item.category === 'SIDEARM' ? 1 : 0;
    if (actor.slots[slot]?.id === item.id) return false;
    actor.money -= item.price;
    actor.slots[slot] = createWeapon(item);
    actor.slot = slot;
  } else if (item.type === 'armor') {
    if (actor.armor >= item.armor && (!item.helmet || actor.helmet)) return false;
    actor.money -= item.price;
    actor.armor = item.armor;
    actor.helmet = Boolean(item.helmet);
  } else if (item.type === 'kit') {
    if (actor.kit) return false;
    actor.money -= item.price;
    actor.kit = true;
  } else {
    if (actor.grenades[item.grenade] >= 1) return false;
    actor.money -= item.price;
    actor.grenades[item.grenade] += 1;
  }
  return true;
}

export function botBuy(state) {
  for (let index = 0; index < state.bots.length; index += 1) {
    const bot = state.bots[index];
    if (!bot.alive) continue;
    const marksman = bot.ai.marksman && bot.money >= 5300;
    if (bot.money >= 3700) {
      const desired = marksman ? GUNS.longreach : GUNS.harrow;
      if (!bot.slots[0] || bot.slots[0].id !== desired.id) buyItem(state, bot, desired.id);
      if (bot.armor < 50) buyItem(state, bot, 'vest');
      if (bot.money >= 300) buyItem(state, bot, 'frag');
      if (bot.armor < 100 && bot.money >= 1000) buyItem(state, bot, 'vesthelm');
    } else if (bot.money >= 1250) {
      if (!bot.slots[0]) buyItem(state, bot, 'vireo');
      if (bot.armor < 50 && bot.money >= 650) buyItem(state, bot, 'vest');
    } else if (bot.money >= 1150) {
      if (!bot.slots[0]) buyItem(state, bot, 'marlin');
      if (bot.armor < 50 && bot.money >= 650) buyItem(state, bot, 'vest');
    } else if (bot.money >= 650 && bot.armor < 50) {
      buyItem(state, bot, 'vest');
    }
    bot.slot = bot.slots[0] ? 0 : 1;
    bot.lastSlot = bot.slot;
  }
}
