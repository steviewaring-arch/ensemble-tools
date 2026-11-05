/* UI round 4 – the mock-up engine. One description of each tool (its sections and controls)
   drawn three ways: 'vn' as built now, 'va' (A – evolution) and 'vb' (B – studio).
   Everything here is a mock-up: nothing touches the real apps. */
(function(){
'use strict';
const SVG={
  chev:'<svg class="chev" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chevS:'<svg class="chev" style="transform:none" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check:'<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 5.2 4.1 7.3 8 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  shuffle:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 3.5h2c2.5 0 3 5 5.5 5H10.5M1.5 8.5h2c1 0 1.6-.8 2.1-1.8M7 4.3c.5-.5 1.1-.8 2-.8h1.5M9.2 2l1.5 1.5-1.5 1.5M9.2 7l1.5 1.5L9.2 10" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  reset:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6a3.5 3.5 0 1 0 1-2.5M2.3 1.8v2h2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search:'<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="5.2" cy="5.2" r="3.4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="m7.8 7.8 2.6 2.6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  undo:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4 2.5 7l3 3M3 7h6.5a3.5 3.5 0 0 1 0 7H8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  redo:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 4l3 3-3 3M13 7H6.5a3.5 3.5 0 0 0 0 7H8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x:'<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
  expand:'<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M8.5 2.5h3v3M11.5 2.5 7.8 6.2M5.5 11.5h-3v-3M2.5 11.5l3.7-3.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  theme:'<svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7 1.8a5.2 5.2 0 0 1 0 10.4z" fill="currentColor"/></svg>',
  grid:'<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="2" width="4" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="2" width="4" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="8" width="4" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="8" y="8" width="4" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  pause:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5v7M8 2.5v7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  back:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 2.5v7M9.5 2.5 5 6l4.5 3.5z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  plus:'<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6 2.5v7M2.5 6h7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
};
const KINDS={Slides:'<rect x="2" y="3" width="14" height="14" rx="1.5" fill="currentColor"/><rect x="19" y="6" width="5" height="8" rx="1" fill="currentColor" opacity=".35"/>',
  Line:'<rect x="1" y="6" width="8" height="8" rx="1" fill="currentColor" opacity=".35"/><rect x="11" y="6" width="8" height="8" rx="1" fill="currentColor"/><rect x="21" y="6" width="8" height="8" rx="1" fill="currentColor" opacity=".35"/>',
  Grid:'<g fill="currentColor"><rect x="3" y="3" width="7" height="6" rx="1"/><rect x="12" y="3" width="7" height="6" rx="1"/><rect x="21" y="3" width="7" height="6" rx="1"/><rect x="3" y="11" width="7" height="6" rx="1" opacity=".35"/><rect x="12" y="11" width="7" height="6" rx="1" opacity=".35"/><rect x="21" y="11" width="7" height="6" rx="1" opacity=".35"/></g>',
  Columns:'<g fill="currentColor"><rect x="4" y="1" width="6" height="8" rx="1"/><rect x="4" y="11" width="6" height="8" rx="1" opacity=".35"/><rect x="12" y="4" width="6" height="8" rx="1" opacity=".35"/><rect x="20" y="2" width="6" height="7" rx="1"/><rect x="20" y="11" width="6" height="7" rx="1" opacity=".35"/></g>',
  Frames:'<g fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="4" width="8" height="12" rx="1"/><rect x="11.5" y="4" width="8" height="12" rx="1"/><rect x="21" y="4" width="8" height="12" rx="1"/></g><g fill="currentColor"><rect x="4" y="7" width="4" height="6"/><rect x="13.5" y="7" width="4" height="6"/><rect x="23" y="7" width="4" height="6"/></g>',
  Float:'<g fill="currentColor"><rect x="12" y="2" width="8" height="10" rx="1"/><rect x="3" y="9" width="6" height="6" rx="1" opacity=".35"/><rect x="21" y="11" width="6" height="7" rx="1" opacity=".6"/></g>'};

const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const dps=c=>c.dp!=null?c.dp:(c.step&&c.step<1?String(c.step).split('.')[1].length:0);
function fmt(c,v){let s=(+v).toFixed(dps(c));if(c.pre)s=c.pre+s;if(c.u)s+=c.u;return s;}

/* ---------------- one mock: undo, changes ---------------- */
function Mock(root,schema,variant,opts){
  const M={root,schema,variant,ctrls:[],stack:[],redo:[],secs:[],opts:opts||{},listeners:[]};
  M.emit=s=>M.listeners.forEach(f=>f(s));
  M.track=(c,prev,next,label)=>{M.stack.push({c,prev,next,label});M.redo.length=0;M.emit({c,prev,next,label});};
  M.undo=()=>{const s=M.stack.pop();if(!s)return;s.c.set(s.prev,{anim:true,silent:true});M.redo.push(s);M.emit(null);};
  M.redoIt=()=>{const s=M.redo.pop();if(!s)return;s.c.set(s.next,{anim:true,silent:true});M.stack.push(s);M.emit(null);};
  M.refresh=()=>{for(const S of M.secs){const n=S.ctrls.filter(c=>c.changed()).length;S.dot&&S.dot.classList.toggle('on',n>0);S.reset&&S.reset.classList.toggle('on',n>0);}M.onRefresh&&M.onRefresh();};
  return M;
}
/* a number that rolls to its new value */
function rollTo(box,text,dir){
  if(reduce.matches||!box.isConnected||box.closest('.still')){box.textContent=text;return;}
  const old=box.textContent;if(old===text)return;
  box.classList.add('roll');box.classList.toggle('dn',dir<0);box.innerHTML='';
  const o=el('span','out');o.textContent=old;const n=el('span','in');n.textContent=text;box.append(o,n);
  setTimeout(()=>{if(o.isConnected)o.remove();},300);
}
/* B's change column: a red dot once a control moves from its default; click it to reset */
function cx(C){const b=el('button','cx');b.type='button';b.title='Changed – click to reset';b.setAttribute('aria-label','Reset '+C.c.l);b.onclick=()=>{if(C.changed())C.reset();};return b;}

/* ---------------- controls ---------------- */
function range(M,c,variant,style){
  const def=c.def!=null?c.def:c.v,step=c.step||1,zero=c.min<0?0:c.min;let v=c.v;
  let W,trk,fl,kb,nt,vb,lab,bar,tk,vv;
  vb=el('button','vbtn');vb.type='button';vb.title='Click to type a value';vb.textContent=fmt(c,v);
  if(variant==='vn'){W=el('div','rg');bar=el('i','bar');tk=el('i','tk');vv=el('span','vv');trk=el('div','trk');W.append(bar,tk,el('span','lb',c.l),vv,trk);}
  else if(variant==='va'){W=el('div','rgA'+(style?' '+style:''));lab=el('span','lab',c.l);const vbx=el('span','vbx');vbx.append(vb);
    trk=el('div','trk');trk.append(el('i','ln'),fl=el('i','fl'),nt=el('i','nt'),kb=el('i','kb'));W.append(lab,vbx,trk);
    if(c.ends){const e=el('div','ends');e.innerHTML=`<span>${c.ends[0]}</span><span>${c.ends[1]}</span>`;W.append(e);}}
  else{W=el('div','rB');trk=el('div','loz');trk.append(fl=el('i','fl'),nt=el('i','nt'),kb=el('i','kb'),el('span','ll',c.l));const vr=el('span','vr');vr.append(vb);trk.append(vr);
    const col=el('div','');col.append(trk);if(c.ends){const e=el('div','ends');e.innerHTML=`<span>${c.ends[0]}</span><span>${c.ends[1]}</span>`;col.append(e);}W.append(col);}
  trk.tabIndex=0;trk.setAttribute('role','slider');trk.setAttribute('aria-label',c.l);
  if(nt)nt.style.left=((def-c.min)/(c.max-c.min)*100)+'%';
  W.dataset.find=c.l;
  function paint(){const p=(v-c.min)/(c.max-c.min),z=(zero-c.min)/(c.max-c.min);
    if(variant==='vn'){bar.style.width=`calc(16px + (100% - 16px) * ${p})`;tk.style.left=`calc(16px + (100% - 32px) * ${p})`;tk.style.opacity=(p<.03||p>.97)?0:1;vv.textContent=fmt(c,v);}
    else if(variant==='va'){kb.style.left=(p*100)+'%';fl.style.left=(Math.min(p,z)*100)+'%';fl.style.width=(Math.abs(p-z)*100)+'%';}
    else{kb.style.left=`calc(5px + (100% - 10px) * ${p})`;splitKb(p);fl.style.left=(c.min<0?`calc(5px + (100% - 10px) * ${Math.min(p,z)})`:'0');fl.style.width=c.min<0?`calc((100% - 10px) * ${Math.abs(p-z)})`:`calc(5px + (100% - 10px) * ${p})`;}
    trk.setAttribute('aria-valuenow',v);trk.setAttribute('aria-valuetext',fmt(c,v));W.classList.toggle('chg',Math.abs(v-def)>1e-9);}
  /* B: where the handle would cross the label or the value, it splits into two short ticks */
  function splitKb(p){const w=trk.offsetWidth;if(!w)return;const x=5+(w-10)*p,ll=trk.querySelector('.ll'),vr=trk.querySelector('.vr');let over=false;
    if(ll&&x>ll.offsetLeft-3&&x<ll.offsetLeft+ll.offsetWidth+3)over=true;if(vr&&x>vr.offsetLeft-3&&x<vr.offsetLeft+vr.offsetWidth+3)over=true;kb.classList.toggle('split',over);}
  const C={c,el:W,get v(){return v;},changed:()=>Math.abs(v-def)>1e-9,reset(){C.set(def,{anim:true});},
    set(n,o){o=o||{};n=clamp(Math.round(n/step)*step,c.min,c.max);n=+n.toFixed(6);if(n===v){paint();return;}const prev=v;v=n;
      if(o.anim&&variant!=='vn'){trk.classList.add('ease');setTimeout(()=>trk.classList.remove('ease'),400);}
      paint();if(variant!=='vn'){if(o.anim)rollTo(vb,fmt(c,v),n>prev?1:-1);else vb.textContent=fmt(c,v);}
      if(!o.silent&&!o.drag)M.track(C,prev,v,c.l);M.refresh();}};
  if(variant==='vb')W.append(cx(C));
  paint();C.place=()=>paint();
  let dragStart=null;
  const at=x=>{const r=trk.getBoundingClientRect();const pad=variant==='vb'?5*(r.width/trk.offsetWidth||1):0;return c.min+clamp((x-r.left-pad)/(r.width-2*pad),0,1)*(c.max-c.min);};
  trk.addEventListener('pointerdown',e=>{if(e.button||e.target===vb||e.target.closest('.vin'))return;e.preventDefault();trk.focus({preventScroll:true});trk.setPointerCapture(e.pointerId);trk.classList.add('drag');dragStart=v;
    if(e.target!==kb)C.set(at(e.clientX),{drag:true,anim:variant!=='vn'});
    const off=e.target===kb?at(e.clientX)-v:0;
    const mv=ev=>{let n=at(ev.clientX)-off;if(variant!=='vn'&&Math.abs(n-def)<(c.max-c.min)*.012)n=def;C.set(n,{drag:true});};
    const up=()=>{trk.classList.remove('drag');trk.removeEventListener('pointermove',mv);trk.removeEventListener('pointerup',up);trk.removeEventListener('pointercancel',up);if(dragStart!==v)M.track(C,dragStart,v,c.l);};
    trk.addEventListener('pointermove',mv);trk.addEventListener('pointerup',up);trk.addEventListener('pointercancel',up);});
  trk.addEventListener('dblclick',e=>{if(e.target===vb)return;C.reset();});
  trk.addEventListener('keydown',e=>{if(e.target!==trk)return;const k=e.key,big=e.shiftKey?10:1;let n=null;
    if(k==='ArrowRight'||k==='ArrowUp')n=v+step*big;else if(k==='ArrowLeft'||k==='ArrowDown')n=v-step*big;else if(k==='Home')n=c.min;else if(k==='End')n=c.max;
    if(n!=null){e.preventDefault();C.set(n,{anim:true});}});
  vb.addEventListener('pointerdown',e=>e.stopPropagation());
  vb.addEventListener('click',e=>{e.stopPropagation();if(variant==='vn')return;const inp=el('input','vin');inp.value=(+v).toFixed(dps(c));inp.inputMode='decimal';
    vb.replaceWith(inp);inp.focus();inp.select();let done=false;
    const fin=ok=>{if(done)return;done=true;const n=parseFloat(inp.value.replace(/[^\d.\-]/g,''));inp.replaceWith(vb);if(ok&&!isNaN(n))C.set(n,{anim:true});};
    inp.addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Enter'){ev.preventDefault();fin(true);}else if(ev.key==='Escape'){ev.preventDefault();fin(false);}});
    inp.addEventListener('pointerdown',ev=>ev.stopPropagation());inp.addEventListener('blur',()=>fin(true));});
  M.ctrls.push(C);return C;
}
function fitsRow(o,width){return o.length<=6&&o.reduce((a,s)=>a+s.length*6.6+18,0)<=width;}
function row(variant,label,control,C){ /* a labelled row in each style */
  let W;if(variant==='vb'){W=el('div','r2');const cc=el('div','c');cc.append(control);W.append(el('span','lab',label),cc);if(C)W.append(cx(C));else W.append(el('span',''));}
  else{W=el('div','row');W.append(el('span','lab',label),control);}
  return W;}
function choice(M,c,variant){
  let v=c.v||0;const def=c.def!=null?c.def:v;
  const C={c,get v(){return v;},changed:()=>v!==def,reset(){C.set(def);}};
  if(variant==='va'&&!fitsRow(c.o,262)){ /* A: more than fits a row becomes a menu */
    const W=el('div','ctlc');W.dataset.find=c.l;W.append(el('span','lab',c.l));
    const s=el('span','sel full');const t=el('span','',c.o[v]);const sel=el('select');sel.setAttribute('aria-label',c.l);
    c.o.forEach((o,i)=>{const op=el('option');op.value=i;op.textContent=o;sel.append(op);});sel.value=v;s.append(t,el('span','',SVG.chevS),sel);W.append(s);
    sel.onchange=()=>C.set(+sel.value);
    C.set=(n,o)=>{o=o||{};if(n===v)return;const p=v;v=n;t.textContent=c.o[v];sel.value=v;if(!o.silent)M.track(C,p,v,c.l);M.refresh();};
    C.el=W;M.ctrls.push(C);return C;}
  const g=el('div',variant==='vb'?'words':'seg');g.setAttribute('role','radiogroup');g.setAttribute('aria-label',c.l);
  const hl=el('i',variant==='vb'?'ul':'hl');if(variant!=='vn')g.append(hl);
  const opts=c.o.map((o,i)=>{const b=el('button','opt',o);b.type='button';b.setAttribute('role','radio');b.onclick=()=>C.set(i);g.append(b);return b;});
  if(variant==='vn'){const n=c.o.length;g.style.setProperty('--cols',n<=4&&c.o.join('').length<26?n:Math.min(3,Math.ceil(n/2)));}
  C.place=anim=>{if(variant==='vn')return;const b=opts[v];if(!b.offsetWidth)return;if(!anim)hl.style.transition='none';
    hl.style.left=b.offsetLeft+'px';hl.style.width=b.offsetWidth+'px';if(variant==='vb')hl.style.top=(b.offsetTop+b.offsetHeight-3)+'px';
    if(!anim){void hl.offsetWidth;hl.style.transition='';}};
  C.set=(n,o)=>{o=o||{};const p=v;v=n;opts.forEach((b,i)=>b.setAttribute('aria-checked',i===v));W.classList.toggle('chg',v!==def);C.place(true);if(p!==v&&!o.silent)M.track(C,p,v,c.l);M.refresh();};
  opts.forEach((b,i)=>b.setAttribute('aria-checked',i===v));
  let W;if(variant==='vb'){W=row('vb',c.l,g,C);W.classList.add('tp');}else{W=el('div','ctlc');W.append(el('span','lab',c.l),g);}
  W.dataset.find=c.l;C.el=W;M.ctrls.push(C);return C;
}
function toggle(M,c,variant){let v=!!c.v;const def=c.def!=null?!!c.def:v;
  const b=el('button','tog');b.type='button';b.setAttribute('role','switch');b.innerHTML=`<span class="tick">${SVG.check}</span><span>${c.l}</span>`;
  let W=b;const C={c,get v(){return v;},changed:()=>v!==def,reset(){C.set(def);},
    set(n,o){o=o||{};const p=v;v=!!n;b.setAttribute('aria-checked',v);W.classList.toggle('chg',v!==def);if(p!==v&&!o.silent)M.track(C,p,v,c.l);M.refresh();}};
  b.setAttribute('aria-checked',v);b.onclick=()=>C.set(!v);
  if(variant==='vb'){W=el('div','row1');W.append(b,cx(C));}
  W.dataset.find=c.l;C.el=W;M.ctrls.push(C);return C;}
function select(M,c,variant){let v=c.v||0;const def=v;
  const s=el('span','sel');const t=el('span','',c.o[v]);const sel=el('select');sel.setAttribute('aria-label',c.l);
  c.o.forEach((o,i)=>{const op=el('option');op.value=i;op.textContent=o;sel.append(op);});s.append(t,el('span','',SVG.chevS),sel);
  let W;const C={c,get v(){return v;},changed:()=>v!==def,reset(){C.set(def);},set(n,o){o=o||{};const p=v;v=n;t.textContent=c.o[v];sel.value=v;W.classList.toggle('chg',v!==def);if(p!==v&&!o.silent)M.track(C,p,v,c.l);M.refresh();}};
  sel.onchange=()=>C.set(+sel.value);W=row(variant,c.l,s,C);W.dataset.find=c.l;C.el=W;M.ctrls.push(C);return C;}
function stepper(M,c,variant){let v=c.v;const def=v;const s=el('span','stp');const m=el('button','','–'),n=el('span','',String(v)),p=el('button','','+');s.append(m,n,p);
  let W;const C={c,get v(){return v;},changed:()=>v!==def,reset(){C.set(def);},set(x,o){o=o||{};x=clamp(x,c.min,c.max);if(x===v)return;const pr=v;v=x;rollTo(n,String(v),x>pr?1:-1);W.classList.toggle('chg',v!==def);if(!o.silent)M.track(C,pr,v,c.l);M.refresh();}};
  m.onclick=()=>C.set(v-1);p.onclick=()=>C.set(v+1);W=row(variant,c.l,s,C);W.dataset.find=c.l;C.el=W;M.ctrls.push(C);return C;}
function colour(c,variant){const sw=el('span','sw');sw.style.setProperty('--c',c.v);const r=el('span','');r.style.cssText='display:flex;gap:8px;align-items:center';
  if(c.hex)r.append(el('span','note',c.v.toUpperCase()));r.append(sw);if(variant==='vb'){r.style.flexDirection='row-reverse';r.style.justifyContent='flex-end';}
  const W=row(variant,c.l,r);W.dataset.find=c.l;return W;}
function buttons(c){const W=el('div','btns');for(const b of c.items){const x=el('button','btn'+(b.primary?' primary':''),b.l);x.type='button';if(b.basis)x.style.flexBasis=b.basis;W.append(x);}return W;}
function quiet(l){const b=el('button','qa');b.type='button';b.innerHTML=(/Random/.test(l)?SVG.shuffle:SVG.reset)+'<span>'+l+'</span>';return b;}
function tiles(M,c){let v=c.v||0;const W=el('div','tiles');W.setAttribute('role','radiogroup');W.setAttribute('aria-label',c.l);
  const bs=c.o.map((o,i)=>{const b=el('button','tile');b.type='button';b.setAttribute('role','radio');b.innerHTML=`<svg viewBox="0 0 30 20">${KINDS[o]||''}</svg>${o}`;b.onclick=()=>set(i);W.append(b);return b;});
  const C={c,el:W,get v(){return v;},changed:()=>false,reset(){},set:(i,o)=>set(i,o)};
  function set(i,o){const p=v;v=i;bs.forEach((b,j)=>b.setAttribute('aria-checked',j===v));if(p!==v&&!(o&&o.silent))M.track(C,p,v,c.l);M.refresh();}
  bs.forEach((b,j)=>b.setAttribute('aria-checked',j===v));M.ctrls.push(C);return W;}
function themes(c){let v=0;const W=el('div','themes');const bs=c.o.map((o,i)=>{const b=el('button','theme');b.type='button';b.setAttribute('role','radio');
  b.innerHTML=`<i style="background:${o[1]};color:${o[2]}">12<span style="color:${o[3]}">,</span>47</i>${o[0]}`;b.onclick=()=>{v=i;bs.forEach((x,j)=>x.setAttribute('aria-checked',j===v));};W.append(b);return b;});
  bs.forEach((x,j)=>x.setAttribute('aria-checked',j===v));return W;}
function fonts(c){const W=el('div','');for(const f of c.items){const r=el('div','fontrow');r.innerHTML=`<span class="fn"><b>${f[0]}</b><small>${f[1]}</small></span><button class="use${f[2]?' on':''}" type="button">${f[2]?'Default':'Use'}</button><button class="x" type="button" aria-label="Remove ${f[0]}">${SVG.x}</button>`;W.append(r);}return W;}
function bands(){const W=el('div','bands');const names=['Highlights','Light mid','Mid high','Mid low','Dark mid','Shadows'];const g=['#c9c9c9','#9d9d9d','#767676','#4f4f4f','#2a2a2a','#000'];
  names.forEach((n,i)=>{const r=el('div','band');r.innerHTML=`<span class="n">${i+1}</span><span class="sw" style="--c:${g[i]}"></span><span class="nm">${n}</span><span class="svg">SVG</span>`;W.append(r);});return W;}
function presets(c){const W=el('div','pset');W.setAttribute('role','radiogroup');let v=0;const bs=c.o.map((o,i)=>{const b=el('button','');b.type='button';b.setAttribute('role','radio');b.innerHTML=`<i>${o[1]||''}</i>${o[0]}`;b.onclick=()=>{v=i;bs.forEach((x,j)=>x.setAttribute('aria-checked',j===v));};W.append(b);return b;});
  bs.forEach((x,j)=>x.setAttribute('aria-checked',j===v));return W;}
function slots(c){const W=el('div','slots');for(let i=1;i<=c.n;i++){const s=el('div','slot');s.innerHTML=`<span class="h">⋮⋮</span><span class="th">${SVG.plus}</span><span><b>Slot ${i}</b><small>Drop or click to add</small></span><button class="x" type="button" aria-label="Clear slot ${i}" style="all:unset;color:var(--muted);cursor:pointer">${SVG.x}</button>`;W.append(s);}return W;}

/* ---------------- one control into a section body ---------------- */
function build(M,S,c,variant,body){
  let node=null,C=null;
  switch(c.t){
    case 'range':C=range(M,c,variant,M.opts.slider);node=C.el;break;
    case 'choice':C=choice(M,c,variant);node=C.el;break;
    case 'toggle':C=toggle(M,c,variant);node=C.el;break;
    case 'select':C=select(M,c,variant);node=C.el;break;
    case 'stepper':C=stepper(M,c,variant);node=C.el;break;
    case 'colour':node=colour(c,variant);break;
    case 'btns':node=buttons(c);break;
    case 'note':node=el('div','note',c.l);break;
    case 'hint':node=el('div','hint',variant==='vn'?(c.long||c.l):c.l+(c.more?' <a>More</a>':''));break;
    case 'drop':node=el('div','drop',c.l);break;
    case 'text':node=el('textarea');node.value=c.v;node.rows=2;node.setAttribute('aria-label','Text');break;
    case 'bands':node=bands();break;
    case 'fonts':node=fonts(c);break;
    case 'presets':node=presets(c);break;
    case 'slots':node=slots(c);break;
    case 'tiles':{const t=tiles(M,c);node=el('div','ctlc');node.style.cssText='display:flex;flex-direction:column;gap:7px';node.append(el('span','lab',c.l),t);break;}
    case 'themes':node=themes(c);break;
    case 'head':{node=el('div','head');node.append(el('span','',c.l));if(c.act)node.append(quiet(c.act));break;}
    case 'acts':{node=el('div','acts');for(const a of c.items)node.append(quiet(a));break;}
  }
  if(C)S.ctrls.push(C);
  if(node)body.append(node);
}

/* ---------------- panels ---------------- */
function brand(app,ver,variant){const b=el('div','brand');
  b.innerHTML=variant==='vn'?`<div>${app} <span class="v">${ver}</span></div><div class="by">By ENSEMBLE</div>`:`<div><b>${app}</b> <span class="v">${ver}</span></div><div class="by">By ENSEMBLE</div>`;return b;}
function sections(M,variant,secs,scr){
  for(const sd of secs){const S={sd,ctrls:[]};M.secs.push(S);
    const sec=el('section','sec'+(sd.shut?' shut':''));const sh=el('div','sh');sh.setAttribute('role','button');sh.tabIndex=0;sh.setAttribute('aria-expanded',!sd.shut);
    sh.innerHTML=`<span class="t">${sd.title}</span>`;S.dot=el('span','dot');if(variant!=='vb')sh.append(S.dot);sh.append(el('span','s',sd.sum||''));
    if(variant!=='vn'){S.reset=quiet('Reset');S.reset.classList.add('reset');S.reset.onclick=e=>{e.stopPropagation();S.ctrls.forEach(c=>c.changed()&&c.reset());};if(variant==='va')sh.append(S.reset);
      if(sd.acts&&variant==='va'){for(const a of sd.acts){const q=quiet(a);q.onclick=e=>e.stopPropagation();sh.append(q);}}}
    sh.insertAdjacentHTML('beforeend',SVG.chev);
    const tog=()=>{sec.classList.toggle('shut');sh.setAttribute('aria-expanded',!sec.classList.contains('shut'));setTimeout(()=>placeAll(M),30);};
    sh.onclick=tog;sh.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tog();}};
    const sb=el('div','sb'),inner=el('div',''),body=el('div','sbi');inner.append(body);sb.append(inner);sec.append(sh,sb);scr.append(sec);S.sec=sec;
    if(sd.acts&&variant!=='va'){const a=el('div','acts');if(variant==='vn')a.style.justifyContent='flex-end';sd.acts.forEach(x=>a.append(quiet(x)));body.append(a);}
    for(const c of sd.items)build(M,S,c,variant,body);}
}
function panelScroll(M,variant){const P=el('div','pnl');P.append(brand(M.schema.app,M.schema.ver,variant));const scr=el('div','scr');P.append(scr);sections(M,variant,M.schema.secs,scr);return P;}
/* B: the inspector – find, changed only, sections, reset all */
function inspector(M,secs){
  const P=el('div','pnl insp');const bar=el('div','bar0');
  const find=el('div','find');find.innerHTML=SVG.search+'<input type="search" placeholder="Find a setting" aria-label="Find a setting"><kbd>⌘K</kbd>';
  const cg=el('button','cgf','<i></i>Changed');cg.type='button';cg.setAttribute('aria-pressed','false');cg.title='Show only what you’ve changed';
  const res=el('div','res');bar.append(find,cg,res);P.append(bar);
  const scr=el('div','scr');P.append(scr);sections(M,'vb',secs,scr);
  const ra=el('button','resetall','Reset all');ra.type='button';ra.onclick=()=>M.ctrls.forEach(c=>c.changed()&&c.reset());P.append(ra);
  function filter(){const on=cg.getAttribute('aria-pressed')==='true';let any=false;
    for(const S of M.secs){if(!S.sec||!scr.contains(S.sec))continue;let n=0;
      S.sec.querySelectorAll('.sbi>*').forEach(x=>{const C=M.ctrls.find(c=>c.el===x);const keep=!on||(C&&C.changed&&C.changed());x.classList.toggle('hide',!keep);if(keep&&C)n++;});
      S.sec.classList.toggle('hide',on&&!n);if(on&&n)S.sec.classList.remove('shut');if(n)any=true;}
    let e=scr.querySelector('.empty');if(on&&!any){if(!e)scr.append(el('div','empty','Nothing changed yet – everything is at its default.'));}else if(e)e.remove();
    setTimeout(()=>placeAll(M),20);}
  cg.onclick=()=>{cg.setAttribute('aria-pressed',cg.getAttribute('aria-pressed')!=='true');filter();};
  const cgDot=cg.querySelector('i');cgDot.style.display='none';
  M.onRefresh=()=>{const n=M.ctrls.filter(c=>c.changed()).length;cgDot.style.display=n?'':'none';cg.lastChild.textContent=n?'Changed '+n:'Changed';if(cg.getAttribute('aria-pressed')==='true')filter();};
  const inp=find.querySelector('input');let sel=0,hits=[];
  const all=()=>{const out=[];for(const S of M.secs){if(!S.sec||!scr.contains(S.sec))continue;S.sec.querySelectorAll('[data-find]').forEach(n=>out.push({name:n.dataset.find,sec:S.sd.title,S,n}));}return out;};
  const show=()=>{const q=inp.value.trim().toLowerCase();if(!q){res.classList.remove('on');return;}
    hits=all().filter(x=>x.name.toLowerCase().includes(q)||x.sec.toLowerCase().includes(q)).slice(0,8);sel=0;res.innerHTML='';
    if(!hits.length)res.append(el('p','','Nothing called that'));
    hits.forEach((x,j)=>{const b=el('button',j===0?'on':'');b.type='button';b.innerHTML=`${x.name}<span>${x.sec}</span>`;b.onmousedown=e=>{e.preventDefault();pick(j);};res.append(b);});res.classList.add('on');};
  const pick=j=>{const x=hits[j];if(!x)return;inp.value='';res.classList.remove('on');inp.blur();
    if(x.S.sec.classList.contains('shut')){x.S.sec.classList.remove('shut');setTimeout(()=>placeAll(M),30);}
    setTimeout(()=>{x.n.classList.remove('hide');const r=x.n.getBoundingClientRect(),sr=scr.getBoundingClientRect();const k=sr.height/scr.clientHeight||1;scr.scrollTo({top:scr.scrollTop+(r.top-sr.top)/k-60,behavior:reduce.matches?'auto':'smooth'});
      x.n.classList.remove('flash');void x.n.offsetWidth;x.n.classList.add('flash');},380);};
  inp.addEventListener('input',show);inp.addEventListener('blur',()=>setTimeout(()=>res.classList.remove('on'),120));
  inp.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sel=clamp(sel+(e.key==='ArrowDown'?1:-1),0,hits.length-1);[...res.children].forEach((b,j)=>b.classList.toggle('on',j===sel));}
    else if(e.key==='Enter'){e.preventDefault();pick(sel);}else if(e.key==='Escape'){inp.value='';show();inp.blur();}});
  M.focusFind=()=>inp.focus();
  return P;}
