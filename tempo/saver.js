/* Every character the time in words can use, so exports bake them all. */
function saverVocab(){return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:’\'&';}
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
/* ---- colour themes through the day (0.9) ----
   A list of themes, each lasting `every` hours (1 unless set), in order from
   midnight. When the hour turns, the colours fade across over 1.5 seconds. The
   preview can show one theme on its own (C.force) while it's being edited. */
const hourTheme=(list,every)=>list[Math.floor(new Date().getHours()/Math.max(1,every||1))%list.length];
function hex(c){const s=String(c||'');let m=/^#?([0-9a-f]{6})$/i.exec(s);if(m){const v=parseInt(m[1],16);return[v>>16&255,v>>8&255,v&255];}
  m=/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s);if(m)return[1,2,3].map(i=>parseInt(m[i]+m[i],16));
  m=/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s);return m?[+m[1],+m[2],+m[3]]:[0,0,0];}
const toHex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
function mixHex(a,b,t){if(t<=0||a===b)return a;if(t>=1)return b;const A=hex(a),B=hex(b);return toHex(A.map((v,i)=>v+(B[i]-v)*t));}
function blendPal(a,b,t){if(typeof b==='string')return typeof a==='string'?mixHex(a,b,t):b;
  if(Array.isArray(b))return b.map((x,i)=>blendPal(Array.isArray(a)?a[i]:x,x,t));
  if(b&&typeof b==='object'){const o={};for(const k in b)o[k]=a&&k in a?blendPal(a[k],b[k],t):b[k];return o;}return b;}
const PFADE=1500;let pfA=null,pfB=null,pfT=-1e9,pfK='';
/* timed on the frame clock, not the time of day, so a clock that jumps (a promo loop) still fades smoothly */
let fNow=0;
function eased(P){const k=JSON.stringify(P),now=fNow;
  if(!pfK){pfK=k;pfB=P;return P;}
  if(k!==pfK){const tt=(now-pfT)/PFADE;pfA=tt<1?blendPal(pfA,pfB,eng.E.inOut(Math.max(0,tt))):pfB;pfB=P;pfK=k;pfT=now;}
  const t=(now-pfT)/PFADE;return t>=1||t<0?P:blendPal(pfA,P,eng.E.inOut(t));}
