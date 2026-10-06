/* Every character the time in words can use, so exports bake them all. */
function saverVocab(){return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:’\'';}
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
/* ---------------- the time in words ---------------- */
const isWords=()=>C.show==='words';
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const ORDS={one:'first',two:'second',three:'third',five:'fifth',eight:'eighth',nine:'ninth',twelve:'twelfth'};
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const num=n=>n<20?[ONES[n]]:n%10?[TENS[Math.floor(n/10)],ONES[n%10]]:[TENS[n/10]];
function ordinal(n){const w=num(n),l=w[w.length-1];w[w.length-1]=ORDS[l]||(l.endsWith('y')?l.slice(0,-1)+'ieth':l+'th');return w;}
function yearWords(y){if(y>=2000&&y<2010)return y===2000?['two','thousand']:['two','thousand','and',ONES[y-2000]];
  const lo=y%100;return num(Math.floor(y/100)%100).concat(lo===0?['hundred']:lo<10?['oh',ONES[lo]]:num(lo));}
/* Each word has a key naming its place in the sentence, so a change can tell
   which words stay, which change and which come or go. ORD is reading order. */
const WKEYS=['lead.0','lead.1','time.x','time.f','time.oh','time.h0','time.h1','time.mx','time.moh','time.m0','time.m1','sec.x','sec.and','sec.0','sec.1','sec.u',
  'date.on','date.w','date.the','date.0','date.1','date.of','date.m','date.in','date.y0','date.y1','date.y2','date.y3','date.y4'];
const ORD=Object.fromEntries(WKEYS.map((k,i)=>[k,i]));
/* Phrases that hold together when a line breaks: "It is eleven forty seven",
   "and fifty nine seconds", "on Wednesday", "the twenty eighth", "of October",
   "twenty twenty six". Glue between words: 3 never breaks (inside a number,
   after "It", "on", "the", "of", "in", "and"); 2 breaks only if a phrase can't
   fit on a line (between hours and minutes, before "seconds"); 1 gives way
   before that (after "is", so the time stays whole); 0 is between phrases. */
const GRP=k=>k.startsWith('lead.')?'lead':k.startsWith('time.')?'time':k.startsWith('sec.')?'sec':
  k==='date.on'||k==='date.w'?'dw':k==='date.the'||k==='date.0'||k==='date.1'?'dd':k==='date.of'||k==='date.m'?'dm':'dy';
const STICKY={'lead.0':3,'lead.1':1,'sec.and':3,'date.on':3,'date.the':3,'date.of':3,'date.in':3};
function glueOf(t,n){if(!n)return 0;if(STICKY[t.k])return STICKY[t.k];
  if(t.k==='date.0'&&n.k==='date.m')return 2;if(n.grp!==t.grp)return 0;
  if(n.k==='time.mx'||n.k==='time.moh'||(n.k==='time.m0'&&t.k!=='time.moh')||n.k==='sec.u')return 2;return 3;}
const parts=ms=>{const d=new Date(ms);return{y:d.getFullYear(),mo:d.getMonth(),d:d.getDate(),wd:d.getDay(),h:d.getHours(),mi:d.getMinutes(),s:d.getSeconds()};};
function clockWords(add,H,M,o){
  if(o.num==='figures'){add('time.f',(o.h24?pad(H):String(H%12||12))+(o.sep==='colon'?':':'.')+pad(M)+(o.h24?'':H<12?'am':'pm'));return;}
  if(!o.h24&&M===0&&H%12===0){add('time.x',H?'midday':'midnight');return;}
  const h=o.h24?H:H%12||12;
  if(o.h24&&h<10){if(h)add('time.oh','oh');add('time.h0',ONES[h]);}else num(h).forEach((w,i)=>add('time.h'+i,w));
  if(M===0)add('time.mx',o.h24?'hundred':'o’clock');
  else{if(M<10)add('time.moh','oh');num(M).forEach((w,i)=>add('time.m'+i,w));}
}
const sfx=n=>n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th';
/* One sentence, always in this computer's own time and date. Every part can be
   switched on or off and the grammar closes up around it. */
