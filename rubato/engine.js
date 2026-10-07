function createEngine(){
'use strict';
/* Rubato's type engine. Forked from shared/engine.js at Rubato 1.0 so Rubato can
   grow (blocks, physics, kerning, new tricks) without touching Tempo's exports.
   With 1.0's new settings at their defaults it draws exactly what 0.9 drew. */
let S={},img=null,hooks=null,live=null,curBase=null,still=false,curW=1080,curH=1080;
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;
const E={
  cubicOut:t=>1-Math.pow(1-t,3), cubicIn:t=>t*t*t,
  expoOut:t=>t>=1?1:1-Math.pow(2,-10*t), expoIn:t=>t<=0?0:Math.pow(2,10*t-10),
  expoInOut:t=>t<=0?0:t>=1?1:t<.5?Math.pow(2,20*t-10)/2:(2-Math.pow(2,-20*t+10))/2,
  inOut:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
  backOut:(t,s=1.70158)=>{const u=t-1;return 1+(s+1)*u*u*u+s*u*u},
  backIn:(t,s=1.70158)=>(s+1)*t*t*t-s*t*t,
};
const easeOut=(n,t)=>n==='expo'?E.expoOut(t):n==='back'?E.backOut(t):n==='linear'?t:E.cubicOut(t);
const easeIn=(n,t)=>n==='expo'?E.expoIn(t):n==='back'?E.backIn(t):n==='linear'?t:E.cubicIn(t);
/* feels shared by Physics and Assemble: how a thing arrives, and how it leaves */
const magnet=t=>t<=0?0:t>=1?1:t<.82?Math.pow(t/.82,3):1+.07*Math.sin(Math.PI*(t-.82)/.18)*(1-(t-.82)/.18);
const elasticOut=t=>t<=0?0:t>=1?1:Math.pow(2,-10*t)*Math.sin((t*10-.75)*(2*Math.PI/3))+1;
const arrive=(f,t)=>f==='smooth'?E.inOut(t):f==='elastic'?elasticOut(t):magnet(t);
const leave=(f,t)=>f==='smooth'?E.inOut(t):f==='elastic'?E.backIn(t,1.4):E.cubicIn(t);
const qEase=t=>S.qEase==='smooth'?E.inOut(t):S.qEase==='elastic'?E.backOut(t,1.5):E.expoInOut(t);

function hash(a,b,c,d){let x=Math.imul((S.seed|0)+0x632be5ab,0x9E3779B1);for(const v of [a,b,c,d]){x^=((v|0)+0x7f4a7c15+(x<<6)+(x>>>2));x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);x^=x>>>16;}return (x>>>0)/4294967296;}
let faces=new Map(),order=[],swapSet=new Set();
const FAMILY='"Inter Tight","Helvetica Neue",Arial,sans-serif';
const mctx=document.createElement('canvas').getContext('2d');
function makeFallback(slot){
  const weight=slot===1?400:800,adv=new Map(),font=`${weight} 1000px ${FAMILY}`;
  return{fallback:true,name:slot===1?'Demo regular':'Demo heavy',upm:1000,asc:930,desc:-240,cap:727,weight,axes:[],
    base:ch=>ch,alts:()=>[],glyphName:()=>'',
    adv:ch=>{let v=adv.get(ch);if(v==null){mctx.font=font;v=mctx.measureText(ch).width;adv.set(ch,v);}return v;},
    kern:()=>0,reset:()=>adv.clear(),
    bbox:ch=>{mctx.font=font;const m=mctx.measureText(ch);return[m.actualBoundingBoxAscent||0,m.actualBoundingBoxDescent||0];},
    draw:(ctx,ch,outline)=>{ctx.font=font;ctx.textBaseline='alphabetic';ctx.textAlign='left';outline?ctx.strokeText(ch,0,0):ctx.fillText(ch,0,0);}};
}
const fallbacks={d1:makeFallback(1),d2:makeFallback(2)};
function setFaces(list){inkCache.clear();scCache.clear();faces=new Map();order=[];swapSet=new Set();for(const it of list||[]){if(!it||!it.face)continue;faces.set(it.id,it.face);order.push(it.id);if(it.swap!==false)swapSet.add(it.id);}optCache.clear();}
const faceList=()=>order.map(id=>({id,face:faces.get(id),swap:swapSet.has(id)}));
const anyLoaded=()=>order.length>0;
const F=id=>faces.get(id)||fallbacks[id]||(order.length?faces.get(order[0]):fallbacks.d1);
function baseSlot(){if(!order.length)return 'd1';if(curBase&&faces.has(curBase))return curBase;return faces.has(S.baseSlot)?S.baseSlot:order[0];}
function withBase(id,fn){const prev=curBase;curBase=id||null;try{return fn();}finally{curBase=prev;}}
function availSlots(){if(!order.length)return['d1','d2'];const b=baseSlot();return order.filter(id=>id===b||swapSet.has(id));}
function makeBaked(d){
  const p2=new Map(),g=id=>d.glyphs[id]||{};
  const o={ot:true,baked:true,name:d.name,family:d.family||d.name,upm:d.upm,asc:d.asc,desc:d.desc,cap:d.cap,weightClass:d.wc||400,altChars:[],axes:[],
    base:ch=>d.cmap[ch]||0,alts:ch=>{const b=d.cmap[ch];return b?(d.alts[b]||[]):[]},glyphName:id=>g(id).n||'',
    adv:id=>g(id).a||0,kern:(x,y)=>d.kern[x+','+y]||0,pathD:id=>g(id).d||'',bbox:id=>g(id).b||null,
    draw:(ctx,id,outline)=>{let p=p2.get(id);if(!p){p=new Path2D(o.pathD(id));p2.set(id,p);}outline?ctx.stroke(p):ctx.fill(p);}};
  return o;
}
const GCO={normal:'source-over',multiply:'multiply',screen:'screen',overlay:'overlay',difference:'difference'};
function drawImg(ctx,W,H,k,p){
  const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;if(!iw||!ih)return;
  const s=Math.max(W/iw,H/ih)*S.iScale;
  ctx.setTransform(k,0,0,k,0,0);ctx.translate(W/2,H/2+S.iRise/100*H*Math.sin(TAU*p));ctx.rotate(S.iSway*Math.PI/180*Math.sin(TAU*p+Math.PI/2));ctx.scale(s,s);
  ctx.drawImage(img,-iw/2,-ih/2);
}
/* ---------------- glyph options ---------------- */
const optCache=new Map();
const vkey=v=>v.s+':'+v.r;
function charOptions(ch){
  const bs=baseSlot(),key=S.vMode+'|'+bs+'|'+ch;let o=optCache.get(key);if(o)return o;
  const f=F(bs),def={s:bs,r:f.base(ch)},full=[def];
  const useW=S.vMode==='weights'||S.vMode==='both',useAlt=S.vMode!=='weights';
  const slots=useW?availSlots():[bs];
  for(const s of slots){const fs=F(s);const cand=[fs.base(ch)].concat(useAlt?fs.alts(ch):[]);for(const r of cand){if(!full.some(v=>v.s===s&&v.r===r))full.push({s,r});}}
  let sel=full;const pk=S.picks&&S.picks[ch];
  if(pk&&pk.length){const s2=pk.map(k=>full.find(v=>vkey(v)===k)).filter(Boolean);if(s2.length)sel=s2;}
  const anim=S.vMode!=='off';
  o={def:sel[0],opts:anim?sel.slice(1):[],seq:anim?sel:[sel[0]],full,sel};optCache.set(key,o);return o;
}
const advU=v=>{const f=F(v.s);return f.adv(v.r)/f.upm;};
/* how far real glyphs reach above and below the baseline (in ems), across every glyph a character can become */
const inkCache=new Map();
function inkBounds(text){
  const chars=[...new Set(Array.from('0123456789'+String(text).replace(/\s/g,'')))].sort().join(''),key=baseSlot()+'|'+S.vMode+'|'+chars;
  let r=inkCache.get(key);if(r)return r;let top=0,bot=0;
  for(const ch of chars)for(const v of charOptions(ch).full){const f=F(v.s);if(!f.bbox)continue;const b=f.bbox(v.r);if(!b)continue;top=Math.max(top,b[0]/f.upm);bot=Math.max(bot,b[1]/f.upm);}
  r={top,bot};inkCache.set(key,r);return r;
}
function axisInfo(){if(!S.axOn)return null;const id=baseSlot(),f=F(id);if(!f.axes||!f.axes.length||!f.advAt)return null;const a=f.axes.find(x=>x.tag===S.axTag)||f.axes[0];return{a,f,id};}
function axisVal(AX,p,ord){const ph=Math.max(1,Math.round(S.axCycles))*p-S.axStagger*ord;let t=.5-.5*Math.cos(TAU*ph);if(S.axFeel==='snappy')t=E.expoInOut(t);
  const fr=lerp(S.axFrom,S.axTo,t);return AX.a.min+(AX.a.max-AX.a.min)*fr;}
