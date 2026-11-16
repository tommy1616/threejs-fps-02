const EPSILON = 1e-5;

const box = (id, minX, minY, minZ, maxX, maxY, maxZ, mat, kind = 'solid') => Object.freeze({
  id, minX, minY, minZ, maxX, maxY, maxZ, mat, kind,
});

const BOXES = Object.freeze([
  box('floor', -26, -1, -24, 26, 0, 24, 'salt', 'floor'),
  box('wall-west', -26, 0, -24, -25, 5.4, 24, 'steel', 'wall'),
  box('wall-east', 25, 0, -24, 26, 5.4, 24, 'steel', 'wall'),
  box('wall-south', -26, 0, 23, 26, 5.4, 24, 'steel', 'wall'),
  box('wall-north', -26, 0, -24, 26, 5.4, -23, 'steel', 'wall'),

  box('atk-wall-w', -25, 0, 16, -23, 4.6, 17, 'sand', 'wall'),
  box('atk-wall-cw', -18, 0, 16, -4, 4.6, 17, 'sand', 'wall'),
  box('atk-wall-ce', 4, 0, 16, 18, 4.6, 17, 'sand', 'wall'),
  box('atk-wall-e', 23, 0, 16, 25, 4.6, 17, 'sand', 'wall'),

  box('def-wall-w', -25, 0, -17, -21, 4.6, -16, 'sand', 'wall'),
  box('def-wall-cw', -15, 0, -17, -4, 4.6, -16, 'sand', 'wall'),
  box('def-wall-ce', 4, 0, -17, 15, 4.6, -16, 'sand', 'wall'),
  box('def-wall-e', 21, 0, -17, 25, 4.6, -16, 'sand', 'wall'),

  box('mid-w-s', -5, 0, -16, -4, 4.6, -10, 'steel', 'wall'),
  box('mid-w-m', -5, 0, -7, -4, 4.6, 3, 'steel', 'wall'),
  box('mid-w-n', -5, 0, 7, -4, 4.6, 16, 'steel', 'wall'),
  box('mid-e-s', 4, 0, -16, 5, 4.6, -10, 'steel', 'wall'),
  box('mid-e-m', 4, 0, -7, 5, 4.6, 3, 'steel', 'wall'),
  box('mid-e-n', 4, 0, 7, 5, 4.6, 16, 'steel', 'wall'),

  box('a-wall-e1', -10, 0, -16, -9, 4.6, -10, 'sand', 'wall'),
  box('a-wall-e2', -10, 0, -7, -9, 4.6, -4, 'sand', 'wall'),
  box('a-wall-s1', -25, 0, -4, -20, 4.6, -3, 'sand', 'wall'),
  box('a-wall-s2', -16, 0, -4, -10, 4.6, -3, 'sand', 'wall'),
  box('b-wall-w1', 9, 0, -16, 10, 4.6, -10, 'sand', 'wall'),
  box('b-wall-w2', 9, 0, -7, 10, 4.6, -4, 'sand', 'wall'),
  box('b-wall-s1', 10, 0, -4, 16, 4.6, -3, 'sand', 'wall'),
  box('b-wall-s2', 20, 0, -4, 25, 4.6, -3, 'sand', 'wall'),

  box('west-div-s', -17, 0, -3, -16, 4.6, 3, 'steel', 'wall'),
  box('west-div-n', -17, 0, 7, -16, 4.6, 16, 'steel', 'wall'),
  box('east-div-s', 16, 0, -3, 17, 4.6, 3, 'steel', 'wall'),
  box('east-div-n', 16, 0, 7, 17, 4.6, 16, 'steel', 'wall'),

  box('a-pylon', -17.4, 0, -9.4, -16.6, 2.4, -8.6, 'accent', 'objective'),
  box('a-pedestal', -18, 0, -10, -16, 0.35, -8, 'rust', 'solid'),
  box('a-crate-1', -22, 0, -13.5, -19.5, 1.2, -11.5, 'crate', 'cover'),
  box('a-crate-2', -14, 0, -14.5, -11.5, 2.2, -13, 'crate', 'cover'),
  box('a-crate-3', -21.5, 0, -7, -20, 1.1, -5.5, 'crate', 'cover'),
  box('a-crate-4', -13.5, 0, -7, -11.5, 1.1, -6, 'crate', 'cover'),

  box('b-pylon', 16.6, 0, -9.4, 17.4, 2.4, -8.6, 'accent', 'objective'),
  box('b-pedestal', 16, 0, -10, 18, 0.35, -8, 'rust', 'solid'),
  box('b-tank-1', 12, 0, -14, 14.5, 3, -11.5, 'rust', 'cover'),
  box('b-tank-2', 20.5, 0, -11, 22.5, 2.2, -9, 'crate', 'cover'),
  box('b-crate-1', 10.5, 0, -7, 12, 1.1, -5.5, 'crate', 'cover'),
  box('b-crate-2', 18, 0, -6.5, 20, 1.1, -5, 'crate', 'cover'),

  box('mid-silo', -2, 0, -1, 2, 3.8, 2, 'rust', 'structure'),
  box('mid-cover-1', -2, 0, -6, -0.5, 1.2, -4.5, 'crate', 'cover'),
  box('mid-cover-2', -4, 0, 9, -1.5, 1.1, 10, 'crate', 'cover'),
  box('mid-cover-3', 1.5, 0, 10.5, 4, 1.1, 11.5, 'crate', 'cover'),
  box('mid-cover-4', -3, 0, 12.6, -1.8, 1.1, 13.8, 'crate', 'cover'),

  box('west-cover-1', -12, 0, 4, -10, 1.2, 6, 'crate', 'cover'),
  box('west-cover-2', -9, 0, 10, -6, 1.1, 11, 'crate', 'cover'),
  box('west-cover-3', -13, 0, 13, -11.5, 2.2, 14.5, 'crate', 'cover'),
  box('west-cover-4', -7, 0, 14, -5.5, 1.1, 15.5, 'crate', 'cover'),
  box('east-cover-1', 10, 0, 4, 12, 1.2, 6, 'crate', 'cover'),
  box('east-cover-2', 6, 0, 10, 9, 1.1, 11, 'crate', 'cover'),
  box('east-cover-3', 11.5, 0, 13, 13, 2.2, 14.5, 'crate', 'cover'),
  box('east-cover-4', 5.5, 0, 14, 7, 1.1, 15.5, 'crate', 'cover'),

  box('long-a-1', -23.5, 0, 9, -21.5, 1.1, 11, 'crate', 'cover'),
  box('long-a-2', -20, 0, 1, -18.5, 2.2, 3, 'crate', 'cover'),
  box('long-a-3', -24, 0, -1, -22.5, 1.1, 0.5, 'crate', 'cover'),
  box('long-b-1', 21.5, 0, 9, 23.5, 1.1, 11, 'crate', 'cover'),
  box('long-b-2', 18.5, 0, 1, 20, 2.2, 3, 'crate', 'cover'),
  box('long-b-3', 22.5, 0, -1, 24, 1.1, 0.5, 'crate', 'cover'),

  box('atk-crate-w', -20, 0, 19, -18, 1.2, 21, 'crate', 'cover'),
  box('atk-crate-e', 18, 0, 19, 20, 1.2, 21, 'crate', 'cover'),
  box('def-crate-w', -20, 0, -21, -18, 1.2, -19, 'crate', 'cover'),
  box('def-crate-e', 18, 0, -21, 20, 1.2, -19, 'crate', 'cover'),
]);

