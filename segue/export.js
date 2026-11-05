/* Segue – exports. Every frame is drawn at full size at its exact moment: each video is
   seeked to the frame the loop wants before the frame is drawn, so the file is the loop,
   frame for frame, however fast or slow the computer is. */
/* ---------------- frames ---------------- */
function seek(v,t){return new Promise(res=>{let done=false;const fin=()=>{if(done)return;done=true;v.removeEventListener('seeked',fin);res();};
  v.addEventListener('seeked',fin);try{v.currentTime=t;}catch(e){fin();}setTimeout(fin,4000);});}
async function frameAt(c,x,W,H,t){
  const sc=E.scene(S,items,x,FONTS,W,H,t),want=new Map();
  for(const o of sc.ops)if(o.item.kind==='video'&&o.time!=null&&!want.has(o.item))want.set(o.item,o.time);
  for(const [it,tm] of want){const v=it.el,d=Math.max(.01,it.dur||v.duration||1),tt=Math.min(d-1e-3,((tm%d)+d)%d);if(Math.abs(v.currentTime-tt)>1e-3)await seek(v,tt);}
  E.paint(x,sc,S,FONTS,{scale:1,media:drawMedia,bgImg:PICS.bg,ovImg:PICS.ov});}
async function fontsReady(){if(!document.fonts)return;const used=new Set(['T','L','G'].map(r=>S[r+'F']));if(S.ovOn&&S.ovKind==='text')used.add(S.OF);
  await Promise.all([...used].map(id=>FONTS[id]?document.fonts.load(fontStr(FONTS[id])).catch(()=>null):null));await document.fonts.ready;E.resetMeasure();}
let stopFlag=false;
/* n frames across the loops; when the loop isn't a whole number of frames long, each frame's
   moment is stretched by a fraction of a frame so the file still loops exactly */
async function eachFrame(W,H,fps,n,fn,progress,len){
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d',{willReadFrequently:true}),step=len?len/n:1/fps;
  for(const it of items)if(it.el)it.el.pause();
  for(let i=0;i<n;i++){if(stopFlag)throw new Error('stopped');await frameAt(c,x,W,H,i*step);await fn(c,x,i);if(progress)progress((i+1)/n);if(i%6===5)await new Promise(r=>setTimeout(r,0));}}
/* ---------------- MP4 ---------------- */
/* Colour (as Tempo 0.9.2): Segue turns each frame into video colours itself – BT.709, video
   range – and labels the file to match, with the sRGB tone curve, so #F5F5F3 plays back as
   #F5F5F3. */
const V709={kr:.2126,kb:.0722};const yuvBest=new Map();
function yuvOf(r8,g8,b8){const key=(r8<<16)|(g8<<8)|b8;let q=yuvBest.get(key);if(q)return q;
  const {kr,kb}=V709,kg=1-kr-kb,r=r8/255,g=g8/255,b=b8/255,l=kr*r+kg*g+kb*b,y0=Math.round(16+219*l),u0=Math.round(128+224*(b-l)/(2*(1-kb))),v0=Math.round(128+224*(r-l)/(2*(1-kr)));
  const dec=(Y,U,V)=>{const yy=(Y-16)/219,uu=(U-128)/224,vv=(V-128)/224,R=yy+2*(1-kr)*vv,B=yy+2*(1-kb)*uu,G=(yy-kr*R-kb*B)/kg,c=x=>Math.round(Math.max(0,Math.min(1,x))*255);return Math.max(Math.abs(c(R)-r8),Math.abs(c(G)-g8),Math.abs(c(B)-b8));};
  let best=[y0,u0,v0],be=dec(y0,u0,v0);
  if(be>0)for(let Y=y0-2;Y<=y0+2;Y++)for(let U=u0-2;U<=u0+2;U++)for(let V=v0-2;V<=v0+2;V++){const e=dec(Y,U,V);if(e<be){be=e;best=[Y,U,V];}}
  if(yuvBest.size>200000)yuvBest.clear();yuvBest.set(key,best);return best;}
