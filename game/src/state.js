// state.js — single game-state factory and readonly view.
import*as THREE from"three";
import{CONFIG}
from"./config.js";
import{MAP}
from"./map.js";
import{mulberry32,normalizeSeed}
from"./rng.js";
import{createWeapon,DEFAULT_WEAPON}
from"./weapons.js";
import{ECONOMY}
from"./economy.js";
const VANGUARD_NAMES=["Brass","Halyard","Juno","Flint"];
const SYNDICATE_NAMES=["Crow","Vesper","Moss","Dahl","Rook"];
const VANGUARD_ROLES=["support","anchor","rotator","support"];
const SYNDICATE_ROLES=["entry","support","anchor","rotator","support"];
function poseToward(px,py,pz,tx,ty,tz){const dx=tx-px;
const dy=ty-py;
const dz=tz-pz;
const length=Math.hypot(dx,dy,dz)||1;
return{yaw:Math.atan2(-dx,-dz),pitch:Math.asin(Math.max(-1,Math.min(1,dy/length)))}
}
function makeSlots(){return[null,createWeapon(DEFAULT_WEAPON),{kind:"grenade",name:"Grenades",mag:0,reserve:0}
,{kind:"charge",name:"Relay Charge",mag:0,reserve:0}
]}
function createActor(id,name,team,isPlayer,spawn,role){const position=new THREE.Vector3(spawn.x,0,spawn.z);
return{id,name,team,isPlayer,role,spawn:{x:spawn.x,z:spawn.z,yaw:spawn.yaw}
,position,prevPosition:position.clone(),velocity:new THREE.Vector3,yaw:spawn.yaw,prevYaw:spawn.yaw,pitch:0,prevPitch:0,eye:CONFIG.movement.standEye,height:CONFIG.movement.standHeight,crouching:false,onGround:true,health:100,armor:0,helmet:false,kit:false,grenades:{frag:0,smoke:0}
,alive:true,money:ECONOMY.start,kills:0,deaths:0,slots:makeSlots(),slot:1,lastSlot:1,spread:0,scoped:false,recoilPitch:0,recoilYaw:0,shotIndex:0,shake:0,stepTimer:0,ai:{state:"patrol",route:[],routeIndex:0,targetId:null,holdNode:null,holdYaw:spawn.yaw,reaction:0,aimError:CONFIG.bots.aimError,think:0,searchTime:0,lastSeenX:spawn.x,lastSeenZ:spawn.z,marksman:false,nadeTimer:4,smoked:false,gather:0}
}
}
function createTracers(){return Array.from({length:CONFIG.pools.tracers}
,()=>({active:false,x:0,y:0,z:0,dx:0,dy:0,dz:1,length:0,life:0,maxLife:0,team:null}
))}
function createNoises(){return{head:0,items:Array.from({length:24}
,()=>({active:false,x:0,z:0,team:null,actorId:null,ttl:0,radius:22}
))}
}
function createKillFeed(){return{head:0,items:Array.from({length:6}
,()=>({active:false,killer:"",victim:"",killerTeam:null,victimTeam:null,weapon:"",headshot:false,ttl:0,maxTtl:0}
))}
}
export function createGameState(seed=1){const normalizedSeed=normalizeSeed(seed);
const rng=mulberry32(normalizedSeed);
const actors=[];
const vanguardSpawns=MAP.spawns.vanguard;
const syndicateSpawns=MAP.spawns.syndicate;
const player=createActor("p0","Avery","vanguard",true,vanguardSpawns[0],"entry");
actors.push(player);
for(let index=1;
index<vanguardSpawns.length;
index+=1){actors.push(createActor(`v${index}`,VANGUARD_NAMES[index-1],"vanguard",false,vanguardSpawns[index],VANGUARD_ROLES[index-1]))}
for(let index=0;
index<syndicateSpawns.length;
index+=1){actors.push(createActor(`s${index+1}`,SYNDICATE_NAMES[index],"syndicate",false,syndicateSpawns[index],SYNDICATE_ROLES[index]))}
const menuLook=poseToward(19,13,25,0,0,-4);
const bots=actors.filter((actor)=>!actor.isPlayer);
return{seed:normalizedSeed,rng,tick:0,time:0,phase:"menu",mapName:MAP.name,actors,bots,player,match:{round:1,phaseTime:CONFIG.round.liveSeconds,setupTime:0,score:{vanguard:0,syndicate:0}
,winner:null,reason:"",lossStreak:{vanguard:1,syndicate:1}
,sidesSwitched:false,swappedBotId:null}
,testMode:false,objective:{state:"idle",site:null,attackSite:null,lastSite:null,carrierId:null,planted:false,wasPlanted:false,timer:0,plantProgress:0,defuseProgress:0,hint:"",result:null,x:0,z:0}
,view:{mode:"menu",menuPose:{position:new THREE.Vector3(19,13,25),yaw:menuLook.yaw,pitch:menuLook.pitch}
}
,ui:{hudVisible:false,overlay:"menu",buyOpen:false,hitMarker:0,hitHead:false,message:"",messageTime:0}
,tracers:createTracers(),noises:createNoises(),sounds:Array.from({length:32}
,()=>({active:false,played:true,type:"",x:0,y:0,z:0,cls:null,volume:1}
)),soundHead:0,killFeed:createKillFeed(),grenades:Array.from({length:CONFIG.pools.grenades}
,()=>({active:false,kind:"frag",x:0,y:0,z:0,vx:0,vy:0,vz:0,fuse:0,team:null,sound:0}
)),smokes:Array.from({length:CONFIG.pools.smokes}
,()=>({active:false,x:0,y:0,z:0,radius:4.5,ttl:0,maxTtl:15}
)),blasts:Array.from({length:CONFIG.pools.blasts}
,()=>({active:false,x:0,y:0,z:0,ttl:0,maxTtl:0.35}
))}
}
const readonlyCache=new WeakMap;
export function readonlyView(value){if(!value||typeof value!=="object")return value;
if(readonlyCache.has(value))return readonlyCache.get(value);
const proxy=new Proxy(value,{get(target,key,receiver){const result=Reflect.get(target,key,receiver);
return result&&typeof result==="object"?readonlyView(result):result}
,set(){return false}
,deleteProperty(){return false}
,defineProperty(){return false}
,setPrototypeOf(){return false}
}
);
readonlyCache.set(value,proxy);
return proxy}