function leftPanel(M,secs){const P=el('div','pnl left vb');const scr=el('div','scr');P.append(scr);sections(M,'vb',secs,scr);return P;}

function placeAll(M){for(const c of M.ctrls)c.place&&c.place(false);}

/* ---------------- the work on the stage ---------------- */
function fitBox(w,h,W,H){const s=Math.min(W/w,H/h);return [Math.round(w*s),Math.round(h*s)];}
function work(cfg,W,H){const [w,h]=fitBox(cfg.ratio[0],cfg.ratio[1],W,H);const d=el('div','work');d.style.width=w+'px';d.style.height=h+'px';
  if(cfg.kind==='img'){d.innerHTML=`<img src="${cfg.src}" alt="">`;}
  else if(cfg.kind==='tempo'){d.style.background='#d3d5d5';d.innerHTML=`<div style="position:absolute;left:5%;top:2%;font-family:var(--face);font-size:${Math.round(w*.3)}px;letter-spacing:-.02em;line-height:1;color:#f4fd5f">13<span style="color:#1e1e1e">,</span>08</div>`;}
  else if(cfg.kind==='rubato'){d.style.background='#fff';d.innerHTML=`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--face);font-style:italic;font-size:${Math.round(w*.2)}px;letter-spacing:-.02em;color:#000">Lazaar</div>`;}
  else if(cfg.kind==='segue'){d.style.background='#f5f5f3';const r=Math.round(w*.025);d.innerHTML=[0,1,2].map(i=>`<div style="position:absolute;left:7%;right:7%;top:${-14+i*41}%;height:36%;border-radius:${r}px;background:#dcdbd7;display:flex;align-items:center;justify-content:center;font-family:var(--face);font-size:${Math.round(w*.08)}px;color:#a9a7a2">${i+1}</div>`).join('');}
  return d;}

