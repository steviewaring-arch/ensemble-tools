/* Segue – the app. Media in, framed loops out: the canvas, the shapes the media sits in,
   how they move and loop, captions, fonts and presets. The engine (segue/engine.js) draws;
   this file owns the settings, the media and the interface. */
const E=SegueEngine;
/* ---------------- settings ---------------- */
const D={
  cSize:'4:5',cW:1080,cH:1350,bg:'#F5F5F3',fps:30,
  layout:'column',ratio:'16:10',rW:16,rH:10,size:86,cols:3,gap:64,radius:12,fit:'fill',shapeBg:'#E6E6E3',edge:false,edgeC:'#111111',edgeW:2,nudgeX:0,nudgeY:0,
  oneMove:'slide',trackMove:'step',dir:'up',feel:'inertia',hold:1.2,dur:.7,spsh:2.5,still:8,after:'pull',gCols:3,gGap:40,gSize:88,zOut:1.1,gHold:1.6,zIn:1.1,zFeel:'glide',
  capOn:true,capWhere:'under',capAlign:'left',capV:'bottom',capMargin:64,capSpace:28,capX:0,capY:0,capGapL:10,capReveal:'scramble',capRevealDur:.8,
  accent:'#EA2631',kern:true,pairs:'',gLook:'outline',gFill:'#E4E4E0',
  TF:'inter8',TS:54,TTr:-20,TLd:1.0,TC:'#111111',TCase:'upper',
  LF:'plex',LS:17,LTr:0,LLd:1.4,LC:'#6B6A66',LCase:'as',
  GF:'plex',GS:13,GTr:20,GLd:1.2,GC:'#111111',GCase:'as',
  name:'Segue',xFormat:'mp4',xLoops:1,xGifScale:.5,xGifFps:20};
/* the look: what a preset carries. Size, frame rate and the file name stay as they are. */
const NOT_LOOK=['cSize','cW','cH','fps','name','xFormat','xLoops','xGifScale','xGifFps'];
const LOOK=Object.keys(D).filter(k=>!NOT_LOOK.includes(k));
/* px values: presets keep them for a 1080 short side and scale them to the canvas they land on */
const PX=['gap','radius','edgeW','nudgeX','nudgeY','gGap','capSpace','capX','capY','capMargin','capGapL','TS','LS','GS'];
function sanitise(o){const r={};if(!o||typeof o!=='object')return r;for(const k in D)if(k in o&&typeof o[k]===typeof D[k])r[k]=o[k];return r;}
function loadSettings(){return Object.assign({},D,sanitise(LS.get('settings')));}
function saveSettings(){LS.set('settings',S);}
const S=loadSettings();
/* ---------------- fonts ---------------- */
const FONTS={
  'aktiv':{label:'Aktiv Grotesk',family:'"aktiv-grotesk","Aktiv Grotesk",Helvetica,Arial,sans-serif',weight:400,builtin:true},
  'aktivB':{label:'Aktiv Grotesk Bold',family:'"aktiv-grotesk","Aktiv Grotesk",Helvetica,Arial,sans-serif',weight:700,builtin:true},
  'inter4':{label:'Inter Tight',family:'"Inter Tight",Helvetica,Arial,sans-serif',weight:400,builtin:true},
  'inter6':{label:'Inter Tight SemiBold',family:'"Inter Tight",Helvetica,Arial,sans-serif',weight:600,builtin:true},
  'inter8':{label:'Inter Tight ExtraBold',family:'"Inter Tight",Helvetica,Arial,sans-serif',weight:800,builtin:true},
  'plex':{label:'IBM Plex Mono',family:'"IBM Plex Mono",Menlo,monospace',weight:400,builtin:true},
  'plexM':{label:'IBM Plex Mono Medium',family:'"IBM Plex Mono",Menlo,monospace',weight:500,builtin:true},
  'helv':{label:'Helvetica',family:'"Helvetica Neue",Helvetica,Arial,sans-serif',weight:400,builtin:true},
  'helvB':{label:'Helvetica Bold',family:'"Helvetica Neue",Helvetica,Arial,sans-serif',weight:700,builtin:true}};
Object.defineProperty(FONTS,'default',{get(){return FONTS.inter4;},enumerable:false});
const fontOpts=()=>Object.entries(FONTS).map(([id,f])=>[id,f.label]);
const fontStr=f=>`${f.style||'normal'} ${f.weight||400} 40px ${f.family}`;
function fontsSettled(){E.resetMeasure();dirty=true;}
function loadBuiltinFonts(){if(!document.fonts)return;Promise.all(Object.values(FONTS).map(f=>document.fonts.load(fontStr(f)).catch(()=>null))).then(fontsSettled);document.fonts.ready.then(fontsSettled);}
async function addFont(file,id,save){
  try{const buf=await file.arrayBuffer();id=id||('u'+Date.now().toString(36)+Math.random().toString(36).slice(2,5));const fam='segue_'+id;
    let label=file.name.replace(/\.(otf|ttf|woff2?)$/i,'');try{if(window.opentype&&!/\.woff2$/i.test(file.name)){const f=opentype.parse(buf);const n=f.names,pick=x=>x&&(x.en||Object.values(x)[0]);label=pick(n.fullName)||[pick(n.fontFamily),pick(n.fontSubfamily)].filter(Boolean).join(' ')||label;}}catch(e){}
    const face=new FontFace(fam,buf);await face.load();document.fonts.add(face);
    FONTS[id]={label,family:`"${fam}",Helvetica,Arial,sans-serif`,weight:'normal',own:true,file:file.name};
    if(save!==false){try{await DB.put('fonts',id,{name:file.name,type:file.type,data:buf,label});}catch(e){}LS.set('fonts',ownFontIds());}
    fontsSettled();return id;}
  catch(e){toast(`Couldn’t read ${file.name} as a font`);return null;}}
