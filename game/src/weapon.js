import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createRayHit, raycastSolids } from './map.js';
import { applyDamage, emitNoise } from './combat.js';
import { emitSound } from './audio.js';
import { throwGrenade } from './grenades.js';

const MOVE = CONFIG.movement;
const dir = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const mapHit = createRayHit();
const actorHit = { actor: null, part: 'body', distance: Infinity, x: 0, y: 0, z: 0 };

function clamp(value, min, max) {
	return value < min ? min : value > max ? max : value;
}

function rayBox(ox, oy, oz, dx, dy, dz, minX, minY, minZ, maxX, maxY, maxZ, maxDistance) {
	let tMin = 0;
	let tMax = maxDistance;
	if (Math.abs(dx) < 1e-9) {
		if (ox < minX || ox > maxX) return Infinity;
	} else {
		let t1 = (minX - ox) / dx;
		let t2 = (maxX - ox) / dx;
		if (t1 > t2) {
			const swap = t1;
			t1 = t2;
			t2 = swap;
		}
		if (t1 > tMin) tMin = t1;
		if (t2 < tMax) tMax = t2;
		if (tMin > tMax) return Infinity;
	}
	if (Math.abs(dy) < 1e-9) {
		if (oy < minY || oy > maxY) return Infinity;
	} else {
		let t1 = (minY - oy) / dy;
		let t2 = (maxY - oy) / dy;
		if (t1 > t2) {
			const swap = t1;
			t1 = t2;
			t2 = swap;
		}
		if (t1 > tMin) tMin = t1;
		if (t2 < tMax) tMax = t2;
		if (tMin > tMax) return Infinity;
	}
	if (Math.abs(dz) < 1e-9) {
		if (oz < minZ || oz > maxZ) return Infinity;
	} else {
		let t1 = (minZ - oz) / dz;
		let t2 = (maxZ - oz) / dz;
		if (t1 > t2) {
			const swap = t1;
			t1 = t2;
			t2 = swap;
		}
		if (t1 > tMin) tMin = t1;
		if (t2 < tMax) tMax = t2;
		if (tMin > tMax) return Infinity;
	}
	return tMin;
}

function raycastActors(state, shooter, ox, oy, oz, dx, dy, dz, maxDistance) {
	let best = maxDistance;
	actorHit.actor = null;
	actorHit.part = 'body';
	actorHit.distance = Infinity;
	for (let index = 0; index < state.actors.length; index += 1) {
		const actor = state.actors[index];
		if (!actor.alive || actor === shooter || actor.team === shooter.team) continue;
		const feet = actor.position.y;
		const headHeight = Math.min(0.3, actor.height * 0.2);
		const bodyTop = feet + actor.height - headHeight;
		const bodyT = rayBox(
			ox, oy, oz, dx, dy, dz,
			actor.position.x - 0.28, feet + 0.06, actor.position.z - 0.2,
			actor.position.x + 0.28, bodyTop, actor.position.z + 0.2,
			best,
		);
		const headT = rayBox(
			ox, oy, oz, dx, dy, dz,
			actor.position.x - 0.16, bodyTop, actor.position.z - 0.16,
			actor.position.x + 0.16, feet + actor.height, actor.position.z + 0.16,
			best,
		);
		if (bodyT < best) {
			best = bodyT;
			actorHit.actor = actor;
			actorHit.part = 'body';
			actorHit.distance = bodyT;
		}
		if (headT < best) {
			best = headT;
			actorHit.actor = actor;
			actorHit.part = 'head';
			actorHit.distance = headT;
		}
	}
	if (actorHit.actor) {
		actorHit.x = ox + dx * actorHit.distance;
		actorHit.y = oy + dy * actorHit.distance;
		actorHit.z = oz + dz * actorHit.distance;
	}
	return actorHit;
}

function addTracer(state, sx, sy, sz, dx, dy, dz, length, team) {
	for (let index = 0; index < state.tracers.length; index += 1) {
		const tracer = state.tracers[index];
		if (tracer.active) continue;
		tracer.active = true;
		tracer.x = sx;
		tracer.y = sy;
		tracer.z = sz;
		tracer.dx = dx;
		tracer.dy = dy;
		tracer.dz = dz;
		tracer.length = length;
		tracer.life = 0.055;
		tracer.maxLife = 0.055;
		tracer.team = team;
		return;
	}
}

