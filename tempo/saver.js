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
  const hs=c.zero?pad(h):String(h),per=[],keys=[];let s='';
  /* each character: how often it changes, and which numeral it is (h1 h2 : m1 m2 : s1 s2) */
  const add=(str,p,k)=>{let i=0;for(const ch of str){s+=ch;per.push(p.shift?p.shift():0);keys.push(k?k[i]:null);i++;}};
  add(hs,hs.length===2?[36000,3600]:[3600],hs.length===2?['h1','h2']:['h2']);add(c.sep,[0]);add(pad(d.getMinutes()),[600,60],['m1','m2']);
  if(c.secs){add(c.sep,[0]);add(pad(d.getSeconds()),[10,1],['s1','s2']);}
  if(!c.h24&&c.ampm)add(suf,[0,0]);
  return{s,per,keys};}
function line2(d){const c=C.clock;let s=c.line2==='weekday'?d.toLocaleDateString('en-GB',{weekday:'long'}):c.line2==='date'?d.getDate()+' '+d.toLocaleDateString('en-GB',{month:'long'}):'';return c.caps?s.toUpperCase():s;}
function palette(){if(C.colours.cycle&&C.palettes&&C.palettes.length)return C.palettes[new Date().getHours()%C.palettes.length];return{bg:C.colours.bg,p:C.colours.p};}
const isClock=()=>!isWords()&&!isDial();
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
    alpha:g=>{if(isClock()&&C.clock.pulse&&g.line===0&&g.ch===C.clock.sep){const f=(Date.now()%1000)/1000;return .3+.7*(.5+.5*Math.cos(TAU*f));}return 1;},
    /* faces per numeral: the outgoing time keeps the faces it had */
    face:g=>{const F_=g.tag==='from'?pF:cF;return(g.line===0?F_.l0[g.pos]:F_.l2)||null;},
    fitSlots:()=>cFit
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
  const lo=y%100;return num(Math.floor(y/100)%100).concat(lo===0?['hundred']:lo<10?[OH(),ONES[lo]]:num(lo));}
/* 0 said as "oh" (nine oh five) or "zero" (nine zero five) */
const OH=()=>C.words&&C.words.zero==='zero'?'zero':'oh';
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
  if(numOf(o,'time')){add('time.f',(o.h24?pad(H):String(H%12||12))+(o.sep==='colon'?':':'.')+pad(M)+(o.h24?'':H<12?'am':'pm'));return;}
  if(!o.h24&&M===0&&H%12===0){add('time.x',H?'midday':'midnight');return;}
  const h=o.h24?H:H%12||12;
  if(o.h24&&h<10){if(h)add('time.oh',OH());add('time.h0',ONES[h]);}else num(h).forEach((w,i)=>add('time.h'+i,w));
  if(M===0)add('time.mx',o.h24?'hundred':'o’clock');
  else{if(M<10)add('time.moh',OH());num(M).forEach((w,i)=>add('time.m'+i,w));}
}
/* words or figures, part by part (exports from 0.3 and earlier say it once, as num) */
const numOf=(o,part)=>{const v=(o.nums||{})[part];return(v||o.num)==='figures';};
const sfx=n=>n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th';
/* One sentence, always in this computer's own time and date. Every part can be
   switched on or off and the grammar closes up around it. */
