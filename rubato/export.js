/* Rubato – PNG, SVG, GIF and video exports (GIF encoder in shared/gif.js). */
function setBusy(v){busy=v;exportUI.btns.forEach(b=>b.disabled=v);exportUI.prog.hidden=!v;exportUI.bar.style.width='0';if(!v)dirty=true;}
const progress=f=>{exportUI.bar.style.width=(clamp(f)*100).toFixed(1)+'%';};
const nextFrame=()=>new Promise(r=>setTimeout(r,0));
function exportPNG(){const [W,H]=frameSize(),k=S.xScale,c=document.createElement('canvas');c.width=Math.round(W*k);c.height=Math.round(H*k);
  renderFrame(c.getContext('2d'),W,H,phase,k);c.toBlob(b=>b&&saveFile(slug()+'-frame.png',b),'image/png');}
function exportSVG(){
  const [W,H]=frameSize();const n=x=>+x.toFixed(3);const fm=m=>`matrix(${n(m.a)} ${n(m.b)} ${n(m.c)} ${n(m.d)} ${n(m.e)} ${n(m.f)})`;
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const outline=S.style==='outline';let defs='',body='',id=0;const clipIds=new Map();
  for(const it of buildScene(phase,W,H)){const a=Math.min(1,it.alpha);if(a<=.002)continue;let open='',close='';
    for(const c of it.clips){let i=clipIds.get(c);if(!i){i='m'+(id++);clipIds.set(c,i);defs+=`<clipPath id="${i}"><rect transform="${fm(c.M)}" x="${n(c.x)}" y="${n(c.y)}" width="${n(c.w)}" height="${n(c.h)}"/></clipPath>`;}open+=`<g clip-path="url(#${i})">`;close='</g>'+close;}
    const paint=outline?`fill="none" stroke="${S.ink}" stroke-width="${n(S.stroke/1000*it.f.upm)}" stroke-linejoin="round"`:`fill="${S.ink}"`;const op=a<1?` opacity="${n(a)}"`:'';
    body+=open+(it.f.ot?`<path transform="${fm(it.M)}" d="${it.co&&it.f.pathDAt?it.f.pathDAt(it.r,it.co):it.f.pathD(it.r)}" ${paint}${op}/>`:`<text transform="${fm(it.M)}" font-family="Inter Tight, sans-serif" font-weight="${it.f.weight}" font-size="1000" ${paint}${op}>${esc(it.r)}</text>`)+close;}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs?'<defs>'+defs+'</defs>':''}${S.transparent?'':`<rect width="${W}" height="${H}" fill="${S.bg}"/>`}${body}</svg>`;
  saveFile(slug()+'-frame.svg',new Blob([svg],{type:'image/svg+xml'}));
  if(!anyLoaded())toast('The demo face exports as live text. Load your font for outlines.');else if(img)toast('SVG leaves the image out.');
}
async function exportGIF(){
  if(busy)return;setBusy(true);
  try{
    const [W,H]=frameSize(),k=S.gScale,w=Math.max(1,Math.round(W*k)),h=Math.max(1,Math.round(H*k));
    const fps=S.gFps,frames=Math.max(2,Math.round(S.dur*fps)),delay=Math.round(100/fps);
    const c=document.createElement('canvas');c.width=w;c.height=h;const cx=c.getContext('2d',{willReadFrequently:true});
    const hist=new Uint32Array(32768),samples=Math.min(frames,16);
    for(let i=0;i<samples;i++){renderFrame(cx,W,H,Math.floor(i*frames/samples)/frames,w/W,true);const d=cx.getImageData(0,0,w,h).data;for(let j=0;j<d.length;j+=8)hist[((d[j]>>3)<<10)|((d[j+1]>>3)<<5)|(d[j+2]>>3)]++;progress(i/samples*.1);await nextFrame();}
    const {pal,count}=medianCut(hist,256),near=makeLut(pal,count);
    const buf=new ByteBuf();gifHeader(buf,w,h,pal);const idx=new Uint8Array(w*h);
    for(let f=0;f<frames;f++){renderFrame(cx,W,H,f/frames,w/W,true);const d=cx.getImageData(0,0,w,h).data;
      for(let i=0,j=0;i<idx.length;i++,j+=4)idx[i]=near(((d[j]>>3)<<10)|((d[j+1]>>3)<<5)|(d[j+2]>>3));
      gifFrame(buf,w,h,idx,delay);progress(.1+.9*(f+1)/frames);await nextFrame();}
    buf.b(0x3B);
    await saveFile(slug()+'.gif',new Blob([buf.out()],{type:'image/gif'}));
  }catch(e){console.error(e);toast("Couldn't make the GIF. Try a smaller size.");}
  setBusy(false);
}
async function exportVideo(){
  if(busy)return;
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){toast("This browser can't record canvas video. Try Chrome or Safari.");return;}
  const mime=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm'].find(t=>{try{return MediaRecorder.isTypeSupported(t)}catch(e){return false}});
  if(!mime){toast("This browser can't record video.");return;}
  setBusy(true);
  const [W,H]=frameSize(),w=Math.round(W*S.xScale/2)*2,h=Math.round(H*S.xScale/2)*2;
  const c=document.createElement('canvas');c.width=w;c.height=h;c.style.cssText='position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';document.body.append(c);
  const cx=c.getContext('2d');renderFrame(cx,W,H,0,w/W);
  let rec,stream;
  try{
    stream=c.captureStream(60);rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:16e6});const chunks=[];
    rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};const stopped=new Promise(r=>rec.onstop=r);
    rec.start(100);const total=S.vLoops*S.dur*1000,t0=performance.now();
    await new Promise(res=>{const step=now=>{const el=now-t0;if(el>=total){renderFrame(cx,W,H,0,w/W);res();return;}renderFrame(cx,W,H,((el/1000)/S.dur)%1,w/W);progress(el/total);requestAnimationFrame(step);};requestAnimationFrame(step);});
    await new Promise(r=>setTimeout(r,120));rec.stop();await stopped;
    await saveFile(slug()+'.'+(mime.includes('mp4')?'mp4':'webm'),new Blob(chunks,{type:mime.split(';')[0]}));
  }catch(e){toast("Couldn't record the video in this browser.");}
  finally{if(stream)stream.getTracks().forEach(t=>t.stop());c.remove();setBusy(false);}
}
