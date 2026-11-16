export function createInput(canvas, onLockChange = () => {}) {
  const keys = new Set();
  const pending = {
    lookX: 0,
    lookY: 0,
    jump: false,
    reload: false,
    buy: false,
    slot: 0,
    firePressed: false,
  };
  const snapshot = {
    forward: 0,
    strafe: 0,
    jumpPressed: false,
    crouch: false,
    walk: false,
    reloadPressed: false,
    buyPressed: false,
    slotPressed: 0,
    fire: false,
    firePressed: false,
    lookDX: 0,
    lookDY: 0,
    locked: false,
  };
  let firing = false;
  let locked = false;

  function queueKey(code) {
    if (code === 'Space') pending.jump = true;
    else if (code === 'KeyR') pending.reload = true;
    else if (code === 'KeyB') pending.buy = true;
    else if (code === 'Digit1') pending.slot = 1;
    else if (code === 'Digit2') pending.slot = 2;
    else if (code === 'Digit3') pending.slot = 3;
  }

  function onKeyDown(event) {
    if (event.code === 'Space') event.preventDefault();
    keys.add(event.code);
    if (!event.repeat) queueKey(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onBlur() {
    keys.clear();
    firing = false;
  }

  function onMouseMove(event) {
    if (!locked) return;
    pending.lookX += event.movementX;
    pending.lookY += event.movementY;
  }

  function onMouseDown(event) {
    if (!locked || event.button !== 0) return;
    firing = true;
    pending.firePressed = true;
  }

  function onMouseUp(event) {
    if (event.button === 0) firing = false;
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  function onCanvasClick() {
    if (!locked) requestLock();
  }

  function onPointerLockChange() {
    locked = document.pointerLockElement === canvas;
    if (!locked) {
      keys.clear();
      firing = false;
      pending.lookX = 0;
      pending.lookY = 0;
    }
    onLockChange(locked);
  }

  function requestLock() {
    const request = canvas.requestPointerLock?.();
    if (request && typeof request.catch === 'function') request.catch(() => {});
  }

  function takeSnapshot() {
    snapshot.forward = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    snapshot.strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    snapshot.crouch = keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC');
    snapshot.walk = keys.has('ShiftLeft') || keys.has('ShiftRight');
    snapshot.jumpPressed = pending.jump;
    snapshot.reloadPressed = pending.reload;
    snapshot.buyPressed = pending.buy;
    snapshot.slotPressed = pending.slot;
    snapshot.fire = firing;
    snapshot.firePressed = pending.firePressed;
    snapshot.lookDX = pending.lookX;
    snapshot.lookDY = pending.lookY;
    snapshot.locked = locked;
    pending.jump = false;
    pending.reload = false;
    pending.buy = false;
    pending.slot = 0;
    pending.firePressed = false;
    pending.lookX = 0;
    pending.lookY = 0;
    return snapshot;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  return {
    takeSnapshot,
    requestLock,
    get locked() {
      return locked;
    },
    get keys() {
      return keys;
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('click', onCanvasClick);
      canvas.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
    },
  };
}
