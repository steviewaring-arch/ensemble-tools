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
  const label=sel=>{const o=sel&&sel.options[sel.selectedIndex];return o?o.text.replace(/\s*:\s*/,':').replace('…',''):'';};
  const SUM={
    source:()=>S.kind?($('srcName').textContent||''):'No source',
    canvas:()=>label($('aspect'))+' · Grid '+$('grid').value,
    shape:()=>[S.fill?'Solid':'Outline',S.invert?'Inverted':'',S.scale?'Scale with midtones':''].filter(Boolean).join(' · '),
    mapping:()=>S.nBands+' bands',
    advanced:()=>''};
  function summaries(){$$('.card[data-id]').forEach(c=>{const sm=c.querySelector('.sum');if(!sm)return;let t='';try{t=(SUM[c.dataset.id]||(()=>''))();}catch(e){}if(sm.textContent!==t)sm.textContent=t;});}

  /* the system slider: label and value inside the track, the fill carries the value,
     the tick steps aside where it would cross the words */
  function syncRange(box){const inp=box.querySelector('input[type=range]');if(!inp)return;
    const mn=inp.min===''?0:+inp.min,mx=inp.max===''?100:+inp.max,p=mx>mn?Math.max(0,Math.min(1,(+inp.value-mn)/(mx-mn))):0;box.style.setProperty('--p',p);
    const w=box.offsetWidth,tick=box.querySelector('.rng-tick');if(!w||!tick)return;const hh=box.offsetHeight,x=hh/2+(w-hh/2)*p,head=box.querySelector('.row');let over=false;
    if(head)for(const e of head.querySelectorAll('.lbl,.val')){if(!e.offsetWidth)continue;const l=head.offsetLeft+e.offsetLeft,r=l+e.offsetWidth;if(x>l-6&&x<r+6){over=true;break;}}
    tick.classList.toggle('away',over||p<.03||p>.97);}
  function syncRanges(root){$$('.rng-box',root).forEach(syncRange);}
  $$('input[type=range]').forEach(inp=>{const row=inp.previousElementSibling;if(!row||!row.classList.contains('row')||!row.querySelector('.val')||inp.closest('.edges'))return;
    const ctl=document.createElement('div'),box=document.createElement('div');ctl.className='ctl rng';box.className='rng-box';
    inp.parentNode.insertBefore(ctl,row);ctl.append(box);
    const f=document.createElement('span'),t=document.createElement('span');f.className='rng-fill';t.className='rng-tick';
    row.classList.add('ctl-head');row.style.removeProperty('margin-top');box.append(f,t,row,inp);
    inp.addEventListener('input',()=>syncRange(box));});
  /* the threshold Edges are rebuilt whenever the bands change: give each the system slider too */
  function upgradeEdge(d){if(d.querySelector('.rng-box'))return;const lab=d.querySelector('label'),inp=d.querySelector('input'),v=lab&&lab.querySelector('span');if(!lab||!inp||!v)return;
    const t=document.createElement('span');t.className='lbl';t.textContent=(lab.firstChild&&lab.firstChild.nodeType===3?lab.firstChild.textContent:'').trim();v.classList.add('val');
    const head=document.createElement('div');head.className='row ctl-head';head.append(t,v);
    const box=document.createElement('div'),f=document.createElement('span'),k=document.createElement('span');box.className='rng-box';f.className='rng-fill';k.className='rng-tick';
    box.append(f,k,head,inp);d.replaceChildren(box);inp.addEventListener('input',()=>syncRange(box));syncRange(box);}
  const edges=$('edges');if(edges){const up=()=>edges.querySelectorAll('.edge').forEach(upgradeEdge);new MutationObserver(up).observe(edges,{childList:true});up();}
  setInterval(()=>{syncRanges();summaries();},400);

  /* Export: a sheet that grows out of the island */
  const setSheet=open=>{sheet.hidden=!open;island.classList.toggle('open',open);opener.setAttribute('aria-expanded',open);opener.title=open?'':'Save or download what’s on the stage';layout();};
  opener.addEventListener('click',e=>{e.stopPropagation();setSheet(sheet.hidden);});
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

  /* keys: F for Preview, Esc closes Export or leaves Preview */
  window.addEventListener('keydown',e=>{const tg=e.target,typing=tg&&(tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable||(tg.tagName==='INPUT'&&/text|number|search/.test(tg.type)));
    if(e.key==='Escape'){if(!sheet.hidden){setSheet(false);return;}if(app.classList.contains('preview'))setPreview(false);return;}
    if(typing||e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='f'||e.key==='F'){e.preventDefault();setPreview(!app.classList.contains('preview'));}},true);

  /* the panel's width: drag its right edge */
  const rz=$('resizer'),put=w=>document.documentElement.style.setProperty('--pw',w+'px');
  try{const w=+localStorage.getItem('tutti:panelW');if(w)put(Math.max(280,Math.min(440,w)));}catch(e){}
  rz.addEventListener('pointerdown',e=>{e.preventDefault();rz.setPointerCapture(e.pointerId);const x0=e.clientX,w0=document.querySelector('.panel').offsetWidth;
    const mv=ev=>{put(Math.max(280,Math.min(440,w0+ev.clientX-x0)));syncRanges();};
    rz.addEventListener('pointermove',mv);rz.addEventListener('pointerup',()=>{rz.removeEventListener('pointermove',mv);try{localStorage.setItem('tutti:panelW',document.querySelector('.panel').offsetWidth);}catch(e){}},{once:true});});

  /* tooltips: hovering a row shows its ? after a beat, as hovering the ? does at once */
  let rt=0,rq=null;
  document.addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest('.row,.toggle,.ctl');clearTimeout(rt);
    if(e.target.closest&&e.target.closest('.q'))return;const q=t&&t.querySelector('.q');
    if(rq&&rq!==q){rq.dispatchEvent(new MouseEvent('mouseout',{bubbles:true}));rq=null;}
    if(q)rt=setTimeout(()=>{rq=q;q.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));},500);});
  /* buttons that carry their meaning in a title get it as a tooltip too */
  $$('#appearance button,#exportOpen').forEach(b=>{if(!b.title)b.title=b.getAttribute('aria-label')||b.textContent;});

  layout();summaries();requestAnimationFrame(()=>{syncRanges();layout();});
})();
