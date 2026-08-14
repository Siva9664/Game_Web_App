'use strict';
/* =====================================================================
   NEON LANES — single-file arcade bowling game
   Sections: Audio | Geometry/Physics | Pins | Ball | Scoring |
             Turn/Frame state machine | AI | Rendering | Input | Init
   ===================================================================== */

/* ---------------------------------------------------------------------
   AUDIO ENGINE  (procedural, WebAudio only — no external sound files)
   --------------------------------------------------------------------- */
const Audio2 = (() => {
  let ctx = null, muted = false, rollSrc = null, rollGain = null;
  function ensure(){ if(!ctx){ ctx = new (window.AudioContext||window.webkitAudioContext)(); } if(ctx.state==='suspended') ctx.resume(); return ctx; }
  function tone(freq,start,dur,type='sine',vol=.22,glideTo=null){
    if(muted) return;
    const c = ensure();
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime+start);
    if(glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime+start+dur);
    g.gain.setValueAtTime(0, c.currentTime+start);
    g.gain.linearRampToValueAtTime(vol, c.currentTime+start+.01);
    g.gain.exponentialRampToValueAtTime(.0001, c.currentTime+start+dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime+start); o.stop(c.currentTime+start+dur+.02);
  }
  function noiseBurst(start,dur,vol=.3,lp=1800){
    if(muted) return;
    const c = ensure();
    const buf = c.createBuffer(1, c.sampleRate*dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=lp;
    const g = c.createGain(); g.gain.setValueAtTime(vol, c.currentTime+start);
    g.gain.exponentialRampToValueAtTime(.001, c.currentTime+start+dur);
    src.connect(filt).connect(g).connect(c.destination);
    src.start(c.currentTime+start);
  }
  function startRoll(){
    if(muted) return;
    const c = ensure();
    stopRoll();
    const bufLen = c.sampleRate*2;
    const buf = c.createBuffer(1,bufLen,c.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<bufLen;i++) d[i]=Math.random()*2-1;
    rollSrc = c.createBufferSource(); rollSrc.buffer = buf; rollSrc.loop = true;
    const filt = c.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=420;
    rollGain = c.createGain(); rollGain.gain.value = 0.0001;
    rollSrc.connect(filt).connect(rollGain).connect(c.destination);
    rollSrc.start();
  }
  function setRollVolume(v){ if(rollGain) rollGain.gain.linearRampToValueAtTime(Math.max(.0001,v), ensure().currentTime+.05); }
  function stopRoll(){ if(rollSrc){ try{rollSrc.stop();}catch(e){} rollSrc=null; rollGain=null; } }
  function pinHit(){ noiseBurst(0,.14,.35,3200); tone(900+Math.random()*300,0,.09,'triangle',.12); }
  function gutter(){ tone(90,0,.35,'sine',.25,60); }
  function strike(){ [523,659,784,1046].forEach((f,i)=>tone(f,i*.09,.32,'square',.16)); noiseBurst(.05,.5,.25,4000); }
  function spare(){ tone(660,0,.16,'triangle',.2); tone(880,.14,.22,'triangle',.2); }
  function foul(){ tone(140,0,.25,'sawtooth',.2); }
  function click(){ tone(440,0,.05,'square',.08); }
  function setMuted(m){ muted=m; if(m) stopRoll(); }
  return {tone,noiseBurst,startRoll,setRollVolume,stopRoll,pinHit,gutter,strike,spare,foul,click,setMuted,ensure};
})();

/* ---------------------------------------------------------------------
   CANVAS / LANE GEOMETRY  (pseudo-3D trapezoidal perspective)
   --------------------------------------------------------------------- */
const canvas = document.getElementById('lane');
const ctx2d = canvas.getContext('2d');
let DPR = Math.min(window.devicePixelRatio||1, 2);
let geom = {};

function resizeCanvas(){
  const rect = canvas.getBoundingClientRect();
  const w = rect.width, h = rect.width * 1.5; // aspect 2:3
  canvas.width = Math.round(w*DPR);
  canvas.height = Math.round(h*DPR);
  const W = canvas.width, H = canvas.height;
  geom = {
    W,H,
    centerX: W/2,
    laneTopY: H*0.10,
    laneBottomY: H*0.90,
    laneBottomHalfW: W*0.30,
    laneTopHalfW: W*0.155,
    gutterFactor: 0.42
  };
}
window.addEventListener('resize', resizeCanvas);

function lerp(a,b,t){ return a+(b-a)*t; }
function laneHalfWidthAt(progress){ return lerp(geom.laneBottomHalfW, geom.laneTopHalfW, clamp01(progress)); }
function depthScale(progress){ return lerp(1.0, 0.5, clamp01(progress)); }
function clamp01(v){ return Math.max(0,Math.min(1,v)); }
function toScreen(fFrac, progress){
  const y = lerp(geom.laneBottomY, geom.laneTopY, clamp01(progress));
  const halfW = laneHalfWidthAt(progress);
  const x = geom.centerX + fFrac*halfW;
  return {x,y,halfW,scale:depthScale(progress)};
}

