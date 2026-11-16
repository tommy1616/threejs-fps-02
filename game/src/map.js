// map.js — Saltworks geometry, collision and waypoints.
const EPSILON=0.00001;
const box=(minX,minY,minZ,maxX,maxY,maxZ,mat,kind="solid")=>Object.freeze({minX,minY,minZ,maxX,maxY,maxZ,mat,kind}
);
const BOXES=Object.freeze([box(-26,-1,-24,26,0,24,"salt","floor"),box(-26,0,-24,-25,5.4,24,"steel","wall"),box(25,0,-24,26,5.4,24,"steel","wall"),box(-26,0,23,26,5.4,24,"steel","wall"),box(-26,0,-24,26,5.4,-23,"steel","wall"),box(-25,0,16,-23,4.6,17,"sand","wall"),box(-18,0,16,-4,4.6,17,"sand","wall"),box(4,0,16,18,4.6,17,"sand","wall"),box(23,0,16,25,4.6,17,"sand","wall"),box(-25,0,-17,-21,4.6,-16,"sand","wall"),box(-15,0,-17,-4,4.6,-16,"sand","wall"),box(4,0,-17,15,4.6,-16,"sand","wall"),box(21,0,-17,25,4.6,-16,"sand","wall"),box(-5,0,-16,-4,4.6,-10,"steel","wall"),box(-5,0,-7,-4,4.6,3,"steel","wall"),box(-5,0,7,-4,4.6,16,"steel","wall"),box(4,0,-16,5,4.6,-10,"steel","wall"),box(4,0,-7,5,4.6,3,"steel","wall"),box(4,0,7,5,4.6,16,"steel","wall"),box(-10,0,-16,-9,4.6,-10,"sand","wall"),box(-10,0,-7,-9,4.6,-4,"sand","wall"),box(-25,0,-4,-20,4.6,-3,"sand","wall"),box(-16,0,-4,-10,4.6,-3,"sand","wall"),box(9,0,-16,10,4.6,-10,"sand","wall"),box(9,0,-7,10,4.6,-4,"sand","wall"),box(10,0,-4,16,4.6,-3,"sand","wall"),box(20,0,-4,25,4.6,-3,"sand","wall"),box(-17,0,-3,-16,4.6,3,"steel","wall"),box(-17,0,7,-16,4.6,16,"steel","wall"),box(16,0,-3,17,4.6,3,"steel","wall"),box(16,0,7,17,4.6,16,"steel","wall"),box(-17.4,0,-9.4,-16.6,2.4,-8.6,"steel","objective"),box(-18,0,-10,-16,0.35,-8,"rust","solid"),box(16.6,0,-9.4,17.4,2.4,-8.6,"steel","objective"),box(16,0,-10,18,0.35,-8,"rust","solid"),box(-2,0,-1,2,3.8,2,"rust","structure"),box(-4,0,9,-1.5,1.1,10,"crate","cover"),box(1.5,0,10.5,4,1.1,11.5,"crate","cover")]);
const spawn=(x,z,yaw)=>Object.freeze({x,z,yaw}
);
const SPAWNS=Object.freeze({vanguard:Object.freeze([[-2,-20,Math.PI],[2,-20,Math.PI],[-6,-19,Math.PI],[6,-19,Math.PI],[0,-22,Math.PI]].map(([x,z,yaw])=>spawn(x,z,yaw))),syndicate:Object.freeze([[-2,20,0],[2,20,0],[-6,19,0],[6,19,0],[0,22,0]].map(([x,z,yaw])=>spawn(x,z,yaw)))}
);
const SITES=Object.freeze({A:Object.freeze({id:"A",name:"Brine Hall",minX:-24,maxX:-10,minZ:-16,maxZ:-4,plantX:-17,plantZ:-9}
),B:Object.freeze({id:"B",name:"Evaporator Deck",minX:10,maxX:24,minZ:-16,maxZ:-4,plantX:17,plantZ:-9}
)}
);
const wp=(id,x,z,links)=>Object.freeze({id,x,z,links:Object.freeze(links)}
);
const WAYPOINTS=Object.freeze([wp("as",0,19,["asW","asE","mS"]),wp("asW",-20.5,19,["as","aw"]),wp("asE",20.5,19,["as","ae"]),wp("aw",-20.5,15,["asW","lA1"]),wp("ae",20.5,15,["asE","lB1"]),wp("mS",0,13,["as","mC"]),wp("mC",0,7,["mS","mW","mE"]),wp("mW",-3,4,["mC","mSideW","wY"]),wp("mE",3,4,["mC","mSideE","eY"]),wp("mSideW",-3.5,0,["mW","mN"]),wp("mSideE",3.5,0,["mE","mN"]),wp("mN",0,-6,["mSideW","mSideE","aShort","bShort","dMidS"]),wp("aShort",-7,-8,["mN","aSite"]),wp("bShort",7,-8,["mN","bSite"]),wp("aSite",-15,-8,["aShort","lA4","dA"]),wp("bSite",15,-8,["bShort","lB4","dB"]),wp("lA1",-24,13,["aw","lA2"]),wp("lA2",-24,5,["lA1","lA3","wY"]),wp("lA3",-18.5,-1,["lA2","lA4"]),wp("lA4",-18,-5,["lA3","aSite"]),wp("lB1",24,13,["ae","lB2"]),wp("lB2",24,5,["lB1","lB3","eY"]),wp("lB3",18.5,-1,["lB2","lB4"]),wp("lB4",18,-5,["lB3","bSite"]),wp("wY",-10,7.5,["mW","lA2"]),wp("eY",10,7.5,["mE","lB2"]),wp("ds",0,-19,["dMidS","dA","dB"]),wp("dMidS",0,-12,["ds","mN"]),wp("dA",-18,-18,["ds","aSite"]),wp("dB",18,-18,["ds","bSite"])]);
export const MAP=Object.freeze({name:"Saltworks",subtitle:"A tidal salt refinery on the dry coast",bounds:Object.freeze({minX:-25,maxX:25,minZ:-23,maxZ:23}
),boxes:BOXES,spawns:SPAWNS,sites:SITES,waypoints:WAYPOINTS}
);
export function overlapBoxes(minX,minY,minZ,maxX,maxY,maxZ){for(let index=0;
index<BOXES.length;
index+=1){const item=BOXES[index];
if(maxX<=item.minX+EPSILON||minX>=item.maxX-EPSILON)continue;
if(maxY<=item.minY+EPSILON||minY>=item.maxY-EPSILON)continue;
if(maxZ<=item.minZ+EPSILON||minZ>=item.maxZ-EPSILON)continue;
return item}
return null}
export function overlapsAt(x,y,z,radius,height,lift=0){return overlapBoxes(x-radius,y+lift,z-radius,x+radius,y+height-lift,z+radius)}
export function createRayHit(){return{hit:false,distance:0,box:null,normalX:0,normalY:0,normalZ:0,x:0,y:0,z:0}
}
export function raycastSolids(ox,oy,oz,dx,dy,dz,maxDistance,out){let bestDistance=maxDistance;
let bestBox=null;
let bestAxis=-1;
let bestSign=0;
for(let index=0;
index<BOXES.length;
index+=1){const item=BOXES[index];
let tMin=0;
let tMax=maxDistance;
let axis=-1;
let sign=0;
let blocked=false;
if(Math.abs(dx)<0.000000001){if(ox<=item.minX||ox>=item.maxX)blocked=true}
else{let t1=(item.minX-ox)/dx;
let t2=(item.maxX-ox)/dx;
let entrySign=-1;
if(t1>t2){const swap=t1;
t1=t2;
t2=swap;
entrySign=1}
if(t1>tMin){tMin=t1;
axis=0;
sign=entrySign}
if(t2<tMax)tMax=t2;
if(tMin>tMax)blocked=true}
if(blocked)continue;
if(Math.abs(dy)<0.000000001){if(oy<=item.minY||oy>=item.maxY)continue}
else{let t1=(item.minY-oy)/dy;
let t2=(item.maxY-oy)/dy;
let entrySign=-1;
if(t1>t2){const swap=t1;
t1=t2;
t2=swap;
entrySign=1}
if(t1>tMin){tMin=t1;
axis=1;
sign=entrySign}
if(t2<tMax)tMax=t2;
if(tMin>tMax)continue}
if(Math.abs(dz)<0.000000001){if(oz<=item.minZ||oz>=item.maxZ)continue}
else{let t1=(item.minZ-oz)/dz;
let t2=(item.maxZ-oz)/dz;
let entrySign=-1;
if(t1>t2){const swap=t1;
t1=t2;
t2=swap;
entrySign=1}
if(t1>tMin){tMin=t1;
axis=2;
sign=entrySign}
if(t2<tMax)tMax=t2;
if(tMin>tMax)continue}
if(tMin<0||tMin>bestDistance)continue;
bestDistance=tMin;
bestBox=item;
bestAxis=axis;
bestSign=sign}
out.hit=bestBox!==null;
out.distance=bestDistance;
out.box=bestBox;
out.normalX=bestAxis===0?bestSign:0;
out.normalY=bestAxis===1?bestSign:0;
out.normalZ=bestAxis===2?bestSign:0;
out.x=ox+dx*bestDistance;
out.y=oy+dy*bestDistance;
out.z=oz+dz*bestDistance;
return out}
