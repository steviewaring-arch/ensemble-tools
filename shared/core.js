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
  /* opentype.js writes a coordinate a hair below zero as "0" with no space before it ("227.370"),
     which runs two numbers together and drops parts of a glyph (Lazaar Soft's N, T, M…). Snap those to 0 first. */
  const snap=P=>{for(const c of P.commands)for(const q of ['x','y','x1','y1','x2','y2'])if(c[q]!==undefined&&Math.abs(c[q])<.005)c[q]=0;return P;};
  const pathC=(g,c)=>{const k=g+'|'+ck(c);let d=pd.get(k);if(d==null){try{d=snap(glyph(g).getPath(0,0,upm,c?{variation:c}:{},font)).toPathData(2)}catch(e){d=''}pd.set(k,d);}return d;};
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
      if(/\.(txt|md|pdf|rtf|html?)$/i.test(base))continue;/* a licence or read-me travelling with the fonts */
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
/* Which cards start shut. An app can name its own with appCollapseDefault() – shut cards still say what's set. */
const COLLAPSE_DEFAULT=['sequence','repeat','image','loop','export','presets','ss-play'].concat(typeof appCollapseDefault==='function'?appCollapseDefault():[]);
const collapsed=LS.get('collapsed')||Object.fromEntries(COLLAPSE_DEFAULT.map(k=>[k,true]));
let curGroup='';
/* A card is a section of the panel: a title and, when shut, one line saying what's set. */
const CHEV='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 5.5 7 9l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function card(id,title,show,tab){
  tab=tab||'studio';curGroup=id;
  const c=el('section','card'+(collapsed[id]?' collapsed':''));c.dataset.tab=tab;c.dataset.id=id;const h=el('h2');const b=el('button','card-toggle');
  const t=el('span',null,title),sm=el('span','sum'),ch=el('span','chev');ch.innerHTML=CHEV;b.append(t,sm,ch);b.setAttribute('aria-expanded',!collapsed[id]);
  b.onclick=()=>{const on=!c.classList.toggle('collapsed');collapsed[id]=!on;b.setAttribute('aria-expanded',on);LS.set('collapsed',collapsed);if(on)requestAnimationFrame(()=>syncRanges(c));};
  h.append(b);const body=el('div','card-body');c.append(h,body);panel.append(c);
  controls.push({d:{show:s=>(tab==='both'||s.tab===tab)&&(!show||show(s))},w:c,update(){},card:id});
  return body;
}
/* A group (level 2) inside a card: one hairline, a 13 Bold title, a chevron, and – when shut –
   a quiet line saying what it holds. The house group; Segue has the same in its own frame.
   (Tempo still declares its own fold() further down, which wins there until it takes this one.) */
const GROUPS=Object.assign({},LS.get('groups')||{});
function fold(parent,id,title,show,shut){
  const box=el('div','fold'),head=el('button','fold-head'),label=el('span',null,title),chev=el('span','chev'),body=el('div','fold-body');
  head.type='button';chev.innerHTML=CHEV;
  const open=GROUPS[id]!=null?GROUPS[id]:!shut;
  const paint=o=>{body.hidden=!o;head.setAttribute('aria-expanded',o);if(o)requestAnimationFrame(()=>syncRanges(body));};
  paint(open);
  head.onclick=()=>{const o=body.hidden;GROUPS[id]=o;LS.set('groups',GROUPS);paint(o);};
  head.append(label,chev);box.append(head,body);addCustom(parent,show||null,box);
  return body;
}

/* What a shut card says: the choices made in it, or the app's own line (SUMMARY[id]). */
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
  return out.length?out.join(' · '):switches?'Off':'';
}
function refreshSummaries(){document.querySelectorAll('section.card[data-id]').forEach(sec=>{const sm=sec.querySelector(':scope>h2 .sum');if(!sm)return;
  let t='';try{t=SUMMARY[sec.dataset.id]?SUMMARY[sec.dataset.id](S):autoSummary(sec.dataset.id);}catch(e){}if(sm.textContent!==(t||''))sm.textContent=t||'';});
  /* folds inside cards (groups) say what's set in them too */
  document.querySelectorAll('.fold-head,.more-toggle').forEach(hd=>{const body=hd.nextElementSibling;if(!body)return;let sm=hd.querySelector('.sum');
    if(!sm){sm=el('span','sum');hd.insertBefore(sm,hd.querySelector('.chev'));}const t=autoSummary(null,body);if(sm.textContent!==t)sm.textContent=t;});}