const ownFontIds=()=>Object.keys(FONTS).filter(k=>FONTS[k].own);
async function removeFont(id){delete FONTS[id];try{await DB.del('fonts',id);}catch(e){}LS.set('fonts',ownFontIds());for(const r of ['T','L','G'])if(S[r+'F']===id)S[r+'F']=D[r+'F'];fontsSettled();refreshAll();}
/* ---------------- storage for media and fonts (IndexedDB – stays on this computer) ---------------- */
const DB=(()=>{let p=null;const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('segue',1);r.onupgradeneeded=()=>{const d=r.result;for(const n of ['media','fonts'])if(!d.objectStoreNames.contains(n))d.createObjectStore(n);};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));
  const tx=async(st,mode,fn)=>{const d=await open();return new Promise((res,rej)=>{const t=d.transaction(st,mode),s=t.objectStore(st),r=fn(s);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});};
  return{put:(st,k,v)=>tx(st,'readwrite',s=>s.put(v,k)),get:(st,k)=>tx(st,'readonly',s=>s.get(k)),del:(st,k)=>tx(st,'readwrite',s=>s.delete(k))};})();
/* ---------------- media ---------------- */
let items=[];
const META=['id','name','kind','w','h','dur','start','title','line','tags','arrive','levels','fixed'];
function saveItems(){LS.set('items',items.map(it=>Object.fromEntries(META.map(k=>[k,it[k]]))));}
const isVideo=f=>/^video\//.test(f.type)||/\.(mp4|m4v|mov|webm)$/i.test(f.name);
const isImage=f=>/^image\//.test(f.type)||/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(f.name);
async function loadImage(blob){
  try{return await createImageBitmap(blob);}catch(e){}
  return await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=URL.createObjectURL(blob);});}
function loadVideo(blob){return new Promise((res,rej)=>{const v=document.createElement('video');v.muted=true;v.playsInline=true;v.loop=true;v.preload='auto';
  const url=URL.createObjectURL(blob);let done=false;const fail=()=>{if(done)return;done=true;URL.revokeObjectURL(url);rej(new Error('video'));};
  v.onloadeddata=()=>{if(done)return;done=true;res(v);};v.onerror=fail;setTimeout(()=>{if(!done&&v.readyState<1)fail();},15000);v.src=url;v.load();});}
async function mediaFrom(blob,meta){
  if(meta.kind==='video'){const v=await loadVideo(blob);meta.w=v.videoWidth;meta.h=v.videoHeight;meta.dur=v.duration||1;meta.src=v;meta.el=v;
    v.addEventListener('seeked',()=>{dirty=true;});return meta;}
  const im=await loadImage(blob);meta.w=im.width||im.naturalWidth;meta.h=im.height||im.naturalHeight;meta.src=im;return meta;}
/* Video that says one thing in the file and another in the stream (Tempo's promo MP4s up to
   0.11.1: the file says video range, the H.264 stream says full range) plays with lifted greys
   in some players. When the two disagree, Segue makes the stream agree with the file before
   the video is used – the pictures themselves aren't touched. */
function find(b,pat,from){const f=pat[0];for(let i=from||0;i<=b.length-pat.length;i++){if(b[i]!==f)continue;let k=1;while(k<pat.length&&b[i+k]===pat[k])k++;if(k===pat.length)return i;}return -1;}
const tag=s=>Uint8Array.from(s,c=>c.charCodeAt(0));
async function fixSourceRange(file){
  if(file.size>600e6||!/\.(mp4|m4v|mov)$/i.test(file.name)&&!/mp4|quicktime/.test(file.type))return null;
  const b=new Uint8Array(await file.arrayBuffer()),c=find(b,tag('colrnclx'));if(c<0||(b[c+14]&128))return null;/* no label, or labelled full range: leave it */
  let at=find(b,tag('avcC')),changed=0;
  while(at>=0){let p=at+4+5;const n=b[p++]&31;for(let i=0;i<n;i++){const l=(b[p]<<8)|b[p+1];p+=2;const sps=b.slice(p,p+l),f=spsVideoRange(sps);
      if(f&&f.length===l){b.set(f,p);changed++;
        /* the same header repeated inside the frames, if it is */
        const pat=new Uint8Array(4+l);pat.set([l>>>24,(l>>16)&255,(l>>8)&255,l&255]);pat.set(sps,4);let q=find(b,pat);while(q>=0){b.set(f,q+4);q=find(b,pat,q+4+l);}}
      p+=l;}
    at=find(b,tag('avcC'),at+4);}
  return changed?new File([b],file.name,{type:file.type||'video/mp4'}):null;}
async function addFiles(files){
  const fonts=files.filter(f=>/\.(otf|ttf|woff2?)$/i.test(f.name)),media=files.filter(f=>isVideo(f)||isImage(f));
  for(const f of fonts)await addFont(f);
  if(fonts.length)refreshAll();
  let n=0;for(let f of media){const id='m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);let fixed=false;
    if(isVideo(f)){try{const g=await fixSourceRange(f);if(g){f=g;fixed=true;}}catch(e){}}
    try{const it=await mediaFrom(f,{id,name:f.name,kind:isVideo(f)?'video':'image',start:0,title:'',line:'',tags:'',arrive:'default',levels:false,fixed});
      items.push(it);n++;try{await DB.put('media',id,f);}catch(e){toast('Couldn’t keep a copy for next time – it’s here until you close the page');}}
    catch(e){toast(isVideo(f)?`This browser can’t play ${f.name} – try an MP4 (H.264) or WebM`:`Couldn’t open ${f.name}`);}}
  if(n){saveItems();mediaChanged();toast(n===1?'Added 1 file':`Added ${n} files`);}}
