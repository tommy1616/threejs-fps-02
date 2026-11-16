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

  box('a-pylon', -17.4, 0, -9.4, -16.6, 2.4, -8.6, 'steel', 'objective'),
  box('a-pedestal', -18, 0, -10, -16, 0.35, -8, 'rust', 'solid'),
  box('a-crate-1', -22, 0, -13.5, -19.5, 1.2, -11.5, 'crate', 'cover'),
  box('a-crate-2', -14, 0, -14.5, -11.5, 2.2, -13, 'crate', 'cover'),
  box('a-crate-3', -21.5, 0, -7, -20, 1.1, -5.5, 'crate', 'cover'),
  box('a-crate-4', -13.5, 0, -7, -11.5, 1.1, -6, 'crate', 'cover'),

  box('b-pylon', 16.6, 0, -9.4, 17.4, 2.4, -8.6, 'steel', 'objective'),
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

const wp = (id, x, z, links) => Object.freeze({ id, x, z, links: Object.freeze(links) });
const WAYPOINTS = Object.freeze([
  wp('as', 0, 19, ['asW', 'asE', 'mS']), wp('asW', -20.5, 19, ['as', 'aw']),
  wp('asE', 20.5, 19, ['as', 'ae']), wp('aw', -20.5, 15, ['asW', 'lA1']),
  wp('ae', 20.5, 15, ['asE', 'lB1']), wp('mS', 0, 13, ['as', 'mC']),
  wp('mC', 0, 7, ['mS', 'mW', 'mE']), wp('mW', -3, 4, ['mC', 'mSideW', 'wY']),
  wp('mE', 3, 4, ['mC', 'mSideE', 'eY']), wp('mSideW', -3.5, 0, ['mW', 'mN']),
  wp('mSideE', 3.5, 0, ['mE', 'mN']), wp('mN', 0, -6, ['mSideW', 'mSideE', 'aShort', 'bShort', 'dMidS']),
  wp('aShort', -7, -8, ['mN', 'aSite']), wp('bShort', 7, -8, ['mN', 'bSite']),
  wp('aSite', -15, -8, ['aShort', 'lA4', 'dA']), wp('bSite', 15, -8, ['bShort', 'lB4', 'dB']),
  wp('lA1', -24, 13, ['aw', 'lA2']), wp('lA2', -24, 5, ['lA1', 'lA3', 'wY']),
  wp('lA3', -18.5, -1, ['lA2', 'lA4']), wp('lA4', -18, -5, ['lA3', 'aSite']),
  wp('lB1', 24, 13, ['ae', 'lB2']), wp('lB2', 24, 5, ['lB1', 'lB3', 'eY']),
  wp('lB3', 18.5, -1, ['lB2', 'lB4']), wp('lB4', 18, -5, ['lB3', 'bSite']),
  wp('wY', -10, 7.5, ['mW', 'lA2']), wp('eY', 10, 7.5, ['mE', 'lB2']),
  wp('ds', 0, -19, ['dMidS', 'dA', 'dB']), wp('dMidS', 0, -12, ['ds', 'mN']),
  wp('dA', -18, -18, ['ds', 'aSite']), wp('dB', 18, -18, ['ds', 'bSite']),
]);

export const MAP = Object.freeze({
  name: 'Saltworks',
  subtitle: 'A tidal salt refinery on the dry coast',
  bounds: Object.freeze({ minX: -25, maxX: 25, minZ: -23, maxZ: 23 }),
  boxes: BOXES,
  spawns: SPAWNS,
  sites: SITES,
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