SUMMARY.font=()=>{const on=styles.filter(s=>!s.off);return !on.length?'Demo face':on.length===1?on[0].face.name:on[0].face.name+' + '+(on.length-1);};

/* ---------------- the frame: island, sheets, Presets, Preview ---------------- */
/* Sheets grow out of the island (Export, Randomise's options) or out of the Presets
   capsule. One at a time; Esc or a click on the work closes them. */
const SHEETS={};
const sheetObs=new MutationObserver(ms=>{for(const m of ms){const n=m.target;if(!n.hidden)for(const k in SHEETS)if(SHEETS[k].el!==n)SHEETS[k].el.hidden=true;}syncSheets();});
function addSheet(name,node,opener){
  node.classList.add('sheet');node.dataset.sheet=name;node.hidden=true;
  $(name==='presets'?'#pcapSheets':'#islandSheets').append(node);SHEETS[name]={el:node,opener:opener||(name==='presets'?$('#pcapOpen'):name==='export'?$('#exportOpen'):null)};
  if(name==='presets')$('#pcap').hidden=false;if(name==='export')$('#exportOpen').hidden=false;
  sheetObs.observe(node,{attributes:true,attributeFilter:['hidden']});return node;}
/* a card built with card() becomes a sheet: same controls, same labels */
function cardToSheet(body,name){const sec=body.parentElement;sec.classList.remove('card','collapsed');const ent=controls.find(c=>c.w===sec);if(ent)ent.d.show=null;return addSheet(name,sec);}
function hideCard(body){const sec=body.parentElement;const ent=controls.find(c=>c.w===sec);if(ent)ent.d.show=()=>false;sec.hidden=true;}
function toIsland(node){$('#islandMain').append(node);return node;}
function openSheet(name){if(!SHEETS[name])return;for(const k in SHEETS)SHEETS[k].el.hidden=k!==name;syncSheets();}
function closeSheets(){for(const k in SHEETS)SHEETS[k].el.hidden=true;syncSheets();}
const anySheet=()=>Object.values(SHEETS).some(s=>!s.el.hidden);
function syncSheets(){
  const open={island:false,pcap:false};
  for(const k in SHEETS){const s=SHEETS[k],o=!s.el.hidden;open[k==='presets'?'pcap':'island']||=o;if(s.opener)s.opener.setAttribute('aria-expanded',o);}
  $('#island').classList.toggle('open',open.island);$('#pcap').classList.toggle('open',open.pcap);layoutUI();
  if(open.island||open.pcap){requestAnimationFrame(()=>{syncRanges(document);layoutUI();});
    /* Safari 17 can leave a sheet's row at 0 – the 0fr-to-1fr slide never runs, so Presets opens unseen (found in Segue, Steve's
       Safari 17.6, Nov 2026). If the row is still shut once the slide should be over, sheets open flat from then on. */
    clearTimeout(syncSheets.t);syncSheets.t=setTimeout(()=>{const root=document.documentElement;if(root.classList.contains('flat-sheets'))return;
      for(const c of [$('#island'),$('#pcap')]){const sh=c&&c.classList.contains('open')&&c.querySelector(':scope>.sheets');
        if(sh&&sh.getBoundingClientRect().height<2){root.classList.add('flat-sheets');layoutUI();return;}}},480);}}
