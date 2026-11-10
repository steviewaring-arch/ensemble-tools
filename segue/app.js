/* Segue – the app. Media in, framed loops out: the canvas, the shapes the media sits in,
   how they move and loop, captions, fonts and presets. The engine (segue/engine.js) draws;
   this file owns the settings, the media and the interface. */
const E=SegueEngine;
/* ---------------- settings ---------------- */
const D={
  cSize:'4:5',cW:1080,cH:1350,bg:'#F5F5F3',bgFit:'fill',bgImgA:100,fps:30,
  layout:'column',ratio:'16:10',rW:16,rH:10,size:86,cols:3,gap:64,radius:12,fit:'fill',shapeBg:'#E6E6E3',edge:false,edgeC:'#111111',edgeW:2,nudgeX:0,nudgeY:0,
  mat:0,matC:'#FFFFFF',matR:0,
  oneFit:'shape',ownScale:'fit',kb:'none',kbAmt:6,inMove:'none',inAmt:5,
  oneMove:'slide',trackMove:'step',dir:'up',feel:'snap',hold:1.2,dur:.7,spsh:2.5,still:8,lag:0,creep:0,after:'pull',gCols:3,gGap:40,gSize:88,zOut:1.1,gHold:1.6,zIn:1.1,zFeel:'soft',gStag:40,gFloat:30,
  pile:false,pileKeep:0,pileScatter:0,pileEnd:'cover',pileBack:2,
  colDir:'alt',colSpeed:'same',colLag:.4,colOff:50,
  sd0:1,sd1:-1,sd2:1,sd3:-1,sd4:1,sd5:-1,sd6:1,sd7:-1,ss0:1,ss1:1,ss2:1,ss3:1,ss4:1,ss5:1,ss6:1,ss7:1,
  fCols:3,fRows:1,fMove:'push',fLag:.15,
  wCols:3,wRows:2,wPath:'across',wStep:1,wOff:0,
  flSize:34,depth:60,spread:80,seed:0,
  capOn:true,capWhere:'under',capAlign:'left',capV:'bottom',capMargin:64,capSpace:28,capX:0,capY:0,capGapL:10,capReveal:'scramble',capRevealDur:.8,
  accent:'#EA2631',kern:true,pairs:'',gLook:'outline',gFill:'#E4E4E0',
  TF:'inter8',TS:54,TTr:-20,TLd:1.0,TC:'#111111',TCase:'upper',
  LF:'plex',LS:17,LTr:0,LLd:1.4,LC:'#6B6A66',LCase:'as',
  GF:'plex',GS:13,GTr:20,GLd:1.2,GC:'#111111',GCase:'as',
  ovOn:false,ovKind:'text',ovText:'',OF:'inter8',OS:120,OTr:-20,OLd:.95,OC:'#111111',OCase:'as',ovPos:'mc',ovM:64,ovX:0,ovY:0,ovBlend:'normal',ovA:100,ovW:40,ovZ:'top',
  name:'Segue',xFormat:'mp4',xLoops:1,xGifScale:.5,xGifFps:20,xDither:false,xCrisp:true,xQ:'high',xScale:1,
  guides:false,guM:64,guN:6,guSnap:true};
/* the look: what a preset carries. Size, frame rate, the file name and what's over the top
   (it's content, like the captions) stay as they are. */
const NOT_LOOK=['cSize','cW','cH','fps','name','xFormat','xLoops','xGifScale','xGifFps','xDither','xCrisp','xQ','ovOn','ovKind','ovText','guides','guM','guN','guSnap'];
const LOOK=Object.keys(D).filter(k=>!NOT_LOOK.includes(k));
/* px values: presets keep them for a 1080 short side and scale them to the canvas they land on */
const PX=['gap','radius','edgeW','nudgeX','nudgeY','gGap','capSpace','capX','capY','capMargin','capGapL','TS','LS','GS','mat','matR','OS','ovM','ovX','ovY'];
function sanitise(o){const r={};if(!o||typeof o!=='object')return r;for(const k in D)if(k in o&&typeof o[k]===typeof D[k])r[k]=o[k];return r;}
function loadSettings(){return Object.assign({},D,sanitise(LS.get('settings')));}
function saveSettings(){LS.set('settings',S);if(typeof projTouch==='function')projTouch();}
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
const DB=(()=>{let p=null;const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('segue',2);r.onupgradeneeded=()=>{const d=r.result;for(const n of ['media','fonts','projects'])if(!d.objectStoreNames.contains(n))d.createObjectStore(n);};r.onsuccess=()=>{const d=r.result;d.onversionchange=()=>{d.close();p=null;};res(d);};r.onerror=()=>rej(r.error);r.onblocked=()=>toast('Segue is open in another tab – close it to finish updating',true);}));
  const tx=async(st,mode,fn)=>{const d=await open();return new Promise((res,rej)=>{const t=d.transaction(st,mode),s=t.objectStore(st),r=fn(s);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});};
  return{put:(st,k,v)=>tx(st,'readwrite',s=>s.put(v,k)),get:(st,k)=>tx(st,'readonly',s=>s.get(k)),del:(st,k)=>tx(st,'readwrite',s=>s.delete(k)),
    all:st=>tx(st,'readonly',s=>s.getAll()),keys:st=>tx(st,'readonly',s=>s.getAllKeys())};})();
/* ---------------- media ---------------- */
let items=[];
const META=['id','ref','name','kind','w','h','dur','start','end','title','line','tags','arrive','levels','fixed','hold','moves','px','py','zm','fz','ox','oy','join','place','lfit','blend','opa','lin','lafter','lover'];
function saveItems(){LS.set('items',items.map(it=>Object.fromEntries(META.map(k=>[k,it[k]]))));itemSteps();if(typeof projTouch==='function')projTouch();}
/* undo for a piece's own settings (0.9): each save is compared with the one before, and what changed becomes a step –
   the same piece and setting within 0.8 s, or in one drag, join up. Adding, removing and reordering have their own. */
const ITEM_KEYS=META.filter(k=>!['id','ref','name','kind','w','h','dur','fixed'].includes(k));
const ITEM_LABEL={blend:'Blend',opa:'Opacity',px:'Crop',py:'Crop',zm:'Size',fz:'Size',ox:'Position',oy:'Position',start:'Start at',end:'End at',hold:'On screen',arrive:'Transition',moves:'Movement',
  join:'Layer',place:'Order',lfit:'Fit',title:'Title',line:'Line',tags:'Tags',levels:'Lift washed-out colours',lin:'Arrives',lafter:'After',lover:'Over'};
let itemSnap=null,itemReplay=false,itemFold=false;   /* itemFold: what follows is part of the step just taken */
const snapItems=()=>new Map(items.map(it=>[it.id,Object.fromEntries(ITEM_KEYS.map(k=>[k,it[k]]))]));
const sameV=(a,b)=>{const na=a==null||a==='',nb=b==null||b==='';if(na||nb)return na&&nb;if(typeof a!==typeof b&&!isNaN(+a)&&!isNaN(+b))return same(+a,+b);return same(a,b);};
function itemSteps(){const next=snapItems();
  if(itemSnap&&!itemReplay){const ch=[];for(const [id,o] of next){const p=itemSnap.get(id);if(!p)continue;for(const k of ITEM_KEYS)if(!sameV(p[k],o[k]))ch.push([id,k,p[k],o[k]]);}if(ch.length)itemStep(ch);}
  itemSnap=next;}
function itemStep(ch){const now=performance.now(),top=UNDO[UNDO.length-1],sig=ch.map(c=>c[0]+'.'+c[1]).sort().join();
  if(itemFold&&top&&top.items){for(const c of ch){const q=top.items.find(x=>x[0]===c[0]&&x[1]===c[1]);if(q)q[3]=c[3];else top.items.push(c);}top.sig=top.items.map(c=>c[0]+'.'+c[1]).sort().join();top.t=now;return;}
  if(top&&top.items&&top.sig===sig&&((gesture&&top.g===gesture)||now-top.t<800)){for(const c of ch){const q=top.items.find(x=>x[0]===c[0]&&x[1]===c[1]);if(q)q[3]=c[3];}top.t=now;
    if(top.items.every(x=>sameV(x[2],x[3])))UNDO.pop();return;}
  const it=items.find(x=>x.id===ch[0][0]),label=`${ITEM_LABEL[ch[0][1]]||'Change'}${it?' – '+it.name:''}`;
  REDO.length=0;UNDO.push({items:ch,sig,label,t:now,g:gesture,fn:w=>putItems(ch,w)});if(UNDO.length>300)UNDO.shift();}
function putItems(ch,w){itemReplay=true;try{for(const [id,k,p,n] of (w?ch:ch.slice().reverse())){const it=items.find(x=>x.id===id);if(!it)continue;const v=w?n:p;if(v===undefined)delete it[k];else it[k]=v;}saveItems();}
  finally{itemReplay=false;}E.resetMeasure();dirty=true;paintMedia();refreshAll();}
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
  for(const m of list){try{const blob=await DB.get('media',m.ref||m.id);if(!blob){lost++;continue;}items.push(await mediaFrom(blob,Object.assign({},m)));}catch(e){lost++;}}
  if(lost)toast(lost===1?'One file couldn’t be found again – add it back':`${lost} files couldn’t be found again – add them back`);
  saveItems();mediaChanged();}
async function restoreFonts(){for(const id of (LS.get('fonts')||[])){try{const r=await DB.get('fonts',id);if(r)await addFont(new File([r.data],r.name,{type:r.type||''}),id,false);}catch(e){}}refreshAll();}
function removeItem(id){for(const k of [...crCache.keys()])if(k.startsWith(id+'|'))crCache.delete(k);const i=items.findIndex(x=>x.id===id);if(i<0)return;const it=items[i];if(it.el){it.el.pause();URL.revokeObjectURL(it.el.src);}items.splice(i,1);openRows.delete(id);if(selId===id)selId=null;saveItems();mediaChanged();}
async function removeItems(ids,label){
  const saved=[];for(const id of ids){const i=items.findIndex(x=>x.id===id);if(i<0)continue;let blob=null;try{blob=await DB.get('media',items[i].ref||id);}catch(e){}
    saved.push({i,meta:Object.fromEntries(META.map(k=>[k,items[i][k]])),blob});}
  for(const id of ids)removeItem(id);if(!saved.length)return;
  const back=saved.filter(x=>x.blob);if(!back.length){toast(label);return;}
  pushUndo({label,fn:async w=>{if(w){for(const x of back)removeItem(x.meta.id);return;}
    for(const x of back.slice().sort((a,b)=>a.i-b.i)){try{const it=await mediaFrom(x.blob,Object.assign({},x.meta));items.splice(Math.min(x.i,items.length),0,it);await DB.put('media',x.meta.ref||x.meta.id,x.blob);}catch(e){}}
    saveItems();mediaChanged();}});
  toastUndo(label);}
/* a copy of a piece (0.10): its own settings, the same file. It goes straight after the piece – after a slide's layers,
   so they stay on their slide; a layer's copy is another layer on the same slide. */
const newId=()=>'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function copyName(n){const m=/^(.*?)(?: copy(?: (\d+))?)?(\.[^.]*)?$/.exec(n)||[n,n,'',''],base=m[1],ext=m[3]||'',taken=new Set(items.map(i=>i.name));
  for(let k=1;k<99;k++){const c=`${base} copy${k>1?' '+k:''}${ext}`;if(!taken.has(c))return c;}return base+' copy'+ext;}
async function duplicateItem(id){const i=items.findIndex(x=>x.id===id);if(i<0||busy)return;const it=items[i],ref=it.ref||it.id;let blob=null;try{blob=await DB.get('media',ref);}catch(e){}
  if(!blob){toast('Couldn’t find its file to copy – add it again');return;}
  const meta=Object.fromEntries(META.map(k=>[k,it[k]]));Object.assign(meta,{id:newId(),ref,name:copyName(it.name)});
  let at=i+1;if(!isLayer(it,i))while(at<items.length&&isLayer(items[at],at))at++;
  const put=async()=>{const c=await mediaFrom(blob,Object.assign({},meta));items.splice(Math.min(at,items.length),0,c);openRows.add(c.id);selId=c.id;saveItems();mediaChanged();};
  try{await put();}catch(e){toast(`Couldn’t copy ${it.name}`);return;}
  const label=`Copied ${it.name}`;pushUndo({label,fn:async w=>{if(w)await put();else removeItem(meta.id);}});toastUndo(label);}
function moveItem(id,to){const i=items.findIndex(x=>x.id===id);if(i<0)return;to=clamp(to,0,items.length-1);if(to===i)return;const [it]=items.splice(i,1);items.splice(to,0,it);saveItems();mediaChanged();}
function mediaChanged(){E.resetMeasure();dirty=true;paintMedia();refreshAll();}
/* ---------------- the background and overlay images: one of each, kept like the media ---------------- */
const PICS={bg:null,ov:null};
const picOf=(im,name)=>({src:im,w:im.width||im.naturalWidth,h:im.height||im.naturalHeight,name});
async function setPic(which,file){
  if(!file||!isImage(file)){toast(file?`${file.name} isn’t an image`:'No image');return;}
  try{PICS[which]=picOf(await loadImage(file),file.name);const ref='pic:'+newId();try{await DB.put('media',ref,file);}catch(e){}LS.set('pic:'+which,{name:file.name,ref});projTouch();
    if(which==='ov'){S.ovOn=true;S.ovKind='image';saveSettings();}dirty=true;refreshAll();toast(which==='bg'?'Background image added':'Overlay image added');}
  catch(e){toast(`Couldn’t open ${file.name}`);}}
async function removePic(which){let blob=null;try{const m=LS.get('pic:'+which);blob=await DB.get('media',m&&m.ref||'pic:'+which);}catch(e){}const was=PICS[which],ovOn=S.ovOn,ovKind=S.ovKind;clearPic(which);
  const label=which==='bg'?'Background image removed':'Overlay image removed';if(!blob||!was){toast(label);return;}
  pushUndo({label,fn:async w=>{if(w){clearPic(which);return;}await setPic(which,blob);S.ovOn=ovOn;S.ovKind=ovKind;saveSettings();refreshAll();}});toastUndo(label);}
function clearPic(which){PICS[which]=null;LS.set('pic:'+which,null);projTouch();dirty=true;refreshAll();}
async function restorePics(){for(const w of ['bg','ov']){const m=LS.get('pic:'+w);if(!m)continue;
    try{const b=await DB.get('media',m.ref||'pic:'+w);if(b)PICS[w]=picOf(await loadImage(b),m.name);}catch(e){}}dirty=true;refreshAll();}
/* drawing media into a shape: centred, filling it (cropped) or fitting inside it */
const lvCanvas=document.createElement('canvas'),lvCtx=lvCanvas.getContext('2d',{willReadFrequently:true});
const LV=new Uint8ClampedArray(256).map((_,i)=>Math.round((i-16)*255/219));
function drawMedia(ctx,o,r,mode){const it=o.item,src=it.src;if(!src||!it.w||!it.h)return;if(it.kind==='video'&&src.readyState<2)return;
  /* cropped: its own zoom, and which part shows (−100…100% of what's to spare each way) */
  const crop=mode==='cover'&&!o.whole,z=crop?Math.max(1,(+it.zm||100)/100):1;
  const s=(mode==='cover'?Math.max(r.w/it.w,r.h/it.h):Math.min(r.w/it.w,r.h/it.h))*z,dw=it.w*s,dh=it.h*s,sx=(dw-r.w)/2,sy=(dh-r.h)/2;
  const dx=r.x-sx+(crop?clamp(+it.px||0,-100,100)/100*sx:0),dy=r.y-sy+(crop?clamp(+it.py||0,-100,100)/100*sy:0);
  /* crisp: export (and the paused preview) draw it on the pixel grid, resampled once, properly */
  if(crispNow&&drawCrisp(ctx,src,it,dx,dy,dw,dh))return;
  if(crispNow){const T=ctx.getTransform(),kx=Math.hypot(T.a,T.b),ky=Math.hypot(T.c,T.d),tw=Math.round(dw*kx),th=Math.round(dh*ky);
    if(tw>1&&th>1&&tw<it.w*.95&&th<it.h*.95&&tw*th<=16e6){const c=crispOf(src,it.w,it.h,tw,th,!!it.levels,it.kind==='video'?null:`${it.id}|${tw}|${th}|${+!!it.levels}`);ctx.drawImage(c,0,0,tw,th,dx,dy,dw,dh);return;}}
  if(!it.levels){ctx.drawImage(src,dx,dy,dw,dh);return;}
  /* lift washed-out colours: video that says it's full range but is video range, read as video range */
  const k=ctx.getTransform().a||1,pw=Math.max(1,Math.ceil(dw*k)),ph=Math.max(1,Math.ceil(dh*k));
  if(lvCanvas.width!==pw||lvCanvas.height!==ph){lvCanvas.width=pw;lvCanvas.height=ph;}
  lvCtx.drawImage(src,0,0,pw,ph);const id=lvCtx.getImageData(0,0,pw,ph),d=id.data;for(let j=0;j<d.length;j+=4){d[j]=LV[d[j]];d[j+1]=LV[d[j+1]];d[j+2]=LV[d[j+2]];}
  lvCtx.putImageData(id,0,0);ctx.drawImage(lvCanvas,dx,dy,dw,dh);}
/* Crisp drawing. Measured 5 Nov (0.4.3): fine type in a card kept only 55–70% of a Lanczos
   resample's edge detail, even after 0.4.1's stepped downscale – because the result was then
   drawn at a fractional position (x + 0.6 px), which the browser blurs again, and anything
   enlarged was stretched with a plain bilinear filter. So, unless it's turned or flipped:
   - work out where it lands in real pixels; the same size as its own pixels is copied straight
     onto the grid (snapped by under half a pixel – nothing is resampled);
   - otherwise it's resampled once, with the fraction of a pixel built into that one step:
     halved step by step to within 2× (kept, for stills), then drawn to its exact size and
     position on a canvas lined up with the pixel grid, then sharpened – half strength when
     shrunk, as Photoshop's Bicubic Sharper, a third when enlarged – and copied on 1:1.
   Stills at rest are kept, so a slide that sits still costs nothing after its first frame. */
let crispNow=false;
const CR=[document.createElement('canvas'),document.createElement('canvas'),document.createElement('canvas')],crCache=new Map(),halfCache=new Map(),onGrid=new Map();
function halved(src,it,DW,DH){let cur=src,w=it.w,h=it.h,flip=0,n=0;while(w/2>=DW&&h/2>=DH){w=Math.max(1,Math.round(w/2));h=Math.max(1,Math.round(h/2));n++;}
  if(!n)return src;const key=it.kind==='video'?null:`${it.id}|${n}`;if(key&&halfCache.has(key))return halfCache.get(key);
  w=it.w;h=it.h;for(let i=0;i<n;i++){const t=key&&i===n-1?document.createElement('canvas'):CR[flip];flip^=1;const nw=Math.max(1,Math.round(w/2)),nh=Math.max(1,Math.round(h/2));if(t.width!==nw||t.height!==nh){t.width=nw;t.height=nh;}
    const tx=t.getContext('2d');tx.imageSmoothingEnabled=true;tx.imageSmoothingQuality='high';tx.clearRect(0,0,nw,nh);tx.drawImage(cur,0,0,nw,nh);cur=t;w=nw;h=nh;}
  if(key){halfCache.set(key,cur);if(halfCache.size>24)halfCache.delete(halfCache.keys().next().value);}
  return cur;}
function sharpenOn(d,w,h,amt,levels){const o=new Uint8ClampedArray(d),W4=w*4;
  if(amt>0&&w>4&&h>4){/* unsharp against a 1-2-1 blur, done as two passes; the outer two pixels (part-covered at a fractional edge) are left */
    let opaque=true;for(let y=1;y<h-1&&opaque;y++)for(let j=(y*w+1)*4+3,e=(y*w+w-1)*4;j<e;j+=4)if(d[j]<255){opaque=false;break;}
    const t=new Uint16Array(d.length);
    for(let y=1;y<h-1;y++)for(let i=(y*w+1)*4,e=(y*w+w-1)*4;i<e;i+=4){t[i]=d[i-4]+2*d[i]+d[i+4];t[i+1]=d[i-3]+2*d[i+1]+d[i+5];t[i+2]=d[i-2]+2*d[i+2]+d[i+6];}
    for(let y=2;y<h-2;y++)for(let i=(y*w+2)*4,e=(y*w+w-2)*4;i<e;i+=4){
      if(!opaque&&(d[i+3]<255||d[i-1]<255||d[i+7]<255||d[i-W4+3]<255||d[i+W4+3]<255))continue;
      o[i]=d[i]+amt*(d[i]-(t[i-W4]+2*t[i]+t[i+W4])/16);o[i+1]=d[i+1]+amt*(d[i+1]-(t[i-W4+1]+2*t[i+1]+t[i+W4+1])/16);o[i+2]=d[i+2]+amt*(d[i+2]-(t[i-W4+2]+2*t[i+2]+t[i+W4+2])/16);}}
  if(levels)for(let j=0;j<o.length;j+=4){o[j]=LV[o[j]];o[j+1]=LV[o[j+1]];o[j+2]=LV[o[j+2]];}
  return o;}
function drawCrisp(ctx,src,it,dx,dy,dw,dh){
  const T=ctx.getTransform();if(Math.abs(T.b)>1e-6||Math.abs(T.c)>1e-6||T.a<=0||T.d<=0)return false;
  const X=T.a*dx+T.e,Y=T.d*dy+T.f,DW=dw*T.a,DH=dh*T.d;if(DW<2||DH<2||DW*DH>16e6)return false;
  const one=Math.abs(DW-it.w)<.5&&Math.abs(DH-it.h)<.5,levels=!!it.levels;
  if(one&&!levels){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(src,Math.round(X),Math.round(Y));ctx.restore();return true;}
  const ix=Math.floor(X),iy=Math.floor(Y),fx=one?Math.round(X)-ix:X-ix,fy=one?Math.round(Y)-iy:Y-iy,ew=one?it.w:DW,eh=one?it.h:DH;
  const amt=one?0:(DW<it.w*.95||DH<it.h*.95)?.5:(DW>it.w*1.02||DH>it.h*1.02)?.33:0;
  const ow=Math.ceil(fx+ew),oh=Math.ceil(fy+eh),key=it.kind==='video'?null:`${fx.toFixed(3)}|${fy.toFixed(3)}|${ew.toFixed(2)}|${eh.toFixed(2)}|${+levels}`;
  let g=onGrid.get(it.id);if(!g){g={key:null,c:document.createElement('canvas')};onGrid.set(it.id,g);if(onGrid.size>64)onGrid.delete(onGrid.keys().next().value);}
  if(!key||g.key!==key){const c=g.c;if(c.width!==ow||c.height!==oh){c.width=ow;c.height=oh;}
    const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.clearRect(0,0,ow,oh);
    x.drawImage(one?src:halved(src,it,DW,DH),fx,fy,ew,eh);
    if(amt>0||levels){const id=x.getImageData(0,0,ow,oh);id.data.set(sharpenOn(id.data,ow,oh,amt,levels));x.putImageData(id,0,0);}
    g.key=key;}
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(g.c,ix,iy);ctx.restore();return true;}
/* 0.4.1's crisp scaling, kept for media that's turned: stepped down, sharpened, drawn as it lies */
function crispOf(src,sw,sh,tw,th,levels,key){
  if(key&&crCache.has(key))return crCache.get(key);
  let cur=src,w=sw,h=sh,flip=0;
  while(w/2>=tw&&h/2>=th){const t=CR[flip];flip^=1;const nw=Math.max(1,Math.round(w/2)),nh=Math.max(1,Math.round(h/2));if(t.width!==nw||t.height!==nh){t.width=nw;t.height=nh;}
    const tx=t.getContext('2d');tx.imageSmoothingEnabled=true;tx.imageSmoothingQuality='high';tx.clearRect(0,0,nw,nh);tx.drawImage(cur,0,0,nw,nh);cur=t;w=nw;h=nh;}
  const out=key?document.createElement('canvas'):CR[2];if(out.width!==tw||out.height!==th){out.width=tw;out.height=th;}
  const ox=out.getContext('2d',{willReadFrequently:true});ox.imageSmoothingEnabled=true;ox.imageSmoothingQuality='high';ox.clearRect(0,0,tw,th);ox.drawImage(cur,0,0,tw,th);
  const id=ox.getImageData(0,0,tw,th);id.data.set(sharpenOn(id.data,tw,th,.5,levels));ox.putImageData(id,0,0);
  if(key){crCache.set(key,out);if(crCache.size>48)crCache.delete(crCache.keys().next().value);}
  return out;}
