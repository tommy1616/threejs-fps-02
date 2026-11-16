import * as THREE from 'three';
import { CONFIG } from './config.js';
import { PALETTE } from './palette.js';
import { MAP } from './map.js';
import { createViewmodels } from './viewmodel.js';
import { createBotRenders } from './botsRender.js';
import { createProps, createSky, createTextures } from './art.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

function lerp(a, b, t) {
	return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
	let delta = (b - a) % (Math.PI * 2);
	if (delta > Math.PI) delta -= Math.PI * 2;
	else if (delta < -Math.PI) delta += Math.PI * 2;
	return a + delta * t;
}

function material(color, roughness, metalness, emissive = null) {
	const options = { color: new THREE.Color(color), roughness, metalness };
	if (emissive) {
		options.emissive = new THREE.Color(emissive);
		options.emissiveIntensity = 0.22;
	}
	return new THREE.MeshStandardMaterial(options);
}

function createMaterials(textures) {
	const materials = {
		salt: material(PALETTE.salt, 0.96, 0.02),
		sand: material(PALETTE.sand, 0.9, 0.03),
		steel: material(PALETTE.steel, 0.68, 0.22),
		rust: material(PALETTE.rust, 0.78, 0.16),
		crate: material(PALETTE.crate, 0.86, 0.04),
		accent: material(PALETTE.accent, 0.5, 0.25, PALETTE.accent),
		ink: material(PALETTE.ink, 0.8, 0.12),
		vanguard: material(PALETTE.vanguard, 0.65, 0.12),
		syndicate: material(PALETTE.syndicate, 0.65, 0.12),
		white: material(PALETTE.white, 0.7, 0.05),
	};
	materials.salt.map = textures.floor;
	materials.sand.map = textures.wall;
	materials.crate.map = textures.wood;
	return materials;
}

function mesh(geometry, mat) {
	const item = new THREE.Mesh(geometry, mat);
	item.castShadow = true;
	item.receiveShadow = true;
	return item;
}

function buildMap(scene, materials) {
	for (let index = 0; index < MAP.boxes.length; index += 1) {
		const box = MAP.boxes[index];
		const item = mesh(UNIT_BOX, materials[box.mat] ?? materials.sand);
		item.scale.set(box.maxX - box.minX, box.maxY - box.minY, box.maxZ - box.minZ);
		item.position.set(
			(box.minX + box.maxX) * 0.5,
			(box.minY + box.maxY) * 0.5,
			(box.minZ + box.maxZ) * 0.5,
		);
		if (box.kind === 'floor') item.castShadow = false;
		scene.add(item);
	}
}

function buildLights(scene) {
	const sky = new THREE.HemisphereLight(new THREE.Color(PALETTE.sky), new THREE.Color(PALETTE.sand), 1.35);
	scene.add(sky);

	const key = new THREE.DirectionalLight(new THREE.Color(PALETTE.white), 2.6);
	key.position.set(18, 28, 12);
	key.target.position.set(0, 0, -2);
	key.castShadow = true;
	key.shadow.mapSize.set(2048, 2048);
	key.shadow.camera.left = -32;
	key.shadow.camera.right = 32;
	key.shadow.camera.top = 32;
	key.shadow.camera.bottom = -32;
	key.shadow.camera.near = 1;
	key.shadow.camera.far = 80;
	key.shadow.bias = -0.0007;
	scene.add(key, key.target);

	const fill = new THREE.DirectionalLight(new THREE.Color(PALETTE.muted), 0.7);
	fill.position.set(-14, 16, -18);
	scene.add(fill);

	const aGlow = new THREE.PointLight(new THREE.Color(PALETTE.accent), 4, 12, 2);
	aGlow.position.set(-17, 3.2, -9);
	scene.add(aGlow);
	const bGlow = new THREE.PointLight(new THREE.Color(PALETTE.accent), 4, 12, 2);
	bGlow.position.set(17, 3.2, -9);
	scene.add(bGlow);
}

