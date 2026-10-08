/* Ensemble Tools – shared core.
   This is not a standalone script: build.py places it inside each app's
   (()=>{ ... })() wrapper, straight after `const APP='<app name>'`, then the
   app's own files, then core-end.js. Everything shares one scope, as in v0.8.1.

   Each app must define these functions (plain `function` declarations, so
   they're available before the app file is reached):
     loadSettings()      return the settings object S at start-up
     saveSettings()      write S to storage (called 300 ms after a change)
     onSettingsChange()  any change to S, before the save is scheduled
     fitCanvas()         size the preview canvas
     tick(now)           the requestAnimationFrame preview loop
     schedulePicker(ms)  refresh the glyph picker (a no-op without one)
     refreshNotes()      refresh hints that depend on the loaded fonts
     refreshImageCard()  refresh the image card (a no-op without one)
     appStart()          first paint, once every card exists
   Optional: appFontRow(style,row,top,removeButton) – an app that defines it
   draws its own controls on each row of the Fonts card in place of Rubato's
   Default / Use and "Use in style swaps"; it may return the element a variable
   font's axis controls go in. appFontList(list) – add to the list after the
   rows. appFontsLoaded(newStyles,manifest) – after fonts are added (manifest:
   the JSON file found in a .zip of fonts, if any). appFontsRestored() – once
   the saved fonts are back after a reload. appDropFiles(files) – files dropped
   on the page; returns those left for the fonts (Tempo takes its own screen
   savers and preset files).
*/
/* ---------------- settings ---------------- */
const D={texts:['Lazaar'],seq:false,tracking:0,leading:1.05,
  aspect:'1:1',cw:1080,ch:1080,fit:'block',size:30,align:'centre',valign:'middle',margin:10,
  bg:'#ffffff',ink:'#000000',transparent:false,style:'fill',stroke:20,
  baseSlot:'',stretch:false,qClear:true,axOn:false,axTag:'wght',axFrom:0,axTo:1,axCycles:1,axStagger:.5,axFeel:'smooth',mode:'fluid',order:'ltr',anchor:'centre',
  fCycles:1,fY:5,fX:0,fRot:0,fScale:0,fStretch:0,fStagger:.5,fSharp:0,
  sSteps:4,sRest:true,sY:14,sX:0,sRot:0,sScale:0,sStretch:0,sUnison:0,sSnap:.3,sOver:1.6,sStagger:.35,
  tDir:'up',tDist:100,tIn:.3,tHold:.3,tOut:.25,tStagger:.45,tExit:'continue',tMask:'line',tFade:false,tRot:0,tScale:0,tAxis:'both',tEase:'expo',
  vMode:'off',vPattern:'random',vSteps:6,vChance:.5,vRest:false,vOffset:true,vStyle:'roll',vDur:.4,vStagger:.3,vReflow:true,picks:{},
  qStyle:'roll',qDir:'up',qAxis:'vertical',qEase:'snappy',qDur:.35,qStagger:.3,qStack:4,qTrail:.5,
  rOn:false,rRows:4,rGap:0,rScroll:1,rDelay:0,rMarq:0,rAlt:true,rMix:'alternate',
  iPlace:'behind',iBlend:'normal',iScale:1,iOpacity:1,iSway:0,iRise:0,
  dur:3,seed:1,gFps:25,gScale:.5,vLoops:2,xScale:1,
  ssEvery:2,ssShuffle:false,ssReseed:true,ssSpeed:1,ssDrift:.4,ssImage:true,
  tab:'studio',ssShape:'laptop',ssTracking:0,ssLeading:1,ssAlt:'off',ssAltRate:6,ssRotate:'off',ssShow:'clock',ssH24:true,ssSep:'comma',ssSecs:false,ssZero:true,ssPulse:false,ssLine2:'none',ssCaps:false,
  ssChange:'roll',ssFeel:'snappy',ssLen:.7,ssAmbient:false,ssAlign:'left',ssVAlign:'top',ssMove:false,ssSize:62,ssMargin:8,ssTabular:true,
  ssLookCol:'own',ssColBy:'type',ssBg:'#5B23F0',ssP1:'#FFF35C',ssP2:'#5DE0C0',ssP3:'#FFFFFF',ssP4:'#FF8FD0'};
const fresh=()=>JSON.parse(JSON.stringify(D));
/* Storage. Each app keeps its own keys ('rubato:…', 'tempo:…') and never reads
   another app's. (Tempo copies what it needs from v0.8.1's 'rubato:' keys once,
   in its own loadSettings.) */
function store(prefix){return{
  get(k){try{return JSON.parse(localStorage.getItem(prefix+':'+k))}catch(e){return null}},
  set(k,v){try{localStorage.setItem(prefix+':'+k,JSON.stringify(v))}catch(e){}}};}
