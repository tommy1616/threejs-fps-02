const deepFreeze = (value) => {
 if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  Object.freeze(value);
 }
 return value;
};

export const CONFIG = deepFreeze({
 tickRate: 60,
 fixedDt: 1 / 60,
 maxSubSteps: 5,
 maxFrameDt: 0.1,
 pools: {
  tracers: 48,
  grenades: 16,
  smokes: 8,
  blasts: 8,
 },
 view: {
  fov: 74,
  near: 0.05,
  far: 180,
  pixelRatioCap: 2,
  sensitivity: 0.0022,
  pitchLimit: 1.45,
 },
 movement: {
  radius: 0.34,
  standHeight: 1.72,
  crouchHeight: 1.12,
  standEye: 1.6,
  crouchEye: 1.02,
  walkSpeed: 5.2,
  crouchSpeed: 2.35,
  walkMultiplier: 0.52,
  groundAccel: 42,
  airAccel: 9,
  friction: 9,
  gravity: 20,
  jumpSpeed: 6.2,
  maxFallSpeed: 30,
  collisionLift: 0.04,
  crouchLerp: 12,
 },
 round: {
  freezeSeconds: 12,
  liveSeconds: 115,
  roundEndSeconds: 5,
  plantSeconds: 3.2,
  defuseSeconds: 7,
  defuseKitSeconds: 5,
  postPlantSeconds: 40,
  roundsToWin: 8,
 },
 bots: {
  viewDistance: 46,
  fov: 1.9,
  hearingRadius: 22,
  reactionTime: 0.42,
  aimError: 0.05,
 },
});
