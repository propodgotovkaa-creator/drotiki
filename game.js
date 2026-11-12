'use strict';
// One coordinate system for the SVG artwork, random landing points and scoring.
const SECTORS = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
const GEOMETRY = { bull:9.34, outerBull:23.38, tripleIn:145.59, tripleOut:157.35, doubleIn:238.24, doubleOut:250 };
function scoreAt(x,y) {
  const r = Math.hypot(x,y), g = GEOMETRY;
  if(r > g.doubleOut) return {points:0,label:'Промах · 0'};
  if(r <= g.bull) return {points:50,label:'+50'};
  if(r <= g.outerBull) return {points:25,label:'+25'};
  const angle = (Math.atan2(x,-y) * 180 / Math.PI + 360 + 9) % 360;
  const sector = SECTORS[Math.floor(angle/18)];
  const multiplier = r >= g.doubleIn ? 2 : r >= g.tripleIn && r <= g.tripleOut ? 3 : 1;
  return {points:sector*multiplier,sector,multiplier,label:multiplier===3?`${sector} × 3 = ${sector*3}`:multiplier===2?`${sector} × 2 = ${sector*2}`:`+${sector}`};
}
function randomHit(random=Math.random) {
  // Same odds for both players and every dart colour. Bull is rare but reachable.
  const kind=random(), angle=random()*Math.PI*2;
  let lo,hi;
  if(kind<.035){lo=0;hi=GEOMETRY.bull-1;}
  else if(kind<.105){lo=GEOMETRY.bull+1;hi=GEOMETRY.outerBull-1;}
  else if(kind<.155){lo=256;hi=268;}
  else {lo=GEOMETRY.outerBull+1;hi=249;}
  const r=Math.sqrt(lo*lo+random()*(hi*hi-lo*lo));
  return {x:Math.sin(angle)*r,y:-Math.cos(angle)*r};
}
class Match {
  constructor(){this.scores=[0,0];this.shots=[];this.phase='select';}
  get player(){return (this.shots.length+1)%2;}
  get round(){return Math.min(10,Math.floor(this.shots.length/2)+1);}
  begin(){if(this.phase!=='select'||this.shots.length>=20)return false;this.phase='flight';return true;}
  land(hit){if(this.phase!=='flight')return null;const result={...scoreAt(hit.x,hit.y),...hit,player:this.player,round:this.round};this.scores[result.player]+=result.points;this.shots.push(result);this.phase='result';return result;}
  next(){if(this.phase!=='result')return false;this.phase=this.shots.length===20?'finished':'select';return true;}
}
if(typeof module!=='undefined')module.exports={SECTORS,GEOMETRY,scoreAt,randomHit,Match};
if(typeof document!=='undefined')initGame();
function initGame(){
const $=id=>document.getElementById(id);
const colours=[['Красный','#db4940'],['Синий','#429ad7'],['Зелёный','#65b646'],['Фиолетовый','#af6ac9'],['Золотой','#f2bd4f'],['Бирюзовый','#39bcb2']];
let match=new Match(),selected=null,playing=false,locked=false,soundOn=true,audioContext=null,token=0;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
try{soundOn=localStorage.getItem('darts-sound')!=='off';}catch{}
function dartSVG(colour,id){
 const shade=(amount)=>{const n=parseInt(colour.slice(1),16);return '#'+[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,v+amount)).toString(16).padStart(2,'0')).join('');};
 return `<svg viewBox="0 0 80 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs><linearGradient id="metal-${id}"><stop stop-color="#343f48"/><stop offset=".2" stop-color="#8e9da8"/><stop offset=".38" stop-color="#fbffff"/><stop offset=".52" stop-color="#9aabb6"/><stop offset=".72" stop-color="#e3edf1"/><stop offset="1" stop-color="#3d4c57"/></linearGradient><linearGradient id="wing-${id}" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="${shade(70)}"/><stop offset=".35" stop-color="${colour}"/><stop offset="1" stop-color="${shade(-65)}"/></linearGradient><linearGradient id="fold-${id}"><stop stop-color="${shade(-70)}"/><stop offset=".5" stop-color="${colour}"/><stop offset="1" stop-color="${shade(80)}"/></linearGradient></defs><path d="M37 157h6l-3 43z" fill="url(#metal-${id})"/><path d="M40 160v34" stroke="#f4ffff" stroke-width=".7"/><rect x="32" y="107" width="16" height="53" rx="5" fill="url(#metal-${id})" stroke="#3b4d59" stroke-width=".8"/><path d="M33 115h14m-14 5h14m-14 5h14m-14 5h14m-14 5h14m-14 5h14m-14 5h14m-13 5h12" stroke="#293c48" stroke-width="1.7"/><path d="M34 116h12m-12 10h12m-12 10h12m-12 10h12" stroke="#f7ffff" stroke-width=".7"/><path d="M37 63h6v44h-6z" fill="url(#metal-${id})"/><path d="M36 88h8v6h-8z" fill="${colour}"/><path d="M39 84 9 51 7 19 30 9 40 20 50 9 73 19 71 51 41 84z" fill="url(#wing-${id})" stroke="${shade(65)}" stroke-width="1"/><path d="M40 12 49 28 45 65 40 86 35 65 31 28z" fill="url(#fold-${id})" stroke="${shade(70)}" stroke-width=".8"/><path d="m11 23 17-7 7 12M52 16l17 7M11 28l2 21 23 28M67 28l-2 21-21 28" fill="none" stroke="${shade(85)}" stroke-width="1.3" opacity=".6"/><path d="M39 18v62" stroke="#fff" stroke-opacity=".7" stroke-width="1"/><path d="m17 35 13 9m-12-3 13 9m-12-3 13 9m20-21 11-8m-11 14 10-8m-11 14 10-8" stroke="${shade(-60)}" stroke-opacity=".45" stroke-width="1.2"/></svg>`;
}
function polar(r,a){const rad=a*Math.PI/180;return [300+r*Math.sin(rad),300-r*Math.cos(rad)];}
function ringPath(inner,outer,start,end){const a=polar(outer,start),b=polar(outer,end),c=polar(inner,end),d=polar(inner,start);return `M${a} A${outer},${outer} 0 0 1 ${b} L${c} A${inner},${inner} 0 0 0 ${d} Z`;}
function drawBoard(){let svg=`<defs><radialGradient id="rim"><stop offset=".8" stop-color="#292e29"/><stop offset=".94" stop-color="#111b19"/><stop offset=".97" stop-color="#636b5d"/><stop offset=".985" stop-color="#b5b39a"/><stop offset="1" stop-color="#202c27"/></radialGradient><radialGradient id="light" cx="35%" cy="18%" r="90%"><stop stop-color="#fff5d5" stop-opacity=".2"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient><filter id="fibre"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".15"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter><clipPath id="face"><circle cx="300" cy="300" r="250"/></clipPath></defs><circle class="board-rim" cx="300" cy="300" r="289" fill="url(#rim)"/><circle cx="300" cy="300" r="278" fill="none" stroke="#7a8270" stroke-opacity=".35"/>`;
svg+='<g clip-path="url(#face)"><g filter="url(#fibre)">';
for(let i=0;i<20;i++){const start=i*18-9,end=i*18+9;svg+=`<path d="${ringPath(GEOMETRY.outerBull,250,start,end)}" fill="${i%2?'#e9d6aa':'#252a25'}"/>`;for(const [inner,outer]of [[GEOMETRY.tripleIn,GEOMETRY.tripleOut],[GEOMETRY.doubleIn,GEOMETRY.doubleOut]])svg+=`<path d="${ringPath(inner,outer,start,end)}" fill="${i%2?'#25835c':'#bf3b31'}"/>`;}
svg+=`<circle cx="300" cy="300" r="${GEOMETRY.outerBull}" fill="#27855b"/><circle cx="300" cy="300" r="${GEOMETRY.bull}" fill="#cc4132"/></g></g><g fill="none" stroke="#cabfa2" stroke-width="1.3">`;
for(const r of Object.values(GEOMETRY))svg+=`<circle cx="300" cy="300" r="${r}"/>`;
for(let i=0;i<20;i++){svg+=`<path d="M${polar(GEOMETRY.outerBull,i*18-9)}L${polar(250,i*18-9)}"/>`;}
svg+='</g><circle cx="300" cy="300" r="250" fill="url(#light)"/>';
for(let i=0;i<20;i++){const [x,y]=polar(267,i*18);svg+=`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#f5edda" font-size="25" font-family="Georgia,serif">${SECTORS[i]}</text>`;}
svg+='<circle cx="300" cy="300" r="286" fill="none" stroke="#e0d0a4" stroke-opacity=".3" stroke-width="2"/>';$('board').innerHTML=svg;}
drawBoard();
$('decor-left').innerHTML=dartSVG(colours[0][1],'decor0')+dartSVG(colours[1][1],'decor1');$('decor-right').innerHTML=dartSVG(colours[4][1],'decor4')+dartSVG(colours[5][1],'decor5');
$('rack').innerHTML=colours.map(([name,colour],i)=>`<button class="dart-choice" data-colour="${i}" aria-label="${name} дротик" aria-pressed="false">${dartSVG(colour,`pick${i}`)}<span>${name}</span></button>`).join('');
function sound(type){if(!soundOn)return;try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});const t=audioContext.currentTime;const tones=type==='win'?[523,659,784,1047]:type==='bull'?[659,880,1175]:[type==='select'?720:type==='flight'?420:140];tones.forEach((freq,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.connect(g);g.connect(audioContext.destination);o.type=type==='hit'?'triangle':'sine';o.frequency.setValueAtTime(freq,t+i*.11);o.frequency.exponentialRampToValueAtTime(type==='flight'?90:freq*.85,t+i*.11+.16);g.gain.setValueAtTime(.0001,t+i*.11);g.gain.exponentialRampToValueAtTime(.08,t+i*.11+.015);g.gain.exponentialRampToValueAtTime(.0001,t+i*.11+.23);o.start(t+i*.11);o.stop(t+i*.11+.25);});}catch{}}
function updateSound(){$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'Выключить звук':'Включить звук');$('sound-waves').setAttribute('d',soundOn?'M16 8q4 4 0 8m3-11q6 7 0 14':'m17 9 5 6m0-6-5 6');}updateSound();
$('sound').onclick=()=>{soundOn=!soundOn;updateSound();try{localStorage.setItem('darts-sound',soundOn?'on':'off');}catch{}if(soundOn)sound('select');};
const buttons=[...document.querySelectorAll('.dart-choice')];
buttons.forEach((button,i)=>button.onclick=()=>{if(!playing||locked||match.phase!=='select')return;selected=i;buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));throwDart();});
function switchScene(mode){$('app').className='app '+mode;const menu=mode==='menu',game=mode==='game';$('intro').hidden=!menu;$('play-scene').hidden=mode==='result';$('menu-actions').hidden=!menu;$('decor-left').hidden=!menu;$('decor-right').hidden=!menu;for(const id of ['scoreboard','turn','controls'])$(id).hidden=!game;$('result').hidden=mode!=='result';$('home').hidden=menu;}
function cleanEffects(){document.querySelectorAll('.points,.confetti').forEach(e=>e.remove());$('dart-layer').replaceChildren();$('board-wrap').classList.remove('shake','bull-glow');}
function showTurn(){selected=null;locked=false;cleanEffects();buttons.forEach(b=>{b.disabled=false;b.setAttribute('aria-pressed','false');});$('next-turn').disabled=true;$('next-turn').hidden=true;$('turn').textContent=match.player===0?'Ход педагога':'Ход ребёнка';$('round').textContent=`РАУНД ${match.round} / 10`;$('round-dots').innerHTML=Array.from({length:10},(_,i)=>`<i class="${i<match.round-1?'done':i===match.round-1?'current':''}"></i>`).join('');for(let i=0;i<2;i++){$(`row-${i}`).classList.toggle('active',match.player===i);$(`score-${i}`).textContent=match.scores[i];}$('status').textContent='';}
function start(){token++;match=new Match();playing=true;switchScene('game');showTurn();sound('select');buttons[0].focus({preventScroll:true});}
function menu(){token++;playing=false;locked=false;cleanEffects();match=new Match();switchScene('menu');$('start').focus({preventScroll:true});}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function animate(element,frames,options){if(!element.animate)return;try{await element.animate(frames,{...options,duration:reduced?1:options.duration}).finished;}catch{}}
function celebrate(){if(reduced)return;const box=document.createElement('div');box.className='confetti';box.setAttribute('aria-hidden','true');for(let i=0;i<55;i++){const p=document.createElement('i');p.style.cssText=`left:${Math.random()*100}%;background:${colours[i%6][1]};--dx:${Math.random()*220-110}px;animation-delay:${Math.random()*.7}s;animation-duration:${2+Math.random()*2}s`;box.append(p);}document.body.append(box);setTimeout(()=>box.remove(),5000);}
async function throwDart(){
 if(!playing||locked||selected===null||!match.begin())return;
 locked=true;const currentToken=token,player=match.player,colour=selected;buttons.forEach(b=>b.disabled=true);$('next-turn').disabled=true;$('next-turn').hidden=true;$('status').textContent='';
 const hit=randomHit(),wrap=$('board-wrap'),layer=$('dart-layer'),dart=document.createElement('div');dart.className='flying-dart';dart.dataset.hitX=hit.x;dart.dataset.hitY=hit.y;dart.innerHTML=dartSVG(colours[colour][1],`flying${token}-${match.shots.length}`);dart.style.left=`${(300+hit.x)/6}%`;dart.style.top=`${(300+hit.y)/6}%`;dart.style.transform='translate(-50%,-100%) rotate(24deg) scale(.55)';layer.append(dart);
 const rect=wrap.getBoundingClientRect(),from=buttons[colour].querySelector('svg').getBoundingClientRect(),dx=(from.left+from.width/2)-(rect.left+(300+hit.x)/600*rect.width),dy=from.bottom-(rect.top+(300+hit.y)/600*rect.height);
 sound('flight');await animate(dart,[{transform:`translate(calc(-50% + ${dx}px),calc(-100% + ${dy}px)) rotate(0deg) scale(.875)`},{transform:`translate(calc(-50% + ${dx*.45}px),calc(-100% + ${dy*.4-90}px)) rotate(8deg) scale(.95)`,offset:.5},{transform:'translate(-50%,-100%) rotate(24deg) scale(.55)'}],{duration:850,easing:'cubic-bezier(.3,.1,.6,1)',fill:'none'});
 if(currentToken!==token)return;const result=match.land(hit);dart.classList.add('embedded');wrap.classList.add('shake');const ring=document.createElement('div');ring.className='hit-ring';ring.style.left=dart.style.left;ring.style.top=dart.style.top;layer.append(ring);setTimeout(()=>ring.remove(),800);
 sound(result.points===50?'bull':'hit');if(result.points===50){wrap.classList.add('bull-glow');celebrate();}$('status').textContent=result.label;
 const point=document.createElement('div');point.className='points';point.textContent=`+${result.points}`;const nowRect=wrap.getBoundingClientRect();const px=nowRect.left+(300+hit.x)/600*nowRect.width,py=nowRect.top+(300+hit.y)/600*nowRect.height;point.style.left=px+'px';point.style.top=py+'px';document.body.append(point);
 await animate(point,[{opacity:0,scale:.6},{opacity:1,scale:1.15},{opacity:1,scale:1}],{duration:350,fill:'none'});await delay(reduced?100:450);if(currentToken!==token){point.remove();return;}
 const dest=$(`score-${player}`).getBoundingClientRect();await animate(point,[{transform:'translate(-50%,-50%)',opacity:1},{transform:`translate(calc(-50% + ${dest.left+dest.width/2-px}px),calc(-50% + ${dest.top+dest.height/2-py}px)) scale(.45)`,opacity:.2}],{duration:650,easing:'ease-in-out',fill:'none'});point.remove();if(currentToken!==token)return;
 const counter=$(`score-${player}`),total=match.scores[player],before=total-result.points;const startTime=performance.now();await new Promise(resolve=>{function tick(time){if(currentToken!==token){resolve();return;}const progress=Math.min(1,(time-startTime)/(reduced?1:450));counter.textContent=Math.round(before+(total-before)*progress);if(progress<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});if(currentToken!==token)return;
 $('next-turn').textContent=match.shots.length===20?'Итоги':'Передать ход';$('next-turn').hidden=false;$('next-turn').disabled=false;locked=false;
}
function finish(){playing=false;switchScene('result');cleanEffects();for(let i=0;i<2;i++)$(`final-${i}`).textContent=match.scores[i];$('winner').textContent=match.scores[0]===match.scores[1]?'НИЧЬЯ!':match.scores[0]>match.scores[1]?'ПОБЕДИЛ ПЕДАГОГ!':'ПОБЕДИЛ РЕБЁНОК!';$('history').innerHTML=Array.from({length:10},(_,i)=>`<tr><td>${i+1}</td><td>${match.shots[i*2].points}</td><td>${match.shots[i*2+1].points}</td></tr>`).join('');document.querySelector('.history').open=false;celebrate();sound('win');$('replay').focus({preventScroll:true});}
$('next-turn').onclick=()=>{if(locked)return;if(match.phase==='result'){match.next();if(match.phase==='finished')finish();else{showTurn();buttons[0].focus({preventScroll:true});}}};
$('rules-open').onclick=()=>$('rules-dialog').showModal();$('rules-start').onclick=()=>{$('rules-dialog').close();start();};
$('start').onclick=start;$('replay').onclick=start;$('result-home').onclick=menu;
$('home').onclick=()=>{if(playing)$('exit-dialog').showModal();else menu();};$('stay').onclick=()=>$('exit-dialog').close();$('exit').onclick=()=>{$('exit-dialog').close();menu();};
for(const dialog of document.querySelectorAll('dialog')){dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});}
}
