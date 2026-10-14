/* Tempo – clock screen saver. App code; see shared/core.js for how the parts fit.
   From 0.3 Tempo stands on its own: its own fonts (IndexedDB 'tempo'), its own
   settings ('tempo:' keys), and nothing read from Rubato. */

/* ---------------- settings ---------------- */
let ssDirty=true;/* the preview needs the new settings */
/* Tempo's settings: the screen saver's (ss…) and its core font (baseSlot). */
/* (screen saver settings from 0.8.1 that Tempo no longer has stay in the shared defaults for Rubato's sake, but aren't Tempo's) */
function tempoKeys(){const gone=['ssShape','ssEvery','ssShuffle','ssReseed','ssSpeed','ssImage','ssAmbient','ssLookCol'];return Object.keys(D).filter(k=>(/^ss[A-Z0-9]/.test(k)&&!gone.includes(k))||k==='baseSlot');}
/* Settings only Tempo has. They join the shared defaults here rather than in
   shared/core.js, so Rubato is untouched.
   ssW… the time in words. ssM… how display faces mix into the words, ssN… into
   the numerals of the time. ssDial… the dial. ssVer marks settings already moved
   up to 0.4. The time opens in Noon (from 0.5); Rubato keeps 0.8.1's colours. */
function tempoDefaults(){return{ssVer:5,
  ssWLead:true,ssWH24:false,ssWTime:true,ssWSecs:true,ssWWeekday:true,ssWDayNum:true,ssWMonth:true,ssWYear:true,ssWStop:false,
  ssWCase:'sentence',ssWNumTime:'words',ssWNumSec:'words',ssWNumDate:'words',ssWNumYear:'words',ssWZero:'oh',ssWSep:'stop',ssWHi:'time',
  ssWLayout:'para',ssWFit:false,ssWSize:5,ssWLeading:1,ssWTracking:-20,ssWSpace:100,ssWMeasure:100,ssWOptical:true,ssWAlign:'left',ssWVAlign:'top',ssWMargin:2.5,
  ssWChange:'roll',ssWBy:'word',ssWFeel:'smooth',ssWLen:.6,ssWGlide:true,
  ssWBg:'#FFFFFF',ssWInk:'#181818',ssWSoft:'#FDA072',ssWDateCol:'#F7C6AA',ssWRotate:false,ssName:'',
  ssMMode:'parts',ssMLead:'base',ssMTime:'base',ssMSec:'base',ssMWeekday:'base',ssMDay:'base',ssMMonth:'base',ssMYear:'base',
  ssMWhen:'change',ssMEach:false,ssMLittle:true,ssMMatch:true,ssMOrder:'shuffle',ssMAmount:.5,
  ssNMode:'parts',ssNH1:'base',ssNH2:'base',ssNM1:'base',ssNM2:'base',ssNS1:'base',ssNS2:'base',ssNLine2:'base',
  ssNWhen:'change',ssNEach:false,ssNMatch:true,ssNOrder:'shuffle',ssNAmount:.5,
  ssBg:'#D3D5D5',ssP1:'#F4FD5F',ssP2:'#1E2023',ssP3:'#F4FD5F',ssP4:'#1E2023',
  ssDialFace:'rays',ssDialDetail:'minutes',ssDialHole:.22,ssDialTick:.18,ssDialRing:false,ssDialLine:2.2,ssDialKey:2.2,ssDialHand:6,
  ssDialSecs:true,ssDialSecMove:'sweep',ssDialMinMove:'glide',ssDialFeel:'elastic',ssDialLen:.35,ssDialTrail:'off',ssDialTails:true,ssDialCentre:false,ssDialSize:86,
  ssDialBg:'#FFFFFF',ssDialMin:'#E7E7E7',ssDialHour:'#A9A9A9',ssDialQuarter:'#181818',ssDialHandH:'#EA2631',ssDialHandM:'#EA2631',ssDialHandS:'#EA2631',ssDialRotate:false,
  /* 0.9: themes through the day – which themes (names, '|' between; empty: all of them) and how many hours each lasts */
  ssCSet:'',ssCEvery:1,ssWSet:'',ssWEvery:1,ssDialSet:'',ssDialEvery:1,
  /* 0.9: the dial fills like a pie chart, and the hands get more say */
  ssDialFill:'off',ssDialFillTurn:'turn',ssDialFillR:1,ssDialFillA:1,ssDialFillBlend:'normal',ssDialFillOver:false,ssDialFillC:'#FCE3E4',
  ssDialCap:'butt',ssDialWM:6,ssDialWS:6,ssDialTip:'none',ssDialTipOn:'m',ssDialTipSize:3,ssDialWeight:false,ssDialCentreSize:2.2,ssDialHandA:1,ssDialBlend:'normal',
  /* 0.9: Columns and Rings – the time as lists of words (ssT…) */
  ssTFont:'',ssTH24:false,ssTSecs:true,ssTZero:'zero',ssTCase:'auto',ssTTime:true,ssTDay:true,ssTDate:true,ssTMonth:true,ssTYear:true,
  ssTCSize:60,ssTRSize:71,ssTLeading:1.6,ssTHole:7.8,ssTSplit:false,ssTFeel:'smooth',ssTLen:.6,ssTFar:'all',
  ssTBg:'#FFFFFF',ssTInk:'#000000',ssTSoft:'#D2CDC9',ssTRotate:false,ssTSet:'',ssTEvery:1,
  /* 0.9.1: tracking and the space between columns and rings; the date on rings too; the fill's movement and layer */
  ssTTracking:-15,ssTSpace:100,ssTRDay:false,ssTRDate:false,ssTRMonth:false,ssTRYear:false,ssDialFillStyle:'sweep',ssDialFillLayer:'front'};}
/* (called by shared/core.js before this file's consts exist, so it uses none) */
function loadSettings(){
  Object.assign(D,tempoDefaults());
  /* Tempo 0.1 and 0.2 read Rubato's storage for anything they didn't have yet.
     0.3 keeps to its own: whatever is still only under 'rubato:' is copied once. */
  try{if(!localStorage.getItem('tempo:own')){for(const k of ['settings','themes','theme','panelW'])if(localStorage.getItem('tempo:'+k)===null){const v=localStorage.getItem('rubato:'+k);if(v!==null)localStorage.setItem('tempo:'+k,v);}
    localStorage.setItem('tempo:own','1');}}catch(e){}
  const raw=LS.get('settings')||{},own=sanitise(raw),s=fresh();
  for(const k of tempoKeys())if(k in own)s[k]=own[k];
  if((raw.ssVer||0)<5)upgrade(s,raw);
  s.tab='saver';return s;
}
/* Settings saved by 0.1 and 0.2, made sense of in 0.3 */
function upgrade(s,raw){
  s.ssVer=5;
  /* 0.9: one weight for every hand becomes a weight for each; "My themes" every hour becomes the list of them */
  if(!('ssDialWM' in raw)){s.ssDialWM=s.ssDialWS=s.ssDialHand;}
  if(s.ssRotate==='mine'){s.ssCSet=(LS.get('themes')||[]).map(t=>t.name).join('|');s.ssRotate='all';}
  if((raw.ssVer||0)>=4)return;
  /* 0.4: words or figures part by part */
  if(raw.ssWNum==='figures')s.ssWNumTime=s.ssWNumSec=s.ssWNumDate=s.ssWNumYear='figures';
  if((raw.ssVer||0)>=3)return;
  const was=raw.ssShow;
  s.ssShow=was==='words'||was==='mixed'?'words':'clock';/* Saved looks has gone; Mixed type is part of In words */
  if(was==='mixed'){if(typeof raw.ssMBase==='string'&&raw.ssMBase)s.baseSlot=raw.ssMBase;}/* Mixed type's base face is the core font */
  else{/* plain In words or the time: no faces mixed in, as before */
    s.ssMMode='parts';for(const k of ['ssMLead','ssMTime','ssMSec','ssMWeekday','ssMDay','ssMMonth','ssMYear'])s[k]='base';
    if(was==='words'&&raw.ssWHiFace&&raw.ssWHiFace!=='same'&&(s.ssWHi==='time'||s.ssWHi==='parts'))s.ssMTime=raw.ssWHiFace;}/* a highlight style becomes the time's face */
  if(s.ssLine2==='text')s.ssLine2='none';/* Rubato's text */
}
var unsaved=false;/* var: the core may call these before this line runs */
function saveSettings(){unsaved=false;const o={};for(const k of tempoKeys())o[k]=S[k];LS.set('settings',o);}
/* a change made just before the page closes still gets saved */
addEventListener('pagehide',()=>{if(unsaved)try{saveSettings();}catch(e){}});
function onSettingsChange(){ssDirty=true;unsaved=true;}
function schedulePicker(){}
function refreshImageCard(){}
function refreshNotes(){const n=$('#note');n.textContent=anyLoaded()||S.ssShow==='dial'?'':'Demo face';n.title=n.textContent?'Demo face – load a font in Fonts':'';}
/* each font's own tracking, in thousandths of an em, by style id */
const TRACKS=Object.assign({},LS.get('tracks')||{});
const tracksNow=()=>{const o={};for(const {id} of eng.faceList())if(TRACKS[id])o[id]=TRACKS[id];return o;};

/* ---------------- tooltips ---------------- */
Object.assign(TIPS,{
  ssShow:'The time in figures, written out in words, or as a dial with hands and no type.',ssH24:'24-hour or 12-hour time.',ssSep:'What sits between hours and minutes.',
  ssSecs:'Adds seconds, so something changes every second.',ssZero:'Shows 09,05 rather than 9,05.',ssPulse:'The separator gently pulses once a second.',
  ssLine2:'An optional second line: the weekday or the date.',ssCaps:'Sets the second line in capitals.',
  ssTracking:'Space between letters in the clock, for the core font. Each font’s own tracking is in Fonts.',ssLeading:'Distance between the time and the second line.',
  ssAlt:'New one each change: each figure steps to its next alternate whenever it changes. Keep cycling: the alternates roll continuously.',
  ssAltRate:'How often the alternates change.',ssTabular:'Every figure gets the same width, so the time doesn’t shuffle sideways. Turn off for the font’s own spacing.',
  ssChange:'How a figure changes. Roll works like an odometer.',ssFeel:'Snappy is fast with a crisp stop. Smooth eases. Elastic overshoots.',ssLen:'How long each change takes.',
  ssMove:'Fades to the next corner each minute, which also protects screens.',ssSize:'The largest the clock can be, as a share of the screen width.',ssMargin:'Space kept clear around the edge.',
  ssColBy:'How colours are shared out across the characters.',ssRotate:'Changes theme on the hour.',
  ssDrift:'Slowly moves the whole composition so nothing sits still on screen for hours.',
  ssWH24:'Eleven forty seven, or twenty three forty seven.',
  ssWLayout:'Paragraph fills each line. Stacked sets one phrase to a line.',ssWFit:'Fit sizes the type so the longest sentence these settings can make fills the screen, so it never changes size. Or set the size yourself.',
  ssWSpace:'Space between words, as a share of the typeface’s own word space.',ssWOptical:'Lines up the ink of each line’s first letter on the margin, rather than its side bearing.',
  ssName:'What the screen saver is called on the computer. Give each variant its own name, or they replace each other when installed.',
  ssWCase:'Sentence case capitalises the first word, the day and the month.',
  ssWSep:'What sits between hours and minutes when they’re figures.',ssWHi:'Which words stand out. Latest change follows whatever changed last. Each part gives the time and the date their own colours. Other fonts colours the words set in any font but the core one.',
  ssWSize:'Type size, as a share of the screen width.',ssWLeading:'Distance between lines, as a multiple of the type size.',ssWTracking:'Space between letters, for the core font. Each font’s own tracking is in Fonts.',
  ssWMeasure:'How far across the screen a line can run before it breaks.',ssWMargin:'Space kept clear around the edge.',
  ssWChange:'How a word changes. Type backspaces and retypes only the letters that differ.',ssWBy:'Change whole words, or only the letters that differ when a word keeps its length.',
  ssWFeel:'Snappy is fast with a crisp stop. Smooth eases. Elastic overshoots.',ssWLen:'How long each change takes.',
  ssWGlide:'Words that stay slide to their new place as the line reflows. Off: they jump.',ssWRotate:'Changes theme on the hour.',
  ssWNumTime:'The time in words (eleven forty seven) or figures (11.47pm).',ssWNumSec:'Seconds in words or figures.',ssWNumDate:'The date in words (the twenty eighth) or figures (28th, or 28 before the month).',ssWNumYear:'The year in words or figures.',
  ssWZero:'How a 0 is said: nine oh five, or nine zero five.',
  ssMOrder:'Shuffled: any other font, never the same twice running. In turn: through the fonts in order.',ssNOrder:'Shuffled: any other font, never the same twice running. In turn: through the fonts in order.',
  ssMAmount:'How often a part that changes comes in another font – from the odd one to all of them.',ssNAmount:'How often a numeral that changes comes in another font – from the odd one to all of them.',
  ssMMode:'How the other fonts come into the words. Each part: set every part of the sentence to the core font, a font of its own, or Shuffle. Latest change: whatever just changed arrives in another font and goes back at the next change. One at a time: a single part stands out, moving on as set below. A few at random: parts that change sometimes come in another font.',
  ssNMode:'How the other fonts come into the numerals. Each numeral: set every figure to the core font, a font of its own, or Shuffle. Latest change: the figures that just changed arrive in another font. One at a time: a single figure stands out, moving on as set below. A few at random: figures that change sometimes come in another font – the odd one, or all.',
  ssMWhen:'When a shuffled part (or the one standing out) takes a new font: whenever its words change, or on the minute or the hour.',
  ssNWhen:'When a shuffled numeral (or the one standing out) takes a new font: whenever it changes, or on the minute or the hour.',
  ssMEach:'Gives every word its own font, rather than one font for the whole part.',ssNEach:'Gives every numeral that changes its own font, rather than one for all of them.',
  ssMLittle:'Keeps on, the, of, in and and in the core font, so only the words that carry the time and date change font.',
  ssDialFace:'Rays run out from a space in the middle. Ticks run in from the edge. Dots sit round the edge. Or just the hands.',
  ssDialDetail:'Which marks there are: every minute, every hour, or only 12, 3, 6 and 9. Hours and quarters stand out from the minutes.',
  ssDialHole:'How much of the middle the rays leave clear.',ssDialTick:'How far the minute ticks reach in. Hours reach three times as far, quarters further still.',
  ssDialRing:'A circle round the outside, in the hour marks’ colour and weight.',
  ssDialLine:'Weight of the minute marks.',ssDialKey:'Weight of the hour and quarter marks, and the ring.',ssDialHand:'Weight of the hands.',
  ssDialSecs:'Shows a second hand.',ssDialSecMove:'Sweep moves smoothly. Tick jumps once a second. Stop at 12 goes round in 58.5 seconds and waits at the top for the minute, like a station clock.',
  ssDialMinMove:'Glide moves a little every moment. Step jumps once a minute.',
  ssDialFeel:'How a hand that jumps lands. Snappy is crisp. Smooth eases. Elastic springs past and settles.',ssDialLen:'How long each jump takes.',
  ssDialTrail:'The marks light up in the second hand’s colour as it passes: filling up through the minute, or fading out behind it.',
  ssDialTails:'Short ends that run back past the middle.',ssDialCentre:'A dot over the middle, in the second hand’s colour.',
  ssDialSize:'How big the dial is, as a share of the screen’s shorter side.',ssDialRotate:'Changes theme on the hour.',
  ssMMatch:'Sizes each font so its capitals are as tall as the core font’s. Off: every font at the same point size.',ssNMatch:'Sizes each font so its capitals are as tall as the core font’s. Off: every font at the same point size.',
});

/* ================= Screensaver ================= */
const SEPS={comma:',',colon:':',stop:'.',space:' '};
const clk=s=>!['words','dial','columns','rings'].includes(s.ssShow),wd=s=>s.ssShow==='words',dl=s=>s.ssShow==='dial';
/* 0.9: Columns and Rings, the time as lists of words */
const cols=s=>s.ssShow==='columns',rgs=s=>s.ssShow==='rings',ty=s=>cols(s)||rgs(s);

/* Cards that start shut (each says what's set): all but the one for what's showing */
function appCollapseDefault(){return ['ss-num','ss-change','ss-wtype','ss-wchange','ss-dhands','ss-pos','ss-tchange'];}/* Fill (0.9.1) starts open *//* 0.9: Colour starts open – it's where people look first */
/* ---------------- Fonts: the core font, the others mixed in ---------------- */
/* Sub-sections that fold inside a card. Open or shut is remembered. */
const FOLDS=Object.assign({},LS.get('folds')||{});
function fold(parent,id,title,show,shut){
  const box=el('div'),head=el('button','fold-head'),label=el('span',null,title),chev=el('span','chev'),body=el('div','fold-body');head.type='button';
  chev.innerHTML=CHEV;
  const open=FOLDS[id]!=null?FOLDS[id]:!shut,paint=o=>{body.hidden=!o;head.setAttribute('aria-expanded',o);if(o)requestAnimationFrame(()=>syncRanges(body));};paint(open);
  head.onclick=()=>{const o=body.hidden;FOLDS[id]=o;LS.set('folds',FOLDS);paint(o);};
  head.append(label,chev);box.append(head,body);addCustom(parent,show||null,box);return body;}
const openRows=new Set();/* font rows showing their details */
/* Fonts that come with Tempo, from two places with the same fields
   ({file, name, on, core, shuffle, tracking, credit}): fonts embedded in the page
   itself (data, base64) – for fonts whose licence allows them only as part of the
   app, never as files of their own, such as Timeless (see LICENCES.md) – and
   tempo/fonts/fonts.json beside the page, for fonts cleared to publish as files. */
