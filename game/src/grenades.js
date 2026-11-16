import { CONFIG } from './config.js';
import { createRayHit, overlapBoxes, raycastSolids } from './map.js';
import { applyDamage, emitNoise } from './combat.js';
import { emitSound } from './audio.js';

const RADIUS = 0.1;
const FRAG = { name: 'Frag Charge', reward: 300 };
const ray = createRayHit();

function actorById(state, id) {
	for (let index = 0; index < state.actors.length; index += 1) {
		if (state.actors[index].id === id) return state.actors[index];
	}
	return null;
}

function blast(state, x, y, z, ttl) {
	for (let index = 0; index < state.blasts.length; index += 1) {
		const item = state.blasts[index];
		if (item.active) continue;
		item.active = true;
		item.x = x;
		item.y = y;
		item.z = z;
		item.ttl = ttl;
		item.maxTtl = ttl;
		return;
	}
}

function deploySmoke(state, x, z) {
	for (let index = 0; index < state.smokes.length; index += 1) {
		const item = state.smokes[index];
		if (item.active) continue;
		item.active = true;
		item.x = x;
		item.y = 1;
		item.z = z;
		item.radius = 4.5;
		item.ttl = 15;
		emitNoise(state, x, z, 'vanguard', null, 2.5);
		return;
	}
}

export function throwGrenade(state, actor, kind, lob) {
	if (!actor.alive || actor.grenades[kind] <= 0) return false;
	let grenade = null;
	for (let index = 0; index < state.grenades.length; index += 1) {
		if (!state.grenades[index].active) {
			grenade = state.grenades[index];
			break;
		}
	}
	if (!grenade) return false;
	actor.grenades[kind] -= 1;
	const pitch = actor.pitch + (lob ? 0.42 : 0.16);
	const speed = lob ? 9 : 18;
	const cos = Math.cos(pitch);
	grenade.active = true;
	grenade.kind = kind;
	grenade.x = actor.position.x;
	grenade.y = actor.position.y + actor.eye;
	grenade.z = actor.position.z;
	grenade.vx = -Math.sin(actor.yaw) * cos * speed;
	grenade.vy = Math.sin(pitch) * speed + 1.5;
	grenade.vz = -Math.cos(actor.yaw) * cos * speed;
	grenade.fuse = kind === 'frag' ? 1.6 : 2.2;
	grenade.team = actor.team;
	grenade.ownerId = actor.id;
	return true;
}

function explodeFrag(state, grenade) {
	const owner = actorById(state, grenade.ownerId);
	blast(state, grenade.x, grenade.y, grenade.z, 0.35);
	emitNoise(state, grenade.x, grenade.z, grenade.team, grenade.ownerId, 4);
	emitSound(state, 'explosion', grenade.x, grenade.y, grenade.z);
	for (let index = 0; index < state.actors.length; index += 1) {
		const target = state.actors[index];
		if (!target.alive || target.team === grenade.team) continue;
		const dx = target.position.x - grenade.x;
		const dy = target.position.y + 1 - grenade.y;
		const dz = target.position.z - grenade.z;
		const distance = Math.hypot(dx, dy, dz);
		if (distance > 7 || distance < 0.01) continue;
		raycastSolids(grenade.x, grenade.y, grenade.z, dx / distance, dy / distance, dz / distance, distance, ray);
		if (ray.hit && ray.distance < distance - 0.2) continue;
		applyDamage(state, target, 98 * (1 - distance / 7), owner, FRAG, 'body');
		if (target.isPlayer) target.shake = Math.max(target.shake, 1 - distance / 12);
	}
	if (owner && owner.isPlayer) owner.shake = Math.max(owner.shake, 0.5);
}

function moveGrenade(state, grenade, dt) {
	grenade.vy -= 14 * dt;
	grenade.x += grenade.vx * dt;
	if (overlapBoxes(
		grenade.x - RADIUS, grenade.y - RADIUS, grenade.z - RADIUS,
		grenade.x + RADIUS, grenade.y + RADIUS, grenade.z + RADIUS,
	)) {
		grenade.x -= grenade.vx * dt;
		grenade.vx *= -0.42;
		grenade.vz *= 0.82;
	}
	grenade.z += grenade.vz * dt;
	if (overlapBoxes(
		grenade.x - RADIUS, grenade.y - RADIUS, grenade.z - RADIUS,
		grenade.x + RADIUS, grenade.y + RADIUS, grenade.z + RADIUS,
	)) {
		grenade.z -= grenade.vz * dt;
		grenade.vz *= -0.42;
		grenade.vx *= 0.82;
	}
	grenade.y += grenade.vy * dt;
	if (overlapBoxes(
		grenade.x - RADIUS, grenade.y - RADIUS, grenade.z - RADIUS,
		grenade.x + RADIUS, grenade.y + RADIUS, grenade.z + RADIUS,
	)) {
		grenade.y -= grenade.vy * dt;
		grenade.vy *= -0.38;
		grenade.vx *= 0.78;
		grenade.vz *= 0.78;
		if (grenade.sound <= 0) {
			grenade.sound = 0.14;
			emitNoise(state, grenade.x, grenade.z, grenade.team, grenade.ownerId, 0.7);
		}
	}
	if (grenade.kind === 'smoke' && grenade.y < 0.16 && Math.abs(grenade.vy) < 2.5) {
		deploySmoke(state, grenade.x, grenade.z);
		grenade.active = false;
	}
}

export function stepGrenades(state, dt) {
	for (let index = 0; index < state.grenades.length; index += 1) {
		const grenade = state.grenades[index];
		if (!grenade.active) continue;
		grenade.sound = Math.max(0, grenade.sound - dt);
		grenade.fuse -= dt;
		const out = grenade.x < -30 || grenade.x > 30 || grenade.z < -30 || grenade.z > 30 || grenade.y < -5;
		if (grenade.fuse <= 0 || out) {
			if (grenade.kind === 'frag') explodeFrag(state, grenade);
			else deploySmoke(state, grenade.x, grenade.z);
			grenade.active = false;
			continue;
		}
		moveGrenade(state, grenade, dt);
	}
	for (let index = 0; index < state.smokes.length; index += 1) {
		const smoke = state.smokes[index];
		if (!smoke.active) continue;
		smoke.ttl -= dt;
		if (smoke.ttl <= 0) smoke.active = false;
	}
	for (let index = 0; index < state.blasts.length; index += 1) {
		const item = state.blasts[index];
		if (!item.active) continue;
		item.ttl -= dt;
		if (item.ttl <= 0) item.active = false;
	}
	state.player.shake = Math.max(0, state.player.shake - dt * 1.8);
}

export function smokeBlocks(state, ax, ay, az, bx, by, bz) {
	const dx = bx - ax;
	const dy = by - ay;
	const dz = bz - az;
	const lengthSq = dx * dx + dy * dy + dz * dz || 1;
	for (let index = 0; index < state.smokes.length; index += 1) {
		const smoke = state.smokes[index];
		if (!smoke.active) continue;
		let t = ((smoke.x - ax) * dx + (smoke.y - ay) * dy + (smoke.z - az) * dz) / lengthSq;
		t = Math.max(0, Math.min(1, t));
		const px = ax + dx * t - smoke.x;
		const py = ay + dy * t - smoke.y;
		const pz = az + dz * t - smoke.z;
		if (px * px + py * py + pz * pz < smoke.radius * smoke.radius) return true;
	}
	return false;
}
