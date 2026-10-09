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
    tick.classList.toggle('away',over);}
  function syncRanges(root){$$('.rng-box',root).forEach(syncRange);}
  $$('input[type=range]').forEach(inp=>{const row=inp.previousElementSibling;if(!row||!row.classList.contains('row')||!row.querySelector('.val')||inp.closest('.edges'))return;
    const ctl=document.createElement('div'),box=document.createElement('div');ctl.className='ctl rng';box.className='rng-box';
    inp.parentNode.insertBefore(ctl,row);ctl.append(box);
    const f=document.createElement('span'),t=document.createElement('span');f.className='rng-fill';t.className='rng-tick';
    row.classList.add('ctl-head');row.style.removeProperty('margin-top');box.append(f,t,row,inp);
    inp.addEventListener('input',()=>syncRange(box));});
  setInterval(()=>{syncRanges();summaries();},400);

  /* Export: a sheet that grows out of the island */
  const setSheet=open=>{sheet.hidden=!open;island.classList.toggle('open',open);opener.setAttribute('aria-expanded',open);layout();};
  opener.addEventListener('click',e=>{e.stopPropagation();setSheet(sheet.hidden);});
  document.querySelector('.stage').addEventListener('pointerdown',()=>{if(!sheet.hidden)setSheet(false);});

  /* the island sits centred under the work, clear of the panel */
  function layout(){const narrow=innerWidth<=860,g=12,W=narrow?innerWidth:app.clientWidth,pw=narrow?0:document.querySelector('.panel').offsetWidth,L=narrow?g:g*2+pw,R=W-g;
    let iw=island.querySelector('.island-in').offsetWidth;if(island.classList.contains('open'))iw=Math.max(iw,340);
    let x=(L+R)/2;if(x+iw/2>R)x=R-iw/2;if(x-iw/2<L)x=L+iw/2;island.style.left=Math.round(x)+'px';}
  const ro=new ResizeObserver(layout);ro.observe(island.querySelector('.island-in'));ro.observe(document.querySelector('.panel'));window.addEventListener('resize',layout);

  /* Preview: the work fills the window; the panel and island stay where they are */
  const EXPAND='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M8.5 2.5h3v3M11.5 2.5 7.8 6.2M5.5 11.5h-3v-3M2.5 11.5l3.7-3.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const COLLAPSE='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M11.5 5.5h-3v-3M8.5 5.5l3.3-3.3M2.5 8.5h3v3M5.5 8.5l-3.3 3.3" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const pb=$('previewBtn');
  function setPreview(on){app.classList.toggle('preview',on);pb.setAttribute('aria-pressed',on);pb.innerHTML=on?COLLAPSE:EXPAND;
    const t=on?'Fit to the clear space – F':'Preview – fill the window – F';pb.setAttribute('aria-label',t);pb.title=t;}
  setPreview(false);pb.addEventListener('click',()=>setPreview(!app.classList.contains('preview')));

  /* light and dark: the computer's choice the first time, then remembered */
  const tb=$('themeBtn'),K='tutti:theme';
  function setTheme(t){document.body.setAttribute('data-theme',t);try{localStorage.setItem(K,t);}catch(e){}tb.setAttribute('aria-label',t==='dark'?'Light mode':'Dark mode');}
  let saved=null;try{saved=localStorage.getItem(K);}catch(e){}
  setTheme(saved==='light'||saved==='dark'?saved:(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  tb.title='Light or dark';tb.addEventListener('click',()=>setTheme(document.body.getAttribute('data-theme')==='dark'?'light':'dark'));

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
