// audio.js — procedural WebAudio and noise events.
export function emitNoise(state,x,z,team,actorId,ttl=1.4,radius=22){const n=state.noises.items[state.noises.head];
n.active=true;
n.x=x;
n.z=z;
n.team=team;
n.actorId=actorId;
n.ttl=ttl;
n.radius=radius;
state.noises.head=(state.noises.head+1)%state.noises.items.length}
export function emitSound(state,type,x,y,z,cls=null,volume=1){let e=null;
for(let i=0;
i<state.sounds.length;
i+=1){if(!state.sounds[i].active){e=state.sounds[i];
break}
}
if(!e){e=state.sounds[state.soundHead%state.sounds.length];
state.soundHead+=1}
e.active=true;
e.played=false;
e.type=type;
e.x=x;
e.y=y;
e.z=z;
e.cls=cls;
e.volume=volume}
export function createAudio(){let ctx=null;
let master=null;
let noiseBuffer=null;
let beepAt=0;
let tickAt=0;
function init(){if(ctx)return;
const AC=window.AudioContext||window.webkitAudioContext;
if(!AC)return;
ctx=new AC;
master=ctx.createGain();
master.gain.value=0.55;
master.connect(ctx.destination);
noiseBuffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
const data=noiseBuffer.getChannelData(0);
for(let i=0;
i<data.length;
i+=1)data[i]=Math.random()*2-1}
function voice(o,pan,vol){if(!ctx)return;
const t=ctx.currentTime+(o.delay||0);
const gain=ctx.createGain();
gain.gain.setValueAtTime(0.0001,t);
gain.gain.exponentialRampToValueAtTime(Math.max(0.0002,o.vol*vol),t+0.006);
gain.gain.exponentialRampToValueAtTime(0.0001,t+o.dur);
const panner=ctx.createStereoPanner();
panner.pan.value=pan;
gain.connect(panner);
panner.connect(master);
if(o.noise){const src=ctx.createBufferSource();
src.buffer=noiseBuffer;
src.loop=true;
const filter=ctx.createBiquadFilter();
filter.type=o.filterType||"lowpass";
filter.frequency.value=o.filter||1000;
src.connect(filter);
filter.connect(gain);
src.start(t);
src.stop(t+o.dur)}
if(o.freq){const osc=ctx.createOscillator();
osc.type=o.wave||"sine";
osc.frequency.setValueAtTime(o.freq,t);
if(o.sweep)osc.frequency.exponentialRampToValueAtTime(Math.max(30,o.freq+o.sweep),t+o.dur);
osc.connect(gain);
osc.start(t);
osc.stop(t+o.dur)}
}
function sfx(type,pan,vol,cls){if(type==="shot"){const mark=cls==="marksman";
const bright=mark?2600:cls==="rifle"?1800:cls==="smg"?1500:1100;
voice({dur:mark?0.24:0.16,vol:0.32,noise:1,filterType:"bandpass",filter:bright,freq:mark?90:150,wave:"square",sweep:-70}
,pan,vol);
if(mark)voice({dur:0.07,vol:0.2,noise:1,filterType:"highpass",filter:3800}
,pan,vol);
return}
if(type==="reload"||type==="reloadEnd"||type==="empty"||type==="bounce"||type==="tick"){voice({dur:0.035,vol:type==="empty"?0.16:0.1,noise:1,filterType:"highpass",filter:type==="bounce"?500:1200,freq:type==="bounce"?220:900,wave:"square"}
,pan,vol)}
else if(type==="step"){voice({dur:0.055,vol:0.06,noise:1,filterType:"lowpass",filter:500,freq:80}
,pan,vol)}
else if(type==="explosion"){voice({dur:0.5,vol:0.45,noise:1,filter:420,freq:55,wave:"sawtooth",sweep:-25}
,pan,vol)}
else if(type==="smoke"){voice({dur:1.4,vol:0.08,noise:1,filterType:"bandpass",filter:900,freq:0}
,pan,vol)}
else if(type==="plant"||type==="beep"){voice({dur:0.07,vol:0.12,freq:type==="plant"?1500:1100}
,pan,vol)}
else if(type==="roundStart"){voice({dur:0.16,vol:0.12,freq:330}
,0,vol);
voice({dur:0.22,vol:0.12,freq:495,delay:0.12}
,0,vol)}
else if(type==="roundEnd"){voice({dur:0.28,vol:0.12,freq:300}
,0,vol);
voice({dur:0.34,vol:0.12,freq:200,delay:0.12}
,0,vol)}
}
function place(state,x,z){const p=state.player;
const dx=x-p.position.x;
const dz=z-p.position.z;
const distance=Math.hypot(dx,dz);
const pan=Math.max(-1,Math.min(1,(dx*Math.cos(p.yaw)-dz*Math.sin(p.yaw))/(distance+1)));
return{pan:pan*0.8,volume:Math.max(0,1-distance/46)}
}
return{init,update(state){if(!ctx)return;
for(let i=0;
i<state.sounds.length;
i+=1){const event=state.sounds[i];
if(!event.active||event.played)continue;
event.active=false;
const pos=place(state,event.x,event.z);
sfx(event.type,pos.pan,pos.volume*event.volume,event.cls)}
const objective=state.objective;
if(objective.planted){const interval=Math.max(0.18,0.35+objective.timer/40);
if(ctx.currentTime>beepAt){beepAt=ctx.currentTime+interval;
const pos=place(state,objective.x,objective.z);
sfx("beep",pos.pan,pos.volume,null)}
}
if(objective.defuseProgress>0&&ctx.currentTime>tickAt){tickAt=ctx.currentTime+0.28;
sfx("tick",0,1,null)}
}
}
}
