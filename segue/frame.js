/* Segue – the frame. The interface system's parts (shared/UI.md): cards that fold and say
   what's set, folds, the system slider, segmented controls, toggles, colours, menus, sheets
   from the island and the Presets capsule, Preview, tooltips, light and dark, the panel's
   width, status. Written to match shared/core.js and core-end.js part for part; Segue keeps
   its own copy because the shared core is still tied to Rubato's settings and type engine
   (as Tutti does with tutti/frame.js). Move onto the core when that's split.
   0.5: the round 4 kit (shared/kit.css, shared/UI.md) – Segue first. Sliders drag from where you
   press (Shift for fine), click to jump, type the number; small counts are steppers; a choice that
   won't fit a row becomes a menu; the white highlight slides to what you pick; a red dot marks
   any row that's moved from where it started (click it to put it back) and a section can be put
   back at once; every change to a setting undoes (⌘Z) and redoes (⇧⌘Z). */
const LS={get(k){try{return JSON.parse(localStorage.getItem('segue:'+k))}catch(e){return null}},
  set(k,v){try{localStorage.setItem('segue:'+k,JSON.stringify(v))}catch(e){}}};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const panel=$('#panel'),controls=[];
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
let dirty=true,saveT=0;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const ICON={
  plus:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M2 6h8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  minus:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  reset:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.6 6a3.4 3.4 0 1 0 1-2.4M2.4 1.8v2h2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  shuffle:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 3.5h2c2.5 0 3 5 5.5 5h1.5M1.5 8.5h2c1 0 1.6-.8 2.1-1.8M7 4.3c.5-.5 1.1-.8 2-.8h1.5M9.2 2l1.5 1.5-1.5 1.5M9.2 7l1.5 1.5L9.2 10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  clear:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 3.5h7M5 3.5V2.4h2v1.1M3.5 3.5l.5 6.1h4l.5-6.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  clip:'<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M6 3.6V6l1.6 1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  swap:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.2h7.2M7.4 2.4l1.8 1.8-1.8 1.8M10 7.8H2.8M4.6 6l-1.8 1.8 1.8 1.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  stop:'<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1.2" fill="currentColor"/></svg>',
  grip:'<svg viewBox="0 0 6 12" aria-hidden="true"><g fill="currentColor"><circle cx="1.5" cy="2" r="1"/><circle cx="4.5" cy="2" r="1"/><circle cx="1.5" cy="6" r="1"/><circle cx="4.5" cy="6" r="1"/><circle cx="1.5" cy="10" r="1"/><circle cx="4.5" cy="10" r="1"/></g></svg>'};
/* ---------------- undo: every change to a setting, a step at a time ----------------
   A drag, a run of arrow presses or typing in a field counts as one step. Presets, a row or a
   section put back, and media removed are a step each too (see pushUndo in app.js). */
const UNDO=[],REDO=[];let replaying=false,groupOpen=null,gestureN=0,gesture=0;
const same=(a,b)=>a===b||(typeof a==='number'&&typeof b==='number'&&Math.abs(a-b)<=1e-6*Math.max(1,Math.abs(a),Math.abs(b)));
function labelOf(k){const c=controls.find(c=>c.d&&c.d.label&&(c.d.k===k||(c.d.keys&&c.d.keys.includes(k))));return c?c.d.label:k;}
function record(k,prev,next){
  if(replaying||same(prev,next))return;REDO.length=0;
  if(groupOpen){if(k in groupOpen.ch)groupOpen.ch[k][1]=next;else groupOpen.ch[k]=[prev,next];return;}
  const now=performance.now(),top=UNDO[UNDO.length-1];
  if(top&&!top.fn&&!top.closed&&Object.keys(top.ch).length===1&&k in top.ch&&((gesture&&top.g===gesture)||now-top.t<800)){
    top.ch[k][1]=next;top.t=now;if(same(top.ch[k][0],next))UNDO.pop();return;}
  UNDO.push({ch:{[k]:[prev,next]},label:labelOf(k),t:now,g:gesture});if(UNDO.length>300)UNDO.shift();}
function group(label,fn){const g={ch:{},label,t:performance.now(),closed:true};groupOpen=g;try{fn();}finally{groupOpen=null;}
  if(Object.keys(g.ch).length){REDO.length=0;UNDO.push(g);}return g;}
function pushUndo(e){e.ch=e.ch||{};e.t=performance.now();e.closed=true;REDO.length=0;UNDO.push(e);if(UNDO.length>300)UNDO.shift();}
function applyStep(e,w){replaying=true;try{for(const k in e.ch){S[k]=e.ch[k][w];onSet(k);}if(e.extra)e.extra(w);}finally{replaying=false;}
  dirty=true;clearTimeout(saveT);saveT=setTimeout(saveSettings,300);easeAll();refreshAll();}
async function undo(){const e=UNDO.pop();if(!e){toast('Nothing to undo');return;}if(e.fn)await e.fn(0);else applyStep(e,0);REDO.push(e);toast(`Undone – ${e.label}`);}
async function redo(){const e=REDO.pop();if(!e){toast('Nothing to redo');return;}if(e.fn)await e.fn(1);else applyStep(e,1);UNDO.push(e);toast(`Redone – ${e.label}`);}
function set(k,v,silent){record(k,S[k],v);S[k]=v;dirty=true;onSet(k);clearTimeout(saveT);saveT=setTimeout(saveSettings,300);if(!silent)refreshAll();}
/* where each setting started: the preset in use, else the defaults (baseOf in app.js) */
const base=k=>{try{return typeof baseOf==='function'?baseOf(k):D[k];}catch(e){return D[k];}};
const moved=k=>k in D&&!same(S[k],base(k));
/* motion: numbers roll to their new value; sliders glide to a typed or undone one */
function roll(v,text,dir){if(v.textContent===text)return;v.textContent=text;if(!document.body.classList.contains('kit-live')||reduceMotion.matches)return;
  v.classList.remove('roll','down');void v.offsetWidth;v.classList.add('roll');if(dir<0)v.classList.add('down');}