/* ---------------- the preview ---------------- */
const cv=$('#cv'),ctx=cv.getContext('2d');
let playing=true,clock=0,lastT=0,busy=false,cur=null;
const size=()=>E.canvasSize(S);
/* zoom (0.10): Fit, or a set size – screen px for each canvas px (100% is actual size). Bigger than the view, it scrolls;
   Space and drag, or a scroll, moves round it; pinch or ⌘ and scroll zooms where the pointer is. */
let viewZoom=null;
const ZOOMS=[.1,.125,.167,.25,.333,.5,.667,.75,1,1.25,1.5,2,3,4];
function fitScale(){const [W,H]=size(),v=$('#view'),cs=getComputedStyle(v);
  const aw=v.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=v.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);return Math.max(.01,Math.min(aw/W,ah/H));}
const zoomNow=()=>viewZoom==null||$('.app').classList.contains('preview')?fitScale():viewZoom;
function setZoom(z,at){const v=$('#view'),r=cv.getBoundingClientRect(),z0=zoomNow(),fit=fitScale();
  if(z!=null&&(z<=fit*1.001&&z>=fit*.999))z=null;viewZoom=z==null?null:clamp(z,.05,8);
  /* keep the point under the pointer (or the middle) where it is */
  const vr=v.getBoundingClientRect(),px=at?at[0]:vr.left+vr.width/2,py=at?at[1]:vr.top+vr.height/2,fx=(px-r.left)/r.width,fy=(py-r.top)/r.height;
  fitCanvas();if(viewZoom!=null){const r2=cv.getBoundingClientRect();v.scrollLeft+=(r2.left+fx*r2.width)-px;v.scrollTop+=(r2.top+fy*r2.height)-py;}
  paintZoom();dirty=true;}
function zoomStep(dir,at){const z=zoomNow();let n=dir>0?ZOOMS.find(q=>q>z*1.02):[...ZOOMS].reverse().find(q=>q<z/1.02);if(n==null)n=dir>0?ZOOMS[ZOOMS.length-1]:ZOOMS[0];
  if(dir<0&&n<fitScale()&&z>fitScale()*1.001)n=null;setZoom(n,at);}
function paintZoom(){const b=$('#zoomVal');if(!b)return;const t=`${Math.round(zoomNow()*100)}%`;if(b.textContent!==t)b.textContent=t;b.setAttribute('aria-pressed',viewZoom!=null);
  b.setAttribute('aria-label',`Zoom ${t}${viewZoom==null?', fitted':''} – click for 100% or to fit`);}
function fitCanvas(){
  const [W,H]=size(),v=$('#view'),s=zoomNow(),cw=Math.max(1,Math.floor(W*s)),ch=Math.max(1,Math.floor(H*s));cv.style.width=cw+'px';cv.style.height=ch+'px';
  v.classList.toggle('zoomed',viewZoom!=null&&!$('.app').classList.contains('preview'));paintZoom();
  /* the preview draws at the size it shows (sharp on a retina screen), never above the real size */
  const k=Math.min(1,cw*(devicePixelRatio||1)/W),bw=Math.max(1,Math.round(W*k)),bh=Math.max(1,Math.round(H*k));
  if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh;}
  $('#dims').textContent=`${W} × ${H}`;$('#dims').title=`The loop comes out at ${W} × ${H} pixels`;dirty=true;}
function planNow(){return E.plan(S,items.length?items:Array.from({length:6},()=>({})));}
function render(){
  const [W,H]=size(),P=planNow(),t=((clock%P.L)+P.L)%P.L;
  const sc=E.scene(S,items,ctx,FONTS,W,H,t);cur=sc;
  syncVideos(sc);
  crispNow=!playing&&S.xCrisp!==false;try{E.paint(ctx,sc,S,FONTS,{scale:cv.width/W,media:drawMedia,bgImg:PICS.bg,ovImg:PICS.ov});}finally{crispNow=false;}
  drawUI();
  for(const tr of trims){const o=sc.ops.find(q=>q.item===tr.it&&q.time!=null);tr.head.hidden=!o;if(o){const d=Math.max(.01,+tr.it.dur||1);tr.head.style.left=(((o.time%d)+d)%d/d*100)+'%';}}
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
/* The canvas (0.6). Hover a piece and it's outlined, and its row in Media lights up; click it to
   select it – its row opens – and drag it: inside its frame where it's cropped (the rest of the
   picture shows faintly while you do), or the piece itself where it's whole (a slide shown as it
   is, a layer). Its corners scale it; Ctrl or Alt and scroll zooms; double-click puts it back.
   With guides on, whole pieces catch on the margins, columns, rows and centre – hold Alt to place
   one freely. Selection, outlines and guides are drawn on the preview only. */
const canvasPt=e=>{const b=cv.getBoundingClientRect(),[W,H]=size();return[(e.clientX-b.left)*W/b.width,(e.clientY-b.top)*H/b.height];};
const scrPx=()=>{const b=cv.getBoundingClientRect(),[W]=size();return Math.max(1e-6,b.width/W);};   /* screen px per canvas px */
function inClip(c,x,y){if(!c)return true;const inside=x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h;return c.out?!inside:inside;}
function hitAt(x,y){if(!cur)return null;for(let j=cur.ops.length-1;j>=0;j--){const o=cur.ops[j],r=o.rect;if(!o.item||o.item.placeholder||!o.item.w||o.alpha<=.05||!r)continue;
    if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h&&inClip(o.clip,x,y)&&inClip(o.lclip,x,y))return o;}return null;}
function spare(o){const S2=cur.S||S,r=o.rect,m=Math.min(Math.max(0,+S2.mat||0)*o.scale,r.w/3,r.h/3),w=r.w-2*m,h=r.h-2*m,it=o.item,k=Math.max(w/it.w,h/it.h)*Math.max(1,(+it.zm||100)/100);
  return[(it.w*k-w)/2,(it.h*k-h)/2];}
const croppable=o=>o.whole||(cur.S||S).fit!=='fit';
const zRange=o=>o.layer?[5,400]:o.whole?[20,400]:[100,400];
let grab=null,zoomT=0,selId=null,hoverOp=null,hoverRow=null,cropId=null;
/* Cropping (0.15): double-click a picture that's cropped by its shape and it's the picture you're working on – all of it
   shows faintly, a drag moves it, its corners zoom it; click away, Esc or Enter to finish. A selected shape in Slides
   also has a ring at its centre: drag that to move the picture inside without going in. No Alt key anywhere. */
const canCrop=o=>!!o&&!o.whole&&!!o.item&&!!o.item.w&&croppable(o);
const ringAt=(o,x,y)=>!!o&&o.frame&&canCrop(o)&&Math.hypot(x-(o.rect.x+o.rect.w/2),y-(o.rect.y+o.rect.h/2))<=11/scrPx();
function panGrab(o,x,y){const it=o.item,[sx,sy]=spare(o);grab={mode:'move',it,o,whole:false,x0:x,y0:y,px:+it.px||0,py:+it.py||0,ox:0,oy:0,sx,sy,k:1,r0:Object.assign({},o.rect),moved:false,snap:null};cv.classList.add('grabbing');}
const opOf=id=>cur&&id?cur.ops.find(o=>o.item&&o.item.id===id&&o.rect&&o.alpha>.05):null;
const cornersOf=r=>[[r.x,r.y],[r.x+r.w,r.y],[r.x+r.w,r.y+r.h],[r.x,r.y+r.h]];
function handleAt(x,y){const o=opOf(selId);if(!o||!(o.whole||o.frame))return null;const tol=9/scrPx();
  for(const [i,[cx,cy]] of cornersOf(o.rect).entries())if(Math.abs(x-cx)<=tol&&Math.abs(y-cy)<=tol)return{o,i};return null;}
const rowOf=id=>mediaBox&&id?mediaBox.querySelector(`.slot[data-id="${id}"]`):null;
function setHover(o){const id=o&&o.item?o.item.id:null,was=hoverOp&&hoverOp.item?hoverOp.item.id:null;hoverOp=o;if(id===was)return;
  const a=rowOf(was);if(a)a.classList.remove('hover');const b=rowOf(id);if(b)b.classList.add('hover');dirty=true;}
/* select a piece: outline it; open its row and bring it into view */
function selectItem(id,open){selId=id;dirty=true;if(!id||!open)return;openRows.add(id);paintMedia();
  const c=document.querySelector('section.card[data-id="media"]');if(c&&c.classList.contains('collapsed'))c.querySelector('.card-toggle').click();
  const r=rowOf(id);if(r)requestAnimationFrame(()=>r.scrollIntoView({block:'nearest',behavior:reduceMotion.matches?'auto':'smooth'}));}
/* the guides: margins, columns and rows between them, and the centre */
/* guides (0.11): the margin and a grid of square cells inside it – Grid is how many across; the rows are as many as
   fit, centred. No columns, rows or gutters (Steve: "just grids and margins"). The middle lines are always there. */
function guideLines(){const [W,H]=size(),m=clamp(+S.guM||0,0,Math.min(W,H)/2-1),N=Math.round(+S.guN||0);
  const xs=[0,W/2,W],ys=[0,H/2,H],gx=[],gy=[];if(m>0){xs.push(m,W-m);ys.push(m,H-m);}
  if(N>1){const c=(W-2*m)/N,R=Math.max(1,Math.round((H-2*m)/c)),r=(H-2*m)/R;if(c>2){for(let i=1;i<N;i++)gx.push(m+i*c);for(let j=1;j<R;j++)gy.push(m+j*r);}}
  xs.push(...gx);ys.push(...gy);return{xs,ys,gx,gy,m,W,H};}
function snapMove(r,dx,dy,free){if(free||!S.guides||S.guSnap===false)return[dx,dy,null,null];const L=guideLines(),tol=7/scrPx();
  const best=(edges,lines)=>{let b=null;for(const e of edges)for(const l of lines){const d=l-e;if(Math.abs(d)<=tol&&(!b||Math.abs(d)<Math.abs(b.d)))b={d,l};}return b;};
  const bx=best([r.x+dx,r.x+dx+r.w/2,r.x+dx+r.w],L.xs),by=best([r.y+dy,r.y+dy+r.h/2,r.y+dy+r.h],L.ys);
  return[dx+(bx?bx.d:0),dy+(by?by.d:0),bx?bx.l:null,by?by.l:null];}
/* how far a piece moves on the canvas for each px of its offset – measured, so it holds for a
   slide shown as it is, a layer, a slide part-way through its movement */
function unitK(o){const it=o.item,[W,H]=size(),P=planNow(),t=((clock%P.L)+P.L)%P.L,was=+it.ox||0;let k=E.unitOf(W,H);it.ox=was+100;
  try{const q=E.scene(S,items,ctx,FONTS,W,H,t).ops.find(p=>p.key===o.key);if(q&&Math.abs(q.rect.x-o.rect.x)>1e-3)k=(q.rect.x-o.rect.x)/100;}finally{it.ox=was;}return k;}
/* the whole picture of a cropped piece, where it lies – shown faintly while it's dragged */
function cropBox(o){const S2=cur.S||S,r=o.rect,m=Math.min(Math.max(0,+S2.mat||0)*o.scale,r.w/3,r.h/3),mr={x:r.x+m,y:r.y+m,w:r.w-2*m,h:r.h-2*m},it=o.item;
  const z=Math.max(1,(+it.zm||100)/100),k=Math.max(mr.w/it.w,mr.h/it.h)*z,dw=it.w*k,dh=it.h*k,sx=(dw-mr.w)/2,sy=(dh-mr.h)/2;
  return{x:mr.x-sx+clamp(+it.px||0,-100,100)/100*sx,y:mr.y-sy+clamp(+it.py||0,-100,100)/100*sy,w:dw,h:dh};}
function drawUI(){if($('.app').classList.contains('preview'))return;const [W,H]=size(),k=cv.width/W,lw=1/scrPx();
  ctx.save();ctx.setTransform(k,0,0,k,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  /* one line, not two (0.15): white through 'difference', so it shows on anything */
  const box=(r,thick)=>{ctx.save();ctx.globalCompositeOperation='difference';ctx.lineWidth=(thick?1.5:1)*lw;ctx.strokeStyle=thick?'#FFFFFF':'rgba(255,255,255,.55)';ctx.strokeRect(r.x,r.y,r.w,r.h);ctx.restore();};
  if(S.guides){const L=guideLines();ctx.save();ctx.globalCompositeOperation='difference';ctx.fillStyle='rgba(255,255,255,.07)';
    ctx.strokeStyle='rgba(255,255,255,.32)';ctx.lineWidth=lw;ctx.beginPath();for(const x of L.gx){ctx.moveTo(x,L.m);ctx.lineTo(x,H-L.m);}for(const y of L.gy){ctx.moveTo(L.m,y);ctx.lineTo(W-L.m,y);}ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.6)';if(L.m>0)ctx.strokeRect(L.m,L.m,W-2*L.m,H-2*L.m);
    ctx.setLineDash([4*lw,4*lw]);ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();ctx.setLineDash([]);
    if(grab&&grab.snap){ctx.strokeStyle='rgba(255,255,255,1)';ctx.lineWidth=1.5*lw;ctx.beginPath();if(grab.snap[0]!=null){ctx.moveTo(grab.snap[0],0);ctx.lineTo(grab.snap[0],H);}if(grab.snap[1]!=null){ctx.moveTo(0,grab.snap[1]);ctx.lineTo(W,grab.snap[1]);}ctx.stroke();}
    ctx.restore();}
  const so=opOf(selId),hid=hoverOp&&hoverOp.item?hoverOp.item.id:hoverRow,ho=hid&&hid!==selId?opOf(hid):null;
  if(cropId&&(cropId!==selId||!so||!canCrop(so)))cropId=null;
  {const t=!so?'':cropId?'Drag the picture to move it · its corners zoom it · click away when it’s right':so.layer||so.whole?'Drag to move · corners to size':so.frame?(canCrop(so)?'Drag to move · corners to size · the ring, or a double-click, moves the picture inside':'Drag to move · corners to size'):canCrop(so)?'Drag to move the picture in its frame · double-click to zoom it':'';
    const sh=$('#selHint');if(sh&&sh.textContent!==t){sh.textContent=t;topFit();}}
  if(ho)box(ho.rect,false);
  if(so){const ready=so.item.src&&(so.item.kind!=='video'||so.item.src.readyState>=2),inCrop=cropId===so.item.id,sq=(cx,cy)=>{const hs=7*lw;ctx.fillStyle='#FFFFFF';ctx.fillRect(cx-hs/2,cy-hs/2,hs,hs);ctx.lineWidth=lw;ctx.strokeStyle='#111111';ctx.strokeRect(cx-hs/2,cy-hs/2,hs,hs);};
    /* the whole picture, faintly – while cropping, or while it's being moved inside its frame */
    if(ready&&canCrop(so)&&(inCrop||(grab&&grab.moved&&grab.mode==='move'&&!grab.whole))){const g=cropBox(so);ctx.save();ctx.globalAlpha=.32;try{ctx.drawImage(so.item.src,g.x,g.y,g.w,g.h);}catch(e){}ctx.restore();
      ctx.save();ctx.setLineDash([4*lw,3*lw]);box(g,false);ctx.restore();if(inCrop)for(const [cx,cy] of cornersOf(g))sq(cx,cy);}
    box(so.rect,true);
    if(!inCrop&&(so.whole||so.frame))for(const [cx,cy] of cornersOf(so.rect))sq(cx,cy);
    /* the ring: the picture inside a shape you can also move */
    if(!inCrop&&so.frame&&canCrop(so)&&!(grab&&grab.whole)){const cx=so.rect.x+so.rect.w/2,cy=so.rect.y+so.rect.h/2;ctx.beginPath();ctx.arc(cx,cy,8*lw,0,7);ctx.fillStyle='rgba(255,255,255,.92)';ctx.fill();ctx.lineWidth=lw;ctx.strokeStyle='#111111';ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,2.5*lw,0,7);ctx.fillStyle='#111111';ctx.fill();}}
  ctx.restore();}
cv.addEventListener('pointerdown',e=>{if(busy||e.button!==0)return;const [x,y]=canvasPt(e);
  const take=()=>{e.preventDefault();e.stopPropagation();cv.setPointerCapture(e.pointerId);setPlaying(false);};
  /* cropping: the picture's corners zoom it, a drag anywhere on it moves it, a click away finishes */
  if(cropId){const co=opOf(cropId);if(co&&canCrop(co)){const g=cropBox(co),tol=9/scrPx(),cx=g.x+g.w/2,cy=g.y+g.h/2;
      if(cornersOf(g).some(([px,py])=>Math.abs(x-px)<=tol&&Math.abs(y-py)<=tol)){take();grab={mode:'scale',it:co.item,o:co,zk:'zm',zm0:+co.item.zm||100,cx,cy,d0:Math.max(1e-6,Math.hypot(x-cx,y-cy)),lo:100,hi:400,x0:x,y0:y,moved:false};return;}
      const r=co.rect;if((x>=g.x&&x<=g.x+g.w&&y>=g.y&&y<=g.y+g.h)||(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)){take();panGrab(co,x,y);return;}}
    cropId=null;dirty=true;}
  {const so=opOf(selId);if(ringAt(so,x,y)){take();panGrab(so,x,y);return;}}
  const h=handleAt(x,y);
  if(h){e.preventDefault();e.stopPropagation();cv.setPointerCapture(e.pointerId);setPlaying(false);const o=h.o,zk=o.frame?'fz':'zm',[lo,hi]=o.frame?[20,400]:zRange(o),cx=o.rect.x+o.rect.w/2,cy=o.rect.y+o.rect.h/2;
    grab={mode:'scale',it:o.item,o,zk,zm0:+o.item[zk]||100,cx,cy,d0:Math.max(1e-6,Math.hypot(x-cx,y-cy)),lo,hi,x0:x,y0:y,moved:false};return;}
  const o=hitAt(x,y);if(!o){if(selId){selId=null;dirty=true;}return;}
  e.preventDefault();e.stopPropagation();cv.setPointerCapture(e.pointerId);setPlaying(false);selId=o.item.id;dirty=true;
  /* a shape in Slides (0.13): a drag moves the shape; the ring at its centre, or a double-click, is for the picture inside (0.15) */
  const asWhole=!!o.whole||!!o.frame;
  if(!asWhole&&!croppable(o)){grab={mode:'click',it:o.item,x0:x,y0:y,moved:false};return;}
  const it=o.item,[sx,sy]=asWhole?[0,0]:spare(o);
  grab={mode:'move',it,o,whole:asWhole,x0:x,y0:y,px:+it.px||0,py:+it.py||0,ox:+it.ox||0,oy:+it.oy||0,sx,sy,k:asWhole?unitK(o):1,r0:Object.assign({},o.rect),moved:false,snap:null};cv.classList.add('grabbing');});
cv.addEventListener('pointermove',e=>{const [x,y]=canvasPt(e);
  if(!grab){if(e.buttons)return;if(!cropId&&ringAt(opOf(selId),x,y)){cv.style.cursor='move';return;}const h=cropId?null:handleAt(x,y);if(h){cv.style.cursor=h.i%2===0?'nwse-resize':'nesw-resize';cv.classList.remove('grab');setHover(h.o);return;}
    cv.style.cursor='';const o=hitAt(x,y);cv.classList.toggle('grab',!!(o&&(o.frame||croppable(o))));setHover(o);return;}
  const g=grab,it=g.it,dx=x-g.x0,dy=y-g.y0;if(!g.moved&&Math.hypot(dx,dy)*scrPx()<3)return;g.moved=true;if(g.mode==='click')return;
  if(g.mode==='scale'){it[g.zk]=+clamp(g.zm0*Math.hypot(x-g.cx,y-g.cy)/g.d0,g.lo,g.hi).toFixed(1);dirty=true;return;}
  if(g.whole){const [sdx,sdy,lx,ly]=snapMove(g.r0,dx,dy,e.altKey);g.snap=[lx,ly];it.ox=+(g.ox+sdx/g.k).toFixed(1);it.oy=+(g.oy+sdy/g.k).toFixed(1);}
  else{if(g.sx>.5)it.px=+clamp(g.px+dx/g.sx*100,-100,100).toFixed(1);if(g.sy>.5)it.py=+clamp(g.py+dy/g.sy*100,-100,100).toFixed(1);}
  dirty=true;});
const letGo=()=>{if(!grab)return;const g=grab;grab=null;cv.classList.remove('grabbing');if(g.moved&&g.mode!=='click')saveItems();selectItem(g.it.id,true);};
cv.addEventListener('pointerup',letGo);cv.addEventListener('pointercancel',letGo);cv.addEventListener('pointerleave',()=>{if(!grab)setHover(null);});
cv.addEventListener('dblclick',e=>{if(busy)return;const [x,y]=canvasPt(e),o=hitAt(x,y);if(!o||!canCrop(o)){return;}selId=o.item.id;cropId=o.item.id;setPlaying(false);dirty=true;});
document.addEventListener('keydown',e=>{if(cropId&&(e.key==='Escape'||e.key==='Enter')){cropId=null;dirty=true;}});
cv.addEventListener('wheel',e=>{if(!e.altKey)return;const [x,y]=canvasPt(e),o=hitAt(x,y);if(!o||!croppable(o))return;e.preventDefault();setPlaying(false);
  const it=o.item,[lo,hi]=zRange(o);it.zm=+clamp((+it.zm||100)*Math.exp(-e.deltaY*.0025),lo,hi).toFixed(1);selId=it.id;dirty=true;
  clearTimeout(zoomT);zoomT=setTimeout(()=>{saveItems();openRows.add(it.id);paintMedia();},250);},{passive:false});
/* the arrow keys nudge the selected piece (0.9): a px at a time, ten with Shift – a cropped piece moves its picture inside its frame */
document.addEventListener('keydown',e=>{if(!selId||busy||!/^Arrow/.test(e.key)||e.metaKey||e.ctrlKey||e.altKey)return;const a=document.activeElement;
  if(a&&(/INPUT|TEXTAREA|SELECT/.test(a.tagName)||a.isContentEditable||(a.closest&&a.closest('.ctl,.seg,.kinds,.way,.stp-g,.trim'))))return;
  const o=opOf(selId);if(!o||!(o.frame||croppable(o)))return;e.preventDefault();const it=o.item,n=e.shiftKey?10:1,dx=e.key==='ArrowLeft'?-n:e.key==='ArrowRight'?n:0,dy=e.key==='ArrowUp'?-n:e.key==='ArrowDown'?n:0;
  if(o.whole||o.frame){it.ox=Math.round((+it.ox||0)+dx);it.oy=Math.round((+it.oy||0)+dy);}
  else{const [sx,sy]=spare(o);if(sx>.5)it.px=clamp((+it.px||0)+dx*100/sx,-100,100);if(sy>.5)it.py=clamp((+it.py||0)+dy*100/sy,-100,100);}
  saveItems();dirty=true;clearTimeout(nudgeT);nudgeT=setTimeout(paintMediaKeepFocus,300);});