/* ---------------------------------------------------------------------
   PIN SETUP  (standard triangular 4-3-2-1 formation, numbered 1-10)
   --------------------------------------------------------------------- */
const PIN_BASE_R = 30; // logical px at scale 1 (foul line depth)
const ROW_PROGRESS = [0.80, 0.865, 0.93, 0.995]; // front(1) -> back(7-10)
const PIN_LAYOUT = [
  {n:1, row:0, f:0},
  {n:2, row:1, f:-0.19}, {n:3, row:1, f:0.19},
  {n:4, row:2, f:-0.38}, {n:5, row:2, f:0}, {n:6, row:2, f:0.38},
  {n:7, row:3, f:-0.57}, {n:8, row:3, f:-0.19}, {n:9, row:3, f:0.19}, {n:10, row:3, f:0.57},
];

function freshPins(){
  return PIN_LAYOUT.map(p => ({
    n:p.n,
    baseF:p.f, baseProgress:ROW_PROGRESS[p.row],
    standing:true, falling:false, settled:false,
    x:0,y:0,scale:1,
    vx:0,vy:0, fallProgress:0, tipDir:1,
    spawnT: performance.now(),
  }));
}
let pins = freshPins();

/* ---------------------------------------------------------------------
   BALL
   --------------------------------------------------------------------- */
const BALL_BASE_R = 30;
const FRICTION_RATE = 1.04;   // exponential decay rate per second
function freshBall(){
  return {
    active:false,
    progress:0, fFrac:0,
    progressVel:0, fVel:0,
    curve:0,
    x:0,y:0,prevX:0,prevY:0,
    thrownBy:null,
    inGutter:false,
    settleTimer:0,
  };
}
let ball = freshBall();

/* ---------------------------------------------------------------------
   GAME / SCORING STATE
   --------------------------------------------------------------------- */
const Game = {
  frame:1,
  activePlayer:'player', // 'player' | 'ai'
  practice:false,
  paused:false,
  over:false,
  busy:false, // true while a throw/animation is resolving (locks input)
  difficulty:'medium',
  frames:{ player: Array.from({length:10},()=>({rolls:[]})), ai: Array.from({length:10},()=>({rolls:[]})) },
};

function currentFrameObj(player){ return Game.frames[player][Game.frame-1]; }

function frameDoneNormal(rolls){
  if(rolls.length===1 && rolls[0]===10) return true;
  if(rolls.length===2) return true;
  return false;
}
function needsReset10th(rolls){
  if(rolls.length===0) return false;
  if(rolls.length===1) return rolls[0]===10;
  if(rolls.length===2){
    if(rolls[0]===10) return rolls[1]===10;
    return (rolls[0]+rolls[1])===10;
  }
  return false;
}
function frame10Done(rolls){
  if(rolls.length<2) return false;
  if(rolls.length===2){
    const strike1 = rolls[0]===10;
    const sum = rolls[0]+rolls[1];
    if(!strike1 && sum<10) return true;
    return false;
  }
  return rolls.length>=3;
}

function scoreGame(framesArr){
  // framesArr: array of {rolls:[...]}, up to 10 entries (game may be in progress)
  const flat = [];
  framesArr.forEach(f=>f.rolls.forEach(r=>flat.push(r)));
  let idx=0, total=0;
  const cum = [];
  for(let fr=0; fr<10; fr++){
    if(fr>=framesArr.length){ cum.push(null); continue; }
    if(flat[idx]===undefined){ cum.push(null); continue; }
    if(flat[idx]===10){ // strike
      if(flat[idx+1]===undefined || flat[idx+2]===undefined){ cum.push(null); continue; }
      total += 10+flat[idx+1]+flat[idx+2];
      idx += 1;
    } else if(flat[idx+1]!==undefined && flat[idx]+flat[idx+1]===10){ // spare
      if(flat[idx+2]===undefined){ cum.push(null); continue; }
      total += 10+flat[idx+2];
      idx += 2;
    } else if(flat[idx+1]!==undefined){ // open
      total += flat[idx]+flat[idx+1];
      idx += 2;
    } else { cum.push(null); continue; }
    cum.push(total);
  }
  return {total, cum};
}

/* ---------------------------------------------------------------------
   SCOREBOARD RENDERING
   --------------------------------------------------------------------- */
