/* The house colour picker (Segue 1.0, November 2026) – one for every Ensemble tool.
   It takes the place of the browser's own picker on every <input type="color">: the input stays what the
   tool reads and listens to (its value, its input and change events), so a tool adopts this by including
   the file – nothing else changes. A field of shade and strength, a hue bar, a pipette, hex and RGB to
   type into, and the colours already in use in the piece. Styled on the shared tokens. */
(()=>{
if(window.EnsColour)return;
const CSS=`
.cpk{position:fixed;z-index:2000;width:236px;box-sizing:border-box;padding:10px;border-radius:var(--r-surface,14px);background:color-mix(in srgb,var(--app,#fff) 96%,transparent);-webkit-backdrop-filter:blur(24px) saturate(1.4);backdrop-filter:blur(24px) saturate(1.4);box-shadow:0 0 0 1px var(--keyline,rgba(43,43,43,.1)),0 12px 36px rgba(0,0,0,.14);font-family:var(--face,"Helvetica Neue",Arial,sans-serif);color:var(--ink,#2b2b2b);-webkit-user-select:none;user-select:none;letter-spacing:0}
.cpk[hidden]{display:none}
.cpk-sv{position:relative;height:136px;border-radius:var(--r-ctl,8px);cursor:crosshair;touch-action:none;overflow:hidden;box-shadow:inset 0 0 0 1px var(--keyline,rgba(43,43,43,.1))}
.cpk-sv::before,.cpk-sv::after{content:'';position:absolute;inset:0;pointer-events:none}
.cpk-sv::before{background:linear-gradient(to right,#fff,rgba(255,255,255,0))}
.cpk-sv::after{background:linear-gradient(to top,#000,rgba(0,0,0,0))}
.cpk-dot{position:absolute;z-index:1;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 3px rgba(0,0,0,.35);pointer-events:none}
.cpk-row{display:flex;align-items:center;gap:8px;margin-top:10px}
.cpk-eye{all:unset;box-sizing:border-box;flex:none;width:28px;height:28px;border-radius:var(--r-ctl,8px);background:var(--k-fill,rgba(43,43,43,.06));display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink,#2b2b2b);transition:background .12s}
.cpk-eye:hover{background:var(--k-fill-hover,rgba(43,43,43,.1))}
.cpk-eye:focus-visible,.cpk-sw:focus-visible{outline:2px solid var(--focus,#4a7dff);outline-offset:2px}
.cpk-eye[aria-pressed="true"]{background:var(--fill-ink,#2b2b2b);color:var(--on-ink,#fff)}
.cpk-eye svg{width:14px;height:14px;display:block}
.cpk-now{flex:none;width:28px;height:28px;border-radius:var(--r-ctl,8px);box-shadow:inset 0 0 0 1px var(--keyline,rgba(43,43,43,.1))}
.cpk-hue{position:relative;flex:1;height:12px;border-radius:6px;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);cursor:pointer;touch-action:none}
.cpk-hue i{position:absolute;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.25),0 1px 3px rgba(0,0,0,.25);pointer-events:none}
.cpk-f{display:grid;grid-template-columns:1.7fr 1fr 1fr 1fr;gap:6px;margin-top:10px}
.cpk-f label{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;color:var(--muted,#67656b);min-width:0}
.cpk-f input{all:unset;box-sizing:border-box;width:100%;height:28px;border-radius:var(--r-ctl,8px);background:var(--k-fill,rgba(43,43,43,.06));text-align:center;font-size:12px;font-variant-numeric:tabular-nums;color:var(--ink,#2b2b2b);-webkit-user-select:text;user-select:text;cursor:text}
.cpk-f input:focus{box-shadow:inset 0 0 0 1.5px var(--focus,#4a7dff)}
.cpk-used{margin-top:10px;padding-top:10px;border-top:1px solid var(--keyline,rgba(43,43,43,.1))}
.cpk-used[hidden]{display:none}
.cpk-used span{display:block;font-size:11px;color:var(--muted,#67656b);margin-bottom:6px}
.cpk-sws{display:flex;gap:6px;flex-wrap:wrap}
.cpk-sw{all:unset;box-sizing:border-box;width:20px;height:20px;border-radius:var(--r-sw,5px);box-shadow:inset 0 0 0 1px var(--hair,rgba(43,43,43,.2));cursor:pointer}
.cpk-tip{position:fixed;z-index:2001;left:50%;top:14px;transform:translateX(-50%);padding:0 12px;height:28px;line-height:28px;border-radius:14px;background:var(--fill-ink,#2b2b2b);color:var(--on-ink,#fff);font-family:var(--face,"Helvetica Neue",Arial,sans-serif);font-size:12px;pointer-events:none;white-space:nowrap}
html.cpk-picking,html.cpk-picking *{cursor:crosshair!important}
`;
const el=(t,c)=>{const e=document.createElement(t);if(c)e.className=c;return e;};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const hx=n=>Math.round(clamp(n,0,255)).toString(16).padStart(2,'0');
const toHex=(r,g,b)=>('#'+hx(r)+hx(g)+hx(b)).toUpperCase();
const parse=s=>{s=String(s||'').trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(s))s=s.replace(/./g,'$&$&');return /^[0-9a-f]{6}$/i.test(s)?[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)):null;};
function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;
  if(d){h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360;}return[h,mx?d/mx:0,mx];}
