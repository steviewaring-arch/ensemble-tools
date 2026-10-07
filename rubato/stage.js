/* Rubato – the preview stage (1.0): kerning on the canvas, physics guides,
   and the live thumbnails on the Presets card. Top level only declares things;
   everything here runs after the cards exist. */

/* ---------------- kerning ----------------
   Hover between two letters to see a caret; click to pick the pair. The type
   settles into its resting position while you kern, so the spacing you see is
   the spacing you get. ←/→ kern by 10/1000 em, Shift by 50, Backspace clears
   the pair, Esc (or a click away) finishes. Kerning belongs to the block, so it
   applies wherever that pair appears in it. */
let kHover=null,kSel=null,kWasPlaying=true,kUndo=false;
const KCOL='#4a7dff';
function canvasPt(e){const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*cv.width,(e.clientY-r.top)/r.height*cv.height,cv.width/Math.max(1,r.width)];}
function kernTargetsNow(){const [W,H]=frameSize();try{return eng.kernTargets(phase,W,H);}catch(e){return[];}}
function kernAt(x,y,px){
  let best=null,bd=Infinity;const tol=8*px;
  for(const t of kernTargetsNow()){if(y<t.y1-tol||y>t.y2+tol)continue;
    const lo=t.x-Math.max(tol,(t.x-t.xa)/2),hi=t.x+Math.max(tol,(t.xb-t.x)/2);if(x<lo||x>hi)continue;
    const d=Math.abs(x-t.x);if(d<bd){bd=d;best=t;}}
  return best;
}
const samePair=(a,b)=>a&&b&&a.bi===b.bi&&a.li===b.li&&a.ri===b.ri&&a.seqIndex===b.seqIndex;
function kernVal(t){const bk=S.blocks[t.bi]||{};return (bk.kern&&bk.kern[t.pair])||0;}
/* the note on the stage doubles as a control, for touch screens and anyone who'd rather click */
function kernNote(){const n=$('#knote');n.textContent='';if(!kSel)return;
  const v=kernVal(kSel),btn=(t,lab,fn)=>{const b=el('button','kbtn',t);b.type='button';b.setAttribute('aria-label',lab);b.onclick=fn;return b;};
  n.append(el('b',null,kSel.pair),el('span','kval',(v>0?'+':'')+String(v).replace('-','−')),
    btn('−','Tighten',e=>nudgeKern(e.shiftKey?-50:-10)),btn('+','Loosen',e=>nudgeKern(e.shiftKey?50:10)),
    el('span','khint','← → · Shift for bigger steps'),btn('Done','Finish kerning',exitKern));}
function startKern(t){
  if(!kSel){kWasPlaying=playing;setPlaying(false);eng.setStill(true);}
  kSel=t;kUndo=false;kernNote();dirty=true;
}
function exitKern(){if(!kSel)return;kSel=null;eng.setStill(false);if(kWasPlaying)setPlaying(true);kernNote();dirty=true;}
function nudgeKern(d){
  if(!kSel)return;const bk=S.blocks[kSel.bi];if(!bk)return;if(!kUndo){pushUndo();kUndo=true;}
  const v=d===null?0:clamp((bk.kern[kSel.pair]||0)+d,-1000,1000);
  if(v)bk.kern[kSel.pair]=v;else delete bk.kern[kSel.pair];
  autosave();dirty=true;refreshKernList();kernNote();
}
cv.addEventListener('pointermove',e=>{const [x,y,px]=canvasPt(e);const t=kernAt(x,y,px);if(!samePair(t,kHover)){kHover=t;dirty=true;}cv.style.cursor=t?'text':'';});
cv.addEventListener('pointerleave',()=>{if(kHover){kHover=null;dirty=true;}cv.style.cursor='';});
cv.addEventListener('pointerdown',e=>{const [x,y,px]=canvasPt(e);const t=kernAt(x,y,px);if(t)startKern(t);else exitKern();});
window.addEventListener('keydown',e=>{
  if(!kSel)return;const tg=e.target;
  if(tg&&(/^(TEXTAREA|INPUT|SELECT)$/.test(tg.tagName)||(tg.getAttribute&&tg.getAttribute('role')==='slider')))return;
  if(e.key==='Escape'){e.preventDefault();exitKern();}
  else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const big=e.shiftKey||((e.metaKey||e.ctrlKey)&&e.altKey);nudgeKern((e.key==='ArrowLeft'?-1:1)*(big?50:10));}
  else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();nudgeKern(null);}
});
/* typing a new text or switching layouts can move the pair – let go of it */
document.addEventListener('input',e=>{if(kSel&&e.target&&e.target.tagName==='TEXTAREA')exitKern();});

/* ---------------- physics guides ----------------
   While you hover the Physics card (or just after a change) the preview shows
   where each block is heading and the space it keeps around itself. */
let guideHover=false,guideUntil=0;
function pokeGuides(){guideUntil=performance.now()+1600;dirty=true;}
function guidesOn(){return !!S.phOn&&eng.useBlocks()&&(guideHover||performance.now()<guideUntil);}