/* Safari before 18 opens sheets flat from the start */
{const m=/Version\/(\d+)[.\d]* Safari/.exec(navigator.userAgent);if(m&&+m[1]<18&&!/Chrome|Chromium|Edg/.test(navigator.userAgent))document.documentElement.classList.add('flat-sheets');}
/* the island sits centred under the work, clear of the panel and of Presets */
/* phones: when the island's view controls run on past Export, their far end fades to say so */
function islMore(){const m=$('#islandMain');if(m)m.classList.toggle('more',innerWidth<=860&&m.scrollLeft+m.clientWidth<m.scrollWidth-1);}
function layoutUI(){
  const app=$('.app'),isl=$('#island'),pc=$('#pcap');if(!app||!isl)return;
  if(innerWidth<=860){isl.style.left='';islMore();return;}/* phones: the stylesheet places it along the bottom */
  const g=12,narrow=false,W=narrow?innerWidth:app.clientWidth,away=app.classList.contains('preview')&&!app.classList.contains('peek'),pw=narrow||away?0:$('#panelBox').offsetWidth;
  /* House rule from Segue 1.0 (12 Nov): nothing on the bottom line moves when something else opens. The island is
     anchored bottom left, beside the panel; Presets bottom right. Each opens upward from where it is. (It used to sit
     centred between the two, so it slid sideways whenever Presets opened or its own width changed.) */
  const L=narrow||away?g:g*2+pw,R=W-g;
  let pcW=0;if(pc&&!pc.hidden&&!narrow){const row=pc.querySelector('.pc-row');if(!pc.classList.contains('open')||!pc._w)pc._w=row.offsetWidth;pcW=pc._w;}
  isl.style.maxWidth=Math.max(240,Math.round(R-(pcW?pcW+8:0)-L))+'px';isl.style.left=Math.round(L)+'px';}
const ICON_EXPAND='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M8.5 2.5h3v3M11.5 2.5 7.8 6.2M5.5 11.5h-3v-3M2.5 11.5l3.7-3.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_COLLAPSE='<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M11.5 5.5h-3v-3M8.5 5.5l3.3-3.3M2.5 8.5h3v3M5.5 8.5l-3.3 3.3" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
/* Preview: the work fills the window; the panel, island and Presets stay where they are */
function setPanel(open){const app=$('.app');app.classList.toggle('peek',!!open);const p=$('#panelBtn');if(p){p.setAttribute('aria-expanded',!!open);const t=open?'Hide the panel':'Show the panel';p.dataset.tip=t;p.setAttribute('aria-label',t);}layoutUI();}
function setPreview(on){$('.app').classList.toggle('preview',on);setPanel(false);const b=$('#previewBtn');if(!b)return;b.setAttribute('aria-pressed',on);b.innerHTML=on?ICON_COLLAPSE:ICON_EXPAND;
  const t=on?'Fit to the clear space – F':'Preview – fill the window – F';b.dataset.tip=t;b.setAttribute('aria-label',t);}
window.ensembleUI={open:openSheet,close:closeSheets,preview:setPreview,
  reveal(n){const s=n&&n.closest&&n.closest('.sheet');if(s&&s.hidden)openSheet(s.dataset.sheet);return true;}};

/* ---------------- controls, upgraded where they appear ---------------- */
/* A range in a .ctl becomes the system slider: label and value inside the track, the fill
   carries the value, and the tick steps aside where it would cross the words. */
/* The slider (UI round 4, Nov 2026 – as Segue 0.5): a bar with its value inside and its label beside it.
   Drag moves it by how far you go (Shift ten times finer) and catches lightly at the default; a press that
   doesn't move jumps there; a press on the label or the ? drags too; double-click resets; click the value to type. */
const kclamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function syncRange(box){const inp=box.querySelector('input[type=range]');if(!inp)return;
  const mn=inp.min===''?0:+inp.min,mx=inp.max===''?100:+inp.max,sp=mx>mn?mx-mn:1,p=kclamp((+inp.value-mn)/sp,0,1);box.style.setProperty('--p',p);
  const z=mn<0&&mx>0?-mn/sp:0;box.style.setProperty('--z',z);box.classList.toggle('from-start',z===0);
  const ctl=box.parentElement,k=ctl&&ctl.dataset.k,bv=ctl&&ctl.dataset.def!=null?+ctl.dataset.def:k&&k in D?+D[k]:NaN;
  if(Number.isFinite(bv))box.style.setProperty('--b',kclamp((bv-mn)/sp,0,1));
  const w=box.offsetWidth,tick=box.querySelector('.rng-tick');if(!w||!tick)return;const x=5+(w-10)*p,head=box.querySelector('.ctl-head');let over=false;
  if(head){const bl=box.getBoundingClientRect().left;for(const e of head.children){if(!e.offsetWidth||e.classList.contains('q')||e.tagName==='LABEL')continue;
    const l=head.offsetLeft+e.offsetLeft,r=l+e.offsetWidth;if(x>l-4&&x<r+4){over=true;break;}}}
  tick.classList.toggle('split',over);tick.classList.remove('away');}