const LS=store(APP);
function sanitise(o){
  const r={};if(!o||typeof o!=='object')return r;
  for(const k in D){
    if(!(k in o))continue;const v=o[k],d=D[k];
    if(Array.isArray(d)){if(Array.isArray(v)&&v.length&&v.every(x=>typeof x==='string'))r[k]=v.slice(0,12);}
    else if(d&&typeof d==='object'){if(v&&typeof v==='object'&&!Array.isArray(v)){const pk={};for(const c in v)if(Array.isArray(v[c]))pk[c]=v[c].filter(x=>typeof x==='string');r[k]=pk;}}
    else if(typeof v===typeof d)r[k]=v;
  }
  if(!r.texts&&typeof o.text==='string')r.texts=[o.text];
  if(o.fit==='stretch'||o.fit==='cap'){r.fit='block';if(o.fit==='stretch')r.stretch=true;}
  if(o.stretch===undefined&&o.rOn&&o.rStretch!==false)r.stretch=true;
  return r;
}
let S=loadSettings();
const eng=createEngine();eng.use(S);
const FAMILY='"Inter Tight","Helvetica Neue",Arial,sans-serif';
const {fallbacks,F,baseSlot,availSlots,anyLoaded,charOptions,optCache,vkey,renderFrame,buildScene,clamp,lerp,E,TAU}=eng;
let saveTimer=0;function autosave(){onSettingsChange();clearTimeout(saveTimer);saveTimer=setTimeout(saveSettings,300);}
/* ---------------- fonts ---------------- */
const ALT_FEATURES=/^(aalt|salt|ss\d\d|cv\d\d|swsh)$/;
const ALT_EXCLUDE=/\.(sc|smcp|c2sc|sups|sinf|subs|numr|dnom|case|tf|lf|osf|tosf|pnum|onum|lnum|tnum|frac|ordn|superior|inferior|init|medi|fina|isol)$/i;
function expandCoverage(cov){const out=[];if(!cov)return out;if(cov.format===1)return cov.glyphs.slice();for(const r of cov.ranges)for(let g=r.start;g<=r.end;g++)out[r.index+(g-r.start)]=g;return out;}
function findAlternates(font){
  const n=font.glyphs.length,map=new Map();
  const nameOf=g=>{try{return font.glyphs.get(g).name||''}catch(e){return''}};
  const add=(b,a)=>{if(a==null||a===b||a<=0||a>=n)return;if(ALT_EXCLUDE.test(nameOf(a)))return;let arr=map.get(b);if(!arr){arr=[];map.set(b,arr);}if(!arr.includes(a))arr.push(a);};
  const gsub=font.tables.gsub;
  if(gsub&&gsub.features&&gsub.lookups){
    const ids=new Set();
    for(const f of gsub.features)if(ALT_FEATURES.test(f.tag)&&f.feature)for(const i of f.feature.lookupListIndexes)ids.add(i);
    for(const i of ids){const lk=gsub.lookups[i];if(!lk)continue;
      for(let st of lk.subtables){let type=lk.lookupType;if(type===7&&st.extension){type=st.lookupType;st=st.extension;}
        try{const cov=expandCoverage(st.coverage);
          if(type===1){if(st.substFormat===1)cov.forEach(g=>add(g,(g+st.deltaGlyphId)&0xFFFF));else cov.forEach((g,ci)=>add(g,st.substitute[ci]));}
          else if(type===3)cov.forEach((g,ci)=>(st.alternateSets[ci]||[]).forEach(a=>add(g,a)));
        }catch(e){}}}
  }
  const byName=new Map();for(let g=0;g<n;g++){const nm=nameOf(g);if(nm)byName.set(nm,g);}
  for(let g=0;g<n;g++){const nm=nameOf(g);const dot=nm.indexOf('.');if(dot>0){const b=byName.get(nm.slice(0,dot));if(b!=null)add(b,g);}}
  return map;
}
const txt=t=>!t?'':typeof t==='string'?t:(t.en||Object.values(t)[0]||'');
function nameRec(nm,...keys){for(const k of keys){const t=(nm.windows&&nm.windows[k])||(nm.macintosh&&nm.macintosh[k])||nm[k];const s=txt(t);if(s)return s;}return'';}
/* one parsed font file, shared by every style made from it */
function parseFile(buf,fileName){
  if(!window.opentype)throw new Error('parser');
  const font=opentype.parse(buf.slice(0));
  const upm=font.unitsPerEm||1000,os2=font.tables.os2||{},nm=font.names||{};
  let cap=os2.sCapHeight;if(!cap){try{cap=font.charToGlyph('H').getBoundingBox().y2}catch(e){}}if(!cap)cap=upm*.7;
  const asc=os2.sTypoAscender||font.ascender||upm*.8,desc=os2.sTypoDescender||font.descender||-upm*.2;
  const family=nameRec(nm,'typographicFamily','preferredFamily','fontFamily')||fileName.replace(/\.[^.]+$/,'');
  const sub=nameRec(nm,'typographicSubfamily','preferredSubfamily','fontSubfamily');
  const fv=font.tables.fvar,variable=!!(fv&&fv.axes&&fv.axes.length&&(font.tables.gvar||font.tables.cff2));
  const axes=variable?fv.axes.map(a=>({tag:a.tag,min:a.minValue,def:a.defaultValue,max:a.maxValue,name:txt(a.name)||a.tag})).filter(a=>a.max>a.min):[];
  const instances=variable?(fv.instances||[]).map(i=>({name:txt(i.name),coords:i.coordinates||{}})).filter(i=>i.name):[];
  const altMap=findAlternates(font);
  const altChars=[];try{const cm=font.tables.cmap.glyphIndexMap;for(const cp in cm){const c=+cp;if(c>32&&c<0x2000&&altMap.has(cm[cp]))altChars.push(String.fromCodePoint(c));}}catch(e){}
  return{font,fileName,family,sub,upm,cap,asc,desc,axes,instances,altMap,altChars,weightClass:os2.usWeightClass||400,hasHvar:!!font.tables.hvar};
}
/* a face: one file at one set of axis values */
function makeFace(F0,coords){
  const font=F0.font,upm=F0.upm,axes=F0.axes;
  const co=axes.length?Object.fromEntries(axes.map(a=>[a.tag,clamp(coords&&coords[a.tag]!=null?+coords[a.tag]:a.def,a.min,a.max)])):null;
  const qz=(a,v)=>{const st=(a.max-a.min)/240;return Math.round((v-a.min)/st)*st+a.min;};
  const merge=over=>{const c=Object.assign({},co);for(const k in over){const a=axes.find(x=>x.tag===k);if(a)c[k]=qz(a,clamp(over[k],a.min,a.max));}return c;};
  const ck=c=>c?axes.map(a=>c[a.tag].toFixed(2)).join(','):'';
  const pd=new Map(),p2=new Map(),adv=new Map(),kc=new Map(),bb=new Map(),glyph=g=>font.glyphs.get(g);
  const advC=(g,c)=>{const k=g+'|'+ck(c);let v=adv.get(k);if(v==null){v=0;try{const gl=glyph(g);v=(gl._advanceWidth!==undefined?gl._advanceWidth:gl.advanceWidth)||0;
    if(c&&F0.hasHvar&&font.variation&&font.variation.getTransform){const t=font.variation.getTransform(gl,c);if(t&&isFinite(t.advanceWidth))v=t.advanceWidth;}}catch(e){console.warn(e);}adv.set(k,v);}return v;};
  const pathC=(g,c)=>{const k=g+'|'+ck(c);let d=pd.get(k);if(d==null){try{d=glyph(g).getPath(0,0,upm,c?{variation:c}:{},font).toPathData(2)}catch(e){d=''}pd.set(k,d);}return d;};
  const p2C=(g,c)=>{const k=g+'|'+ck(c);let p=p2.get(k);if(!p){p=new Path2D(pathC(g,c));p2.set(k,p);}return p;};
  const inst=co&&F0.instances.find(i=>axes.every(a=>Math.abs((i.coords[a.tag]!=null?i.coords[a.tag]:a.def)-co[a.tag])<.5));
  const styleName=co?(inst?inst.name:axes.map(a=>a.tag+' '+Math.round(co[a.tag])).join(' ')):F0.sub;
  return{ot:true,font,file:F0.fileName,family:F0.family,name:(F0.family+' '+styleName).trim(),styleName,upm,asc:F0.asc,desc:F0.desc,cap:F0.cap,
    weightClass:co&&co.wght!=null?co.wght:F0.weightClass,altChars:F0.altChars,axes,coords:co,instances:F0.instances,
    base:ch=>font.charToGlyphIndex(ch)||0,
    alts:ch=>{const b=font.charToGlyphIndex(ch);return b?(F0.altMap.get(b)||[]):[]},
    glyphName:g=>{try{return glyph(g).name||''}catch(e){return''}},
    adv:g=>advC(g,co),
    kern:(a,b)=>{const k=a*65536+b;let v=kc.get(k);if(v==null){try{v=font.getKerningValue(a,b)||0}catch(e){v=0}kc.set(k,v);}return v;},
    pathD:g=>pathC(g,co),
    bbox:g=>{let b=bb.get(g);if(!b){try{const r=glyph(g).getPath(0,0,upm,co?{variation:co}:{},font).getBoundingBox();b=isFinite(r.y1)&&isFinite(r.y2)?[-r.y1,r.y2]:[0,0];}catch(e){b=[0,0]}bb.set(g,b);}return b;},
    draw:(ctx,g,outline)=>{const p=p2C(g,co);outline?ctx.stroke(p):ctx.fill(p);},
    advAt:co?(g,over)=>advC(g,merge(over)):null,
    pathDAt:co?(g,over)=>pathC(g,merge(over)):null,
    drawAt:co?(ctx,g,outline,over)=>{const p=p2C(g,merge(over));outline?ctx.stroke(p):ctx.fill(p);}:null};
}
/* Font files, styles and the image, in this browser. Each app has its own
   store (IndexedDB 'rubato', 'tempo'); an app other than Rubato copies Rubato's
   fonts the first time it opens, then the two stay separate. */