document.addEventListener('animationend',e=>{if(e.target.classList&&e.target.classList.contains('roll'))e.target.classList.remove('roll','down');});
function ease(box){box.classList.add('ease');clearTimeout(box._et);box._et=setTimeout(()=>box.classList.remove('ease'),reduceMotion.matches?0:420);}
function easeAll(root){(root||document).querySelectorAll('.rng-box').forEach(ease);}
/* ---------------- cards and folds ---------------- */
const collapsed=LS.get('collapsed')||{canvas:true,motion:false,shapes:true,captions:true,overlay:true};
let curGroup='';
const CHEV='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 5.5 7 9l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function card(id,title,show){curGroup=id;
  const c=el('section','card'+(collapsed[id]?' collapsed':''));c.dataset.id=id;const h=el('h2'),b=el('button','card-toggle');
  const t=el('span',null,title),num=el('span','num'),dot=el('span','cdot'),sm=el('span','sum'),ch=el('span','chev');ch.innerHTML=CHEV;b.append(t,num,dot,sm,ch);b.setAttribute('aria-expanded',!collapsed[id]);
  const rs=el('button','pill small reset');rs.type='button';rs.innerHTML=ICON.reset+'<span>Reset</span>';rs.setAttribute('aria-label','Put '+title+' back');rs.dataset.tip='Put everything here back to where it started';
  rs.onclick=e=>{e.stopPropagation();resetCard(c,title);};
  const anim=el('div','card-anim'),inner=el('div'),body=el('div','card-body');inner.append(body);anim.append(inner);if(collapsed[id])anim.hidden=true;
  b.onclick=()=>{const opening=c.classList.contains('collapsed');collapsed[id]=!opening;b.setAttribute('aria-expanded',opening);LS.set('collapsed',collapsed);clearTimeout(anim._t);
    if(opening){anim.hidden=false;void anim.offsetHeight;c.classList.remove('collapsed');requestAnimationFrame(()=>{syncRanges(c);c.querySelectorAll('.seg').forEach(fitSeg);});}
    else{c.classList.add('collapsed');anim._t=setTimeout(()=>{if(c.classList.contains('collapsed'))anim.hidden=true;},reduceMotion.matches?0:380);}};
  h.append(b,rs);c.append(h,anim);panel.append(c);
  controls.push({d:{show:show||null},w:c,update(){},card:id});return body;}
const FOLDS=LS.get('folds')||{};
function fold(parent,id,title,show,shut,sum){
  const box=el('div','fold'),head=el('button','fold-head'),label=el('span',null,title),chev=el('span','chev'),body=el('div','fold-body');head.type='button';chev.innerHTML=CHEV;
  const open=FOLDS[id]!=null?FOLDS[id]:!shut,paint=o=>{body.hidden=!o;head.setAttribute('aria-expanded',o);if(o)requestAnimationFrame(()=>syncRanges(body));};paint(open);
  head.onclick=()=>{const o=body.hidden;FOLDS[id]=o;LS.set('folds',FOLDS);paint(o);};
  head.append(label,el('span','cdot'),chev);head._sum=sum||null;box.append(head,body);addCustom(parent,show||null,box);return body;}
const SUMMARY={};
function optLabel(opts,v){const o=(opts||[]).find(o=>o[0]===v);return o?o[1]:null;}
function autoSummary(id,inside){
  const out=[];let switches=0;
  for(const c of controls){const d=c.d;if(!d||c.card||!d.k||!c.w||!c.w.isConnected||c.w.hidden)continue;if(inside?!inside.contains(c.w):d.group!==id)continue;
    let t=null;
    if(Array.isArray(d.opts))t=optLabel(d.opts,S[d.k]);
    else if(typeof d.optsFn==='function'){try{t=optLabel(d.optsFn(),S[d.k]);}catch(e){}}
    else if(d.label&&c.w.classList&&c.w.classList.contains('toggle-row')){switches++;if(S[d.k]===true)t=d.label;}
    if(t&&/^(off|on|none|auto)$/i.test(t)&&d.label)t=d.label+' '+t.toLowerCase();
    if(t&&!out.includes(t))out.push(t);if(out.length>=(inside?1:3))break;}
  return out.length?out.join(' · '):switches?'Off':'';}
function refreshSummaries(){document.querySelectorAll('section.card[data-id]').forEach(sec=>{const sm=sec.querySelector(':scope>h2 .sum');if(!sm)return;
  let t='';try{t=SUMMARY[sec.dataset.id]?SUMMARY[sec.dataset.id](S):autoSummary(sec.dataset.id);}catch(e){}if(sm.textContent!==(t||''))sm.textContent=t||'';});
  document.querySelectorAll('.fold-head').forEach(hd=>{const body=hd.nextElementSibling;if(!body)return;let sm=hd.querySelector('.sum');
    if(!sm){sm=el('span','sum');hd.insertBefore(sm,hd.querySelector('.chev'));}let t='';try{t=hd._sum?hd._sum(S):autoSummary(null,body);}catch(e){}if(sm.textContent!==t)sm.textContent=t;});
  let n=0;panel.querySelectorAll(':scope>section.card').forEach(sec=>{const nm=sec.querySelector(':scope>h2 .num');if(nm&&!sec.hidden){const v=String(++n);if(nm.textContent!==v)nm.textContent=v;}});}
/* ---------------- sheets, island, Presets, Preview ---------------- */
const SHEETS={};
const sheetObs=new MutationObserver(ms=>{for(const m of ms){const n=m.target;if(!n.hidden)for(const k in SHEETS)if(SHEETS[k].el!==n)SHEETS[k].el.hidden=true;}syncSheets();});
function addSheet(name,node,opener){
  node.classList.add('sheet');node.dataset.sheet=name;node.hidden=true;
  $(name==='presets'?'#pcapSheets':'#islandSheets').append(node);SHEETS[name]={el:node,opener:opener||(name==='presets'?$('#pcapOpen'):name==='export'?$('#exportOpen'):null)};
  if(name==='presets')$('#pcap').hidden=false;if(name==='export')$('#exportOpen').hidden=false;
  sheetObs.observe(node,{attributes:true,attributeFilter:['hidden']});return node;}
/* a card that was shut in the panel once (saved in segue:collapsed) must still open in full as a sheet */
function cardToSheet(body,name){const sec=body.closest('section');sec.classList.remove('card','collapsed');
  /* a sheet holds the card's body itself – no open-and-shut wrapper (as 0.4, which Safari laid out fine) */
  const anim=sec.querySelector(':scope>.card-anim');if(anim){clearTimeout(anim._t);sec.append(body);anim.remove();}const ent=controls.find(c=>c.w===sec);if(ent)ent.d.show=null;return addSheet(name,sec);}
