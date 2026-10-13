/* ================= Promo – internal, for Ensemble's own promotion =================
   REMOVE BEFORE TEMPO GOES PUBLIC: delete this file and its line in build.py
   (see HANDOVER.md, "Remove before a public launch"). Nothing else depends on it.

   For each screen saver: a sheet of its settings and colours, three stills at
   different times and dates (one per colour change, when it has them), and a
   loop – 5, 10 or 20 seconds that join up seamlessly – as a GIF and an MP4.
   They're drawn on a clock of their own: the loop steps through the day's
   themes (or time-lapses round the dial), so the colour changes on the hour
   show in seconds. Play the loop runs the same clock in the preview; with
   Preview (F) it fills the window, edge to edge. */
const PROMO=Object.assign({shape:'16:9',len:10,moves:'hours',playing:false},LS.get('promo')||{});PROMO.playing=false;
const savePromo=()=>{const o=Object.assign({},PROMO);delete o.playing;LS.set('promo',o);};
const P_SHAPES={'16:9':[3840,2160,1920,1080],'16:10':[2880,1800,1920,1200],'1:1':[2160,2160,1080,1080],'4:5':[1728,2160,1080,1350]};
/* run fn as if it were ms o'clock: the saver reads the time through Date */
function atTime(ms,fn){const R=Date;class D extends R{constructor(...a){if(a.length===0)super(ms);else super(...a);}static now(){return ms;}}
  D.UTC=R.UTC;D.parse=R.parse;window.Date=D;try{return fn();}finally{window.Date=R;}}
/* the loop's own clock: t (ms into the loop) → the time it shows */
function promoPlan(){
  const k=kindNow(S),K=THEMES[k],hourly=K.on(S),ev=everyOf(k),q=hourly?setNames(k):[],len=q.length||1,D=PROMO.len*1000;
  const day=new Date();day.setHours(0,0,0,0);
  /* start on the first theme of the day's list, at a daytime hour where possible */
  let h0=9;if(hourly){h0=-1;for(let h=8;h<24;h++)if(Math.floor(h/ev)%len===0){h0=h;break;}if(h0<0)h0=0;}
  const base=day.getTime()+h0*36e5+41*6e4;
  if(PROMO.moves==='lapse'){const span=hourly&&(24/ev)%len===0&&(12/ev)%len!==0?24:12;return{D,steps:0,at:t=>base+(t/D)*span*36e5,hourly};}
  const n=hourly?Math.max(2,Math.min(12,len,Math.floor(24/ev))):4,step=hourly?ev:1,per=D/n;
  return{D,steps:n,at:t=>{const i=Math.floor(t/per);return base+i*step*36e5+(t-i*per);},hourly};}
function promoSaver(){const e=createEngine();e.setFaces(eng.faceList());const cfg=saverConfig();cfg.drift=0;return createSaver(e,cfg);}
/* draw frames from t0 to t1 (ms into the loop), at fps; each(t) after each */
async function promoRun(sv,ctx,W,H,plan,t0,t1,fps,each,offset){const dt=1000/fps;let i=0;
  for(let t=t0;t<t1-1e-6;t+=dt){const lt=((t%plan.D)+plan.D)%plan.D;atTime(Math.round(plan.at(lt)),()=>sv.frame(ctx,W,H,(offset||0)+t,dt));if(each)await each(lt,i++);}}
