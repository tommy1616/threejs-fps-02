import * as THREE from 'three';
import { PALETTE } from './palette.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  let delta = (b - a) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  else if (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
}

function material(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
  });
}

function box(materialRef, sx, sy, sz, x, y, z) {
  const item = new THREE.Mesh(BOX, materialRef);
  item.scale.set(sx, sy, sz);
  item.position.set(x, y, z);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function buildFigure(actor, scene, materials) {
  const group = new THREE.Group();
  const teamMat = actor.team === 'vanguard' ? materials.vanguard : materials.syndicate;
  const legs = [];

  for (const side of [-1, 1]) {
    const leg = box(materials.ink, 0.17, 0.7, 0.2, side * 0.13, 0.35, 0);
    group.add(leg);
    legs.push(leg);
    const arm = box(materials.ink, 0.13, 0.48, 0.16, side * 0.34, 1.08, -0.02);
    arm.rotation.z = side * 0.1;
    group.add(arm);
  }

  group.add(box(materials.ink, 0.52, 0.72, 0.32, 0, 1.06, 0));
  group.add(box(teamMat, 0.55, 0.32, 0.36, 0, 1.18, 0));
  group.add(box(materials.sand, 0.32, 0.3, 0.32, 0, 1.57, 0));
  group.add(box(teamMat, 0.35, 0.1, 0.35, 0, 1.73, 0));
  group.add(box(materials.steel, 0.08, 0.11, 0.62, 0.2, 1.2, -0.36));

  group.position.copy(actor.position);
  group.rotation.y = actor.yaw;
  scene.add(group);
  return { actor, group, legs, index: 0 };
}

export function createBotRenders(scene, state) {
  const materials = {
    ink: material(PALETTE.ink, 0.8, 0.12),
    sand: material(PALETTE.sand, 0.85, 0.03),
    steel: material(PALETTE.steel, 0.64, 0.25),
    vanguard: material(PALETTE.vanguard, 0.6, 0.14),
    syndicate: material(PALETTE.syndicate, 0.6, 0.14),
  };

  const views = state.bots.map((actor, index) => {
    const view = buildFigure(actor, scene, materials);
    view.index = index;
    return view;
  });

  function update(state, alpha) {
    for (let index = 0; index < views.length; index += 1) {
      const view = views[index];
      const actor = view.actor;
      const x = lerp(actor.prevPosition.x, actor.position.x, alpha);
      const y = lerp(actor.prevPosition.y, actor.position.y, alpha);
      const z = lerp(actor.prevPosition.z, actor.position.z, alpha);
      const yaw = lerpAngle(actor.prevYaw, actor.yaw, alpha);

      if (!actor.alive) {
        view.group.position.set(x, 0.24, z);
        view.group.rotation.set(-Math.PI * 0.5, yaw, 0);
        for (let leg = 0; leg < view.legs.length; leg += 1) view.legs[leg].rotation.x = 0;
        continue;
      }

      const speed = Math.hypot(actor.velocity.x, actor.velocity.z);
      const bob = Math.sin(state.time * 10 + index * 1.7) * Math.min(speed, 5) * 0.004;
      view.group.position.set(x, y + bob, z);
      view.group.rotation.set(0, yaw, 0);
      const swing = Math.sin(state.time * 10 + index * 1.7) * Math.min(speed, 5) * 0.07;
      view.legs[0].rotation.x = swing;
      view.legs[1].rotation.x = -swing;
    }
  }

  return { update };
}
