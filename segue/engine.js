/* Segue – engine. Given the settings, the media and a moment in the loop, it works out
   where every shape is and draws the frame. No DOM beyond the canvas it's handed: the app
   owns the media (images as ImageBitmaps, video as <video> elements it seeks or plays).

   The model, in one breath: shapes sit on a track (One, Row, Column) or in a scrolling Grid.
   A camera moves along the track a stop at a time (hold, then move, with a feel) or drifts
   without stopping. After the last stop it either carries on round, or pulls back to show
   every shape in a grid and comes back in to the first. Everything loops exactly. */
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
const FEEL={glide:bezier(.65,0,.35,1),inertia:bezier(.35,.85,.2,1),spring,linear:t=>clamp(t,0,1)};
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
/* the scale the presets were written at: px values in a preset are for a 1080 short side */
const unitOf=(W,H)=>Math.min(W,H)/1080;

/* which way things travel on each layout */
function dirOf(S){const d=S.dir||'left';
  if(S.layout==='row')return d==='right'?'right':'left';
  if(S.layout==='column'||S.layout==='grid')return d==='down'?'down':'up';
  return d;}
const horiz=d=>d==='left'||d==='right';
const sgnOf=d=>(d==='left'||d==='up')?1:-1;
const moveOf=S=>S.layout==='one'?(S.oneMove||'slide'):(S.trackMove||'step');

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

/* ---------------- the plan: when each stop holds and moves ---------------- */
function gcd(a,b){while(b){[a,b]=[b,a%b];}return a;}
function stopsOf(S,N){if(S.layout==='grid'){const C=Math.max(1,Math.round(S.cols)||3);return N/gcd(N,C)|0||1;}return Math.max(1,N);}
function arrivalOf(S,items,s){const it=items[mod(s,items.length)];const a=it&&it.arrive&&it.arrive!=='default'?it.arrive:null;return S.layout==='one'?(a||S.oneMove||'slide'):'slide';}
function plan(S,items){
  const N=Math.max(1,items.length),mv=moveOf(S),stops=stopsOf(S,N);
  if(mv==='still')return{kind:'still',L:Math.max(.5,+S.still||8),stops,N};
  if(mv==='drift')return{kind:'drift',L:Math.max(.2,stops*(+S.spsh||2.5)),stops,N};
  const hold=Math.max(0,+S.hold||0),dur=Math.max(0,+S.dur||0);
  const pull=S.after==='pull'&&S.layout!=='grid'&&N>1;
  const segs=[];let t=0;
  const moveLen=s=>arrivalOf(S,items,s)==='cut'?0:dur;
  for(let s=0;s<stops;s++){
    segs.push({k:'hold',s,t0:t,t1:t+hold});t+=hold;
    if(s<stops-1||!pull){const d=moveLen(s+1);segs.push({k:'move',s,to:s+1,how:arrivalOf(S,items,s+1),t0:t,t1:t+d});t+=d;}
    else{const zo=Math.max(.05,+S.zOut||1),gh=Math.max(0,+S.gHold||0),zi=Math.max(.05,+S.zIn||1);
      segs.push({k:'out',s,t0:t,t1:t+zo});t+=zo;segs.push({k:'grid',s,t0:t,t1:t+gh});t+=gh;segs.push({k:'in',s:stops,t0:t,t1:t+zi});t+=zi;}}
  if(t<=0){segs.length=0;segs.push({k:'hold',s:0,t0:0,t1:1});t=1;}
  /* when each stop starts arriving: video in that shape plays from its start point then */
  const arrive=new Array(stops).fill(0);
  for(const g of segs){if(g.k==='move')arrive[mod(g.to,stops)]=g.to>=stops?g.t0-t:g.t0;if(g.k==='in')arrive[0]=g.t0-t;}
  return{kind:'step',L:t,segs,stops,N,pull,arrive};}
/* where the camera is at time t */
function cameraAt(P,S,t){
  const tt=mod(t,P.L);
  if(P.kind==='still')return{tt,p:0,z:0,k:0,seg:null};
  if(P.kind==='drift')return{tt,p:tt/(P.L/P.stops),z:0,k:0,seg:null};
  let g=P.segs[P.segs.length-1];for(const x of P.segs)if(tt>=x.t0&&tt<x.t1){g=x;break;}
  const k=g.t1>g.t0?clamp((tt-g.t0)/(g.t1-g.t0),0,1):1;
  if(g.k==='hold')return{tt,p:g.s,z:0,k:0,seg:g};
  if(g.k==='move'){const how=g.how,e=feel(S.feel)(k);return{tt,p:(S.layout==='one'&&how!=='slide')?g.s:g.s+e,z:0,k,e,seg:g,how};}
  const ez=feel(S.zFeel||'glide');
  if(g.k==='out')return{tt,p:g.s,z:ez(k),k,seg:g};
  if(g.k==='grid')return{tt,p:g.s,z:1,k,seg:g};
  return{tt,p:P.stops,z:1-ez(k),k,seg:g};}