function createObjectiveView(scene, materials) {
	for (const id of ['A', 'B']) {
		const site = MAP.sites[id];
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 256;
		const ctx = canvas.getContext('2d');
		ctx.strokeStyle = id === 'A' ? PALETTE.vanguard : PALETTE.syndicate;
		ctx.lineWidth = 10;
		ctx.beginPath();
		ctx.arc(128, 128, 104, 0, Math.PI * 2);
		ctx.stroke();
		ctx.font = 'bold 150px system-ui, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.lineWidth = 10;
		ctx.strokeStyle = PALETTE.white;
		ctx.strokeText(id, 128, 136);
		ctx.fillStyle = PALETTE.ink;
		ctx.fillText(id, 128, 136);
		const texture = new THREE.CanvasTexture(canvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		const marker = new THREE.Mesh(
			new THREE.PlaneGeometry(5.4, 5.4),
			new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
		);
		marker.rotation.x = -Math.PI * 0.5;
		marker.position.set(site.plantX, 0.015, site.plantZ + 2.5);
		scene.add(marker);
	}

	const group = new THREE.Group();
	const body = mesh(UNIT_BOX, materials.rust);
	body.scale.set(0.34, 0.22, 0.5);
	body.position.y = 0.11;
	group.add(body);
	const panel = mesh(UNIT_BOX, materials.accent);
	panel.scale.set(0.22, 0.06, 0.3);
	panel.position.y = 0.24;
	group.add(panel);
	const light = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 4, 2);
	light.position.y = 0.3;
	group.add(light);
	group.visible = false;
	scene.add(group);

	function update(state) {
		const objective = state.objective;
		const visible = objective.state === 'carried' || objective.state === 'ground' || objective.state === 'planted';
		group.visible = visible;
		if (!visible) return;
		let x = objective.x;
		let y = 0.12;
		let z = objective.z;
		let yaw = 0;
		if (objective.state === 'carried') {
			let carrier = null;
			for (let index = 0; index < state.actors.length; index += 1) {
				if (state.actors[index].id === objective.carrierId) {
					carrier = state.actors[index];
					break;
				}
			}
			if (!carrier) return;
			if (carrier.isPlayer) {
				group.visible = false;
				return;
			}
			x = carrier.position.x + Math.sin(carrier.yaw) * 0.24;
			y = carrier.position.y + 1.12;
			z = carrier.position.z + Math.cos(carrier.yaw) * 0.24;
			yaw = carrier.yaw;
		} else if (objective.state === 'planted') {
			y = 0.16;
		}
		group.position.set(x, y, z);
		group.rotation.y = yaw;
		light.intensity = objective.planted ? (Math.sin(state.time * 8) > 0 ? 2.6 : 0.15) : 0.5;
	}

	return { update };
}

function createNadeView(scene, state) {
	const geo = new THREE.SphereGeometry(1, 8, 6);
	const smokeMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(PALETTE.white),
		transparent: true,
		opacity: 0.17,
		depthWrite: false,
	});
	const blastMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(PALETTE.accent),
		transparent: true,
		opacity: 0.65,
		depthWrite: false,
	});
	const smokes = state.smokes.map(() => {
		const group = new THREE.Group();
		for (let index = 0; index < 3; index += 1) group.add(new THREE.Mesh(geo, smokeMat));
		group.visible = false;
		scene.add(group);
		return group;
	});
	const blasts = state.blasts.map(() => {
		const item = new THREE.Mesh(geo, blastMat);
		item.visible = false;
		scene.add(item);
		return item;
	});

	return {
		update(state) {
			for (let index = 0; index < smokes.length; index += 1) {
				const item = state.smokes[index];
				const group = smokes[index];
				group.visible = item.active;
				if (!item.active) continue;
				group.position.set(item.x, item.y, item.z);
				const fade = Math.min(1, item.ttl / 2);
				for (let layer = 0; layer < 3; layer += 1) {
					group.children[layer].scale.setScalar(item.radius * (0.55 + layer * 0.28) * (0.9 + 0.1 * fade));
				}
			}
			for (let index = 0; index < blasts.length; index += 1) {
				const item = state.blasts[index];
				const blast = blasts[index];
				blast.visible = item.active;
				if (!item.active) continue;
				blast.position.set(item.x, item.y, item.z);
				blast.scale.setScalar(0.5 + (1 - item.ttl / item.maxTtl) * 2.2);
			}
		},
	};
}