async function restoreMedia(){
  const list=LS.get('items')||[];if(!list.length)return;let lost=0;
  for(const m of list){try{const blob=await DB.get('media',m.id);if(!blob){lost++;continue;}items.push(await mediaFrom(blob,Object.assign({},m)));}catch(e){lost++;}}
  if(lost)toast(lost===1?'One file couldn’t be found again – add it back':`${lost} files couldn’t be found again – add them back`);
  saveItems();mediaChanged();}
async function restoreFonts(){for(const id of (LS.get('fonts')||[])){try{const r=await DB.get('fonts',id);if(r)await addFont(new File([r.data],r.name,{type:r.type||''}),id,false);}catch(e){}}refreshAll();}
function removeItem(id){const i=items.findIndex(x=>x.id===id);if(i<0)return;const it=items[i];if(it.el){it.el.pause();URL.revokeObjectURL(it.el.src);}items.splice(i,1);DB.del('media',id).catch(()=>{});openRows.delete(id);saveItems();mediaChanged();}
function moveItem(id,to){const i=items.findIndex(x=>x.id===id);if(i<0)return;to=clamp(to,0,items.length-1);if(to===i)return;const [it]=items.splice(i,1);items.splice(to,0,it);saveItems();mediaChanged();}
function mediaChanged(){E.resetMeasure();dirty=true;paintMedia();refreshAll();}
/* drawing media into a shape: centred, filling it (cropped) or fitting inside it */
const lvCanvas=document.createElement('canvas'),lvCtx=lvCanvas.getContext('2d',{willReadFrequently:true});
const LV=new Uint8ClampedArray(256).map((_,i)=>Math.round((i-16)*255/219));
function drawMedia(ctx,o,r,mode){const it=o.item,src=it.src;if(!src||!it.w||!it.h)return;if(it.kind==='video'&&src.readyState<2)return;
  const s=mode==='cover'?Math.max(r.w/it.w,r.h/it.h):Math.min(r.w/it.w,r.h/it.h),dw=it.w*s,dh=it.h*s,dx=r.x+(r.w-dw)/2,dy=r.y+(r.h-dh)/2;
  if(!it.levels){ctx.drawImage(src,dx,dy,dw,dh);return;}
  /* lift washed-out colours: video that says it's full range but is video range, read as video range */
  const k=ctx.getTransform().a||1,pw=Math.max(1,Math.ceil(dw*k)),ph=Math.max(1,Math.ceil(dh*k));
  if(lvCanvas.width!==pw||lvCanvas.height!==ph){lvCanvas.width=pw;lvCanvas.height=ph;}
  lvCtx.drawImage(src,0,0,pw,ph);const id=lvCtx.getImageData(0,0,pw,ph),d=id.data;for(let j=0;j<d.length;j+=4){d[j]=LV[d[j]];d[j+1]=LV[d[j+1]];d[j+2]=LV[d[j+2]];}
  lvCtx.putImageData(id,0,0);ctx.drawImage(lvCanvas,dx,dy,dw,dh);}
/* ---------------- the preview ---------------- */
const cv=$('#cv'),ctx=cv.getContext('2d');
let playing=true,clock=0,lastT=0,busy=false,cur=null;
const size=()=>E.canvasSize(S);
function fitCanvas(){
  const [W,H]=size(),v=$('#view'),cs=getComputedStyle(v);
  const aw=v.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=v.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
  const s=Math.max(.01,Math.min(aw/W,ah/H)),cw=Math.floor(W*s),ch=Math.floor(H*s);cv.style.width=cw+'px';cv.style.height=ch+'px';
  /* the preview draws at the size it shows (sharp on a retina screen), never above the real size */
  const k=Math.min(1,cw*(devicePixelRatio||1)/W),bw=Math.max(1,Math.round(W*k)),bh=Math.max(1,Math.round(H*k));
  if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh;}
  $('#dims').textContent=`${W} × ${H}`;$('#dims').title=`The loop comes out at ${W} × ${H} pixels`;dirty=true;}
function planNow(){return E.plan(S,items.length?items:Array.from({length:6},()=>({})));}
function render(){
  const [W,H]=size(),P=planNow(),t=((clock%P.L)+P.L)%P.L;
  const sc=E.scene(S,items,ctx,FONTS,W,H,t);cur=sc;
  syncVideos(sc);
  E.paint(ctx,sc,S,FONTS,{scale:cv.width/W,media:drawMedia});
  if(document.activeElement!==$('#scrub'))$('#scrub').value=Math.round(t/P.L*1000);
  $('#time').textContent=`${t.toFixed(1)} / ${P.L.toFixed(1)} s`;}
/* the preview plays each video near where the loop wants it, and corrects it when it drifts */
const wrapD=(a,b,d)=>{let x=Math.abs(a-b)%d;return Math.min(x,d-x);};
function syncVideos(sc){const want=new Map();for(const o of sc.ops)if(o.item.kind==='video'&&o.time!=null&&!want.has(o.item))want.set(o.item,o.time);
  for(const it of items){if(it.kind!=='video'||!it.el)continue;const v=it.el,t=want.get(it);
    if(t==null){if(!v.paused)v.pause();continue;}
    const d=Math.max(.01,it.dur||v.duration||1),tt=((t%d)+d)%d;
    if(playing&&!busy){if(v.paused)v.play().catch(()=>{});if(wrapD(v.currentTime,tt,d)>.25&&!v.seeking)v.currentTime=tt;}
    else{if(!v.paused)v.pause();if(wrapD(v.currentTime,tt,d)>.02&&!v.seeking)v.currentTime=tt;}}}