const spawn = (x, z, yaw) => Object.freeze({ x, z, yaw });
const SPAWNS = Object.freeze({
  vanguard: Object.freeze([
    spawn(-2, -20, Math.PI),
    spawn(2, -20, Math.PI),
    spawn(-6, -19, Math.PI),
    spawn(6, -19, Math.PI),
    spawn(0, -22, Math.PI),
  ]),
  syndicate: Object.freeze([
    spawn(-2, 20, 0),
    spawn(2, 20, 0),
    spawn(-6, 19, 0),
    spawn(6, 19, 0),
    spawn(0, 22, 0),
  ]),
});

const SITES = Object.freeze({
  A: Object.freeze({
    id: 'A',
    name: 'Brine Hall',
    minX: -24,
    maxX: -10,
    minZ: -16,
    maxZ: -4,
    plantX: -17,
    plantZ: -9,
  }),
  B: Object.freeze({
    id: 'B',
    name: 'Evaporator Deck',
    minX: 10,
    maxX: 24,
    minZ: -16,
    maxZ: -4,
    plantX: 17,
    plantZ: -9,
  }),
});

const CALLOUTS = Object.freeze([
  Object.freeze({ name: 'Long A', x: -21, z: 6 }),
  Object.freeze({ name: 'Long B', x: 21, z: 6 }),
  Object.freeze({ name: 'Mid', x: 0, z: 4 }),
  Object.freeze({ name: 'Salt Silo', x: 0, z: 0 }),
  Object.freeze({ name: 'A Short', x: -7, z: -8 }),
  Object.freeze({ name: 'B Short', x: 7, z: -8 }),
  Object.freeze({ name: 'West Yard', x: -10, z: 8 }),
  Object.freeze({ name: 'East Yard', x: 10, z: 8 }),
  Object.freeze({ name: 'Vanguard Spawn', x: 0, z: -20 }),
  Object.freeze({ name: 'Syndicate Spawn', x: 0, z: 20 }),
]);

