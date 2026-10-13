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
/* Real time: a random moment – any day in the coming year, any hour – playing as it happens.
   One moment per export (and per pack, so its GIF and MP4 match). */
let realAt=0;const newMoment=()=>{const d=new Date();d.setHours(0,0,0,0);realAt=d.getTime()+Math.floor(Math.random()*365)*864e5+Math.floor(Math.random()*86400)*1000;return realAt;};
/* the loop's own clock: t (ms into the loop) → the time it shows */
function promoPlan(){
  const k=kindNow(S),K=THEMES[k],hourly=K.on(S),ev=everyOf(k),q=hourly?setNames(k):[],len=q.length||1,D=PROMO.len*1000;
  if(PROMO.moves==='real'){const b=realAt||newMoment();return{D,steps:0,real:true,at:t=>b+t,hourly};}
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
  for(let t=t0;t<t1-1e-6;t+=dt){const lt=plan.real?t:((t%plan.D)+plan.D)%plan.D;atTime(Math.round(plan.at(lt)),()=>sv.frame(ctx,W,H,(offset||0)+t,dt));if(each)await each(lt,i++);}}
/* the preview, playing the loop */
let promoT0=0,pSv=null;
function promoPreviewFrame(now){if(!PROMO.playing)return false;if(!pSv||ssDirty){pSv=promoSaver();ssDirty=false;}
  const plan=promoPlan(),t=(now-promoT0)%plan.D;atTime(Math.round(plan.at(t)),()=>pSv.frame(ctx,cv.width,cv.height,now,16));return true;}
{const was=previewFrame;previewFrame=(now,dt)=>{if(!promoPreviewFrame(now))was(now,dt);};}
/* ---- the device (0.9.1): a transparent PNG with the screen cut out. The screen saver
   goes behind it, the background is #F5F5F3, and the PNG's size and placing never change.
   Loaded once and kept in this browser; the screen is found from the PNG's own transparency. */
const DEV_BG='#F5F5F3';let DEVICE=null;
function deviceFrom(url){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>{const c=canvasOf(im.width,im.height),x=c.getContext('2d');x.drawImage(im,0,0);
  const a=x.getImageData(0,0,im.width,im.height).data,A=(px,py)=>a[(py*im.width+px)*4+3],cx=im.width>>1,cy=im.height>>1;
  if(A(cx,cy)>=128)return rej(new Error('the middle of that PNG isn’t see-through – it needs the screen cut out'));
  let l=cx,r=cx,t=cy,b=cy;while(l>0&&A(l-1,cy)<128)l--;while(r<im.width-1&&A(r+1,cy)<128)r++;while(t>0&&A(cx,t-1)<128)t--;while(b<im.height-1&&A(cx,b+1)<128)b++;
  if(l===0||t===0)return rej(new Error('couldn’t find the edge of the screen in that PNG'));
  res({img:im,url,w:im.width,h:im.height,screen:{x:l,y:t,w:r-l+1,h:b-t+1}});};im.onerror=()=>rej(new Error('that isn’t an image'));im.src=url;});}
{const u=LS.get('promoDevice');if(u)deviceFrom(u).then(d=>{DEVICE=d;refreshAll();}).catch(()=>{});}
/* where frames are drawn: the screen on its own (out = the saver's canvas), or the screen behind the device */
function makeTarget(device,ow,oh,crisp){
  if(!device){const c=canvasOf(ow,oh);return{out:c,sc:c,sw:ow,sh:oh,compose(){}};}
  const D=DEVICE,k=ow/D.w,r=D.screen,q=crisp||1,sw=Math.round(r.w*k*q),sh=Math.round(r.h*k*q),out=canvasOf(ow,Math.round(D.h*k)),sc=canvasOf(sw,sh),ox=out.getContext('2d',{willReadFrequently:true});
  return{out,sc,sw,sh,compose(){ox.globalAlpha=1;ox.fillStyle=DEV_BG;ox.fillRect(0,0,out.width,out.height);ox.imageSmoothingQuality='high';ox.drawImage(sc,r.x*k,r.y*k,r.w*k,r.h*k);ox.drawImage(D.img,0,0,out.width,out.height);}};}