function hsv2rgb(h,s,v){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return[(r+m)*255,(g+m)*255,(b+m)*255];}
const EYE='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="m8.2 3.4 2.4 2.4M9.3 2.3a1.55 1.55 0 0 1 2.4 2.4L10 6.4 7.6 4zM7.9 4.9 3.3 9.5l-.8 2 2-.8 4.6-4.6" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let box=null,sv,dot,hue,knob,now,eye,fHex,fR,fG,fB,used,sws,target=null,h=0,s=0,v=0,start='',picking=null;
function make(){const st=el('style');st.textContent=CSS;document.head.append(st);
  box=el('div','cpk');box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-label','Colour');
  sv=el('div','cpk-sv');dot=el('div','cpk-dot');sv.append(dot);
  const row=el('div','cpk-row');eye=el('button','cpk-eye');eye.type='button';eye.innerHTML=EYE;eye.setAttribute('aria-label','Pick a colour from the screen');eye.title='Pick a colour from the screen';
  now=el('div','cpk-now');hue=el('div','cpk-hue');knob=el('i');hue.append(knob);row.append(eye,now,hue);
  const f=el('div','cpk-f');const field=(name,max)=>{const l=el('label'),i=el('input');i.type='text';i.spellcheck=false;i.autocomplete='off';i.inputMode=max?'numeric':'text';i.maxLength=max?3:7;i.setAttribute('aria-label',name);const t=el('span');t.textContent=name;l.append(i,t);f.append(l);return i;};
  fHex=field('Hex');fR=field('R',255);fG=field('G',255);fB=field('B',255);
  used=el('div','cpk-used');const ut=el('span');ut.textContent='In use';sws=el('div','cpk-sws');used.append(ut,sws);
  box.append(sv,row,f,used);document.body.append(box);
  const drag=(node,fn)=>{node.addEventListener('pointerdown',e=>{e.preventDefault();node.setPointerCapture(e.pointerId);fn(e);const mv=ev=>fn(ev),up=()=>{node.removeEventListener('pointermove',mv);node.removeEventListener('pointerup',up);node.removeEventListener('pointercancel',up);};
    node.addEventListener('pointermove',mv);node.addEventListener('pointerup',up);node.addEventListener('pointercancel',up);});};
  drag(sv,e=>{const r=sv.getBoundingClientRect();s=clamp((e.clientX-r.left)/r.width,0,1);v=1-clamp((e.clientY-r.top)/r.height,0,1);push();});
  drag(hue,e=>{const r=hue.getBoundingClientRect();h=clamp((e.clientX-r.left)/r.width,0,1)*360;if(h>=360)h=359.9;push();});
  fHex.addEventListener('input',()=>{const c=parse(fHex.value);if(c){[h,s,v]=keepHue(rgb2hsv(...c));push(fHex);}});
  for(const i of [fR,fG,fB])i.addEventListener('input',()=>{const c=[fR,fG,fB].map(x=>parseInt(x.value,10));if(c.every(n=>n>=0&&n<=255)){[h,s,v]=keepHue(rgb2hsv(...c));push(i);}});
  for(const i of [fHex,fR,fG,fB]){i.addEventListener('blur',()=>paint());i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();close(true);}e.stopPropagation();if(e.key==='Escape')close(false);});i.addEventListener('focus',()=>i.select());}
  for(const [i,k] of [[fR,0],[fG,1],[fB,2]])i.addEventListener('keydown',e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();const c=hsv2rgb(h,s,v).map(Math.round);c[k]=clamp(c[k]+(e.key==='ArrowUp'?1:-1)*(e.shiftKey?10:1),0,255);[h,s,v]=keepHue(rgb2hsv(...c));push();});
  eye.addEventListener('click',pipette);
  document.addEventListener('pointerdown',e=>{if(!box||box.hidden||picking)return;if(box.contains(e.target)||e.target===target)return;close(true);},true);
  document.addEventListener('keydown',e=>{if(picking&&e.key==='Escape'){e.preventDefault();e.stopPropagation();endPick();return;}if(box&&!box.hidden&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close(false);}},true);
  addEventListener('resize',()=>{if(box&&!box.hidden)place();});}