let nudgeT=0;
/* the view: pinch, or ⌘/Ctrl and scroll, zooms where the pointer is; zoomed in, a scroll (or a drag with the middle
   button) moves round it. Space stays play and pause. */
{const v=$('#view');let pan=null;
  v.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey)return;e.preventDefault();const z=zoomNow()*Math.exp(-e.deltaY*.006);setZoom(z,[e.clientX,e.clientY]);},{passive:false});
  const typing=()=>{const a=document.activeElement;return a&&(/INPUT|TEXTAREA|SELECT/.test(a.tagName)||a.isContentEditable);};
  document.addEventListener('keydown',e=>{if(!(e.metaKey||e.ctrlKey)||e.altKey||typing())return;
    if(e.key==='='||e.key==='+'){e.preventDefault();zoomStep(1);}else if(e.key==='-'||e.key==='_'){e.preventDefault();zoomStep(-1);}else if(e.key==='0'){e.preventDefault();setZoom(null);}
    else if(e.key===';'){e.preventDefault();set('guides',!S.guides);}});
  v.addEventListener('pointerdown',e=>{if(e.button!==1||viewZoom==null)return;e.preventDefault();e.stopPropagation();pan={x:e.clientX,y:e.clientY,l:v.scrollLeft,t:v.scrollTop};v.setPointerCapture(e.pointerId);v.classList.add('grabbing');},true);
  v.addEventListener('pointermove',e=>{if(!pan)return;v.scrollLeft=pan.l-(e.clientX-pan.x);v.scrollTop=pan.t-(e.clientY-pan.y);});
  const end=()=>{pan=null;v.classList.remove('grabbing');};v.addEventListener('pointerup',end);v.addEventListener('pointercancel',end);
  $('#zoomIn').onclick=()=>zoomStep(1);$('#zoomOut').onclick=()=>zoomStep(-1);$('#zoomVal').onclick=()=>setZoom(viewZoom==null?1:null);}
/* undo and redo, as buttons too (0.10) – off when there's nothing to undo or redo */
{const u=$('#undoBtn'),r=$('#redoBtn');u.onclick=()=>undo();r.onclick=()=>redo();let nu=-1,nr=-1;
  (function look(){if(UNDO.length!==nu||REDO.length!==nr){nu=UNDO.length;nr=REDO.length;u.disabled=!nu;r.disabled=!nr;
    u.dataset.tip=nu?`Undo ${UNDO[nu-1].label} – ⌘Z`:'Nothing to undo';r.dataset.tip=nr?`Redo ${REDO[nr-1].label} – ⇧⌘Z`:'Nothing to redo';}setTimeout(look,250);})();}
/* guides (0.10, from Canvas): the button shows or hides them; its arrow opens their settings – changing one shows them */
{const pop=$('#guidePop'),more=$('#guidesMore'),btn=$('#guidesBtn');
  pop.append(el('div','pop-title','Guides'));
  build(pop,[{t:'range',k:'guM',label:'Margin',min:0,max:400,step:1,unit:' px'},
    {t:'range',k:'guN',label:'Grid',min:0,max:24,step:1,tip:'This many cells across inside the margin, with rows to keep them near square – 0 for none'},
    {t:'toggle',k:'guSnap',label:'Snap to guides'}]);
  addHint(pop,'On the preview only – nothing of them goes into an export. Hold Alt as you drag to place a piece freely.');
  const show=o=>{pop.hidden=!o;more.setAttribute('aria-expanded',o);if(o){refreshAll();requestAnimationFrame(()=>syncRanges(pop));}};
  btn.onclick=()=>set('guides',!S.guides);more.onclick=e=>{e.stopPropagation();show(pop.hidden);};
  document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!pop.contains(e.target)&&!more.contains(e.target))show(false);},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden){show(false);more.focus();}});
  controls.push({d:{},w:btn,update(){btn.setAttribute('aria-pressed',!!S.guides);}});}
document.addEventListener('keydown',e=>{if(!(e.metaKey||e.ctrlKey)||e.key.toLowerCase()!=='d'||e.shiftKey||e.altKey)return;const a=document.activeElement;
  if(a&&(/INPUT|TEXTAREA|SELECT/.test(a.tagName)||a.isContentEditable))return;if(!selId)return;e.preventDefault();duplicateItem(selId);});
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!selId||busy)return;const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;selId=null;dirty=true;});
/* the moment a piece is best seen: in Slides, as its slide has arrived; otherwise when it's
   biggest and nearest the middle of the canvas */
function momentOf(it){const P=planNow(),[W,H]=size();
  if(S.layout==='one'&&P.kind==='step'){const g=E.slidesOf(items);let b=it;if(!g.bases.includes(it)){for(const [base,ls] of g.layers)if(ls.includes(it))b=base;}
    const st=g.bases.indexOf(b),h=P.segs.find(q=>q.k==='hold'&&q.s===st);if(h)return h.t0+Math.min(.04,(h.t1-h.t0)/2);}
  let best=0,bt=null;for(let j=0;j<160;j++){const t=P.L*j/160,sc=E.scene(S,items,ctx,FONTS,W,H,t);
    for(const o of sc.ops){if(o.item!==it||!o.rect)continue;const r=o.rect,vx=Math.max(0,Math.min(r.x+r.w,W)-Math.max(r.x,0)),vy=Math.max(0,Math.min(r.y+r.h,H)-Math.max(r.y,0));
      const d=Math.hypot(r.x+r.w/2-W/2,r.y+r.h/2-H/2)/Math.hypot(W,H),v=vx*vy*o.alpha*(1-d);if(v>best+1e-6){best=v;bt=t;}}}
  return bt;}
function seekTo(it){const t=momentOf(it);if(t==null)return;setPlaying(false);clock=t;dirty=true;}
function setPlaying(v){playing=v;const b=$('#play');b.textContent=v?'Pause':'Play';b.setAttribute('aria-label',v?'Pause':'Play');dirty=true;}
$('#play').onclick=()=>setPlaying(!playing);
$('#scrub').addEventListener('input',()=>{setPlaying(false);const P=planNow();clock=$('#scrub').value/1000*P.L;dirty=true;});
function onSet(k){if(/^gu/.test(k)||k==='guides')dirty=true;if(/^gu[MN]$/.test(k)&&!S.guides)set('guides',true,true);if(openRows.size&&['layout','capOn','oneFit','oneMove','kb','hold','dur'].includes(k))paintMedia();if(['cSize','cW','cH'].includes(k))fitCanvas();if(current&&LOOK.includes(k)&&!edited){edited=true;LS.set('presetEdited',true);}if(['TF','LF','GF','OF','TS','LS','GS','OS','pairs','kern'].includes(k))E.resetMeasure();if(k==='OF'&&FONTS[S.OF]&&document.fonts)document.fonts.load(fontStr(FONTS[S.OF])).then(fontsSettled).catch(()=>{});}
/* the loop's length, typed (0.9): click the chip and type a length – every time in the loop (rests, moves, each shape,
   the pull back, lags, each slide's own time) is scaled by the same amount, so it lasts that long and still joins up.
   Video plays at its own speed, as ever. One step to undo. */
const LOOP_KEYS=['hold','dur','spsh','still','zOut','gHold','zIn','lag','colLag','fLag'];
function fitLoop(T){T=clamp(+T||0,.5,600);const L0=planNow().L;if(!(L0>0)||Math.abs(T/L0-1)<5e-4)return;
  const s0={},h0=items.map(it=>it.hold);for(const k of LOOP_KEYS)s0[k]=S[k];
  for(let pass=0;pass<4;pass++){const f=T/planNow().L;if(!(f>0)||Math.abs(f-1)<5e-4)break;
    for(const k of LOOP_KEYS)S[k]=+(+S[k]*f).toFixed(4);items.forEach(it=>{if(+it.hold>0)it.hold=+(+it.hold*f).toFixed(4);});}
  const ch={},h1=items.map(it=>it.hold);for(const k of LOOP_KEYS)if(!same(+s0[k],+S[k]))ch[k]=[s0[k],S[k]];
  const put=w=>{items.forEach((it,i)=>{const v=(w?h1:h0)[i];if(v==null)delete it.hold;else it.hold=v;});itemReplay=true;try{saveItems();}finally{itemReplay=false;}paintMedia();};
  itemReplay=true;try{saveItems();}finally{itemReplay=false;}saveSettings();pushUndo({ch,label:`Loop ${T.toFixed(1)} s`,extra:put});
  E.resetMeasure();dirty=true;paintMedia();refreshAll();toastUndo(`Loop ${planNow().L.toFixed(2)} s`);}
{const c=$('#loopChip');typable(c,{label:'Loop length in seconds',get:()=>+planNow().L.toFixed(2),put:fitLoop,min:.5,max:600,show:()=>`${planNow().L.toFixed(1)} s loop`});
  c.dataset.tip='Click to set how long the loop lasts – every time in it is scaled to fit';}
/* the play bar (0.11): a faint tick where each slide (or stop) begins its time on screen */
let tickSig='';
function paintTicks(P){const box=$('#ticks');if(!box)return;const at=(P.segs||[]).filter(g=>g.k==='hold'||g.k==='grid').map(g=>g.t0/P.L).filter(x=>x>=0&&x<1);
  const sig=P.L.toFixed(3)+':'+at.map(x=>x.toFixed(4)).join();if(sig===tickSig)return;tickSig=sig;box.textContent='';if(at.length<2||at.length>80)return;
  for(const x of at){const i=el('i');i.style.left=(x*100).toFixed(3)+'%';box.append(i);}}
function appRefresh(){const P=planNow(),lc=$('#loopChip');paintTicks(P);if(!lc.classList.contains('editing'))lc.textContent=`${P.L.toFixed(1)} s loop`;
  const g6=S.layout==='one'?E.slidesOf(items):null;
  $('#countChip').textContent=!items.length?'No media yet':g6&&g6.layers.size?`${items.length} pieces · ${g6.bases.length} slides`:(items.length===1?'1 shape':`${items.length} shapes`);
  if(current&&BUILTIN.concat(mine).some(x=>x.name===current)){const e=LOOK.some(moved);if(e!==edited){edited=e;LS.set('presetEdited',e);}}
  const pn=$('#pcapName');pn.textContent=presetName();}

/* ---------------- cards ---------------- */
/* The panel follows what you do: add media, set the canvas, pick the kind of motion, then
   shape, captions and what goes over the top. Each kind shows only its own controls, in the
   same order – how many, what moves and which way, timing, the feel, then its character. */
Object.assign(TIPS,{
  guides:'Lines over the canvas to line things up by – the margin, a grid and the centre. They’re only on the preview: nothing of them goes into an export.',guM:'Space in from each edge',guSnap:'Pieces you move catch on the guides and the centre. Hold Alt as you drag to place one freely.',
  cSize:'The size of what comes out. Presets keep to it – they scale to fit.',bg:'The colour behind everything',fps:'Frames a second in the MP4. 30 suits most social video; 60 is smoother, with twice the frames to encode.',
  bgFit:'Fill crops the image to the canvas; Fit shows all of it, on the background colour',bgImgA:'How strongly the background image shows',
  ratio:'The shape each piece of media sits in. It’s cropped to fill it, or fitted inside. The media’s own: in Columns and Float each shape takes its own media’s shape.',
  gap:'Space between shapes',radius:'Rounded corners on every shape',
  fit:'Fill crops the media to the shape; Fit shows all of it, on the shape’s colour',shapeBg:'Shows behind media that doesn’t fill its shape',
  oneFit:'Full bleed fills the canvas with each slide, cropped to it. As it is keeps each slide’s own shape, on the background. In a shape puts every slide in the same shape – set it in Shapes.',
  ownScale:'Fit each: every slide as big as the space allows. True to scale: one scale for them all, so a smaller piece shows smaller.',
  kb:'A little movement in every slide while it’s on screen, running through the transitions so it never stops. As it is moves the whole slide; full bleed and In a shape move the picture inside its frame. Parallax moves the frame one way and the picture the other. Vary takes turns: in, across, out, back.',
  kbAmt:'How far each slide moves while it’s on screen – the zoom, or the distance across',
  mat:'A border inside each shape, like the mount round a print',matR:'Rounded corners on the media inside the border',
  hold:'How long each shape rests before the next move',dur:'How long each move takes',spsh:'How long it takes to drift by one shape – sets the speed',
  feel:'How a move speeds up and slows down – the curve under it shows how. Snap: a slow start, a fast throw, a long settle. Glide eases in and out; Soft is gentler, smoothest for zooms. Coast pushes, then glides in a long way. Inertia flicks and coasts to a stop. Spring goes a touch past and settles. Linear keeps an even speed.',
  lag:'Each shape sets off a beat after the one ahead of it, so the gaps open as they move and close as they land. It takes from the rest time.',
  creep:'Keeps everything drifting gently while it rests, so it never quite stops – 10 to 20% is subtle, and it makes a Snap feel alive',
  after:'After the last shape: carry straight on round, or pull back to show every shape in a grid, then come back in to the first',
  gCols:'Columns in the grid you pull back to',zFeel:'How the camera eases out and back in – the same feels as a move. Inertia flicks out and coasts; Spring overshoots and settles.',gSize:'How much of the canvas the grid fills when it’s furthest out',gHold:'How long the whole range stays in view',
  colDir:'Which way each column runs. Alternate: down, up, down…',colSpeed:'Same: each column goes round once a loop. Varied: two, three or four times in a loop twice as long.',
  colLag:'Each column moves this long after the one to its left',colOff:'Sets every other column down by part of a shape, so they don’t line up',
  wCols:'How many columns fit across the canvas',wRows:'How many rows fit down it – the wall carries on past the edges',wPath:'The route the camera takes over the wall, a move at a time',wStep:'How many tiles each move carries the camera along its route',wOff:'Sets every other column down by part of a tile, like brickwork',
  fCols:'Frames across',fRows:'Frames down',fMove:'How the media changes inside each frame',fLag:'Each frame changes this long after the one before it',
  depth:'How far apart the near and far shapes are – in size and in speed. None puts them all at one depth.',spread:'Space between shapes – more is sparser',
  capWhere:'Under or above each shape, on it, or fixed on the canvas for the shape that’s showing',capReveal:'How each caption arrives',
  pairs:'Your own kerning for pairs of letters, in thousandths of the size – “AV -40, To -30”',accent:'Words between *stars* take this colour, in captions and over the top',kern:'Use the kerning built into the font',
  capSpace:'The space between a shape and its caption',capGapL:'Space between the title, line and tags',
  ovBlend:'Difference flips the colours it sits over – white type turns cyan over red. Multiply darkens, Screen lightens.',ovA:'How strongly it shows',
  ovZ:'Over everything, or behind the nearest shapes so they pass in front of it',ovM:'Space from the edge of the canvas',ovW:'How wide the image is, against the canvas'});
const KIND=s=>E.kindOf(s),isK=(...ks)=>s=>ks.includes(KIND(s));
const mv=s=>E.moveOf(s);
const count=()=>items.length||6;
const framesStatic=s=>count()<=Math.max(1,Math.round(s.fCols))*Math.max(1,Math.round(s.fRows));
const stepping=s=>{const m=mv(s);if(m==='drift'||m==='still')return false;return !(KIND(s)==='frames'&&framesStatic(s));};
/* a row for a picture of its own – the background, or the overlay */
function picRow(parent,which,show,label){
  const row=el('div','img-row'+(label?' labelled':'')),inn=label?el('div','img-in'):row,th=el('span','mthumb'),nm=el('div','slot-name'),add=el('button','pill small'),rm=el('button','pill small icon');
  add.type=rm.type='button';rm.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  const what=which==='bg'?'background image':'overlay image';rm.dataset.tip='Remove';rm.setAttribute('aria-label','Remove the '+what);
  add.onclick=()=>$(which==='bg'?'#bgfile':'#ovfile').click();rm.onclick=()=>removePic(which);inn.append(th,nm,add,rm);if(label)row.append(el('span','img-lab',label),inn);
  let had;const c=addCustom(parent,show,row);
  c.update=()=>{const p=PICS[which];if(p===had)return;had=p;th.textContent='';th.hidden=!p;if(p)th.append(thumbOf(Object.assign({kind:'image'},p)));
    nm.textContent=p?p.name:label?'None':(which==='bg'?'No image – the colour shows':'No image yet');nm.classList.toggle('muted',!p);
    add.textContent=p?'Replace':'+ Add image';add.setAttribute('aria-label',(p?'Replace the ':'Add a ')+what);rm.hidden=!p;};
  return c;}
/* Media */
const openRows=new Set();let mediaBox;
{const b=card('media','Media');mediaBox=el('div','media-list');b.append(mediaBox);
  const r=el('div','ctl btn-row'),add=el('button','pill','+ Add images or video');add.type='button';add.onclick=()=>$('#mediafile').click();r.append(add);
  const clr=el('button','pill small','Clear all');clr.type='button';clr.onclick=()=>{if(!items.length)return;removeItems(items.map(it=>it.id),items.length===1?'Cleared 1 file':`Cleared ${items.length} files`);};r.append(clr);b.append(r);
  addHint(b,'Drag a row to change the order. Video plays from its start point as its shape arrives.',()=>items.length>1);
  addHint(b,'Open a row to give that slide its own time, transition or movement – or switch on Layer on above, to sit it over (or under) that slide.',s=>s.layout==='one'&&items.length>0);
  SUMMARY.media=()=>!items.length?'No media yet':`${items.length} · `+(()=>{const v=items.filter(i=>i.kind==='video').length,i=items.length-v;return [v?`${v} video`:'',i?`${i} image${i>1?'s':''}`:''].filter(Boolean).join(', ');})();}
function thumbOf(it){const c=el('canvas');c.width=88;c.height=64;const x=c.getContext('2d');x.fillStyle='#ddd';x.fillRect(0,0,88,64);
  try{if(it.src&&(it.kind!=='video'||it.src.readyState>=2)){const s=Math.max(88/it.w,64/it.h);x.drawImage(it.src,(88-it.w*s)/2,(64-it.h*s)/2,it.w*s,it.h*s);}}catch(e){}return c;}
let dragId=null,trims=[];
const isLayer=(it,i)=>S.layout==='one'&&i>0&&it.join==='on';
const BLENDS=[['normal','Normal'],['multiply','Multiply'],['screen','Screen'],['overlay','Overlay'],['darken','Darken'],['lighten','Lighten'],['difference','Difference']];
/* how much bigger than its own pixels each piece is ever drawn (0.9) – at the export's size, the most across the loop,
   so the Media row can say when it can't be fully crisp and what size it would need */
let enlSig='',enlMap=new Map();
function enlargeMap(){const sig=JSON.stringify([S,items.map(it=>META.map(k=>it[k]))]);if(sig===enlSig)return enlMap;enlSig=sig;enlMap=new Map();
  if(!items.length)return enlMap;const P=planNow(),[W,H]=size(),xk=outSize()[2]||1,fitIn=S.fit==='fit'&&!(S.layout==='one'&&S.oneFit==='bleed');
  for(let j=0;j<24;j++){let sc;try{sc=E.scene(S,items,ctx,FONTS,W,H,P.L*(j+.5)/24);}catch(e){break;}
    for(const o of sc.ops){const it=o.item,r=o.rect;if(!it||it.placeholder||!it.w||!it.h||!r||o.alpha<=.05)continue;
      let k=o.whole||o.layer?Math.max(r.w/it.w,r.h/it.h):(fitIn?Math.min(r.w/it.w,r.h/it.h):Math.max(r.w/it.w,r.h/it.h)*Math.max(1,(+it.zm||100)/100));
      if(o.inner&&o.inner.s)k*=o.inner.s;k*=xk;if(k>(enlMap.get(it)||0))enlMap.set(it,k);}}
  return enlMap;}
function paintMedia(){
  mediaBox.textContent='';trims=[];
  if(!items.length){mediaBox.append(el('div','media-empty','Drop images or video here, or anywhere on the page'));return;}
  items.forEach((it,i)=>{
    const row=el('div','slot'),top=el('div','slot-top'),th=el('span','mthumb'),main=el('div','slot-main'),nm=el('div','slot-name',it.title?it.title.split('\n')[0].replace(/[*{}]|#[0-9a-f]{3,8}:/gi,''):it.name),meta=el('div','slot-meta');
    const lay=isLayer(it,i),trimmed=it.kind==='video'&&(+it.start>0||+it.end>0);
    th.append(thumbOf(it));meta.textContent=(lay?'Layer'+(it.place==='behind'?', behind':'')+' · ':'')+(it.kind==='video'?`Video · ${(+it.dur||0).toFixed(1)} s`+(trimmed?` · plays ${(+it.start||0).toFixed(1)}–${(+it.end>(+it.start||0)?+it.end:+it.dur||0).toFixed(1)} s`:'')+(it.fixed?' · range put right':''):`Image · ${it.w} × ${it.h}`)+(it.blend&&it.blend!=='normal'?` · ${optLabel(BLENDS,it.blend)}`:'')+(it.opa!=null&&+it.opa<100?` · ${Math.round(+it.opa)}%`:'')+(!lay&&S.layout==='one'&&+it.hold>0?` · on for ${+(+it.hold).toFixed(2)} s`:'')+(it.title?` · ${it.name}`:'');if(it.fixed)meta.title='Its stream said full range while the file said video range – Segue made them agree, so the colours come out as they should';
    {const k=enlargeMap().get(it);if(k>1.08){const e=el('span','enl',` · shown at ${Math.round(k*100)}%`);e.dataset.tip=`Drawn bigger than its own pixels – up to ${k.toFixed(2)}× – so it can’t be fully crisp. For a crisp export it would need ${Math.ceil(it.w*k)} × ${Math.ceil(it.h*k)} px.`;meta.append(e);}}
    main.append(nm,meta);main.setAttribute('role','button');main.tabIndex=0;main.setAttribute('aria-expanded',openRows.has(it.id));main.setAttribute('aria-label',`${i+1}. ${it.name} – details`);
    /* opening a row selects the piece and takes the playhead to it (0.6) */
    const tog=()=>{if(openRows.has(it.id)){openRows.delete(it.id);if(selId===it.id)selId=null;}else{openRows.add(it.id);selId=it.id;}seekTo(it);paintMedia();dirty=true;};main.onclick=tog;
    th.style.cursor='pointer';th.onclick=()=>{selId=it.id;seekTo(it);paintMedia();dirty=true;};main.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tog();}};
    const rm=el('button','pill small icon');rm.type='button';rm.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';rm.dataset.tip='Remove';rm.setAttribute('aria-label','Remove '+it.name);rm.onclick=e=>{e.stopPropagation();removeItems([it.id],`Removed ${it.name}`);};
    const grip=el('span','grip');grip.innerHTML=ICON.grip;grip.setAttribute('aria-hidden','true');top.append(grip,th,main,rm);row.append(top);if(openRows.has(it.id))row.classList.add('open');row.dataset.id=it.id;if(lay)row.classList.add('layer');if(hoverOp&&hoverOp.item===it)row.classList.add('hover');
    row.onmouseenter=()=>{hoverRow=it.id;dirty=true;};row.onmouseleave=()=>{if(hoverRow===it.id){hoverRow=null;dirty=true;}};
    /* only the row's own bar starts a drag – never a slider or anything in its detail – and what's dragged means
       nothing outside Segue, so it can't be dropped on the desktop (0.11) */
    row.draggable=false;row.addEventListener('pointerdown',e=>{row.draggable=!!(e.target.closest('.slot-top')&&!e.target.closest('button,input,select,textarea,.rng-box'));});
    row.ondragstart=e=>{if(!row.draggable||e.target!==row){e.preventDefault();return;}dragId=it.id;row.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-segue-piece',it.id);};
    row.ondragend=()=>{dragId=null;row.classList.remove('dragging');};
    row.ondragover=e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();row.classList.add('over');};row.ondragleave=()=>row.classList.remove('over');
    row.ondrop=e=>{if(!dragId)return;e.preventDefault();e.stopPropagation();row.classList.remove('over');moveItem(dragId,i);};
    if(openRows.has(it.id))row.append(itemDetail(it,i));
    mediaBox.append(row);});}