function palette(){if(C.force)return C.force;if(C.colours.cycle&&C.palettes&&C.palettes.length)return eased(hourTheme(C.palettes,C.colours.every));return{bg:C.colours.bg,p:C.colours.p};}
const isClock=()=>!isWords()&&!isDial()&&!isType()&&!isStack();
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
const wPalette=()=>{const o=C.words;if(C.force)return C.force;if(o.rotate&&o.themes&&o.themes.length)return eased(hourTheme(o.themes,o.every));return{bg:o.bg,ink:o.ink,soft:o.soft,date:o.dateCol};};
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
  const M=mgOf(o,W,H,0),availW=Math.max(1,(W-M.l-M.r)*o.measure/100),trk=o.tracking/1000*size;
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
  const y0=o.valign==='top'?M.t:o.valign==='bottom'?H-M.b-blockH-lastBot:M.t+(H-M.t-M.b-blockH)/2;
  const map=new Map();let wide=0;
  lines.forEach((l,li)=>{const ws=l.us.flatMap(x=>x.ws),first=ws[0],last=ws[ws.length-1];wide=Math.max(wide,l.w);
    let x=o.align==='left'?M.l:o.align==='right'?W-M.r-l.w:M.l+(W-M.l-M.r-l.w)/2;
    if(o.optical&&o.align==='left'&&first)x-=bearings(first.face,first.gl[0].id)[0]*size*first.sc/first.face.upm;
    if(o.optical&&o.align==='right'&&last)x+=bearings(last.face,last.gl[last.gl.length-1].id)[1]*size*last.sc/last.face.upm;
    const y=y0+capPx+li*lead;
    for(const w of ws){Object.assign(w,{x,y,li,size});map.set(w.t.k,w);x+=w.w+sp;}});
  if(!top){top=capPx;bot=.22*size;}
  return{map,words,size,pad:.04*size,top,bot,lead,blockH,wide,availW,availH:H-M.t-M.b,forced};
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
const mix=mixHex;
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
    /* 0.9: the window takes in the whole descender (it used to stop short where lines
       sit close, so a g or y was cut until the roll ended), plus room below so a word
       arriving is whole before it slows, and room above for Elastic's overshoot */
    if(roll){const ev=wEase(v),cap=L.top,bot=Math.max(0,w.bot)+L.pad+.18*cap,up=L.pad+(o.feel==='elastic'?.14:.05)*cap,bx=[w.x+(g?g.x:0)-L.pad,w.y-L.top-up,(g?g.w:w.w)+2*L.pad,L.top+up+bot];
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
const dPalette=()=>{const o=C.dial;if(C.force)return C.force;if(o.rotate&&o.themes&&o.themes.length)return eased(hourTheme(o.themes,o.every));return o.colours;};
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
  /* 0.9: the face fills like a pie chart behind a hand – from 12 round to the hand,
     starting empty each turn, or filling one turn and emptying the next */
  /* 0.9.1: Sweep follows the hand; In sections fills a wedge at a time (60, or 12 for the
     hour); Fading sections lets each wedge fade in while the hand crosses it. In front of
     everything by default, or behind the hands, or behind the marks. */
  const fillOn=o.fill&&o.fill!=='off',layer=o.fillLayer||(o.fillOver?'hands':'marks')/* 0.9 exports: under the marks unless set over them */,drawFill=()=>{const d=new Date(),ms=d.getTime()-d.getTimezoneOffset()*6e4;
    const per=o.fill==='hour'?432e5:o.fill==='second'?6e4:36e5,turn=Math.floor(ms/per),f=((o.fill==='hour'?pos.h:o.fill==='second'?pos.s:pos.m)%1+1)%1;
    const a0=-Math.PI/2,r=Math.max(.02,Math.min(1,o.fillR==null?1:o.fillR))*R,empty=o.fillTurn==='turn'&&turn%2===1,st=o.fillStyle||'sweep';
    ctx.save();const A=o.fillA==null?1:o.fillA;ctx.globalCompositeOperation=o.fillBlend&&o.fillBlend!=='normal'?o.fillBlend:'source-over';ctx.fillStyle=P.fill||P.handM;
    const wedge=(b0,b1,al)=>{if(al<=.002||b1<=b0)return;ctx.globalAlpha=A*Math.min(1,al);ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a0+b0*TAU,a0+b1*TAU);ctx.closePath();ctx.fill();};
    if(st==='sweep'){if(empty)wedge(f,1,1);else wedge(0,f,1);}
    else{const n=o.fill==='hour'?12:60,at=f*n;
      /* whole sections in one shape, so no seams show between them; the one fading on its own */
      let run=-1;for(let i=0;i<=n;i++){let v=i===n?0:st==='fade'?Math.max(0,Math.min(1,at-i)):(i<Math.floor(at+1e-9)?1:0);if(empty&&i<n)v=1-v;
        if(v>=1){if(run<0)run=i;continue;}if(run>=0){wedge(run/n,i/n,1);run=-1;}if(i<n&&v>0)wedge(i/n,(i+1)/n,v);}}
    ctx.restore();};
  if(fillOn&&layer==='marks')drawFill();
  /* the minutes first, then the hours and quarters over them */
  for(const k of ['m','h','q'])dDraw(ctx,cx,cy,marks.filter(x=>x.k===k),u);
  if(fillOn&&layer==='hands')drawFill();
  /* the marks the second hand has passed: filling the minute, or fading behind it */
  if(o.secs&&o.trail&&o.trail!=='off'&&marks.length){const at=pos.s*60;
    dDraw(ctx,cx,cy,marks,u,P.handS,o.trail==='fill'?x=>x.i<=at+1e-6?1:0:x=>{const age=((at-x.i)%60+60)%60;return Math.max(0,1-age/12);});}
  if(o.ring){ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.strokeStyle=P.hour;ctx.lineWidth=Math.max(.25,(o.key||2.2)*u);ctx.stroke();}
  /* the hands, seconds on top */
  /* the hands: each its own weight (0.9), square or round ends, a dot or ring at
     the tip, a counterweight on the second hand, and their own opacity and blend */
  const L=HANDS[face]||HANDS.none,hws=(o.hw||[o.hand,o.hand,o.hand]).map(v=>Math.max(.25,(v==null?o.hand||6:v)*u)),hw=hws[0];
  const tipOn=o.tip&&o.tip!=='none'?(o.tipOn||'m'):'',tipR=Math.max(1,(o.tipSize||3)*u*4);
  ctx.save();ctx.globalAlpha=o.handA==null?1:o.handA;ctx.globalCompositeOperation=o.blend&&o.blend!=='normal'?o.blend:'source-over';
  const hand=(p,len,col,w,k)=>{const a=p*TAU,s=Math.sin(a),c=Math.cos(a),cw=k==='s'&&o.weight,tail=o.tails||cw?(cw?.15:.06)*R:0;
    ctx.beginPath();ctx.moveTo(cx-tail*s,cy+tail*c);ctx.lineTo(cx+len*R*s,cy-len*R*c);ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap=o.cap==='round'?'round':'butt';ctx.stroke();
    if(cw){ctx.beginPath();ctx.arc(cx-tail*s,cy+tail*c,Math.max(w*2.6,10*u),0,TAU);ctx.fillStyle=col;ctx.fill();}
    if(tipOn&&(tipOn==='all'||tipOn.includes(k))){const tx=cx+len*R*s,ty=cy-len*R*c;ctx.beginPath();ctx.arc(tx,ty,tipR,0,TAU);
      if(o.tip==='ring'){ctx.fillStyle=P.bg;ctx.fill();ctx.lineWidth=Math.max(.5,w*.7);ctx.strokeStyle=col;ctx.stroke();}else{ctx.fillStyle=col;ctx.fill();}}};
  hand(pos.h,L[0],P.handH,hws[0],'h');hand(pos.m,L[1],P.handM,hws[1],'m');if(o.secs)hand(pos.s,L[2],P.handS,hws[2],'s');
  if(o.centre){ctx.beginPath();ctx.arc(cx,cy,Math.max(hw,hws[1])*(o.centreSize||2.2),0,TAU);ctx.fillStyle=o.secs?P.handS:P.handM;ctx.fill();}
  ctx.restore();
  if(fillOn&&layer==='front')drawFill();
}
/* ---------------- Columns and Rings: the time as lists of words (0.9) ----------------
   Columns: hour, minutes, seconds, day, date, month and year, each a column of every
   word it can be, with the one that's true now on a single line across the screen.
   Rings: hours, minutes and seconds as rings of words round a centre, the current
   one at three o'clock; or with tens and units on rings of their own.
   A number is said the way it's written: minutes and seconds as tens then units
   (Zero Seven, Seventeen, Twenty Three), so a teen or a round ten leaves the units
   column empty – it rests above its list. Dates the same way in ordinals (Seventh,
   Seventeenth, Twenty First), years as Twenty Twenty Six. */
