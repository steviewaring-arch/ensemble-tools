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
function tempoDefaults(){return{ssVer:4,
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
  ssDialBg:'#FFFFFF',ssDialMin:'#E7E7E7',ssDialHour:'#A9A9A9',ssDialQuarter:'#181818',ssDialHandH:'#EA2631',ssDialHandM:'#EA2631',ssDialHandS:'#EA2631',ssDialRotate:false};}
/* (called by shared/core.js before this file's consts exist, so it uses none) */
function loadSettings(){
  Object.assign(D,tempoDefaults());
  /* Tempo 0.1 and 0.2 read Rubato's storage for anything they didn't have yet.
     0.3 keeps to its own: whatever is still only under 'rubato:' is copied once. */
  try{if(!localStorage.getItem('tempo:own')){for(const k of ['settings','themes','theme','panelW'])if(localStorage.getItem('tempo:'+k)===null){const v=localStorage.getItem('rubato:'+k);if(v!==null)localStorage.setItem('tempo:'+k,v);}
    localStorage.setItem('tempo:own','1');}}catch(e){}
  const raw=LS.get('settings')||{},own=sanitise(raw),s=fresh();
  for(const k of tempoKeys())if(k in own)s[k]=own[k];
  if((raw.ssVer||0)<4)upgrade(s,raw);
  s.tab='saver';return s;
}
/* Settings saved by 0.1 and 0.2, made sense of in 0.3 */
function upgrade(s,raw){
  s.ssVer=4;
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
function refreshNotes(){$('#note').textContent=anyLoaded()||S.ssShow==='dial'?'':'Demo face. Load a font in Fonts.';}
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
const getThemes=()=>LS.get('themes')||[];
const SEPS={comma:',',colon:':',stop:'.',space:' '};
const PALETTES=[
  {name:'Noon',bg:'#D3D5D5',p:['#F4FD5F','#1E2023','#F4FD5F','#1E2023']},
  {name:'Night',bg:'#000000',p:['#FFFFFF','#8C8C8C','#FFFFFF','#4D4D4D']},
  {name:'Paper',bg:'#F2F2F2',p:['#000000','#FF3B1F','#000000','#8C8C8C']},
  {name:'Signal',bg:'#FF4F1F',p:['#000000','#FFFFFF','#FFF35C','#000000']},
];
const clk=s=>s.ssShow!=='words'&&s.ssShow!=='dial',wd=s=>s.ssShow==='words',dl=s=>s.ssShow==='dial';

/* ---------------- Fonts: the core font, the others mixed in ---------------- */
/* Sub-sections that fold inside a card. Open or shut is remembered. */
const FOLDS=Object.assign({},LS.get('folds')||{});
function fold(parent,id,title,show,shut){
  const box=el('div'),head=el('button','fold-head'),label=el('span',null,title),chev=el('span','chev'),body=el('div','fold-body');head.type='button';
  head.style.cssText='display:flex;width:100%;align-items:center;justify-content:space-between;background:none;border:0;border-top:1px solid var(--keyline);padding:14px 0 12px;margin:2px 0 10px;color:var(--muted);font-size:0.85rem;cursor:pointer;text-align:left';
  const open=FOLDS[id]!=null?FOLDS[id]:!shut,paint=o=>{body.hidden=!o;chev.textContent=o?'–':'+';head.setAttribute('aria-expanded',o);};paint(open);
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
const toggleEl=(label,on,fn)=>{const t=el('button','toggle');t.setAttribute('role','switch');t.setAttribute('aria-checked',on);t.setAttribute('aria-label',label);t.append(el('span','box'));t.style.cssText='width:auto;margin:0 0 0 6px;flex:none';t.onclick=fn;return t;};
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
  if(!on)row.style.opacity='.55';
  if(on&&multi){const c=el('button','pill small',isCore?'Core':'Use as core');c.setAttribute('aria-pressed',isCore);c.setAttribute('aria-label','Use as core – '+name);
    c.title='The core font carries the time and the sentence. The others mix in.';c.onclick=()=>{if(!isCore){S.baseSlot=st.id;sortFonts();saveStyles();set('baseSlot',st.id);applyStyles();}};top.insertBefore(c,rm);}
  top.insertBefore(toggleEl('On – '+name,on,()=>fontOnOff(st,!on)),rm);rm.remove();
  /* the details, folded under the name */
  const det=el('div');det.hidden=!openRows.has(st.id);det.style.paddingTop='8px';
  const chev=el('span','chev',det.hidden?'+':'\u2013');chev.style.cssText='flex:none;padding:0 6px;color:var(--muted);cursor:pointer';chev.onclick=()=>main.onclick();top.insertBefore(chev,main.nextSibling);main.style.cursor='pointer';main.setAttribute('role','button');main.setAttribute('aria-label','Details – '+name);main.tabIndex=0;
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
  const r=el('div','ctl btn-row');rm.textContent='Remove';r.append(rm);det.append(r);
  row.append(det);return det;
}
/* built-in fonts not loaded yet, after the rows */
function appFontList(list){
  for(const bf of BUILTIN){if(isLoaded(bf))continue;
    const row=el('div','slot'),top=el('div','slot-top'),main=el('div','slot-main');row.style.opacity='.55';
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
  sel.style.cssText='width:auto;max-width:64%;margin-left:auto;padding:7px 12px';w.append(lb);const q=qMark(d);if(q)w.append(q);w.append(sel);
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
  const b=fold(b0,'mixing','Mixing',()=>canMix());
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
  build(b,[{t:'seg',k:'ssShow',label:'Show',opts:[['clock','The time'],['words','In words'],['dial','As a dial']]}]);
  panel.insertBefore(b.parentElement,panel.firstChild);/* the first choice: the time in figures, in words, or as a dial */
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
    {t:'range',k:'ssDialHand',label:'Hands',min:.5,max:30,step:.1,fmt:v=>v.toFixed(1)},
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
    {t:'toggle',k:'ssDialTails',label:'Tails'},
    {t:'toggle',k:'ssDialCentre',label:'Centre dot'},
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
    {t:'range',k:'ssDrift',label:'Drift',min:0,max:1,step:.01,fmt:v=>v===0?'Off':pct(v)},
  ]);
}
/* Colour + themes */
{const b=card('ss-colour','Colour',clk,'saver');
  const themeRow=el('div','ctl btn-row');addCustom(b,s=>s.ssRotate==='off',themeRow);
  const lab=i=>s=>s.ssColBy==='type'?['Numerals','Punctuation','Letters','Spare'][i]:s.ssColBy==='single'?'Type':s.ssColBy==='line'?'Line '+(i+1):'Colour '+(i+1);
  const manual=s=>s.ssRotate==='off';
  build(b,[{t:'seg',k:'ssColBy',label:'Colour by',opts:[['type','Character type'],['letter','Each letter'],['line','Line'],['random','Random'],['single','One colour']]}]);
  const cf=fold(b,'c-colours','Your colours',manual);
  build(cf,[
    {t:'colour',k:'ssBg',label:'Background',show:manual},
    {t:'colour',k:'ssP1',labelFn:lab(0),label:'Colour 1',show:manual},
    {t:'colour',k:'ssP2',labelFn:lab(1),label:'Colour 2',show:s=>manual(s)&&s.ssColBy!=='single'},
    {t:'colour',k:'ssP3',labelFn:lab(2),label:'Colour 3',show:s=>manual(s)&&s.ssColBy!=='single'},
    {t:'colour',k:'ssP4',labelFn:lab(3),label:'Colour 4',show:s=>manual(s)&&s.ssColBy!=='single'&&s.ssColBy!=='type'},
  ]);
  const saveRow=el('div','ctl btn-row');const tn=el('input');tn.type='text';tn.placeholder='Name this theme';tn.setAttribute('aria-label','Theme name');tn.style.flex='1';
  const ts=el('button','pill small primary','Save theme');saveRow.append(tn,ts);addCustom(cf,manual,saveRow);
  const mine=el('div','preset-list');addCustom(b,null,mine);
  build(b,[{t:'seg',k:'ssRotate',label:'Change theme every hour',opts:[['off','Off'],['all','All themes'],['mine','My themes']]}]);
  const apply=T=>{S.ssBg=T.bg;[S.ssP1,S.ssP2,S.ssP3,S.ssP4]=T.p;set('ssRotate','off');};
  const cur=()=>({bg:S.ssBg,p:[S.ssP1,S.ssP2,S.ssP3,S.ssP4]});
  const same=T=>T.bg.toLowerCase()===S.ssBg.toLowerCase()&&T.p.every((c,i)=>c.toLowerCase()===[S.ssP1,S.ssP2,S.ssP3,S.ssP4][i].toLowerCase());
  window.themesRefresh=()=>{themeRow.textContent='';[...PALETTES,...getThemes()].forEach(T=>{const p=el('button','pill small',T.name);p.setAttribute('aria-pressed',same(T));p.onclick=()=>{apply(T);themesRefresh();};themeRow.append(p);});
    mine.textContent='';getThemes().forEach((T,i)=>{const it=el('div','preset-item'),sw=el('span');sw.style.cssText='flex:none;display:inline-flex;gap:3px';
      [T.bg,...T.p].forEach(c=>{const d=el('i');d.style.cssText=`width:12px;height:12px;border-radius:50%;background:${c};box-shadow:0 0 0 1px var(--keyline)`;sw.append(d);});
      const nm=el('span',null,T.name),del=el('button','pill small','Delete');del.onclick=()=>{const q=getThemes();q.splice(i,1);LS.set('themes',q);themesRefresh();ssDirty=true;};it.append(sw,nm,del);mine.append(it);});};
  ts.onclick=()=>{const n=tn.value.trim()||('Theme '+(getThemes().length+1));const q=getThemes().filter(t=>t.name!==n&&!PALETTES.some(P=>P.name===n));q.push(Object.assign({name:n},cur()));LS.set('themes',q);tn.value='';themesRefresh();ssDirty=true;toast(`Saved ${n}`);};
}
/* In words: colour themes */
const WORD_THEMES=[
  {name:'Apricot',bg:'#FFFFFF',ink:'#181818',soft:'#FDA072',date:'#F7C6AA'},
  {name:'Red',bg:'#FFFFFF',ink:'#FF3B1F',soft:'#181818',date:'#8C8C8C'},
  {name:'Paper',bg:'#F2F2F2',ink:'#000000',soft:'#B4B4B4',date:'#6E6E6E'},
  {name:'Night',bg:'#000000',ink:'#FFFFFF',soft:'#4D4D4D',date:'#8C8C8C'},
  {name:'Signal',bg:'#FF4F1F',ink:'#000000',soft:'#FFFFFF',date:'#FFD3C4'},
  {name:'Noon',bg:'#D3D5D5',ink:'#F4FD5F',soft:'#1E2023',date:'#1E2023'},
];
const W_COLS=[['ssWBg','bg'],['ssWInk','ink'],['ssWSoft','soft'],['ssWDateCol','date']];
{const b=card('ss-wcolour','Colour',wd,'saver');
  const row=el('div','ctl btn-row');addCustom(b,s=>!s.ssWRotate,row);
  const same=T=>W_COLS.every(([k,t])=>String(T[t]).toLowerCase()===String(S[k]).toLowerCase());
  const fixed=s=>!s.ssWRotate;
  build(b,[{t:'toggle',k:'ssWRotate',label:'Change theme every hour'}]);
  build(fold(b,'w-colours','Your colours',fixed),[
    {t:'colour',k:'ssWBg',label:'Background',show:fixed},
    {t:'colour',k:'ssWInk',label:'Highlight',labelFn:s=>s.ssWHi==='faces'?'Other fonts':s.ssWHi==='time'||s.ssWHi==='parts'?'The time':s.ssWHi==='latest'?'Latest change':'Type',show:fixed},
    {t:'colour',k:'ssWDateCol',label:'The date',show:s=>fixed(s)&&s.ssWHi==='parts'},
    {t:'colour',k:'ssWSoft',label:'Everything else',show:s=>fixed(s)&&s.ssWHi!=='none'},
  ]);
  const paint=()=>{row.textContent='';WORD_THEMES.forEach(T=>{const p=el('button','pill small',T.name);p.setAttribute('aria-pressed',same(T));
    p.onclick=()=>{W_COLS.forEach(([k,t])=>{S[k]=T[t];});set('ssWRotate',false);};row.append(p);});};
  controls.push({d:{},w:row,update:paint});
}
/* As a dial: colour */
const DIAL_THEMES=[
  {name:'Paper',bg:'#FFFFFF',min:'#E7E7E7',hour:'#A9A9A9',quarter:'#181818',handH:'#EA2631',handM:'#EA2631',handS:'#EA2631'},
  {name:'Dawn',bg:'#FFFFFF',min:'#8A8A8A',hour:'#8A8A8A',quarter:'#C2C2C2',handH:'#30FFFE',handM:'#FDA072',handS:'#FEC4FE'},
  {name:'Noon',bg:'#D3D5D5',min:'#E9EBEB',hour:'#F4FD5F',quarter:'#1E2023',handH:'#F4FD5F',handM:'#F4FD5F',handS:'#1E2023'},
  {name:'Night',bg:'#000000',min:'#333333',hour:'#8C8C8C',quarter:'#FFFFFF',handH:'#FFFFFF',handM:'#FFFFFF',handS:'#FFF35C'},
  {name:'Signal',bg:'#FF4F1F',min:'#FF9A7A',hour:'#000000',quarter:'#000000',handH:'#000000',handM:'#000000',handS:'#FFFFFF'},
];
const D_COLS=[['ssDialBg','bg'],['ssDialMin','min'],['ssDialHour','hour'],['ssDialQuarter','quarter'],['ssDialHandH','handH'],['ssDialHandM','handM'],['ssDialHandS','handS']];
{const b=card('ss-dcolour','Colour',dl,'saver');
  const row=el('div','ctl btn-row');addCustom(b,s=>!s.ssDialRotate,row);
  const same=T=>D_COLS.every(([k,t])=>String(T[t]).toLowerCase()===String(S[k]).toLowerCase());
  const fixed=s=>dl(s)&&!s.ssDialRotate;
  build(b,[{t:'toggle',k:'ssDialRotate',label:'Change theme every hour'}]);
  build(fold(b,'d-colours','Your colours',fixed),[
    {t:'colour',k:'ssDialBg',label:'Background',show:fixed},
    {t:'colour',k:'ssDialMin',label:'Minute marks',show:s=>fixed(s)&&s.ssDialFace!=='none'&&s.ssDialDetail==='minutes'},
    {t:'colour',k:'ssDialHour',label:'Hour marks',labelFn:s=>s.ssDialFace==='none'||s.ssDialDetail==='quarters'?'Ring':'Hour marks',show:s=>fixed(s)&&((s.ssDialFace!=='none'&&s.ssDialDetail!=='quarters')||s.ssDialRing)},
    {t:'colour',k:'ssDialQuarter',label:'Quarter marks',show:s=>fixed(s)&&s.ssDialFace!=='none'},
    {t:'colour',k:'ssDialHandH',label:'Hour hand',show:fixed},
    {t:'colour',k:'ssDialHandM',label:'Minute hand',show:fixed},
    {t:'colour',k:'ssDialHandS',label:'Second hand',show:s=>fixed(s)&&s.ssDialSecs},
  ]);
  const paint=()=>{row.textContent='';DIAL_THEMES.forEach(T=>{const p=el('button','pill small',T.name);p.setAttribute('aria-pressed',same(T));
    p.onclick=()=>{D_COLS.forEach(([k,t])=>{S[k]=T[t];});set('ssDialRotate',false);};row.append(p);});};
  controls.push({d:{},w:row,update:paint});
}
/* Export */
{const b=card('ss-export','Export',null,'saver');
  addHint(b,'No font loaded, so exports will use the demo face. Add your font in Fonts first.',s=>!anyLoaded()&&!dl(s));
  const nr=el('div','ctl'),nh=el('div','ctl-head'),nl=el('label',null,'Name'),nm=el('input');nm.type='text';nm.id='c_ssName';nl.htmlFor=nm.id;nm.style.width='100%';
  nh.append(nl);const nq=qMark({k:'ssName',label:'Name'});if(nq)nh.append(nq);nr.append(nh,nm);b.append(nr);
  nm.oninput=()=>set('ssName',nm.value,true);
  controls.push({d:{},w:nr,update(){if(document.activeElement!==nm)nm.value=S.ssName;nm.placeholder=defaultName();}});
  b.append(el('div','sub-head','Mac'));
  const mac=el('button','pill primary','Download for Mac');const r1=el('div','ctl btn-row');r1.append(mac);b.append(r1);
  b.append(el('p','hint','A .saver you install by double-clicking. The first time, macOS blocks it: allow it under System Settings › Privacy & Security › Open Anyway, then install for all users. The read-me in the zip walks through it.'));
  mac.onclick=exportMac;window.macBtn=mac;
  b.append(el('div','sub-head','Windows'));
  const win=el('button','pill primary','Download for Windows');const r3=el('div','ctl btn-row');r3.append(win);b.append(r3);
  b.append(el('p','hint','A .scr you install by right-clicking and choosing Install. It plays full screen through Microsoft Edge, built into Windows 10 and 11.'));
  win.onclick=exportWin;window.winBtn=win;
  b.append(el('div','sub-head','Any computer'));
  const go=el('button','pill','Download HTML file');const r2=el('div','ctl btn-row');r2.append(go);b.append(r2);
  go.onclick=exportScreensaver;
  const how=el('details');const sm=el('summary',null,'Using the HTML file');
  const howText=el('div','hint');
  howText.innerHTML='<p>Open it in any browser and click to go full screen. It also works with WebViewScreenSaver on a Mac and Lively Wallpaper on Windows, if you already use them.</p>';
  how.append(sm,howText);b.append(how);
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
  return{tempo:1,name:name||'',exportName:S.ssName||'',settings:s,fonts,on:on.map(x=>x.id),pool:on.filter(x=>x.swap!==false&&x.id!==s.baseSlot).map(x=>x.id),tracks,themes:getThemes()};}
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
  S.ssName=typeof p.exportName==='string'?p.exportName:'';
  const core=id(src.baseSlot);if(core)S.baseSlot=core;
  for(const k of PART_KEYS){const v=S[k];if(v&&v!=='base'&&v!=='shuffle')S[k]=id(v)||'base';}}
