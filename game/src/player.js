// player.js — player physics, collision and slots.
import{CONFIG}
from"./config.js";
import{MAP,overlapsAt}
from"./map.js";
import{emitNoise,emitSound}
from"./audio.js";
const EPSILON=0.0001;
const MOVE=CONFIG.movement;
function clamp(value,min,max){return value<min?min:value>max?max:value}
export function applyLook(actor,dx,dy){actor.yaw-=dx*CONFIG.view.sensitivity;
actor.pitch=clamp(actor.pitch-dy*CONFIG.view.sensitivity,-CONFIG.view.pitchLimit,CONFIG.view.pitchLimit)}
function moveHorizontal(actor,axis,amount){const position=actor.position;
const velocity=actor.velocity;
const old=axis===0?position.x:position.z;
if(axis===0)position.x+=amount;
else position.z+=amount;
const hit=overlapsAt(position.x,position.y,position.z,MOVE.radius,actor.height,MOVE.collisionLift);
if(!hit)return;
if(axis===0){position.x=old;
velocity.x=0}
else{position.z=old;
velocity.z=0}
}
function resolveVertical(actor,dt){const position=actor.position;
const velocity=actor.velocity;
const oldY=position.y;
position.y+=velocity.y*dt;
let landTop=-1/0;
let headBottom=1/0;
const radius=MOVE.radius;
const minX=position.x-radius;
const maxX=position.x+radius;
const minZ=position.z-radius;
const maxZ=position.z+radius;
for(let index=0;
index<MAP.boxes.length;
index+=1){const item=MAP.boxes[index];
if(maxX<=item.minX+EPSILON||minX>=item.maxX-EPSILON)continue;
if(maxZ<=item.minZ+EPSILON||minZ>=item.maxZ-EPSILON)continue;
if(position.y+actor.height<=item.minY+EPSILON||position.y>=item.maxY-EPSILON)continue;
if(velocity.y<=0){if(item.maxY<=oldY+0.08)landTop=Math.max(landTop,item.maxY)}
else if(item.minY>=oldY+actor.height-0.08){headBottom=Math.min(headBottom,item.minY)}
}
if(landTop>-1/0){position.y=landTop;
velocity.y=0;
actor.onGround=true}
else if(headBottom<1/0){position.y=headBottom-actor.height;
velocity.y=0;
actor.onGround=false}
else{actor.onGround=false;
if(overlapsAt(position.x,position.y,position.z,radius,actor.height,0.001)){position.y=oldY;
velocity.y=0}
}
if(position.y<0){position.y=0;
velocity.y=0;
actor.onGround=true}
}
export function moveActor(actor,wishX,wishZ,speed,dt,jump){const velocity=actor.velocity;
const length=Math.hypot(wishX,wishZ);
if(length>0.000001){wishX/=length;
wishZ/=length}
const acceleration=actor.onGround?MOVE.groundAccel:MOVE.airAccel;
const blend=Math.min(1,acceleration*dt/speed);
velocity.x+=(wishX*speed-velocity.x)*blend;
velocity.z+=(wishZ*speed-velocity.z)*blend;
if(actor.onGround&&length<0.000001){const damp=Math.max(0,1-MOVE.friction*dt);
velocity.x*=damp;
velocity.z*=damp}
if(jump&&actor.onGround){velocity.y=MOVE.jumpSpeed;
actor.onGround=false}
velocity.y=Math.max(-MOVE.maxFallSpeed,velocity.y-MOVE.gravity*dt);
moveHorizontal(actor,0,velocity.x*dt);
moveHorizontal(actor,1,velocity.z*dt);
resolveVertical(actor,dt)}
function canSelect(state,player,slot){if(slot===0)return Boolean(player.slots[0]);
if(slot===1)return true;
if(slot===2)return player.grenades.frag+player.grenades.smoke>0;
if(slot===3)return player.team==="vanguard"&&state.objective.carrierId===player.id;
return false}
function select(state,player,slot){if(slot<0||slot>3||!canSelect(state,player,slot)||slot===player.slot)return;
player.lastSlot=player.slot;
player.slot=slot;
player.spread=0;
player.scoped=false}
export function stepPlayer(state,input,dt){const player=state.player;
if(!player.alive)return;
if(input.slotPressed>0){select(state,player,clamp(input.slotPressed-1,0,3));
input.slotPressed=0}
if(input.wheel){const dir=Math.sign(input.wheel);
for(let step=1;
step<=4;
step+=1){const slot=(player.slot+dir*step+4)%4;
if(canSelect(state,player,slot)){select(state,player,slot);
break}
}
input.wheel=0}
if(input.lastPressed){select(state,player,player.lastSlot);
input.lastPressed=false}
if(input.crouch&&!player.crouching){player.crouching=true;
player.height=MOVE.crouchHeight}
else if(!input.crouch&&player.crouching){const clear=!overlapsAt(player.position.x,player.position.y,player.position.z,MOVE.radius,MOVE.standHeight,0.02);
if(clear){player.crouching=false;
player.height=MOVE.standHeight}
}
const eyeTarget=player.crouching?MOVE.crouchEye:MOVE.standEye;
player.eye+=(eyeTarget-player.eye)*Math.min(1,dt*MOVE.crouchLerp);
const forward=input.forward;
const strafe=input.strafe;
const sin=Math.sin(player.yaw);
const cos=Math.cos(player.yaw);
const wishX=-sin*forward+cos*strafe;
const wishZ=-cos*forward-sin*strafe;
const speed=player.crouching?MOVE.crouchSpeed:input.walk?MOVE.walkSpeed*MOVE.walkMultiplier:MOVE.walkSpeed;
const jump=input.jumpPressed;
input.jumpPressed=false;
moveActor(player,wishX,wishZ,speed,dt,jump);
if(state.phase==="freeze"){const dx=player.position.x-player.spawn.x;
const dz=player.position.z-player.spawn.z;
const distance=Math.hypot(dx,dz);
if(distance>7){player.position.x=player.spawn.x+dx/distance*7;
player.position.z=player.spawn.z+dz/distance*7;
player.velocity.x=0;
player.velocity.z=0}
}
const speedNow=Math.hypot(player.velocity.x,player.velocity.z);
if(player.onGround&&!player.crouching&&!input.walk&&speedNow>2.6){player.stepTimer-=dt;
if(player.stepTimer<=0){player.stepTimer=0.42;
emitNoise(state,player.position.x,player.position.z,player.team,player.id,1.4,9);
emitSound(state,"step",player.position.x,player.position.y+0.1,player.position.z)}
}
else{player.stepTimer=0}
}
