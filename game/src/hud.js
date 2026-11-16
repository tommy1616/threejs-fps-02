import { WEAPONS } from './weapons.js';

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
  const crosshair = document.getElementById('crosshair');
  const hitmarker = document.getElementById('hitmarker');
  const centerMessage = document.getElementById('center-message');
  const killfeed = document.getElementById('killfeed');
  const timer = document.getElementById('timer');
  const phaseLabel = document.getElementById('phase-label');
  const scoreV = document.getElementById('score-v');
  const scoreS = document.getElementById('score-s');
  const aliveV = document.getElementById('alive-v');
  const aliveS = document.getElementById('alive-s');
  const objective = document.getElementById('objective');
  const carrier = document.getElementById('carrier');
  const action = document.getElementById('action');
  const actionLabel = document.getElementById('action-label');
  const actionFill = document.getElementById('action-fill');
  const actionHint = document.getElementById('action-hint');
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
  const killRows = [];
  const killCache = [];
  let crosshairScale = 1;
  let actionPercent = -1;
  let deployHandler = () => {};
  play.addEventListener('click', () => deployHandler());

  for (let index = 0; index < 6; index += 1) {
    const row = document.createElement('div');
    row.className = 'kill-row';
    row.hidden = true;
    killfeed.appendChild(row);
    killRows.push(row);
    killCache.push('');
  }

  for (let index = 0; index < WEAPONS.length; index += 1) {
    const def = WEAPONS[index];
    const item = document.createElement('li');
    item.innerHTML = `<kbd>${def.slot}</kbd><span>${def.name}</span><b>$${def.price}</b>`;
    buyList.appendChild(item);
  }

  function overlayMode(state) {
    const mode = state.ui.overlay;
    overlay.hidden = mode === 'none';
    overlay.dataset.mode = mode;
    if (mode === 'none') return;

    if (mode === 'menu') {
      setText(eyebrow, 'TACTICAL 5V5 · ORIGINAL MAP');
      setText(title, 'SALTWORKS');
      setText(copy, 'Vanguard holds the brine line. Syndicate wants the relay. Five on five, first to eight rounds.');
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

    if (mode === 'matchOver') {
      setText(eyebrow, 'MATCH COMPLETE · SALTWORKS');
      if (state.match.winner === 'vanguard') setText(title, 'VANGUARD WINS THE MATCH');
      else setText(title, 'SYNDICATE WINS THE MATCH');
      setText(copy, 'First to eight rounds. Press Enter or click below to redeploy.');
      overlayScore.hidden = false;
      setText(overlayScore, `${state.match.score.vanguard} — ${state.match.score.syndicate}`);
      setText(play, 'Play again');
      overlayKeys.hidden = true;
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

    const charge = state.objective;
    const timeLeft = charge.planted ? charge.timer : state.match.phaseTime;
    setText(timer, formatTime(timeLeft));
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
    const phase = charge.planted ? 'CHARGE ARMED'
      : state.phase === 'live' ? 'LIVE'
        : state.phase === 'freeze' ? 'FREEZE'
          : state.phase === 'roundEnd' ? 'ROUND OVER'
            : state.phase === 'matchOver' ? 'MATCH OVER' : 'BRIEFING';
    setText(phaseLabel, phase);
    const message = weapon.reloadLeft > 0 ? 'RELOADING' : state.ui.messageTime > 0 ? state.ui.message : '';
    setText(centerMessage, message);
    centerMessage.classList.toggle('big', message === 'SIDES SWITCHED');

    const scale = Math.min(3.2, 1 + player.spread * 90);
    if (Math.abs(scale - crosshairScale) > 0.03) {
      crosshairScale = scale;
      crosshair.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(2)})`;
    }

    if (charge.planted) {
      setText(objective, `DEFUSE THE RELAY CHARGE · SITE ${charge.site}`);
    } else if (charge.state === 'ground') {
      setText(objective, 'RELAY CHARGE DROPPED · RECOVER IT');
    } else if (charge.state === 'carried') {
      setText(objective, `RELAY CHARGE · ATTACK SITE ${charge.attackSite ?? 'A'}`);
    } else {
      setText(objective, 'RELAY SITES A / B · HOLD THE DEPOT');
    }

    let carrierText = '';
    if (charge.planted) {
      carrierText = `CHARGE PLANTED · SITE ${charge.site} · ${formatTime(charge.timer)}`;
    } else if (charge.state === 'carried') {
      let holder = null;
      for (let index = 0; index < state.actors.length; index += 1) {
        if (state.actors[index].id === charge.carrierId) { holder = state.actors[index]; break; }
      }
      carrierText = holder && holder.isPlayer ? 'CHARGE · YOU' : `CHARGE · ${holder ? holder.name : 'UNKNOWN'}`;
    } else if (charge.state === 'ground') {
      carrierText = 'CHARGE · DROPPED';
    }
    carrier.hidden = carrierText === '';
    setText(carrier, carrierText);

    const progress = charge.planted ? charge.defuseProgress : charge.plantProgress;
    const showAction = state.phase === 'live' && state.ui.overlay === 'none'
      && (progress > 0 || charge.hint !== '');
    action.hidden = !showAction;
    if (showAction) {
      setText(actionLabel, charge.planted ? 'DEFUSING' : 'PLANTING');
      setText(actionHint, charge.hint);
      const percent = Math.round(Math.min(1, progress) * 100);
      if (percent !== actionPercent) {
        actionPercent = percent;
        actionFill.style.width = `${percent}%`;
      }
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

    let rowsUsed = 0;
    for (let index = 0; index < state.killFeed.items.length; index += 1) {
      const entry = state.killFeed.items[index];
      if (!entry.active || rowsUsed >= killRows.length) continue;
      const text = `${entry.killer}  ${entry.weapon}${entry.headshot ? ' ◎' : ''}  ${entry.victim}`;
      if (killCache[rowsUsed] !== text) {
        killCache[rowsUsed] = text;
        killRows[rowsUsed].textContent = text;
      }
      killRows[rowsUsed].hidden = false;
      killRows[rowsUsed].className = `kill-row ${entry.killerTeam ?? ''}`;
      rowsUsed += 1;
    }
    for (let index = rowsUsed; index < killRows.length; index += 1) {
      if (killRows[index].hidden) continue;
      killRows[index].hidden = true;
      killCache[index] = '';
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