/* ---- the files ---- */
/* Tempo_ScreenSaver_Ensemble_Design_Studio_<name>_<number> */
const promoName=()=>'Tempo_ScreenSaver_Ensemble_Design_Studio_'+safeName().replace(/\s+/g,'_');
const num=i=>String(i).padStart(2,'0');
function canvasOf(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
const toBlob=(c,type,q)=>new Promise(r=>c.toBlob(r,type||'image/png',q));
/* the moments for stills: every theme in the day when there's more than one (at least three stills), each on its own date and at its own time */
/* a repeatable random run from the moment chosen, so stills match what Another moment shows */
const rngFrom=seed=>{let a=(seed/1000)>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};};
function stillTimes(){const k=kindNow(S),K=THEMES[k],hourly=K.on(S),ev=everyOf(k),q=hourly?setNames(k):[],len=Math.min(24,q.length||1);
  if(PROMO.moves==='real'){/* Real time: the first still is the moment chosen; the rest are random moments drawn from it – one per theme in the day when there's more than one */
    const b=realAt||newMoment(),r=rngFrom(b),many=hourly&&len>=2,d0=new Date(b),out=[b],cur=many?Math.floor(d0.getHours()/ev)%len:-1;
    const hourFor=i=>{const hs=[];for(let h=0;h<24;h++)if(Math.floor(h/ev)%len===i)hs.push(h);return hs.length?hs[Math.floor(r()*hs.length)]:Math.floor(r()*24);};
    const want=many?[...Array(len).keys()].filter(i=>i!==cur):[-1,-1];while(want.length<2)want.push(-1);
    for(const i of want){const h=i>=0?hourFor(i):Math.floor(r()*24);out.push(new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()+1+Math.floor(r()*364),h,Math.floor(r()*60),Math.floor(r()*60)).getTime());}
    return out;}
  const day=new Date();const at=(dd,h,m,s)=>new Date(day.getFullYear(),day.getMonth(),day.getDate()+dd,h,m,s).getTime();/* by the calendar, so a clock change between dates doesn't shift the hour */
  const MS=[[41,12],[27,38],[58,3],[9,47],[33,21],[16,54],[50,30],[4,16]];
  if(!hourly||len<2)return[at(0,9,41,12),at(9,14,27,38),at(23,22,58,3)];
  const hourOf=i=>{for(let h=7;h<24;h++)if(Math.floor(h/ev)%len===i)return h;for(let h=0;h<24;h++)if(Math.floor(h/ev)%len===i)return h;return-1;};
  const idx=len>=3?[...Array(len).keys()]:[0,1,0];
  return idx.map((i,n)=>{const h=hourOf(i);const [m,s]=MS[n%MS.length];return h<0?null:at(n*9%60,h,m,s);}).filter(x=>x!=null);}
async function promoStills(device,progress){if(device&&!DEVICE)throw new Error('load the device PNG first');
  const [W,H]=device?[DEVICE.w,DEVICE.h]:P_SHAPES[PROMO.shape],out=[],times=stillTimes();
  for(const ms of times){const sv=promoSaver(),T=makeTarget(device,W,H,2),x=T.sc.getContext('2d');
    /* settle: a few seconds of frames before, so nothing is mid-change */
    const plan={D:1e12,at:t=>ms-3000+t};await promoRun(sv,x,T.sw,T.sh,plan,0,3000,12,null);T.compose();out.push(await toBlob(T.out));if(progress)progress(out.length/times.length);await nextTick();}
  return out;}