function impactPoints(scene, count, size, color) {
	const positions = new Float32Array(count * 3).fill(-1000);
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	const points = new THREE.Points(geometry, new THREE.PointsMaterial({
		color, size, transparent: true, opacity: 0.75, depthWrite: false,
	}));
	points.frustumCulled = false;
	scene.add(points);
	return { positions, update: () => { geometry.attributes.position.needsUpdate = true; } };
}

function createImpactView(scene, state) {
	const decals = impactPoints(scene, state.decals.length, 0.16, PALETTE.ink);
	const sparks = impactPoints(scene, state.sparks.length, 0.07, PALETTE.accent);
	return {
		update(state) {
			for (let index = 0; index < state.decals.length; index += 1) {
				const item = state.decals[index];
				const offset = index * 3;
				decals.positions[offset] = item.active ? item.x : 0;
				decals.positions[offset + 1] = item.active ? item.y : -1000;
				decals.positions[offset + 2] = item.active ? item.z : 0;
			}
			for (let index = 0; index < state.sparks.length; index += 1) {
				const item = state.sparks[index];
				const offset = index * 3;
				sparks.positions[offset] = item.active ? item.x : 0;
				sparks.positions[offset + 1] = item.active ? item.y : -1000;
				sparks.positions[offset + 2] = item.active ? item.z : 0;
			}
			decals.update();
			sparks.update();
		},
	};
}

export function createWorld(container, state) {
	const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.view.pixelRatioCap));
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.16;
	container.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(PALETTE.sky);
	scene.fog = new THREE.FogExp2(new THREE.Color(PALETTE.fog), 0.009);
	const camera = new THREE.PerspectiveCamera(
		CONFIG.view.fov,
		window.innerWidth / window.innerHeight,
		CONFIG.view.near,
		CONFIG.view.far,
	);
	camera.rotation.order = 'YXZ';
	scene.add(camera);

	const textures = createTextures(state.seed);
	const materials = createMaterials(textures);
	buildMap(scene, materials);
	buildLights(scene);
	createSky(scene);
	createProps(scene, materials, textures, MAP.props);
	const objectiveView = createObjectiveView(scene, materials);
	const nadeView = createNadeView(scene, state);
	const impactView = createImpactView(scene, state);
	const botRenders = createBotRenders(scene, state);
	const viewmodels = createViewmodels(camera, scene, state);

	function onResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}
	window.addEventListener('resize', onResize);

	function updateCamera(state, alpha) {
		const player = state.player;
		if (state.view.mode === 'menu') {
			const pose = state.view.menuPose;
			camera.position.copy(pose.position);
			camera.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
			if (camera.fov !== CONFIG.view.fov) {
				camera.fov = CONFIG.view.fov;
				camera.updateProjectionMatrix();
			}
			return;
		}
		camera.position.set(
			lerp(player.prevPosition.x, player.position.x, alpha),
			lerp(player.prevPosition.y, player.position.y, alpha) + player.eye,
			lerp(player.prevPosition.z, player.position.z, alpha),
		);
		const pitch = lerp(player.prevPitch, player.pitch, alpha) + player.recoilPitch;
		const yaw = lerpAngle(player.prevYaw, player.yaw, alpha) + player.recoilYaw;
		camera.rotation.set(
			Math.max(-CONFIG.view.pitchLimit, Math.min(CONFIG.view.pitchLimit, pitch)),
			yaw,
			0,
			'YXZ',
		);
		const targetFov = player.scoped ? 22 : CONFIG.view.fov;
		if (Math.abs(camera.fov - targetFov) > 0.05) {
			camera.fov += (targetFov - camera.fov) * 0.4;
			camera.updateProjectionMatrix();
		}
		if (player.shake > 0) {
			const amp = player.shake * 0.06;
			camera.position.x += Math.sin(state.time * 71) * amp;
			camera.position.y += Math.sin(state.time * 53) * amp;
			camera.rotation.z = Math.sin(state.time * 67) * amp;
		}
	}

	function render(state, alpha) {
		updateCamera(state, alpha);
		objectiveView.update(state);
		nadeView.update(state);
		impactView.update(state);
		botRenders.update(state, alpha);
		viewmodels.update(state);
		renderer.render(scene, camera);
	}

	return { renderer, scene, camera, domElement: renderer.domElement, render, resize: onResize };
}