function openPreset(p,quiet){
  const m=resolveFonts(p);applyPresetSettings(p,m);
  if(Array.isArray(p.on)){const id=x=>m.map[x]||null,on=new Set(p.on.map(id).filter(Boolean)),pool=new Set((p.pool||[]).map(id).filter(Boolean));
    for(const st of styles){if(on.has(st.id))st.off=false;if(st.id!==S.baseSlot)st.swap=pool.has(st.id);}
    for(const x of p.on){const n=id(x);if(!n)continue;const v=(p.tracks||{})[x];if(v)TRACKS[n]=v;else delete TRACKS[n];}
    LS.set('tracks',TRACKS);}
  if(Array.isArray(p.themes)&&p.themes.length){const q=getThemes();let add=false;
    for(const T of p.themes)if(T&&T.name&&Array.isArray(T.p)&&!q.some(t=>t.name===T.name)&&!PALETTES.some(P=>P.name===T.name)){q.push(T);add=true;}if(add)LS.set('themes',q);}
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
  saveFile('tempo-presets-'+day+'.json',new Blob([JSON.stringify({tempo:'presets',v:1,saved:d.toISOString(),presets:PRESETS,themes:getThemes()},null,1)],{type:'application/json'}));}
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
  ['size','ssDialSize'],['rotate','ssDialRotate']];