const nextTick=()=>new Promise(r=>setTimeout(r,0));
async function promoFrames(device,W,H,fps,each,crisp){const plan=promoPlan(),sv=promoSaver(),T=makeTarget(device,W,H,crisp||1),x=T.sc.getContext('2d',{willReadFrequently:true});
  /* a loop: one whole loop first, so the end leads into the start exactly; real time: a few seconds to settle */
  if(plan.real)await promoRun(sv,x,T.sw,T.sh,plan,-3000,0,15,null);else await promoRun(sv,x,T.sw,T.sh,plan,0,plan.D,Math.min(fps,15),null,-plan.D);
  await promoRun(sv,x,T.sw,T.sh,plan,0,plan.D,fps,(t,i)=>{T.compose();const ox=T.out.getContext('2d',{willReadFrequently:true});return each(T.out,ox,i);},0);return plan;}
const vidSize=device=>device?[DEVICE.w,DEVICE.h]:P_SHAPES[PROMO.shape].slice(2);
/* GIF (0.9.1, rebuilt): the same size and drawing as the stills (the device at its own size,
   the screen at the MP4's), so a still and the GIF swap without a jump. The colours that
   fill most of the picture – the background, the device, the theme's colours – go into the
   palette exactly; the rest (the edges of type and marks) share what's left. Each frame stores
   only the rectangle that changed, so a 10-second loop at full size stays a sensible weight. */
async function promoGIF(device,progress){if(device&&!DEVICE)throw new Error('load the device PNG first');
  const [w,h]=vidSize(device),fps=20,n=Math.round(PROMO.len*fps);
  /* the palette: count colours over a pass of the loop */
  const counts=new Map(),hist=new Uint32Array(32768);let total=0;
  await promoFrames(device,w,h,3,(c,x)=>{const d=x.getImageData(0,0,c.width,c.height).data;for(let j=0;j<d.length;j+=12){const v=(d[j]<<16)|(d[j+1]<<8)|d[j+2];counts.set(v,(counts.get(v)||0)+1);total++;}},2);
  const exact=[...counts.entries()].filter(([,c])=>c>=total*.0004).sort((a,b)=>b[1]-a[1]).slice(0,96).map(([v])=>v),ex=new Set(exact);
  for(const [v,c] of counts)if(!ex.has(v))hist[((v>>19&31)<<10)|((v>>11&31)<<5)|(v>>3&31)]+=c;
  const rest=medianCut(hist,256-exact.length),pal=new Uint8Array(768);let count=0;
  for(const v of exact){pal[count*3]=v>>16&255;pal[count*3+1]=v>>8&255;pal[count*3+2]=v&255;count++;}
  for(let i=0;i<rest.count&&count<256;i++,count++){pal[count*3]=rest.pal[i*3];pal[count*3+1]=rest.pal[i*3+1];pal[count*3+2]=rest.pal[i*3+2];}
  const exIdx=new Map(exact.map((v,i)=>[v,i])),near=makeLut(pal,count);
  const buf=new ByteBuf();gifHeader(buf,w,h,pal);const idx=new Uint8Array(w*h),prev=new Uint8Array(w*h);let first=true;
  await promoFrames(device,w,h,fps,async(c,x,i)=>{const d=x.getImageData(0,0,w,h).data;
    for(let a=0,j=0;a<idx.length;a++,j+=4){const v=(d[j]<<16)|(d[j+1]<<8)|d[j+2],e=exIdx.get(v);idx[a]=e!==undefined?e:near(((d[j]>>3)<<10)|((d[j+1]>>3)<<5)|(d[j+2]>>3));}
    /* the rectangle that changed since the last frame (the whole frame first) */
    let x0=0,y0=0,x1=w-1,y1=h-1;
    if(!first){x0=w;y0=h;x1=-1;y1=-1;for(let yy=0;yy<h;yy++){const o=yy*w;for(let xx=0;xx<w;xx++)if(idx[o+xx]!==prev[o+xx]){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;y1=yy;}}
      if(x1<0){x0=y0=0;x1=y1=0;}}
    const rw=x1-x0+1,rh=y1-y0+1,sub=new Uint8Array(rw*rh);for(let yy=0;yy<rh;yy++)sub.set(idx.subarray((y0+yy)*w+x0,(y0+yy)*w+x0+rw),yy*rw);
    buf.b(0x21);buf.b(0xF9);buf.b(4);buf.b(0x04);buf.w(Math.round(100/fps));buf.b(0);buf.b(0);
    buf.b(0x2C);buf.w(x0);buf.w(y0);buf.w(rw);buf.w(rh);buf.b(0);lzwEncode(buf,sub,8);
    prev.set(idx);first=false;if(progress)progress((i+1)/n);if(i%4===3)await nextTick();},2);
  buf.b(0x3B);return new Blob([buf.out()],{type:'image/gif'});}
