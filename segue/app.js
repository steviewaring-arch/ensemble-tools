/* Segue – the app. Media in, framed loops out: the canvas, the shapes the media sits in,
   how they move and loop, captions, fonts and presets. The engine (segue/engine.js) draws;
   this file owns the settings, the media and the interface. */
const E=SegueEngine;
/* ---------------- settings ---------------- */
const D={
  cSize:'4:5',cW:1080,cH:1350,bg:'#F5F5F3',bgFit:'fill',bgImgA:100,fps:30,
  layout:'column',ratio:'16:10',rW:16,rH:10,size:86,cols:3,gap:64,radius:12,fit:'fill',shapeBg:'#E6E6E3',edge:false,edgeC:'#111111',edgeW:2,nudgeX:0,nudgeY:0,
  mat:0,matC:'#FFFFFF',matR:0,
  oneFit:'shape',ownScale:'fit',kb:'none',kbAmt:6,
  oneMove:'slide',trackMove:'step',dir:'up',feel:'inertia',hold:1.2,dur:.7,spsh:2.5,still:8,lag:0,creep:0,after:'pull',gCols:3,gGap:40,gSize:88,zOut:1.1,gHold:1.6,zIn:1.1,zFeel:'soft',gStag:40,gFloat:30,
  colDir:'alt',colSpeed:'same',colLag:.4,colOff:50,
  fCols:3,fRows:1,fMove:'push',fLag:.15,
  flSize:34,depth:60,spread:80,seed:0,
  capOn:true,capWhere:'under',capAlign:'left',capV:'bottom',capMargin:64,capSpace:28,capX:0,capY:0,capGapL:10,capReveal:'scramble',capRevealDur:.8,
  accent:'#EA2631',kern:true,pairs:'',gLook:'outline',gFill:'#E4E4E0',
  TF:'inter8',TS:54,TTr:-20,TLd:1.0,TC:'#111111',TCase:'upper',
  LF:'plex',LS:17,LTr:0,LLd:1.4,LC:'#6B6A66',LCase:'as',
  GF:'plex',GS:13,GTr:20,GLd:1.2,GC:'#111111',GCase:'as',
  ovOn:false,ovKind:'text',ovText:'',OF:'inter8',OS:120,OTr:-20,OLd:.95,OC:'#111111',OCase:'as',ovPos:'mc',ovM:64,ovX:0,ovY:0,ovBlend:'normal',ovA:100,ovW:40,ovZ:'top',
  name:'Segue',xFormat:'mp4',xLoops:1,xGifScale:.5,xGifFps:20,xDither:false,xCrisp:true,xQ:'high',xScale:1};
/* the look: what a preset carries. Size, frame rate, the file name and what's over the top
   (it's content, like the captions) stay as they are. */
const NOT_LOOK=['cSize','cW','cH','fps','name','xFormat','xLoops','xGifScale','xGifFps','xDither','xCrisp','xQ','ovOn','ovKind','ovText'];
const LOOK=Object.keys(D).filter(k=>!NOT_LOOK.includes(k));
/* px values: presets keep them for a 1080 short side and scale them to the canvas they land on */
const PX=['gap','radius','edgeW','nudgeX','nudgeY','gGap','capSpace','capX','capY','capMargin','capGapL','TS','LS','GS','mat','matR','OS','ovM','ovX','ovY'];
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
const META=['id','name','kind','w','h','dur','start','title','line','tags','arrive','levels','fixed','hold','moves','px','py','zm','ox','oy'];
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
function removeItem(id){for(const k of [...crCache.keys()])if(k.startsWith(id+'|'))crCache.delete(k);const i=items.findIndex(x=>x.id===id);if(i<0)return;const it=items[i];if(it.el){it.el.pause();URL.revokeObjectURL(it.el.src);}items.splice(i,1);DB.del('media',id).catch(()=>{});openRows.delete(id);saveItems();mediaChanged();}
async function removeItems(ids,label){
  const saved=[];for(const id of ids){const i=items.findIndex(x=>x.id===id);if(i<0)continue;let blob=null;try{blob=await DB.get('media',id);}catch(e){}
    saved.push({i,meta:Object.fromEntries(META.map(k=>[k,items[i][k]])),blob});}
  for(const id of ids)removeItem(id);if(!saved.length)return;
  const back=saved.filter(x=>x.blob);if(!back.length){toast(label);return;}
  pushUndo({label,fn:async w=>{if(w){for(const x of back)removeItem(x.meta.id);return;}
    for(const x of back.slice().sort((a,b)=>a.i-b.i)){try{const it=await mediaFrom(x.blob,Object.assign({},x.meta));items.splice(Math.min(x.i,items.length),0,it);await DB.put('media',x.meta.id,x.blob);}catch(e){}}
    saveItems();mediaChanged();}});
  toastUndo(label);}
function moveItem(id,to){const i=items.findIndex(x=>x.id===id);if(i<0)return;to=clamp(to,0,items.length-1);if(to===i)return;const [it]=items.splice(i,1);items.splice(to,0,it);saveItems();mediaChanged();}
function mediaChanged(){E.resetMeasure();dirty=true;paintMedia();refreshAll();}
/* ---------------- the background and overlay images: one of each, kept like the media ---------------- */
const PICS={bg:null,ov:null};
const picOf=(im,name)=>({src:im,w:im.width||im.naturalWidth,h:im.height||im.naturalHeight,name});
async function setPic(which,file){
  if(!file||!isImage(file)){toast(file?`${file.name} isn’t an image`:'No image');return;}
  try{PICS[which]=picOf(await loadImage(file),file.name);try{await DB.put('media','pic:'+which,file);}catch(e){}LS.set('pic:'+which,{name:file.name});
    if(which==='ov'){S.ovOn=true;S.ovKind='image';saveSettings();}dirty=true;refreshAll();toast(which==='bg'?'Background image added':'Overlay image added');}
  catch(e){toast(`Couldn’t open ${file.name}`);}}
async function removePic(which){let blob=null;try{blob=await DB.get('media','pic:'+which);}catch(e){}const was=PICS[which],ovOn=S.ovOn,ovKind=S.ovKind;clearPic(which);
  const label=which==='bg'?'Background image removed':'Overlay image removed';if(!blob||!was){toast(label);return;}
  pushUndo({label,fn:async w=>{if(w){clearPic(which);return;}await setPic(which,blob);S.ovOn=ovOn;S.ovKind=ovKind;saveSettings();refreshAll();}});toastUndo(label);}