function presetFromConfig(cfg,name){
  const s={ssVer:4},b=cfg.base||{},put=(k,v)=>{if(v!==undefined&&v!==null)s[k]=v;};
  for(const k in b)if((/^ss[A-Z0-9]/.test(k)&&!/^ssW|^ss[MN][A-Z]|^ssDial|^ssName$/.test(k))||k==='baseSlot')s[k]=b[k];
  s.ssShow=cfg.show==='words'||cfg.show==='dial'?cfg.show:'clock';put('ssDrift',cfg.drift);
  const c=cfg.clock||{},N=c.mixed;
  if(N){MX_MAP.forEach(([a,k])=>put('ssN'+k.slice(1),N[a]));MN_PARTS.forEach(([a,k])=>put(k,(N.parts||{})[a]));}
  const w=cfg.words;
  if(w){W_MAP.forEach(([a,k])=>put(k,w[a]));
    if(w.nums)WN_MAP.forEach(([a,k])=>put(k,w.nums[a]));else if(w.num)WN_MAP.forEach(([,k])=>put(k,w.num));
    const M=w.mixed;if(M){MX_MAP.forEach(([a,k])=>put('ss'+k,M[a]));put('ssMLittle',M.little);MW_PARTS.forEach(([a,k])=>put(k,(M.parts||{})[a]));}}
  const d=cfg.dial;
  if(d){DL_MAP.forEach(([a,k])=>put(k,d[a]));const col=d.colours||{};D_COLS.forEach(([k,t])=>put(k,col[t]));}
  const fonts={},list=cfg.fonts||[];list.forEach(f=>{fonts[f.id]={name:f.name,family:f.family||'',file:''};});
  return{tempo:1,name:name||'Screen saver',exportName:'',settings:s,fonts,on:list.map(f=>f.id),pool:list.filter(f=>f.swap!==false&&f.id!==s.baseSlot).map(f=>f.id),tracks:Object.assign({},cfg.tracks||{}),themes:[]};}
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
      if(Array.isArray(j.themes)&&j.themes.length)got.forEach(p=>{p.themes=p.themes&&p.themes.length?p.themes:j.themes;});}
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
    if(cfg.dial)for(const k of ['line','key','hand'])cfg.dial[k]*=2.5;/* hairlines would vanish at this size */
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
  const row=el('div','ctl btn-row'),nm=el('input');nm.type='text';nm.placeholder='Name';nm.setAttribute('aria-label','Preset name');nm.style.flex='1';
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
    status.textContent='';
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
  panel.insertBefore(b.parentElement,panel.firstChild);/* the front door, as in Rubato */
}
/* What the screen saver is called: the name typed under Export, else the preset
   open, else Tempo, Tempo Words or Tempo Dial. Never a font's name – some fonts'
   licences (Timeless's) don't allow naming a product after them. */
