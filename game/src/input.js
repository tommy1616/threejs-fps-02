// input.js — keyboard/mouse/pointer-lock snapshot.
export function createInput(canvas,onLockChange=()=>{}
){const keys=new Set;
const pending={lookX:0,lookY:0,jump:false,reload:false,buy:false,slot:0,firePressed:false,aimPressed:false,enter:false,last:false,wheel:0}
;
const snapshot={forward:0,strafe:0,jumpPressed:false,crouch:false,walk:false,interact:false,reloadPressed:false,buyPressed:false,slotPressed:0,enterPressed:false,lastPressed:false,wheel:0,aim:false,aimPressed:false,fire:false,firePressed:false,lookDX:0,lookDY:0,locked:false}
;
let firing=false;
let aiming=false;
let locked=false;
function queueKey(code){if(code==="Space")pending.jump=true;
else if(code==="KeyR")pending.reload=true;
else if(code==="KeyB")pending.buy=true;
else if(code==="KeyQ")pending.last=true;
else if(code==="Enter")pending.enter=true;
else if(code.startsWith("Digit")){const digit=Number(code.slice(5));
if(digit>=1&&digit<=9)pending.slot=digit}
}
function onKeyDown(event){if(event.code==="Space")event.preventDefault();
keys.add(event.code);
if(!event.repeat)queueKey(event.code)}
function onKeyUp(event){keys.delete(event.code)}
function onBlur(){keys.clear();
firing=false;
aiming=false}
function onMouseMove(event){if(!locked)return;
pending.lookX+=event.movementX;
pending.lookY+=event.movementY}
function onMouseDown(event){if(!locked)return;
if(event.button===0){firing=true;
pending.firePressed=true}
else if(event.button===2){aiming=true;
pending.aimPressed=true}
}
function onMouseUp(event){if(event.button===0)firing=false;
else if(event.button===2)aiming=false}
function onWheel(event){if(!locked)return;
pending.wheel+=Math.sign(event.deltaY)}
function onContextMenu(event){event.preventDefault()}
function onCanvasClick(){if(!locked)requestLock()}
function onPointerLockChange(){locked=document.pointerLockElement===canvas;
if(!locked){keys.clear();
firing=false;
aiming=false;
pending.lookX=0;
pending.lookY=0}
onLockChange(locked)}
function requestLock(){const request=canvas.requestPointerLock?.();
if(request&&typeof request.catch==="function")request.catch(()=>{}
)}
function takeSnapshot(){snapshot.forward=(keys.has("KeyW")?1:0)-(keys.has("KeyS")?1:0);
snapshot.strafe=(keys.has("KeyD")?1:0)-(keys.has("KeyA")?1:0);
snapshot.crouch=keys.has("ControlLeft")||keys.has("ControlRight")||keys.has("KeyC");
snapshot.walk=keys.has("ShiftLeft")||keys.has("ShiftRight");
snapshot.interact=keys.has("KeyE");
snapshot.jumpPressed=pending.jump;
snapshot.reloadPressed=pending.reload;
snapshot.buyPressed=pending.buy;
snapshot.slotPressed=pending.slot;
snapshot.enterPressed=pending.enter;
snapshot.lastPressed=pending.last;
snapshot.wheel=pending.wheel;
snapshot.aim=aiming;
snapshot.aimPressed=pending.aimPressed;
snapshot.fire=firing;
snapshot.firePressed=pending.firePressed;
snapshot.lookDX=pending.lookX;
snapshot.lookDY=pending.lookY;
snapshot.locked=locked;
pending.jump=false;
pending.reload=false;
pending.buy=false;
pending.slot=0;
pending.enter=false;
pending.last=false;
pending.wheel=0;
pending.firePressed=false;
pending.aimPressed=false;
pending.lookX=0;
pending.lookY=0;
return snapshot}
window.addEventListener("keydown",onKeyDown);
window.addEventListener("keyup",onKeyUp);
window.addEventListener("blur",onBlur);
window.addEventListener("mousemove",onMouseMove);
window.addEventListener("mousedown",onMouseDown);
window.addEventListener("mouseup",onMouseUp);
window.addEventListener("wheel",onWheel,{passive:true}
);
canvas.addEventListener("click",onCanvasClick);
canvas.addEventListener("contextmenu",onContextMenu);
document.addEventListener("pointerlockchange",onPointerLockChange);
return{takeSnapshot,requestLock,get locked(){return locked}
,get keys(){return keys}
,dispose(){window.removeEventListener("keydown",onKeyDown);
window.removeEventListener("keyup",onKeyUp);
window.removeEventListener("blur",onBlur);
window.removeEventListener("mousemove",onMouseMove);
window.removeEventListener("mousedown",onMouseDown);
window.removeEventListener("mouseup",onMouseUp);
window.removeEventListener("wheel",onWheel);
canvas.removeEventListener("click",onCanvasClick);
canvas.removeEventListener("contextmenu",onContextMenu);
document.removeEventListener("pointerlockchange",onPointerLockChange)}
}
}