const EMBEDDED=(()=>{try{const e=document.getElementById('tempo-builtin-fonts');return e?(JSON.parse(e.textContent).fonts||[]):[];}catch(e){return[];}})();
let BUILTIN=EMBEDDED.slice();
const builtinsP=fetch('fonts/fonts.json').then(r=>r.ok?r.json():null).then(j=>{for(const f of (j&&j.fonts)||[])if(!BUILTIN.some(b=>b.file===f.file))BUILTIN.push(f);refreshFontCard();}).catch(()=>{});
const fileOf=st=>(files.get(st.fid)||{}).fileName;
const isLoaded=bf=>styles.some(s=>fileOf(s)===bf.file||(bf.name&&s.face.name===bf.name));
async function builtinFile(bf){
  if(bf.data){const bin=atob(bf.data),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new File([u],bf.file);}
  const r=await fetch('fonts/'+encodeURIComponent(bf.file));if(!r.ok)throw new Error(r.status);return new File([await r.arrayBuffer()],bf.file);}
const toggleEl=(label,on,fn)=>{const t=el('button','toggle');t.setAttribute('role','switch');t.setAttribute('aria-checked',on);t.setAttribute('aria-label',label);t.append(el('span','box'));t.classList.add('inline');t.onclick=fn;return t;};
/* switch a font on or off – off keeps it in the list but out of everything */
function fontOnOff(st,on){st.off=!on;
  if(!on&&eng.baseSlot()===st.id){const next=styles.find(s=>!s.off&&s!==st);S.baseSlot=next?next.id:'';}
  sortFonts();saveStyles();applyStyles();autosave();}
/* Each row of the Fonts card (shared/core.js draws the name and Remove):
   on or off, use as core, and – folded under the name – shuffle in, the font's
   own tracking, and Remove. */
function appFontRow(st,row,top,rm){
  const on=!st.off,live=styles.filter(s=>!s.off),isCore=on&&eng.baseSlot()===st.id,name=st.face.name,multi=live.length>1,trk=TRACKS[st.id]||0;
  const main=top.querySelector('.slot-main'),meta=top.querySelector('.slot-meta'),nm=top.querySelector('.slot-name');
  meta.textContent=[!on?'Off':isCore?'Core':st.swap!==false?'In the mix':'Not in the mix',trk?'tracking '+(trk>0?'+':'')+trk:''].filter(Boolean).join(' · ');
  if(!on)row.classList.add('off');
  if(on&&multi){const c=el('button','pill small',isCore?'Core':'Use as core');c.setAttribute('aria-pressed',isCore);c.setAttribute('aria-label','Use as core – '+name);
    c.title='The core font carries the time and the sentence. The others mix in.';c.onclick=()=>{if(!isCore){S.baseSlot=st.id;sortFonts();saveStyles();set('baseSlot',st.id);applyStyles();}};top.insertBefore(c,rm);}
  top.insertBefore(toggleEl('On – '+name,on,()=>fontOnOff(st,!on)),rm);rm.remove();
  /* the details, folded under the name */
  const det=el('div','slot-det');det.hidden=!openRows.has(st.id);
  const chev=el('span','chev row-chev');chev.innerHTML=CHEV;if(!det.hidden)chev.classList.add('up');chev.onclick=()=>main.onclick();top.insertBefore(chev,main.nextSibling);main.setAttribute('role','button');main.setAttribute('aria-label','Details – '+name);main.tabIndex=0;
  main.onclick=()=>{if(openRows.has(st.id))openRows.delete(st.id);else openRows.add(st.id);refreshFontCard();};
  main.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();main.onclick();}};
  if(on&&multi&&!isCore){const w=el('div','toggle-row'),t=el('button','toggle');t.setAttribute('role','switch');t.setAttribute('aria-checked',st.swap!==false);t.setAttribute('aria-label','Shuffle in – '+name);
    t.append(el('span','box'),el('span',null,'Shuffle in'));t.onclick=()=>{st.swap=!(st.swap!==false);saveStyles();pushFaces();refreshFontCard();refreshAll();};
    w.append(t,qMark({label:'Shuffle in',tip:'Shuffle, In turn, Latest change, One at a time and A few at random pick from the fonts with this on.'}));det.append(w);}
  /* tracking for this font, wherever it's used */
  const w=el('div','ctl'),hd=el('div','ctl-head'),lb=el('label',null,'Tracking'),val=el('span','val'),inp=el('input');
  inp.type='range';inp.min=-100;inp.max=200;inp.step=1;inp.id='trk_'+st.id;lb.htmlFor=inp.id;lb.title='Double-click to reset';inp.setAttribute('aria-label','Tracking – '+name);
  const show=v=>{val.textContent=(v>0?'+':'')+Math.round(v);};
  const put=v=>{if(v)TRACKS[st.id]=v;else delete TRACKS[st.id];LS.set('tracks',TRACKS);ssDirty=true;show(v);};
  inp.value=trk;show(trk);inp.oninput=()=>put(+inp.value);inp.onchange=()=>refreshFontCard();lb.ondblclick=()=>{inp.value=0;put(0);refreshFontCard();};
  hd.append(lb,qMark({label:'Tracking',tip:'This font’s own letter spacing, wherever it’s used – for a display face drawn too tight or too loose. The tracking under Type and Clock tightens the core font on top of this.'}),val);w.append(hd,inp);det.append(w);
  const r=el('div','ctl btn-row');rm.className='pill small';rm.textContent='Remove';delete rm.dataset.tip;r.append(rm);det.append(r);
  row.append(det);return det;
}
/* built-in fonts not loaded yet, after the rows */
function appFontList(list){
  for(const bf of BUILTIN){if(isLoaded(bf))continue;
    const row=el('div','slot'),top=el('div','slot-top'),main=el('div','slot-main');row.classList.add('off');
    main.append(el('div','slot-name',bf.name||bf.file),el('div','slot-meta','Built in · off'));top.append(main);
    const t=toggleEl('On – '+(bf.name||bf.file),false,()=>loadBuiltin(bf,true));top.append(t);row.append(top);list.append(row);}
}
async function loadBuiltin(bf,on){
  try{await loadFiles([await builtinFile(bf)]);appFontsLoaded([],{fonts:[Object.assign({},bf,{on,core:on&&bf.core})]});}
  catch(e){toast(`Couldn’t load ${bf.name||bf.file}.`);}}
/* A font pack (a .zip) can carry tempo-fonts.json: {fonts:[{file, on, core,
   shuffle, tracking}]} – which fonts start on, the core, which shuffle in and
   each one's tracking. Built-in fonts use the same fields. */
function appFontsLoaded(added,manifest){
  const list=(manifest&&manifest.fonts)||[];if(!list.length)return;
  let core=null;
  for(const m of list){const st=styles.find(s=>fileOf(s)===m.file);if(!st)continue;
    st.off=m.on===false;if(m.shuffle!=null)st.swap=m.shuffle!==false;
    if(typeof m.tracking==='number'){if(m.tracking)TRACKS[st.id]=m.tracking;else delete TRACKS[st.id];}
    if(m.core&&m.on!==false)core=st.id;}
  LS.set('tracks',TRACKS);if(core){S.baseSlot=core;autosave();}sortFonts();saveStyles();applyStyles();
}
/* the list: the core font, then the others switched on, then those off, each A to Z */
function sortFonts(){const bs=S.baseSlot,rank=x=>x.id===bs&&!x.off?0:x.off?2:1;
  styles.sort((a,b)=>rank(a)-rank(b)||a.face.name.localeCompare(b.face.name));}
/* Each built-in font is offered once: the first time Tempo opens with it, those
   marked on come on (a core one becomes the core). Remove one and it stays out –
   switch it on again from the list. Done is remembered by file. */
function appFontsRestored(){builtinsP.then(async()=>{
  const done=new Set(LS.get('builtinsDone')||[]),fresh=BUILTIN.filter(b=>!done.has(b.file));if(!fresh.length)return;
  const want=fresh.filter(b=>b.on!==false&&!isLoaded(b)),bufs=[];
  for(const bf of want){try{bufs.push(await builtinFile(bf));}catch(e){}}
  if(bufs.length){await loadFiles(bufs);appFontsLoaded([],{fonts:want});}
  if(bufs.length===want.length){fresh.forEach(b=>done.add(b.file));LS.set('builtinsDone',[...done]);}/* only once they're all in */});}
/* credit for built-in fonts in use, as their licences ask (Timeless: point people to timeless.co) */
const fontCredits=()=>[...new Set(BUILTIN.filter(b=>b.credit&&styles.some(s=>!s.off&&(fileOf(s)===b.file||s.face.name===b.name))).map(b=>b.credit))];
/* Mixing: how the other fonts come in, under the font list */
function addSelect(parent,d){
  const w=el('div','colour-row'),lb=el('label',null,d.label),sel=el('select');sel.id='c_'+d.k;lb.htmlFor=sel.id;d.group=d.group||curGroup;
  w.append(lb);const q=qMark(d);if(q)w.append(q);w.append(sel);
  parent.append(w);let sig='';
  sel.onchange=()=>set(d.k,sel.value);
  const c={d,w,update(){const opts=d.optsFn();const ns=JSON.stringify(opts);if(ns!==sig){sig=ns;sel.textContent='';opts.forEach(([v,t])=>{const o=el('option',null,t);o.value=v;sel.append(o);});}
    const v=S[d.k];sel.value=opts.some(o=>o[0]===v)?v:(opts[0]||[])[0];}};controls.push(c);return c;}
const faceOpts=()=>anyLoaded()?eng.faceList().map(({id,face})=>[id,face.name]):[['d1','Demo regular'],['d2','Demo heavy']];
const partOpts=order=>()=>[['base','Core']].concat(faceOpts().filter(o=>o[0]!==baseSlot())).concat([['shuffle',S[order]==='turn'?'In turn':'Shuffle']]);
const canMix=()=>!anyLoaded()||eng.faceList().length>1;
const poolN=()=>anyLoaded()?eng.faceList().filter(x=>x.swap&&x.id!==baseSlot()).length:1;
const M_PARTS=[['ssMLead','It is','ssWLead'],['ssMTime','Time','ssWTime'],['ssMSec','Seconds','ssWSecs'],['ssMWeekday','Day','ssWWeekday'],['ssMDay','Date','ssWDayNum'],['ssMMonth','Month','ssWMonth'],['ssMYear','Year','ssWYear']];
const N_PARTS=[['ssNH1','Hours, tens',s=>true],['ssNH2','Hours, units',s=>true],['ssNM1','Minutes, tens',s=>true],['ssNM2','Minutes, units',s=>true],
  ['ssNS1','Seconds, tens',s=>s.ssSecs],['ssNS2','Seconds, units',s=>s.ssSecs],['ssNLine2','Second line',s=>s.ssLine2!=='none']];