function buildScoreboardDOM(){
  const rowP = document.getElementById('scoreRowPlayer');
  const rowA = document.getElementById('scoreRowAI');
  for(let i=0;i<10;i++){
    const boxP = document.createElement('div'); boxP.className='frame-box'; boxP.id='fb-player-'+i;
    boxP.innerHTML = `<div class="rolls"></div><div class="total">&nbsp;</div>`;
    rowP.appendChild(boxP);
    const boxA = document.createElement('div'); boxA.className='frame-box'; boxA.id='fb-ai-'+i;
    boxA.innerHTML = `<div class="rolls"></div><div class="total">&nbsp;</div>`;
    rowA.appendChild(boxA);
  }
  const totP = document.createElement('div'); totP.className='score-total'; totP.id='total-player'; totP.textContent='0';
  rowP.appendChild(totP);
  const totA = document.createElement('div'); totA.className='score-total'; totA.id='total-ai'; totA.textContent='0';
  rowA.appendChild(totA);
}
function rollSymbol(rolls, i){
  const v = rolls[i];
  if(v===undefined) return '';
  if(v===10) return 'X';
  if(i>0){
    // spare check only meaningful for 2nd (or 3rd after non-strike) roll in a pair
    const prev = rolls[i-1];
    if(prev!==10 && prev+v===10) return '/';
  }
  return v===0 ? '-' : String(v);
}
function renderScoreboard(){
  ['player','ai'].forEach(who=>{
    const framesArr = Game.frames[who];
    const {total,cum} = scoreGame(framesArr);
    for(let i=0;i<10;i++){
      const box = document.getElementById('fb-'+who+'-'+i);
      const rolls = framesArr[i].rolls;
      const rollsDiv = box.querySelector('.rolls');
      const n = (i===9) ? 3 : 2;
      let html='';
      for(let r=0;r<n;r++){
        if(i<9 && r===1 && rolls[0]===10){ html+='<span></span>'; continue; } // strike: no 2nd box shown
        html += `<span>${rollSymbol(rolls,r)}</span>`;
      }
      rollsDiv.innerHTML = html;
      box.querySelector('.total').textContent = (cum[i]===null||cum[i]===undefined) ? '' : cum[i];
      box.classList.toggle('current', (i===Game.frame-1) && Game.activePlayer===who && !Game.over);
    }
    document.getElementById('total-'+who).textContent = total;
  });
}

/* ---------------------------------------------------------------------
   STATUS / UI HELPERS
   --------------------------------------------------------------------- */
const statusMsg = document.getElementById('statusMsg');
const modeBadge = document.getElementById('modeBadge');
const callout = document.getElementById('callout');
function setStatus(txt){ statusMsg.textContent = txt; }
function showCallout(text){
  callout.textContent = text;
  callout.classList.remove('show'); void callout.offsetWidth;
  callout.classList.add('show');
}
function updateModeBadge(){
  modeBadge.textContent = Game.practice ? 'PRACTICE MODE' : ('MATCH · FRAME '+Game.frame+'/10');
}

/* ---------------------------------------------------------------------
   PIN / BALL PHYSICS UPDATE
   --------------------------------------------------------------------- */
function pinScreen(p){
  if(p.standing){
    const s = toScreen(p.baseF, p.baseProgress);
    p.x=s.x; p.y=s.y; p.scale=s.scale;
  }
  return {x:p.x,y:p.y,r:PIN_BASE_R*p.scale};
}
function knockPin(p, dirX, dirY, speed){
  if(!p.standing) return;
  p.standing=false; p.falling=true; p.fallProgress=0;
  p.tipDir = dirX>=0?1:-1;
  p.vx = dirX*speed*0.75 + (Math.random()-0.5)*40;
  p.vy = dirY*speed*0.75 + (Math.random()-0.5)*20;
  Audio2.pinHit();
  spawnPinDust(p.x,p.y);
}
let dustParticles = [];
function spawnPinDust(x,y){
  for(let i=0;i<5;i++){
    dustParticles.push({x,y,vx:(Math.random()-0.5)*70,vy:(Math.random()-0.5)*70-20,life:1});
  }
}

function updatePins(dt){
  pins.forEach(p=>{
    if(p.standing){ pinScreen(p); return; }
    if(p.falling && p.fallProgress<1){
      p.x += p.vx*dt; p.y += p.vy*dt;
      p.vx *= Math.pow(0.02, dt); p.vy *= Math.pow(0.02, dt);
      p.fallProgress = Math.min(1, p.fallProgress + dt/0.4);
      // chain-reaction: falling pin can knock nearby standing pins while still moving fast
      if(p.fallProgress < 0.55){
        const speed = Math.hypot(p.vx,p.vy);
        if(speed>25){
          pins.forEach(o=>{
            if(o===p || !o.standing) return;
            const os = pinScreen(o);
            const dx=os.x-p.x, dy=os.y-p.y, dist=Math.hypot(dx,dy);
            const rr = (PIN_BASE_R*o.scale)+(PIN_BASE_R*p.scale)*0.8;
            if(dist < rr){
              const dirX = dist>0.001?dx/dist:0, dirY=dist>0.001?dy/dist:-1;
              knockPin(o, dirX, dirY, speed);
            }
          });
        }
      }
      if(p.fallProgress>=1){ p.settled=true; }
    }
  });
  dustParticles.forEach(d=>{ d.x+=d.vx*dt; d.y+=d.vy*dt; d.vy+=90*dt; d.life-=dt*1.6; });
  dustParticles = dustParticles.filter(d=>d.life>0);
}

function ballScreenPos(){
  const s = toScreen(ball.fFrac, ball.progress);
  return {x:s.x, y:s.y, r:BALL_BASE_R*s.scale, scale:s.scale};
}