async function promoMP4(device,progress){if(device&&!DEVICE)throw new Error('load the device PNG first');
  if(!window.VideoEncoder||!window.Mp4Muxer)throw new Error('This browser can’t write MP4 – try Chrome, Edge or Safari');
  let [w,h]=vidSize(device);w-=w%2;h-=h%2;const fps=30,n=Math.round(PROMO.len*fps);
  /* H.264 where the browser has it (Chrome and Safari on a Mac do); otherwise VP9 in the same MP4 – fine in browsers, not in QuickTime */
  let codec=null,kind='avc';for(const c of ['avc1.640028','avc1.4d0028','avc1.42002a','vp09.00.40.08']){try{const r=await VideoEncoder.isConfigSupported({codec:c,width:w,height:h,bitrate:12e6,framerate:fps});if(r.supported){codec=c;kind=c.startsWith('vp09')?'vp9':'avc';break;}}catch(e){}}
  if(!codec)throw new Error('This browser can’t encode video');
  if(kind==='vp9')toast('This browser has no H.264, so the MP4 uses VP9 – it plays in browsers but not QuickTime. Chrome or Safari on a Mac makes H.264.');
  const muxer=new Mp4Muxer.Muxer({target:new Mp4Muxer.ArrayBufferTarget(),video:{codec:kind,width:w,height:h,frameRate:fps},fastStart:'in-memory'});
  let err=null;const enc=new VideoEncoder({output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),error:e=>{err=e;}});
  enc.configure(Object.assign({codec,width:w,height:h,bitrate:12e6,framerate:fps},kind==='avc'?{avc:{format:'avc'}}:{}));
  await promoFrames(device,w,h,fps,async(c,x,i)=>{if(err)throw err;const f=new VideoFrame(c,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps),visibleRect:{x:0,y:0,width:w,height:h}});enc.encode(f,{keyFrame:i%fps===0});f.close();
    if(progress)progress((i+1)/n);while(enc.encodeQueueSize>6)await new Promise(r=>setTimeout(r,2));},2);/* drawn as the stills are */
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
  lines.push('','Promo files: '+stillTimes().length+' stills at '+P_SHAPES[PROMO.shape].slice(0,2).join(' × ')+(DEVICE?' and in the device at '+DEVICE.w+' × '+DEVICE.h+' on '+DEV_BG:'')+', and a '+PROMO.len+'-second '+(PROMO.moves==='real'?'stretch in real time from a random moment':'loop ('+(PROMO.moves==='lapse'?'time-lapse round the clock':'stepping through the hours')+')')+' as GIF and MP4.');
  lines.push('','All settings (for Tempo):',JSON.stringify(snapshot(name).settings));
  return lines.join('\n')+'\n';}