const wShuffles=s=>M_PARTS.some(([k,,on])=>s[on]&&s[k]==='shuffle'),nShuffles=s=>N_PARTS.some(([k,,on])=>on(s)&&s[k]==='shuffle');
const howMany=v=>v>=1?'All':v<=.15?'The odd one':pct(v);
{const b0=fontList.parentElement,mixW=s=>wd(s)&&canMix(),mixN=s=>clk(s)&&canMix();
  addHint(b0,'A .zip of fonts works too – any already in the list are skipped. Switch a font off to keep it for later; click its name for its tracking and more.');
  addHint(b0,'Load a second font to mix it into the core one.',()=>!canMix());
  {const cr=el('p','hint');addCustom(b0,null,cr);controls.push({d:{},w:cr,update(){const c=fontCredits();cr.textContent=c.join(' ');cr.hidden=!c.length;}});}
  const b=fold(b0,'mixing','Mixing',()=>canMix(),true);/* shut to start; it says how the other fonts come in */
  /* the words */
  build(b,[{t:'seg',k:'ssMMode',label:'Other fonts come in',opts:[['parts','Each part'],['latest','Latest change'],['one','One at a time'],['some','A few at random']],show:mixW}]);
  for(const [k,label,on] of M_PARTS){const c=addSelect(b,{k,label,optsFn:partOpts('ssMOrder')});c.d.show=s=>mixW(s)&&s.ssMMode==='parts'&&s[on]&&(k!=='ssMSec'||s.ssWTime);}
  build(b,[
    {t:'range',k:'ssMAmount',label:'How many',min:.05,max:1,step:.05,fmt:howMany,show:s=>mixW(s)&&s.ssMMode==='some'},
    {t:'seg',k:'ssMOrder',label:'Fonts come',opts:[['shuffle','Shuffled'],['turn','In turn']],show:s=>mixW(s)&&(s.ssMMode!=='parts'||wShuffles(s))},
    {t:'seg',k:'ssMWhen',label:'New font',opts:[['change','When it changes'],['minute','Every minute'],['hour','Every hour']],show:s=>mixW(s)&&((s.ssMMode==='parts'&&wShuffles(s))||s.ssMMode==='some')},
    {t:'seg',k:'ssMWhen',label:'Move on',opts:[['change','Each change'],['minute','Every minute'],['hour','Every hour']],show:s=>mixW(s)&&s.ssMMode==='one'},
    {t:'toggle',k:'ssMEach',label:'A font for each word',show:s=>mixW(s)&&(s.ssMMode!=='parts'||wShuffles(s))},
    {t:'toggle',k:'ssMLittle',label:'Little words stay in the core font',show:mixW},
    {t:'toggle',k:'ssMMatch',label:'Match cap heights',show:mixW},
  ]);
  /* the numerals */
  build(b,[{t:'seg',k:'ssNMode',label:'Other fonts come in',opts:[['parts','Each numeral'],['latest','Latest change'],['one','One at a time'],['some','A few at random']],show:mixN}]);
  for(const [k,label,on] of N_PARTS){const c=addSelect(b,{k,label,optsFn:partOpts('ssNOrder')});c.d.show=s=>mixN(s)&&s.ssNMode==='parts'&&on(s);}
  build(b,[
    {t:'range',k:'ssNAmount',label:'How many',min:.05,max:1,step:.05,fmt:howMany,show:s=>mixN(s)&&s.ssNMode==='some'},
    {t:'seg',k:'ssNOrder',label:'Fonts come',opts:[['shuffle','Shuffled'],['turn','In turn']],show:s=>mixN(s)&&(s.ssNMode!=='parts'||nShuffles(s))},
    {t:'seg',k:'ssNWhen',label:'New font',opts:[['change','When it changes'],['minute','Every minute'],['hour','Every hour']],show:s=>mixN(s)&&((s.ssNMode==='parts'&&nShuffles(s))||s.ssNMode==='some')},
    {t:'seg',k:'ssNWhen',label:'Move on',opts:[['change','Each change'],['minute','Every minute'],['hour','Every hour']],show:s=>mixN(s)&&s.ssNMode==='one'},
    {t:'toggle',k:'ssNEach',label:'A font for each numeral',show:s=>mixN(s)&&(s.ssNMode==='latest'||s.ssNMode==='one')},
    {t:'toggle',k:'ssNMatch',label:'Match cap heights',show:mixN},
    {t:'hint',text:'The other fonts come from those with Shuffle in on (under each font’s name). Cap heights and line spacing follow the core font.',show:s=>canMix()&&poolN()>0},
    {t:'hint',text:'Switch on Shuffle in for a font or two to mix.',show:s=>canMix()&&poolN()===0},
  ]);
}
/* Show */
{const b=card('ss-show','Screensaver',null,'saver');
  build(b,[{t:'seg',k:'ssShow',label:'Show',opts:[['clock','The time'],['words','In words'],['columns','Columns'],['rings','Rings'],['dial','As a dial']]}]);
  toIsland(b.firstChild);hideCard(b);/* the first choice – the time in figures, in words, or as a dial – lives in the island */
}
/* A dial has no type, so Fonts steps aside */
{const fc=controls.find(c=>c.w===fontList.closest('section'));if(fc){const was=fc.d.show;fc.d.show=s=>was(s)&&!dl(s);}}
/* In words: what the sentence says */
{const b=card('ss-wsay','Sentence',wd,'saver');
  /* every part of the sentence, in reading order, switched on and off like words in a line */
  const PIECES=[['ssWLead','It is'],['ssWTime','Time'],['ssWSecs','Seconds'],['ssWWeekday','Day'],['ssWDayNum','Date'],['ssWMonth','Month'],['ssWYear','Year'],['ssWStop','Full stop']];
  addHint(b,'Click the parts to build your sentence.');
  const chips=el('div','ctl btn-row');chips.setAttribute('role','group');chips.setAttribute('aria-label','Sentence parts');addCustom(b,null,chips);
  const cs=PIECES.map(([k,t])=>{const p=el('button','pill small',t);p.onclick=()=>set(k,!S[k]);chips.append(p);return[k,p];});
  controls.push({d:{},w:chips,update(){cs.forEach(([k,p])=>{p.setAttribute('aria-pressed',!!S[k]);p.hidden=k==='ssWSecs'&&!S.ssWTime;});}});
  build(b,[
    {t:'seg',k:'ssWH24',label:'Format',opts:[[false,'12-hour'],[true,'24-hour']],show:s=>s.ssWTime},
    {t:'hint',text:'Nothing to show. Switch on at least one part.',show:s=>!(s.ssWTime||s.ssWWeekday||s.ssWDayNum||s.ssWMonth||s.ssWYear)},
    {t:'hint',text:'Always this computer’s own time and date, wherever the screen saver is installed.'},
  ]);
  /* each part with a number in it: written out, or in figures */
  const F=s=>s.ssWTime||s.ssWDayNum||s.ssWYear,WF=[['words','Words'],['figures','Figures']];
  const f=fold(b,'w-figures','Words or figures',F);
  build(f,[
    {t:'seg',k:'ssWNumTime',label:'Time',opts:WF,show:s=>s.ssWTime},
    {t:'seg',k:'ssWNumSec',label:'Seconds',opts:WF,show:s=>s.ssWTime&&s.ssWSecs},
    {t:'seg',k:'ssWNumDate',label:'Date',opts:WF,show:s=>s.ssWDayNum},
    {t:'seg',k:'ssWNumYear',label:'Year',opts:WF,show:s=>s.ssWYear},
    {t:'seg',k:'ssWSep',label:'Separator',opts:[['stop','Full stop'],['colon','Colon']],show:s=>s.ssWTime&&s.ssWNumTime==='figures'},
    {t:'seg',k:'ssWZero',label:'Say 0 as',opts:[['oh','Oh'],['zero','Zero']],show:s=>(s.ssWTime&&s.ssWNumTime==='words')||(s.ssWYear&&s.ssWNumYear==='words')},
  ]);
}
/* In words: how it's set */
{const b=card('ss-wtype','Type',wd,'saver');
  build(b,[
    {t:'seg',k:'ssWCase',label:'Case',opts:[['sentence','Sentence case'],['lower','lower case'],['upper','CAPITALS']]},
    {t:'seg',k:'ssWHi',label:'Highlight',opts:[['time','The time'],['latest','Latest change'],['parts','Each part'],['faces','Other fonts'],['none','Nothing']]},
    {t:'seg',k:'ssWLayout',label:'Layout',opts:[['para','Paragraph'],['stack','Stacked']]},
    {t:'seg',k:'ssWFit',label:'Size',opts:[[true,'Fit the screen'],[false,'Set size']]},
    {t:'range',k:'ssWSize',label:'Type size',min:1.5,max:30,step:.1,fmt:v=>roundTo(v,.1)+'% of width',show:s=>!s.ssWFit},
  ]);
  build(fold(b,'w-spacing','Spacing'),[
    {t:'range',k:'ssWLeading',label:'Line spacing',min:.75,max:1.8,step:.01,fmt:v=>v.toFixed(2)},
    {t:'range',k:'ssWTracking',label:'Tracking',min:-100,max:200,step:1,fmt:v=>(v>0?'+':'')+Math.round(v)},
    {t:'range',k:'ssWSpace',label:'Word spacing',min:40,max:160,step:1,fmt:v=>Math.round(v)+'%'},
    {t:'range',k:'ssWMeasure',label:'Line length',min:30,max:100,step:1,fmt:v=>Math.round(v)+'%'},
    {t:'toggle',k:'ssWOptical',label:'Optical margin'},
  ]);
}
/* In words: how a change moves */
{const b=card('ss-wchange','Change',wd,'saver');
  build(b,[
    {t:'seg',k:'ssWChange',label:'When a word changes',opts:[['roll','Roll'],['fade','Fade'],['type','Type'],['cut','Cut']]},
    {t:'seg',k:'ssWBy',label:'Change',opts:[['word','Whole words'],['letter','Changed letters']],show:s=>s.ssWChange==='roll'||s.ssWChange==='fade'},
    {t:'seg',k:'ssWFeel',label:'Feel',opts:[['snappy','Snappy'],['smooth','Smooth'],['elastic','Elastic']],show:s=>s.ssWChange==='roll'},
    {t:'range',k:'ssWLen',label:'Length',min:.15,max:2,step:.05,fmt:v=>v.toFixed(2)+' s',show:s=>s.ssWChange!=='cut'},
    {t:'toggle',k:'ssWGlide',label:'Glide when words move',show:s=>s.ssWChange==='roll'||s.ssWChange==='fade'},
  ]);
  const r=el('div','ctl btn-row'),play=el('button','pill small','Play a change');r.append(play);addCustom(b,s=>s.ssWChange!=='cut',r);
  play.onclick=()=>{if(saver&&saver.replay)saver.replay();};
}
/* Clock */
{const b=card('ss-clock','Clock',clk,'saver');
  build(b,[
    {t:'seg',k:'ssH24',label:'Format',opts:[[true,'24-hour'],[false,'12-hour']]},
    {t:'seg',k:'ssSep',label:'Separator',opts:[['comma','Comma'],['colon','Colon'],['stop','Full stop'],['space','Space']]},
    {t:'toggle',k:'ssSecs',label:'Seconds'},
    {t:'toggle',k:'ssZero',label:'Leading zero'},
    {t:'toggle',k:'ssPulse',label:'Pulse the separator',show:s=>s.ssSep!=='space'},
    {t:'seg',k:'ssLine2',label:'Second line',opts:[['none','None'],['weekday','Weekday'],['date','Date']]},
    {t:'toggle',k:'ssCaps',label:'Capitals',show:s=>s.ssLine2!=='none'},
    {t:'range',k:'ssTracking',label:'Tracking',min:-150,max:400,step:5,fmt:v=>(v>0?'+':'')+Math.round(v)},
    {t:'range',k:'ssLeading',label:'Line spacing',min:.6,max:2,step:.01,fmt:v=>v.toFixed(2),show:s=>s.ssLine2!=='none'},
  ]);
}
/* Numerals */
{const b=card('ss-num','Numerals',clk,'saver');
  build(b,[
    {t:'seg',k:'ssAlt',label:'Alternates',opts:[['off','Off'],['each','New one each change'],['cycle','Keep cycling']]},
    {t:'range',k:'ssAltRate',label:'Changes per minute',min:1,max:60,step:1,show:s=>s.ssAlt==='cycle'},
    {t:'hint',text:'Uses every alternate the core font has for its figures.',show:s=>s.ssAlt!=='off'},
    {t:'toggle',k:'ssTabular',label:'Fixed-width numerals'},
    {t:'hint',text:'Fixed-width numerals give every figure the same width, so only changed figures move. Turn it off to use the font’s own spacing and kerning.'},
  ]);
}
/* Change */
{const b=card('ss-change','Change',clk,'saver');
  build(b,[
    {t:'seg',k:'ssChange',label:'When a figure changes',opts:[['roll','Roll'],['stretch','Stretch'],['fade','Fade'],['cut','Cut']]},
    {t:'seg',k:'ssFeel',label:'Feel',opts:[['snappy','Snappy'],['smooth','Smooth'],['elastic','Elastic']],show:s=>s.ssChange==='roll'||s.ssChange==='stretch'},
    {t:'range',k:'ssLen',label:'Length',min:.15,max:2,step:.05,fmt:v=>v.toFixed(2)+' s',show:s=>s.ssChange!=='cut'},
  ]);
}
/* As a dial: the face */
const DIAL_FACES=[['rays','Rays'],['ticks','Ticks'],['dots','Dots'],['none','Hands only']];
const marked=s=>dl(s)&&s.ssDialFace!=='none';
const BLENDS=[['normal','Normal'],['multiply','Multiply'],['screen','Screen'],['overlay','Overlay'],['difference','Difference']];
{const b=card('ss-dface','Face',dl,'saver');
  build(b,[
    {t:'seg',k:'ssDialFace',label:'Marks',opts:DIAL_FACES},
    {t:'seg',k:'ssDialDetail',label:'Detail',opts:[['minutes','Minutes'],['hours','Hours'],['quarters','Quarters']],show:marked},
    {t:'range',k:'ssDialHole',label:'Space in the middle',min:0,max:.6,step:.01,fmt:pct,show:s=>dl(s)&&s.ssDialFace==='rays'},
    {t:'range',k:'ssDialTick',label:'Tick length',min:.03,max:.3,step:.01,fmt:pct,show:s=>dl(s)&&s.ssDialFace==='ticks'},
    {t:'toggle',k:'ssDialRing',label:'Outer ring'},
  ]);
  build(fold(b,'d-weight','Line weight'),[
    {t:'range',k:'ssDialLine',label:'Minute marks',min:.5,max:20,step:.1,fmt:v=>v.toFixed(1),show:s=>marked(s)&&s.ssDialDetail==='minutes'},
    {t:'range',k:'ssDialKey',label:'Hours, quarters and ring',min:.5,max:20,step:.1,fmt:v=>v.toFixed(1),show:s=>marked(s)||(dl(s)&&s.ssDialRing)},
  ]);
}
/* As a dial: the fill – a colour sweeping round the face like a pie chart (its own card from 0.9.1, in front of everything to start) */
{const b=card('ss-dfill','Fill',dl,'saver');const fill=s=>dl(s)&&s.ssDialFill!=='off';
  build(b,[
    {t:'seg',k:'ssDialFill',label:'Fill follows',opts:[['off','Off'],['hour','Hour hand'],['minute','Minute hand'],['second','Second hand']]},
    {t:'seg',k:'ssDialFillStyle',label:'Moves',opts:[['sweep','Sweep'],['steps','In sections'],['fade','Fading sections']],show:fill},
    {t:'seg',k:'ssDialFillTurn',label:'Each turn',opts:[['turn','Fills, then empties'],['reset','Starts empty']],show:fill},
    {t:'seg',k:'ssDialFillLayer',label:'Sits',opts:[['front','In front'],['hands','Behind the hands'],['marks','Behind the marks']],show:fill},
    {t:'range',k:'ssDialFillR',label:'Reach',min:.1,max:1,step:.01,fmt:pct,show:fill},
    {t:'range',k:'ssDialFillA',label:'Opacity',min:.05,max:1,step:.01,fmt:pct,show:fill},
    {t:'seg',k:'ssDialFillBlend',label:'Blend',opts:BLENDS,show:fill},
    {t:'hint',text:'Sixty sections for the minute and second hands, twelve for the hour. Its colour is under Colour.',show:fill},
  ]);
}
/* As a dial: the hands, and how they move */
{const b=card('ss-dhands','Hands',dl,'saver');
  const stepping=s=>(s.ssDialSecs&&s.ssDialSecMove==='tick')||s.ssDialMinMove==='step';
  build(b,[
    {t:'toggle',k:'ssDialSecs',label:'Second hand'},
    {t:'seg',k:'ssDialSecMove',label:'Second hand moves',opts:[['sweep','Sweep'],['tick','Tick'],['stop','Stop at 12']],show:s=>s.ssDialSecs},
    {t:'seg',k:'ssDialMinMove',label:'Minute hand moves',opts:[['glide','Glide'],['step','Step']]},
    {t:'seg',k:'ssDialFeel',label:'Feel',opts:[['snappy','Snappy'],['smooth','Smooth'],['elastic','Elastic']],show:stepping},
    {t:'range',k:'ssDialLen',label:'Length',min:.05,max:.9,step:.05,fmt:v=>v.toFixed(2)+' s',show:stepping},
    {t:'seg',k:'ssDialTrail',label:'Marks follow the second hand',opts:[['off','Off'],['fill','Fill the minute'],['fade','Fade behind']],show:s=>s.ssDialSecs&&s.ssDialFace!=='none'},
  ]);
  /* 0.9: weight, ends, tips and blend, hand by hand */
  build(fold(b,'d-handshape','Shape'),[
    {t:'range',k:'ssDialHand',label:'Hour hand',min:.5,max:40,step:.1,fmt:v=>v.toFixed(1)},
    {t:'range',k:'ssDialWM',label:'Minute hand',min:.5,max:40,step:.1,fmt:v=>v.toFixed(1)},
    {t:'range',k:'ssDialWS',label:'Second hand',min:.5,max:40,step:.1,fmt:v=>v.toFixed(1),show:s=>s.ssDialSecs},
    {t:'seg',k:'ssDialCap',label:'Ends',opts:[['butt','Square'],['round','Round']]},
    {t:'seg',k:'ssDialTip',label:'Tip',opts:[['none','None'],['dot','Dot'],['ring','Ring']]},
    {t:'seg',k:'ssDialTipOn',label:'Tip on',opts:[['m','Minute hand'],['s','Second hand'],['ms','Both'],['all','All three']],show:s=>s.ssDialTip!=='none'},
    {t:'range',k:'ssDialTipSize',label:'Tip size',min:1,max:12,step:.1,fmt:v=>v.toFixed(1),show:s=>s.ssDialTip!=='none'},
    {t:'toggle',k:'ssDialTails',label:'Tails'},
    {t:'toggle',k:'ssDialWeight',label:'Counterweight on the second hand',show:s=>s.ssDialSecs},
    {t:'toggle',k:'ssDialCentre',label:'Centre dot'},
    {t:'range',k:'ssDialCentreSize',label:'Centre dot size',min:1,max:6,step:.1,fmt:v=>v.toFixed(1),show:s=>s.ssDialCentre},
  ]);
  build(fold(b,'d-handblend','Opacity and blend',null,true),[
    {t:'range',k:'ssDialHandA',label:'Opacity',min:.05,max:1,step:.01,fmt:pct},
    {t:'seg',k:'ssDialBlend',label:'Blend',opts:BLENDS},
  ]);
}
/* Columns and Rings: the words */
/* The font: chosen here, or Timeless Sans Medium when it's loaded (as drawn), else the core font */
const typeFontAuto=()=>{const L=eng.faceList(),n=x=>x.face.name||'';return(L.find(x=>/timeless/i.test(n(x))&&/medium/i.test(n(x))&&!/grotesk/i.test(n(x)))||L.find(x=>/medium/i.test(n(x)))||{}).id||baseSlot();};
const typeFont=()=>{const id=S.ssTFont;return id&&eng.faceList().some(x=>x.id===id)?id:typeFontAuto();};
{const b=card('ss-twords','Words',ty,'saver');
  const PIECES=[['ssTTime','Time'],['ssTSecs','Seconds'],['ssTDay','Day'],['ssTDate','Date'],['ssTMonth','Month'],['ssTYear','Year']];
  const chips=el('div','ctl btn-row');chips.setAttribute('role','group');chips.setAttribute('aria-label','Columns shown');addCustom(b,cols,chips);
  const cs=PIECES.map(([k,t])=>{const p=el('button','pill small',t);p.onclick=()=>set(k,!S[k]);chips.append(p);return[k,p];});
  controls.push({d:{},w:chips,update(){cs.forEach(([k,p])=>{p.setAttribute('aria-pressed',!!S[k]);p.hidden=k==='ssTSecs'&&!S.ssTTime;});}});
  const RP=[['ssTSecs','Seconds'],['ssTRDay','Day'],['ssTRDate','Date'],['ssTRMonth','Month'],['ssTRYear','Year']];
  const rchips=el('div','ctl btn-row');rchips.setAttribute('role','group');rchips.setAttribute('aria-label','Rings shown');addCustom(b,rgs,rchips);
  const rs=RP.map(([k,t])=>{const p=el('button','pill small',t);p.onclick=()=>set(k,!S[k]);rchips.append(p);return[k,p];});
  controls.push({d:{},w:rchips,update(){rs.forEach(([k,p])=>p.setAttribute('aria-pressed',!!S[k]));}});
  build(b,[
    {t:'hint',text:'Click the parts to choose the columns. The words that are true now sit on one line.',show:cols},
    {t:'hint',text:'Hours and minutes always; click to add seconds and the date, a ring each, outwards.',show:rgs},
    {t:'hint',text:'Nothing to show. Switch on at least one part.',show:s=>cols(s)&&!(s.ssTTime||s.ssTDay||s.ssTDate||s.ssTMonth||s.ssTYear)},
    {t:'seg',k:'ssTSplit',label:'Rings',opts:[[false,'One for each'],[true,'Tens and units']],show:rgs},
    {t:'seg',k:'ssTH24',label:'Format',opts:[[false,'12-hour'],[true,'24-hour']],show:s=>rgs(s)||s.ssTTime},
    {t:'seg',k:'ssTZero',label:'Say 0 as',opts:[['zero','Zero'],['oh','Oh']]},
    {t:'seg',k:'ssTCase',label:'Case',opts:[['auto','As drawn'],['title','Title Case'],['lower','lower case'],['upper','CAPITALS']]},
  ]);
  addSelect(b,{k:'ssTFont',label:'Font',optsFn:()=>[['','Medium, if loaded']].concat(faceOpts())});
  build(b,[
    {t:'range',k:'ssTTracking',label:'Tracking',min:-100,max:200,step:1,fmt:v=>(v>0?'+':'')+Math.round(v)},
    {t:'range',k:'ssTSpace',label:'Space between',min:40,max:300,step:1,fmt:v=>Math.round(v)+'% of a word space'},
  ]);
  build(b,[{t:'hint',text:'Always this computer’s own time and date, wherever the screen saver is installed.'}]);
}
{const b=card('ss-tchange','Change',ty,'saver');
  build(b,[
    {t:'seg',k:'ssTFeel',label:'Feel',opts:[['snappy','Snappy'],['smooth','Smooth'],['elastic','Elastic']]},
    {t:'range',k:'ssTLen',label:'Length',min:.15,max:2,step:.05,fmt:v=>v.toFixed(2)+' s'},
    {t:'seg',k:'ssTFar',label:'The other words',opts:[['all','All shown'],['fade','Fade with distance']]},
  ]);
}
/* Position */
{const b=card('ss-pos','Position',null,'saver');
  build(b,[
    {t:'seg',k:'ssAlign',label:'Align',opts:[['left','Left'],['centre','Centre'],['right','Right']],show:s=>clk(s)&&!s.ssMove},
    {t:'seg',k:'ssVAlign',label:'Vertical',opts:[['top','Top'],['middle','Middle'],['bottom','Bottom']],show:s=>clk(s)&&!s.ssMove},
    {t:'toggle',k:'ssMove',label:'Next corner each minute',show:clk},
    {t:'range',k:'ssSize',label:'Size',min:10,max:100,step:1,fmt:v=>'up to '+Math.round(v)+'%',show:clk},
    {t:'range',k:'ssMargin',label:'Margin',min:0,max:25,step:.5,fmt:v=>roundTo(v,.5)+'%',show:clk},
    {t:'seg',k:'ssWAlign',label:'Align',opts:[['left','Left'],['centre','Centre'],['right','Right']],show:wd},
    {t:'seg',k:'ssWVAlign',label:'Vertical',opts:[['top','Top'],['middle','Middle'],['bottom','Bottom']],show:wd},
    {t:'range',k:'ssWMargin',label:'Margin',min:0,max:15,step:.5,fmt:v=>roundTo(v,.5)+'%',show:wd},
    {t:'range',k:'ssDialSize',label:'Size',min:20,max:100,step:1,fmt:v=>Math.round(v)+'% of the screen',show:dl},
    {t:'range',k:'ssTCSize',label:'Size',min:20,max:100,step:1,fmt:v=>'line '+Math.round(v)+'% of the width',show:cols},
    {t:'range',k:'ssTLeading',label:'Line spacing',min:1.1,max:3,step:.05,fmt:v=>v.toFixed(2)+' × cap',show:cols},
    {t:'range',k:'ssTRSize',label:'Size',min:20,max:100,step:1,fmt:v=>Math.round(v)+'% of the screen',show:rgs},
    {t:'range',k:'ssTHole',label:'Space in the middle',min:2,max:20,step:.1,fmt:v=>v.toFixed(1)+' × cap',show:rgs},
    {t:'range',k:'ssDrift',label:'Drift',min:0,max:1,step:.01,fmt:v=>v===0?'Off':pct(v)},
  ]);
}
/* ================= Colour themes (rebuilt in 0.9) =================
   Every way of showing the time has its own themes: some built in, and your own.
   The Colour card shows them all as tiles drawn in their colours. Click one to use it
   and its colours appear below, ready to change. Change a built-in theme and it's
   kept as a copy among yours (built-in themes stay as they are); change one of yours
   and it's saved as you go. Every hour: tick the themes to play through the day, in
   the order ticked, and say how long each lasts – the strip shows the day hour by
   hour; click an hour to see it. Imported screen savers bring their themes with them. */
