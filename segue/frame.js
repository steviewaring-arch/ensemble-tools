/* Segue – the frame. The interface system's parts (shared/UI.md): cards that fold and say
   what's set, folds, the system slider, segmented controls, toggles, colours, menus, sheets
   from the island and the Presets capsule, Preview, tooltips, light and dark, the panel's
   width, status. Written to match shared/core.js and core-end.js part for part; Segue keeps
   its own copy because the shared core is still tied to Rubato's settings and type engine
   (as Tutti does with tutti/frame.js). Move onto the core when that's split. */
const LS={get(k){try{return JSON.parse(localStorage.getItem('segue:'+k))}catch(e){return null}},
  set(k,v){try{localStorage.setItem('segue:'+k,JSON.stringify(v))}catch(e){}}};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const panel=$('#panel'),controls=[];
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
let dirty=true,saveT=0;
function set(k,v,silent){S[k]=v;dirty=true;onSet(k);clearTimeout(saveT);saveT=setTimeout(saveSettings,300);if(!silent)refreshAll();}
/* ---------------- cards and folds ---------------- */
const collapsed=LS.get('collapsed')||{canvas:true,motion:false,shapes:true,captions:true,overlay:true};
let curGroup='';
const CHEV='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 5.5 7 9l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function card(id,title,show){curGroup=id;
  const c=el('section','card'+(collapsed[id]?' collapsed':''));c.dataset.id=id;const h=el('h2'),b=el('button','card-toggle');
  const t=el('span',null,title),sm=el('span','sum'),ch=el('span','chev');ch.innerHTML=CHEV;b.append(t,sm,ch);b.setAttribute('aria-expanded',!collapsed[id]);
  b.onclick=()=>{const on=!c.classList.toggle('collapsed');collapsed[id]=!on;b.setAttribute('aria-expanded',on);LS.set('collapsed',collapsed);if(on)requestAnimationFrame(()=>syncRanges(c));};
  h.append(b);const body=el('div','card-body');c.append(h,body);panel.append(c);
  controls.push({d:{show:show||null},w:c,update(){},card:id});return body;}
const FOLDS=LS.get('folds')||{};
function fold(parent,id,title,show,shut,sum){
  const box=el('div'),head=el('button','fold-head'),label=el('span',null,title),chev=el('span','chev'),body=el('div','fold-body');head.type='button';chev.innerHTML=CHEV;
  const open=FOLDS[id]!=null?FOLDS[id]:!shut,paint=o=>{body.hidden=!o;head.setAttribute('aria-expanded',o);if(o)requestAnimationFrame(()=>syncRanges(body));};paint(open);
  head.onclick=()=>{const o=body.hidden;FOLDS[id]=o;LS.set('folds',FOLDS);paint(o);};
  head.append(label,chev);head._sum=sum||null;box.append(head,body);addCustom(parent,show||null,box);return body;}
const SUMMARY={};
function optLabel(opts,v){const o=(opts||[]).find(o=>o[0]===v);return o?o[1]:null;}
function autoSummary(id,inside){
  const out=[];let switches=0;
  for(const c of controls){const d=c.d;if(!d||c.card||!d.k||!c.w||!c.w.isConnected||c.w.hidden)continue;if(inside?!inside.contains(c.w):d.group!==id)continue;
    let t=null;
    if(Array.isArray(d.opts))t=optLabel(d.opts,S[d.k]);
    else if(typeof d.optsFn==='function'){try{t=optLabel(d.optsFn(),S[d.k]);}catch(e){}}
    else if(d.label&&c.w.classList&&c.w.classList.contains('toggle-row')){switches++;if(S[d.k]===true)t=d.label;}
    if(t&&/^(off|on|none|auto)$/i.test(t)&&d.label)t=d.label+' '+t.toLowerCase();
    if(t&&!out.includes(t))out.push(t);if(out.length>=(inside?1:3))break;}
  return out.length?out.join(' · '):switches?'Off':'';}
function refreshSummaries(){document.querySelectorAll('section.card[data-id]').forEach(sec=>{const sm=sec.querySelector(':scope>h2 .sum');if(!sm)return;
  let t='';try{t=SUMMARY[sec.dataset.id]?SUMMARY[sec.dataset.id](S):autoSummary(sec.dataset.id);}catch(e){}if(sm.textContent!==(t||''))sm.textContent=t||'';});
  document.querySelectorAll('.fold-head').forEach(hd=>{const body=hd.nextElementSibling;if(!body)return;let sm=hd.querySelector('.sum');
    if(!sm){sm=el('span','sum');hd.insertBefore(sm,hd.querySelector('.chev'));}let t='';try{t=hd._sum?hd._sum(S):autoSummary(null,body);}catch(e){}if(sm.textContent!==t)sm.textContent=t;});}