const advAx=(v,AX,val)=>{if(!AX||val==null||v.s!==AX.id)return advU(v);const f=F(v.s);return f.advAt(v.r,{[AX.a.tag]:val})/f.upm;};
const kernU=(a,b)=>{if(a.s!==b.s)return 0;const f=F(a.s);return f.kern(a.r,b.r)/f.upm;};
const same=(a,b)=>a.s===b.s&&a.r===b.r;
let rankCache={key:'',arr:[]};
function orderVal(j,n){
  if(n<=1)return 0;const t=j/(n-1);
  switch(S.order){
    case 'rtl':return 1-t;
    case 'centre':return Math.abs(t-.5)*2;
    case 'edges':return 1-Math.abs(t-.5)*2;
    case 'random':{const key=n+'|'+S.seed;if(rankCache.key!==key){const idx=[...Array(n).keys()].sort((a,b)=>hash(9,a)-hash(9,b));const arr=new Array(n);idx.forEach((j2,r)=>arr[j2]=r/(n-1));rankCache={key,arr};}return rankCache.arr[j];}
    default:return t;
  }
}
function swapState(g,ord,p){
  const o=g.opt;
  if(hooks&&hooks.pick&&g.vis){const v=hooks.pick(g,o);if(v)return{a:v,b:v,t:1};}
  if(still||!g.vis)return{a:o.def,b:o.def,t:1};
  if(S.vMode==='scramble')return scrambleState(g,ord,p);
  if(S.vMode==='off'||!o.opts.length)return{a:o.def,b:o.def,t:1};
  const cyc=S.vPattern==='cycle';
  let M=Math.max(1,Math.round(S.vSteps));if(!cyc&&S.vRest&&M%2)M++;
  const pos=p*M,k=Math.floor(pos),u=pos-k;
  const pick=kk=>{kk=((kk%M)+M)%M;
    if(cyc){const L=o.seq.length,i=kk+(S.vOffset?g.occ:0);return o.seq[((i%L)+L)%L];}
    if(S.vRest&&kk%2===1)return o.def;if(hash(101,kk,g.uid)>=S.vChance)return o.def;return o.opts[Math.floor(hash(102,kk,g.uid)*o.opts.length)];};
  const dur=Math.max(.02,S.vDur);const t=clamp((u-S.vStagger*ord*(1-dur))/dur);
  return{a:pick(k-1),b:pick(k),t};
}
/* Scramble: letters cycle through random characters, decode into the text, hold, then scramble again */
const SC_SETS={numbers:'0123456789',symbols:'#%&*+=/<>?!@$'};
const scCache=new Map();
function scChars(ch){
  const bs=baseSlot(),low=ch.toLowerCase()!==ch.toUpperCase()&&ch===ch.toLowerCase();
  const key=bs+'|'+S.scSet+'|'+low;let a=scCache.get(key);if(a)return a;
  const letters=low?'abcdefghijklmnopqrstuvwxyz':'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const src=S.scSet==='letters'?letters:S.scSet==='numbers'?SC_SETS.numbers:S.scSet==='symbols'?SC_SETS.symbols:letters+SC_SETS.numbers+SC_SETS.symbols;
  const f=F(bs);a=Array.from(src).filter(c=>!f.ot||f.base(c)>0).map(c=>({s:bs,r:f.base(c)}));
  if(!a.length)a=[{s:bs,r:f.base(ch)}];scCache.set(key,a);return a;
}
function scrambleState(g,ord,p){
  const o=g.opt;let a=S.scIn,h=S.scHold,ou=S.scOut;const sum=a+h+ou;if(sum>1){a/=sum;h/=sum;ou/=sum;}
  const st=clamp(S.scStagger),res=a*(1-st+st*ord),dis=a+h+ou*st*ord;
  if(p>=res&&p<dis)return{a:o.def,b:o.def,t:1};
  const N=Math.max(1,Math.round(S.scRate)),k=Math.floor(p*N)%N,set=scChars(g.ch);
  const v=set[Math.floor(hash(401,k,g.uid)*set.length)];return{a:v,b:v,t:1};
}
const swapEase=t=>S.vStyle==='cut'?(t<.5?0:1):S.vStyle==='roll'?E.expoOut(t):E.inOut(t);
function motionState(g,ord,size,p){
  const st={dx:0,dy:0,rot:0,sx:1,sy:1,alpha:1};
  if(still)return st;
  if(S.mode==='fluid'){
    const ph=Math.max(1,Math.round(S.fCycles))*p-S.fStagger*ord;let w=Math.sin(TAU*ph),c=Math.cos(TAU*ph);
    if(S.fSharp>0){const e=1/(1+S.fSharp*4);w=Math.sign(w)*Math.pow(Math.abs(w),e);c=Math.sign(c)*Math.pow(Math.abs(c),e);}
    st.dy=-S.fY/100*size*w;st.dx=S.fX/100*size*c;st.rot=S.fRot*c;
    const sc=1+S.fScale/100*w;st.sx=sc;st.sy=sc*(1+S.fStretch/100*w);
  }else if(S.mode==='snappy'){
    let N=Math.max(1,Math.round(S.sSteps));if(S.sRest&&N%2)N++;
    const pos=p*N,k=Math.floor(pos),u=pos-k;
    const vec=kk=>{kk=((kk%N)+N)%N;if(S.sRest&&kk%2===1)return[0,0,0,0,0];const r=j=>lerp(hash(201,kk,g.uid,j),hash(202,kk,0,j),S.sUnison)*2-1;return[r(1),r(2),r(3),r(4),r(5)];};
    const A=vec(k-1),B=vec(k),dur=Math.max(.02,S.sSnap);
    const t=clamp((u-S.sStagger*ord*(1-dur))/dur),e=E.backOut(t,S.sOver),v=i=>lerp(A[i],B[i],e);
    st.dy=-S.sY/100*size*v(0);st.dx=S.sX/100*size*v(1);st.rot=S.sRot*v(2);
    const sc=1+S.sScale/100*v(3);st.sx=sc;st.sy=sc*(1+S.sStretch/100*v(4));
  }else if(S.mode==='transit'){
    let a=S.tIn,h=S.tHold,o=S.tOut;const sum=a+h+o;if(sum>.98){const q=.98/sum;a*=q;h*=q;o*=q;}
    const stg=S.tStagger;
    const tin=clamp((p-a*stg*ord)/Math.max(.001,a*(1-stg)));
    const tout=clamp((p-(a+h+o*stg*ord))/Math.max(.001,o*(1-stg)));
    const D2=S.tDist/100*size,dir={up:[0,1],down:[0,-1],left:[1,0],right:[-1,0]}[S.tDir]||[0,1];
    let k,sign=1;
    if(tout>0){k=easeIn(S.tEase,tout);sign=S.tExit==='continue'?-1:1;}else k=1-easeOut(S.tEase,tin);
    st.dx=dir[0]*D2*k*sign;st.dy=dir[1]*D2*k*sign;st.rot=S.tRot*k*sign;
    const sc=1+S.tScale/100*clamp(k,0,1.2);if(S.tAxis!=='horizontal')st.sy=sc;if(S.tAxis!=='vertical')st.sx=sc;
    if(S.tFade)st.alpha=clamp(1-k);
  }else if(S.mode==='jitter'){
    /* nervous type: every letter twitches to a new pose a set number of times per loop */
    const N=Math.max(1,Math.round(S.jRate)),pos=p*N,k=Math.floor(pos),u=pos-k;
    const v=(kk,j)=>hash(301+j,((kk%N)+N)%N,g.uid)*2-1;
    const val=j=>S.jFeel==='smooth'?lerp(v(k,j),v(k+1,j),E.inOut(u)):v(k,j);
    const A=S.jAmt/100*size;st.dx=val(0)*A;st.dy=val(1)*A;st.rot=val(2)*S.jRot;
    const kk=((k%N)+N)%N;if(S.jGlitch>0&&hash(305,kk,g.line,g.text)<S.jGlitch)st.dx+=(hash(306,kk,g.line,g.text)*2-1)*size*.35;
  }else if(S.mode==='assemble'){
    /* letters start scattered across the frame, fly in and lock into place, hold, then scatter again */
    /* Scatter leaves for new spots, then drifts back to where it came in during the rest of the loop, so the loop stays seamless */
    const scat=S.aExit==='scatter',cap=scat?.9:.98;
    let a=S.aIn,h=S.aHold,o=S.aOut;const sum=a+h+o;if(sum>cap){const q=cap/sum;a*=q;h*=q;o*=q;}
    const stg=clamp(S.aStagger,0,.95),end=a+h+o;
    const tin=clamp((p-a*stg*ord)/Math.max(.001,a*(1-stg))),tout=clamp((p-(a+h+o*stg*ord))/Math.max(.001,o*(1-stg)));
    const R=S.aDist/100*Math.max(curW,curH);
    const vec=s=>{const ang=hash(321+s,g.uid,g.text)*TAU,dist=R*(.35+.65*hash(322+s,g.uid,g.text));return[Math.cos(ang)*dist,Math.sin(ang)*dist,(hash(323+s,g.uid,g.text)*2-1)*S.aSpin];};
    let k,v;
    if(tout>0){k=leave(S.aFeel,tout);v=vec(scat?10:0);
      if(scat&&p>end){const u=E.inOut(clamp((p-end)/Math.max(.001,1-end))),A=v,B=vec(0);v=[lerp(A[0],B[0],u),lerp(A[1],B[1],u),lerp(A[2],B[2],u)];}}
    else{k=1-arrive(S.aFeel,tin);v=vec(0);}
    st.dx=v[0]*k;st.dy=v[1]*k;st.rot=v[2]*k;
    if(S.aFade)st.alpha=clamp(1-k);
  }
  if(st.sx<0)st.sx=0;if(st.sy<0)st.sy=0;return st;
}
function seqFx(role,tg){
  const r={dy:0,sx:1,sy:1,a:1,clip:false},clear=S.qClear!==false,out=role==='out';
  if(S.qStyle==='cut'){r.a=clear?(out?(tg<1?1:0):(tg>0?1:0)):(out?(tg<.5?1:0):(tg<.5?0:1));return r;}
  if(out&&tg>=1||!out&&tg<=0){r.a=0;return r;}
  if(S.qStyle==='roll'){const e2=qEase(tg),dir=S.qDir==='down'?-1:1;r.dy=out?-e2*dir:(1-e2)*dir;r.clip=true;}
  else if(S.qStyle==='stretch'){const s=out?1-E.cubicIn(tg):S.qEase==='smooth'?E.inOut(tg):S.qEase==='elastic'?E.backOut(tg,2.4):E.expoOut(tg);
    if(S.qAxis==='horizontal')r.sx=s;else r.sy=s;}
  else{const e2=E.inOut(tg);r.a=out?1-e2:e2;}
  return r;
}