/* the preview, playing the loop */
let promoT0=0,pSv=null;
function promoPreviewFrame(now){if(!PROMO.playing)return false;if(!pSv||ssDirty){pSv=promoSaver();ssDirty=false;}
  const plan=promoPlan(),t=(now-promoT0)%plan.D;atTime(Math.round(plan.at(t)),()=>pSv.frame(ctx,cv.width,cv.height,now,16));return true;}
{const was=previewFrame;previewFrame=(now,dt)=>{if(!promoPreviewFrame(now))was(now,dt);};}
/* ---- the files ---- */
const promoName=()=>safeName();
function canvasOf(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
const toBlob=(c,type,q)=>new Promise(r=>c.toBlob(r,type||'image/png',q));
/* three moments: one per colour change when the day has themes (else three times), on three different dates */
function stillTimes(){const k=kindNow(S),K=THEMES[k],hourly=K.on(S),ev=everyOf(k),q=hourly?setNames(k):[],len=q.length||1;
  const day=new Date();day.setHours(0,0,0,0);const at=(dd,h,m,s)=>day.getTime()+dd*864e5+(h*3600+m*60+s)*1000;
  if(!hourly)return[at(0,9,41,12),at(9,14,27,38),at(23,22,58,3)];
  const pick=[0,Math.floor(len/3),Math.floor(2*len/3)].map(i=>{for(let h=0;h<24;h++)if(Math.floor(h/ev)%len===i&&h>=7)return h;for(let h=0;h<24;h++)if(Math.floor(h/ev)%len===i)return h;return 9;});
  return[at(0,pick[0],41,12),at(9,pick[1],27,38),at(23,pick[2],58,3)];}
async function promoStills(){const [W,H]=P_SHAPES[PROMO.shape],out=[];
  for(const ms of stillTimes()){const sv=promoSaver(),c=canvasOf(W,H),x=c.getContext('2d');
    /* settle: a few seconds of frames before, so nothing is mid-change */
    const plan={D:1e12,at:t=>ms-3000+t};await promoRun(sv,x,W,H,plan,0,3000,12,null);out.push(await toBlob(c));await nextTick();}
  return out;}
const nextTick=()=>new Promise(r=>setTimeout(r,0));
async function promoFrames(W,H,fps,each){const plan=promoPlan(),sv=promoSaver(),c=canvasOf(W,H),x=c.getContext('2d',{willReadFrequently:true});
  /* one loop first, so the end leads into the start exactly */
  await promoRun(sv,x,W,H,plan,0,plan.D,Math.min(fps,15),null,-plan.D);
  await promoRun(sv,x,W,H,plan,0,plan.D,fps,(t,i)=>each(c,x,i),0);return plan;}
async function promoGIF(progress){const [,, vw,vh]=P_SHAPES[PROMO.shape],k=960/Math.max(vw,vh),w=Math.round(vw*k),h=Math.round(vh*k),fps=20,n=Math.round(PROMO.len*fps);
  /* palette from a pass over the loop */
  const hist=new Uint32Array(32768);let pass=0;
  await promoFrames(w,h,4,(c,x)=>{const d=x.getImageData(0,0,w,h).data;for(let j=0;j<d.length;j+=8)hist[((d[j]>>3)<<10)|((d[j+1]>>3)<<5)|(d[j+2]>>3)]++;pass++;});
  const {pal,count}=medianCut(hist,256),near=makeLut(pal,count),buf=new ByteBuf();gifHeader(buf,w,h,pal);const idx=new Uint8Array(w*h);
  await promoFrames(w,h,fps,async(c,x,i)=>{const d=x.getImageData(0,0,w,h).data;for(let a=0,j=0;a<idx.length;a++,j+=4)idx[a]=near(((d[j]>>3)<<10)|((d[j+1]>>3)<<5)|(d[j+2]>>3));
    gifFrame(buf,w,h,idx,Math.round(100/fps));if(progress)progress((i+1)/n);if(i%10===9)await nextTick();});
  buf.b(0x3B);return new Blob([buf.out()],{type:'image/gif'});}
async function promoMP4(progress){
  if(!window.VideoEncoder||!window.Mp4Muxer)throw new Error('This browser can’t write MP4 – try Chrome, Edge or Safari');
  const [,,w,h]=P_SHAPES[PROMO.shape],fps=30,n=Math.round(PROMO.len*fps);
  /* H.264 where the browser has it (Chrome and Safari on a Mac do); otherwise VP9 in the same MP4 – fine in browsers, not in QuickTime */
  let codec=null,kind='avc';for(const c of ['avc1.640028','avc1.4d0028','avc1.42002a','vp09.00.40.08']){try{const r=await VideoEncoder.isConfigSupported({codec:c,width:w,height:h,bitrate:12e6,framerate:fps});if(r.supported){codec=c;kind=c.startsWith('vp09')?'vp9':'avc';break;}}catch(e){}}
  if(!codec)throw new Error('This browser can’t encode video');
  if(kind==='vp9')toast('This browser has no H.264, so the MP4 uses VP9 – it plays in browsers but not QuickTime. Chrome or Safari on a Mac makes H.264.');
  const muxer=new Mp4Muxer.Muxer({target:new Mp4Muxer.ArrayBufferTarget(),video:{codec:kind,width:w,height:h,frameRate:fps},fastStart:'in-memory'});
  let err=null;const enc=new VideoEncoder({output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),error:e=>{err=e;}});
  enc.configure(Object.assign({codec,width:w,height:h,bitrate:12e6,framerate:fps},kind==='avc'?{avc:{format:'avc'}}:{}));
  await promoFrames(w,h,fps,async(c,x,i)=>{if(err)throw err;const f=new VideoFrame(c,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});enc.encode(f,{keyFrame:i%fps===0});f.close();
    if(progress)progress((i+1)/n);while(enc.encodeQueueSize>6)await new Promise(r=>setTimeout(r,2));});
  await enc.flush();enc.close();if(err)throw err;muxer.finalize();return new Blob([muxer.target.buffer],{type:'video/mp4'});}