const WAYPOINTS = Object.freeze([
  Object.freeze({ id: 'as', x: 0, z: 19, links: Object.freeze(['asW', 'asE', 'mS']) }),
  Object.freeze({ id: 'asW', x: -20.5, z: 19, links: Object.freeze(['as', 'aw']) }),
  Object.freeze({ id: 'asE', x: 20.5, z: 19, links: Object.freeze(['as', 'ae']) }),
  Object.freeze({ id: 'aw', x: -20.5, z: 15, links: Object.freeze(['asW', 'lA1']) }),
  Object.freeze({ id: 'ae', x: 20.5, z: 15, links: Object.freeze(['asE', 'lB1']) }),
  Object.freeze({ id: 'mS', x: 0, z: 13, links: Object.freeze(['as', 'mC']) }),
  Object.freeze({ id: 'mC', x: 0, z: 7, links: Object.freeze(['mS', 'mW', 'mE']) }),
  Object.freeze({ id: 'mW', x: -3, z: 4, links: Object.freeze(['mC', 'mSideW', 'wY']) }),
  Object.freeze({ id: 'mE', x: 3, z: 4, links: Object.freeze(['mC', 'mSideE', 'eY']) }),
  Object.freeze({ id: 'mSideW', x: -3.5, z: 0, links: Object.freeze(['mW', 'mN']) }),
  Object.freeze({ id: 'mSideE', x: 3.5, z: 0, links: Object.freeze(['mE', 'mN']) }),
  Object.freeze({ id: 'mN', x: 0, z: -6, links: Object.freeze(['mSideW', 'mSideE', 'aShort', 'bShort', 'dMidS']) }),
  Object.freeze({ id: 'aShort', x: -7, z: -8, links: Object.freeze(['mN', 'aSite']) }),
  Object.freeze({ id: 'bShort', x: 7, z: -8, links: Object.freeze(['mN', 'bSite']) }),
  Object.freeze({ id: 'aSite', x: -15, z: -8, links: Object.freeze(['aShort', 'lA4', 'dA']) }),
  Object.freeze({ id: 'bSite', x: 15, z: -8, links: Object.freeze(['bShort', 'lB4', 'dB']) }),
  Object.freeze({ id: 'lA1', x: -24, z: 13, links: Object.freeze(['aw', 'lA2']) }),
  Object.freeze({ id: 'lA2', x: -24, z: 5, links: Object.freeze(['lA1', 'lA3', 'wY']) }),
  Object.freeze({ id: 'lA3', x: -18.5, z: -1, links: Object.freeze(['lA2', 'lA4']) }),
  Object.freeze({ id: 'lA4', x: -18, z: -5, links: Object.freeze(['lA3', 'aSite']) }),
  Object.freeze({ id: 'lB1', x: 24, z: 13, links: Object.freeze(['ae', 'lB2']) }),
  Object.freeze({ id: 'lB2', x: 24, z: 5, links: Object.freeze(['lB1', 'lB3', 'eY']) }),
  Object.freeze({ id: 'lB3', x: 18.5, z: -1, links: Object.freeze(['lB2', 'lB4']) }),
  Object.freeze({ id: 'lB4', x: 18, z: -5, links: Object.freeze(['lB3', 'bSite']) }),
  Object.freeze({ id: 'wY', x: -10, z: 7.5, links: Object.freeze(['mW', 'lA2']) }),
  Object.freeze({ id: 'eY', x: 10, z: 7.5, links: Object.freeze(['mE', 'lB2']) }),
  Object.freeze({ id: 'ds', x: 0, z: -19, links: Object.freeze(['dMidS', 'dA', 'dB']) }),
  Object.freeze({ id: 'dMidS', x: 0, z: -12, links: Object.freeze(['ds', 'mN']) }),
  Object.freeze({ id: 'dA', x: -18, z: -18, links: Object.freeze(['ds', 'aSite']) }),
  Object.freeze({ id: 'dB', x: 18, z: -18, links: Object.freeze(['ds', 'bSite']) }),
]);