/* ---------------- layout ---------------- */
let lastSize=30;
function stackBaselines(n,size,sy,capR){const b=[capR*size*sy[0]];for(let l=1;l<n;l++)b.push(b[l-1]+(S.leading-capR)*size*(sy[l-1]+sy[l])/2+capR*size*sy[l]);return b;}
function layoutBlock(text,salt,W,H,p,cfg){
  const bs=baseSlot(),fb=F(bs),capR=fb.cap/fb.upm,ascR=fb.asc/fb.upm,descR=fb.desc/fb.upm;
  const m=S.margin/100*Math.min(W,H),availW=Math.max(1,W-2*m),availH=Math.max(1,H-2*m),trk=S.tracking/1000;
  const rows=String(text).split('\n').map(l=>Array.from(l));
  let uid=0,vi=0;const occ={};
  const L=rows.map((r,li)=>r.map((ch,ci)=>{const g={ch,vis:!/\s/.test(ch),opt:charOptions(ch),uid:salt*10007+uid++,line:li,pos:ci,text:salt,tag:cfg.tag||''};if(g.vis){g.vi=vi++;g.occ=occ[ch]||0;occ[ch]=g.occ+1;}return g;}));
  const nv=vi,n=L.length;
  const tab=!!S.tabular;let digU=0;if(tab)for(const dch of '0123456789')digU=Math.max(digU,advU(charOptions(dch).def));
  const AX=axisInfo(),axLo=AX?AX.a.min+(AX.a.max-AX.a.min)*Math.min(S.axFrom,S.axTo):0,axHi=AX?AX.a.min+(AX.a.max-AX.a.min)*Math.max(S.axFrom,S.axTo):0;
  const restW=v=>AX?Math.max(advAx(v,AX,axLo),advAx(v,AX,axHi)):advU(v);
  /* custom kerning (Text › Kerning) is added on top of the font's own, in thousandths of an em */
  const KX=cfg.kern!==undefined?cfg.kern:kernMap(cfg.bi||0),kx=(a,b)=>KX?(KX[a.ch+b.ch]||0)/1000:0;
  const isD=ch=>tab&&ch>='0'&&ch<='9',wU=g=>isD(g.ch)?digU:restW(g.opt.def),kU=(a,b)=>((isD(a.ch)||isD(b.ch))?0:kernU(a.opt.def,b.opt.def))+kx(a,b);
  const w1=L.map(row=>{let w=0;row.forEach((g,i)=>{w+=wU(g);if(i<row.length-1)w+=trk+kU(g,row[i+1]);});return w;});
  const hasInk=L.map(row=>row.some(g=>g.vis));
  const maxW1=Math.max(1e-3,...w1);
  if(cfg.measure)return{w1,maxW1,hasInk,n,capR};
  let size,sx=L.map(()=>1),sy=L.map(()=>1);
  const stretchTo=(sz)=>w1.map((w,i)=>hasInk[i]&&w>1e-3?availW/(w*sz):1);
  const fitBlock=()=>Math.min(availW/maxW1,availH/(capR+(n-1)*S.leading));
  if(cfg.lineFill){size=availW/maxW1*cfg.k;sx=w1.map((w,i)=>hasInk[i]&&w>1e-3?maxW1/w:1);sy=sx.slice();}
  else if(cfg.size){size=cfg.size;if(cfg.stretchW)sx=stretchTo(size);}
  else if(S.fit==='manual'){size=S.size/100*W;if(S.stretch)sx=stretchTo(size);}
  else if(S.fit==='stretch'||(S.stretch&&S.fit==='block')){size=availH/(capR+(n-1)*S.leading);sx=stretchTo(size);}
  else if(S.fit==='lines'&&S.stretch){size=fitBlock();sx=stretchTo(size);}
  else if(S.fit==='lines'){size=availW/maxW1;sx=w1.map((w,i)=>hasInk[i]&&w>1e-3?maxW1/w:1);sy=sx.slice();
    const b=stackBaselines(n,size,sy,capR);const h=b[n-1];if(h>availH)size*=availH/h;}
  else{size=Math.min(availW/maxW1,availH/(capR+(n-1)*S.leading));if(S.fit==='cap')size=Math.min(size,S.size/100*W);}
  if(cfg.main)lastSize=size/W*100;
  const bl=stackBaselines(n,size,sy,capR),blockH=bl[n-1];
  const top=cfg.top!=null?cfg.top:S.valign==='top'?m:S.valign==='bottom'?H-m-blockH:(H-blockH)/2;
  const lines=L.map((row,li)=>{
    const recs=row.map(g=>{const ord=g.vis?orderVal(g.vi,nv):0,sw=swapState(g,ord,p),ea=swapEase(sw.t),av=AX&&g.vis?axisVal(AX,p,ord):null;
      const w=isD(g.ch)?digU*size:S.vReflow&&S.vMode!=='scramble'?lerp(advAx(sw.a,AX,av)*size,advAx(sw.b,AX,av)*size,ea):advAx(g.opt.def,AX,av)*size;return{g,ord,sw,ea,w,x:0,co:av==null?null:{id:AX.id,c:{[AX.a.tag]:av}}};});
    let x=0;recs.forEach((r,i)=>{r.x=x;x+=r.w;if(i<recs.length-1)x+=(trk+kU(r.g,recs[i+1].g))*size;});
    const ws=x*sx[li];const x0=S.align==='left'?m:S.align==='right'?W-m-ws:(W-ws)/2;
    return{recs,lw:x,x0,base:top+bl[li],sx:sx[li],sy:sy[li]};
  });
  return{lines,size,capPx:capR*size,ascPx:ascR*size,descPx:descR*size,top,blockH,W,H,ink:S.tightMask?inkBounds(text):null};
}
function pushGlyph(items,r,base,alpha,clips,size,cy,ascPx,descPx,col){
  const {a,b,t}=r.sw;
  const put=(v,al,sy,offY,extra)=>{if(al<=.002)return;const f=F(v.s),co=r.co&&r.co.id===v.s?r.co.c:null,gw=(co?f.advAt(v.r,co):f.adv(v.r))/f.upm*size,k=size/f.upm;
    const M=base.multiply(new DOMMatrix().scaleSelf(1,sy).translateSelf(-gw/2,-cy+offY).scaleSelf(k,k));
    items.push({f,r:v.r,M,alpha:al,clips:extra?clips.concat([extra]):clips,col,co});};
  if(same(a,b)||t>=1)put(b,alpha,1,0);
  else if(t<=0)put(a,alpha,1,0);
  else switch(S.vStyle){
    case 'cut':put(t<.5?a:b,alpha,1,0);break;
    case 'fade':put(a,alpha*(1-r.ea),1,0);put(b,alpha*r.ea,1,0);break;
    case 'flip':put(t<.5?a:b,alpha,Math.max(.001,Math.abs(Math.cos(Math.PI*E.inOut(t)))),0);break;
    case 'stretch':if(t<.5)put(a,alpha,Math.max(.001,1-E.cubicIn(t*2)),0);else put(b,alpha,Math.max(.001,E.backOut(t*2-1,2.2)),0);break;
    default:{const P=.04*size,Hh=ascPx-descPx+2*P,cb={M:base,x:-r.w/2-.3*size,y:-cy-ascPx-P,w:r.w+.6*size,h:Hh};put(a,alpha,1,-r.ea*Hh,cb);put(b,alpha,1,(1-r.ea)*Hh,cb);}
  }
}
function emitBlock(B,p,items,fx){
  const {size,capPx,ascPx,descPx,W}=B,cy=S.anchor==='baseline'?0:-capPx/2,pad=.04*size;
  /* the roll window and the distance a glyph travels are the same height, so a rolled-out glyph is fully clear */
  const topPx=S.tightMask?Math.max(capPx,B.ink?B.ink.top*size:0):ascPx,botPx=S.tightMask?-(B.ink?B.ink.bot*size:0):descPx,Hw=topPx-botPx+2*pad;
  const tMask=S.mode==='transit'?S.tMask:'none',am=fx.alpha==null?1:fx.alpha;
  B.lines.forEach((ln,li)=>{
    let xs=[ln.x0];
    if(fx.marq){const span=ln.lw*ln.sx+fx.marq.gap;if(span>1){xs=[];const s0=(((fx.marq.f*span)%span)+span)%span;for(let x=s0-span;x<W+1;x+=span)xs.push(x);}}
    for(const x0 of xs){
      const L=new DOMMatrix().translateSelf(x0+(B.ox||0),ln.base+(B.oy||0)).scaleSelf(ln.sx,ln.sy);
      const lineClip={M:L,x:-1e5,y:-topPx-pad,w:2e5,h:Hw};
      ln.recs.forEach((r,ri)=>{
        if(!r.g.vis||(fx.filter&&!fx.filter(li,ri)))return;
        const m=motionState(r.g,r.ord,size,p);
        const q=fx.role?seqFx(fx.role,fx.tgAt?fx.tgAt(li,ri):fx.tg(r.ord)):null;
        const ha=hooks&&hooks.alpha?hooks.alpha(r.g):1;
        const alpha=m.alpha*(q?q.a:1)*am*ha;if(alpha<=.002)return;
        const ssx=m.sx*(q?q.sx:1),ssy=m.sy*(q?q.sy:1);if(ssx<1e-3||ssy<1e-3)return;
        const base=L.multiply(new DOMMatrix().translateSelf(r.x+r.w/2+m.dx,cy+m.dy+(q?q.dy*Hw:0)).rotateSelf(m.rot).scaleSelf(ssx,ssy));
        const clips=[];
        if((q&&q.clip)||tMask==='line')clips.push(lineClip);
        if(tMask==='glyph')clips.push({M:L,x:r.x-pad,y:-topPx-pad,w:r.w+2*pad,h:Hw});
        pushGlyph(items,r,base,alpha,clips,size,cy,ascPx,descPx,hooks&&hooks.colour?hooks.colour(r.g):null);
      });
    }
  });
}
function activeTexts(){const t=S.seq?S.texts.filter(s=>s.trim()):[S.texts[0]||''];return t.length?t:[S.texts[0]||''];}
function seqAt(p,n){
  if(n<2)return{cur:0,next:0,trans:false};
  const pos=p*n,cur=Math.floor(pos)%n,u=pos-Math.floor(pos),tw=clamp(S.qDur,.05,1),ts=1-tw,st=clamp(S.qStagger,0,.95);
  const v=clamp((u-ts)/tw),clear=S.qClear!==false,tgf=x=>ord=>clamp((x-st*ord)/Math.max(.001,1-st));
  return{cur,next:(cur+1)%n,trans:u>ts,tgOut:tgf(clear?clamp(v*2):v),tgIn:tgf(clear?clamp(v*2-1):v)};
}
function buildScene(p,W,H){
  curW=W;curH=H;
  const items=[],T=activeTexts(),n=T.length;
  if(useBlocks()){for(const b of blocksLayout(p,W,H))emitBlock(b.B,p,items,{});return items;}
  if(live&&live.t<1&&live.from&&!S.seq&&!S.rOn&&!still){buildLive(p,W,H,items);return items;}
  if(S.seq&&n>1&&S.qStyle==='glide')buildGlide(p,W,H,T,items);
  else if(S.rOn)buildRepeat(p,W,H,T,items);
  else{const q=seqAt(p,n);if(still)q.trans=false;
    emitBlock(layoutBlock(T[q.cur],q.cur,W,H,p,{main:true}),p,items,q.trans?{role:'out',tg:q.tgOut}:{});
    if(q.trans)emitBlock(layoutBlock(T[q.next],q.next,W,H,p,{}),p,items,{role:'in',tg:q.tgIn});}
  return items;
}
function buildLive(p,W,H,items){
  const A=layoutBlock(live.from,0,W,H,p,{main:true,tag:'from'}),B=layoutBlock(live.to,0,W,H,p,{tag:'to'});
  const diff=(X,Y)=>{const set=new Set();X.lines.forEach((ln,li)=>{const o=Y.lines[li],ok=o&&o.recs.length===ln.recs.length;ln.recs.forEach((r,ri)=>{if(r.g.vis&&(!ok||o.recs[ri].g.ch!==r.g.ch))set.add(li+'|'+ri);});});return set;};
  const rank=set=>{const a=[...set],m=new Map();a.forEach((k,i)=>m.set(k,a.length>1?i/(a.length-1):0));return m;};
  const cA=diff(A,B),cB=diff(B,A),rA=rank(cA),rB=rank(cB),st=clamp(S.qStagger,0,.95),t=live.t;
  const clear=S.qClear!==false,tO=clear?clamp(t*2):t,tI=clear?clamp(t*2-1):t;
  const tgOf=(m,x)=>(li,ri)=>clamp((x-st*(m.get(li+'|'+ri)||0))/Math.max(.001,1-st));
  emitBlock(A,p,items,{role:'out',filter:(li,ri)=>cA.has(li+'|'+ri),tgAt:tgOf(rA,tO)});
  emitBlock(B,p,items,{role:'in',filter:(li,ri)=>cB.has(li+'|'+ri),tgAt:tgOf(rB,tI)});
  emitBlock(B,p,items,{filter:(li,ri)=>!cB.has(li+'|'+ri)});
}
const gcd=(a,b)=>b?gcd(b,a%b):a,lcm=(a,b)=>a*b/gcd(a,b);
function buildRepeat(p,W,H,T,items){
  const n=T.length,alt=S.seq&&n>1&&S.rMix==='alternate';
  const fb=F(baseSlot()),capR=fb.cap/fb.upm;
  const lc=T.map(t=>t.split('\n').length),maxLines=Math.max(...lc);
  const rows=Math.max(1,Math.round(S.rRows)),pitch=H/rows,size=pitch/(maxLines*S.leading+S.rGap/100);lastSize=size/W*100;
  const marq=Math.round(S.rMarq),unit=lcm(alt?n:1,(S.rAlt&&marq)?2:1);
  const scrollRows=Math.round(S.rScroll)*unit,offY=p*scrollRows*pitch;
  const r0=Math.floor(offY/pitch)-1,r1=Math.ceil((offY+H)/pitch)+1;
  const place=(ti,rowTop)=>rowTop+(pitch-(capR+(lc[ti]-1)*S.leading)*size)/2;
  for(let r=r0;r<=r1;r++){
    const rowTop=r*pitch-offY;if(rowTop>H||rowTop<-pitch)continue;
    const pr=S.rDelay?((((p-(rowTop/pitch)*S.rDelay)%1)+1)%1):p;
    const q=seqAt(pr,n),sh=alt?(((r%n)+n)%n):0,par=((r%2)+2)%2;
    const mq=marq?{f:p*marq*(S.rAlt&&par?-1:1),gap:size*.4}:null;
    const ia=(q.cur+sh)%n,ib=(q.next+sh)%n;
    emitBlock(layoutBlock(T[ia],ia,W,H,pr,{size,top:place(ia,rowTop),stretchW:!!S.stretch}),pr,items,{role:q.trans?'out':null,tg:q.tgOut,marq:mq});
    if(q.trans)emitBlock(layoutBlock(T[ib],ib,W,H,pr,{size,top:place(ib,rowTop),stretchW:!!S.stretch}),pr,items,{role:'in',tg:q.tgIn,marq:mq});
  }
}
function buildGlide(p,W,H,T,items){
  const n=T.length,K=Math.max(2,Math.min(Math.round(S.qStack),n));
  const fb=F(baseSlot()),capR=fb.cap/fb.upm;
  const m=S.margin/100*Math.min(W,H),availW=Math.max(1,W-2*m),availH=Math.max(1,H-2*m),trk=S.tracking/1000;
  const lc=T.map(t=>t.split('\n').length);let maxW1=1e-3;
  const KX=kernMap(0);
  for(const t of T)for(const row of t.split('\n')){const cs=Array.from(row);let w=0;cs.forEach((ch,i)=>{const o=charOptions(ch);w+=advU(o.def);if(i<cs.length-1)w+=trk+kernU(o.def,charOptions(cs[i+1]).def)+(KX?(KX[ch+cs[i+1]]||0)/1000:0);});maxW1=Math.max(maxW1,w);}
  const sorted=lc.slice().sort((a,b)=>b-a),slotLines=sorted.slice(0,K).reduce((a,b)=>a+b,0);
  const spanU=capR+(slotLines-1)*S.leading;
  const size=S.fit==='manual'?S.size/100*W:Math.min(availW/maxW1,availH/spanU);lastSize=size/W*100;
  const stackH=spanU*size,top=S.valign==='top'?m:S.valign==='bottom'?H-m-stackH:(H-stackH)/2;
  const step=S.leading*size,anchor=top+slotLines*step;
  const pos=p*n,cur=Math.floor(pos)%n,u=pos-Math.floor(pos),tw=clamp(S.qDur,.05,1),tg=clamp((u-(1-tw))/tw),e=qEase(tg);
  const idxOf=d=>((cur-d)%n+n)%n,hOf=d=>lc[idxOf(d)]*step;
  const shift=e*hOf(-1);
  let acc=0;const tops=new Map();
  for(let d=0;d<K;d++){acc+=hOf(d);tops.set(d,anchor-acc-shift);}
  tops.set(-1,anchor-shift);
  for(let d=K-1;d>=-1;d--){
    let a=d===-1?clamp(e):1;a*=1-S.qTrail*clamp((d+e)/(K-1));if(d===K-1)a*=1-clamp(e);
    if(a<=.002)continue;const idx=idxOf(d);
    emitBlock(layoutBlock(T[idx],idx,W,H,p,{size,top:tops.get(d)}),p,items,{alpha:a});
  }
}

