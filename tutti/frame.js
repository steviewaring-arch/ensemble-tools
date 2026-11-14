/* Tutti on the Ensemble tool system (UI stream, October 2026): the frame.
   Cards that fold and say what's set, the system slider, Export as a sheet in the
   island, Preview, light and dark, the panel's width. Behaviour is Tutti's own –
   this file only moves and dresses controls; it never changes what they set. */
(function(){
  const $$=(s,r)=>[...(r||document).querySelectorAll(s)];
  const app=document.querySelector('.app'),island=$('exportbar'),sheet=$('exportSheet'),opener=$('exportOpen');

  /* cards: a title that folds the card; shut, it says what's set */
  $$('.card-toggle').forEach(b=>b.addEventListener('click',()=>{const c=b.closest('.card'),open=!c.classList.toggle('collapsed');
    b.setAttribute('aria-expanded',open);if(open)requestAnimationFrame(()=>syncRanges(c));}));
  /* groups inside a card: a hairline and a Bold title that says what it holds.
     Shut or open is remembered, like the cards. */
  const GK='tutti:groups';let GRP={};try{GRP=JSON.parse(localStorage.getItem(GK)||'{}')||{};}catch(e){}
  $$('.fold-head').forEach(b=>{const id=b.dataset.group,body=b.nextElementSibling;
    const set=open=>{b.setAttribute('aria-expanded',open);if(body)body.hidden=!open;};
    if(id&&Object.prototype.hasOwnProperty.call(GRP,id))set(!!GRP[id]);
    b.addEventListener('click',()=>{const open=b.getAttribute('aria-expanded')!=='true';set(open);
      if(id){GRP[id]=open;try{localStorage.setItem(GK,JSON.stringify(GRP));}catch(e){}}
      if(open)requestAnimationFrame(()=>syncRanges(b.closest('.card')));});});
  const label=sel=>{const o=sel&&sel.options[sel.selectedIndex];return o?o.text.replace(/\s*:\s*/,':').replace('…',''):'';};
  const SUM={
    source:()=>S.kind?($('srcName').textContent||''):'No source',
    canvas:()=>label($('aspect'))+' · Grid '+$('grid').value,
    shape:()=>S.style==='type'?['Type',S.tDir==='cols'?'Columns':'Rows',S.tFit==='keep'?'Keep shape':'Stretch',S.tMode==='run'?'Running':''].filter(Boolean).join(' · ')
      :[S.fill?'Solid':'Outline',S.invert?'Inverted':'',S.scale?'Size by tone':'',S.mix?'Mixed sizes':''].filter(Boolean).join(' · '),
    mapping:()=>S.nBands+' bands',
    advanced:()=>'Opacity · Thresholds · Jitter · Presets'};   /* 13 Nov: a shut group says what it holds */
  function summaries(){$$('.card[data-id]').forEach(c=>{const sm=c.querySelector('.sum');if(!sm)return;let t='';try{t=(SUM[c.dataset.id]||(()=>''))();}catch(e){}if(sm.textContent!==t)sm.textContent=t;});}

  /* the house slider (UI round 4, Nov 2026 – as Segue and Tempo): a bar with its value inside and its label
     beside it. Drag moves it by how far you go (Shift ten times finer); a press that doesn't move jumps there;
     a press on the label drags too. It only ever sets the range's value and fires its own input event. */
  const kc=(v,a,b)=>Math.max(a,Math.min(b,v));
  function syncRange(box){const inp=box.querySelector('input[type=range]');if(!inp)return;
    const mn=inp.min===''?0:+inp.min,mx=inp.max===''?100:+inp.max,sp=mx>mn?mx-mn:1,p=kc((+inp.value-mn)/sp,0,1);box.style.setProperty('--p',p);
    const z=mn<0&&mx>0?-mn/sp:0;box.style.setProperty('--z',z);box.classList.toggle('from-start',z===0);
    if(inp.dataset.def==null)inp.dataset.def=inp.defaultValue;const bv=+inp.dataset.def;if(Number.isFinite(bv))box.style.setProperty('--b',kc((bv-mn)/sp,0,1));
    const w=box.offsetWidth,tick=box.querySelector('.rng-tick');if(!w||!tick)return;const x=5+(w-10)*p,head=box.querySelector('.row');let over=false;
    if(head)for(const e of head.querySelectorAll(box.classList.contains('inner')?'.lbl,.val':'.val')){if(!e.offsetWidth)continue;const l=head.offsetLeft+e.offsetLeft,r=l+e.offsetWidth;if(x>l-4&&x<r+4){over=true;break;}}
    tick.classList.toggle('split',over);tick.classList.remove('away');}
  function syncRanges(root){$$('.rng-box',root).forEach(syncRange);}
  function dragBox(box){const inp=box.querySelector('input[type=range]');if(!inp||box._drag)return;box._drag=1;
    const lim=()=>[inp.min===''?0:+inp.min,inp.max===''?100:+inp.max,+inp.step||1];
    const put=v=>{const [mn,mx,st]=lim();v=kc(v,mn,mx);v=+(Math.round((v-mn)/st)*st+mn).toFixed(6);v=kc(v,mn,mx);if(v!==+inp.value){inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}));}};
    box.addEventListener('pointerdown',e=>{if(e.button)return;const soft=!!e.target.closest('.q,label');
      if(!soft){e.preventDefault();inp.focus({preventScroll:true});try{box.setPointerCapture(e.pointerId);}catch(_){}}
      const r=box.getBoundingClientRect(),[mn,mx]=lim(),span=mx-mn;let lastX=e.clientX,acc=+inp.value,moved=false;
      const mv=ev=>{const dx=ev.clientX-lastX;if(!moved&&Math.abs(ev.clientX-e.clientX)<3)return;
        if(!moved){moved=true;box.classList.add('drag');if(soft){inp.focus({preventScroll:true});try{box.setPointerCapture(e.pointerId);}catch(_){}}}
        acc=kc(acc+dx/Math.max(40,r.width-10)*span*(ev.shiftKey?.1:1),mn,mx);lastX=ev.clientX;put(acc);};
      const up=ev=>{box.removeEventListener('pointermove',mv);box.removeEventListener('pointerup',up);box.removeEventListener('pointercancel',up);box.classList.remove('drag');
        if(!moved&&ev.type==='pointerup'&&!soft)put(mn+kc((ev.clientX-r.left-5)/Math.max(1,r.width-10),0,1)*span);
        inp.dispatchEvent(new Event('change',{bubbles:true}));};
      box.addEventListener('pointermove',mv);box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);});
    inp.addEventListener('keydown',e=>{if(!e.shiftKey||!/^Arrow/.test(e.key))return;e.preventDefault();const [,, st]=lim();put(+inp.value+(/Right|Up/.test(e.key)?10:-10)*st);});}
  $$('input[type=range]').forEach(inp=>{const row=inp.previousElementSibling;if(!row||!row.classList.contains('row')||!row.querySelector('.val')||inp.closest('.edges'))return;
    const ctl=document.createElement('div'),box=document.createElement('div');ctl.className='ctl rng';box.className='rng-box';
    inp.parentNode.insertBefore(ctl,row);ctl.append(box);
    const f=document.createElement('span'),n=document.createElement('span'),t=document.createElement('span');f.className='rng-fill';n.className='rng-notch';t.className='rng-tick';
    row.classList.add('ctl-head');row.style.removeProperty('margin-top');box.append(f,n,t,row,inp);
    inp.addEventListener('input',()=>syncRange(box));dragBox(box);});
  /* the threshold Edges are rebuilt whenever the bands change: give each the system slider too */
  function upgradeEdge(d){if(d.querySelector('.rng-box'))return;const lab=d.querySelector('label'),inp=d.querySelector('input'),v=lab&&lab.querySelector('span');if(!lab||!inp||!v)return;
    const t=document.createElement('span');t.className='lbl';t.textContent=(lab.firstChild&&lab.firstChild.nodeType===3?lab.firstChild.textContent:'').trim();v.classList.add('val');
    const head=document.createElement('div');head.className='row ctl-head';head.append(t,v);
    const box=document.createElement('div'),f=document.createElement('span'),k=document.createElement('span');box.className='rng-box';f.className='rng-fill';k.className='rng-tick';
    box.classList.add('inner');box.append(f,k,head,inp);d.replaceChildren(box);inp.addEventListener('input',()=>syncRange(box));dragBox(box);syncRange(box);}
  const edges=$('edges');if(edges){const up=()=>edges.querySelectorAll('.edge').forEach(upgradeEdge);new MutationObserver(up).observe(edges,{childList:true});up();}
  setInterval(()=>{syncRanges();summaries();},400);

  /* Export: a sheet that grows out of the island */
  const setSheet=open=>{sheet.hidden=!open;island.classList.toggle('open',open);opener.setAttribute('aria-expanded',open);opener.title=open?'':'Save or download what’s on the stage';layout();};
  opener.addEventListener('click',e=>{e.stopPropagation();setSheet(sheet.hidden);});
  /* a countdown, recording or file in the making puts the sheet away: the island shows what's
     happening, then Export comes back shut – it never springs open again on its own */
  new MutationObserver(()=>{if(island.classList.contains('busy')&&!sheet.hidden)setSheet(false);}).observe(island,{attributes:true,attributeFilter:['class']});
  document.querySelector('.stage').addEventListener('pointerdown',e=>{if(!sheet.hidden){setSheet(false);e.stopPropagation();}else if(app.classList.contains('peek')){setPanel(false);e.stopPropagation();}},true);

  /* the island sits centred under the work, clear of the panel */
  function layout(){const narrow=innerWidth<=860,g=12,W=narrow?innerWidth:app.clientWidth,away=app.classList.contains('preview')&&!app.classList.contains('peek'),pw=narrow||away?0:document.querySelector('.panel').offsetWidth,L=narrow||away?g:g*2+pw,R=W-g;
    let iw=island.querySelector('.island-in').offsetWidth;if(island.classList.contains('open'))iw=Math.max(iw,340);iw=Math.min(iw,R-L);
    let x=(L+R)/2;if(x+iw/2>R)x=R-iw/2;if(x-iw/2<L)x=L+iw/2;island.style.left=Math.round(x)+'px';}
  const ro=new ResizeObserver(layout);ro.observe(island.querySelector('.island-in'));ro.observe(document.querySelector('.panel'));window.addEventListener('resize',layout);

  /* Preview: the work fills the window and the panel slides away; the panel button (top left) brings it back over the work */
  const EXPAND='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M8.5 2.5h3v3M11.5 2.5 7.8 6.2M5.5 11.5h-3v-3M2.5 11.5l3.7-3.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const COLLAPSE='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M11.5 5.5h-3v-3M8.5 5.5l3.3-3.3M2.5 8.5h3v3M5.5 8.5l-3.3 3.3" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const pb=$('previewBtn');
  const pn=$('panelBtn');
  function setPanel(open){app.classList.toggle('peek',!!open);pn.setAttribute('aria-expanded',!!open);const t=open?'Hide the panel':'Show the panel';pn.setAttribute('aria-label',t);pn.title=t;layout();}
  pn.addEventListener('click',e=>{e.stopPropagation();setPanel(!app.classList.contains('peek'));});
  function setPreview(on){app.classList.toggle('preview',on);setPanel(false);pb.setAttribute('aria-pressed',on);pb.innerHTML=on?COLLAPSE:EXPAND;
    const t=on?'Fit to the clear space – F':'Preview – fill the window – F';pb.setAttribute('aria-label',t);pb.title=t;}
  setPreview(false);pb.addEventListener('click',()=>setPreview(!app.classList.contains('preview')));

  /* light and dark: light unless the person has chosen dark here ('tutti:mode' is only written by the button) */
  const tb=$('themeBtn'),K='tutti:mode';
  function setTheme(t,chosen){document.body.setAttribute('data-theme',t);if(chosen){try{localStorage.setItem(K,t);}catch(e){}}tb.setAttribute('aria-label',t==='dark'?'Light mode':'Dark mode');}
  let saved=null;try{saved=localStorage.getItem(K);}catch(e){}
  setTheme(saved==='dark'?'dark':'light');
  tb.title='Light or dark';tb.addEventListener('click',()=>setTheme(document.body.getAttribute('data-theme')==='dark'?'light':'dark',true));

  /* focus rings only when working from the keyboard */
  document.addEventListener('keydown',e=>{if(e.key==='Tab'||/^Arrow/.test(e.key))document.body.classList.add('kbd');},true);
  document.addEventListener('pointerdown',()=>document.body.classList.remove('kbd'),true);

  /* keys: F for Preview, Esc closes Export or leaves Preview */
  window.addEventListener('keydown',e=>{const tg=e.target,typing=tg&&(tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable||(tg.tagName==='INPUT'&&/text|number|search/.test(tg.type)));
    if(e.key==='Escape'){if(!sheet.hidden){setSheet(false);return;}if(app.classList.contains('preview'))setPreview(false);return;}
    if(typing||e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='f'||e.key==='F'){e.preventDefault();setPreview(!app.classList.contains('preview'));}},true);

  /* the panel's width: drag its right edge */
  const rz=$('resizer'),put=w=>document.documentElement.style.setProperty('--pw',w+'px');
  try{const w=+localStorage.getItem('tutti:panelW');if(w)put(Math.max(280,Math.min(480,w)));}catch(e){}
  rz.addEventListener('pointerdown',e=>{e.preventDefault();rz.setPointerCapture(e.pointerId);const x0=e.clientX,w0=document.querySelector('.panel').offsetWidth;
    const mv=ev=>{put(Math.max(280,Math.min(480,w0+ev.clientX-x0)));syncRanges();};
    rz.addEventListener('pointermove',mv);rz.addEventListener('pointerup',()=>{rz.removeEventListener('pointermove',mv);try{localStorage.setItem('tutti:panelW',document.querySelector('.panel').offsetWidth);}catch(e){}},{once:true});});

  /* tooltips: hovering a row shows its ? after a beat, as hovering the ? does at once */
  let rt=0,rq=null;
  document.addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest('.row,.toggle,.ctl');clearTimeout(rt);
    if(e.target.closest&&e.target.closest('.q'))return;const q=t&&t.querySelector('.q');
    if(rq&&rq!==q){rq.dispatchEvent(new MouseEvent('mouseout',{bubbles:true}));rq=null;}
    if(q)rt=setTimeout(()=>{rq=q;q.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));},500);});
  /* buttons that carry their meaning in a title get it as a tooltip too */
  $$('#appearance button,#exportOpen').forEach(b=>{if(!b.title)b.title=b.getAttribute('aria-label')||b.textContent;});

  /* ---- 6.3: what's moved, putting it back, and Undo (the house rules, as Segue and Rubato) ----
     Where it started is each setting's value when the page opened. A row that's moved gets a blue
     dot in the change column – click it to put that row back; a card with anything moved gets a
     Reset chip while open and a dot while shut. Every change is a step Undo can take back
     (⌘Z, ⇧⌘Z for Redo, or the arrows in the top bar). It all goes through snapState/putState in
     index.html, the same set a preset holds, so nothing here reaches what a export draws. */
  const panel=$('panel'),RESET='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.6 6a3.4 3.4 0 1 0 1-2.4M2.4 1.8v2h2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const START=getPreset(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const words=e=>e?e.textContent.replace(/\?/g,'').replace(/\s+/g,' ').trim():'';
  const bandMoved=(p,i)=>!!p.states[i].inner||!!p.states[i].bigInner||(p.style==='type'&&p.states[i].text!=='TUTTI')||(p.states[i].userColor&&p.states[i].color.toLowerCase()!==rampColor(i,p.nBands));
  const near=(a,b)=>a.length===b.length&&a.every((v,k)=>Math.abs(v-b[k])<1e-9);
  /* each control: where its dot goes, what it holds, how it's put back (on a copy of the snapshot) */
  const CTL=[];
  function reg(w,label,moved,back){if(!w||w._cx)return;w._cx=1;w.classList.add('cxm');const b=document.createElement('button');b.type='button';b.className='cx';
    b.setAttribute('aria-label',label+' – changed; put it back');b.title='Changed – click to put it back';
    b.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();restore(label+' put back',[c]);});
    const c={w,label,moved,back,b};w.append(b);CTL.push(c);return c;}
  const key=(w,label,ks)=>{ks=[].concat(ks);reg(w,label,p=>ks.some(k=>!same(p[k],START[k])),p=>ks.forEach(k=>p[k]=START[k]));};
  const RANGE={tsize:'tsize',tlh:'tlh',track:'tracking',gAngle:'typeGradAngle',twidth:'typeW',theight:'typeH',tslant:'typeSlant',grid:'grid',zoom:'zoom',sblur:'srcBlur',
    minsize:'minsize',ssize:'shapeScale',mixAmt:'mixAmount',mixWhere:'mixWhere',tMin:'tMin',tMax:'tMax',tSpace:'tSpace',opacity:'opacity',tlev:'threshLever',rot:'baseRot',rjit:'rotJit',pjit:'posJit'};
  Object.keys(RANGE).forEach(id=>{const inp=$(id),w=inp&&inp.closest('.ctl.rng');if(w)key(w,words(w.querySelector('.lbl')),RANGE[id]);});
  [['tMix','mix'],['tWeights','tWeights'],['tTrue','trueColour'],['tGrad','typeGrad'],['tFill','fill'],['tInvert','invert'],['tScale','scale'],['tKeepSvg','keepSvgColor']].forEach(([id,k])=>{const t=$(id);if(t)key(t,words(t.querySelector('span')),k);});
  [['bgColor','bg'],['aspect','aspect'],['arW',['arW','arH']],['res','res']].forEach(([id,k])=>{const r=$(id)&&$(id).closest('.row');if(r)key(r,words(r.querySelector('.lbl')),k);});
  {const r=$('alignSeg')&&$('alignSeg').previousElementSibling;if(r&&r.classList.contains('row'))key(r,'Align','align');}
  /* Mixed sizes (6.4): each row of sizes is its own setting; Shuffle's dot puts the first pattern back */
  [['mixSq','Squares'],['mixBar','Bars']].forEach(([id,lb])=>{const g=$(id),r=g&&g.closest('.row');if(!r)return;const ks=[...g.querySelectorAll('button')].map(b=>b.dataset.s);
    const part=a=>a.filter(k=>ks.includes(k)).join();
    reg(r,lb,p=>part(p.mixSizes)!==part(START.mixSizes),p=>{p.mixSizes=Object.keys(MIXSIZES).filter(k=>ks.includes(k)?START.mixSizes.includes(k):p.mixSizes.includes(k));});});
  {const t=$('mixShuffle')&&$('mixShuffle').parentElement;if(t)key(t,'Pattern','mixSeed');}
  /* Style and Type (6.5) */
  [['styleSeg','Style','style'],['tDirSeg','Direction','tDir'],['tModeSeg','Text','tMode'],['tFitSeg','Fit','tFit'],['tCaseSeg','Case','tCase']].forEach(([id,lb,k])=>{const r=$(id)&&$(id).closest('.row');if(r)key(r,lb,k);});
  {const t=$('tRun');if(t){const w=document.createElement('div');w.className='txt-wrap run-wrap';t.parentNode.insertBefore(w,t);w.append(t);key(w,'Running text','tRun');}}
  {const t=$('typeText');if(t){const w=document.createElement('div');w.className='txt-wrap';t.parentNode.insertBefore(w,t);w.append(t);key(w,'Text','text');}}
  reg(document.querySelector('.stepper'),'Bands',p=>p.nBands!==START.nBands,p=>{p.nBands=START.nBands;p.edges=evenEdges(p.nBands);
    p.states.forEach((s,i)=>{if(!s.userColor)s.color=rampColor(i,p.nBands);});});
  reg($('resetEdges')&&$('resetEdges').parentElement,'Thresholds',p=>!near(p.edges,evenEdges(p.nBands)),p=>{p.edges=evenEdges(p.nBands);});
  /* the band rows are drawn again whenever the bands change: give each its dot again */
  function bandRows(){$$('#states .state').forEach((r,i)=>reg(r,words(r.querySelector('.meta b'))||('Band '+(i+1)),p=>i<p.nBands&&bandMoved(p,i),
    (p,img)=>{const s=p.states[i];s.color=rampColor(i,p.nBands);s.userColor=false;s.inner=null;s.vb=null;s.key=null;s.bigInner=null;s.bigVb=null;s.bigKey=null;s.text='TUTTI';img[i]=[null,null];}));}
  new MutationObserver(()=>{for(let k=CTL.length-1;k>=0;k--)if(!CTL[k].w.isConnected)CTL.splice(k,1);bandRows();paint();}).observe($('states'),{childList:true});bandRows();
  /* each card: a dot beside its title while shut, a Reset chip while open */
  $$('.card[data-id]').forEach(c=>{const h=c.querySelector(':scope>h2'),t=h&&h.querySelector('.card-toggle');if(!t)return;
    const d=document.createElement('span');d.className='cdot';d.setAttribute('aria-hidden','true');const sp=t.querySelector('span');sp.after(d);
    const title=words(sp),r=document.createElement('button');r.type='button';r.className='pill small reset';r.innerHTML=RESET+'<span>Reset</span>';
    r.setAttribute('aria-label','Put '+title+' back');r.title='Put everything here back to where it started';
    r.addEventListener('click',e=>{e.stopPropagation();const p=getPreset(),list=CTL.filter(x=>c.contains(x.w)&&shown(x.w)&&x.moved(p));
      /* the whole of Mapping back means every band, including any the count has hidden for now */
      if(c.contains($('states')))list.push({back:(q,img)=>q.states.forEach((s,i)=>{s.color=rampColor(i,q.nBands);s.userColor=false;s.inner=null;s.vb=null;s.key=null;s.bigInner=null;s.bigVb=null;s.bigKey=null;s.text='TUTTI';img[i]=[null,null];})});
      restore(title+' put back',list);});h.append(r);});
  $$('.fold-head').forEach(h=>{const d=document.createElement('span');d.className='cdot';d.setAttribute('aria-hidden','true');h.querySelector('span').after(d);});
  /* a row counts only while it's there to see (Type's controls are away while a picture is the source) */
  function shown(w){for(let n=w;n&&!n.classList.contains('card');n=n.parentElement){if(n.classList.contains('fold-body')||n.classList.contains('card-anim'))continue;
    if(n.hidden||getComputedStyle(n).display==='none')return false;}return true;}
  function paint(){const p=getPreset();
    CTL.forEach(c=>{c.on=c.moved(p);if(c.w.classList.contains('chg')!==c.on)c.w.classList.toggle('chg',c.on);});
    $$('.card[data-id]').forEach(sec=>sec.classList.toggle('chg',CTL.some(c=>c.on&&sec.contains(c.w)&&shown(c.w))));
    $$('.fold-head').forEach(h=>{const b=h.nextElementSibling;h.classList.toggle('chg',!!b&&CTL.some(c=>c.on&&b.contains(c.w)&&shown(c.w)));});}
  function restore(label,list){if(!list.some(c=>c.moved))return;commit();const s=snapState(),p=JSON.parse(s.p),img=s.img.slice();
    list.forEach(c=>c.back(p,img));step(label,{p:JSON.stringify(p),img});status(label);}

  /* Undo: each settled change is a step. A drag, or typing with pauses under a second, is one. */
  const U=[],R=[],MAX=60;let cur=snapState(),pend=null,quiet=0,held=false;
  const nameOf=t=>{if(!t||!t.closest)return'';const x=t.closest('.ctl.rng,.toggle,.state,.stepper,.edges,.txt-wrap,.row,#alignSeg,.card-tools a,button,label.btn');if(!x)return'';
    if(x.closest('.markbox'))return'Mark';if(x.classList.contains('sttext'))return'Words';if(x.classList.contains('run-wrap'))return'Running text';if(x.id==='alignSeg')return'Align';if(x.classList.contains('edges'))return'Thresholds';if(x.classList.contains('stepper'))return'Bands';if(x.classList.contains('txt-wrap'))return'Text';
    const l=x.querySelector('.lbl,.meta b,:scope>span');return words(l||x);};
  function note(e){if(!panel.contains(e.target))return;const n=nameOf(e.target),now=Date.now();
    /* a new gesture starts: whatever settled before it (a file read in, say) is its own step */
    if(e.type!=='input'&&(!pend||pend.n!==n||now-quiet>700))commit();
    if(n)pend={n,t:now};quiet=now;}
  function commit(){const s=snapState();if(s.p===cur.p)return false;U.push({s:cur,label:pend&&Date.now()-pend.t<5000?pend.n:'Change'});if(U.length>MAX)U.shift();R.length=0;cur=s;pend=null;hist();return true;}
  function step(label,s){commit();U.push({s:cur,label});if(U.length>MAX)U.shift();R.length=0;putState(s);cur=snapState();hist();paint();}
  function go(from,to,verb){commit();const e=from.pop();if(!e){status('Nothing to '+verb.toLowerCase());return;}to.push({s:cur,label:e.label});putState(e.s);cur=snapState();
    status((verb==='Undo'?'Undone':'Redone')+' – '+e.label);hist();paint();}
  const ub=$('undoBtn'),rb=$('redoBtn');
  function hist(){ub.disabled=!U.length;rb.disabled=!R.length;const u=U[U.length-1],r=R[R.length-1];
    ub.title=u?'Undo '+u.label+' – ⌘Z':'Nothing to undo';rb.title=r?'Redo '+r.label+' – ⇧⌘Z':'Nothing to redo';}
  ub.addEventListener('click',()=>go(U,R,'Undo'));rb.addEventListener('click',()=>go(R,U,'Redo'));
  panel.addEventListener('input',note,true);panel.addEventListener('pointerdown',e=>{held=true;note(e);},true);panel.addEventListener('keydown',note,true);
  window.addEventListener('pointerup',()=>{held=false;},true);window.addEventListener('pointercancel',()=>{held=false;},true);
  panel.addEventListener('change',()=>setTimeout(()=>{commit();paint();},0),true);
  panel.addEventListener('click',()=>setTimeout(()=>{commit();paint();},0));
  /* anything settled a moment later – a mark's SVG read in, a preset loaded, typing that's paused */
  setInterval(()=>{const q=Date.now()-quiet;if(!held&&q>700&&q<15000&&commit())paint();},250);
  window.addEventListener('keydown',e=>{if(!(e.metaKey||e.ctrlKey)||e.altKey)return;const k=e.key.toLowerCase();if(k!=='z'&&k!=='y')return;
    const tg=e.target,typing=tg&&(tg.tagName==='TEXTAREA'||tg.isContentEditable||(tg.tagName==='INPUT'&&/text|number|search/.test(tg.type)));if(typing)return;
    e.preventDefault();if(e.shiftKey||k==='y')go(R,U,'Redo');else go(U,R,'Undo');},true);
  hist();paint();setInterval(paint,400);

  layout();summaries();requestAnimationFrame(()=>{syncRanges();layout();});
})();