/* a slider for one slide's own value – typeable, double-click its name to reset */
function itemRange(det,it,o){const w=el('div','ctl'),hd=el('div','ctl-head'),lb=el('label',null,o.label),val=el('span','val'),inp=el('input');
  inp.type='range';inp.min=o.min;inp.max=o.max;inp.step=o.step;inp.id=`i_${o.key}_${it.id}`;lb.htmlFor=inp.id;
  const get=()=>it[o.key]==null||it[o.key]===''?o.def:+it[o.key],show=()=>o.fmt?o.fmt(get()):`${+get().toFixed(2)}${o.unit||''}`;
  const put=v=>{it[o.key]=v;inp.value=v;if(!val.classList.contains('editing'))val.textContent=show();saveItems();dirty=true;w.classList.toggle('chg',Math.abs(get()-o.def)>1e-9);if(o.after)o.after();};
  inp.value=get();val.textContent=show();inp.oninput=()=>put(+inp.value);if(o.change)inp.onchange=o.change;
  lb.title='Double-click to reset';lb.ondblclick=()=>{put(o.def);if(o.change)o.change();};
  typable(val,{label:o.label,get,put:v=>{put(v);if(o.change)o.change();},min:+o.min,max:+o.max,show});
  hd.append(lb);if(o.tip){const q=el('button','q','?');q.type='button';q.dataset.tip=o.tip;q.setAttribute('aria-label',o.label+': '+o.tip);hd.append(q);}hd.append(val);w.append(hd,inp);det.append(w);
  w.dataset.def=o.def;const cx=el('button','cx');cx.type='button';cx.dataset.tip='Changed – click to put it back';cx.setAttribute('aria-label',`${o.label} – changed; put it back`);
  cx.onclick=e=>{e.stopPropagation();put(o.def);if(o.change)o.change();};w.append(cx);const mark=()=>w.classList.toggle('chg',Math.abs(get()-o.def)>1e-9);mark();
  inp.addEventListener('input',mark);const put0=put;return{inp,val,put:v=>{put0(v);mark();}};}
/* the shape of the frame a piece sits in now – to know which way it can be moved inside it */
function frameAspect(it){const o=cur&&cur.ops.find(q=>q.item===it&&q.rect&&q.rect.w>1);if(o)return o.rect.w/o.rect.h;
  const [W,H]=size();return S.layout==='one'&&S.oneFit==='bleed'?W/H:E.ratioOf(S,items);}
/* A piece's own settings (0.9). What it is comes first – in Slides, whether it's a slide of its own or sits on the
   one before – then groups in the panel's own terms (a rule, a bold title, a chevron; each remembered open or shut
   for every piece): Timing, Position or Crop, Look, Plays, and the Caption, shut until wanted. */
const DET_SHUT={caption:true,timing:true,look:true,plays:true};   /* 0.14: open are the ones you drag on the canvas – Position, Crop (and a layer's Layer) */
function itemDetail(it,i){const det=el('div','slot-det'),one=S.layout==='one',layer=isLayer(it,i);let cur=det;
  const qm=(w,label,tip)=>{if(!tip)return;const q=el('button','q','?');q.type='button';q.dataset.tip=tip;q.setAttribute('aria-label',label+': '+tip);w.append(q);};
  /* a group: shut or open the same for every piece, its blue dot when shut and something inside has changed */
  const grp=(id,title,dot,sum)=>{const box=el('div','fold det-fold'),hd=el('button','fold-head'),body=el('div','fold-body'),ch=el('span','chev');hd.type='button';ch.innerHTML=CHEV;
    const key='piece:'+id,open=FOLDS[key]!=null?FOLDS[key]:!DET_SHUT[id],paint=o=>{body.hidden=!o;hd.setAttribute('aria-expanded',o);if(o)requestAnimationFrame(()=>syncRanges(body));};paint(open);
    hd.onclick=()=>{const o=body.hidden;FOLDS[key]=o;LS.set('folds',FOLDS);paint(o);};const sm=el('span','sum');hd.append(el('span',null,title),el('span','cdot'),sm,ch);box.append(hd,body);det.append(box);cur=body;if(sum)try{sm.textContent=sum()||'';}catch(e){}
    box._mark=()=>hd.classList.toggle('chg',!!(dot?dot():body.querySelector('.chg')));return box;};
  const groups=[];const G=(id,title,dot,sum)=>{const g=grp(id,title,dot,sum);groups.push(g);return g;};
  /* a choice of this piece's own, with a start value (for its change dot) */
  const pick=(label,key,opts,def,tip,after)=>{const w=el('div','ctl sel'),hd=el('div','ctl-head'),lb=el('label',null,label),s=el('select');s.id=`i_${key}_${it.id}`;lb.htmlFor=s.id;
    for(const [v,t] of opts){const o=el('option',null,t);o.value=v;s.append(o);}s.value=opts.some(o=>o[0]===it[key])?it[key]:def;
    const mark=()=>w.classList.toggle('chg',s.value!==def);s.onchange=()=>{it[key]=s.value;saveItems();dirty=true;mark();if(after)after();else{paintMediaKeepFocus();refreshAll();}};
    const cx=el('button','cx');cx.type='button';cx.dataset.tip='Changed – click to put it back';cx.setAttribute('aria-label',`${label} – changed; put it back`);cx.onclick=e=>{e.stopPropagation();s.value=def;s.onchange();};
    hd.append(lb);qm(hd,label,tip);w.append(hd,s,cx);cur.append(w);mark();return s;};
  const hint=t=>{const p=el('p','hint',t);cur.append(p);return p;};
  const moved=()=>(+it.px||0)!==0||(+it.py||0)!==0||(+it.ox||0)!==0||(+it.oy||0)!==0||(it.zm!=null&&+it.zm!==100)||(it.fz!=null&&+it.fz!==100);
  const resetRow=()=>{if(!moved())return;const row=el('div','btn-row'),rs=el('button','pill small','Reset');rs.type='button';rs.dataset.tip='Put it back where it was';rs.onclick=()=>{for(const k of ['px','py','ox','oy'])it[k]=0;it.zm=100;it.fz=100;saveItems();dirty=true;paintMediaKeepFocus();};row.append(rs);cur.append(row);};
  const base=()=>{for(let j=i-1;j>=0;j--)if(!isLayer(items[j],j))return items[j];return null;};
  /* Slides: is it a slide of its own, or on the one before? – first, because everything else follows from it */
  /* Slides: a piece is a slide, or a layer on the piece above it in the list (0.11: a switch in plain words – it was
     'Sits: Its own slide / On the one before'). A blend turns it into a layer by itself, so the blend has something to work on. */
  if(one&&i>0){const above=base(),tr=el('div','toggle-row layer-sw'),tb=el('button','toggle');tb.type='button';tb.setAttribute('role','switch');tb.setAttribute('aria-checked',it.join==='on');
    tb.setAttribute('aria-label','Layer on the piece above');tb.append(el('span','box'),el('span',null,'Layer on above'));
    tb.onclick=()=>{it.join=it.join==='on'?'own':'on';saveItems();dirty=true;paintMediaKeepFocus();refreshAll();};tr.append(tb);
    qm(tr,'Layer on the piece above',`Off: it’s a slide of its own, in its turn. On: it sits on ${above?above.name:'the piece above'} – in front or behind, placed and sized anywhere, blended with it – and comes and goes with it.`);det.append(tr);}
  if(layer){
    G('layer','Layer');
    pick('Order','place',[['front','In front'],['behind','Behind']],'front','In front of the slide, or behind it – behind shows where the slide is see-through or blended');
    pick('Fit','lfit',[['own','As it is'],['fill','Fill the slide']],'own','As it is: all of it, fitted inside the slide, at the size below. Fill the slide: cropped to cover it.');
    /* a build: it can arrive after its slide has landed, and stays until the slide goes */
    pick('Arrives','lin',[['with','With the slide'],['fade','Fades in'],['rise','Rises in'],['grow','Grows in'],['cut','Cuts in']],'with','With the slide, or on its own after the slide has landed – a build, as in a deck. It leaves with the slide.');
    if((it.lin||'with')!=='with'){itemRange(cur,it,{label:'After',key:'lafter',min:0,max:8,step:.05,def:.3,unit:' s',tip:'How long after the slide has landed'});
      if(it.lin!=='cut')itemRange(cur,it,{label:'Over',key:'lover',min:.1,max:2,step:.05,def:.6,unit:' s'});}
    G('position','Position');
    itemRange(cur,it,{label:'Across',key:'ox',min:-1200,max:1200,step:1,def:0,unit:' px'});itemRange(cur,it,{label:'Up and down',key:'oy',min:-1200,max:1200,step:1,def:0,unit:' px'});
    itemRange(cur,it,{label:'Size',key:'zm',min:5,max:400,step:1,def:100,unit:'%',tip:'100%: as big as fits the slide (or fills it)'});
    hint('Or drag it on the canvas – its corners scale it; the arrow keys nudge it.');resetRow();}
  else{
    /* Slides: this slide's own time, transition and movement – each says what it falls back to */
    if(one){G('timing','Timing',null,()=>[+it.hold>0?`${+(+it.hold).toFixed(2)} s`:'',it.arrive&&it.arrive!=='default'?optLabel(MOVES_ONE,it.arrive):'',it.moves&&it.moves!=='default'?optLabel(KB,it.moves):''].filter(Boolean).join(' · ')||'As set');
      const r=itemRange(cur,it,{label:'On screen',key:'hold',min:0,max:Math.max(12,Math.ceil(+it.dur||0)),step:.05,def:0,
        fmt:v=>v>0?`${+v.toFixed(2)} s`:`As set · ${+(+S.hold).toFixed(2)} s`,after:refreshAll,tip:'This slide’s own time on screen. 0 – or double-click the name – for the time set in Motion.'});
      if(it.kind==='video'){const row=el('div','btn-row'),b=el('button','pill small','Whole clip');b.type='button';b.dataset.tip='Stays on screen long enough for the clip to play from In to Out, transitions included';
        b.onclick=()=>{const tr=S.oneMove==='cut'?0:+S.dur||0,st=+it.start||0,en=+it.end>st+.05?+it.end:+it.dur||1;r.put(Math.max(.2,+((en-st)-2*tr).toFixed(2)));};row.append(b);cur.append(row);}
      pick('Transition','arrive',[['default',`As set · ${optLabel(MOVES_ONE,S.oneMove)}`]].concat(MOVES_ONE.map(o=>[o[0],o[1]])),'default',null,()=>refreshAll());
      pick('Movement','moves',[['default',`As set · ${optLabel(KB,S.kb)}`]].concat(KB.filter(o=>o[0]!=='vary'&&!(S.oneFit==='bleed'&&o[0]==='parallax')).map(o=>[o[0],o[1]])),'default',null,()=>refreshAll());}
    /* where it sits: As it is moves the slide itself; anything cropped moves the picture inside its frame */
    const own=one&&S.oneFit==='own',shp=one&&S.oneFit==='shape',crop=!own&&(S.fit!=='fit'||(one&&S.oneFit==='bleed'));
    /* In a shape (0.13): the shape itself – where it sits and how big, for this slide */
    if(shp){G('position','Position');
      itemRange(cur,it,{label:'Across',key:'ox',min:-1200,max:1200,step:1,def:0,unit:' px'});itemRange(cur,it,{label:'Up and down',key:'oy',min:-1200,max:1200,step:1,def:0,unit:' px'});
      itemRange(cur,it,{label:'Size',key:'fz',min:20,max:400,step:1,def:100,unit:'%',tip:'This slide’s shape bigger or smaller than the rest'});
      hint('Or drag the shape on the canvas – its corners size it; the arrow keys nudge it.');if(!crop)resetRow();}
    if(own||crop){G(own?'position':'crop',own?'Position':'Crop');const again=()=>paintMediaKeepFocus();
      if(own){itemRange(cur,it,{label:'Across',key:'ox',min:-1200,max:1200,step:1,def:0,unit:' px'});itemRange(cur,it,{label:'Up and down',key:'oy',min:-1200,max:1200,step:1,def:0,unit:' px'});
        itemRange(cur,it,{label:'Size',key:'zm',min:20,max:400,step:1,def:100,unit:'%',tip:'This slide bigger or smaller than the rest'});
        hint('Or drag it on the canvas – its corners scale it; the arrow keys nudge it.');}
      else{const fa=frameAspect(it),ia=it.w&&it.h?it.w/it.h:fa,zoomed=(+it.zm||100)>100.5,wide=ia>fa*1.005,tall=ia<fa/1.005;
        if(zoomed||wide)itemRange(cur,it,{label:'Across',key:'px',min:-100,max:100,step:1,def:0,unit:'%',tip:'Which part shows across: −100% the right edge, 100% the left'});
        if(zoomed||tall)itemRange(cur,it,{label:'Up and down',key:'py',min:-100,max:100,step:1,def:0,unit:'%',tip:'Which part shows up and down: −100% the bottom, 100% the top'});
        itemRange(cur,it,{label:'Zoom',key:'zm',min:100,max:400,step:1,def:100,unit:'%',change:again,tip:'Crop in tighter. Zoomed in, it can move both ways.'});
        hint(!zoomed&&!wide&&!tall?'It fits its frame exactly – zoom in to move it.':shp?'Or on the canvas: drag the ring at its centre to move the picture in its shape – double-click to zoom it too.':'Or drag it on the canvas to move it in its frame – double-click to zoom it too; the arrow keys nudge it.');}
      resetRow();}}
  /* its own blend and opacity – and, once it blends, what it blends with */
  G('look','Look',null,()=>[it.blend&&it.blend!=='normal'?optLabel(BLENDS,it.blend):'',it.opa!=null&&+it.opa<100?`${Math.round(+it.opa)}%`:''].filter(Boolean).join(' · ')||'Normal');
  pick('Blend','blend',BLENDS,'normal','How it mixes with what’s beneath. Multiply darkens – white goes clear, so a scan or a texture sits into what’s under it. Screen lightens – black goes clear. Overlay deepens contrast; Difference flips colours.',()=>{
    /* Slides: a blend works on the piece above by itself – it becomes a layer on it, filling it (0.11) */
    if(one&&i>0&&!layer&&it.blend&&it.blend!=='normal'){const b=base();it.join='on';if(!it.lfit)it.lfit='fill';itemFold=true;try{saveItems();}finally{itemFold=false;}dirty=true;toast(`${it.name} is now a layer on ${b?b.name:'the piece above'}, so the blend works on it`);refreshAll();seekTo(it);}
    paintMediaKeepFocus();});
  if(it.blend&&it.blend!=='normal'){const b=layer?base():null;
    hint(layer?(it.place==='behind'?`Behind ${b?b.name:'its slide'} – it shows where that’s see-through or blended.`:`Mixes with ${b?b.name:'its slide'}, beneath it.`):'Mixes with the background.');}
  itemRange(cur,it,{label:'Opacity',key:'opa',min:0,max:100,step:1,def:100,unit:'%',change:()=>paintMediaKeepFocus()});
  /* video: where it plays from and to, seen as frames (0.6) – and how its colours are read */
  if(it.kind==='video'){G('plays','Plays',null,()=>{const a=+it.start||0,b=+it.end>a+.05?+it.end:+it.dur||0;return `${a.toFixed(1)}–${b.toFixed(1)} s`;});trimBlock(cur,it);
    const tr=el('div','toggle-row'),tb=el('button','toggle');tb.type='button';tb.setAttribute('role','switch');tb.setAttribute('aria-checked',!!it.levels);tb.setAttribute('aria-label','Lift washed-out colours');tb.append(el('span','box'),el('span',null,'Lift washed-out colours'));
    tb.onclick=()=>{it.levels=!it.levels;tb.setAttribute('aria-checked',it.levels);saveItems();dirty=true;};tr.append(tb);qm(tr,'Lift washed-out colours','For video whose greys look lifted and colours dull – it says it’s full range when it isn’t (Tempo’s promo MP4s up to 0.11.1). Reads it as video range.');cur.append(tr);}
  /* the caption – useful, but rarely: shut until opened, with a dot when it has words (a layer goes with its slide's) */
  if(S.capOn&&!layer){G('caption','Caption',()=>it.title||it.line||it.tags,()=>String(it.title||it.line||it.tags||'None').split('\n')[0]);
    const txt=(label,key,multi,ph)=>{const w=el('div','ctl txt'),hd=el('div','ctl-head'),lb=el('label',null,label),inp=el(multi?'textarea':'input');if(!multi)inp.type='text';else inp.rows=2;
      inp.id=`i_${key}_${it.id}`;lb.htmlFor=inp.id;inp.value=it[key]||'';inp.placeholder=ph||'';inp.spellcheck=false;
      inp.oninput=()=>{it[key]=inp.value;E.resetMeasure();dirty=true;saveItems();};inp.onchange=()=>{paintMediaKeepFocus();refreshAll();};hd.append(lb);w.append(hd,inp);cur.append(w);};
    txt('Title','title',true,'A title – Enter for a new line');txt('Line','line',true,'A line under it');txt('Tags','tags',false,'Tags, split with commas');}
  groups.forEach(g=>g._mark());
  /* its foot (0.10): Duplicate on the left; Move up and down as two small arrows, bottom right */
  const r=el('div','det-end'),dup=el('button','pill small'),up=el('button','pill small icon arrow'),dn=el('button','pill small icon arrow');dup.type=up.type=dn.type='button';
  dup.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="1.5" y="3.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4 1.5h5a1.5 1.5 0 0 1 1.5 1.5v5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg><span>Duplicate</span>';
  dup.dataset.tip='A copy, settings and all, straight after it – ⌘D on the canvas';dup.setAttribute('aria-label','Duplicate '+it.name);dup.onclick=()=>duplicateItem(it.id);
  up.innerHTML=ARROW['-1'];dn.innerHTML=ARROW['1'];up.setAttribute('aria-label','Move up');dn.setAttribute('aria-label','Move down');up.dataset.tip='Move up';dn.dataset.tip='Move down';
  up.disabled=i===0;dn.disabled=i===items.length-1;up.onclick=()=>moveItem(it.id,i-1);dn.onclick=()=>moveItem(it.id,i+1);
  const arr=el('div','det-arrows');arr.append(up,dn);r.append(dup,arr);det.append(r);
  return det;}
/* A clip's In and Out (0.6): a bar the length of the clip with its frames along it, the part that
   plays lit; drag either end, or the lit part to slide both. The frames at In and Out show under
   it, and a tick follows the clip while it's on the canvas. Start at and End at below take typing. */
function probeOf(it){if(!it._probe){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=it.el.src;it._probe=v;}return it._probe;}
function onProbe(it,fn){if(!it.el)return Promise.resolve();it._chain=(it._chain||Promise.resolve()).then(()=>fn(probeOf(it))).catch(()=>{});return it._chain;}
async function probeAt(v,t){if(v.readyState<2)await new Promise(r=>{const f=()=>{v.removeEventListener('loadeddata',f);r();};v.addEventListener('loadeddata',f);setTimeout(f,4000);});
  const d=v.duration||1;t=clamp(t,0,Math.max(0,d-.03));if(Math.abs(v.currentTime-t)<.01)return;
  await new Promise(r=>{const f=()=>{v.removeEventListener('seeked',f);r();};v.addEventListener('seeked',f);v.currentTime=t;setTimeout(f,2000);});}
function coverDraw(c,src,x0,w0){const x=c.getContext('2d'),iw=src.videoWidth||1,ih=src.videoHeight||1,W=w0||c.width,H=c.height,k=Math.max(W/iw,H/ih);x.save();x.beginPath();x.rect(x0||0,0,W,H);x.clip();x.drawImage(src,(x0||0)+(W-iw*k)/2,(H-ih*k)/2,iw*k,ih*k);x.restore();}
function trimBlock(det,it){const dur=Math.max(.1,+it.dur||1);
  const box=el('div','trim'),bar=el('div','trim-bar'),strip=el('canvas','trim-strip'),win=el('div','trim-win'),head=el('span','trim-head');
  strip.width=320;strip.height=36;win.append(el('span','trim-h in'),el('span','trim-h out'));bar.append(strip,win,head);head.hidden=true;
  bar.setAttribute('role','group');bar.setAttribute('aria-label','Where the clip plays – drag its ends');bar.dataset.tip='The clip, start to end – the lit part plays. Drag an end, or the lit part to slide both.';
  const chips=el('div','trim-chips'),cIn=el('span','chip'),cOut=el('span','chip'),cLen=el('span','chip');chips.append(cIn,cOut,cLen);
  const frame=label=>{const w=el('div','trim-frame'),c=el('canvas');c.width=176;c.height=100;const t=el('span',null,label);w.append(c,t);return{w,c,t};},fIn=frame('In'),fOut=frame('Out');
  const fr=el('div','trim-frames');fr.append(fIn.w,fOut.w);
  det.append(el('div','sub-head','Plays'));box.append(bar,chips,fr);det.append(box);
  const span=()=>{const st=clamp(+it.start||0,0,dur),en=+it.end>st+.05?Math.min(+it.end,dur):dur;return[st,en];};
  let fT=0;const frames=()=>{clearTimeout(fT);fT=setTimeout(()=>{const [a,b]=span();onProbe(it,async v=>{await probeAt(v,a);coverDraw(fIn.c,v);await probeAt(v,Math.max(a,b-.04));coverDraw(fOut.c,v);});},90);};
  const show=()=>{const [a,b]=span();win.style.left=(a/dur*100)+'%';win.style.width=((b-a)/dur*100)+'%';cIn.textContent=`In ${a.toFixed(2)} s`;cOut.textContent=`Out ${b.toFixed(2)} s`;
    cLen.textContent=`${(b-a).toFixed(2)} of ${dur.toFixed(1)} s`;fIn.t.textContent=`In · ${a.toFixed(2)} s`;fOut.t.textContent=`Out · ${b.toFixed(2)} s`;};
  /* see the piece on the canvas while setting it */
  const into=()=>{if(!(cur&&cur.ops.some(o=>o.item===it)))seekTo(it);selId=it.id;dirty=true;};
  const changed=()=>{show();frames();into();};
  const rs=itemRange(det,it,{label:'Start at',key:'start',min:0,max:dur,step:.04,def:0,fmt:v=>`${v.toFixed(2)} s`,after:changed,change:()=>paintMediaKeepFocus()});
  const re=itemRange(det,it,{label:'End at',key:'end',min:0,max:dur,step:.04,def:0,fmt:v=>v>(+it.start||0)+.05?`${v.toFixed(2)} s`:`The end · ${dur.toFixed(2)} s`,after:changed,change:()=>paintMediaKeepFocus(),tip:'Where it stops and loops back to Start at. 0 – or double-click the name – plays to the end of the clip.'});
  bar.onpointerdown=e=>{e.preventDefault();const bb=bar.getBoundingClientRect(),tAt=cx=>clamp((cx-bb.left)/bb.width,0,1)*dur,[a0,b0]=span(),t0=tAt(e.clientX),tol=10/bb.width*dur;
    const mode=Math.abs(t0-a0)<=tol?'in':Math.abs(t0-b0)<=tol?'out':(t0>a0&&t0<b0)?'both':t0<a0?'in':'out';bar.setPointerCapture(e.pointerId);bar.classList.add('drag');
    const mv=ev=>{const t=tAt(ev.clientX);if(mode==='in')rs.put(+clamp(t,0,b0-.1).toFixed(2));else if(mode==='out')re.put(+clamp(t,a0+.1,dur).toFixed(2));else{const d=clamp(t-t0,-a0,dur-b0);rs.put(+(a0+d).toFixed(2));re.put(+(b0+d).toFixed(2));}};
    mv(e);bar.onpointermove=mv;bar.onpointerup=bar.onpointercancel=()=>{bar.onpointermove=null;bar.classList.remove('drag');paintMediaKeepFocus();};};
  show();frames();trims.push({it,head});
  /* the frames along the bar, once */
  if(it._strip){strip.getContext('2d').drawImage(it._strip,0,0);}
  else onProbe(it,async v=>{const c=document.createElement('canvas');c.width=strip.width;c.height=strip.height;const n=8,w=c.width/n;
    for(let j=0;j<n;j++){await probeAt(v,(j+.5)/n*dur);coverDraw(c,v,j*w,w);}it._strip=c;for(const s2 of document.querySelectorAll('.trim-strip'))if(s2.closest('.slot')&&s2.closest('.slot').dataset.id===it.id)s2.getContext('2d').drawImage(c,0,0);});}
