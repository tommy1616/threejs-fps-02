import * as THREE from 'three';
import { CONFIG } from './config.js';
import { PALETTE } from './palette.js';
import { MAP } from './map.js';
import { createViewmodels } from './viewmodel.js';
import { createBotRenders } from './botsRender.js';

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
  }

  function render(state, alpha) {
    updateCamera(state, alpha);
    botRenders.update(state, alpha);
    viewmodels.update(state);
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
