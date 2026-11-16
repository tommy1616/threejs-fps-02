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
    impacts: 64,
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
    freezeSeconds: 5,
    buySeconds: 12,
    liveSeconds: 115,
    roundEndSeconds: 5,
    warmupSeconds: 4,
    plantSeconds: 3.2,
    defuseSeconds: 7,
    defuseKitSeconds: 5,
    postPlantSeconds: 40,
    roundsToWin: 8,
    regulationRounds: 12,
  },
  economy: {
    startMoney: 800,
    maxMoney: 9000,
    killReward: 300,
    objectiveReward: 300,
    teamWinReward: 3250,
    lossBase: 1400,
    lossStep: 500,
    lossMax: 3400,
  },
  teams: {
    vanguard: { id: 'vanguard', name: 'Vanguard', short: 'VAN' },
    syndicate: { id: 'syndicate', name: 'Syndicate', short: 'SYN' },
  },
  bots: {
    viewDistance: 46,
    fov: 1.9,
    hearingRadius: 18,
    reactionTime: 0.28,
    aimError: 0.022,
    repathSeconds: 0.5,
  },
  hud: {
    hitMarkerSeconds: 0.09,
    killFeedSize: 5,
  },
});