function sentence(z,o){
  const out=[],add=(k,w,proper)=>out.push({k,w,part:k.split('.')[0],grp:GRP(k),proper:!!proper}),figS=numOf(o,'sec'),figD=numOf(o,'date'),figY=numOf(o,'year');
  const hasDate=o.weekday||o.daynum||o.month||o.year;
  if(o.lead&&(o.time||hasDate)){add('lead.0','it');add('lead.1','is');}
  if(o.time){clockWords(add,z.h,z.mi,o);
    if(o.secs){if(z.s===0)add('sec.x','exactly');
      else{add('sec.and','and');if(figS)add('sec.0',String(z.s));else num(z.s).forEach((w,i)=>add('sec.'+i,w));add('sec.u',z.s===1?'second':'seconds');}}}
  if(hasDate){const prep=o.time;
    if(o.weekday||o.daynum){if(prep)add('date.on','on');if(o.weekday)add('date.w',DAYS[z.wd],true);
      if(o.daynum){if(figD&&o.month)add('date.0',String(z.d));else{add('date.the','the');if(figD)add('date.0',z.d+sfx(z.d));else ordinal(z.d).forEach((w,i)=>add('date.'+i,w));}}}
    if(o.month){if(o.daynum){if(!figD)add('date.of','of');}else if(prep||o.weekday)add('date.of','in');add('date.m',MONTHS[z.mo],true);}
    if(o.year){if(!o.month&&(prep||o.weekday||o.daynum))add('date.in','in');(figY?[String(z.y)]:yearWords(z.y)).forEach((w,i)=>add('date.y'+i,w));}}
  out.forEach((t,i)=>{t.w=o.case==='upper'?t.w.toUpperCase():o.case==='lower'?t.w.toLowerCase():(t.proper||i===0)?t.w[0].toUpperCase()+t.w.slice(1):t.w;
    t.glue=glueOf(t,out[i+1]);});
  if(o.stop&&out.length)out[out.length-1].w+='.';
  return out;
}
let wBuilt=0,wMemo=['',[]],wErr=0,wCur=null,wPrev=null,wSig=null,wT0=-1e9,wLatest=new Set(),wPrevLatest=new Set(),wCache=new Map(),wFit=new Map(),wPal=null;
/* ---- Mixed type: a plain base face carries the sentence and display faces come
   in and out of it. Three ways to feature them: each part set to a face of its
   own or shuffled (parts), whatever just changed (latest), or one part at a time
   (one). The little words (on, the, of, in, and) can stay in the base face. ---- */
const faceById=id=>{if(!id)return null;const x=eng.faceList().find(q=>q.id===id);if(x)return x.face;return!eng.anyLoaded()&&(id==='d1'||id==='d2')?eng.F(id):null;};
/* the core face: Tempo's default style, chosen in Fonts */
const baseFace=()=>eng.F(eng.baseSlot());
const baseId=()=>eng.baseSlot();
/* each face's own tracking, set in Fonts, in thousandths of an em */
const trackOf=id=>((C.tracks||{})[id]||0)/1000;
const MPART=t=>t.grp==='lead'?'lead':t.grp==='time'?'time':t.grp==='sec'?'sec':t.grp==='dw'?'weekday':t.grp==='dd'?'day':t.grp==='dm'?'month':'year';
const LITTLE=new Set(['sec.and','date.on','date.the','date.of','date.in']);
/* The display faces: every style ticked "Use in style swaps" except the base. */
const mPool=()=>{const b=baseId();return eng.anyLoaded()?eng.faceList().filter(x=>x.swap&&x.id!==b).map(x=>x.id):['d1','d2'].filter(x=>x!==b);};
let mS={},mSeed=1,mCfg='';
const mReset=()=>{mS={fid:{},seen:{},slot:null,sig:null,feat:{},last:null,one:null,oneFace:null,oneEach:{},some:{}};};mReset();
/* a new face, never the one it replaces */
/* In turn: the next font after the one it replaces. Shuffled: any other font. */
let pickTurn=false;
function pickFace(pool,avoid,salt){if(!pool.length)return null;const n=pool.length,at=pool.indexOf(avoid);
  if(pickTurn)return pool[at<0?Math.floor(rnd(salt)*n):(at+1)%n];
  let i=Math.floor(rnd(mSeed++*7919+salt)*n);if(n>1&&pool[i]===avoid)i=(i+1)%n;return pool[i];}