function updateBall(dt){
  if(!ball.active) return;
  const bp = ballScreenPos();
  ball.prevX = bp.x; ball.prevY = bp.y;

  ball.fVel += ball.curve*0.9*dt;
  ball.progress += ball.progressVel*dt;
  ball.fFrac += ball.fVel*dt;
  ball.progressVel *= Math.pow(1/FRICTION_RATE, dt*10); // exponential friction

  const after = ballScreenPos();
  ball.x=after.x; ball.y=after.y;

  Audio2.setRollVolume(Math.min(0.35, ball.progressVel*0.5));

  if(!ball.inGutter && Math.abs(ball.fFrac) > 0.72){
    ball.inGutter = true;
    Audio2.gutter();
  }

  // pin collisions only in the pin-deck zone, and only if not deep in gutter
  if(!ball.inGutter && ball.progress>0.70 && ball.progress<1.18){
    const dirX = after.x-ball.prevX, dirY = after.y-ball.prevY;
    const dlen = Math.hypot(dirX,dirY)||1;
    const speed = dlen/dt;
    pins.forEach(p=>{
      if(!p.standing) return;
      const ps = pinScreen(p);
      const dist = Math.hypot(ps.x-after.x, ps.y-after.y);
      if(dist < (BALL_BASE_R*after.scale*0.9 + ps.r)){
        const ux = dist>0.001 ? (ps.x-after.x)/dist : 0;
        const uy = dist>0.001 ? (ps.y-after.y)/dist : -1;
        knockPin(p, ux, uy, speed);
        ball.progressVel *= 0.86;
        ball.fVel += ux*0.25;
      }
    });
  }

  // end-of-throw conditions
  if(ball.progress > 1.22 || (ball.progressVel < 0.018 && ball.settleTimer>0.15)){
    finishThrowPhysics();
  }
  if(ball.progressVel < 0.03) ball.settleTimer += dt; else ball.settleTimer = 0;
}

/* ---------------------------------------------------------------------
   RENDERING
   --------------------------------------------------------------------- */
function drawLane(){
  const {W,H,centerX,laneTopY,laneBottomY,laneBottomHalfW,laneTopHalfW} = geom;
  ctx2d.clearRect(0,0,W,H);

  // backdrop
  const bg = ctx2d.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#120a24'); bg.addColorStop(0.5,'#0c0718'); bg.addColorStop(1,'#05030a');
  ctx2d.fillStyle=bg; ctx2d.fillRect(0,0,W,H);

  // pit / back wall glow
  const pit = ctx2d.createRadialGradient(centerX,laneTopY-10,4,centerX,laneTopY-10,W*0.5);
  pit.addColorStop(0,'rgba(38,247,211,0.28)'); pit.addColorStop(1,'rgba(38,247,211,0)');
  ctx2d.fillStyle=pit; ctx2d.fillRect(0,0,W,laneTopY+60);

  const gL = laneBottomHalfW*geom.gutterFactor, gLt = laneTopHalfW*geom.gutterFactor;

  // gutters
  ctx2d.beginPath();
  ctx2d.moveTo(centerX-laneBottomHalfW-gL, laneBottomY);
  ctx2d.lineTo(centerX-laneTopHalfW-gLt, laneTopY);
  ctx2d.lineTo(centerX-laneTopHalfW, laneTopY);
  ctx2d.lineTo(centerX-laneBottomHalfW, laneBottomY);
  ctx2d.closePath();
  const gg = ctx2d.createLinearGradient(0,laneTopY,0,laneBottomY);
  gg.addColorStop(0,'#241a3a'); gg.addColorStop(1,'#150e26');
  ctx2d.fillStyle=gg; ctx2d.fill();
  ctx2d.strokeStyle='rgba(38,247,211,.5)'; ctx2d.lineWidth=1.5; ctx2d.stroke();

  ctx2d.beginPath();
  ctx2d.moveTo(centerX+laneBottomHalfW+gL, laneBottomY);
  ctx2d.lineTo(centerX+laneTopHalfW+gLt, laneTopY);
  ctx2d.lineTo(centerX+laneTopHalfW, laneTopY);
  ctx2d.lineTo(centerX+laneBottomHalfW, laneBottomY);
  ctx2d.closePath();
  ctx2d.fillStyle=gg; ctx2d.fill();
  ctx2d.strokeStyle='rgba(255,63,142,.5)'; ctx2d.lineWidth=1.5; ctx2d.stroke();

  // lane wood
  ctx2d.beginPath();
  ctx2d.moveTo(centerX-laneBottomHalfW, laneBottomY);
  ctx2d.lineTo(centerX-laneTopHalfW, laneTopY);
  ctx2d.lineTo(centerX+laneTopHalfW, laneTopY);
  ctx2d.lineTo(centerX+laneBottomHalfW, laneBottomY);
  ctx2d.closePath();
  ctx2d.save(); ctx2d.clip();
  const wood = ctx2d.createLinearGradient(0,laneTopY,0,laneBottomY);
  wood.addColorStop(0,'#e9c988'); wood.addColorStop(0.5,'#d9ac5f'); wood.addColorStop(1,'#c9903f');
  ctx2d.fillStyle=wood; ctx2d.fillRect(0,0,W,H);
  // plank lines
  ctx2d.strokeStyle='rgba(120,74,20,.25)'; ctx2d.lineWidth=1;
  for(let i=-6;i<=6;i++){
    ctx2d.beginPath();
    const topX = centerX + i*(laneTopHalfW/6);
    const botX = centerX + i*(laneBottomHalfW/6);
    ctx2d.moveTo(botX, laneBottomY); ctx2d.lineTo(topX, laneTopY); ctx2d.stroke();
  }
  // arrows
  ctx2d.fillStyle='rgba(120,74,20,.55)';
  const arrowProg=0.42;
  const as = toScreen(0,arrowProg);
  for(let i=-2;i<=2;i++){
    const px = as.x + i*as.halfW*0.32;
    ctx2d.beginPath();
    ctx2d.moveTo(px, as.y+10);
    ctx2d.lineTo(px-6, as.y-6);
    ctx2d.lineTo(px+6, as.y-6);
    ctx2d.closePath(); ctx2d.fill();
  }
  ctx2d.restore();

  // foul line
  ctx2d.beginPath();
  ctx2d.moveTo(centerX-laneBottomHalfW, laneBottomY);
  ctx2d.lineTo(centerX+laneBottomHalfW, laneBottomY);
  ctx2d.strokeStyle='rgba(255,63,142,.85)'; ctx2d.lineWidth=3;
  ctx2d.shadowColor='rgba(255,63,142,.8)'; ctx2d.shadowBlur=8;
  ctx2d.stroke(); ctx2d.shadowBlur=0;

  // neon side rails
  ctx2d.strokeStyle='rgba(38,247,211,.65)'; ctx2d.lineWidth=2; ctx2d.shadowColor='rgba(38,247,211,.7)'; ctx2d.shadowBlur=6;
  ctx2d.beginPath(); ctx2d.moveTo(centerX-laneBottomHalfW-gL,laneBottomY); ctx2d.lineTo(centerX-laneTopHalfW-gLt,laneTopY); ctx2d.stroke();
  ctx2d.beginPath(); ctx2d.moveTo(centerX+laneBottomHalfW+gL,laneBottomY); ctx2d.lineTo(centerX+laneTopHalfW+gLt,laneTopY); ctx2d.stroke();
  ctx2d.shadowBlur=0;
}