function paintMediaKeepFocus(){const a=document.activeElement,id=a&&a.id;paintMedia();if(id){const n=document.getElementById(id);if(n)n.focus();}}
/* Canvas (0.7): its size, then what's behind everything – Background is one group, colour and image
   together. Frame rate is a setting of the MP4, so it sits in Export with the rest of the file. */
{const b=card('canvas','Canvas');
  build(b,[{t:'seg',k:'cSize',label:'Format',opts:[['4:5','4:5'],['9:16','9:16'],['1:1','1:1'],['16:9','16:9'],['4:3','4:3'],['custom','Custom']]},
    {t:'nums',keys:['cW','cH'],names:['W','H'],label:'Pixels',min:64,max:4096,show:s=>s.cSize==='custom'}]);
  const bf=fold(b,'background','Background',null,false,s=>[String(s.bg).toUpperCase(),PICS.bg?'image':''].filter(Boolean).join(' · '));
  build(bf,[{t:'colour',k:'bg',label:'Colour'}]);picRow(bf,'bg',null,'Image');
  build(bf,[{t:'seg',k:'bgFit',label:'Image fit',opts:[['fill','Fill the canvas'],['fit','Fit inside']],show:()=>!!PICS.bg},
    {t:'range',k:'bgImgA',label:'Image strength',min:0,max:100,step:1,unit:'%',show:()=>!!PICS.bg}]);
  SUMMARY.canvas=s=>{const [W,H]=E.canvasSize(s);return `${W} × ${H}`+(PICS.bg?' · image':'');};}
/* Motion: the kind first, then only what that kind uses */
const KINDS=[['one','Slides','A slide at a time – full bleed, as it is or in a shape, with a transition and a little movement in each'],['line','Line','A row or a column of shapes, moving along'],['grid','Grid','Rows of shapes, moving together'],
  ['wall','Wall','A camera snapping across a wall of shapes – the columns and rows are yours'],['columns','Columns','Each column running up or down on its own – each at its own speed if you like'],['rows','Rows','Each row running left or right on its own – each at its own speed if you like'],['frames','Frames','The frames stay put and the media changes inside them'],['float','Float','Shapes drifting past at different depths']];