const PALETTES=[
  {name:'Noon',bg:'#D3D5D5',p:['#F4FD5F','#1E2023','#F4FD5F','#1E2023']},
  {name:'Night',bg:'#000000',p:['#FFFFFF','#8C8C8C','#FFFFFF','#4D4D4D']},
  {name:'Paper',bg:'#F2F2F2',p:['#000000','#FF3B1F','#000000','#8C8C8C']},
  {name:'Signal',bg:'#FF4F1F',p:['#000000','#FFFFFF','#FFF35C','#000000']},
];
const WORD_THEMES=[
  {name:'Apricot',bg:'#FFFFFF',ink:'#181818',soft:'#FDA072',date:'#F7C6AA'},
  {name:'Red',bg:'#FFFFFF',ink:'#FF3B1F',soft:'#181818',date:'#8C8C8C'},
  {name:'Paper',bg:'#F2F2F2',ink:'#000000',soft:'#B4B4B4',date:'#6E6E6E'},
  {name:'Night',bg:'#000000',ink:'#FFFFFF',soft:'#4D4D4D',date:'#8C8C8C'},
  {name:'Signal',bg:'#FF4F1F',ink:'#000000',soft:'#FFFFFF',date:'#FFD3C4'},
  {name:'Noon',bg:'#D3D5D5',ink:'#F4FD5F',soft:'#1E2023',date:'#1E2023'},
];
const W_COLS=[['ssWBg','bg'],['ssWInk','ink'],['ssWSoft','soft'],['ssWDateCol','date']];
const DIAL_THEMES=[
  {name:'Paper',bg:'#FFFFFF',min:'#E7E7E7',hour:'#A9A9A9',quarter:'#181818',handH:'#EA2631',handM:'#EA2631',handS:'#EA2631',fill:'#FCE3E4'},
  {name:'Dawn',bg:'#FFFFFF',min:'#8A8A8A',hour:'#8A8A8A',quarter:'#C2C2C2',handH:'#30FFFE',handM:'#FDA072',handS:'#FEC4FE',fill:'#FFE8DA'},
  {name:'Noon',bg:'#D3D5D5',min:'#E9EBEB',hour:'#F4FD5F',quarter:'#1E2023',handH:'#F4FD5F',handM:'#F4FD5F',handS:'#1E2023',fill:'#F4FD5F'},
  {name:'Night',bg:'#000000',min:'#333333',hour:'#8C8C8C',quarter:'#FFFFFF',handH:'#FFFFFF',handM:'#FFFFFF',handS:'#FFF35C',fill:'#222222'},
  {name:'Signal',bg:'#FF4F1F',min:'#FF9A7A',hour:'#000000',quarter:'#000000',handH:'#000000',handM:'#000000',handS:'#FFFFFF',fill:'#FF9A7A'},
];
const D_COLS=[['ssDialBg','bg'],['ssDialMin','min'],['ssDialHour','hour'],['ssDialQuarter','quarter'],['ssDialHandH','handH'],['ssDialHandM','handM'],['ssDialHandS','handS'],['ssDialFillC','fill']];
/* Columns and Rings, as drawn: white, black for what's true now, warm grey for the rest */
const TYPE_THEMES=[
  {name:'Drawn',bg:'#FFFFFF',ink:'#000000',soft:'#D2CDC9'},
  {name:'Paper',bg:'#F2F2F2',ink:'#000000',soft:'#BDBDBD'},
  {name:'Night',bg:'#000000',ink:'#FFFFFF',soft:'#3A3A3A'},
  {name:'Noon',bg:'#D3D5D5',ink:'#1E2023',soft:'#F4FD5F'},
  {name:'Signal',bg:'#FF4F1F',ink:'#000000',soft:'#FFB49E'},
];
const T_COLS=[['ssTBg','bg'],['ssTInk','ink'],['ssTSoft','soft']];
const clockLab=i=>s=>s.ssColBy==='type'?['Numerals','Punctuation','Letters','Spare'][i]:s.ssColBy==='single'?'Type':s.ssColBy==='line'?'Line '+(i+1):'Colour '+(i+1);
const THEMES={
  clock:{id:'ss-colour',show:clk,store:'themes',builtin:PALETTES,on:s=>s.ssRotate!=='off',turn:v=>set('ssRotate',v?'all':'off'),set:'ssCSet',every:'ssCEvery',
    cols:[['ssBg','bg','Background'],['ssP1','p.0','Colour 1',clockLab(0)],['ssP2','p.1','Colour 2',clockLab(1),s=>s.ssColBy!=='single'],['ssP3','p.2','Colour 3',clockLab(2),s=>s.ssColBy!=='single'],['ssP4','p.3','Colour 4',clockLab(3),s=>s.ssColBy!=='single'&&s.ssColBy!=='type']]},
  words:{id:'ss-wcolour',show:wd,store:'wthemes',builtin:WORD_THEMES,on:s=>!!s.ssWRotate,turn:v=>set('ssWRotate',!!v),set:'ssWSet',every:'ssWEvery',
    cols:[['ssWBg','bg','Background'],['ssWInk','ink','Highlight',s=>s.ssWHi==='faces'?'Other fonts':s.ssWHi==='time'||s.ssWHi==='parts'?'The time':s.ssWHi==='latest'?'Latest change':'Type'],['ssWDateCol','date','The date',null,s=>s.ssWHi==='parts'],['ssWSoft','soft','Everything else',null,s=>s.ssWHi!=='none']]},
  dial:{id:'ss-dcolour',show:dl,store:'dthemes',builtin:DIAL_THEMES,on:s=>!!s.ssDialRotate,turn:v=>set('ssDialRotate',!!v),set:'ssDialSet',every:'ssDialEvery',
    cols:[['ssDialBg','bg','Background'],['ssDialMin','min','Minute marks',null,s=>s.ssDialFace!=='none'&&s.ssDialDetail==='minutes'],
      ['ssDialHour','hour','Hour marks',s=>s.ssDialFace==='none'||s.ssDialDetail==='quarters'?'Ring':'Hour marks',s=>(s.ssDialFace!=='none'&&s.ssDialDetail!=='quarters')||s.ssDialRing],
      ['ssDialQuarter','quarter','Quarter marks',null,s=>s.ssDialFace!=='none'],['ssDialHandH','handH','Hour hand'],['ssDialHandM','handM','Minute hand'],['ssDialHandS','handS','Second hand',null,s=>s.ssDialSecs],
      ['ssDialFillC','fill','Fill',null,s=>s.ssDialFill!=='off']]},
  type:{id:'ss-tcolour',show:ty,store:'tthemes',builtin:TYPE_THEMES,on:s=>!!s.ssTRotate,turn:v=>set('ssTRotate',!!v),set:'ssTSet',every:'ssTEvery',
    cols:[['ssTBg','bg','Background'],['ssTInk','ink','Now'],['ssTSoft','soft','The other words']]},
};
const kindNow=s=>wd(s)?'words':dl(s)?'dial':ty(s)?'type':'clock';
const tget=(T,f)=>f.startsWith('p.')?(T.p||[])[+f.slice(2)]:T[f];
const tput=(T,f,v)=>{if(f.startsWith('p.')){T.p=T.p||[];T.p[+f.slice(2)]=v;}else T[f]=v;};
const mineOf=k=>{const v=LS.get(THEMES[k].store);return Array.isArray(v)?v:[];};
const putMine=(k,list)=>{LS.set(THEMES[k].store,list);};
const getThemes=()=>mineOf('clock');
const allOf=k=>THEMES[k].builtin.map(T=>Object.assign({builtin:true},T)).concat(mineOf(k));
const findTheme=(k,n)=>allOf(k).find(T=>T.name===n)||null;
const lc=v=>String(v==null?'':v).toLowerCase();
/* the dial's fill colour only counts when the face fills */
const sameCols=(k,A,B)=>THEMES[k].cols.every(([,f])=>(k==='dial'&&f==='fill'&&S.ssDialFill==='off')||lc(tget(A,f))===lc(tget(B,f)));
const fromS=(k,name)=>{const T={name};for(const [key,f] of THEMES[k].cols)tput(T,f,S[key]);return T;};
const toS=(k,T)=>{for(const [key,f] of THEMES[k].cols){const v=tget(T,f);if(typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v))S[key]=v.toUpperCase();}};
/* the themes that play through the day: those ticked, in order; none ticked means all of them */
const setNames=(k,s)=>{s=s||S;const all=allOf(k).map(T=>T.name),v=String(s[THEMES[k].set]||'');if(!v)return all;const q=v.split('|').filter(n=>all.includes(n));return q.length?q:all;};
const setThemes=(k,s)=>setNames(k,s).map(n=>{const T=Object.assign({},findTheme(k,n));delete T.builtin;return T;});
const everyOf=(k,s)=>Math.max(1,+(s||S)[THEMES[k].every]||1);
const themeAt=(k,h,s)=>{const q=setThemes(k,s);return q[Math.floor(h/everyOf(k,s))%q.length];};
const uniqueTheme=(k,n)=>{const has=x=>allOf(k).some(T=>T.name===x);if(!has(n))return n;const m=/^(.*\S) (\d+)$/.exec(n),root=m?m[1]:n;let i=m?+m[2]+1:2;while(has(root+' '+i))i++;return root+' '+i;};
/* which theme the colours below belong to; and, every hour, the one the preview shows while it's being looked at */
const SEL={},LOOK={};
const selOf=k=>{const n=SEL[k];if(n&&findTheme(k,n))return findTheme(k,n);const cur=fromS(k,'');return allOf(k).find(T=>sameCols(k,T,cur))||null;};
/* A theme brought in with a preset or an old screen saver: kept among yours, renamed if a different theme has its name. Returns old → new names. */
function importThemes(k,list){const map={};if(!Array.isArray(list))return map;let mine=mineOf(k),add=false;
  for(const T0 of list){if(!T0||!T0.name)continue;const T=Object.assign({},T0);delete T.builtin;
    const same=allOf(k).find(x=>x.name===T.name);if(same&&sameCols(k,same,T))continue;
    const twin=allOf(k).find(x=>sameCols(k,x,T)&&!same);if(twin){map[T.name]=twin.name;continue;}
    const n=same?uniqueTheme(k,T.name):T.name;if(n!==T.name)map[T.name]=n;T.name=n;mine=mine.concat([T]);putMine(k,mine);add=true;}
  return map;}
const remapSet=(k,map)=>{const key=THEMES[k].set,v=String(S[key]||'');if(!v||!Object.keys(map).length)return;S[key]=v.split('|').map(n=>map[n]||n).join('|');};
/* tiles: each theme drawn small in its own colours */
function tilePreview(k,T){const box=el('span','tt-prev');box.style.background=tget(T,'bg');
  if(k==='clock'){const t=el('span','tt-clock');[['12',0],[',',1],['47',0]].forEach(([x,i])=>{const sp=el('span',null,x);sp.style.color=tget(T,'p.'+(S.ssColBy==='letter'||S.ssColBy==='random'?(x===','?1:0):i));t.append(sp);});box.append(t);}
  else if(k==='words'){const t=el('span','tt-words'),a=el('span',null,'It is '),b=el('span',null,'twelve'),c=el('span','tt-small',' on Monday');a.style.color=T.soft;b.style.color=T.ink;c.style.color=T.date||T.soft;t.append(a,b,c);box.append(t);}
  else if(k==='type'){const t=el('span','tt-type');[['Eleven','soft'],['Twelve','ink'],['One','soft']].forEach(([x,f])=>{const sp=el('span',null,x);sp.style.color=T[f];t.append(sp);});box.append(t);}
  else{const ns='http://www.w3.org/2000/svg',sv=document.createElementNS(ns,'svg');sv.setAttribute('viewBox','-50 -50 100 100');sv.setAttribute('class','tt-dial');
    const ln=(a,r0,r1,c,w)=>{const l=document.createElementNS(ns,'line'),s=Math.sin(a),co=Math.cos(a);l.setAttribute('x1',r0*s);l.setAttribute('y1',-r0*co);l.setAttribute('x2',r1*s);l.setAttribute('y2',-r1*co);l.setAttribute('stroke',c);l.setAttribute('stroke-width',w);sv.append(l);};
    const pie=document.createElementNS(ns,'path');pie.setAttribute('d','M0 0 L0 -40 A40 40 0 0 1 34.6 20 Z');pie.setAttribute('fill',T.fill||T.handM);pie.setAttribute('opacity','.9');sv.append(pie);
    for(let i=0;i<60;i+=5)ln(i/60*Math.PI*2,i%15?30:24,40,i%15?T.hour:T.quarter,i%15?2:3);
    ln(Math.PI*2*.33,-4,24,T.handH,4);ln(Math.PI*2*.78,-4,36,T.handM,3);ln(Math.PI*2*.55,-6,38,T.handS,1.5);box.append(sv);}
  return box;}