/* ---------------- public ---------------- */
const MOCKS=[];let active=null;
function track(M,host){host.addEventListener('pointerdown',()=>{active=M;},true);host.addEventListener('focusin',()=>{active=M;});MOCKS.push(M);requestAnimationFrame(()=>placeAll(M));}
/* a panel on its own */
function mount(host,schema,variant,opts){opts=opts||{};host.classList.add('mk',variant);const M=Mock(host,schema,variant,opts);
  const P=variant==='vb'?inspector(M,schema.secs):panelScroll(M,variant);const W=el('div','solo');W.append(P);host.append(W);track(M,host);return M;}
/* A: the frame as it is, refined */
function frameA(host,app){host.classList.add('mk','va');const M=Mock(host,app.panel,'va',{});const F=el('div','frame');
  const P=panelScroll(M,'va');const L=324,R=1280-12;
  const st=el('div','stage');st.style.left=L+'px';st.append(work(app.work,R-L,780-56-68));
  const top=el('div','top');top.innerHTML=(app.chips||[]).map(c=>`<span class="chip">${c}</span>`).join('')+`<span class="ico">${SVG.expand}</span><span class="ico">${SVG.theme}</span>`;
  const isl=el('div','isl');
  if(app.transport){isl.innerHTML=`<button class="ib" type="button">Pause</button><span class="scrub"><i style="left:38%"></i></span><span class="tm">${app.transport}</span>`;}
  if(app.show){const s=el('span','sel');s.innerHTML=`<b>Show</b>&nbsp;<span>${app.show[0]}</span>${SVG.chevS}`;const sel=el('select');app.show.forEach(o=>{const op=el('option');op.textContent=o;sel.append(op);});sel.onchange=()=>s.querySelector('span').textContent=sel.value;s.append(sel);isl.append(s);}
  if(app.extra)app.extra.forEach(x=>{const b=el('button','ib',x);b.type='button';isl.append(b);});
  if(isl.childNodes.length)isl.append(el('span','div'));
  const t=el('span','toast');isl.append(t);let tm=0;
  M.listeners.push(s=>{clearTimeout(tm);if(!s){t.classList.remove('on');return;}const C=s.c,val=C.c.t==='range'?fmt(C.c,s.next):(C.c.t==='choice'||C.c.t==='select')?C.c.o[s.next]:(s.next?'on':'off');
    t.innerHTML=`<span>${s.label} ${val}</span><u>Undo</u>`;t.querySelector('u').onclick=()=>M.undo();t.classList.add('on');tm=setTimeout(()=>t.classList.remove('on'),4000);});
  isl.append(Object.assign(el('button','ib primary','Export'),{type:'button'}));
  const pr=app.presets?R-150:R;isl.style.left=Math.round(Math.min((L+R)/2,(L+pr)/2+40))+'px';
  F.append(st,P,top,isl);
  if(app.presets){const pc=el('div','pcap');pc.innerHTML=`<span class="pi">${SVG.grid}</span>Presets${SVG.chevS.replace('style="transform:none"','style="transform:rotate(180deg)"')}`;F.append(pc);}
  host.append(F);track(M,host);return M;}