function drawPin(p){
  const r = PIN_BASE_R*p.scale;
  ctx2d.save();
  ctx2d.translate(p.x,p.y);
  let tilt=0, alpha=1, sy=1;
  if(p.falling){
    const t = p.fallProgress;
    tilt = t*(Math.PI/2.1)*p.tipDir;
    sy = 1-t*0.55;
    alpha = 1-Math.max(0,t-0.7)/0.3;
  }
  ctx2d.rotate(tilt);
  ctx2d.scale(1,sy);
  ctx2d.globalAlpha = Math.max(0,alpha);
  // shadow
  ctx2d.save();
  ctx2d.rotate(-tilt); ctx2d.scale(1,1/sy);
  ctx2d.beginPath(); ctx2d.ellipse(0, r*0.9, r*0.9, r*0.32, 0, 0, Math.PI*2);
  ctx2d.fillStyle='rgba(0,0,0,.35)'; ctx2d.fill();
  ctx2d.restore();
  // pin body (simple bowling-pin silhouette via stacked ellipses)
  const grad = ctx2d.createLinearGradient(-r,-r*1.8,r,r*1.3);
  grad.addColorStop(0,'#fefcf9'); grad.addColorStop(0.55,'#eee8f2'); grad.addColorStop(1,'#cfc6da');
  ctx2d.fillStyle=grad;
  ctx2d.beginPath();
  ctx2d.moveTo(-r*0.28, r*1.25);
  ctx2d.bezierCurveTo(-r*0.9, r*0.9, -r*0.75,-r*0.1, -r*0.32,-r*0.9);
  ctx2d.bezierCurveTo(-r*0.5,-r*1.35, -r*0.22,-r*1.7, 0,-r*1.75);
  ctx2d.bezierCurveTo(r*0.22,-r*1.7, r*0.5,-r*1.35, r*0.32,-r*0.9);
  ctx2d.bezierCurveTo(r*0.75,-r*0.1, r*0.9, r*0.9, r*0.28, r*1.25);
  ctx2d.closePath(); ctx2d.fill();
  ctx2d.strokeStyle='rgba(120,100,140,.4)'; ctx2d.lineWidth=1; ctx2d.stroke();
  // red stripes
  ctx2d.strokeStyle='#e0264f'; ctx2d.lineWidth=r*0.32;
  ctx2d.beginPath(); ctx2d.moveTo(-r*0.62,-r*0.55); ctx2d.lineTo(r*0.62,-r*0.55); ctx2d.stroke();
  ctx2d.lineWidth=r*0.16;
  ctx2d.beginPath(); ctx2d.moveTo(-r*0.5,-r*1.0); ctx2d.lineTo(r*0.5,-r*1.0); ctx2d.stroke();
  ctx2d.globalAlpha=1;
  ctx2d.restore();
}