function openSheet(name){if(!SHEETS[name])return;for(const k in SHEETS)SHEETS[k].el.hidden=k!==name;syncSheets();}
function closeSheets(){for(const k in SHEETS)SHEETS[k].el.hidden=true;syncSheets();}
const anySheet=()=>Object.values(SHEETS).some(s=>!s.el.hidden);
function syncSheets(){
  const open={island:false,pcap:false};
  for(const k in SHEETS){const s=SHEETS[k],o=!s.el.hidden;open[k==='presets'?'pcap':'island']||=o;if(s.opener)s.opener.setAttribute('aria-expanded',o);}
  $('#island').classList.toggle('open',open.island);$('#pcap').classList.toggle('open',open.pcap);layoutUI();
  if(open.island||open.pcap)requestAnimationFrame(()=>{syncRanges(document);layoutUI();});}
function islMore(){const m=$('#islandMain');if(m)m.classList.toggle('more',innerWidth<=860&&m.scrollLeft+m.clientWidth<m.scrollWidth-1);}
function layoutUI(){
  const app=$('.app'),isl=$('#island'),pc=$('#pcap');if(!app||!isl)return;
  if(innerWidth<=860){isl.style.left='';islMore();return;}
  const g=12,W=app.clientWidth,away=app.classList.contains('preview')&&!app.classList.contains('peek'),pw=away?0:$('#panelBox').offsetWidth;
  const L=away?g:g*2+pw,R=W-g;let iw=isl.querySelector('.island-in').offsetWidth;if(isl.classList.contains('open'))iw=Math.max(iw,340);
  iw=Math.min(iw,R-L);let limit=R;if(pc&&!pc.hidden){let w=pc.querySelector('.pc-row').offsetWidth;if(pc.classList.contains('open'))w=Math.max(w,340);limit=R-w-8;}
  let x=(L+R)/2;if(x+iw/2>limit)x=limit-iw/2;if(x-iw/2<L)x=L+iw/2;isl.style.left=Math.round(x)+'px';}
const ICON_EXPAND='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M8.5 2.5h3v3M11.5 2.5 7.8 6.2M5.5 11.5h-3v-3M2.5 11.5l3.7-3.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_COLLAPSE='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M11.5 5.5h-3v-3M8.5 5.5l3.3-3.3M2.5 8.5h3v3M5.5 8.5l-3.3 3.3" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function setPanel(open){const app=$('.app');app.classList.toggle('peek',!!open);const p=$('#panelBtn');if(p){p.setAttribute('aria-expanded',!!open);const t=open?'Hide the panel':'Show the panel';p.dataset.tip=t;p.setAttribute('aria-label',t);}layoutUI();}
function setPreview(on){$('.app').classList.toggle('preview',on);setPanel(false);const b=$('#previewBtn');if(!b)return;b.setAttribute('aria-pressed',on);b.innerHTML=on?ICON_COLLAPSE:ICON_EXPAND;
  const t=on?'Fit to the clear space – F':'Preview – fill the window – F';b.dataset.tip=t;b.setAttribute('aria-label',t);requestAnimationFrame(fitCanvas);}
window.ensembleUI={open:openSheet,close:closeSheets,preview:setPreview,
  reveal(n){const s=n&&n.closest&&n.closest('.sheet');if(s&&s.hidden)openSheet(s.dataset.sheet);return true;}};
/* ---------------- controls ---------------- */
function syncRange(box){const inp=box.querySelector('input[type=range]');if(!inp)return;
  const mn=inp.min===''?0:+inp.min,mx=inp.max===''?100:+inp.max,sp=mx>mn?mx-mn:1,p=clamp((+inp.value-mn)/sp,0,1);box.style.setProperty('--p',p);
  const z=mn<0&&mx>0?-mn/sp:0;box.style.setProperty('--z',z);box.classList.toggle('from-start',z===0);
  const ctl=box.parentElement,bv=ctl&&ctl.dataset.def!=null?+ctl.dataset.def:ctl&&ctl.dataset.k?+base(ctl.dataset.k):NaN;
  if(Number.isFinite(bv))box.style.setProperty('--b',clamp((bv-mn)/sp,0,1));
  const w=box.offsetWidth,tick=box.querySelector('.rng-tick');if(!w||!tick)return;const x=5+(w-10)*p,head=box.querySelector('.ctl-head');let over=false;
  /* split only over the words themselves – the label's text and the value, not the hidden ? or empty space */
  if(head){const bl=box.getBoundingClientRect().left;for(const e of head.children){if(!e.offsetWidth||e.classList.contains('cx')||e.classList.contains('q'))continue;
    let l,r;if(e.tagName==='LABEL'&&e.firstChild){const rg=document.createRange();rg.selectNodeContents(e);const rr=rg.getBoundingClientRect();l=rr.left-bl;r=rr.right-bl;}
    else{l=head.offsetLeft+e.offsetLeft;r=l+e.offsetWidth;}
    if(x>l-4&&x<r+4){over=true;break;}}}
  tick.classList.toggle('split',over);}
