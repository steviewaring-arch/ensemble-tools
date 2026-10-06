/* Rubato – extra controls (1.0).
   One kind of control per kind of value, so the panel isn't a wall of sliders:
     slider    continuous amounts                (core addRange)
     stepper   whole-number counts               addStepper
     dial      angles                            addDial
     pair      a from–to range, two handles      addPair
     bar       In / Hold / Out shares of a loop  addLoopBar
     pad       two linked distances, as a path   addPad
   Every control resets on a double-click of its label. Controls marked
   `more:true` go into the card's folded More section. */

const MORE=Object.assign({},LS.get('more')||{});
function moreSection(parent,id){
  const row=el('button','more-toggle'),lab=el('span',null,'More'),chev=el('span','chev');row.append(lab,chev);row.type='button';
  const inner=el('div','more-body'),kids=[];
  const paint=()=>{const on=!!MORE[id];inner.hidden=!on;chev.textContent=on?'–':'+';row.setAttribute('aria-expanded',on);};
  row.onclick=()=>{MORE[id]=!MORE[id];LS.set('more',MORE);paint();};
  parent.append(row,inner);paint();
  controls.push({d:{show:s=>kids.some(d=>!d.show||d.show(s))},w:row,update(){}});
  return{inner,kids};
}
/* a stand-in entry so Randomise can still reach each setting of a multi-setting control */
function shadow(d,k,extra){controls.push({d:Object.assign({k,t:'range',group:d.group,show:d.show},extra),w:el('div'),update(){}});}
function headRow(d,w){
  const hd=el('div','ctl-head'),lb=el('label',null,d.label),val=el('span','val');lb.title='Double-click to reset';
  hd.append(lb);const q=qMark(d);if(q)hd.append(q);hd.append(val);w.append(hd);return{hd,lb,val};
}
const resetKeys=(...ks)=>{const o={};ks.forEach(k=>o[k]=D[k]);Object.assign(S,o);set(ks[0],S[ks[0]]);};

function addStepper(parent,d){
  d.group=d.group||curGroup;d.t='range';
  const w=el('div','ctl stepper'),lb=el('span','st-label',d.label),box=el('div','st-box');
  const minus=el('button','st-btn','−'),val=el('span','val'),plus=el('button','st-btn','+');
  minus.type=plus.type='button';minus.setAttribute('aria-label',d.label+' down');plus.setAttribute('aria-label',d.label+' up');
  lb.title='Double-click to reset';lb.ondblclick=()=>set(d.k,D[d.k]);
  const go=dir=>set(d.k,clamp(roundTo(S[d.k]+dir*d.step,d.step),d.min,d.max));
  minus.onclick=()=>go(-1);plus.onclick=()=>go(1);
  box.append(minus,val,plus);w.append(lb);const q=qMark(d);if(q)w.append(q);w.append(box);parent.append(w);
  const fmt=v=>d.fmt?d.fmt(v):String(roundTo(v,d.step));
  const c={d,w,update(){val.textContent=fmt(S[d.k]);minus.disabled=S[d.k]<=d.min;plus.disabled=S[d.k]>=d.max;}};controls.push(c);return c;
}

/* Dial: the knob shows the angle itself – a wedge for a swing either way (Tilt,
   Twist, Sway, Spin), a needle for a signed turn (Rotate). Drag up/right to
   increase, arrow keys step, Shift for bigger steps. */