/* ---------------- sheets, island, Presets, Preview ---------------- */
const SHEETS={};
const sheetObs=new MutationObserver(ms=>{for(const m of ms){const n=m.target;if(!n.hidden)for(const k in SHEETS)if(SHEETS[k].el!==n)SHEETS[k].el.hidden=true;}syncSheets();});
function addSheet(name,node,opener){
  node.classList.add('sheet');node.dataset.sheet=name;node.hidden=true;
  $(name==='presets'?'#pcapSheets':'#islandSheets').append(node);SHEETS[name]={el:node,opener:opener||(name==='presets'?$('#pcapOpen'):name==='export'?$('#exportOpen'):null)};
  if(name==='presets')$('#pcap').hidden=false;if(name==='export')$('#exportOpen').hidden=false;
  sheetObs.observe(node,{attributes:true,attributeFilter:['hidden']});return node;}
function cardToSheet(body,name){const sec=body.parentElement;sec.classList.remove('card','collapsed');const ent=controls.find(c=>c.w===sec);if(ent)ent.d.show=null;return addSheet(name,sec);}
function openSheet(name){if(!SHEETS[name])return;for(const k in SHEETS)SHEETS[k].el.hidden=k!==name;syncSheets();}
function closeSheets(){for(const k in SHEETS)SHEETS[k].el.hidden=true;syncSheets();}
const anySheet=()=>Object.values(SHEETS).some(s=>!s.el.hidden);
function syncSheets(){
  const open={island:false,pcap:false};
  for(const k in SHEETS){const s=SHEETS[k],o=!s.el.hidden;open[k==='presets'?'pcap':'island']||=o;if(s.opener)s.opener.setAttribute('aria-expanded',o);}
  $('#island').classList.toggle('open',open.island);$('#pcap').classList.toggle('open',open.pcap);layoutUI();
  if(open.island||open.pcap)requestAnimationFrame(()=>{syncRanges(document);layoutUI();});}
function islMore(){const m=$('#islandMain');if(m)m.classList.toggle('more',innerWidth<=860&&m.scrollLeft+m.clientWidth<m.scrollWidth-1);}
function layoutUI(){
  const app=$('.app'),isl=$('#island'),pc=$('#pcap');if(!app||!isl)return;
  if(innerWidth<=860){isl.style.left='';islMore();return;}
  const g=12,W=app.clientWidth,away=app.classList.contains('preview')&&!app.classList.contains('peek'),pw=away?0:$('#panelBox').offsetWidth;
  const L=away?g:g*2+pw,R=W-g;let iw=isl.querySelector('.island-in').offsetWidth;if(isl.classList.contains('open'))iw=Math.max(iw,340);
  iw=Math.min(iw,R-L);let limit=R;if(pc&&!pc.hidden){let w=pc.querySelector('.pc-row').offsetWidth;if(pc.classList.contains('open'))w=Math.max(w,340);limit=R-w-8;}
  let x=(L+R)/2;if(x+iw/2>limit)x=limit-iw/2;if(x-iw/2<L)x=L+iw/2;isl.style.left=Math.round(x)+'px';}
const ICON_EXPAND='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M8.5 2.5h3v3M11.5 2.5 7.8 6.2M5.5 11.5h-3v-3M2.5 11.5l3.7-3.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_COLLAPSE='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M11.5 5.5h-3v-3M8.5 5.5l3.3-3.3M2.5 8.5h3v3M5.5 8.5l-3.3 3.3" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function setPanel(open){const app=$('.app');app.classList.toggle('peek',!!open);const p=$('#panelBtn');if(p){p.setAttribute('aria-expanded',!!open);const t=open?'Hide the panel':'Show the panel';p.dataset.tip=t;p.setAttribute('aria-label',t);}layoutUI();}
function setPreview(on){$('.app').classList.toggle('preview',on);setPanel(false);const b=$('#previewBtn');if(!b)return;b.setAttribute('aria-pressed',on);b.innerHTML=on?ICON_COLLAPSE:ICON_EXPAND;
  const t=on?'Fit to the clear space – F':'Preview – fill the window – F';b.dataset.tip=t;b.setAttribute('aria-label',t);requestAnimationFrame(fitCanvas);}
