import { CONFIG } from './config.js';

function formatTime(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function setText(element, value) {
  if (element && element.textContent !== value) element.textContent = value;
}

export function createHud() {
  const hud = document.getElementById('hud');
  const hitmarker = document.getElementById('hitmarker');
  const timer = document.getElementById('timer');
  const phaseLabel = document.getElementById('phase-label');
  const scoreV = document.getElementById('score-v');
  const scoreS = document.getElementById('score-s');
  const aliveV = document.getElementById('alive-v');
  const aliveS = document.getElementById('alive-s');
  const objective = document.getElementById('objective');
  const health = document.getElementById('health');
  const armor = document.getElementById('armor');
  const money = document.getElementById('money');
  const weaponName = document.getElementById('weapon-name');
  const ammoMag = document.getElementById('ammo-mag');
  const ammoReserve = document.getElementById('ammo-reserve');
  const slotEls = [
    document.getElementById('slot-0'),
    document.getElementById('slot-1'),
    document.getElementById('slot-2'),
  ];
  const buyMenu = document.getElementById('buy-menu');
  const buyList = document.getElementById('buy-list');
  const overlay = document.getElementById('overlay');
  const eyebrow = document.getElementById('overlay-eyebrow');
  const title = document.getElementById('overlay-title');
  const copy = document.getElementById('overlay-copy');
  const overlayScore = document.getElementById('overlay-score');
  const play = document.getElementById('play');
  const overlayKeys = document.getElementById('overlay-keys');

  const slotCache = ['', '', ''];
  let deployHandler = () => {};
  play.addEventListener('click', () => deployHandler());

  for (let index = 0; index < CONFIG.weapons.length; index += 1) {
    const def = CONFIG.weapons[index];
    const item = document.createElement('li');
    item.innerHTML = `<kbd>${def.slot}</kbd><span>${def.name}</span><b>$${def.price}</b>`;
    buyList.appendChild(item);
  }

  function overlayMode(state) {
    const mode = state.ui.overlay;
    overlay.hidden = mode === 'none';
    if (mode === 'none') return;

    if (mode === 'menu') {
      setText(eyebrow, 'TACTICAL 5V5 · ORIGINAL MAP');
      setText(title, 'SALTWORKS');
      setText(copy, 'Vanguard holds the brine line. Syndicate wants the relay. Five on five, first to seven rounds.');
      setText(play, 'Deploy');
      overlayScore.hidden = true;
      overlayKeys.hidden = false;
      return;
    }

    if (mode === 'pause') {
      setText(eyebrow, 'TACTICAL 5V5 · SALTWORKS');
      setText(title, 'HOLD POSITION');
      setText(copy, 'Paused. Click to re-enter the depot.');
      setText(play, 'Resume');
      overlayScore.hidden = true;
      overlayKeys.hidden = false;
      return;
    }

    const winner = state.match.winner;
    setText(eyebrow, `ROUND ${state.match.round} · COMPLETE`);
    if (winner === 'vanguard') setText(title, 'VANGUARD SECURES THE ROUND');
    else if (winner === 'syndicate') setText(title, 'SYNDICATE TAKES THE ROUND');
    else setText(title, 'ROUND CLOSED');
    setText(copy, state.match.reason || 'The depot falls quiet.');
    overlayScore.hidden = false;
    setText(overlayScore, `${state.match.score.vanguard} — ${state.match.score.syndicate}`);
    setText(play, 'Next round');
    overlayKeys.hidden = true;
  }

  function sync(state) {
    hud.hidden = !state.ui.hudVisible;
    overlayMode(state);
    buyMenu.hidden = !state.ui.buyOpen || state.ui.overlay !== 'none';

    const player = state.player;
    const weapon = player.slots[player.slot] ?? player.slots[0];
    let vanguardAlive = 0;
    let syndicateAlive = 0;
    for (let index = 0; index < state.actors.length; index += 1) {
      const actor = state.actors[index];
      if (!actor.alive) continue;
      if (actor.team === 'vanguard') vanguardAlive += 1;
      else syndicateAlive += 1;
    }

    setText(timer, formatTime(state.match.phaseTime));
    setText(scoreV, String(state.match.score.vanguard));
    setText(scoreS, String(state.match.score.syndicate));
    setText(aliveV, `${vanguardAlive} LIVE`);
    setText(aliveS, `${syndicateAlive} LIVE`);
    setText(health, String(Math.max(0, Math.ceil(player.health))));
    setText(armor, String(Math.max(0, Math.ceil(player.armor))));
    setText(money, `$${Math.max(0, Math.round(player.money))}`);
    setText(weaponName, weapon.name.toUpperCase());
    setText(ammoMag, String(weapon.mag));
    setText(ammoReserve, `/ ${weapon.reserve}`);
    setText(phaseLabel, state.phase === 'live' ? 'LIVE' : state.phase === 'buy' ? 'BUY PHASE' : state.phase === 'roundEnd' ? 'ROUND OVER' : 'BRIEFING');

    if (state.objective.planted) {
      setText(objective, `SURGE CHARGE ARMED · SITE ${state.objective.site ?? 'A'}`);
    } else {
      setText(objective, 'RELAY SITES A / B · HOLD THE DEPOT');
    }

    for (let index = 0; index < slotEls.length; index += 1) {
      const slot = player.slots[index];
      if (!slot) continue;
      const label = `${index + 1}  ${slot.name.toUpperCase()}`;
      if (slotCache[index] !== label) {
        slotEls[index].textContent = label;
        slotCache[index] = label;
      }
      slotEls[index].classList.toggle('active', player.slot === index);
    }

    hitmarker.classList.toggle('on', state.ui.hitMarker > 0);
  }

  return {
    sync,
    onDeploy(handler) {
      deployHandler = handler;
    },
  };
}