function toI420(d,w,h,Y,U,V){const {kr,kb}=V709,kg=1-kr-kb,cw=w>>1;
  for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){const j0=(y*w+x)*4,j1=j0+4,j2=j0+w*4,j3=j2+4,o=(y>>1)*cw+(x>>1);
    const flat=d[j0]===d[j1]&&d[j0]===d[j2]&&d[j0]===d[j3]&&d[j0+1]===d[j1+1]&&d[j0+1]===d[j2+1]&&d[j0+1]===d[j3+1]&&d[j0+2]===d[j1+2]&&d[j0+2]===d[j2+2]&&d[j0+2]===d[j3+2];
    if(flat){const q=yuvOf(d[j0],d[j0+1],d[j0+2]);Y[y*w+x]=Y[y*w+x+1]=Y[(y+1)*w+x]=Y[(y+1)*w+x+1]=q[0];U[o]=q[1];V[o]=q[2];continue;}
    let rs=0,gs=0,bs=0;for(const j of [j0,j1,j2,j3]){const r=d[j]/255,g=d[j+1]/255,b=d[j+2]/255;rs+=r;gs+=g;bs+=b;Y[((j/4)|0)]=Math.round(16+219*(kr*r+kg*g+kb*b));}
    rs/=4;gs/=4;bs/=4;const l=kr*rs+kg*gs+kb*bs;U[o]=Math.round(128+224*(bs-l)/(2*(1-kb)));V[o]=Math.round(128+224*(rs-l)/(2*(1-kr)));}}
const MP4_COLOUR={primaries:'bt709',transfer:'iec61966-2-1',matrix:'bt709',fullRange:false};
/* The range flag inside the H.264 stream. Some encoders (Apple's, behind Chrome and Safari on
   a Mac) write "full range" into the stream's own header even when the frames are video
   range. QuickTime goes by the file's label and looks right; ffmpeg – and so Instagram and
   most places you upload to – goes by the stream and lifts the greys (#F5F5F3 shows as
   #E2E2E0). Segue's frames are video range, so it sets the stream's flag to say so. */
function spsVideoRange(nal){
  const rb=[],map=[];let z=0;for(let i=0;i<nal.length;i++){const b=nal[i];if(z>=2&&b===3){z=0;continue;}rb.push(b);map.push(i);z=b===0?z+1:0;}
  let pos=8;const bit=()=>{const v=(rb[pos>>3]>>(7-(pos&7)))&1;pos++;return v;},u=n=>{let v=0;for(let i=0;i<n;i++)v=v*2+bit();return v;};
  const ue=()=>{let lz=0;while(pos<rb.length*8&&!bit())lz++;return lz?(2**lz-1+u(lz)):0;},se=()=>{const k=ue();return k&1?(k+1)/2:-(k/2);};
  try{const prof=u(8);u(16);ue();
    if([100,110,122,244,44,83,86,118,128,138,139,134,135].includes(prof)){const cf=ue();if(cf===3)u(1);ue();ue();u(1);
      if(u(1))for(let i=0;i<(cf!==3?8:12);i++)if(u(1)){const n=i<6?16:64;let last=8,next=8;for(let j=0;j<n;j++){if(next!==0){next=(last+se()+256)%256;}last=next===0?last:next;}}}
    ue();const poc=ue();if(poc===0)ue();else if(poc===1){u(1);se();se();const c=ue();for(let i=0;i<c;i++)se();}
    ue();u(1);ue();ue();if(!u(1))u(1);u(1);if(u(1)){ue();ue();ue();ue();}
    if(!u(1))return null;if(u(1)){if(u(8)===255){u(16);u(16);}}if(u(1))u(1);
    if(!u(1))return null;u(3);const at=pos;if(!u(1))return null;
    rb[at>>3]&=~(1<<(7-(at&7)));}catch(e){return null;}
  const out=[];z=0;for(const b of rb){if(z>=2&&b<=3){out.push(3);z=0;}out.push(b);z=b===0?z+1:0;}return new Uint8Array(out);}