function syncRanges(root){(root||document).querySelectorAll('.rng-box').forEach(syncRange);}
function upgradeRange(inp){const ctl=inp.parentElement;if(!ctl||!ctl.classList.contains('ctl')||inp.closest('.rng-box'))return;
  const head=ctl.querySelector(':scope>.ctl-head'),box=el('div','rng-box');ctl.classList.add('rng');ctl.insertBefore(box,head||inp);
  box.append(el('span','rng-fill'),el('span','rng-notch'),el('span','rng-tick'));if(head)box.append(head);box.append(inp);
  inp.addEventListener('input',()=>syncRange(box));
  box.addEventListener('dblclick',e=>{if(e.target.closest('.val,.q'))return;const l=box.querySelector('label');if(l&&l.ondblclick){l.ondblclick();ease(box);}});
  const lim=()=>[inp.min===''?0:+inp.min,inp.max===''?100:+inp.max,+inp.step||1];
  const put=v=>{const [mn,mx,st]=lim();v=clamp(v,mn,mx);v=+(Math.round((v-mn)/st)*st+mn).toFixed(6);v=clamp(v,mn,mx);
    if(v!==+inp.value){inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}));}};
  /* drag from wherever you press – it moves by how far you go, not to where you are; Shift is ten times finer.
     A press that doesn't move jumps there. It catches for a moment where it started (the notch). */
  /* The ? sits inside the bar: a press on it that moves drags like anywhere else; one that doesn't shows its tip. */
  box.addEventListener('pointerdown',e=>{if(e.button||e.target.closest('.val,.val-in,.cx'))return;const onQ=!!e.target.closest('.q,label');
    if(!onQ){e.preventDefault();inp.focus({preventScroll:true});try{box.setPointerCapture(e.pointerId);}catch(_){}}
    const r=box.getBoundingClientRect(),[mn,mx]=lim(),span=mx-mn,bv=+(box.style.getPropertyValue('--b')||0)*span+mn;let lastX=e.clientX,acc=+inp.value,movedAny=false;gesture=++gestureN;
    const mv=ev=>{const dx=ev.clientX-lastX;if(!movedAny&&Math.abs(ev.clientX-e.clientX)<3)return;
      if(!movedAny){movedAny=true;box.classList.add('drag');if(onQ){hideTip();inp.focus({preventScroll:true});try{box.setPointerCapture(e.pointerId);}catch(_){}}}
      acc=clamp(acc+dx/Math.max(40,r.width-10)*span*(ev.shiftKey?.1:1),mn,mx);lastX=ev.clientX;
      put(!ev.shiftKey&&Math.abs(acc-bv)<span*.012?bv:acc);};
    const up=ev=>{box.removeEventListener('pointermove',mv);box.removeEventListener('pointerup',up);box.removeEventListener('pointercancel',up);box.classList.remove('drag');
      if(!movedAny&&ev.type==='pointerup'&&!onQ){ease(box);put(mn+clamp((ev.clientX-r.left-5)/Math.max(1,r.width-10),0,1)*span);}
      inp.dispatchEvent(new Event('change',{bubbles:true}));gesture=0;};
    box.addEventListener('pointermove',mv);box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);});
  inp.addEventListener('keydown',e=>{if(!e.shiftKey||!/^Arrow/.test(e.key))return;e.preventDefault();const [,, st]=lim();put(+inp.value+(/Right|Up/.test(e.key)?10:-10)*st);});
  requestAnimationFrame(()=>syncRange(box));}
/* A choice shows as a row while every option fits its share of the width, set in Medium;
   otherwise as a menu – same place, same height, same corners. */
const measureCtx=document.createElement('canvas').getContext('2d');
function textW(t){measureCtx.font='500 12.5px "aktiv-grotesk","Aktiv Grotesk","Helvetica Neue",Arial,sans-serif';return measureCtx.measureText(t).width;}
function segRoom(g){const ctl=g.closest('.ctl');const w=ctl&&ctl.offsetWidth;if(w)return w;return g.closest('.sheet')?308:Math.max(180,($('#panelBox').offsetWidth||300)-46);}
function fitSeg(g){const bs=[...g.children].filter(b=>b.tagName==='BUTTON'&&!b.hidden),n=bs.length;if(!n)return;g.classList.remove('wrap','loose');
  const ctl=g.closest('.ctl');if(g.closest('.isl-main')||!ctl||!ctl.querySelector(':scope>.seg-menu')){placeHL(g,true);return;}
  /* a row of choices sits beside its label when every option fits its share (in Medium, 8 px either side);
     otherwise it takes the full width under the label; and if even that won't hold it, it becomes a menu */
  const W=segRoom(g),lc=parseFloat(getComputedStyle(ctl).getPropertyValue('--lc'))||104,need=Math.max(...bs.map(b=>textW((b.textContent||'').trim())))+16;
  const share=w=>(w-4-(n-1)*2)/n,inline=need<=share(W-lc-10),block=!inline&&need<=share(W);
  ctl.classList.toggle('seg-inline',inline);ctl.classList.toggle('as-menu',!inline&&!block);placeHL(g,true);}
/* the white highlight slides to the chosen option (Morph) */
function placeHL(g,snap){let hl=g.querySelector(':scope>.hl');if(!hl){hl=el('i','hl');g.prepend(hl);}
  const b=[...g.children].find(x=>x.tagName==='BUTTON'&&!x.hidden&&x.getAttribute('aria-pressed')==='true');
  if(!b){g.classList.remove('hl-ready');delete hl.dataset.on;return;}if(!g.offsetWidth||!b.offsetWidth)return;
  const L=b.offsetLeft+'px',W=b.offsetWidth+'px';if(hl.style.left===L&&hl.style.width===W){hl.dataset.on=b.textContent;return;}
  /* it slides only when the choice changes; when the row itself resizes (a sheet growing, the panel dragged) it keeps up at once */
  const slide=!snap&&g.classList.contains('hl-ready')&&hl.dataset.on!=null&&hl.dataset.on!==b.textContent;
  if(!slide)hl.style.transition='none';
  hl.style.left=L;hl.style.width=W;hl.dataset.on=b.textContent;
  if(!slide){void hl.offsetWidth;hl.style.transition='';}g.classList.add('hl-ready');}
const segRO=new ResizeObserver(es=>{const gs=es.map(e=>e.target);requestAnimationFrame(()=>gs.forEach(g=>placeHL(g,true)));});
/* quiet actions are keyline chips with an icon */
const CHIP_ICON={'Shuffle':'shuffle','Clear all':'clear','Whole clip':'clip','Reset':'reset','Replace':'swap','Stop':'stop'};
function chipIcon(b){if(b.querySelector('svg'))return;const t=(b.textContent||'').trim();let k=CHIP_ICON[t];
  if(!k&&/^\+ /.test(t)){k='plus';b.textContent=t.slice(2);}if(k)b.insertAdjacentHTML('afterbegin',ICON[k]);}
function enhance(root){if(!root||root.nodeType!==1)return;
  if(root.matches('.ctl>input[type=range]'))upgradeRange(root);root.querySelectorAll('.ctl>input[type=range]').forEach(upgradeRange);
  if(root.matches('.seg,.choice'))fitSeg(root);root.querySelectorAll('.seg,.choice').forEach(fitSeg);
  if(root.matches('.pill')&&!root.closest('.seg'))chipIcon(root);root.querySelectorAll('.pill.small:not(.icon),.media-list~.btn-row>.pill,.card-body>.btn-row>.pill').forEach(chipIcon);}
