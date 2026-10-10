/* Rubato – type in motion. App code; see shared/core.js for how the parts fit.
   1.0 panel: Presets, Fonts, Text, Layout, Motion, Variants, Physics, Colour, Export. */

/* ---------------- settings ---------------- */
/* 1.0's new settings. Added to the shared defaults (D) at start-up, in Rubato only. */
function rubatoDefaults(){return{
  blocks:[{text:'',font:'',size:1,dest:'auto',kern:{}}],lkGap:.35,
  phOn:false,phIn:.25,phHold:.25,phOut:.25,phFeel:'magnet',phStagger:.3,phSpace:0,phPull:1,
  jAmt:6,jRate:12,jRot:4,jGlitch:.15,jFeel:'cut',
  aDist:60,aSpin:90,aIn:.3,aHold:.4,aOut:.2,aStagger:.5,aFeel:'magnet',aExit:'scatter',aFade:false,
  scSet:'mixed',scRate:24,scIn:.4,scHold:.4,scOut:.15,scStagger:.6};}
/* the shared sanitiser handles every flat setting; blocks (text, font, size, destination, kerning) are checked here */
function sanitiseR(o){
  const r=sanitise(o),DESTS=['auto','tl','t','tr','l','c','r','bl','b','br'];
  if(o&&Array.isArray(o.blocks)&&o.blocks.length){
    r.blocks=o.blocks.slice(0,4).map(b=>{b=b&&typeof b==='object'?b:{};const kern={};
      if(b.kern&&typeof b.kern==='object')for(const k in b.kern){const v=Math.round(+b.kern[k]);if(Array.from(k).length===2&&isFinite(v)&&v)kern[k]=Math.max(-1000,Math.min(1000,v));}
      return{text:typeof b.text==='string'?b.text.slice(0,400):'',font:typeof b.font==='string'?b.font:'',size:isFinite(+b.size)?Math.max(.1,Math.min(3,+b.size)):1,dest:DESTS.includes(b.dest)?b.dest:'auto',kern};});
  }
  return r;
}
function loadSettings(){Object.assign(D,rubatoDefaults());const s=Object.assign(fresh(),sanitiseR(LS.get('settings')||{}));s.tab='studio';return s;}
function saveSettings(){LS.set('settings',S);}
function onSettingsChange(){thumbsStale=true;}
const ASPECTS={'1:1':[1080,1080],'4:5':[1080,1350],'9:16':[1080,1920],'16:9':[1920,1080],'3:2':[1620,1080],'2:3':[1080,1620]};
function frameSize(){if(S.aspect==='custom')return[clamp(Math.round(S.cw)||1080,64,4096),clamp(Math.round(S.ch)||1080,64,4096)];return ASPECTS[S.aspect]||[1080,1080];}
const perLoop=v=>{v=Math.round(v);return v===0?'Still':(v>0?'+':'')+v+' per loop';};
const glide=s=>s.seq&&s.qStyle==='glide';
const nB=s=>Array.isArray(s.blocks)&&s.blocks.length?s.blocks.length:1;
const multi=s=>nB(s)>1;
const both=(f,g)=>s=>(!f||f(s))&&(!g||g(s));
function reloadAll(){optCache.clear();fitCanvas();renderTextFields();schedulePicker(0);refreshAll();dirty=true;}

/* ---------------- tooltips ---------------- */
Object.assign(TIPS,{
  seq:'Play several texts in turn. Each gets an equal share of the loop, then hands over to the next.',
  tracking:'Even space added between every letter. Pair kerning still comes from the font, plus any you set below.',
  leading:'Distance between lines, as a multiple of the type size.',
  aspect:'Shape of the frame. Exports use this size.',
  fit:'Fit sizes the whole block to the frame. Fill width scales each line up to the full width, so short lines get bigger. Manual lets you set the size.',
  stretch:'Off keeps letters in their true proportions. On stretches each line to reach the full width – with Fit, the type also fills the full height. Repeat rows follow this too.',
  margin:'Space kept clear around the edge of the frame.',
  lkGap:'Space between blocks, as a share of the type size above.',
  mode:'Still: no movement. Fluid: smooth waves. Snappy: jumps between poses. Transitional: letters arrive, hold, then leave. Jitter: nervous twitching. Assemble: letters fly in from all over and lock into place.',
  order:'Which letters move first when there’s a stagger or a wave.',
  anchor:'Where letters pivot and scale from. Baseline keeps their feet planted.',
  dur:'Length of one loop. Everything repeats seamlessly after this.',
  fCycles:'How many full waves fit into one loop.',fPath:'The path each letter traces. Drag up for more rise, out for more drift.',fRot:'How far letters rock either way.',
  fScale:'How much letters grow and shrink.',fStretch:'Vertical stretch on the wave, for an elastic feel. Leave at 0 to keep proportions.',
  fStagger:'How far apart letters are in the wave. 0 moves them together.',fSharp:'Turns smooth waves into quicker moves with longer pauses.',
  sSteps:'How many poses happen in one loop.',sRest:'Every other pose goes back to the resting position.',
  sReach:'How far letters can jump up or down, and shift sideways.',sRot:'How far letters can twist either way.',sScale:'How much letters grow or shrink per pose.',
  sStretch:'Vertical stretch per pose. Leave at 0 to keep proportions.',sUnison:'How alike each letter’s pose is. 100% moves them as one.',
  sSnap:'How long each move takes, as a share of its step. Short is snappier.',sOver:'How far each move overshoots before settling.',sStagger:'Delay between letters starting their move.',
  tDir:'Which way letters travel in.',tEase:'Expo starts fast and settles gently. Back overshoots slightly. Linear is constant speed.',
  tExit:'Carry on leaves in the direction of travel. Go back reverses out the way it came.',tTiming:'Share of the loop spent arriving, at rest and leaving. Drag the joins.',
  tMask:'Hides letters outside their line or their own box, so they appear from nowhere.',tDist:'How far letters travel, in ems.',
  tStagger:'Delay between letters arriving and leaving.',
  tRot:'Rotation while travelling.',tScale:'Scale while travelling.',tAxis:'Which way the travel scale applies. Vertical or horizontal stretch the letters.',tFade:'Fade letters in and out as they travel.',
  jAmt:'How far letters twitch from their place.',jRate:'How many times letters twitch in one loop.',jRot:'How far letters can tip either way.',
  jGlitch:'How often a whole line jumps sideways, like a bad signal.',jFeel:'Cut snaps from pose to pose. Smooth slides between them.',
  aTiming:'Share of the loop spent flying in, locked in place and scattering again. Drag the joins.',aDist:'How far letters scatter, as a share of the frame.',
  aSpin:'How far letters can turn while they’re scattered.',aFeel:'Magnetic accelerates in and clicks into place. Smooth eases. Elastic overshoots and settles.',
  aStagger:'Delay between letters arriving and leaving.',aExit:'Scatter flies off somewhere new and drifts back before the loop repeats. Go back returns the way it came.',aFade:'Fade letters while they’re scattered.',
  axOn:'Animates one axis of your variable font – weight, width or any other – across the letters.',axTag:'Which axis to animate.',
  axRange:'Where the axis starts (hollow handle) and ends (solid handle). They can cross, to run the other way.',axCycles:'How many there-and-back cycles fit into one loop.',
  axStagger:'How far apart letters are in the cycle. 0 moves them together.',axFeel:'Smooth eases continuously. Snappy holds at each end and moves quickly between.',
  vMode:'Swap glyphs over time: the font’s alternates, your other styles, both – or Scramble, which cycles random characters and decodes into your text.',
  vPattern:'Cycle steps each letter through its chosen glyphs in order. Random picks freely each time.',
  vStyle:'How one glyph changes into the next.',vSteps:'How many changes happen in one loop.',vChance:'How many letters change each time.',
  vDur:'How long each change takes, as a share of its step.',vStagger:'Delay between letters changing.',
  vOffset:'Repeated letters start at different points in the cycle, so they don’t all match.',vRest:'Every other change goes back to the default glyph.',
  vReflow:'Neighbouring letters shift as wider or narrower glyphs come in. Off holds the spacing fixed.',
  scSet:'Which characters letters cycle through. Letters keep each letter’s case.',scTiming:'Share of the loop spent decoding, holding the text and scrambling again. Drag the joins.',
  scRate:'How many times scrambled letters change in one loop.',scStagger:'How far apart letters decode. 0 resolves them all at once.',
  qStyle:'How one text hands over to the next.',
  qClear:'One after the other: the outgoing text clears before the next arrives, so letters never collide. Together: they cross over.',
  qDir:'Which way texts roll.',qAxis:'Which way letters squash and spring.',qEase:'Snappy is fast with a crisp stop. Smooth eases in and out. Elastic overshoots.',
  qDur:'How much of each text’s time is spent changing.',qStagger:'Delay between letters during the change.',qStack:'How many texts are visible in the list.',qTrail:'Fades older items further down the list.',
  rOn:'Tiles your text in rows to fill the frame.',rRows:'How many rows fit in the frame.',rGap:'Extra space between rows.',
  rMix:'With a sequence, rows can show different texts or all show the same one.',rScroll:'How many rows the pattern moves up (or down) each loop.',
  rMarq:'How many lengths each row slides sideways each loop.',rAlt:'Neighbouring rows slide in opposite directions.',rDelay:'Delays each row slightly, so changes ripple down the frame.',
  phOn:'Pulls each block towards a point in the frame, holds it there, then lets the lockup snap back together.',
  phFeel:'Magnetic accelerates and clicks into place. Smooth eases. Elastic overshoots and settles.',
  phTiming:'Share of the loop spent pulling apart, held apart and coming back. The rest is the lockup at rest. Drag the joins.',
  phSpace:'A field around each block that others can’t enter while moving, so blocks never overlap. 0 lets them pass over each other.',
  phPull:'How far each block travels towards its point.',phStagger:'Delay between blocks setting off.',
  iPlace:'Behind or above the type, or inside it so the letters are filled with the image.',iBlend:'How the image mixes with what’s underneath it.',
  iScale:'Size of the image. 1× covers the frame.',iOpacity:'How strongly the image shows.',iSway:'Gentle rocking either way over the loop.',iRise:'Gentle rise and fall over the loop.',
  transparent:'Exports without a background. GIFs always use the background colour.',style:'Fill draws solid letters. Outline draws their edges only.',stroke:'Outline thickness, relative to the type size.',
  xScale:'Multiplies the frame size for PNG and video exports.',
  gFps:'Frames per second. Higher is smoother but heavier.',gScale:'GIFs get heavy quickly. Half size is usually plenty for social.',vLoops:'How many loops to record. Video records in real time.',
});
/* ---------------- preview loop ---------------- */
let playing=true,phase=0,busy=false;
function fitCanvas(){
  const [W,H]=frameSize();if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
  const v=$('#view'),cs=getComputedStyle(v);
  const aw=v.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=v.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
  const s=Math.max(.01,Math.min(aw/W,ah/H));cv.style.width=Math.floor(W*s)+'px';cv.style.height=Math.floor(H*s)+'px';
  cv.classList.toggle('checker',!!S.transparent);
  $('#dims').textContent=`${W} × ${H} px`;dirty=true;
}
const scrub=$('#scrub');
function tick(now){
  const dt=lastT?Math.min(100,now-lastT):0;lastT=now;
  if(dirty&&cv.width!==frameSize()[0]){fitCanvas();}
  if(playing&&!busy){phase=(phase+dt/1000/Math.max(.1,S.dur))%1;dirty=true;}
  if(guidesOn())dirty=true;
  if(dirty&&!busy){const [W,H]=frameSize();try{renderFrame(ctx,W,H,phase,1);drawOverlay(ctx,W,H);}catch(e){console.error(e);}dirty=false;
    if(document.activeElement!==scrub)scrub.value=Math.round(phase*1000);
    $('#time').textContent=`${(phase*S.dur).toFixed(2)} / ${S.dur.toFixed(2)} s`;
  }
  tickThumbs(now);
  requestAnimationFrame(tick);
}
scrub.addEventListener('input',()=>{setPlaying(false);phase=scrub.value/1000;dirty=true;});
function setPlaying(v){playing=v;const b=$('#play');b.textContent=v?'Pause':'Play';b.setAttribute('aria-label',v?'Pause':'Play');}
$('#play').onclick=()=>setPlaying(!playing);
function applyTab(){if(window.closeRandPop)closeRandPop();refreshVis();fitCanvas();}