function drawBall(){
  if(!ball.active && ball.progress===0 && !ball.__idleShown){ /* still show resting ball below */ }
  const pos = (ball.active) ? {x:ball.x,y:ball.y,r:BALL_BASE_R*depthScale(ball.progress)} :
              (()=>{ const s=toScreen(0,0.0); return {x:s.x,y:s.y,r:BALL_BASE_R}; })();
  ctx2d.save();
  ctx2d.beginPath(); ctx2d.ellipse(pos.x,pos.y+pos.r*0.85,pos.r*0.95,pos.r*0.32,0,0,Math.PI*2);
  ctx2d.fillStyle='rgba(0,0,0,.4)'; ctx2d.fill();
  const grad = ctx2d.createRadialGradient(pos.x-pos.r*0.35,pos.y-pos.r*0.4,pos.r*0.1,pos.x,pos.y,pos.r);
  grad.addColorStop(0,'#7ef9ea'); grad.addColorStop(0.4,'#1fb7c9'); grad.addColorStop(1,'#0b2f52');
  ctx2d.beginPath(); ctx2d.arc(pos.x,pos.y,pos.r,0,Math.PI*2);
  ctx2d.fillStyle=grad; ctx2d.shadowColor='rgba(38,247,211,.6)'; ctx2d.shadowBlur=14; ctx2d.fill(); ctx2d.shadowBlur=0;
  // finger holes rotate a bit for motion feel
  const spin = ball.active ? (ball.progress*30) : 0;
  ctx2d.save(); ctx2d.translate(pos.x,pos.y); ctx2d.rotate(spin);
  ctx2d.fillStyle='rgba(6,20,32,.85)';
  [[-pos.r*0.28,-pos.r*0.15],[pos.r*0.05,-pos.r*0.32],[pos.r*0.28,-pos.r*0.05]].forEach(([hx,hy])=>{
    ctx2d.beginPath(); ctx2d.arc(hx,hy,pos.r*0.11,0,Math.PI*2); ctx2d.fill();
  });
  ctx2d.restore();
  ctx2d.restore();
}

function drawDust(){
  dustParticles.forEach(d=>{
    ctx2d.globalAlpha = Math.max(0,d.life);
    ctx2d.fillStyle='#d9c8a0';
    ctx2d.beginPath(); ctx2d.arc(d.x,d.y,2.2,0,Math.PI*2); ctx2d.fill();
  });
  ctx2d.globalAlpha=1;
}

function drawAimGuide(){
  if(ball.active || Game.busy || Game.paused || Game.over || Game.activePlayer!=='player') return;
  const aim = parseFloat(document.getElementById('aimSlider').value)/45;
  const start = toScreen(0,0);
  const end = toScreen(aim*0.55, 0.55);
  ctx2d.save();
  ctx2d.setLineDash([6,8]);
  ctx2d.strokeStyle='rgba(244,241,255,.35)';
  ctx2d.lineWidth=2;
  ctx2d.beginPath(); ctx2d.moveTo(start.x,start.y-2); ctx2d.lineTo(end.x,end.y); ctx2d.stroke();
  ctx2d.restore();
}

function render(){
  drawLane();
  // draw pins back-to-front (higher progress first so nearer pins overlap correctly)
  const order = pins.slice().sort((a,b)=> (b.standing?b.baseProgress:0) - (a.standing?a.baseProgress:0) || (a.y-b.y));
  order.forEach(p=>{ if(p.standing || (p.falling && p.fallProgress<1)) drawPin(p); });
  drawDust();
  drawAimGuide();
  drawBall();
}

/* ---------------------------------------------------------------------
   THROW LIFECYCLE
   --------------------------------------------------------------------- */
function startThrow(player, angleDeg, power01, curve01){
  Game.busy = true;
  ball = freshBall();
  ball.active = true;
  ball.thrownBy = player;
  ball.progressVel = 0.70 + power01*0.95;
  ball.fVel = (angleDeg/45) * 0.42;
  ball.curve = curve01; // -1..1
  const s0 = toScreen(0,0);
  ball.x = s0.x; ball.y = s0.y;
  pins.forEach(p=>{ p._wasStanding = p.standing; });
  Audio2.startRoll();
  Audio2.click();
}

function finishThrowPhysics(){
  if(!ball.active) return;
  ball.active = false;
  Audio2.stopRoll();

  const knockedNow = pins.filter(p=>p._wasStanding && !p.standing).length;
  const standingLeft = pins.filter(p=>p.standing).length;

  resolveRoll(ball.thrownBy, knockedNow, standingLeft);
}