function drawOverlay(c,W,H){
  const px=cv.width/Math.max(1,cv.getBoundingClientRect().width||cv.width);
  c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';
  if(guidesOn()){
    let bl=[];try{bl=eng.blocksLayout(phase,W,H);}catch(e){}
    c.lineWidth=1.5*px;c.font=`${12*px}px ${FAMILY}`;c.textBaseline='middle';c.textAlign='center';
    bl.forEach((b,i)=>{const r=b.cur,f=b.field/2;
      if(b.field>0){c.fillStyle='rgba(74,125,255,.10)';c.strokeStyle='rgba(74,125,255,.55)';c.setLineDash([5*px,4*px]);
        c.fillRect(r.x1-f,r.y1-f,r.x2-r.x1+2*f,r.y2-r.y1+2*f);c.strokeRect(r.x1-f,r.y1-f,r.x2-r.x1+2*f,r.y2-r.y1+2*f);}
      c.setLineDash([]);c.strokeStyle=KCOL;c.strokeRect(r.x1,r.y1,r.x2-r.x1,r.y2-r.y1);
      const [dx,dy]=b.dest,s=9*px;c.beginPath();c.moveTo(dx-s*1.6,dy);c.lineTo(dx+s*1.6,dy);c.moveTo(dx,dy-s*1.6);c.lineTo(dx,dy+s*1.6);c.stroke();
      c.beginPath();c.arc(dx,dy,s,0,Math.PI*2);c.fillStyle=KCOL;c.fill();c.fillStyle='#fff';c.fillText(String(i+1),dx,dy+.5*px);});
  }
  const caret=(t,on)=>{c.strokeStyle=KCOL;c.globalAlpha=on?1:.55;c.lineWidth=(on?2:1.5)*px;c.setLineDash(on?[]:[4*px,3*px]);
    c.beginPath();c.moveTo(t.x,t.y1);c.lineTo(t.x,t.y2);c.stroke();c.setLineDash([]);
    const w=5*px;c.beginPath();c.moveTo(t.x-w,t.y1);c.lineTo(t.x+w,t.y1);c.moveTo(t.x-w,t.y2);c.lineTo(t.x+w,t.y2);c.stroke();
    if(on){const v=kernVal(t),txt=(v>0?'+':'')+String(v).replace('-','−');c.font=`${13*px}px ${FAMILY}`;c.textAlign='center';c.textBaseline='bottom';
      const tw=c.measureText(txt).width+12*px,th=20*px,bx=t.x-tw/2,by=t.y1-th-6*px;c.globalAlpha=1;c.fillStyle=KCOL;
      c.beginPath();if(c.roundRect)c.roundRect(bx,by,tw,th,th/2);else c.rect(bx,by,tw,th);c.fill();c.fillStyle='#fff';c.fillText(txt,t.x,by+th-4*px);}
    c.globalAlpha=1;};
  if(kSel){const t=kernTargetsNow().find(x=>samePair(x,kSel));if(t){kSel=Object.assign(kSel,{x:t.x,y1:t.y1,y2:t.y2});caret(t,true);}}
  if(kHover&&!samePair(kHover,kSel)){const t=kernTargetsNow().find(x=>samePair(x,kHover));if(t)caret(t,false);}
  c.restore();
}

/* ---------------- live preset thumbnails ----------------
   Each starting point plays your own word in a small tile, using your fonts and
   colours, so you choose by what it does rather than by name. Each tile has its
   own engine; they only run while the Presets card is open and on screen. */
const thumbs=[];let thumbsStale=true,thumbVer=-1,thumbLast=0,thumbsSeen=true;
function addThumb(name,canvas){thumbs.push({name,c:canvas,e:createEngine()});}
function thumbSettings(name){
  const pre=BUILTIN[name],first=(S.texts[0]||'').split('\n')[0].trim()||'Rubato';
  const s=Object.assign(JSON.parse(JSON.stringify(S)),PRESET_BASE,pre,{phOn:false,fit:'block',size:30,margin:pre.rOn?0:14,transparent:false,valign:'middle',align:pre.align||'centre'});
  s.blocks=[{text:'',font:'',size:1,dest:'auto',kern:(S.blocks&&S.blocks[0]&&S.blocks[0].kern)||{}}];
  s.texts=[first];
  if(s.seq){const others=S.texts.slice(1).map(t=>t.split('\n')[0].trim()).filter(Boolean);s.texts=[first].concat(others.length?others:['In motion']);}
  return s;
}
function tickThumbs(now){
  if(!thumbs.length||document.hidden||!thumbsSeen||presetCard.classList.contains('collapsed'))return;
  if(now-thumbLast<40)return;thumbLast=now;
  if(faceVer!==thumbVer){const list=eng.faceList();thumbs.forEach(t=>t.e.setFaces(list));thumbVer=faceVer;thumbsStale=true;}
  if(thumbsStale){thumbs.forEach(t=>t.e.use(thumbSettings(t.name)));thumbsStale=false;}
  const p=((now/1000)/Math.max(.1,S.dur))%1,dpr=window.devicePixelRatio||1;
  for(const t of thumbs){const cw=t.c.clientWidth,ch=t.c.clientHeight;if(!cw||!ch)continue;
    const w=Math.round(cw*dpr),h=Math.round(ch*dpr);if(t.c.width!==w||t.c.height!==h){t.c.width=w;t.c.height=h;}
    const W=300,H=Math.round(300*ch/cw);try{t.e.renderFrame(t.c.getContext('2d'),W,H,p,w/W,true);}catch(e){}}
}
if(window.IntersectionObserver)queueMicrotask(()=>new IntersectionObserver(es=>{thumbsSeen=es.some(e=>e.isIntersecting);}).observe(presetCard));