const isCols=()=>C.show==='columns',isRings=()=>C.show==='rings',isType=()=>isCols()||isRings();
const T1=['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const T10=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
const TORD=n=>{const w=n<20?T1[n]:T10[Math.floor(n/10)]+(n%10?' '+T1[n%10]:'');const p=w.split(' '),l=p.pop(),o=ORDS[l.toLowerCase()];p.push(o?o[0].toUpperCase()+o.slice(1):l.endsWith('y')?l.slice(0,-1)+'ieth':l+'th');return p.join(' ');};
const TDAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const say=n=>n<20?T1[n]:T10[Math.floor(n/10)]+(n%10?' '+T1[n%10]:'');
/* every list, and which entry is true for a date (-1: none – the column rests above its list) */
function tCols(o){const Z=o.zero==='oh'?'Oh':'Zero',P=o.parts||{},out=[];
  const tens=[Z].concat(T1.slice(10),T10.slice(2,6)),tIdx=n=>n<10?0:n<20?n-9:9+Math.floor(n/10);
  const units=[Z].concat(T1.slice(1,10)),uIdx=n=>n<10?n:n>=20&&n%10?n%10:-1;
  const col=(k,list,at,fixed)=>out.push({k,list,at,fixed:!!fixed});
  const time=P.time!==false,secs=time&&o.secs!==false&&P.secs!==false,date=P.day!==false||P.date!==false||P.month!==false||P.year!==false;
  if(time){if(o.h24)col('h',Array.from({length:24},(_,i)=>say(i)),z=>z.h);else col('h',T1.slice(1,13),z=>(z.h%12||12)-1);
    col('mt',tens,z=>tIdx(z.mi));col('mu',units,z=>uIdx(z.mi));}
  if(secs){col('and',['&'],()=>0,1);col('st',tens,z=>tIdx(z.s));col('su',units,z=>uIdx(z.s));col('sec',['Seconds'],()=>0,1);}
  if(date&&time)col('on',['On'],()=>0,1);
  if(P.day!==false)col('wd',TDAYS,z=>(z.wd+6)%7);
  if(P.date!==false){col('dt',Array.from({length:19},(_,i)=>TORD(i+1)).concat(['Twentieth','Twenty','Thirtieth','Thirty']),z=>z.d<20?z.d-1:z.d===20?19:z.d<30?20:z.d===30?21:22);
    col('du',Array.from({length:9},(_,i)=>TORD(i+1)),z=>z.d>20&&z.d!==30&&z.d%10?z.d%10-1:-1);}
  if(P.month!==false)col('mo',MONTHS,z=>z.mo);
  if(P.year!==false){const y=new Date().getFullYear(),short=y>=2020&&y<2050;
    col('yc',[say(Math.floor(y/100)%100)],()=>0);
    if(short)col('yd',['Twenty','Thirty','Forty'],z=>Math.floor(z.y%100/10)-2);else col('yd',tens,z=>tIdx(z.y%100));
    col('yu',T1.slice(1,10),z=>{const lo=z.y%100;return(lo<10||lo>=20)&&lo%10?lo%10-1:-1;});}
  return out;}
function tRings(o){const Z=(o.zero==='oh'?'oh':'zero'),out=[],lw=s=>s.toLowerCase();
  const ring=(k,list,at,blank)=>out.push({k,list:blank?list.concat(['']):list,at:blank?z=>{const i=at(z);return i<0?list.length:i;}:at});
  if(o.h24)ring('h',Array.from({length:24},(_,i)=>say(i)),z=>z.h);else ring('h',T1.slice(1,13),z=>(z.h%12||12)-1);
  const whole=n=>n===0?'o’clock':n<10?Z+' '+lw(T1[n]):lw(say(n)),wholeS=n=>n<10?Z+' '+lw(T1[n]):lw(say(n));
  if(o.split){const tens=[Z].concat(T1.slice(10).map(lw),T10.slice(2,6).map(lw)),tIdx=n=>n<10?0:n<20?n-9:9+Math.floor(n/10),units=[Z].concat(T1.slice(1,10).map(lw)),uIdx=n=>n<10?n:n>=20&&n%10?n%10:-1;
    ring('mt',tens,z=>tIdx(z.mi));ring('mu',units,z=>uIdx(z.mi),1);
    if(o.secs!==false){out.push({k:'and',amp:1});ring('st',tens,z=>tIdx(z.s));ring('su',units,z=>uIdx(z.s),1);}}
  else{ring('m',Array.from({length:60},(_,i)=>whole(i)),z=>z.mi);
    if(o.secs!==false){out.push({k:'and',amp:1});ring('s',Array.from({length:60},(_,i)=>wholeS(i)),z=>z.s);}}
  /* 0.9.1: the date, ring by ring outwards – day, date, month, year (the year a single word that doesn't turn) */
  const R=o.rparts||{};
  if(R.day)ring('wd',TDAYS,z=>(z.wd+6)%7);
  if(R.date)ring('dd',Array.from({length:31},(_,i)=>lw(TORD(i+1))),z=>z.d-1);
  if(R.month)ring('mo',MONTHS,z=>z.mo);
  if(R.year){const y=new Date().getFullYear();ring('yr',[lw(say(Math.floor(y/100)%100))+' '+lw(y%100<10?(y%100?Z+' '+T1[y%100]:'hundred'):say(y%100))],()=>0);}
  return out;}
/* Case: as drawn (Columns in Title Case; Rings with the hours in Title Case, the rest lower case), or one case throughout */
const tCase=(s,k)=>{const c=C.type.case||'auto';if(c==='upper')return s.toUpperCase();if(c==='lower')return s.toLowerCase();
  if(c==='title')return s.replace(/(^|\s)(\S)/g,(m,a,b)=>a+b.toUpperCase());return s;};
const tFace=()=>faceById(C.type.font)||baseFace();
const tShapes=new Map();
/* tk: tracking in font units – Columns and Rings' own, plus the font's own from Fonts (0.9.1) */
function tShape(f,str,tk){tk=tk||0;const key=(f.name||'')+'|'+(f.weight||'')+'|'+tk+'|'+str;let r=tShapes.get(key);if(r)return r;
  const gl=[];let x=0,prev=null;for(const ch of Array.from(str)){const id=glyphOf(f,ch);if(prev!==null)x+=f.kern(prev,id)+tk;gl.push({id,x});x+=f.adv(id);prev=id;}
  r={gl,w:x};if(tShapes.size>3000)tShapes.clear();tShapes.set(key,r);return r;}
function tText(ctx,M,f,s,size,col,alpha){if(alpha<=.003||!s.gl.length)return;const k=size/f.upm;ctx.globalAlpha=Math.min(1,alpha);ctx.fillStyle=col;
  for(const g of s.gl){ctx.setTransform(M.multiply(new DOMMatrix([k,0,0,k,g.x*k,0])));f.draw(ctx,g.id,false);}}
/* each list's place, eased: it rolls one entry at a time, always forwards round a ring */
let tAnim=new Map(),tSig='';
const tEase=t=>{const f=C.type.feel;return f==='smooth'?eng.E.inOut(t):f==='elastic'?eng.E.backOut(t,1.4):eng.E.expoInOut(t);};
function tPos(key,target,now,n){let a=tAnim.get(key);
  if(!a){a={from:target,to:target,t0:-1e9};tAnim.set(key,a);}
  const len=Math.max(.05,C.type.len||.6)*1000,cur=a.from+(a.to-a.from)*tEase(Math.min(1,(now-a.t0)/len));
  if(n){/* a ring: unwrapped, forwards */if(((a.to%n)+n)%n!==target){let d=((target-a.to)%n+n)%n;a.from=cur;a.to=a.to+d;a.t0=now;}}
  else if(a.to!==target){a.from=cur;a.to=target;a.t0=now;}
  return a.from+(a.to-a.from)*tEase(Math.min(1,(now-a.t0)/len));}
const tPal=()=>{const o=C.type;if(C.force)return C.force;if(o.rotate&&o.themes&&o.themes.length)return eased(hourTheme(o.themes,o.every));return{bg:o.bg,ink:o.ink,soft:o.soft};};
function typeFrame(ctx,W,H,now,K){
  const o=C.type,P=tPal(),f=tFace(),z=parts(Date.now());S.bg=P.bg;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle=P.bg;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
  if(!f)return;const capU=f.cap>0?f.cap:f.upm*.7,far=o.far==='fade';
  /* tracking, and the space between columns and rings: a word space, which follows the tracking */
  const tk=((o.tracking||0)/1000+trackOf(faceById(o.font)?o.font:baseId()))*f.upm,sp=(f.adv(glyphOf(f,' '))||f.upm*.25)*(o.space==null?100:o.space)/100+tk;
  if(isCols()){
    const cols=tCols(o);
    cols.forEach(c=>{c.shapes=c.list.map(s=>tShape(f,tCase(s,c.k),tk));c.w=Math.max(...c.shapes.map(s=>s.w));});
    const lineU=cols.reduce((a,c)=>a+c.w,0)+sp*(cols.length-1),size=Math.max(1,(o.size||60)/100*W/lineU*f.upm),k=size/f.upm,capPx=capU*k,pitch=(o.leading||1.6)*capPx;
    let x=(W-lineU*k)/2;const y0=H/2+capPx/2;
    for(const c of cols){const pos=c.fixed?0:tPos('c.'+c.k,c.at(z),now,0);
      c.shapes.forEach((s,i)=>{const d=Math.abs(i-pos),y=y0+(i-pos)*pitch;if(y<-pitch||y>H+pitch)return;
        const col=c.fixed?P.ink:mixHex(P.soft,P.ink,Math.max(0,1-d)),al=far?Math.max(0,1-Math.max(0,d-1)/7):1;
        tText(ctx,K.multiply(new DOMMatrix([1,0,0,1,x,y])),f,s,size,col,al);});
      x+=(c.w+sp)*k;}
    ctx.globalAlpha=1;return;}
  /* rings */
  /* 0.9.1: one word space between rings, measured from the longest word on each, so the
     worst case is always a single space apart and shorter words have more room */
  const rings=tRings(o),cx=W/2,cy=H/2,gapU=sp;let r=(o.hole==null?7.8:o.hole)*capU;
  const amp=tShape(f,'&',tk);
  for(const g of rings){g.r=r;if(g.amp){r+=amp.w+gapU;continue;}g.shapes=g.list.map(s=>tShape(f,tCase(s,g.k),tk));g.w=Math.max(...g.shapes.map(s=>s.w));r+=g.w+gapU;}
  const outerU=r-gapU,k=Math.max(1e-4,(o.size||71)/100*Math.min(W,H)/2/outerU),size=k*f.upm,capPx=capU*k;
  for(const g of rings){const R=g.r*k;
    if(g.amp){tText(ctx,K.multiply(new DOMMatrix([1,0,0,1,cx+R,cy+capPx/2])),f,amp,size,P.ink,1);continue;}
    const n=g.list.length,pos=tPos('r.'+g.k,g.at(z),now,n),step=TAU/n;
    g.shapes.forEach((s,i)=>{if(!s.gl.length)return;let d=((i-pos)%n+n)%n;if(d>n/2)d-=n;const a=d*step,ad=Math.abs(d);
      const col=mixHex(P.soft,P.ink,Math.max(0,1-ad)),al=far?Math.max(0,1-Math.max(0,ad-1)/(n/4)):1;
      const M=K.multiply(new DOMMatrix().translateSelf(cx,cy).rotateSelf(a*180/Math.PI).translateSelf(R,capPx/2));tText(ctx,M,f,s,size,col,al);});}
  ctx.globalAlpha=1;
}
/* ---------------- Stack (0.9.3): the time and date as a stack of lines ----------------
   From Steve's Univers mock-up: 08.03.49 / Wednesday / 31September / 26 – the time on
   top, the day hanging from the time's last figure (a Swiss offset), the date run into
   the month, the year below. Everything is sized and placed for the worst case – the
   widest day, date and month there are – so nothing moves or changes size as the days
   do. Lines sit as close as they can without ink touching: each pair of lines is checked
   glyph by glyph over every day, date and month they could ever show, so a descender may
   hang into the line below only where nothing is there to touch it. */
const isStack=()=>C.show==='stack';
/* margins in px (0.9.8): one for all four sides, or each its own (o.margins: % of the shorter side, like o.margin) */
function mgOf(o,W,H,dflt){const u=Math.min(W,H)/100,m=o.margins;if(m)return{t:(m.t||0)*u,r:(m.r||0)*u,b:(m.b||0)*u,l:(m.l||0)*u};const v=(o.margin==null?dflt:o.margin)*u;return{t:v,r:v,b:v,l:v};}
const XDAY={full:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],short:['Mon','Tues','Weds','Thurs','Fri','Sat','Sun'],three:['Mon','Tue','Wed','Thu','Fri','Sat','Sun']};
const XMON={full:MONTHS,short:['Jan','Feb','Mar','Apr','May','June','July','Aug','Sept','Oct','Nov','Dec'],three:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']};
const XSEP={stop:'.',colon:':',comma:',',space:' '};
/* the lines for a moment: each a list of runs, each run in its own colour (role) */
function xLines(o,z){const sep=XSEP[o.sep]||'.',h=o.h24?z.h:(z.h%12||12),hs=o.zero||o.h24?pad(h):String(h);
  const time=hs+sep+pad(z.mi)+(o.secs?sep+pad(z.s):''),day=(XDAY[o.day]||XDAY.full)[(z.wd+6)%7];
  const date=o.dzero?pad(z.d):String(z.d),mon=(XMON[o.month]||XMON.full)[z.mo],yr=o.year==='full'?String(z.y):pad(z.y%100),gap=o.dspace?' ':'';
  const L=[[{t:time,r:'time'}],[{t:day,r:'day'}]];
  if(o.lines==='five')L.push([{t:date,r:'date'}],[{t:mon,r:'date'}],[{t:yr,r:'year'}]);
  else if(o.lines==='three')L.push([{t:date+gap+mon+' ',r:'date'},{t:yr,r:'year'}]);
  else L.push([{t:date+gap+mon,r:'date'}],[{t:yr,r:'year'}]);
  return L;}
/* every moment worth checking for the worst case: each hour, each figure in every place, every
   day, every date of every month, this year and next */
function xCases(o){const y=new Date().getFullYear(),out=[];
  for(let h=0;h<24;h++)for(let d=0;d<10;d++)out.push({y,mo:0,d:1,wd:1,h,mi:d*11%60,s:d*11%60});
  for(let wd=0;wd<7;wd++)for(let mo=0;mo<12;mo++)for(const d of [1,9,10,11,19,20,21,22,28,29,30,31])out.push({y:mo%2?y:y+1,mo,d,wd,h:8,mi:3,s:49});
  return out;}
let xMemo=null;
const xFace=()=>faceById(C.stack.font)||baseFace();
function xMetrics(f){const capU=f.cap>0?f.cap:f.upm*.7;
  const box=id=>{const b=f.bbox&&f.bbox(id);return b?[b[0],b[1]]:[capU,f.desc>0?f.desc:f.upm*.2];};
  let digitW=0;for(const d of '0123456789')digitW=Math.max(digitW,f.adv(glyphOf(f,d)));
  return{capU,box,digitW};}
/* lay one moment out in font units: each line's glyphs, x, and ink top/bottom */
/* optical spacing where a figure meets a letter: the gap the two would have as each sits beside its own kind
   (figures as 00, letters as themselves doubled), against the gap they actually have – in font units */
/* figures never touch: the least spacing between any two figures (in their cells) that keeps a hair between
   them at every height – the floor under tight tracking (Univers' 44 at −65 otherwise joins). Font units. */
function xFig(f,M){if(M.fig!=null)return M.fig;const O=eng.optical,u=f.upm;let raw=Infinity;
  if(O){const P=[...'0123456789'].map(d=>{const id=glyphOf(f,d);return{p:O.prof(f,id),o:(M.digitW-f.adv(id))/2};});
    for(const A of P)for(const B of P){const g=O.gap(A.p,B.p,(M.digitW+B.o-A.o)/u,M.capU/u);if(g&&isFinite(g.raw))raw=Math.min(raw,g.raw);}}
  M.fig=isFinite(raw)?(.015-raw)*u:-Infinity;return M.fig;}
function xJoin(f,M,A,idB,bx,trk){const O=eng.optical;if(!O)return 0;const u=f.upm,cap=M.capU/u,pa=O.prof(f,A.id),pb=O.prof(f,idB);if(!pa||!pb)return 0;
  const pz=O.prof(f,glyphOf(f,'0')),gz=pz&&O.gap(pz,pz,M.digitW/u,cap),r0=gz?gz.mean:0;
  const self=(id,p)=>{const g=O.gap(p,p,f.adv(id)/u,cap);return g?g.mean:r0;};
  const aDig=/\d/.test(A.ch),refA=aDig?r0:self(A.id,pa),refB=aDig?self(idB,pb):r0,g=O.gap(pa,pb,(bx-A.x)/u,cap);if(!g)return 0;
  let d=(refA+refB)/2-g.mean;d=Math.max(-.25,Math.min(.25,d));if(isFinite(g.raw))d=Math.max(d,.015-trk/u-g.raw);return d*u;}
function xSet(o,f,z,M){const t0=(o.tracking||0)/1000+trackOf(faceById(o.font)?o.font:baseId()),tl=o.tl||{},lines=xLines(o,z);
  /* tracking: the overall amount plus each line's own fine adjustment (the time, the day, the date and month, the year) */
  const tkOf=r=>(t0+(tl[r]||0)/1000)*f.upm;
  const zeroL=bearings(f,glyphOf(f,'0'))[0],dw=M.digitW;
  /* the time's figures all take the widest figure's width (tabular), centred in it, so the time never shifts as it counts;
     the date and year use the font's own figures and kerning (0.9.7) – they change once a day, and a 1 then sits on its own ink */
  const u=f.upm,O=eng.optical,opt=o.optical!==false&&!!O,sepRoom=sid=>opt?O.sepSlot(f,sid,o.sepSpace==null?1:o.sepSpace,tkOf('time')/u)*u:0;
  return lines.map((runs,li)=>{const gl=[];let x=0,prev=null;
    for(const run of runs)for(const ch of Array.from(run.t)){const id=glyphOf(f,ch),tab=/\d/.test(ch)&&run.r==='time',off=tab?(dw-f.adv(id))/2:0,sep=/^[.:,]$/.test(ch);
      if(prev!==null){const pt=prev.tab;let k=0;
        if(!tab&&!pt)k=f.kern(prev.id,id);
        /* optical (0.9.6): where a fixed-width figure meets a letter the font has no kerning for it – space it by eye */
        else if(opt&&tab!==pt&&/\p{L}/u.test(tab?prev.ch:ch))k=xJoin(f,M,gl[gl.length-1],id,x+off,tkOf(run.r));
        /* 0.9.7: a separator between figures gets the room its setting asks for, half each side */
        if(pt&&sep)k+=sepRoom(id)/2;else if(prev.sep&&tab)k+=sepRoom(prev.id)/2;
        x+=k+(tab&&pt?Math.max(tkOf(run.r),xFig(f,M)):tkOf(run.r));}
      const [t,b]=ch===' '?[0,0]:M.box(id);
      const w=tab?dw:f.adv(id);gl.push({id,x:x+off,w:f.adv(id),cell:w,ch,r:run.r,t,b,tab});x+=w;prev={id,ch,tab,sep};}
    /* optical (0.9.6): a separator between figures sits optically centred between them – the figures don't move */
    if(opt)for(let j=1;j<gl.length-1;j++){const S0=gl[j],A=gl[j-1],B=gl[j+1];if(!/^[.:,]$/.test(S0.ch)||!A.tab||!B.tab)continue;
      const sh=O.centre(O.prof(f,A.id),O.prof(f,S0.id),O.prof(f,B.id),(S0.x-A.x)/u,(B.x-S0.x)/u,M.capU/u,tkOf(S0.r)/u);S0.x+=sh*u;}
    /* the left edge is the ink, not the side bearing: the time's by its 0 (so it never shifts) – or, set to, by its first
       figure's own ink (a leading 1 then sits on the edge, and the line moves when that figure changes) */
    const first=gl[0];let lsb=0;
    if(first)lsb=first.tab?(o.lead==='ink'?first.x+bearings(f,first.id)[0]:(dw-f.adv(glyphOf(f,'0')))/2+zeroL):first.x+bearings(f,first.id)[0];
    return{gl,w:x,lsb,li};});}
/* where each line starts, in font units: flush left, or (the day) hanging from the time's last figure, or flush right */
function xPlace(o,f,lines,blockW){const zeroL=bearings(f,glyphOf(f,'0'))[0],M0=xMetrics(f);
  lines.forEach((L,i)=>{L.x=-L.lsb;
    if(i===1&&o.dayAt==='figure'){const T=lines[0],last=T.gl[T.gl.length-1],cellX=last?last.x-(last.cell-last.w)/2:0;L.x=T.x+(last?cellX+(M0.digitW-f.adv(glyphOf(f,'0')))/2+zeroL:0)-L.lsb;}
    else if(i===1&&o.dayAt==='right'&&blockW!=null){const last=L.gl[L.gl.length-1];L.x=blockW-(last?last.x+last.w-bearings(f,last.id)[1]:L.w);}});
  return lines;}
/* the layout for the worst case: block width and height, and the baseline step between each pair of lines */
/* Each glyph's ink, column by column: how high it reaches and how low it hangs (font units, from the baseline).
   Drawn once at 1 px = upm/100 and read back, so lines can be closed up against the actual shapes – the bowl of a p,
   the tail of a y – rather than their boxes. Faces without outlines (the demo face) fall back to their boxes. */
const xProf=new Map(),XRES=100;
function xGlyphProf(f,id){const key=(f.name||'')+'#'+id+'#'+f.upm;let p=xProf.get(key);if(p!==undefined)return p;p=null;
  try{const u=f.upm,s=XRES/u,path=f.pathD&&f.pathD(id);
    if(path){const x0=-.5*u,adv=f.adv(id),up=1.4*u,dn=.8*u,w=Math.ceil((adv+u)*s)+2,h=Math.ceil((up+dn)*s)+2;
      const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});
      g.setTransform(s,0,0,s,-x0*s,up*s);g.fill(new Path2D(path));const d=g.getImageData(0,0,w,h).data,top=[],bot=[];
      for(let cx=0;cx<w;cx++){let a=-1,b=-1;for(let cy=0;cy<h;cy++)if(d[(cy*w+cx)*4+3]>0){if(a<0)a=cy;b=cy;}
        top.push(a<0?null:up-a/s);bot.push(b<0?null:(b+1)/s-up);}
      p={x0,step:1/s,top,bot};}}catch(e){p=null;}
  xProf.set(key,p);return p;}
