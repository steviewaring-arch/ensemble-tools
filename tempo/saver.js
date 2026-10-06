function createSaver(eng,C){
'use strict';
const TAU=Math.PI*2,FADE=650;
const CORNERS=[['left','top'],['right','top'],['right','bottom'],['left','bottom']];
let S=null,phase=0,last=0,sw=-1,swapped=false,pending=null,cur='',prev='',tStart=-1e9,minuteKey='',cseed=1,pal=null,periods=[],changed=new Set(),slot=0;
function rnd(n){let x=Math.imul((n|0)^0x9e3779b9,0x85ebca6b);x^=x>>>13;x=Math.imul(x,0xc2b2ae35);x^=x>>>16;return (x>>>0)/4294967296;}
const pad=n=>String(n).padStart(2,'0');
const localSec=()=>{const d=new Date();return Date.now()/1000-d.getTimezoneOffset()*60;};
const minutesNow=()=>Math.floor(localSec()/60);
/* time string plus how often each character changes (in seconds), so alternates survive a page reload */
function timeParts(d){const c=C.clock;let h=d.getHours(),suf='';if(!c.h24){suf=h<12?'am':'pm';h=h%12||12;}
  const hs=c.zero?pad(h):String(h),per=[];let s='';
  const add=(str,p)=>{for(const ch of str){s+=ch;per.push(p.shift?p.shift():0);}};
  add(hs,hs.length===2?[36000,3600]:[3600]);add(c.sep,[0]);add(pad(d.getMinutes()),[600,60]);
  if(c.secs){add(c.sep,[0]);add(pad(d.getSeconds()),[10,1]);}
  if(!c.h24&&c.ampm)add(suf,[0,0]);
  return{s,per};}
function line2(d){const c=C.clock;let s=c.line2==='weekday'?d.toLocaleDateString('en-GB',{weekday:'long'}):c.line2==='date'?d.getDate()+' '+d.toLocaleDateString('en-GB',{month:'long'}):c.line2==='text'?(c.text||''):'';return c.caps?s.toUpperCase():s;}
function palette(){if(C.colours.cycle&&C.palettes&&C.palettes.length)return C.palettes[new Date().getHours()%C.palettes.length];return{bg:C.colours.bg,p:C.colours.p};}
const isClock=()=>C.show==='clock';
function hooksOn(){
  eng.setHooks({
    pick:(g,o)=>{if(!isClock()||C.clock.alt==='off')return null;if(!/\d/.test(g.ch))return o.def;if(C.clock.alt!=='each'||!o.sel||o.sel.length<2||g.line!==0)return null;
      const p=periods[g.pos];if(!p)return null;let c=Math.floor(localSec()/p);if(g.tag==='from'&&changed.has(g.pos))c--;return o.sel[((c%o.sel.length)+o.sel.length)%o.sel.length];},
    colour:g=>{const P=pal.p,by=C.colours.by;
      if(by==='single')return P[0];
      if(by==='type')return /\d/.test(g.ch)?P[0]:/\p{L}/u.test(g.ch)?P[2]:P[1];
      if(by==='letter')return P[((g.vi+(isClock()?minutesNow():0))%P.length+P.length)%P.length];
      if(by==='random')return P[Math.floor(rnd(g.vi*977+g.line*131+cseed*7919)*P.length)];
      return P[(g.line+g.text)%P.length];},
    alpha:g=>{if(isClock()&&C.clock.pulse&&g.line===0&&g.ch===C.clock.sep){const f=(Date.now()%1000)/1000;return .3+.7*(.5+.5*Math.cos(TAU*f));}return 1;}
  });
}
const slotNow=()=>Math.floor(Date.now()/(Math.max(.5,C.every)*60000));
function lookIndex(sl){const n=C.looks.length,o=C.looks.map((_,i)=>i);
  if(C.shuffle){const cyc=Math.floor(sl/n);for(let i=n-1;i>0;i--){const j=Math.floor(rnd(cyc*131+i)*(i+1));[o[i],o[j]]=[o[j],o[i]];}}
  return o[((sl%n)+n)%n];}
function build(){
  if(isClock()){
    const c=C.clock;S=JSON.parse(JSON.stringify(C.base||{}));
    Object.assign(S,{seq:false,rOn:false,tightMask:true,stretch:false,qClear:c.change!=='roll',fit:'cap',size:c.size,align:c.align,valign:c.valign,margin:c.margin,tabular:c.tabular,transparent:false,
      tracking:c.tracking!=null?c.tracking:S.tracking,leading:c.leading!=null?c.leading:S.leading,
      qStyle:c.change,qEase:c.feel,qStagger:.3,qDir:'up',qAxis:'vertical',texts:[cur||' ']});
    if(c.move){const k=minutesNow()%4;S.align=CORNERS[k][0];S.valign=CORNERS[k][1];}
    if(!c.ambient){S.mode='none';S.vMode='off';S.axOn=false;S.dur=60;}
    if(c.alt==='cycle'){S.vMode='alts';S.vPattern='cycle';S.vOffset=true;S.vStyle='roll';S.vDur=.45;S.vStagger=.2;S.vSteps=Math.max(1,Math.round(c.altRate*(S.dur||60)/60));}
    else if(c.alt==='each')S.vMode='off';
    eng.use(S);hooksOn();
  }else{
    slot=slotNow();const base=C.looks[lookIndex(slot)]||C.looks[0];S=JSON.parse(JSON.stringify(base));S.transparent=false;
    if(C.reseed)S.seed=((base.seed+slot*7919)%99999)+1;
    eng.use(S);eng.setLive(null);if(C.lookColours==='saver')hooksOn();else eng.setHooks(null);phase=0;
  }
}
function setConfig(c){C=c;build();}
function frame(ctx,W,H,now,dt){
  pal=palette();
  if(isClock()){
    const d=new Date(),tp=timeParts(d),l2=line2(d),str=tp.s+(l2?'\n'+l2:'');
    if(str!==cur){
      if(cur){prev=cur;tStart=now;const a=cur.split('\n')[0],b=tp.s;changed=new Set();if(a.length===b.length){for(let i=0;i<b.length;i++)if(a[i]!==b[i])changed.add(i);}else for(let i=0;i<b.length;i++)changed.add(i);}
      cur=str;periods=tp.per;cseed++;
      const mk=d.getHours()+':'+d.getMinutes();if(mk!==minuteKey){if(minuteKey&&C.clock.move&&sw<0){sw=0;pending='move';}minuteKey=mk;}}
    S.texts[0]=cur;S.bg=pal.bg;S.ink=pal.p[0];
    const t=(now-tStart)/(Math.max(.05,C.clock.len)*1000);
    eng.setLive(t<1&&C.clock.change!=='none'?{from:prev,to:cur,t}:null);
  }else{
    if((C.looks.length>1||C.reseed)&&sw<0&&slotNow()!==slot){sw=0;pending='look';}
    if(C.lookColours==='saver'){S.bg=pal.bg;S.ink=pal.p[0];}
  }
  phase=(phase+dt/1000/(Math.max(.1,S.dur||3)/(C.speed||1)))%1;
  let veil=0;
  if(sw>=0){sw+=dt;if(sw>=FADE&&!swapped){swapped=true;build();}
    veil=sw<FADE?sw/FADE:Math.max(0,1-(sw-FADE)/FADE);if(sw>=2*FADE){sw=-1;swapped=false;pending=null;}}
  const T=Date.now()/1000,a=C.drift||0;let pre=null;
  if(a>0){const sc=1-a*.04+a*.04*Math.sin(T/41);pre=new DOMMatrix().translateSelf(W/2+a*.05*W*Math.sin(T/23.7),H/2+a*.05*H*Math.sin(T/31.3+1)).scaleSelf(sc,sc).translateSelf(-W/2,-H/2);}
  try{eng.renderFrame(ctx,W,H,phase,ctx.canvas.width/W,true,pre);}catch(e){}
  if(veil>0){ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=veil;ctx.fillStyle=S.bg;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.globalAlpha=1;}
}
setConfig(C);
return{frame,setConfig,bg:()=>S&&S.bg};
}