/* ---------------- blocks, lockups and physics (Rubato 1.0) ----------------
   Up to four blocks of text, each with its own font and size, stacked as a
   lockup. Physics pulls each block towards a point in the frame and back, and
   Personal space keeps them from overlapping on the way. */
const kernMap=i=>{const b=S.blocks&&S.blocks[i];return b&&b.kern&&Object.keys(b.kern).length?b.kern:null;};
const nBlocks=()=>Array.isArray(S.blocks)&&S.blocks.length?Math.min(4,S.blocks.length):1;
const useBlocks=()=>!S.seq&&!S.rOn&&(nBlocks()>1||!!S.phOn);
const blockText=i=>i===0?(S.texts[0]||''):((S.blocks[i]&&S.blocks[i].text)||'');
/* block 1 is always set in the default style (Fonts › Default); blocks 2–4 can choose their own */
const blockFont=i=>{if(!i)return null;const b=S.blocks&&S.blocks[i],id=b&&b.font;return id&&faces.has(id)?id:null;};
const DEST={tl:[0,0],t:[.5,0],tr:[1,0],l:[0,.5],c:[.5,.5],r:[1,.5],bl:[0,1],b:[.5,1],br:[1,1]};
const AUTO_DEST=[['tl'],['tl','br'],['tl','tr','bl'],['tl','tr','bl','br']];
function blockDest(i,n){const d=S.blocks&&S.blocks[i]&&S.blocks[i].dest;return DEST[d]?d:AUTO_DEST[n-1][i];}
function blockProgress(i,n,p){
  if(still||!S.phOn)return 0;
  let a=S.phIn,h=S.phHold,o=S.phOut;const sum=a+h+o;if(sum>1){a/=sum;h/=sum;o/=sum;}
  const ord=n>1?i/(n-1):0,st=clamp(S.phStagger,0,.95);
  const tin=clamp((p-a*st*ord)/Math.max(.001,a*(1-st))),tout=clamp((p-(a+h+o*st*ord))/Math.max(.001,o*(1-st)));
  return tout>0?1-arrive(S.phFeel,tout):arrive(S.phFeel,tin);
}
function blockRect(B){let x1=Infinity,x2=-Infinity;for(const ln of B.lines){if(!ln.recs.some(r=>r.g.vis))continue;x1=Math.min(x1,ln.x0);x2=Math.max(x2,ln.x0+ln.lw*ln.sx);}
  if(!isFinite(x1)){x1=B.W/2;x2=B.W/2;}const y1=B.lines.length?B.lines[0].base-B.capPx*B.lines[0].sy:B.top;return{x1,x2,y1,y2:B.top+B.blockH};}