function syncRanges(root){(root||document).querySelectorAll('.rng-box').forEach(syncRange);}
function upgradeRange(inp){const ctl=inp.parentElement;if(!ctl||!ctl.classList.contains('ctl')||inp.closest('.rng-box'))return;
  const head=ctl.querySelector(':scope>.ctl-head'),box=el('div','rng-box');ctl.classList.add('rng');ctl.insertBefore(box,head||inp);
  box.append(el('span','rng-fill'),el('span','rng-notch'),el('span','rng-tick'));if(head)box.append(head);box.append(inp);
  inp.addEventListener('input',()=>syncRange(box));
  box.addEventListener('dblclick',e=>{if(e.target.closest('.val,.q'))return;const l=box.querySelector('label');if(l&&l.ondblclick)l.ondblclick();});
  const lim=()=>[inp.min===''?0:+inp.min,inp.max===''?100:+inp.max,+inp.step||1];
  const put=v=>{const [mn,mx,st]=lim();v=kclamp(v,mn,mx);v=+(Math.round((v-mn)/st)*st+mn).toFixed(6);v=kclamp(v,mn,mx);
    if(v!==+inp.value){inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}));}};
  box.addEventListener('pointerdown',e=>{if(e.button||e.target.closest('.val,.val-in'))return;const soft=!!e.target.closest('.q,label');
    if(!soft){e.preventDefault();inp.focus({preventScroll:true});try{box.setPointerCapture(e.pointerId);}catch(_){}}
    const r=box.getBoundingClientRect(),[mn,mx]=lim(),span=mx-mn,bv=+(box.style.getPropertyValue('--b')||0)*span+mn;let lastX=e.clientX,acc=+inp.value,moved=false;
    const mv=ev=>{const dx=ev.clientX-lastX;if(!moved&&Math.abs(ev.clientX-e.clientX)<3)return;
      if(!moved){moved=true;box.classList.add('drag');if(soft){hideTip();inp.focus({preventScroll:true});try{box.setPointerCapture(e.pointerId);}catch(_){}}}
      acc=kclamp(acc+dx/Math.max(40,r.width-10)*span*(ev.shiftKey?.1:1),mn,mx);lastX=ev.clientX;put(!ev.shiftKey&&Math.abs(acc-bv)<span*.012?bv:acc);};
    const up=ev=>{box.removeEventListener('pointermove',mv);box.removeEventListener('pointerup',up);box.removeEventListener('pointercancel',up);box.classList.remove('drag');
      if(!moved&&ev.type==='pointerup'&&!soft)put(mn+kclamp((ev.clientX-r.left-5)/Math.max(1,r.width-10),0,1)*span);
      inp.dispatchEvent(new Event('change',{bubbles:true}));};
    box.addEventListener('pointermove',mv);box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);});
  inp.addEventListener('keydown',e=>{if(!e.shiftKey||!/^Arrow/.test(e.key))return;e.preventDefault();const [,, st]=lim();put(+inp.value+(/Right|Up/.test(e.key)?10:-10)*st);});
  requestAnimationFrame(()=>syncRange(box));}