/* ---- the card ---- */
{const b=card('ss-promo','Promo',null,'saver');
  addHint(b,'Internal – for Ensemble’s own promotion. Comes out before Tempo goes public.');
  const segP=(label,key,opts)=>{const w=el('div','ctl'),hd=el('div','ctl-head');hd.append(el('span',null,label));const g=el('div','seg');g.setAttribute('role','group');g.setAttribute('aria-label',label);
    const bs=opts.map(([v,t])=>{const x=el('button','pill small',t);x.onclick=()=>{PROMO[key]=v;savePromo();pSv=null;if(key==='moves'&&v==='real')newMoment();refreshAll();};g.append(x);return[v,x];});w.append(hd,g);addCustom(b,null,w);
    controls.push({d:{},w,update(){bs.forEach(([v,x])=>x.setAttribute('aria-pressed',PROMO[key]===v));}});};
  segP('Shape','shape',[['16:9','16:9'],['16:10','16:10'],['1:1','Square'],['4:5','4:5']]);
  segP('Length','len',[[5,'5 s'],[10,'10 s'],[20,'20 s']]);
  segP('Moves','moves',[['hours','Through the hours'],['lapse','Time-lapse'],['real','Real time']]);
  const info=el('p','hint');addCustom(b,null,info);
  const r1=el('div','ctl btn-row'),play=el('button','pill small','Play'),again=el('button','pill small','Another moment');r1.append(play,again);addCustom(b,null,r1);
  b.append(el('div','sub-head','The screen'));
  const r2=el('div','ctl btn-row'),st=el('button','pill small','Stills'),gf=el('button','pill small','GIF'),mp=el('button','pill small','MP4');r2.append(st,gf,mp);addCustom(b,null,r2);
  b.append(el('div','sub-head','In the device'));
  const dinfo=el('p','hint');addCustom(b,null,dinfo);
  const r4=el('div','ctl btn-row'),dl=el('button','pill small','Load device PNG'),dst=el('button','pill small','Stills'),dgf=el('button','pill small','GIF'),dmp=el('button','pill small','MP4');r4.append(dl,dst,dgf,dmp);addCustom(b,null,r4);
  dst.setAttribute('aria-label','Device stills');dgf.setAttribute('aria-label','Device GIF');dmp.setAttribute('aria-label','Device MP4');
  const fin=el('input');fin.type='file';fin.accept='image/png';fin.className='vh';fin.tabIndex=-1;document.body.append(fin);
  b.append(el('div','sub-head','Everything'));
  const r3=el('div','ctl btn-row'),sp=el('button','pill small','Specs'),pk=el('button','pill small primary','Promo pack');r3.append(sp,pk);addCustom(b,null,r3);
  addHint(b,'Promo pack: the specs, the stills, the GIF and the MP4 – on their own and in the device, if one is loaded – in one zip. Files are named Tempo_ScreenSaver_Ensemble_Design_Studio_ then the name under Export, then a number.');
  controls.push({d:{},w:info,update(){const p=promoPlan(),[W,H,vw,vh]=P_SHAPES[PROMO.shape],n=stillTimes().length;
    const when=p.real?new Date(p.at(0)).toLocaleString('en-GB',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}):'';
    info.textContent=(p.real?`Real time from ${when} – stills and motion use this moment; Another moment picks a new one. `:p.steps?`${p.steps} steps of ${(p.D/p.steps/1000).toFixed(2)} s – ${p.hourly?'one for each theme in the day':'an hour at a time'}, joining up seamlessly. `:'Twelve hours round the clock, joining up seamlessly. ')+`${n} stills (${W} × ${H}); MP4 and GIF ${vw} × ${vh}${DEVICE?`, in the device ${DEVICE.w} × ${DEVICE.h} – stills, GIF and MP4 alike`:''}.`+(p.steps>6&&PROMO.len<20?' With this many themes, 20 seconds reads better.':'');
    again.hidden=!p.real;play.textContent=PROMO.playing?'Stop':'Play';play.setAttribute('aria-label',PROMO.playing?'Stop the loop':'Play the loop');play.setAttribute('aria-pressed',PROMO.playing);
    dinfo.textContent=DEVICE?`Device: ${DEVICE.w} × ${DEVICE.h}, its screen ${DEVICE.screen.w} × ${DEVICE.screen.h} – the screen saver goes behind it, on ${DEV_BG}.`:'Load a transparent PNG of a device with its screen cut out; it’s kept in this browser.';
    [dst,dgf,dmp].forEach(x=>x.disabled=!DEVICE);}});
  play.onclick=()=>{PROMO.playing=!PROMO.playing;promoT0=performance.now();pSv=null;ssDirty=true;refreshAll();};
  again.onclick=()=>{newMoment();pSv=null;ssDirty=true;promoT0=performance.now();refreshAll();};
  dl.onclick=()=>fin.click();
  fin.onchange=async()=>{const f=fin.files[0];fin.value='';if(!f)return;const url=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(f);});
    try{DEVICE=await deviceFrom(url);try{LS.set('promoDevice',url);}catch(e){toast('The device is loaded, but too big to keep for next time.');}refreshAll();toast(`Device loaded – its screen is ${DEVICE.screen.w} × ${DEVICE.screen.h}`);}
    catch(e){toast('Couldn’t use it: '+e.message);}};
  const all=[st,gf,mp,dst,dgf,dmp,sp,pk];
  const busy=async(btn,fn)=>{if(btn.disabled)return;all.forEach(x=>x.disabled=true);const label=btn.textContent;
    try{await fn(p=>{btn.textContent=Math.round(p*100)+'%';});}catch(e){console.error(e);toast('Couldn’t make it: '+(e.message||e));}finally{all.forEach(x=>x.disabled=false);btn.textContent=label;ssDirty=true;refreshAll();}};
  const nm=()=>promoName(),enc=new TextEncoder(),u8=async bl=>new Uint8Array(await bl.arrayBuffer());
  /* numbers: the screen's stills from 01, the device's straight after; motion: 01 the screen, 02 the device */
  const stillsN=()=>stillTimes().length;
  /* Real time: every export uses the moment shown (Another moment picks a new one) */
  const fresh=()=>{if(PROMO.moves==='real'&&!realAt)newMoment();};
  st.onclick=()=>busy(st,async pr=>{const ims=await promoStills(false,pr);for(let i=0;i<ims.length;i++)await saveFile(`${nm()}_${num(i+1)}.png`,ims[i]);});
  dst.onclick=()=>busy(dst,async pr=>{const ims=await promoStills(true,pr),o=stillsN();for(let i=0;i<ims.length;i++)await saveFile(`${nm()}_${num(o+i+1)}.png`,ims[i]);});
  gf.onclick=()=>busy(gf,async pr=>{fresh();await saveFile(`${nm()}_Motion_01.gif`,await promoGIF(false,pr));});
  mp.onclick=()=>busy(mp,async pr=>{fresh();await saveFile(`${nm()}_Motion_01.mp4`,await promoMP4(false,pr));});
  dgf.onclick=()=>busy(dgf,async pr=>{fresh();await saveFile(`${nm()}_Motion_02.gif`,await promoGIF(true,pr));});
  dmp.onclick=()=>busy(dmp,async pr=>{fresh();await saveFile(`${nm()}_Motion_02.mp4`,await promoMP4(true,pr));});
  sp.onclick=()=>busy(sp,async()=>{await saveFile(`${nm()}_Specs.txt`,new Blob([promoSpecs()],{type:'text/plain'}));});
  pk.onclick=()=>busy(pk,async pr=>{fresh();const n=nm(),files=[{path:`${n}_Specs.txt`,data:enc.encode(promoSpecs())}],dev=!!DEVICE,parts=dev?6:3;let step=0;const sub=p=>pr((step+p)/parts);
    const ims=await promoStills(false,sub);ims.forEach((x,i)=>files.push({path:`${n}_${num(i+1)}.png`,blob:x}));step++;
    if(dev){const d=await promoStills(true,sub);d.forEach((x,i)=>files.push({path:`${n}_${num(ims.length+i+1)}.png`,blob:x}));step++;}
    files.push({path:`${n}_Motion_01.gif`,blob:await promoGIF(false,sub)});step++;
    if(dev){files.push({path:`${n}_Motion_02.gif`,blob:await promoGIF(true,sub)});step++;}
    try{files.push({path:`${n}_Motion_01.mp4`,blob:await promoMP4(false,sub)});step++;if(dev){files.push({path:`${n}_Motion_02.mp4`,blob:await promoMP4(true,sub)});step++;}}
    catch(e){toast(String(e.message||e)+' – the pack has the rest.');}
    for(const f of files)if(f.blob){f.data=await u8(f.blob);delete f.blob;}
    await saveFile(`${n}_Promo.zip`,SaverPack.zip(files));});
}
