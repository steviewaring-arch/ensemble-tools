/* Ensemble Tools – shared core, end part. Runs after the app's own files (see core.js). */
/* ---------------- downloads ---------------- */
let dlNs=null;const dlReady=(window.claude&&typeof claude.use==='function')?claude.use('downloads').then(n=>dlNs=n).catch(()=>null):Promise.resolve(null);
async function saveFile(name,blob){
  if(window.claude&&typeof claude.use==='function'){await dlReady;
    if(dlNs){try{await dlNs.save({filename:name,data:blob});toast(`Saved ${name}`);}catch(e){const c=e&&e.code;toast(c==='declined'?'Download cancelled':c==='rate_limited'?'A download is already waiting for you. Try again in a moment.':c==='too_large'?'That file is too large. Try a smaller size.':`Couldn't save ${name}.`);}return;}}
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast(`Saved ${name}`);
}
function slug(){const t=(S.texts[0]||'type').split('\n')[0].toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'type';return t.slice(0,32)+'-'+({none:'still',fluid:'fluid',snappy:'snappy',transit:'transitional'}[S.mode]||'motion');}

/* ---------------- misc wiring ---------------- */
/* status lives in the island */
let toastT=0;function toast(m){const t=$('#toast');t.textContent=m;t.title=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2800);}
$('#fontfile').onchange=e=>{const fs=[...e.target.files];e.target.value='';if(fs.length)loadFiles(fs);};
$('#imgfile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)setImage(f,f.name);};
let dragDepth=0;
window.addEventListener('dragenter',e=>{if(e.dataTransfer&&[...e.dataTransfer.types].includes('Files')){dragDepth++;$('#drop').classList.add('on');}});
window.addEventListener('dragleave',()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)$('#drop').classList.remove('on');});
window.addEventListener('dragover',e=>e.preventDefault());
window.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;$('#drop').classList.remove('on');let fs=[...(e.dataTransfer?e.dataTransfer.files:[])];if(typeof appDropFiles==='function')fs=appDropFiles(fs);if(!fs.length)return;
  const ims=fs.filter(f=>/^image\//.test(f.type));const fo=fs.filter(f=>!/^image\//.test(f.type));if(ims.length)setImage(ims[0],ims[0].name);if(fo.length)loadFiles(fo);});
/* light and dark: light unless the person has chosen dark here ('mode' is only written by the button) */
function setTheme(t,chosen){document.body.dataset.theme=t;if(chosen)LS.set('mode',t);const b=$('#themeBtn');if(b)b.setAttribute('aria-label',t==='dark'?'Light mode':'Dark mode');schedulePicker(0);}
{const b=$('#themeBtn');if(b){b.dataset.tip='Light or dark';b.onclick=()=>setTheme(document.body.dataset.theme==='dark'?'light':'dark',true);}
  setTheme(LS.get('mode')==='dark'?'dark':'light');}
/* Preview, sheets, keys */
{const pb=$('#previewBtn');if(pb){setPreview(false);pb.onclick=()=>setPreview(!$('.app').classList.contains('preview'));}
  const pn=$('#panelBtn');if(pn)pn.onclick=e=>{e.stopPropagation();setPanel(!$('.app').classList.contains('peek'));};
  const eo=$('#exportOpen');if(eo){eo.dataset.tip='Save or download what’s on the stage';eo.onclick=e=>{e.stopPropagation();SHEETS.export&&SHEETS.export.el.hidden?openSheet('export'):closeSheets();};}
  const po=$('#pcapOpen');if(po)po.onclick=e=>{e.stopPropagation();SHEETS.presets&&SHEETS.presets.el.hidden?openSheet('presets'):closeSheets();};
  /* a press on the work while a sheet or the panel is open only closes it – it doesn't also reach the work (Rubato's kerning, say) */
  $('#stage').addEventListener('pointerdown',e=>{if(anySheet()){closeSheets();e.stopPropagation();}else if($('.app').classList.contains('peek')){setPanel(false);e.stopPropagation();}},true);
  window.addEventListener('keydown',e=>{
    const tg=e.target,typing=tg&&(tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable||(tg.tagName==='INPUT'&&/text|number|search/.test(tg.type)));
    if(e.key==='Escape'){if(anySheet()){closeSheets();return;}if($('.app').classList.contains('preview'))setPreview(false);return;}
    if(typing||e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.key==='f'||e.key==='F'){e.preventDefault();setPreview(!$('.app').classList.contains('preview'));}},true);
  {const m=$('#islandMain');if(m)m.addEventListener('scroll',islMore,{passive:true});}
  const ro=new ResizeObserver(()=>layoutUI());ro.observe($('.island-in'));ro.observe($('#panelBox'));if($('#pcap'))ro.observe($('#pcap .pc-row'));if($('#islandMain'))[...$('#islandMain').children].forEach(c=>ro.observe(c));
  window.addEventListener('resize',layoutUI);}
/* the panel's width: drag its right edge */
{const rz=$('#resizer'),app=$('.app'),pw=LS.get('panelW'),put=w=>{app.style.setProperty('--pw',w+'px');document.documentElement.style.setProperty('--pw',w+'px');};
  if(pw)put(clamp(pw,280,440));
  rz.addEventListener('pointerdown',e=>{e.preventDefault();rz.setPointerCapture(e.pointerId);const x0=e.clientX,w0=$('#panelBox').offsetWidth;
    const mv=ev=>{put(clamp(w0+ev.clientX-x0,280,440));syncRanges(panel);};
    rz.addEventListener('pointermove',mv);rz.addEventListener('pointerup',()=>{rz.removeEventListener('pointermove',mv);LS.set('panelW',$('#panelBox').offsetWidth);},{once:true});});}
/* ---------------- start ---------------- */
appStart();layoutUI();requestAnimationFrame(()=>{layoutUI();syncRanges(document);});
if(document.fonts){document.fonts.load(`400 100px ${FAMILY}`).then(()=>document.fonts.load(`800 100px ${FAMILY}`)).then(()=>{fallbacks.d1.reset();fallbacks.d2.reset();dirty=true;schedulePicker(0);}).catch(()=>{});}
restoreFonts();
requestAnimationFrame(tick);

/* ---------------- the change column (Segue 1.0's, taken across) ----------------
   A blue dot on any row that has moved from where it started; click it to put that row back;
   a Reset in a section's head while anything inside it has moved. One layer for Rubato and
   Tempo rather than one each, because two copies of a house part is how they drift.

   Where a setting "started" is the tool's to say. Rubato's is its defaults, so it says nothing
   and D stands. Tempo's is the preset that is open, so it calls startFrom(settings) when one
   opens and startFrom(null) when none is - otherwise opening a preset would light up every row
   in the panel.

   The kit already draws all of it: .chg on a row shows its dot, and a card's Reset appears by
   itself while the card is .chg and open. Nothing here styles anything. */
let BASE=null;
function startFrom(o){try{BASE=o?JSON.parse(JSON.stringify(o)):null;}catch(_){BASE=null;}paintChanges();}
const baseOf=k=>(BASE&&k in BASE)?BASE[k]:D[k];
/* texts is an array and picks is a map, so a value is not always worth comparing with === */
const sameVal=(a,b)=>a===b||(a!=null&&b!=null&&typeof a==='object'&&typeof b==='object'&&JSON.stringify(a)===JSON.stringify(b));
const moved=k=>k!=null&&(k in D)&&!sameVal(S[k],baseOf(k));
function putBack(k){if(!moved(k))return;let v=baseOf(k);if(v&&typeof v==='object'){try{v=JSON.parse(JSON.stringify(v));}catch(_){}}set(k,v);}

function addDots(){
  for(const c of controls){
    const k=c.d&&c.d.k;
    if(!k||c.cx||!(k in D)||!c.w||!c.w.classList)continue;
    if(c.w.closest('.sheet')||!c.w.isConnected)continue;      /* a sheet is its own job, not a row */
    const lb=c.d.label||k;
    const b=el('button','cx');b.type='button';
    b.setAttribute('aria-label',lb+' – changed; put it back');
    b.dataset.tip='Changed – click to put it back';
    b.onclick=e=>{e.stopPropagation();putBack(k);refreshAll();toast(lb+' put back');};
    c.cx=b;c.w.append(b);
  }
}
function resetCard(sec,title){
  const shown=c=>{let n=c.w;while(n&&n!==sec){if(n.hidden&&!n.classList.contains('fold-body')&&!n.classList.contains('card-anim'))return false;n=n.parentElement;}return !!n;};
  const hit=controls.filter(c=>c.cx&&sec.contains(c.w)&&shown(c)&&moved(c.d.k));
  if(!hit.length)return;
  hit.forEach(c=>putBack(c.d.k));refreshAll();toast(title+' put back');
}
/* set() and refreshAll() both call this, and both run while a tool is still building its rows -
   before the lines below have been reached. paintChanges is hoisted; BASE, moved and the rest are
   not, so it has to stay a no-op until they exist. */
var columnReady=false;   /* var, not let: this is read before the line runs, and only var hoists
                            as undefined instead of throwing from the dead zone. */
function paintChanges(){
  if(!columnReady)return;
  addDots();   /* a tool can build rows later - Tempo's theme cards - and they want a dot too */
  for(const c of controls){if(!c.cx)continue;const on=moved(c.d.k);
    if(c.w.classList.contains('chg')!==on)c.w.classList.toggle('chg',on);}
  /* Ask the rows, never the DOM: a group's own head carries .chg too, so querySelector('.chg')
     inside it finds the head it is about to set and the group could never go dark again.
     A row that is not on screen does not count either - Tempo boots with a ring fill colour that
     differs from the default on a row you only see once the ring fill is on, and it was lighting
     the whole Colour section for something nobody could see or put back. */
  const shownAt=(c,root)=>{let n=c.w;while(n&&n!==root){
    if(n.hidden&&!n.classList.contains('fold-body')&&!n.classList.contains('card-anim'))return false;
    n=n.parentElement;}return !!n;};
  const litIn=root=>controls.some(c=>c.cx&&c.w.classList.contains('chg')&&shownAt(c,root)&&root.contains(c.w));
  panel.querySelectorAll('.fold').forEach(f=>{const hd=f.querySelector(':scope > .fold-head');
    if(hd)hd.classList.toggle('chg',litIn(f));});
  panel.querySelectorAll('section.card').forEach(sec=>{
    const on=litIn(sec);
    sec.classList.toggle('chg',on);
    const r=sec.querySelector(':scope > h2 > .reset');if(r)r.hidden=!on;});
}
/* A tool says where its settings started by defining appBaseline(); without one, D stands,
   which is right for a tool whose starting point is simply its defaults. */
columnReady=true;
addDots();startFrom(typeof appBaseline==='function'?appBaseline():null);

/* ---------------- undo ----------------
   A settled change is one step: a drag is one step and not forty, because the state is held as
   it was before the drag began and only filed once the dragging stops. Tutti has worked this way
   since 6.x and it is the behaviour to match.

   Rubato already keeps a stack, the buttons and putState(); it simply never recorded a setting -
   pushUndo() is called for adding a block or loading a preset and nothing else, which is why its
   Undo button sat disabled however much you moved. So this feeds Rubato's own stack rather than
   keeping a second one beside it. Tempo had none of it, so it gets the stack here and says how to
   put a state back with appRestore(). */
var histReady=false;                      /* var: set() calls noteChange before this file runs */
const HKEYS=()=>Object.keys(D);
const histSnap=()=>{const o={};for(const k of HKEYS())if(k in S)o[k]=S[k];return JSON.stringify(o);};
const ownU=[],ownR=[];
const uStack=()=>typeof undoStack!=='undefined'?undoStack:ownU;
const rStack=()=>typeof redoStack!=='undefined'?redoStack:ownR;
const histPaint=()=>{
  if(typeof paintHistory==='function')return paintHistory();
  const u=document.querySelector('#undoBtn'),r=document.querySelector('#redoBtn');
  if(u){u.disabled=!uStack().length;u.title=u.disabled?'Nothing to undo':'Undo \u2013 \u2318Z';}
  if(r){r.disabled=!rStack().length;r.title=r.disabled?'Nothing to redo':'Redo \u2013 \u21e7\u2318Z';}};
const histPut=o=>{
  if(typeof appRestore==='function')return appRestore(o);
  if(typeof putState==='function')return putState(JSON.stringify(o));
  for(const k of HKEYS())if(k in o)S[k]=o[k];refreshAll();};

let pre=null,preT=0;
function noteChange(){if(!histReady)return;if(pre===null)pre=histSnap();preT=Date.now();}
function fileStep(){
  if(pre===null)return;
  if(Date.now()-preT<500)return;                 /* still moving - wait for it to settle */
  const was=pre;pre=null;
  if(was===histSnap())return;                    /* moved and put back again: not a step */
  const u=uStack();u.push(was);if(u.length>30)u.shift();rStack().length=0;histPaint();}
setInterval(fileStep,250);

function histGo(from,to,verb){
  fileStep();
  const s=from.pop();if(!s){if(typeof toast==='function')toast('Nothing to '+verb);return;}
  to.push(histSnap());histPut(JSON.parse(s));histPaint();
  if(typeof paintChanges==='function')paintChanges();
  if(typeof toast==='function')toast(verb[0].toUpperCase()+verb.slice(1));}
const histUndo=()=>histGo(uStack(),rStack(),'undo');
const histRedo=()=>histGo(rStack(),uStack(),'redo');

/* Rubato wires its own buttons to its own undo(); leave those alone and only take the ones
   nobody has claimed, so Tempo's work and Rubato's keep their single stack. */
(function(){
  const u=document.querySelector('#undoBtn'),r=document.querySelector('#redoBtn');
  if(u&&!u.onclick)u.onclick=histUndo;
  if(r&&!r.onclick)r.onclick=histRedo;
})();
window.addEventListener('keydown',e=>{
  if(!(e.metaKey||e.ctrlKey)||e.altKey)return;
  const k=e.key.toLowerCase();if(k!=='z'&&k!=='y')return;
  const t=e.target,typing=t&&(t.tagName==='TEXTAREA'||t.isContentEditable||
    (t.tagName==='INPUT'&&/text|number|search/.test(t.type)));
  if(typing)return;
  e.preventDefault();
  if(e.shiftKey||k==='y'){if(typeof redo==='function')redo();else histRedo();}
  else {if(typeof undo==='function')undo();else histUndo();}
},true);
histReady=true;histPaint();