function tick(now){const dt=lastT?Math.min(100,now-lastT):0;lastT=now;
  if(playing&&!busy){clock+=dt/1000;dirty=true;}
  if(dirty&&!busy){dirty=false;try{render();}catch(e){console.error(e);}}
  requestAnimationFrame(tick);}
function setPlaying(v){playing=v;const b=$('#play');b.textContent=v?'Pause':'Play';b.setAttribute('aria-label',v?'Pause':'Play');dirty=true;}
$('#play').onclick=()=>setPlaying(!playing);
$('#scrub').addEventListener('input',()=>{setPlaying(false);const P=planNow();clock=$('#scrub').value/1000*P.L;dirty=true;});
function onSet(k){if(['cSize','cW','cH'].includes(k))fitCanvas();if(current&&LOOK.includes(k)&&!edited){edited=true;LS.set('presetEdited',true);}if(['TF','LF','GF','TS','LS','GS','pairs','kern'].includes(k))E.resetMeasure();}
function appRefresh(){const P=planNow();$('#loopChip').textContent=`${P.L.toFixed(1)} s loop`;$('#loopChip').title=`The loop lasts ${P.L.toFixed(2)} seconds, then starts again exactly where it began`;
  $('#countChip').textContent=items.length?(items.length===1?'1 shape':`${items.length} shapes`):'No media yet';
  const pn=$('#pcapName');pn.textContent=presetName();}

/* ---------------- cards ---------------- */
Object.assign(TIPS,{
  cSize:'The size of what comes out. Presets keep to it – they scale to fit.',bg:'The colour behind everything',fps:'Frames a second in the MP4',
  layout:'One: a shape at a time. Row and Column: a line of shapes. Grid: rows of them.',ratio:'The shape each piece of media sits in. It’s cropped to fill it, or fitted inside.',
  size:'How big the shapes are: 100% fills the canvas (One), its height (Row) or its width (Column, Grid)',gap:'Space between shapes',radius:'Rounded corners on every shape',
  fit:'Fill crops the media to the shape; Fit shows all of it, on the shape’s colour',shapeBg:'Shows behind media that doesn’t fill its shape',
  hold:'How long each shape rests before the next move',dur:'How long each move takes',spsh:'How long it takes to drift by one shape – sets the speed',
  feel:'Glide eases in and out. Inertia flicks and coasts to a stop. Spring goes a touch past and settles.',
  after:'After the last shape: carry straight on round, or pull back to show every shape in a grid, then come back in to the first',
  gCols:'Columns in the grid you pull back to',gSize:'How much of the canvas the grid fills when it’s furthest out',gHold:'How long the whole range stays in view',
  capWhere:'Under or above each shape, on it, or fixed on the canvas for the shape that’s showing',capReveal:'How each caption arrives',
  pairs:'Your own kerning for pairs of letters, in thousandths of the size – “AV -40, To -30”',accent:'Words between *stars* in a caption take this colour',kern:'Use the kerning built into the font',
  capSpace:'The space between a shape and its caption',capGapL:'Space between the title, line and tags'});
/* Media */
const openRows=new Set();let mediaBox;
{const b=card('media','Media');mediaBox=el('div','media-list');b.append(mediaBox);
  const r=el('div','ctl btn-row'),add=el('button','pill','+ Add images or video');add.type='button';add.onclick=()=>$('#mediafile').click();r.append(add);
  const clr=el('button','pill small','Clear all');clr.type='button';clr.onclick=()=>{if(!items.length)return;for(const it of items.slice())removeItem(it.id);toast('Cleared');};r.append(clr);b.append(r);
  addHint(b,'Drag a row to change the order. Video plays from its start point as its shape arrives.',()=>items.length>1);
  SUMMARY.media=()=>!items.length?'No media yet':`${items.length} · `+(()=>{const v=items.filter(i=>i.kind==='video').length,i=items.length-v;return [v?`${v} video`:'',i?`${i} image${i>1?'s':''}`:''].filter(Boolean).join(', ');})();}
function thumbOf(it){const c=el('canvas');c.width=88;c.height=64;const x=c.getContext('2d');x.fillStyle='#ddd';x.fillRect(0,0,88,64);
  try{if(it.src&&(it.kind!=='video'||it.src.readyState>=2)){const s=Math.max(88/it.w,64/it.h);x.drawImage(it.src,(88-it.w*s)/2,(64-it.h*s)/2,it.w*s,it.h*s);}}catch(e){}return c;}
let dragId=null;
function paintMedia(){
  mediaBox.textContent='';
  if(!items.length){mediaBox.append(el('div','media-empty','Drop images or video here, or anywhere on the page'));return;}
  items.forEach((it,i)=>{
    const row=el('div','slot'),top=el('div','slot-top'),th=el('span','mthumb'),main=el('div','slot-main'),nm=el('div','slot-name',it.title?it.title.split('\n')[0].replace(/[*{}]|#[0-9a-f]{3,8}:/gi,''):it.name),meta=el('div','slot-meta');
    th.append(thumbOf(it));meta.textContent=(it.kind==='video'?`Video · ${(+it.dur||0).toFixed(1)} s`+(it.fixed?' · range put right':''):`Image · ${it.w} × ${it.h}`)+(it.title?` · ${it.name}`:'');if(it.fixed)meta.title='Its stream said full range while the file said video range – Segue made them agree, so the colours come out as they should';
    main.append(nm,meta);main.setAttribute('role','button');main.tabIndex=0;main.setAttribute('aria-expanded',openRows.has(it.id));main.setAttribute('aria-label',`${i+1}. ${it.name} – details`);
    const tog=()=>{openRows.has(it.id)?openRows.delete(it.id):openRows.add(it.id);paintMedia();};main.onclick=tog;main.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tog();}};
    const rm=el('button','pill small icon');rm.type='button';rm.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';rm.dataset.tip='Remove';rm.setAttribute('aria-label','Remove '+it.name);rm.onclick=()=>removeItem(it.id);
    top.append(th,main,rm);row.append(top);
    row.draggable=true;row.ondragstart=e=>{dragId=it.id;row.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',it.id);};
    row.ondragend=()=>{dragId=null;row.classList.remove('dragging');};
    row.ondragover=e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();row.classList.add('over');};row.ondragleave=()=>row.classList.remove('over');
    row.ondrop=e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();row.classList.remove('over');moveItem(dragId,i);};
    if(openRows.has(it.id))row.append(itemDetail(it,i));
    mediaBox.append(row);});}