function addDial(parent,d){
  d.group=d.group||curGroup;d.t='range';
  const signed=d.min<0,w=el('div','ctl dial-row'),knob=el('div','dial'),info=el('div','dial-info');
  knob.tabIndex=0;knob.setAttribute('role','slider');knob.setAttribute('aria-label',d.label);knob.setAttribute('aria-valuemin',d.min);knob.setAttribute('aria-valuemax',d.max);
  const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','-24 -24 48 48');svg.setAttribute('width','48');svg.setAttribute('height','48');
  const ring=document.createElementNS(NS,'circle');ring.setAttribute('r','21');ring.setAttribute('class','d-ring');
  const wedge=document.createElementNS(NS,'path');wedge.setAttribute('class','d-wedge');
  const needle=document.createElementNS(NS,'line');needle.setAttribute('class','d-needle');needle.setAttribute('x1','0');needle.setAttribute('y1','0');
  const hub=document.createElementNS(NS,'circle');hub.setAttribute('r','2.6');hub.setAttribute('class','d-hub');
  svg.append(ring,wedge,needle,hub);knob.append(svg);
  const {lb,val}=headRow(d,info);w.append(knob,info);parent.append(w);
  const fmt=v=>d.fmt?d.fmt(v):roundTo(v,d.step)+'°';
  const pt=a=>{const r=a*Math.PI/180;return[17*Math.sin(r),-17*Math.cos(r)];};
  const arc=(a0,a1)=>{if(Math.abs(a1-a0)<.5)return'';if(a1-a0>=359.5)return'M0 -17 A17 17 0 1 1 -0.01 -17 Z';const [x0,y0]=pt(a0),[x1,y1]=pt(a1);return`M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A17 17 0 ${a1-a0>180?1:0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;};
  const draw=v=>{const a=Math.min(180,Math.abs(v)*(d.dispK||1))*(v<0?-1:1);
    wedge.setAttribute('d',signed?arc(Math.min(0,a),Math.max(0,a)):arc(-a,a));
    const [x,y]=pt(a);needle.setAttribute('x2',x.toFixed(2));needle.setAttribute('y2',y.toFixed(2));
    knob.setAttribute('aria-valuenow',v);knob.setAttribute('aria-valuetext',fmt(v));};
  const put=v=>{v=clamp(roundTo(v,d.step),d.min,d.max);S[d.k]=v;draw(v);val.textContent=fmt(v);set(d.k,v,true);refreshVis();};
  knob.addEventListener('pointerdown',e=>{e.preventDefault();knob.focus();knob.setPointerCapture(e.pointerId);knob.classList.add('on');
    const x0=e.clientX,y0=e.clientY,v0=S[d.k],span=d.max-d.min;
    const mv=ev=>{const k=ev.shiftKey?.1:1;put(v0+((ev.clientX-x0)-(ev.clientY-y0))*span/160*k);};
    const up=()=>{knob.classList.remove('on');knob.removeEventListener('pointermove',mv);knob.removeEventListener('pointerup',up);knob.removeEventListener('pointercancel',up);refreshAll();};
    knob.addEventListener('pointermove',mv);knob.addEventListener('pointerup',up);knob.addEventListener('pointercancel',up);});
  knob.addEventListener('keydown',e=>{const k={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1}[e.key];if(k==null)return;e.preventDefault();e.stopPropagation();put(S[d.k]+k*d.step*(e.shiftKey?10:1));});
  knob.ondblclick=lb.ondblclick=()=>set(d.k,D[d.k]);
  const c={d,w,update(){draw(S[d.k]);val.textContent=fmt(S[d.k]);}};controls.push(c);return c;
}

/* Pair: one track, two handles – From (hollow) and To (solid). They can cross,
   because going from heavy to light is as useful as light to heavy. */
function addPair(parent,d){
  d.group=d.group||curGroup;
  const w=el('div','ctl'),{lb,val}=headRow(d,w),track=el('div','pair-track'),fill=el('i','pair-fill');
  const mk=(k,cls,name)=>{const h=el('button','pair-h '+cls);h.type='button';h.setAttribute('role','slider');h.setAttribute('aria-label',d.label+' '+name);h.dataset.k=k;return h;};
  const hA=mk(d.k1,'from','from'),hB=mk(d.k2,'to','to');track.append(fill,hA,hB);w.append(track);parent.append(w);
  const frac=v=>(v-d.min)/(d.max-d.min),fmt=v=>d.fmt?d.fmt(v):String(roundTo(v,d.step));
  const paint=()=>{const a=frac(S[d.k1]),b=frac(S[d.k2]);
    hA.style.left=`calc(15px + (100% - 30px) * ${a})`;hB.style.left=`calc(15px + (100% - 30px) * ${b})`;
    fill.style.left=`calc(15px + (100% - 30px) * ${Math.min(a,b)})`;fill.style.width=`calc((100% - 30px) * ${Math.abs(b-a)})`;
    val.textContent=fmt(S[d.k1])+' → '+fmt(S[d.k2]);hA.setAttribute('aria-valuetext',fmt(S[d.k1]));hB.setAttribute('aria-valuetext',fmt(S[d.k2]));};
  const valAt=x=>{const r=track.getBoundingClientRect();return d.min+clamp((x-r.left-15)/Math.max(1,r.width-30))*(d.max-d.min);};
  const put=(k,v)=>{S[k]=clamp(roundTo(v,d.step),d.min,d.max);set(k,S[k],true);paint();};
  track.addEventListener('pointerdown',e=>{e.preventDefault();const v=valAt(e.clientX);
    let k=e.target===hA?d.k1:e.target===hB?d.k2:(Math.abs(v-S[d.k1])<=Math.abs(v-S[d.k2])?d.k1:d.k2);
    (k===d.k1?hA:hB).focus();track.setPointerCapture(e.pointerId);put(k,v);
    const mv=ev=>put(k,valAt(ev.clientX)),up=()=>{track.removeEventListener('pointermove',mv);track.removeEventListener('pointerup',up);refreshAll();};
    track.addEventListener('pointermove',mv);track.addEventListener('pointerup',up);});
  [hA,hB].forEach(h=>h.addEventListener('keydown',e=>{const k={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1}[e.key];if(k==null)return;e.preventDefault();e.stopPropagation();put(h.dataset.k,S[h.dataset.k]+k*d.step*(e.shiftKey?10:1));}));
  lb.ondblclick=()=>resetKeys(d.k1,d.k2);
  shadow(d,d.k1,{min:d.min,max:d.max,step:d.step,rnd:d.rnd1});shadow(d,d.k2,{min:d.min,max:d.max,step:d.step,rnd:d.rnd2});
  const c={d:{show:d.show,group:d.group},w,update:paint};controls.push(c);return c;
}

/* Loop bar: the whole loop as one bar, split into In, Hold and Out (and the rest).
   Drag the joins. Replaces three separate sliders with one picture of the timing. */
function addLoopBar(parent,d){
  d.group=d.group||curGroup;const [kI,kH,kO]=d.keys,mins=d.mins||[0,0,0],maxs=d.maxs||[1,1,1];
  const w=el('div','ctl'),{lb,val}=headRow(d,w),bar=el('div','lbar');
  const segs=['in','hold','out','rest'].map(c=>{const s=el('i','lseg '+c);bar.append(s);return s;});
  const hs=[0,1,2].map(i=>{const h=el('button','lbar-h');h.type='button';h.setAttribute('role','slider');h.setAttribute('aria-label',d.label+' '+['end of in','end of hold','end of out'][i]);bar.append(h);return h;});
  const legend=el('div','lbar-legend');const lg=d.names.map((n,i)=>{const s=el('span','lg '+['in','hold','out'][i]);legend.append(s);return[n,s];});
  w.append(bar,legend);parent.append(w);
  const pct=v=>Math.round(v*100)+'%';
  const paint=()=>{const a=S[kI],h=S[kH],o=S[kO],rest=Math.max(0,1-a-h-o),tot=Math.max(1,a+h+o);
    const ws=[a/tot,h/tot,o/tot,rest];let x=0;segs.forEach((s,i)=>{s.style.left=(x*100)+'%';s.style.width=(ws[i]*100)+'%';x+=ws[i];});
    let b=0;hs.forEach((hh,i)=>{b+=ws[i];hh.style.left=(b*100)+'%';hh.setAttribute('aria-valuetext',pct(S[[kI,kH,kO][i]]));});
    lg.forEach(([n,s],i)=>s.textContent=n+' '+pct(S[[kI,kH,kO][i]]));val.textContent=rest>.005?'Rest '+pct(rest):'';};
  /* moving join i changes the part before it and the part after it, never the others */
  const moveJoin=(i,pos)=>{const v=[S[kI],S[kH],S[kO]],start=v.slice(0,i).reduce((p,q)=>p+q,0),end=i<2?start+v[i]+v[i+1]:1;
    let x=clamp(pos,start+mins[i],end-(i<2?mins[i+1]:0));x=Math.min(x,start+maxs[i]);
    const nv=roundTo(x-start,.01);if(i<2){const nxt=roundTo(end-start-nv,.01);if(nxt>maxs[i+1])return;v[i+1]=nxt;}v[i]=nv;
    S[kI]=v[0];S[kH]=v[1];S[kO]=v[2];set(kI,S[kI],true);paint();};
  const at=x=>{const r=bar.getBoundingClientRect();return clamp((x-r.left)/Math.max(1,r.width));};
  bar.addEventListener('pointerdown',e=>{e.preventDefault();const x=at(e.clientX);const joins=[S[kI],S[kI]+S[kH],S[kI]+S[kH]+S[kO]];
    let i=hs.indexOf(e.target);if(i<0){i=0;joins.forEach((j,n)=>{if(Math.abs(j-x)<Math.abs(joins[i]-x))i=n;});}
    hs[i].focus();bar.setPointerCapture(e.pointerId);moveJoin(i,x);
    const mv=ev=>moveJoin(i,at(ev.clientX)),up=()=>{bar.removeEventListener('pointermove',mv);bar.removeEventListener('pointerup',up);refreshAll();};
    bar.addEventListener('pointermove',mv);bar.addEventListener('pointerup',up);});
  hs.forEach((h,i)=>h.addEventListener('keydown',e=>{const k={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1}[e.key];if(k==null)return;e.preventDefault();e.stopPropagation();
    const joins=[S[kI],S[kI]+S[kH],S[kI]+S[kH]+S[kO]];moveJoin(i,joins[i]+k*.01*(e.shiftKey?5:1));}));
  lb.ondblclick=()=>resetKeys(kI,kH,kO);
  d.keys.forEach((k,i)=>shadow(d,k,{min:mins[i],max:maxs[i],step:.01,rnd:d.rnd&&d.rnd[i]}));
  const c={d:{show:d.show,group:d.group},w,update:paint};controls.push(c);return c;
}

/* Pad: two distances that belong together, drawn as the path they make –
   an orbit for Fluid (rise and drift), a box for Snappy (jump and shift). */
function addPad(parent,d){
  d.group=d.group||curGroup;
  const w=el('div','ctl'),{lb,val}=headRow(d,w),pad=el('div','pad');pad.tabIndex=0;pad.setAttribute('role','group');pad.setAttribute('aria-label',d.label+'. Arrow keys change '+d.nx.toLowerCase()+' and '+d.ny.toLowerCase()+'.');
  const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('preserveAspectRatio','none');
  const ax=document.createElementNS(NS,'path');ax.setAttribute('class','p-axis');
  const shape=document.createElementNS(NS,'path');shape.setAttribute('class','p-shape');
  const dot=document.createElementNS(NS,'circle');dot.setAttribute('class','p-dot');dot.setAttribute('r','7');
  svg.append(ax,shape,dot);pad.append(svg);w.append(pad);parent.append(w);
  const fmt=d.fmt||(v=>roundTo(v,d.step)+'');
  const geo=()=>{const r=pad.getBoundingClientRect();return{w:r.width||300,h:r.height||96,r};};
  const paint=()=>{const {w:W0,h:H0}=geo(),cx=W0/2,cy=H0/2,RX=W0/2-12,RY=H0/2-12;
    svg.setAttribute('viewBox',`0 0 ${W0} ${H0}`);ax.setAttribute('d',`M${cx} 6 V${H0-6} M6 ${cy} H${W0-6}`);
    /* square-root scale, so the small values people mostly use are easy to see and set */
    const rx=Math.sqrt(S[d.kx]/d.maxX)*RX,ry=Math.sqrt(S[d.ky]/d.maxY)*RY,f=n=>n.toFixed(1);
    shape.setAttribute('d',rx<.5&&ry<.5?'':rx<.5?`M${f(cx)} ${f(cy-ry)}V${f(cy+ry)}`:ry<.5?`M${f(cx-rx)} ${f(cy)}H${f(cx+rx)}`:
      d.shape==='box'?`M${f(cx-rx)} ${f(cy-ry)}H${f(cx+rx)}V${f(cy+ry)}H${f(cx-rx)}Z`:`M${f(cx-rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx+rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx-rx)} ${f(cy)}Z`);
    dot.setAttribute('cx',cx+rx);dot.setAttribute('cy',cy-ry);
    val.textContent=d.ny+' '+fmt(S[d.ky])+' · '+d.nx+' '+fmt(S[d.kx]);};
  const put=(x,y)=>{S[d.kx]=clamp(roundTo(x,d.step),0,d.maxX);S[d.ky]=clamp(roundTo(y,d.step),0,d.maxY);set(d.kx,S[d.kx],true);paint();};
  pad.addEventListener('pointerdown',e=>{e.preventDefault();pad.focus();pad.setPointerCapture(e.pointerId);
    const sq=v=>Math.pow(clamp(v),2);
    const mv=ev=>{const {w:W0,h:H0,r}=geo();put(sq(Math.abs(ev.clientX-r.left-W0/2)/(W0/2-12))*d.maxX,sq(Math.abs(ev.clientY-r.top-H0/2)/(H0/2-12))*d.maxY);};mv(e);
    const up=()=>{pad.removeEventListener('pointermove',mv);pad.removeEventListener('pointerup',up);refreshAll();};
    pad.addEventListener('pointermove',mv);pad.addEventListener('pointerup',up);});
  pad.addEventListener('keydown',e=>{const m=e.shiftKey?10:1,s=d.step*m;let x=S[d.kx],y=S[d.ky];
    if(e.key==='ArrowRight')x+=s;else if(e.key==='ArrowLeft')x-=s;else if(e.key==='ArrowUp')y+=s;else if(e.key==='ArrowDown')y-=s;else return;e.preventDefault();e.stopPropagation();put(x,y);});
  lb.ondblclick=pad.ondblclick=()=>resetKeys(d.kx,d.ky);
  new ResizeObserver(paint).observe(pad);
  shadow(d,d.kx,{min:0,max:d.maxX,step:d.step,rnd:d.rndX});shadow(d,d.ky,{min:0,max:d.maxY,step:d.step,rnd:d.rndY});
  const c={d:{show:d.show,group:d.group},w,update:paint};controls.push(c);return c;
}

/* build a list of controls; items with more:true go into the card's More section */
function buildR(parent,list,more){
  for(const d of list){
    let host=parent;if(d.more&&more){host=more.inner;more.kids.push(d);}
    if(d.ui==='stepper')addStepper(host,d);else if(d.ui==='dial')addDial(host,d);else if(d.ui==='pair')addPair(host,d);
    else if(d.ui==='bar')addLoopBar(host,d);else if(d.ui==='pad')addPad(host,d);else if(d.ui==='head')addCustom(host,d.show,el('div','sub-head',d.text));
    else build(host,[d]);
  }
}
