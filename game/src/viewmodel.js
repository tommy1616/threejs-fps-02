import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { WEAPONS } from './weapons.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const FLASH_GEO = new THREE.PlaneGeometry(0.14, 0.14);

function mat(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
  });
}

function makeMaterials() {
  return {
    ink: mat(PALETTE.ink, 0.75, 0.16),
    steel: mat(PALETTE.steel, 0.55, 0.35),
    crate: mat(PALETTE.crate, 0.82, 0.05),
    accent: mat(PALETTE.accent, 0.45, 0.3),
    vanguard: mat(PALETTE.vanguard, 0.55, 0.18),
  };
}

function part(material, sx, sy, sz, x, y, z) {
  const item = new THREE.Mesh(UNIT_BOX, material);
  item.scale.set(sx, sy, sz);
  item.position.set(x, y, z);
  item.castShadow = false;
  item.receiveShadow = false;
  return item;
}

function addFlash(group, materials, x, y, z) {
  const flash = new THREE.Mesh(
    FLASH_GEO,
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETTE.accent),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  flash.position.set(x, y, z);
  flash.visible = false;
  group.add(flash);
  const light = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 4, 2);
  light.position.set(x, y, z);
  group.add(light);
  return { flash, light };
}

function buildRifle(materials) {
  const group = new THREE.Group();
  group.add(part(materials.steel, 0.09, 0.1, 0.52, 0, 0, 0));
  group.add(part(materials.ink, 0.04, 0.04, 0.44, 0, 0.02, -0.46));
  group.add(part(materials.crate, 0.08, 0.09, 0.24, 0, -0.01, 0.36));
  group.add(part(materials.ink, 0.06, 0.18, 0.1, 0, -0.13, -0.04));
  group.add(part(materials.vanguard, 0.025, 0.03, 0.12, 0, 0.065, -0.1));
  const flash = addFlash(group, materials, 0, 0.02, -0.7);
  return { group, baseX: 0.32, baseY: -0.3, baseZ: -0.7, scale: 0.74, flash };
}

function buildSmg(materials) {
  const group = new THREE.Group();
  group.add(part(materials.ink, 0.08, 0.09, 0.34, 0, 0, 0));
  group.add(part(materials.steel, 0.035, 0.035, 0.24, 0, 0.01, -0.28));
  group.add(part(materials.steel, 0.05, 0.2, 0.09, 0, -0.13, 0.02));
  group.add(part(materials.crate, 0.06, 0.16, 0.08, 0, -0.1, 0.16));
  group.add(part(materials.vanguard, 0.022, 0.028, 0.1, 0, 0.06, -0.08));
  const flash = addFlash(group, materials, 0, 0.015, -0.42);
  return { group, baseX: 0.27, baseY: -0.25, baseZ: -0.56, scale: 0.8, flash };
}

function buildPistol(materials) {
  const group = new THREE.Group();
  group.add(part(materials.steel, 0.07, 0.07, 0.26, 0, 0, 0));
  const grip = part(materials.ink, 0.07, 0.17, 0.11, 0, -0.11, 0.08);
  grip.rotation.x = -0.18;
  group.add(grip);
  group.add(part(materials.accent, 0.022, 0.022, 0.05, 0, 0.045, -0.08));
  const flash = addFlash(group, materials, 0, 0.01, -0.32);
  return { group, baseX: 0.26, baseY: -0.22, baseZ: -0.52, scale: 0.85, flash };
}

function buildTracers(scene, count) {
  const positions = new Float32Array(count * 6);
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', attribute);
  const line = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: new THREE.Color(PALETTE.accent),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  line.frustumCulled = false;
  line.visible = false;
  scene.add(line);
  return { line, positions, attribute };
}

export function createViewmodels(camera, scene, state) {
  const materials = makeMaterials();
  const views = WEAPONS.map((weapon) => {
    const model = weapon.kind === 'rifle'
      ? buildRifle(materials)
      : weapon.kind === 'smg' ? buildSmg(materials) : buildPistol(materials);
    model.group.position.set(model.baseX, model.baseY, model.baseZ);
    model.group.scale.setScalar(model.scale);
    model.group.visible = false;
    camera.add(model.group);
    return { weapon, ...model };
  });

  const tracers = buildTracers(scene, state.tracers.length);

  function update(state) {
    const player = state.player;
    const active = state.view.mode === 'player' && player.alive;
    const speed = Math.hypot(player.velocity.x, player.velocity.z);

    for (let index = 0; index < views.length; index += 1) {
      const view = views[index];
      const weapon = player.slots[index];
      const visible = active && player.slot === index;
      view.group.visible = visible;
      if (!visible) continue;

      const bob = Math.sin(state.time * 9.5) * Math.min(speed, 6) * 0.0018;
      const sway = Math.cos(state.time * 4.7) * Math.min(speed, 6) * 0.0009;
      const reload = weapon.reloadLeft > 0
        ? Math.sin((1 - weapon.reloadLeft / weapon.reloadTime) * Math.PI)
        : 0;
      view.group.position.set(
        view.baseX + sway,
        view.baseY + bob - reload * 0.08 + weapon.kick * 0.012,
        view.baseZ + weapon.kick * 0.055,
      );
      view.group.rotation.set(-reload * 0.55 + weapon.kick * 0.09, 0.02, 0);

      const flashing = weapon.muzzleFlash > 0;
      view.flash.flash.visible = flashing;
      view.flash.light.intensity = flashing ? 5 : 0;
      if (flashing) {
        view.flash.flash.rotation.z = state.time * 24;
        const scale = 0.85 + weapon.muzzleFlash / weapon.flashTime * 0.35;
        view.flash.flash.scale.setScalar(scale);
      }
    }

    let any = false;
    for (let index = 0; index < state.tracers.length; index += 1) {
      const tracer = state.tracers[index];
      const offset = index * 6;
      if (!tracer.active) {
        tracers.positions[offset] = 0;
        tracers.positions[offset + 1] = -1000;
        tracers.positions[offset + 2] = 0;
        tracers.positions[offset + 3] = 0;
        tracers.positions[offset + 4] = -1000;
        tracers.positions[offset + 5] = 0;
        continue;
      }
      any = true;
      tracers.positions[offset] = tracer.x;
      tracers.positions[offset + 1] = tracer.y;
      tracers.positions[offset + 2] = tracer.z;
      tracers.positions[offset + 3] = tracer.x + tracer.dx * tracer.length;
      tracers.positions[offset + 4] = tracer.y + tracer.dy * tracer.length;
      tracers.positions[offset + 5] = tracer.z + tracer.dz * tracer.length;
    }
    tracers.attribute.needsUpdate = true;
    tracers.line.visible = any;
  }

  return { update };
}