/* ---------------- cards ---------------- */
if(!('physics' in collapsed))collapsed.physics=true;

/* Presets – the front door. Built here, moved to the top of the panel. */
/* Cards that start shut (each says what's set): all but Text */
function appCollapseDefault(){return ['layout','motion','variants','physics','colour'];}
let presetCard;
const PRESET_BASE={mode:'none',vMode:'off',rOn:false,stretch:false,axOn:false,qClear:true};
const BUILTIN={
  Hover:{mode:'fluid',order:'ltr',anchor:'centre',fCycles:1,fY:5,fX:2.5,fRot:1.5,fScale:0,fStretch:0,fStagger:.6,fSharp:0},
  Tick:{mode:'snappy',order:'ltr',anchor:'baseline',sSteps:4,sRest:true,sY:6,sX:0,sRot:0,sScale:0,sStretch:45,sUnison:.25,sSnap:.3,sOver:2.2,sStagger:.3},
  Conveyor:{mode:'transit',order:'ltr',tDir:'up',tDist:100,tIn:.32,tHold:.3,tOut:.26,tStagger:.45,tExit:'continue',tMask:'line',tFade:false,tRot:0,tScale:0,tEase:'expo'},
  Wave:{mode:'fluid',order:'ltr',anchor:'baseline',fCycles:1,fY:12,fX:0,fRot:0,fScale:0,fStretch:15,fStagger:1.1,fSharp:.15},
  Pulse:{mode:'fluid',order:'centre',anchor:'centre',fCycles:2,fY:0,fX:0,fRot:0,fScale:16,fStretch:0,fStagger:.5,fSharp:.35},
  Jitter:{mode:'jitter',order:'ltr',anchor:'centre',jAmt:4,jRate:12,jRot:3,jGlitch:.12,jFeel:'cut'},
  Assemble:{mode:'assemble',order:'random',anchor:'centre',aDist:55,aSpin:120,aIn:.35,aHold:.35,aOut:.2,aStagger:.5,aFeel:'magnet',aExit:'scatter',aFade:false},
  Scramble:{vMode:'scramble',order:'ltr',scSet:'mixed',scRate:24,scIn:.45,scHold:.4,scOut:.1,scStagger:.7},
  Cycle:{vMode:'alts',vPattern:'cycle',vSteps:6,vStyle:'roll',vDur:.45,vStagger:.25,vOffset:true,vReflow:true,order:'ltr'},
  Repeater:{rOn:true,rRows:4,rGap:0,stretch:true,rScroll:1,rDelay:.06,rMarq:0,rMix:'alternate',margin:0,qStyle:'roll',qEase:'snappy',qDur:.3,qStagger:.2},
  Glide:{seq:true,qStyle:'glide',qEase:'smooth',qDur:.45,qStack:4,qTrail:.55,align:'right'},
  Stretch:{seq:true,qStyle:'stretch',qAxis:'vertical',qEase:'elastic',qDur:.45,qStagger:.15,anchor:'baseline'},
};
function applyPreset(n){
  pushUndo();Object.assign(S,PRESET_BASE,BUILTIN[n]);
  if((S.seq||S.rOn)&&multi(S)){S.seq=false;S.rOn=false;toast(`${n} needs a single block – remove the extra blocks in Text to use it.`);}
  else if(S.seq&&S.texts.filter(t=>t.trim()).length<2){if(S.texts.length<2)S.texts.push('');toast('Add a second text to see the sequence.');}
  else if(S.vMode!=='off'&&S.vMode!=='scramble'&&!anyLoaded())toast('Load your font to see its alternates.');
  phase=0;autosave();reloadAll();
}
{const b=card('start','Presets');presetCard=b.parentElement;
  b.append(el('div','sub-head','Starting points'));
  const grid=el('div','thumbs');b.append(grid);
  Object.keys(BUILTIN).forEach(n=>{const t=el('button','thumb');t.type='button';t.setAttribute('aria-label','Use the '+n+' preset');
    const c=el('canvas');const lab=el('span',null,n);t.append(c,lab);t.onclick=()=>applyPreset(n);grid.append(t);addThumb(n,c);});
  b.append(el('div','sub-head','Saved'));
  const row=el('div','btn-row');const name=el('input');name.type='text';name.placeholder='Name this look';name.setAttribute('aria-label','Preset name');name.style.flex='1';
  const sv=el('button','pill small primary','Save');row.append(name,sv);b.append(row);
  const list=el('div','preset-list');b.append(list);
  const getP=()=>LS.get('presets')||[];
  const draw=()=>{list.textContent='';const ps=getP();if(!ps.length){list.append(el('p','hint','Saved looks keep every setting, including the texts. Fonts and images stay loaded separately.'));return;}
    ps.forEach((p,i)=>{const it=el('div','preset-item'),nm=el('span',null,p.name),ld=el('button','pill small','Load'),del=el('button','pill small','Delete');
      ld.onclick=()=>{pushUndo();S=Object.assign(fresh(),sanitiseR(p.settings));eng.use(S);autosave();reloadAll();toast(`Loaded ${p.name}`);};
      del.onclick=()=>{const q=getP();q.splice(i,1);LS.set('presets',q);draw();};it.append(nm,ld,del);list.append(it);});};
  sv.onclick=()=>{const n=name.value.trim()||('Look '+(getP().length+1));const q=getP().filter(p=>p.name!==n);q.unshift({name:n,settings:JSON.parse(JSON.stringify(S))});LS.set('presets',q);name.value='';draw();toast(`Saved ${n}`);};
  draw();
  const r2=el('div','ctl btn-row');const ex=el('button','pill small','Save settings file'),im=el('button','pill small','Load settings file');r2.append(ex,im);b.append(r2);
  ex.onclick=()=>saveFile(rslug()+'-settings.json',new Blob([JSON.stringify({rubato:3,settings:S},null,2)],{type:'application/json'}));
  im.onclick=()=>$('#jsonfile').click();
  $('#jsonfile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const j=JSON.parse(await f.text());pushUndo();S=Object.assign(fresh(),sanitiseR(j.settings||j));eng.use(S);autosave();reloadAll();toast('Settings loaded');}catch(err){toast("That file isn't a Rubato settings file.");}};
}

/* Text – blocks, sequence, spacing, kerning */
let textsHost,kernHost;
{const b=card('text','Text');
  buildR(b,[{t:'toggle',k:'seq',label:'Sequence of texts',show:s=>!multi(s),onToggle:v=>{if(v&&S.texts.length<2)S.texts.push('');set('seq',v);renderTextFields();if(v){const f=textsHost.querySelectorAll('textarea');const last=f[f.length-1];if(last&&!last.value)last.focus();}}}]);
  textsHost=el('div');b.append(textsHost);
  const on=s=>s.seq&&!multi(s),r=s=>s.qStyle==='roll',st=s=>s.qStyle==='stretch',g=s=>s.qStyle==='glide';
  buildR(b,[
    {ui:'head',text:'Handover',show:on},
    {t:'seg',k:'qStyle',label:'Transition',group:'sequence',show:on,opts:[['roll','Roll'],['stretch','Stretch'],['glide','Glide'],['fade','Fade'],['cut','Cut']]},
    {t:'hint',text:'Glide stacks your texts as a list. Each new one arrives at the bottom and the stack moves up.',show:both(on,g)},
    {t:'seg',k:'qClear',label:'Handover',group:'sequence',opts:[[true,'One after the other'],[false,'Together']],show:both(on,s=>!g(s))},
    {t:'seg',k:'qDir',label:'Direction',group:'sequence',opts:[['up','Up'],['down','Down']],show:both(on,r),rnd:['up','down']},
    {t:'seg',k:'qAxis',label:'Axis',group:'sequence',opts:[['vertical','Vertical'],['horizontal','Horizontal']],show:both(on,st)},
    {t:'seg',k:'qEase',label:'Feel',group:'sequence',opts:[['snappy','Snappy'],['smooth','Smooth'],['elastic','Elastic']],show:both(on,s=>s.qStyle!=='fade'&&s.qStyle!=='cut'),rnd:['snappy','smooth','elastic']},
    {t:'range',k:'qDur',label:'Change length',group:'sequence',min:.05,max:1,step:.01,fmt:v=>pct(v)+' of each text',show:on,rnd:[.25,.5]},
    {t:'range',k:'qStagger',label:'Stagger',group:'sequence',min:0,max:.95,step:.01,fmt:pct,show:both(on,s=>!g(s)),rnd:[0,.5]},
    {ui:'stepper',k:'qStack',label:'Items in stack',group:'sequence',min:2,max:8,step:1,show:both(on,g)},
    {t:'range',k:'qTrail',label:'Dim older items',group:'sequence',min:0,max:1,step:.01,fmt:pct,show:both(on,g)},
    {ui:'head',text:'Spacing'},
    {t:'range',k:'tracking',label:'Tracking',group:'layout',min:-150,max:400,step:5,fmt:v=>(v>0?'+':'')+Math.round(v),rnd:[-30,60]},
    {t:'range',k:'leading',label:'Line spacing',group:'layout',min:.6,max:2,step:.01,fmt:v=>v.toFixed(2),rnd:[.9,1.2]},
  ]);
  b.append(el('div','sub-head','Kerning'));
  b.append(el('p','hint','Click between two letters on the preview, then use ← and → to kern. Hold Shift for bigger steps, Esc to finish.'));
  kernHost=el('div','kern-list');b.append(kernHost);
}
let textSig='';
function fontOptions(sel,cur,first){sel.textContent='';if(first){const o=el('option',null,first);o.value='';sel.append(o);}
  styles.forEach(st=>{const o=el('option',null,st.face.name);o.value=st.id;sel.append(o);});sel.value=cur&&styles.some(s=>s.id===cur)?cur:(first?'':(styles[0]||{}).id||'');}
function renderTextFields(){
  textsHost.textContent='';textSig=styles.map(s=>s.id+s.face.name).join('|');
  if(!Array.isArray(S.blocks)||!S.blocks.length)S.blocks=JSON.parse(JSON.stringify(D.blocks));
  const nb=nB(S),many=nb>1,fonts=styles.length>1;
  /* block 1: one text, or a sequence of texts */
  const b1=el('div','tblock');textsHost.append(b1);
  if(many){const hd=el('div','tblock-head');hd.append(el('span','tb-name','Block 1'));
    if(fonts){const sel=el('select','tb-font');sel.setAttribute('aria-label','Block 1 font');fontOptions(sel,eng.baseSlot(),null);sel.onchange=()=>{set('baseSlot',sel.value);refreshFontCard();};hd.append(sel);}
    b1.append(hd);}
  const list=S.seq&&!many?S.texts:[S.texts[0]||''];
  list.forEach((t,i)=>{
    const wrap=el('div','tfield');
    if(S.seq&&!many){const hd=el('div','tfield-head');hd.append(el('span',null,'Text '+(i+1)));
      if(S.texts.length>2){const rm=el('button','pill small','Remove');rm.setAttribute('aria-label','Remove text '+(i+1));rm.onclick=()=>{S.texts.splice(i,1);autosave();renderTextFields();schedulePicker();dirty=true;};hd.append(rm);}
      wrap.append(hd);}
    const ta=el('textarea');ta.rows=2;ta.value=t;ta.setAttribute('aria-label',S.seq?'Text '+(i+1):many?'Block 1 text':'Text to set');if(S.seq&&i>0)ta.placeholder='Next text';
    ta.oninput=()=>{S.texts[i]=ta.value;autosave();dirty=true;schedulePicker();};
    wrap.append(ta);b1.append(wrap);
  });
  if(S.seq&&!many&&S.texts.length<12){const add=el('button','pill small','Add text');add.onclick=()=>{S.texts.push('');autosave();renderTextFields();const f=textsHost.querySelectorAll('textarea');f[f.length-1].focus();};const r=el('div','ctl btn-row');r.append(add);b1.append(r);}
  /* blocks 2–4 */
  for(let i=1;i<nb;i++){const bk=S.blocks[i],box=el('div','tblock');
    const hd=el('div','tblock-head');hd.append(el('span','tb-name','Block '+(i+1)));
    if(fonts){const sel=el('select','tb-font');sel.setAttribute('aria-label',`Block ${i+1} font`);fontOptions(sel,bk.font,'Same as block 1');sel.onchange=()=>{bk.font=sel.value;autosave();optCache.clear();dirty=true;schedulePicker();};hd.append(sel);}
    const rm=el('button','pill small','Remove');rm.setAttribute('aria-label',`Remove block ${i+1}`);rm.onclick=()=>{pushUndo();S.blocks.splice(i,1);autosave();renderTextFields();refreshAll();dirty=true;schedulePicker();};hd.append(rm);
    const ta=el('textarea');ta.rows=2;ta.value=bk.text;ta.placeholder=`Block ${i+1} text`;ta.setAttribute('aria-label',`Block ${i+1} text`);
    ta.oninput=()=>{bk.text=ta.value;autosave();dirty=true;schedulePicker();};
    const sz=el('div','ctl tb-size'),sh=el('div','ctl-head'),sl=el('label',null,'Size'),sv=el('span','val'),si=el('input');si.type='range';si.min=10;si.max=300;si.step=5;si.value=Math.round(bk.size*100);si.id='tbs'+i;sl.htmlFor=si.id;
    sv.textContent=Math.round(bk.size*100)+'% of block 1';sl.title='Double-click to reset';
    si.oninput=()=>{bk.size=+si.value/100;sv.textContent=si.value+'% of block 1';autosave();dirty=true;};sl.ondblclick=()=>{bk.size=.5;si.value=50;si.oninput();};
    sh.append(sl,sv);sz.append(sh,si);sz.dataset.size='1';
    box.append(hd,ta,sz);textsHost.append(box);}
  const r=el('div','ctl btn-row');
  if(!S.seq&&nb<4){const add=el('button','pill small','+ Add block');add.onclick=()=>{pushUndo();
      if(S.rOn){S.rOn=false;toast('Repeat is off – it works with a single block.');}
      S.blocks.push({text:'',font:'',size:.5,dest:'auto',kern:{}});autosave();renderTextFields();refreshAll();dirty=true;
      const f=textsHost.querySelectorAll('textarea');f[f.length-1].focus();};r.append(add);}
  if(r.children.length)textsHost.append(r);
  if(many)textsHost.append(el('p','hint','Blocks stack as a lockup. Sequence and Repeat work with a single block.'));
  else if(S.seq)textsHost.append(el('p','hint','Blocks work without a sequence – turn Sequence off to add one.'));
  refreshBlocksUI();
}
function refreshBlocksUI(){
  textsHost.querySelectorAll('[data-size]').forEach(n=>n.hidden=S.fit==='lines');
  if(styles.map(s=>s.id+s.face.name).join('|')!==textSig&&!textsHost.contains(document.activeElement))renderTextFields();
  refreshKernList();if(window.refreshDestUI)refreshDestUI();
}
function refreshKernList(){
  if(!kernHost)return;kernHost.textContent='';const items=[];
  (S.blocks||[]).forEach((bk,i)=>{for(const k in bk.kern)items.push([i,k,bk.kern[k]]);});
  if(!items.length){kernHost.hidden=true;return;}kernHost.hidden=false;
  const many=multi(S),row=el('div','chips');
  items.forEach(([i,k,v])=>{const c=el('button','chip');c.type='button';c.title='Remove this kerning';c.setAttribute('aria-label',`Remove kerning ${k}${many?' in block '+(i+1):''}`);
    c.append(el('span','chip-pair',k),el('span','chip-val',(v>0?'+':'')+String(v).replace('-','−')),el('span','chip-x','×'));if(many)c.prepend(el('span','chip-b',String(i+1)));
    c.onclick=()=>{pushUndo();delete S.blocks[i].kern[k];autosave();dirty=true;refreshKernList();};row.append(c);});
  const rs=el('button','pill small','Reset kerning');rs.onclick=()=>{pushUndo();S.blocks.forEach(bk=>bk.kern={});autosave();dirty=true;refreshKernList();};
  kernHost.append(row,rs);
}

/* Layout – frame, size, alignment; Repeat rows */
{const b=card('layout','Layout');
  buildR(b,[{t:'seg',k:'aspect',label:'Shape',opts:[['1:1','1:1'],['4:5','4:5'],['9:16','9:16'],['16:9','16:9'],['3:2','3:2'],['2:3','2:3'],['custom','Custom']]}]);
  const pair=el('div','ctl pair');const mk=(k,lab)=>{const i=el('input');i.type='number';i.min=64;i.max=4096;i.step=1;i.setAttribute('aria-label',lab);i.onchange=()=>set(k,clamp(Math.round(+i.value)||1080,64,4096));return i;};
  const iw=mk('cw','Width in pixels'),ih=mk('ch','Height in pixels');pair.append(iw,ih);
  addCustom(b,s=>s.aspect==='custom',pair).update=()=>{iw.value=S.cw;ih.value=S.ch;};
  const rep=s=>s.rOn&&!glide(s)&&!multi(s);
  buildR(b,[
    {t:'seg',k:'fit',label:'Size',opts:[['block','Fit'],['lines','Fill width'],['manual','Manual']],show:s=>!rep(s),rnd:['block','lines']},
    {t:'range',k:'size',label:'Size',min:2,max:150,step:.5,fmt:v=>roundTo(v,.5)+'% of width',show:s=>s.fit==='manual'&&!rep(s)},
    {t:'toggle',k:'stretch',label:'Stretch to fill',show:s=>!glide(s)&&!(multi(s)&&s.fit==='lines')},
    {t:'hint',text:'Letters are stretched to reach the edges. Turn off to keep their true proportions.',show:s=>s.stretch&&!glide(s)&&!(multi(s)&&s.fit==='lines')},
    {t:'hint',text:'Repeat sets the size from its row count.',show:rep},
    {t:'seg',k:'align',label:'Align',opts:[['left','Left'],['centre','Centre'],['right','Right']],rnd:['left','centre','right']},
    {t:'seg',k:'valign',label:'Position',opts:[['top','Top'],['middle','Middle'],['bottom','Bottom']],show:s=>!s.rOn||glide(s)||multi(s),rnd:['top','middle','bottom']},
    {t:'range',k:'lkGap',label:'Gap between blocks',min:0,max:1.5,step:.01,fmt:v=>v.toFixed(2)+' em',show:multi,rnd:[.15,.6]},
    {t:'range',k:'margin',label:'Margin',min:0,max:40,step:.5,fmt:v=>roundTo(v,.5)+'%',rnd:[4,14]},
  ]);
  /* Repeat rows, folded in from its own card */
  const on=rep;
  buildR(b,[
    {ui:'head',text:'Repeat',show:s=>!multi(s)},
    {t:'toggle',k:'rOn',label:'Repeat rows',group:'repeat',show:s=>!multi(s)},
    {t:'hint',text:'Repeat is paused while the sequence uses Glide.',show:s=>s.rOn&&glide(s)&&!multi(s)},
    {ui:'stepper',k:'rRows',label:'Rows in frame',group:'repeat',min:1,max:16,step:1,show:on,rnd:[2,8]},
    {t:'range',k:'rGap',label:'Row gap',group:'repeat',min:0,max:100,step:1,fmt:v=>Math.round(v)+'% em',show:on},
    {t:'seg',k:'rMix',label:'Rows show',group:'repeat',opts:[['alternate','Alternating texts'],['same','The same text']],show:s=>on(s)&&s.seq},
    {ui:'stepper',k:'rScroll',label:'Scroll',group:'repeat',min:-4,max:4,step:1,fmt:perLoop,show:on,rnd:[-2,2]},
    {ui:'stepper',k:'rMarq',label:'Slide sideways',group:'repeat',min:-4,max:4,step:1,fmt:perLoop,show:on,rnd:[-1,1]},
    {t:'toggle',k:'rAlt',label:'Alternate rows slide opposite ways',group:'repeat',show:s=>on(s)&&Math.round(s.rMarq)!==0},
    {t:'range',k:'rDelay',label:'Row offset',group:'repeat',min:0,max:.5,step:.005,fmt:ofLoop,show:on,rnd:[0,.1]},
  ]);
}

/* Motion – loop, movement, axis */
{const b=card('motion','Motion');
  const isF=s=>s.mode==='fluid',isS=s=>s.mode==='snappy',isT=s=>s.mode==='transit',isJ=s=>s.mode==='jitter',isA=s=>s.mode==='assemble';
  buildR(b,[{t:'range',k:'dur',label:'Loop length',group:'loop',min:1,max:20,step:.1,fmt:v=>v.toFixed(1)+' s'}]);
  const row=el('div','ctl switch-row seed-row');const lab=el('span');const btn=el('button','pill small','New seed');btn.title='The seed fixes every random choice, so a look you like stays put.';
  btn.onclick=()=>{pushUndo();set('seed',(Math.random()*99999|0)+1);};
  row.append(lab,btn);addCustom(b,null,row).update=()=>{lab.textContent='Seed '+S.seed;};
  const more=moreSection(b,'motion');
  buildR(b,[
    {t:'seg',k:'mode',label:'Movement',opts:[['none','Still'],['fluid','Fluid'],['snappy','Snappy'],['transit','Transitional'],['jitter','Jitter'],['assemble','Assemble']]},
    /* Fluid */
    {ui:'stepper',k:'fCycles',label:'Cycles per loop',min:1,max:6,step:1,show:isF,rnd:[1,2]},
    {ui:'pad',kx:'fX',ky:'fY',label:'Path',tip:TIPS.fPath,nx:'Drift',ny:'Rise',maxX:60,maxY:60,step:.5,fmt:v=>roundTo(v,.5)+'%',shape:'orbit',show:isF,rndX:[0,8],rndY:[2,14]},
    {ui:'dial',k:'fRot',label:'Tilt',min:0,max:45,step:.5,dispK:2,show:isF,rnd:[0,6]},
    {t:'range',k:'fStagger',label:'Phase spread',min:0,max:2,step:.01,fmt:v=>v.toFixed(2),show:isF,rnd:[.1,1]},
    {t:'range',k:'fScale',label:'Pulse',min:0,max:60,step:.5,unit:'%',show:isF,rnd:[0,10],more:true},
    {t:'range',k:'fStretch',label:'Stretch',min:0,max:100,step:.5,unit:'%',show:isF,rnd:[0,30],more:true},
    {t:'range',k:'fSharp',label:'Sharpness',min:0,max:1,step:.01,fmt:pct,show:isF,rnd:[0,.5],more:true},
    /* Snappy */
    {ui:'stepper',k:'sSteps',label:'Steps per loop',min:2,max:16,step:1,show:isS,rnd:[2,8]},
    {ui:'pad',kx:'sX',ky:'sY',label:'Reach',tip:TIPS.sReach,nx:'Shift',ny:'Jump',maxX:80,maxY:80,step:.5,fmt:v=>roundTo(v,.5)+'%',shape:'box',show:isS,rndX:[0,10],rndY:[0,24]},
    {ui:'dial',k:'sRot',label:'Twist',min:0,max:90,step:.5,show:isS,rnd:[0,12]},
    {t:'range',k:'sStagger',label:'Stagger',min:0,max:1,step:.01,fmt:pct,show:isS,rnd:[0,.6]},
    {t:'toggle',k:'sRest',label:'Return to rest between steps',show:isS,rnd:.6,more:true},
    {t:'range',k:'sScale',label:'Scale',min:0,max:80,step:.5,unit:'%',show:isS,rnd:[0,15],more:true},
    {t:'range',k:'sStretch',label:'Stretch',min:0,max:150,step:1,unit:'%',show:isS,rnd:[0,60],more:true},
    {t:'range',k:'sUnison',label:'Unison',min:0,max:1,step:.01,fmt:pct,show:isS,rnd:[0,.7],more:true},
    {t:'range',k:'sSnap',label:'Snap length',min:.05,max:1,step:.01,fmt:ofStep,show:isS,rnd:[.15,.5],more:true},
    {t:'range',k:'sOver',label:'Overshoot',min:0,max:4,step:.05,fmt:v=>v.toFixed(2),show:isS,rnd:[0,2.5],more:true},
    /* Transitional */
    {t:'seg',k:'tDir',label:'Direction',opts:[['up','Up'],['down','Down'],['left','Left'],['right','Right']],show:isT,rnd:['up','up','down','left','right']},
    {ui:'bar',keys:['tIn','tHold','tOut'],names:['In','Hold','Out'],label:'Timing',tip:TIPS.tTiming,mins:[.05,0,.05],maxs:[.6,.8,.6],show:isT,rnd:[[.2,.4],[.15,.4],[.15,.35]]},
    {t:'range',k:'tDist',label:'Distance',min:0,max:200,step:1,fmt:em,show:isT,rnd:[40,120]},
    {t:'range',k:'tStagger',label:'Stagger',min:0,max:.95,step:.01,fmt:pct,show:isT,rnd:[.2,.7]},
    {t:'seg',k:'tEase',label:'Ease',opts:[['expo','Expo'],['cubic','Cubic'],['back','Back'],['linear','Linear']],show:isT,rnd:['expo','expo','cubic','back'],more:true},
    {t:'seg',k:'tExit',label:'Exit',opts:[['continue','Carry on'],['reverse','Go back']],show:isT,rnd:['continue','reverse'],more:true},
    {t:'seg',k:'tMask',label:'Mask',opts:[['none','None'],['line','Line'],['glyph','Letter']],show:isT,rnd:['line','line','glyph','none'],more:true},
    {ui:'dial',k:'tRot',label:'Rotate',min:-90,max:90,step:.5,show:isT,more:true},
    {t:'range',k:'tScale',label:'Scale',min:-100,max:200,step:1,unit:'%',show:isT,more:true},
    {t:'seg',k:'tAxis',label:'Scale axis',opts:[['both','Both'],['vertical','Vertical'],['horizontal','Horizontal']],show:s=>isT(s)&&s.tScale!==0,more:true},
    {t:'toggle',k:'tFade',label:'Fade',show:isT,more:true},
    /* Jitter */
    {t:'range',k:'jAmt',label:'Amount',min:0,max:40,step:.5,fmt:em,show:isJ,rnd:[2,10]},
    {ui:'stepper',k:'jRate',label:'Twitches per loop',min:2,max:48,step:1,show:isJ,rnd:[6,24]},
    {ui:'dial',k:'jRot',label:'Tilt',min:0,max:30,step:.5,dispK:3,show:isJ,rnd:[0,8]},
    {t:'range',k:'jGlitch',label:'Glitch',min:0,max:1,step:.01,fmt:pct,show:isJ,rnd:[0,.3],more:true},
    {t:'seg',k:'jFeel',label:'Feel',opts:[['cut','Cut'],['smooth','Smooth']],show:isJ,rnd:['cut','cut','smooth'],more:true},
    /* Assemble */
    {ui:'bar',keys:['aIn','aHold','aOut'],names:['In','Hold','Out'],label:'Timing',tip:TIPS.aTiming,mins:[.05,0,.05],maxs:[.8,.8,.8],show:isA,rnd:[[.25,.4],[.2,.4],[.15,.3]]},
    {t:'range',k:'aDist',label:'Scatter',min:0,max:150,step:1,fmt:v=>Math.round(v)+'% of frame',show:isA,rnd:[30,90]},
    {ui:'dial',k:'aSpin',label:'Spin',min:0,max:360,step:1,dispK:.5,show:isA,rnd:[0,180]},
    {t:'seg',k:'aFeel',label:'Feel',opts:[['magnet','Magnetic'],['smooth','Smooth'],['elastic','Elastic']],show:isA,rnd:['magnet','smooth','elastic']},
    {t:'range',k:'aStagger',label:'Stagger',min:0,max:.95,step:.01,fmt:pct,show:isA,rnd:[.2,.7],more:true},
    {t:'seg',k:'aExit',label:'Exit',opts:[['scatter','Scatter'],['reverse','Go back']],show:isA,rnd:['scatter','reverse'],more:true},
    {t:'toggle',k:'aFade',label:'Fade while scattered',show:isA,more:true},
    /* shared */
    {t:'seg',k:'order',label:'Order',opts:[['ltr','Left to right'],['rtl','Right to left'],['centre','Centre out'],['edges','Edges in'],['random','Random']],rnd:['ltr','rtl','centre','edges','random']},
    {t:'seg',k:'anchor',label:'Anchor',opts:[['centre','Centre'],['baseline','Baseline']],rnd:['centre','baseline'],show:s=>s.mode!=='none'||s.vStyle==='stretch'||s.vStyle==='flip'||(s.seq&&s.qStyle==='stretch'),more:true},
  ],more);
  /* keep More at the foot of the movement controls, above Variable axis */
  const axOK=()=>{const f=F(eng.baseSlot());return !!(f.axes&&f.axes.length);},axOn=s=>axOK()&&s.axOn;
  const AXf=()=>{const f=F(eng.baseSlot());return f.axes&&(f.axes.find(a=>a.tag===S.axTag)||f.axes[0]);};
  const axFmt=v=>{const a=AXf();return a?String(Math.round(a.min+(a.max-a.min)*v)):pct(v);};
  b.append(more.inner.previousSibling,more.inner);
  addCustom(b,axOK,el('div','sub-head','Variable axis'));
  buildR(b,[
    {t:'toggle',k:'axOn',label:'Animate an axis',show:axOK},
    {t:'segdyn',k:'axTag',label:'Axis',optsFn:()=>{const f=F(eng.baseSlot());return (f.axes||[]).map(a=>[a.tag,a.name]);},show:axOn},
    {ui:'pair',k1:'axFrom',k2:'axTo',label:'Range',tip:TIPS.axRange,min:0,max:1,step:.005,fmt:axFmt,show:axOn,rnd1:[0,.4],rnd2:[.6,1]},
    {ui:'stepper',k:'axCycles',label:'Cycles per loop',min:1,max:6,step:1,show:axOn,rnd:[1,2]},
    {t:'range',k:'axStagger',label:'Phase spread',min:0,max:2,step:.01,fmt:v=>v.toFixed(2),show:axOn,rnd:[0,1]},
    {t:'seg',k:'axFeel',label:'Feel',opts:[['smooth','Smooth'],['snappy','Snappy']],show:axOn,rnd:['smooth','snappy']},
  ]);
}
/* Variants – glyph swaps and Scramble */
let pickHost;
{const b=card('variants','Variants');
  const on=s=>s.vMode!=='off'&&s.vMode!=='scramble',rnd=s=>on(s)&&s.vPattern==='random',cyc=s=>on(s)&&s.vPattern==='cycle',sc=s=>s.vMode==='scramble';
  buildR(b,[{t:'seg',k:'vMode',label:'Swap',opts:[['off','Off'],['alts','Alternates'],['weights','Styles'],['both','Both'],['scramble','Scramble']]}]);
  const note=el('p','hint');addCustom(b,null,note);window.variantNote=note;
  const mv=moreSection(b,'variants');
  buildR(b,[
    {t:'seg',k:'vPattern',label:'Pattern',opts:[['cycle','Cycle in order'],['random','Random']],show:on,rnd:['cycle','random']},
    {t:'seg',k:'vStyle',label:'Change',opts:[['roll','Roll'],['stretch','Stretch'],['cut','Cut'],['fade','Fade'],['flip','Flip']],show:on,rnd:['roll','roll','stretch','cut','fade','flip']},
    {ui:'stepper',k:'vSteps',label:'Changes per loop',min:1,max:24,step:1,show:on,rnd:[3,10]},
    {t:'range',k:'vChance',label:'Amount',min:0,max:1,step:.01,fmt:pct,show:rnd,rnd:[.3,.8]},
    {t:'seg',k:'scSet',label:'Characters',opts:[['letters','Letters'],['numbers','Numbers'],['symbols','Symbols'],['mixed','Mixed']],show:sc,rnd:['letters','mixed','mixed','numbers']},
    {ui:'bar',keys:['scIn','scHold','scOut'],names:['Decode','Hold','Scramble'],label:'Timing',tip:TIPS.scTiming,mins:[.05,0,0],maxs:[1,1,1],show:sc,rnd:[[.3,.5],[.3,.5],[.05,.2]]},
    {ui:'stepper',k:'scRate',label:'Changes per loop',min:4,max:96,step:4,show:sc,rnd:[12,40]},
    {t:'range',k:'scStagger',label:'Stagger',min:0,max:1,step:.01,fmt:pct,show:sc,rnd:[.3,.9],more:true},
    {t:'range',k:'vDur',label:'Change length',min:.05,max:1,step:.01,fmt:ofStep,show:on,rnd:[.2,.6],more:true},
    {t:'range',k:'vStagger',label:'Stagger',min:0,max:1,step:.01,fmt:pct,show:on,rnd:[0,.6],more:true},
    {t:'toggle',k:'vOffset',label:'Offset repeated letters',show:cyc,more:true},
    {t:'toggle',k:'vRest',label:'Return to default between changes',show:rnd,more:true},
    {t:'toggle',k:'vReflow',label:'Respace as widths change',show:on,more:true},
  ],mv);
  b.append(mv.inner.previousSibling,mv.inner);
  const head=el('div','sub-head','Glyphs');const hint=el('p','hint');
  const reset=el('button','pill small','Use all');reset.onclick=()=>{S.picks={};optCache.clear();autosave();dirty=true;schedulePicker(0);};
  const hr=el('div','switch-row');hr.append(head,reset);
  const wrap=el('div');wrap.append(hr,hint);pickHost=el('div','pick-host');wrap.append(pickHost);
  addCustom(b,null,wrap);window.pickHint=hint;window.pickReset=reset;window.pickWrap=wrap;
}
/* Physics – pull a lockup apart and let it snap back */
{const b=card('physics','Physics');
  const on=s=>s.phOn;
  buildR(b,[
    {t:'toggle',k:'phOn',label:'Pull apart'},
    {t:'hint',text:'Add blocks in Text to pull a lockup apart. On its own, a block drifts to its point and back.',show:s=>on(s)&&!multi(s)},
  ]);
  /* where each block goes: a 3×3 pad of points in the frame, or Auto */
  const destHost=el('div','dests');addCustom(b,on,destHost);
  const POS=['tl','t','tr','l','c','r','bl','b','br'],NAMES={tl:'top left',t:'top',tr:'top right',l:'left',c:'centre',r:'right',bl:'bottom left',b:'bottom',br:'bottom right'};
  window.refreshDestUI=()=>{destHost.textContent='';const n=nB(S);
    for(let i=0;i<n;i++){const bk=S.blocks[i],row=el('div','dest-row'),nm=el('div','dest-name');
      const txt=(i===0?S.texts[0]:bk.text)||'';nm.append(el('span','dest-n',n>1?String(i+1):'Goes to'),el('span','dest-t',n>1?(txt.split('\n')[0]||'Empty block'):''));
      const grid=el('div','dest-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label',`Block ${i+1} destination`);
      const goes=eng.blockDest(i,n);
      POS.forEach(p=>{const c=el('button','dest-pt'+(bk.dest==='auto'&&goes===p?' auto':''));c.type='button';c.setAttribute('aria-label',NAMES[p]);c.setAttribute('aria-pressed',bk.dest===p);c.onclick=()=>{bk.dest=p;autosave();dirty=true;pokeGuides();refreshDestUI();};grid.append(c);});
      const auto=el('button','pill small','Auto');auto.setAttribute('aria-pressed',bk.dest==='auto');auto.title='Each block to its own corner';auto.onclick=()=>{bk.dest='auto';autosave();dirty=true;pokeGuides();refreshDestUI();};
      row.append(nm,grid,auto);destHost.append(row);}};
  const mp=moreSection(b,'physics');
  buildR(b,[
    {t:'seg',k:'phFeel',label:'Feel',group:'physics',opts:[['magnet','Magnetic'],['smooth','Smooth'],['elastic','Elastic']],show:on,rnd:['magnet','smooth','elastic']},
    {ui:'bar',keys:['phIn','phHold','phOut'],names:['Pull','Apart','Return'],label:'Timing',tip:TIPS.phTiming,group:'physics',mins:[.05,0,.05],maxs:[1,1,1],show:on,rnd:[[.15,.3],[.15,.35],[.15,.3]]},
    {t:'range',k:'phSpace',label:'Personal space',group:'physics',min:0,max:20,step:.25,fmt:v=>v?roundTo(v,.25)+'% of frame':'Off',show:s=>on(s)&&multi(s),rnd:[0,6]},
    {t:'range',k:'phPull',label:'Distance',group:'physics',min:0,max:1,step:.01,fmt:pct,show:on,rnd:[.6,1],more:true},
    {t:'range',k:'phStagger',label:'Stagger',group:'physics',min:0,max:.95,step:.01,fmt:pct,show:s=>on(s)&&multi(s),rnd:[0,.6],more:true},
  ],mp);
  b.append(mp.inner.previousSibling,mp.inner);
  buildR(b,[{t:'hint',text:'Hover over this card to see each block’s point and space on the preview.',show:on}]);
  const cardEl=b.parentElement;cardEl.addEventListener('pointerenter',()=>{guideHover=true;dirty=true;});cardEl.addEventListener('pointerleave',()=>{guideHover=false;dirty=true;});
  cardEl.addEventListener('input',pokeGuides);cardEl.addEventListener('pointerup',pokeGuides);
}
/* Colour – colours, render, image */
let imgNameEl,imgRemove;
{const b=card('colour','Colour');
  const row=el('div','ctl btn-row pairs');
  [['Black on white','#000000','#ffffff'],['White on black','#ffffff','#000000'],['Black on grey','#000000','#f2f2f2']].forEach(([t,ink,bg])=>{const p=el('button','pill small',t);p.onclick=()=>{S.ink=ink;S.bg=bg;set('transparent',false);schedulePicker(0);};row.append(p);});
  const sw=el('button','pill small','Swap');sw.onclick=()=>{const t=S.ink;S.ink=S.bg;set('bg',t);};row.append(sw);
  addCustom(b,null,row);
  buildR(b,[
    {t:'colour',k:'ink',label:'Type'},
    {t:'colour',k:'bg',label:'Background'},
    {t:'toggle',k:'transparent',label:'Transparent background'},
    {t:'hint',text:'Transparency applies to PNG, SVG and WebM. GIFs always use the background colour.',show:s=>s.transparent},
    {t:'seg',k:'style',label:'Render',opts:[['fill','Fill'],['outline','Outline']]},
    {t:'range',k:'stroke',label:'Stroke',min:2,max:120,step:1,fmt:v=>Math.round(v)+'/1000 em',show:s=>s.style==='outline'},
  ]);
  b.append(el('div','sub-head','Image'));
  const ir=el('div','img-row');imgNameEl=el('div','slot-name');const ld=el('button','pill small','Load');imgRemove=el('button','pill small','Remove');
  ld.onclick=()=>$('#imgfile').click();imgRemove.onclick=clearImage;ir.append(imgNameEl,ld,imgRemove);b.append(ir);
  const has=()=>!!img;
  buildR(b,[
    {t:'seg',k:'iPlace',label:'Place',group:'image',opts:[['behind','Behind type'],['above','Above type'],['inside','Inside type']],show:has},
    {t:'seg',k:'iBlend',label:'Blend',group:'image',opts:[['normal','Normal'],['multiply','Multiply'],['screen','Screen'],['overlay','Overlay'],['difference','Difference']],show:has},
    {t:'range',k:'iScale',label:'Scale',group:'image',min:.2,max:3,step:.01,fmt:v=>v.toFixed(2)+'×',show:has},
    {t:'range',k:'iOpacity',label:'Opacity',group:'image',min:0,max:1,step:.01,fmt:pct,show:has},
    {ui:'dial',k:'iSway',label:'Sway',group:'image',min:0,max:45,step:.5,dispK:2,show:has},
    {t:'range',k:'iRise',label:'Rise',group:'image',min:0,max:25,step:.5,unit:'%',show:has},
    {t:'hint',text:'Images stay in this browser and aren’t saved in presets. SVG export leaves the image out.',show:has},
  ]);
}
function refreshImageCard(){if(!imgNameEl)return;imgNameEl.textContent=img?imgName:'Add a PNG, JPG or WebP to blend with the type';imgNameEl.classList.toggle('empty',!img);imgRemove.hidden=!img;}
/* Export */
{const b=card('export','Export',null,'studio');
  build(b,[{t:'seg',k:'xScale',label:'Scale for PNG and video',opts:[[.5,'0.5×'],[1,'1×'],[2,'2×']]}]);
  const r1=el('div','ctl btn-row');const png=el('button','pill','PNG frame'),svg=el('button','pill','SVG frame');r1.append(png,svg);b.append(r1);
  b.append(el('div','sub-head','GIF'));
  build(b,[{t:'seg',k:'gFps',label:'Frame rate',opts:[[12.5,'12.5'],[20,'20'],[25,'25'],[50,'50']]},{t:'seg',k:'gScale',label:'Size',opts:[[.25,'0.25×'],[.5,'0.5×'],[1,'1×']]}]);
  const gif=el('button','pill','Make GIF');const r2=el('div','ctl btn-row');r2.append(gif);b.append(r2);
  b.append(el('div','sub-head','Video'));
  build(b,[{t:'seg',k:'vLoops',label:'Loops to record',opts:[[1,'1'],[2,'2'],[4,'4']]}]);
  const vid=el('button','pill','Record video');const r3=el('div','ctl btn-row');r3.append(vid);b.append(r3);
  b.append(el('p','hint','Video records in real time as MP4 or WebM, depending on the browser. Keep this tab in front until it finishes.'));
  const prog=el('div','progress');const bar=el('i');prog.append(bar);prog.hidden=true;b.append(prog);
  window.exportUI={bar,prog,btns:[png,svg,gif,vid]};
  png.onclick=()=>exportPNG();svg.onclick=()=>exportSVG();gif.onclick=()=>exportGIF();vid.onclick=()=>exportVideo();
  cardToSheet(b,'export');/* Export grows out of the island */
}
cardToSheet(presetCard.querySelector('.card-body'),'presets');/* Presets: bottom right, opening upward */

/* ---------------- glyph picker ---------------- */
let pickTimer=0,pickRows=new Map();
function schedulePicker(ms){clearTimeout(pickTimer);pickTimer=setTimeout(refreshPicker,ms==null?250:ms);}
const cssVar=n=>getComputedStyle(document.body).getPropertyValue(n).trim()||'#000';
function drawTile(c,v,on){
  const dpr=window.devicePixelRatio||1,w=36,h=44;c.width=w*dpr;c.height=h*dpr;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);
  const f=F(v.s),adv=f.adv(v.r)||f.upm*.5;let k=Math.min((h*.5)/f.cap,(w*.8)/adv);
  x.setTransform(dpr*k,0,0,dpr*k,dpr*(w-adv*k)/2,dpr*h*.73);x.fillStyle=on?cssVar('--on-ink'):cssVar('--ink');f.draw(x,v.r,false);
}
function paintRow(ch){
  const row=pickRows.get(ch);if(!row)return;const o=charOptions(ch),keys=o.sel.map(vkey);
  row.forEach(t=>{const on=keys.includes(t.k),rest=keys[0]===t.k;t.b.setAttribute('aria-pressed',on);t.b.classList.toggle('rest',rest);drawTile(t.c,t.v,on);});
  window.pickReset.hidden=!Object.keys(S.picks).length;
}
function commitPick(ch,sel){
  const o=charOptions(ch),all=o.full.map(vkey);
  if(sel.length===all.length&&sel.every((x,i)=>x===all[i]))delete S.picks[ch];else S.picks[ch]=sel;
  optCache.clear();autosave();dirty=true;paintRow(ch);
}
const restOnly=()=>S.vMode==='off'||S.vMode==='scramble';
function togglePick(ch,k){
  let sel=charOptions(ch).sel.map(vkey);
  if(restOnly()){sel=[k].concat(sel.filter(x=>x!==k));}
  else if(sel.includes(k)){if(sel.length===1){toast('Keep at least one glyph for this letter.');return;}sel=sel.filter(x=>x!==k);}
  else sel.push(k);
  commitPick(ch,sel);
}
function restPick(ch,k){commitPick(ch,[k].concat(charOptions(ch).sel.map(vkey).filter(x=>x!==k)));}
function refreshPicker(){
  if(!pickHost)return;pickHost.textContent='';pickRows=new Map();
  const T=S.seq?S.texts:[S.texts[0]||''],seen=new Set(),list=[];
  for(const t of T)for(const ch of Array.from(t)){if(/\s/.test(ch)||seen.has(ch))continue;seen.add(ch);const o=charOptions(ch);if(o.full.length>1)list.push([ch,o]);}
  window.pickReset.hidden=!Object.keys(S.picks).length;
  const hint=window.pickHint;
  if(!list.length){hint.textContent=!anyLoaded()?'Add your font to choose between its alternates here.':S.vMode==='weights'?'Add another style in Fonts to pick between styles.':'None of the characters in your text have alternates.';return;}
  hint.textContent=S.vMode==='scramble'?'Tap a glyph to choose which version the text decodes into.':S.vMode==='off'?'Tap a glyph to choose which version shows. Turn on Variants to animate between them.':'Tap glyphs to include or leave them out. They change in the order you add them; double-click one to make it the resting glyph.';
  for(const [ch,o] of list.slice(0,48)){
    const row=el('div','pick-row');row.append(el('span','pick-ch',ch));const tiles=el('div','tiles'),refs=[];
    o.full.forEach(v=>{const k=vkey(v),f=F(v.s);const b=el('button','tile');const nm=(f.glyphName(v.r)||ch)+(new Set(o.full.map(x=>x.s)).size>1?', '+(f.styleName||f.name):'');
      b.title=nm;b.setAttribute('aria-label',nm);const c=el('canvas');b.append(c);
      b.onclick=()=>togglePick(ch,k);b.ondblclick=e=>{e.preventDefault();restPick(ch,k);};tiles.append(b);refs.push({b,c,v,k});});
    row.append(tiles);pickHost.append(row);pickRows.set(ch,refs);paintRow(ch);
  }
}
function refreshNotes(){
  if(window.variantNote){let t='';
    if((S.vMode==='alts'||S.vMode==='both')){const f=F(baseSlot());if(!anyLoaded())t='The demo face has no alternates. Add your font to use them.';else if(!f.altChars.length)t='No alternates found in this style.';}
    if((S.vMode==='weights'||S.vMode==='both')&&anyLoaded()&&availSlots().length<2)t=(t?t+' ':'')+'Add another style in Fonts, or tick Use in style swaps, to change between styles.';
    window.variantNote.textContent=t;window.variantNote.hidden=!t;}
  const n=$('#note');n.textContent=anyLoaded()?'':'Demo face';n.title=n.textContent?'Demo face – load your font in Fonts':'';
  if(textsHost)refreshBlocksUI();
}