/* click a slider's value to type one: units optional, kept to its range, Escape leaves it */
function typable(val,o){
  val.classList.add('typable');val.tabIndex=0;val.setAttribute('role','button');val.dataset.tip='Click to type a value';val.setAttribute('aria-label',(o.label||'Value')+' – click to type');
  const open=e=>{if(e)e.preventDefault();if(val.classList.contains('editing'))return;val.classList.add('editing');
    const cur=+o.get(),inp=el('input','val-in');inp.type='text';inp.inputMode='decimal';inp.spellcheck=false;inp.setAttribute('aria-label',o.label||'Value');
    inp.value=Number.isFinite(cur)?String(+cur.toFixed(4)):'';val.textContent='';val.append(inp);inp.focus();inp.select();let done=false;
    const close=ok=>{if(done)return;done=true;const v=parseFloat(String(inp.value).replace(',','.').replace(/[^0-9.+\-eE]/g,''));val.classList.remove('editing');
      if(ok&&Number.isFinite(v))o.put(kclamp(v,o.min,o.max));val.textContent=o.show();};
    inp.onkeydown=ev=>{ev.stopPropagation();if(ev.key==='Enter'){ev.preventDefault();close(true);val.focus();}else if(ev.key==='Escape'){ev.preventDefault();close(false);val.focus();}};
    inp.onblur=()=>close(true);inp.onpointerdown=ev=>ev.stopPropagation();};
  val.addEventListener('pointerdown',e=>{e.stopPropagation();});val.addEventListener('click',open);
  val.addEventListener('keydown',e=>{if(e.target===val&&(e.key==='Enter'||e.key===' '))open(e);});
  return val;}
/* Segmented controls: up to four short options in a row, otherwise an even grid. */
const kMeasure=document.createElement('canvas').getContext('2d');
function kTextW(t){kMeasure.font='500 12.5px "aktiv-grotesk","Aktiv Grotesk","Helvetica Neue",Arial,sans-serif';return kMeasure.measureText(t).width;}
function placeHL(g,snap){let hl=g.querySelector(':scope>.hl');if(!hl){hl=el('i','hl');g.prepend(hl);}
  const b=[...g.children].find(x=>x.tagName==='BUTTON'&&!x.hidden&&x.getAttribute('aria-pressed')==='true');
  if(!b){g.classList.remove('hl-ready');delete hl.dataset.on;return;}if(!g.offsetWidth||!b.offsetWidth)return;
  const L=b.offsetLeft+'px',T=b.offsetTop+'px',W=b.offsetWidth+'px',H=b.offsetHeight+'px';
  if(hl.style.left===L&&hl.style.top===T&&hl.style.width===W&&hl.style.height===H){hl.dataset.on=b.textContent;return;}
  const slide=!snap&&g.classList.contains('hl-ready')&&hl.dataset.on!=null&&hl.dataset.on!==b.textContent;if(!slide)hl.style.transition='none';
  Object.assign(hl.style,{left:L,top:T,width:W,height:H});hl.dataset.on=b.textContent;if(!slide){void hl.offsetWidth;hl.style.transition='';}g.classList.add('hl-ready');}
/* refit a row of choices when its width changes – a frame later, so layout never loops */
const segRO=typeof ResizeObserver==='function'?new ResizeObserver(es=>{const gs=es.map(e=>e.target);requestAnimationFrame(()=>gs.forEach(g=>{const w=g.offsetWidth;if(w!==g._w){g._w=w;fitSeg(g);}}));}):null;
function fitSeg(g){const bs=[...g.children].filter(b=>b.tagName==='BUTTON'&&!b.hidden),n=bs.length;if(!n)return;
  if(segRO&&!g._ro){g._ro=1;segRO.observe(g);}
  const ctl=g.closest('.ctl');
  if(g.closest('.isl-main')||g.classList.contains('choice')||!ctl||ctl.classList.contains('nofit')){g.classList.remove('wrap','loose');g.style.removeProperty('--cols');placeHL(g,true);return;}
  const W=ctl.offsetWidth;if(!W){placeHL(g,true);return;}
  const lc=parseFloat(getComputedStyle(ctl).getPropertyValue('--lc'))||104,need=Math.max(...bs.map(b=>kTextW((b.textContent||'').trim())))+16,share=(w,c)=>(w-4-(c-1)*2)/c;
  const hasLabel=!!ctl.querySelector(':scope>.ctl-head'),inline=hasLabel&&need<=share(W-lc-10,n);
  ctl.classList.toggle('seg-inline',inline);
  let cols=n;if(!inline&&need>share(W,n)){cols=1;for(let c=Math.min(n,4);c>=1;c--)if(need<=share(W,c)&&(n%c===0||n%c>=c-1)){cols=c;break;}}
  if(cols>=n){g.classList.remove('wrap');g.style.removeProperty('--cols');}else{g.classList.add('wrap');g.style.setProperty('--cols',cols);}
  g.classList.toggle('loose',cols===1&&n>1);placeHL(g,true);}