function itemDetail(it,i){const det=el('div','slot-det');
  const txt=(label,key,multi,ph)=>{const w=el('div','ctl txt'),hd=el('div','ctl-head'),lb=el('label',null,label),inp=el(multi?'textarea':'input');if(!multi)inp.type='text';else inp.rows=2;
    inp.id=`i_${key}_${it.id}`;lb.htmlFor=inp.id;inp.value=it[key]||'';inp.placeholder=ph||'';inp.spellcheck=false;
    inp.oninput=()=>{it[key]=inp.value;E.resetMeasure();dirty=true;saveItems();};inp.onchange=()=>{paintMediaKeepFocus();refreshAll();};hd.append(lb);w.append(hd,inp);det.append(w);};
  txt('Title','title',true,'A title – Enter for a new line');txt('Line','line',true,'A line under it');txt('Tags','tags',false,'Tags, split with commas');
  if(it.kind==='video'){const w=el('div','ctl'),hd=el('div','ctl-head'),lb=el('label',null,'Start at'),val=el('span','val'),inp=el('input');inp.type='range';inp.min=0;inp.max=Math.max(.1,+it.dur||1);inp.step=.04;inp.value=+it.start||0;
    inp.id='i_start_'+it.id;lb.htmlFor=inp.id;val.textContent=(+it.start||0).toFixed(2)+' s';
    inp.oninput=()=>{it.start=+inp.value;val.textContent=it.start.toFixed(2)+' s';saveItems();if(!playing)dirty=true;};hd.append(lb,val);w.append(hd,inp);det.append(w);
    const tr=el('div','toggle-row'),tb=el('button','toggle');tb.type='button';tb.setAttribute('role','switch');tb.setAttribute('aria-checked',!!it.levels);tb.setAttribute('aria-label','Lift washed-out colours');tb.append(el('span','box'),el('span',null,'Lift washed-out colours'));
    tb.onclick=()=>{it.levels=!it.levels;tb.setAttribute('aria-checked',it.levels);saveItems();dirty=true;};tr.append(tb);const q=el('button','q','?');q.type='button';q.dataset.tip='For video whose greys look lifted and colours dull – it says it’s full range when it isn’t (Tempo’s promo MP4s up to 0.11.1). Reads it as video range.';q.setAttribute('aria-label','Lift washed-out colours: '+q.dataset.tip);tr.append(q);det.append(tr);}
  if(S.layout==='one'){const w=el('div','ctl sel'),hd=el('div','ctl-head'),lb=el('label',null,'Arrives by'),s=el('select');s.id='i_arrive_'+it.id;lb.htmlFor=s.id;
    for(const [v,t] of [['default','The move set in Motion'],['slide','Slide'],['stack','Stack'],['fade','Fade'],['zoom','Zoom'],['cut','Cut']]){const o=el('option',null,t);o.value=v;s.append(o);}
    s.value=it.arrive||'default';s.onchange=()=>{it.arrive=s.value;saveItems();dirty=true;refreshAll();};hd.append(lb);w.append(hd,s);det.append(w);}
  const r=el('div','btn-row pairs'),up=el('button','pill small','Move up'),dn=el('button','pill small','Move down');up.type=dn.type='button';up.disabled=i===0;dn.disabled=i===items.length-1;
  up.onclick=()=>moveItem(it.id,i-1);dn.onclick=()=>moveItem(it.id,i+1);r.append(up,dn);det.append(r);
  return det;}
function paintMediaKeepFocus(){const a=document.activeElement,id=a&&a.id;paintMedia();if(id){const n=document.getElementById(id);if(n)n.focus();}}
/* Canvas */
{const b=card('canvas','Canvas');
  build(b,[{t:'seg',k:'cSize',label:'Size',opts:[['4:5','4:5'],['9:16','9:16'],['1:1','1:1'],['16:9','16:9'],['4:3','4:3'],['custom','Custom']]},
    {t:'nums',keys:['cW','cH'],names:['W','H'],label:'Pixels',min:64,max:4096,show:s=>s.cSize==='custom'},
    {t:'colour',k:'bg',label:'Background'},
    {t:'seg',k:'fps',label:'Frame rate',opts:[[24,'24'],[25,'25'],[30,'30'],[60,'60']]}]);
  SUMMARY.canvas=s=>{const [W,H]=E.canvasSize(s);return `${W} × ${H} · ${s.fps} fps`;};}