/* a line's (or several lines') ink as bins of BIN font units across: the highest top and the lowest bottom in each */
function xLineProf(f,lines,M,BIN,lo,nb){const top=new Float64Array(nb).fill(-Infinity),bot=new Float64Array(nb).fill(-Infinity);
  for(const L of lines)for(const g of L.gl){if(g.ch===' ')continue;const gx=L.x+g.x,P=xGlyphProf(f,g.id);
    if(!P){/* no outline: the box */const b0=Math.max(0,Math.floor((gx-lo)/BIN)),b1=Math.min(nb-1,Math.floor((gx+g.w-lo)/BIN));for(let b=b0;b<=b1;b++){top[b]=Math.max(top[b],g.t);bot[b]=Math.max(bot[b],g.b);}continue;}
    for(let c=0;c<P.top.length;c++){if(P.top[c]==null)continue;const xa=gx+P.x0+c*P.step,b0=Math.max(0,Math.floor((xa-lo)/BIN)),b1=Math.min(nb-1,Math.floor((xa+P.step-lo)/BIN));
      for(let b=b0;b<=b1;b++){if(P.top[c]>top[b])top[b]=P.top[c];if(P.bot[c]>bot[b])bot[b]=P.bot[c];}}}
  return{top,bot};}
/* the layout for the worst case: block width and height, and the baseline step between each pair of lines */
function xBuild(o,f){const M=xMetrics(f),cases=xCases(o),gapU=(o.gap==null?.18:o.gap)*M.capU,n=xLines(o,cases[0]).length;
  let sets=cases.map(z=>xPlace(o,f,xSet(o,f,z,M)));
  let W=0;for(const s of sets)for(const L of s)W=Math.max(W,L.x+L.w);
  if(o.dayAt==='right'){/* the day flush right: its end lines up with the widest line's (its own, when it's the widest) */let w2=0;for(const s of sets)for(const L of s)w2=Math.max(w2,L.li===1?L.w-L.lsb:L.x+L.w);W=w2;
    sets=cases.map(z=>xPlace(o,f,xSet(o,f,z,M),W));}
  /* each line's possible contents, once each */
  const uniq=i=>{const m=new Map();for(const s of sets){const L=s[i];m.set(L.gl.map(g=>g.ch).join('')+'@'+Math.round(L.x),L);}return[...m.values()];};
  const BIN=Math.max(1,f.upm/200),lo=-f.upm,nb=Math.ceil((W+2*f.upm)/BIN)+1,dil=Math.ceil(gapU/BIN);
  const prof=[];for(let i=0;i<n;i++)prof.push(xLineProf(f,uniq(i),M,BIN,lo,nb));
  const topU=Math.max(0,...prof[0].top.filter(isFinite)),botU=Math.max(0,...prof[n-1].bot.filter(isFinite));
  /* the step for each pair: the lower line's tops, widened by the gap either side (so ink never comes closer than
     the gap sideways either), against the upper line's bottoms – over everything either line could ever show */
  /* a round figure's overshoot below the baseline – anything deeper is a descender */
  const hang=Math.max(0,Math.min(.05*M.capU,M.box(glyphOf(f,'0'))[1])),steps=[],plain=[];
  for(let i=0;i<n-1;i++){const A=prof[i],B=prof[i+1],tw=new Float64Array(nb).fill(-Infinity);
    for(let b=0;b<nb;b++){const t=B.top[b];if(!isFinite(t))continue;for(let d=Math.max(0,b-dil);d<=Math.min(nb-1,b+dil);d++)if(t>tw[d])tw[d]=t;}
    let need=0,np=0;for(let b=0;b<nb;b++){if(!isFinite(tw[b])||!isFinite(A.bot[b]))continue;need=Math.max(need,A.bot[b]+tw[b]);np=Math.max(np,Math.min(A.bot[b],hang)+tw[b]);}
    if(!need){/* nothing above anything: still a line apart */need=np=Math.max(0,...B.top.filter(isFinite));}
    steps.push(need+gapU);plain.push(np+gapU);}
  /* Even: one regular step – the widest a pair needs for its caps and ascenders – and more only where a descender
     really hangs over something below. Off: every pair as close as it can go. */
  const even=o.even!==false,base=Math.max(0,...plain),st=steps.map(s=>even?Math.max(s,base):s);
  const H=topU+st.reduce((a,b)=>a+b,0)+botU;
  return{W,H,topU,botU,steps:st,M};}