function avcCVideoRange(desc){const b=new Uint8Array(desc instanceof ArrayBuffer?desc:desc.buffer?desc.buffer.slice(desc.byteOffset,desc.byteOffset+desc.byteLength):desc);
  if(b[0]!==1)return null;let p=5;const n=b[p++]&31,sps=[];for(let i=0;i<n;i++){const l=(b[p]<<8)|b[p+1];p+=2;sps.push(b.slice(p,p+l));p+=l;}
  let changed=false;const fixed=sps.map(s=>{const f=spsVideoRange(s);if(f){changed=true;return f;}return s;});if(!changed)return null;
  const rest=b.slice(p),parts=[b.slice(0,5),Uint8Array.of(0xE0|n)];for(const s of fixed)parts.push(Uint8Array.of(s.length>>8,s.length&255),s);parts.push(rest);
  const len=parts.reduce((a,x)=>a+x.length,0),out=new Uint8Array(len);let o=0;for(const x of parts){out.set(x,o);o+=x.length;}return out;}
function chunkVideoRange(data){/* length-prefixed NALs: fix any SPS carried in the frames themselves */
  let p=0,changed=false;const parts=[];while(p+4<=data.length){const l=((data[p]<<24)|(data[p+1]<<16)|(data[p+2]<<8)|data[p+3])>>>0;const nal=data.subarray(p+4,p+4+l);
    let f=null;if((nal[0]&31)===7)f=spsVideoRange(nal);if(f)changed=true;const x=f||nal;parts.push(Uint8Array.of(x.length>>>24,(x.length>>16)&255,(x.length>>8)&255,x.length&255),x);p+=4+l;}
  if(!changed)return null;const out=new Uint8Array(parts.reduce((a,x)=>a+x.length,0));let o=0;for(const x of parts){out.set(x,o);o+=x.length;}return out;}
async function makeMP4(progress){
  if(!window.VideoEncoder||!window.Mp4Muxer)throw new Error('This browser can’t write MP4 – try Chrome, Edge or Safari');
  const [W,H]=size(),fps=+S.fps||30,P=planNow(),n=Math.max(1,Math.round(P.L*(+S.xLoops||1)*fps));
  let codec=null,kind='avc';for(const c of ['avc1.640033','avc1.640028','avc1.4d0033','avc1.4d0028','avc1.42003e','vp09.00.40.08']){try{const r=await VideoEncoder.isConfigSupported({codec:c,width:W,height:H,bitrate:24e6,framerate:fps});if(r.supported){codec=c;kind=c.startsWith('vp09')?'vp9':'avc';break;}}catch(e){}}
  if(!codec)throw new Error('This browser can’t encode video');
  if(kind==='vp9')toast('This browser has no H.264, so the MP4 uses VP9 – it plays in browsers but not QuickTime. Chrome or Safari on a Mac makes H.264.');
  const muxer=new Mp4Muxer.Muxer({target:new Mp4Muxer.ArrayBufferTarget(),video:{codec:kind,width:W,height:H,frameRate:fps},fastStart:'in-memory'});
  let err=null;const enc=new VideoEncoder({output:(chunk,meta)=>{try{
      if(meta&&meta.decoderConfig){meta.decoderConfig.colorSpace=Object.assign({},MP4_COLOUR);if(kind==='avc'&&meta.decoderConfig.description){const f=avcCVideoRange(meta.decoderConfig.description);if(f)meta.decoderConfig.description=f;}}
      if(kind==='avc'){const d=new Uint8Array(chunk.byteLength);chunk.copyTo(d);const f=chunkVideoRange(d);if(f){muxer.addVideoChunkRaw(f,chunk.type,chunk.timestamp,chunk.duration,meta);return;}}
      muxer.addVideoChunk(chunk,meta);}catch(e){err=e;}},error:e=>{err=e;}});
  enc.configure(Object.assign({codec,width:W,height:H,bitrate:Math.round(24e6*(W*H)/(1080*1350)),framerate:fps,latencyMode:'quality'},kind==='avc'?{avc:{format:'avc'}}:{}));
  const Y=new Uint8Array(W*H),U=new Uint8Array((W>>1)*(H>>1)),V=new Uint8Array((W>>1)*(H>>1)),buf=new Uint8Array(W*H*3/2);
  await eachFrame(W,H,fps,n,async(c,x,i)=>{if(err)throw err;const d=x.getImageData(0,0,W,H).data;toI420(d,W,H,Y,U,V);buf.set(Y,0);buf.set(U,W*H);buf.set(V,W*H+U.length);
    const f=new VideoFrame(buf,{format:'I420',codedWidth:W,codedHeight:H,timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps),colorSpace:MP4_COLOUR});enc.encode(f,{keyFrame:i%fps===0});f.close();
    while(enc.encodeQueueSize>4)await new Promise(r=>setTimeout(r,2));},progress,P.L*(+S.xLoops||1));
  await enc.flush();enc.close();if(err)throw err;muxer.finalize();return new Blob([muxer.target.buffer],{type:'video/mp4'});}
