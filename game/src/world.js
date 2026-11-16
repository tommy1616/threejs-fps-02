import * as THREE from 'three';
import { CONFIG } from './config.js';
import { PALETTE } from './palette.js';
import { MAP } from './map.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const HEAD_GEO = new THREE.SphereGeometry(1, 14, 10);

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
  const options = {
    color: new THREE.Color(color),
    roughness,
    metalness,
  };
  if (emissive) {
    options.emissive = new THREE.Color(emissive);
    options.emissiveIntensity = 0.22;
  }
  return new THREE.MeshStandardMaterial(options);
}

function createMaterials() {
  return {
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
  const sky = new THREE.HemisphereLight(new THREE.Color(PALETTE.sky), new THREE.Color(PALETTE.sand), 1.15);
  scene.add(sky);

  const key = new THREE.DirectionalLight(new THREE.Color(PALETTE.white), 2.4);
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

function createBotView(actor, scene, materials) {
  const group = new THREE.Group();
  const teamMat = actor.team === 'vanguard' ? materials.vanguard : materials.syndicate;

  const torso = mesh(UNIT_BOX, materials.ink);
  torso.scale.set(0.52, 0.72, 0.32);
  torso.position.y = 1.06;
  group.add(torso);

  const vest = mesh(UNIT_BOX, teamMat);
  vest.scale.set(0.55, 0.32, 0.36);
  vest.position.y = 1.18;
  group.add(vest);

  const head = mesh(HEAD_GEO, materials.sand);
  head.scale.setScalar(0.155);
  head.position.y = 1.57;
  group.add(head);

  const helmet = mesh(HEAD_GEO, teamMat);
  helmet.scale.set(0.17, 0.1, 0.17);
  helmet.position.y = 1.65;
  group.add(helmet);

  for (const side of [-1, 1]) {
    const leg = mesh(UNIT_BOX, materials.ink);
    leg.scale.set(0.17, 0.7, 0.2);
    leg.position.set(side * 0.13, 0.35, 0);
    group.add(leg);

    const arm = mesh(UNIT_BOX, materials.ink);
    arm.scale.set(0.13, 0.5, 0.16);
    arm.position.set(side * 0.34, 1.08, -0.03);
    arm.rotation.z = side * 0.12;
    group.add(arm);
  }

  const gun = mesh(UNIT_BOX, materials.steel);
  gun.scale.set(0.08, 0.11, 0.62);
  gun.position.set(0.2, 1.2, -0.36);
  group.add(gun);

  group.position.copy(actor.position);
  group.rotation.y = actor.yaw;
  scene.add(group);
  return { actor, group };
}

function buildViewmodels(camera, materials) {
  const views = [];

  const rifle = new THREE.Group();
  const receiver = mesh(UNIT_BOX, materials.steel);
  receiver.scale.set(0.09, 0.1, 0.52);
  rifle.add(receiver);
  const barrel = mesh(UNIT_BOX, materials.ink);
  barrel.scale.set(0.04, 0.04, 0.44);
  barrel.position.set(0, 0.02, -0.46);
  rifle.add(barrel);
  const stock = mesh(UNIT_BOX, materials.crate);
  stock.scale.set(0.08, 0.09, 0.24);
  stock.position.set(0, -0.01, 0.36);
  rifle.add(stock);
  const mag = mesh(UNIT_BOX, materials.ink);
  mag.scale.set(0.06, 0.18, 0.1);
  mag.position.set(0, -0.13, -0.04);
  rifle.add(mag);
  const sight = mesh(UNIT_BOX, materials.vanguard);
  sight.scale.set(0.025, 0.03, 0.12);
  sight.position.set(0, 0.065, -0.1);
  rifle.add(sight);
  rifle.position.set(0.32, -0.3, -0.7);
  rifle.scale.setScalar(0.74);
  camera.add(rifle);
  views.push({ group: rifle, baseX: 0.32, baseY: -0.3, baseZ: -0.7 });

  const smg = new THREE.Group();
  const smgBody = mesh(UNIT_BOX, materials.ink);
  smgBody.scale.set(0.08, 0.09, 0.34);
  smg.add(smgBody);
  const smgBarrel = mesh(UNIT_BOX, materials.steel);
  smgBarrel.scale.set(0.035, 0.035, 0.24);
  smgBarrel.position.set(0, 0.01, -0.28);
  smg.add(smgBarrel);
  const smgMag = mesh(UNIT_BOX, materials.steel);
  smgMag.scale.set(0.05, 0.2, 0.09);
  smgMag.position.set(0, -0.13, 0.02);
  smg.add(smgMag);
  const smgGrip = mesh(UNIT_BOX, materials.crate);
  smgGrip.scale.set(0.06, 0.16, 0.08);
  smgGrip.position.set(0, -0.1, 0.16);
  smg.add(smgGrip);
  smg.position.set(0.27, -0.25, -0.56);
  smg.scale.setScalar(0.8);
  camera.add(smg);
  views.push({ group: smg, baseX: 0.27, baseY: -0.25, baseZ: -0.56 });

  const pistol = new THREE.Group();
  const slide = mesh(UNIT_BOX, materials.steel);
  slide.scale.set(0.07, 0.07, 0.26);
  pistol.add(slide);
  const grip = mesh(UNIT_BOX, materials.ink);
  grip.scale.set(0.07, 0.17, 0.11);
  grip.position.set(0, -0.11, 0.08);
  grip.rotation.x = -0.18;
  pistol.add(grip);
  pistol.position.set(0.26, -0.22, -0.52);
  pistol.scale.setScalar(0.85);
  camera.add(pistol);
  views.push({ group: pistol, baseX: 0.26, baseY: -0.22, baseZ: -0.52 });

  for (const view of views) view.group.visible = false;
  return views;
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

export function createWorld(container, state) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.view.pixelRatioCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(new THREE.Color(PALETTE.fog), 42, 118);

  const camera = new THREE.PerspectiveCamera(CONFIG.view.fov, window.innerWidth / window.innerHeight, CONFIG.view.near, CONFIG.view.far);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  const materials = createMaterials();
  buildMap(scene, materials);
  buildLights(scene);
  const botViews = state.bots.map((actor) => createBotView(actor, scene, materials));
  const viewmodels = buildViewmodels(camera, materials);
  const tracers = buildTracers(scene, state.tracers.length);

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
      return;
    }
    camera.position.set(
      lerp(player.prevPosition.x, player.position.x, alpha),
      lerp(player.prevPosition.y, player.position.y, alpha) + player.eye,
      lerp(player.prevPosition.z, player.position.z, alpha),
    );
    camera.rotation.set(
      lerp(player.prevPitch, player.pitch, alpha),
      lerpAngle(player.prevYaw, player.yaw, alpha),
      0,
      'YXZ',
    );
  }

  function updateBots(state, alpha) {
    for (let index = 0; index < botViews.length; index += 1) {
      const view = botViews[index];
      const actor = view.actor;
      view.group.visible = actor.alive;
      if (!actor.alive) continue;
      view.group.position.set(
        lerp(actor.prevPosition.x, actor.position.x, alpha),
        lerp(actor.prevPosition.y, actor.position.y, alpha),
        lerp(actor.prevPosition.z, actor.position.z, alpha),
      );
      view.group.rotation.y = lerpAngle(actor.prevYaw, actor.yaw, alpha);
    }
  }

  function updateViewmodels(state) {
    const player = state.player;
    const active = state.view.mode === 'player' && player.alive;
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    for (let index = 0; index < viewmodels.length; index += 1) {
      const view = viewmodels[index];
      const weapon = player.slots[index];
      const visible = active && player.slot === index;
      view.group.visible = visible;
      if (!visible) continue;
      const bob = Math.sin(state.time * 9.5) * Math.min(speed, 6) * 0.0018;
      const sway = Math.cos(state.time * 4.7) * Math.min(speed, 6) * 0.0009;
      const reload = weapon.reloadLeft > 0 ? Math.sin((1 - weapon.reloadLeft / weapon.reloadTime) * Math.PI) : 0;
      view.group.position.set(view.baseX + sway, view.baseY + bob - reload * 0.08, view.baseZ);
      view.group.rotation.set(-reload * 0.55, 0.02, 0);
    }
  }

  function updateTracers(state) {
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

  function render(state, alpha) {
    updateCamera(state, alpha);
    updateBots(state, alpha);
    updateViewmodels(state);
    updateTracers(state);
    renderer.render(scene, camera);
  }

  return {
    renderer,
    scene,
    camera,
    domElement: renderer.domElement,
    render,
    resize: onResize,
  };
}
