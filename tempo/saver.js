/* Every character the time in words can use, so exports bake them all. */
function saverVocab(){return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:’\'\u00b0\u2212-';}
/* Sunrise and sunset for the solar day around ms, worked out here (no
   connection needed): NOAA's solar position, solved for the moment the sun's
   upper edge meets the horizon (-0.833 degrees, refraction included). */
function saverSun(ms,lat,lon){
  const R=Math.PI/180;
  const alt=t=>{const T=(t/864e5+2440587.5-2451545)/36525,L0=(280.46646+T*(36000.76983+T*.0003032))%360,M=(357.52911+T*(35999.05029-.0001537*T))*R,
    ec=.016708634-T*(.000042037+.0000001267*T),C=Math.sin(M)*(1.914602-T*(.004817+.000014*T))+Math.sin(2*M)*(.019993-.000101*T)+Math.sin(3*M)*.000289,
    om=(125.04-1934.136*T)*R,lam=(L0+C-.00569-.00478*Math.sin(om))*R,eps=(23+(26+(21.448-T*(46.815+T*(.00059-T*.001813)))/60)/60+.00256*Math.cos(om))*R,
    dec=Math.asin(Math.sin(eps)*Math.sin(lam)),y=Math.pow(Math.tan(eps/2),2),l=L0*R,
    eqt=4*(y*Math.sin(2*l)-2*ec*Math.sin(M)+4*ec*y*Math.sin(M)*Math.cos(2*l)-.5*y*y*Math.sin(4*l)-1.25*ec*ec*Math.sin(2*M))/R,
    tst=((((t%864e5)+864e5)%864e5)/6e4+eqt+4*lon)%1440,ha=(tst/4-180)*R;
    return Math.asin(Math.sin(lat*R)*Math.sin(dec)+Math.cos(lat*R)*Math.cos(dec)*Math.cos(ha))/R+.833;};
  const noon=Math.floor((ms+lon/15*36e5)/864e5)*864e5+12*36e5-lon/15*36e5;
  const cross=(a,b)=>{let fa=alt(a);if((fa>0)===(alt(b)>0))return null;for(let i=0;i<40;i++){const m=(a+b)/2,fm=alt(m);if((fm>0)===(fa>0)){a=m;fa=fm;}else b=m;}return(a+b)/2;};
  const rise=cross(noon-12*36e5,noon),set=cross(noon,noon+12*36e5);return rise==null||set==null?null:{rise,set};
}
function createSaver(eng,C){
'use strict';
const TAU=Math.PI*2,FADE=650;
const CORNERS=[['left','top'],['right','top'],['right','bottom'],['left','bottom']];
let S=null,phase=0,last=0,sw=-1,swapped=false,pending=null,cur='',prev='',tStart=-1e9,minuteKey='',cseed=1,pal=null,periods=[],changed=new Set(),slot=0;
function rnd(n){let x=Math.imul((n|0)^0x9e3779b9,0x85ebca6b);x^=x>>>13;x=Math.imul(x,0xc2b2ae35);x^=x>>>16;return (x>>>0)/4294967296;}
const pad=n=>String(n).padStart(2,'0');
const localSec=()=>{const d=new Date();return Date.now()/1000-d.getTimezoneOffset()*60;};
const minutesNow=()=>Math.floor(localSec()/60);
/* time string plus how often each character changes (in seconds), so alternates survive a page reload */
function timeParts(d){const c=C.clock;let h=d.getHours(),suf='';if(!c.h24){suf=h<12?'am':'pm';h=h%12||12;}
  const hs=c.zero?pad(h):String(h),per=[];let s='';
  const add=(str,p)=>{for(const ch of str){s+=ch;per.push(p.shift?p.shift():0);}};
  add(hs,hs.length===2?[36000,3600]:[3600]);add(c.sep,[0]);add(pad(d.getMinutes()),[600,60]);
  if(c.secs){add(c.sep,[0]);add(pad(d.getSeconds()),[10,1]);}
  if(!c.h24&&c.ampm)add(suf,[0,0]);
  return{s,per};}
function line2(d){const c=C.clock;let s=c.line2==='weekday'?d.toLocaleDateString('en-GB',{weekday:'long'}):c.line2==='date'?d.getDate()+' '+d.toLocaleDateString('en-GB',{month:'long'}):c.line2==='text'?(c.text||''):'';return c.caps?s.toUpperCase():s;}
function palette(){if(C.colours.cycle&&C.palettes&&C.palettes.length)return C.palettes[new Date().getHours()%C.palettes.length];return{bg:C.colours.bg,p:C.colours.p};}
const isClock=()=>C.show==='clock';
function hooksOn(){
  eng.setHooks({
    pick:(g,o)=>{if(!isClock()||C.clock.alt==='off')return null;if(!/\d/.test(g.ch))return o.def;if(C.clock.alt!=='each'||!o.sel||o.sel.length<2||g.line!==0)return null;
      const p=periods[g.pos];if(!p)return null;let c=Math.floor(localSec()/p);if(g.tag==='from'&&changed.has(g.pos))c--;return o.sel[((c%o.sel.length)+o.sel.length)%o.sel.length];},
    colour:g=>{const P=pal.p,by=C.colours.by;
      if(by==='single')return P[0];
      if(by==='type')return /\d/.test(g.ch)?P[0]:/\p{L}/u.test(g.ch)?P[2]:P[1];
      if(by==='letter')return P[((g.vi+(isClock()?minutesNow():0))%P.length+P.length)%P.length];
      if(by==='random')return P[Math.floor(rnd(g.vi*977+g.line*131+cseed*7919)*P.length)];
      return P[(g.line+g.text)%P.length];},
    alpha:g=>{if(isClock()&&C.clock.pulse&&g.line===0&&g.ch===C.clock.sep){const f=(Date.now()%1000)/1000;return .3+.7*(.5+.5*Math.cos(TAU*f));}return 1;}
  });
}
/* ---------------- the time in words ---------------- */
const isWords=()=>C.show==='words';
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const ORDS={one:'first',two:'second',three:'third',five:'fifth',eight:'eighth',nine:'ninth',twelve:'twelfth'};
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const num=n=>n<20?[ONES[n]]:n%10?[TENS[Math.floor(n/10)],ONES[n%10]]:[TENS[n/10]];
function ordinal(n){const w=num(n),l=w[w.length-1];w[w.length-1]=ORDS[l]||(l.endsWith('y')?l.slice(0,-1)+'ieth':l+'th');return w;}
function yearWords(y){if(y>=2000&&y<2010)return y===2000?['two','thousand']:['two','thousand','and',ONES[y-2000]];
  const lo=y%100;return num(Math.floor(y/100)%100).concat(lo===0?['hundred']:lo<10?['oh',ONES[lo]]:num(lo));}
/* Each word has a key naming its place in the sentence, so a change can tell
   which words stay, which change and which come or go. ORD is reading order. */
const CLOCKK=p=>[p+'x',p+'f',p+'oh',p+'h0',p+'h1',p+'mx',p+'moh',p+'m0',p+'m1'];
const WKEYS=['lead.0','lead.1',...CLOCKK('time.'),'sec.x','sec.and','sec.0','sec.1','sec.u',
  'date.on','date.w','date.the','date.0','date.1','date.of','date.m','date.in','date.y0','date.y1','date.y2','date.y3','date.y4',
  'place.in','place.0','place.1','place.2','place.3','place.4','place.5',
  'sun.the','sun.sun','sun.v1','sun.at1',...CLOCKK('sun.a.'),'sun.and','sun.v2','sun.at2',...CLOCKK('sun.b.'),
  'wx.f','wx.neg','wx.0','wx.1','wx.deg','wx.and','wx.c0','wx.c1','wx.c2','wx.c3'];
const ORD=Object.fromEntries(WKEYS.map((k,i)=>[k,i]));
/* the date and time in a place's own time zone (or this computer's) */
const ZF={},WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function zoned(ms,tz){
  if(tz){try{const f=ZF[tz]||(ZF[tz]=new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'numeric',day:'numeric',weekday:'short',hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'}));
    const p={};for(const x of f.formatToParts(new Date(ms)))p[x.type]=x.value;
    return{y:+p.year,mo:+p.month-1,d:+p.day,wd:WD.indexOf(p.weekday),h:(+p.hour)%24,mi:+p.minute,s:+p.second};}catch(e){}}
  const d=new Date(ms);return{y:d.getFullYear(),mo:d.getMonth(),d:d.getDate(),wd:d.getDay(),h:d.getHours(),mi:d.getMinutes(),s:d.getSeconds()};
}
/* Current weather from Open-Meteo, shared by every saver on the page. Checked every
   20 minutes (2 after a failure); left out once it's more than 3 hours old. */
const WXC=(typeof window!=='undefined'&&(window.__tempoWx||(window.__tempoWx={})))||{};
function weatherNow(o){const p=o.place;if(!o.weather||!p||!isFinite(p.lat)||!isFinite(p.lon))return null;
  const key=p.lat.toFixed(2)+','+p.lon.toFixed(2)+','+o.unit,now=Date.now();let e=WXC[key];if(!e)e=WXC[key]={tried:-1e13};
  if(!e.busy&&now-e.tried>(e.data?20:2)*60000&&typeof fetch==='function'){e.busy=1;e.tried=now;
    fetch('https://api.open-meteo.com/v1/forecast?latitude='+p.lat.toFixed(3)+'&longitude='+p.lon.toFixed(3)+'&current=temperature_2m,weather_code,is_day'+(o.unit==='F'?'&temperature_unit=fahrenheit':''))
      .then(r=>r.ok?r.json():null).then(j=>{const c=j&&j.current;if(c&&isFinite(c.temperature_2m))e.data={t:c.temperature_2m,code:c.weather_code,day:c.is_day,at:Date.now()};})
      .catch(()=>{}).then(()=>{e.busy=0;});}
  return e.data&&Date.now()-e.data.at<3*36e5?e.data:null;}
/* WMO weather codes, as something that reads after "eleven degrees and" */
function sky(code,day){const c=code|0;
  return c===0?(day?'sunshine':'clear skies'):c===1?(day?'sunny spells':'mostly clear skies'):c===2?'some cloud':c===3?'grey skies':c===45||c===48?'fog':
    c===51||c===53?'drizzle':c===55?'heavy drizzle':c===56||c===57?'freezing drizzle':c===61?'light rain':c===63?'rain':c===65?'heavy rain':c===66||c===67?'freezing rain':
    c===71?'light snow':c===73||c===77?'snow':c===75?'heavy snow':c===80?'light showers':c===81?'showers':c===82?'heavy showers':c===85||c===86?'snow showers':
    c===95?'thunder':c===96||c===99?'thunder and hail':'';}
function clockWords(add,p,H,M,o){
  if(o.num==='figures'){add(p+'f',(o.h24?pad(H):String(H%12||12))+(o.sep==='colon'?':':'.')+pad(M)+(o.h24?'':H<12?'am':'pm'));return;}
  if(!o.h24&&M===0&&H%12===0){add(p+'x',H?'midday':'midnight');return;}
  const h=o.h24?H:H%12||12;
  if(o.h24&&h<10){if(h)add(p+'oh','oh');add(p+'h0',ONES[h]);}else num(h).forEach((w,i)=>add(p+'h'+i,w));
  if(M===0)add(p+'mx',o.h24?'hundred':'o’clock');
  else{if(M<10)add(p+'moh','oh');num(M).forEach((w,i)=>add(p+'m'+i,w));}
}
const sfx=n=>n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th';
/* Up to three short sentences: the time, date and place; the sun; the weather.
   Every part can be switched on or off and the grammar closes up around it. */
function sentence(now,o){
  const S1=[],S2=[],S3=[];let cur=S1;
  const add=(k,w,proper)=>cur.push({k,w,part:k.split('.')[0],proper:proper||false});
  const pl=o.place&&isFinite(o.place.lat)?o.place:null,figs=o.num==='figures';
  const t=Math.floor(now/1000)*1000,z=zoned(t,o.inPlace&&pl?pl.tz:null);
  const hasDate=o.weekday||o.daynum||o.month||o.year;
  if(o.lead&&(o.time||hasDate)){add('lead.0','it');add('lead.1','is');}
  if(o.time){clockWords(add,'time.',z.h,z.mi,o);
    if(o.secs){if(z.s===0)add('sec.x','exactly');
      else{add('sec.and','and');if(figs)add('sec.0',String(z.s));else num(z.s).forEach((w,i)=>add('sec.'+i,w));add('sec.u',z.s===1?'second':'seconds');}}}
  if(hasDate){const prep=o.time;
    if(o.weekday||o.daynum){if(prep)add('date.on','on');if(o.weekday)add('date.w',DAYS[z.wd],true);
      if(o.daynum){if(figs&&o.month)add('date.0',String(z.d));else{add('date.the','the');if(figs)add('date.0',z.d+sfx(z.d));else ordinal(z.d).forEach((w,i)=>add('date.'+i,w));}}}
    if(o.month){if(o.daynum){if(!figs)add('date.of','of');}else if(prep||o.weekday)add('date.of','in');add('date.m',MONTHS[z.mo],true);}
    if(o.year){if(!o.month&&(prep||o.weekday||o.daynum))add('date.in','in');(figs?[String(z.y)]:yearWords(z.y)).forEach((w,i)=>add('date.y'+i,w));}}
  if(o.inPlace&&pl&&pl.name.trim()){if(S1.length)add('place.in','in');
    const ws=pl.name.trim().split(/\s+/);if(ws.length>6)ws.splice(5,ws.length,ws.slice(5).join(' '));ws.forEach((w,i)=>add('place.'+i,w,'keep'));}
  if(o.sun&&pl){cur=S2;
    const tz=pl.tz||null,mid=t-(z.h*3600+z.mi*60+z.s)*1000,today=saverSun(mid+12*36e5,pl.lat,pl.lon);
    if(today){const at=(p,ms)=>{const q=zoned(Math.round(ms/6e4)*6e4,tz);clockWords(add,p,q.h,q.mi,o);};
      add('sun.the','the');add('sun.sun','sun');
      if(t<today.rise){add('sun.v1','rises');add('sun.at1','at');at('sun.a.',today.rise);add('sun.and','and');add('sun.v2','sets');add('sun.at2','at');at('sun.b.',today.set);}
      else if(t<today.set){add('sun.v1','rose');add('sun.at1','at');at('sun.a.',today.rise);add('sun.and','and');add('sun.v2','sets');add('sun.at2','at');at('sun.b.',today.set);}
      else{const next=saverSun(mid+36*36e5,pl.lat,pl.lon);add('sun.v1','set');add('sun.at1','at');at('sun.a.',today.set);
        if(next){add('sun.and','and');add('sun.v2','rises');add('sun.at2','at');at('sun.b.',next.rise);}}}}
  const wx=weatherNow(o);
  if(wx){cur=S3;const T=Math.round(wx.t),A=Math.abs(T),words=sky(wx.code,wx.day);
    if(figs||A>99)add('wx.f',(T<0?'−':'')+A+'°'+(o.unit==='F'?'F':'C'),'raw');
    else{if(T<0)add('wx.neg','minus');num(A).forEach((w,i)=>add('wx.'+i,w));add('wx.deg',A===1?'degree':'degrees');}
    if(words){add('wx.and','and');words.split(' ').forEach((w,i)=>add('wx.c'+i,w));}}
  const parts=[S1,S2,S3].filter(x=>x.length),out=[];
  parts.forEach((P,si)=>{P.forEach((tk,i)=>{
      tk.w=tk.proper==='raw'?tk.w:o.case==='upper'?tk.w.toUpperCase():o.case==='lower'?tk.w.toLowerCase():(tk.proper===true||i===0)?tk.w[0].toUpperCase()+tk.w.slice(1):tk.w;out.push(tk);});
    if(si<parts.length-1||o.stop)P[P.length-1].w+='.';});
  return out;
}
let wBuilt=0,wMemo=['',[]],wErr=0,wCur=null,wPrev=null,wSig=null,wT0=-1e9,wLatest=new Set(),wPrevLatest=new Set(),wCache=new Map(),wPal=null;
const wPalette=()=>{const o=C.words;if(o.rotate&&o.themes&&o.themes.length)return o.themes[new Date().getHours()%o.themes.length];const c=o.cols||{};return{bg:o.bg,ink:o.ink,soft:o.soft,date:c.date,sun:c.sun,wx:c.wx};};
function hiFaceOf(){const id=C.words.hiFace;if(!id||id==='same')return null;
  if(eng.faceList().some(x=>x.id===id))return eng.F(id);if(!eng.anyLoaded()&&(id==='d1'||id==='d2'))return eng.F(id);return null;}
const glyphOf=(f,ch)=>{let g=f.base(ch);if(!g&&ch==='’')g=f.base("'");if(!g&&ch==='−')g=f.base('-');return g;};
/* what colour a word takes: hi (the highlight), rest, or its part's own colour */
const PARTCOL={time:'hi',date:'date',place:'date',sun:'sun',wx:'wx'};
function roleOf(t,latest){const h=C.words.hi;
  return h==='time'?(t.part==='time'?'hi':'rest'):h==='latest'?(latest.has(t.k)?'hi':'rest'):h==='parts'?(PARTCOL[t.part]||'rest'):'rest';}
const isHi=(t,latest)=>roleOf(t,latest)==='hi';
/* Lay the words out like a paragraph: flush left by default, ragged right, broken to the measure. */
function wLayout(toks,latest,W,H){
  const o=C.words,f=eng.F(eng.baseSlot()),hf=hiFaceOf()||f;
  const key=W+'x'+H+'|'+toks.map(t=>t.k+'='+t.w+'*'+roleOf(t,latest)).join('|');let L=wCache.get(key);if(L)return L;
  const size=o.size/100*W,m=o.margin/100*Math.min(W,H),availW=Math.max(1,(W-2*m)*o.measure/100),trk=o.tracking/1000*size;
  let top=0,bot=0;
  const shape=(face,str)=>{const k=size/face.upm,gl=[];let x=0,prev=null,wb=0;
    for(const ch of Array.from(str)){const id=glyphOf(face,ch);if(prev!==null)x+=face.kern(prev,id)*k+trk;gl.push({id,x,ch,w:face.adv(id)*k});x+=face.adv(id)*k;prev=id;
      const b=face.bbox&&face.bbox(id);if(b){top=Math.max(top,b[0]*k);bot=Math.max(bot,b[1]*k);wb=Math.max(wb,b[1]*k);}}
    return{gl,w:x,bot:wb};};
  const sp=f.adv(glyphOf(f,' '))*size/f.upm+trk;
  const words=toks.map(t=>{const role=roleOf(t,latest),face=role==='hi'?hf:f,s=shape(face,t.w);return{t,hl:role,face,gl:s.gl,w:s.w,bot:s.bot};});
  const lines=[];let ln=null;
  for(const w of words){if(!ln||(ln.items.length&&ln.w+sp+w.w>availW+.5)){ln={items:[],w:0};lines.push(ln);}ln.w+=(ln.items.length?sp:0)+w.w;ln.items.push(w);}
  const capPx=f.cap/f.upm*size,lead=o.leading*size,n=Math.max(1,lines.length),blockH=capPx+(n-1)*lead;
  const y0=o.valign==='top'?m:o.valign==='bottom'?H-m-blockH:(H-blockH)/2;
  const map=new Map();
  lines.forEach((l,li)=>{let x=o.align==='left'?m:o.align==='right'?W-m-l.w:(W-l.w)/2;const y=y0+capPx+li*lead;
    for(const w of l.items){Object.assign(w,{x,y,li});map.set(w.t.k,w);x+=w.w+sp;}});
  if(!top){top=capPx;bot=.22*size;}
  L={map,words,size,pad:.04*size,top,bot,lead};
  if(wCache.size>40)wCache.clear();wCache.set(key,L);return L;
}
function hex(c){const m=/^#?([0-9a-f]{6})$/i.exec(c||'');const v=m?parseInt(m[1],16):0;return[v>>16&255,v>>8&255,v&255];}
function mix(a,b,t){if(t<=0||a===b)return a;if(t>=1)return b;const A=hex(a),B=hex(b);return'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')';}
function colOf(r){return r==='hi'||C.words.hi==='none'?wPal.ink:r==='rest'?wPal.soft:(wPal[r]||wPal.soft);}
function wGlyphs(ctx,K,w,x,y,col,alpha,dy,clip,from,to){
  if(alpha<=.002)return;
  ctx.save();ctx.globalAlpha=Math.min(1,alpha);ctx.fillStyle=col;
  if(clip){ctx.setTransform(K);ctx.beginPath();ctx.rect(clip[0],clip[1],clip[2],clip[3]);ctx.clip();}
  const k=w.size/w.face.upm,a=from||0,b=to==null?w.gl.length:to;
  for(let i=a;i<b;i++){const g=w.gl[i];ctx.setTransform(K.multiply(new DOMMatrix([k,0,0,k,x+g.x,y+dy])));w.face.draw(ctx,g.id,false);}
  ctx.restore();
}
const wEase=t=>{const f=C.words.feel;return f==='smooth'?eng.E.inOut(t):f==='elastic'?eng.E.backOut(t,1.5):eng.E.expoInOut(t);};
/* Type: like someone retyping. Each run of changed words is backspaced from its
   end (only back to what a word shares with its new self), then the new words
   are typed. Runs go in reading order, at an even pace per character. */
function typed(t){
  const A=new Map(wPrev.map(x=>[x.k,x])),B=new Map(wCur.map(x=>[x.k,x]));
  const keys=[...new Set([...wPrev.map(x=>x.k),...wCur.map(x=>x.k)])].sort((a,b)=>ORD[a]-ORD[b]);
  const info=new Map(),steps=[];let run=[];
  const flush=()=>{for(let i=run.length-1;i>=0;i--){const q=info.get(run[i]);for(let j=0;j<q.D;j++)steps.push([run[i],'d']);}
    for(const k of run){const q=info.get(k);for(let j=0;j<q.T;j++)steps.push([k,'t']);}run=[];};
  for(const k of keys){const a=A.get(k),b=B.get(k);
    if(a&&b&&a.w===b.w){flush();continue;}
    const ac=Array.from(a?a.w:''),bc=Array.from(b?b.w:'');let c=0;if(a&&b)while(c<ac.length&&c<bc.length&&ac[c]===bc[c])c++;
    info.set(k,{ac,bc,c,D:ac.length-c,T:bc.length-c,d:0,t:0});run.push(k);}
  flush();
  const done=Math.floor(eng.clamp(t)*steps.length+1e-6);for(let i=0;i<done;i++)info.get(steps[i][0])[steps[i][1]]++;
  const out=[];
  for(const k of keys){const a=A.get(k),b=B.get(k),q=info.get(k);
    if(!q){out.push({tok:b,hl:isHi(b,wLatest)});continue;}
    const str=q.t?q.bc.slice(0,q.c+q.t).join(''):q.ac.slice(0,q.ac.length-q.d).join('');
    if(str)out.push({tok:Object.assign({},b||a,{w:str}),hl:b&&(q.t||!a)?isHi(b,wLatest):isHi(a||b,wPrevLatest)});}
  return out;
}
function wordsFrame(ctx,W,H,now,K){
  const o=C.words,ms=Date.now(),wx=weatherNow(o),mk=Math.floor(ms/1000)+'|'+(wx?wx.at:0)+'|'+wBuilt;
  if(mk!==wMemo[0])wMemo=[mk,sentence(ms,o)];
  const toks=wMemo[1],sig=toks.map(t=>t.k+'='+t.w).join('|');
  if(sig!==wSig){
    if(wCur){const prev=new Map(wCur.map(t=>[t.k,t.w]));wPrev=wCur;wT0=now;wPrevLatest=wLatest;
      wLatest=new Set(toks.filter(t=>prev.get(t.k)!==t.w).map(t=>t.k));}
    else wLatest=new Set(toks.filter(t=>t.part==='time').map(t=>t.k));
    wCur=toks;wSig=sig;}
  wPal=wPalette();S.bg=wPal.bg;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle=wPal.bg;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
  if(!wCur)return;
  const style=o.change,t=(now-wT0)/(Math.max(.05,o.len)*1000);
  if(!wPrev||t>=1||style==='cut'){const B=wLayout(wCur,wLatest,W,H);for(const w of B.words)wGlyphs(ctx,K,Object.assign(w,{size:B.size}),w.x,w.y,colOf(w.hl),1,0);return;}
  if(style==='type'){const it=typed(t);const B=wLayout(it.map(x=>x.tok),new Set(it.filter(x=>x.hl).map(x=>x.tok.k)),W,H);
    for(const w of B.words)wGlyphs(ctx,K,Object.assign(w,{size:B.size}),w.x,w.y,colOf(w.hl),1,0);return;}
  const A=wLayout(wPrev,wPrevLatest,W,H),B=wLayout(wCur,wLatest,W,H),ef=eng.E.inOut,roll=style==='roll',tc=eng.clamp(t),e=roll?wEase(tc):ef(tc);
  A.words.forEach(w=>w.size=A.size);B.words.forEach(w=>w.size=B.size);
  /* A word that keeps its line and only shifts a little glides there. Anything
     else that changed or moved leaves from where it was and arrives where it
     lands, like a departure board, so reflowed lines never smear across each other. */
  const reach=o.glide?2*B.size:.5,near=(a,b)=>a.face===b.face&&a.li===b.li&&Math.abs(a.y-b.y)<.5&&Math.abs(a.x-b.x)<=reach;
  const pieces=[],still=[];
  const keys=[...new Set([...A.map.keys(),...B.map.keys()])].sort((p,q)=>ORD[p]-ORD[q]);
  for(const k of keys){const a=A.map.get(k),b=B.map.get(k);
    if(a&&b&&near(a,b)){
      if(a.t.w===b.t.w){still.push([a,b,null]);continue;}
      if(o.by==='letter'&&a.gl.length===b.gl.length){
        for(let i=0;i<b.gl.length;i++){if(a.gl[i].ch===b.gl[i].ch)still.push([a,b,i]);else{pieces.push({w:a,L:A,gi:i,out:1});pieces.push({w:b,L:B,gi:i,out:0});}}
        continue;}
    }
    if(a)pieces.push({w:a,L:A,gi:null,out:1});
    if(b)pieces.push({w:b,L:B,gi:null,out:0});
  }
  /* stagger as a wave down the page, left to right within a line */
  const at=p=>p.w.x+(p.gi==null?0:p.w.gl[p.gi].x);
  const order=[...new Set(pieces.map(p=>Math.round(p.w.y)+'|'+Math.round(at(p))))].sort((p,q)=>{const [y1,x1]=p.split('|').map(Number),[y2,x2]=q.split('|').map(Number);return y1-y2||x1-x2;});
  const n=order.length,st=n>1?.3:0;
  for(const p of pieces){const r=n>1?order.indexOf(Math.round(p.w.y)+'|'+Math.round(at(p)))/(n-1):0,v=eng.clamp((tc-st*r)/Math.max(.001,1-st));
    const w=p.w,L=p.L,g=p.gi==null?null:w.gl[p.gi],col=colOf(w.hl),end=p.gi==null?null:p.gi+1;
    /* the window runs from this line's cap height down to its descenders, but stops where the next line's window starts */
    if(roll){const ev=wEase(v),bot=Math.min(Math.max(0,w.bot)+L.pad,Math.max(L.pad,L.lead-L.top-L.pad)),bx=[w.x+(g?g.x:0)-L.pad,w.y-L.top-L.pad,(g?g.w:w.w)+2*L.pad,L.top+L.pad+bot];
      wGlyphs(ctx,K,w,w.x,w.y,col,1,(p.out?-ev:1-ev)*bx[3],bx,p.gi,end);}
    else wGlyphs(ctx,K,w,w.x,w.y,col,p.out?1-ef(eng.clamp(v*2)):ef(eng.clamp(v*2-1)),0,null,p.gi,end);
  }
  for(const [a,b,gi] of still){const end=gi==null?null:gi+1,ag=gi==null?0:a.gl[gi].x,bg=gi==null?0:b.gl[gi].x;
    const x=a.x+ag+(b.x+bg-a.x-ag)*e-bg,y=a.y+(b.y-a.y)*e;
    wGlyphs(ctx,K,b,x,y,mix(colOf(a.hl),colOf(b.hl),e),1,0,null,gi,end);}
}
/* Preview only: replay the last change, or the one a minute (or second) ago */
function replay(){if(!isWords())return;const o=C.words;wCur=sentence(Date.now()-(o.time&&o.secs?1000:60000),o);wSig=wCur.map(t=>t.k+'='+t.w).join('|');wPrev=null;}

const slotNow=()=>Math.floor(Date.now()/(Math.max(.5,C.every)*60000));
function lookIndex(sl){const n=C.looks.length,o=C.looks.map((_,i)=>i);
  if(C.shuffle){const cyc=Math.floor(sl/n);for(let i=n-1;i>0;i--){const j=Math.floor(rnd(cyc*131+i)*(i+1));[o[i],o[j]]=[o[j],o[i]];}}
  return o[((sl%n)+n)%n];}
function build(){
  wCache.clear();wBuilt++;
  if(isWords()){S=JSON.parse(JSON.stringify(C.base||{}));S.transparent=false;eng.use(S);eng.setHooks(null);eng.setLive(null);return;}
  if(isClock()){
    const c=C.clock;S=JSON.parse(JSON.stringify(C.base||{}));
    Object.assign(S,{seq:false,rOn:false,tightMask:true,stretch:false,qClear:c.change!=='roll',fit:'cap',size:c.size,align:c.align,valign:c.valign,margin:c.margin,tabular:c.tabular,transparent:false,
      tracking:c.tracking!=null?c.tracking:S.tracking,leading:c.leading!=null?c.leading:S.leading,
      qStyle:c.change,qEase:c.feel,qStagger:.3,qDir:'up',qAxis:'vertical',texts:[cur||' ']});
    if(c.move){const k=minutesNow()%4;S.align=CORNERS[k][0];S.valign=CORNERS[k][1];}
    if(!c.ambient){S.mode='none';S.vMode='off';S.axOn=false;S.dur=60;}
    if(c.alt==='cycle'){S.vMode='alts';S.vPattern='cycle';S.vOffset=true;S.vStyle='roll';S.vDur=.45;S.vStagger=.2;S.vSteps=Math.max(1,Math.round(c.altRate*(S.dur||60)/60));}
    else if(c.alt==='each')S.vMode='off';
    eng.use(S);hooksOn();
  }else{
    slot=slotNow();const base=C.looks[lookIndex(slot)]||C.looks[0];S=JSON.parse(JSON.stringify(base));S.transparent=false;
    if(C.reseed)S.seed=((base.seed+slot*7919)%99999)+1;
    eng.use(S);eng.setLive(null);if(C.lookColours==='saver')hooksOn();else eng.setHooks(null);phase=0;
  }
}
function setConfig(c){C=c;build();}
function frame(ctx,W,H,now,dt){
  if(isWords()){
    const T=Date.now()/1000,a=C.drift||0,k=ctx.canvas.width/W,K=new DOMMatrix([k,0,0,k,0,0]);
    if(a>0){const sc=1-a*.04+a*.04*Math.sin(T/41);K.multiplySelf(new DOMMatrix().translateSelf(W/2+a*.05*W*Math.sin(T/23.7),H/2+a*.05*H*Math.sin(T/31.3+1)).scaleSelf(sc,sc).translateSelf(-W/2,-H/2));}
    try{wordsFrame(ctx,W,H,now,K);}catch(e){if(!wErr){wErr=1;console.error(e);}}
    return;
  }
  pal=palette();
  if(isClock()){
    const d=new Date(),tp=timeParts(d),l2=line2(d),str=tp.s+(l2?'\n'+l2:'');
    if(str!==cur){
      if(cur){prev=cur;tStart=now;const a=cur.split('\n')[0],b=tp.s;changed=new Set();if(a.length===b.length){for(let i=0;i<b.length;i++)if(a[i]!==b[i])changed.add(i);}else for(let i=0;i<b.length;i++)changed.add(i);}
      cur=str;periods=tp.per;cseed++;
      const mk=d.getHours()+':'+d.getMinutes();if(mk!==minuteKey){if(minuteKey&&C.clock.move&&sw<0){sw=0;pending='move';}minuteKey=mk;}}
    S.texts[0]=cur;S.bg=pal.bg;S.ink=pal.p[0];
    const t=(now-tStart)/(Math.max(.05,C.clock.len)*1000);
    eng.setLive(t<1&&C.clock.change!=='none'?{from:prev,to:cur,t}:null);
  }else{
    if((C.looks.length>1||C.reseed)&&sw<0&&slotNow()!==slot){sw=0;pending='look';}
    if(C.lookColours==='saver'){S.bg=pal.bg;S.ink=pal.p[0];}
  }
  phase=(phase+dt/1000/(Math.max(.1,S.dur||3)/(C.speed||1)))%1;
  let veil=0;
  if(sw>=0){sw+=dt;if(sw>=FADE&&!swapped){swapped=true;build();}
    veil=sw<FADE?sw/FADE:Math.max(0,1-(sw-FADE)/FADE);if(sw>=2*FADE){sw=-1;swapped=false;pending=null;}}
  const T=Date.now()/1000,a=C.drift||0;let pre=null;
  if(a>0){const sc=1-a*.04+a*.04*Math.sin(T/41);pre=new DOMMatrix().translateSelf(W/2+a*.05*W*Math.sin(T/23.7),H/2+a*.05*H*Math.sin(T/31.3+1)).scaleSelf(sc,sc).translateSelf(-W/2,-H/2);}
  try{eng.renderFrame(ctx,W,H,phase,ctx.canvas.width/W,true,pre);}catch(e){}
  if(veil>0){ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=veil;ctx.fillStyle=S.bg;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.globalAlpha=1;}
}
setConfig(C);
return{frame,setConfig,bg:()=>S&&S.bg,replay,words:()=>(wCur||[]).map(t=>t.w).join(' ')};
}