/* ---------------- GIF ---------------- */
/* Made for showcase GIFs, which are usually Photoshop's job. A frame that doesn't change isn't
   written again – the one before it is simply held for longer, as Photoshop's frame delays do –
   so slides that sit still cost almost nothing. A frame that changes in part writes just the
   rectangle that changed, with the pixels inside it that haven't changed left see-through, so
   the frame before shows through exactly. Each frame (or part) gets its own colours, taken from
   the true colours of its pixels, so flat colours – a background, a brand colour – come out
   exact rather than rounded. Dither is there for photographs and gradients. */
const GQ=c=>((c[0]>>3)<<10)|((c[1]>>3)<<5)|(c[2]>>3);
function gifPalette(cnt,sr,sg,sb,max){
  const cols=[];for(let i=0;i<32768;i++)if(cnt[i])cols.push(i);
  const ch=(c,j)=>j===0?(c>>10)&31:j===1?(c>>5)&31:c&31;
  let boxes=[cols];
  const info=bx=>{let mn=[31,31,31],mx=[0,0,0],n=0;for(const c of bx){n+=cnt[c];for(let j=0;j<3;j++){const v=ch(c,j);if(v<mn[j])mn[j]=v;if(v>mx[j])mx[j]=v;}}const r=[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]];const j=r[0]>=r[1]&&r[0]>=r[2]?0:r[1]>=r[2]?1:2;return{n,range:r[j],j};};
  if(cols.length>max){
    while(boxes.length<max){let best=-1,bs=-1,bi=null;
      boxes.forEach((bx,i)=>{if(bx.length<2)return;const f=info(bx),sc=f.range*Math.sqrt(f.n);if(sc>bs){bs=sc;best=i;bi=f;}});
      if(best<0||bs<=0)break;
      const bx=boxes[best].slice().sort((a,b)=>ch(a,bi.j)-ch(b,bi.j));
      let acc=0,cut=1;for(let i=0;i<bx.length;i++){acc+=cnt[bx[i]];if(acc>=bi.n/2){cut=Math.min(Math.max(i+1,1),bx.length-1);break;}}
      boxes.splice(best,1,bx.slice(0,cut),bx.slice(cut));}}
  else boxes=cols.map(c=>[c]);
  const pal=new Uint8Array(768);
  /* each colour is the true average of the pixels it stands for */
  boxes.forEach((bx,i)=>{let n=0,r=0,g=0,b=0;for(const c of bx){n+=cnt[c];r+=sr[c];g+=sg[c];b+=sb[c];}if(n){pal[i*3]=Math.round(r/n);pal[i*3+1]=Math.round(g/n);pal[i*3+2]=Math.round(b/n);}});
  const count=Math.max(1,boxes.length),lut=new Int16Array(32768).fill(-1);
  const near=(r,g,b)=>{let v=0,bd=1e12;for(let i=0;i<count;i++){const dr=pal[i*3]-r,dg=pal[i*3+1]-g,db=pal[i*3+2]-b,d=dr*dr*2+dg*dg*3+db*db;if(d<bd){bd=d;v=i;}}return v;};
  /* a colour in the picture: its bin's own entry (exact for flat colour); anything else, the nearest */
  const index=q=>{let v=lut[q];if(v!==-1)return v;v=cnt[q]?near(sr[q]/cnt[q],sg[q]/cnt[q],sb[q]/cnt[q]):near(((q>>10)&31)<<3|4,((q>>5)&31)<<3|4,(q&31)<<3|4);lut[q]=v;return v;};
  return{pal,count,index,near};}