/* ---------------- undo + randomise ---------------- */
const undoStack=[];
function pushUndo(){undoStack.push(JSON.stringify(S));if(undoStack.length>30)undoStack.shift();$('#undo').disabled=false;}
function undo(){const s=undoStack.pop();if(!s)return;S=Object.assign(fresh(),sanitiseR(JSON.parse(s)));eng.use(S);autosave();reloadAll();$('#undo').disabled=!undoStack.length;}
$('#undo').onclick=undo;
const RAND_GROUPS=[['motion','Motion'],['variants','Variants'],['sequence','Sequence'],['repeat','Repeat'],['physics','Physics'],['layout','Layout'],['colour','Colour']];
const RAND0={level:'gentle',groups:{motion:true,variants:true,sequence:true,repeat:true,physics:false,layout:false,colour:false}};
const RS=Object.assign({},RAND0,LS.get('rand')||{});RS.groups=Object.assign({},RAND0.groups,RS.groups||{});
const NEVER=new Set(['seq','rOn','phOn','aspect','cw','ch','size','baseSlot','tab','transparent','qClear','bg','ink','style','stroke','dur']);
const COLOUR_PAIRS=[['#ffffff','#000000'],['#000000','#ffffff'],['#f2f2f2','#000000'],['#5B23F0','#FFF35C'],['#FF4F1F','#000000'],['#1F2BFF','#D9D6F2'],['#000000','#FFF35C'],['#E9E4D8','#1C1C1E']];
const rr=(a,b)=>a+Math.random()*(b-a),pickA=a=>a[Math.floor(Math.random()*a.length)];
function hslHex(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return'#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');}
function randomise(){
  pushUndo();const full=RS.level==='full',G=RS.groups,grp=c=>c.d.group==='text'?'layout':c.d.group;
  const live=c=>c.d.k&&G[grp(c)]&&!NEVER.has(c.d.k)&&(grp(c)!=='sequence'||S.seq)&&(grp(c)!=='repeat'||S.rOn)&&(grp(c)!=='physics'||S.phOn);
  if(G.motion)S.mode=full?pickA(['none','fluid','snappy','transit','jitter','assemble']):pickA(['fluid','snappy','transit','jitter','assemble']);
  if(G.variants){const canAlt=anyLoaded()&&F(baseSlot()).altChars.length>0,canSty=availSlots().length>1;
    const on=[].concat(canAlt?['alts']:[],canSty?['weights']:[],canAlt&&canSty?['both']:[]);
    S.vMode=full?pickA(['off','scramble'].concat(on)):!on.length?(Math.random()<.15?'scramble':'off'):(G.motion&&S.mode!=='none'&&Math.random()<.5)?'off':pickA(on);}
  if(G.sequence&&S.seq)S.qStyle=pickA(full?['roll','stretch','glide','fade','cut']:['roll','roll','stretch','glide','fade']);
  for(const c of controls){const d=c.d;if(!live(c)||['mode','vMode','qStyle'].includes(d.k))continue;
    if(!full&&d.show&&!d.show(S))continue;
    if(d.t==='range'){if(full)S[d.k]=roundTo(rr(d.min,d.max),d.step);else if(Array.isArray(d.rnd))S[d.k]=roundTo(rr(d.rnd[0],d.rnd[1]),d.step);}
    else if(d.t==='seg'||d.t==='segdyn'){const opts=d.t==='segdyn'?d.optsFn():d.opts;if(!opts.length)continue;if(full)S[d.k]=pickA(opts)[0];else if(Array.isArray(d.rnd))S[d.k]=pickA(d.rnd);}
    else if(d.t==='toggle'){if(full)S[d.k]=Math.random()<.5;else if(typeof d.rnd==='number')S[d.k]=Math.random()<d.rnd;}}
  /* timings that share a loop can't add up to more than the loop */
  for(const ks of [['tIn','tHold','tOut'],['aIn','aHold','aOut'],['scIn','scHold','scOut'],['phIn','phHold','phOut']]){const sum=ks.reduce((a,k)=>a+S[k],0);if(sum>1)ks.forEach(k=>S[k]=roundTo(S[k]/sum,.01));}
  if(G.colour){if(full){const h=rr(0,360),dark=Math.random()<.5;S.bg=hslHex(h,rr(20,90),dark?rr(6,24):rr(82,96));S.ink=hslHex((h+rr(90,270))%360,rr(30,100),dark?rr(72,95):rr(6,28));
      S.style=Math.random()<.25?'outline':'fill';S.stroke=Math.round(rr(8,40));}else{const p=pickA(COLOUR_PAIRS);S.bg=p[0];S.ink=p[1];}S.transparent=false;}
  S.seed=(Math.random()*99999|0)+1;phase=0;autosave();reloadAll();
}
{const pop=el('div','rand-pop');pop.hidden=true;pop.setAttribute('role','dialog');pop.setAttribute('aria-label','Randomise options');
  const lanes=el('div','lanes');const lv=[['gentle','Within limits'],['full','Everything']].map(([v,l])=>{const b=el('button','lane',l);b.onclick=()=>{RS.level=v;LS.set('rand',RS);paint();};lanes.append(b);return[v,b];});
  const lh=el('p','hint'),list=el('div','rp-groups');
  const tg=RAND_GROUPS.map(([k,l])=>{const b=el('button','toggle');b.setAttribute('role','switch');b.append(el('span','box'),el('span',null,l));
    b.onclick=()=>{RS.groups[k]=!RS.groups[k];if(!Object.values(RS.groups).some(Boolean)){RS.groups[k]=true;toast('Keep at least one area.');}LS.set('rand',RS);paint();};list.append(b);return[k,b];});
  const go=el('button','pill primary','Randomise');go.onclick=randomise;
  pop.append(el('div','rp-title','Randomise'),lanes,lh,el('div','sub-head','Include'),list,go,el('p','hint','Press R to randomise with these settings, and ⌘Z or Ctrl+Z to undo.'));addSheet('random',pop,$('#randOpt'));
  function paint(){lv.forEach(([v,b])=>b.setAttribute('aria-pressed',RS.level===v));tg.forEach(([k,b])=>b.setAttribute('aria-checked',!!RS.groups[k]));
    lh.textContent=RS.level==='full'?'Any value a control allows, plus every option and switch in the areas you include. Expect some wild results.':'Values stay in ranges that usually look good, and most switches are left as you set them.';}
  paint();
  const opt=$('#randOpt'),close=()=>{pop.hidden=true;opt.setAttribute('aria-expanded','false');};
  opt.onclick=e=>{e.stopPropagation();if(pop.hidden){pop.hidden=false;opt.setAttribute('aria-expanded','true');lanes.querySelector('button').focus();}else close();};
  document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!pop.contains(e.target)&&!opt.contains(e.target))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden){close();opt.focus();}});
  window.closeRandPop=close;
}
$('#rand').onclick=randomise;
window.addEventListener('keydown',e=>{
  const tg=e.target,typing=tg&&(tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||(tg.tagName==='INPUT'&&/text|number/.test(tg.type)));
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!typing){e.preventDefault();undo();return;}
  if(typing||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.code==='Space'&&tg.tagName!=='BUTTON'&&!(tg.getAttribute&&tg.getAttribute('role')==='slider')){e.preventDefault();setPlaying(!playing);}
  else if(e.key==='r'||e.key==='R')randomise();
});
/* ---------------- start ---------------- */
function appStart(){refreshFontCard();refreshImageCard();renderTextFields();applyTab();refreshAll();fitCanvas();refreshPicker();}