/* Shapes */
{const b=card('shapes','Shapes');
  build(b,[{t:'seg',k:'layout',label:'Layout',opts:[['one','One','A shape at a time'],['row','Row','A line of shapes across'],['column','Column','A line of shapes down'],['grid','Grid','Rows of shapes']]},
    {t:'select',k:'ratio',label:'Shape',opts:[['media','The media’s own'],['16:10','16:10 – laptop'],['16:9','16:9 – widescreen'],['4:3','4:3'],['3:2','3:2'],['1:1','Square'],['4:5','4:5 – portrait post'],['3:4','3:4'],['2:3','2:3'],['9:16','9:16 – story'],['9:19.5','9:19.5 – phone'],['a4p','A4 portrait'],['a4l','A4 landscape'],['custom','Custom']]},
    {t:'nums',keys:['rW','rH'],names:['W','H'],label:'Shape ratio',min:.1,max:100,step:.1,sep:':',show:s=>s.ratio==='custom'},
    {t:'range',k:'size',label:'Size',min:10,max:100,step:.5,unit:'%',show:s=>s.layout!=='grid'},
    {t:'range',k:'cols',label:'Columns',min:1,max:8,step:1,show:s=>s.layout==='grid'},
    {t:'range',k:'size',id:'gsize',label:'Width',min:10,max:100,step:.5,unit:'%',show:s=>s.layout==='grid',tip:'How much of the canvas’s width the grid takes'},
    {t:'range',k:'gap',label:'Gap',min:0,max:240,step:1,unit:' px',show:s=>s.layout!=='one'},
    {t:'range',k:'radius',label:'Corners',min:0,max:120,step:1,unit:' px'},
    {t:'seg',k:'fit',label:'Media',opts:[['fill','Fill the shape'],['fit','Fit inside']]},
    {t:'colour',k:'shapeBg',label:'Behind the media'}]);
  const f=fold(b,'edge','Edge and position',null,true);
  build(f,[{t:'toggle',k:'edge',label:'Edge'},{t:'colour',k:'edgeC',label:'Edge colour',show:s=>s.edge},{t:'range',k:'edgeW',label:'Edge width',min:.5,max:12,step:.5,unit:' px',show:s=>s.edge},
    {t:'range',k:'nudgeX',label:'Across',min:-600,max:600,step:1,unit:' px',tip:'Move every shape left or right'},{t:'range',k:'nudgeY',label:'Up and down',min:-600,max:600,step:1,unit:' px',tip:'Move every shape up or down'}]);
  SUMMARY.shapes=s=>[optLabel([['one','One'],['row','Row'],['column','Column'],['grid','Grid']],s.layout),s.ratio==='custom'?`${s.rW}:${s.rH}`:s.ratio==='media'?'Media’s own':({a4p:'A4 portrait',a4l:'A4 landscape'}[s.ratio]||s.ratio),s.radius?`${s.radius} px corners`:'Square corners'].join(' · ');}
/* Motion */
const MOVES_ONE=[['slide','Slide','The next one pushes this one out'],['stack','Stack','The next one slides in over this one'],['fade','Fade'],['zoom','Zoom','This one grows away as the next fades up'],['cut','Cut'],['still','Still','No moves – the video plays']];
const MOVES_TRACK=[['step','Step','Move a shape at a time, then rest'],['drift','Drift','Keep moving, never stopping'],['still','Still','No moves – the video plays']];
const mv=s=>E.moveOf(s),stepping=s=>mv(s)!=='drift'&&mv(s)!=='still';
{const b=card('motion','Motion');
  build(b,[{t:'seg',k:'oneMove',label:'Move',opts:MOVES_ONE,show:s=>s.layout==='one'},
    {t:'seg',k:'trackMove',label:'Move',opts:MOVES_TRACK,show:s=>s.layout!=='one',group:'motion'},
    {t:'seg',k:'dir',label:'Direction',optsFn:()=>S.layout==='row'?[['left','Left'],['right','Right']]:(S.layout==='column'||S.layout==='grid')?[['up','Up'],['down','Down']]:[['left','Left'],['right','Right'],['up','Up'],['down','Down']],
      show:s=>mv(s)!=='still'&&!(s.layout==='one'&&['fade','zoom','cut'].includes(s.oneMove))},
    {t:'seg',k:'feel',label:'Feel',opts:[['glide','Glide'],['inertia','Inertia'],['spring','Spring'],['linear','Linear']],show:s=>stepping(s)&&!(s.layout==='one'&&s.oneMove==='cut')},
    {t:'range',k:'hold',label:'Rest',min:0,max:6,step:.05,unit:' s',show:stepping},
    {t:'range',k:'dur',label:'Move',min:.1,max:3,step:.05,unit:' s',show:s=>stepping(s)&&!(s.layout==='one'&&s.oneMove==='cut')},
    {t:'range',k:'spsh',label:'Each shape',min:.5,max:12,step:.05,unit:' s',show:s=>mv(s)==='drift'},
    {t:'range',k:'still',label:'Length',min:1,max:60,step:.5,unit:' s',show:s=>mv(s)==='still'},
    {t:'seg',k:'after',label:'After the last',opts:[['carry','Carry on round'],['pull','Pull back to them all']],show:s=>stepping(s)&&s.layout!=='grid'}]);
  const f=fold(b,'pull','Pull back',s=>stepping(s)&&s.layout!=='grid'&&s.after==='pull');
  build(f,[{t:'range',k:'gCols',label:'Columns',min:1,max:8,step:1,group:'pullfold'},{t:'range',k:'gGap',label:'Gap',min:0,max:240,step:1,unit:' px'},{t:'range',k:'gSize',label:'Fills',min:30,max:100,step:1,unit:'%'},
    {t:'range',k:'zOut',label:'Out',min:.2,max:4,step:.05,unit:' s',tip:'How long the pull back takes'},{t:'range',k:'gHold',label:'All in view',min:0,max:8,step:.05,unit:' s'},{t:'range',k:'zIn',label:'In',min:.2,max:4,step:.05,unit:' s',tip:'How long it takes to come back in to the first'},
    {t:'seg',k:'zFeel',label:'Feel',opts:[['glide','Glide'],['inertia','Inertia'],['spring','Spring'],['linear','Linear']]}]);
  SUMMARY.motion=s=>{const P=planNow(),m=s.layout==='one'?optLabel(MOVES_ONE,s.oneMove):optLabel(MOVES_TRACK,s.trackMove);return [m,stepping(s)?optLabel([['glide','Glide'],['inertia','Inertia'],['spring','Spring'],['linear','Linear']],s.feel):'',`${P.L.toFixed(1)} s loop`].filter(Boolean).join(' · ');};}
