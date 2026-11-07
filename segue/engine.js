/* Segue – engine. Given the settings, the media and a moment in the loop, it works out
   where every shape is and draws the frame. No DOM beyond the canvas it's handed: the app
   owns the media (images as ImageBitmaps, video as <video> elements it seeks or plays).

   The model, in one breath: shapes sit on a track (One, Row, Column) or in a scrolling Grid.
   A camera moves along the track a stop at a time (hold, then move, with a feel) or drifts
   without stopping. After the last stop it either carries on round, or pulls back to show
   every shape in a grid and comes back in to the first. Everything loops exactly.

   From 0.2 there are three more kinds, each with its own clock rather than one camera:
   Columns (each column runs up or down on its own), Frames (the shapes stay put and the
   media changes inside them) and Float (shapes drift past at different depths). Line and
   Grid can lag – each shape sets off a beat after the one ahead – and keep drifting while
   they rest. A background image sits behind it all; text or an image can sit over it. */
const SegueEngine=(()=>{
'use strict';
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const mod=(a,n)=>((a%n)+n)%n;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

/* ---------------- feels ---------------- */
function bezier(x1,y1,x2,y2){
  const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;
  const X=t=>((ax*t+bx)*t+cx)*t,Y=t=>((ay*t+by)*t+cy)*t,dX=t=>(3*ax*t+2*bx)*t+cx;
  return x=>{if(x<=0)return 0;if(x>=1)return 1;let t=x;
    for(let i=0;i<8;i++){const e=X(t)-x;if(Math.abs(e)<1e-7)return Y(t);const d=dX(t);if(Math.abs(d)<1e-6)break;t-=e/d;}
    let lo=0,hi=1;t=x;for(let i=0;i<40;i++){const v=X(t);if(Math.abs(v-x)<1e-7)break;if(v<x)lo=t;else hi=t;t=(lo+hi)/2;}return Y(t);};}
/* spring: past the mark by about 3%, then settles – pinned to land exactly on 1 */
const springRaw=x=>1-Math.exp(-7.2*x)*Math.cos(Math.PI*2*1.05*x);
const spring=t=>t<=0?0:t>=1?1:springRaw(t)+t*(1-springRaw(1));
/* Soft: a gentle ease in and out – the least abrupt, for zooms. Coast: a short push, then a
   long glide that only just settles – fitted to Steve's phone-swipe reference (4 Nov).
   Snap (0.7): measured frame by frame from two motion-pack recordings (6 Nov) – the camera is
   rigid (everything moves as one), it holds, takes off slowly, throws across in the middle of
   the move (78% of the way by the half-way mark) and then takes the last tenth a long time
   settling. Best fit to both, six moves, rms error 1%: cubic-bezier(.84,.11,.01,.98), ~0.9 s. */
const FEEL={snap:bezier(.84,.11,.01,.98),glide:bezier(.65,0,.35,1),soft:bezier(.42,0,.58,1),coast:bezier(.18,0,.02,1),inertia:bezier(.35,.85,.2,1),spring,linear:t=>clamp(t,0,1)};
/* Through's own curve, in scale: off at once, slowing as it fills the frame – fitted to the card's growth in Steve's reference (5 Nov) */
const THROUGH=bezier(.04,.35,.76,1);
const feel=name=>FEEL[name]||FEEL.glide;

/* ---------------- sizes ---------------- */
const SIZES={'4:5':[1080,1350],'9:16':[1080,1920],'1:1':[1080,1080],'16:9':[1920,1080],'4:3':[1440,1080]};
const even=v=>{v=Math.round(clamp(+v||0,64,4096));return v-(v%2);};
function canvasSize(S){return S.cSize==='custom'?[even(S.cW),even(S.cH)]:(SIZES[S.cSize]||SIZES['4:5']).slice();}
const RATIOS={'4:5':4/5,'3:4':3/4,'2:3':2/3,'9:16':9/16,'9:19.5':9/19.5,'1:1':1,'4:3':4/3,'3:2':3/2,'16:10':16/10,'16:9':16/9,'a4p':1/Math.SQRT2,'a4l':Math.SQRT2};
function ratioOf(S,items){
  if(S.ratio==='custom')return clamp((+S.rW||1)/(+S.rH||1),.05,20);
  if(S.ratio==='media'){const m=items.find(i=>i&&i.w&&i.h);return m?m.w/m.h:16/10;}
  return RATIOS[S.ratio]||16/10;}
/* Columns and Float can give each shape its own media's shape */
function ratioEach(S,items){const r=ratioOf(S,items);return S.ratio==='media'?(it=>it&&it.w&&it.h?clamp(it.w/it.h,.05,20):r):(()=>r);}
/* the scale the presets were written at: px values in a preset are for a 1080 short side */
const unitOf=(W,H)=>Math.min(W,H)/1080;

/* ---------------- kinds ---------------- */
const kindOf=S=>{const l=S.layout||'one';return l==='row'||l==='column'?'line':l;};
const OWN=new Set(['columns','rows','frames','float','wall']);   /* kinds with their own clock */
/* which way things travel on each layout */
function dirOf(S){const d=S.dir||'left';
  if(S.layout==='row')return d==='right'?'right':'left';
  if(S.layout==='column'||S.layout==='grid')return d==='down'?'down':'up';
  return d;}
const horiz=d=>d==='left'||d==='right';
const sgnOf=d=>(d==='left'||d==='up')?1:-1;
const moveOf=S=>S.layout==='one'?(S.oneMove||'slide'):S.layout==='frames'?(S.fMove||'push'):(S.trackMove||'step');
const colsOf=S=>Math.max(1,Math.round(+S.cols)||3);
/* Columns and Rows (0.9): each strip's way (+1 down or right, −1 up or left) and speed (times round a loop; 0 holds
   it still). A pattern sets them all – Alternate, all one way, the same or varied speeds – or each strip has its own. */
const stripsOf=S=>S.layout==='columns'||S.layout==='rows';
function stripWay(S,c){const p=S.colDir||'alt';if(p==='own')return +S['sd'+c]<0?-1:1;return p==='up'?-1:p==='down'?1:(c%2?-1:1);}
function stripSpeed(S,c){const p=S.colSpeed||'same';if(p==='own'){const v=Math.round(+S['ss'+c]);return Number.isFinite(v)?clamp(v,0,8):1;}
  return p==='varied'&&moveOf(S)==='drift'?[2,3,4][c%3]:1;}
/* drifting, the slowest moving strip goes round once in Each shape × media – the rest are as many times faster */
function stripBase(S,C){if(moveOf(S)!=='drift')return 1;let m=0;for(let c=0;c<C;c++){const v=stripSpeed(S,c);if(v>0&&(!m||v<m))m=v;}return m||1;}
const framesOf=S=>Math.max(1,Math.round(+S.fCols)||1)*Math.max(1,Math.round(+S.fRows)||1);
const creepOf=S=>clamp((+S.creep||0)/100,0,.9);
/* captions fixed on the canvas belong to a shape at a time – not to the kinds with many at once */
const bleedOf=S=>S.layout==='one'&&S.oneFit==='bleed';
const capWhereOf=S=>{const w=S.capWhere||'under';if(OWN.has(S.layout)&&w==='fixed')return'under';if(bleedOf(S)&&(w==='under'||w==='above'))return'over';return w;};

/* ---------------- captions: rich text, tracking, kerning ---------------- */
const ROLES=['T','L','G'];
const FIELD={T:'title',L:'line',G:'tags'};
/* *words* take the accent colour; {#hex:words} take any colour */
function parseRich(str,accent){
  const out=[],re=/\{(#[0-9a-fA-F]{3,8})\s*:([^}]*)\}|\*([^*\n]+)\*/g;let m,last=0;
  while((m=re.exec(str))){if(m.index>last)out.push({t:str.slice(last,m.index),c:null});
    if(m[1])out.push({t:m[2],c:m[1]});else out.push({t:m[3],c:accent||null});last=re.lastIndex;}
  if(last<str.length)out.push({t:str.slice(last),c:null});return out;}
function parsePairs(s){const map=new Map();String(s||'').split(/[,;\n]+/).forEach(p=>{const m=p.trim().match(/^(\S\S)\s*([+-]?\d+(?:\.\d+)?)$/u);if(m)map.set(m[1],+m[2]);});return map;}
const mcache=new Map();
function adv(ctx,font,kern,s){const k=font+'\u0001'+kern+'\u0001'+s;let v=mcache.get(k);
  if(v===undefined){ctx.font=font;try{ctx.fontKerning=kern?'normal':'none';}catch(e){}v=ctx.measureText(s).width;mcache.set(k,v);if(mcache.size>60000)mcache.clear();}return v;}
const capCache=new Map();
function capHeight(ctx,font){const k='cap\u0001'+font;let v=mcache.get(k);if(v===undefined){ctx.font=font;const m=ctx.measureText('H');v=m.actualBoundingBoxAscent||0;mcache.set(k,v);}return v;}
function resetMeasure(){mcache.clear();capCache.clear();}

function styleOf(S,role,fonts){
  const f=fonts[S[role+'F']]||fonts.default||{family:'Helvetica Neue, Arial, sans-serif',weight:400,style:'normal'};
  const size=Math.max(1,+S[role+'S']||20);
  return{role,size,font:`${f.style||'normal'} ${f.weight||400} ${size}px ${f.family}`,track:+S[role+'Tr']||0,lead:+S[role+'Ld']||1.2,colour:S[role+'C']||'#111111',casing:S[role+'Case']||'as'};}
function caseOf(t,c){return c==='upper'?t.toUpperCase():c==='lower'?t.toLowerCase():t;}
/* one line of glyphs, each with its own x – tracking and kerning pairs exact to the unit */
function layLine(ctx,text,st,S,pairs){
  const segs=parseRich(text,S.accent),g=[];
  for(const sg of segs)for(const ch of Array.from(caseOf(sg.t,st.casing)))g.push({ch,c:sg.c});
  const kern=S.kern!==false,tr=st.track*st.size/1000;let x=0;
  for(let i=0;i<g.length;i++){const a=g[i],b=g[i+1],w=adv(ctx,st.font,kern,a.ch);a.x=x;a.w=w;
    let k=0;if(b){if(kern)k=adv(ctx,st.font,kern,a.ch+b.ch)-w-adv(ctx,st.font,kern,b.ch);k+=(pairs.get(a.ch+b.ch)||0)*st.size/1000+tr;}
    x+=w+k;}
  return{glyphs:g,width:Math.max(0,x)};}
/* an item's caption block: rows of text, then a row of tags, measured once and kept */
function capBlock(ctx,S,item,fonts){
  if(!item||item.placeholder)return null;
  const styles={};for(const r of ROLES)styles[r]=styleOf(S,r,fonts);
  const key=[ROLES.map(r=>styles[r].font+'|'+styles[r].track+'|'+styles[r].lead+'|'+styles[r].casing).join('/'),S.kern,S.pairs,S.accent,S.capGapL,S.gLook,item.title,item.line,item.tags].join('\u0002');
  let b=capCache.get(key);if(b)return b;
  const pairs=parsePairs(S.pairs),rows=[];let y=0,w=0,prev=false;
  for(const r of ['T','L']){const txt=String(item[FIELD[r]]||'');if(!txt.trim())continue;const st=styles[r];if(prev)y+=+S.capGapL||0;prev=true;
    for(const ln of txt.split('\n')){const L=layLine(ctx,ln,st,S,pairs),lh=st.size*st.lead,ch=capHeight(ctx,st.font);
      rows.push({kind:'text',st,glyphs:L.glyphs,width:L.width,y,h:lh,base:y+(lh-ch)/2+ch});y+=lh;w=Math.max(w,L.width);}}
  const tags=String(item.tags||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(tags.length){const st=styles.G;if(prev)y+=+S.capGapL||0;
    const look=S.gLook||'outline',padX=look==='plain'?0:st.size*.62,h=look==='plain'?st.size*st.lead:st.size*1.9,gap=look==='plain'?st.size*.9:st.size*.42,ch=capHeight(ctx,st.font);
    let x=0;const chips=tags.map(t=>{const L=layLine(ctx,t,st,S,pairs),cw=L.width+padX*2,c={glyphs:L.glyphs,width:L.width,x,w:cw,padX};x+=cw+gap;return c;});
    const rw=Math.max(0,x-gap);rows.push({kind:'tags',st,chips,width:rw,y,h,base:y+(h-ch)/2+ch,look});y+=h;w=Math.max(w,rw);}
  b={rows,w,h:y};capCache.set(key,b);if(capCache.size>4000)capCache.clear();return b;}
/* the overlay's text: lines measured to the font's cap height, so it sits on its margin optically */
function overlayBlock(ctx,S,fonts){
  const st=styleOf(S,'O',fonts),key=['ov',st.font,st.track,st.lead,st.casing,S.kern,S.pairs,S.accent,S.ovText].join('\u0002');
  let b=capCache.get(key);if(b)return b;
  const pairs=parsePairs(S.pairs),lines=String(S.ovText||'').split('\n').map(ln=>layLine(ctx,ln,st,S,pairs));
  b={st,lines,lh:st.size*st.lead,ch:capHeight(ctx,st.font),w:Math.max(0,...lines.map(l=>l.width))};capCache.set(key,b);return b;}

/* ---------------- the plan: when each stop holds and moves ---------------- */
/* Layers (0.6): in Slides a piece set to sit "on the one before" joins that slide rather than
   being one of its own – in front of it or behind, placed and scaled anywhere on it, in its own
   blend – and arrives, moves and leaves with it. */
function slidesOf(items){const bases=[],layers=new Map();
  for(const it of items){if(it&&it.join==='on'&&bases.length){const b=bases[bases.length-1];if(!layers.has(b))layers.set(b,[]);layers.get(b).push(it);}else bases.push(it);}
  return{bases,layers};}
/* where a clip is at a moment d after its shape arrives: from Start at, looping between Start
   and End when an end is set (0.6) */
function clipTime(it,d){const st=+it.start||0,en=+it.end||0;if(en>st+.05)return st+mod(d,en-st);return st+d;}
const opaOf=it=>it&&it.opa!=null&&it.opa!==''?clamp(+it.opa/100,0,1):1;
function gcd(a,b){while(b){[a,b]=[b,a%b];}return a;}
function stopsOf(S,N){if(S.layout==='grid'){const C=colsOf(S);return N/gcd(N,C)|0||1;}return Math.max(1,N);}
function arrivalOf(S,items,s){const it=items[mod(s,items.length)];const a=it&&it.arrive&&it.arrive!=='default'?it.arrive:null;return S.layout==='one'?(a||S.oneMove||'slide'):'slide';}
/* Float: how many places each depth has along the way, so nothing shows twice and the far
   layer's strip is long enough to cover the canvas */
function floatSetup(S,items,W,H){
  const N=Math.max(1,items.length),dir=S.dir||'up',vert=!horiz(dir),E=vert?H:W,X=vert?W:H;
  const depth=clamp((+S.depth||0)/100,0,1),Ld=depth>0.001?3:1,scales=[];
  for(let d=0;d<Ld;d++)scales.push(Ld===1?1:1-.6*depth*(Ld-1-d)/(Ld-1));
  const rf=ratioEach(S,items),b=X*clamp(+S.flSize||34,4,100)/100;
  const along=it=>{const r=rf(it);return vert?b/r:b*r;},list=items.length?items:[{}];
  const lens=list.map(along),aNear=lens.reduce((a,x)=>a+x,0)/lens.length,aMax=Math.max(...lens),sp=1+clamp(+S.spread||60,0,400)/100;
  const K=Math.max(Math.ceil(N/Ld),Math.ceil((E/scales[0]+aMax)/(aNear*sp))+1,2);
  return{vert,E,X,b,Ld,scales,K,aNear,aMax,sp,rf,along,dir};}
function plan(S,items){
  if((S.layout||'one')==='one'&&items.length&&!(items[0]&&items[0].placeholder))items=slidesOf(items).bases;
  const N=Math.max(1,items.length),mv=moveOf(S),lay=S.layout||'one';
  const hold=Math.max(0,+S.hold||0),dur=Math.max(0,+S.dur||0),cyc=hold+dur;
  const still=()=>Math.max(.5,+S.still||8);
  if(lay==='columns'||lay==='rows'){const C=colsOf(S),n=N;
    if(mv==='still')return{kind:'cstill',L:still(),n,C,N};
    if(mv==='drift')return{kind:'cdrift',L:Math.max(.2,n*(+S.spsh||2.5)*stripBase(S,C)),n,C,N};
    return{kind:'cstep',L:cyc>0?n*cyc:1,n,C,N,hold,dur};}
  if(lay==='wall'){const W=wallPlan(S,N);
    if(mv==='still')return Object.assign(W,{kind:'wstill',L:still()});
    if(mv==='drift')return Object.assign(W,{kind:'wdrift',L:Math.max(.2,W.n*(+S.spsh||2.5))});
    return Object.assign(W,{kind:'wstep',L:cyc>0?W.n*cyc:1,hold,dur});}
  if(lay==='frames'){const F=framesOf(S),n=N>F?N/gcd(N,F)|0:1;
    if(mv==='still'||n<2)return{kind:'fstill',L:still(),n,F,N};
    return{kind:'fstep',L:cyc>0?n*cyc:1,n,F,N,hold,dur};}
  if(lay==='float'){const [W,H]=canvasSize(S),K=floatSetup(S,items,W,H).K;
    if(mv==='still')return{kind:'flstill',L:still(),K,N};
    if(mv==='drift')return{kind:'fldrift',L:Math.max(.2,K*(+S.spsh||2.5)),K,N};
    return{kind:'flstep',L:cyc>0?K*cyc:1,K,N,hold,dur};}
  const stops=stopsOf(S,N);
  if(mv==='still')return{kind:'still',L:still(),stops,N};
  /* a single slide has nothing to change to: it just stays, its movement going in and back out */
  if(lay==='one'&&items.length===1&&!items[0].placeholder){const it=items[0],h=+it.hold>0?+it.hold:hold;return{kind:'still',L:Math.max(.5,h+dur),stops,N};}
  if(mv==='drift')return{kind:'drift',L:Math.max(.2,stops*(+S.spsh||2.5)),stops,N};
  const pull=S.after==='pull'&&S.layout!=='grid'&&N>1;
  const segs=[];let t=0;
  const moveLen=s=>arrivalOf(S,items,s)==='cut'?0:dur;
  const one=S.layout==='one',holdOf=s=>{const it=one?items[mod(s,N)]:null;return it&&+it.hold>0?+it.hold:hold;};
  for(let s=0;s<stops;s++){
    const hs=holdOf(s),h={k:'hold',s,t0:t,t1:t+hs};segs.push(h);t+=hs;
    if(s<stops-1||!pull){const d=moveLen(s+1);h.next=true;segs.push({k:'move',s,to:s+1,how:arrivalOf(S,items,s+1),t0:t,t1:t+d,i0:h.t0});t+=d;}
    else{const zo=Math.max(.05,+S.zOut||1),gh=Math.max(0,+S.gHold||0),zi=Math.max(.05,+S.zIn||1);
      segs.push({k:'out',s,t0:t,t1:t+zo});t+=zo;segs.push({k:'grid',s,t0:t,t1:t+gh});t+=gh;segs.push({k:'in',s:stops,t0:t,t1:t+zi});t+=zi;}}
  if(t<=0){segs.length=0;segs.push({k:'hold',s:0,t0:0,t1:1});t=1;}
  /* when each stop starts arriving: video in that shape plays from its start point then */
  const arrive=new Array(stops).fill(0);
  for(const g of segs){if(g.k==='move')arrive[mod(g.to,stops)]=g.to>=stops?g.t0-t:g.t0;if(g.k==='in')arrive[0]=g.t0-t;}
  /* …and when it's finished leaving: a slide's movement runs from one to the other */
  const gone=new Array(stops).fill(t);for(const g of segs)if(g.k==='move'||g.k==='out')gone[g.s]=g.t1;
  return{kind:'step',L:t,segs,stops,N,pull,arrive,gone,hold,dur};}
/* a segment-based plan: the segment at loop time tt */
function segAt(P,tt){let g=P.segs[P.segs.length-1];for(const x of P.segs)if(tt>=x.t0&&tt<x.t1){g=x;break;}return g;}
const glides=S=>S.layout==='row'||S.layout==='column'||S.layout==='grid';
/* the step path alone (no drifting while resting), unwrapped across loops so a shape that
   lags a beat behind reads the end of the last loop, not the start of this one */
function stepAbs(P,S,x){const k=Math.floor(x/P.L),tt=x-k*P.L,g=segAt(P,tt);let v;
  if(g.k==='hold')v=g.s;else if(g.k==='move'){const q=g.t1>g.t0?clamp((tt-g.t0)/(g.t1-g.t0),0,1):1;v=g.s+feel(S.feel)(q);}else v=P.stops;
  return v+k*P.stops;}
/* the gentle drift underneath, a stop each rest-and-move, so the two always meet at each stop */
function linAt(P,g,tt){const c=P.hold+P.dur;if(c<=0)return g.s;
  if(g.k==='hold')return g.next?g.s+(tt-g.t0)/c:g.s;if(g.k==='move')return g.s+(tt-g.i0)/c;return P.stops;}
/* where the camera is at time t */
function cameraAt(P,S,t){
  const tt=mod(t,P.L);
  if(P.kind!=='step'&&P.kind!=='drift')return{tt,p:0,z:0,k:0,seg:null};
  if(P.kind==='drift')return{tt,p:tt/(P.L/P.stops),z:0,k:0,seg:null};
  const g=segAt(P,tt);
  const k=g.t1>g.t0?clamp((tt-g.t0)/(g.t1-g.t0),0,1):1;
  const cr=glides(S)?creepOf(S):0;
  if(g.k==='hold'){const p=cr?(1-cr)*g.s+cr*linAt(P,g,tt):g.s;return{tt,p,z:0,k:0,seg:g};}
  if(g.k==='move'){const how=g.how,e=(how==='fade'||how==='dip'?FEEL.soft:how==='through'?THROUGH:feel(S.feel))(k);let p=(S.layout==='one'&&how!=='slide')?g.s:g.s+e;if(cr)p=(1-cr)*p+cr*linAt(P,g,tt);return{tt,p,z:0,k,e,seg:g,how};}
  const ez=feel(S.zFeel||'soft');
  if(g.k==='out')return{tt,p:g.s,z:ez(k),k,seg:g};
  if(g.k==='grid')return{tt,p:g.s,z:1,k,seg:g};
  return{tt,p:P.stops,z:1-ez(k),k,seg:g};}
/* Lag: each shape sets off a beat after the one ahead of it in the direction of travel, so
   the gaps open a touch mid-move and close as they land (Steve's phone-swipe reference,
   ~75 ms a shape). Ranks are counted from the leading edge; the reference stop only changes
   once every shape has landed, so nothing jumps. The beat is capped so the last one lands
   before the next move begins. */
function lagger(S,P,cam,ahead,behind){
  const lag=Math.max(0,+S.lag||0);if(!lag||P.kind!=='step'||!glides(S)||cam.z>0)return null;
  const g=cam.seg;if(!g||(g.k!=='hold'&&g.k!=='move'))return null;
  const hold=P.hold;if(hold<=0)return null;
  const R=ahead+behind,d=Math.min(lag,hold*.9/Math.max(1,R)),cr=creepOf(S);
  const tau=g.k==='hold'?cam.tt-g.t0:hold+(cam.tt-g.t0),ref=tau>=(d*R+hold)/2?g.s:g.s-1,lin=cr?linAt(P,g,cam.tt):0;
  return{d,at(k){const r=clamp(k-(ref-ahead),0,R),v=stepAbs(P,S,cam.tt-d*r);return cr?(1-cr)*v+cr*lin:v;}};}
/* a shape stepping on its own clock: rest, move with the feel, drifting a little throughout */
function cycPos(t,hold,dur,fn,cr){const c=hold+dur;if(c<=0)return 0;const k=Math.floor(t/c),tau=t-k*c;
  const e=tau<hold?0:dur>0?fn((tau-hold)/dur):1;return k+(1-cr)*e+cr*tau/c;}

/* ---------------- geometry ---------------- */
function capReserve(S,items,ctx,fonts){
  let capH=0;const where=capWhereOf(S),capOn=S.capOn&&(where==='under'||where==='above');
  if(S.capOn&&ctx)for(const it of items){const b=capBlock(ctx,S,it,fonts);if(b)capH=Math.max(capH,b.h);}
  return{capH,reserve:capOn&&capH>0?capH+(+S.capSpace||0):0};}
function geometry(S,items,ctx,fonts,W,H){
  const r=ratioOf(S,items),u=unitOf(W,H),lay=S.layout||'one';
  /* room for captions under or above each shape: the tallest block among the items */
  const {capH,reserve}=capReserve(S,items,ctx,fonts);
  const size=clamp(+S.size||80,1,300)/100,gap=Math.max(0,+S.gap||0);let sw,sh;
  if(lay==='one'){if(S.oneFit==='bleed'){sw=W;sh=H;}
    else{const bw=W,bh=Math.max(1,H-reserve),q=S.oneFit==='own'?bw/bh:r;if(bw/bh>q){sh=bh*size;sw=sh*q;}else{sw=bw*size;sh=sw/q;}}}
  else if(lay==='row'){sh=Math.max(1,H-reserve)*size;sw=sh*r;}
  else if(lay==='column'){sw=W*size;sh=sw/r;}
  else{const C=colsOf(S);sw=Math.max(1,(W*size-(C-1)*gap)/C);sh=sw/r;}
  const slotW=sw,slotH=sh+reserve,d=dirOf(S),hz=lay==='row'||(lay==='one'&&horiz(d));
  const pitch=lay==='one'?(hz?W:H):lay==='grid'?slotH+gap:(hz?slotW+gap:slotH+gap);
  /* True to scale: one scale for every slide, set by the one that fits least – so a smaller
     piece shows smaller. Fit each: every slide as big as the space allows. */
  let rel=null;
  if(lay==='one'&&S.oneFit==='own'&&S.ownScale==='true'){let k=Infinity;for(const it of items)if(it&&it.w&&it.h)k=Math.min(k,Math.min(sw/it.w,sh/it.h));
    if(isFinite(k))rel=it=>it&&it.w&&it.h?k/Math.min(sw/it.w,sh/it.h):1;}
  return{W,H,u,r,sw,sh,slotW,slotH,reserve,capH,pitch,gap,dir:d,sgn:sgnOf(d),hz,lay,rel,cx:W/2+(+S.nudgeX||0),cy:H/2+(+S.nudgeY||0)};}
/* a shape's rectangle inside its slot (the slot holds the caption too) */
function shapeIn(G,S,cx,cy,sc){const w=G.sw*sc,h=G.sh*sc,top=cy-G.slotH*sc/2;
  const y=S.capOn&&capWhereOf(S)==='above'&&G.reserve?top+G.reserve*sc:top;return{x:cx-w/2,y,w,h};}

/* ---------------- the scene: what's drawn where, at time t ---------------- */
function scene(S,items,ctx,fonts,W,H,t){
  const real=items.length>0;let list=real?items:placeholders(6,S),layers=null;
  if(S.layout==='one'&&real){const g=slidesOf(list);list=g.bases;if(g.layers.size)layers=g.layers;}
  if(OWN.has(S.layout)&&S.capWhere==='fixed')S=Object.assign({},S,{capWhere:capWhereOf(S)});
  if(bleedOf(S))S=Object.assign({},S,{radius:0,mat:0,edge:false,fit:'fill',nudgeX:0,nudgeY:0,shapeBg:S.bg});
  else if(S.layout==='one'&&S.oneFit==='own')S=Object.assign({},S,{fit:'fill',shapeBg:'rgba(0,0,0,0)'});
  const G=geometry(S,list,ctx,fonts,W,H),P=plan(S,list),cam=cameraAt(P,S,t),N=list.length,ops=[];
  /* how long since shape i arrived – video plays from its start point then */
  const since=i=>{if(P.kind!=='step'||S.layout==='grid')return cam.tt;const d=cam.tt-P.arrive[mod(i,P.stops)];return mod(d+P.L/2,P.L)-P.L/2;};
  const vt=i=>{const it=list[i];return it&&it.kind==='video'?clipTime(it,since(i)):null;};
  const reveal=i=>{if(!S.capOn||S.capReveal==='none'||P.kind!=='step')return 1;
    let d=cam.tt-P.arrive[mod(i,P.stops)];d=mod(d+P.L/2,P.L)-P.L/2;
    const seg=P.segs.find(g=>(g.k==='move'&&mod(g.to,P.stops)===mod(i,P.stops))||(g.k==='in'&&mod(i,P.stops)===0));
    const lead=seg?(seg.t1-seg.t0)*(seg.k==='in'?.7:.45):0;return clamp((d-lead)/Math.max(.05,+S.capRevealDur||.8),0,1);};
  const push=(i,rect,o)=>ops.push(Object.assign({i,item:list[i],rect,alpha:1,scale:1,rev:reveal(i),capAlpha:1,time:vt(i),since:since(i)},o||{}));
  if(stripsOf(S))columnsScene(S,P,cam,list,ctx,fonts,W,H,push);
  else if(S.layout==='frames')framesScene(S,P,cam,list,ctx,fonts,W,H,push);
  else if(S.layout==='float')floatScene(S,P,cam,list,W,H,push,ops);
  else if(S.layout==='wall')wallScene(S,P,cam,list,ctx,fonts,W,H,push);
  else if(cam.z>0&&P.kind==='step'&&S.layout!=='grid')pullScene(S,G,P,cam,N,push);
  else if(S.layout==='grid')gridScene(S,G,P,cam,N,push);
  else if(S.layout==='one'&&cam.seg&&cam.seg.k==='move'&&cam.how!=='slide')oneMove(S,G,cam,N,push);
  else trackScene(S,G,P,cam,N,push);
  if(S.layout==='one'){oneFinish(S,G,P,cam,ops);if(layers){const lo=layerOps(S,G,ops,layers);ops.length=0;ops.push(...lo);}}
  /* a caption fixed on the canvas: the current shape's, handing over during a move */
  let fixed=null;
  if(S.capOn&&capWhereOf(S)==='fixed'&&real&&!OWN.has(S.layout)){const cur=mod(Math.round(cam.p),N);
    if(cam.seg&&cam.seg.k==='move'){const a=mod(cam.seg.s,N),b=mod(cam.seg.to,N),k=cam.k;fixed=k<.5?{i:a,alpha:1-k*2,rev:1}:{i:b,alpha:1,rev:reveal(b)};}
    else fixed={i:cur,alpha:1-cam.z,rev:reveal(cur)};}
  return{W,H,G,P,cam,ops,fixed,list,real,S,mid:ops.mid};}
function placeholders(n,S){return Array.from({length:n},(_,i)=>({placeholder:true,n:i+1,kind:'image'}));}
function trackScene(S,G,P,cam,N,push){
  const ext=G.hz?G.W:G.H,slot=G.hz?G.slotW:G.slotH,span=Math.ceil((ext/2+slot)/G.pitch)+1,p=cam.p;
  const vis=Math.ceil((ext/2+slot/2)/G.pitch),lg=lagger(S,P,cam,vis,vis+1);
  for(let k=Math.floor(p)-span;k<=Math.ceil(p)+span;k++){
    const pk=lg?lg.at(k):p,off=(k-pk)*G.pitch*G.sgn,cx=G.hz?G.cx+off:G.cx,cy=G.hz?G.cy:G.cy+off;
    const r=shapeIn(G,S,cx,cy,1);if(r.x>=G.W||r.x+r.w<=0||r.y-G.reserve>=G.H||r.y+r.h+G.reserve<=0)continue;push(mod(k,N),r,{key:'t'+k,k});}}
function gridScene(S,G,P,cam,N,push){
  const C=colsOf(S),span=Math.ceil((G.H/2+G.slotH)/G.pitch)+1,p=cam.p;
  const vis=Math.ceil((G.H/2+G.slotH/2)/G.pitch),lg=lagger(S,P,cam,vis,vis+1);
  for(let r=Math.floor(p)-span;r<=Math.ceil(p)+span;r++){const pr=lg?lg.at(r):p,cy=G.cy+(r-pr)*G.pitch*G.sgn;
    for(let c=0;c<C;c++){const cx=G.cx+(c-(C-1)/2)*(G.slotW+G.gap);push(mod(r*C+c,N),shapeIn(G,S,cx,cy,1),{key:'g'+r+'.'+c});}}}
/* One: the moves that aren't a slide */
function oneMove(S,G,cam,N,push){
  const ka=cam.seg.s,kb=cam.seg.to,a=mod(ka,N),b=mod(kb,N),e=cam.e,how=cam.how,at=(sc,dx,dy)=>shapeIn(G,S,G.cx+(dx||0),G.cy+(dy||0),sc);
  /* when the next one won't cover this one exactly (slides of their own shapes, or this one
     grown bigger), this one fades as it goes, so nothing is left showing round the edge */
  const own=S.oneFit==='own',bleed=bleedOf(S);
  if(how==='fade'){push(a,at(1),{capAlpha:1-e,alpha:own?1-e:1,k:ka});push(b,at(1),{alpha:e,k:kb});return;}
  /* dip: out to the background, then the next up from it */
  if(how==='dip'){if(e<.5)push(a,at(1),{alpha:1-smooth(e*2),k:ka});else push(b,at(1),{alpha:smooth(e*2-1),k:kb});return;}
  /* wipe: a straight edge crosses the canvas, the next on one side of it, this one on the other */
  if(how==='wipe'){const W=G.W,H=G.H,d=G.dir,x=d==='left'?W*(1-e):W*e,y=d==='up'?H*(1-e):H*e;
    const [ca,cb]=d==='left'?[{x:0,y:0,w:x,h:H},{x,y:0,w:W-x,h:H}]:d==='right'?[{x,y:0,w:W-x,h:H},{x:0,y:0,w:x,h:H}]:d==='up'?[{x:0,y:0,w:W,h:y},{x:0,y,w:W,h:H-y}]:[{x:0,y,w:W,h:H-y},{x:0,y:0,w:W,h:y}];
    push(a,at(1),{clip:ca,k:ka});push(b,at(1),{clip:cb,k:kb});return;}
  /* open: a window opens from the middle, the next one behind it at its full size */
  if(how==='open'){const W=G.W,H=G.H,w=W*e,h=H*e,c={x:(W-w)/2,y:(H-h)/2,w,h};push(a,at(1),{clip:Object.assign({out:true},c),k:ka});if(e>0)push(b,at(1),{clip:c,k:kb});return;}
  /* through: the next one comes up from a small card in the middle – growing in scale, so it
     reads as distance, on its own curve – while this one is carried on past (Steve's reference, 5 Nov) */
  if(how==='through'){const s0=.12,sb=Math.pow(s0,1-e),sa=1+.18*e;push(a,at(sa),{scale:sa,alpha:bleed?1:1-smooth(e),k:ka});push(b,at(sb),{scale:sb,k:kb});return;}
  if(how==='cut'){push(e<1?a:b,at(1),{k:e<1?ka:kb});return;}
  if(how==='zoom'){push(a,at(1+.06*e),{scale:1+.06*e,capAlpha:1-e,alpha:bleed?1:1-smooth(e),k:ka});push(b,at(.9+.1*e),{alpha:smooth(e*1.15),scale:.9+.1*e,k:kb});return;}
  /* stack: the next one slides in over this one */
  const off=(1-e)*G.pitch*G.sgn;push(a,at(1-.04*e),{scale:1-.04*e,capAlpha:1-e,alpha:own?1-smooth(e):1,k:ka});push(b,at(1,G.hz?off:0,G.hz?0:off),{k:kb});}
/* One, last of all: slides that keep their own shape are fitted into their space, and each
   slide gets its movement – a zoom, a drift or parallax that runs evenly from the moment it
   starts arriving to the moment it's gone, so it never stops on screen. As it is moves the
   whole slide (nothing of the work is cropped); full bleed and In a shape move the picture
   inside its frame; parallax moves the frame one way and the picture the other. */
const KB_VARY=['in','drift','out','back'];
function moveKind(S,it,i){let m=it&&it.moves&&it.moves!=='default'?it.moves:(S.kb||'none');if(m==='vary')m=KB_VARY[mod(i,4)];if(m==='parallax'&&bleedOf(S))m='drift';return m;}
function uOf(P,cam,k){
  if(P.kind==='still')return(1-Math.cos(2*Math.PI*cam.tt/P.L))/2;   /* in and back out, so it joins up */
  if(P.kind!=='step'||!P.gone)return 0;const s=mod(k,P.stops),A=P.arrive[s]+P.L*Math.floor(k/P.stops);
  return clamp((cam.tt-A)/Math.max(1e-6,P.gone[s]-P.arrive[s]),0,1);}
function oneFinish(S,G,P,cam,ops){
  const own=S.oneFit==='own',amt=clamp((+S.kbAmt||0)/100,0,.5),where=capWhereOf(S),d=G.dir,hz=horiz(d),sg=sgnOf(d)*-1;
  for(const o of ops){if(o.k==null||!o.item)continue;let r=o.rect;o.key='s'+o.k;o.space=r;
    if(own&&o.item.w&&o.item.h){const q=o.item.w/o.item.h,f=G.rel?G.rel(o.item):1;let w=r.w,h=r.h;if(w/h>q)w=h*q;else h=w/q;w*=f;h*=f;
      const y=where==='under'&&S.capOn?r.y+r.h-h:where==='above'&&S.capOn?r.y:r.y+(r.h-h)/2;r={x:r.x+(r.w-w)/2,y,w,h};}
    /* As it is: this slide's own size and position, set in Media or by dragging it on the canvas */
    if(own){const z=clamp((+o.item.zm||100)/100,.2,4),w=r.w*z,h=r.h*z;r={x:r.x-(w-r.w)/2+(+o.item.ox||0)*G.u,y:r.y-(h-r.h)/2+(+o.item.oy||0)*G.u,w,h};o.whole=true;}
    const m=moveKind(S,o.item,o.i),pre=r;
    if(m!=='none'&&amt>0){const u=uOf(P,cam,o.k),off=(m==='back'?-sg:sg)*(u-.5)*amt;
      if(m==='in'||m==='out'){const z=1+amt*(m==='in'?u:1-u);if(own){const w=r.w*z,h=r.h*z;r={x:r.x-(w-r.w)/2,y:r.y-(h-r.h)/2,w,h};}else o.inner={s:z,x:0,y:0};}
      else if(m==='drift'||m==='back'){if(own)r=Object.assign({},r,hz?{x:r.x+off*r.w}:{y:r.y+off*r.h});else o.inner={s:1+amt,x:hz?off:0,y:hz?0:off};}
      else if(m==='parallax'){r=Object.assign({},r,hz?{x:r.x+off*r.w}:{y:r.y+off*r.h});o.inner={s:1+amt,x:hz?-off:0,y:hz?0:-off};}}
    /* the slide's movement as one move – layers on it go with it */
    let ms=r.w/Math.max(1e-6,pre.w),tx=(r.x+r.w/2)-(pre.x+pre.w/2),ty=(r.y+r.h/2)-(pre.y+pre.h/2);
    if(o.inner&&m!=='parallax'){ms*=o.inner.s;tx+=o.inner.x*r.w;ty+=o.inner.y*r.h;}
    o.mv={s:ms,cx:pre.x+pre.w/2,cy:pre.y+pre.h/2,tx,ty};
    o.rect=r;}}
/* each slide's layers, placed on its space: fitted inside it (or filling it), at their own size and
   offset (px at a 1080 short side, scaling with the slide), then moved with the slide's movement.
   Behind ones are drawn first; in a frame (full bleed, In a shape) they're clipped to it. */
function layerOps(S,G,ops,layers){const out=[],own=S.oneFit==='own',rad=Math.max(0,+S.radius||0);
  for(const o of ops){const L=o.k!=null&&o.item?layers.get(o.item):null;if(!L){out.push(o);continue;}
    const F=o.space||o.rect,fs=F.w/Math.max(1e-6,G.sw),m=o.mv;
    const mk=(it,j)=>{const q=it.w&&it.h?it.w/it.h:F.w/F.h,fill=it.lfit==='fill';let w=F.w,h=F.h;
      if(fill?(w/h<q):(w/h>q))w=h*q;else h=w/q;const z=clamp((+it.zm||100)/100,.05,4);w*=z;h*=z;
      let cx=F.x+F.w/2+(+it.ox||0)*G.u*fs,cy=F.y+F.h/2+(+it.oy||0)*G.u*fs;
      /* a build (0.9): it arrives on its own once the slide has landed – faded, risen or grown in, or cut – and leaves with it */
      const how=it.lin||'with';let a=o.alpha;
      if(how!=='with'){const lands=((o.item&&o.item.arrive&&o.item.arrive!=='default'?o.item.arrive:S.oneMove)==='cut')?0:Math.max(0,+S.dur||0);
        const t=(o.since||0)-lands-Math.max(0,it.lafter==null?.3:+it.lafter),e=how==='cut'?(t>=0?1:0):smooth(clamp(t/Math.max(.05,it.lover==null?.6:+it.lover),0,1));
        a*=e;if(how==="rise")cy+=(1-e)*.08*F.h;if(how==='grow'){const g=.88+.12*e;w*=g;h*=g;}}
      if(m){cx=(cx-m.cx)*m.s+m.cx+m.tx;cy=(cy-m.cy)*m.s+m.cy+m.ty;w*=m.s;h*=m.s;}
      return Object.assign({},o,{item:it,layer:true,lfill:fill,key:o.key+'.'+j,rect:{x:cx-w/2,y:cy-h/2,w,h},alpha:a,whole:true,inner:null,slide:null,mv:null,
        lclip:own?null:{x:o.rect.x,y:o.rect.y,w:o.rect.w,h:o.rect.h,r:rad*o.scale},time:it.kind==='video'?clipTime(it,o.since||0):null,capAlpha:0});};
    const back=L.filter(it=>it.place==='behind'),front=L.filter(it=>it.place!=='behind');
    back.forEach((it,j)=>out.push(mk(it,'b'+j)));out.push(back.length?Object.assign(o,{noFill:true}):o);front.forEach((it,j)=>out.push(mk(it,'f'+j)));}
  return out;}
/* pull back: the camera zooms out until every shape shows in a grid, then back in. Shapes that
   are neighbours both on the track and in the grid travel into place; the rest fade out where
   they were on the track and fade up in their place in the grid, so nothing flies across the
   shape you're looking at. The one in focus is drawn last.
   Stagger (0.4): each shape settles a beat after the one before, nearest the focus first –
   and those fading up drift in from a little further out – so the grid gathers rather than
   arriving as one sheet; coming back in, the furthest go first. Float: while they're pulled
   back, every shape drifts gently on its own path. Both are nothing at the start and end of
   the pull back, so it still joins the steps either side exactly. */
function pullScene(S,G,P,cam,N,push){
  const c=mod(cam.seg.k==='in'?0:cam.seg.s,N),gC=Math.max(1,Math.min(N,Math.round(S.gCols)||3)),gR=Math.ceil(N/gC),gg=Math.max(0,+S.gGap||0);
  const cr=i=>G.hz?[i%gC,Math.floor(i/gC)]:[Math.floor(i/gR),i%gR];
  const cols=G.hz?gC:Math.ceil(N/gR),rows=gR;
  const cell=i=>{const [col,row]=cr(i);let x=(col-(cols-1)/2)*(G.slotW+gg),y=(row-(rows-1)/2)*(G.slotH+gg);if(G.sgn<0){if(G.hz)x=-x;else y=-y;}return[x,y];};
  const gw=cols*G.slotW+(cols-1)*gg,gh=rows*G.slotH+(rows-1)*gg,fit=Math.min(1,Math.min(G.W/gw,G.H/gh)*clamp(+S.gSize||88,10,100)/100);
  const sc=Math.pow(fit,cam.z),u=fit<1?(1-sc)/(1-fit):cam.z,c0=cell(c),fx=lerp(0,-c0[0],u),fy=lerp(0,-c0[1],u);
  const at=(wx,wy)=>shapeIn(G,S,G.cx+(wx-fx)*sc,G.cy+(wy-fy)*sc,sc);
  /* each shape's own progress: the camera's, or a beat behind it */
  const stag=clamp((+S.gStag||0)/100,0,1)*.6,ez=feel(S.zFeel||'soft'),seg=cam.seg.k;
  let far=1e-6;for(let i=0;i<N;i++){const q=cell(i);far=Math.max(far,Math.hypot(q[0]-c0[0],q[1]-c0[1]));}
  const zOf=i=>{if(!stag||seg==='grid')return cam.z;const q=cell(i),r=Math.hypot(q[0]-c0[0],q[1]-c0[1])/far,d=stag*(seg==='out'?r:1-r),k=clamp((cam.k-d)/(1-stag),0,1);return seg==='out'?ez(k):1-ez(k);};
  const fl=clamp((+S.gFloat||0)/100,0,1)*.045*Math.min(G.slotW,G.slotH),tt=cam.tt;
  const drift=(i,z)=>{if(!fl)return[0,0];const a=hash(i*7+3,11)*6.283,b=hash(i*13+5,17)*6.283,w=z*fl;return[w*Math.sin(tt*2.03+a),w*Math.sin(tt*1.61+b)];};
  const later=[];let focus=null;
  for(let i=0;i<N;i++){const k=((i-c)%N+N+Math.floor(N/2))%N-Math.floor(N/2),tw=k*G.pitch*G.sgn,ci=cell(i),gx=ci[0]-c0[0],gy=ci[1]-c0[1];
    const [a0,b0]=cr(c),[a1,b1]=cr(i),along=G.hz?(b1===b0&&a1-a0===k):(a1===a0&&b1-b0===k);
    const kk=i===0?P.stops:i,zi=zOf(i),m=smooth(zi),[ox,oy]=drift(i,zi);
    if(i===c){const [fx2,fy2]=drift(i,cam.z);focus=[i,at(fx2,fy2),kk];continue;}
    if(along){later.push([i,at(lerp(G.hz?tw:0,gx,m)+ox,lerp(G.hz?0:tw,gy,m)+oy),{scale:sc,rev:1,k:kk}]);continue;}
    const out=smooth(zi/.3),up=smooth((zi-.08)/.5),spread=1+.35*stag/.6*(1-up);
    if(out<1)push(i,at(G.hz?tw:0,G.hz?0:tw),{scale:sc,rev:1,alpha:1-out,k:kk});
    if(up>0)push(i,at(gx*spread+ox,gy*spread+oy),{scale:sc,rev:1,alpha:up,k:kk});}
  for(const l of later)push(l[0],l[1],l[2]);
  if(focus)push(focus[0],focus[1],{scale:sc,rev:1,k:focus[2]});}

/* Columns and Rows: every strip a loop of all the media, each starting further along, running its own way
   (up or down; Rows left or right). Drifting, each goes round as many times a loop as its speed (Varied: two,
   three or four times in a loop twice as long, so their speeds differ about as Steve's reference does; Each its
   own: the slowest moving one sets the pace); stepping, its speed in shapes a move, each strip a beat out of step
   with the one before. Alternate strips can sit part of a shape along, so it reads as a wall rather than a grid.
   Columns are as wide as Width shares out across the canvas (more than 100% runs off the sides); Rows as tall. */
function columnsScene(S,P,cam,list,ctx,fonts,W,H,push){
  const rows=S.layout==='rows',C=P.C,n=P.n,N=list.length,size=clamp(+S.size||80,1,300)/100,gap=Math.max(0,+S.gap||0),rf=ratioEach(S,list);
  const {reserve}=capReserve(S,list,ctx,fonts),above=S.capOn&&capWhereOf(S)==='above'&&reserve;
  const A=rows?H:W,B=rows?W:H,cw=Math.max(1,(A*size-(C-1)*gap)/C),mid=rows?H/2+(+S.nudgeY||0):W/2+(+S.nudgeX||0),z0=rows?+S.nudgeX||0:+S.nudgeY||0;
  const cr=creepOf(S),fn=feel(S.feel),tt=cam.tt;
  for(let c=0;c<C;c++){
    const idx=[],pitch=[],cum=[];let T=0;
    const from=Math.round(N*c/C);
    for(let j=0;j<n;j++){const i=mod(from+j,N);idx.push(i);const p=(rows?Math.max(1,cw-reserve)*rf(list[i]):cw/rf(list[i])+reserve)+gap;cum.push(T);pitch.push(p);T+=p;}
    const way=stripWay(S,c),k=stripSpeed(S,c),at=x=>{const f=Math.floor(x),m=mod(f,n);return Math.floor(f/n)*T+cum[m]+(x-f)*pitch[m];};
    let s=0;
    if(P.kind==='cdrift')s=k*T*tt/P.L;
    else if(P.kind==='cstep'&&k>0)s=at(k*cycPos(tt-c*Math.max(0,+S.colLag||0),P.hold,P.dur,fn,cr));
    const phase=(c%2)*clamp(+S.colOff||0,0,100)/100*(T/n),x=mid+(c-(C-1)/2)*(cw+gap)-cw/2;
    for(let j=0;j<n;j++){const len=pitch[j]-gap;let y=mod(z0+gap/2+cum[j]+phase+way*s,T);while(y>-pitch[j])y-=T;
      for(y+=T;y<B;y+=T){if(y+pitch[j]<0)continue;
        const r=rows?{x:y,y:x+(above?reserve:0),w:len,h:Math.max(1,cw-reserve)}:{x,y:y+(above?reserve:0),w:cw,h:len-reserve};
        push(idx[j],r,{time:vtime(list[idx[j]],tt),rev:1,key:'c'+c+'.'+j});}}}}
const vtime=(it,t)=>it&&it.kind==='video'?clipTime(it,t):null;

/* Frames: the shapes stay where they are and the media changes inside them – pushed through,
   covered, faded or cut – each frame a beat after the last. With as many frames as media,
   nothing changes and the video just plays inside them. */
function framesGeo(S,list,ctx,fonts,W,H){
  const fc=Math.max(1,Math.round(+S.fCols)||1),fr=Math.max(1,Math.round(+S.fRows)||1),r=ratioOf(S,list),size=clamp(+S.size||80,1,300)/100,gap=Math.max(0,+S.gap||0);
  const {reserve}=capReserve(S,list,ctx,fonts),above=S.capOn&&capWhereOf(S)==='above'&&reserve;
  const sw=Math.max(1,Math.min((W*size-(fc-1)*gap)/fc,((H*size-(fr-1)*gap)/fr-reserve)*r)),sh=sw/r;
  const bw=fc*sw+(fc-1)*gap,bh=fr*(sh+reserve)+(fr-1)*gap,x0=W/2+(+S.nudgeX||0)-bw/2,y0=H/2+(+S.nudgeY||0)-bh/2;
  return{fc,fr,rect:f=>({x:x0+(f%fc)*(sw+gap),y:y0+Math.floor(f/fc)*(sh+reserve+gap)+(above?reserve:0),w:sw,h:sh})};}
function framesScene(S,P,cam,list,ctx,fonts,W,H,push){
  const G=framesGeo(S,list,ctx,fonts,W,H),F=G.fc*G.fr,N=list.length,tt=cam.tt,how=S.fMove||'push';
  const d=S.dir||'up',ux=d==='left'?-1:d==='right'?1:0,uy=d==='up'?-1:d==='down'?1:0;
  const revOf=a=>!S.capOn||S.capReveal==='none'?1:clamp((a-P.dur*.45)/Math.max(.05,+S.capRevealDur||.8),0,1);
  for(let f=0;f<F;f++){const r=G.rect(f);
    if(P.kind!=='fstep'){push(mod(f,N),r,{time:vtime(list[mod(f,N)],tt),rev:1});continue;}
    const c=P.hold+P.dur,t=mod(tt-f*Math.max(0,+S.fLag||0),P.L),k=Math.floor(t/c),tau=t-k*c,n=P.n;
    const ia=mod(f+F*mod(k,n),N),ib=mod(f+F*mod(k+1,n),N),sinceA=tau+P.dur,sinceB=tau-P.hold;
    if(tau<P.hold||how==='still'){push(ia,r,{time:vtime(list[ia],sinceA),rev:revOf(sinceA)});continue;}
    const e=P.dur>0?feel(S.feel)(clamp((tau-P.hold)/P.dur,0,1)):1,capA=1-smooth(e*2),capB=smooth(e*2-1);
    const tb=vtime(list[ib],sinceB),rb=revOf(sinceB);
    if(how==='cut'){push(ib,r,{time:tb,rev:rb});continue;}
    if(how==='fade'){push(ia,r,{time:vtime(list[ia],sinceA),capAlpha:capA});push(ib,r,{frame:false,alpha:e,time:tb,rev:rb,capAlpha:capB});continue;}
    const back=how==='cover'?.25:1;
    push(ia,r,{slide:[e*ux*back,e*uy*back],time:vtime(list[ia],sinceA),capAlpha:capA});
    push(ib,r,{frame:false,slide:[(e-1)*ux,(e-1)*uy],time:tb,rev:rb,capAlpha:capB});}}

/* Wall (0.8): a camera snapping across a wall of shapes – the columns and rows are yours. It moves
   rigidly, everything together and nothing lagging, the way the Snap was measured, along a path of
   moves: across, diagonally, in stairs or round a square. Each move is the same Snap (or any Feel),
   and it can keep drifting while it rests. The wall carries on past every edge; its media run in
   reading order, a row after the last, so the loop closes after as many moves as it takes the
   pattern to come round to where it began. */
const DIRV={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]};
const wallOf=S=>({C:clamp(Math.round(+S.wCols)||3,1,8),R:clamp(Math.round(+S.wRows)||2,1,6)});
/* where the shapes travel on each move of the path, in tiles: the way you've set, then a quarter turn */
function wallMoves(S){const u=DIRV[S.dir]||DIRV.up,v=[-u[1],u[0]],k=clamp(Math.round(+S.wStep)||1,1,4);
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],neg=a=>[-a[0],-a[1]],p=S.wPath;
  return(p==='diagonal'?[add(u,v)]:p==='stairs'?[u,v]:p==='square'?[u,v,neg(u),neg(v)]:[u]).map(a=>[a[0]*k,a[1]*k]);}
function wallPlan(S,N){
  const {C,R}=wallOf(S),steps=wallMoves(S).map(a=>[-a[0],-a[1]]),m=steps.length;
  /* a row after the last: one on, unless that would line the rows up exactly */
  const stride=N>1&&C%N===0?C+1:C,pre=[],cyc=[0,0];
  for(const st of steps){pre.push([cyc[0],cyc[1]]);cyc[0]+=st[0];cyc[1]+=st[1];}
  const brick=(+S.wOff||0)>0;let q=1;
  while(q<2*N+2&&!(mod(q*(cyc[0]+cyc[1]*stride),N)===0&&(!brick||(q*cyc[0])%2===0)))q++;
  return{C,R,N,stride,steps,pre,cyc,q,n:q*m,tot:[q*cyc[0],q*cyc[1]]};}
/* the camera's place on the wall in tiles, g moves along the path (any real g, either side of the loop) */
function wallAt(P,g){const n=P.n,k=Math.floor(g/n),f=g-k*n,j=Math.min(n-1,Math.floor(f)),m=P.steps.length,cj=Math.floor(j/m),pj=j%m,w=f-j,s=P.steps[pj],pr=P.pre[pj];
  return[k*P.tot[0]+cj*P.cyc[0]+pr[0]+w*s[0],k*P.tot[1]+cj*P.cyc[1]+pr[1]+w*s[1]];}
function wallCamera(P,S,tt){
  if(P.kind==='wstill')return[0,0];
  if(P.kind==='wdrift'){const g=tt/(P.L/P.n);if(P.steps.length===1)return wallAt(P,g);
    /* a path with corners is eased through them, so it never turns on a point */
    let x=0,y=0;const K=24,w=.6;for(let i=0;i<K;i++){const p=wallAt(P,g+((i+.5)/K-.5)*w);x+=p[0];y+=p[1];}return[x/K,y/K];}
  const c=P.hold+P.dur;if(c<=0)return wallAt(P,0);
  const s=Math.min(P.n-1,Math.floor(tt/c)),tau=tt-s*c,e=tau<P.hold?0:P.dur>0?feel(S.feel)(clamp((tau-P.hold)/P.dur,0,1)):1,cr=creepOf(S);
  return wallAt(P,s+(1-cr)*e+cr*tau/c);}
function wallGeo(S,list,ctx,fonts,W,H){
  const {C,R}=wallOf(S),r=ratioOf(S,list),size=clamp(+S.size||80,1,300)/100,gap=Math.max(0,+S.gap||0);
  const {reserve}=capReserve(S,list,ctx,fonts),above=!!(S.capOn&&capWhereOf(S)==='above'&&reserve);
  const sw=Math.max(1,Math.min((W*size-(C-1)*gap)/C,((H*size-(R-1)*gap)/R-reserve)*r)),sh=sw/r;
  return{C,R,sw,sh,reserve,above,px:sw+gap,py:sh+reserve+gap,
    x0:W/2+(+S.nudgeX||0)-(C*sw+(C-1)*gap)/2,y0:H/2+(+S.nudgeY||0)-(R*(sh+reserve)+(R-1)*gap)/2};}
function wallScene(S,P,cam,list,ctx,fonts,W,H,push){
  const G=wallGeo(S,list,ctx,fonts,W,H),N=list.length,tt=cam.tt,[cx,cy]=wallCamera(P,S,tt),brick=clamp((+S.wOff||0)/100,0,1);
  const c0=Math.floor((-G.sw-G.x0)/G.px+cx),c1=Math.ceil((W-G.x0)/G.px+cx);
  const r0=Math.floor((-G.sh-G.reserve-G.y0)/G.py+cy)-(brick?1:0),r1=Math.ceil((H-G.y0)/G.py+cy);
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
    const top=G.y0+(r-cy)*G.py+(brick&&mod(c,2)?brick*G.py:0),x=G.x0+(c-cx)*G.px;
    if(x>=W||x+G.sw<=0||top>=H||top+G.sh+G.reserve<=0)continue;
    const i=mod(c+r*P.stride,N);push(i,{x,y:top+(G.above?G.reserve:0),w:G.sw,h:G.sh},{time:vtime(list[i],tt),rev:1,key:'w'+c+'.'+r});}}

/* Float: shapes scattered across the canvas at three depths. Each depth is a strip as long
   as it is near – twice the size, twice the length – and every strip goes round once a
   loop, so nearer shapes are bigger and faster and everything still joins up. Stepping, the
   whole field moves together and can keep drifting while it rests (Steve's 4 Nov depth reference). */
function floatScene(S,P,cam,list,W,H,push,ops){
  const F=floatSetup(S,list,W,H),N=list.length,tt=cam.tt,seed=Math.round(+S.seed||0);
  let q=0;if(P.kind==='fldrift')q=tt/P.L;else if(P.kind==='flstep')q=cycPos(tt,P.hold,P.dur,feel(S.feel),creepOf(S))/P.K;
  const back=F.dir==='down'||F.dir==='right'?1:-1;
  for(let d=0;d<F.Ld;d++){
    if(d===F.Ld-1&&F.Ld>1)ops.mid=ops.length;
    const sc=F.scales[d],g=F.aNear*sc*F.sp,Y=F.K*g;
    for(let j=0;j<F.K;j++){const i=mod(j*F.Ld+d+seed,N),it=list[i],cross=F.b*sc,a=F.along(it)*sc;
      const jit=(hash(seed*31+d*7+1,j)-.5)*Math.max(0,g-a)*.8,xc=-cross*.12+hash(seed*17+d*5+3,j)*(F.X-cross*.76);
      let v=mod(j*g+jit+back*q*Y+a,Y)-a;if(v>=F.E)continue;
      const r=F.vert?{x:xc,y:v,w:cross,h:a}:{x:v,y:xc,w:a,h:cross};
      push(i,r,{time:vtime(it,tt),rev:1,depth:d,key:'l'+d+'.'+j});}}}

/* ---------------- drawing ---------------- */
function rr(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();if(ctx.roundRect&&r>0){ctx.roundRect(x,y,w,h,r);}else if(r>0){ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}else ctx.rect(x,y,w,h);}
function hash(a,b){let h=(a*374761393+b*668265263)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967296;}
function lum(hex){const m=String(hex||'').replace('#','');if(m.length<6)return .5;const v=i=>parseInt(m.slice(i,i+2),16)/255;return .2126*v(0)+.7152*v(2)+.0722*v(4);}
const BLEND={normal:'source-over',difference:'difference',multiply:'multiply',screen:'screen',overlay:'overlay',exclusion:'exclusion',darken:'darken',lighten:'lighten'};
/* an image placed in a box: filling it (cropped) or fitting inside it */
function placeImg(ctx,img,x,y,w,h,mode){const iw=img.w||img.width,ih=img.h||img.height;if(!iw||!ih)return;
  const s=mode==='fit'?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih),dw=iw*s,dh=ih*s;ctx.drawImage(img.src||img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
function paint(ctx,SC,S,fonts,opt){
  opt=opt||{};S=SC.S||S;const {W,H}=SC,k=opt.scale||1;
  ctx.save();ctx.setTransform(k,0,0,k,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(opt.transparent)ctx.clearRect(0,0,W,H);else{ctx.fillStyle=S.bg||'#F5F5F3';ctx.fillRect(0,0,W,H);}
  if(opt.bgImg&&S.bgImgOn!==false){ctx.save();ctx.globalAlpha=clamp(S.bgImgA==null?1:+S.bgImgA/100,0,1);placeImg(ctx,opt.bgImg,0,0,W,H,S.bgFit);ctx.restore();}
  const rad=Math.max(0,+S.radius||0),mat=Math.max(0,+S.mat||0),matR=Math.max(0,+S.matR||0);let ovDone=false;
  SC.ops.forEach((o,oi)=>{
    if(oi===SC.mid&&S.ovZ==='mid'){drawOverlay(ctx,S,SC,fonts,opt);ovDone=true;}
    if(o.alpha<=0)return;
    if(o.layer){drawLayer(ctx,o,opt,W,H);return;}
    const r=o.rect,sc=o.scale,m=Math.min(mat*sc,r.w/3,r.h/3);
    const inn=m>0?{x:r.x+m,y:r.y+m,w:r.w-2*m,h:r.h-2*m}:r,iR=m>0?matR*sc:rad*sc;
    const mr=o.slide?{x:inn.x+o.slide[0]*inn.w,y:inn.y+o.slide[1]*inn.h,w:inn.w,h:inn.h}:inn;
    ctx.save();if(o.clip){const c=o.clip;ctx.beginPath();if(c.out){ctx.rect(0,0,W,H);ctx.rect(c.x,c.y,c.w,c.h);ctx.clip('evenodd');}else{ctx.rect(c.x,c.y,c.w,c.h);ctx.clip();}}
    ctx.save();ctx.globalAlpha=clamp(o.alpha,0,1);
    if(m>0&&o.frame!==false){rr(ctx,r.x,r.y,r.w,r.h,rad*sc);ctx.fillStyle=S.matC||'#FFFFFF';ctx.fill();}
    rr(ctx,inn.x,inn.y,inn.w,inn.h,iR);ctx.save();ctx.clip();
    if(o.inner){const cx=mr.x+mr.w/2,cy=mr.y+mr.h/2;ctx.translate(cx+o.inner.x*mr.w,cy+o.inner.y*mr.h);ctx.scale(o.inner.s,o.inner.s);ctx.translate(-cx,-cy);}
    /* its own blend and opacity (0.6): drawn straight onto what's beneath, without the shape's colour */
    const it=o.item,bl=!it.placeholder&&it.blend&&it.blend!=='normal'?BLEND[it.blend]:null,op=it.placeholder?1:opaOf(it);
    if(!(bl||op<1||o.noFill)){ctx.fillStyle=it.placeholder?(lum(S.bg)>.5?'#d9d8d4':'#3a3940'):(S.shapeBg||'#e6e6e3');ctx.fillRect(mr.x,mr.y,mr.w,mr.h);}
    if(o.item.placeholder){ctx.fillStyle=lum(S.bg)>.5?'#8f8d88':'#77757f';ctx.font=`400 ${Math.max(8,mr.h*.18)}px "Inter Tight", Helvetica, Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(o.item.n),mr.x+mr.w/2,mr.y+mr.h/2);ctx.textAlign='left';ctx.textBaseline='alphabetic';}
    else if(opt.media){if(bl||op<1){ctx.save();ctx.globalAlpha*=op;if(bl)ctx.globalCompositeOperation=bl;opt.media(ctx,o,mr,S.fit==='fit'?'contain':'cover');ctx.restore();}
      else opt.media(ctx,o,mr,S.fit==='fit'?'contain':'cover');}
    ctx.restore();
    if(S.edge&&(+S.edgeW||0)>0&&o.frame!==false){const lw=(+S.edgeW)*sc;ctx.lineWidth=lw;ctx.strokeStyle=S.edgeC||'#000000';rr(ctx,r.x+lw/2,r.y+lw/2,r.w-lw,r.h-lw,Math.max(0,rad*sc-lw/2));ctx.stroke();}
    ctx.restore();
    if(S.capOn&&capWhereOf(S)!=='fixed'&&!o.item.placeholder){const b=capBlock(ctx,S,o.item,fonts);if(b)drawCap(ctx,S,b,o,r,SC);}
    ctx.restore();});
  if(SC.fixed&&SC.fixed.alpha>0){const it=SC.list[SC.fixed.i],b=capBlock(ctx,S,it,fonts);if(b)drawFixed(ctx,S,b,SC.fixed,SC);}
  if(!ovDone)drawOverlay(ctx,S,SC,fonts,opt);
  ctx.restore();}
/* a layer on a slide: clipped to the slide's frame (not As it is), to its own box if it fills it,
   in its own blend and opacity */
function drawLayer(ctx,o,opt,W,H){const it=o.item;if(!opt.media||it.placeholder)return;
  ctx.save();if(o.clip){const c=o.clip;ctx.beginPath();if(c.out){ctx.rect(0,0,W,H);ctx.rect(c.x,c.y,c.w,c.h);ctx.clip('evenodd');}else{ctx.rect(c.x,c.y,c.w,c.h);ctx.clip();}}
  const f=o.lclip;if(f){rr(ctx,f.x,f.y,f.w,f.h,f.r);ctx.clip();}
  if(o.lfill){ctx.beginPath();ctx.rect(o.rect.x,o.rect.y,o.rect.w,o.rect.h);ctx.clip();}
  ctx.globalAlpha=clamp(o.alpha*opaOf(it),0,1);ctx.globalCompositeOperation=BLEND[it.blend]||'source-over';
  opt.media(ctx,o,o.rect,o.lfill?'cover':'contain');ctx.restore();}
/* text or an image over everything, placed on a 3 × 3 grid with a margin, in a blend mode */
function drawOverlay(ctx,S,SC,fonts,opt){
  if(!S.ovOn)return;const {W,H}=SC,pos=S.ovPos||'mc',v=pos[0],h=pos[1],m=+S.ovM||0,nx=+S.ovX||0,ny=+S.ovY||0;
  ctx.save();ctx.globalAlpha=clamp(S.ovA==null?1:+S.ovA/100,0,1);ctx.globalCompositeOperation=BLEND[S.ovBlend]||'source-over';
  const hx=w=>(h==='l'?m:h==='r'?W-m-w:(W-w)/2)+nx;
  if(S.ovKind==='image'){const img=opt.ovImg;if(img&&(img.w||img.width)){const iw=img.w||img.width,ih=img.h||img.height,w=W*clamp(+S.ovW||40,1,200)/100,hh=w*ih/iw;
      const y=(v==='t'?m:v==='b'?H-m-hh:(H-hh)/2)+ny;ctx.drawImage(img.src||img,hx(w),y,w,hh);}}
  else if(String(S.ovText||'').trim()){const b=overlayBlock(ctx,S,fonts),n=b.lines.length,hb=b.ch+(n-1)*b.lh;
    const base0=(v==='t'?m+b.ch:v==='b'?H-m-(n-1)*b.lh:(H-hb)/2+b.ch)+ny;
    ctx.font=b.st.font;try{ctx.fontKerning='none';}catch(e){}ctx.textBaseline='alphabetic';ctx.textAlign='left';
    b.lines.forEach((L,j)=>{const x=hx(L.width),y=base0+j*b.lh;for(const g of L.glyphs){if(!g.ch.trim())continue;ctx.fillStyle=g.c||b.st.colour;ctx.fillText(g.ch,x+g.x,y);}});}
  ctx.restore();}
function capOrigin(S,b,r,sc){const sp=(+S.capSpace||0)*sc,al=S.capAlign||'left',bw=b.w*sc,where=capWhereOf(S);let x,y;
  if(where==='over'){x=al==='left'?r.x+sp:al==='right'?r.x+r.w-sp-bw:r.x+(r.w-bw)/2;y=r.y+r.h-sp-b.h*sc;}
  else if(where==='above'){x=al==='left'?r.x:al==='right'?r.x+r.w-bw:r.x+(r.w-bw)/2;y=r.y-sp-b.h*sc;}
  else{x=al==='left'?r.x:al==='right'?r.x+r.w-bw:r.x+(r.w-bw)/2;y=r.y+r.h+sp;}
  return[x+(+S.capX||0)*sc,y+(+S.capY||0)*sc];}
function drawCap(ctx,S,b,o,r,SC){const sc=o.scale,[x,y]=capOrigin(S,b,r,sc);drawBlock(ctx,S,b,x,y,sc,clamp(o.alpha*o.capAlpha,0,1),o.rev,o.i,SC.cam.tt);}
function drawFixed(ctx,S,b,f,SC){const {W,H}=SC,m=+S.capMargin||0,al=S.capAlign||'left';
  const x=(al==='left'?m:al==='right'?W-m-b.w:(W-b.w)/2)+(+S.capX||0),y=(S.capV==='top'?m:H-m-b.h)+(+S.capY||0);
  drawBlock(ctx,S,b,x,y,1,clamp(f.alpha,0,1),f.rev,f.i,SC.cam.tt);}
function drawBlock(ctx,S,b,x0,y0,sc,alpha,rev,seed,tt){
  if(alpha<=0)return;const mode=S.capReveal||'none',al=S.capAlign||'left';
  ctx.save();ctx.textBaseline='alphabetic';ctx.textAlign='left';
  b.rows.forEach((row,j)=>{let a=alpha,dy=0,q=1;
    if(rev<1){if(mode==='fade')a*=smooth(rev);
      else if(mode==='rise'){const rr2=clamp((rev-j*.12)/.64,0,1),e=FEEL.inertia(rr2);a*=smooth(rr2*1.4);dy=(1-e)*row.st.size*.7;}
      else if(mode==='scramble')q=clamp((rev-j*.08)/.84,0,1);}
    if(a<=0)return;ctx.globalAlpha=a;const st=row.st,size=st.size*sc;
    const fnt=st.font.replace(/(\d+(?:\.\d+)?)px/,()=>size+'px');ctx.font=fnt;try{ctx.fontKerning='none';}catch(e){}
    const rx=al==='left'?0:al==='right'?(b.w-row.width):(b.w-row.width)/2;
    const draw=(gl,ox,oy,colour)=>{const n=gl.length,pool=gl.filter(g=>g.ch.trim()).map(g=>g.ch);
      for(let i=0;i<n;i++){const g=gl[i];if(!g.ch.trim())continue;let ch=g.ch;
        if(q<1){const th=.12+.78*i/Math.max(1,n);if(q<th*.55)continue;if(q<th&&pool.length)ch=pool[Math.floor(hash(seed*977+i,Math.floor(tt*24))*pool.length)];}
        ctx.fillStyle=g.c||colour;ctx.fillText(ch,ox+g.x*sc,oy);}};
    const by=y0+(row.base+dy)*sc;
    if(row.kind==='text')draw(row.glyphs,x0+rx*sc,by,st.colour);
    else for(const c of row.chips){const cx=x0+(rx+c.x)*sc,cy=y0+(row.y+dy)*sc,cw=c.w*sc,ch=row.h*sc;
      if(row.look==='outline'){ctx.lineWidth=Math.max(1,st.size/16)*sc;ctx.strokeStyle=st.colour;rr(ctx,cx+ctx.lineWidth/2,cy+ctx.lineWidth/2,cw-ctx.lineWidth,ch-ctx.lineWidth,ch/2);ctx.stroke();}
      else if(row.look==='fill'){ctx.fillStyle=S.gFill||'#E4E4E0';rr(ctx,cx,cy,cw,ch,ch/2);ctx.fill();}
      draw(c.glyphs,cx+c.padX*sc,by,st.colour);}});
  ctx.restore();}

return{stripWay,stripSpeed,stripBase,stripsOf,FEEL,feel,SIZES,RATIOS,slidesOf,clipTime,BLEND,canvasSize,ratioOf,unitOf,dirOf,moveOf,kindOf,capWhereOf,moveKind,plan,cameraAt,wallCamera,wallMoves,geometry,scene,paint,capBlock,overlayBlock,parseRich,parsePairs,layLine,resetMeasure,even,clamp};
})();