function sentence(z,o){
  const out=[],add=(k,w,proper)=>out.push({k,w,part:k.split('.')[0],grp:GRP(k),proper:!!proper}),figs=o.num==='figures';
  const hasDate=o.weekday||o.daynum||o.month||o.year;
  if(o.lead&&(o.time||hasDate)){add('lead.0','it');add('lead.1','is');}
  if(o.time){clockWords(add,z.h,z.mi,o);
    if(o.secs){if(z.s===0)add('sec.x','exactly');
      else{add('sec.and','and');if(figs)add('sec.0',String(z.s));else num(z.s).forEach((w,i)=>add('sec.'+i,w));add('sec.u',z.s===1?'second':'seconds');}}}
  if(hasDate){const prep=o.time;
    if(o.weekday||o.daynum){if(prep)add('date.on','on');if(o.weekday)add('date.w',DAYS[z.wd],true);
      if(o.daynum){if(figs&&o.month)add('date.0',String(z.d));else{add('date.the','the');if(figs)add('date.0',z.d+sfx(z.d));else ordinal(z.d).forEach((w,i)=>add('date.'+i,w));}}}
    if(o.month){if(o.daynum){if(!figs)add('date.of','of');}else if(prep||o.weekday)add('date.of','in');add('date.m',MONTHS[z.mo],true);}
    if(o.year){if(!o.month&&(prep||o.weekday||o.daynum))add('date.in','in');(figs?[String(z.y)]:yearWords(z.y)).forEach((w,i)=>add('date.y'+i,w));}}
  out.forEach((t,i)=>{t.w=o.case==='upper'?t.w.toUpperCase():o.case==='lower'?t.w.toLowerCase():(t.proper||i===0)?t.w[0].toUpperCase()+t.w.slice(1):t.w;
    t.glue=glueOf(t,out[i+1]);});
  if(o.stop&&out.length)out[out.length-1].w+='.';
  return out;
}
let wBuilt=0,wMemo=['',[]],wErr=0,wCur=null,wPrev=null,wSig=null,wT0=-1e9,wLatest=new Set(),wPrevLatest=new Set(),wCache=new Map(),wFit=new Map(),wPal=null;
const wPalette=()=>{const o=C.words;if(o.rotate&&o.themes&&o.themes.length)return o.themes[new Date().getHours()%o.themes.length];return{bg:o.bg,ink:o.ink,soft:o.soft,date:o.dateCol};};
function hiFaceOf(){const id=C.words.hiFace;if(!id||id==='same')return null;
  if(eng.faceList().some(x=>x.id===id))return eng.F(id);if(!eng.anyLoaded()&&(id==='d1'||id==='d2'))return eng.F(id);return null;}
const glyphOf=(f,ch)=>{let g=f.base(ch);if(!g&&ch==='’')g=f.base("'");return g;};
/* what colour a word takes: hi (the highlight), rest, or the date's own colour */
function roleOf(t,latest){const h=C.words.hi;
  return h==='time'?(t.part==='time'?'hi':'rest'):h==='latest'?(latest.has(t.k)?'hi':'rest'):h==='parts'?(t.part==='time'?'hi':t.part==='date'?'date':'rest'):'rest';}
const isHi=(t,latest)=>roleOf(t,latest)==='hi';
/* Side bearings, so a flush edge lines up on the ink rather than the glyph box
   (an I and an O sit on the same vertical). From the outline where there is one. */
const SB=new Map(),SBCV=typeof document!=='undefined'?document.createElement('canvas').getContext('2d'):null;
function bearings(f,id){const key=(f.name||'')+'|'+(f.weight||'')+'|'+id;let r=SB.get(key);if(r)return r;r=[0,0];
  try{if(f.pathD){const n=(f.pathD(id)||'').match(/-?\d*\.?\d+(?:e-?\d+)?/gi)||[];let lo=Infinity,hi=-Infinity;for(let i=0;i<n.length;i+=2){const v=+n[i];if(v<lo)lo=v;if(v>hi)hi=v;}
      if(lo<Infinity)r=[lo,f.adv(id)-hi];}
    else if(SBCV&&f.fallback){SBCV.font=f.weight+' 1000px "Inter Tight","Helvetica Neue",Arial,sans-serif';const m=SBCV.measureText(id);r=[-(m.actualBoundingBoxLeft||0),f.adv(id)-(m.actualBoundingBoxRight||0)];}}catch(e){}
  SB.set(key,r);return r;}