/* Captions */
{const b=card('captions','Captions');
  build(b,[{t:'toggle',k:'capOn',label:'Captions'},
    {t:'seg',k:'capWhere',label:'Where',opts:[['under','Under'],['above','Above'],['over','On it'],['fixed','Fixed']],show:s=>s.capOn},
    {t:'seg',k:'capAlign',label:'Align',opts:[['left','Left'],['centre','Centre'],['right','Right']],show:s=>s.capOn},
    {t:'seg',k:'capV',label:'Sits',opts:[['top','Top'],['bottom','Bottom']],show:s=>s.capOn&&s.capWhere==='fixed'},
    {t:'range',k:'capMargin',label:'Margin',min:0,max:300,step:1,unit:' px',show:s=>s.capOn&&s.capWhere==='fixed'},
    {t:'range',k:'capSpace',label:'Space',min:0,max:200,step:1,unit:' px',show:s=>s.capOn&&s.capWhere!=='fixed'},
    {t:'seg',k:'capReveal',label:'Arrives',opts:[['none','As it is'],['fade','Fade'],['rise','Rise'],['scramble','Scramble']],show:s=>s.capOn},
    {t:'range',k:'capRevealDur',label:'Over',min:.1,max:3,step:.05,unit:' s',show:s=>s.capOn&&s.capReveal!=='none'}]);
  addHint(b,'Write each caption in Media – open a row.',s=>s.capOn&&!items.some(i=>i.title||i.line||i.tags));
  const role=(r,title,extra)=>{const f=fold(b,'cap'+r,title,s=>s.capOn,true);
    build(f,[{t:'select',k:r+'F',label:'Font',optsFn:fontOpts},{t:'range',k:r+'S',label:'Size',min:6,max:240,step:.5,unit:' px'},
      {t:'range',k:r+'Tr',label:'Tracking',min:-150,max:400,step:1,tip:'Space between letters, in thousandths of the size'},{t:'range',k:r+'Ld',label:'Leading',min:.6,max:2.5,step:.01,unit:'×'},
      {t:'colour',k:r+'C',label:'Colour'},{t:'seg',k:r+'Case',label:'Case',opts:[['as','As typed'],['upper','Upper'],['lower','Lower']]}].concat(extra||[]));};
  role('T','Title');role('L','Line');role('G','Tags',[{t:'seg',k:'gLook',label:'Look',opts:[['outline','Outline'],['fill','Fill'],['plain','Plain']]},{t:'colour',k:'gFill',label:'Fill',show:s=>s.gLook==='fill'}]);
  const k=fold(b,'capK','Colour, kerning and spacing',s=>s.capOn,true);
  build(k,[{t:'colour',k:'accent',label:'Accent'}]);
  addHint(k,'In a caption, *stars* round words colour them with the accent; {#FF5A00:words} gives them any colour.');
  build(k,[{t:'toggle',k:'kern',label:'Font kerning'},{t:'text',k:'pairs',label:'Kerning pairs',placeholder:'AV -40, To -30'},
    {t:'range',k:'capGapL',label:'Between lines',min:0,max:120,step:1,unit:' px'},
    {t:'range',k:'capX',label:'Across',min:-400,max:400,step:1,unit:' px',tip:'Move captions left or right'},{t:'range',k:'capY',label:'Up and down',min:-400,max:400,step:1,unit:' px',tip:'Move captions up or down'}]);
  SUMMARY.captions=s=>s.capOn?[optLabel([['under','Under'],['above','Above'],['over','On it'],['fixed','Fixed']],s.capWhere),(FONTS[s.TF]||FONTS.default).label,optLabel([['none','As it is'],['fade','Fade'],['rise','Rise'],['scramble','Scramble']],s.capReveal)].join(' · '):'Off';}
/* Fonts */
let fontBox;
{const b=card('fonts','Fonts');fontBox=el('div','font-list');b.append(fontBox);
  const r=el('div','ctl btn-row'),add=el('button','pill','+ Add font');add.type='button';add.onclick=()=>$('#fontfile').click();r.append(add);b.append(r);
  addHint(b,'Fonts you add stay on this computer, in this browser.');
  SUMMARY.fonts=()=>{const n=ownFontIds().length;return n?`${n} of your own`:'Built in';};}