let xAnim=new Map(),xMemoKey='';
const xEase=t=>{const fl=C.stack.feel;return fl==='smooth'?eng.E.inOut(t):fl==='elastic'?eng.E.backOut(t,1.4):eng.E.expoInOut(t);};
const xPal=()=>{const o=C.stack;if(C.force)return C.force;if(o.rotate&&o.themes&&o.themes.length)return eased(hourTheme(o.themes,o.every));return o.colours;};
let xLast=null;
function stackFrame(ctx,W,H,now,K){
  const o=C.stack,P=xPal(),f=xFace(),z=parts(Date.now());S.bg=P.bg;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle=P.bg;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
  if(!f)return;
  const key=(f.name||'')+'|'+JSON.stringify([o.h24,o.zero,o.sep,o.secs,o.day,o.month,o.year,o.dzero,o.dspace,o.lines,o.dayAt,o.gap,o.even,o.tracking,o.tl,o.optical,o.sepSpace,o.lead,o.font,new Date().getFullYear()]);
  if(key!==xMemoKey){xMemoKey=key;xMemo=xBuild(o,f);xAnim=new Map();}
  const B=xMemo,M=mgOf(o,W,H,4),m=Math.min(M.t,M.r,M.b,M.l),aw=W-M.l-M.r,ah=H-M.t-M.b;
  /* drift: a slow wander away from the corner it's latched to (never towards the edge), up to the margin or 2% of the screen –
     room for it is kept in the fit, so the far side never crosses its margin either */
  const dr=(C.drift||0)*Math.max(m,.02*Math.min(W,H));
  const k=Math.max(1e-4,Math.min((aw-dr)*(o.size||70)/100/B.W,(ah-dr)/B.H)),bw=B.W*k,bh=B.H*k,an=o.anchor||'br';
  const T=Date.now()/1000,wx=dr*(.5-.5*Math.cos(T/23.7)),wy=dr*(.5-.5*Math.cos(T/31.3+1));
  const bx=(an.includes('l')?M.l+wx:an.includes('r')?W-M.r-bw-wx:M.l+(aw-bw)/2+wx-dr/2),by=(an.startsWith('t')?M.t+wy:an.startsWith('b')?H-M.b-bh-wy:M.t+(ah-bh)/2+wy-dr/2);
  const lines=xPlace(o,f,xSet(o,f,z,B.M),B.W);xLast={k,bx,by,B,lines:lines.map(L=>({x:L.x,text:L.gl.map(g=>g.ch).join('')}))};
  const size=k*f.upm,len=Math.max(.05,o.len||.6)*1000,col=r=>P[r]||P.time;
  let base=by+B.topU*k;
  lines.forEach((L,i)=>{if(i>0)base+=B.steps[i-1]*k;
    const txt=L.gl.map(g=>g.ch).join(''),a=xAnim.get(i);
    if(!a||a.to!==txt){const was=a?a.to:null;xAnim.set(i,{from:was,to:txt,t0:was==null?-1e9:now,prev:a?a.lines:null,lines:L});}
    const A=xAnim.get(i),t=Math.min(1,(now-A.t0)/len),ch=o.change||'roll';
    const draw=(LL,alpha,dy,clip)=>{for(const g of LL.gl){if(g.ch===' ')continue;if(clip&&!clip(g))continue;const gx=bx+(LL.x+g.x)*k;
      ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=col(g.r);
      if(dy){const c=dy(g);if(c){ctx.setTransform(K);ctx.beginPath();ctx.rect(gx-.05*size,base-c.top,g.w*k+.1*size,c.h);ctx.clip();ctx.setTransform(K.multiply(new DOMMatrix([k,0,0,k,gx,base+c.dy])));f.draw(ctx,g.id,false);ctx.restore();continue;}}
      ctx.setTransform(K.multiply(new DOMMatrix([k,0,0,k,gx,base])));f.draw(ctx,g.id,false);ctx.restore();}};
    if(t>=1||!A.prev||ch==='cut'){draw(L,1);return;}
    const Pv=A.prev;
    if(ch==='fade'||Pv.gl.length!==L.gl.length||Math.abs(Pv.x-L.x)>1e-6){const e=eng.E.inOut(t);draw(Pv,1-e);draw(L,e);return;}
    /* roll: only the characters that changed, each through its own window – the line's tallest ink, with room around it */
    /* the window: this line's own ink, top to bottom, with a little room – never more than half the gap to its neighbours */
    const pad=Math.min(.08*B.M.capU,((C.stack.gap==null?.18:C.stack.gap)*B.M.capU)/2)*k,lt=Math.max(...L.gl.map(g=>g.t),...Pv.gl.map(g=>g.t))*k,lb=Math.max(0,...L.gl.map(g=>g.b),...Pv.gl.map(g=>g.b))*k;
    const e=xEase(t),top=lt+pad,hgt=lt+lb+2*pad,same=j=>Pv.gl[j].ch===L.gl[j].ch;
    draw(L,1,null,g=>same(L.gl.indexOf(g)));
    draw(Pv,1,g=>same(Pv.gl.indexOf(g))?null:{top,h:hgt,dy:-e*hgt},g=>!same(Pv.gl.indexOf(g)));
    draw(L,1,g=>same(L.gl.indexOf(g))?null:{top,h:hgt,dy:(1-e)*hgt},g=>!same(L.gl.indexOf(g)));
  });
  ctx.globalAlpha=1;
}
function build(){
  wCache.clear();wFit.clear();wBuilt++;pfK='';xMemoKey='';
  {const k=JSON.stringify([C.show,C.type&&[C.type.split,C.type.h24,C.type.parts,C.type.secs,C.type.zero]]);if(k!==tSig){tSig=k;tAnim=new Map();}}
  {const k=JSON.stringify((C.words||{}).mixed||null);if(k!==mCfg){mCfg=k;mReset();}}
  if(isWords()||isDial()||isType()||isStack()){S=JSON.parse(JSON.stringify(C.base||{}));S.transparent=false;eng.use(S);eng.setHooks(null);eng.setLive(null);return;}
  const c=C.clock;S=JSON.parse(JSON.stringify(C.base||{}));
  Object.assign(S,{seq:false,rOn:false,tightMask:true,stretch:false,qClear:c.change!=='roll',fit:'cap',size:c.size,align:c.align,valign:c.valign,margin:c.margin,margins:c.margins||null,tabular:c.tabular,optical:c.optical!==false,sepSpace:c.sepSpace==null?1:c.sepSpace,lead:c.lead||'cell',transparent:false,
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
function frame(ctx,W,H,now,dt){fNow=now;
  if(isWords()||isDial()||isType()||isStack()){
    const T=Date.now()/1000,a=C.drift||0,k=ctx.canvas.width/W,K=new DOMMatrix([k,0,0,k,0,0]);
    /* Stack latches to a corner, so it drifts by itself (stackFrame) – inwards only, never past the margin */
    if(a>0&&!isStack()){const sc=1-a*.04+a*.04*Math.sin(T/41);K.multiplySelf(new DOMMatrix().translateSelf(W/2+a*.05*W*Math.sin(T/23.7),H/2+a*.05*H*Math.sin(T/31.3+1)).scaleSelf(sc,sc).translateSelf(-W/2,-H/2));}
    try{if(isDial())dialFrame(ctx,W,H,K);else if(isType())typeFrame(ctx,W,H,now,K);else if(isStack())stackFrame(ctx,W,H,now,K);else wordsFrame(ctx,W,H,now,K);}catch(e){if(!wErr){wErr=1;console.error(e);}}
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
/* Columns and Rings, read out: the words true now, in order (tests) */
const typeNow=()=>{if(!isType())return[];const z=parts(Date.now());
  if(isCols())return tCols(C.type).map(c=>{const i=c.fixed?0:c.at(z);return i<0?'':tCase(c.list[i],c.k);}).filter(Boolean);
  return tRings(C.type).map(g=>g.amp?'&':tCase(g.list[g.at(z)],g.k)).filter(Boolean);};
return{frame,setConfig,bg:()=>S&&S.bg,replay,typeNow,stackNow:()=>xLast,words:()=>(wCur||[]).map(t=>t.w).join(' '),faces:()=>(wCur||[]).map(t=>[t.w,t.fid||'']),clockFaces:()=>({text:cur,l0:cF.l0.slice(),l2:cF.l2}),lines,hands:()=>Object.assign({},dNow)};
}