/* Resolve a completed roll: update frame data, decide next step */
function resolveRoll(player, pinsKnocked, standingLeft){
  if(Game.practice){
    setStatus((player==='player'?'You':'AI')+' knocked down '+pinsKnocked+' pin'+(pinsKnocked===1?'':'s')+' (practice)');
    setTimeout(()=>{
      resetPins(true);
      Game.busy = false;
      if(player==='ai'){ setStatus('Your turn — practice mode'); Game.activePlayer='player'; }
    }, 850);
    return;
  }

  const fo = currentFrameObj(player);
  fo.rolls.push(pinsKnocked);
  renderScoreboard();

  const isTenth = Game.frame===10;
  const rolls = fo.rolls;

  // celebratory callouts
  if(!isTenth){
    if(rolls.length===1 && rolls[0]===10){ showCallout('STRIKE!'); Audio2.strike(); }
    else if(rolls.length===2 && rolls[0]+rolls[1]===10){ showCallout('SPARE!'); Audio2.spare(); }
  } else {
    if(pinsKnocked===10){ showCallout('STRIKE!'); Audio2.strike(); }
    else if(rolls.length===2 && !( rolls[0]===10 ) && rolls[0]+rolls[1]===10){ showCallout('SPARE!'); Audio2.spare(); }
  }

  let done, needsReset;
  if(!isTenth){
    done = frameDoneNormal(rolls);
    needsReset = false; // normal frames always fully reset only when moving to next frame
  } else {
    done = frame10Done(rolls);
    needsReset = needsReset10th(rolls);
  }

  setTimeout(()=>{
    if(done){
      advanceTurn(player);
    } else {
      if(needsReset) resetPins(true); // 10th frame bonus rack
      Game.busy = false;
      setStatus((player==='player'?'Your turn':"AI's turn") + ' · Throw ' + (rolls.length+1));
      if(player==='ai'){ setTimeout(aiTakeTurn, 700); }
    }
  }, 650);
}

function advanceTurn(finishedPlayer){
  const bothDoneThisFrame = (finishedPlayer==='ai');
  if(finishedPlayer==='player'){
    Game.activePlayer='ai';
    resetPins(true);
    Game.busy = false;
    setStatus("AI's turn · Frame "+Game.frame);
    renderScoreboard(); updateModeBadge();
    setTimeout(aiTakeTurn, 900);
  } else {
    // ai finished -> next frame or game over
    if(Game.frame>=10){
      endGame();
      return;
    }
    Game.frame += 1;
    Game.activePlayer='player';
    resetPins(true);
    Game.busy = false;
    setStatus('Frame '+Game.frame+' · Your turn · Throw 1');
    renderScoreboard(); updateModeBadge();
  }
}

function resetPins(animated){
  pins = freshPins();
  ball = freshBall();
  dustParticles = [];
}

function endGame(){
  Game.over = true;
  renderScoreboard();
  const {total:pTotal} = scoreGame(Game.frames.player);
  const {total:aTotal} = scoreGame(Game.frames.ai);
  document.getElementById('finalPlayerScore').textContent = pTotal;
  document.getElementById('finalAiScore').textContent = aTotal;
  const winnerText = document.getElementById('winnerText');
  if(pTotal>aTotal) winnerText.textContent = 'YOU WIN! 🏆';
  else if(aTotal>pTotal) winnerText.textContent = 'AI WINS — TRY AGAIN';
  else winnerText.textContent = "IT'S A TIE!";
  document.getElementById('gameOverOverlay').classList.add('show');
  setStatus('Game over');
}

/* ---------------------------------------------------------------------
   AI OPPONENT
   --------------------------------------------------------------------- */
function aiTakeTurn(){
  if(Game.over || Game.paused) return;
  const diffCfg = {
    easy:  {err:0.85, power:[0.45,0.85]},
    medium:{err:0.45, power:[0.55,0.95]},
    hard:  {err:0.18, power:[0.65,1.0]},
  }[Game.difficulty];

  // aim roughly at the centroid of remaining standing pins
  const standing = pins.filter(p=>p.standing);
  let targetF = 0;
  if(standing.length){
    targetF = standing.reduce((s,p)=>s+p.baseF,0)/standing.length;
  }
  const errorAngle = (Math.random()-0.5)*2*diffCfg.err*30; // degrees
  const angle = clampNum(targetF*45 + errorAngle, -45, 45);
  const power = diffCfg.power[0] + Math.random()*(diffCfg.power[1]-diffCfg.power[0]);
  const curve = (Math.random()-0.5)*0.6*(1-diffCfg.err);

  startThrow('ai', angle, power, curve);
}
function clampNum(v,a,b){ return Math.max(a,Math.min(b,v)); }

/* ---------------------------------------------------------------------
   INPUT: sliders, power charge button (mouse + touch via Pointer Events)
   --------------------------------------------------------------------- */
const aimSlider = document.getElementById('aimSlider');
const curveSlider = document.getElementById('curveSlider');
const aimVal = document.getElementById('aimVal');
const curveVal = document.getElementById('curveVal');
aimSlider.addEventListener('input', ()=>{ aimVal.textContent = aimSlider.value+'\u00b0'; });
curveSlider.addEventListener('input', ()=>{ curveVal.textContent = curveSlider.value; });