export const MAP = Object.freeze({
  name: 'Saltworks',
  subtitle: 'A tidal salt refinery on the dry coast',
  bounds: Object.freeze({ minX: -25, maxX: 25, minZ: -23, maxZ: 23 }),
  boxes: BOXES,
  spawns: SPAWNS,
  sites: SITES,
  callouts: CALLOUTS,
  waypoints: WAYPOINTS,
});

export function overlapBoxes(minX, minY, minZ, maxX, maxY, maxZ) {
  for (let index = 0; index < BOXES.length; index += 1) {
    const item = BOXES[index];
    if (maxX <= item.minX + EPSILON || minX >= item.maxX - EPSILON) continue;
    if (maxY <= item.minY + EPSILON || minY >= item.maxY - EPSILON) continue;
    if (maxZ <= item.minZ + EPSILON || minZ >= item.maxZ - EPSILON) continue;
    return item;
  }
  return null;
}

export function overlapsAt(x, y, z, radius, height, lift = 0) {
  return overlapBoxes(
    x - radius,
    y + lift,
    z - radius,
    x + radius,
    y + height - lift,
    z + radius,
  );
}

export function createRayHit() {
  return {
    hit: false,
    distance: 0,
    box: null,
    normalX: 0,
    normalY: 0,
    normalZ: 0,
    x: 0,
    y: 0,
    z: 0,
  };
}

export function raycastSolids(ox, oy, oz, dx, dy, dz, maxDistance, out) {
  let bestDistance = maxDistance;
  let bestBox = null;
  let bestAxis = -1;
  let bestSign = 0;

  for (let index = 0; index < BOXES.length; index += 1) {
    const item = BOXES[index];
    let tMin = 0;
    let tMax = maxDistance;
    let axis = -1;
    let sign = 0;
    let blocked = false;

    if (Math.abs(dx) < 1e-9) {
      if (ox <= item.minX || ox >= item.maxX) blocked = true;
    } else {
      let t1 = (item.minX - ox) / dx;
      let t2 = (item.maxX - ox) / dx;
      let entrySign = -1;
      if (t1 > t2) {
        const swap = t1; t1 = t2; t2 = swap;
        entrySign = 1;
      }
      if (t1 > tMin) { tMin = t1; axis = 0; sign = entrySign; }
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) blocked = true;
    }
    if (blocked) continue;

    if (Math.abs(dy) < 1e-9) {
      if (oy <= item.minY || oy >= item.maxY) continue;
    } else {
      let t1 = (item.minY - oy) / dy;
      let t2 = (item.maxY - oy) / dy;
      let entrySign = -1;
      if (t1 > t2) {
        const swap = t1; t1 = t2; t2 = swap;
        entrySign = 1;
      }
      if (t1 > tMin) { tMin = t1; axis = 1; sign = entrySign; }
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) continue;
    }

    if (Math.abs(dz) < 1e-9) {
      if (oz <= item.minZ || oz >= item.maxZ) continue;
    } else {
      let t1 = (item.minZ - oz) / dz;
      let t2 = (item.maxZ - oz) / dz;
      let entrySign = -1;
      if (t1 > t2) {
        const swap = t1; t1 = t2; t2 = swap;
        entrySign = 1;
      }
      if (t1 > tMin) { tMin = t1; axis = 2; sign = entrySign; }
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) continue;
    }

    if (tMin < 0 || tMin > bestDistance) continue;
    bestDistance = tMin;
    bestBox = item;
    bestAxis = axis;
    bestSign = sign;
  }

  out.hit = bestBox !== null;
  out.distance = bestDistance;
  out.box = bestBox;
  out.normalX = bestAxis === 0 ? bestSign : 0;
  out.normalY = bestAxis === 1 ? bestSign : 0;
  out.normalZ = bestAxis === 2 ? bestSign : 0;
  out.x = ox + dx * bestDistance;
  out.y = oy + dy * bestDistance;
  out.z = oz + dz * bestDistance;
  return out;
}

export function calloutAt(x, z) {
  let best = CALLOUTS[0];
  let bestDistance = Infinity;
  for (let index = 0; index < CALLOUTS.length; index += 1) {
    const item = CALLOUTS[index];
    const dx = item.x - x;
    const dz = item.z - z;
    const distance = dx * dx + dz * dz;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = item;
    }
  }
  return best.name;
}
