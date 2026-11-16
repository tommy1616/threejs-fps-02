// loop.js — fixed-step RAF loop with accumulator.
import{CONFIG}
from"./config.js";
export function createFixedLoop({state,simulate,render,beginFrame=null}
){let running=false;
let handle=0;
let lastTime=0;
let accumulator=0;
let frameCount=0;
function frame(now){if(!running)return;
handle=requestAnimationFrame(frame);
const frameDt=Math.min(Math.max(0,(now-lastTime)/1000),CONFIG.maxFrameDt);
lastTime=now;
if(beginFrame)beginFrame(frameDt);
accumulator+=frameDt;
let steps=0;
while(accumulator>=CONFIG.fixedDt&&steps<CONFIG.maxSubSteps){simulate(state,CONFIG.fixedDt);
accumulator-=CONFIG.fixedDt;
steps+=1}
if(accumulator>CONFIG.fixedDt*CONFIG.maxSubSteps)accumulator=0;
render(accumulator/CONFIG.fixedDt);
frameCount+=1}
return{start(){if(running)return;
running=true;
lastTime=performance.now();
accumulator=0;
handle=requestAnimationFrame(frame)}
,stop(){running=false;
cancelAnimationFrame(handle)}
,get running(){return running}
,get frames(){return frameCount}
}
}