new MutationObserver(ms=>{for(const m of ms){const t=m.target;if(t.classList&&(t.classList.contains('seg')||t.classList.contains('choice')))fitSeg(t);
  if(t.classList&&t.classList.contains('pill')&&t.classList.contains('small')&&!t.classList.contains('icon'))chipIcon(t);m.addedNodes.forEach(enhance);}}).observe(document.body,{childList:true,subtree:true});
/* the change column: a dot on any row that's moved from where it started */
function addCx(c,where){if(!c.d||(!c.d.k&&!c.d.keys))return;const b=el('button','cx');b.type='button';const lb=c.d.label||'';
  b.setAttribute('aria-label',`${lb} – changed; put it back`);b.dataset.tip='Changed – click to put it back';b.onclick=e=>{e.stopPropagation();resetCtl(c);};c.cx=b;where.append(b);}
const ctlKeys=c=>c.d.keys||[c.d.k];
const ctlMoved=c=>ctlKeys(c).some(moved);
function resetKeys(c){for(const k of ctlKeys(c)){if(!moved(k))continue;if(c.d.pick&&k===c.d.k)c.d.pick(base(k));else set(k,base(k),true);}}
function resetCtl(c){const lb=c.d.label||labelOf(ctlKeys(c)[0]);group(`${lb} put back`,()=>resetKeys(c));easeAll(c.w);refreshAll();toastUndo(`${lb} put back`);}
function shownIn(c,root){let n=c.w;while(n&&n!==root){if(n.hidden&&!n.classList.contains('fold-body')&&!n.classList.contains('card-anim'))return false;n=n.parentElement;}return !!n;}
function resetCard(sec,title){const list=controls.filter(c=>c.cx&&sec.contains(c.w)&&shownIn(c,sec)&&ctlMoved(c));if(!list.length)return;
  group(`${title} put back`,()=>list.forEach(resetKeys));easeAll(sec);refreshAll();toastUndo(`${title} put back`);}
function paintChanges(){
  for(const c of controls){if(!c.cx)continue;const ch=!c.w.closest('.sheet')&&ctlMoved(c);if(c.w.classList.contains('chg')!==ch)c.w.classList.toggle('chg',ch);}
  panel.querySelectorAll(':scope>section.card').forEach(sec=>{const ch=controls.some(c=>c.cx&&sec.contains(c.w)&&c.w.classList.contains('chg')&&shownIn(c,sec));sec.classList.toggle('chg',ch);});
  panel.querySelectorAll('.fold-head').forEach(hd=>{const body=hd.nextElementSibling;const ch=!!body&&controls.some(c=>c.cx&&body.contains(c.w)&&c.w.classList.contains('chg')&&shownIn(c,body));hd.classList.toggle('chg',ch);});}
const roundTo=(v,st)=>{const d=(String(st).split('.')[1]||'').length;return +(Math.round(v/st)*st).toFixed(d);};
/* Type a value: click (or Tab to and press Enter on) the number on any slider, type it, Enter.
   Units are optional ("2.5 s", "80%"); the value is kept to the slider's range but not
   rounded to its steps, so 2.37 s is 2.37 s. Escape leaves it as it was. */
function typable(val,o){
  val.classList.add('typable');val.tabIndex=0;val.setAttribute('role','button');val.dataset.tip='Click to type a value';val.setAttribute('aria-label',(o.label||'Value')+' – click to type');
  const open=e=>{if(e)e.preventDefault();if(val.classList.contains('editing'))return;val.classList.add('editing');
    const cur=+o.get(),inp=el('input','val-in');inp.type='text';inp.inputMode='decimal';inp.spellcheck=false;inp.setAttribute('aria-label',o.label||'Value');
    inp.value=Number.isFinite(cur)?String(+cur.toFixed(4)):'';val.textContent='';val.append(inp);inp.focus();inp.select();let done=false;
    const close=ok=>{if(done)return;done=true;const v=parseFloat(String(inp.value).replace(',','.').replace(/[^0-9.+\-eE]/g,''));val.classList.remove('editing');
      if(ok&&Number.isFinite(v))o.put(clamp(v,o.min,o.max));val.textContent=o.show();};
    inp.onkeydown=ev=>{ev.stopPropagation();if(ev.key==='Enter'){ev.preventDefault();close(true);val.focus();}else if(ev.key==='Escape'){ev.preventDefault();close(false);val.focus();}};
    inp.onblur=()=>close(true);inp.onpointerdown=ev=>ev.stopPropagation();};
  val.addEventListener('pointerdown',e=>{e.stopPropagation();});val.addEventListener('click',open);
  val.addEventListener('keydown',e=>{if(e.target===val&&(e.key==='Enter'||e.key===' ')){open(e);}});
  return val;}
function addStepper(parent,d){
  const w=el('div','ctl stp'),hd=el('div','ctl-head'),lb=el('label',null,d.label),g=el('div','stp-g'),mi=el('button'),val=el('span','val'),pl=el('button');
  mi.type=pl.type='button';mi.innerHTML=ICON.minus;pl.innerHTML=ICON.plus;mi.setAttribute('aria-label','Fewer – '+d.label);pl.setAttribute('aria-label','More – '+d.label);
  d.group=d.group||curGroup;w.dataset.k=d.k;lb.title='Double-click to reset';lb.ondblclick=()=>set(d.k,base(d.k));
  const go=n=>set(d.k,clamp(Math.round(+S[d.k])+n,+d.min,+d.max));mi.onclick=()=>go(-1);pl.onclick=()=>go(1);
  typable(val,{label:d.label,get:()=>S[d.k],put:v=>set(d.k,Math.round(v)),min:+d.min,max:+d.max,show:()=>String(Math.round(+S[d.k]))});
  g.append(mi,val,pl);hd.append(lb);const q=qMark(d);if(q)hd.append(q);w.append(hd,g);parent.append(w);
  const c={d,w,update(){const v=Math.round(+S[d.k]);if(!val.classList.contains('editing'))roll(val,String(v),v-(c._v==null?v:c._v));c._v=v;mi.disabled=v<=+d.min;pl.disabled=v>=+d.max;}};
  controls.push(c);addCx(c,w);return c;}