function enhance(root){if(!root||root.nodeType!==1)return;
  if(root.matches('.ctl>input[type=range]'))upgradeRange(root);root.querySelectorAll('.ctl>input[type=range]').forEach(upgradeRange);
  if(root.matches('.seg,.choice'))fitSeg(root);root.querySelectorAll('.seg,.choice').forEach(fitSeg);}
new MutationObserver(ms=>{for(const m of ms){if(m.target.classList&&(m.target.classList.contains('seg')||m.target.classList.contains('choice')))fitSeg(m.target);m.addedNodes.forEach(enhance);}}).observe(document.body,{childList:true,subtree:true});
const roundTo=(v,st)=>{const d=(String(st).split('.')[1]||'').length;return +(Math.round(v/st)*st).toFixed(d);};
function addRange(parent,d){
  const w=el('div','ctl'),hd=el('div','ctl-head'),lb=el('label',null,d.label),val=el('span','val');
  const id='c_'+d.k;lb.htmlFor=id;lb.title='Double-click to reset';
  const inp=el('input');inp.type='range';inp.id=id;inp.min=d.min;inp.max=d.max;inp.step=d.step;
  const fmt=v=>d.fmt?d.fmt(v):(roundTo(v,d.step)+(d.unit||''));d.group=d.group||curGroup;
  inp.oninput=()=>{set(d.k,parseFloat(inp.value),true);val.textContent=fmt(+inp.value);refreshVis();};
  lb.ondblclick=()=>set(d.k,D[d.k]);w.dataset.k=d.k;
  typable(val,{label:d.label,get:()=>S[d.k],put:v=>{set(d.k,v);},min:+d.min,max:+d.max,show:()=>fmt(S[d.k])});
  hd.append(lb);const q=qMark(d);if(q)hd.append(q);hd.append(val);w.append(hd,inp);parent.append(w);
  const c={d,w,update(){if(document.activeElement!==inp)inp.value=S[d.k];if(!val.classList.contains('editing'))val.textContent=fmt(S[d.k]);}};
  controls.push(c);return c;
}
function addSeg(parent,d){
  const w=el('div','ctl');d.group=d.group||curGroup;if(d.label){const hd=el('div','ctl-head');hd.append(el('span',null,d.label));const q=qMark(d);if(q)hd.append(q);w.append(hd);}
  const g=el('div','seg');g.setAttribute('role','group');if(d.label)g.setAttribute('aria-label',d.label);
  const bs=d.opts.map(([v,t])=>{const b=el('button','pill small',t);b.onclick=()=>set(d.k,v);g.append(b);return[v,b];});
  w.append(g);parent.append(w);
  const c={d,w,update(){bs.forEach(([v,b])=>b.setAttribute('aria-pressed',S[d.k]===v));placeHL(g);}};controls.push(c);return c;
}
function addToggle(parent,d){
  const w=el('div','toggle-row'),b=el('button','toggle');b.setAttribute('role','switch');b.setAttribute('aria-label',d.label);d.group=d.group||curGroup;
  b.append(el('span','box'),el('span',null,d.label));w.append(b);const q=qMark(d);if(q)w.append(q);
  /* grp: a switch that heads a group of its own settings – its box, then its name in the group's
     weight, its settings beneath while it's on. One way to turn anything optional on. */
  if(d.grp)w.classList.add('sw-grp');
  b.onclick=()=>d.onToggle?d.onToggle(!S[d.k]):set(d.k,!S[d.k]);parent.append(w);
  const c={d,w,update(){b.setAttribute('aria-checked',!!S[d.k]);w.classList.toggle('on',!!S[d.k]);}};controls.push(c);return c;
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
    const cur=opts.some(o=>o[0]===S[d.k])?S[d.k]:(opts[0]||[])[0];bs.forEach(([v,b])=>b.setAttribute('aria-pressed',cur===v));fitSeg(g);placeHL(g);}};controls.push(c);return c;
}
function addCustom(parent,show,node){const c={d:{show},w:node,update(){}};parent.append(node);controls.push(c);return c;}
function addHint(parent,text,show){const p=el('p','hint',text);return addCustom(parent,show,p);}
function build(parent,list){for(const d of list){if(d.t==='range')addRange(parent,d);else if(d.t==='seg')addSeg(parent,d);else if(d.t==='toggle')addToggle(parent,d);else if(d.t==='colour')addColour(parent,d);else if(d.t==='segdyn')addSegDyn(parent,d);else if(d.t==='hint')addHint(parent,d.text,d.show);}}
function refreshVis(){for(const c of controls){if(!c.d.show)continue;c.w.hidden=!c.d.show(S);}}
function refreshAll(){for(const c of controls)c.update();refreshVis();refreshNotes();refreshSummaries();syncRanges(panel);}
const pct=v=>Math.round(v*100)+'%',em=v=>roundTo(v,1)+'% em',deg=v=>roundTo(v,1)+'°',ofLoop=v=>pct(v)+' of loop',ofStep=v=>pct(v)+' of step';