function themeCard(k,before){const K=THEMES[k],b=card(K.id,'Colour',K.show,'saver');if(before)before(b);
  const on=s=>K.show(s)&&K.on(s);
  build(b,[{t:'seg',k:'__'+k+'Mode',label:'Colours',opts:[[false,'One theme'],[true,'Every hour']]}]);
  /* the seg above is drawn by build() but stands for K.on – rewire it */
  {const c=controls[controls.length-1];c.d.k=null;c.w.querySelectorAll('button').forEach((x,i)=>{x.onclick=()=>{K.turn(i===1);LOOK[k]=null;refreshThemes();};});
    c.update=()=>c.w.querySelectorAll('button').forEach((x,i)=>x.setAttribute('aria-pressed',(i===1)===!!K.on(S)));}
  const hint=addHint(b,'Tick the themes to play through the day, in the order you tick them. Click a theme to see and change it.',on);
  const grid=el('div','theme-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label','Themes');addCustom(b,null,grid);
  /* every hour: how long each lasts, and the day hour by hour */
  build(b,[{t:'seg',k:K.every,label:'Each theme lasts',opts:[[1,'1 hour'],[2,'2 hours'],[3,'3 hours'],[4,'4 hours'],[6,'6 hours'],[12,'12 hours']],show:on}]);
  const strip=el('div','hour-strip');strip.setAttribute('role','group');strip.setAttribute('aria-label','The day, hour by hour');addCustom(b,on,strip);
  const axis=el('div','hs-axis');['00','06','12','18','24'].forEach(x=>axis.append(el('span',null,x)));addCustom(b,on,axis);
  const look=el('p','hint look-line');addCustom(b,on,look);
  /* the colours of the theme in use */
  const head=el('div','sub-head');addCustom(b,null,head);
  const cf=el('div');addCustom(b,null,cf);
  build(cf,K.cols.map(([key,,label,lfn,sh])=>({t:'colour',k:key,label,labelFn:lfn||null,show:s=>K.show(s)&&(!sh||sh(s))})));
  cf.querySelectorAll('input[type=color]').forEach(inp=>inp.addEventListener('input',()=>edited(k)));
  const nameRow=el('div','ctl btn-row'),nm=el('input');nm.type='text';nm.setAttribute('aria-label','Theme name');const del=el('button','pill small','Delete');nameRow.append(nm,del);addCustom(b,null,nameRow);
  const newRow=el('div','ctl btn-row'),nb=el('button','pill small','New theme from these colours');newRow.append(nb);addCustom(b,null,newRow);
  /* 0.9.2: a theme can go to the other designs – the time, words, the dial, Columns and Rings – its colours matched by role */
  const shareRow=el('div','ctl btn-row'),shb=el('button','pill small','Copy to the other designs');shareRow.append(shb);addCustom(b,null,shareRow);
  shb.onclick=()=>{const T=selOf(k)||fromS(k,'Theme');const names=[];for(const k2 of Object.keys(THEMES)){if(k2===k)continue;const n=shareTheme(k,T,k2);if(n)names.push(n);}
    themeChanged(true);toast(names.length?`${T.name||'These colours'} is now in every design`:'Already in every design');};
  const others=fold(b,'c-others-'+k,'From your other designs',null,true),ogrid=el('div','theme-grid');ogrid.setAttribute('role','group');ogrid.setAttribute('aria-label','Themes from other designs');addCustom(others,null,ogrid);
  const ohint=addHint(others,'Themes you’ve made for the other designs show here. Click one to bring it in – its colours are matched by role.');
  const note=el('p','hint');addCustom(b,null,note);
  nm.onchange=()=>{const T=selOf(k);if(!T||T.builtin)return;const n=nm.value.trim();if(!n||n===T.name)return refreshThemes();const nn=uniqueTheme(k,n),mine=mineOf(k);
    const x=mine.find(t=>t.name===T.name);if(x){x.name=nn;putMine(k,mine);remapSet(k,{[T.name]:nn});SEL[k]=nn;if(LOOK[k]===T.name)LOOK[k]=nn;themeChanged();}};
  nm.onkeydown=e=>{if(e.key==='Enter')nm.blur();};
  let armed=0;del.onclick=()=>{const T=selOf(k);if(!T||T.builtin)return;if(Date.now()-armed>4000){armed=Date.now();del.textContent='Delete – sure?';setTimeout(()=>{del.textContent='Delete';},4000);return;}
    armed=0;del.textContent='Delete';putMine(k,mineOf(k).filter(t=>t.name!==T.name));const key=K.set;S[key]=String(S[key]||'').split('|').filter(n=>n&&n!==T.name).join('|');
    SEL[k]=null;LOOK[k]=null;themeChanged();toast(`Deleted ${T.name}`);};
  nb.onclick=()=>{const n=uniqueTheme(k,'Theme '+(mineOf(k).length+1)),T=fromS(k,n);putMine(k,mineOf(k).concat([T]));SEL[k]=n;addToSet(k,n);themeChanged();toast(`Saved ${n}`);};
  function paint(){
    const sel=selOf(k),names=setNames(k),explicit=!!String(S[K.set]||''),hourly=K.on(S);grid.textContent='';
    const tiles=allOf(k);
    tiles.forEach(T=>{const t=el('button','theme-tile');t.type='button';t.setAttribute('aria-pressed',!!(sel&&sel.name===T.name));t.setAttribute('aria-label',T.name);
      t.append(tilePreview(k,T));const nmS=el('span','tt-name',T.name);t.append(nmS);if(!T.builtin)t.classList.add('mine');
      if(hourly){const i=names.indexOf(T.name),tk=el('span','tt-tick'+(i>=0?' on':''),i>=0?String(i+1):'');tk.setAttribute('role','checkbox');tk.setAttribute('aria-checked',i>=0);tk.setAttribute('aria-label','Every hour – '+T.name);tk.tabIndex=0;
        tk.onclick=e=>{e.stopPropagation();toggleSet(k,T.name);};tk.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();toggleSet(k,T.name);}};t.append(tk);}
      t.onclick=()=>{SEL[k]=T.name;toS(k,T);if(hourly)LOOK[k]=T.name;themeChanged();};grid.append(t);});
    /* the day, hour by hour */
    strip.textContent='';if(hourly){const now=new Date().getHours(),lk=LOOK[k];
      for(let h=0;h<24;h++){const T=themeAt(k,h)||{},c=el('button','hs-cell');c.type='button';c.style.background=tget(T,'bg')||'#888';
        const dot=el('i');dot.style.background=k==='clock'?tget(T,'p.0'):k==='dial'?T.handM:T.ink;c.append(dot);
        if(h===now)c.classList.add('now');if(lk&&T.name===lk)c.classList.add('look');
        const lbl=String(h).padStart(2,'0')+':00 – '+(T.name||'');c.dataset.tip=lbl;c.setAttribute('aria-label',lbl);
        c.onclick=()=>{SEL[k]=T.name;LOOK[k]=T.name;toS(k,T);themeChanged();};strip.append(c);}
      const n=names.length,ev=everyOf(k),cur=themeAt(k,now);
      look.textContent='';
      if(lk){const hrs=[];for(let h=0;h<24;h++)if((themeAt(k,h)||{}).name===lk)hrs.push(String(h).padStart(2,'0')+':00');
        look.append('Showing ',el('b',null,lk),hrs.length?' – plays at '+(hrs.length>6?hrs.slice(0,6).join(', ')+' and more':hrs.join(', ')):' – not in the day yet. Tick it to add it.',' ');
        const bk=el('button','pill small','Show the time now');bk.onclick=()=>{LOOK[k]=null;themeChanged();};look.append(bk);}
      else look.append(`${n} theme${n>1?'s':''}, ${ev===1?'one an hour':'each for '+ev+' hours'}${explicit?'':' (all of them – tick to choose)'}. Now: `,el('b',null,cur?cur.name:''),'.');}
    head.textContent=sel?(sel.builtin?sel.name+' – built in':sel.name):'Your colours';
    nameRow.hidden=!sel||!!sel.builtin;if(sel&&!sel.builtin&&document.activeElement!==nm)nm.value=sel.name;
    newRow.hidden=!!sel;
    ogrid.textContent='';for(const k2 of Object.keys(THEMES)){if(k2===k)continue;for(const T of mineOf(k2)){if(allOf(k).some(x=>sameCols(k,x,mapTheme(k2,T,k))))continue;
      const t=el('button','theme-tile');t.type='button';t.setAttribute('aria-label',T.name+' – from '+KIND_NAME[k2]);t.append(tilePreview(k2,T),el('span','tt-name',T.name));
      t.onclick=()=>{const n=shareTheme(k2,T,k);if(n){SEL[k]=n;toS(k,findTheme(k,n));themeChanged();toast(`Brought in ${n}`);}};ogrid.append(t);}}
    ohint.w.hidden=!!ogrid.children.length;if(!ogrid.children.length)ohint.w.textContent='Themes you make for the other designs show here, ready to bring in.';
    note.textContent=sel&&sel.builtin?'Change a colour and the theme is kept as a copy among yours; the built-in one stays as it is.':!sel?'These colours aren’t a theme yet. Save them to use them every hour.':'Changes to your themes are saved as you go.';}
  controls.push({d:{},w:grid,update:paint});
}
/* themes across designs: every colour has a role – background, ink (what's read first), accent,
   soft (what recedes) – so a theme moves between designs with its colours in sensible places */
const KIND_NAME={clock:'The time',words:'In words',dial:'The dial',type:'Columns and Rings'};
const ROLES={clock:{bg:'bg','p.0':'ink','p.1':'accent','p.2':'ink2','p.3':'soft'},words:{bg:'bg',ink:'ink',soft:'soft',date:'accent'},
  dial:{bg:'bg',min:'soft',hour:'soft2',quarter:'ink',handH:'ink',handM:'ink',handS:'accent',fill:'soft'},type:{bg:'bg',ink:'ink',soft:'soft'}};
const ROLE_FALL={ink:['ink','accent','ink2','soft'],ink2:['ink2','ink','accent'],accent:['accent','ink2','ink'],soft:['soft','soft2','accent','ink2','ink'],soft2:['soft2','soft','accent','ink'],bg:['bg']};
function mapTheme(k1,T,k2){const src={};for(const [f,r] of Object.entries(ROLES[k1])){const v=tget(T,f);if(v&&!src[r])src[r]=v;}
  const out={name:T.name};for(const [,f] of THEMES[k2].cols){const r=ROLES[k2][f],v=(ROLE_FALL[r]||[r]).map(x=>src[x]).find(Boolean)||src.ink||'#000000';tput(out,f,v);}return out;}
/* put a theme from k1 into k2's own themes (unless one there already has those colours); returns its name there */
function shareTheme(k1,T,k2){const M=mapTheme(k1,T,k2),have=allOf(k2).find(x=>sameCols(k2,x,M));if(have)return have.name;
  const n=uniqueTheme(k2,T.name||'Theme');M.name=n;putMine(k2,mineOf(k2).concat([M]));return n;}
function toggleSet(k,n){const K=THEMES[k],q=String(S[K.set]||'')?setNames(k):[];const i=q.indexOf(n);if(i>=0)q.splice(i,1);else q.push(n);
  /* unticking the last one goes back to all of them */
  S[K.set]=q.join('|');themeChanged();}
function addToSet(k,n){const K=THEMES[k];if(!String(S[K.set]||''))return;const q=setNames(k);if(!q.includes(n)){q.push(n);S[K.set]=q.join('|');}}
/* a colour changed: write it into the theme it belongs to (a copy, if that one's built in) */
let copyToast=0;
function edited(k){const K=THEMES[k],T=selOf(k)||(SEL[k]&&findTheme(k,SEL[k]));if(!T)return refreshThemes();
  if(T.builtin){const n=uniqueTheme(k,'My '+T.name),C=fromS(k,n);putMine(k,mineOf(k).concat([C]));
    const key=K.set,v=String(S[key]||'');S[key]=(v?v.split('|'):setNames(k)).map(x=>x===T.name?n:x).join('|');
    if(!K.on(S))S[key]=v;/* one theme: the day's list stays as it was */
    SEL[k]=n;if(LOOK[k]===T.name)LOOK[k]=n;if(Date.now()-copyToast>8000){copyToast=Date.now();toast(`Kept as ${n} – ${T.name} stays as it is`);}}
  else{const mine=mineOf(k),x=mine.find(t=>t.name===T.name);if(x){const C=fromS(k,x.name);Object.assign(x,C);putMine(k,mine);}SEL[k]=T.name;}
  themeChanged(true);}
function themeChanged(quiet){ssDirty=true;autosave();if(!quiet)refreshAll();else refreshThemes();}
function refreshThemes(){for(const c of controls)if(c.w&&c.w.classList&&c.w.classList.contains('theme-grid'))c.update();refreshVis();refreshSummaries();}
window.themesRefresh=refreshThemes;
/* the preview: every hour, the theme being looked at stands in for the hour's own */
function previewForce(){const k=kindNow(S),K=THEMES[k];if(!K.on(S)||!LOOK[k])return null;const T=findTheme(k,LOOK[k]);if(!T)return null;
  const o=Object.assign({},T);delete o.builtin;delete o.name;if(k==='words'&&!o.date)o.date=o.soft;return o;}
for(const k of Object.keys(THEMES)){SUMMARY[THEMES[k].id]=s=>{if(THEMES[k].on(s)){const n=setNames(k,s).length;return`Every hour · ${n} theme${n>1?'s':''}`;}const T=selOf(k);return T?T.name:'Your colours';};}
themeCard('clock',b=>build(b,[{t:'seg',k:'ssColBy',label:'Colour by',opts:[['type','Character type'],['letter','Each letter'],['line','Line'],['random','Random'],['single','One colour']]}]));
themeCard('words');themeCard('dial');themeCard('type');
/* ================= The colour picker (0.9.2) =================
   Click any colour and this opens straight away, beside it: a colour wheel, a brightness
   slider, the hex, a dropper (where the browser has one) – and your saved colours, kept for
   every design. Save the colour in hand with +; click a saved one to use it; × removes it.
   It stands in for the browser's own picker, which differs from browser to browser. */
const SWATCHES=()=>{const v=LS.get('swatches');return Array.isArray(v)?v:[];};
const putSwatches=v=>LS.set('swatches',v.slice(0,48));
const hexOk=v=>/^#?[0-9a-f]{6}$/i.test(v||'');
const toHex6=v=>('#'+String(v).replace('#','')).toUpperCase();
function rgbOf(h){const n=parseInt(h.slice(1),16);return[n>>16&255,n>>8&255,n&255];}
function hsvOf([r,g,b]){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let hh=0;
  if(d){hh=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;hh*=60;if(hh<0)hh+=360;}return[hh,mx?d/mx:0,mx];}
function hexOfHsv(hh,sv,vv){const c=vv*sv,x=c*(1-Math.abs((hh/60)%2-1)),m=vv-c;let r=0,g=0,b=0;
  if(hh<60)[r,g,b]=[c,x,0];else if(hh<120)[r,g,b]=[x,c,0];else if(hh<180)[r,g,b]=[0,c,x];else if(hh<240)[r,g,b]=[0,x,c];else if(hh<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];
  return'#'+[r,g,b].map(t=>Math.round((t+m)*255).toString(16).padStart(2,'0')).join('').toUpperCase();}
const picker=(()=>{const box=el('div','cpick');box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-label','Colour');document.body.append(box);
  const WH=184,wheel=el('canvas','cp-wheel');wheel.width=WH*2;wheel.height=WH*2;wheel.style.width=wheel.style.height=WH+'px';
  const dot=el('span','cp-dot'),wrap=el('div','cp-wheelbox');wrap.append(wheel,dot);
  const val=el('input','cp-val');val.type='range';val.min=0;val.max=100;val.setAttribute('aria-label','Brightness');
  const now=el('span','cp-now'),hex=el('input','cp-hex');hex.type='text';hex.setAttribute('aria-label','Hex');hex.spellcheck=false;
  const drop=el('button','cp-drop');drop.type='button';drop.setAttribute('aria-label','Pick a colour from the screen');drop.innerHTML='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9.6 1.9l2.5 2.5-1.3 1.3-.7-.7-5.4 5.4H3.2v-1.5l5.4-5.4-.7-.7z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M2.2 11.8l1-1" stroke="currentColor" stroke-width="1.2"/></svg>';
  drop.hidden=!window.EyeDropper;
  const row=el('div','cp-row');row.append(now,hex,drop);
  const sh=el('div','cp-sub','Saved colours'),grid=el('div','cp-grid'),add=el('button','cp-add','+');add.type='button';add.setAttribute('aria-label','Save this colour');
  box.append(wrap,val,row,sh,grid);
  let H=0,Sa=0,V=1,cur='#000000',onPick=null,anchor=null,drawnV=-1;
  const paintWheel=()=>{if(drawnV===V)return;drawnV=V;const x=wheel.getContext('2d'),N=WH*2,im=x.createImageData(N,N),R=N/2;
    for(let yy=0;yy<N;yy++)for(let xx=0;xx<N;xx++){const dx=xx-R+.5,dy=yy-R+.5,d=Math.hypot(dx,dy)/R,o=(yy*N+xx)*4;if(d>1){im.data[o+3]=0;continue;}
      const a=(Math.atan2(dy,dx)*180/Math.PI+360+90)%360,[r,g,b]=rgbOf(hexOfHsv(a,Math.min(1,d),V));im.data[o]=r;im.data[o+1]=g;im.data[o+2]=b;im.data[o+3]=d>.995?Math.round((1-d)*200*255/1):255;}
    x.putImageData(im,0,0);};
  const show=()=>{cur=hexOfHsv(H,Sa,V);now.style.background=cur;if(document.activeElement!==hex)hex.value=cur;val.value=Math.round(V*100);
    val.style.setProperty('--cp-top',hexOfHsv(H,Sa,1));paintWheel();const a=(H-90)*Math.PI/180,r=Sa*WH/2;dot.style.left=(WH/2+Math.cos(a)*r)+'px';dot.style.top=(WH/2+Math.sin(a)*r)+'px';dot.style.background=cur;};
  const set=(h,keep)=>{[H,Sa,V]=keep?[H,Sa,V]:hsvOf(rgbOf(h));if(keep)return;show();};
  const emit=()=>{show();if(onPick)onPick(cur);};
  const grids=()=>{grid.textContent='';for(const c of SWATCHES()){const b=el('button','cp-sw');b.type='button';b.style.background=c;b.title=c;b.setAttribute('aria-label','Use '+c);
      const x=el('span','cp-x','×');x.setAttribute('aria-label','Remove '+c);x.onclick=e=>{e.stopPropagation();putSwatches(SWATCHES().filter(v=>v!==c));grids();};b.append(x);
      b.onclick=()=>{[H,Sa,V]=hsvOf(rgbOf(c));emit();};grid.append(b);}
    grid.append(add);};
  add.onclick=()=>{const v=SWATCHES().filter(c=>c!==cur);v.unshift(cur);putSwatches(v);grids();};
  const at=e=>{const r=wheel.getBoundingClientRect(),dx=e.clientX-r.left-WH/2,dy=e.clientY-r.top-WH/2;H=(Math.atan2(dy,dx)*180/Math.PI+360+90)%360;Sa=Math.min(1,Math.hypot(dx,dy)/(WH/2));emit();};
  wheel.onpointerdown=e=>{wheel.setPointerCapture(e.pointerId);at(e);wheel.onpointermove=at;};wheel.onpointerup=()=>{wheel.onpointermove=null;};
  val.oninput=()=>{V=val.value/100;emit();};
  hex.oninput=()=>{if(hexOk(hex.value)){[H,Sa,V]=hsvOf(rgbOf(toHex6(hex.value)));cur=toHex6(hex.value);show();if(onPick)onPick(cur);}};
  hex.onkeydown=e=>{if(e.key==='Enter')close();};
  drop.onclick=async()=>{try{const r=await new EyeDropper().open();[H,Sa,V]=hsvOf(rgbOf(toHex6(r.sRGBHex)));emit();}catch(e){}};
  const close=()=>{box.hidden=true;onPick=null;if(anchor)anchor.classList.remove('picking');anchor=null;};
  document.addEventListener('pointerdown',e=>{if(!box.hidden&&!box.contains(e.target)&&!(anchor&&anchor.contains(e.target)))close();},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!box.hidden)close();});
  return{open(a,h,fn){if(anchor)anchor.classList.remove('picking');anchor=a;a.classList.add('picking');onPick=null;[H,Sa,V]=hsvOf(rgbOf(toHex6(h)));drawnV=-1;show();grids();box.hidden=false;
      const r=a.getBoundingClientRect(),bw=box.offsetWidth,bh=box.offsetHeight;let x=r.right+12,y=r.top-20;if(x+bw>innerWidth-8)x=Math.max(8,r.left-bw-12);if(y+bh>innerHeight-8)y=innerHeight-bh-8;box.style.left=Math.max(8,x)+'px';box.style.top=Math.max(8,y)+'px';onPick=fn;},close,el:box};})();
