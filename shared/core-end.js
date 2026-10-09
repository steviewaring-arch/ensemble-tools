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
/* light and dark: the computer's choice the first time, then remembered */
function setTheme(t){document.body.dataset.theme=t;LS.set('theme',t);const b=$('#themeBtn');if(b)b.setAttribute('aria-label',t==='dark'?'Light mode':'Dark mode');schedulePicker(0);}
{const b=$('#themeBtn');if(b){b.dataset.tip='Light or dark';b.onclick=()=>setTheme(document.body.dataset.theme==='dark'?'light':'dark');}
  const saved=LS.get('theme');setTheme(saved==='light'||saved==='dark'?saved:(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));}
/* Preview, sheets, keys */
{const pb=$('#previewBtn');if(pb){setPreview(false);pb.onclick=()=>setPreview(!$('.app').classList.contains('preview'));}
  const eo=$('#exportOpen');if(eo){eo.dataset.tip='Save or download what’s on the stage';eo.onclick=e=>{e.stopPropagation();SHEETS.export&&SHEETS.export.el.hidden?openSheet('export'):closeSheets();};}
  const po=$('#pcapOpen');if(po)po.onclick=e=>{e.stopPropagation();SHEETS.presets&&SHEETS.presets.el.hidden?openSheet('presets'):closeSheets();};
  $('#stage').addEventListener('pointerdown',()=>{if(anySheet())closeSheets();});
  window.addEventListener('keydown',e=>{
    const tg=e.target,typing=tg&&(tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable||(tg.tagName==='INPUT'&&/text|number|search/.test(tg.type)));
    if(e.key==='Escape'){if(anySheet()){closeSheets();return;}if($('.app').classList.contains('preview'))setPreview(false);return;}
    if(typing||e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.key==='f'||e.key==='F'){e.preventDefault();setPreview(!$('.app').classList.contains('preview'));}},true);
  const ro=new ResizeObserver(()=>layoutUI());ro.observe($('.island-in'));ro.observe($('#panelBox'));if($('#pcap'))ro.observe($('#pcap .pc-row'));
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