/* A few at random: when a part (or numeral) changes, it takes another font this often */
const chance=(M,salt)=>rnd(mSeed++*31337+salt)<(M.amount==null?.5:M.amount);
function assignFaces(toks){const M=C.words.mixed;toks.forEach(t=>{t.fid=null;});if(!M)return;
  pickTurn=M.order==='turn';
  const pool=mPool(),now=Date.now(),mode=M.mode||'parts',each=!!M.each,P=M.parts||{},salt=now%100003;
  const slot=M.when==='minute'?Math.floor(now/6e4):M.when==='hour'?Math.floor(now/36e5):null,newSlot=slot!=null&&slot!==mS.slot;
  const plain=t=>M.little!==false&&LITTLE.has(t.k),grpOf=t=>each?t.k:MPART(t);
  const sig=toks.map(t=>t.k+'='+t.w).join('|');
  if(mode==='latest'){
    /* the words that changed take a display face and keep it until the next change */
    if(sig!==mS.sig){const prev=mS.words,ch=toks.filter(t=>t.grp!=='lead'&&!plain(t)&&(prev?prev.get(t.k)!==t.w:t.part==='time'));
      const one=pickFace(pool,mS.last,salt),was=mS.feat;mS.feat={};ch.forEach(t=>{mS.feat[t.k]=each?pickFace(pool,was[t.k]||mS.last,salt+ORD[t.k]):one;});mS.last=one;
      mS.words=new Map(toks.map(t=>[t.k,t.w]));}
    toks.forEach(t=>{t.fid=mS.feat[t.k]||null;});}
  else if(mode==='one'){
    /* one part at a time, moving on when the sentence changes, or every minute or hour */
    const ps=[...new Set(toks.map(MPART))].filter(p=>p!=='lead');
    if(ps.length&&(mS.one==null||!ps.includes(mS.one)||(slot!=null?newSlot:sig!==mS.sig))){
      let i=Math.floor(rnd(mSeed++*104729+salt)*ps.length);if(ps.length>1&&ps[i]===mS.one)i=(i+1)%ps.length;
      mS.one=ps[i];mS.oneFace=pickFace(pool,mS.oneFace,salt);mS.oneEach={};}
    toks.forEach(t=>{if(MPART(t)!==mS.one||plain(t))return;t.fid=each?(mS.oneEach[t.k]||(mS.oneEach[t.k]=pickFace(pool,null,salt+ORD[t.k]))):mS.oneFace;});}
  else if(mode==='some'){
    /* a few at random: when a part's words change (or every minute or hour), it takes another font this often */
    const txt={};toks.forEach(t=>{if(t.grp!=='lead'&&!plain(t)){const g=grpOf(t);txt[g]=(txt[g]||'')+' '+t.w;}});
    for(const g in txt){const sl=salt+(ORD[g]||g.length*31);if(!(g in mS.some)||(slot!=null?newSlot:txt[g]!==mS.seen[g]))mS.some[g]=chance(M,sl)?pickFace(pool,mS.some[g],sl):null;mS.seen[g]=txt[g];}
    toks.forEach(t=>{if(t.grp==='lead'||plain(t))return;t.fid=mS.some[grpOf(t)]||null;});}
  else{
    /* each part: the base face, a face of its own, or shuffled when its words change (or every minute or hour) */
    const txt={};toks.forEach(t=>{if(P[MPART(t)]==='shuffle'&&!plain(t)){const g=grpOf(t);txt[g]=(txt[g]||'')+' '+t.w;}});
    for(const g in txt){if(!(g in mS.fid)||(slot!=null?newSlot:txt[g]!==mS.seen[g]))mS.fid[g]=pickFace(pool,mS.fid[g],salt+(ORD[g]||g.length*31));mS.seen[g]=txt[g];}
    toks.forEach(t=>{if(plain(t))return;const set=P[MPART(t)]||'base';t.fid=set==='shuffle'?mS.fid[grpOf(t)]||null:set==='base'?null:(faceById(set)?set:null);});}
  mS.sig=sig;if(slot!=null)mS.slot=slot;}
/* Fit, with display faces: try the sentence with each word in the widest face it
   could take, so the type never outgrows the screen whichever face comes in. */
const capScale=(face,f,match)=>match&&face!==f&&face.cap>0?Math.max(.5,Math.min(2,(f.cap/f.upm)/(face.cap/face.upm))):1;
function fitVariants(toks,o){const M=o.mixed;if(!M)return[toks];
  const pool=mPool(),f=baseFace(),match=M.match!==false,mode=M.mode||'parts',P=M.parts||{},plain=t=>M.little!==false&&LITTLE.has(t.k);
  const uw=(id,str)=>{const face=faceById(id)||f;let x=0,prev=null;for(const ch of Array.from(str)){const g=glyphOf(face,ch);if(prev!==null)x+=face.kern(prev,g);x+=face.adv(g);prev=g;}return x/face.upm*capScale(face,f,match);};
  const widest=t=>pool.reduce((b,id)=>uw(id,t.w)>uw(b,t.w)?id:b,null);
  const v=fn=>toks.map(t=>Object.assign({},t,{fid:fn(t)}));
  if(mode==='one')return[...new Set(toks.map(MPART))].filter(p=>p!=='lead').map(p=>v(t=>MPART(t)===p&&!plain(t)?widest(t):null));
  if(mode==='latest'||mode==='some')return[v(t=>t.grp!=='lead'&&!plain(t)?widest(t):null)];
  return[v(t=>{if(plain(t))return null;const s=P[MPART(t)]||'base';return s==='shuffle'?widest(t):s==='base'?null:(faceById(s)?s:null);})];}