function clearPic(which){PICS[which]=null;DB.del('media','pic:'+which).catch(()=>{});LS.set('pic:'+which,null);dirty=true;refreshAll();}
async function restorePics(){for(const w of ['bg','ov']){const m=LS.get('pic:'+w);if(!m)continue;
    try{const b=await DB.get('media','pic:'+w);if(b)PICS[w]=picOf(await loadImage(b),m.name);}catch(e){}}dirty=true;refreshAll();}
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
  crispNow=!playing&&S.xCrisp!==false;try{E.paint(ctx,sc,S,FONTS,{scale:cv.width/W,media:drawMedia,bgImg:PICS.bg,ovImg:PICS.ov});}finally{crispNow=false;}
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
/* Grab a piece on the canvas and move it: inside its frame where it's cropped (full bleed, a
   shape it fills), or the slide itself when Slides show each as it is. Ctrl or Alt and scroll
   zooms it; double-click puts it back. It pauses, so what's under the pointer stays put. */
const canvasPt=e=>{const b=cv.getBoundingClientRect(),[W,H]=size();return[(e.clientX-b.left)*W/b.width,(e.clientY-b.top)*H/b.height];};
function inClip(c,x,y){if(!c)return true;const inside=x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h;return c.out?!inside:inside;}
function hitAt(x,y){if(!cur)return null;for(let j=cur.ops.length-1;j>=0;j--){const o=cur.ops[j],r=o.rect;if(!o.item||o.item.placeholder||!o.item.w||o.alpha<=.05||!r)continue;
    if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h&&inClip(o.clip,x,y))return o;}return null;}
function spare(o){const S2=cur.S||S,r=o.rect,m=Math.min(Math.max(0,+S2.mat||0)*o.scale,r.w/3,r.h/3),w=r.w-2*m,h=r.h-2*m,it=o.item,k=Math.max(w/it.w,h/it.h)*Math.max(1,(+it.zm||100)/100);
  return[(it.w*k-w)/2,(it.h*k-h)/2];}
const croppable=o=>o.whole||(cur.S||S).fit!=='fit';
let grab=null,zoomT=0;
cv.addEventListener('pointerdown',e=>{if(busy||e.button!==0)return;const [x,y]=canvasPt(e),o=hitAt(x,y);if(!o||!croppable(o))return;
  e.preventDefault();e.stopPropagation();cv.setPointerCapture(e.pointerId);setPlaying(false);const it=o.item,[sx,sy]=o.whole?[0,0]:spare(o);
  grab={it,whole:!!o.whole,x0:x,y0:y,px:+it.px||0,py:+it.py||0,ox:+it.ox||0,oy:+it.oy||0,sx,sy,u:E.unitOf(...size())};cv.classList.add('grabbing');});
cv.addEventListener('pointermove',e=>{const [x,y]=canvasPt(e);
  if(!grab){const o=e.buttons?null:hitAt(x,y);cv.classList.toggle('grab',!!(o&&croppable(o)));return;}
  const g=grab,it=g.it,dx=x-g.x0,dy=y-g.y0;
  if(g.whole){it.ox=Math.round(g.ox+dx/g.u);it.oy=Math.round(g.oy+dy/g.u);}
  else{if(g.sx>.5)it.px=+clamp(g.px+dx/g.sx*100,-100,100).toFixed(1);if(g.sy>.5)it.py=+clamp(g.py+dy/g.sy*100,-100,100).toFixed(1);}
  dirty=true;});
const letGo=()=>{if(!grab)return;const it=grab.it;grab=null;cv.classList.remove('grabbing');saveItems();openRows.add(it.id);paintMedia();};
cv.addEventListener('pointerup',letGo);cv.addEventListener('pointercancel',letGo);
cv.addEventListener('dblclick',e=>{const [x,y]=canvasPt(e),o=hitAt(x,y);if(!o||!croppable(o))return;const it=o.item;for(const k of ['px','py','ox','oy'])it[k]=0;it.zm=100;saveItems();dirty=true;paintMedia();toast('Position reset');});
cv.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.altKey))return;const [x,y]=canvasPt(e),o=hitAt(x,y);if(!o||!croppable(o))return;e.preventDefault();setPlaying(false);
  const it=o.item,lo=o.whole?30:100,hi=o.whole?200:400;it.zm=+clamp((+it.zm||100)*Math.exp(-e.deltaY*.0025),lo,hi).toFixed(1);dirty=true;
  clearTimeout(zoomT);zoomT=setTimeout(()=>{saveItems();openRows.add(it.id);paintMedia();},250);},{passive:false});
function setPlaying(v){playing=v;const b=$('#play');b.textContent=v?'Pause':'Play';b.setAttribute('aria-label',v?'Pause':'Play');dirty=true;}
$('#play').onclick=()=>setPlaying(!playing);
$('#scrub').addEventListener('input',()=>{setPlaying(false);const P=planNow();clock=$('#scrub').value/1000*P.L;dirty=true;});
function onSet(k){if(openRows.size&&['layout','capOn','oneFit','oneMove','kb','hold','dur'].includes(k))paintMedia();if(['cSize','cW','cH'].includes(k))fitCanvas();if(current&&LOOK.includes(k)&&!edited){edited=true;LS.set('presetEdited',true);}if(['TF','LF','GF','OF','TS','LS','GS','OS','pairs','kern'].includes(k))E.resetMeasure();if(k==='OF'&&FONTS[S.OF]&&document.fonts)document.fonts.load(fontStr(FONTS[S.OF])).then(fontsSettled).catch(()=>{});}
function appRefresh(){const P=planNow();$('#loopChip').textContent=`${P.L.toFixed(1)} s loop`;$('#loopChip').title=`The loop lasts ${P.L.toFixed(2)} seconds, then starts again exactly where it began`;
  $('#countChip').textContent=items.length?(items.length===1?'1 shape':`${items.length} shapes`):'No media yet';
  if(current&&BUILTIN.concat(mine).some(x=>x.name===current)){const e=LOOK.some(moved);if(e!==edited){edited=e;LS.set('presetEdited',e);}}
  const pn=$('#pcapName');pn.textContent=presetName();}

/* ---------------- cards ---------------- */
/* The panel follows what you do: add media, set the canvas, pick the kind of motion, then
   shape, captions and what goes over the top. Each kind shows only its own controls, in the
   same order – how many, what moves and which way, timing, the feel, then its character. */