const GIF_TOL=2;   /* a pixel within this of what's showing is left as it is (video noise) */
async function makeGIF(progress){
  const [W0,H0]=size(),k=+S.xGifScale||.5,W=Math.max(2,Math.round(W0*k)),H=Math.max(2,Math.round(H0*k)),fps=+S.xGifFps||20,P=planNow();
  const len=P.L,n=Math.max(1,Math.round(len*fps)),dither=!!S.xDither;   /* a GIF loops for ever: one loop is enough */
  const out=document.createElement('canvas');out.width=W;out.height=H;const ox=out.getContext('2d',{willReadFrequently:true});ox.imageSmoothingQuality='high';
  const buf=new ByteBuf();buf.s('GIF89a');buf.w(W);buf.w(H);buf.b(0x70);buf.b(0);buf.b(0);
  buf.b(0x21);buf.b(0xFF);buf.b(11);buf.s('NETSCAPE2.0');buf.b(3);buf.b(1);buf.w(0);buf.b(0);
  const shown=new Uint8ClampedArray(W*H*3),cnt=new Uint32Array(32768),sr=new Float64Array(32768),sg=new Float64Array(32768),sb=new Float64Array(32768);
  let pend=null,frames=0;
  const cs=i=>Math.round(i*len/n*100);
  const flush=end=>{if(!pend)return;buf.b(0x21);buf.b(0xF9);buf.b(4);buf.b(pend.see?0x05:0x04);buf.w(Math.max(2,end-pend.cs));buf.b(pend.see?255:0);buf.b(0);buf.arr(pend.bytes);frames++;pend=null;};
  await eachFrame(W0,H0,fps,n,async(c,x,i)=>{ox.drawImage(c,0,0,W,H);const d=ox.getImageData(0,0,W,H).data;
    /* what changed since what's showing */
    let x0=W,y0=H,x1=-1,y1=-1;const first=i===0,chg=new Uint8Array(W*H);
    for(let y=0,p=0;y<H;y++)for(let xx=0;xx<W;xx++,p++){const j=p*4,q=p*3;
      if(first||Math.abs(d[j]-shown[q])>GIF_TOL||Math.abs(d[j+1]-shown[q+1])>GIF_TOL||Math.abs(d[j+2]-shown[q+2])>GIF_TOL){chg[p]=1;if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(y<y0)y0=y;if(y>y1)y1=y;}}
    if(x1<0)return;   /* nothing changed: the frame before is held a little longer */
    const rw=x1-x0+1,rh=y1-y0+1,see=!first;
    cnt.fill(0);sr.fill(0);sg.fill(0);sb.fill(0);
    for(let y=y0;y<=y1;y++)for(let xx=x0;xx<=x1;xx++){const p=y*W+xx;if(!chg[p])continue;const j=p*4,q=((d[j]>>3)<<10)|((d[j+1]>>3)<<5)|(d[j+2]>>3);cnt[q]++;sr[q]+=d[j];sg[q]+=d[j+1];sb[q]+=d[j+2];}
    const Q=gifPalette(cnt,sr,sg,sb,see?255:256),idx=new Uint8Array(rw*rh);
    if(dither){const er=new Float32Array((rw+2)*2*3);   /* Floyd–Steinberg, two rows of error */
      for(let y=0;y<rh;y++){const cur=(y%2)*(rw+2)*3,nxt=((y+1)%2)*(rw+2)*3;er.fill(0,nxt,nxt+(rw+2)*3);
        for(let xx=0;xx<rw;xx++){const p=(y0+y)*W+x0+xx,o=y*rw+xx;if(!chg[p]){idx[o]=255;continue;}const j=p*4,e=cur+(xx+1)*3;
          const r=clamp(d[j]+er[e],0,255),g=clamp(d[j+1]+er[e+1],0,255),b=clamp(d[j+2]+er[e+2],0,255),v=Q.index(((r>>3)<<10)|((g>>3)<<5)|(b>>3));idx[o]=v;
          const dr=r-Q.pal[v*3],dg=g-Q.pal[v*3+1],db=b-Q.pal[v*3+2],sp=(k,w)=>{er[k]+=dr*w;er[k+1]+=dg*w;er[k+2]+=db*w;};
          sp(e+3,7/16);sp(nxt+xx*3,3/16);sp(nxt+(xx+1)*3,5/16);sp(nxt+(xx+2)*3,1/16);}}}
    else for(let y=0;y<rh;y++)for(let xx=0;xx<rw;xx++){const p=(y0+y)*W+x0+xx,o=y*rw+xx;if(!chg[p]){idx[o]=255;continue;}const j=p*4;idx[o]=Q.index(((d[j]>>3)<<10)|((d[j+1]>>3)<<5)|(d[j+2]>>3));}
    for(let p=0;p<W*H;p++)if(chg[p]){shown[p*3]=d[p*4];shown[p*3+1]=d[p*4+1];shown[p*3+2]=d[p*4+2];}
    const fb=new ByteBuf();fb.b(0x2C);fb.w(x0);fb.w(y0);fb.w(rw);fb.w(rh);fb.b(0x87);fb.arr(Q.pal);lzwEncode(fb,idx,8);
    flush(cs(i));pend={cs:cs(i),bytes:fb.out(),see};},progress,len);
  flush(Math.round(len*100));
  buf.b(0x3B);const blob=new Blob([buf.out()],{type:'image/gif'});blob.gifFrames=frames;return blob;}