const KIND_ICON={
  one:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="11" y="5" width="18" height="18" rx="2"/><rect x="33" y="8" width="7" height="12" rx="1.5" class="dim"/></svg>',
  line:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="1" y="8" width="10" height="12" rx="1.5" class="dim"/><rect x="15" y="8" width="10" height="12" rx="1.5"/><rect x="29" y="8" width="10" height="12" rx="1.5" class="dim"/></svg>',
  grid:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="5" y="3" width="9" height="9" rx="1.5"/><rect x="16" y="3" width="9" height="9" rx="1.5"/><rect x="27" y="3" width="9" height="9" rx="1.5"/><rect x="5" y="15" width="9" height="9" rx="1.5" class="dim"/><rect x="16" y="15" width="9" height="9" rx="1.5" class="dim"/><rect x="27" y="15" width="9" height="9" rx="1.5" class="dim"/></svg>',
  columns:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="5" y="-2" width="9" height="13" rx="1.5"/><rect x="5" y="14" width="9" height="13" rx="1.5" class="dim"/><rect x="16" y="5" width="9" height="13" rx="1.5" class="dim"/><rect x="16" y="21" width="9" height="13" rx="1.5"/><rect x="27" y="-6" width="9" height="13" rx="1.5" class="dim"/><rect x="27" y="10" width="9" height="13" rx="1.5"/></svg>',
  rows:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="-3" y="2" width="13" height="7" rx="1.5"/><rect x="13" y="2" width="13" height="7" rx="1.5" class="dim"/><rect x="29" y="2" width="13" height="7" rx="1.5"/><rect x="4" y="11" width="13" height="7" rx="1.5" class="dim"/><rect x="20" y="11" width="13" height="7" rx="1.5"/><rect x="36" y="11" width="13" height="7" rx="1.5" class="dim"/><rect x="-6" y="20" width="13" height="7" rx="1.5" class="dim"/><rect x="10" y="20" width="13" height="7" rx="1.5"/><rect x="26" y="20" width="13" height="7" rx="1.5" class="dim"/></svg>',
  frames:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="3" y="6" width="10" height="16" rx="1" class="line"/><rect x="5.5" y="8.5" width="5" height="7" rx="1"/><rect x="15" y="6" width="10" height="16" rx="1" class="line"/><rect x="17.5" y="8.5" width="5" height="7" rx="1"/><rect x="27" y="6" width="10" height="16" rx="1" class="line"/><rect x="29.5" y="8.5" width="5" height="7" rx="1"/></svg>',
  float:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="4" y="13" width="7" height="9" rx="1.2" class="dim"/><rect x="14" y="2" width="12" height="15" rx="1.5"/><rect x="29" y="11" width="6" height="7" rx="1" class="dim"/><rect x="24" y="20" width="9" height="11" rx="1.5"/></svg>',
  wall:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="2" y="2" width="9" height="11" rx="1.5" class="dim"/><rect x="13" y="2" width="9" height="11" rx="1.5" class="dim"/><rect x="24" y="2" width="9" height="11" rx="1.5" class="dim"/><rect x="2" y="15" width="9" height="11" rx="1.5" class="dim"/><rect x="13" y="15" width="9" height="11" rx="1.5"/><rect x="24" y="15" width="9" height="11" rx="1.5"/><rect x="34.5" y="15" width="9" height="11" rx="1.5" class="dim"/><rect x="34.5" y="2" width="9" height="11" rx="1.5" class="dim"/></svg>'};
function pickKind(k){if(k==='line')k=['up','down'].includes(S.dir)?'column':'row';if(S.layout!==k){set('layout',k);clock=0;}}
function kindTiles(parent){const w=el('div','ctl kinds-ctl'),hd=el('div','ctl-head'),g=el('div','kinds');hd.append(el('span',null,'Kind'));g.setAttribute('role','group');g.setAttribute('aria-label','Kind');
  const bs=KINDS.map(([v,t,tip])=>{const b=el('button','kind');b.type='button';b.innerHTML=KIND_ICON[v];b.append(el('span',null,t));b.dataset.tip=tip;b.onclick=()=>pickKind(v);g.append(b);return[v,b];});
  w.append(hd,g);parent.append(w);controls.push({d:{},w,update(){const k=KIND(S);bs.forEach(([v,b])=>b.setAttribute('aria-pressed',v===k));}});}
const MOVES_ONE=[['cut','Cut','Straight to the next'],['fade','Fade','One into the next'],['dip','Dip','Out to the background, then up into the next'],['wipe','Wipe','A straight edge crosses the canvas'],
  ['slide','Push','The next pushes this one out'],['stack','Cover','The next slides in over this one'],['open','Open','A window opens from the middle onto the next'],['zoom','Zoom','This one grows away as the next fades up'],
  ['through','Through','The next comes up from a small card in the middle as this one carries on past – it has its own curve, so there’s no Feel']];
const KB=[['none','None'],['in','Zoom in'],['out','Zoom out'],['drift','Drift','Across, the way Direction says'],['parallax','Parallax','The frame one way, the picture the other'],['vary','Vary','Takes turns: in, across, out, back']];
const FITS=[['bleed','Full bleed','Each slide fills the canvas, cropped to it'],['own','As it is','Each slide keeps its own shape, on the background'],['shape','In a shape','Every slide in the same shape – set it in Shapes']];
const oneTravels=s=>['slide','stack','wipe'].includes(s.oneMove);
const oneFeels=s=>['slide','stack','wipe','open','zoom'].includes(s.oneMove);
const itemMoves=()=>items.some(it=>it.moves&&it.moves!=='default'&&it.moves!=='none');
const kbOn=s=>s.kb!=='none'||itemMoves();
const kbDrifts=s=>['drift','parallax','vary'].includes(s.kb)||items.some(it=>it.moves==='drift'||it.moves==='parallax');
const MOVES_TRACK=[['step','Step','Move a shape at a time, then rest'],['drift','Drift','Keep moving, never stopping'],['still','Still','No moves – the video plays']];
const MOVES_FRAME=[['push','Push','The next pushes this one out of the frame'],['cover','Cover','The next slides in over this one'],['fade','Fade'],['cut','Cut'],['still','Still','No changes – the video plays']];
const FEELS=[['snap','Snap','A slow start, a fast throw, a long settle'],['glide','Glide','Eases in and out'],['soft','Soft','A gentle ease in and out'],['coast','Coast','A quick push, then a long glide in'],['inertia','Inertia','A flick that coasts to a stop'],['spring','Spring','A touch past, then settles'],['linear','Linear','An even speed']];
const DIR4=[['left','Left'],['right','Right'],['up','Up'],['down','Down']];
const dirOpts=()=>KIND(S)==='grid'?[['up','Up'],['down','Down']]:DIR4;
function pickDir(v){if(KIND(S)==='line'){S.dir=v;set('layout',v==='left'||v==='right'?'row':'column');return;}set('dir',v);}
const showDir=s=>{const k=KIND(s);if(k==='one')return oneTravels(s)||kbDrifts(s);if(k==='frames')return stepping(s)&&(s.fMove==='push'||s.fMove==='cover');if(k==='columns'||k==='rows')return false;return mv(s)!=='still';};
const kindName=s=>optLabel(KINDS,KIND(s));
/* Columns and Rows (0.9): a pattern for every strip's way and speed, or each its own */
const dirsOpts=()=>KIND(S)==='rows'?[['alt','Alternate','Right, left, right…'],['up','All left'],['down','All right'],['own','Each its own','Set each row’s way and speed below']]
  :[['alt','Alternate','Down, up, down…'],['up','All up'],['down','All down'],['own','Each its own','Set each column’s way and speed below']];
const speedsOpts=()=>mv(S)==='drift'?[['same','Same'],['varied','Varied','Two, three and four times round a loop'],['own','Each its own','Set each one’s speed below – 0 holds it still']]
  :[['same','Same'],['own','Each its own','Shapes a move, set each below – 0 holds one still']];
/* making a pattern your own starts from what it was doing, so nothing jumps */
function stripsOwn(key,v,pre,eff){if(v===S[key])return;group(key==='colDir'?'Directions':'Speeds',()=>{if(v==='own')for(let c=0;c<8;c++)set(pre+c,eff(c),true);set(key,v,true);});refreshAll();}
const ARROW={'-1':'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10V2M2.8 5.2 6 2l3.2 3.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  '1':'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M2.8 6.8 6 10l3.2-3.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'};
function stripsList(parent){
  const show=s=>isK('columns','rows')(s)&&mv(s)!=='still'&&(s.colDir==='own'||s.colSpeed==='own');
  const word=()=>KIND(S)==='rows'?'Row':'Column',sp=k=>k?(k===1?'1×':k+'×'):'Still';
  const body=fold(parent,'strips','Each column',show,false,s=>{const C=Math.min(8,Math.round(+s.cols)||3),out=[];for(let c=0;c<C;c++)out.push(sp(E.stripSpeed(s,c)));return out.join(' · ');});
  const lab=body.previousElementSibling.querySelector('span');
  controls.push({d:{},w:lab,update(){const t=KIND(S)==='rows'?'Each row':'Each column';if(lab.textContent!==t)lab.textContent=t;}});
  for(let c=0;c<8;c++){
    const w=el('div','ctl stp strip'),hd=el('div','ctl-head'),lb=el('label'),g=el('div','strip-g'),way=el('div','way'),stp=el('div','stp-g'),mi=el('button'),val=el('span','val'),pl=el('button');
    w.dataset.k='ss'+c;mi.type=pl.type='button';mi.innerHTML=ICON.minus;pl.innerHTML=ICON.plus;
    const bs=[-1,1].map(v=>{const b=el('button');b.type='button';b.dataset.v=v;b.onclick=()=>{if(E.stripWay(S,c)===v&&S.colDir==='own')return;
      group(`${word()} ${c+1}`,()=>{if(S.colDir!=='own'){for(let q=0;q<8;q++)set('sd'+q,E.stripWay(S,q),true);set('colDir','own',true);}set('sd'+c,v,true);});refreshAll();};way.append(b);return b;});
    const speed=v=>{const k=clamp(Math.round(v),0,8);group(`${word()} ${c+1}`,()=>{if(S.colSpeed!=='own'){for(let q=0;q<8;q++)set('ss'+q,E.stripSpeed(S,q),true);set('colSpeed','own',true);}set('ss'+c,k,true);});refreshAll();};
    mi.onclick=()=>speed(E.stripSpeed(S,c)-1);pl.onclick=()=>speed(E.stripSpeed(S,c)+1);
    typable(val,{label:`Speed – ${word()} ${c+1}`,get:()=>E.stripSpeed(S,c),put:speed,min:0,max:8,show:()=>sp(E.stripSpeed(S,c))});
    stp.append(mi,val,pl);g.append(way,stp);hd.append(lb);w.append(hd,g);body.append(w);
    const ctl={d:{k:'ss'+c,keys:['sd'+c,'ss'+c],min:0,max:8,label:`${word()} ${c+1}`,show:s=>c<Math.min(8,Math.round(+s.cols)||3)},w,update(){
      const W=word(),rows=W==='Row',dir=E.stripWay(S,c),k=E.stripSpeed(S,c);ctl.d.label=`${W} ${c+1}`;ctl.d.keys=(S.colDir==='own'?['sd'+c]:[]).concat(S.colSpeed==='own'?['ss'+c]:[]);
      if(lb.textContent!==ctl.d.label)lb.textContent=ctl.d.label;
      bs.forEach(b=>{const v=+b.dataset.v,name=rows?(v<0?'left':'right'):(v<0?'up':'down');b.innerHTML=ARROW[v];b.firstChild.style.transform=rows?'rotate(-90deg)':'';
        b.setAttribute('aria-label',`${W} ${c+1} – ${name}`);b.dataset.tip=name[0].toUpperCase()+name.slice(1);b.setAttribute('aria-pressed',dir===v);});
      way.classList.toggle('held',k===0);if(!val.classList.contains('editing'))val.textContent=sp(k);mi.disabled=k<=0;pl.disabled=k>=8;
      mi.setAttribute('aria-label',`Slower – ${W} ${c+1}`);pl.setAttribute('aria-label',`Faster – ${W} ${c+1}`);}};
    controls.push(ctl);addCx(ctl,w);}}
const PATHS=[['across','Across','Straight along, the way Direction says'],['diagonal','Diagonal','Both ways at once: along, and a quarter turn round'],['stairs','Stairs','Along, then a quarter turn, again and again'],['square','Square','Round a square and back to the start']];
/* What a Feel draws, so it can be seen and not guessed: the move runs left to right, how far it has got goes up */
function feelPic(parent,key,show){
  const NS='http://www.w3.org/2000/svg',row=el('div','feel-pic'),svg=document.createElementNS(NS,'svg'),base=document.createElementNS(NS,'path'),curve=document.createElementNS(NS,'path'),cap=el('span','fp-cap');
  svg.setAttribute('viewBox','0 0 120 44');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
  base.setAttribute('d','M0 38H120M0 6H120');base.setAttribute('class','fp-base');curve.setAttribute('class','fp-curve');svg.append(base,curve);row.append(svg,cap);
  let had='';const c=addCustom(parent,show,row);
  c.update=()=>{const k=S[key];if(k===had)return;had=k;const f=E.feel(k);let d='';for(let i=0;i<=48;i++){const x=i/48;d+=(i?'L':'M')+(x*120).toFixed(1)+' '+(38-f(x)*32).toFixed(2);}
    curve.setAttribute('d',d);cap.textContent=(FEELS.find(o=>o[0]===k)||[])[2]||'';};
  return c;}
/* a small picture under a setting, drawn again only when what it shows changes: draw() gives its key, the SVG inside and a line of words */
function svgPic(parent,show,cls,viewBox,draw){
  const NS='http://www.w3.org/2000/svg',row=el('div',cls),svg=document.createElementNS(NS,'svg'),cap=el('span','fp-cap');
  svg.setAttribute('viewBox',viewBox);svg.setAttribute('aria-hidden','true');row.append(svg,cap);
  let had=null;const c=addCustom(parent,show,row);
  c.update=()=>{const r=draw();if(r.key===had)return;had=r.key;svg.innerHTML=r.svg;cap.textContent=r.cap||'';};
  return c;}
/* The Wall's route, drawn: dots for the tiles, a bigger one at each stop, arrows between them the way the shapes travel (one round of a square, two of the rest) */
function pathDraw(){
  const mvs=E.wallMoves(S),reps=S.wPath==='square'?1:2,pts=[[0,0]];
  for(let r=0;r<reps;r++)for(const m of mvs){const l=pts[pts.length-1];pts.push([l[0]+m[0],l[1]+m[1]]);}
  const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const cell=Math.min(20,110/(x1-x0+1.4),50/(y1-y0+1.4)),mx=60-(x0+x1)/2*cell,my=28-(y0+y1)/2*cell,at=q=>[mx+q[0]*cell,my+q[1]*cell];
  let svg='';
  for(let j=-8;j<=8;j++)for(let i=-8;i<=8;i++){const x=mx+i*cell,y=my+j*cell;if(x>1&&x<119&&y>1&&y<55)svg+=`<circle class="pp-dot" cx="${f1(x)}" cy="${f1(y)}" r="1.1"/>`;}
  for(let j=1;j<pts.length;j++){const a=at(pts[j-1]),b=at(pts[j]),dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,h=Math.min(3.6,L*.3),e=[b[0]-ux*3.8,b[1]-uy*3.8],s0=[a[0]+ux*3.4,a[1]+uy*3.4];
    svg+=`<path class="pp-line" d="M${f1(s0[0])} ${f1(s0[1])}L${f1(e[0])} ${f1(e[1])}M${f1(e[0]-ux*h-uy*h*.7)} ${f1(e[1]-uy*h+ux*h*.7)}L${f1(e[0])} ${f1(e[1])}L${f1(e[0]-ux*h+uy*h*.7)} ${f1(e[1]-uy*h-ux*h*.7)}"/>`;}
  pts.forEach((q,j)=>{const a=at(q);svg+=`<circle class="pp-stop${j?'':' first'}" cx="${f1(a[0])}" cy="${f1(a[1])}" r="${j?2:2.8}"/>`;});
  const pn=PATHS.find(o=>o[0]===S.wPath)||PATHS[0];
  return{key:[S.wPath,S.dir,S.wStep].join(),svg,cap:pn[2]};}
/* ---------------- little drawings (0.8) ----------------
   Pictures where a picture says it faster: what a transition does halfway, and what a preset is –
   its shapes where they sit, in its colours, and the way it moves. All of it drawn from the settings,
   so nothing here can drift from what the tool does. */
const DV={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]};
const lumOf=h=>{const m=String(h||'').replace('#','');if(m.length<6)return .5;const v=i=>parseInt(m.slice(i,i+2),16)/255;return .2126*v(0)+.7152*v(2)+.0722*v(4);};
/* a transition halfway, in a frame fw × fh going the way d says: the pieces – a the one leaving, b the one arriving, o an outline – each a rectangle */
function transMid(how,e,fw,fh,d,full){
  const tw=full?fw:fw*.6,th=full?fh:fh*.72,x=(fw-tw)/2,y=(fh-th)/2,u=DV[d]||DV.left,r=full?0:2,out=[];
  const T=(c,dx,dy,sc,o)=>{const w=tw*sc,h=th*sc;out.push({c,x:x+(tw-w)/2+dx,y:y+(th-h)/2+dy,w,h,o:o==null?1:o,r});};
  if(how==='cut')T('a',0,0,1);
  else if(how==='fade'){T('a',0,0,1,1-e);T('b',0,0,1,e);}
  else if(how==='dip')out.push({c:'o',x,y,w:tw,h:th,o:1,r});
  else if(how==='wipe'){const hz=u[1]===0,hf=(hz?fw:fh)/2;
    out.push(hz?{c:'a',x:u[0]<0?0:fw-hf,y:0,w:hf,h:fh,o:1,r:0}:{c:'a',x:0,y:u[1]<0?0:fh-hf,w:fw,h:hf,o:1,r:0},
             hz?{c:'b',x:u[0]<0?hf:0,y:0,w:hf,h:fh,o:1,r:0}:{c:'b',x:0,y:u[1]<0?hf:0,w:fw,h:hf,o:1,r:0});}
  else if(how==='open'){T('a',0,0,1);out.push({c:'b',x:fw/2-tw*e/2,y:fh/2-th*e/2,w:tw*e,h:th*e,o:1,r});}
  else if(how==='zoom'){T('a',0,0,1+.06*e,1-e);T('b',0,0,.9+.1*e,e);}
  else if(how==='through'){T('a',0,0,1+.18*e,1-e);T('b',0,0,Math.pow(.12,1-e));}
  else if(how==='stack'){T('a',0,0,1-.04*e);T('b',-u[0]*(1-e)*fw,-u[1]*(1-e)*fh,1);}
  else{T('a',u[0]*e*fw,u[1]*e*fh,1);T('b',-u[0]*(1-e)*fw,-u[1]*(1-e)*fh,1);}
  return out;}
const f1=v=>(+v).toFixed(1);
/* the three moments of the chosen transition: before, halfway, after – a cut has no halfway */
function transDraw(){
  const how=S.oneMove,full=S.oneFit==='bleed',fw=32,fh=34,fy=5,xs=how==='cut'?[24,64]:[4,44,84],mid=how==='cut'?[0,1]:[0,.5,1];
  let svg='';
  mid.forEach((e,j)=>{const els=e===0?[{c:'a',x:full?0:fw*.2,y:full?0:fh*.14,w:full?fw:fw*.6,h:full?fh:fh*.72,o:1,r:full?0:2}]:e===1?[{c:'b',x:full?0:fw*.2,y:full?0:fh*.14,w:full?fw:fw*.6,h:full?fh:fh*.72,o:1,r:full?0:2}]:transMid(how,e,fw,fh,S.dir,full);
    svg+=`<svg x="${xs[j]}" y="${fy}" width="${fw}" height="${fh}" class="tp-frame"><rect class="tp-bg" width="${fw}" height="${fh}"/>`+els.map(q=>`<rect class="tp-${q.c}" x="${f1(q.x)}" y="${f1(q.y)}" width="${f1(q.w)}" height="${f1(q.h)}" rx="${q.r}" opacity="${f1(q.o)}"/>`).join('')+'</svg>';
    if(j)svg+=`<path class="tp-go" d="M${xs[j]-5} ${fy+fh/2-3}l2.5 3-2.5 3"/>`;});
  const o=MOVES_ONE.find(q=>q[0]===how);
  return{key:[how,full,S.dir].join(),svg,cap:o&&o[2]?o[2].split(' – ')[0]:''};}
/* a preset, drawn (0.9): every drawing on the same small canvas, in the interface's own greys – the piece in focus
   dark, the rest light – and each kind drawn one way, so within a group only what tells the presets apart changes
   (the transition, the shape, how many, which way they sit). No arrows: the name and the tooltip say how it moves. */
function presetPic(p){
  const s=Object.assign({},D,p),k=E.kindOf(s),W=44,H=30,u=DV[s.dir]||DV.up;
  const q=s.ratio==='custom'?Math.max(.3,Math.min(3,(+s.rW||1)/(+s.rH||1))):s.ratio==='media'?1.2:(E.RATIOS[s.ratio]||1.6);
  const R=(x,y,w,h,on,r)=>`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${r==null?1.2:r}" class="${on?'pd-a':'pd-b'}"/>`;
  const Fr=(x,y,w,h)=>`<rect x="${f1(x+.5)}" y="${f1(y+.5)}" width="${f1(w-1)}" height="${f1(h-1)}" rx="1" class="pd-f"/>`;
  let g='';
  if(k==='one'&&s.pile){const w=14,h=17;for(const [x,y,a,on] of [[9,5,0,0],[21,8,0,0],[15,7,0,1]])g+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2" class="${on?'pd-a':'pd-b'}" transform="rotate(${a} ${x+w/2} ${y+h/2})"/>`;}
  else if(k==='one'){const e=transMid(s.oneMove,.5,W-8,H-8,s.dir,s.oneFit==='bleed');
    g=`<svg x="4" y="4" width="${W-8}" height="${H-8}">`+e.map(t=>t.c==='o'?`<rect x="${f1(t.x)}" y="${f1(t.y)}" width="${f1(t.w)}" height="${f1(t.h)}" rx="1.2" class="pd-o"/>`:R(t.x,t.y,t.w,t.h,t.c==='b',t.r?1.2:0).replace('/>',t.o<.99?` fill-opacity="${f1(Math.max(.2,t.o))}"/>`:'/>')).join('')+'</svg>';}
  else if(k==='line'){const hz=s.layout==='row'||u[1]===0;
    if(hz){const h=14,w=Math.min(15,h*q);for(let i=-2;i<=2;i++)g+=R(W/2-w/2+i*(w+3),(H-h)/2,w,h,!i);}
    else{const w=Math.min(20,14*Math.min(q,1.4)),h=w/q;for(let i=-2;i<=2;i++)g+=R((W-w)/2,H/2-h/2+i*(h+3),w,h,!i);}}
  else if(k==='grid'){const C=Math.max(1,Math.min(5,Math.round(s.cols)||3)),w=(34-(C-1)*3)/C,h=w/q;for(let r=-2;r<=2;r++)for(let c=0;c<C;c++)g+=R(5+c*(w+3),H/2-h/2+r*(h+3),w,h,!r);}
  else if(k==='wall'){const C=Math.max(1,Math.min(5,Math.round(s.wCols)||3)),Rr=Math.max(1,Math.min(4,Math.round(s.wRows)||2)),sc=Math.min(1,36/(C*(Math.min(18/Rr,12)*q)+(C-1)*2));
    const th=Math.min(18/Rr,12)*sc,tw=th*q,off=(+s.wOff||0)/100;
    for(let c=-1;c<=C;c++)for(let r=-1;r<=Rr+(off?1:0);r++){const inside=c>=0&&c<C&&r>=0&&r<Rr;g+=R(W/2-(C*tw+(C-1)*2)/2+c*(tw+2),H/2-(Rr*th+(Rr-1)*2)/2+r*(th+2)+(off&&((c%2)+2)%2?off*(th+2):0),tw,th,inside&&c===0&&r===0).replace('class="pd-b"',inside?'class="pd-b"':'class="pd-b pd-out"');}}
  else if(k==='columns'||k==='rows'){const rows=k==='rows',C=Math.max(rows?1:2,Math.min(5,Math.round(s.cols)||3)),A=rows?H-6:W-6,t=(A-(C-1)*2)/C,len=Math.min(rows?16:11,rows?t*q:t/q);
    for(let c=0;c<C;c++){const off=(c%2)*(+s.colOff||0)/100*len;for(let j=-1;j<=4;j++){const a=3+c*(t+2),b=j*(len+2)+off-2;g+=rows?R(b,a,len,t,j===1&&c===0):R(a,b,t,len,j===1&&c===0);}}}
  else if(k==='frames'){const C=Math.max(1,Math.min(4,Math.round(s.fCols)||3)),Rr=Math.max(1,Math.min(2,Math.round(s.fRows)||1)),w=Math.min(13,(36-(C-1)*3)/C),h=Math.min(22/Rr,w/q),x0=(W-(C*w+(C-1)*3))/2,y0=(H-(Rr*h+(Rr-1)*3))/2;
    for(let r=0;r<Rr;r++)for(let c=0;c<C;c++){const x=x0+c*(w+3),y=y0+r*(h+3);g+=Fr(x,y,w,h)+R(x+2,y+2,w-4,h-4,!r&&!c,.8);}}
  else{const L=[[4,17,8,10,0],[14,3,13,16,1],[30,14,7,9,0],[22,19,10,10,0],[33,3,8,8,0],[3,3,7,8,0]];for(const t of L)g+=R(t[0],t[1],t[2],t[3],t[4]);}
  return`<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><rect class="pd-bg" width="${W}" height="${H}" rx="3"/><svg width="${W}" height="${H}">${g}</svg></svg>`;}
const fmtS=v=>`${+(+v).toFixed(2)} s`;
const groupShow=list=>s=>list.some(d=>!d.show||d.show(s));
/* Layout (0.14): how the media is arranged – the Kind, what each slide is, how many across and down, and the shapes
   themselves. It was split between the top of Motion and a Shapes section further down ("choose In a shape, then go
   and find the shape"); Motion now holds only what moves. */
const ownFit=s=>isK('one')(s)&&s.oneFit==='own';
{const b=card('layout','Layout');kindTiles(b);const notBleed=s=>!(isK('one')(s)&&s.oneFit==='bleed');
  build(b,[
    {t:'seg',k:'oneFit',label:'Each slide',opts:FITS,show:isK('one')},
    {t:'seg',k:'ownScale',label:'Sizes',opts:[['fit','Fit each'],['true','True to scale']],show:s=>isK('one')(s)&&s.oneFit==='own'},
    {t:'range',k:'cols',label:'Columns',min:1,max:8,step:1,show:isK('grid')},
    {t:'range',k:'cols',id:'ccols',label:'Columns',min:2,max:8,step:1,show:isK('columns')},
    {t:'range',k:'cols',id:'rrows',label:'Rows',min:1,max:8,step:1,show:isK('rows')},
    {t:'range',k:'wCols',label:'Columns',min:1,max:8,step:1,show:isK('wall')},
    {t:'range',k:'wRows',label:'Rows',min:1,max:6,step:1,show:isK('wall')},
    {t:'range',k:'wOff',label:'Offset',min:0,max:100,step:1,unit:'%',show:isK('wall')},
    {t:'range',k:'fCols',label:'Across',min:1,max:6,step:1,show:isK('frames')},
    {t:'range',k:'fRows',label:'Down',min:1,max:4,step:1,show:isK('frames')},
    {t:'range',k:'colOff',label:'Offset',min:0,max:100,step:1,unit:'%',show:isK('columns','rows'),tip:'Every other one set along by part of a shape, so it reads as a wall rather than a grid'}]);
  build(b,[
    {t:'range',k:'depth',label:'Depth',min:0,max:100,step:1,unit:'%',show:isK('float')},
    {t:'range',k:'spread',label:'Spread',min:0,max:300,step:1,unit:'%',show:isK('float')}]);
  {const r=el('div','ctl btn-row'),sh=el('button','pill small','Shuffle');sh.type='button';sh.dataset.tip='Scatter the shapes another way';sh.onclick=()=>set('seed',(Math.round(+S.seed)||0)+1);r.append(sh);addCustom(b,isK('float'),r);}
  const sf=fold(b,'shapes','Shapes',notBleed,false,s=>[ownFit(s)?'Their own':s.ratio==='custom'?`${s.rW}:${s.rH}`:s.ratio==='media'?'Media’s own':({a4p:'A4 portrait',a4l:'A4 landscape'}[s.ratio]||s.ratio),s.radius?`${s.radius} px corners`:'Square corners'].join(' · '));
  build(sf,[{t:'select',k:'ratio',label:'Shape',show:s=>!ownFit(s),opts:[['media','The media’s own'],['16:10','16:10 – laptop'],['16:9','16:9 – widescreen'],['4:3','4:3'],['3:2','3:2'],['1:1','Square'],['4:5','4:5 – portrait post'],['3:4','3:4'],['2:3','2:3'],['9:16','9:16 – story'],['9:19.5','9:19.5 – phone'],['a4p','A4 portrait'],['a4l','A4 landscape'],['custom','Custom']]},
    {t:'nums',keys:['rW','rH'],names:['W','H'],label:'Shape ratio',min:.1,max:100,step:.1,sep:':',show:s=>s.ratio==='custom'&&!ownFit(s)},
    {t:'range',k:'size',label:'Size',min:10,max:100,step:.5,unit:'%',show:isK('one','line','frames','wall'),tip:'How big the shapes are: 100% fills the canvas (Slides, Frames, Wall), its height (a row) or its width (a column)'},
    {t:'range',k:'size',id:'gsize',label:'Width',min:10,max:100,step:.5,unit:'%',show:isK('grid'),tip:'How much of the canvas’s width they take'},
    {t:'range',k:'size',id:'csize',label:'Width',min:10,max:160,step:.5,unit:'%',show:isK('columns'),tip:'How much of the canvas’s width the columns take – past 100% the outer ones run off the sides'},
    {t:'range',k:'size',id:'rsize',label:'Height',min:10,max:160,step:.5,unit:'%',show:isK('rows'),tip:'How much of the canvas’s height the rows take – past 100% the outer ones run off the top and bottom'},
    {t:'range',k:'flSize',label:'Size',min:5,max:80,step:.5,unit:'%',show:isK('float'),tip:'How wide the nearest shapes are, against the canvas'},
    {t:'range',k:'gap',label:'Gap',min:0,max:240,step:1,unit:' px',show:isK('line','grid','columns','rows','frames','wall')},
    {t:'range',k:'radius',label:'Corners',min:0,max:120,step:1,unit:' px'},
    /* each shape the media's own shape: nothing to fill or fit, nothing behind (0.11) */
    {t:'seg',k:'fit',label:'Media fit',opts:[['fill','Fill the shape'],['fit','Fit inside']],show:s=>!ownFit(s)&&s.ratio!=='media'},
    {t:'colour',k:'shapeBg',label:'Behind the media',show:s=>!ownFit(s)&&s.ratio!=='media'&&s.fit==='fit',tip:'The colour round a picture that fits inside its shape'}]);
  const f=fold(b,'border','Border and edge',notBleed,true,s=>[s.mat>0?`${Math.round(s.mat)} px border`:'',s.edge?`${s.edgeW} px edge`:''].filter(Boolean).join(' · ')||'Off');
  build(f,[{t:'range',k:'mat',label:'Border',min:0,max:120,step:1,unit:' px'},{t:'colour',k:'matC',label:'Border colour',show:s=>s.mat>0},{t:'range',k:'matR',label:'Inner corners',min:0,max:120,step:1,unit:' px',show:s=>s.mat>0},
    {t:'toggle',k:'edge',label:'Edge'},{t:'colour',k:'edgeC',label:'Edge colour',show:s=>s.edge},{t:'range',k:'edgeW',label:'Edge width',min:.5,max:12,step:.5,unit:' px',show:s=>s.edge}]);
  SUMMARY.layout=s=>[kindName(s),isK('one')(s)?optLabel(FITS,s.oneFit):'',isK('one')(s)&&s.oneFit==='bleed'?'':(ownFit(s)?'':s.ratio==='custom'?`${s.rW}:${s.rH}`:s.ratio==='media'?'Media’s own':({a4p:'A4 portrait',a4l:'A4 landscape'}[s.ratio]||s.ratio))].filter(Boolean).join(' · ');}
/* Motion (0.7): the kind first, then what that kind moves and which way; then three groups that mean the
   same in every kind – Timing (how long), Character (how it feels) and After the last (how the loop ends).
   Each shows only what the choices above it use. */
{const b=card('motion','Motion');
  const PILE_END=[['cover','Cover','The first lands over the pile, and the pile goes'],['clear','Clear','The pile is pushed off as the first comes in'],['unbuild','Unbuild','They leave last first, back down to the first']];
  const piled=s=>isK('one')(s)&&s.pile;
  build(b,[
    {t:'seg',k:'oneMove',label:'Transition',opts:MOVES_ONE,show:isK('one')}]);
  svgPic(b,isK('one'),'trans-pic','0 0 120 44',transDraw);
  build(b,[
    {t:'seg',k:'trackMove',label:'Move',opts:MOVES_TRACK,show:isK('line','grid','columns','rows','float','wall')},
    {t:'seg',k:'wPath',label:'Path',opts:PATHS,show:s=>isK('wall')(s)&&mv(s)!=='still'},
    {t:'seg',k:'fMove',label:'Change',opts:MOVES_FRAME,show:s=>isK('frames')(s)&&!framesStatic(s)},
    {t:'seg',k:'dir',label:'Direction',optsFn:dirOpts,pick:pickDir,show:showDir},
    /* Pile up (0.12): each slide lands on the last and stays – the frame builds up */
    {t:'toggle',k:'pile',label:'Pile up',show:isK('one'),tip:'Each slide lands on the last and they stay, so the frame builds up. Then says how it comes back round to the first.'},
    {t:'range',k:'pileKeep',label:'Keep',min:0,max:12,step:1,fmt:v=>+v?String(Math.round(+v)):'All',show:s=>isK('one')(s)&&s.pile,tip:'How many stay in the pile – the oldest fades as the next lands. All keeps every one.'},
    {t:'range',k:'pileScatter',label:'Scatter',min:0,max:100,step:1,unit:'%',show:s=>isK('one')(s)&&s.pile,tip:'Nudges each slide a little off the last, like dropped prints, kept straight – the same for a slide every time round. 0 leaves each where you put it.'},
    {t:'seg',k:'pileEnd',id:'pileEnd',label:'Then',opts:PILE_END,show:piled,tip:'How the pile comes back round to the first slide'},
    {t:'range',k:'pileBack',label:'Unbuild speed',min:1,max:8,step:.5,unit:'×',show:s=>piled(s)&&s.pileEnd==='unbuild',tip:'How much faster than they built up they leave – and the rests between, too'},
    {t:'range',k:'wStep',label:'Distance',min:1,max:4,step:1,show:s=>isK('wall')(s)&&mv(s)!=='still'},
    {t:'seg',k:'colDir',label:'Directions',optsFn:dirsOpts,pick:v=>stripsOwn('colDir',v,'sd',c=>E.stripWay(S,c)),show:s=>isK('columns','rows')(s)&&mv(s)!=='still'},
    {t:'seg',k:'colSpeed',label:'Speeds',optsFn:speedsOpts,val:s=>s.colSpeed==='varied'&&mv(s)!=='drift'?'same':s.colSpeed,pick:v=>stripsOwn('colSpeed',v,'ss',c=>E.stripSpeed(S,c)),show:s=>isK('columns','rows')(s)&&mv(s)!=='still',tip:'Same: every one at one speed. Varied: two, three and four times round a loop. Each its own: set each one below – 0 holds it still.'}]);
  /* each column (or row) on its own: its way and its speed – the list always shows what each is doing; changing
     one makes the pattern above Each its own */
  stripsList(b);
  svgPic(b,s=>isK('wall')(s)&&mv(s)!=='still','path-pic','0 0 120 56',pathDraw);
  /* brickwork needs an even shift to join up: with an odd number of media the loop takes two laps – say so, where it happens */
  addHint(b,'With brickwork and an odd number of media, the loop takes two laps to join up. Add or take away one to halve it.',s=>isK('wall')(s)&&+s.wOff>0&&mv(s)!=='still'&&(()=>{const it=items.length?items:Array.from({length:6},()=>({placeholder:true,kind:'image'}));return E.plan(s,it).n!==E.plan(Object.assign({},s,{wOff:0}),it).n;})());
  addHint(b,'As many frames as media: the frames stay as they are and video plays inside them. Add more media, or fewer frames, to have it change.',s=>isK('frames')(s)&&framesStatic(s));
  /* Timing: how long things take */
  const TIMING=[
    {t:'range',k:'hold',id:'hold1',label:'On screen',min:0,max:8,step:.05,unit:' s',show:s=>isK('one')(s)&&stepping(s),tip:'How long each slide stays before the next transition. Give any slide its own time in Media.'},
    {t:'range',k:'dur',id:'dur1',label:'Transition time',min:.1,max:3,step:.05,unit:' s',show:s=>isK('one')(s)&&stepping(s)&&s.oneMove!=='cut'},
    {t:'range',k:'hold',label:'Rest',min:0,max:6,step:.05,unit:' s',show:s=>stepping(s)&&!isK('one')(s)},
    {t:'range',k:'dur',label:'Move time',min:.1,max:4,step:.05,unit:' s',show:s=>stepping(s)&&!isK('one')(s)&&!(isK('frames')(s)&&s.fMove==='cut')},
    {t:'range',k:'spsh',label:'Each shape',min:.5,max:12,step:.05,unit:' s',show:s=>mv(s)==='drift'&&!isK('frames','wall')(s)},
    {t:'range',k:'spsh',id:'spsh2',label:'Each move',min:.5,max:12,step:.05,unit:' s',show:s=>mv(s)==='drift'&&isK('wall')(s)},
    {t:'range',k:'still',label:'Length',min:1,max:60,step:.5,unit:' s',show:s=>mv(s)==='still'||(isK('frames')(s)&&framesStatic(s))}];
  const tm=fold(b,'timing','Timing',groupShow(TIMING),false,s=>stepping(s)?(isK('one')(s)?fmtS(s.hold)+' on screen'+(s.oneMove!=='cut'?' · '+fmtS(s.dur):''):`${fmtS(s.hold)} rest · ${fmtS(s.dur)} move`):mv(s)==='drift'?`${fmtS(s.spsh)} a shape`:fmtS(s.still));
  build(tm,TIMING);
  /* Character: how a move feels */
  const FEELROW={t:'seg',k:'feel',label:'Feel',opts:FEELS,show:s=>stepping(s)&&(isK('one')(s)?oneFeels(s):!(isK('frames')(s)&&s.fMove==='cut'))};
  const CHAR=[
    {t:'seg',k:'kb',label:'Movement',optsFn:()=>S.oneFit==='bleed'?KB.filter(o=>o[0]!=='parallax'):KB,val:s=>s.oneFit==='bleed'&&s.kb==='parallax'?'drift':s.kb,show:isK('one')},
    {t:'range',k:'kbAmt',label:'Amount',min:1,max:30,step:.5,unit:'%',show:s=>isK('one')(s)&&kbOn(s)},
    /* the other kinds (0.11): the picture moves a little inside each shape – where it fills its shape */
    {t:'seg',k:'inMove',label:'Movement',opts:[['none','None'],['zoom','Zoom','Each picture zooms in a touch and back, once over the loop'],['drift','Drift','Each picture drifts round inside its shape, once over the loop']],show:s=>!isK('one')(s)&&(s.fit!=='fit'||s.ratio==='media')},
    {t:'range',k:'inAmt',label:'Amount',min:1,max:20,step:.5,unit:'%',show:s=>!isK('one')(s)&&(s.fit!=='fit'||s.ratio==='media')&&s.inMove!=='none'},
    {t:'range',k:'lag',label:'Lag',min:0,max:.3,step:.005,unit:' s',show:s=>isK('line','grid')(s)&&stepping(s)},
    {t:'range',k:'colLag',label:'Lag',min:0,max:3,step:.05,unit:' s',show:s=>isK('columns','rows')(s)&&stepping(s)},
    {t:'range',k:'fLag',id:'flag',label:'Lag',min:0,max:2,step:.01,unit:' s',show:s=>isK('frames')(s)&&stepping(s)},
    {t:'range',k:'creep',label:'Keep drifting',min:0,max:60,step:1,unit:'%',show:s=>isK('line','grid','columns','rows','float','wall')(s)&&stepping(s)}];
  const ch=fold(b,'character','Character',groupShow(CHAR.concat(FEELROW)),false,s=>[FEELROW.show(s)?optLabel(FEELS,s.feel):'',isK('one')(s)&&s.kb!=='none'?optLabel(KB,s.kb):'',!isK('one')(s)&&s.inMove&&s.inMove!=='none'?(s.inMove==='zoom'?'Zoom':'Drift'):'',+s.creep>0&&CHAR.find(c=>c.k==='creep').show(s)?`drifting ${Math.round(s.creep)}%`:''].filter(Boolean).join(' · '));
  build(ch,[FEELROW]);feelPic(ch,'feel',FEELROW.show);build(ch,CHAR);
  /* After the last: how the loop ends – straight on round, or pulled back to show them all (its settings, a group of their own) */
  const ends=s=>stepping(s)&&isK('one','line')(s),pulled=s=>s.after==='pull';
  const af=fold(b,'after','After the last',s=>ends(s)&&!piled(s),false,s=>pulled(s)?'Pull back':'Carry on round');
  build(af,[{t:'seg',k:'after',label:'Then',opts:[['carry','Carry on round'],['pull','Pull back to them all']]}]);
  const pb=fold(b,'pull','Pull back',s=>ends(s)&&pulled(s)&&!piled(s),true,s=>`${Math.round(s.gCols)} across · ${(+s.zOut+ +s.gHold+ +s.zIn).toFixed(1)} s`);
  build(pb,[{t:'range',k:'gCols',label:'Columns',min:1,max:8,step:1},{t:'range',k:'gGap',label:'Gap',min:0,max:240,step:1,unit:' px'},{t:'range',k:'gSize',label:'Fills',min:30,max:100,step:1,unit:'%'},
    {t:'range',k:'zOut',label:'Out',min:.2,max:4,step:.05,unit:' s',tip:'How long the pull back takes'},{t:'range',k:'gHold',label:'All in view',min:0,max:8,step:.05,unit:' s'},{t:'range',k:'zIn',label:'In',min:.2,max:4,step:.05,unit:' s',tip:'How long it takes to come back in to the first'},
    {t:'seg',k:'zFeel',label:'Pull feel',opts:FEELS}]);
  feelPic(pb,'zFeel',null);
  build(pb,[{t:'range',k:'gStag',label:'Stagger',min:0,max:100,step:1,unit:'%',tip:'Each shape settles into the grid a beat after the one before, nearest first, so it gathers rather than arriving as one sheet. 0 for one rigid move.'},
    {t:'range',k:'gFloat',label:'Float',min:0,max:100,step:1,unit:'%',tip:'Every shape drifts gently on its own path while they’re pulled back'}]);
  SUMMARY.motion=s=>{const P=planNow(),k=KIND(s),m=k==='one'?optLabel(MOVES_ONE,s.oneMove)+(s.pile?' · Pile up':''):k==='frames'?(framesStatic(s)?'Still':optLabel(MOVES_FRAME,s.fMove)):k==='wall'&&mv(s)!=='still'?[`${Math.round(s.wCols)} × ${Math.round(s.wRows)}`,mv(s)==='drift'?'Drift':'',optLabel(PATHS,s.wPath)].filter(Boolean).join(' · '):optLabel(MOVES_TRACK,s.trackMove);
    return [m,k==='one'?(s.kb!=='none'?optLabel(KB,s.kb):''):stepping(s)?optLabel(FEELS,s.feel):'',`${P.L.toFixed(1)} s loop`].filter(Boolean).join(' · ');};}
/* Captions, with the fonts they're set in */
const WHERE=[['under','Under'],['above','Above'],['over','On it'],['fixed','Fixed']];
let fontBox;
/* Captions (0.7): what they do (where, which side, how they arrive), then Position and spacing, then the type
   of each role, then what applies to all text (accent, kerning), then the fonts. */
/* Additionals (0.10): what's useful now and then – Captions, Overlay and the shapes' Position – at the bottom of the
   panel under one heading, shut until wanted; Captions and Overlay switch on and off by the box beside their name */
const tierBox=el('div','tier'),tierBody=el('div','tier-body');
{const hd=el('button','tier-head'),ch=el('span','chev'),sm=el('span','sum');hd.type='button';ch.innerHTML=CHEV;hd.append(el('span',null,'Additionals'),el('span','cdot'),sm,ch);
  const paint=o=>{tierBody.hidden=!o;hd.setAttribute('aria-expanded',o);tierBox.classList.toggle('open',o);if(o)requestAnimationFrame(()=>{syncRanges(tierBody);tierBody.querySelectorAll('.seg').forEach(fitSeg);});};
  paint(collapsed.additionals===false);hd.onclick=()=>{const o=tierBody.hidden;collapsed.additionals=!o;LS.set('collapsed',collapsed);paint(o);};
  tierBox.append(hd,tierBody);
  controls.push({d:{},w:hd,update(){const t=[S.capOn?'Captions':'',S.ovOn?'Overlay':'',(+S.nudgeX||+S.nudgeY)?'Moved':''].filter(Boolean).join(' · ');if(sm.textContent!==t)sm.textContent=t;}});}
/* a section's on and off, in its head: the box beside its name */
function headSwitch(body,k,label){const sec=body.closest('section'),h=sec.querySelector(':scope>h2'),b=el('button','toggle head-sw');b.type='button';b.setAttribute('role','switch');
  b.setAttribute('aria-label',label);b.dataset.tip=`${label} on or off`;b.append(el('span','box'));h.prepend(b);sec.classList.add('has-sw');
  const t=h.querySelector('.card-toggle'),flip=e=>{e.stopPropagation();e.preventDefault();const on=!S[k];set(k,on);if(on===sec.classList.contains('collapsed'))fold0();};const fold0=t.onclick;
  b.onclick=flip;t.onclick=flip;   /* 0.15: no arrow – on is open, off is shut, and the name does what the box does */
  controls.push({d:{k,label,head:true},w:b,update(){b.setAttribute('aria-checked',!!S[k]);sec.classList.toggle('off',!S[k]);if(!!S[k]===sec.classList.contains('collapsed'))fold0();}});}
{const b=card('captions','Captions');headSwitch(b,'capOn','Captions');
  build(b,[{t:'seg',k:'capWhere',label:'Where',val:s=>E.capWhereOf(s),optsFn:()=>['columns','rows','frames','float','wall'].includes(S.layout)?WHERE.slice(0,3):S.layout==='one'&&S.oneFit==='bleed'?WHERE.slice(2):WHERE,show:s=>s.capOn},
    {t:'seg',k:'capV',label:'Sits',opts:[['top','Top'],['bottom','Bottom']],show:s=>s.capOn&&E.capWhereOf(s)==='fixed'},
    {t:'seg',k:'capAlign',label:'Align',opts:[['left','Left'],['centre','Centre'],['right','Right']],show:s=>s.capOn},
    {t:'seg',k:'capReveal',label:'Arrives',opts:[['none','As it is'],['fade','Fade'],['rise','Rise'],['scramble','Scramble']],show:s=>s.capOn&&!isK('columns','rows','float','wall')(s)},
    {t:'range',k:'capRevealDur',label:'Over',min:.1,max:3,step:.05,unit:' s',show:s=>s.capOn&&s.capReveal!=='none'&&!isK('columns','rows','float','wall')(s)}]);
  addHint(b,'Write each caption in Media – open a row.',s=>s.capOn&&!items.some(i=>i.title||i.line||i.tags));
  const pf=fold(b,'capPos','Position and spacing',s=>s.capOn,true,s=>[E.capWhereOf(s)==='fixed'?`${Math.round(s.capMargin)} px margin`:`${Math.round(s.capSpace)} px space`,(+s.capX||+s.capY)?`moved ${Math.round(s.capX)}, ${Math.round(s.capY)} px`:''].filter(Boolean).join(' · '));
  build(pf,[{t:'range',k:'capMargin',label:'Margin',min:0,max:300,step:1,unit:' px',show:s=>E.capWhereOf(s)==='fixed'},
    {t:'range',k:'capSpace',label:'Space',min:0,max:200,step:1,unit:' px',show:s=>E.capWhereOf(s)!=='fixed'},
    {t:'range',k:'capGapL',label:'Between lines',min:0,max:120,step:1,unit:' px'},
    {t:'range',k:'capX',label:'Across',min:-400,max:400,step:1,unit:' px',tip:'Move captions left or right'},{t:'range',k:'capY',label:'Up and down',min:-400,max:400,step:1,unit:' px',tip:'Move captions up or down'}]);
  const role=(r,title,extra)=>{const f=fold(b,'cap'+r,title,s=>s.capOn,true);
    build(f,[{t:'select',k:r+'F',label:'Font',optsFn:fontOpts},{t:'range',k:r+'S',label:'Size',min:6,max:240,step:.5,unit:' px'},
      {t:'range',k:r+'Tr',label:'Tracking',min:-150,max:400,step:1,tip:'Space between letters, in thousandths of the size'},{t:'range',k:r+'Ld',label:'Leading',min:.6,max:2.5,step:.01,unit:'×'},
      {t:'colour',k:r+'C',label:'Colour'},{t:'seg',k:r+'Case',label:'Case',opts:[['as','As typed'],['upper','Upper'],['lower','Lower']]}].concat(extra||[]));};
  role('T','Title');role('L','Line');role('G','Tags',[{t:'seg',k:'gLook',label:'Look',opts:[['outline','Outline'],['fill','Fill'],['plain','Plain']]},{t:'colour',k:'gFill',label:'Fill',show:s=>s.gLook==='fill'}]);
  const k=fold(b,'capK','Kerning and accent',s=>s.capOn,true);
  build(k,[{t:'colour',k:'accent',label:'Accent'}]);
  addHint(k,'In a caption, *stars* round words colour them with the accent; {#FF5A00:words} gives them any colour. The overlay’s text takes the accent and the kerning too.');
  build(k,[{t:'toggle',k:'kern',label:'Font kerning'},{t:'text',k:'pairs',label:'Kerning pairs',placeholder:'AV -40, To -30'}]);
  /* the fonts live here: captions are where they're used (and the overlay's text, below) */
  const fo=fold(b,'fonts','Fonts',s=>s.capOn||(s.ovOn&&s.ovKind==='text'),true,()=>{const n=ownFontIds().length;return n?`${n} of your own`:'Built in';});fontBox=el('div','font-list');addCustom(fo,null,fontBox);
  const r=el('div','ctl btn-row'),add=el('button','pill small','+ Add font');add.type='button';add.onclick=()=>$('#fontfile').click();r.append(add);addCustom(fo,null,r);
  addHint(fo,'OTF, TTF or WOFF. Fonts you add stay on this computer, in this browser, and show in every Font menu – the overlay’s too.');
  SUMMARY.captions=s=>s.capOn?[optLabel(WHERE,E.capWhereOf(s)),(FONTS[s.TF]||FONTS.default).label,isK('columns','rows','float','wall')(s)?'':optLabel([['none','As it is'],['fade','Fade'],['rise','Rise'],['scramble','Scramble']],s.capReveal)].filter(Boolean).join(' · '):'Off';}
function paintFonts(){fontBox.textContent='';
  for(const [id,f] of Object.entries(FONTS)){if(!f.own&&!['aktiv','inter8','plex','helv'].includes(id))continue;
    const row=el('div','slot font-row'),top=el('div','slot-top'),main=el('div','slot-main'),nm=el('div','slot-name sample',f.label),meta=el('div','slot-meta',f.own?f.file:'Built in');
    nm.style.fontFamily=f.family;nm.style.fontWeight=f.weight;main.append(nm,meta);top.append(main);
    if(f.own){const rm=el('button','pill small icon');rm.type='button';rm.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';rm.dataset.tip='Remove';rm.setAttribute('aria-label','Remove '+f.label);rm.onclick=()=>removeFont(id);top.append(rm);}
    row.append(top);fontBox.append(row);}
  refreshSummaries();}
/* Overlay: text or an image over everything */
const PLACES=[['tl','Top left'],['tc','Top centre'],['tr','Top right'],['ml','Middle left'],['mc','Middle'],['mr','Middle right'],['bl','Bottom left'],['bc','Bottom centre'],['br','Bottom right']];
function placePad(parent,show){const w=el('div','ctl place-ctl'),hd=el('div','ctl-head'),g=el('div','place');hd.append(el('span',null,'Place'));g.setAttribute('role','group');g.setAttribute('aria-label','Place');
  const bs=PLACES.map(([v,t])=>{const b=el('button','spot');b.type='button';b.setAttribute('aria-label',t);b.dataset.tip=t;b.append(el('i'));b.onclick=()=>set('ovPos',v);g.append(b);return[v,b];});
  w.append(hd,g);parent.append(w);controls.push({d:{show},w,update(){bs.forEach(([v,b])=>b.setAttribute('aria-pressed',S.ovPos===v));}});}
/* Overlay (0.7): what goes over (text or an image), its type, Position – the pad, the margin and the nudge
   together, as Captions has – and Blend and opacity. */
{const b=card('overlay','Overlay');const on=s=>s.ovOn,txt=s=>s.ovOn&&s.ovKind==='text',img=s=>s.ovOn&&s.ovKind==='image';headSwitch(b,'ovOn','Overlay');
  build(b,[{t:'seg',k:'ovKind',label:'What',opts:[['text','Text'],['image','Image']],show:on},
    {t:'text',k:'ovText',label:'Text',multi:true,rows:2,placeholder:'Type here – Enter for a new line',show:txt}]);
  picRow(b,'ov',img,'Image');
  build(b,[{t:'range',k:'ovW',label:'Width',min:2,max:150,step:.5,unit:'%',show:img}]);
  const ty=fold(b,'ovType','Type',txt,true);
  build(ty,[{t:'select',k:'OF',label:'Font',optsFn:fontOpts},{t:'range',k:'OS',label:'Size',min:8,max:600,step:1,unit:' px'},
    {t:'range',k:'OTr',label:'Tracking',min:-150,max:400,step:1,tip:'Space between letters, in thousandths of the size'},{t:'range',k:'OLd',label:'Leading',min:.6,max:2.5,step:.01,unit:'×'},
    {t:'colour',k:'OC',label:'Colour'},{t:'seg',k:'OCase',label:'Case',opts:[['as','As typed'],['upper','Upper'],['lower','Lower']]}]);
  addHint(ty,'*Stars* and {#hex:words} colour words, as in captions. Kerning pairs from Captions apply here too.');
  const po=fold(b,'ovPlace','Position',on,false,s=>[optLabel(PLACES,s.ovPos),(+s.ovX||+s.ovY)?`moved ${Math.round(s.ovX)}, ${Math.round(s.ovY)} px`:''].filter(Boolean).join(' · '));
  placePad(po,null);
  build(po,[{t:'range',k:'ovM',label:'Margin',min:0,max:400,step:1,unit:' px'},
    {t:'range',k:'ovX',label:'Across',min:-600,max:600,step:1,unit:' px'},{t:'range',k:'ovY',label:'Up and down',min:-600,max:600,step:1,unit:' px'},
    {t:'seg',k:'ovZ',label:'Sits',opts:[['top','Over everything'],['mid','Among the shapes']],show:s=>isK('float')(s)&&(+s.depth||0)>0}]);
  const bl=fold(b,'ovLook','Blend and opacity',on,true,s=>[s.ovBlend!=='normal'?optLabel([['difference','Difference'],['multiply','Multiply'],['screen','Screen']],s.ovBlend):'',+s.ovA<100?`${Math.round(s.ovA)}%`:''].filter(Boolean).join(' · ')||'Normal, full');
  build(bl,[{t:'seg',k:'ovBlend',label:'Blend',opts:[['normal','Normal'],['difference','Difference'],['multiply','Multiply'],['screen','Screen']]},
    {t:'range',k:'ovA',label:'Opacity',min:0,max:100,step:1,unit:'%'}]);
  SUMMARY.overlay=s=>!s.ovOn?'Off':[s.ovKind==='image'?(PICS.ov?'Image':'Image – none yet'):(String(s.ovText||'').trim()?`“${String(s.ovText).split('\n')[0].replace(/[*{}]|#[0-9a-f]{3,8}:/gi,'').slice(0,18)}”`:'Text – none yet'),
    optLabel(PLACES,s.ovPos),s.ovBlend!=='normal'?optLabel([['difference','Difference'],['multiply','Multiply'],['screen','Screen']],s.ovBlend):''].filter(Boolean).join(' · ');}
/* the shapes' Position (from Shapes, 0.10): every shape moved together */
{const b=card('position','Shift everything',s=>!isK('float')(s)&&!(isK('one')(s)&&s.oneFit==='bleed'));
  build(b,[{t:'range',k:'nudgeX',label:'Across',min:-600,max:600,step:1,unit:' px',tip:'Move every shape left or right'},{t:'range',k:'nudgeY',label:'Up and down',min:-600,max:600,step:1,unit:' px',tip:'Move every shape up or down'}]);
  SUMMARY.position=s=>(+s.nudgeX||+s.nudgeY)?`${Math.round(s.nudgeX)}, ${Math.round(s.nudgeY)} px`:'Centred';}
panel.append(tierBox);for(const id of ['captions','overlay','position'])tierBody.append(panel.querySelector(`:scope>section.card[data-id=${id}]`));

/* ---------------- presets ---------------- */
/* Built in, grouped by kind, named for what they do. The first five are for showcase GIFs and
   go from plainest to most extreme – Straight cuts (the classic GIF) to Zoom through (Steve's
   reference, 5 Nov); they also set the export to GIF. Phone swipe, Columns up and down, Masonry
   drift, Posters and Float with title come from his 4 Nov references. */
const BUILTIN=[
  {name:'Straight cuts',tip:'Straight cuts, full bleed, nothing moving – the classic showcase GIF, and the smallest file',x:{xFormat:'gif'},s:{layout:'one',oneFit:'bleed',oneMove:'cut',hold:1.2,kb:'none',after:'carry',capOn:false}},
  {name:'Slow fades',tip:'Slow dissolves, full bleed, each slide drifting or zooming gently in turn',x:{xFormat:'gif'},s:{layout:'one',oneFit:'bleed',oneMove:'fade',hold:2.2,dur:.9,kb:'vary',kbAmt:7,dir:'left',after:'carry',capOn:false}},
  {name:'Push and drift',tip:'Each piece at its own shape on the ground, pushed along and drifting the same way',x:{xFormat:'gif'},s:{layout:'one',oneFit:'own',ownScale:'fit',size:80,radius:4,oneMove:'slide',dir:'left',feel:'coast',hold:1.3,dur:1.1,kb:'drift',kbAmt:5,after:'carry',capOn:false,bg:'#EDEDEA'}},
  {name:'Open and zoom',tip:'Full bleed, each slide opening from the middle of the last, zooming in a touch',x:{xFormat:'gif'},s:{layout:'one',oneFit:'bleed',oneMove:'open',feel:'glide',hold:.9,dur:.55,kb:'in',kbAmt:8,after:'carry',capOn:false}},
  {name:'Zoom through',tip:'Full bleed and fast – each slide comes up from a small card as the last carries on past',x:{xFormat:'gif'},s:{layout:'one',oneFit:'bleed',oneMove:'through',hold:.15,dur:.38,kb:'in',kbAmt:22,after:'carry',capOn:false,bg:'#111111'}},
  {name:'Flick across',tip:'Slides in a shape, flicked across one at a time',s:{layout:'one',oneFit:'shape',ratio:'16:9',size:88,radius:8,oneMove:'slide',dir:'left',feel:'inertia',hold:1.4,dur:.8,after:'carry',capOn:false,bg:'#ECECE9'}},
  {name:'Spring up',tip:'Each one springs up over the last',s:{layout:'one',oneFit:'shape',ratio:'4:5',size:82,radius:16,oneMove:'stack',dir:'up',feel:'spring',hold:1.2,dur:.75,after:'carry',capOn:false,bg:'#141414',shapeBg:'#222222'}},
  {name:'Build up',tip:'Each one lands on the last and stays, scattered a little like dropped prints – then the pile clears and it starts again',s:{layout:'one',oneFit:'own',ownScale:'fit',size:62,radius:0,oneMove:'stack',dir:'up',feel:'snap',hold:.9,dur:.6,after:'carry',capOn:false,bg:'#EDEBE6',pile:true,pileScatter:40,pileEnd:'clear'}},
  {name:'Fade with caption',tip:'One into the next, with a caption fixed in the corner',s:{layout:'one',oneFit:'shape',ratio:'4:5',size:78,radius:6,oneMove:'fade',hold:1.6,dur:.6,after:'carry',capOn:true,capWhere:'fixed',capV:'bottom',capAlign:'left',capMargin:64,capReveal:'rise',TF:'inter6',TS:40,TTr:-10,TCase:'as'}},
  {name:'Snap along',tip:'Cards in a row, moving as one rigid piece: a long rest, a slow start, a fast throw across, a long settle – drifting a touch all the while',s:{layout:'row',ratio:'4:5',size:64,gap:36,radius:6,trackMove:'step',dir:'left',feel:'snap',hold:2.4,dur:.9,lag:0,creep:15,after:'carry',capOn:false,bg:'#EDEDEA',shapeBg:'#DADAD6'}},
  {name:'Snap up',tip:'A column of cards with captions, thrown up one at a time on the same snap, drifting a touch while they rest',s:{layout:'column',ratio:'16:10',size:78,gap:56,radius:8,trackMove:'step',dir:'up',feel:'snap',hold:2.2,dur:.9,creep:12,after:'carry',capOn:true,capWhere:'under',capReveal:'fade'}},
  {name:'Card stack',tip:'A column of cards with captions, a flick at a time, pulling back to show them all at the end',s:{layout:'column',ratio:'16:10',size:86,gap:64,radius:12,trackMove:'step',dir:'up',feel:'inertia',hold:1.2,dur:.7,after:'pull',gCols:3,gGap:40,gSize:88,zOut:1.1,gHold:1.6,zIn:1.1,capOn:true,capWhere:'under',capReveal:'scramble'}},
  {name:'Phone swipe',tip:'Phone screens swiped along – each sets off a beat after the one ahead, then glides in',s:{layout:'row',ratio:'9:19.5',size:44,gap:80,radius:22,trackMove:'step',dir:'left',feel:'coast',hold:.25,dur:2.1,lag:.045,after:'carry',capOn:false,bg:'#E0E0DE',shapeBg:'#111111'}},
  {name:'Carousel',tip:'Tall cards drifting along in a row, never stopping',s:{layout:'row',ratio:'custom',rW:9,rH:20,size:59,gap:49,radius:14,trackMove:'drift',dir:'left',spsh:2.67,capOn:false,bg:'#1D1C23',shapeBg:'#2B2A31'}},
  {name:'Rows up',tip:'Rows of shapes stepping up together, a row at a time',s:{layout:'grid',cols:3,size:92,gap:24,radius:8,ratio:'4:5',trackMove:'step',dir:'up',feel:'glide',hold:1,dur:.9,capOn:false}},
  {name:'Columns up and down',tip:'Columns stepping down and up in turn, each a beat after the last',s:{layout:'columns',cols:3,ratio:'4:5',size:94,gap:18,radius:8,trackMove:'step',colDir:'alt',colLag:.35,colOff:50,feel:'coast',hold:.6,dur:1.1,capOn:false,bg:'#111111',shapeBg:'#222222'}},
  {name:'Masonry drift',tip:'A wall of work in columns drifting down, up and down at their own speeds – 3, 4 and 7 times round a loop, as the reference – each piece its own shape, the outer columns running off the sides',s:{layout:'columns',cols:3,ratio:'media',size:128,gap:10,radius:6,trackMove:'drift',colDir:'alt',colSpeed:'own',ss0:3,ss1:4,ss2:7,spsh:3.2,colOff:35,capOn:false,bg:'#0B0B0B',shapeBg:'#1C1C1C'}},
  {name:'Rows side to side',tip:'Rows stepping right and left in turn on the snap, each a beat after the last',s:{layout:'rows',cols:3,ratio:'16:10',size:100,gap:18,radius:6,trackMove:'step',colDir:'alt',colSpeed:'same',colLag:.3,colOff:50,feel:'snap',hold:1,dur:.9,capOn:false,bg:'#EDEDEA',shapeBg:'#DADAD6'}},
  {name:'Rows drift',tip:'Rows of work drifting left and right, never stopping, each at its own speed, running off the top and bottom',s:{layout:'rows',cols:4,ratio:'media',size:118,gap:10,radius:4,trackMove:'drift',colDir:'alt',colSpeed:'own',ss0:2,ss1:3,ss2:2,ss3:4,spsh:3,colOff:40,capOn:false,bg:'#0B0B0B',shapeBg:'#1C1C1C'}},
  {name:'Posters',tip:'Three mounted posters that hold still while the work inside them pushes up, one after another',s:{layout:'frames',fCols:3,fRows:1,ratio:'3:4',size:92,gap:34,radius:0,mat:12,matC:'#FFFFFF',matR:6,fMove:'push',dir:'up',feel:'glide',hold:2.2,dur:.9,fLag:.6,capOn:false,bg:'#A3A3A3',shapeBg:'#E6E6E3'}},
  {name:'Wall snap',tip:'A wall of posters, three across and two down, the whole of it thrown one tile along on the snap – then a long rest, drifting a touch',s:{layout:'wall',wCols:3,wRows:2,wPath:'across',wStep:1,wOff:0,ratio:'3:4',size:94,gap:22,radius:4,trackMove:'step',dir:'left',feel:'snap',hold:1.7,dur:.9,creep:10,capOn:false,bg:'#0E0E0E',shapeBg:'#222222'}},
  {name:'Wall stairs',tip:'A wall panned in stairs – along, then up, again and again – each move a snap',s:{layout:'wall',wCols:3,wRows:3,wPath:'stairs',wStep:1,wOff:0,ratio:'1:1',size:96,gap:18,radius:6,trackMove:'step',dir:'left',feel:'snap',hold:1.2,dur:.85,creep:8,capOn:false,bg:'#F1F0EC',shapeBg:'#DEDDD8'}},
  {name:'Brick wall',tip:'Alternate columns set down half a tile, like brickwork, the camera snapping along',s:{layout:'wall',wCols:3,wRows:2,wPath:'across',wStep:2,wOff:50,ratio:'4:5',size:100,gap:14,radius:5,trackMove:'step',dir:'left',feel:'snap',hold:1.4,dur:1,creep:6,capOn:false,bg:'#161616',shapeBg:'#262626'}},
  {name:'Float with title',tip:'Work floating up at three depths past a line of type – add it in Overlay',s:{layout:'float',dir:'up',ratio:'media',flSize:30,depth:60,spread:70,radius:10,trackMove:'step',feel:'glide',hold:1.1,dur:1,creep:10,capOn:false,bg:'#000000',shapeBg:'#1A1A1A',
    ovBlend:'difference',ovZ:'mid',ovPos:'mc',OF:'inter8',OS:110,OTr:-10,OLd:.92,OC:'#FFFFFF',OCase:'upper'}}];
/* earlier names (0.2 and 0.3), for anyone who had one in use */
const RENAMED={Columns:'Columns up and down',Wall:'Masonry drift','Milky Way':'Float with title',Deck:'Flick across',Stack:'Spring up',Fade:'Fade with caption',Grid:'Rows up',
  Semplice:'Straight cuts',Adagio:'Slow fades',Andante:'Push and drift',Allegro:'Open and zoom',Presto:'Zoom through',Staccato:'Flick across',Pizzicato:'Spring up',Dolce:'Fade with caption',
  Coda:'Card stack',Canon:'Phone swipe',Ostinato:'Carousel',Chorale:'Rows up',Counterpoint:'Columns up and down',Polyrhythm:'Masonry drift',Fermata:'Posters',Nocturne:'Float with title'};
/* presets kept by an earlier version are tidied as they're read: a name and a settings object each, or left out */
let mine=(Array.isArray(LS.get('presets'))?LS.get('presets'):[]).filter(p=>p&&typeof p.name==='string'&&p.name).map(p=>({...p,s:p.s&&typeof p.s==='object'?p.s:{}})),current=LS.get('preset')||'',edited=!!LS.get('presetEdited');
if(RENAMED[current]&&!mine.some(p=>p.name===current)){current=RENAMED[current];LS.set('preset',current);}
const presetName=()=>current?current+(edited?' – changed':''):'';
const unit=()=>{const [W,H]=size();return E.unitOf(W,H);};
/* where a setting started: the preset in use (scaled to this canvas), else the default */
function baseOf(k){const p=current&&BUILTIN.concat(mine).find(x=>x.name===current);if(!p)return D[k];
  if(LOOK.includes(k)){const v=k in p.s?p.s[k]:D[k];return PX.includes(k)&&typeof v==='number'?+(v*unit()).toFixed(2):v;}
  return p.x&&k in p.x?p.x[k]:D[k];}
function lookNow(){const u=unit(),o={};for(const k of LOOK)o[k]=PX.includes(k)?+(S[k]/u).toFixed(2):S[k];return o;}
function applyPreset(p){const before=Object.assign({},S),pc=current,pe=edited;const u=unit();for(const k of LOOK){const v=k in p.s?p.s[k]:D[k];S[k]=PX.includes(k)&&typeof v==='number'?+(v*u).toFixed(2):v;}
  if(p.x)for(const k in p.x)S[k]=p.x[k];
  current=p.name;edited=false;LS.set('preset',current);LS.set('presetEdited',false);saveSettings();E.resetMeasure();clock=0;dirty=true;refreshAll();paintMedia();
  const ch={};for(const k in S)if(!same(before[k],S[k]))ch[k]=[before[k],S[k]];
  pushUndo({ch,label:p.name,extra:w=>{current=w?p.name:pc;edited=w?false:pe;LS.set('preset',current);LS.set('presetEdited',edited);E.resetMeasure();paintMedia();paintPresets();}});
  toastUndo(p.x&&p.x.xFormat==='gif'?`${p.name} – export set to GIF`:`${p.name}`);}
let presetBox,saveIn;
{const b=card('presets','Presets');presetBox=el('div','preset-list');b.append(presetBox);
  addHint(b,'A preset sets the look and the motion. Your media, captions and canvas size stay.');
  const r=el('div','ctl save-row');saveIn=el('input');saveIn.type='text';saveIn.placeholder='Name';saveIn.setAttribute('aria-label','Preset name');const sv=el('button','pill small','Save');sv.type='button';
  sv.onclick=()=>{const n=saveIn.value.trim()||`Preset ${mine.length+1}`;mine=mine.filter(p=>p.name!==n);mine.push({name:n,s:lookNow()});LS.set('presets',mine);current=n;edited=false;LS.set('preset',n);LS.set('presetEdited',false);saveIn.value='';paintPresets();refreshAll();toast(`Saved ${n}`);};
  r.append(saveIn,sv);b.append(el('div','sub-head','Save these settings'),r);
  const r2=el('div','btn-row pairs'),dl=el('button','pill small','Download presets'),ld=el('button','pill small','Load presets');dl.type=ld.type='button';
  dl.onclick=()=>saveFile('segue-presets.json',new Blob([JSON.stringify({segue:1,presets:mine},null,1)],{type:'application/json'}));ld.onclick=()=>$('#presetfile').click();r2.append(dl,ld);b.append(r2);
  cardToSheet(b,'presets');
  /* Safari (0.9): if the list doesn't show when the sheet opens, say so on the panel with what the browser reports –
     a list that's there but can't be seen throws no error, so nothing else would */
  const sh=b.closest('.sheet')||(SHEETS.presets&&SHEETS.presets.el);
  if(sh)new MutationObserver(()=>{if(sh.hidden)return;setTimeout(()=>{if(sh.hidden)return;try{const rows=[...presetBox.querySelectorAll('.preset-row')],r=sh.getBoundingClientRect(),pc=$('#pcap'),cs=getComputedStyle(sh);
    /* some row in sight inside the sheet (it may be scrolled), the sheet itself on screen and not see-through */
    const seen=rows.find(e=>{const q=e.getBoundingClientRect();return q.height>10&&q.bottom>Math.max(0,r.top)&&q.top<Math.min(innerHeight,r.bottom);}),f=(seen||rows[0]||{getBoundingClientRect:()=>null}).getBoundingClientRect();
    const ok=rows.length>0&&r.height>80&&r.bottom>0&&r.top<innerHeight&&!!seen&&cs.visibility!=='hidden'&&+cs.opacity>.5;
    if(!ok)reportError({message:`Presets didn’t show – ${rows.length} rows, sheet ${Math.round(r.width)}×${Math.round(r.height)} at ${Math.round(r.top)}, a row ${f?Math.round(f.height)+' high at '+Math.round(f.top):'none'}, list ${presetBox.childElementCount}, capsule ${pc?getComputedStyle(pc).display+' '+pc.className:'none'}, sheets ${getComputedStyle(sh.parentElement.parentElement).gridTemplateRows}, window ${innerWidth}×${innerHeight}`},'presets');}catch(e){reportError(e,'presets check');}},450);}).observe(sh,{attributes:true,attributeFilter:['hidden']});}
function paintPresets(){presetBox.textContent='';
  /* a preset is a small drawing of it and its name; what it does is in its tooltip */
  const row=(p,own)=>{try{row1(p,own);}catch(e){reportError(e,'preset '+p.name);const r=el('div','slot preset-row'),m=el('div','slot-main');m.append(el('div','slot-name',p.name));m.setAttribute('role','button');m.tabIndex=0;m.onclick=()=>{applyPreset(p);paintPresets();};r.append(m);presetBox.append(r);}};
  const row1=(p,own)=>{const r=el('div','slot preset-row'),top=el('div','slot-top'),main=el('div','slot-main'),nm=el('div','slot-name',p.name),ic=el('span','pk');try{ic.innerHTML=presetPic(p.s);}catch(e){}
    if(p.tip||own)main.dataset.tip=p.tip||(optLabel(KINDS,E.kindOf(p.s))+' – one of yours');main.append(nm);top.append(ic);main.setAttribute('role','button');main.tabIndex=0;main.setAttribute('aria-label','Use '+p.name);main.onclick=()=>{applyPreset(p);paintPresets();};main.onkeydown=e=>{if(e.key==='Enter'){applyPreset(p);paintPresets();}};
    top.append(main);if(current===p.name){const t=el('span','tag','In use');top.append(t);r.classList.add('on');}
    if(own){const rm=el('button','pill small icon');rm.type='button';rm.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';rm.dataset.tip='Delete';rm.setAttribute('aria-label','Delete '+p.name);
      rm.onclick=e=>{e.stopPropagation();mine=mine.filter(x=>x!==p);LS.set('presets',mine);paintPresets();};top.append(rm);}
    r.append(top);presetBox.append(r);};
  for(const [k,label] of KINDS){const ps=BUILTIN.filter(p=>E.kindOf(p.s)===k);if(!ps.length)continue;presetBox.append(el('div','sub-head',label));for(const p of ps)row(p,false);}
  if(mine.length){presetBox.append(el('div','sub-head','Yours'));for(const p of mine)row(p,true);}}
$('#presetfile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const j=JSON.parse(await f.text()),list=(j.presets||[]).filter(p=>p&&p.name&&p.s);let n=0;for(const p of list){p.s=sanitise(p.s);mine=mine.filter(x=>x.name!==p.name);mine.push({name:String(p.name).slice(0,60),s:p.s});n++;}
    LS.set('presets',mine);paintPresets();toast(n===1?'Loaded 1 preset':`Loaded ${n} presets`);}catch(err){toast('That isn’t a Segue presets file');}};
/* ---------------- projects (0.10) ----------------
   A project is everything you've set up: the settings, the media in order with each piece's own settings, the
   background and overlay pictures, and the preset it came from. The open one is saved as you work (a moment after each
   change) into the browser's own storage, with a small picture of the frame for the list; any number can be kept,
   opened, copied, renamed and removed. Save as file packs one – files and all – into a .segue file (a plain zip:
   project.json and the files), to keep or to open in another browser; Open a file adds it as a new project.
   The files themselves are shared: a copied piece or a copied project points at the same stored file, and a stored
   file is cleared only at start-up, when nothing – the open project or any saved one – uses it. */
var PROJ=null,projReady=false,projT=0,projThumbT=0,projSaving=false;
const newPid=()=>'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const SEGUE_VER=($('.brand .ver')||{}).textContent||'';
function projTouch(){if(!projReady||!PROJ)return;clearTimeout(projT);paintProjState('Saving…');projT=setTimeout(()=>saveProject(),700);}
function projThumb(){try{const [W,H]=size(),k=Math.min(96/W,120/H),c=document.createElement('canvas');c.width=Math.max(1,Math.round(W*k));c.height=Math.max(1,Math.round(H*k));
  const x=c.getContext('2d'),P=planNow(),t=((clock%P.L)+P.L)%P.L,sc=E.scene(S,items,x,FONTS,W,H,t);E.paint(x,sc,S,FONTS,{scale:k,media:drawMedia,bgImg:PICS.bg,ovImg:PICS.ov});return c.toDataURL('image/jpeg',.78);}catch(e){return null;}}
function projRecord(thumb){return{id:PROJ.id,name:PROJ.name,created:PROJ.created||Date.now(),updated:Date.now(),ver:SEGUE_VER,
  settings:Object.assign({},S),items:items.map(it=>Object.fromEntries(META.map(k=>[k,it[k]]))),pics:{bg:LS.get('pic:bg'),ov:LS.get('pic:ov')},
  preset:{current,edited},thumb:thumb||PROJ.thumb||null,n:items.length,L:+planNow().L.toFixed(2)};}
async function saveProject(force){clearTimeout(projT);if(!PROJ)return;projSaving=true;
  if(force||!PROJ.thumb||performance.now()-projThumbT>4000){const t=projThumb();if(t){PROJ.thumb=t;projThumbT=performance.now();}}
  try{await DB.put('projects',PROJ.id,projRecord());paintProjState('Saved');}catch(e){paintProjState('Not saved');toast('Couldn’t save the project – the browser’s storage may be full');}
  projSaving=false;}
function paintProjState(t){const s=$('#projState');if(s&&s.textContent!==t)s.textContent=t;}
function paintProject(){if(!PROJ)return;$('#projName').textContent=PROJ.name;$('#projBtn').setAttribute('aria-label',`Project: ${PROJ.name} – projects`);document.title=`${PROJ.name} – Segue`;}
async function allProjects(){try{return (await DB.all('projects')).filter(r=>r&&r.id).sort((a,b)=>(b.updated||0)-(a.updated||0));}catch(e){return [];}}
function untitled(list){const taken=new Set(list.map(r=>r.name));if(!taken.has('Untitled'))return 'Untitled';for(let k=2;k<999;k++)if(!taken.has('Untitled '+k))return 'Untitled '+k;return 'Untitled';}
/* bring a saved project in as the one that's open */
async function loadProject(rec){
  for(const it of items){if(it.el){try{it.el.pause();URL.revokeObjectURL(it.el.src);}catch(e){}}}items.splice(0);openRows.clear();selId=null;hoverOp=null;crCache.clear();
  for(const k of Object.keys(S))delete S[k];Object.assign(S,D,sanitise(rec.settings));LS.set('settings',S);
  LS.set('items',Array.isArray(rec.items)?rec.items:[]);LS.set('pic:bg',rec.pics&&rec.pics.bg||null);LS.set('pic:ov',rec.pics&&rec.pics.ov||null);PICS.bg=PICS.ov=null;
  current=rec.preset&&rec.preset.current||'';edited=!!(rec.preset&&rec.preset.edited);LS.set('preset',current);LS.set('presetEdited',edited);
  PROJ={id:rec.id,name:rec.name||'Untitled',created:rec.created||Date.now(),thumb:rec.thumb||null};LS.set('project',PROJ.id);
  UNDO.length=0;REDO.length=0;itemSnap=null;clock=0;viewZoom=null;E.resetMeasure();
  await restoreMedia();await restorePics();paintMedia();paintPresets();refreshAll();fitCanvas();paintProject();dirty=true;}
async function openProject(id){if(busy){toast('Wait for the export to finish');return;}if(PROJ&&id===PROJ.id){closeProjPop();return;}
  let rec=null;try{rec=await DB.get('projects',id);}catch(e){}if(!rec){toast('Couldn’t find that project');return;}
  projReady=false;await saveProject(true);try{await loadProject(rec);}finally{projReady=true;}await saveProject(true);closeProjPop();toast(`Opened ${PROJ.name}`);}
async function newProject(){if(busy){toast('Wait for the export to finish');return;}projReady=false;await saveProject(true);
  const name=untitled(await allProjects());
  try{await loadProject({id:newPid(),name,created:Date.now(),settings:{},items:[],pics:{},preset:{current:'',edited:false}});}finally{projReady=true;}
  await saveProject(true);closeProjPop();toast(`New project – ${name}. The last one is in Projects.`);}
async function duplicateProject(){await saveProject(true);const r=projRecord(PROJ.thumb),list=await allProjects(),taken=new Set(list.map(x=>x.name));
  let name=`${PROJ.name} copy`;for(let k=2;taken.has(name);k++)name=`${PROJ.name} copy ${k}`;
  Object.assign(r,{id:newPid(),name,created:Date.now(),updated:Date.now()});await DB.put('projects',r.id,r);paintProjPop();toast(`Copied as ${name}`);}
async function renameProject(n){n=String(n||'').trim().slice(0,80);if(!n||!PROJ||n===PROJ.name)return;PROJ.name=n;paintProject();await saveProject();}
async function removeProject(id){if(PROJ&&id===PROJ.id){const others=(await allProjects()).filter(r=>r.id!==id);if(!others.length){toast('It’s the only project – start a new one first');return;}
    const was=projRecord(PROJ.thumb);await openProject(others[0].id);await DB.del('projects',id);undoProject(was);}
  else{let was=null;try{was=await DB.get('projects',id);}catch(e){}await DB.del('projects',id);if(was)undoProject(was);}
  paintProjPop();}
function undoProject(was){const label=`Removed ${was.name}`;pushUndo({label,fn:async w=>{if(w)await DB.del('projects',was.id);else await DB.put('projects',was.id,was);paintProjPop();}});toastUndo(label);}
/* start-up: the work in the browser becomes (or stays) the open project; files nothing uses are cleared */
async function projectsStart(){let rec=null;const id=LS.get('project');try{if(id)rec=await DB.get('projects',id);}catch(e){}
  if(rec)PROJ={id:rec.id,name:rec.name||'Untitled',created:rec.created,thumb:rec.thumb||null};
  else{const list=await allProjects();PROJ={id:id||newPid(),name:untitled(list),created:Date.now(),thumb:null};LS.set('project',PROJ.id);}
  paintProject();projReady=true;await saveProject(true);gcFiles();}
async function gcFiles(){try{const used=new Set(),add=list=>{for(const m of list||[])if(m&&(m.ref||m.id))used.add(m.ref||m.id);},pic=m=>{if(m)used.add(m.ref||'');};
    add(LS.get('items'));pic(LS.get('pic:bg'));for(const w of ['bg','ov'])if(LS.get('pic:'+w)&&!LS.get('pic:'+w).ref)used.add('pic:'+w);pic(LS.get('pic:ov'));
    const list=await DB.all('projects');for(const r of list){add(r.items);if(r.pics){for(const w of ['bg','ov']){const m=r.pics[w];if(m)used.add(m.ref||'pic:'+w);}}}
    for(const k of await DB.keys('media'))if(!used.has(k))await DB.del('media',k);}catch(e){}}
/* the Projects panel: the name, what you can do, and every project kept in this browser */
const ICON_DUP='<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="1.5" y="3.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4 1.5h5a1.5 1.5 0 0 1 1.5 1.5v5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  ICON_DOWN='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.8v6.4M3.4 5.6 6 8.2l2.6-2.6M2 10.2h8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ICON_UP='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 8.2V1.8M3.4 4.4 6 1.8l2.6 2.6M2 10.2h8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const when=t=>{if(!t)return '';const d=new Date(t),now=new Date(),hm=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  if(d.toDateString()===now.toDateString())return `Today ${hm}`;const y=new Date(now);y.setDate(now.getDate()-1);if(d.toDateString()===y.toDateString())return `Yesterday ${hm}`;
  return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+hm;};
async function paintProjPop(){const pop=$('#projPop');if(pop.hidden)return;await saveProject();const list=await allProjects();pop.textContent='';
  const nm=el('input','proj-field');nm.type='text';nm.value=PROJ.name;nm.spellcheck=false;nm.setAttribute('aria-label','Project name');nm.maxLength=80;
  nm.onchange=()=>renameProject(nm.value);nm.onkeydown=e=>{if(e.key==='Enter')nm.blur();if(e.key==='Escape'){nm.value=PROJ.name;nm.blur();}};
  const acts=el('div','proj-acts'),act=(label,icon,fn,tip)=>{const b=el('button','pill small');b.type='button';b.innerHTML=icon+`<span>${label}</span>`;b.dataset.tip=tip;b.onclick=fn;acts.append(b);};
  act('New',ICON.plus,newProject,'Start a new project – this one stays in the list');
  act('Duplicate',ICON_DUP,duplicateProject,'A copy of this project in the list – this one stays open');
  act('Save as file',ICON_DOWN,saveProjectFile,'Download it, files and all, as a .segue file – to keep, or to open in another browser');
  act('Open file',ICON_UP,()=>$('#projfile').click(),'Open a .segue file as a new project');
  pop.append(el('div','pop-title','Project'),nm,acts,el('div','sub-head','In this browser'));
  const box=el('div','proj-list');
  for(const r of list){const row=el('div','slot proj-row'+(r.id===PROJ.id?' on':'')),top=el('div','slot-top'),th=el('span','proj-thumb'),main=el('div','slot-main'),name=el('div','slot-name',r.name||'Untitled'),
      meta=el('div','slot-meta',[`${r.n||0} ${r.n===1?'piece':'pieces'}`,r.L?`${(+r.L).toFixed(1)} s`:'',when(r.updated)].filter(Boolean).join(' · '));
    if(r.thumb){const im=el('img');im.alt='';im.src=r.thumb;th.append(im);}main.append(name,meta);main.setAttribute('role','button');main.tabIndex=0;
    main.setAttribute('aria-label',r.id===PROJ.id?`${r.name} – open now`:`Open ${r.name}`);main.onclick=()=>openProject(r.id);main.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openProject(r.id);}};
    top.append(th,main);if(r.id===PROJ.id)top.append(el('span','tag','Open'));
    const rm=el('button','pill small icon');rm.type='button';rm.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    rm.dataset.tip='Remove';rm.setAttribute('aria-label','Remove '+r.name);rm.onclick=e=>{e.stopPropagation();removeProject(r.id);};top.append(rm);row.append(top);box.append(row);}
  pop.append(box,el('p','hint','Kept in this browser as you work. Save as file to keep a copy anywhere or open it in another browser – Chrome and Safari keep their own.'));}