function addRange(parent,d){
  if(+d.step===1&&+d.max-+d.min<=10&&!d.unit&&!d.fmt)return addStepper(parent,d);
  const w=el('div','ctl'),hd=el('div','ctl-head'),lb=el('label',null,d.label),val=el('span','val');w.dataset.k=d.k;
  const id='c_'+(d.id||d.k);lb.htmlFor=id;lb.title='Double-click to reset';
  const inp=el('input');inp.type='range';inp.id=id;inp.min=d.min;inp.max=d.max;inp.step=d.step;
  const fmt=v=>d.fmt?d.fmt(v):(roundTo(v,d.step)+(d.unit||''));d.group=d.group||curGroup;
  inp.oninput=()=>{const was=+S[d.k];set(d.k,parseFloat(inp.value),true);const box=inp.closest('.rng-box');
    if(box&&!box.classList.contains('drag'))roll(val,fmt(+inp.value),+inp.value-was);else val.textContent=fmt(+inp.value);refreshVis();refreshSummaries();paintChanges();};
  lb.ondblclick=()=>set(d.k,base(d.k));
  /* a typed value isn't rounded to the step, so show it as typed */
  const show=()=>{const v=+S[d.k];return d.fmt?d.fmt(v):(roundTo(v,d.step)===v?fmt(v):+v.toFixed(4)+(d.unit||''));};
  typable(val,{label:d.label,get:()=>S[d.k],put:v=>{const b=w.querySelector('.rng-box');if(b)ease(b);set(d.k,v);},min:+d.min,max:+d.max,show});
  hd.append(lb);const q=qMark(d);if(q)hd.append(q);hd.append(val);w.append(hd,inp);parent.append(w);
  const c={d,w,update(){const v=+S[d.k];if(document.activeElement!==inp||!inp.closest('.drag'))inp.value=v;if(!val.classList.contains('editing'))roll(val,show(),v-(c._v==null?v:c._v));c._v=v;}};controls.push(c);addCx(c,w);return c;}
function addSeg(parent,d){
  const w=el('div','ctl');d.group=d.group||curGroup;let hd=null;if(d.label){hd=el('div','ctl-head');hd.append(el('span',null,d.label));const q=qMark(d);if(q)hd.append(q);w.append(hd);}
  const g=el('div','seg');g.setAttribute('role','group');if(d.label)g.setAttribute('aria-label',d.label);w.append(g);
  const m=el('select','seg-menu');if(d.label)m.setAttribute('aria-label',d.label);w.append(m);parent.append(w);let sig='',bs=[],opts=[];
  const pick=v=>d.pick?d.pick(v):set(d.k,v);
  const paint=o=>{opts=o;g.textContent='';m.textContent='';bs=o.map(([v,t,tip])=>{const b=el('button','pill small',t);b.type='button';if(tip)b.dataset.tip=tip;b.onclick=()=>pick(v);g.append(b);
    const op=el('option',null,t);op.value=String(v);m.append(op);return[v,b];});fitSeg(g);};
  m.onchange=()=>{const o=opts[m.selectedIndex];if(o)pick(o[0]);};
  if(d.opts)paint(d.opts);segRO.observe(g);
  const c={d,w,update(){if(d.optsFn){const o=d.optsFn(),ns=JSON.stringify(o);if(ns!==sig){sig=ns;paint(o);}}const cur=d.val?d.val(S):S[d.k];
    bs.forEach(([v,b])=>b.setAttribute('aria-pressed',cur===v));const i=opts.findIndex(o=>o[0]===cur);if(document.activeElement!==m)m.selectedIndex=i;placeHL(g);}};
  controls.push(c);if(hd)addCx(c,hd);return c;}
function addToggle(parent,d){
  const w=el('div','toggle-row'),b=el('button','toggle');b.type='button';b.setAttribute('role','switch');b.setAttribute('aria-label',d.label);d.group=d.group||curGroup;
  b.append(el('span','box'),el('span',null,d.label));w.append(b);const q=qMark(d);if(q)w.append(q);
  b.onclick=()=>set(d.k,!S[d.k]);parent.append(w);
  const c={d,w,update(){b.setAttribute('aria-checked',!!S[d.k]);}};controls.push(c);addCx(c,w);return c;}