function fontStore(name){return{open(){return new Promise((res,rej)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('fonts');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});},
  async run(mode,fn){try{const db=await this.open();return await new Promise((res,rej)=>{const tx=db.transaction('fonts',mode);const st=tx.objectStore('fonts');const rq=fn(st);tx.oncomplete=()=>res(rq&&rq.result);tx.onerror=()=>rej(tx.error);});}catch(e){return null}},
  put(k,v){return this.run('readwrite',s=>s.put(v,k))},get(k){return this.run('readonly',s=>s.get(k))},del(k){return this.run('readwrite',s=>s.delete(k))}};}
const DB=fontStore(APP==='rubato'?'rubato':APP);
const files=new Map();let styles=[],faceVer=0;
const newId=()=>Math.random().toString(36).slice(2,8);
let saveStylesT=0;
/* a style can be switched off (kept, but not used); only Tempo does that */
function saveStyles(){clearTimeout(saveStylesT);saveStylesT=setTimeout(()=>DB.put('styles',styles.map(s=>{const o={id:s.id,fid:s.fid,coords:s.coords||null,swap:s.swap!==false};if(s.off)o.off=true;return o;})),250);}
function pushFaces(){eng.setFaces(styles.filter(s=>!s.off).map(s=>({id:s.id,face:s.face,swap:s.swap!==false})));faceVer++;optCache.clear();dirty=true;}
function applyStyles(){pushFaces();fontsChanged();}
/* a .zip, read in the browser: [{name,data}] (stored and deflated entries) */
async function unzip(ab){const u=new Uint8Array(ab),dv=new DataView(ab),td=new TextDecoder();let e=u.length-22;while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;if(e<0)throw new Error('not a zip');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const out=[];
  for(let i=0;i<n;i++){if(dv.getUint32(p,true)!==0x02014b50)break;
    const meth=dv.getUint16(p+10,true),csz=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true);
    const name=td.decode(u.subarray(p+46,p+46+nl));p+=46+nl+xl+cl;if(name.endsWith('/'))continue;
    const start=lo+30+dv.getUint16(lo+26,true)+dv.getUint16(lo+28,true),raw=u.subarray(start,start+csz);
    let data=null;if(meth===0)data=raw.slice();else if(meth===8&&window.DecompressionStream)data=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    if(data)out.push({name,data});}
  return out;}
