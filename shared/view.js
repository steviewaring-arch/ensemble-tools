/* The view's zoom – a house part, lifted out of Segue 0.10 (11 November).
   Fit, or a set size: a screen pixel for each canvas pixel, so 100% is actual
   size. Bigger than the view and it scrolls; ⌘ and a scroll (or a pinch) zooms
   where the pointer is; ⌘+ and ⌘− step, ⌘0 fits. Nothing here reaches an
   export – the view is the view. A tool passes its own canvas and size, and
   gets back a fit() to call wherever it used to size the canvas itself. */
function mountZoom(o){
  const ZOOMS=[.1,.125,.167,.25,.333,.5,.667,.75,1,1.25,1.5,2,3,4];
  const g=s=>document.getElementById(s);
  const view=o.view,cv=o.canvas,size=o.size,after=o.after||function(){};
  const app=document.querySelector('.app');
  const previewing=()=>!!(app&&app.classList.contains('preview'));
  let z=null;
  function fitScale(){const s=size(),W=s[0],H=s[1],cs=getComputedStyle(view);
    const aw=view.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),
          ah=view.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
    return Math.max(.01,Math.min(aw/W,ah/H));}
  const now=()=>z==null||previewing()?fitScale():z;
  function paint(){const b=g('zoomVal');if(!b)return;const t=Math.round(now()*100)+'%';
    if(b.textContent!==t)b.textContent=t;b.setAttribute('aria-pressed',z!=null);
    b.setAttribute('aria-label','Zoom '+t+(z==null?', fitted':'')+' – click for 100% or to fit');}
  function fit(){const s=size(),W=s[0],H=s[1],k=now(),
    cw=Math.max(1,Math.floor(W*k)),ch=Math.max(1,Math.floor(H*k));
    cv.style.width=cw+'px';cv.style.height=ch+'px';
    view.classList.toggle('zoomed',z!=null&&!previewing());paint();after(cw,ch,k);return k;}
  function set(v,at){const r=cv.getBoundingClientRect(),f=fitScale();
    if(v!=null&&v<=f*1.001&&v>=f*.999)v=null;
    z=v==null?null:Math.max(.05,Math.min(8,v));
    const vr=view.getBoundingClientRect(),px=at?at[0]:vr.left+vr.width/2,py=at?at[1]:vr.top+vr.height/2,
          fx=r.width?(px-r.left)/r.width:.5,fy=r.height?(py-r.top)/r.height:.5;
    fit();
    if(z!=null){const r2=cv.getBoundingClientRect();
      view.scrollLeft+=(r2.left+fx*r2.width)-px;view.scrollTop+=(r2.top+fy*r2.height)-py;}}
  function step(dir,at){const c=now();
    let n=dir>0?ZOOMS.find(x=>x>c*1.02):[...ZOOMS].reverse().find(x=>x<c/1.02);
    if(n==null)n=dir>0?ZOOMS[ZOOMS.length-1]:ZOOMS[0];
    if(dir<0&&n<fitScale()&&c>fitScale()*1.001)n=null;set(n,at);}
  view.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
    e.preventDefault();set(now()*Math.exp(-e.deltaY*.006),[e.clientX,e.clientY]);},{passive:false});
  const zi=g('zoomIn'),zo=g('zoomOut'),zv=g('zoomVal');
  if(zi)zi.onclick=()=>step(1);
  if(zo)zo.onclick=()=>step(-1);
  if(zv)zv.onclick=()=>set(z==null?1:null);   /* 100%, then back to fit */
  document.addEventListener('keydown',e=>{
    if(!(e.metaKey||e.ctrlKey)||e.altKey||e.shiftKey)return;
    const a=document.activeElement;
    if(a&&(/INPUT|TEXTAREA|SELECT/.test(a.tagName)||a.isContentEditable))return;
    if(e.key==='='||e.key==='+'){e.preventDefault();step(1);}
    else if(e.key==='-'||e.key==='_'){e.preventDefault();step(-1);}
    else if(e.key==='0'){e.preventDefault();set(null);}});
  paint();
  return{fit,set,step,get zoom(){return z;},get scale(){return now();},fitScale};
}

/* Guides – the house part, so margins and a grid can be laid over the work to
   marry it up with artwork made elsewhere (Steve, 6 November). They are drawn
   over the canvas, not into it: nothing of them reaches a render or an export.
   Segue draws its own in its scene, because it also snaps pieces to them. */