function blocksLayout(p,W,H){
  const n=nBlocks(),m=S.margin/100*Math.min(W,H),availW=Math.max(1,W-2*m),availH=Math.max(1,H-2*m);
  const out=[];
  if(n===1){
    out.push({i:0,B:withBase(blockFont(0),()=>layoutBlock(blockText(0),0,W,H,p,{main:true,bi:0}))});
  }else{
    const z=i=>clamp(+((S.blocks[i]||{}).size)||1,.1,3);
    const ms=[...Array(n).keys()].map(i=>withBase(blockFont(i),()=>layoutBlock(blockText(i),100+i,W,H,p,{measure:true,bi:i})));
    const cfgs=[];let total=0;
    if(S.fit==='lines'){
      /* every line fills the width; then the whole stack shrinks if it's too tall */
      const hs=ms.map(M=>{const size=availW/M.maxW1,sy=M.w1.map((w,l)=>M.hasInk[l]&&w>1e-3?M.maxW1/w:1);return{size,h:stackBaselines(M.n,size,sy,M.capR)[M.n-1]};});
      hs.forEach((h,i)=>{total+=h.h+(i<n-1?S.lkGap*h.size:0);});const k=Math.min(1,availH/Math.max(1e-3,total));total*=k;
      hs.forEach((h,i)=>cfgs.push({lineFill:true,k,size:h.size*k,h:h.h*k}));
    }else{
      let base;
      const wz=Math.max(1e-3,...ms.map((M,i)=>M.maxW1*z(i))),hz=ms.reduce((acc,M,i)=>acc+(M.capR+(M.n-1)*S.leading)*z(i)+(i<n-1?S.lkGap*z(i):0),0);
      if(S.fit==='manual')base=S.size/100*W;else base=Math.min(availW/wz,availH/Math.max(1e-3,hz));
      ms.forEach((M,i)=>{const size=base*z(i);cfgs.push({size,stretchW:!!S.stretch,h:(M.capR+(M.n-1)*S.leading)*size});});
      total=hz*base;
    }
    let top=S.valign==='top'?m:S.valign==='bottom'?H-m-total:(H-total)/2;
    for(let i=0;i<n;i++){const c=cfgs[i];
      const B=withBase(blockFont(i),()=>layoutBlock(blockText(i),100+i,W,H,p,Object.assign({top,bi:i,main:i===0},c.lineFill?{lineFill:true,k:c.k}:{size:c.size,stretchW:c.stretchW})));
      out.push({i,B});top+=c.h+(i<n-1?S.lkGap*c.size:0);}
  }
  /* physics: pull towards each block's destination, then keep personal space */
  for(const b of out){b.rest=blockRect(b.B);b.pr=blockProgress(b.i,n,p);
    const d=DEST[blockDest(b.i,n)],r=b.rest,P=[m+d[0]*availW,m+d[1]*availH],A=[r.x1+d[0]*(r.x2-r.x1),r.y1+d[1]*(r.y2-r.y1)];
    b.dest=P;b.dx=(P[0]-A[0])*S.phPull;b.dy=(P[1]-A[1])*S.phPull;b.ox=b.dx*b.pr;b.oy=b.dy*b.pr;}
  const f=(S.phOn&&!still?S.phSpace:0)/100*Math.min(W,H);
  if(f>0&&out.length>1){
    const R=b=>({x1:b.rest.x1+b.ox,x2:b.rest.x2+b.ox,y1:b.rest.y1+b.oy,y2:b.rest.y2+b.oy});
    for(let it=0;it<12;it++){let moved=false;
      for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length;j++){
        const A=out[i],Bb=out[j],w=clamp(Math.max(A.pr,Bb.pr)*3);if(w<=0)continue;const ff=f*w,ra=R(A),rb=R(Bb);
        const ox=Math.min(ra.x2,rb.x2)-Math.max(ra.x1,rb.x1)+ff,oy=Math.min(ra.y2,rb.y2)-Math.max(ra.y1,rb.y1)+ff;if(ox<=0||oy<=0)continue;
        const sx=Math.sign((rb.x1+rb.x2)-(ra.x1+ra.x2))||1,sy=Math.sign((rb.y1+rb.y2)-(ra.y1+ra.y2))||1;
        const wx=Math.pow(oy,4)/(Math.pow(ox,4)+Math.pow(oy,4)),px=ox*wx/2,py=oy*(1-wx)/2;
        A.ox-=sx*px;Bb.ox+=sx*px;A.oy-=sy*py;Bb.oy+=sy*py;moved=true;}
      for(const b of out){const r=R(b);if(r.x1<0)b.ox-=r.x1;else if(r.x2>W)b.ox-=r.x2-W;if(r.y1<0)b.oy-=r.y1;else if(r.y2>H)b.oy-=r.y2-H;}
      if(!moved)break;}
  }
  for(const b of out){b.B.ox=b.ox;b.B.oy=b.oy;b.field=f;b.cur=R0(b);}
  return out;
}
const R0=b=>({x1:b.rest.x1+b.ox,x2:b.rest.x2+b.ox,y1:b.rest.y1+b.oy,y2:b.rest.y2+b.oy});
/* where the editable letter pairs are, for kerning on the preview */
function kernTargets(p,W,H){
  curW=W;curH=H;let list=[];
  if(S.rOn||(S.seq&&S.qStyle==='glide'))return list;
  let bl;if(useBlocks())bl=blocksLayout(p,W,H);
  else{const T=activeTexts(),q=seqAt(p,T.length);bl=[{i:0,B:layoutBlock(T[q.cur],q.cur,W,H,p,{bi:0}),seqIndex:q.cur}];}
  for(const b of bl){const B=b.B,ox=B.ox||0,oy=B.oy||0;
    B.lines.forEach((ln,li)=>{for(let ri=0;ri<ln.recs.length-1;ri++){const r=ln.recs[ri],nx=ln.recs[ri+1];if(!r.g.vis||!nx.g.vis)continue;
      const mid=(r.x+r.w+nx.x)/2;
      list.push({bi:b.i,seqIndex:b.seqIndex,li,ri,pair:r.g.ch+nx.g.ch,x:ox+ln.x0+mid*ln.sx,y1:oy+ln.base-B.ascPx*ln.sy,y2:oy+ln.base-B.descPx*ln.sy,
        xa:ox+ln.x0+r.x*ln.sx,xb:ox+ln.x0+(nx.x+nx.w)*ln.sx});}});}
  return list;
}