/* ---------------- tooltips ---------------- */
const TIPS={};/* each app adds its own with Object.assign(TIPS,{…}) */
function qMark(d){const t=d.tip||TIPS[d.k];if(!t)return null;const q=el('button','q','?');q.type='button';q.dataset.tip=t;q.setAttribute('aria-label',(d.label?d.label+': ':'')+t);return q;}
const tipEl=el('div','tip');tipEl.setAttribute('role','tooltip');document.body.append(tipEl);let tipFor=null;
function showTip(q,text,at){if(q&&q.getAttribute&&q.getAttribute('aria-expanded')==='true')return;tipFor=q;tipEl.textContent=text||q.dataset.tip;q=at||q;tipEl.classList.add('on');const r=q.getBoundingClientRect(),tw=tipEl.offsetWidth,th=tipEl.offsetHeight;
  tipEl.style.left=clamp(r.left+r.width/2-tw/2,8,innerWidth-tw-8)+'px';let y=r.top-th-8;if(y<8)y=r.bottom+8;tipEl.style.top=y+'px';}
function hideTip(){tipFor=null;tipEl.classList.remove('on');}
let rowTipT=0,byKeys=false,tipMute=null;/* a control you've just pressed stays quiet until the pointer leaves it */
function tipRow(t){const row=t.closest('[data-tip],.ctl,.toggle-row,.colour-row,.slot-top');return row&&(row.dataset.tip?row:row.querySelector('.q'));}
document.addEventListener('keydown',e=>{byKeys=true;if(e.key==='Tab'||/^Arrow/.test(e.key))document.body.classList.add('kbd');},true);
document.addEventListener('pointerdown',e=>{byKeys=false;document.body.classList.remove('kbd');clearTimeout(rowTipT);hideTip();const t=e.target.closest?e.target:null;tipMute=t&&!t.closest('.q')?tipRow(t):null;},true);
document.addEventListener('mouseover',e=>{const t=e.target.closest?e.target:null;if(!t)return;const q=t.closest('.q');clearTimeout(rowTipT);
  if(q){tipMute=null;if(q!==tipFor)showTip(q);return;}
  const row=t.closest('[data-tip],.ctl,.toggle-row,.colour-row,.slot-top');const src=row&&(row.dataset.tip?row:row.querySelector('.q'));
  if(src&&src===tipMute)return;tipMute=null;
  if(src&&src!==tipFor){rowTipT=setTimeout(()=>showTip(src,src.dataset.tip,src.offsetParent?src:row),src===row?400:550);return;}
  if(!src&&tipFor&&!(byKeys&&document.activeElement===tipFor))hideTip();});
document.addEventListener('focusin',e=>{const q=e.target.closest&&e.target.closest('.q,[data-tip]');if(q&&byKeys)showTip(q);else if(tipFor)hideTip();});
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
    const rm=el('button','pill small icon');rm.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';rm.dataset.tip='Remove';rm.setAttribute('aria-label','Remove '+f.name);rm.onclick=()=>removeStyle(st.id);top.append(rm);
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