async function makePNG(){const [W,H]=size(),P=planNow(),c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  await frameAt(c,x,W,H,((clock%P.L)+P.L)%P.L);return await new Promise(r=>c.toBlob(r,'image/png'));}
/* ---------------- the Export sheet ---------------- */
const fileName=ext=>{const [W,H]=size();const base=(S.name||'Segue').trim().replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,'_')||'Segue';return `${base}_${W}x${H}.${ext}`;};
let xBar,xInfo,xGo,xStop;
{const b=card('export','Export');
  build(b,[{t:'seg',k:'xFormat',label:'Format',opts:[['mp4','MP4'],['gif','GIF'],['png','PNG','The frame on the stage now, at full size']]},
    {t:'seg',k:'xLoops',label:'Loops in the file',opts:[[1,'1'],[2,'2'],[3,'3']],show:s=>s.xFormat==='mp4'},
    {t:'seg',k:'xGifScale',label:'GIF size',opts:[[1,'Full'],[.5,'Half'],[.25,'Quarter']],show:s=>s.xFormat==='gif'},
    {t:'seg',k:'xGifFps',label:'GIF frame rate',opts:[[12,'12'],[15,'15'],[20,'20'],[25,'25']],show:s=>s.xFormat==='gif'},
    {t:'toggle',k:'xDither',label:'Dither',show:s=>s.xFormat==='gif',tip:'Smooths gradients and photographs with a fine grain of dots. The file comes out bigger.'},
    {t:'text',k:'name',label:'File name'}]);
  addHint(b,'Still slides cost almost nothing in a GIF – each is written once and held. Anything that moves is written frame by frame, so the file grows with every second of it: half size at 15 fps keeps it manageable.',s=>s.xFormat==='gif'&&gifMoves(s));
  xInfo=el('p','hint');addCustom(b,null,xInfo);
  const pr=el('div','progress');xBar=el('i');pr.append(xBar);addCustom(b,null,pr);
  const r=el('div','ctl btn-row');xGo=el('button','pill primary','Download');xGo.type='button';xStop=el('button','pill small','Stop');xStop.type='button';xStop.hidden=true;r.append(xGo,xStop);addCustom(b,null,r);
  xStop.onclick=()=>{stopFlag=true;};
  xGo.onclick=async()=>{if(busy)return;const f=S.xFormat;busy=true;stopFlag=false;xGo.disabled=true;xStop.hidden=f==='png';xBar.style.width='0%';const t0=performance.now();
    try{await fontsReady();const prog=p=>{xBar.style.width=Math.round(p*100)+'%';toast(`Making the ${f.toUpperCase()} – ${Math.round(p*100)}%`,true);};
      const blob=f==='gif'?await makeGIF(prog):f==='png'?await makePNG():await makeMP4(prog);
      await saveFile(fileName(f),blob);lastSize[f]=blob.size;toast(`Saved ${fileName(f)} – ${mb(blob.size)}`);exportInfo();console.log(`segue: ${f} in ${((performance.now()-t0)/1000).toFixed(1)} s, ${(blob.size/1e6).toFixed(2)} MB`);}
    catch(e){toast(e.message==='stopped'?'Stopped':`Couldn’t make it – ${e.message||e}`);console.error(e);}
    finally{busy=false;stopFlag=false;xGo.disabled=false;xStop.hidden=true;dirty=true;}};
  cardToSheet(b,'export');}