function mountGuides(o){
  const g=s=>document.getElementById(s);
  const view=o.view,cv=o.canvas,key=(o.key||'app')+':guides';
  const btn=g('guidesBtn'),more=g('guidesMore'),pop=g('guidePop');
  if(!btn||!cv)return null;
  let G={on:false,margin:5,cells:0};
  try{G=Object.assign(G,JSON.parse(localStorage.getItem(key)||'{}'));}catch(e){}
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(G));}catch(e){}};
  const ov=document.createElement('div');ov.className='guide-ov';ov.setAttribute('aria-hidden','true');
  view.appendChild(ov);
  if(getComputedStyle(view).position==='static')view.style.position='relative';
  function draw(){
    ov.hidden=!G.on;
    if(!G.on)return;
    const w=cv.offsetWidth,h=cv.offsetHeight;
    ov.style.left=cv.offsetLeft+'px';ov.style.top=cv.offsetTop+'px';
    ov.style.width=w+'px';ov.style.height=h+'px';
    const m=Math.max(0,Math.min(45,+G.margin||0)),mx=w*m/100,my=h*m/100;
    ov.style.setProperty('--gm-x',mx+'px');ov.style.setProperty('--gm-y',my+'px');
    const n=Math.max(0,Math.min(24,Math.round(+G.cells||0)));
    ov.classList.toggle('has-grid',n>0);
    if(n>0){const iw=w-mx*2,ih=h-my*2,cw=iw/n,rows=Math.max(1,Math.round(ih/cw));
      ov.style.setProperty('--gc',(iw/n)+'px');ov.style.setProperty('--gr',(ih/rows)+'px');}
  }
  let draw2=()=>{};
  function paint(){btn.setAttribute('aria-pressed',!!G.on);draw();}
  btn.onclick=()=>{G.on=!G.on;save();paint();};
  if(pop&&more){
    /* the choices are the house's segmented control, the same part the panels use –
       a margin and a grid you pick, rather than a dial to fiddle with */
    const seg=(label,vals,get,set)=>{
      const w=document.createElement('div');w.className='ctl';
      const hd=document.createElement('div');hd.className='ctl-head';
      const sp=document.createElement('span');sp.textContent=label;hd.append(sp);
      const sg=document.createElement('div');sg.className='seg';sg.setAttribute('role','group');sg.setAttribute('aria-label',label);
      const bs=vals.map(([v,t])=>{const b=document.createElement('button');b.type='button';b.className='pill';b.textContent=t;
        b.onclick=()=>{set(v);G.on=true;save();paint();draw2();};sg.append(b);return[v,b];});
      w.append(hd,sg);pop.append(w);
      return()=>{bs.forEach(([v,b])=>b.setAttribute('aria-pressed',get()===v));
        /* where the tool keeps a sliding highlight on its choices, move ours with it */
        if(typeof placeHL==='function')placeHL(sg,true);};};
    const t=document.createElement('div');t.className='pop-title';t.textContent='Guides';pop.append(t);
    /* four each, so a row holds them; "Cells" rather than Columns or Grid, which
       both already mean something else in these panels */
    const u1=seg('Margin',[[0,'None'],[5,'5%'],[8,'8%'],[10,'10%']],()=>+G.margin,v=>{G.margin=v;});
    const u2=seg('Cells',[[0,'None'],[4,'4'],[6,'6'],[12,'12']],()=>+G.cells,v=>{G.cells=v;});
    const h=document.createElement('p');h.className='hint';
    h.textContent='Over the preview only \u2013 nothing of them goes into an export. The margin is a share of each way across; the cells sit inside it, kept near square.';
    pop.append(h);
    draw2=()=>{u1();u2();};
    draw2();
    const show=open=>{pop.hidden=!open;more.setAttribute('aria-expanded',open);if(open)draw2();};
    more.onclick=e=>{e.stopPropagation();show(pop.hidden);};
    document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!pop.contains(e.target)&&!more.contains(e.target))show(false);},true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden){show(false);more.focus();}});
  }
  document.addEventListener('keydown',e=>{
    if(!(e.metaKey||e.ctrlKey)||e.key!==';'||e.altKey||e.shiftKey)return;
    const a=document.activeElement;
    if(a&&(/INPUT|TEXTAREA|SELECT/.test(a.tagName)||a.isContentEditable))return;
    e.preventDefault();btn.click();});
  paint();
  return{draw,paint};
}