/* every colour in the panel opens it, instead of the browser's own */
panel.addEventListener('click',e=>{const inp=e.target.closest&&e.target.closest('.colour-row input[type=color]');const row=e.target.closest&&e.target.closest('.colour-row');
  if(!row||!row.querySelector('input[type=color]'))return;const i=inp||row.querySelector('input[type=color]');e.preventDefault();
  picker.open(row,i.value,h=>{i.value=h;i.dispatchEvent(new Event('input',{bubbles:true}));});},true);

/* Export */
{const b=card('ss-export','Export',null,'saver');
  addHint(b,'No font loaded, so exports will use the demo face. Add your font in Fonts first.',s=>!anyLoaded()&&!dl(s));
  const nr=el('div','ctl'),nh=el('div','ctl-head'),nl=el('label',null,'Name'),nm=el('input');nm.type='text';nm.id='c_ssName';nl.htmlFor=nm.id;
  nh.append(nl);const nq=qMark({k:'ssName',label:'Name'});if(nq)nh.append(nq);nr.append(nh,nm);b.append(nr);
  nm.oninput=()=>set('ssName',nm.value,true);
  controls.push({d:{},w:nr,update(){if(document.activeElement!==nm)nm.value=S.ssName;nm.placeholder=defaultName();}});
  b.append(el('div','sub-head','Everything'));
  const all=el('button','pill primary','Download everything');const r0=el('div','ctl btn-row');r0.append(all);b.append(r0);
  b.append(el('p','hint','One zip, named as above: the Mac and Windows screen savers, the HTML file and a read-me with how to install each.'));
  all.onclick=exportAll;window.allBtn=all;
  b.append(el('div','sub-head','Mac'));
  const mac=el('button','pill','Download for Mac');const r1=el('div','ctl btn-row');r1.append(mac);b.append(r1);
  b.append(el('p','hint','A .saver you install by double-clicking. The first time, macOS blocks it: allow it under System Settings › Privacy & Security › Open Anyway, then install for all users. The read-me in the zip walks through it.'));
  mac.onclick=exportMac;window.macBtn=mac;
  b.append(el('div','sub-head','Windows'));
  const win=el('button','pill','Download for Windows');const r3=el('div','ctl btn-row');r3.append(win);b.append(r3);
  b.append(el('p','hint','A .scr you install by right-clicking and choosing Install. It plays full screen through Microsoft Edge, built into Windows 10 and 11.'));
  win.onclick=exportWin;window.winBtn=win;
  b.append(el('div','sub-head','Any computer'));
  const go=el('button','pill','Download HTML file');const r2=el('div','ctl btn-row');r2.append(go);b.append(r2);
  go.onclick=exportScreensaver;
  const how=el('details');const sm=el('summary',null,'Using the HTML file');
  const howText=el('div','hint');
  howText.innerHTML='<p>Open it in any browser and click to go full screen. It also works with WebViewScreenSaver on a Mac and Lively Wallpaper on Windows, if you already use them.</p>';
  how.append(sm,howText);b.append(how);
  cardToSheet(b,'export');/* Export grows out of the island */
}
/* ================= Presets: screen savers saved to come back to =================
   A preset is every Tempo setting, plus the fonts it uses described by name and
   file (a browser's own font ids mean nothing elsewhere), which of them shuffle
   in, and their tracking – so it opens the same in another browser once those
   fonts are loaded. Exports carry one too (cfg.edit), so a downloaded screen
   saver opens again, ready to edit; older exports are read back from their
   settings blocks. Kept under 'tempo:presets'; the one open under 'tempo:active'. */
const PART_KEYS=[...M_PARTS.map(x=>x[0]),...N_PARTS.map(x=>x[0])];
const fontDesc=st=>({name:st.face.name,family:st.face.family||'',file:fileOf(st)||''});
function snapshot(name,keys){
  const s={};for(const k of (keys||tempoKeys()))if(k!=='ssName')s[k]=S[k];s.baseSlot=baseSlot();
  const on=styles.filter(x=>!x.off),fonts={},tracks={};
  on.forEach(st=>{fonts[st.id]=fontDesc(st);if(TRACKS[st.id])tracks[st.id]=TRACKS[st.id];});
  return{tempo:1,name:name||'',exportName:S.ssName||'',settings:s,fonts,on:on.map(x=>x.id),pool:on.filter(x=>x.swap!==false&&x.id!==s.baseSlot).map(x=>x.id),tracks,themes:getThemes(),themesW:mineOf('words'),themesD:mineOf('dial'),themesT:mineOf('type')};}
/* what makes two screen savers the same: settings, fonts on, the shuffle, tracking */
const sigOf=p=>JSON.stringify([p.settings,p.exportName||'',p.on,p.pool,p.tracks]);
const sigNow=()=>sigOf(snapshot());
/* a preset's fonts, found among those loaded here: by id (same browser), file, then name */
function resolveFonts(p){const map={},missing=[];
  for(const [id,d] of Object.entries(p.fonts||{})){
    const st=styles.find(x=>x.id===id&&x.face.name===d.name)||(d.file&&styles.find(x=>fileOf(x)===d.file))||styles.find(x=>x.face.name===d.name);
    if(st)map[id]=st.id;else missing.push(d.name);}
  return{map,missing};}
function applyPresetSettings(p,m){
  const src=p.settings||{},s=sanitise(src),id=x=>m.map[x]||null;
  for(const k of tempoKeys())if(k in s&&k!=='baseSlot'&&k!=='ssName')S[k]=s[k];
  /* saved before 0.9: My themes every hour means the preset's own themes, in order; one weight for every hand */
  if(s.ssRotate==='mine'){S.ssRotate='all';if(!('ssCSet' in s))S.ssCSet=(p.themes||[]).map(T=>T.name).join('|');}
  if(!('ssDialWM' in s)&&'ssDialHand' in s){S.ssDialWM=S.ssDialWS=s.ssDialHand;}
  S.ssName=typeof p.exportName==='string'?p.exportName:'';
  const core=id(src.baseSlot);if(core)S.baseSlot=core;
  for(const k of PART_KEYS){const v=S[k];if(v&&v!=='base'&&v!=='shuffle')S[k]=id(v)||'base';}}
function openPreset(p,quiet){
  const m=resolveFonts(p);applyPresetSettings(p,m);
  if(Array.isArray(p.on)){const id=x=>m.map[x]||null,on=new Set(p.on.map(id).filter(Boolean)),pool=new Set((p.pool||[]).map(id).filter(Boolean));
    for(const st of styles){if(on.has(st.id))st.off=false;if(st.id!==S.baseSlot)st.swap=pool.has(st.id);}
    for(const x of p.on){const n=id(x);if(!n)continue;const v=(p.tracks||{})[x];if(v)TRACKS[n]=v;else delete TRACKS[n];}
    LS.set('tracks',TRACKS);}
  /* the preset's own themes come too (renamed if a different theme here has the name), and its day of themes follows */
  for(const [k,f] of [['clock','themes'],['words','themesW'],['dial','themesD'],['type','themesT']]){const list=(p[f]||[]).filter(T=>T&&T.name&&(k!=='clock'||Array.isArray(T.p)));remapSet(k,importThemes(k,list));SEL[k]=null;LOOK[k]=null;}
  sortFonts();saveStyles();applyStyles();themesRefresh();ssDirty=true;autosave();refreshAll();
  if(!quiet)toast(m.missing.length?`Opened ${p.name} – load ${m.missing.join(', ')} in Fonts to see it as saved.`:`Opened ${p.name}`);
  return m;}
let PRESETS=Array.isArray(LS.get('presets'))?LS.get('presets'):[],ACTIVE=LS.get('active')||null,BUILTIN_P=[],presetVer=0,BACK=LS.get('back')||null;
/* BACK: what was on screen, unsaved, before a preset was opened over it – kept until it's brought back or replaced */
const keepBack=b=>{BACK=b;LS.set('back',b);};
const savePresets=()=>{LS.set('presets',PRESETS);presetVer++;};
const setActive=(id,builtin)=>{ACTIVE=id?{id,builtin:!!builtin,sig:sigNow()}:null;LS.set('active',ACTIVE);};
const activePreset=()=>ACTIVE&&(ACTIVE.builtin?BUILTIN_P.find(p=>p.id===ACTIVE.id):PRESETS.find(p=>p.id===ACTIVE.id))||null;
const changedSince=()=>!ACTIVE||ACTIVE.sig!==sigNow();
const uniqueName=n=>{n=n||'Screen saver';if(!PRESETS.some(p=>p.name===n))return n;const m=/^(.*\S) (\d+)$/.exec(n),root=m?m[1]:n;let i=m?+m[2]+1:2;while(PRESETS.some(p=>p.name===root+' '+i))i++;return root+' '+i;};
const presetId=()=>'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
fetch('presets.json').then(r=>r.ok?r.json():null).then(j=>{BUILTIN_P=((j&&j.presets)||[]).map((p,i)=>Object.assign({},p,{id:'b'+i}));presetVer++;refreshAll();}).catch(()=>{});
/* open one, keeping what was on screen if it wasn't saved */
function openFromList(p,builtin){
  if(changedSince())keepBack({snap:snapshot(),active:ACTIVE,name:p.name});
  openPreset(p);setActive(p.id,builtin);presetVer++;refreshAll();}
function saveNew(name){
  const n=(name||'').trim()||uniqueName(exportName()),ex=PRESETS.find(p=>p.name===n);
  const p=Object.assign(snapshot(n),{id:ex?ex.id:presetId(),saved:Date.now()});
  if(ex)PRESETS[PRESETS.indexOf(ex)]=p;else PRESETS.push(p);
  savePresets();setActive(p.id);refreshAll();toast(ex?`Saved over ${n}`:`Saved ${n}`);return p;}
function saveChanges(){const a=activePreset();if(!a||ACTIVE.builtin)return;
  const p=Object.assign(snapshot(a.name),{id:a.id,saved:Date.now()});PRESETS[PRESETS.indexOf(a)]=p;savePresets();setActive(p.id);refreshAll();toast(`Saved ${a.name}`);}
function deletePreset(p){PRESETS=PRESETS.filter(x=>x!==p);savePresets();if(ACTIVE&&ACTIVE.id===p.id)setActive(null);refreshAll();toast(`Deleted ${p.name}`);}
const pslug=n=>String(n||'tempo').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'tempo';
function downloadPreset(p){const o=Object.assign({},p);delete o.id;saveFile(pslug(p.name)+'-tempo-preset.json',new Blob([JSON.stringify({tempo:'preset',v:1,preset:o},null,1)],{type:'application/json'}));}
function downloadAll(){const d=new Date(),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  saveFile('tempo-presets-'+day+'.json',new Blob([JSON.stringify({tempo:'presets',v:1,saved:d.toISOString(),presets:PRESETS,themes:getThemes(),themesW:mineOf('words'),themesD:mineOf('dial'),themesT:mineOf('type')},null,1)],{type:'application/json'}));}
/* ---- reading a downloaded screen saver back: its settings, from its config ---- */
const W_MAP=[['lead','ssWLead'],['h24','ssWH24'],['time','ssWTime'],['secs','ssWSecs'],['weekday','ssWWeekday'],['daynum','ssWDayNum'],['month','ssWMonth'],['year','ssWYear'],['stop','ssWStop'],
  ['case','ssWCase'],['zero','ssWZero'],['sep','ssWSep'],['layout','ssWLayout'],['fit','ssWFit'],['space','ssWSpace'],['optical','ssWOptical'],['dateCol','ssWDateCol'],['hi','ssWHi'],['size','ssWSize'],
  ['leading','ssWLeading'],['tracking','ssWTracking'],['measure','ssWMeasure'],['align','ssWAlign'],['valign','ssWVAlign'],['margin','ssWMargin'],['change','ssWChange'],['by','ssWBy'],['feel','ssWFeel'],
  ['len','ssWLen'],['glide','ssWGlide'],['bg','ssWBg'],['ink','ssWInk'],['soft','ssWSoft'],['rotate','ssWRotate']];
const WN_MAP=[['time','ssWNumTime'],['sec','ssWNumSec'],['date','ssWNumDate'],['year','ssWNumYear']];
const MX_MAP=[['mode','MMode'],['when','MWhen'],['each','MEach'],['match','MMatch'],['order','MOrder'],['amount','MAmount']];
const MW_PARTS=[['lead','ssMLead'],['time','ssMTime'],['sec','ssMSec'],['weekday','ssMWeekday'],['day','ssMDay'],['month','ssMMonth'],['year','ssMYear']];
const MN_PARTS=[['h1','ssNH1'],['h2','ssNH2'],['m1','ssNM1'],['m2','ssNM2'],['s1','ssNS1'],['s2','ssNS2'],['line2','ssNLine2']];
const DL_MAP=[['face','ssDialFace'],['detail','ssDialDetail'],['hole','ssDialHole'],['tick','ssDialTick'],['ring','ssDialRing'],['line','ssDialLine'],['key','ssDialKey'],['hand','ssDialHand'],
  ['secs','ssDialSecs'],['secMove','ssDialSecMove'],['minMove','ssDialMinMove'],['feel','ssDialFeel'],['len','ssDialLen'],['trail','ssDialTrail'],['tails','ssDialTails'],['centre','ssDialCentre'],
  ['size','ssDialSize'],['rotate','ssDialRotate'],['every','ssDialEvery'],['fill','ssDialFill'],['fillTurn','ssDialFillTurn'],['fillR','ssDialFillR'],['fillA','ssDialFillA'],['fillBlend','ssDialFillBlend'],
  ['fillOver','ssDialFillOver'],['fillStyle','ssDialFillStyle'],['fillLayer','ssDialFillLayer'],['cap','ssDialCap'],['tip','ssDialTip'],['tipOn','ssDialTipOn'],['tipSize','ssDialTipSize'],['weight','ssDialWeight'],['centreSize','ssDialCentreSize'],['handA','ssDialHandA'],['blend','ssDialBlend']];
const T_MAP=[['h24','ssTH24'],['secs','ssTSecs'],['zero','ssTZero'],['case','ssTCase'],['leading','ssTLeading'],['hole','ssTHole'],['split','ssTSplit'],['feel','ssTFeel'],['len','ssTLen'],['far','ssTFar'],
  ['bg','ssTBg'],['ink','ssTInk'],['soft','ssTSoft'],['rotate','ssTRotate'],['every','ssTEvery'],['tracking','ssTTracking'],['space','ssTSpace']];
