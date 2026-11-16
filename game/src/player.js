import { CONFIG } from './config.js';
import { MAP, overlapsAt } from './map.js';

const EPSILON = 1e-4;
const MOVE = CONFIG.movement;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function applyLook(actor, dx, dy) {
  actor.yaw -= dx * CONFIG.view.sensitivity;
  actor.pitch = clamp(
    actor.pitch - dy * CONFIG.view.sensitivity,
    -CONFIG.view.pitchLimit,
    CONFIG.view.pitchLimit,
  );
}

function moveHorizontal(actor, axis, amount) {
  const position = actor.position;
  const velocity = actor.velocity;
  const old = axis === 0 ? position.x : position.z;
  if (axis === 0) position.x += amount;
  else position.z += amount;
  const hit = overlapsAt(position.x, position.y, position.z, MOVE.radius, actor.height, MOVE.collisionLift);
  if (!hit) return;
  if (axis === 0) {
    position.x = old;
    velocity.x = 0;
  } else {
    position.z = old;
    velocity.z = 0;
  }
}

function resolveVertical(actor, dt) {
  const position = actor.position;
  const velocity = actor.velocity;
  const oldY = position.y;
  position.y += velocity.y * dt;

  let landTop = -Infinity;
  let headBottom = Infinity;
  const radius = MOVE.radius;
  const minX = position.x - radius;
  const maxX = position.x + radius;
  const minZ = position.z - radius;
  const maxZ = position.z + radius;

  for (let index = 0; index < MAP.boxes.length; index += 1) {
    const item = MAP.boxes[index];
    if (maxX <= item.minX + EPSILON || minX >= item.maxX - EPSILON) continue;
    if (maxZ <= item.minZ + EPSILON || minZ >= item.maxZ - EPSILON) continue;
    if (position.y + actor.height <= item.minY + EPSILON || position.y >= item.maxY - EPSILON) continue;
    if (velocity.y <= 0) {
      if (item.maxY <= oldY + 0.08) landTop = Math.max(landTop, item.maxY);
    } else if (item.minY >= oldY + actor.height - 0.08) {
      headBottom = Math.min(headBottom, item.minY);
    }
  }

  if (landTop > -Infinity) {
    position.y = landTop;
    velocity.y = 0;
    actor.onGround = true;
  } else if (headBottom < Infinity) {
    position.y = headBottom - actor.height;
    velocity.y = 0;
    actor.onGround = false;
  } else {
    actor.onGround = false;
    if (overlapsAt(position.x, position.y, position.z, radius, actor.height, 0.001)) {
      position.y = oldY;
      velocity.y = 0;
    }
  }

  if (position.y < 0) {
    position.y = 0;
    velocity.y = 0;
    actor.onGround = true;
  }
}

export function moveActor(actor, wishX, wishZ, speed, dt, jump) {
  const velocity = actor.velocity;
  const length = Math.hypot(wishX, wishZ);
  if (length > 1e-6) {
    wishX /= length;
    wishZ /= length;
  }

  const acceleration = actor.onGround ? MOVE.groundAccel : MOVE.airAccel;
  const blend = Math.min(1, acceleration * dt / speed);
  velocity.x += (wishX * speed - velocity.x) * blend;
  velocity.z += (wishZ * speed - velocity.z) * blend;

  if (actor.onGround && length < 1e-6) {
    const damp = Math.max(0, 1 - MOVE.friction * dt);
    velocity.x *= damp;
    velocity.z *= damp;
  }

  if (jump && actor.onGround) {
    velocity.y = MOVE.jumpSpeed;
    actor.onGround = false;
  }

  velocity.y = Math.max(-MOVE.maxFallSpeed, velocity.y - MOVE.gravity * dt);

  moveHorizontal(actor, 0, velocity.x * dt);
  moveHorizontal(actor, 1, velocity.z * dt);
  resolveVertical(actor, dt);
}

export function stepPlayer(state, input, dt) {
  const player = state.player;
  if (!player.alive) return;

  const weapon = player.slots[player.slot];
  weapon.fireCooldown = Math.max(0, weapon.fireCooldown - dt);
  if (weapon.reloadLeft > 0) {
    weapon.reloadLeft = Math.max(0, weapon.reloadLeft - dt);
    if (weapon.reloadLeft === 0) {
      const needed = weapon.magSize - weapon.mag;
      const taken = Math.min(needed, weapon.reserve);
      weapon.mag += taken;
      weapon.reserve -= taken;
    }
  }

  if (input.slotPressed > 0) {
    const nextSlot = clamp(input.slotPressed - 1, 0, player.slots.length - 1);
    if (nextSlot !== player.slot) {
      weapon.reloadLeft = 0;
      player.slot = nextSlot;
      player.spread = 0;
    }
    input.slotPressed = 0;
  }

  if (input.reloadPressed) {
    input.reloadPressed = false;
    const active = player.slots[player.slot];
    if (active.reloadLeft === 0 && active.mag < active.magSize && active.reserve > 0) {
      active.reloadLeft = active.reloadTime;
    }
  }

  if (input.crouch && !player.crouching) {
    player.crouching = true;
    player.height = MOVE.crouchHeight;
  } else if (!input.crouch && player.crouching) {
    const clear = !overlapsAt(player.position.x, player.position.y, player.position.z, MOVE.radius, MOVE.standHeight, 0.02);
    if (clear) {
      player.crouching = false;
      player.height = MOVE.standHeight;
    }
  }

  const eyeTarget = player.crouching ? MOVE.crouchEye : MOVE.standEye;
  player.eye += (eyeTarget - player.eye) * Math.min(1, dt * MOVE.crouchLerp);

  const forward = input.forward;
  const strafe = input.strafe;
  const sin = Math.sin(player.yaw);
  const cos = Math.cos(player.yaw);
  const wishX = -sin * forward + cos * strafe;
  const wishZ = -cos * forward - sin * strafe;
  const speed = player.crouching
    ? MOVE.crouchSpeed
    : input.walk ? MOVE.walkSpeed * MOVE.walkMultiplier : MOVE.walkSpeed;

  const jump = input.jumpPressed;
  input.jumpPressed = false;
  moveActor(player, wishX, wishZ, speed, dt, jump);
}