function impact(state, x, y, z, nx, ny, nz) {
	const decal = state.decals.find((item) => !item.active) || state.decals[state.decalHead++ % state.decals.length];
	Object.assign(decal, { active: true, x, y, z, nx, ny, nz, ttl: 18 });
	for (let index = 0; index < 2; index += 1) {
		const spark = state.sparks.find((item) => !item.active) || state.sparks[state.sparkHead++ % state.sparks.length];
		Object.assign(spark, { active: true, x: x + index * 0.05, y: y + index * 0.03, z, ttl: 0.22 });
	}
}

function spreadTarget(actor, weapon) {
	const speed = Math.hypot(actor.velocity.x, actor.velocity.z);
	let multiplier = 1 + weapon.moveMultiplier * Math.min(1, speed / MOVE.walkSpeed);
	if (!actor.onGround) multiplier = Math.max(multiplier, weapon.airMultiplier);
	if (actor.crouching) multiplier *= weapon.crouchMultiplier;
	const base = actor.scoped ? weapon.scopedSpread ?? weapon.baseSpread : weapon.baseSpread;
	return Math.min(weapon.spreadMax, base * multiplier);
}

function computeAim(state, actor) {
	const spread = actor.spread;
	const yaw = actor.yaw + actor.recoilYaw;
	const pitch = clamp(actor.pitch + actor.recoilPitch, -CONFIG.view.pitchLimit, CONFIG.view.pitchLimit);
	const cosPitch = Math.cos(pitch);
	dir.set(-Math.sin(yaw) * cosPitch, Math.sin(pitch), -Math.cos(yaw) * cosPitch).normalize();
	right.set(Math.cos(yaw), 0, -Math.sin(yaw));
	if (spread > 0) {
		const angle = state.rng() * Math.PI * 2;
		const radius = Math.sqrt(state.rng()) * spread;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		dir.x += (right.x * cos + up.x * sin) * radius;
		dir.y += (right.y * cos + up.y * sin) * radius;
		dir.z += (right.z * cos + up.z * sin) * radius;
		dir.normalize();
	}
}

export function fireHitscan(state, actor, weapon) {
	weapon.mag -= 1;
	weapon.fireCooldown = weapon.fireInterval;
	weapon.kick = 1;
	weapon.muzzleFlash = weapon.flashTime;
	actor.spread = Math.min(weapon.spreadMax, actor.spread + weapon.spreadPerShot);
	const pattern = weapon.recoilPattern;
	const step = actor.shotIndex % pattern.length;
	actor.shotIndex += 1;
	actor.recoilPitch += pattern[step][0];
	actor.recoilYaw += pattern[step][1];
	emitNoise(state, actor.position.x, actor.position.z, actor.team, actor.id);
	emitSound(state, 'shot', actor.position.x, actor.position.y + actor.eye, actor.position.z, weapon.kind);

	computeAim(state, actor);
	const eyeY = actor.position.y + actor.eye;
	raycastSolids(actor.position.x, eyeY, actor.position.z, dir.x, dir.y, dir.z, weapon.range, mapHit);
	const mapDistance = mapHit.hit ? mapHit.distance : Infinity;
	const hit = raycastActors(
		state,
		actor,
		actor.position.x,
		eyeY,
		actor.position.z,
		dir.x,
		dir.y,
		dir.z,
		Math.min(weapon.range, mapDistance),
	);
	let endX = actor.position.x + dir.x * weapon.range;
	let endY = eyeY + dir.y * weapon.range;
	let endZ = actor.position.z + dir.z * weapon.range;

	if (hit.actor) {
		const damage = weapon.damage * (hit.part === 'head' ? weapon.headshotMultiplier : 1);
		applyDamage(state, hit.actor, damage, actor, weapon, hit.part);
		if (actor.isPlayer) {
			state.ui.hitMarker = 0.09;
			state.ui.hitHead = hit.part === 'head';
			emitSound(state, hit.part === 'head' ? 'head' : 'hit', hit.x, hit.y, hit.z);
		}
		endX = hit.x;
		endY = hit.y;
		endZ = hit.z;
	} else if (mapHit.hit) {
		endX = mapHit.x;
		endY = mapHit.y;
		endZ = mapHit.z;
		impact(state, mapHit.x, mapHit.y, mapHit.z, mapHit.normalX, mapHit.normalY, mapHit.normalZ);
		emitSound(state, 'hit', mapHit.x, mapHit.y, mapHit.z);
	}

	const startX = actor.position.x + right.x * 0.14 + dir.x * 0.4;
	const startY = eyeY - 0.07 + dir.y * 0.4;
	const startZ = actor.position.z + right.z * 0.14 + dir.z * 0.4;
	const length = Math.hypot(endX - startX, endY - startY, endZ - startZ);
	addTracer(state, startX, startY, startZ, dir.x, dir.y, dir.z, length, actor.team);
}