/* the sheet: every setting showing in the panel for this screen saver, card by card, then its colours hour by hour */
function promoSpecs(){
  const name=exportName(),k=kindNow(S),K=THEMES[k],d=new Date(),date=d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const show={clock:'The time, in figures',words:'The time, in words',dial:'A dial',type:cols(S)?'Columns – the time as lists of words':'Rings – the time as rings of words'}[k];
  const val=c=>{const d=c.d,v=S[d.k];if(Array.isArray(d.opts))return optLabel(d.opts,v);if(typeof d.optsFn==='function'){try{return optLabel(d.optsFn(),v);}catch(e){}}
    if(c.w.classList.contains('toggle-row'))return v?'On':'Off';if(c.w.classList.contains('colour-row'))return String(v).toUpperCase();if(d.fmt)return d.fmt(v);return typeof v==='number'?String(roundTo(v,d.step||.01)):String(v);};
  const lines=[`${name}`,'='.repeat(Math.max(8,name.length)),`Tempo ${$('.ver')?$('.ver').textContent:''} screen saver – specification, ${date}`,'',`Shows: ${show}`];
  const fname=id=>(eng.faceList().find(x=>x.id===id)||{face:{name:anyLoaded()?'?':'Demo face'}}).face.name,mixing=k==='clock'?S.ssNMode!=='parts'||N_PARTS.some(([x])=>S[x]!=='base'):k==='words'?S.ssMMode!=='parts'||M_PARTS.some(([x])=>S[x]!=='base'):false;
  if(k==='type')lines.push(`Font: ${fname(typeFont())}`);else if(k!=='dial'){lines.push(`Core font: ${fname(baseSlot())}`);
    if(mixing){const pool=eng.faceList().filter(x=>x.swap&&x.id!==baseSlot()).map(x=>x.face.name);if(pool.length)lines.push(`Mixed in: ${pool.join(', ')}`);}}
  lines.push(`Files: ${safeName()}.saver (Mac), ${safeName()}.scr (Windows), ${safeName()}.html (any browser)`);
  for(const sec of panel.querySelectorAll(':scope>section.card')){if(sec.hidden||/Presets|Export|Promo|Colour/.test(sec.querySelector('h2 span')?.textContent||''))continue;
    const title=sec.querySelector('h2 span').textContent,rows=[];
    for(const c of controls){const d=c.d;if(!d||!d.k||!d.label||!c.w||!sec.contains(c.w)||c.w.closest('[hidden]')||d.k.startsWith('__'))continue;const v=val(c);if(v==null||v==='')continue;const lb=d.labelFn?d.labelFn(S):d.label;if(!rows.some(r=>r.startsWith(lb+':')))rows.push(lb+': '+v);}
    if(rows.length){lines.push('',title,'-'.repeat(title.length),...rows);}}
  lines.push('','Colour','------');
  const colLines=T=>K.cols.filter(([key,,,,sh])=>!sh||sh(S)).map(([key,f,label,lfn])=>`${(lfn?lfn(S):label).padEnd(16)} ${String(tget(T,f)||'').toUpperCase()}`);
  if(K.on(S)){const q=setNames(k),ev=everyOf(k);lines.push(`Every hour: ${q.length} theme${q.length>1?'s':''}, each for ${ev} hour${ev>1?'s':''}, in this order; the colours fade across over 1.5 seconds as the hour turns.`);
    if(k==='clock')lines.push(`Colour by: ${optLabel([['type','Character type'],['letter','Each letter'],['line','Line'],['random','Random'],['single','One colour']],S.ssColBy)}`);
    lines.push('','Hour by hour:');for(let h=0;h<24;h+=ev){const T=themeAt(k,h);lines.push(`  ${String(h).padStart(2,'0')}:00–${String((h+ev)%24).padStart(2,'0')}:00  ${T.name}`);}
    for(const n of q){const T=findTheme(k,n);lines.push('',`${n}${T.builtin?' (built in)':''}`,...colLines(T).map(x=>'  '+x));}}
  else{const T=selOf(k);lines.push(`One theme: ${T?T.name:'own colours'}`);if(k==='clock')lines.push(`Colour by: ${optLabel([['type','Character type'],['letter','Each letter'],['line','Line'],['random','Random'],['single','One colour']],S.ssColBy)}`);lines.push(...colLines(fromS(k,'')).map(x=>'  '+x));}
  lines.push('','Promo files: three stills at '+P_SHAPES[PROMO.shape].slice(0,2).join(' × ')+', and a '+PROMO.len+'-second loop ('+(PROMO.moves==='lapse'?'time-lapse round the clock':'stepping through the hours')+') as GIF and MP4 at '+P_SHAPES[PROMO.shape].slice(2).join(' × ')+'.');
  lines.push('','All settings (for Tempo):',JSON.stringify(snapshot(name).settings));
  return lines.join('\n')+'\n';}
