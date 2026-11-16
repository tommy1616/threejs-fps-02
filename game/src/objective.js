// objective.js — relay charge carry, plant and defuse.
import{CONFIG}
from"./config.js";
import{MAP}
from"./map.js";
import{emitNoise,emitSound}
from"./audio.js";
const ROUND=CONFIG.round;
function siteAt(x,z){for(const id of["A","B"]){const site=MAP.sites[id];
if(x>=site.minX&&x<=site.maxX&&z>=site.minZ&&z<=site.maxZ)return id}
return null}
function actorById(state,id){for(let index=0;
index<state.actors.length;
index+=1){if(state.actors[index].id===id)return state.actors[index]}
return null}
function speedOf(actor){return Math.hypot(actor.velocity.x,actor.velocity.z)}
function plantCharge(state,actor,site){const objective=state.objective;
objective.state="planted";
objective.planted=true;
objective.wasPlanted=true;
objective.site=site;
objective.carrierId=null;
objective.x=actor.position.x;
objective.z=actor.position.z;
objective.timer=ROUND.postPlantSeconds;
objective.plantProgress=1;
objective.defuseProgress=0;
objective.hint="";
state.ui.message=`CHARGE PLANTED · SITE ${site}`;
state.ui.messageTime=2.2;
emitNoise(state,actor.position.x,actor.position.z,"vanguard",actor.id,4);
emitSound(state,"plant",actor.position.x,actor.position.y+0.5,actor.position.z)}
export function setupCharge(state){const objective=state.objective;
objective.state="carried";
objective.site=null;
let pick=state.rng()<0.5?"A":"B";
if(pick===objective.lastSite&&state.rng()<0.65)pick=pick==="A"?"B":"A";
objective.attackSite=pick;
objective.lastSite=pick;
objective.carrierId=null;
objective.planted=false;
objective.wasPlanted=false;
objective.timer=0;
objective.plantProgress=0;
objective.defuseProgress=0;
objective.hint="";
objective.result=null;
objective.x=0;
objective.z=0;
const attackers=state.actors.filter((actor)=>actor.team==="vanguard"&&actor.alive);
if(attackers.length===0)return;
const player=state.player;
const forced=state.forceCarrier;
const carrier=forced==="player"&&player.team==="vanguard"&&player.alive?player:forced==="bot"?attackers.find((actor)=>!actor.isPlayer)||attackers[0]:!state.testMode&&player.team==="vanguard"&&player.alive&&state.rng()<0.5?player:attackers[Math.floor(state.rng()*attackers.length)];
objective.carrierId=carrier.id;
objective.x=carrier.position.x;
objective.z=carrier.position.z}
export function dropCharge(state,actor){const objective=state.objective;
if(objective.carrierId!==actor.id)return;
objective.carrierId=null;
objective.state="ground";
objective.x=actor.position.x;
objective.z=actor.position.z;
objective.plantProgress=0;
objective.hint=""}
export function stepObjective(state,input,dt){if(state.phase!=="live"||state.objective.result)return;
const objective=state.objective;
const player=state.player;
if(objective.state==="carried"){const carrier=actorById(state,objective.carrierId);
if(!carrier||!carrier.alive){objective.carrierId=null;
objective.state="ground";
return}
objective.x=carrier.position.x;
objective.z=carrier.position.z;
const site=siteAt(carrier.position.x,carrier.position.z);
const still=speedOf(carrier)<0.6&&carrier.onGround;
if(carrier.isPlayer){if(site&&still&&state.match.setupTime<=15){objective.site=site;
objective.hint="Hold E to plant";
if(input&&input.interact)objective.plantProgress+=dt/ROUND.plantSeconds;
else objective.plantProgress=0}
else{objective.plantProgress=0;
objective.hint=site?"Stand still to plant":""}
}
else{objective.hint="";
if(site&&still&&state.match.setupTime<=15){objective.plantProgress+=dt/ROUND.plantSeconds}
else{objective.plantProgress=0}
}
if(objective.plantProgress>=1)plantCharge(state,carrier,site||objective.site);
return}
if(objective.state==="ground"){objective.hint="";
for(let index=0;
index<state.actors.length;
index+=1){const actor=state.actors[index];
if(!actor.alive||actor.team!=="vanguard")continue;
if(Math.hypot(actor.position.x-objective.x,actor.position.z-objective.z)>1)continue;
objective.carrierId=actor.id;
objective.state="carried";
objective.x=actor.position.x;
objective.z=actor.position.z;
break}
return}
if(objective.state!=="planted"){objective.hint="";
return}
objective.timer=Math.max(0,objective.timer-dt);
if(objective.timer===0){objective.result={winner:"vanguard",reason:`Relay charge detonated at site ${objective.site}.`}
;
objective.state="detonated";
objective.planted=false;
objective.hint="";
return}
let nearest=null;
let nearestDistance=1.6;
for(let index=0;
index<state.actors.length;
index+=1){const actor=state.actors[index];
if(!actor.alive||actor.team!=="syndicate")continue;
const distance=Math.hypot(actor.position.x-objective.x,actor.position.z-objective.z);
if(distance<=nearestDistance){nearest=actor;
nearestDistance=distance}
}
let defuser=null;
if(nearest){if(nearest.isPlayer){if(input&&input.interact)defuser=nearest}
else{defuser=nearest}
}
if(state.match.setupTime>0)defuser=null;
const playerDistance=player.alive&&player.team==="syndicate"?Math.hypot(player.position.x-objective.x,player.position.z-objective.z):1/0;
if(defuser){const seconds=defuser.kit?ROUND.defuseKitSeconds:ROUND.defuseSeconds;
objective.defuseProgress+=dt/seconds;
if(defuser.isPlayer)objective.hint="Defusing relay charge"}
else{objective.defuseProgress=0;
objective.hint=playerDistance<=1.6?"Hold E to defuse":""}
if(objective.defuseProgress>=1){objective.result={winner:"syndicate",reason:`Syndicate defused the relay charge at site ${objective.site}.`}
;
objective.state="defused";
objective.planted=false;
objective.defuseProgress=1;
objective.hint=""}
}