function defaultName(){const a=activePreset();if(a)return a.name;return dl(S)?'Tempo Dial':wd(S)?'Tempo Words':'Tempo';}
const exportName=()=>(S.ssName||'').trim()||defaultName();
function saverConfig(){
  /* the words and mixing settings travel in their own blocks below */
  const noW=o=>{for(const k in o)if(/^ssW|^ss[MN][A-Z]|^ssDial/.test(k)||k==='ssName')delete o[k];return o;};
  const base=noW(Object.assign(fresh(),sanitise(S)));base.transparent=false;
  if(anyLoaded())base.baseSlot=baseSlot();/* the core font, by id */
  const pals=S.ssRotate==='mine'?getThemes():[...PALETTES,...getThemes()];
  return{show:wd(S)?'words':dl(S)?'dial':'clock',
    clock:{h24:S.ssH24,sep:SEPS[S.ssSep]||',',secs:S.ssSecs,zero:S.ssZero,ampm:true,line2:S.ssLine2,caps:S.ssCaps,
      change:S.ssChange,feel:S.ssFeel,len:S.ssLen,align:S.ssAlign,valign:S.ssVAlign,size:S.ssSize,margin:S.ssMargin,tabular:S.ssTabular,tracking:S.ssTracking,leading:S.ssLeading,move:S.ssMove,pulse:S.ssPulse,alt:S.ssAlt,altRate:S.ssAltRate,
      mixed:{mode:S.ssNMode,parts:{h1:S.ssNH1,h2:S.ssNH2,m1:S.ssNM1,m2:S.ssNM2,s1:S.ssNS1,s2:S.ssNS2,line2:S.ssNLine2},when:S.ssNWhen,each:S.ssNEach,match:S.ssNMatch,order:S.ssNOrder,amount:S.ssNAmount}},
    colours:{by:S.ssColBy,bg:S.ssBg,p:[S.ssP1,S.ssP2,S.ssP3,S.ssP4],cycle:S.ssRotate!=='off'&&pals.length>0},palettes:pals,
    base,drift:S.ssDrift,tracks:tracksNow(),
    /* only when showing the dial */
    ...(dl(S)?{dial:{face:S.ssDialFace,detail:S.ssDialDetail,hole:S.ssDialHole,tick:S.ssDialTick,ring:S.ssDialRing,line:S.ssDialLine,key:S.ssDialKey,hand:S.ssDialHand,
      secs:S.ssDialSecs,secMove:S.ssDialSecMove,minMove:S.ssDialMinMove,feel:S.ssDialFeel,len:S.ssDialLen,trail:S.ssDialTrail,tails:S.ssDialTails,centre:S.ssDialCentre,size:S.ssDialSize,
      colours:Object.fromEntries(D_COLS.map(([k,t])=>[t,S[k]])),rotate:S.ssDialRotate,themes:DIAL_THEMES}}:{}),
    /* only when showing words */
    ...(wd(S)?{words:{lead:S.ssWLead,h24:S.ssWH24,time:S.ssWTime,secs:S.ssWSecs,weekday:S.ssWWeekday,daynum:S.ssWDayNum,month:S.ssWMonth,year:S.ssWYear,
      stop:S.ssWStop,case:S.ssWCase,nums:{time:S.ssWNumTime,sec:S.ssWNumSec,date:S.ssWNumDate,year:S.ssWNumYear},zero:S.ssWZero,sep:S.ssWSep,layout:S.ssWLayout,fit:S.ssWFit,space:S.ssWSpace,optical:S.ssWOptical,dateCol:S.ssWDateCol,
      hi:S.ssWHi,size:S.ssWSize,leading:S.ssWLeading,tracking:S.ssWTracking,measure:S.ssWMeasure,align:S.ssWAlign,valign:S.ssWVAlign,margin:S.ssWMargin,
      change:S.ssWChange,by:S.ssWBy,feel:S.ssWFeel,len:S.ssWLen,glide:S.ssWGlide,bg:S.ssWBg,ink:S.ssWInk,soft:S.ssWSoft,rotate:S.ssWRotate,themes:WORD_THEMES,
      mixed:{mode:S.ssMMode,parts:{lead:S.ssMLead,time:S.ssMTime,sec:S.ssMSec,weekday:S.ssMWeekday,day:S.ssMDay,month:S.ssMMonth,year:S.ssMYear},
        when:S.ssMWhen,each:S.ssMEach,little:S.ssMLittle,match:S.ssMMatch,order:S.ssMOrder,amount:S.ssMAmount}}}:{})};
}