function openProjPop(){const pop=$('#projPop');pop.hidden=false;$('#projBtn').setAttribute('aria-expanded',true);paintProjPop();}
function closeProjPop(){const pop=$('#projPop');if(pop.hidden)return;pop.hidden=true;$('#projBtn').setAttribute('aria-expanded',false);}
$('#projBtn').onclick=()=>{$('#projPop').hidden?openProjPop():closeProjPop();};
document.addEventListener('pointerdown',e=>{const pop=$('#projPop');if(!pop.hidden&&!pop.contains(e.target)&&!$('#projBtn').contains(e.target)&&!(e.target.closest&&e.target.closest('#toast')))closeProjPop();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#projPop').hidden&&document.activeElement.tagName!=='INPUT'){closeProjPop();$('#projBtn').focus();}});
/* a project as a file: a zip, its files stored as they are (nothing to gain compressing video), with project.json */
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC_T[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
async function makeZip(files){const enc=new TextEncoder(),parts=[],cd=[];let off=0;
  for(const f of files){const nm=enc.encode(f.name),buf=new Uint8Array(await f.blob.arrayBuffer()),crc=crc32(buf),n=buf.length;
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,n,true);h.setUint32(22,n,true);h.setUint16(26,nm.length,true);
    const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,n,true);c.setUint32(24,n,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
    parts.push(h.buffer,nm,f.blob);cd.push(c.buffer,nm);off+=30+nm.length+n;}
  const size=cd.reduce((a,b)=>a+b.byteLength,0),e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,size,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cd,e.buffer],{type:'application/zip'});}