/* ---- the card ---- */
{const b=card('ss-promo','Promo',null,'saver');
  addHint(b,'Internal – for Ensemble’s own promotion. Comes out before Tempo goes public.');
  const segP=(label,key,opts)=>{const w=el('div','ctl'),hd=el('div','ctl-head');hd.append(el('span',null,label));const g=el('div','seg');g.setAttribute('role','group');g.setAttribute('aria-label',label);
    const bs=opts.map(([v,t])=>{const x=el('button','pill small',t);x.onclick=()=>{PROMO[key]=v;savePromo();pSv=null;refreshAll();};g.append(x);return[v,x];});w.append(hd,g);addCustom(b,null,w);
    controls.push({d:{},w,update(){bs.forEach(([v,x])=>x.setAttribute('aria-pressed',PROMO[key]===v));}});};
  segP('Shape','shape',[['16:9','16:9'],['16:10','16:10'],['1:1','Square'],['4:5','4:5']]);
  segP('Loop','len',[[5,'5 s'],[10,'10 s'],[20,'20 s']]);
  segP('The loop moves','moves',[['hours','Through the hours'],['lapse','Time-lapse']]);
  const info=el('p','hint');addCustom(b,null,info);
  const r1=el('div','ctl btn-row'),play=el('button','pill small','Play the loop');r1.append(play);addCustom(b,null,r1);
  const r2=el('div','ctl btn-row'),st=el('button','pill small','Stills'),gf=el('button','pill small','GIF'),mp=el('button','pill small','MP4'),sp=el('button','pill small','Specs');r2.append(st,gf,mp,sp);addCustom(b,null,r2);
  const r3=el('div','ctl btn-row'),pk=el('button','pill small primary','Promo pack');r3.append(pk);addCustom(b,null,r3);
  addHint(b,'Promo pack: the specs, three stills, the GIF and the MP4 in one zip. Name the screen saver under Export first – the files take its name.');
  controls.push({d:{},w:info,update(){const p=promoPlan(),[W,H,vw,vh]=P_SHAPES[PROMO.shape];
    info.textContent=(p.steps?`${p.steps} steps of ${(p.D/p.steps/1000).toFixed(2)} s – ${p.hourly?'one for each theme in the day':'an hour at a time'}. `:'Twelve hours round the clock. ')+`Stills ${W} × ${H}; MP4 ${vw} × ${vh}; GIF 960 wide.`+(p.steps>6&&PROMO.len<20?' With this many themes, 20 seconds reads better.':'');
    play.textContent=PROMO.playing?'Stop the loop':'Play the loop';play.setAttribute('aria-pressed',PROMO.playing);}});
  play.onclick=()=>{PROMO.playing=!PROMO.playing;promoT0=performance.now();pSv=null;ssDirty=true;refreshAll();};
  const busy=async(btn,fn)=>{if(btn.disabled)return;const all=[st,gf,mp,sp,pk];all.forEach(x=>x.disabled=true);const label=btn.textContent;
    try{await fn(p=>{btn.textContent=Math.round(p*100)+'%';});}catch(e){console.error(e);toast('Couldn’t make it: '+(e.message||e));}finally{all.forEach(x=>x.disabled=false);btn.textContent=label;ssDirty=true;}};
  const nm=()=>promoName(),enc=new TextEncoder();
  st.onclick=()=>busy(st,async()=>{const ims=await promoStills();for(let i=0;i<ims.length;i++)await saveFile(`${nm()} ${i+1}.png`,ims[i]);});
  gf.onclick=()=>busy(gf,async pr=>{await saveFile(`${nm()}.gif`,await promoGIF(pr));});
  mp.onclick=()=>busy(mp,async pr=>{await saveFile(`${nm()}.mp4`,await promoMP4(pr));});
  sp.onclick=()=>busy(sp,async()=>{await saveFile(`${nm()} – specs.txt`,new Blob([promoSpecs()],{type:'text/plain'}));});
  pk.onclick=()=>busy(pk,async pr=>{const n=nm(),files=[{path:`${n} – specs.txt`,data:enc.encode(promoSpecs())}];
    const ims=await promoStills();for(let i=0;i<ims.length;i++)files.push({path:`${n} ${i+1}.png`,data:new Uint8Array(await ims[i].arrayBuffer())});pr(.1);
    files.push({path:`${n}.gif`,data:new Uint8Array(await (await promoGIF(p=>pr(.1+.45*p))).arrayBuffer())});
    try{files.push({path:`${n}.mp4`,data:new Uint8Array(await (await promoMP4(p=>pr(.55+.45*p))).arrayBuffer())});}catch(e){toast(String(e.message||e)+' – the pack has the rest.');}
    await saveFile(`${n} – promo.zip`,SaverPack.zip(files));});
}