/* ---------------- geometry ---------------- */
function geometry(S,items,ctx,fonts,W,H){
  const r=ratioOf(S,items),u=unitOf(W,H),lay=S.layout||'one';
  /* room for captions under or above each shape: the tallest block among the items */
  let capH=0;const capOn=S.capOn&&(S.capWhere==='under'||S.capWhere==='above');
  if(S.capOn&&ctx)for(const it of items){const b=capBlock(ctx,S,it,fonts);if(b)capH=Math.max(capH,b.h);}
  const reserve=capOn&&capH>0?capH+(+S.capSpace||0):0;
  const size=clamp(+S.size||80,1,300)/100,gap=Math.max(0,+S.gap||0);let sw,sh;
  if(lay==='one'){const bw=W,bh=Math.max(1,H-reserve);if(bw/bh>r){sh=bh*size;sw=sh*r;}else{sw=bw*size;sh=sw/r;}}
  else if(lay==='row'){sh=Math.max(1,H-reserve)*size;sw=sh*r;}
  else if(lay==='column'){sw=W*size;sh=sw/r;}
  else{const C=Math.max(1,Math.round(S.cols)||3);sw=Math.max(1,(W*size-(C-1)*gap)/C);sh=sw/r;}
  const slotW=sw,slotH=sh+reserve,d=dirOf(S),hz=lay==='row'||(lay==='one'&&horiz(d));
  const pitch=lay==='one'?(hz?W:H):lay==='grid'?slotH+gap:(hz?slotW+gap:slotH+gap);
  return{W,H,u,r,sw,sh,slotW,slotH,reserve,capH,pitch,gap,dir:d,sgn:sgnOf(d),hz,lay,cx:W/2+(+S.nudgeX||0),cy:H/2+(+S.nudgeY||0)};}
/* a shape's rectangle inside its slot (the slot holds the caption too) */
function shapeIn(G,S,cx,cy,sc){const w=G.sw*sc,h=G.sh*sc,top=cy-G.slotH*sc/2;
  const y=S.capOn&&S.capWhere==='above'&&G.reserve?top+G.reserve*sc:top;return{x:cx-w/2,y,w,h};}

/* ---------------- the scene: what's drawn where, at time t ---------------- */
function scene(S,items,ctx,fonts,W,H,t){
  const real=items.length>0,list=real?items:placeholders(6,S);
  const G=geometry(S,list,ctx,fonts,W,H),P=plan(S,list),cam=cameraAt(P,S,t),N=list.length,ops=[];
  const vt=i=>{const it=list[i];if(!it||it.kind!=='video')return null;const st=+it.start||0;
    if(P.kind!=='step'||S.layout==='grid')return st+cam.tt;
    let d=cam.tt-P.arrive[mod(i,P.stops)];d=mod(d+P.L/2,P.L)-P.L/2;return st+d;};
  const reveal=i=>{if(!S.capOn||S.capReveal==='none'||P.kind!=='step')return 1;
    let d=cam.tt-P.arrive[mod(i,P.stops)];d=mod(d+P.L/2,P.L)-P.L/2;
    const seg=P.segs.find(g=>(g.k==='move'&&mod(g.to,P.stops)===mod(i,P.stops))||(g.k==='in'&&mod(i,P.stops)===0));
    const lead=seg?(seg.t1-seg.t0)*(seg.k==='in'?.7:.45):0;return clamp((d-lead)/Math.max(.05,+S.capRevealDur||.8),0,1);};
  const push=(i,rect,o)=>ops.push(Object.assign({i,item:list[i],rect,alpha:1,scale:1,rev:reveal(i),capAlpha:1,time:vt(i)},o||{}));
  if(cam.z>0&&P.kind==='step'&&S.layout!=='grid')pullScene(S,G,P,cam,N,push);
  else if(S.layout==='grid')gridScene(S,G,cam,N,push);
  else if(S.layout==='one'&&cam.seg&&cam.seg.k==='move'&&cam.how!=='slide')oneMove(S,G,cam,N,push);
  else trackScene(S,G,cam,N,push);
  /* a caption fixed on the canvas: the current shape's, handing over during a move */
  let fixed=null;
  if(S.capOn&&S.capWhere==='fixed'&&real){const cur=mod(Math.round(cam.p),N);
    if(cam.seg&&cam.seg.k==='move'){const a=mod(cam.seg.s,N),b=mod(cam.seg.to,N),k=cam.k;fixed=k<.5?{i:a,alpha:1-k*2,rev:1}:{i:b,alpha:1,rev:reveal(b)};}
    else fixed={i:cur,alpha:1-cam.z,rev:reveal(cur)};}
  return{W,H,G,P,cam,ops,fixed,list,real};}