async function readZip(file){const n=file.size,tb=new DataView(await file.slice(Math.max(0,n-65558)).arrayBuffer());let e=-1;for(let i=tb.byteLength-22;i>=0;i--)if(tb.getUint32(i,true)===0x06054b50){e=i;break;}
  if(e<0)throw new Error('not a zip');const cnt=tb.getUint16(e+10,true),cdSize=tb.getUint32(e+12,true),cdOff=tb.getUint32(e+16,true),cd=new DataView(await file.slice(cdOff,cdOff+cdSize).arrayBuffer()),dec=new TextDecoder(),out=new Map();let p=0;
  for(let i=0;i<cnt&&p+46<=cd.byteLength;i++){if(cd.getUint32(p,true)!==0x02014b50)break;const how=cd.getUint16(p+10,true),cs=cd.getUint32(p+20,true),nl=cd.getUint16(p+28,true),xl=cd.getUint16(p+30,true),cl=cd.getUint16(p+32,true),lo=cd.getUint32(p+42,true);
    const name=dec.decode(new Uint8Array(cd.buffer,cd.byteOffset+p+46,nl));p+=46+nl+xl+cl;
    const lh=new DataView(await file.slice(lo,lo+30).arrayBuffer()),at=lo+30+lh.getUint16(26,true)+lh.getUint16(28,true);let b=file.slice(at,at+cs);
    if(how===8){if(typeof DecompressionStream!=='function')continue;b=await new Response(b.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();}else if(how!==0)continue;
    out.set(name,b);}
  return out;}
const safeName=n=>String(n||'file').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'-').slice(0,120)||'file';
async function projectFile(){await saveProject(true);const r=projRecord(PROJ.thumb),files=[],seen=new Set(),media={},pics={},fonts=[];
  for(const m of r.items){const ref=m.ref||m.id;if(seen.has(ref))continue;seen.add(ref);let b=null;try{b=await DB.get('media',ref);}catch(e){}if(!b)continue;
    const path=`media/${ref}/${safeName(m.name)}`;media[ref]={path,type:b.type||''};files.push({name:path,blob:b});}
  for(const w of ['bg','ov']){const m=r.pics[w];if(!m)continue;const ref=m.ref||'pic:'+w;let b=null;try{b=await DB.get('media',ref);}catch(e){}if(!b)continue;
    const path=`pictures/${w}/${safeName(m.name)}`;pics[w]={path,type:b.type||''};files.push({name:path,blob:b});}
  for(const k of ['TF','LF','GF','OF']){const id=S[k],f=FONTS[id];if(!f||!f.own||fonts.some(x=>x.id===id))continue;let rec=null;try{rec=await DB.get('fonts',id);}catch(e){}if(!rec)continue;
    const path=`fonts/${safeName(rec.name)}`;fonts.push({id,name:rec.name,type:rec.type||'',path});files.push({name:path,blob:new Blob([rec.data],{type:rec.type||''})});}
  delete r.thumb;const json={segue:SEGUE_VER,format:1,project:r,media,pics,fonts};
  files.unshift({name:'project.json',blob:new Blob([JSON.stringify(json,null,1)],{type:'application/json'})});
  return makeZip(files);}
async function saveProjectFile(){if(busy)return;toast('Packing the project…',true);
  try{const z=await projectFile();await saveFile(`${safeName(PROJ.name)}.segue`,z);}catch(e){toast('Couldn’t make the file – '+(e&&e.message||'something went wrong'));}}
async function openProjectFile(file){if(busy){toast('Wait for the export to finish');return;}toast(`Opening ${file.name}…`,true);
  try{const z=await readZip(file),j=JSON.parse(await (z.get('project.json')||new Blob(['{}'])).text()),r=j.project;if(!r||!Array.isArray(r.items))throw new Error('no project');
    const remap={};
    for(const [ref,m] of Object.entries(j.media||{})){const b=z.get(m.path);if(!b)continue;let use=ref,have=null;try{have=await DB.get('media',ref);}catch(e){}
      if(have&&have.size!==b.size)use=newId();if(!have||use!==ref)await DB.put('media',use,new File([b],m.path.split('/').pop(),{type:m.type||b.type||''}));remap[ref]=use;}
    r.items=r.items.map(m=>{const ref=m.ref||m.id,o=Object.assign({},m);if(remap[ref])o.ref=remap[ref];else o.ref=ref;return o;});
    const pics={};for(const w of ['bg','ov']){const m=(j.pics||{})[w],meta=(r.pics||{})[w];if(!m||!meta)continue;const b=z.get(m.path);if(!b)continue;const ref='pic:'+newId();
      await DB.put('media',ref,new File([b],meta.name||'picture',{type:m.type||''}));pics[w]={name:meta.name,ref};}
    for(const f of j.fonts||[]){if(FONTS[f.id])continue;const b=z.get(f.path);if(b)try{await addFont(new File([b],f.name,{type:f.type||''}),f.id);}catch(e){}}
    const list=await allProjects(),taken=new Set(list.map(x=>x.name));let name=r.name||file.name.replace(/\.(segue|zip)$/i,'');if(taken.has(name)){let k=2;while(taken.has(`${name} ${k}`))k++;name=`${name} ${k}`;}
    const rec=Object.assign({},r,{id:newPid(),name,pics,created:r.created||Date.now(),updated:Date.now()});await DB.put('projects',rec.id,rec);paintFonts();
    projReady=false;await saveProject(true);try{await loadProject(rec);}finally{projReady=true;}await saveProject(true);closeProjPop();toast(`Opened ${name}`);}
  catch(e){toast(`${file.name} isn’t a Segue project file`);}}
$('#projfile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)openProjectFile(f);};