const wPalette=()=>{const o=C.words;if(o.rotate&&o.themes&&o.themes.length)return o.themes[new Date().getHours()%o.themes.length];return{bg:o.bg,ink:o.ink,soft:o.soft,date:o.dateCol};};
const glyphOf=(f,ch)=>{let g=f.base(ch);if(!g&&ch==='’')g=f.base("'");return g;};
/* what colour a word takes: hi (the highlight), rest, or the date's own colour */
function roleOf(t,latest){const h=C.words.hi;
  return h==='faces'?(t.fid?'hi':'rest'):h==='time'?(t.part==='time'?'hi':'rest'):h==='latest'?(latest.has(t.k)?'hi':'rest'):h==='parts'?(t.part==='time'?'hi':t.part==='date'?'date':'rest'):'rest';}
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
  const o=C.words,f=baseFace(),bid=baseId(),match=!o.mixed||o.mixed.match!==false;
  const m=o.margin/100*Math.min(W,H),availW=Math.max(1,(W-2*m)*o.measure/100),trk=o.tracking/1000*size;
  let top=0,bot=0;
  const scOf=face=>capScale(face,f,match);
  /* Tracking tightens the core face; every face adds its own tracking from Fonts */
  const shape=(face,str,sc,id)=>{const k=size*sc/face.upm,gl=[],tk=(face===f?trk:0)+trackOf(id)*size;let x=0,prev=null,wb=0;
    for(const ch of Array.from(str)){const id=glyphOf(face,ch);if(prev!==null)x+=face.kern(prev,id)*k+tk;gl.push({id,x,ch,w:face.adv(id)*k});x+=face.adv(id)*k;prev=id;
      const b=face.bbox&&face.bbox(id);if(b){top=Math.max(top,b[0]*k);bot=Math.max(bot,b[1]*k);wb=Math.max(wb,b[1]*k);}}
    return{gl,w:x,bot:wb};};
  const sp=f.adv(glyphOf(f,' '))*size/f.upm*(o.space/100)+trk;
  const words=toks.map(t=>{const role=roleOf(t,latest),own=t.fid&&faceById(t.fid),face=own||f,sc=scOf(face),s=shape(face,t.w,sc,own?t.fid:bid);return{t,hl:role,face,sc,gl:s.gl,w:s.w,bot:s.bot};});
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
  /* set to the bottom, the last line's descenders stay inside the margin too */
  const lastL=lines[lines.length-1],lastBot=lastL?Math.max(0,...lastL.us.flatMap(x=>x.ws).map(w=>w.bot||0)):0;
  const y0=o.valign==='top'?m:o.valign==='bottom'?H-m-blockH-lastBot:(H-blockH)/2;
  const map=new Map();let wide=0;
  lines.forEach((l,li)=>{const ws=l.us.flatMap(x=>x.ws),first=ws[0],last=ws[ws.length-1];wide=Math.max(wide,l.w);
    let x=o.align==='left'?m:o.align==='right'?W-m-l.w:(W-l.w)/2;
    if(o.optical&&o.align==='left'&&first)x-=bearings(first.face,first.gl[0].id)[0]*size*first.sc/first.face.upm;
    if(o.optical&&o.align==='right'&&last)x+=bearings(last.face,last.gl[last.gl.length-1].id)[1]*size*last.sc/last.face.upm;
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
  const worst=[sentence({y,mo:8,d:27,wd:3,h:o.h24?23:12,mi:57,s:57},o),sentence({y,mo:8,d:23,wd:3,h:o.h24?23:0,mi:37,s:37},o)].filter(t=>t.length).flatMap(t=>fitVariants(t,o));
  let lo=.002*W,hi=.6*W;
  for(let i=0;i<22;i++){const mid=(lo+hi)/2;
    if(worst.every(t=>{const L=wSet(t,new Set(),W,H,mid);return L.blockH<=L.availH&&L.wide<=L.availW+.5&&!L.forced;}))lo=mid;else hi=mid;}
  if(wFit.size>20)wFit.clear();wFit.set(key,lo);return lo;}
function wLayout(toks,latest,W,H){
  const o=C.words,size=o.fit?fitSize(W,H):o.size/100*W;
  const key=W+'x'+H+'|'+size.toFixed(3)+'|'+toks.map(t=>t.k+'='+t.w+'*'+roleOf(t,latest)+'@'+(t.fid||'')).join('|');let L=wCache.get(key);if(L)return L;
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
  const k=w.size*(w.sc||1)/w.face.upm,a=from||0,b=to==null?w.gl.length:to;
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
  if(mk!==wMemo[0]){wMemo=[mk,sentence(parts(ms),o)];assignFaces(wMemo[1]);}
  const toks=wMemo[1],sig=toks.map(t=>t.k+'='+t.w+'@'+(t.fid||'')).join('|');
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
function replay(){if(!isWords())return;const o=C.words;wCur=sentence(parts(Date.now()-(o.time&&o.secs?1000:60000)),o);
  assignFaces(wCur);wSig=wCur.map(t=>t.k+'='+t.w+'@'+(t.fid||'')).join('|');wPrev=null;wMemo=['',[]];}

/* ---- faces per numeral (the time): the same three ways as the words ---- */
let cF={l0:[],l2:null},pF={l0:[],l2:null},cS={},cCfg='',cFit=null,curKeys=null;
const cReset=()=>{cS={fid:{},slot:null,one:null,oneFace:null,each:{},last:null,some:{}};cF={l0:[],l2:null};pF=cF;};cReset();
const hasLine2=()=>C.clock.line2==='weekday'||C.clock.line2==='date';
/* the first time shown, Latest change features the minutes */
const firstChange=keys=>new Set(keys.map((k,i)=>k==='m1'||k==='m2'?i:-1).filter(i=>i>=0));
/* every display face a numeral could take, so Fit holds one size */
function clockFitSlots(){const M=C.clock.mixed;if(!M)return null;const P=M.parts||{},out=new Set();
  if((M.mode||'parts')!=='parts'||Object.values(P).includes('shuffle'))mPool().forEach(id=>out.add(id));
  for(const k in P)if(P[k]!=='base'&&P[k]!=='shuffle'&&faceById(P[k]))out.add(P[k]);
  out.delete(eng.baseSlot());return out.size?[...out]:null;}
function clockFaces(keys,ch){
  const M=C.clock.mixed,out={l0:keys.map(()=>null),l2:null};if(!M)return out;
  pickTurn=M.order==='turn';
  const pool=mPool(),now=Date.now(),salt=now%100003,mode=M.mode||'parts',P=M.parts||{},each=!!M.each,two=hasLine2();
  const slot=M.when==='minute'?Math.floor(now/6e4):M.when==='hour'?Math.floor(now/36e5):null,newSlot=slot!=null&&slot!==cS.slot;
  if(mode==='latest'){
    /* the numerals that just changed take a display face, until the next change */
    const one=pickFace(pool,cS.last,salt);cS.last=one;
    keys.forEach((k,i)=>{if(k&&ch.has(i))out.l0[i]=each?pickFace(pool,null,salt+i*31):one;});
    if(two&&ch.has('l2'))out.l2=each?pickFace(pool,null,salt+977):one;}
  else if(mode==='one'){
    /* one numeral (or the second line) at a time, moving on each change, or every minute or hour */
    const ps=[...new Set(keys.filter(Boolean))].concat(two?['line2']:[]);
    if(ps.length&&(cS.one==null||!ps.includes(cS.one)||slot==null||newSlot)){
      let i=Math.floor(rnd(mSeed++*104729+salt)*ps.length);if(ps.length>1&&ps[i]===cS.one)i=(i+1)%ps.length;
      cS.one=ps[i];cS.oneFace=pickFace(pool,cS.oneFace,salt);cS.each={};}
    keys.forEach((k,i)=>{if(k&&k===cS.one)out.l0[i]=each?(cS.each[i]||(cS.each[i]=pickFace(pool,null,salt+i*31))):cS.oneFace;});
    if(two&&cS.one==='line2')out.l2=cS.oneFace;}
  else if(mode==='some'){
    /* a few at random: a numeral that changes (or every minute or hour) takes another font this often */
    const ks=[...new Set(keys.filter(Boolean))].concat(two?['line2']:[]);
    for(const k of ks){const moved=k==='line2'?ch.has('l2'):keys.some((x,i)=>x===k&&ch.has(i)),sl=salt+k.charCodeAt(0)*7+k.charCodeAt(k.length-1);
      if(!(k in cS.some)||(slot!=null?newSlot:moved))cS.some[k]=chance(M,sl)?pickFace(pool,cS.some[k],sl):null;}
    keys.forEach((k,i)=>{if(k)out.l0[i]=cS.some[k]||null;});if(two)out.l2=cS.some.line2||null;}
  else{
    /* each numeral: the core face, a face of its own, or shuffled when it changes (or every minute or hour) */
    const fixed=k=>{const v=P[k]||'base';return v==='base'||v==='shuffle'?null:(faceById(v)?v:null);};
    const ks=[...new Set(keys.filter(Boolean))].concat(two?['line2']:[]);
    for(const k of ks){if(P[k]!=='shuffle')continue;
      const moved=k==='line2'?ch.has('l2'):keys.some((x,i)=>x===k&&ch.has(i));
      if(!(k in cS.fid)||(slot!=null?newSlot:moved))cS.fid[k]=pickFace(pool,cS.fid[k],salt+k.charCodeAt(0)*7+k.charCodeAt(k.length-1));}
    keys.forEach((k,i)=>{if(k)out.l0[i]=P[k]==='shuffle'?(cS.fid[k]||null):fixed(k);});
    if(two)out.l2=P.line2==='shuffle'?(cS.fid.line2||null):fixed('line2');}
  if(slot!=null)cS.slot=slot;
  return out;}
/* ---------------- as a dial: no type, only lines ---------------- */
const isDial=()=>C.show==='dial';
/* each face's hands – hour, minute, second – as a share of the radius */
const HANDS={rays:[.36,.66,.99],ticks:[.5,.79,1],dots:[.5,.78,.9],none:[.5,.8,.95]};
let dNow={h:0,m:0,s:0};
const dPalette=()=>{const o=C.dial;if(o.rotate&&o.themes&&o.themes.length)return o.themes[new Date().getHours()%o.themes.length];return o.colours;};
/* how a hand that steps gets there: Snappy lands at once, Smooth eases, Elastic springs and settles */
const dEase=t=>{if(t>=1)return 1;if(t<=0)return 0;const f=C.dial.feel;return f==='smooth'?eng.E.inOut(t):f==='elastic'?1-Math.exp(-6.5*t)*Math.cos(16*t):eng.E.expoOut(t);};
/* where each hand points, as a share of a turn from 12. Seconds sweep, tick, or
   go round in 58.5 seconds and wait at 12 for the minute (like a station clock).
   The minute hand glides or steps; the hour hand follows it. */
function dHands(d){const o=C.dial,ms=d.getMilliseconds(),s=d.getSeconds(),m=d.getMinutes(),h=d.getHours()%12,len=Math.max(.05,Math.min(.95,o.len||.3))*1000,into=s*1000+ms;
  const sec=o.secMove==='tick'?(s-1+dEase(ms/len))/60:o.secMove==='stop'?Math.min(1,into/58500):into/60000;
  const min=o.minMove==='step'?(m-1+dEase(into/len))/60:(m+into/60000)/60;
  return{h:(h+min)/12,m:min,s:sec};}
/* every mark on the face: which minute it sits on (i), its kind (m minute, h hour,
   q quarter), and where it runs from and to – or, for dots, its radius */
function dMarks(R,u){const o=C.dial,face=o.face||'rays',det=o.detail||'minutes',every=det==='quarters'?15:det==='hours'?5:1,out=[];
  const kind=i=>i%15===0?'q':i%5===0?'h':'m',lw=o.line||2.2,kw=o.key||2.2;
  for(let i=0;i<60;i+=every){const k=kind(i);
    if(face==='rays'){/* from the space in the middle outwards: hours and quarters stand out nearer the centre */
      const a=Math.max(0,Math.min(.9,o.hole==null?.22:o.hole))*R,sp=R-a;
      if(det==='minutes'){out.push({i,k:'m',a,b:R});if(k!=='m')out.push({i,k:'h',a,b:a+.6*sp});if(k==='q')out.push({i,k:'q',a,b:a+.26*sp});}
      else if(det==='hours'){out.push({i,k:'h',a,b:R});if(k==='q')out.push({i,k:'q',a,b:a+.26*sp});}
      else out.push({i,k:'q',a,b:R});}
    else if(face==='ticks'){/* in from the edge: minutes short, hours longer, quarters almost to the middle */
      const t=Math.max(.02,Math.min(.3,o.tick==null?.18:o.tick));out.push({i,k,a:R*(k==='m'?1-t:k==='h'?Math.max(.06,1-3*t):Math.max(.06,1-5*t)),b:R});}
    else if(face==='dots'){const r=k==='m'?lw*2.2*u:k==='h'?kw*4*u:kw*5.6*u;out.push({i,k,dot:r,c:R-kw*5.6*u});}}
  return out;}
const dCol=(P,k)=>k==='m'?P.min:k==='h'?P.hour:P.quarter;
function dDraw(ctx,cx,cy,list,u,col,alpha){const o=C.dial;
  for(const x of list){const a=x.i/60*TAU,s=Math.sin(a),c=Math.cos(a);ctx.globalAlpha=alpha?alpha(x):1;if(ctx.globalAlpha<=.002)continue;
    if(x.dot!=null){ctx.beginPath();ctx.arc(cx+x.c*s,cy-x.c*c,x.dot,0,TAU);ctx.fillStyle=col||dCol(dPal,x.k);ctx.fill();continue;}
    ctx.beginPath();ctx.moveTo(cx+x.a*s,cy-x.a*c);ctx.lineTo(cx+x.b*s,cy-x.b*c);ctx.strokeStyle=col||dCol(dPal,x.k);ctx.lineWidth=Math.max(.25,(x.k==='m'?o.line||2.2:o.key||2.2)*u);ctx.lineCap='butt';ctx.stroke();}
  ctx.globalAlpha=1;}
let dPal=null;
function dialFrame(ctx,W,H,K){
  const o=C.dial,P=dPal=dPalette();S.bg=P.bg;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle=P.bg;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
  ctx.setTransform(K);
  const cx=W/2,cy=H/2,R=Math.max(1,(o.size||86)/100*Math.min(W,H)/2),u=R/1000,face=o.face||'rays',pos=dNow=dHands(new Date());
  const marks=face==='none'?[]:dMarks(R,u);
  /* the minutes first, then the hours and quarters over them */
  for(const k of ['m','h','q'])dDraw(ctx,cx,cy,marks.filter(x=>x.k===k),u);
  /* the marks the second hand has passed: filling the minute, or fading behind it */
  if(o.secs&&o.trail&&o.trail!=='off'&&marks.length){const at=pos.s*60;
    dDraw(ctx,cx,cy,marks,u,P.handS,o.trail==='fill'?x=>x.i<=at+1e-6?1:0:x=>{const age=((at-x.i)%60+60)%60;return Math.max(0,1-age/12);});}
  if(o.ring){ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.strokeStyle=P.hour;ctx.lineWidth=Math.max(.25,(o.key||2.2)*u);ctx.stroke();}
  /* the hands, seconds on top */
  const L=HANDS[face]||HANDS.none,tail=o.tails?.06*R:0,hw=Math.max(.25,(o.hand||6)*u);
  const hand=(p,len,col)=>{const a=p*TAU,s=Math.sin(a),c=Math.cos(a);ctx.beginPath();ctx.moveTo(cx-tail*s,cy+tail*c);ctx.lineTo(cx+len*R*s,cy-len*R*c);ctx.strokeStyle=col;ctx.lineWidth=hw;ctx.lineCap='butt';ctx.stroke();};
  hand(pos.h,L[0],P.handH);hand(pos.m,L[1],P.handM);if(o.secs)hand(pos.s,L[2],P.handS);
  if(o.centre){ctx.beginPath();ctx.arc(cx,cy,hw*2.2,0,TAU);ctx.fillStyle=o.secs?P.handS:P.handM;ctx.fill();}
}
function build(){
  wCache.clear();wFit.clear();wBuilt++;
  {const k=JSON.stringify((C.words||{}).mixed||null);if(k!==mCfg){mCfg=k;mReset();}}
  if(isWords()||isDial()){S=JSON.parse(JSON.stringify(C.base||{}));S.transparent=false;eng.use(S);eng.setHooks(null);eng.setLive(null);return;}
  const c=C.clock;S=JSON.parse(JSON.stringify(C.base||{}));
  Object.assign(S,{seq:false,rOn:false,tightMask:true,stretch:false,qClear:c.change!=='roll',fit:'cap',size:c.size,align:c.align,valign:c.valign,margin:c.margin,tabular:c.tabular,transparent:false,
    tracking:c.tracking!=null?c.tracking:S.tracking,leading:c.leading!=null?c.leading:S.leading,
    qStyle:c.change,qEase:c.feel,qStagger:.3,qDir:'up',qAxis:'vertical',texts:[cur||' ']});
  if(c.move){const k=minutesNow()%4;S.align=CORNERS[k][0];S.valign=CORNERS[k][1];}
  S.mode='none';S.vMode='off';S.axOn=false;S.dur=60;
  if(c.alt==='cycle'){S.vMode='alts';S.vPattern='cycle';S.vOffset=true;S.vStyle='roll';S.vDur=.45;S.vStagger=.2;S.vSteps=Math.max(1,Math.round(c.altRate*(S.dur||60)/60));}
  /* faces per numeral */
  const M=c.mixed;S.faceMatch=!M||M.match!==false;S.faceTrack=C.tracks||{};
  /* new faces only when the face settings change, not on every other setting */
  {const k=JSON.stringify(M||null)+'|'+c.line2;if(k!==cCfg){cCfg=k;cReset();if(curKeys){cF=clockFaces(curKeys,firstChange(curKeys));pF=cF;}}}
  cFit=clockFitSlots();
  eng.use(S);hooksOn();
}
function setConfig(c){C=c;build();}
function frame(ctx,W,H,now,dt){
  if(isWords()||isDial()){
    const T=Date.now()/1000,a=C.drift||0,k=ctx.canvas.width/W,K=new DOMMatrix([k,0,0,k,0,0]);
    if(a>0){const sc=1-a*.04+a*.04*Math.sin(T/41);K.multiplySelf(new DOMMatrix().translateSelf(W/2+a*.05*W*Math.sin(T/23.7),H/2+a*.05*H*Math.sin(T/31.3+1)).scaleSelf(sc,sc).translateSelf(-W/2,-H/2));}
    try{if(isDial())dialFrame(ctx,W,H,K);else wordsFrame(ctx,W,H,now,K);}catch(e){if(!wErr){wErr=1;console.error(e);}}
    return;
  }
  pal=palette();
  {const d=new Date(),tp=timeParts(d),l2=line2(d),str=tp.s+(l2?'\n'+l2:'');
    if(str!==cur){
      let ch;
      if(cur){prev=cur;tStart=now;const a=cur.split('\n')[0],b=tp.s;changed=new Set();if(a.length===b.length){for(let i=0;i<b.length;i++)if(a[i]!==b[i])changed.add(i);}else for(let i=0;i<b.length;i++)changed.add(i);
        ch=new Set(changed);if((cur.split('\n')[1]||'')!==l2)ch.add('l2');}
      else ch=firstChange(tp.keys);
      cur=str;periods=tp.per;cseed++;curKeys=tp.keys;pF=cF;cF=clockFaces(tp.keys,ch);if(!prev)pF=cF;
      const mk=d.getHours()+':'+d.getMinutes();if(mk!==minuteKey){if(minuteKey&&C.clock.move&&sw<0){sw=0;pending='move';}minuteKey=mk;}}
    S.texts[0]=cur;S.bg=pal.bg;S.ink=pal.p[0];
    const t=(now-tStart)/(Math.max(.05,C.clock.len)*1000);
    eng.setLive(t<1&&C.clock.change!=='none'?{from:prev,to:cur,t}:null);
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
return{frame,setConfig,bg:()=>S&&S.bg,replay,words:()=>(wCur||[]).map(t=>t.w).join(' '),faces:()=>(wCur||[]).map(t=>[t.w,t.fid||'']),clockFaces:()=>({text:cur,l0:cF.l0.slice(),l2:cF.l2}),lines,hands:()=>Object.assign({},dNow)};
}