const powerBtn = document.getElementById('powerBtn');
const powerFill = document.getElementById('powerFill');
let charging=false, chargeStart=0, chargeVal=0;
function isMobileLayout(){ return window.matchMedia('(max-width:520px)').matches; }
function setPowerFillUI(v){
  if(isMobileLayout()) powerFill.style.width = (v*100)+'%';
  else powerFill.style.height = (v*100)+'%';
}
function canThrow(){
  return !Game.busy && !ball.active && !Game.paused && !Game.over && Game.activePlayer==='player';
}
function chargeLoop(ts){
  if(!charging) return;
  const t = (performance.now()-chargeStart)/1000;
  chargeVal = (Math.sin(t*3.4 - Math.PI/2)+1)/2; // oscillate 0..1
  setPowerFillUI(chargeVal);
  requestAnimationFrame(chargeLoop);
}
function beginCharge(e){
  e.preventDefault();
  if(!canThrow()){ return; }
  Audio2.ensure();
  charging = true; chargeStart = performance.now();
  powerBtn.classList.add('charging');
  requestAnimationFrame(chargeLoop);
}
function releaseCharge(e){
  if(!charging) return;
  e && e.preventDefault();
  charging = false;
  powerBtn.classList.remove('charging');
  const power = Math.max(0.12, chargeVal);
  setPowerFillUI(0);
  const angle = parseFloat(aimSlider.value);
  const curve = parseFloat(curveSlider.value)/100;
  if(canThrow()) startThrow('player', angle, power, curve);
}
powerBtn.addEventListener('pointerdown', beginCharge);
window.addEventListener('pointerup', releaseCharge);
powerBtn.addEventListener('pointercancel', releaseCharge);
window.addEventListener('keydown', (e)=>{ if(e.code==='Space' && !charging){ beginCharge(e); } });
window.addEventListener('keyup', (e)=>{ if(e.code==='Space'){ releaseCharge(e); } });

/* Drag directly on canvas also nudges the aim slider (bonus mouse/touch aim) */
let dragging=false;
canvas.addEventListener('pointerdown', (e)=>{ if(!canThrow()) return; dragging=true; updateAimFromPointer(e); });
window.addEventListener('pointermove', (e)=>{ if(dragging) updateAimFromPointer(e); });
window.addEventListener('pointerup', ()=>{ dragging=false; });
function updateAimFromPointer(e){
  const rect = canvas.getBoundingClientRect();
  const relX = (e.clientX-rect.left)/rect.width; // 0..1
  const deg = clampNum((relX-0.5)*2*45, -45, 45);
  aimSlider.value = Math.round(deg);
  aimVal.textContent = aimSlider.value+'\u00b0';
}

/* ---------------------------------------------------------------------
   BUTTONS: New Game / Restart / Pause / Practice / Difficulty / Mute
   --------------------------------------------------------------------- */
function fullReset(){
  Game.frame=1; Game.activePlayer='player'; Game.over=false; Game.busy=false;
  Game.frames.player = Array.from({length:10},()=>({rolls:[]}));
  Game.frames.ai = Array.from({length:10},()=>({rolls:[]}));
  resetPins(false);
  document.getElementById('gameOverOverlay').classList.remove('show');
  renderScoreboard(); updateModeBadge();
  setStatus('Frame 1 · Your turn · Throw 1');
}
document.getElementById('btnNewGame').addEventListener('click', ()=>{ Audio2.ensure(); fullReset(); });
document.getElementById('btnRestart').addEventListener('click', ()=>{
  Audio2.ensure();
  if(confirm('Restart the current game? Scores will be reset.')) fullReset();
});
const pauseOverlay = document.getElementById('pauseOverlay');
document.getElementById('btnPause').addEventListener('click', ()=>{
  if(Game.over) return;
  Game.paused = true; pauseOverlay.classList.add('show'); Audio2.stopRoll();
});
document.getElementById('btnResume').addEventListener('click', ()=>{
  Game.paused = false; pauseOverlay.classList.remove('show'); lastTs = performance.now();
});
document.getElementById('btnPlayAgain').addEventListener('click', fullReset);

const practiceToggle = document.getElementById('practiceToggle');
practiceToggle.addEventListener('change', ()=>{
  Game.practice = practiceToggle.checked;
  Game.activePlayer = 'player';
  resetPins(true);
  Game.busy = false;
  updateModeBadge();
  setStatus(Game.practice ? 'Practice mode — bowl freely, no scoring' : 'Frame '+Game.frame+' · Your turn · Throw 1');
});
document.getElementById('difficultySelect').addEventListener('change', (e)=>{ Game.difficulty = e.target.value; });
document.getElementById('muteToggle').addEventListener('change', (e)=>{ Audio2.setMuted(e.target.checked); });

/* ---------------------------------------------------------------------
   MAIN LOOP
   --------------------------------------------------------------------- */
let lastTs = performance.now();
function loop(ts){
  const dt = Math.min((ts-lastTs)/1000, 0.05);
  lastTs = ts;
  if(!Game.paused){
    updateBall(dt);
    updatePins(dt);
    render();
  }
  requestAnimationFrame(loop);
}

/* ---------------------------------------------------------------------
   INIT
   --------------------------------------------------------------------- */
function init(){
  resizeCanvas();
  buildScoreboardDOM();
  pins.forEach(p=>pinScreen(p));
  renderScoreboard();
  updateModeBadge();
  render();
  requestAnimationFrame(loop);
}
init();