/* ---------------- render ---------------- */
function drawItems(ctx,items,K,outline){
  for(const it of items){
    const a=it.alpha;if(a<=.002)continue;
    ctx.save();ctx.globalAlpha=Math.min(1,a);if(it.col)ctx.fillStyle=ctx.strokeStyle=it.col;
    for(const c of it.clips){ctx.setTransform(K.multiply(c.M));ctx.beginPath();ctx.rect(c.x,c.y,c.w,c.h);ctx.clip();}
    ctx.setTransform(K.multiply(it.M));
    if(outline)ctx.lineWidth=S.stroke/1000*it.f.upm;
    if(it.co&&it.f.drawAt)it.f.drawAt(ctx,it.r,outline,it.co);else it.f.draw(ctx,it.r,outline);
    ctx.restore();
  }
}
const layerCv=document.createElement('canvas');
function renderFrame(ctx,W,H,p,k,forceBg,pre){
  const cw=ctx.canvas.width,ch=ctx.canvas.height;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.clearRect(0,0,cw,ch);
  if(!S.transparent||forceBg){ctx.fillStyle=S.bg;ctx.fillRect(0,0,cw,ch);}
  const items=buildScene(p,W,H),K=new DOMMatrix([k,0,0,k,0,0]),outline=S.style==='outline';if(pre)K.multiplySelf(pre);
  const hasImg=!!img;
  const imgPass=c=>{c.save();c.globalAlpha=S.iOpacity;c.globalCompositeOperation=GCO[S.iBlend]||'source-over';drawImg(c,W,H,k,p);c.restore();};
  if(hasImg&&S.iPlace==='behind')imgPass(ctx);
  ctx.fillStyle=ctx.strokeStyle=S.ink;ctx.lineJoin='round';
  drawItems(ctx,items,K,outline);
  if(hasImg&&S.iPlace==='inside'){
    if(layerCv.width!==cw||layerCv.height!==ch){layerCv.width=cw;layerCv.height=ch;}
    const l=layerCv.getContext('2d');l.setTransform(1,0,0,1,0,0);l.globalCompositeOperation='source-over';l.globalAlpha=1;l.clearRect(0,0,cw,ch);
    l.fillStyle=l.strokeStyle='#000';l.lineJoin='round';drawItems(l,items,K,outline);
    l.save();l.globalCompositeOperation='source-in';drawImg(l,W,H,k,p);l.restore();
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=S.iOpacity;ctx.globalCompositeOperation=GCO[S.iBlend]||'source-over';ctx.drawImage(layerCv,0,0);ctx.restore();
  }
  if(hasImg&&S.iPlace==='above')imgPass(ctx);
}

return{use(o){S=o;optCache.clear();scCache.clear();rankCache={key:'',arr:[]};},blocksLayout,kernTargets,useBlocks,nBlocks,blockDest,setStill(v){still=!!v;},isStill:()=>still,withBase,fallbacks,F,baseSlot,availSlots,anyLoaded,setFaces,faceList,axisInfo,charOptions,optCache,vkey,renderFrame,buildScene,makeBaked,setImage(i){img=i;},setHooks(h){hooks=h||null;},setLive(l){live=l||null;},lastSize:()=>lastSize,clamp,lerp,E,TAU};
}