/* a grey or black has no hue of its own: keep the one in hand, so the field doesn't jump to red */
const keepHue=([nh,ns,nv])=>[ns<.004||nv<.004?h:nh,nv<.004?s:ns,nv];
const hexNow=()=>toHex(...hsv2rgb(h,s,v));
function paint(skip){const [r,g,b]=hsv2rgb(h,s,v).map(Math.round),hex=toHex(r,g,b);
  sv.style.background=`hsl(${h} 100% 50%)`;dot.style.left=s*100+'%';dot.style.top=(1-v)*100+'%';knob.style.left=h/360*100+'%';now.style.background=hex;
  if(skip!==fHex)fHex.value=hex;if(skip!==fR)fR.value=r;if(skip!==fG)fG.value=g;if(skip!==fB)fB.value=b;}
function push(skip){paint(skip);if(!target)return;const hex=hexNow();if(target.value.toUpperCase()===hex)return;target.value=hex;target.dispatchEvent(new Event('input',{bubbles:true}));}
function place(){const r=target.getBoundingClientRect(),w=box.offsetWidth,hh=box.offsetHeight,m=8;
  let x=clamp(r.right-w,m,innerWidth-w-m),y=r.bottom+m;if(y+hh>innerHeight-m)y=r.top-m-hh;if(y<m)y=clamp(innerHeight-hh-m,m,innerHeight);
  box.style.left=Math.round(x)+'px';box.style.top=Math.round(y)+'px';}
function swatches(){const seen=new Set(),list=[];
  for(const i of document.querySelectorAll('input[type="color"]')){const c=String(i.value||'').toUpperCase();if(parse(c)&&!seen.has(c)){seen.add(c);list.push(c);}}
  let rec=[];try{rec=JSON.parse(localStorage.getItem('ens:colours')||'[]');}catch(e){}
  for(const c of rec)if(parse(c)&&!seen.has(c)){seen.add(c);list.push(c);}
  sws.textContent='';for(const c of list.slice(0,16)){const b=el('button','cpk-sw');b.type='button';b.style.background=c;b.title=c;b.setAttribute('aria-label',c);b.onclick=()=>{[h,s,v]=keepHue(rgb2hsv(...parse(c)));push();};sws.append(b);}
  used.hidden=!list.length;}
