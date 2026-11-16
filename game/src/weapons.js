export const WEAPONS = Object.freeze([
	{
		id: 'kestrel', name: 'Kestrel P9', slot: 2, kind: 'pistol', category: 'SIDEARM',
		default: true, price: 0, reward: 300, damage: 38, fireInterval: 0.15,
		magazine: 12, reserve: 48, reloadTime: 1.4, baseSpread: 0.0028,
		moveMultiplier: 3, airMultiplier: 10, crouchMultiplier: 0.55,
		spreadPerShot: 0.008, spreadMax: 0.05, spreadRecovery: 8, recoilRecovery: 12,
		recoilPattern: [[0.018, 0.004], [0.012, -0.003], [0.01, 0.002], [0.008, -0.004], [0.006, 0.002], [0.005, 0]],
		headshotMultiplier: 3.6, range: 80, automatic: false, flashTime: 0.04,
	},
	{
		id: 'marlin', name: 'Marlin Heavy', slot: 2, kind: 'pistol', category: 'SIDEARM',
		price: 500, reward: 300, damage: 55, fireInterval: 0.32, magazine: 8,
		reserve: 32, reloadTime: 1.8, baseSpread: 0.004, moveMultiplier: 3,
		airMultiplier: 10, crouchMultiplier: 0.6, spreadPerShot: 0.012,
		spreadMax: 0.06, spreadRecovery: 7, recoilRecovery: 10,
		recoilPattern: [[0.028, 0.006], [0.022, -0.004], [0.018, 0.003], [0.014, -0.002], [0.01, 0.002], [0.008, 0]],
		headshotMultiplier: 3.2, range: 90, automatic: false, flashTime: 0.05,
	},
	{
		id: 'vireo', name: 'Vireo SMG', slot: 1, kind: 'smg', category: 'PRIMARY',
		price: 1250, reward: 600, damage: 23, fireInterval: 0.075, magazine: 25,
		reserve: 75, reloadTime: 1.7, baseSpread: 0.0032, moveMultiplier: 3.5,
		airMultiplier: 11, crouchMultiplier: 0.6, spreadPerShot: 0.003,
		spreadMax: 0.07, spreadRecovery: 7, recoilRecovery: 11,
		recoilPattern: [[0.008, 0.003], [0.009, -0.003], [0.01, 0.002], [0.011, -0.002], [0.008, 0.001], [0.006, 0]],
		headshotMultiplier: 2.8, range: 90, automatic: true, flashTime: 0.045,
	},
	{
		id: 'harrow', name: 'Harrow AR', slot: 1, kind: 'rifle', category: 'PRIMARY',
		price: 2700, reward: 300, damage: 32, fireInterval: 0.096, magazine: 30,
		reserve: 90, reloadTime: 2, baseSpread: 0.0018, moveMultiplier: 5,
		airMultiplier: 14, crouchMultiplier: 0.55, spreadPerShot: 0.0045,
		spreadMax: 0.06, spreadRecovery: 6, recoilRecovery: 9,
		recoilPattern: [[0.009, 0.002], [0.012, -0.002], [0.014, 0.003], [0.012, -0.001], [0.01, 0.002], [0.008, 0]],
		headshotMultiplier: 3.2, range: 140, automatic: true, flashTime: 0.05,
	},
	{
		id: 'longreach', name: 'Longreach', slot: 1, kind: 'marksman', category: 'PRIMARY',
		price: 4300, reward: 100, damage: 95, fireInterval: 1.35, magazine: 5,
		reserve: 20, reloadTime: 3.2, baseSpread: 0.03, scopedSpread: 0.0006,
		moveMultiplier: 8, airMultiplier: 22, crouchMultiplier: 0.75,
		spreadPerShot: 0.02, spreadMax: 0.09, spreadRecovery: 5, recoilRecovery: 7,
		recoilPattern: [[0.06, 0.008], [0.045, -0.006], [0.03, 0.004], [0.02, -0.003], [0.015, 0.002], [0.01, 0]],
		headshotMultiplier: 2.2, range: 180, automatic: false, flashTime: 0.08, scope: true,
	},
]);

export const GEAR = Object.freeze([
	{ id: 'vest', name: 'Vest', price: 650, type: 'armor', armor: 50, category: 'ARMOUR' },
	{ id: 'vesthelm', name: 'Vest + Helmet', price: 1000, type: 'armor', armor: 100, helmet: true, category: 'ARMOUR' },
	{ id: 'defkit', name: 'Defuse Kit', price: 400, type: 'kit', defenders: true, category: 'UTILITY' },
	{ id: 'frag', name: 'Frag Charge', price: 300, type: 'grenade', grenade: 'frag', category: 'UTILITY' },
	{ id: 'smoke', name: 'Haze Canister', price: 300, type: 'grenade', grenade: 'smoke', category: 'UTILITY' },
]);

export const SHOP = Object.freeze([...WEAPONS.filter((item) => !item.default), ...GEAR]);
export const DEFAULT_WEAPON = WEAPONS[0];

export function createWeapon(def) {
	return {
		...def,
		mag: def.magazine,
		reserve: def.reserve,
		reserveMax: def.reserve,
		reloadLeft: 0,
		fireCooldown: 0,
		emptyClick: 0,
		kick: 0,
		muzzleFlash: 0,
	};
}