/* Set the words at one size. Paragraph: filled line by line, breaking only between
   phrases, and a lone short phrase on the last line pulls a neighbour down to
   keep it company. Stacked: one phrase to a line. */
function wSet(toks,latest,W,H,size){
  const o=C.words,f=eng.F(eng.baseSlot()),hf=hiFaceOf()||f;
  const m=o.margin/100*Math.min(W,H),availW=Math.max(1,(W-2*m)*o.measure/100),trk=o.tracking/1000*size;
  let top=0,bot=0;
  const shape=(face,str)=>{const k=size/face.upm,gl=[];let x=0,prev=null,wb=0;
    for(const ch of Array.from(str)){const id=glyphOf(face,ch);if(prev!==null)x+=face.kern(prev,id)*k+trk;gl.push({id,x,ch,w:face.adv(id)*k});x+=face.adv(id)*k;prev=id;
      const b=face.bbox&&face.bbox(id);if(b){top=Math.max(top,b[0]*k);bot=Math.max(bot,b[1]*k);wb=Math.max(wb,b[1]*k);}}
    return{gl,w:x,bot:wb};};
  const sp=f.adv(glyphOf(f,' '))*size/f.upm*(o.space/100)+trk;
  const words=toks.map(t=>{const role=roleOf(t,latest),face=role==='hi'?hf:f,s=shape(face,t.w);return{t,hl:role,face,gl:s.gl,w:s.w,bot:s.bot};});
  /* units: runs of words that hold together. A phrase too wide for the line is
     split at its weaker joins, and only then, as a last resort, between words. */
  const runs=(ws,min)=>{const out=[];let u=null;ws.forEach(w=>{if(!u){u={ws:[],w:0};out.push(u);}u.w+=(u.ws.length?sp:0)+w.w;u.ws.push(w);if(w.t.glue<min)u=null;});return out;};
  const units=[];let forced=false;
  /* lvl 4 means a phrase that never breaks didn't fit: it goes word by word */
  const split=(ws,lvl)=>{if(lvl>3)forced=true;for(const r of runs(ws,lvl)){if(r.w<=availW+.5||lvl>3)units.push(r);else split(r.ws,lvl+1);}};
  split(words,1);
  let lines=[];
  const fits=(l,uw)=>!l.us.length||l.w+sp+uw<=availW+.5;
  if(o.layout==='stack'){
    /* a new line for each phrase; the pieces of a phrase that had to be split continue on the line */
    let prevFull=true;
    for(const un of units){const last=un.ws[un.ws.length-1],l=lines[lines.length-1];
      if(!prevFull&&l&&fits(l,un.w)){l.w+=sp+un.w;l.us.push(un);}else lines.push({us:[un],w:un.w});
      prevFull=last.t.glue===0;}}
  else{for(const un of units){let l=lines[lines.length-1];
      if(!l||!fits(l,un.w)){l={us:[],w:0};lines.push(l);}l.w+=(l.us.length?sp:0)+un.w;l.us.push(un);}
    const n=lines.length;
    if(n>1){const L=lines[n-1],P=lines[n-2];
      if(L.us.length===1&&L.w<availW*.33&&P.us.length>1){const mv=P.us[P.us.length-1];if(L.w+sp+mv.w<=availW+.5){P.us.pop();P.w-=sp+mv.w;L.us.unshift(mv);L.w+=sp+mv.w;}}}}
  lines=lines.filter(l=>l.us.length);
  const capPx=f.cap/f.upm*size,lead=o.leading*size,n=Math.max(1,lines.length),blockH=capPx+(n-1)*lead;
  const y0=o.valign==='top'?m:o.valign==='bottom'?H-m-blockH:(H-blockH)/2;
  const map=new Map();let wide=0;
  lines.forEach((l,li)=>{const ws=l.us.flatMap(x=>x.ws),first=ws[0],last=ws[ws.length-1];wide=Math.max(wide,l.w);
    let x=o.align==='left'?m:o.align==='right'?W-m-l.w:(W-l.w)/2;
    if(o.optical&&o.align==='left'&&first)x-=bearings(first.face,first.gl[0].id)[0]*size/first.face.upm;
    if(o.optical&&o.align==='right'&&last)x+=bearings(last.face,last.gl[last.gl.length-1].id)[1]*size/last.face.upm;
    const y=y0+capPx+li*lead;
    for(const w of ws){Object.assign(w,{x,y,li,size});map.set(w.t.k,w);x+=w.w+sp;}});
  if(!top){top=capPx;bot=.22*size;}
  return{map,words,size,pad:.04*size,top,bot,lead,blockH,wide,availW,availH:H-2*m,forced};
}
/* Fit: the largest size at which the longest sentence these settings can make
   (a Wednesday the twenty seventh of September, at twelve fifty seven and fifty
   seven seconds) still fits without breaking a phrase that never breaks, so the
   type never changes size as the time does. */