export function startReload(state, actor, silent = false) {
	const weapon = actor.slots[actor.slot];
	if (weapon.reloadLeft > 0 || weapon.mag >= weapon.magazine || weapon.reserve <= 0) return false;
	weapon.reloadLeft = weapon.reloadTime;
	weapon.emptyClick = 0;
	if (actor.isPlayer && !silent) {
		state.ui.message = 'RELOADING';
		state.ui.messageTime = weapon.reloadTime;
	}
	emitSound(state, 'reload', actor.position.x, actor.position.y + actor.eye, actor.position.z);
	return true;
}

export function stepWeapons(state, input, dt) {
	const player = state.player;
	const weapon = player.slots[player.slot];
	if (!weapon || !weapon.magazine) {
		player.scoped = false;
		if (weapon?.kind === 'grenade') {
			const kind = player.grenades.frag > 0 ? 'frag' : player.grenades.smoke > 0 ? 'smoke' : null;
			if (kind && (input.firePressed || input.aimPressed)
				&& throwGrenade(state, player, kind, Boolean(input.aimPressed))) {
				player.shotIndex = 0;
				if (player.grenades.frag + player.grenades.smoke === 0) {
					player.lastSlot = player.slot;
					player.slot = 1;
				}
			}
		}
		input.firePressed = false;
		input.aimPressed = false;
		input.reloadPressed = false;
		return;
	}
	player.scoped = Boolean(input.aim && weapon.scope && weapon.reloadLeft === 0);
	if (!input.fire && !input.firePressed) player.shotIndex = 0;
	weapon.fireCooldown = Math.max(0, weapon.fireCooldown - dt);
	weapon.emptyClick = Math.max(0, weapon.emptyClick - dt);
	weapon.muzzleFlash = Math.max(0, weapon.muzzleFlash - dt);
	weapon.kick += (0 - weapon.kick) * Math.min(1, dt * 18);
	player.recoilPitch += (0 - player.recoilPitch) * Math.min(1, dt * weapon.recoilRecovery);
	player.recoilYaw += (0 - player.recoilYaw) * Math.min(1, dt * weapon.recoilRecovery);
	player.spread += (spreadTarget(player, weapon) - player.spread) * Math.min(1, dt * weapon.spreadRecovery);

	if (weapon.reloadLeft > 0) {
		weapon.reloadLeft = Math.max(0, weapon.reloadLeft - dt);
		if (weapon.reloadLeft === 0) {
			const needed = weapon.magazine - weapon.mag;
			const taken = Math.min(needed, weapon.reserve);
			weapon.mag += taken;
			weapon.reserve -= taken;
			if (state.ui.message === 'RELOADING') state.ui.messageTime = 0;
		}
	} else if (state.ui.message === 'RELOADING') {
		state.ui.messageTime = 0;
	}

	if (input.reloadPressed) {
		input.reloadPressed = false;
		startReload(state, player);
	}
	if (!player.alive) return;

	const wantsFire = weapon.automatic ? input.fire : input.firePressed;
	if (wantsFire && state.match.setupTime <= 0
		&& state.ui.overlay === 'none' && state.view.mode === 'player') {
		if (weapon.reloadLeft > 0) {
			input.firePressed = false;
		} else if (weapon.mag <= 0) {
			if (weapon.reserve > 0) startReload(state, player);
			else if (weapon.emptyClick <= 0) {
				weapon.emptyClick = 0.2;
				weapon.fireCooldown = 0.25;
				state.ui.message = 'EMPTY MAG';
				state.ui.messageTime = 0.9;
				emitSound(state, 'empty', player.position.x, player.position.y + player.eye, player.position.z);
			}
		} else if (weapon.fireCooldown <= 0) {
			fireHitscan(state, player, weapon);
		}
	}
	if (!weapon.automatic) input.firePressed = false;
	input.aimPressed = false;

	for (let index = 0; index < state.tracers.length; index += 1) {
		const tracer = state.tracers[index];
		if (!tracer.active) continue;
		tracer.life -= dt;
		if (tracer.life <= 0) tracer.active = false;
	}
}