function saverChars(cfg){
  const chars=new Set(' 0123456789,:.apmAPM');
  const add=s=>{for(const ch of Array.from(s||''))if(ch!=='\n'){chars.add(ch);chars.add(ch.toUpperCase());chars.add(ch.toLowerCase());}};
  for(let i=0;i<7;i++)add(new Date(2026,0,5+i).toLocaleDateString('en-GB',{weekday:'long'}));
  for(let m=0;m<12;m++)add(new Date(2026,m,1).toLocaleDateString('en-GB',{month:'long'}));
  if(cfg.words)add(saverVocab());
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
function saverBg(cfg){if(cfg.dial){const d=cfg.dial;return d.rotate?d.themes[new Date().getHours()%d.themes.length].bg:d.colours.bg;}if(cfg.words){const w=cfg.words;return w.rotate?w.themes[new Date().getHours()%w.themes.length].bg:w.bg;}return cfg.colours.cycle?cfg.palettes[new Date().getHours()%cfg.palettes.length].bg:cfg.colours.bg;}
async function exportWin(){
  if(!window.SaverPack||!window.SAVER_WIN){toast("The Windows packager didn't load. Reload and try again.");return;}
  const btn=window.winBtn;btn.disabled=true;const label=btn.textContent;btn.textContent='Building\u2026';
  try{
    const name=exportName().replace(/[^A-Za-z0-9 \-]/g,'').trim()||'Tempo';
    const enc=new TextEncoder(),nb=enc.encode(name),hb=enc.encode(saverHTML());
    const bin=atob(SAVER_WIN),tpl=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)tpl[i]=bin.charCodeAt(i);
    const hex=/^#?([0-9a-f]{6})$/i.exec(saverBg(saverConfig())),bg=hex?parseInt(hex[1],16):0;
    const ft=new Uint8Array(24),dv=new DataView(ft.buffer);ft.set(enc.encode('RBTOSCR1'));dv.setUint32(8,nb.length,true);dv.setUint32(12,hb.length,true);dv.setUint32(16,bg,true);
    const scr=new Uint8Array(tpl.length+nb.length+hb.length+24);scr.set(tpl,0);scr.set(nb,tpl.length);scr.set(hb,tpl.length+nb.length);scr.set(ft,tpl.length+nb.length+hb.length);
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
  $('#dims').textContent='Preview at '+W+' × '+H+', the shape of this screen, showing your local time';dirty=true;
}
let pEng=null,saver=null,pFonts=-1;
function previewFrame(now,dt){
  if(!pEng)pEng=createEngine();
  if(pFonts!==faceVer){pEng.setFaces(eng.faceList());pFonts=faceVer;ssDirty=true;}
  if(!saver){saver=createSaver(pEng,saverConfig());ssDirty=false;}else if(ssDirty){saver.setConfig(saverConfig());ssDirty=false;}
  saver.frame(ctx,cv.width,cv.height,now,dt);
}
function tick(now){
  const dt=lastT?Math.min(100,now-lastT):0;lastT=now;
  const P=screenShape();if(cv.width!==P[0]||cv.height!==P[1])fitCanvas();try{previewFrame(now,dt);}catch(e){console.error(e);}dirty=true;requestAnimationFrame(tick);
}
function applyTab(){document.body.classList.add('saver');refreshVis();fitCanvas();}

/* ---------------- start ---------------- */
function appStart(){refreshFontCard();themesRefresh();applyTab();refreshAll();fitCanvas();}