/* Fonts from files, or from a .zip of them. A font already loaded (same family
   and style) is skipped, as are a zip's Mac '._' files and anything in it that
   isn't an OTF, TTF or WOFF with outlines. */
async function loadFiles(list){
  if(!window.opentype){toast("The font reader didn't load. Check your connection and reload.");return;}
  const flat=[];let manifest=null,skipped=0,dupes=0;
  for(const f of list){
    if(!/\.zip$/i.test(f.name)){flat.push(f);continue;}
    let ents=[];try{ents=await unzip(await f.arrayBuffer());}catch(e){toast(`Couldn't open ${f.name}.`);continue;}
    for(const z of ents){const base=z.name.split('/').pop();if(!base||base.startsWith('.')||/(^|\/)__MACOSX\//.test(z.name))continue;
      if(/\.json$/i.test(base)){try{manifest=JSON.parse(new TextDecoder().decode(z.data));}catch(e){}continue;}
      if(!z.data.length||!/\.(otf|ttf|woff)$/i.test(base)){skipped++;continue;}
      flat.push({name:base,inZip:true,arrayBuffer:async()=>z.data.buffer.slice(z.data.byteOffset,z.data.byteOffset+z.data.byteLength)});}}
  const got=[],seen=new Set(styles.filter(s=>!s.coords).map(s=>{const r=files.get(s.fid);return r?(r.family+'|'+r.sub).toLowerCase():'';}));
  for(const f of flat){
    if(/\.woff2$/i.test(f.name)){toast(`${f.name}: WOFF2 isn't supported. Use the OTF or TTF.`);continue;}
    try{const buf=await f.arrayBuffer(),rec=parseFile(buf,f.name),key=(rec.family+'|'+rec.sub).toLowerCase();
      if(seen.has(key)){dupes++;continue;}seen.add(key);got.push({rec,buf,name:f.name});}
    catch(e){console.error(e);if(f.inZip)skipped++;else toast(`Couldn't read ${f.name}. Use an OTF, TTF or WOFF file.`);}
  }
  const left=[dupes?`${dupes} already loaded`:'',skipped?`${skipped} with no outlines to use`:''].filter(Boolean).join(', ');
  if(!got.length){if(left)toast(`Nothing new – ${left}.`);if(manifest&&typeof appFontsLoaded==='function')appFontsLoaded([],manifest);return;}
  got.sort((a,b)=>a.rec.weightClass-b.rec.weightClass);
  const added=[];
  for(const g of got){const fid=newId();files.set(fid,g.rec);await DB.put('file:'+fid,{name:g.name,buf:g.buf});
    const st={id:newId(),fid,coords:null,swap:true};st.face=makeFace(g.rec,null);styles.push(st);added.push(st);}
  saveStyles();applyStyles();
  if(typeof appFontsLoaded==='function')appFontsLoaded(added,manifest);
  const v=got.filter(g=>g.rec.axes.length).length;
  toast((got.length===1?`${got[0].rec.family}${v?' (variable)':''} added`:`${got.length} fonts added`)+(left?` – skipped ${left}`:''));
}
function removeStyle(id){
  const st=styles.find(s=>s.id===id);if(!st)return;styles=styles.filter(s=>s!==st);
  if(!styles.some(s=>s.fid===st.fid)){files.delete(st.fid);DB.del('file:'+st.fid);}
  saveStyles();applyStyles();
}
function addInstance(id){
  const st=styles.find(s=>s.id===id);if(!st)return;const F0=files.get(st.fid);
  const used=styles.filter(s=>s.fid===st.fid).map(s=>s.face.styleName);
  const next=F0.instances.find(i=>!used.includes(i.name));
  const coords=next?Object.assign({},next.coords):Object.assign({},st.face.coords);
  const ns={id:newId(),fid:st.fid,coords,swap:true};ns.face=makeFace(F0,coords);
  styles.splice(styles.indexOf(st)+1,0,ns);saveStyles();applyStyles();
}
function setCoords(id,coords){const st=styles.find(s=>s.id===id);if(!st)return;st.coords=coords;st.face=makeFace(files.get(st.fid),coords);saveStyles();pushFaces();schedulePicker();}
function fontsChanged(){optCache.clear();refreshFontCard();refreshAll();schedulePicker(0);dirty=true;}
async function restoreFonts(){
  let list=await DB.get('styles');
  if(!list&&APP!=='rubato'){/* first time: copy the fonts loaded in Rubato, once */
    const from=fontStore('rubato'),got=await from.get('styles');list=[];
    if(got&&got.length)for(const st of got){const rec=await from.get('file:'+st.fid);if(rec&&rec.buf){await DB.put('file:'+st.fid,rec);list.push(st);}}
    await DB.put('styles',list);}
  if(!list){/* move fonts saved by v0.6 and earlier */
    list=[];const map={};
    for(const s of [1,2]){const rec=await DB.get('slot'+s);if(rec&&rec.buf){const fid=newId(),id=newId();await DB.put('file:'+fid,rec);list.push({id,fid,coords:null,swap:true});map[s]=id;await DB.del('slot'+s);}}
    if(list.length){await DB.put('styles',list);
      const raw=LS.get('settings');if(raw&&raw.baseSlot===2&&map[2])S.baseSlot=map[2];
      for(const ch in S.picks)S.picks[ch]=S.picks[ch].map(k=>k.replace(/^([12]):/,(m,n)=>map[n]?map[n]+':':m));autosave();}
  }
  if(window.opentype)for(const st of list){
    if(!files.has(st.fid)){const rec=await DB.get('file:'+st.fid);if(rec&&rec.buf){try{files.set(st.fid,parseFile(rec.buf,rec.name));}catch(e){}}}
    if(files.has(st.fid)){st.face=makeFace(files.get(st.fid),st.coords);styles.push(st);}
  }
  const im=await DB.get('image');if(im&&im.blob)setImage(im.blob,im.name,true);
  applyStyles();
  if(typeof appFontsRestored==='function')appFontsRestored();
}

/* ---------------- image layer ---------------- */
let img=null,imgName='',imgURL='';
function setImage(blob,name,quiet){
  const url=URL.createObjectURL(blob);const im=new Image();
  im.onload=()=>{if(imgURL)URL.revokeObjectURL(imgURL);img=im;eng.setImage(im);imgURL=url;imgName=name;if(!quiet){DB.put('image',{name,blob});toast(`${name} added`);}refreshImageCard();refreshAll();dirty=true;};
  im.onerror=()=>{URL.revokeObjectURL(url);if(!quiet)toast(`Couldn't open ${name}. Use a PNG, JPG or WebP.`);};
  im.src=url;
}
function clearImage(){img=null;eng.setImage(null);imgName='';if(imgURL)URL.revokeObjectURL(imgURL);imgURL='';DB.del('image');refreshImageCard();refreshAll();dirty=true;}
/* ---------------- preview canvas ---------------- */
const cv=$('#cv'),ctx=cv.getContext('2d');
let lastT=0,dirty=true;
new ResizeObserver(fitCanvas).observe($('#view'));

/* ---------------- UI builder ---------------- */
const panel=$('#panel');const controls=[];
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
const PICKER_KEYS=['vMode','baseSlot','seq'];
function set(k,v,silent){
  if(k==='fit'&&v==='manual'&&S.fit!=='manual')S.size=+eng.lastSize().toFixed(1);
  S[k]=v;if(PICKER_KEYS.includes(k)){optCache.clear();schedulePicker(0);}
  dirty=true;autosave();if(!silent)refreshAll();if(['aspect','cw','ch','transparent','ssShape'].includes(k))fitCanvas();
}
const COLLAPSE_DEFAULT=['sequence','repeat','image','loop','export','presets','ss-play'];
const collapsed=LS.get('collapsed')||Object.fromEntries(COLLAPSE_DEFAULT.map(k=>[k,true]));
let curGroup='';
function card(id,title,show,tab){
  tab=tab||'studio';curGroup=id;
  const c=el('section','card'+(collapsed[id]?' collapsed':''));c.dataset.tab=tab;const h=el('h2');const b=el('button','card-toggle');
  const t=el('span',null,title),ch=el('span','chev',collapsed[id]?'+':'–');b.append(t,ch);b.setAttribute('aria-expanded',!collapsed[id]);
  b.onclick=()=>{const on=!c.classList.toggle('collapsed');collapsed[id]=!on;ch.textContent=on?'–':'+';b.setAttribute('aria-expanded',on);LS.set('collapsed',collapsed);};
  h.append(b);const body=el('div','card-body');c.append(h,body);panel.append(c);
  controls.push({d:{show:s=>(tab==='both'||s.tab===tab)&&(!show||show(s))},w:c,update(){}});
  return body;
}
const roundTo=(v,st)=>{const d=(String(st).split('.')[1]||'').length;return +(Math.round(v/st)*st).toFixed(d);};
function addRange(parent,d){
  const w=el('div','ctl'),hd=el('div','ctl-head'),lb=el('label',null,d.label),val=el('span','val');
  const id='c_'+d.k;lb.htmlFor=id;lb.title='Double-click to reset';
  const inp=el('input');inp.type='range';inp.id=id;inp.min=d.min;inp.max=d.max;inp.step=d.step;
  const fmt=v=>d.fmt?d.fmt(v):(roundTo(v,d.step)+(d.unit||''));d.group=d.group||curGroup;
  inp.oninput=()=>{set(d.k,parseFloat(inp.value),true);val.textContent=fmt(+inp.value);refreshVis();};
  lb.ondblclick=()=>set(d.k,D[d.k]);
  hd.append(lb);const q=qMark(d);if(q)hd.append(q);hd.append(val);w.append(hd,inp);parent.append(w);
  const c={d,w,update(){if(document.activeElement!==inp)inp.value=S[d.k];val.textContent=fmt(S[d.k]);}};
  controls.push(c);return c;
}
function addSeg(parent,d){
  const w=el('div','ctl');d.group=d.group||curGroup;if(d.label){const hd=el('div','ctl-head');hd.append(el('span',null,d.label));const q=qMark(d);if(q)hd.append(q);w.append(hd);}
  const g=el('div','seg');g.setAttribute('role','group');if(d.label)g.setAttribute('aria-label',d.label);
  const bs=d.opts.map(([v,t])=>{const b=el('button','pill small',t);b.onclick=()=>set(d.k,v);g.append(b);return[v,b];});
  w.append(g);parent.append(w);
  const c={d,w,update(){bs.forEach(([v,b])=>b.setAttribute('aria-pressed',S[d.k]===v));}};controls.push(c);return c;
}
function addToggle(parent,d){
  const w=el('div','toggle-row'),b=el('button','toggle');b.setAttribute('role','switch');b.setAttribute('aria-label',d.label);d.group=d.group||curGroup;
  b.append(el('span','box'),el('span',null,d.label));w.append(b);const q=qMark(d);if(q)w.append(q);
  b.onclick=()=>d.onToggle?d.onToggle(!S[d.k]):set(d.k,!S[d.k]);parent.append(w);
  const c={d,w,update(){b.setAttribute('aria-checked',!!S[d.k]);}};controls.push(c);return c;
}
function addColour(parent,d){
  const w=el('div','colour-row'),lb=el('label',null,d.label),cw=el('div','cw'),hex=el('span','val'),sw=el('span','cswatch'),inp=el('input');
  inp.type='color';inp.id='c_'+d.k;lb.htmlFor=inp.id;inp.oninput=()=>{set(d.k,inp.value,true);hex.textContent=inp.value.toUpperCase();};
  sw.append(inp);cw.append(hex,sw);w.append(lb);const q=qMark(d);if(q)w.append(q);w.append(cw);parent.append(w);d.group=d.group||curGroup;
  const c={d,w,update(){if(d.labelFn)lb.textContent=d.labelFn(S);inp.value=S[d.k];hex.textContent=String(S[d.k]).toUpperCase();}};controls.push(c);return c;
}
function addSegDyn(parent,d){
  const w=el('div','ctl'),hd=el('div','ctl-head');hd.append(el('span',null,d.label));const q=qMark(d);if(q)hd.append(q);d.group=d.group||curGroup;
  const g=el('div','seg');g.setAttribute('role','group');g.setAttribute('aria-label',d.label);w.append(hd,g);parent.append(w);let sig='',bs=[];
  const c={d,w,update(){const opts=d.optsFn();const ns=JSON.stringify(opts);if(ns!==sig){sig=ns;g.textContent='';bs=opts.map(([v,t])=>{const b=el('button','pill small',t);b.onclick=()=>set(d.k,v);g.append(b);return[v,b];});}
    const cur=opts.some(o=>o[0]===S[d.k])?S[d.k]:(opts[0]||[])[0];bs.forEach(([v,b])=>b.setAttribute('aria-pressed',cur===v));}};controls.push(c);return c;
}
function addCustom(parent,show,node){const c={d:{show},w:node,update(){}};parent.append(node);controls.push(c);return c;}
function addHint(parent,text,show){const p=el('p','hint',text);return addCustom(parent,show,p);}
function build(parent,list){for(const d of list){if(d.t==='range')addRange(parent,d);else if(d.t==='seg')addSeg(parent,d);else if(d.t==='toggle')addToggle(parent,d);else if(d.t==='colour')addColour(parent,d);else if(d.t==='segdyn')addSegDyn(parent,d);else if(d.t==='hint')addHint(parent,d.text,d.show);}}
function refreshVis(){for(const c of controls){if(!c.d.show)continue;c.w.hidden=!c.d.show(S);}}
function refreshAll(){for(const c of controls)c.update();refreshVis();refreshNotes();}
const pct=v=>Math.round(v*100)+'%',em=v=>roundTo(v,1)+'% em',deg=v=>roundTo(v,1)+'°',ofLoop=v=>pct(v)+' of loop',ofStep=v=>pct(v)+' of step';

/* ---------------- tooltips ---------------- */
const TIPS={};/* each app adds its own with Object.assign(TIPS,{…}) */
function qMark(d){const t=d.tip||TIPS[d.k];if(!t)return null;const q=el('button','q','?');q.type='button';q.dataset.tip=t;q.setAttribute('aria-label',(d.label?d.label+': ':'')+t);return q;}
const tipEl=el('div','tip');tipEl.setAttribute('role','tooltip');document.body.append(tipEl);let tipFor=null;
function showTip(q){tipFor=q;tipEl.textContent=q.dataset.tip;tipEl.classList.add('on');const r=q.getBoundingClientRect(),tw=tipEl.offsetWidth,th=tipEl.offsetHeight;
  tipEl.style.left=clamp(r.left+r.width/2-tw/2,8,innerWidth-tw-8)+'px';let y=r.top-th-8;if(y<8)y=r.bottom+8;tipEl.style.top=y+'px';}
function hideTip(){tipFor=null;tipEl.classList.remove('on');}
document.addEventListener('mouseover',e=>{const q=e.target.closest&&e.target.closest('.q');if(q){if(q!==tipFor)showTip(q);}else if(tipFor&&document.activeElement!==tipFor)hideTip();});
document.addEventListener('focusin',e=>{const q=e.target.closest&&e.target.closest('.q');if(q)showTip(q);else if(tipFor)hideTip();});
document.addEventListener('click',e=>{const q=e.target.closest&&e.target.closest('.q');if(q){e.preventDefault();if(tipFor===q)hideTip();else showTip(q);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tipFor)hideTip();});
$('#panel').addEventListener('scroll',()=>{if(tipFor)hideTip();},{passive:true});

/* Fonts */
let fontList,fontNote;
{const b=card('font','Fonts',null,'both');
  fontList=el('div','font-list');b.append(fontList);
  const r=el('div','ctl btn-row');const add=el('button','pill','+ Add font');add.onclick=()=>$('#fontfile').click();r.append(add);b.append(r);
  fontNote=el('p','hint');b.append(fontNote);
  const cardEl=b.parentElement;
  cardEl.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();cardEl.classList.add('drag');});
  cardEl.addEventListener('dragleave',e=>{if(!cardEl.contains(e.relatedTarget))cardEl.classList.remove('drag');});
  cardEl.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();dragDepth=0;cardEl.classList.remove('drag');$('#drop').classList.remove('on');let fs=[...e.dataTransfer.files];if(typeof appDropFiles==='function')fs=appDropFiles(fs);if(fs.length)loadFiles(fs);});
}
function refreshFontCard(){
  fontList.textContent='';const bs=eng.baseSlot(),multi=styles.length>1;
  styles.forEach(st=>{
    const f=st.face,row=el('div','slot'),top=el('div','slot-top'),main=el('div','slot-main'),nm=el('div','slot-name',f.name),meta=el('div','slot-meta');
    const bits=[];if(f.axes.length)bits.push('variable');bits.push(f.altChars.length?`alternates for ${f.altChars.length} characters`:'no alternates');
    meta.textContent=bits.join(' \u00b7 ').replace(/^./,c=>c.toUpperCase());main.append(nm,meta);top.append(main);
    const own=typeof appFontRow==='function';
    if(multi&&!own){const def=el('button','pill small',bs===st.id?'Default':'Use');def.setAttribute('aria-pressed',bs===st.id);def.title='Set your text in this style';def.setAttribute('aria-label','Set text in '+f.name);
      def.onclick=()=>{set('baseSlot',st.id);refreshFontCard();};top.append(def);}
    const rm=el('button','pill small','Remove');rm.setAttribute('aria-label','Remove '+f.name);rm.onclick=()=>removeStyle(st.id);top.append(rm);
    row.append(top);
    let axBox=null;
    if(own)axBox=appFontRow(st,row,top,rm);
    else if(multi){const w=el('div','toggle-row'),t=el('button','toggle');t.setAttribute('role','switch');t.setAttribute('aria-checked',st.swap!==false);t.append(el('span','box'),el('span',null,'Use in style swaps'));
      t.onclick=()=>{st.swap=!(st.swap!==false);t.setAttribute('aria-checked',st.swap);saveStyles();pushFaces();schedulePicker(0);refreshNotes();};
      w.append(t,qMark({label:'Use in style swaps',tip:'When Variants is set to Styles or Both, letters can change into this style. Untick to leave it out.'}));row.append(w);}
    if(f.axes.length)(axBox||row).append(axisControls(st));
    fontList.append(row);
  });
  if(typeof appFontList==='function')appFontList(fontList);
  fontNote.textContent=!window.opentype?"The font reader didn't load, so only the demo face is available. Check your connection and reload."
    :!styles.length?'Showing a demo face. Add as many weights or families as you like, including variable fonts. They stay in this browser.'
    :'Drop more fonts here. A variable font can be added again at different settings with + Another instance.';
}
function axisControls(st){
  const box=el('div','axes'),f0=st.face;let sel=null;
  const syncSel=()=>{if(!sel)return;const f=styles.find(s=>s.id===st.id).face;const i=f.instances.findIndex(x=>x.name===f.styleName);sel.value=i<0?'':String(i);};
  if(f0.instances.length){sel=el('select');sel.setAttribute('aria-label','Named instance');const o0=el('option',null,'Custom');o0.value='';sel.append(o0);
    f0.instances.forEach((ins,i)=>{const o=el('option',null,ins.name);o.value=String(i);sel.append(o);});
    sel.onchange=()=>{if(sel.value==='')return;const f=styles.find(s=>s.id===st.id).face,ins=f.instances[+sel.value];setCoords(st.id,Object.assign({},f.coords,ins.coords));refreshFontCard();};
    const r=el('div','ctl');r.append(sel);box.append(r);syncSel();}
  f0.axes.forEach(a=>{
    const w=el('div','ctl'),hd=el('div','ctl-head'),lb=el('label',null,a.name),val=el('span','val'),inp=el('input');
    inp.type='range';inp.min=a.min;inp.max=a.max;inp.step=(a.max-a.min)>40?1:.1;inp.value=f0.coords[a.tag];inp.id='ax_'+st.id+'_'+a.tag;lb.htmlFor=inp.id;
    const show=v=>{val.textContent=String(Math.round(v*10)/10);};show(+inp.value);
    inp.oninput=()=>{const f=styles.find(s=>s.id===st.id).face;setCoords(st.id,Object.assign({},f.coords,{[a.tag]:+inp.value}));show(+inp.value);
      const nf=styles.find(s=>s.id===st.id).face,row=inp.closest('.slot');if(row)row.querySelector('.slot-name').textContent=nf.name;syncSel();};
    hd.append(lb,val);w.append(hd,inp);box.append(w);});
  const r=el('div','ctl btn-row');const add=el('button','pill small','+ Another instance');add.onclick=()=>addInstance(st.id);r.append(add);box.append(r);
  return box;
}
