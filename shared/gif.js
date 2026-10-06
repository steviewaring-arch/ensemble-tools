// ---- GIF encoder (tested standalone) ----
function ByteBuf(){this.a=new Uint8Array(1<<16);this.n=0;}
ByteBuf.prototype.need=function(k){if(this.n+k>this.a.length){let s=this.a.length*2;while(s<this.n+k)s*=2;const b=new Uint8Array(s);b.set(this.a.subarray(0,this.n));this.a=b;}};
ByteBuf.prototype.b=function(v){this.need(1);this.a[this.n++]=v&255;};
ByteBuf.prototype.w=function(v){this.b(v&255);this.b((v>>8)&255);};
ByteBuf.prototype.s=function(str){for(let i=0;i<str.length;i++)this.b(str.charCodeAt(i));};
ByteBuf.prototype.arr=function(x){this.need(x.length);this.a.set(x,this.n);this.n+=x.length;};
ByteBuf.prototype.out=function(){return this.a.slice(0,this.n);};
const LZW_DICT=new Int16Array(1<<20);
function lzwEncode(buf,idx,minCode){
  buf.b(minCode);
  const clear=1<<minCode,eoi=clear+1;let size=minCode+1,next=eoi+1;
  const dict=LZW_DICT;dict.fill(-1);
  const block=new Uint8Array(255);let bl=0,cur=0,bits=0;
  const flush=()=>{if(bl){buf.b(bl);buf.arr(block.subarray(0,bl));bl=0;}};
  const emit=c=>{cur|=c<<bits;bits+=size;while(bits>=8){block[bl++]=cur&255;cur>>>=8;bits-=8;if(bl===255)flush();}};
  emit(clear);
  let prefix=idx[0];
  for(let i=1;i<idx.length;i++){
    const k=idx[i],key=(prefix<<8)|k,c=dict[key];
    if(c!==-1){prefix=c;continue;}
    emit(prefix);
    if(next<4096){dict[key]=next++;if(next>(1<<size)&&size<12)size++;}
    else{emit(clear);dict.fill(-1);size=minCode+1;next=eoi+1;}
    prefix=k;
  }
  emit(prefix);emit(eoi);
  if(bits>0){block[bl++]=cur&255;if(bl===255)flush();}
  flush();buf.b(0);
}
function medianCut(hist,max){
  const cols=[];for(let i=0;i<32768;i++)if(hist[i])cols.push(i);
  const ch=(c,j)=>j===0?(c>>10)&31:j===1?(c>>5)&31:c&31;
  const to8=v=>(v<<3)|(v>>2);
  let boxes=[cols];
  const info=bx=>{let mn=[31,31,31],mx=[0,0,0],n=0;for(const c of bx){n+=hist[c];for(let j=0;j<3;j++){const v=ch(c,j);if(v<mn[j])mn[j]=v;if(v>mx[j])mx[j]=v;}}const r=[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]];const j=r[0]>=r[1]&&r[0]>=r[2]?0:r[1]>=r[2]?1:2;return{n,range:r[j],j};};
  if(cols.length>max){
    while(boxes.length<max){
      let best=-1,bs=-1,bi=null;
      boxes.forEach((bx,i)=>{if(bx.length<2)return;const f=info(bx);const sc=f.range*Math.sqrt(f.n);if(sc>bs){bs=sc;best=i;bi=f;}});
      if(best<0||bs<=0)break;
      const bx=boxes[best].slice().sort((a,b)=>ch(a,bi.j)-ch(b,bi.j));
      let acc=0,cut=1;for(let i=0;i<bx.length;i++){acc+=hist[bx[i]];if(acc>=bi.n/2){cut=Math.min(Math.max(i+1,1),bx.length-1);break;}}
      boxes.splice(best,1,bx.slice(0,cut),bx.slice(cut));
    }
  }else boxes=cols.map(c=>[c]);
  const pal=new Uint8Array(768);
  boxes.forEach((bx,i)=>{let n=0,r=0,g=0,b=0;for(const c of bx){const w=hist[c];n+=w;r+=to8(ch(c,0))*w;g+=to8(ch(c,1))*w;b+=to8(ch(c,2))*w;}pal[i*3]=Math.round(r/n);pal[i*3+1]=Math.round(g/n);pal[i*3+2]=Math.round(b/n);});
  return {pal,count:Math.max(1,boxes.length)};
}
function makeLut(pal,count){
  const lut=new Int16Array(32768).fill(-1);
  return q=>{let v=lut[q];if(v!==-1)return v;const r=((q>>10)&31)<<3|4,g=((q>>5)&31)<<3|4,b=(q&31)<<3|4;let bd=1e9;for(let i=0;i<count;i++){const dr=pal[i*3]-r,dg=pal[i*3+1]-g,db=pal[i*3+2]-b,d=dr*dr*2+dg*dg*3+db*db;if(d<bd){bd=d;v=i;}}lut[q]=v;return v;};
}
function gifHeader(buf,w,h,pal){
  buf.s('GIF89a');buf.w(w);buf.w(h);buf.b(0xF7);buf.b(0);buf.b(0);buf.arr(pal);
  buf.b(0x21);buf.b(0xFF);buf.b(11);buf.s('NETSCAPE2.0');buf.b(3);buf.b(1);buf.w(0);buf.b(0);
}
function gifFrame(buf,w,h,idx,delay){
  buf.b(0x21);buf.b(0xF9);buf.b(4);buf.b(0x04);buf.w(delay);buf.b(0);buf.b(0);
  buf.b(0x2C);buf.w(0);buf.w(0);buf.w(w);buf.w(h);buf.b(0);
  lzwEncode(buf,idx,8);
}
