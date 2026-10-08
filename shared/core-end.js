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
let toastT=0;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2800);}
$('#fontfile').onchange=e=>{const fs=[...e.target.files];e.target.value='';if(fs.length)loadFiles(fs);};
$('#imgfile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)setImage(f,f.name);};
let dragDepth=0;
window.addEventListener('dragenter',e=>{if(e.dataTransfer&&[...e.dataTransfer.types].includes('Files')){dragDepth++;$('#drop').classList.add('on');}});
window.addEventListener('dragleave',()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)$('#drop').classList.remove('on');});
window.addEventListener('dragover',e=>e.preventDefault());
window.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;$('#drop').classList.remove('on');let fs=[...(e.dataTransfer?e.dataTransfer.files:[])];if(typeof appDropFiles==='function')fs=appDropFiles(fs);if(!fs.length)return;
  const ims=fs.filter(f=>/^image\//.test(f.type));const fo=fs.filter(f=>!/^image\//.test(f.type));if(ims.length)setImage(ims[0],ims[0].name);if(fo.length)loadFiles(fo);});
function setTheme(t){document.body.dataset.theme=t;LS.set('theme',t);document.querySelectorAll('#appearance button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));schedulePicker(0);}
document.querySelectorAll('#appearance button').forEach(b=>b.onclick=()=>setTheme(b.dataset.t));
setTheme(LS.get('theme')==='light'?'light':'dark');
{const rz=$('#resizer'),box=$('#panelBox'),pw=LS.get('panelW');if(pw)box.style.width=pw+'px';
  rz.addEventListener('pointerdown',e=>{e.preventDefault();rz.setPointerCapture(e.pointerId);const x0=e.clientX,w0=box.offsetWidth;
    const mv=ev=>{box.style.width=clamp(w0+ev.clientX-x0,300,560)+'px';};
    rz.addEventListener('pointermove',mv);rz.addEventListener('pointerup',()=>{rz.removeEventListener('pointermove',mv);LS.set('panelW',box.offsetWidth);},{once:true});});}
/* ---------------- start ---------------- */
appStart();
if(document.fonts){document.fonts.load(`400 100px ${FAMILY}`).then(()=>document.fonts.load(`800 100px ${FAMILY}`)).then(()=>{fallbacks.d1.reset();fallbacks.d2.reset();dirty=true;schedulePicker(0);}).catch(()=>{});}
restoreFonts();
requestAnimationFrame(tick);
