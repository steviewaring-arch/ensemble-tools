function createEngine(){
'use strict';
let S={},img=null,hooks=null,live=null;
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
function setFaces(list){inkCache.clear();faces=new Map();order=[];swapSet=new Set();for(const it of list||[]){if(!it||!it.face)continue;faces.set(it.id,it.face);order.push(it.id);if(it.swap!==false)swapSet.add(it.id);}optCache.clear();}
const faceList=()=>order.map(id=>({id,face:faces.get(id),swap:swapSet.has(id)}));
const anyLoaded=()=>order.length>0;
const F=id=>faces.get(id)||fallbacks[id]||(order.length?faces.get(order[0]):fallbacks.d1);
function baseSlot(){if(!order.length)return 'd1';return faces.has(S.baseSlot)?S.baseSlot:order[0];}
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
/* A display face scaled so its capitals stand as tall as the core face's (Tempo's
   mixed faces), unless S.faceMatch is false. */
function capScale(id){if(S.faceMatch===false)return 1;const f=F(id),fb=F(baseSlot());if(!(f.cap>0)||!(fb.cap>0))return 1;return clamp((fb.cap/fb.upm)/(f.cap/f.upm),.5,2);}
const hasFace=id=>faces.has(id)||(!order.length&&!!fallbacks[id]);
/* charOptions(ch) – the core face and its alternates. charOptions(ch,id) – the
   plain glyph in another face, for a character set in a display face. */
function charOptions(ch,slot){
  const bs=baseSlot();
  if(slot&&slot!==bs&&hasFace(slot)){const key='@'+slot+'|'+ch;let o=optCache.get(key);if(o)return o;
    const def={s:slot,r:F(slot).base(ch),sc:capScale(slot)};o={def,opts:[],seq:[def],full:[def],sel:[def]};optCache.set(key,o);return o;}
  const key=S.vMode+'|'+bs+'|'+ch;let o=optCache.get(key);if(o)return o;
  const f=F(bs),def={s:bs,r:f.base(ch)},full=[def];
  const useW=S.vMode==='weights'||S.vMode==='both',useAlt=S.vMode!=='weights';
  const slots=useW?availSlots():[bs];
  for(const s of slots){const fs=F(s);const cand=[fs.base(ch)].concat(useAlt?fs.alts(ch):[]);for(const r of cand){if(!full.some(v=>v.s===s&&v.r===r))full.push({s,r});}}
  let sel=full;const pk=S.picks&&S.picks[ch];
  if(pk&&pk.length){const s2=pk.map(k=>full.find(v=>vkey(v)===k)).filter(Boolean);if(s2.length)sel=s2;}
  const anim=S.vMode!=='off';
  o={def:sel[0],opts:anim?sel.slice(1):[],seq:anim?sel:[sel[0]],full,sel};optCache.set(key,o);return o;
}
const advU=v=>{const f=F(v.s);return f.adv(v.r)/f.upm*(v.sc||1);};
/* how far real glyphs reach above and below the baseline (in ems), across every glyph a character can become */
const inkCache=new Map();
function inkBounds(text,slots){
  const chars=[...new Set(Array.from('0123456789'+String(text).replace(/\s/g,'')))].sort().join(''),key=baseSlot()+'|'+S.vMode+'|'+chars+'|'+(slots||[]).join(',');
  let r=inkCache.get(key);if(r)return r;let top=0,bot=0;
  for(const ch of chars)for(const o of [charOptions(ch)].concat((slots||[]).map(id=>charOptions(ch,id))))for(const v of o.full){const f=F(v.s);if(!f.bbox)continue;const b=f.bbox(v.r);if(!b)continue;const k=v.sc||1;top=Math.max(top,b[0]/f.upm*k);bot=Math.max(bot,b[1]/f.upm*k);}
  r={top,bot};inkCache.set(key,r);return r;
}
function axisInfo(){if(!S.axOn)return null;const id=baseSlot(),f=F(id);if(!f.axes||!f.axes.length||!f.advAt)return null;const a=f.axes.find(x=>x.tag===S.axTag)||f.axes[0];return{a,f,id};}
function axisVal(AX,p,ord){const ph=Math.max(1,Math.round(S.axCycles))*p-S.axStagger*ord;let t=.5-.5*Math.cos(TAU*ph);if(S.axFeel==='snappy')t=E.expoInOut(t);
  const fr=lerp(S.axFrom,S.axTo,t);return AX.a.min+(AX.a.max-AX.a.min)*fr;}
const advAx=(v,AX,val)=>{if(!AX||val==null||v.s!==AX.id)return advU(v);const f=F(v.s);return f.advAt(v.r,{[AX.a.tag]:val})/f.upm;};
const kernU=(a,b)=>{if(a.s!==b.s)return 0;const f=F(a.s);return f.kern(a.r,b.r)/f.upm*(a.sc||1);};
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
  if(hooks&&hooks.pick&&g.vis){const v=hooks.pick(g,o);if(v)return{a:v,b:v,t:1};}if(S.vMode==='off'||!g.vis||!o.opts.length)return{a:o.def,b:o.def,t:1};
  const cyc=S.vPattern==='cycle';
  let M=Math.max(1,Math.round(S.vSteps));if(!cyc&&S.vRest&&M%2)M++;
  const pos=p*M,k=Math.floor(pos),u=pos-k;
  const pick=kk=>{kk=((kk%M)+M)%M;
    if(cyc){const L=o.seq.length,i=kk+(S.vOffset?g.occ:0);return o.seq[((i%L)+L)%L];}
    if(S.vRest&&kk%2===1)return o.def;if(hash(101,kk,g.uid)>=S.vChance)return o.def;return o.opts[Math.floor(hash(102,kk,g.uid)*o.opts.length)];};
  const dur=Math.max(.02,S.vDur);const t=clamp((u-S.vStagger*ord*(1-dur))/dur);
  return{a:pick(k-1),b:pick(k),t};
}
const swapEase=t=>S.vStyle==='cut'?(t<.5?0:1):S.vStyle==='roll'?E.expoOut(t):E.inOut(t);
function motionState(g,ord,size,p){
  const st={dx:0,dy:0,rot:0,sx:1,sy:1,alpha:1};
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
  /* hooks.face(g) can set a character in a display face (Tempo's faces per numeral) */
  const faceOf=hooks&&hooks.face?g=>hooks.face(g):null;
  const L=rows.map((r,li)=>r.map((ch,ci)=>{const g={ch,vis:!/\s/.test(ch),uid:salt*10007+uid++,line:li,pos:ci,text:salt,tag:cfg.tag||''};g.opt=charOptions(ch,faceOf&&g.vis?faceOf(g):null);if(g.vis){g.vi=vi++;g.occ=occ[ch]||0;occ[ch]=g.occ+1;}return g;}));
  const nv=vi,n=L.length;
  const tab=!!S.tabular,digW=new Map(),digOf=s=>{let w=digW.get(s);if(w==null){w=0;for(const dch of '0123456789')w=Math.max(w,advU(charOptions(dch,s===bs?null:s).def));digW.set(s,w);}return w;};
  const digU=tab?digOf(bs):0;
  /* the core face's tracking (S.tracking) and each face's own (S.faceTrack) */
  const ftk=S.faceTrack||{},gapU=g=>(g.opt.def.s===bs?trk:0)+(ftk[g.opt.def.s]||0)/1000;
  /* hooks.fitSlots(): every display face a numeral could take, so the size holds whichever comes in */
  const fitSlots=hooks&&hooks.fitSlots?hooks.fitSlots():null;
  const AX=axisInfo(),axLo=AX?AX.a.min+(AX.a.max-AX.a.min)*Math.min(S.axFrom,S.axTo):0,axHi=AX?AX.a.min+(AX.a.max-AX.a.min)*Math.max(S.axFrom,S.axTo):0;
  const restW=v=>AX?Math.max(advAx(v,AX,axLo),advAx(v,AX,axHi)):advU(v);
  const isD=ch=>tab&&ch>='0'&&ch<='9',wU=g=>isD(g.ch)?digOf(g.opt.def.s):restW(g.opt.def),kU=(a,b)=>(isD(a.ch)||isD(b.ch))?0:kernU(a.opt.def,b.opt.def);
  const wFit=g=>{let w=wU(g);if(fitSlots&&g.vis&&/\d/.test(g.ch))for(const s of fitSlots)w=Math.max(w,isD(g.ch)?digOf(s):advU(charOptions(g.ch,s).def));return w;};
  const w1=L.map(row=>{let w=0;row.forEach((g,i)=>{w+=wFit(g);if(i<row.length-1)w+=gapU(g)+kU(g,row[i+1]);});return w;});
  const hasInk=L.map(row=>row.some(g=>g.vis));
  const maxW1=Math.max(1e-3,...w1);
  let size,sx=L.map(()=>1),sy=L.map(()=>1);
  const stretchTo=(sz)=>w1.map((w,i)=>hasInk[i]&&w>1e-3?availW/(w*sz):1);
  const fitBlock=()=>Math.min(availW/maxW1,availH/(capR+(n-1)*S.leading));
  if(cfg.size){size=cfg.size;if(cfg.stretchW)sx=stretchTo(size);}
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
      const w=isD(g.ch)?digOf(g.opt.def.s)*size:S.vReflow?lerp(advAx(sw.a,AX,av)*size,advAx(sw.b,AX,av)*size,ea):advAx(g.opt.def,AX,av)*size;return{g,ord,sw,ea,w,x:0,co:av==null?null:{id:AX.id,c:{[AX.a.tag]:av}}};});
    let x=0;recs.forEach((r,i)=>{r.x=x;x+=r.w;if(i<recs.length-1)x+=(gapU(r.g)+kU(r.g,recs[i+1].g))*size;});
    const ws=x*sx[li];const x0=S.align==='left'?m:S.align==='right'?W-m-ws:(W-ws)/2;
    return{recs,lw:x,x0,base:top+bl[li],sx:sx[li],sy:sy[li]};
  });
  return{lines,size,capPx:capR*size,ascPx:ascR*size,descPx:descR*size,top,blockH,W,H,ink:S.tightMask?inkBounds(text,fitSlots):null};
}
function pushGlyph(items,r,base,alpha,clips,size,cy,ascPx,descPx,col){
  const {a,b,t}=r.sw;
  const put=(v,al,sy,offY,extra)=>{if(al<=.002)return;const f=F(v.s),co=r.co&&r.co.id===v.s?r.co.c:null,sc=v.sc||1,gw=(co?f.advAt(v.r,co):f.adv(v.r))/f.upm*size*sc,k=size*sc/f.upm;
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
      const L=new DOMMatrix().translateSelf(x0,ln.base).scaleSelf(ln.sx,ln.sy);
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
  const items=[],T=activeTexts(),n=T.length;
  if(live&&live.t<1&&live.from&&!S.seq&&!S.rOn){buildLive(p,W,H,items);return items;}
  if(S.seq&&n>1&&S.qStyle==='glide')buildGlide(p,W,H,T,items);
  else if(S.rOn)buildRepeat(p,W,H,T,items);
  else{const q=seqAt(p,n);
    emitBlock(layoutBlock(T[q.cur],q.cur,W,H,p,{main:true}),p,items,q.trans?{role:'out',tg:q.tgOut}:{});
    if(q.trans)emitBlock(layoutBlock(T[q.next],q.next,W,H,p,{}),p,items,{role:'in',tg:q.tgIn});}
  return items;
}
function buildLive(p,W,H,items){
  const A=layoutBlock(live.from,0,W,H,p,{main:true,tag:'from'}),B=layoutBlock(live.to,0,W,H,p,{tag:'to'});
  /* a character changes if it's a different character, or the same one in another face */
  const diff=(X,Y)=>{const set=new Set();X.lines.forEach((ln,li)=>{const o=Y.lines[li],ok=o&&o.recs.length===ln.recs.length;ln.recs.forEach((r,ri)=>{if(r.g.vis&&(!ok||o.recs[ri].g.ch!==r.g.ch||o.recs[ri].g.opt.def.s!==r.g.opt.def.s))set.add(li+'|'+ri);});});return set;};
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
  for(const t of T)for(const row of t.split('\n')){const cs=Array.from(row);let w=0;cs.forEach((ch,i)=>{const o=charOptions(ch);w+=advU(o.def);if(i<cs.length-1)w+=trk+kernU(o.def,charOptions(cs[i+1]).def);});maxW1=Math.max(maxW1,w);}
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

return{use(o){S=o;optCache.clear();rankCache={key:'',arr:[]};},fallbacks,F,baseSlot,availSlots,anyLoaded,setFaces,faceList,axisInfo,charOptions,optCache,vkey,renderFrame,buildScene,makeBaked,setImage(i){img=i;},setHooks(h){hooks=h||null;},setLive(l){live=l||null;},lastSize:()=>lastSize,clamp,lerp,E,TAU};
}