Object.assign(TIPS,{
  cSize:'The size of what comes out. Presets keep to it – they scale to fit.',bg:'The colour behind everything',fps:'Frames a second in the MP4',
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
  feel:'Glide eases in and out. Soft is gentler – smoothest for zooms. Coast pushes, then glides in a long way. Inertia flicks and coasts to a stop. Spring goes a touch past and settles.',
  lag:'Each shape sets off a beat after the one ahead of it, so the gaps open as they move and close as they land. It takes from the rest time.',
  creep:'Keeps everything moving gently while it rests, so it never quite stops',
  after:'After the last shape: carry straight on round, or pull back to show every shape in a grid, then come back in to the first',
  gCols:'Columns in the grid you pull back to',zFeel:'How the camera eases out and back in. Inertia flicks out and coasts; Spring overshoots and settles.',gSize:'How much of the canvas the grid fills when it’s furthest out',gHold:'How long the whole range stays in view',
  colDir:'Which way each column runs. Alternate: down, up, down…',colSpeed:'Same: each column goes round once a loop. Varied: two, three or four times in a loop twice as long.',
  colLag:'Each column moves this long after the one to its left',colOff:'Sets every other column down by part of a shape, so they don’t line up',
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
function picRow(parent,which,show){
  const row=el('div','img-row'),th=el('span','mthumb'),nm=el('div','slot-name'),add=el('button','pill small'),rm=el('button','pill small icon');
  add.type=rm.type='button';rm.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  const what=which==='bg'?'background image':'overlay image';rm.dataset.tip='Remove';rm.setAttribute('aria-label','Remove the '+what);
  add.onclick=()=>$(which==='bg'?'#bgfile':'#ovfile').click();rm.onclick=()=>removePic(which);row.append(th,nm,add,rm);
  let had;const c=addCustom(parent,show,row);
  c.update=()=>{const p=PICS[which];if(p===had)return;had=p;th.textContent='';th.hidden=!p;if(p)th.append(thumbOf(Object.assign({kind:'image'},p)));
    nm.textContent=p?p.name:(which==='bg'?'No image – the colour shows':'No image yet');nm.classList.toggle('muted',!p);
    add.textContent=p?'Replace':'+ Add image';add.setAttribute('aria-label',(p?'Replace the ':'Add a ')+what);rm.hidden=!p;};
  return c;}
/* Media */
const openRows=new Set();let mediaBox;
{const b=card('media','Media');mediaBox=el('div','media-list');b.append(mediaBox);
  const r=el('div','ctl btn-row'),add=el('button','pill','+ Add images or video');add.type='button';add.onclick=()=>$('#mediafile').click();r.append(add);
  const clr=el('button','pill small','Clear all');clr.type='button';clr.onclick=()=>{if(!items.length)return;removeItems(items.map(it=>it.id),items.length===1?'Cleared 1 file':`Cleared ${items.length} files`);};r.append(clr);b.append(r);
  addHint(b,'Drag a row to change the order. Video plays from its start point as its shape arrives.',()=>items.length>1);
  addHint(b,'Open a row to give that slide its own time on screen, transition or movement.',s=>s.layout==='one'&&items.length>0);
  SUMMARY.media=()=>!items.length?'No media yet':`${items.length} · `+(()=>{const v=items.filter(i=>i.kind==='video').length,i=items.length-v;return [v?`${v} video`:'',i?`${i} image${i>1?'s':''}`:''].filter(Boolean).join(', ');})();}
function thumbOf(it){const c=el('canvas');c.width=88;c.height=64;const x=c.getContext('2d');x.fillStyle='#ddd';x.fillRect(0,0,88,64);
  try{if(it.src&&(it.kind!=='video'||it.src.readyState>=2)){const s=Math.max(88/it.w,64/it.h);x.drawImage(it.src,(88-it.w*s)/2,(64-it.h*s)/2,it.w*s,it.h*s);}}catch(e){}return c;}
let dragId=null;
function paintMedia(){
  mediaBox.textContent='';
  if(!items.length){mediaBox.append(el('div','media-empty','Drop images or video here, or anywhere on the page'));return;}
  items.forEach((it,i)=>{
    const row=el('div','slot'),top=el('div','slot-top'),th=el('span','mthumb'),main=el('div','slot-main'),nm=el('div','slot-name',it.title?it.title.split('\n')[0].replace(/[*{}]|#[0-9a-f]{3,8}:/gi,''):it.name),meta=el('div','slot-meta');
    th.append(thumbOf(it));meta.textContent=(it.kind==='video'?`Video · ${(+it.dur||0).toFixed(1)} s`+(it.fixed?' · range put right':''):`Image · ${it.w} × ${it.h}`)+(S.layout==='one'&&+it.hold>0?` · on for ${+(+it.hold).toFixed(2)} s`:'')+(it.title?` · ${it.name}`:'');if(it.fixed)meta.title='Its stream said full range while the file said video range – Segue made them agree, so the colours come out as they should';
    main.append(nm,meta);main.setAttribute('role','button');main.tabIndex=0;main.setAttribute('aria-expanded',openRows.has(it.id));main.setAttribute('aria-label',`${i+1}. ${it.name} – details`);
    const tog=()=>{openRows.has(it.id)?openRows.delete(it.id):openRows.add(it.id);paintMedia();};main.onclick=tog;main.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tog();}};
    const rm=el('button','pill small icon');rm.type='button';rm.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';rm.dataset.tip='Remove';rm.setAttribute('aria-label','Remove '+it.name);rm.onclick=e=>{e.stopPropagation();removeItems([it.id],`Removed ${it.name}`);};
    const grip=el('span','grip');grip.innerHTML=ICON.grip;grip.setAttribute('aria-hidden','true');top.append(grip,th,main,rm);row.append(top);if(openRows.has(it.id))row.classList.add('open');
    row.draggable=true;row.ondragstart=e=>{dragId=it.id;row.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',it.id);};
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
function itemDetail(it,i){const det=el('div','slot-det'),one=S.layout==='one';
  const sel=(label,key,opts,tip)=>{const w=el('div','ctl sel'),hd=el('div','ctl-head'),lb=el('label',null,label),s=el('select');s.id=`i_${key}_${it.id}`;lb.htmlFor=s.id;
    for(const [v,t] of opts){const o=el('option',null,t);o.value=v;s.append(o);}s.value=it[key]||'default';if(!opts.some(o=>o[0]===s.value))s.value='default';
    s.onchange=()=>{it[key]=s.value;saveItems();dirty=true;refreshAll();};hd.append(lb);if(tip){const q=el('button','q','?');q.type='button';q.dataset.tip=tip;q.setAttribute('aria-label',label+': '+tip);hd.append(q);}w.append(hd,s);det.append(w);};
  /* Slides: this slide's own time, transition and movement – each says what it falls back to */
  if(one){const r=itemRange(det,it,{label:'On screen',key:'hold',min:0,max:Math.max(12,Math.ceil(+it.dur||0)),step:.05,def:0,
      fmt:v=>v>0?`${+v.toFixed(2)} s`:`As set · ${+(+S.hold).toFixed(2)} s`,after:refreshAll,tip:'This slide’s own time on screen. 0 – or double-click the name – for the time set in Motion.'});
    if(it.kind==='video'){const row=el('div','btn-row'),b=el('button','pill small','Whole clip');b.type='button';b.dataset.tip='Stays on screen long enough for the whole clip to play, transitions included';
      b.onclick=()=>{const tr=S.oneMove==='cut'?0:+S.dur||0;r.put(Math.max(.2,+((+it.dur||1)-2*tr).toFixed(2)));};row.append(b);det.append(row);}
    sel('Arrives by','arrive',[['default',`As set · ${optLabel(MOVES_ONE,S.oneMove)}`]].concat(MOVES_ONE.map(o=>[o[0],o[1]])));
    sel('Moves','moves',[['default',`As set · ${optLabel(KB,S.kb)}`]].concat(KB.filter(o=>o[0]!=='vary'&&!(S.oneFit==='bleed'&&o[0]==='parallax')).map(o=>[o[0],o[1]])));}
  /* where it sits: As it is moves the slide itself; anything cropped moves the picture inside its frame */
  {const own=one&&S.oneFit==='own',crop=!own&&(S.fit!=='fit'||(one&&S.oneFit==='bleed'));
    if(own||crop){det.append(el('div','sub-head',own?'Position':'Crop'));const again=()=>paintMediaKeepFocus();
      if(own){itemRange(det,it,{label:'Across',key:'ox',min:-600,max:600,step:1,def:0,unit:' px'});itemRange(det,it,{label:'Up and down',key:'oy',min:-600,max:600,step:1,def:0,unit:' px'});
        itemRange(det,it,{label:'Size',key:'zm',min:30,max:200,step:1,def:100,unit:'%',tip:'This slide bigger or smaller than the rest'});}
      else{const fa=frameAspect(it),ia=it.w&&it.h?it.w/it.h:fa,zoomed=(+it.zm||100)>100.5,wide=ia>fa*1.005,tall=ia<fa/1.005;
        if(zoomed||wide)itemRange(det,it,{label:'Across',key:'px',min:-100,max:100,step:1,def:0,unit:'%',tip:'Which part shows across: −100% the right edge, 100% the left'});
        if(zoomed||tall)itemRange(det,it,{label:'Up and down',key:'py',min:-100,max:100,step:1,def:0,unit:'%',tip:'Which part shows up and down: −100% the bottom, 100% the top'});
        itemRange(det,it,{label:'Zoom',key:'zm',min:100,max:400,step:1,def:100,unit:'%',change:again,tip:'Crop in tighter. Zoomed in, it can move both ways.'});
        if(!zoomed&&!wide&&!tall)addHint(det,'It fits its frame exactly – zoom in to move it.');}
      const row=el('div','btn-row'),rs=el('button','pill small','Reset');rs.type='button';rs.onclick=()=>{for(const k of ['px','py','ox','oy'])it[k]=0;it.zm=100;saveItems();dirty=true;paintMediaKeepFocus();};row.append(rs);det.append(row);
      det.append(el('p','hint','Or drag it on the canvas. Ctrl or Alt and scroll to zoom; double-click to reset.'));}}
  /* the caption, when there are captions */
  if(S.capOn){const txt=(label,key,multi,ph)=>{const w=el('div','ctl txt'),hd=el('div','ctl-head'),lb=el('label',null,label),inp=el(multi?'textarea':'input');if(!multi)inp.type='text';else inp.rows=2;
      inp.id=`i_${key}_${it.id}`;lb.htmlFor=inp.id;inp.value=it[key]||'';inp.placeholder=ph||'';inp.spellcheck=false;
      inp.oninput=()=>{it[key]=inp.value;E.resetMeasure();dirty=true;saveItems();};inp.onchange=()=>{paintMediaKeepFocus();refreshAll();};hd.append(lb);w.append(hd,inp);det.append(w);};
    txt('Title','title',true,'A title – Enter for a new line');txt('Line','line',true,'A line under it');txt('Tags','tags',false,'Tags, split with commas');}
  if(it.kind==='video'){itemRange(det,it,{label:'Start at',key:'start',min:0,max:Math.max(.1,+it.dur||1),step:.04,def:0,fmt:v=>`${v.toFixed(2)} s`});
    const tr=el('div','toggle-row'),tb=el('button','toggle');tb.type='button';tb.setAttribute('role','switch');tb.setAttribute('aria-checked',!!it.levels);tb.setAttribute('aria-label','Lift washed-out colours');tb.append(el('span','box'),el('span',null,'Lift washed-out colours'));
    tb.onclick=()=>{it.levels=!it.levels;tb.setAttribute('aria-checked',it.levels);saveItems();dirty=true;};tr.append(tb);const q=el('button','q','?');q.type='button';q.dataset.tip='For video whose greys look lifted and colours dull – it says it’s full range when it isn’t (Tempo’s promo MP4s up to 0.11.1). Reads it as video range.';q.setAttribute('aria-label','Lift washed-out colours: '+q.dataset.tip);tr.append(q);det.append(tr);}
  const r=el('div','btn-row pairs'),up=el('button','pill small','Move up'),dn=el('button','pill small','Move down');up.type=dn.type='button';up.disabled=i===0;dn.disabled=i===items.length-1;
  up.onclick=()=>moveItem(it.id,i-1);dn.onclick=()=>moveItem(it.id,i+1);r.append(up,dn);det.append(r);
  return det;}
function paintMediaKeepFocus(){const a=document.activeElement,id=a&&a.id;paintMedia();if(id){const n=document.getElementById(id);if(n)n.focus();}}
/* Canvas */
{const b=card('canvas','Canvas');
  build(b,[{t:'seg',k:'cSize',label:'Size',opts:[['4:5','4:5'],['9:16','9:16'],['1:1','1:1'],['16:9','16:9'],['4:3','4:3'],['custom','Custom']]},
    {t:'nums',keys:['cW','cH'],names:['W','H'],label:'Pixels',min:64,max:4096,show:s=>s.cSize==='custom'},
    {t:'colour',k:'bg',label:'Background'}]);
  b.append(el('div','sub-head','Background image'));picRow(b,'bg');
  build(b,[{t:'seg',k:'bgFit',label:'Image',opts:[['fill','Fill the canvas'],['fit','Fit inside']],show:()=>!!PICS.bg},
    {t:'range',k:'bgImgA',label:'Image strength',min:0,max:100,step:1,unit:'%',show:()=>!!PICS.bg},
    {t:'seg',k:'fps',label:'Frame rate',opts:[[24,'24'],[25,'25'],[30,'30'],[60,'60']]}]);
  SUMMARY.canvas=s=>{const [W,H]=E.canvasSize(s);return `${W} × ${H} · ${s.fps} fps`+(PICS.bg?' · image':'');};}
/* Motion: the kind first, then only what that kind uses */
const KINDS=[['one','Slides','A slide at a time – full bleed, as it is or in a shape, with a transition and a little movement in each'],['line','Line','A row or a column of shapes, moving along'],['grid','Grid','Rows of shapes, moving together'],
  ['columns','Columns','Each column running up or down on its own'],['frames','Frames','The frames stay put and the media changes inside them'],['float','Float','Shapes drifting past at different depths']];
const KIND_ICON={
  one:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="11" y="5" width="18" height="18" rx="2"/><rect x="33" y="8" width="7" height="12" rx="1.5" class="dim"/></svg>',
  line:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="1" y="8" width="10" height="12" rx="1.5" class="dim"/><rect x="15" y="8" width="10" height="12" rx="1.5"/><rect x="29" y="8" width="10" height="12" rx="1.5" class="dim"/></svg>',
  grid:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="5" y="3" width="9" height="9" rx="1.5"/><rect x="16" y="3" width="9" height="9" rx="1.5"/><rect x="27" y="3" width="9" height="9" rx="1.5"/><rect x="5" y="15" width="9" height="9" rx="1.5" class="dim"/><rect x="16" y="15" width="9" height="9" rx="1.5" class="dim"/><rect x="27" y="15" width="9" height="9" rx="1.5" class="dim"/></svg>',
  columns:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="5" y="-2" width="9" height="13" rx="1.5"/><rect x="5" y="14" width="9" height="13" rx="1.5" class="dim"/><rect x="16" y="5" width="9" height="13" rx="1.5" class="dim"/><rect x="16" y="21" width="9" height="13" rx="1.5"/><rect x="27" y="-6" width="9" height="13" rx="1.5" class="dim"/><rect x="27" y="10" width="9" height="13" rx="1.5"/></svg>',
  frames:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="3" y="6" width="10" height="16" rx="1" class="line"/><rect x="5.5" y="8.5" width="5" height="7" rx="1"/><rect x="15" y="6" width="10" height="16" rx="1" class="line"/><rect x="17.5" y="8.5" width="5" height="7" rx="1"/><rect x="27" y="6" width="10" height="16" rx="1" class="line"/><rect x="29.5" y="8.5" width="5" height="7" rx="1"/></svg>',
  float:'<svg viewBox="0 0 40 28" aria-hidden="true"><rect x="4" y="13" width="7" height="9" rx="1.2" class="dim"/><rect x="14" y="2" width="12" height="15" rx="1.5"/><rect x="29" y="11" width="6" height="7" rx="1" class="dim"/><rect x="24" y="20" width="9" height="11" rx="1.5"/></svg>'};
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
const FEELS=[['glide','Glide','Eases in and out'],['soft','Soft','A gentle ease in and out'],['coast','Coast','A quick push, then a long glide in'],['inertia','Inertia','A flick that coasts to a stop'],['spring','Spring','A touch past, then settles'],['linear','Linear','An even speed']];
const DIR4=[['left','Left'],['right','Right'],['up','Up'],['down','Down']];
const dirOpts=()=>KIND(S)==='grid'?[['up','Up'],['down','Down']]:DIR4;
function pickDir(v){if(KIND(S)==='line'){S.dir=v;set('layout',v==='left'||v==='right'?'row':'column');return;}set('dir',v);}
const showDir=s=>{const k=KIND(s);if(k==='one')return oneTravels(s)||kbDrifts(s);if(k==='frames')return stepping(s)&&(s.fMove==='push'||s.fMove==='cover');if(k==='columns')return false;return mv(s)!=='still';};
const kindName=s=>optLabel(KINDS,KIND(s));
{const b=card('motion','Motion');kindTiles(b);
  build(b,[
    {t:'seg',k:'oneFit',label:'Each slide',opts:FITS,show:isK('one')},
    {t:'seg',k:'ownScale',label:'Sizes',opts:[['fit','Fit each'],['true','True to scale']],show:s=>isK('one')(s)&&s.oneFit==='own'},
    {t:'range',k:'cols',label:'Columns',min:1,max:8,step:1,show:isK('grid')},
    {t:'range',k:'cols',id:'ccols',label:'Columns',min:2,max:8,step:1,show:isK('columns')},
    {t:'range',k:'fCols',label:'Across',min:1,max:6,step:1,show:isK('frames')},
    {t:'range',k:'fRows',label:'Down',min:1,max:4,step:1,show:isK('frames')},
    {t:'seg',k:'oneMove',label:'Transition',opts:MOVES_ONE,show:isK('one')},
    {t:'seg',k:'trackMove',label:'Move',opts:MOVES_TRACK,show:isK('line','grid','columns','float')},
    {t:'seg',k:'fMove',label:'Change',opts:MOVES_FRAME,show:s=>isK('frames')(s)&&!framesStatic(s)},
    {t:'seg',k:'dir',label:'Direction',optsFn:dirOpts,pick:pickDir,show:showDir},
    {t:'seg',k:'colDir',label:'Directions',opts:[['alt','Alternate'],['up','All up'],['down','All down']],show:s=>isK('columns')(s)&&mv(s)!=='still'},
    {t:'range',k:'depth',label:'Depth',min:0,max:100,step:1,unit:'%',show:isK('float')},
    {t:'range',k:'spread',label:'Spread',min:0,max:300,step:1,unit:'%',show:isK('float')}]);
  addHint(b,'As many frames as media: the frames stay as they are and video plays inside them. Add more media, or fewer frames, to have it change.',s=>isK('frames')(s)&&framesStatic(s));
  {const r=el('div','ctl btn-row'),sh=el('button','pill small','Shuffle');sh.type='button';sh.dataset.tip='Scatter the shapes another way';sh.onclick=()=>set('seed',(Math.round(+S.seed)||0)+1);r.append(sh);addCustom(b,isK('float'),r);}
  build(b,[
    {t:'range',k:'hold',id:'hold1',label:'On screen',min:0,max:8,step:.05,unit:' s',show:s=>isK('one')(s)&&stepping(s),tip:'How long each slide stays before the next transition. Give any slide its own time in Media.'},
    {t:'range',k:'dur',id:'dur1',label:'Transition time',min:.1,max:3,step:.05,unit:' s',show:s=>isK('one')(s)&&stepping(s)&&s.oneMove!=='cut'},
    {t:'range',k:'hold',label:'Rest',min:0,max:6,step:.05,unit:' s',show:s=>stepping(s)&&!isK('one')(s)},
    {t:'range',k:'dur',label:'Move time',min:.1,max:4,step:.05,unit:' s',show:s=>stepping(s)&&!isK('one')(s)&&!(isK('frames')(s)&&s.fMove==='cut')},
    {t:'range',k:'spsh',label:'Each shape',min:.5,max:12,step:.05,unit:' s',show:s=>mv(s)==='drift'&&!isK('frames')(s)},
    {t:'seg',k:'colSpeed',label:'Speeds',opts:[['same','Same'],['varied','Varied']],show:s=>isK('columns')(s)&&mv(s)==='drift'},
    {t:'range',k:'still',label:'Length',min:1,max:60,step:.5,unit:' s',show:s=>mv(s)==='still'||(isK('frames')(s)&&framesStatic(s))},
    {t:'seg',k:'feel',label:'Feel',opts:FEELS,show:s=>stepping(s)&&(isK('one')(s)?oneFeels(s):!(isK('frames')(s)&&s.fMove==='cut'))},
    {t:'seg',k:'kb',label:'Movement',optsFn:()=>S.oneFit==='bleed'?KB.filter(o=>o[0]!=='parallax'):KB,val:s=>s.oneFit==='bleed'&&s.kb==='parallax'?'drift':s.kb,show:isK('one')},
    {t:'range',k:'kbAmt',label:'Amount',min:1,max:30,step:.5,unit:'%',show:s=>isK('one')(s)&&kbOn(s)},
    {t:'range',k:'lag',label:'Lag',min:0,max:.3,step:.005,unit:' s',show:s=>isK('line','grid')(s)&&stepping(s)},
    {t:'range',k:'colLag',label:'Out of step',min:0,max:3,step:.05,unit:' s',show:s=>isK('columns')(s)&&stepping(s)},
    {t:'range',k:'fLag',id:'flag',label:'Lag',min:0,max:2,step:.01,unit:' s',show:s=>isK('frames')(s)&&stepping(s)},
    {t:'range',k:'creep',label:'Keep drifting',min:0,max:60,step:1,unit:'%',show:s=>isK('line','grid','columns','float')(s)&&stepping(s)},
    {t:'range',k:'colOff',label:'Offset',min:0,max:100,step:1,unit:'%',show:isK('columns')},
    {t:'seg',k:'after',label:'After the last',opts:[['carry','Carry on round'],['pull','Pull back to them all']],show:s=>stepping(s)&&isK('one','line')(s)}]);
  const f=fold(b,'pull','Pull back',s=>stepping(s)&&isK('one','line')(s)&&s.after==='pull',false,s=>`${Math.round(s.gCols)} across · ${(+s.zOut+ +s.gHold+ +s.zIn).toFixed(1)} s`);
  build(f,[{t:'range',k:'gCols',label:'Columns',min:1,max:8,step:1,group:'pullfold'},{t:'range',k:'gGap',label:'Gap',min:0,max:240,step:1,unit:' px'},{t:'range',k:'gSize',label:'Fills',min:30,max:100,step:1,unit:'%'},
    {t:'range',k:'zOut',label:'Out',min:.2,max:4,step:.05,unit:' s',tip:'How long the pull back takes'},{t:'range',k:'gHold',label:'All in view',min:0,max:8,step:.05,unit:' s'},{t:'range',k:'zIn',label:'In',min:.2,max:4,step:.05,unit:' s',tip:'How long it takes to come back in to the first'},
    {t:'seg',k:'zFeel',label:'Feel',opts:FEELS},
    {t:'range',k:'gStag',label:'Stagger',min:0,max:100,step:1,unit:'%',tip:'Each shape settles into the grid a beat after the one before, nearest first, so it gathers rather than arriving as one sheet. 0 for one rigid move.'},
    {t:'range',k:'gFloat',label:'Float',min:0,max:100,step:1,unit:'%',tip:'Every shape drifts gently on its own path while they’re pulled back'}]);
  SUMMARY.motion=s=>{const P=planNow(),k=KIND(s),m=k==='one'?[optLabel(FITS,s.oneFit),optLabel(MOVES_ONE,s.oneMove)].join(' · '):k==='frames'?(framesStatic(s)?'Still':optLabel(MOVES_FRAME,s.fMove)):optLabel(MOVES_TRACK,s.trackMove);
    return [kindName(s),m,k==='one'?(s.kb!=='none'?optLabel(KB,s.kb):''):stepping(s)?optLabel(FEELS,s.feel):'',`${P.L.toFixed(1)} s loop`].filter(Boolean).join(' · ');};}
/* Shapes: how they look – the kind decides where they go */
const ownFit=s=>isK('one')(s)&&s.oneFit==='own';
{const b=card('shapes','Shapes',s=>!(isK('one')(s)&&s.oneFit==='bleed'));
  build(b,[{t:'select',k:'ratio',label:'Shape',show:s=>!ownFit(s),opts:[['media','The media’s own'],['16:10','16:10 – laptop'],['16:9','16:9 – widescreen'],['4:3','4:3'],['3:2','3:2'],['1:1','Square'],['4:5','4:5 – portrait post'],['3:4','3:4'],['2:3','2:3'],['9:16','9:16 – story'],['9:19.5','9:19.5 – phone'],['a4p','A4 portrait'],['a4l','A4 landscape'],['custom','Custom']]},
    {t:'nums',keys:['rW','rH'],names:['W','H'],label:'Shape ratio',min:.1,max:100,step:.1,sep:':',show:s=>s.ratio==='custom'&&!ownFit(s)},
    {t:'range',k:'size',label:'Size',min:10,max:100,step:.5,unit:'%',show:isK('one','line','frames'),tip:'How big the shapes are: 100% fills the canvas (Slides, Frames), its height (a row) or its width (a column)'},
    {t:'range',k:'size',id:'gsize',label:'Width',min:10,max:100,step:.5,unit:'%',show:isK('grid','columns'),tip:'How much of the canvas’s width they take'},
    {t:'range',k:'flSize',label:'Size',min:5,max:80,step:.5,unit:'%',show:isK('float'),tip:'How wide the nearest shapes are, against the canvas'},
    {t:'range',k:'gap',label:'Gap',min:0,max:240,step:1,unit:' px',show:isK('line','grid','columns','frames')},
    {t:'range',k:'radius',label:'Corners',min:0,max:120,step:1,unit:' px'},
    {t:'seg',k:'fit',label:'Media',opts:[['fill','Fill the shape'],['fit','Fit inside']],show:s=>!ownFit(s)},
    {t:'colour',k:'shapeBg',label:'Behind the media',show:s=>!ownFit(s)}]);
  const f=fold(b,'border','Border and edge',null,true,s=>[s.mat>0?`${Math.round(s.mat)} px border`:'',s.edge?`${s.edgeW} px edge`:''].filter(Boolean).join(' · ')||'Off');
  build(f,[{t:'range',k:'mat',label:'Border',min:0,max:120,step:1,unit:' px'},{t:'colour',k:'matC',label:'Border colour',show:s=>s.mat>0},{t:'range',k:'matR',label:'Inner corners',min:0,max:120,step:1,unit:' px',show:s=>s.mat>0},
    {t:'toggle',k:'edge',label:'Edge'},{t:'colour',k:'edgeC',label:'Edge colour',show:s=>s.edge},{t:'range',k:'edgeW',label:'Edge width',min:.5,max:12,step:.5,unit:' px',show:s=>s.edge}]);
  const g=fold(b,'nudge','Position',s=>!isK('float')(s),true,s=>(+s.nudgeX||+s.nudgeY)?`${Math.round(s.nudgeX)}, ${Math.round(s.nudgeY)} px`:'Centred');
  build(g,[{t:'range',k:'nudgeX',label:'Across',min:-600,max:600,step:1,unit:' px',tip:'Move every shape left or right'},{t:'range',k:'nudgeY',label:'Up and down',min:-600,max:600,step:1,unit:' px',tip:'Move every shape up or down'}]);
  SUMMARY.shapes=s=>[ownFit(s)?'Their own':s.ratio==='custom'?`${s.rW}:${s.rH}`:s.ratio==='media'?'Media’s own':({a4p:'A4 portrait',a4l:'A4 landscape'}[s.ratio]||s.ratio),s.radius?`${s.radius} px corners`:'Square corners',s.mat>0?'Border':''].filter(Boolean).join(' · ');}
/* Captions, with the fonts they're set in */
const WHERE=[['under','Under'],['above','Above'],['over','On it'],['fixed','Fixed']];
let fontBox;
{const b=card('captions','Captions');
  build(b,[{t:'toggle',k:'capOn',label:'Captions'},
    {t:'seg',k:'capWhere',label:'Where',val:s=>E.capWhereOf(s),optsFn:()=>['columns','frames','float'].includes(S.layout)?WHERE.slice(0,3):S.layout==='one'&&S.oneFit==='bleed'?WHERE.slice(2):WHERE,show:s=>s.capOn},
    {t:'seg',k:'capAlign',label:'Align',opts:[['left','Left'],['centre','Centre'],['right','Right']],show:s=>s.capOn},
    {t:'seg',k:'capV',label:'Sits',opts:[['top','Top'],['bottom','Bottom']],show:s=>s.capOn&&E.capWhereOf(s)==='fixed'},
    {t:'range',k:'capMargin',label:'Margin',min:0,max:300,step:1,unit:' px',show:s=>s.capOn&&E.capWhereOf(s)==='fixed'},
    {t:'range',k:'capSpace',label:'Space',min:0,max:200,step:1,unit:' px',show:s=>s.capOn&&E.capWhereOf(s)!=='fixed'},
    {t:'seg',k:'capReveal',label:'Arrives',opts:[['none','As it is'],['fade','Fade'],['rise','Rise'],['scramble','Scramble']],show:s=>s.capOn&&!isK('columns','float')(s)},
    {t:'range',k:'capRevealDur',label:'Over',min:.1,max:3,step:.05,unit:' s',show:s=>s.capOn&&s.capReveal!=='none'&&!isK('columns','float')(s)}]);
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
  /* the fonts live here: captions are where they're used (and the overlay's text, below) */
  const fo=fold(b,'fonts','Fonts',null,true,()=>{const n=ownFontIds().length;return n?`${n} of your own`:'Built in';});fontBox=el('div','font-list');addCustom(fo,null,fontBox);
  const r=el('div','ctl btn-row'),add=el('button','pill small','+ Add font');add.type='button';add.onclick=()=>$('#fontfile').click();r.append(add);addCustom(fo,null,r);
  addHint(fo,'OTF, TTF or WOFF. Fonts you add stay on this computer, in this browser, and show in every Font menu – the overlay’s too.');
  SUMMARY.captions=s=>s.capOn?[optLabel(WHERE,E.capWhereOf(s)),(FONTS[s.TF]||FONTS.default).label,isK('columns','float')(s)?'':optLabel([['none','As it is'],['fade','Fade'],['rise','Rise'],['scramble','Scramble']],s.capReveal)].filter(Boolean).join(' · '):'Off';}
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
{const b=card('overlay','Overlay');const on=s=>s.ovOn,txt=s=>s.ovOn&&s.ovKind==='text',img=s=>s.ovOn&&s.ovKind==='image';
  build(b,[{t:'toggle',k:'ovOn',label:'Over the top'},
    {t:'seg',k:'ovKind',label:'What',opts:[['text','Text'],['image','Image']],show:on},
    {t:'text',k:'ovText',label:'Text',multi:true,rows:2,placeholder:'Type here – Enter for a new line',show:txt}]);
  picRow(b,'ov',img);
  build(b,[{t:'range',k:'ovW',label:'Width',min:2,max:150,step:.5,unit:'%',show:img}]);
  placePad(b,on);
  build(b,[{t:'range',k:'ovM',label:'Margin',min:0,max:400,step:1,unit:' px',show:on},
    {t:'seg',k:'ovBlend',label:'Blend',opts:[['normal','Normal'],['difference','Difference'],['multiply','Multiply'],['screen','Screen']],show:on},
    {t:'range',k:'ovA',label:'Opacity',min:0,max:100,step:1,unit:'%',show:on},
    {t:'seg',k:'ovZ',label:'Sits',opts:[['top','Over everything'],['mid','Among the shapes']],show:s=>on(s)&&isK('float')(s)&&(+s.depth||0)>0}]);
  const ty=fold(b,'ovType','Type',txt,true);
  build(ty,[{t:'select',k:'OF',label:'Font',optsFn:fontOpts},{t:'range',k:'OS',label:'Size',min:8,max:600,step:1,unit:' px'},
    {t:'range',k:'OTr',label:'Tracking',min:-150,max:400,step:1,tip:'Space between letters, in thousandths of the size'},{t:'range',k:'OLd',label:'Leading',min:.6,max:2.5,step:.01,unit:'×'},
    {t:'colour',k:'OC',label:'Colour'},{t:'seg',k:'OCase',label:'Case',opts:[['as','As typed'],['upper','Upper'],['lower','Lower']]}]);
  addHint(ty,'*Stars* and {#hex:words} colour words, as in captions. Kerning pairs from Captions apply here too.');
  const nu=fold(b,'ovNudge','Nudge',on,true,s=>(+s.ovX||+s.ovY)?`${Math.round(s.ovX)}, ${Math.round(s.ovY)} px`:'None');
  build(nu,[{t:'range',k:'ovX',label:'Across',min:-600,max:600,step:1,unit:' px'},{t:'range',k:'ovY',label:'Up and down',min:-600,max:600,step:1,unit:' px'}]);
  SUMMARY.overlay=s=>!s.ovOn?'Off':[s.ovKind==='image'?(PICS.ov?'Image':'Image – none yet'):(String(s.ovText||'').trim()?`“${String(s.ovText).split('\n')[0].replace(/[*{}]|#[0-9a-f]{3,8}:/gi,'').slice(0,18)}”`:'Text – none yet'),
    optLabel(PLACES,s.ovPos),s.ovBlend!=='normal'?optLabel([['difference','Difference'],['multiply','Multiply'],['screen','Screen']],s.ovBlend):''].filter(Boolean).join(' · ');}

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
  {name:'Fade with caption',tip:'One into the next, with a caption fixed in the corner',s:{layout:'one',oneFit:'shape',ratio:'4:5',size:78,radius:6,oneMove:'fade',hold:1.6,dur:.6,after:'carry',capOn:true,capWhere:'fixed',capV:'bottom',capAlign:'left',capMargin:64,capReveal:'rise',TF:'inter6',TS:40,TTr:-10,TCase:'as'}},
  {name:'Card stack',tip:'A column of cards with captions, a flick at a time, pulling back to show them all at the end',s:{layout:'column',ratio:'16:10',size:86,gap:64,radius:12,trackMove:'step',dir:'up',feel:'inertia',hold:1.2,dur:.7,after:'pull',gCols:3,gGap:40,gSize:88,zOut:1.1,gHold:1.6,zIn:1.1,capOn:true,capWhere:'under',capReveal:'scramble'}},
  {name:'Phone swipe',tip:'Phone screens swiped along – each sets off a beat after the one ahead, then glides in',s:{layout:'row',ratio:'9:19.5',size:44,gap:80,radius:22,trackMove:'step',dir:'left',feel:'coast',hold:.25,dur:2.1,lag:.045,after:'carry',capOn:false,bg:'#E0E0DE',shapeBg:'#111111'}},
  {name:'Carousel',tip:'Tall cards drifting along in a row, never stopping',s:{layout:'row',ratio:'custom',rW:9,rH:20,size:59,gap:49,radius:14,trackMove:'drift',dir:'left',spsh:2.67,capOn:false,bg:'#1D1C23',shapeBg:'#2B2A31'}},
  {name:'Rows up',tip:'Rows of shapes stepping up together, a row at a time',s:{layout:'grid',cols:3,size:92,gap:24,radius:8,ratio:'4:5',trackMove:'step',dir:'up',feel:'glide',hold:1,dur:.9,capOn:false}},
  {name:'Columns up and down',tip:'Columns stepping down and up in turn, each a beat after the last',s:{layout:'columns',cols:3,ratio:'4:5',size:94,gap:18,radius:8,trackMove:'step',colDir:'alt',colLag:.35,colOff:50,feel:'coast',hold:.6,dur:1.1,capOn:false,bg:'#111111',shapeBg:'#222222'}},
  {name:'Masonry drift',tip:'A wall of work in columns drifting down and up at their own speeds, each piece its own shape',s:{layout:'columns',cols:3,ratio:'media',size:100,gap:12,radius:6,trackMove:'drift',colDir:'alt',colSpeed:'varied',spsh:3.2,colOff:35,capOn:false,bg:'#0B0B0B',shapeBg:'#1C1C1C'}},
  {name:'Posters',tip:'Three mounted posters that hold still while the work inside them pushes up, one after another',s:{layout:'frames',fCols:3,fRows:1,ratio:'3:4',size:92,gap:34,radius:0,mat:12,matC:'#FFFFFF',matR:6,fMove:'push',dir:'up',feel:'glide',hold:2.2,dur:.9,fLag:.6,capOn:false,bg:'#A3A3A3',shapeBg:'#E6E6E3'}},
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
  cardToSheet(b,'presets');}
function paintPresets(){presetBox.textContent='';
  /* a preset is its name and a small picture of its kind; what it does is in its tooltip */
  const row=(p,own)=>{const r=el('div','slot preset-row'),top=el('div','slot-top'),main=el('div','slot-main'),nm=el('div','slot-name',p.name),ic=el('span','pk');ic.innerHTML=KIND_ICON[E.kindOf(p.s)]||'';
    if(p.tip||own)main.dataset.tip=p.tip||(optLabel(KINDS,E.kindOf(p.s))+' – one of yours');main.append(nm);if(own)top.append(ic);   /* built-ins sit under their kind already; yours are mixed, so they show it */main.setAttribute('role','button');main.tabIndex=0;main.setAttribute('aria-label','Use '+p.name);main.onclick=()=>{applyPreset(p);paintPresets();};main.onkeydown=e=>{if(e.key==='Enter'){applyPreset(p);paintPresets();}};
    top.append(main);if(current===p.name){const t=el('span','tag','In use');top.append(t);r.classList.add('on');}
    if(own){const rm=el('button','pill small icon');rm.type='button';rm.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';rm.dataset.tip='Delete';rm.setAttribute('aria-label','Delete '+p.name);
      rm.onclick=e=>{e.stopPropagation();mine=mine.filter(x=>x!==p);LS.set('presets',mine);paintPresets();};top.append(rm);}
    r.append(top);presetBox.append(r);};
  for(const [k,label] of KINDS){const ps=BUILTIN.filter(p=>E.kindOf(p.s)===k);if(!ps.length)continue;presetBox.append(el('div','sub-head',label));for(const p of ps)row(p,false);}
  if(mine.length){presetBox.append(el('div','sub-head','Yours'));for(const p of mine)row(p,true);}}
$('#presetfile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const j=JSON.parse(await f.text()),list=(j.presets||[]).filter(p=>p&&p.name&&p.s);let n=0;for(const p of list){p.s=sanitise(p.s);mine=mine.filter(x=>x.name!==p.name);mine.push({name:String(p.name).slice(0,60),s:p.s});n++;}
    LS.set('presets',mine);paintPresets();toast(n===1?'Loaded 1 preset':`Loaded ${n} presets`);}catch(err){toast('That isn’t a Segue presets file');}};