/* B: the studio */
function frameB(host,app){host.classList.add('mk','vb');const M=Mock(host,{secs:app.right},'vb',{});const F=el('div','frame studio');
  const tb=el('div','tbar');tb.innerHTML=`<span class="bn"><b>${app.name}</b> <span>${app.ver}</span>&nbsp; <span>By ENSEMBLE</span></span><span class="sp"></span>${app.file?`<span class="file">${app.file}</span><span class="sp"></span>`:''}<span class="ico" style="box-shadow:none">${SVG.theme}</span><span class="ico" style="box-shadow:none">${SVG.expand}</span>`;
  const ex=el('button','ex','Export');ex.type='button';tb.append(ex);
  const lp=leftPanel(M,app.left);const ip=inspector(M,app.right);
  const cv=el('div','canvas');const ctb=el('div','ctb');
  const u=el('button','ib');u.innerHTML=SVG.undo;u.title='Undo (⌘Z)';u.setAttribute('aria-label','Undo');const r=el('button','ib');r.innerHTML=SVG.redo;r.title='Redo (⇧⌘Z)';r.setAttribute('aria-label','Redo');
  u.onclick=()=>M.undo();r.onclick=()=>M.redoIt();const upd=()=>{u.disabled=!M.stack.length;r.disabled=!M.redo.length;};M.listeners.push(upd);upd();
  ctb.append(u,r,el('span','sp'));
  for(const p of app.pills){const s=el('span','pill');s.innerHTML=`<b>${p[0]}</b><span>${p[1]}</span>`+(p[2]?SVG.chevS:'');if(p[2]){const sel=el('select');sel.setAttribute('aria-label',p[0]);p[2].forEach(o=>{const op=el('option');op.textContent=o;sel.append(op);});sel.value=p[1];sel.onchange=()=>s.querySelector('span').textContent=sel.value;s.append(sel);}ctb.append(s);}
  const trans=!!app.transport;const H=780-48-46-(trans?52:0);
  const st=el('div','stage2');st.style.bottom=(trans?52:0)+'px';st.append(work(app.work,724-64,H-56));
  cv.append(ctb,st);
  if(trans){const t=el('div','trans');t.innerHTML=`<button class="ib" type="button" aria-label="Pause">${SVG.pause}</button><button class="ib" type="button" aria-label="Back to the start">${SVG.back}</button><div class="tl"><span class="pf" style="width:38%"></span><i style="left:38%"></i></div><span class="tm">${app.transport}</span>`;cv.append(t);}
  F.append(cv,lp,ip,tb);host.append(F);track(M,host);return M;}
addEventListener('keydown',e=>{if(!active||!active.root.offsetParent)return;const mod=e.metaKey||e.ctrlKey;const tg=e.target;const typing=tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA');
  if(mod&&e.key.toLowerCase()==='z'&&!typing&&active.variant!=='vn'){e.preventDefault();e.shiftKey?active.redoIt():active.undo();}
  if(mod&&e.key.toLowerCase()==='k'&&active.focusFind){e.preventDefault();active.focusFind();}});
addEventListener('resize',()=>MOCKS.forEach(placeAll));
if(document.fonts)document.fonts.ready.then(()=>MOCKS.forEach(placeAll));
window.UIMOCK={mount,frameA,frameB,placeAll:()=>MOCKS.forEach(placeAll),fmt,SVG};
})();