function paintFonts(){fontBox.textContent='';
  for(const [id,f] of Object.entries(FONTS)){if(!f.own&&!['aktiv','inter8','plex','helv'].includes(id))continue;
    const row=el('div','slot font-row'),top=el('div','slot-top'),main=el('div','slot-main'),nm=el('div','slot-name sample',f.label),meta=el('div','slot-meta',f.own?f.file:'Built in');
    nm.style.fontFamily=f.family;nm.style.fontWeight=f.weight;main.append(nm,meta);top.append(main);
    if(f.own){const rm=el('button','pill small icon');rm.type='button';rm.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';rm.dataset.tip='Remove';rm.setAttribute('aria-label','Remove '+f.label);rm.onclick=()=>removeFont(id);top.append(rm);}
    row.append(top);fontBox.append(row);}}

/* ---------------- presets ---------------- */
const BUILTIN=[
  {name:'Card stack',tip:'A column of cards with captions, a flick at a time, pulling back to show them all',s:{layout:'column',ratio:'16:10',size:86,gap:64,radius:12,trackMove:'step',dir:'up',feel:'inertia',hold:1.2,dur:.7,after:'pull',gCols:3,gGap:40,gSize:88,zOut:1.1,gHold:1.6,zIn:1.1,capOn:true,capWhere:'under',capReveal:'scramble'}},
  {name:'Carousel',tip:'Tall cards drifting along in a row, without stopping',s:{layout:'row',ratio:'custom',rW:9,rH:20,size:59,gap:49,radius:14,trackMove:'drift',dir:'left',spsh:2.67,capOn:false,bg:'#1D1C23',shapeBg:'#2B2A31'}},
  {name:'Deck',tip:'Slides one at a time, flicked across',s:{layout:'one',ratio:'16:9',size:88,radius:8,oneMove:'slide',dir:'left',feel:'inertia',hold:1.4,dur:.8,after:'carry',capOn:false,bg:'#ECECE9'}},
  {name:'Stack',tip:'Each one springs up over the last',s:{layout:'one',ratio:'4:5',size:82,radius:16,oneMove:'stack',dir:'up',feel:'spring',hold:1.2,dur:.75,after:'carry',capOn:false,bg:'#141414',shapeBg:'#222222'}},
  {name:'Fade',tip:'One at a time, fading, with a caption fixed in the corner',s:{layout:'one',ratio:'4:5',size:78,radius:6,oneMove:'fade',hold:1.6,dur:.6,after:'carry',capOn:true,capWhere:'fixed',capV:'bottom',capAlign:'left',capMargin:64,capReveal:'rise',TF:'inter6',TS:40,TTr:-10,TCase:'as'}},
  {name:'Grid',tip:'Rows of shapes stepping up a row at a time',s:{layout:'grid',cols:3,size:92,gap:24,radius:8,ratio:'4:5',trackMove:'step',dir:'up',feel:'glide',hold:1,dur:.9,capOn:false}}];
let mine=LS.get('presets')||[],current=LS.get('preset')||'',edited=!!LS.get('presetEdited');
const presetName=()=>current?current+(edited?' – changed':''):'';
const unit=()=>{const [W,H]=size();return E.unitOf(W,H);};
function lookNow(){const u=unit(),o={};for(const k of LOOK)o[k]=PX.includes(k)?+(S[k]/u).toFixed(2):S[k];return o;}
function applyPreset(p){const u=unit();for(const k of LOOK){const v=k in p.s?p.s[k]:D[k];S[k]=PX.includes(k)&&typeof v==='number'?+(v*u).toFixed(2):v;}
  current=p.name;edited=false;LS.set('preset',current);LS.set('presetEdited',false);saveSettings();E.resetMeasure();clock=0;dirty=true;refreshAll();paintMedia();toast(`${p.name}`);}
let presetBox,saveIn;
{const b=card('presets','Presets');presetBox=el('div','preset-list');b.append(presetBox);
  addHint(b,'A preset sets the look and the motion. Your media, captions and canvas size stay.');
  const r=el('div','ctl save-row');saveIn=el('input');saveIn.type='text';saveIn.placeholder='Name';saveIn.setAttribute('aria-label','Preset name');const sv=el('button','pill small','Save');sv.type='button';
  sv.onclick=()=>{const n=saveIn.value.trim()||`Preset ${mine.length+1}`;mine=mine.filter(p=>p.name!==n);mine.push({name:n,s:lookNow()});LS.set('presets',mine);current=n;edited=false;LS.set('preset',n);LS.set('presetEdited',false);saveIn.value='';paintPresets();refreshAll();toast(`Saved ${n}`);};
  r.append(saveIn,sv);b.append(el('div','sub-head','Save these settings'),r);
  const r2=el('div','btn-row pairs'),dl=el('button','pill small','Download presets'),ld=el('button','pill small','Load presets');dl.type=ld.type='button';
  dl.onclick=()=>saveFile('segue-presets.json',new Blob([JSON.stringify({segue:1,presets:mine},null,1)],{type:'application/json'}));ld.onclick=()=>$('#presetfile').click();r2.append(dl,ld);b.append(r2);
  cardToSheet(b,'presets');}
function paintPresets(){presetBox.textContent='';
  const row=(p,own)=>{const r=el('div','slot preset-row'),top=el('div','slot-top'),main=el('div','slot-main'),nm=el('div','slot-name',p.name),meta=el('div','slot-meta',own?'Yours':p.tip||'Built in');
    main.append(nm,meta);main.setAttribute('role','button');main.tabIndex=0;main.setAttribute('aria-label','Use '+p.name);main.onclick=()=>{applyPreset(p);paintPresets();};main.onkeydown=e=>{if(e.key==='Enter'){applyPreset(p);paintPresets();}};
    top.append(main);if(current===p.name){const t=el('span','tag','In use');top.append(t);}
    if(own){const rm=el('button','pill small icon');rm.type='button';rm.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';rm.dataset.tip='Delete';rm.setAttribute('aria-label','Delete '+p.name);
      rm.onclick=e=>{e.stopPropagation();mine=mine.filter(x=>x!==p);LS.set('presets',mine);paintPresets();};top.append(rm);}
    r.append(top);presetBox.append(r);};
  presetBox.append(el('div','sub-head','Built in'));for(const p of BUILTIN)row(p,false);
  if(mine.length){presetBox.append(el('div','sub-head','Yours'));for(const p of mine)row(p,true);}}
$('#presetfile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const j=JSON.parse(await f.text()),list=(j.presets||[]).filter(p=>p&&p.name&&p.s);let n=0;for(const p of list){p.s=sanitise(p.s);mine=mine.filter(x=>x.name!==p.name);mine.push({name:String(p.name).slice(0,60),s:p.s});n++;}
    LS.set('presets',mine);paintPresets();toast(n===1?'Loaded 1 preset':`Loaded ${n} presets`);}catch(err){toast('That isn’t a Segue presets file');}};
