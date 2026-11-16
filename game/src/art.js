// art.js — procedural textures, sky and map props.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { mulberry32 } from './rng.js';

const UNIT = new THREE.BoxGeometry(1, 1, 1);
const BARREL = new THREE.CylinderGeometry(0.3, 0.34, 0.9, 10);
const PIPE = new THREE.CylinderGeometry(0.11, 0.11, 1, 8);

function texture(size, repeat, draw) {
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	draw(canvas.getContext('2d'), size);
	const map = new THREE.CanvasTexture(canvas);
	map.wrapS = map.wrapT = THREE.RepeatWrapping;
	map.repeat.set(repeat, repeat);
	map.colorSpace = THREE.SRGBColorSpace;
	return map;
}

export function createTextures(seed) {
	const rng = mulberry32(seed ^ 0x51ed270b);
	const specks = (ctx, size, count) => {
		for (let index = 0; index < count; index += 1) {
			ctx.fillStyle = `rgba(38,45,42,${rng() * 0.16})`;
			ctx.fillRect(rng() * size, rng() * size, 2, 2);
		}
	};
	const wall = texture(256, 2, (ctx, size) => {
		ctx.fillStyle = PALETTE.sand;
		ctx.fillRect(0, 0, size, size);
		specks(ctx, size, 550);
		for (let index = 0; index < 4; index += 1) {
			ctx.fillStyle = `rgba(120,92,55,${0.06 + rng() * 0.07})`;
			ctx.beginPath();
			ctx.arc(rng() * size, rng() * size, 14 + rng() * 22, 0, Math.PI * 2);
			ctx.fill();
		}
	});
	const floor = texture(256, 8, (ctx, size) => {
		ctx.fillStyle = PALETTE.salt;
		ctx.fillRect(0, 0, size, size);
		specks(ctx, size, 420);
		ctx.strokeStyle = 'rgba(84,74,55,0.28)';
		for (let index = 0; index < 4; index += 1) {
			ctx.beginPath();
			ctx.moveTo(rng() * size, rng() * size);
			ctx.lineTo(rng() * size, rng() * size);
			ctx.stroke();
		}
	});
	const wood = texture(256, 1, (ctx, size) => {
		ctx.fillStyle = PALETTE.crate;
		ctx.fillRect(0, 0, size, size);
		for (let plank = 0; plank < 5; plank += 1) {
			ctx.fillStyle = plank % 2 ? 'rgba(86,57,30,0.16)' : 'rgba(255,238,198,0.08)';
			ctx.fillRect(0, plank * 52, size, 48);
			ctx.fillStyle = 'rgba(55,40,26,0.42)';
			ctx.fillRect(0, plank * 52 + 50, size, 2);
		}
		ctx.strokeStyle = 'rgba(31,42,40,0.55)';
		ctx.lineWidth = 4;
		ctx.strokeRect(10, 10, size - 20, size - 20);
		ctx.fillStyle = 'rgba(31,42,40,0.55)';
		ctx.font = 'bold 24px system-ui, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('SALTWORKS', size / 2, size * 0.55);
	});
	const signs = new Map();
	function sign(text, color) {
		const key = `${text}:${color}`;
		if (signs.has(key)) return signs.get(key);
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 160;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, 512, 160);
		ctx.fillStyle = PALETTE.ink;
		ctx.font = 'bold 72px system-ui, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(text, 256, 84);
		const map = new THREE.CanvasTexture(canvas);
		map.colorSpace = THREE.SRGBColorSpace;
		signs.set(key, map);
		return map;
	}
	return { wall, floor, wood, sign };
}

export function createSky(scene) {
	const material = new THREE.ShaderMaterial({
		side: THREE.BackSide,
		depthWrite: false,
		uniforms: {
			top: { value: new THREE.Color(0.68, 0.82, 0.81) },
			bottom: { value: new THREE.Color(0.94, 0.86, 0.72) },
		},
		vertexShader: 'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
		fragmentShader: 'varying vec3 v;uniform vec3 top;uniform vec3 bottom;void main(){float h=clamp(normalize(v).y*1.7+0.4,0.0,1.0);gl_FragColor=vec4(mix(bottom,top,h),1.0);}',
	});
	scene.add(new THREE.Mesh(new THREE.SphereGeometry(150, 20, 12), material));
}

function mesh(material, sx, sy, sz, x, y, z, geometry = UNIT) {
	const item = new THREE.Mesh(geometry, material);
	item.scale.set(sx, sy, sz);
	item.position.set(x, y, z);
	item.castShadow = true;
	item.receiveShadow = true;
	return item;
}

export function createProps(scene, materials, textures, props) {
	for (const prop of props) {
		if (prop.type === 'relay') {
			scene.add(mesh(materials.steel, 0.9, 0.8, 0.55, prop.x, 0.4, prop.z));
			scene.add(mesh(materials.steel, 0.08, 1.5, 0.08, prop.x, 1.2, prop.z));
			scene.add(mesh(materials[prop.color], 0.75, 0.08, 0.58, prop.x, 0.82, prop.z));
		} else if (prop.type === 'barrel') {
			scene.add(mesh(materials.rust, 1, 1, 1, prop.x, 0.45, prop.z, BARREL));
		} else if (prop.type === 'pipe') {
			const pipe = mesh(materials.rust, 1, prop.len, 1, prop.x, 2.7, prop.z, PIPE);
			pipe.rotation.z = Math.PI * 0.5;
			scene.add(pipe);
		} else if (prop.type === 'lamp') {
			scene.add(mesh(materials.steel, 0.16, 3.8, 0.16, prop.x, 1.9, prop.z));
			scene.add(mesh(materials.accent, 0.5, 0.18, 0.5, prop.x, 3.85, prop.z));
		} else if (prop.type === 'catwalk') {
			scene.add(mesh(materials.steel, 1.6, 0.16, prop.len, prop.x, 2.8, prop.z));
			scene.add(mesh(materials.rust, 0.08, 0.7, prop.len, prop.x + 0.76, 3.2, prop.z));
		} else if (prop.type === 'sign') {
			const panel = new THREE.Mesh(
				new THREE.PlaneGeometry(2.6, 0.82),
				new THREE.MeshBasicMaterial({ map: textures.sign(prop.text, prop.color || PALETTE.salt), side: THREE.DoubleSide }),
			);
			panel.position.set(prop.x, prop.y, prop.z);
			panel.rotation.y = prop.yaw || 0;
			scene.add(panel);
		} else if (prop.type === 'paint') {
			const material = new THREE.MeshBasicMaterial({
				color: new THREE.Color(prop.color || PALETTE.accent),
				transparent: true,
				opacity: 0.55,
				depthWrite: false,
			});
			const plane = new THREE.Mesh(new THREE.PlaneGeometry(prop.w, prop.d), material);
			plane.rotation.x = -Math.PI * 0.5;
			plane.rotation.z = prop.yaw || 0;
			plane.position.set(prop.x, 0.025, prop.z);
			scene.add(plane);
		}
	}
}