window.ensembleUI={open:openSheet,close:closeSheets,preview:setPreview,
  reveal(n){const s=n&&n.closest&&n.closest('.sheet');if(s&&s.hidden)openSheet(s.dataset.sheet);return true;}};
/* ---------------- controls ---------------- */
function syncRange(box){const inp=box.querySelector('input[type=range]');if(!inp)return;
  const mn=inp.min===''?0:+inp.min,mx=inp.max===''?100:+inp.max,p=mx>mn?clamp((+inp.value-mn)/(mx-mn),0,1):0;box.style.setProperty('--p',p);
  const w=box.offsetWidth,tick=box.querySelector('.rng-tick');if(!w||!tick)return;const hh=box.offsetHeight,x=hh/2+(w-hh/2)*p,head=box.querySelector('.ctl-head');let over=false;
  if(head)for(const e of head.children){if(!e.offsetWidth)continue;const l=head.offsetLeft+e.offsetLeft,r=l+e.offsetWidth;if(x>l-6&&x<r+6){over=true;break;}}
  tick.classList.toggle('away',over||p<.03||p>.97);}
function syncRanges(root){(root||document).querySelectorAll('.rng-box').forEach(syncRange);}
function upgradeRange(inp){const ctl=inp.parentElement;if(!ctl||!ctl.classList.contains('ctl')||inp.closest('.rng-box'))return;
  const head=ctl.querySelector(':scope>.ctl-head'),box=el('div','rng-box');ctl.classList.add('rng');ctl.insertBefore(box,head||inp);
  box.append(el('span','rng-fill'),el('span','rng-tick'));if(head)box.append(head);box.append(inp);
  inp.addEventListener('input',()=>syncRange(box));inp.addEventListener('dblclick',()=>{const l=box.querySelector('label');if(l&&l.ondblclick)l.ondblclick();});
  requestAnimationFrame(()=>syncRange(box));}
function fitSeg(g){const bs=[...g.children].filter(b=>b.tagName==='BUTTON'&&!b.hidden),n=bs.length;if(!n)return;
  const longest=Math.max(...bs.map(b=>(b.textContent||'').trim().length)),fits=c=>longest<=Math.floor((254/c-16)/6.6);
  let cols=1;if(g.closest('.isl-main'))cols=n;else for(let c=Math.min(n,4);c>=1;c--)if(fits(c)&&(n%c===0||n%c>=c-1)){cols=c;break;}
  g.classList.toggle('loose',cols===1&&n>1);
  if(cols>=n){g.classList.remove('wrap');g.style.removeProperty('--cols');}else{g.classList.add('wrap');g.style.setProperty('--cols',cols);}}
function enhance(root){if(!root||root.nodeType!==1)return;
  if(root.matches('.ctl>input[type=range]'))upgradeRange(root);root.querySelectorAll('.ctl>input[type=range]').forEach(upgradeRange);
  if(root.matches('.seg,.choice'))fitSeg(root);root.querySelectorAll('.seg,.choice').forEach(fitSeg);}
new MutationObserver(ms=>{for(const m of ms){if(m.target.classList&&(m.target.classList.contains('seg')||m.target.classList.contains('choice')))fitSeg(m.target);m.addedNodes.forEach(enhance);}}).observe(document.body,{childList:true,subtree:true});
const roundTo=(v,st)=>{const d=(String(st).split('.')[1]||'').length;return +(Math.round(v/st)*st).toFixed(d);};
function addRange(parent,d){
  const w=el('div','ctl'),hd=el('div','ctl-head'),lb=el('label',null,d.label),val=el('span','val');
  const id='c_'+(d.id||d.k);lb.htmlFor=id;lb.title='Double-click to reset';
  const inp=el('input');inp.type='range';inp.id=id;inp.min=d.min;inp.max=d.max;inp.step=d.step;
  const fmt=v=>d.fmt?d.fmt(v):(roundTo(v,d.step)+(d.unit||''));d.group=d.group||curGroup;
  inp.oninput=()=>{set(d.k,parseFloat(inp.value),true);val.textContent=fmt(+inp.value);refreshVis();refreshSummaries();};
  lb.ondblclick=()=>set(d.k,D[d.k]);
  hd.append(lb);const q=qMark(d);if(q)hd.append(q);hd.append(val);w.append(hd,inp);parent.append(w);
  const c={d,w,update(){if(document.activeElement!==inp)inp.value=S[d.k];val.textContent=fmt(S[d.k]);}};controls.push(c);return c;}