function presetFromConfig(cfg,name){
  const s={ssVer:5},b=cfg.base||{},put=(k,v)=>{if(v!==undefined&&v!==null)s[k]=v;};
  for(const k in b)if((/^ss[A-Z0-9]/.test(k)&&!/^ssW|^ss[MN][A-Z]|^ssDial|^ssName$/.test(k))||k==='baseSlot')s[k]=b[k];
  s.ssShow=cfg.show==='words'||cfg.show==='dial'?cfg.show:'clock';put('ssDrift',cfg.drift);
  const c=cfg.clock||{},N=c.mixed;
  if(N){MX_MAP.forEach(([a,k])=>put('ssN'+k.slice(1),N[a]));MN_PARTS.forEach(([a,k])=>put(k,(N.parts||{})[a]));}
  const w=cfg.words;
  if(w){W_MAP.forEach(([a,k])=>put(k,w[a]));
    if(w.nums)WN_MAP.forEach(([a,k])=>put(k,w.nums[a]));else if(w.num)WN_MAP.forEach(([,k])=>put(k,w.num));
    const M=w.mixed;if(M){MX_MAP.forEach(([a,k])=>put('ss'+k,M[a]));put('ssMLittle',M.little);MW_PARTS.forEach(([a,k])=>put(k,(M.parts||{})[a]));}}
  const d=cfg.dial;
  if(d){DL_MAP.forEach(([a,k])=>put(k,d[a]));const col=d.colours||{};D_COLS.forEach(([k,t])=>put(k,col[t]));
    if(Array.isArray(d.hw)){put('ssDialHand',d.hw[0]);put('ssDialWM',d.hw[1]);put('ssDialWS',d.hw[2]);}else if(d.hand!=null){put('ssDialWM',d.hand);put('ssDialWS',d.hand);}}
  const t=cfg.type;if(t){T_MAP.forEach(([a,k])=>put(k,t[a]));const P=t.parts||{};[['time','ssTTime'],['day','ssTDay'],['date','ssTDate'],['month','ssTMonth'],['year','ssTYear']].forEach(([a,k])=>put(k,P[a]));
    const RP=t.rparts||{};[['day','ssTRDay'],['date','ssTRDate'],['month','ssTRMonth'],['year','ssTRYear']].forEach(([a,k])=>put(k,RP[a]));
    if(t.size!=null)put(cfg.show==='rings'?'ssTRSize':'ssTCSize',t.size);put('ssTFont',t.font);if(cfg.show==='columns'||cfg.show==='rings')s.ssShow=cfg.show;}
  /* the time's colours, and its themes through the day (0.9: read back from older downloads too, which carried them only in their colour block) */
  const co=cfg.colours||{};put('ssColBy',co.by);put('ssBg',co.bg);if(Array.isArray(co.p))['ssP1','ssP2','ssP3','ssP4'].forEach((k,i)=>put(k,co.p[i]));put('ssCEvery',co.every);
  const named=(list,pre)=>(Array.isArray(list)?list:[]).filter(Boolean).map((T,i)=>Object.assign({},T,{name:T.name||pre+' '+(i+1)}));
  const themes=named(cfg.palettes,'Theme'),wt=w&&w.rotate?named(w.themes,'Theme'):[],dt=d&&d.rotate?named(d.themes,'Theme'):[],tt=t&&t.rotate?named(t.themes,'Theme'):[];
  s.ssRotate=co.cycle&&themes.length?'all':'off';s.ssCSet=co.cycle?themes.map(T=>T.name).join('|'):'';
  if(w)s.ssWSet=wt.map(T=>T.name).join('|');if(d)s.ssDialSet=dt.map(T=>T.name).join('|');if(t)s.ssTSet=tt.map(T=>T.name).join('|');
  const fonts={},list=cfg.fonts||[];list.forEach(f=>{fonts[f.id]={name:f.name,family:f.family||'',file:''};});
  return{tempo:1,name:name||'Screen saver',exportName:'',settings:s,fonts,on:list.map(f=>f.id),pool:list.filter(f=>f.swap!==false&&f.id!==s.baseSlot).map(f=>f.id),tracks:Object.assign({},cfg.tracks||{}),
    themes:co.cycle?themes:[],themesW:wt,themesD:dt,themesT:tt};}
/* the page inside a Windows .scr: [host][name][page][24-byte footer: RBTOSCR1, name length, page length, colour, 0] */
function pageFromScr(u){const n=u.length;if(n<24)return null;const dv=new DataView(u.buffer,u.byteOffset,u.byteLength);
  if(new TextDecoder().decode(u.subarray(n-24,n-16))!=='RBTOSCR1')return null;const hl=dv.getUint32(n-12,true);return new TextDecoder().decode(u.subarray(n-24-hl,n-24));}
function presetFromPage(html){
  const m=/window\.__(?:TEMPO|RUBATO)__=(\{[\s\S]*?\});<\/script>/.exec(html);if(!m)return null;
  const cfg=JSON.parse(m[1]),t=/<title>([\s\S]*?) – screensaver<\/title>/.exec(html),title=t?t[1].trim():'';
  if(cfg.edit&&cfg.edit.settings)return Object.assign({},cfg.edit,{name:cfg.edit.name||title||'Screen saver'});
  return presetFromConfig(cfg,title);}
/* Open a file: a downloaded screen saver (HTML, Mac or Windows zip, .scr), one preset, or a backup of them all */
async function openPresetFile(f){
  let got=[];
  try{
    if(/\.json$/i.test(f.name)){const j=JSON.parse(await f.text());
      if(Array.isArray(j.presets))got=j.presets;else if(j.preset)got=[j.preset];else if(j.settings)got=[j];
      for(const f of ['themes','themesW','themesD','themesT'])if(Array.isArray(j[f])&&j[f].length)got.forEach(p=>{p[f]=p[f]&&p[f].length?p[f]:j[f];});}
    else if(/\.html?$/i.test(f.name)){const p=presetFromPage(await f.text());if(p)got=[p];}
    else if(/\.scr$/i.test(f.name)){const h=pageFromScr(new Uint8Array(await f.arrayBuffer()));const p=h&&presetFromPage(h);if(p)got=[p];}
    else if(/\.zip$/i.test(f.name)){const ents=await unzip(await f.arrayBuffer());
      for(const z of ents){let h=null;if(/Contents\/Resources\/index\.html$/.test(z.name))h=new TextDecoder().decode(z.data);else if(/\.scr$/i.test(z.name))h=pageFromScr(z.data);
        const p=h&&presetFromPage(h);if(p){got=[p];break;}}}
  }catch(e){console.error(e);}
  got=got.filter(p=>p&&p.settings);
  if(!got.length){toast(`${f.name} isn’t a Tempo screen saver or preset file.`);return;}
  const BACKUP=changedSince()?{snap:snapshot(),active:ACTIVE}:null;let last=null,added=0;
  for(const g of got){const same=PRESETS.find(p=>sigOf(p)===sigOf(g));if(same){last=same;continue;}/* already here: open that one */
    const p=Object.assign({},g,{id:g.id&&!PRESETS.some(x=>x.id===g.id)?g.id:presetId(),name:uniqueName(g.name),saved:g.saved||Date.now()});PRESETS.push(p);last=p;added++;}
  savePresets();
  if(got.length===1){const p=last||PRESETS.find(x=>x.id===got[0].id);if(BACKUP)keepBack(Object.assign(BACKUP,{name:p.name}));openPreset(p);setActive(p.id);presetVer++;refreshAll();}
  else{refreshAll();toast(added?`Added ${added} preset${added>1?'s':''} from ${f.name}`:'Those presets are already here.');}}
/* Dropped on the page: Tempo's own downloads and preset files open as presets; anything else goes to Fonts */
function appDropFiles(fs){const mine=f=>/\.(html?|json|scr)$/i.test(f.name)||/screen saver for (mac|windows)\.zip$/i.test(f.name);
  const take=fs.filter(mine);(async()=>{for(const f of take)await openPresetFile(f);})();return fs.filter(f=>!mine(f));}
/* live tiles: each preset drawn as it would play, at this minute */
function configFor(p){const m=resolveFonts(p),keep=S;let cfg;
  try{S=Object.assign(fresh(),keep);applyPresetSettings(p,m);cfg=saverConfig();}finally{S=keep;}
  const core=m.map[(p.settings||{}).baseSlot];if(core)cfg.base.baseSlot=core;
  if(Array.isArray(p.on)){const id=x=>m.map[x]||null;cfg.__pool=new Set((p.pool||[]).map(id).filter(Boolean));}
  return cfg;}
function drawTile(c,p){
  const W=384,H=240;c.width=W;c.height=H;const x=c.getContext('2d');
  try{const cfg=configFor(p),e=createEngine(),pool=cfg.__pool;delete cfg.__pool;cfg.drift=0;
    if(cfg.dial){for(const k of ['line','key','hand'])cfg.dial[k]*=2.5;if(cfg.dial.hw)cfg.dial.hw=cfg.dial.hw.map(v=>v*2.5);}/* hairlines would vanish at this size */
    e.setFaces(eng.faceList().map(f=>pool?Object.assign({},f,{swap:pool.has(f.id)}):f));createSaver(e,cfg).frame(x,W,H,performance.now(),0);}
  catch(err){console.error(err);x.fillStyle='#888';x.fillRect(0,0,W,H);}}