function fitSize(W,H){const o=C.words,y=new Date().getFullYear(),key=W+'x'+H+'|'+wBuilt+'|'+y;let s=wFit.get(key);if(s)return s;
  const worst=[sentence({y,mo:8,d:27,wd:3,h:o.h24?23:12,mi:57,s:57},o),sentence({y,mo:8,d:23,wd:3,h:o.h24?23:0,mi:37,s:37},o)].filter(t=>t.length);
  let lo=.002*W,hi=.6*W;
  for(let i=0;i<22;i++){const mid=(lo+hi)/2;
    if(worst.every(t=>{const L=wSet(t,new Set(),W,H,mid);return L.blockH<=L.availH&&L.wide<=L.availW+.5&&!L.forced;}))lo=mid;else hi=mid;}
  if(wFit.size>20)wFit.clear();wFit.set(key,lo);return lo;}
function wLayout(toks,latest,W,H){
  const o=C.words,size=o.fit?fitSize(W,H):o.size/100*W;
  const key=W+'x'+H+'|'+size.toFixed(3)+'|'+toks.map(t=>t.k+'='+t.w+'*'+roleOf(t,latest)).join('|');let L=wCache.get(key);if(L)return L;
  L=wSet(toks,latest,W,H,size);
  if(wCache.size>40)wCache.clear();wCache.set(key,L);return L;
}
function hex(c){const m=/^#?([0-9a-f]{6})$/i.exec(c||'');const v=m?parseInt(m[1],16):0;return[v>>16&255,v>>8&255,v&255];}
function mix(a,b,t){if(t<=0||a===b)return a;if(t>=1)return b;const A=hex(a),B=hex(b);return'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')';}
function colOf(r){return r==='hi'||C.words.hi==='none'?wPal.ink:r==='rest'?wPal.soft:(wPal[r]||wPal.soft);}
function wGlyphs(ctx,K,w,x,y,col,alpha,dy,clip,from,to){
  if(alpha<=.002)return;
  ctx.save();ctx.globalAlpha=Math.min(1,alpha);ctx.fillStyle=col;
  if(clip){ctx.setTransform(K);ctx.beginPath();ctx.rect(clip[0],clip[1],clip[2],clip[3]);ctx.clip();}
  const k=w.size/w.face.upm,a=from||0,b=to==null?w.gl.length:to;
  for(let i=a;i<b;i++){const g=w.gl[i];ctx.setTransform(K.multiply(new DOMMatrix([k,0,0,k,x+g.x,y+dy])));w.face.draw(ctx,g.id,false);}
  ctx.restore();
}
const wEase=t=>{const f=C.words.feel;return f==='smooth'?eng.E.inOut(t):f==='elastic'?eng.E.backOut(t,1.5):eng.E.expoInOut(t);};
/* Type: like someone retyping. Each run of changed words is backspaced from its
   end (only back to what a word shares with its new self), then the new words
   are typed. Runs go in reading order, at an even pace per character. */
function typed(t){
  const A=new Map(wPrev.map(x=>[x.k,x])),B=new Map(wCur.map(x=>[x.k,x]));
  const keys=[...new Set([...wPrev.map(x=>x.k),...wCur.map(x=>x.k)])].sort((a,b)=>ORD[a]-ORD[b]);
  const info=new Map(),steps=[];let run=[];
  const flush=()=>{for(let i=run.length-1;i>=0;i--){const q=info.get(run[i]);for(let j=0;j<q.D;j++)steps.push([run[i],'d']);}
    for(const k of run){const q=info.get(k);for(let j=0;j<q.T;j++)steps.push([k,'t']);}run=[];};
  for(const k of keys){const a=A.get(k),b=B.get(k);
    if(a&&b&&a.w===b.w){flush();continue;}
    const ac=Array.from(a?a.w:''),bc=Array.from(b?b.w:'');let c=0;if(a&&b)while(c<ac.length&&c<bc.length&&ac[c]===bc[c])c++;
    info.set(k,{ac,bc,c,D:ac.length-c,T:bc.length-c,d:0,t:0});run.push(k);}
  flush();
  const done=Math.floor(eng.clamp(t)*steps.length+1e-6);for(let i=0;i<done;i++)info.get(steps[i][0])[steps[i][1]]++;
  const out=[];
  for(const k of keys){const a=A.get(k),b=B.get(k),q=info.get(k);
    if(!q){out.push({tok:b,hl:isHi(b,wLatest)});continue;}
    const str=q.t?q.bc.slice(0,q.c+q.t).join(''):q.ac.slice(0,q.ac.length-q.d).join('');
    if(str)out.push({tok:Object.assign({},b||a,{w:str}),hl:b&&(q.t||!a)?isHi(b,wLatest):isHi(a||b,wPrevLatest)});}
  return out;
}
function wordsFrame(ctx,W,H,now,K){
  const o=C.words,ms=Date.now(),mk=Math.floor(ms/1000)+'|'+wBuilt;
  if(mk!==wMemo[0])wMemo=[mk,sentence(parts(ms),o)];
  const toks=wMemo[1],sig=toks.map(t=>t.k+'='+t.w).join('|');
  if(sig!==wSig){
    if(wCur){const prev=new Map(wCur.map(t=>[t.k,t.w]));wPrev=wCur;wT0=now;wPrevLatest=wLatest;
      wLatest=new Set(toks.filter(t=>prev.get(t.k)!==t.w).map(t=>t.k));}
    else wLatest=new Set(toks.filter(t=>t.part==='time').map(t=>t.k));
    wCur=toks;wSig=sig;}
  wPal=wPalette();S.bg=wPal.bg;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle=wPal.bg;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
  if(!wCur)return;
  const style=o.change,t=(now-wT0)/(Math.max(.05,o.len)*1000);
  if(!wPrev||t>=1||style==='cut'){const B=wLayout(wCur,wLatest,W,H);for(const w of B.words)wGlyphs(ctx,K,Object.assign(w,{size:B.size}),w.x,w.y,colOf(w.hl),1,0);return;}
  if(style==='type'){const it=typed(t);const B=wLayout(it.map(x=>x.tok),new Set(it.filter(x=>x.hl).map(x=>x.tok.k)),W,H);
    for(const w of B.words)wGlyphs(ctx,K,Object.assign(w,{size:B.size}),w.x,w.y,colOf(w.hl),1,0);return;}
  const A=wLayout(wPrev,wPrevLatest,W,H),B=wLayout(wCur,wLatest,W,H),ef=eng.E.inOut,roll=style==='roll',tc=eng.clamp(t),e=roll?wEase(tc):ef(tc);
  A.words.forEach(w=>w.size=A.size);B.words.forEach(w=>w.size=B.size);
  /* A word that keeps its line and only shifts a little glides there. Anything
     else that changed or moved leaves from where it was and arrives where it
     lands, like a departure board, so reflowed lines never smear across each other. */
  const reach=o.glide?2*B.size:.5,near=(a,b)=>a.face===b.face&&a.li===b.li&&Math.abs(a.y-b.y)<.5&&Math.abs(a.x-b.x)<=reach;
  const pieces=[],still=[];
  const keys=[...new Set([...A.map.keys(),...B.map.keys()])].sort((p,q)=>ORD[p]-ORD[q]);
  for(const k of keys){const a=A.map.get(k),b=B.map.get(k);
    if(a&&b&&near(a,b)){
      if(a.t.w===b.t.w){still.push([a,b,null]);continue;}
      if(o.by==='letter'&&a.gl.length===b.gl.length){
        for(let i=0;i<b.gl.length;i++){if(a.gl[i].ch===b.gl[i].ch)still.push([a,b,i]);else{pieces.push({w:a,L:A,gi:i,out:1});pieces.push({w:b,L:B,gi:i,out:0});}}
        continue;}
    }
    if(a)pieces.push({w:a,L:A,gi:null,out:1});
    if(b)pieces.push({w:b,L:B,gi:null,out:0});
  }
  /* stagger as a wave down the page, left to right within a line */
  const at=p=>p.w.x+(p.gi==null?0:p.w.gl[p.gi].x);
  const order=[...new Set(pieces.map(p=>Math.round(p.w.y)+'|'+Math.round(at(p))))].sort((p,q)=>{const [y1,x1]=p.split('|').map(Number),[y2,x2]=q.split('|').map(Number);return y1-y2||x1-x2;});
  const n=order.length,st=n>1?.3:0;
  for(const p of pieces){const r=n>1?order.indexOf(Math.round(p.w.y)+'|'+Math.round(at(p)))/(n-1):0,v=eng.clamp((tc-st*r)/Math.max(.001,1-st));
    const w=p.w,L=p.L,g=p.gi==null?null:w.gl[p.gi],col=colOf(w.hl),end=p.gi==null?null:p.gi+1;
    /* the window runs from this line's cap height down to its descenders, but stops where the next line's window starts */
    if(roll){const ev=wEase(v),bot=Math.min(Math.max(0,w.bot)+L.pad,Math.max(L.pad,L.lead-L.top-L.pad)),bx=[w.x+(g?g.x:0)-L.pad,w.y-L.top-L.pad,(g?g.w:w.w)+2*L.pad,L.top+L.pad+bot];
      wGlyphs(ctx,K,w,w.x,w.y,col,1,(p.out?-ev:1-ev)*bx[3],bx,p.gi,end);}
    else wGlyphs(ctx,K,w,w.x,w.y,col,p.out?1-ef(eng.clamp(v*2)):ef(eng.clamp(v*2-1)),0,null,p.gi,end);
  }
  for(const [a,b,gi] of still){const end=gi==null?null:gi+1,ag=gi==null?0:a.gl[gi].x,bg=gi==null?0:b.gl[gi].x;
    const x=a.x+ag+(b.x+bg-a.x-ag)*e-bg,y=a.y+(b.y-a.y)*e;
    wGlyphs(ctx,K,b,x,y,mix(colOf(a.hl),colOf(b.hl),e),1,0,null,gi,end);}
}
/* Preview only: replay the last change, or the one a minute (or second) ago */
function replay(){if(!isWords())return;const o=C.words;wCur=sentence(parts(Date.now()-(o.time&&o.secs?1000:60000)),o);wSig=wCur.map(t=>t.k+'='+t.w).join('|');wPrev=null;}

const slotNow=()=>Math.floor(Date.now()/(Math.max(.5,C.every)*60000));
function lookIndex(sl){const n=C.looks.length,o=C.looks.map((_,i)=>i);
  if(C.shuffle){const cyc=Math.floor(sl/n);for(let i=n-1;i>0;i--){const j=Math.floor(rnd(cyc*131+i)*(i+1));[o[i],o[j]]=[o[j],o[i]];}}
  return o[((sl%n)+n)%n];}
function build(){
  wCache.clear();wFit.clear();wBuilt++;
  if(isWords()){S=JSON.parse(JSON.stringify(C.base||{}));S.transparent=false;eng.use(S);eng.setHooks(null);eng.setLive(null);return;}
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
  if(isWords()){
    const T=Date.now()/1000,a=C.drift||0,k=ctx.canvas.width/W,K=new DOMMatrix([k,0,0,k,0,0]);
    if(a>0){const sc=1-a*.04+a*.04*Math.sin(T/41);K.multiplySelf(new DOMMatrix().translateSelf(W/2+a*.05*W*Math.sin(T/23.7),H/2+a*.05*H*Math.sin(T/31.3+1)).scaleSelf(sc,sc).translateSelf(-W/2,-H/2));}
    try{wordsFrame(ctx,W,H,now,K);}catch(e){if(!wErr){wErr=1;console.error(e);}}
    return;
  }
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
/* read-outs for tests and the preview */
const lines=(W,H)=>{if(!wCur||!isWords())return{size:0,lines:[],x:[]};const L=wLayout(wCur,wLatest,W,H),out=[],xs=[];
  for(const w of L.words){if(!out[w.li]){out[w.li]=[];xs[w.li]=w.x;}out[w.li].push(w.t.w);}return{size:L.size,lines:out.map(a=>a.join(' ')),x:xs,forced:L.forced};};
return{frame,setConfig,bg:()=>S&&S.bg,replay,words:()=>(wCur||[]).map(t=>t.w).join(' '),lines};
}