function addSeg(parent,d){
  const w=el('div','ctl');d.group=d.group||curGroup;if(d.label){const hd=el('div','ctl-head');hd.append(el('span',null,d.label));const q=qMark(d);if(q)hd.append(q);w.append(hd);}
  const g=el('div','seg');g.setAttribute('role','group');if(d.label)g.setAttribute('aria-label',d.label);w.append(g);parent.append(w);let sig='',bs=[];
  const paint=opts=>{g.textContent='';bs=opts.map(([v,t,tip])=>{const b=el('button','pill small',t);b.type='button';if(tip)b.dataset.tip=tip;b.onclick=()=>d.pick?d.pick(v):set(d.k,v);g.append(b);return[v,b];});};
  if(d.opts)paint(d.opts);
  const c={d,w,update(){if(d.optsFn){const o=d.optsFn(),ns=JSON.stringify(o);if(ns!==sig){sig=ns;paint(o);}}const cur=d.val?d.val(S):S[d.k];bs.forEach(([v,b])=>b.setAttribute('aria-pressed',cur===v));}};controls.push(c);return c;}
function addToggle(parent,d){
  const w=el('div','toggle-row'),b=el('button','toggle');b.type='button';b.setAttribute('role','switch');b.setAttribute('aria-label',d.label);d.group=d.group||curGroup;
  b.append(el('span','box'),el('span',null,d.label));w.append(b);const q=qMark(d);if(q)w.append(q);
  b.onclick=()=>set(d.k,!S[d.k]);parent.append(w);
  const c={d,w,update(){b.setAttribute('aria-checked',!!S[d.k]);}};controls.push(c);return c;}