function addColour(parent,d){
  const w=el('div','colour-row'),lb=el('label',null,d.label),cw=el('div','cw'),hex=el('input'),sw=el('span','cswatch'),inp=el('input');
  hex.type='text';hex.className='hexin';hex.spellcheck=false;hex.setAttribute('aria-label',d.label+' – hex');
  inp.type='color';inp.id='c_'+d.k;lb.htmlFor=inp.id;inp.oninput=()=>{set(d.k,inp.value.toUpperCase(),true);hex.value=inp.value.toUpperCase();};
  hex.onchange=()=>{let v=hex.value.trim();if(!v.startsWith('#'))v='#'+v;if(/^#[0-9a-f]{3}$/i.test(v))v='#'+v.slice(1).split('').map(c=>c+c).join('');if(/^#[0-9a-f]{6}$/i.test(v))set(d.k,v.toUpperCase());else hex.value=S[d.k];};
  sw.append(inp);cw.append(hex,sw);w.append(lb);const q=qMark(d);if(q)w.append(q);w.append(cw);parent.append(w);d.group=d.group||curGroup;
  const c={d,w,update(){inp.value=/^#[0-9a-f]{6}$/i.test(S[d.k])?S[d.k]:'#000000';if(document.activeElement!==hex)hex.value=String(S[d.k]).toUpperCase();}};controls.push(c);addCx(c,w);return c;}
function addSelect(parent,d){
  const w=el('div','ctl sel'),hd=el('div','ctl-head'),lb=el('label',null,d.label),s=el('select');s.id='c_'+d.k;lb.htmlFor=s.id;d.group=d.group||curGroup;
  hd.append(lb);const q=qMark(d);if(q)hd.append(q);w.append(hd,s);parent.append(w);let sig='';
  s.onchange=()=>set(d.k,d.num?+s.value:s.value);
  const c={d,w,update(){const o=d.optsFn?d.optsFn():d.opts,ns=JSON.stringify(o);if(ns!==sig){sig=ns;s.textContent='';for(const [v,t] of o){const op=el('option',null,t);op.value=v;s.append(op);}}
    if(document.activeElement!==s)s.value=S[d.k];}};controls.push(c);addCx(c,hd);return c;}
function addNums(parent,d){/* a pair of number fields on one row – Width × Height */
  const w=el('div','ctl nums'),hd=el('div','ctl-head');hd.append(el('span',null,d.label));const q=qMark(d);if(q)hd.append(q);
  const row=el('div','num-row'),ins=d.keys.map((k,i)=>{const lab=el('label','num');const sp=el('span',null,d.names[i]);const inp=el('input');inp.type='number';inp.min=d.min;inp.max=d.max;inp.step=d.step||1;inp.setAttribute('aria-label',d.names[i]);
    inp.onchange=()=>{const v=clamp(+inp.value||0,d.min,d.max);set(k,v);};lab.append(sp,inp);row.append(lab);if(i<d.keys.length-1)row.append(el('span','x',d.sep||'×'));return[k,inp];});
  w.append(hd,row);parent.append(w);d.group=d.group||curGroup;
  const c={d,w,update(){for(const [k,inp] of ins)if(document.activeElement!==inp)inp.value=S[k];}};controls.push(c);addCx(c,hd);return c;}
function addText(parent,d){
  const w=el('div','ctl txt'+(d.multi?' multi':'')),hd=el('div','ctl-head'),lb=el('label',null,d.label),inp=el(d.multi?'textarea':'input');if(!d.multi)inp.type='text';else inp.rows=d.rows||2;
  inp.id='c_'+d.k;lb.htmlFor=inp.id;inp.spellcheck=false;if(d.placeholder)inp.placeholder=d.placeholder;d.group=d.group||curGroup;
  hd.append(lb);const q=qMark(d);if(q)hd.append(q);w.append(hd,inp);parent.append(w);
  inp.oninput=()=>set(d.k,inp.value,true);inp.onchange=()=>refreshAll();
  const c={d,w,update(){if(document.activeElement!==inp)inp.value=S[d.k]||'';}};controls.push(c);addCx(c,hd);return c;}
function addCustom(parent,show,node){const c={d:{show},w:node,update(){}};parent.append(node);controls.push(c);return c;}
function addHint(parent,text,show){const p=el('p','hint',text);return addCustom(parent,show,p);}
function build(parent,list){for(const d of list){({range:addRange,seg:addSeg,toggle:addToggle,colour:addColour,select:addSelect,nums:addNums,text:addText}[d.t]||(()=>{}))(parent,d);}}
function refreshVis(){for(const c of controls){if(!c.d.show)continue;const v=!c.d.show(S);if(c.w.hidden!==v)c.w.hidden=v;}}
function refreshAll(){for(const c of controls)c.update();refreshVis();refreshSummaries();syncRanges(panel);if(typeof appRefresh==='function')appRefresh();paintChanges();}
/* ---------------- tooltips ---------------- */
const TIPS={};
function qMark(d){const t=d.tip||TIPS[d.k];if(!t)return null;const q=el('button','q','?');q.type='button';q.dataset.tip=t;q.setAttribute('aria-label',(d.label?d.label+': ':'')+t);return q;}
const tipEl=el('div','tip');tipEl.setAttribute('role','tooltip');document.body.append(tipEl);let tipFor=null;
function showTip(q,text,at){if(q&&q.getAttribute&&q.getAttribute('aria-expanded')==='true')return;tipFor=q;tipEl.textContent=text||q.dataset.tip;q=at||q;tipEl.classList.add('on');const r=q.getBoundingClientRect(),tw=tipEl.offsetWidth,th=tipEl.offsetHeight;
  tipEl.style.left=clamp(r.left+r.width/2-tw/2,8,innerWidth-tw-8)+'px';let y=r.top-th-8;if(y<8)y=r.bottom+8;tipEl.style.top=y+'px';}
function hideTip(){tipFor=null;tipEl.classList.remove('on');}
let rowTipT=0,byKeys=false,tipMute=null;
function tipRow(t){const row=t.closest('[data-tip],.ctl,.toggle-row,.colour-row,.slot-top');return row&&(row.dataset.tip?row:row.querySelector('.q'));}
document.addEventListener('keydown',e=>{byKeys=true;if(e.key==='Tab'||/^Arrow/.test(e.key))document.body.classList.add('kbd');},true);
document.addEventListener('pointerdown',e=>{byKeys=false;document.body.classList.remove('kbd');clearTimeout(rowTipT);hideTip();const t=e.target.closest?e.target:null;tipMute=t&&!t.closest('.q')?tipRow(t):null;},true);
document.addEventListener('mouseover',e=>{const t=e.target.closest?e.target:null;if(!t)return;const q=t.closest('.q');clearTimeout(rowTipT);
  if(q){tipMute=null;if(q!==tipFor)showTip(q);return;}
  const row=t.closest('[data-tip],.ctl,.toggle-row,.colour-row,.slot-top');const src=row&&(row.dataset.tip?row:row.querySelector('.q'));
  if(src&&src===tipMute)return;tipMute=null;
  if(src&&src!==tipFor){rowTipT=setTimeout(()=>showTip(src,src.dataset.tip,src.offsetParent?src:row),src===row?400:550);return;}
  if(!src&&tipFor&&!(byKeys&&document.activeElement===tipFor))hideTip();});
document.addEventListener('focusin',e=>{const q=e.target.closest&&e.target.closest('.q,[data-tip]');if(q&&byKeys)showTip(q);else if(tipFor)hideTip();});
document.addEventListener('click',e=>{const q=e.target.closest&&e.target.closest('.q');if(q){e.preventDefault();if(tipFor===q)hideTip();else showTip(q);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tipFor)hideTip();});
panel.addEventListener('scroll',()=>{if(tipFor)hideTip();},{passive:true});
/* ---------------- status and downloads ---------------- */
let toastT=0;function toast(m,hold){const t=$('#toast');t.textContent=m;t.title=m;t.classList.add('on');clearTimeout(toastT);if(!hold)toastT=setTimeout(()=>t.classList.remove('on'),2800);}
/* a bigger change says what it did, with Undo beside it – not while an export is running */
function toastUndo(m){if(busy)return;const t=$('#toast');t.textContent='';t.append(el('span',null,m));const u=el('button','undo','Undo');u.type='button';
  u.onclick=e=>{e.stopPropagation();undo();};t.append(u);t.title=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),5000);}
let dlNs=null;const dlReady=(window.claude&&typeof claude.use==='function')?claude.use('downloads').then(n=>dlNs=n).catch(()=>null):Promise.resolve(null);
async function saveFile(name,blob){
  if(window.claude&&typeof claude.use==='function'){await dlReady;
    if(dlNs){try{await dlNs.save({filename:name,data:blob});toast(`Saved ${name}`);}catch(e){const c=e&&e.code;toast(c==='declined'?'Download cancelled':c==='too_large'?'That file is too large. Try a smaller size.':`Couldn't save ${name}.`);}return;}}
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast(`Saved ${name}`);}
/* ---------------- light and dark, keys, the panel's width ---------------- */
function setTheme(t,chosen){document.body.dataset.theme=t;if(chosen)LS.set('mode',t);const b=$('#themeBtn');if(b)b.setAttribute('aria-label',t==='dark'?'Light mode':'Dark mode');}
/* anything that goes wrong shows as a note at the top of the panel, with the browser's name, so it can be sent
   back as it is – Safari's console is out of reach for most people */
const ERRS=[];
function reportError(e,where){try{const m=(e&&(e.message||e.reason&&e.reason.message||String(e.reason||e)))||'unknown',st=(e&&(e.stack||e.reason&&e.reason.stack)||'').split('\n').slice(0,3).join(' | ');
  const line=`${where?where+' – ':''}${m}${e&&e.filename?` (line ${e.lineno}:${e.colno})`:''}${st?' – '+st:''}`;if(ERRS.includes(line)||ERRS.length>4)return;ERRS.push(line);console.error('segue:',line);
  let n=$('#errNote');if(!n){n=el('div','err-note');n.id='errNote';n.setAttribute('role','alert');const x=el('button','pill small icon');x.type='button';x.innerHTML=ICON.clear||'×';x.setAttribute('aria-label','Hide this note');x.onclick=()=>n.remove();
    n.append(el('b',null,'Something in Segue went wrong – please send Claude this note:'),x);const pnl=$('#panel')||document.body;pnl.prepend(n);}
  n.append(el('code',null,line));if(!n.querySelector('.ua'))n.append(el('code','ua',`Segue ${document.querySelector('.ver')?document.querySelector('.ver').textContent:''} · ${navigator.userAgent}`));else n.append(n.querySelector('.ua'));}catch(_){}}
window.addEventListener('error',e=>{if(/ResizeObserver loop/.test(e.message||''))return;reportError(e);});
window.addEventListener('unhandledrejection',e=>reportError(e,'async'));
function frameStart(){
  {const b=$('#themeBtn');b.dataset.tip='Light or dark';b.onclick=()=>setTheme(document.body.dataset.theme==='dark'?'light':'dark',true);setTheme(LS.get('mode')==='dark'?'dark':'light');}
  const pb=$('#previewBtn');setPreview(false);pb.onclick=()=>setPreview(!$('.app').classList.contains('preview'));
  $('#panelBtn').onclick=e=>{e.stopPropagation();setPanel(!$('.app').classList.contains('peek'));};
  const eo=$('#exportOpen');eo.dataset.tip='Save or download what’s on the stage';eo.onclick=e=>{e.stopPropagation();SHEETS.export&&SHEETS.export.el.hidden?openSheet('export'):closeSheets();};
  $('#pcapOpen').onclick=e=>{e.stopPropagation();SHEETS.presets&&SHEETS.presets.el.hidden?openSheet('presets'):closeSheets();};
  $('#stage').addEventListener('pointerdown',e=>{if(anySheet()){closeSheets();e.stopPropagation();}else if($('.app').classList.contains('peek')){setPanel(false);e.stopPropagation();}},true);
  window.addEventListener('keydown',e=>{
    const tg=e.target,typing=tg&&(tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable||(tg.tagName==='INPUT'&&/text|number|search/.test(tg.type)));
    if(e.key==='Escape'){if(anySheet()){closeSheets();return;}if($('.app').classList.contains('preview'))setPreview(false);return;}
    if((e.metaKey||e.ctrlKey)&&!e.altKey&&!typing&&(e.key==='z'||e.key==='Z'||e.key==='y')){e.preventDefault();if(e.shiftKey||e.key==='y')redo();else undo();return;}
    if(typing||e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.key==='f'||e.key==='F'){e.preventDefault();setPreview(!$('.app').classList.contains('preview'));}
    if(e.key===' '&&!(tg&&tg.tagName==='BUTTON')){e.preventDefault();setPlaying(!playing);}},true);
  $('#islandMain').addEventListener('scroll',islMore,{passive:true});
  let refitT=0;const refit=()=>{cancelAnimationFrame(refitT);refitT=requestAnimationFrame(()=>document.querySelectorAll('.seg').forEach(fitSeg));};
  const ro=new ResizeObserver(()=>{layoutUI();fitCanvas();refit();});ro.observe($('.island-in'));ro.observe($('#panelBox'));ro.observe($('#view'));ro.observe($('#pcap .pc-row'));
  if(document.fonts)document.fonts.ready.then(refit);
  requestAnimationFrame(()=>setTimeout(()=>document.body.classList.add('kit-live'),600));
  window.addEventListener('resize',layoutUI);
  const rz=$('#resizer'),app=$('.app'),pw=LS.get('panelW'),put=w=>{app.style.setProperty('--pw',w+'px');document.documentElement.style.setProperty('--pw',w+'px');};
  if(pw)put(clamp(pw,280,480));
  rz.addEventListener('pointerdown',e=>{e.preventDefault();rz.setPointerCapture(e.pointerId);const x0=e.clientX,w0=$('#panelBox').offsetWidth;
    const mv=ev=>{put(clamp(w0+ev.clientX-x0,280,480));syncRanges(panel);};
    rz.addEventListener('pointermove',mv);rz.addEventListener('pointerup',()=>{rz.removeEventListener('pointermove',mv);LS.set('panelW',$('#panelBox').offsetWidth);},{once:true});});}