const lastSize={},mb=b=>b>=1e6?`${(b/1e6).toFixed(1)} MB`:`${Math.max(1,Math.round(b/1e3))} KB`;
/* does anything move? (Slides with no movement and a cut, fade, dip or wipe only change at the transitions) */
function gifMoves(s){return s.layout!=='one'||kbOn(s)||!['cut','fade','dip','wipe','open'].includes(s.oneMove);}
function exportInfo(){if(!xInfo)return;const [W,H]=size(),P=planNow(),f=S.xFormat,l=f==='mp4'?(+S.xLoops||1):1;
  xGo.textContent=f==='png'?'Download PNG':f==='gif'?'Download GIF':'Download MP4';
  xInfo.textContent=(f==='png'?`${W} × ${H}, the frame on the stage now`:f==='gif'?`${Math.round(W*S.xGifScale)} × ${Math.round(H*S.xGifScale)}, ${P.L.toFixed(1)} s at ${S.xGifFps} fps, looping`:`${W} × ${H}, ${(P.L*l).toFixed(1)} s at ${S.fps} fps – H.264, colours as on screen`)+(lastSize[f]?` · last one ${mb(lastSize[f])}`:'');}
/* ---------------- start ---------------- */
{const _r=appRefresh;appRefresh=function(){_r();exportInfo();};}
$('#mediafile').onchange=e=>{const fs=[...e.target.files];e.target.value='';if(fs.length)addFiles(fs);};
$('#bgfile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)setPic('bg',f);};
$('#ovfile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)setPic('ov',f);};
$('#fontfile').onchange=e=>{const fs=[...e.target.files];e.target.value='';if(fs.length)addFiles(fs).then(paintFonts);};
{let depth=0;const drop=$('#drop');
  window.addEventListener('dragenter',e=>{if(!dragId&&e.dataTransfer&&[...e.dataTransfer.types].includes('Files')){depth++;drop.classList.add('on');}});
  window.addEventListener('dragleave',()=>{depth=Math.max(0,depth-1);if(!depth)drop.classList.remove('on');});
  window.addEventListener('dragover',e=>e.preventDefault());
  window.addEventListener('drop',e=>{e.preventDefault();depth=0;drop.classList.remove('on');const fs=[...(e.dataTransfer?e.dataTransfer.files:[])];if(fs.length)addFiles(fs).then(paintFonts);});}
window.segue={E,S,get items(){return items;},fonts:FONTS,pics:PICS,setPic,clearPic,refresh(){saveItems();E.resetMeasure();paintMedia();refreshAll();dirty=true;},addFiles,set,plan:planNow,render,frameAt,makeMP4,makeGIF,makePNG,spsVideoRange,avcCVideoRange,fixSourceRange,applyPreset:n=>{const p=BUILTIN.concat(mine).find(x=>x.name===n);if(p)applyPreset(p);},
  setClock(t){clock=t;dirty=true;},setPlaying,get busy(){return busy;}};
frameStart();paintMedia();paintFonts();paintPresets();refreshAll();fitCanvas();layoutUI();
requestAnimationFrame(()=>{layoutUI();syncRanges(document);fitCanvas();});
loadBuiltinFonts();restoreFonts().then(paintFonts);restoreMedia();restorePics();
requestAnimationFrame(tick);