/* Exports carry their own preset – every setting, not only those for what it shows – so they open again exactly and nothing is lost */
function editBlock(){const a=activePreset();return snapshot(a?a.name:'');}
{const b=card('ss-presets','Presets',null,'saver');
  const status=el('p','p-status');addCustom(b,null,status);
  const actRow=el('div','ctl btn-row'),upd=el('button','pill small primary','Save changes'),dlb=el('button','pill small','Download'),del=el('button','pill small','Delete');actRow.append(upd,dlb,del);addCustom(b,null,actRow);
  const backRow=el('div','ctl btn-row'),back=el('button','pill small','Back to what you had');backRow.append(back);addCustom(b,null,backRow);
  const yh=el('div','sub-head','Yours'),grid=el('div','thumbs');grid.setAttribute('role','group');grid.setAttribute('aria-label','Your presets');addCustom(b,null,yh);addCustom(b,null,grid);
  const empty=addHint(b,'Nothing saved yet. Save what’s on screen to come back to it – your twelve start here.');
  const bh=el('div','sub-head','Built in'),bgrid=el('div','thumbs');bgrid.setAttribute('role','group');bgrid.setAttribute('aria-label','Built-in presets');addCustom(b,null,bh);addCustom(b,null,bgrid);
  const row=el('div','ctl btn-row'),nm=el('input');nm.type='text';nm.placeholder='Name';nm.setAttribute('aria-label','Preset name');
  const sv=el('button','pill small primary','Save as new');row.append(nm,sv);addCustom(b,null,row);
  const fr=el('div','ctl btn-row'),op=el('button','pill small','Open a file'),all=el('button','pill small','Download all');fr.append(op,all);addCustom(b,null,fr);
  addHint(b,'Kept in this browser – Download all now and then for a copy. Open a file brings back a screen saver you downloaded (the HTML, Mac or Windows file) or a preset file, ready to edit.');
  sv.onclick=()=>{saveNew(nm.value);nm.value='';};nm.onkeydown=e=>{if(e.key==='Enter')sv.onclick();};
  upd.onclick=saveChanges;dlb.onclick=()=>{const a=activePreset();if(a)downloadPreset(a);};
  let armed=0,armedFor=null;const disarm=()=>{armed=0;armedFor=null;del.textContent='Delete';};
  del.onclick=()=>{const a=activePreset();if(!a||ACTIVE.builtin)return;if(armedFor===a.id&&Date.now()-armed<4000){disarm();deletePreset(a);return;}
    armed=Date.now();armedFor=a.id;del.textContent='Delete – sure?';setTimeout(()=>{if(Date.now()-armed>=3990)disarm();},4000);};
  back.onclick=()=>{if(!BACK)return;const B=BACK;keepBack(null);openPreset(B.snap,true);ACTIVE=B.active;LS.set('active',ACTIVE);presetVer++;refreshAll();toast('Back to what you had');};
  op.onclick=()=>$('#presetfile').click();
  $('#presetfile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(f)await openPresetFile(f);};
  all.onclick=downloadAll;
  let drawn='';
  const tiles=(host,list,builtin)=>{host.textContent='';list.forEach(p=>{const t=el('button','thumb');t.type='button';t.setAttribute('aria-label','Open '+p.name);t.dataset.id=p.id;
    const c=el('canvas');t.append(c,el('span',null,p.name));t.onclick=()=>openFromList(p,builtin);host.append(t);});};
  controls.push({d:{},w:b,update(){
    const key=presetVer+'|'+faceVer+'|'+PRESETS.length+'|'+BUILTIN_P.length;
    if(key!==drawn){drawn=key;lastSt='';tiles(grid,PRESETS,false);tiles(bgrid,BUILTIN_P,true);paintTiles();}
    presetStatus();}});
  setInterval(()=>{if(!document.hidden)presetStatus();},700);
  let lastSt='';
  function presetStatus(){
    const a=activePreset(),ch=a?changedSince():true,st=[a&&a.id,ch,!!BACK,PRESETS.length,BUILTIN_P.length].join('|');if(st===lastSt&&a)return;lastSt=st;
    if(!a||a.id!==armedFor)disarm();
    [...grid.children,...bgrid.children].forEach(t=>t.setAttribute('aria-pressed',!!(a&&t.dataset.id===a.id)));
    status.textContent='';$('#pcapName').textContent=a?a.name:'';
    if(a){status.append('Open: ',el('b',null,a.name),' – '+(ACTIVE.builtin?(ch?'changed – save as new to keep it':'built in'):(ch?'changed since saved':'saved')));}
    else status.textContent=PRESETS.length?'What’s on screen isn’t saved yet.':'';
    actRow.hidden=!a||!!ACTIVE.builtin;upd.disabled=!ch;upd.hidden=!a||!ch;
    backRow.hidden=!BACK;if(BACK)back.textContent='Back to what you had before '+BACK.name;
    grid.hidden=yh.hidden=!PRESETS.length;empty.w.hidden=!!PRESETS.length;bh.hidden=bgrid.hidden=!BUILTIN_P.length;
  }
  /* redraw the tiles each minute, a few at a time so the panel stays quick */
  let queue=[];
  function paintTiles(){queue=[...grid.children,...bgrid.children];step();}
  function step(){const t=queue.shift();if(!t)return;const p=PRESETS.find(x=>x.id===t.dataset.id)||BUILTIN_P.find(x=>x.id===t.dataset.id);if(p)drawTile(t.querySelector('canvas'),p);setTimeout(step,0);}
  setInterval(()=>{if(!document.hidden&&grid.offsetParent)paintTiles();},60000);
  cardToSheet(b,'presets');/* Presets: bottom right, opening upward */
}
/* What the screen saver is called: the name typed under Export, else the preset
   open, else Tempo, Tempo Words or Tempo Dial. Never a font's name – some fonts'
   licences (Timeless's) don't allow naming a product after them. */
function defaultName(){const a=activePreset();if(a)return a.name;return dl(S)?'Tempo Dial':wd(S)?'Tempo Words':cols(S)?'Tempo Columns':rgs(S)?'Tempo Rings':'Tempo';}
const exportName=()=>(S.ssName||'').trim()||defaultName();
function saverConfig(preview){
  /* the words and mixing settings travel in their own blocks below */
  const noW=o=>{for(const k in o)if(/^ssW|^ss[MN][A-Z]|^ssDial|^ssT[A-Z]|^ssC(Set|Every)$/.test(k)||k==='ssName')delete o[k];return o;};
  const base=noW(Object.assign(fresh(),sanitise(S)));base.transparent=false;
  if(anyLoaded())base.baseSlot=baseSlot();/* the core font, by id */
  const pals=setThemes('clock'),force=preview?previewForce():null;
  return{show:wd(S)?'words':dl(S)?'dial':ty(S)?S.ssShow:'clock',...(force?{force}:{}),
    clock:{h24:S.ssH24,sep:SEPS[S.ssSep]||',',secs:S.ssSecs,zero:S.ssZero,ampm:true,line2:S.ssLine2,caps:S.ssCaps,
      change:S.ssChange,feel:S.ssFeel,len:S.ssLen,align:S.ssAlign,valign:S.ssVAlign,size:S.ssSize,margin:S.ssMargin,tabular:S.ssTabular,tracking:S.ssTracking,leading:S.ssLeading,move:S.ssMove,pulse:S.ssPulse,alt:S.ssAlt,altRate:S.ssAltRate,
      mixed:{mode:S.ssNMode,parts:{h1:S.ssNH1,h2:S.ssNH2,m1:S.ssNM1,m2:S.ssNM2,s1:S.ssNS1,s2:S.ssNS2,line2:S.ssNLine2},when:S.ssNWhen,each:S.ssNEach,match:S.ssNMatch,order:S.ssNOrder,amount:S.ssNAmount}},
    colours:{by:S.ssColBy,bg:S.ssBg,p:[S.ssP1,S.ssP2,S.ssP3,S.ssP4],cycle:S.ssRotate!=='off'&&pals.length>0,every:everyOf('clock')},palettes:pals,
    base,drift:S.ssDrift,tracks:tracksNow(),
    /* only when showing the dial */
    ...(dl(S)?{dial:{face:S.ssDialFace,detail:S.ssDialDetail,hole:S.ssDialHole,tick:S.ssDialTick,ring:S.ssDialRing,line:S.ssDialLine,key:S.ssDialKey,hand:S.ssDialHand,
      secs:S.ssDialSecs,secMove:S.ssDialSecMove,minMove:S.ssDialMinMove,feel:S.ssDialFeel,len:S.ssDialLen,trail:S.ssDialTrail,tails:S.ssDialTails,centre:S.ssDialCentre,size:S.ssDialSize,
      hw:[S.ssDialHand,S.ssDialWM,S.ssDialWS],fill:S.ssDialFill,fillTurn:S.ssDialFillTurn,fillR:S.ssDialFillR,fillA:S.ssDialFillA,fillBlend:S.ssDialFillBlend,fillOver:S.ssDialFillOver,fillStyle:S.ssDialFillStyle,fillLayer:S.ssDialFillLayer,
      cap:S.ssDialCap,tip:S.ssDialTip,tipOn:S.ssDialTipOn,tipSize:S.ssDialTipSize,weight:S.ssDialWeight,centreSize:S.ssDialCentreSize,handA:S.ssDialHandA,blend:S.ssDialBlend,
      colours:Object.fromEntries(D_COLS.map(([k,t])=>[t,S[k]])),rotate:S.ssDialRotate,themes:setThemes('dial'),every:everyOf('dial')}}:{}),
    /* only for Columns and Rings */
    ...(ty(S)?{type:{font:typeFont(),h24:S.ssTH24,secs:S.ssTSecs,zero:S.ssTZero,case:S.ssTCase,parts:{time:S.ssTTime,secs:S.ssTSecs,day:S.ssTDay,date:S.ssTDate,month:S.ssTMonth,year:S.ssTYear},
      size:cols(S)?S.ssTCSize:S.ssTRSize,leading:S.ssTLeading,hole:S.ssTHole,split:S.ssTSplit,feel:S.ssTFeel,len:S.ssTLen,far:S.ssTFar,tracking:S.ssTTracking,space:S.ssTSpace,
      rparts:{day:S.ssTRDay,date:S.ssTRDate,month:S.ssTRMonth,year:S.ssTRYear},
      bg:S.ssTBg,ink:S.ssTInk,soft:S.ssTSoft,rotate:S.ssTRotate,themes:setThemes('type'),every:everyOf('type')}}:{}),
    /* only when showing words */
    ...(wd(S)?{words:{lead:S.ssWLead,h24:S.ssWH24,time:S.ssWTime,secs:S.ssWSecs,weekday:S.ssWWeekday,daynum:S.ssWDayNum,month:S.ssWMonth,year:S.ssWYear,
      stop:S.ssWStop,case:S.ssWCase,nums:{time:S.ssWNumTime,sec:S.ssWNumSec,date:S.ssWNumDate,year:S.ssWNumYear},zero:S.ssWZero,sep:S.ssWSep,layout:S.ssWLayout,fit:S.ssWFit,space:S.ssWSpace,optical:S.ssWOptical,dateCol:S.ssWDateCol,
      hi:S.ssWHi,size:S.ssWSize,leading:S.ssWLeading,tracking:S.ssWTracking,measure:S.ssWMeasure,align:S.ssWAlign,valign:S.ssWVAlign,margin:S.ssWMargin,
      change:S.ssWChange,by:S.ssWBy,feel:S.ssWFeel,len:S.ssWLen,glide:S.ssWGlide,bg:S.ssWBg,ink:S.ssWInk,soft:S.ssWSoft,rotate:S.ssWRotate,themes:setThemes('words').map(T=>Object.assign({date:T.soft},T)),every:everyOf('words'),
      mixed:{mode:S.ssMMode,parts:{lead:S.ssMLead,time:S.ssMTime,sec:S.ssMSec,weekday:S.ssMWeekday,day:S.ssMDay,month:S.ssMMonth,year:S.ssMYear},
        when:S.ssMWhen,each:S.ssMEach,little:S.ssMLittle,match:S.ssMMatch,order:S.ssMOrder,amount:S.ssMAmount}}}:{})};
}

function saverChars(cfg){
  const chars=new Set(' 0123456789,:.apmAPM');
  const add=s=>{for(const ch of Array.from(s||''))if(ch!=='\n'){chars.add(ch);chars.add(ch.toUpperCase());chars.add(ch.toLowerCase());}};
  for(let i=0;i<7;i++)add(new Date(2026,0,5+i).toLocaleDateString('en-GB',{weekday:'long'}));
  for(let m=0;m<12;m++)add(new Date(2026,m,1).toLocaleDateString('en-GB',{month:'long'}));
  if(cfg.words||cfg.type)add(saverVocab());
  return chars;
}

function bakeFonts(chars){
  const out=[];
  for(const {id,face:f,swap} of eng.faceList()){if(!f||f.fallback)continue;
    const d={id,swap,name:f.name,family:f.family,upm:f.upm,asc:f.asc,desc:f.desc,cap:f.cap,wc:f.weightClass,cmap:{},alts:{},glyphs:{},kern:{}};const ids=new Set();
    for(const ch of chars){const g=f.base(ch);if(!g)continue;d.cmap[ch]=g;ids.add(g);const al=f.alts(ch);if(al.length){d.alts[g]=al.slice();al.forEach(a=>ids.add(a));}}
    for(const g of ids)d.glyphs[g]={d:f.pathD(g),a:f.adv(g),n:f.glyphName(g),b:f.bbox?f.bbox(g):null};
    const arr=[...ids];for(const x of arr)for(const y of arr){const k=f.kern(x,y);if(k)d.kern[x+','+y]=k;}
    out.push(d);}
  return out;
}
function saverHTML(){
  const cfg=saverConfig();
  cfg.fonts=cfg.dial?[]:bakeFonts(saverChars(cfg));/* a dial has no type */
  cfg.edit=editBlock();/* so the file opens again, ready to edit */
  const title=exportName().replace(/[<&]/g,'');
  const json=JSON.stringify(cfg).replace(/</g,'\\u003c');
  const bg=saverBg(cfg);
  const html=`<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title} – screensaver</title>
${anyLoaded()||cfg.dial?'':'<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;800&display=swap" rel="stylesheet">'}
<style>html,body{margin:0;height:100%;overflow:hidden;background:${bg};cursor:none}canvas{display:block;width:100vw;height:100vh}</style>
</head><body><canvas id="c"></canvas>
\x3cscript>${$('#tempo-engine').textContent}\x3c/script>
\x3cscript>${$('#tempo-saver').textContent}\x3c/script>
\x3cscript>window.__TEMPO__=${json};\x3c/script>
\x3cscript>${SS_BOOT}\x3c/script>
</body></html>`;
  return html;
}
async function exportScreensaver(){
  const base=exportName().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'tempo';
  await saveFile(base+'-screensaver.html',new Blob([saverHTML()],{type:'text/html'}));}

function saverThumbs(){
  const tEng=createEngine();tEng.setFaces(eng.faceList());
  const big=document.createElement('canvas');big.width=360;big.height=232;const bx=big.getContext('2d');
  createSaver(tEng,saverConfig()).frame(bx,360,232,performance.now(),0);
  const small=document.createElement('canvas');small.width=180;small.height=116;const sx=small.getContext('2d');sx.imageSmoothingQuality='high';sx.drawImage(big,0,0,180,116);
  return[{w:180,h:116,scale:1,rgba:sx.getImageData(0,0,180,116).data},{w:360,h:232,scale:2,rgba:bx.getImageData(0,0,360,232).data}];
}
function macReadme(name){return `${name} screen saver for Mac
=====================================

macOS blocks screen savers that don't come from the App Store, so the first
install takes a few extra clicks. You only do this once.

INSTALL
1. Unzip the download, then double-click "${name}.saver".

2. macOS says it couldn't verify "${name}.saver". Click Done
   (not Move to Bin).

3. Open System Settings > Privacy & Security. Scroll down to the Security
   section, where you'll see that "${name}.saver" was blocked.
   Click Open Anyway, then confirm with your password or Touch ID.
   (The button only shows for about an hour after step 2. If it has gone,
   double-click the .saver again and repeat.)

4. Double-click "${name}.saver" again. This time choose Open Anyway.

5. When asked, choose "Install for all users of this computer" and enter
   your password. This matters - see below.

6. In System Settings > Screen Saver, choose ${name}.

WHY "ALL USERS"?
The screen saver looks for its page in /Library/Screen Savers. If you
installed it for your user only, it will show a blank screen. To fix it,
open Finder > Go > Go to Folder, enter ~/Library/Screen Savers, and drag
"${name}.saver" into /Library/Screen Savers (enter your password).

PREFER TERMINAL?
Instead of steps 2-4: open Terminal, type  xattr -cr  followed by a space,
drag "${name}.saver" into the window and press Return. Then double-click
the .saver and carry on from step 5.

TO REMOVE IT
Delete "${name}.saver" from /Library/Screen Savers.

Made with Tempo by Ensemble. The bundle contains WebViewScreenSaver by
Alastair Tse (Apache License 2.0), renamed and re-signed for this screen
saver; the licence is inside the bundle. It isn't notarised by Apple, which
is why macOS asks.
`;}
async function exportMac(){
  if(!window.SaverPack||!window.SAVER_ASSETS){toast("The Mac packager didn't load. Reload and try again.");return;}
  if(!window.crypto||!crypto.subtle){toast('This browser can\u2019t build the Mac file. Try Chrome, Safari or Firefox.');return;}
  const btn=window.macBtn;btn.disabled=true;const label=btn.textContent;btn.textContent='Building\u2026';
  try{
    const name=exportName().replace(/[^A-Za-z0-9 \-]/g,'').trim()||'Tempo';
    const res=await SaverPack.build(SAVER_ASSETS,{name,html:saverHTML(),thumbs:saverThumbs(),readme:macReadme(name)});
    await saveFile(name+' screen saver for Mac.zip',res.blob);
  }catch(e){console.error(e);toast('Couldn\u2019t build the Mac file: '+(e.message||e));}
  finally{btn.disabled=false;btn.textContent=label;ssDirty=true;}
}
function winReadme(name){return `${name} screen saver for Windows
=======================================

1. Before unzipping: right-click the zip > Properties > tick "Unblock" > OK.
   (This stops Windows treating the screen saver as unsafe. If there's no
   Unblock box, carry on.) Then right-click > Extract All.

2. Move "${name}.scr" somewhere it can stay, such as your Documents folder.
   Windows runs it from wherever it is when you install it.

3. Right-click "${name}.scr" and choose Install. Screen Saver Settings opens
   with ${name} selected. Set the wait time and click OK.
   If "Windows protected your PC" appears, click More info > Run anyway.

It plays full screen through Microsoft Edge, which is built into Windows 10
and 11. Your main display shows the clock; other displays show the
background colour. Move the mouse or press a key to wake.

To remove it, choose another screen saver in Screen Saver Settings, then
delete "${name}.scr".

Made with Tempo by Ensemble.
`.replace(/\n/g,'\r\n');}
function saverBg(cfg){const h=new Date().getHours(),at=(l,e)=>l[Math.floor(h/Math.max(1,e||1))%l.length].bg;
  if(cfg.dial){const d=cfg.dial;return d.rotate&&d.themes.length?at(d.themes,d.every):d.colours.bg;}if(cfg.words){const w=cfg.words;return w.rotate&&w.themes.length?at(w.themes,w.every):w.bg;}
  if(cfg.type){const t=cfg.type;return t.rotate&&t.themes.length?at(t.themes,t.every):t.bg;}return cfg.colours.cycle?at(cfg.palettes,cfg.colours.every):cfg.colours.bg;}
const safeName=()=>exportName().replace(/[^A-Za-z0-9 \-]/g,'').trim()||'Tempo';
/* the Windows .scr: the host, then the name, the page and a footer saying where each is */
function winScr(name,html){const enc=new TextEncoder(),nb=enc.encode(name),hb=enc.encode(html);
  const bin=atob(SAVER_WIN),tpl=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)tpl[i]=bin.charCodeAt(i);
  const hex=/^#?([0-9a-f]{6})$/i.exec(saverBg(saverConfig())),bg=hex?parseInt(hex[1],16):0;
  const ft=new Uint8Array(24),dv=new DataView(ft.buffer);ft.set(enc.encode('RBTOSCR1'));dv.setUint32(8,nb.length,true);dv.setUint32(12,hb.length,true);dv.setUint32(16,bg,true);
  const scr=new Uint8Array(tpl.length+nb.length+hb.length+24);scr.set(tpl,0);scr.set(nb,tpl.length);scr.set(hb,tpl.length+nb.length);scr.set(ft,tpl.length+nb.length+hb.length);return scr;}
/* 0.9: everything in one zip, named as the screen saver is: the Mac .saver, the
   Windows .scr, the HTML file and one read-me for all three */
function packReadme(){const y=new Date().getFullYear();return `Made with Tempo by ENSEMBLE
===========================

A clock screen saver. In this folder:

  Mac        a .saver file, for macOS 10.13 and later
  Windows    a .scr file, for Windows 10 and 11
  HTML       a web page that plays in any browser


MAC
---
macOS blocks screen savers that don't come from the App Store, so the first
install takes a few extra clicks. You only do this once.

1. Double-click the .saver file in the Mac folder.
2. macOS says it couldn't verify it. Click Done (not Move to Bin).
3. Open System Settings > Privacy & Security. Scroll down to Security, where
   the screen saver shows as blocked. Click Open Anyway and confirm with your
   password or Touch ID. (The button shows for about an hour. If it has gone,
   double-click the .saver again and repeat.)
4. Double-click the .saver again and choose Open Anyway.
5. When asked, choose "Install for all users of this computer". This matters:
   installed for one user only, the screen saver shows a blank screen.
6. In System Settings > Screen Saver, choose it from the list.

Prefer Terminal? Instead of steps 2-4, type  xattr -cr  and a space, drag the
.saver into the window, press Return, then double-click it and carry on from
step 5.

To remove it, delete it from /Library/Screen Savers.


WINDOWS
-------
1. Before unzipping: right-click the zip > Properties > tick "Unblock" > OK.
   (If there's no Unblock box, carry on.) Then right-click > Extract All.
2. Move the .scr file from the Windows folder somewhere it can stay, such as
   your Documents folder. Windows runs it from wherever it is.
3. Right-click the .scr and choose Install. Screen Saver Settings opens with
   it selected. Set the wait time and click OK.
   If "Windows protected your PC" appears, click More info > Run anyway.

It plays full screen through Microsoft Edge, built into Windows 10 and 11.
To remove it, choose another screen saver, then delete the .scr.


ANY COMPUTER
------------
Open the .html file in the HTML folder in any browser and click to go full
screen.


The Mac screen saver contains WebViewScreenSaver by Alastair Tse (Apache
License 2.0); the licence is inside the .saver.

weareensemble.co.uk
hello@weareensemble.co.uk
(c) ${y} Ensemble
`;}
async function exportAll(){
  if(!window.SaverPack||!window.SAVER_ASSETS||!window.SAVER_WIN){toast("The packagers didn't load. Reload and try again.");return;}
  if(!window.crypto||!crypto.subtle){toast('This browser can\u2019t build the Mac file. Try Chrome, Safari or Firefox.');return;}
  const btn=window.allBtn;btn.disabled=true;const label=btn.textContent;btn.textContent='Building\u2026';
  try{const name=safeName(),html=saverHTML(),enc=new TextEncoder();
    const mac=await SaverPack.build(SAVER_ASSETS,{name,html,thumbs:saverThumbs()});
    const top=name+'/',entries=[{path:top},{path:top+'Read me.txt',data:enc.encode(packReadme())},{path:top+'Mac/'},...mac.entries.map(e=>Object.assign({},e,{path:top+'Mac/'+e.path})),
      {path:top+'Windows/'},{path:top+'Windows/'+name+'.scr',data:winScr(name,html)},{path:top+'HTML/'},{path:top+'HTML/'+name+'.html',data:enc.encode(html)}];
    await saveFile(name+'.zip',SaverPack.zip(entries));}
  catch(e){console.error(e);toast('Couldn\u2019t build the download: '+(e.message||e));}
  finally{btn.disabled=false;btn.textContent=label;ssDirty=true;}}
async function exportWin(){
  if(!window.SaverPack||!window.SAVER_WIN){toast("The Windows packager didn't load. Reload and try again.");return;}
  const btn=window.winBtn;btn.disabled=true;const label=btn.textContent;btn.textContent='Building\u2026';
  try{
    const name=safeName(),enc=new TextEncoder(),scr=winScr(name,saverHTML());
    await saveFile(name+' screen saver for Windows.zip',SaverPack.zip([{path:name+'.scr',data:scr},{path:'Read me first.txt',data:enc.encode(winReadme(name))}]));
  }catch(e){console.error(e);toast('Couldn\u2019t build the Windows file: '+(e.message||e));}
  finally{btn.disabled=false;btn.textContent=label;ssDirty=true;}
}
const SS_BOOT=`(function(){
var C=window.__TEMPO__,eng=createEngine();
eng.setFaces((C.fonts||[]).map(function(d){return{id:d.id,face:eng.makeBaked(d),swap:d.swap!==false};}));
var cv=document.getElementById('c'),ctx=cv.getContext('2d'),sv=createSaver(eng,C),last=0;
function size(){var dpr=Math.min(window.devicePixelRatio||1,2),w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr),cap=2880/Math.max(w,h);if(cap<1){w=Math.round(w*cap);h=Math.round(h*cap);}if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}}
function tick(now){var dt=last?Math.min(100,now-last):0;last=now;size();sv.frame(ctx,cv.width,cv.height,now,dt);document.body.style.background=sv.bg();requestAnimationFrame(tick);}
requestAnimationFrame(tick);
document.addEventListener('click',function(){if(!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(function(){});});
})();`;

/* ---------------- preview ---------------- */
/* The preview takes the shape of the screen Tempo is open on. */
function screenShape(){const w=Math.round((window.screen&&screen.width)||0),h=Math.round((window.screen&&screen.height)||0);return w>99&&h>99?[w,h]:[1680,1050];}
function fitCanvas(){
  const [W,H]=screenShape();if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
  const v=$('#view'),cs=getComputedStyle(v);
  const aw=v.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=v.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
  const s=Math.max(.01,Math.min(aw/W,ah/H));cv.style.width=Math.floor(W*s)+'px';cv.style.height=Math.floor(H*s)+'px';
  cv.classList.toggle('checker',!!S.transparent);
  const dm=$('#dims');dm.textContent=W+' × '+H;dm.title='Preview at '+W+' × '+H+', the shape of this screen, showing your local time';dirty=true;
}
let pEng=null,saver=null,pFonts=-1;
function previewFrame(now,dt){
  if(!pEng)pEng=createEngine();
  if(pFonts!==faceVer){pEng.setFaces(eng.faceList());pFonts=faceVer;ssDirty=true;}
  if(!saver){saver=createSaver(pEng,saverConfig(true));ssDirty=false;}else if(ssDirty){saver.setConfig(saverConfig(true));ssDirty=false;}
  saver.frame(ctx,cv.width,cv.height,now,dt);
}
function tick(now){
  const dt=lastT?Math.min(100,now-lastT):0;lastT=now;
  const P=screenShape();if(cv.width!==P[0]||cv.height!==P[1])fitCanvas();try{previewFrame(now,dt);}catch(e){console.error(e);}dirty=true;requestAnimationFrame(tick);
}
function applyTab(){document.body.classList.add('saver');refreshVis();fitCanvas();}

/* ---------------- start ---------------- */
function appStart(){refreshFontCard();themesRefresh();applyTab();refreshAll();fitCanvas();}