function placeholders(n,S){return Array.from({length:n},(_,i)=>({placeholder:true,n:i+1,kind:'image'}));}
function trackScene(S,G,cam,N,push){
  const ext=G.hz?G.W:G.H,slot=G.hz?G.slotW:G.slotH,span=Math.ceil((ext/2+slot)/G.pitch)+1,p=cam.p;
  for(let k=Math.floor(p)-span;k<=Math.ceil(p)+span;k++){
    const off=(k-p)*G.pitch*G.sgn,cx=G.hz?G.cx+off:G.cx,cy=G.hz?G.cy:G.cy+off;
    const r=shapeIn(G,S,cx,cy,1);if(r.x>G.W||r.x+r.w<0||r.y-G.reserve>G.H||r.y+r.h+G.reserve<0)continue;push(mod(k,N),r);}}
function gridScene(S,G,cam,N,push){
  const C=Math.max(1,Math.round(S.cols)||3),span=Math.ceil((G.H/2+G.slotH)/G.pitch)+1,p=cam.p;
  for(let r=Math.floor(p)-span;r<=Math.ceil(p)+span;r++){const cy=G.cy+(r-p)*G.pitch*G.sgn;
    for(let c=0;c<C;c++){const cx=G.cx+(c-(C-1)/2)*(G.slotW+G.gap);push(mod(r*C+c,N),shapeIn(G,S,cx,cy,1));}}}
/* One: the moves that aren't a slide */
function oneMove(S,G,cam,N,push){
  const a=mod(cam.seg.s,N),b=mod(cam.seg.to,N),e=cam.e,how=cam.how,at=(sc,dx,dy)=>shapeIn(G,S,G.cx+(dx||0),G.cy+(dy||0),sc);
  if(how==='fade'){push(a,at(1),{capAlpha:1-e});push(b,at(1),{alpha:e});return;}
  if(how==='cut'){push(e<1?a:b,at(1));return;}
  if(how==='zoom'){push(a,at(1+.06*e),{scale:1+.06*e,capAlpha:1-e});push(b,at(.9+.1*e),{alpha:smooth(e*1.15),scale:.9+.1*e});return;}
  /* stack: the next one slides in over this one */
  const off=(1-e)*G.pitch*G.sgn;push(a,at(1-.04*e),{scale:1-.04*e,capAlpha:1-e});push(b,at(1,G.hz?off:0,G.hz?0:off));}
/* pull back: the camera zooms out until every shape shows in a grid, then back in. Shapes that
   are neighbours both on the track and in the grid stay put and the camera simply moves; the
   rest fade out where they were on the track and fade up in their place in the grid, so
   nothing flies across the shape you're looking at. The one in focus is drawn last. */
function pullScene(S,G,P,cam,N,push){
  const c=mod(cam.seg.k==='in'?0:cam.seg.s,N),gC=Math.max(1,Math.min(N,Math.round(S.gCols)||3)),gR=Math.ceil(N/gC),gg=Math.max(0,+S.gGap||0);
  const cr=i=>G.hz?[i%gC,Math.floor(i/gC)]:[Math.floor(i/gR),i%gR];
  const cols=G.hz?gC:Math.ceil(N/gR),rows=gR;
  const cell=i=>{const [col,row]=cr(i);let x=(col-(cols-1)/2)*(G.slotW+gg),y=(row-(rows-1)/2)*(G.slotH+gg);if(G.sgn<0){if(G.hz)x=-x;else y=-y;}return[x,y];};
  const gw=cols*G.slotW+(cols-1)*gg,gh=rows*G.slotH+(rows-1)*gg,fit=Math.min(1,Math.min(G.W/gw,G.H/gh)*clamp(+S.gSize||88,10,100)/100);
  const sc=Math.pow(fit,cam.z),u=fit<1?(1-sc)/(1-fit):cam.z,c0=cell(c),fx=lerp(0,-c0[0],u),fy=lerp(0,-c0[1],u),m=smooth(cam.z);
  const at=(wx,wy)=>shapeIn(G,S,G.cx+(wx-fx)*sc,G.cy+(wy-fy)*sc,sc);
  const out=smooth(cam.z/.3),up=smooth((cam.z-.08)/.5),later=[];let focus=null;
  for(let i=0;i<N;i++){const k=((i-c)%N+N+Math.floor(N/2))%N-Math.floor(N/2),tw=k*G.pitch*G.sgn,ci=cell(i),gx=ci[0]-c0[0],gy=ci[1]-c0[1];
    const [a0,b0]=cr(c),[a1,b1]=cr(i),along=G.hz?(b1===b0&&a1-a0===k):(a1===a0&&b1-b0===k);
    if(i===c){focus=[i,at(0,0)];continue;}
    if(along){later.push([i,at(lerp(G.hz?tw:0,gx,m),lerp(G.hz?0:tw,gy,m)),{scale:sc,rev:1}]);continue;}
    if(out<1)push(i,at(G.hz?tw:0,G.hz?0:tw),{scale:sc,rev:1,alpha:1-out});
    if(up>0)push(i,at(gx,gy),{scale:sc,rev:1,alpha:up});}
  for(const l of later)push(l[0],l[1],l[2]);
  if(focus)push(focus[0],focus[1],{scale:sc,rev:1});}

