/* Rubato – type in motion. App code; see shared/core.js for how the parts fit. */

/* ---------------- settings ---------------- */
function loadSettings(){const s=Object.assign(fresh(),sanitise(LS.get('settings')||{}));s.tab='studio';return s;}
function saveSettings(){LS.set('settings',S);}
function onSettingsChange(){}
const ASPECTS={'1:1':[1080,1080],'4:5':[1080,1350],'9:16':[1080,1920],'16:9':[1920,1080],'3:2':[1620,1080],'2:3':[1080,1620]};
function frameSize(){if(S.aspect==='custom')return[clamp(Math.round(S.cw)||1080,64,4096),clamp(Math.round(S.ch)||1080,64,4096)];return ASPECTS[S.aspect]||[1080,1080];}
const perLoop=v=>{v=Math.round(v);return v===0?'Still':(v>0?'+':'')+v+' per loop';};
const glide=s=>s.seq&&s.qStyle==='glide';
function reloadAll(){optCache.clear();fitCanvas();renderTextFields();schedulePicker(0);refreshAll();dirty=true;}

/* ---------------- tooltips ---------------- */
Object.assign(TIPS,{
  seq:'Play several texts in turn. Each gets an equal share of the loop, then hands over to the next.',
  tracking:'Even space added between every letter. Pair kerning still comes from the font.',
  leading:'Distance between lines, as a multiple of the type size.',
  aspect:'Shape of the frame. Exports use this size.',
  fit:'Fit sizes the whole block to the frame. Fill width scales each line up to the full width, so short lines get bigger. Manual lets you set the size.',
  stretch:'Off keeps letters in their true proportions. On stretches each line to reach the full width – with Fit, the type also fills the full height. Repeat rows follow this too.',
  margin:'Space kept clear around the edge of the frame.',
  mode:'Still: no movement. Fluid: smooth, continuous waves. Snappy: jumps between poses. Transitional: letters arrive, hold, then leave.',
  order:'Which letters move first when there’s a stagger or a wave.',
  anchor:'Where letters pivot and scale from. Baseline keeps their feet planted.',
  fCycles:'How many full waves fit into one loop.',fY:'How far letters rise and fall.',fX:'How far letters sway sideways.',fRot:'How far letters rock.',
  fScale:'How much letters grow and shrink.',fStretch:'Vertical stretch on the wave, for an elastic feel. Leave at 0 to keep proportions.',
  fStagger:'How far apart letters are in the wave. 0 moves them together.',fSharp:'Turns smooth waves into quicker moves with longer pauses.',
  sSteps:'How many poses happen in one loop.',sRest:'Every other pose goes back to the resting position.',
  sY:'How far letters jump up or down.',sX:'How far letters jump sideways.',sRot:'How far letters twist.',sScale:'How much letters grow or shrink per pose.',
  sStretch:'Vertical stretch per pose. Leave at 0 to keep proportions.',sUnison:'How alike each letter’s pose is. 100% moves them as one.',
  sSnap:'How long each move takes, as a share of its step. Short is snappier.',sOver:'How far each move overshoots before settling.',sStagger:'Delay between letters starting their move.',
  tDir:'Which way letters travel in.',tEase:'Expo starts fast and settles gently. Back overshoots slightly. Linear is constant speed.',
  tExit:'Carry on leaves in the direction of travel. Go back reverses out the way it came.',
  tMask:'Hides letters outside their line or their own box, so they appear from nowhere.',tDist:'How far letters travel, in ems.',
  tIn:'Share of the loop spent arriving.',tHold:'Share of the loop spent at rest.',tOut:'Share of the loop spent leaving.',tStagger:'Delay between letters arriving and leaving.',
  tRot:'Rotation while travelling.',tScale:'Scale while travelling.',tAxis:'Which way the travel scale applies. Vertical or horizontal stretch the letters.',tFade:'Fade letters in and out as they travel.',
  axOn:'Animates one axis of your variable font – weight, width or any other – across the letters.',axTag:'Which axis to animate.',
  axFrom:'Where the axis starts, within its range.',axTo:'Where the axis ends, within its range.',axCycles:'How many there-and-back cycles fit into one loop.',
  axStagger:'How far apart letters are in the cycle. 0 moves them together.',axFeel:'Smooth eases continuously. Snappy holds at each end and moves quickly between.',
  vMode:'Swap glyphs over time: the font’s alternates, your other styles, or both.',
  vPattern:'Cycle steps each letter through its chosen glyphs in order. Random picks freely each time.',
  vStyle:'How one glyph changes into the next.',vSteps:'How many changes happen in one loop.',vChance:'How many letters change each time.',
  vDur:'How long each change takes, as a share of its step.',vStagger:'Delay between letters changing.',
  vOffset:'Repeated letters start at different points in the cycle, so they don’t all match.',vRest:'Every other change goes back to the default glyph.',
  vReflow:'Neighbouring letters shift as wider or narrower glyphs come in. Off holds the spacing fixed.',
  qStyle:'How one text hands over to the next.',
  qClear:'One after the other: the outgoing text clears before the next arrives, so letters never collide. Together: they cross over.',
  qDir:'Which way texts roll.',qAxis:'Which way letters squash and spring.',qEase:'Snappy is fast with a crisp stop. Smooth eases in and out. Elastic overshoots.',
  qDur:'How much of each text’s time is spent changing.',qStagger:'Delay between letters during the change.',qStack:'How many texts are visible in the list.',qTrail:'Fades older items further down the list.',
  rOn:'Tiles your text in rows to fill the frame.',rRows:'How many rows fit in the frame.',rGap:'Extra space between rows.',
  rMix:'With a sequence, rows can show different texts or all show the same one.',rScroll:'How many rows the pattern moves up (or down) each loop.',
  rMarq:'How many lengths each row slides sideways each loop.',rAlt:'Neighbouring rows slide in opposite directions.',rDelay:'Delays each row slightly, so changes ripple down the frame.',
  iPlace:'Behind or above the type, or inside it so the letters are filled with the image.',iBlend:'How the image mixes with what’s underneath it.',
  iScale:'Size of the image. 1× covers the frame.',iOpacity:'How strongly the image shows.',iSway:'Gentle rocking over the loop.',iRise:'Gentle rise and fall over the loop.',
  transparent:'Exports without a background. GIFs always use the background colour.',style:'Fill draws solid letters. Outline draws their edges only.',stroke:'Outline thickness, relative to the type size.',
  dur:'Length of one loop. Everything repeats seamlessly after this.',xScale:'Multiplies the frame size for PNG and video exports.',
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
  if(dirty&&!busy){const [W,H]=frameSize();try{renderFrame(ctx,W,H,phase,1);}catch(e){console.error(e);}dirty=false;
    if(document.activeElement!==scrub)scrub.value=Math.round(phase*1000);
    $('#time').textContent=`${(phase*S.dur).toFixed(2)} / ${S.dur.toFixed(2)} s`;
  }
  requestAnimationFrame(tick);
}
scrub.addEventListener('input',()=>{setPlaying(false);phase=scrub.value/1000;dirty=true;});
function setPlaying(v){playing=v;const b=$('#play');b.textContent=v?'Pause':'Play';b.setAttribute('aria-label',v?'Pause':'Play');}
$('#play').onclick=()=>setPlaying(!playing);
function applyTab(){if(window.closeRandPop)closeRandPop();refreshVis();fitCanvas();}

/* ---------------- cards ---------------- */
/* Text */
let textsHost;
{const b=card('text','Text');
  build(b,[{t:'toggle',k:'seq',label:'Sequence of texts',onToggle:v=>{if(v&&S.texts.length<2)S.texts.push('');set('seq',v);renderTextFields();if(v){const f=textsHost.querySelectorAll('textarea');const last=f[f.length-1];if(last&&!last.value)last.focus();}}}]);
  textsHost=el('div');b.append(textsHost);
  build(b,[
    {t:'range',k:'tracking',label:'Tracking',min:-150,max:400,step:5,fmt:v=>(v>0?'+':'')+Math.round(v),rnd:[-30,60]},
    {t:'range',k:'leading',label:'Line spacing',min:.6,max:2,step:.01,fmt:v=>v.toFixed(2),rnd:[.9,1.2]},
  ]);
}
function renderTextFields(){
  textsHost.textContent='';
  const list=S.seq?S.texts:[S.texts[0]||''];
  list.forEach((t,i)=>{
    const wrap=el('div','tfield');
    if(S.seq){const hd=el('div','tfield-head');hd.append(el('span',null,'Text '+(i+1)));
      if(S.texts.length>2){const rm=el('button','pill small','Remove');rm.setAttribute('aria-label','Remove text '+(i+1));rm.onclick=()=>{S.texts.splice(i,1);autosave();renderTextFields();schedulePicker();dirty=true;};hd.append(rm);}
      wrap.append(hd);}
    const ta=el('textarea');ta.rows=2;ta.value=t;ta.setAttribute('aria-label',S.seq?'Text '+(i+1):'Text to set');if(S.seq&&i>0)ta.placeholder='Next text';
    ta.oninput=()=>{S.texts[i]=ta.value;autosave();dirty=true;schedulePicker();};
    wrap.append(ta);textsHost.append(wrap);
  });
  if(S.seq&&S.texts.length<12){const add=el('button','pill small','Add text');add.onclick=()=>{S.texts.push('');autosave();renderTextFields();const f=textsHost.querySelectorAll('textarea');f[f.length-1].focus();};const r=el('div','ctl btn-row');r.append(add);textsHost.append(r);}
}
/* Layout */
{const b=card('layout','Layout');
  build(b,[{t:'seg',k:'aspect',label:'Shape',opts:[['1:1','1:1'],['4:5','4:5'],['9:16','9:16'],['16:9','16:9'],['3:2','3:2'],['2:3','2:3'],['custom','Custom']]}]);
  const pair=el('div','ctl pair');const mk=(k,lab)=>{const i=el('input');i.type='number';i.min=64;i.max=4096;i.step=1;i.setAttribute('aria-label',lab);i.onchange=()=>set(k,clamp(Math.round(+i.value)||1080,64,4096));return i;};
  const iw=mk('cw','Width in pixels'),ih=mk('ch','Height in pixels');pair.append(iw,ih);
  addCustom(b,s=>s.aspect==='custom',pair).update=()=>{iw.value=S.cw;ih.value=S.ch;};
  build(b,[
    {t:'seg',k:'fit',label:'Size',opts:[['block','Fit'],['lines','Fill width'],['manual','Manual']],show:s=>!s.rOn,rnd:['block','lines']},
    {t:'toggle',k:'stretch',label:'Stretch to fill',show:s=>!glide(s)},
    {t:'hint',text:'Letters are stretched to reach the edges. Turn off to keep their true proportions.',show:s=>s.stretch&&!glide(s)},
    {t:'hint',text:'Repeat sets the size from its row count.',show:s=>s.rOn&&!glide(s)},
    {t:'range',k:'size',label:'Size',min:2,max:150,step:.5,fmt:v=>roundTo(v,.5)+'% of width',show:s=>s.fit==='manual'&&!s.rOn},
    {t:'seg',k:'align',label:'Align',opts:[['left','Left'],['centre','Centre'],['right','Right']],rnd:['left','centre','right']},
    {t:'seg',k:'valign',label:'Position',opts:[['top','Top'],['middle','Middle'],['bottom','Bottom']],show:s=>!s.rOn||glide(s),rnd:['top','middle','bottom']},
    {t:'range',k:'margin',label:'Margin',min:0,max:40,step:.5,fmt:v=>roundTo(v,.5)+'%',rnd:[4,14]},
  ]);
}
/* Motion */
{const b=card('motion','Motion');
  const isF=s=>s.mode==='fluid',isS=s=>s.mode==='snappy',isT=s=>s.mode==='transit';
  build(b,[
    {t:'seg',k:'mode',label:'Movement',opts:[['none','Still'],['fluid','Fluid'],['snappy','Snappy'],['transit','Transitional']]},
    {t:'seg',k:'order',label:'Order',opts:[['ltr','Left to right'],['rtl','Right to left'],['centre','Centre out'],['edges','Edges in'],['random','Random']],rnd:['ltr','rtl','centre','edges','random']},
    {t:'seg',k:'anchor',label:'Anchor',opts:[['centre','Centre'],['baseline','Baseline']],rnd:['centre','baseline'],show:s=>s.mode!=='none'||s.vStyle==='stretch'||s.vStyle==='flip'||(s.seq&&s.qStyle==='stretch')},
    {t:'range',k:'fCycles',label:'Cycles per loop',min:1,max:6,step:1,show:isF,rnd:[1,2]},
    {t:'range',k:'fY',label:'Rise',min:0,max:60,step:.5,fmt:em,show:isF,rnd:[2,14]},
    {t:'range',k:'fX',label:'Drift',min:0,max:60,step:.5,fmt:em,show:isF,rnd:[0,8]},
    {t:'range',k:'fRot',label:'Tilt',min:0,max:45,step:.5,fmt:deg,show:isF,rnd:[0,6]},
    {t:'range',k:'fScale',label:'Pulse',min:0,max:60,step:.5,unit:'%',show:isF,rnd:[0,10]},
    {t:'range',k:'fStretch',label:'Stretch',min:0,max:100,step:.5,unit:'%',show:isF,rnd:[0,30]},
    {t:'range',k:'fStagger',label:'Phase spread',min:0,max:2,step:.01,fmt:v=>v.toFixed(2),show:isF,rnd:[.1,1]},
    {t:'range',k:'fSharp',label:'Sharpness',min:0,max:1,step:.01,fmt:pct,show:isF,rnd:[0,.5]},
    {t:'range',k:'sSteps',label:'Steps per loop',min:2,max:16,step:1,show:isS,rnd:[2,8]},
    {t:'toggle',k:'sRest',label:'Return to rest between steps',show:isS,rnd:.6},
    {t:'range',k:'sY',label:'Jump',min:0,max:80,step:.5,fmt:em,show:isS,rnd:[0,24]},
    {t:'range',k:'sX',label:'Shift',min:0,max:80,step:.5,fmt:em,show:isS,rnd:[0,10]},
    {t:'range',k:'sRot',label:'Twist',min:0,max:90,step:.5,fmt:deg,show:isS,rnd:[0,12]},
    {t:'range',k:'sScale',label:'Scale',min:0,max:80,step:.5,unit:'%',show:isS,rnd:[0,15]},
    {t:'range',k:'sStretch',label:'Stretch',min:0,max:150,step:1,unit:'%',show:isS,rnd:[0,60]},
    {t:'range',k:'sUnison',label:'Unison',min:0,max:1,step:.01,fmt:pct,show:isS,rnd:[0,.7]},
    {t:'range',k:'sSnap',label:'Snap length',min:.05,max:1,step:.01,fmt:ofStep,show:isS,rnd:[.15,.5]},
    {t:'range',k:'sOver',label:'Overshoot',min:0,max:4,step:.05,fmt:v=>v.toFixed(2),show:isS,rnd:[0,2.5]},
    {t:'range',k:'sStagger',label:'Stagger',min:0,max:1,step:.01,fmt:pct,show:isS,rnd:[0,.6]},
    {t:'seg',k:'tDir',label:'Direction',opts:[['up','Up'],['down','Down'],['left','Left'],['right','Right']],show:isT,rnd:['up','up','down','left','right']},
    {t:'seg',k:'tEase',label:'Ease',opts:[['expo','Expo'],['cubic','Cubic'],['back','Back'],['linear','Linear']],show:isT,rnd:['expo','expo','cubic','back']},
    {t:'seg',k:'tExit',label:'Exit',opts:[['continue','Carry on'],['reverse','Go back']],show:isT,rnd:['continue','reverse']},
    {t:'seg',k:'tMask',label:'Mask',opts:[['none','None'],['line','Line'],['glyph','Letter']],show:isT,rnd:['line','line','glyph','none']},
    {t:'range',k:'tDist',label:'Distance',min:0,max:200,step:1,fmt:em,show:isT,rnd:[40,120]},
    {t:'range',k:'tIn',label:'In',min:.05,max:.6,step:.01,fmt:ofLoop,show:isT,rnd:[.2,.4]},
    {t:'range',k:'tHold',label:'Hold',min:0,max:.8,step:.01,fmt:ofLoop,show:isT,rnd:[.15,.4]},
    {t:'range',k:'tOut',label:'Out',min:.05,max:.6,step:.01,fmt:ofLoop,show:isT,rnd:[.15,.35]},
    {t:'range',k:'tStagger',label:'Stagger',min:0,max:.95,step:.01,fmt:pct,show:isT,rnd:[.2,.7]},
    {t:'range',k:'tRot',label:'Rotate',min:-90,max:90,step:.5,fmt:deg,show:isT},
    {t:'range',k:'tScale',label:'Scale',min:-100,max:200,step:1,unit:'%',show:isT},
    {t:'seg',k:'tAxis',label:'Scale axis',opts:[['both','Both'],['vertical','Vertical'],['horizontal','Horizontal']],show:s=>isT(s)&&s.tScale!==0},
    {t:'toggle',k:'tFade',label:'Fade',show:isT},
  ]);
  const axOK=()=>{const f=F(eng.baseSlot());return !!(f.axes&&f.axes.length);},axOn=s=>axOK()&&s.axOn;
  const AXf=()=>{const f=F(eng.baseSlot());return f.axes&&(f.axes.find(a=>a.tag===S.axTag)||f.axes[0]);};
  const axFmt=v=>{const a=AXf();return a?String(Math.round(a.min+(a.max-a.min)*v)):pct(v);};
  addCustom(b,axOK,el('div','sub-head','Variable axis'));
  build(b,[
    {t:'toggle',k:'axOn',label:'Animate an axis',show:axOK},
    {t:'segdyn',k:'axTag',label:'Axis',optsFn:()=>{const f=F(eng.baseSlot());return (f.axes||[]).map(a=>[a.tag,a.name]);},show:axOn},
    {t:'range',k:'axFrom',label:'From',min:0,max:1,step:.005,fmt:axFmt,show:axOn,rnd:[0,.4]},
    {t:'range',k:'axTo',label:'To',min:0,max:1,step:.005,fmt:axFmt,show:axOn,rnd:[.6,1]},
    {t:'range',k:'axCycles',label:'Cycles per loop',min:1,max:6,step:1,show:axOn,rnd:[1,2]},
    {t:'range',k:'axStagger',label:'Phase spread',min:0,max:2,step:.01,fmt:v=>v.toFixed(2),show:axOn,rnd:[0,1]},
    {t:'seg',k:'axFeel',label:'Feel',opts:[['smooth','Smooth'],['snappy','Snappy']],show:axOn,rnd:['smooth','snappy']},
  ]);
}
/* Variants */
let pickHost;
{const b=card('variants','Variants');
  const on=s=>s.vMode!=='off',rnd=s=>on(s)&&s.vPattern==='random',cyc=s=>on(s)&&s.vPattern==='cycle';
  build(b,[{t:'seg',k:'vMode',label:'Swap',opts:[['off','Off'],['alts','Alternates'],['weights','Styles'],['both','Both']]}]);
  const note=el('p','hint');addCustom(b,null,note);window.variantNote=note;
  build(b,[
    {t:'seg',k:'vPattern',label:'Pattern',opts:[['cycle','Cycle in order'],['random','Random']],show:on,rnd:['cycle','random']},
    {t:'seg',k:'vStyle',label:'Change',opts:[['roll','Roll'],['stretch','Stretch'],['cut','Cut'],['fade','Fade'],['flip','Flip']],show:on,rnd:['roll','roll','stretch','cut','fade','flip']},
    {t:'range',k:'vSteps',label:'Changes per loop',min:1,max:24,step:1,show:on,rnd:[3,10]},
    {t:'range',k:'vChance',label:'Amount',min:0,max:1,step:.01,fmt:pct,show:rnd,rnd:[.3,.8]},
    {t:'range',k:'vDur',label:'Change length',min:.05,max:1,step:.01,fmt:ofStep,show:on,rnd:[.2,.6]},
    {t:'range',k:'vStagger',label:'Stagger',min:0,max:1,step:.01,fmt:pct,show:on,rnd:[0,.6]},
    {t:'toggle',k:'vOffset',label:'Offset repeated letters',show:cyc},
    {t:'toggle',k:'vRest',label:'Return to default between changes',show:rnd},
    {t:'toggle',k:'vReflow',label:'Respace as widths change',show:on},
  ]);
  const head=el('div','sub-head','Glyphs');const hint=el('p','hint');
  const reset=el('button','pill small','Use all');reset.onclick=()=>{S.picks={};optCache.clear();autosave();dirty=true;schedulePicker(0);};
  const hr=el('div','switch-row');hr.append(head,reset);
  const wrap=el('div');wrap.append(hr,hint);pickHost=el('div','pick-host');wrap.append(pickHost);
  addCustom(b,null,wrap);window.pickHint=hint;window.pickReset=reset;window.pickWrap=wrap;
}
/* Sequence */
{const b=card('sequence','Sequence',s=>s.seq);
  const r=s=>s.qStyle==='roll',st=s=>s.qStyle==='stretch',g=s=>s.qStyle==='glide';
  build(b,[
    {t:'seg',k:'qStyle',label:'Transition',opts:[['roll','Roll'],['stretch','Stretch'],['glide','Glide'],['fade','Fade'],['cut','Cut']]},
    {t:'hint',text:'Each text gets an equal share of the loop, then hands over to the next.',show:s=>!g(s)},
    {t:'hint',text:'Glide stacks your texts as a list. Each new one arrives at the bottom and the stack moves up.',show:g},
    {t:'seg',k:'qClear',label:'Handover',opts:[[true,'One after the other'],[false,'Together']],show:s=>!g(s)},
    {t:'seg',k:'qDir',label:'Direction',opts:[['up','Up'],['down','Down']],show:r,rnd:['up','down']},
    {t:'seg',k:'qAxis',label:'Axis',opts:[['vertical','Vertical'],['horizontal','Horizontal']],show:st},
    {t:'seg',k:'qEase',label:'Feel',opts:[['snappy','Snappy'],['smooth','Smooth'],['elastic','Elastic']],show:s=>s.qStyle!=='fade'&&s.qStyle!=='cut',rnd:['snappy','smooth','elastic']},
    {t:'range',k:'qDur',label:'Change length',min:.05,max:1,step:.01,fmt:v=>pct(v)+' of each text',rnd:[.25,.5]},
    {t:'range',k:'qStagger',label:'Stagger',min:0,max:.95,step:.01,fmt:pct,show:s=>!g(s),rnd:[0,.5]},
    {t:'range',k:'qStack',label:'Items in stack',min:2,max:8,step:1,show:g},
    {t:'range',k:'qTrail',label:'Dim older items',min:0,max:1,step:.01,fmt:pct,show:g},
  ]);
}
/* Repeat */
{const b=card('repeat','Repeat');const on=s=>s.rOn&&!glide(s);
  build(b,[
    {t:'toggle',k:'rOn',label:'Repeat rows'},
    {t:'hint',text:'Repeat is paused while the sequence uses Glide.',show:s=>s.rOn&&glide(s)},
    {t:'range',k:'rRows',label:'Rows in frame',min:1,max:16,step:1,show:on,rnd:[2,8]},
    {t:'hint',text:'Rows stretch to the full width when Stretch to fill is on in Layout.',show:on},
    {t:'range',k:'rGap',label:'Row gap',min:0,max:100,step:1,fmt:v=>Math.round(v)+'% em',show:on},
    {t:'seg',k:'rMix',label:'Rows show',opts:[['alternate','Alternating texts'],['same','The same text']],show:s=>on(s)&&s.seq},
    {t:'range',k:'rScroll',label:'Scroll',min:-4,max:4,step:1,fmt:perLoop,show:on,rnd:[-2,2]},
    {t:'range',k:'rMarq',label:'Slide sideways',min:-4,max:4,step:1,fmt:perLoop,show:on,rnd:[-1,1]},
    {t:'toggle',k:'rAlt',label:'Alternate rows slide opposite ways',show:s=>on(s)&&Math.round(s.rMarq)!==0},
    {t:'range',k:'rDelay',label:'Row offset',min:0,max:.5,step:.005,fmt:ofLoop,show:on,rnd:[0,.1]},
    {t:'hint',text:'Row offset delays each row a little, so changes ripple down the frame.',show:s=>on(s)&&s.rDelay>0},
  ]);
}
/* Image */
let imgNameEl,imgRemove;
{const b=card('image','Image');
  const row=el('div','img-row');imgNameEl=el('div','slot-name');const ld=el('button','pill small','Load');imgRemove=el('button','pill small','Remove');
  ld.onclick=()=>$('#imgfile').click();imgRemove.onclick=clearImage;row.append(imgNameEl,ld,imgRemove);b.append(row);
  const has=()=>!!img;
  build(b,[
    {t:'seg',k:'iPlace',label:'Place',opts:[['behind','Behind type'],['above','Above type'],['inside','Inside type']],show:has},
    {t:'seg',k:'iBlend',label:'Blend',opts:[['normal','Normal'],['multiply','Multiply'],['screen','Screen'],['overlay','Overlay'],['difference','Difference']],show:has},
    {t:'range',k:'iScale',label:'Scale',min:.2,max:3,step:.01,fmt:v=>v.toFixed(2)+'×',show:has},
    {t:'range',k:'iOpacity',label:'Opacity',min:0,max:1,step:.01,fmt:pct,show:has},
    {t:'range',k:'iSway',label:'Sway',min:0,max:45,step:.5,fmt:deg,show:has},
    {t:'range',k:'iRise',label:'Rise',min:0,max:25,step:.5,unit:'%',show:has},
    {t:'hint',text:'Images stay in this browser and aren\u2019t saved in presets. SVG export leaves the image out.',show:has},
  ]);
  window.refreshImageCard=()=>{imgNameEl.textContent=img?imgName:'Add a PNG, JPG or WebP to blend with the type';imgNameEl.style.whiteSpace=img?'nowrap':'normal';imgNameEl.style.fontSize=img?'':'12px';imgNameEl.style.color=img?'':'var(--muted)';imgRemove.hidden=!img;};
}
/* Colour */
{const b=card('colour','Colour');
  const row=el('div','ctl btn-row');
  [['Black on white','#000000','#ffffff'],['White on black','#ffffff','#000000'],['Black on grey','#000000','#f2f2f2']].forEach(([t,ink,bg])=>{const p=el('button','pill small',t);p.onclick=()=>{S.ink=ink;S.bg=bg;set('transparent',false);schedulePicker(0);};row.append(p);});
  const sw=el('button','pill small','Swap');sw.onclick=()=>{const t=S.ink;S.ink=S.bg;set('bg',t);};row.append(sw);
  addCustom(b,null,row);
  build(b,[
    {t:'colour',k:'ink',label:'Type'},
    {t:'colour',k:'bg',label:'Background'},
    {t:'toggle',k:'transparent',label:'Transparent background'},
    {t:'hint',text:'Transparency applies to PNG, SVG and WebM. GIFs always use the background colour.',show:s=>s.transparent},
    {t:'seg',k:'style',label:'Render',opts:[['fill','Fill'],['outline','Outline']]},
    {t:'range',k:'stroke',label:'Stroke',min:2,max:120,step:1,fmt:v=>Math.round(v)+'/1000 em',show:s=>s.style==='outline'},
  ]);
}
/* Loop */
{const b=card('loop','Loop');
  build(b,[{t:'range',k:'dur',label:'Length',min:1,max:20,step:.1,fmt:v=>v.toFixed(1)+' s'}]);
  const row=el('div','ctl switch-row');const lab=el('span');const btn=el('button','pill small','New seed');btn.onclick=()=>{pushUndo();set('seed',(Math.random()*99999|0)+1);};
  row.append(lab,btn);addCustom(b,null,row).update=()=>{lab.textContent='Seed '+S.seed;};
  b.append(el('p','hint','The seed fixes the random choices in Snappy, Variants and Random order, so a look you like stays put.'));
}
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
}
/* Presets */
const PRESET_BASE={mode:'none',vMode:'off',rOn:false,stretch:false,axOn:false,qClear:true};
const BUILTIN={
  Hover:{mode:'fluid',order:'ltr',anchor:'centre',fCycles:1,fY:5,fX:2.5,fRot:1.5,fScale:0,fStretch:0,fStagger:.6,fSharp:0},
  Tick:{mode:'snappy',order:'ltr',anchor:'baseline',sSteps:4,sRest:true,sY:6,sX:0,sRot:0,sScale:0,sStretch:45,sUnison:.25,sSnap:.3,sOver:2.2,sStagger:.3},
  Conveyor:{mode:'transit',order:'ltr',tDir:'up',tDist:100,tIn:.32,tHold:.3,tOut:.26,tStagger:.45,tExit:'continue',tMask:'line',tFade:false,tRot:0,tScale:0,tEase:'expo'},
  Cycle:{vMode:'alts',vPattern:'cycle',vSteps:6,vStyle:'roll',vDur:.45,vStagger:.25,vOffset:true,vReflow:true,order:'ltr'},
  Repeater:{rOn:true,rRows:4,rGap:0,stretch:true,rScroll:1,rDelay:.06,rMarq:0,rMix:'alternate',margin:0,qStyle:'roll',qEase:'snappy',qDur:.3,qStagger:.2},
  Glide:{seq:true,qStyle:'glide',qEase:'smooth',qDur:.45,qStack:4,qTrail:.55,align:'right'},
  Stretch:{seq:true,qStyle:'stretch',qAxis:'vertical',qEase:'elastic',qDur:.45,qStagger:.15,anchor:'baseline'},
};
{const b=card('presets','Presets');
  b.append(el('div','sub-head','Starting points'));
  const r=el('div','btn-row');Object.keys(BUILTIN).forEach(n=>{const p=el('button','pill small',n);p.onclick=()=>{pushUndo();Object.assign(S,PRESET_BASE,BUILTIN[n]);
    if(S.seq&&S.texts.filter(t=>t.trim()).length<2){if(S.texts.length<2)S.texts.push('');toast('Add a second text to see the sequence.');}
    if(S.vMode!=='off'&&!anyLoaded())toast('Load your font to see its alternates.');
    phase=0;autosave();reloadAll();};r.append(p);});b.append(r);
  b.append(el('div','sub-head','Saved'));
  const row=el('div','btn-row');const name=el('input');name.type='text';name.placeholder='Name this look';name.setAttribute('aria-label','Preset name');name.style.flex='1';
  const sv=el('button','pill small primary','Save');row.append(name,sv);b.append(row);
  const list=el('div','preset-list');b.append(list);
  const getP=()=>LS.get('presets')||[];
  const draw=()=>{list.textContent='';const ps=getP();if(!ps.length){list.append(el('p','hint','Saved looks keep every setting, including the texts. Fonts and images stay loaded separately.'));return;}
    ps.forEach((p,i)=>{const it=el('div','preset-item'),nm=el('span',null,p.name),ld=el('button','pill small','Load'),del=el('button','pill small','Delete');
      ld.onclick=()=>{pushUndo();S=Object.assign(fresh(),sanitise(p.settings));eng.use(S);autosave();reloadAll();toast(`Loaded ${p.name}`);};
      del.onclick=()=>{const q=getP();q.splice(i,1);LS.set('presets',q);draw();};it.append(nm,ld,del);list.append(it);});};
  sv.onclick=()=>{const n=name.value.trim()||('Look '+(getP().length+1));const q=getP().filter(p=>p.name!==n);q.unshift({name:n,settings:JSON.parse(JSON.stringify(S))});LS.set('presets',q);name.value='';draw();toast(`Saved ${n}`);};
  draw();
  const r2=el('div','ctl btn-row');const ex=el('button','pill small','Save settings file'),im=el('button','pill small','Load settings file');r2.append(ex,im);b.append(r2);
  ex.onclick=()=>saveFile(slug()+'-settings.json',new Blob([JSON.stringify({rubato:2,settings:S},null,2)],{type:'application/json'}));
  im.onclick=()=>$('#jsonfile').click();
  $('#jsonfile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const j=JSON.parse(await f.text());pushUndo();S=Object.assign(fresh(),sanitise(j.settings||j));eng.use(S);autosave();reloadAll();toast('Settings loaded');}catch(err){toast("That file isn't a Rubato settings file.");}};
}
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
function togglePick(ch,k){
  let sel=charOptions(ch).sel.map(vkey);
  if(S.vMode==='off'){sel=[k].concat(sel.filter(x=>x!==k));}
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
  hint.textContent=S.vMode==='off'?'Tap a glyph to choose which version shows. Turn on Variants to animate between them.':'Tap glyphs to include or leave them out. They change in the order you add them; double-click one to make it the resting glyph.';
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
  $('#note').textContent=anyLoaded()?'':'Demo face. Load your font in the Font panel.';
}

/* ---------------- undo + randomise ---------------- */
const undoStack=[];
function pushUndo(){undoStack.push(JSON.stringify(S));if(undoStack.length>30)undoStack.shift();$('#undo').disabled=false;}
function undo(){const s=undoStack.pop();if(!s)return;S=Object.assign(fresh(),sanitise(JSON.parse(s)));eng.use(S);autosave();reloadAll();$('#undo').disabled=!undoStack.length;}
$('#undo').onclick=undo;
const RAND_GROUPS=[['motion','Motion'],['variants','Variants'],['sequence','Sequence'],['repeat','Repeat'],['layout','Layout'],['colour','Colour']];
const RAND0={level:'gentle',groups:{motion:true,variants:true,sequence:true,repeat:true,layout:false,colour:false}};
const RS=Object.assign({},RAND0,LS.get('rand')||{});RS.groups=Object.assign({},RAND0.groups,RS.groups||{});
const NEVER=new Set(['seq','rOn','aspect','cw','ch','size','baseSlot','tab','transparent','qClear','bg','ink','style','stroke']);
const COLOUR_PAIRS=[['#ffffff','#000000'],['#000000','#ffffff'],['#f2f2f2','#000000'],['#5B23F0','#FFF35C'],['#FF4F1F','#000000'],['#1F2BFF','#D9D6F2'],['#000000','#FFF35C'],['#E9E4D8','#1C1C1E']];
const rr=(a,b)=>a+Math.random()*(b-a),pickA=a=>a[Math.floor(Math.random()*a.length)];
function hslHex(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return'#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');}
function randomise(){
  pushUndo();const full=RS.level==='full',G=RS.groups,grp=c=>c.d.group==='text'?'layout':c.d.group;
  const live=c=>c.d.k&&G[grp(c)]&&!NEVER.has(c.d.k)&&(grp(c)!=='sequence'||S.seq)&&(grp(c)!=='repeat'||S.rOn);
  if(G.motion)S.mode=full?pickA(['none','fluid','snappy','transit']):pickA(['fluid','snappy','transit']);
  if(G.variants){const canAlt=anyLoaded()&&F(baseSlot()).altChars.length>0,canSty=availSlots().length>1;
    const on=[].concat(canAlt?['alts']:[],canSty?['weights']:[],canAlt&&canSty?['both']:[]);
    S.vMode=!on.length?'off':full?pickA(['off'].concat(on)):(G.motion&&S.mode!=='none'&&Math.random()<.5)?'off':pickA(on);}
  if(G.sequence&&S.seq)S.qStyle=pickA(full?['roll','stretch','glide','fade','cut']:['roll','roll','stretch','glide','fade']);
  for(const c of controls){const d=c.d;if(!live(c)||['mode','vMode','qStyle'].includes(d.k))continue;
    if(!full&&d.show&&!d.show(S))continue;
    if(d.t==='range'){if(full)S[d.k]=roundTo(rr(d.min,d.max),d.step);else if(Array.isArray(d.rnd))S[d.k]=roundTo(rr(d.rnd[0],d.rnd[1]),d.step);}
    else if(d.t==='seg'||d.t==='segdyn'){const opts=d.t==='segdyn'?d.optsFn():d.opts;if(!opts.length)continue;if(full)S[d.k]=pickA(opts)[0];else if(Array.isArray(d.rnd))S[d.k]=pickA(d.rnd);}
    else if(d.t==='toggle'){if(full)S[d.k]=Math.random()<.5;else if(typeof d.rnd==='number')S[d.k]=Math.random()<d.rnd;}}
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
  pop.append(el('div','rp-title','Randomise'),lanes,lh,el('div','sub-head','Include'),list,go,el('p','hint','Press R to randomise with these settings, and \u2318Z or Ctrl+Z to undo.'));$('#stage').append(pop);
  function paint(){lv.forEach(([v,b])=>b.setAttribute('aria-pressed',RS.level===v));tg.forEach(([k,b])=>b.setAttribute('aria-checked',!!RS.groups[k]));
    lh.textContent=RS.level==='full'?'Any value a slider allows, plus every option and switch in the areas you include. Expect some wild results.':'Values stay in ranges that usually look good, and most switches are left as you set them.';}
  paint();
  const opt=$('#randOpt'),close=()=>{pop.hidden=true;opt.setAttribute('aria-expanded','false');};
  opt.onclick=e=>{e.stopPropagation();if(pop.hidden){pop.hidden=false;opt.setAttribute('aria-expanded','true');lanes.querySelector('button').focus();}else close();};
  document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!pop.contains(e.target)&&!opt.contains(e.target))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden){close();opt.focus();}});
  window.closeRandPop=close;
}
$('#rand').onclick=randomise;
window.addEventListener('keydown',e=>{
  const tg=e.target,typing=tg&&(tg.tagName==='TEXTAREA'||(tg.tagName==='INPUT'&&/text|number/.test(tg.type)));
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!typing){e.preventDefault();undo();return;}
  if(typing||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.code==='Space'&&tg.tagName!=='BUTTON'){e.preventDefault();setPlaying(!playing);}
  else if(e.key==='r'||e.key==='R')randomise();
});
/* ---------------- start ---------------- */
function appStart(){refreshFontCard();refreshImageCard();renderTextFields();applyTab();refreshAll();fitCanvas();refreshPicker();}