function addColour(parent,d){
  const w=el('div','colour-row'),lb=el('label',null,d.label),cw=el('div','cw'),hex=el('input'),sw=el('span','cswatch'),inp=el('input');
  hex.type='text';hex.className='hexin';hex.spellcheck=false;hex.setAttribute('aria-label',d.label+' – hex');
  inp.type='color';inp.id='c_'+d.k;lb.htmlFor=inp.id;inp.oninput=()=>{set(d.k,inp.value.toUpperCase(),true);hex.value=inp.value.toUpperCase();};
  hex.onchange=()=>{let v=hex.value.trim();if(!v.startsWith('#'))v='#'+v;if(/^#[0-9a-f]{3}$/i.test(v))v='#'+v.slice(1).split('').map(c=>c+c).join('');if(/^#[0-9a-f]{6}$/i.test(v))set(d.k,v.toUpperCase());else hex.value=S[d.k];};
  sw.append(inp);cw.append(hex,sw);w.append(lb);const q=qMark(d);if(q)w.append(q);w.append(cw);parent.append(w);d.group=d.group||curGroup;
  const c={d,w,update(){inp.value=/^#[0-9a-f]{6}$/i.test(S[d.k])?S[d.k]:'#000000';if(document.activeElement!==hex)hex.value=String(S[d.k]).toUpperCase();}};controls.push(c);return c;}
function addSelect(parent,d){
  const w=el('div','ctl sel'),hd=el('div','ctl-head'),lb=el('label',null,d.label),s=el('select');s.id='c_'+d.k;lb.htmlFor=s.id;d.group=d.group||curGroup;
  hd.append(lb);const q=qMark(d);if(q)hd.append(q);w.append(hd,s);parent.append(w);let sig='';
  s.onchange=()=>set(d.k,d.num?+s.value:s.value);
  const c={d,w,update(){const o=d.optsFn?d.optsFn():d.opts,ns=JSON.stringify(o);if(ns!==sig){sig=ns;s.textContent='';for(const [v,t] of o){const op=el('option',null,t);op.value=v;s.append(op);}}
    if(document.activeElement!==s)s.value=S[d.k];}};controls.push(c);return c;}
function addNums(parent,d){/* a pair of number fields on one row – Width × Height */
  const w=el('div','ctl nums'),hd=el('div','ctl-head');hd.append(el('span',null,d.label));const q=qMark(d);if(q)hd.append(q);
  const row=el('div','num-row'),ins=d.keys.map((k,i)=>{const lab=el('label','num');const sp=el('span',null,d.names[i]);const inp=el('input');inp.type='number';inp.min=d.min;inp.max=d.max;inp.step=d.step||1;inp.setAttribute('aria-label',d.names[i]);
    inp.onchange=()=>{const v=clamp(+inp.value||0,d.min,d.max);set(k,v);};lab.append(sp,inp);row.append(lab);if(i<d.keys.length-1)row.append(el('span','x',d.sep||'×'));return[k,inp];});
  w.append(hd,row);parent.append(w);d.group=d.group||curGroup;
  const c={d,w,update(){for(const [k,inp] of ins)if(document.activeElement!==inp)inp.value=S[k];}};controls.push(c);return c;}
function addText(parent,d){
  const w=el('div','ctl txt'),hd=el('div','ctl-head'),lb=el('label',null,d.label),inp=el(d.multi?'textarea':'input');if(!d.multi)inp.type='text';else inp.rows=d.rows||2;
  inp.id='c_'+d.k;lb.htmlFor=inp.id;inp.spellcheck=false;if(d.placeholder)inp.placeholder=d.placeholder;d.group=d.group||curGroup;
  hd.append(lb);const q=qMark(d);if(q)hd.append(q);w.append(hd,inp);parent.append(w);
  inp.oninput=()=>set(d.k,inp.value,true);inp.onchange=()=>refreshAll();
  const c={d,w,update(){if(document.activeElement!==inp)inp.value=S[d.k]||'';}};controls.push(c);return c;}
function addCustom(parent,show,node){const c={d:{show},w:node,update(){}};parent.append(node);controls.push(c);return c;}
function addHint(parent,text,show){const p=el('p','hint',text);return addCustom(parent,show,p);}
function build(parent,list){for(const d of list){({range:addRange,seg:addSeg,toggle:addToggle,colour:addColour,select:addSelect,nums:addNums,text:addText}[d.t]||(()=>{}))(parent,d);}}
function refreshVis(){for(const c of controls){if(!c.d.show)continue;const v=!c.d.show(S);if(c.w.hidden!==v)c.w.hidden=v;}}
function refreshAll(){for(const c of controls)c.update();refreshVis();refreshSummaries();syncRanges(panel);if(typeof appRefresh==='function')appRefresh();}
/* ---------------- tooltips ---------------- */
const TIPS={};
function qMark(d){const t=d.tip||TIPS[d.k];if(!t)return null;const q=el('button','q','?');q.type='button';q.dataset.tip=t;q.setAttribute('aria-label',(d.label?d.label+': ':'')+t);return q;}
const tipEl=el('div','tip');tipEl.setAttribute('role','tooltip');document.body.append(tipEl);let tipFor=null;
function showTip(q,text,at){if(q&&q.getAttribute&&q.getAttribute('aria-expanded')==='true')return;tipFor=q;tipEl.textContent=text||q.dataset.tip;q=at||q;tipEl.classList.add('on');const r=q.getBoundingClientRect(),tw=tipEl.offsetWidth,th=tipEl.offsetHeight;
  tipEl.style.left=clamp(r.left+r.width/2-tw/2,8,innerWidth-tw-8)+'px';let y=r.top-th-8;if(y<8)y=r.bottom+8;tipEl.style.top=y+'px';}
function hideTip(){tipFor=null;tipEl.classList.remove('on');}
let rowTipT=0,byKeys=false,tipMute=null;
function tipRow(t){const row=t.closest('[data-tip],.ctl,.toggle-row,.colour-row,.slot-top');return row&&(row.dataset.tip?row:row.querySelector('.q'));}
document.addEventListener('keydown',()=>{byKeys=true;},true);
document.addEventListener('pointerdown',e=>{byKeys=false;clearTimeout(rowTipT);hideTip();const t=e.target.closest?e.target:null;tipMute=t&&!t.closest('.q')?tipRow(t):null;},true);
document.addEventListener('mouseover',e=>{const t=e.target.closest?e.target:null;if(!t)return;const q=t.closest('.q');clearTimeout(rowTipT);
  if(q){tipMute=null;if(q!==tipFor)showTip(q);return;}
  const row=t.closest('[data-tip],.ctl,.toggle-row,.colour-row,.slot-top');const src=row&&(row.dataset.tip?row:row.querySelector('.q'));
  if(src&&src===tipMute)return;tipMute=null;
  if(src&&src!==tipFor){rowTipT=setTimeout(()=>showTip(src,src.dataset.tip,src.offsetParent?src:row),src===row?400:550);return;}
  if(!src&&tipFor&&!(byKeys&&document.activeElement===tipFor))hideTip();});
document.addEventListener('focusin',e=>{const q=e.target.closest&&e.target.closest('.q,[data-tip]');if(q&&byKeys)showTip(q);else if(tipFor)hideTip();});
document.addEventListener('click',e=>{const q=e.target.closest&&e.target.closest('.q');if(q){e.preventDefault();if(tipFor===q)hideTip();else showTip(q);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tipFor)hideTip();});
panel.addEventListener('scroll',()=>{if(tipFor)hideTip();},{passive:true});
/* ---------------- status and downloads ---------------- */
let toastT=0;function toast(m,hold){const t=$('#toast');t.textContent=m;t.title=m;t.classList.add('on');clearTimeout(toastT);if(!hold)toastT=setTimeout(()=>t.classList.remove('on'),2800);}
let dlNs=null;const dlReady=(window.claude&&typeof claude.use==='function')?claude.use('downloads').then(n=>dlNs=n).catch(()=>null):Promise.resolve(null);
async function saveFile(name,blob){
  if(window.claude&&typeof claude.use==='function'){await dlReady;
    if(dlNs){try{await dlNs.save({filename:name,data:blob});toast(`Saved ${name}`);}catch(e){const c=e&&e.code;toast(c==='declined'?'Download cancelled':c==='too_large'?'That file is too large. Try a smaller size.':`Couldn't save ${name}.`);}return;}}
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast(`Saved ${name}`);}
/* ---------------- light and dark, keys, the panel's width ---------------- */
function setTheme(t,chosen){document.body.dataset.theme=t;if(chosen)LS.set('mode',t);const b=$('#themeBtn');if(b)b.setAttribute('aria-label',t==='dark'?'Light mode':'Dark mode');}
function frameStart(){
  {const b=$('#themeBtn');b.dataset.tip='Light or dark';b.onclick=()=>setTheme(document.body.dataset.theme==='dark'?'light':'dark',true);setTheme(LS.get('mode')==='dark'?'dark':'light');}
  const pb=$('#previewBtn');setPreview(false);pb.onclick=()=>setPreview(!$('.app').classList.contains('preview'));
  $('#panelBtn').onclick=e=>{e.stopPropagation();setPanel(!$('.app').classList.contains('peek'));};
  const eo=$('#exportOpen');eo.dataset.tip='Save or download what’s on the stage';eo.onclick=e=>{e.stopPropagation();SHEETS.export&&SHEETS.export.el.hidden?openSheet('export'):closeSheets();};
  $('#pcapOpen').onclick=e=>{e.stopPropagation();SHEETS.presets&&SHEETS.presets.el.hidden?openSheet('presets'):closeSheets();};
  $('#stage').addEventListener('pointerdown',e=>{if(anySheet()){closeSheets();e.stopPropagation();}else if($('.app').classList.contains('peek')){setPanel(false);e.stopPropagation();}},true);
  window.addEventListener('keydown',e=>{
    const tg=e.target,typing=tg&&(tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable||(tg.tagName==='INPUT'&&/text|number|search/.test(tg.type)));
    if(e.key==='Escape'){if(anySheet()){closeSheets();return;}if($('.app').classList.contains('preview'))setPreview(false);return;}
    if(typing||e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.key==='f'||e.key==='F'){e.preventDefault();setPreview(!$('.app').classList.contains('preview'));}
    if(e.key===' '&&!(tg&&tg.tagName==='BUTTON')){e.preventDefault();setPlaying(!playing);}},true);
  $('#islandMain').addEventListener('scroll',islMore,{passive:true});
  const ro=new ResizeObserver(()=>{layoutUI();fitCanvas();});ro.observe($('.island-in'));ro.observe($('#panelBox'));ro.observe($('#view'));ro.observe($('#pcap .pc-row'));
  window.addEventListener('resize',layoutUI);
  const rz=$('#resizer'),app=$('.app'),pw=LS.get('panelW'),put=w=>{app.style.setProperty('--pw',w+'px');document.documentElement.style.setProperty('--pw',w+'px');};
  if(pw)put(clamp(pw,280,440));
  rz.addEventListener('pointerdown',e=>{e.preventDefault();rz.setPointerCapture(e.pointerId);const x0=e.clientX,w0=$('#panelBox').offsetWidth;
    const mv=ev=>{put(clamp(w0+ev.clientX-x0,280,440));syncRanges(panel);};
    rz.addEventListener('pointermove',mv);rz.addEventListener('pointerup',()=>{rz.removeEventListener('pointermove',mv);LS.set('panelW',$('#panelBox').offsetWidth);},{once:true});});}