/* ---------------- drawing ---------------- */
function rr(ctx,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();if(ctx.roundRect&&r>0){ctx.roundRect(x,y,w,h,r);}else if(r>0){ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}else ctx.rect(x,y,w,h);}
function hash(a,b){let h=(a*374761393+b*668265263)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967296;}
function lum(hex){const m=String(hex||'').replace('#','');if(m.length<6)return .5;const v=i=>parseInt(m.slice(i,i+2),16)/255;return .2126*v(0)+.7152*v(2)+.0722*v(4);}
function paint(ctx,SC,S,fonts,opt){
  opt=opt||{};const {W,H,G}=SC,k=opt.scale||1;
  ctx.save();ctx.setTransform(k,0,0,k,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(opt.transparent)ctx.clearRect(0,0,W,H);else{ctx.fillStyle=S.bg||'#F5F5F3';ctx.fillRect(0,0,W,H);}
  const rad=Math.max(0,+S.radius||0);
  for(const o of SC.ops){if(o.alpha<=0)continue;const r=o.rect;ctx.save();ctx.globalAlpha=clamp(o.alpha,0,1);
    rr(ctx,r.x,r.y,r.w,r.h,rad*o.scale);ctx.save();ctx.clip();
    ctx.fillStyle=o.item.placeholder?(lum(S.bg)>.5?'#d9d8d4':'#3a3940'):(S.shapeBg||'#e6e6e3');ctx.fillRect(r.x,r.y,r.w,r.h);
    if(o.item.placeholder){ctx.fillStyle=lum(S.bg)>.5?'#8f8d88':'#77757f';ctx.font=`400 ${Math.max(8,r.h*.18)}px "Inter Tight", Helvetica, Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(o.item.n),r.x+r.w/2,r.y+r.h/2);ctx.textAlign='left';ctx.textBaseline='alphabetic';}
    else if(opt.media)opt.media(ctx,o,r,S.fit==='fit'?'contain':'cover');
    ctx.restore();
    if(S.edge&&(+S.edgeW||0)>0){const lw=(+S.edgeW)*o.scale;ctx.lineWidth=lw;ctx.strokeStyle=S.edgeC||'#000000';rr(ctx,r.x+lw/2,r.y+lw/2,r.w-lw,r.h-lw,Math.max(0,rad*o.scale-lw/2));ctx.stroke();}
    ctx.restore();
    if(S.capOn&&S.capWhere!=='fixed'&&!o.item.placeholder){const b=capBlock(ctx,S,o.item,fonts);if(b)drawCap(ctx,S,b,o,r,SC);}}
  if(SC.fixed&&SC.fixed.alpha>0){const it=SC.list[SC.fixed.i],b=capBlock(ctx,S,it,fonts);if(b)drawFixed(ctx,S,b,SC.fixed,SC);}
  ctx.restore();}
function capOrigin(S,b,r,sc){const sp=(+S.capSpace||0)*sc,al=S.capAlign||'left',bw=b.w*sc;let x,y;
  if(S.capWhere==='over'){x=al==='left'?r.x+sp:al==='right'?r.x+r.w-sp-bw:r.x+(r.w-bw)/2;y=r.y+r.h-sp-b.h*sc;}
  else if(S.capWhere==='above'){x=al==='left'?r.x:al==='right'?r.x+r.w-bw:r.x+(r.w-bw)/2;y=r.y-sp-b.h*sc;}
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

return{FEEL,feel,SIZES,RATIOS,canvasSize,ratioOf,unitOf,dirOf,moveOf,plan,cameraAt,geometry,scene,paint,capBlock,parseRich,parsePairs,layLine,resetMeasure,even,clamp};
})();