function open(input){if(!box)make();if(target&&target!==input)close(true);target=input;start=String(input.value||'#000000').toUpperCase();
  const c=parse(start)||[0,0,0];[h,s,v]=rgb2hsv(...c);swatches();box.hidden=false;paint();place();}
function close(keep){if(!box||box.hidden)return;const t=target;box.hidden=true;target=null;if(!t)return;
  if(!keep&&t.value.toUpperCase()!==start){t.value=start;t.dispatchEvent(new Event('input',{bubbles:true}));}
  const end=t.value.toUpperCase();if(end!==start){try{let rec=JSON.parse(localStorage.getItem('ens:colours')||'[]');rec=[end,...rec.filter(c=>c!==end)].slice(0,8);localStorage.setItem('ens:colours',JSON.stringify(rec));}catch(e){}}
  t.dispatchEvent(new Event('change',{bubbles:true}));}
/* the pipette: the browser's own where it has one (anywhere on the screen); otherwise from any canvas on the page –
   which is where the picture is, and works in Safari */
function sample(cv,cx,cy){try{const r=cv.getBoundingClientRect(),x=Math.floor((cx-r.left)/r.width*cv.width),y=Math.floor((cy-r.top)/r.height*cv.height);
    const t=el('canvas');t.width=t.height=1;const c=t.getContext('2d');c.drawImage(cv,x,y,1,1,0,0,1,1);const d=c.getImageData(0,0,1,1).data;return d[3]<8?null:toHex(d[0],d[1],d[2]);}catch(e){return null;}}
function take(hex){const c=parse(hex);if(!c)return;[h,s,v]=keepHue(rgb2hsv(...c));push();}
function endPick(){if(!picking)return;const p=picking;picking=null;document.documentElement.classList.remove('cpk-picking');p.tip.remove();
  document.removeEventListener('pointerdown',p.down,true);document.removeEventListener('pointermove',p.move,true);document.removeEventListener('click',p.click,true);
  eye.setAttribute('aria-pressed','false');box.style.visibility='';}
function pipette(){if(picking){endPick();return;}
  if(window.EyeDropper){new window.EyeDropper().open().then(r=>take(r.sRGBHex)).catch(()=>{});return;}
  if(!document.querySelector('canvas'))return;
  const tip=el('div','cpk-tip');tip.textContent='Click a colour on the canvas – Esc to cancel';document.body.append(tip);
  const at=e=>{const n=document.elementFromPoint(e.clientX,e.clientY);return n&&n.tagName==='CANVAS'?sample(n,e.clientX,e.clientY):null;};
  const p={tip,move:e=>{const c=at(e);if(c)now.style.background=c;},
    down:e=>{e.preventDefault();e.stopPropagation();const c=at(e);endPick();if(c)take(c);else paint();p.swallow=true;setTimeout(()=>{p.swallow=false;document.removeEventListener('click',p.click,true);},400);document.addEventListener('click',p.click,true);},
    click:e=>{if(p.swallow){e.preventDefault();e.stopPropagation();}}};
  picking=p;eye.setAttribute('aria-pressed','true');document.documentElement.classList.add('cpk-picking');box.style.visibility='hidden';
  document.addEventListener('pointerdown',p.down,true);document.addEventListener('pointermove',p.move,true);}
/* every colour input opens this, not the browser's */
document.addEventListener('click',e=>{const t=e.target&&e.target.closest?e.target.closest('input[type="color"]'):null;if(!t||t.disabled||t.dataset.native!=null)return;
  e.preventDefault();if(target===t&&box&&!box.hidden){close(true);return;}open(t);},true);
window.EnsColour={open,close,get isOpen(){return!!box&&!box.hidden;}};
})();
