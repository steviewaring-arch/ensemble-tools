/* Tempo – clock screen saver. App code; see shared/core.js for how the parts fit.
   Tempo reads Rubato's settings, saved looks and fonts (same site, same browser)
   and keeps its own screen saver settings under 'tempo:' keys. */

/* ---------------- settings ---------------- */
let ssDirty=true;/* the preview needs the new settings */
/* Tempo owns the screen saver settings (ss…) and its own choice of default
   style. Everything else – texts, glyph picks, motion – comes from Rubato. */
function tempoKeys(){return Object.keys(D).filter(k=>/^ss[A-Z0-9]/.test(k)||k==='baseSlot');}
/* Settings only Tempo has (the time in words). They join the shared defaults
   here rather than in shared/core.js, so Rubato is untouched. */
function wordsDefaults(){return{ssWLead:true,ssWH24:false,ssWTime:true,ssWSecs:true,ssWWeekday:true,ssWDayNum:true,ssWMonth:true,ssWYear:true,
  ssWPlace:false,ssWSun:false,ssWWeather:false,ssWStop:false,ssWUnit:'C',
  ssWPlaceName:'Manchester',ssWLat:53.4808,ssWLon:-2.2426,ssWTz:'Europe/London',
  ssWCase:'sentence',ssWNum:'words',ssWSep:'stop',ssWHi:'time',ssWHiFace:'same',
  ssWSize:5,ssWLeading:1,ssWTracking:-20,ssWMeasure:100,ssWAlign:'left',ssWVAlign:'top',ssWMargin:2.5,
  ssWChange:'roll',ssWBy:'word',ssWFeel:'smooth',ssWLen:.6,ssWGlide:true,
  ssWBg:'#FFFFFF',ssWInk:'#181818',ssWSoft:'#FDA072',ssWDateCol:'#F7C6AA',ssWSunCol:'#FF6A1F',ssWWxCol:'#8FAFC4',ssWRotate:false};}
function loadSettings(){
  Object.assign(D,wordsDefaults());
  const s=Object.assign(fresh(),sanitise(RLS.get('settings')||{}));
  const own=sanitise(LS.get('settings')||{});for(const k of tempoKeys())if(k in own)s[k]=own[k];
  s.tab='saver';return s;
}
function saveSettings(){const o={};for(const k of tempoKeys())o[k]=S[k];LS.set('settings',o);}
function onSettingsChange(){ssDirty=true;}
function schedulePicker(){}
function refreshImageCard(){}
function refreshNotes(){$('#note').textContent=anyLoaded()?'':'Demo face. Load your font in the Font panel.';}

/* ---------------- tooltips ---------------- */
Object.assign(TIPS,{
  ssShow:'Show the local time, the time written out in words, or rotate through looks you’ve saved in Rubato.',ssH24:'24-hour or 12-hour time.',ssSep:'What sits between hours and minutes.',
  ssSecs:'Adds seconds, so something changes every second.',ssZero:'Shows 09,05 rather than 9,05.',ssPulse:'The separator gently pulses once a second.',
  ssLine2:'An optional second line: the weekday, the date, or the first line of your Rubato text.',ssCaps:'Sets the second line in capitals.',
  ssTracking:'Space between letters in the clock.',ssLeading:'Distance between the time and the second line.',
  ssAlt:'New one each change: each digit steps to its next alternate whenever it changes. Keep cycling: the alternates roll continuously.',
  ssAltRate:'How often the alternates change.',ssTabular:'Every digit gets the same width, so the time doesn’t shuffle sideways. Turn off for the font’s own spacing.',
  ssChange:'How a digit changes. Roll works like an odometer.',ssFeel:'Snappy is fast with a crisp stop. Smooth eases. Elastic overshoots.',ssLen:'How long each change takes.',
  ssAmbient:'Brings in Rubato’s Motion and Variants settings between changes.',
  ssMove:'Fades to the next corner each minute, which also protects screens.',ssSize:'The largest the clock can be, as a share of the screen width.',ssMargin:'Space kept clear around the edge.',
  ssColBy:'How colours are shared out across the characters.',ssRotate:'Changes theme on the hour.',
  ssEvery:'How long each look stays before the next.',ssShuffle:'Plays looks in a random order.',ssReseed:'Gives random settings a fresh variation each time a look comes round.',
  ssLookCol:'Use each look’s own colours, or the Colour settings below for all of them.',ssSpeed:'Speeds up or slows down the motion.',
  ssDrift:'Slowly moves the whole composition so nothing sits still on screen for hours.',ssImage:'Includes the Rubato image in the screensaver.',
  ssWH24:'Eleven forty seven, or twenty three forty seven. Sunrise and sunset follow it too.',ssWUnit:'Celsius or Fahrenheit.',
  ssWCase:'Sentence case capitalises the first word, the day and the month.',ssWNum:'Write numbers out in words, or set them as figures.',
  ssWSep:'What sits between hours and minutes when they’re figures.',ssWHi:'Which words stand out. Latest change follows whatever changed last. Each part gives the time, the date and place, the sun and the weather their own colours.',
  ssWHiFace:'Sets the highlighted words in another of your loaded styles, such as a bold.',
  ssWSize:'Type size, as a share of the screen width.',ssWLeading:'Distance between lines, as a multiple of the type size.',ssWTracking:'Space between letters.',
  ssWMeasure:'How far across the screen a line can run before it breaks.',ssWMargin:'Space kept clear around the edge.',
  ssWChange:'How a word changes. Type backspaces and retypes only the letters that differ.',ssWBy:'Change whole words, or only the letters that differ when a word keeps its length.',
  ssWFeel:'Snappy is fast with a crisp stop. Smooth eases. Elastic overshoots.',ssWLen:'How long each change takes.',
  ssWGlide:'Words that stay slide to their new place as the line reflows. Off: they jump.',ssWRotate:'Changes theme on the hour.',
});

/* ================= Screensaver ================= */
const getPresets=()=>RLS.get('presets')||[];
const getThemes=()=>LS.get('themes')||[];
const ssPicked=new Set(LS.get('ssPicked')||['__current']);
const SEPS={comma:',',colon:':',stop:'.',space:' '};
const PALETTES=[
  {name:'Ultraviolet',bg:'#5B23F0',p:['#FFF35C','#5DE0C0','#FFFFFF','#FF8FD0']},
  {name:'Night',bg:'#000000',p:['#FFFFFF','#8C8C8C','#FFFFFF','#4D4D4D']},
  {name:'Paper',bg:'#F2F2F2',p:['#000000','#FF3B1F','#000000','#8C8C8C']},
  {name:'Signal',bg:'#FF4F1F',p:['#000000','#FFFFFF','#FFF35C','#000000']},
];
const SHAPES={laptop:[1680,1050],display:[1920,1080],portrait:[1080,1920]};
const clk=s=>s.ssShow==='clock',lk=s=>s.ssShow==='looks',wd=s=>s.ssShow==='words';
/* Show */
{const b=card('ss-show','Screensaver',null,'saver');
  build(b,[{t:'seg',k:'ssShow',label:'Show',opts:[['clock','The time'],['words','In words'],['looks','Saved looks']]}]);
  const list=el('div','ctl btn-row');addCustom(b,lk,list);
  const ssNote=el('p','hint');addCustom(b,lk,ssNote);
  window.ssRefresh=()=>{list.textContent='';const ps=getPresets();
    for(const n of [...ssPicked])if(n!=='__current'&&!ps.some(p=>p.name===n))ssPicked.delete(n);
    if(!ssPicked.size)ssPicked.add('__current');
    [['__current','Current Rubato settings']].concat(ps.map(p=>[p.name,p.name])).forEach(([k,t])=>{const p=el('button','pill small',t);p.setAttribute('aria-pressed',ssPicked.has(k));
      p.onclick=()=>{if(ssPicked.has(k)){if(ssPicked.size===1){toast('Keep at least one look.');return;}ssPicked.delete(k);}else ssPicked.add(k);LS.set('ssPicked',[...ssPicked]);ssDirty=true;ssRefresh();refreshVis();};list.append(p);});
    ssNote.textContent=ps.length?'Looks play in turn, fading through the background.':'Save looks under Presets in Rubato to rotate between them.';ssDirty=true;
  };
  build(b,[
    {t:'range',k:'ssEvery',label:'Change every',min:.5,max:30,step:.5,fmt:v=>(v<1?Math.round(v*60)+' s':roundTo(v,.5)+' min'),show:lk},
    {t:'toggle',k:'ssShuffle',label:'Shuffle the order',show:s=>lk(s)&&ssPicked.size>1},
    {t:'toggle',k:'ssReseed',label:'New variation each time',show:lk},
    {t:'seg',k:'ssLookCol',label:'Colours',opts:[['own','Each look\u2019s own'],['saver','From Colour below']],show:lk},
    {t:'range',k:'ssSpeed',label:'Motion speed',min:.25,max:2,step:.05,fmt:v=>v.toFixed(2)+'\u00d7',show:lk},
    {t:'toggle',k:'ssImage',label:'Include the image',show:s=>!!img&&!wd(s)},
  ]);
}
/* In words: what the sentence says */
{const b=card('ss-wsay','Sentence',wd,'saver');
  /* every part of the sentence, in reading order, switched on and off like words in a line */
  const PIECES=[['ssWLead','It is'],['ssWTime','Time'],['ssWSecs','Seconds'],['ssWWeekday','Day'],['ssWDayNum','Date'],['ssWMonth','Month'],['ssWYear','Year'],
    ['ssWPlace','Place'],['ssWSun','Sunrise and sunset'],['ssWWeather','Weather'],['ssWStop','Full stop']];
  addHint(b,'Click the parts to build your sentence.');
  const chips=el('div','ctl btn-row');chips.setAttribute('role','group');chips.setAttribute('aria-label','Sentence parts');addCustom(b,null,chips);
  const cs=PIECES.map(([k,t])=>{const p=el('button','pill small',t);p.onclick=()=>set(k,!S[k]);chips.append(p);return[k,p];});
  controls.push({d:{},w:chips,update(){cs.forEach(([k,p])=>{p.setAttribute('aria-pressed',!!S[k]);p.hidden=k==='ssWSecs'&&!S.ssWTime;});}});
  build(b,[
    {t:'seg',k:'ssWH24',label:'Format',opts:[[false,'12-hour'],[true,'24-hour']],show:s=>s.ssWTime||s.ssWSun},
    {t:'hint',text:'Nothing to show. Switch on at least one part.',show:s=>!(s.ssWTime||s.ssWWeekday||s.ssWDayNum||s.ssWMonth||s.ssWYear||s.ssWPlace||s.ssWSun||s.ssWWeather)},
  ]);
}
/* In words: where. Needed for the place name, the sun and the weather. */
{const needs=s=>wd(s)&&(s.ssWPlace||s.ssWSun||s.ssWWeather);
  const b=card('ss-wplace','Place',needs,'saver');
  const sr=el('div','ctl btn-row'),q=el('input'),go=el('button','pill small','Find');q.type='text';q.placeholder='Town or city';q.setAttribute('aria-label','Search for a town or city');q.style.flex='1';
  sr.append(q,go);b.append(sr);
  const found=el('div','ctl btn-row');b.append(found);
  const nr=el('div','ctl'),nh=el('div','ctl-head'),nl=el('label',null,'Call it'),nm=el('input');nm.type='text';nm.id='c_ssWPlaceName';nl.htmlFor=nm.id;nm.style.width='100%';
  nh.append(nl);nr.append(nh,nm);b.append(nr);
  nm.oninput=()=>set('ssWPlaceName',nm.value,true);
  const info=el('p','hint');b.append(info);
  controls.push({d:{},w:nr,update(){if(document.activeElement!==nm)nm.value=S.ssWPlaceName;
    const ll=(v,p,n)=>Math.abs(v).toFixed(2)+'\u00b0 '+(v<0?n:p);info.textContent=ll(S.ssWLat,'N','S')+', '+ll(S.ssWLon,'E','W')+(S.ssWTz?' \u00b7 '+S.ssWTz.replace(/_/g,' '):'');}});
  const search=async()=>{const t=q.value.trim();if(!t)return;found.textContent='';go.disabled=true;
    try{const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name='+encodeURIComponent(t));const j=await r.json();const rs=(j&&j.results)||[];
      if(!rs.length)found.append(el('p','hint','No places found. Try another spelling, or add the country.'));
      rs.forEach(x=>{const p=el('button','pill small',[x.name,x.admin1,x.country].filter((v,i,a)=>v&&a.indexOf(v)===i).join(', '));
        p.onclick=()=>{S.ssWPlaceName=x.name;S.ssWLat=+x.latitude;S.ssWLon=+x.longitude;S.ssWTz=x.timezone||'';found.textContent='';q.value='';set('ssWTz',S.ssWTz);toast(`Place set to ${x.name}`);};found.append(p);});}
    catch(e){found.append(el('p','hint','Couldn\u2019t reach the place search. Check your connection.'));}
    finally{go.disabled=false;}};
  go.onclick=search;q.onkeydown=e=>{if(e.key==='Enter')search();};
  build(b,[{t:'seg',k:'ssWUnit',label:'Temperature',opts:[['C','Celsius'],['F','Fahrenheit']],show:s=>s.ssWWeather}]);
  addHint(b,'The time and date are given in the place\u2019s own time zone when Place is on. Sunrise and sunset are worked out on the computer. Place search (GeoNames) and weather come from Open-Meteo: the screen saver checks the weather every 20 minutes and leaves it out when it can\u2019t connect.');
}
/* In words: how it's set */
{const b=card('ss-wtype','Type',wd,'saver');
  build(b,[
    {t:'seg',k:'ssWCase',label:'Case',opts:[['sentence','Sentence case'],['lower','lower case'],['upper','CAPITALS']]},
    {t:'seg',k:'ssWNum',label:'Numbers',opts:[['words','Words'],['figures','Figures']]},
    {t:'seg',k:'ssWSep',label:'Separator',opts:[['stop','Full stop'],['colon','Colon']],show:s=>s.ssWNum==='figures'},
    {t:'seg',k:'ssWHi',label:'Highlight',opts:[['time','The time'],['latest','Latest change'],['parts','Each part'],['none','Nothing']]},
    {t:'segdyn',k:'ssWHiFace',label:'Highlight style',show:s=>s.ssWHi!=='none',
      optsFn:()=>[['same','Same style']].concat(anyLoaded()?eng.faceList().map(({id,face})=>[id,face.name]):[['d2','Demo heavy']])},
    {t:'range',k:'ssWSize',label:'Size',min:1.5,max:20,step:.1,fmt:v=>roundTo(v,.1)+'% of width'},
    {t:'range',k:'ssWLeading',label:'Line spacing',min:.75,max:1.8,step:.01,fmt:v=>v.toFixed(2)},
    {t:'range',k:'ssWTracking',label:'Tracking',min:-100,max:200,step:1,fmt:v=>(v>0?'+':'')+Math.round(v)},
    {t:'range',k:'ssWMeasure',label:'Line length',min:30,max:100,step:1,fmt:v=>Math.round(v)+'%'},
  ]);
}
/* In words: how a change moves */
{const b=card('ss-wchange','Change',wd,'saver');
  build(b,[
    {t:'seg',k:'ssWChange',label:'When a word changes',opts:[['roll','Roll'],['fade','Fade'],['type','Type'],['cut','Cut']]},
    {t:'seg',k:'ssWBy',label:'Change',opts:[['word','Whole words'],['letter','Changed letters']],show:s=>s.ssWChange==='roll'||s.ssWChange==='fade'},
    {t:'seg',k:'ssWFeel',label:'Feel',opts:[['snappy','Snappy'],['smooth','Smooth'],['elastic','Elastic']],show:s=>s.ssWChange==='roll'},
    {t:'range',k:'ssWLen',label:'Length',min:.15,max:2,step:.05,fmt:v=>v.toFixed(2)+' s',show:s=>s.ssWChange!=='cut'},
    {t:'toggle',k:'ssWGlide',label:'Glide when words move',show:s=>s.ssWChange==='roll'||s.ssWChange==='fade'},
  ]);
  const r=el('div','ctl btn-row'),play=el('button','pill small','Play a change');r.append(play);addCustom(b,s=>s.ssWChange!=='cut',r);
  play.onclick=()=>{if(saver&&saver.replay)saver.replay();};
}
/* Clock */
{const b=card('ss-clock','Clock',clk,'saver');
  build(b,[
    {t:'seg',k:'ssH24',label:'Format',opts:[[true,'24-hour'],[false,'12-hour']]},
    {t:'seg',k:'ssSep',label:'Separator',opts:[['comma','Comma'],['colon','Colon'],['stop','Full stop'],['space','Space']]},
    {t:'toggle',k:'ssSecs',label:'Seconds'},
    {t:'toggle',k:'ssZero',label:'Leading zero'},
    {t:'toggle',k:'ssPulse',label:'Pulse the separator',show:s=>s.ssSep!=='space'},
    {t:'seg',k:'ssLine2',label:'Second line',opts:[['none','None'],['weekday','Weekday'],['date','Date'],['text','Rubato text']]},
    {t:'toggle',k:'ssCaps',label:'Capitals',show:s=>s.ssLine2!=='none'},
    {t:'range',k:'ssTracking',label:'Tracking',min:-150,max:400,step:5,fmt:v=>(v>0?'+':'')+Math.round(v)},
    {t:'range',k:'ssLeading',label:'Line spacing',min:.6,max:2,step:.01,fmt:v=>v.toFixed(2),show:s=>s.ssLine2!=='none'},
  ]);
}
/* Numerals */
{const b=card('ss-num','Numerals',clk,'saver');
  build(b,[
    {t:'seg',k:'ssAlt',label:'Alternates',opts:[['off','Off'],['each','New one each change'],['cycle','Keep cycling']]},
    {t:'range',k:'ssAltRate',label:'Changes per minute',min:1,max:60,step:1,show:s=>s.ssAlt==='cycle'},
    {t:'hint',text:'Uses the alternates ticked in Rubato › Variants › Glyphs.',show:s=>s.ssAlt!=='off'},
    {t:'toggle',k:'ssTabular',label:'Fixed-width numerals'},
    {t:'hint',text:'Fixed-width numerals give every digit the same width, so only changed digits move. Turn it off to use the font\u2019s own spacing and kerning.'},
  ]);
}
/* Change */
{const b=card('ss-change','Change',clk,'saver');
  build(b,[
    {t:'seg',k:'ssChange',label:'When a digit changes',opts:[['roll','Roll'],['stretch','Stretch'],['fade','Fade'],['cut','Cut']]},
    {t:'seg',k:'ssFeel',label:'Feel',opts:[['snappy','Snappy'],['smooth','Smooth'],['elastic','Elastic']],show:s=>s.ssChange==='roll'||s.ssChange==='stretch'},
    {t:'range',k:'ssLen',label:'Length',min:.15,max:2,step:.05,fmt:v=>v.toFixed(2)+' s',show:s=>s.ssChange!=='cut'},
    {t:'toggle',k:'ssAmbient',label:'Add Rubato motion'},
    {t:'range',k:'ssSpeed',label:'Motion speed',min:.25,max:2,step:.05,fmt:v=>v.toFixed(2)+'\u00d7',show:s=>s.ssAmbient},
  ]);
}
/* Position */
{const b=card('ss-pos','Position',null,'saver');
  build(b,[
    {t:'seg',k:'ssAlign',label:'Align',opts:[['left','Left'],['centre','Centre'],['right','Right']],show:s=>clk(s)&&!s.ssMove},
    {t:'seg',k:'ssVAlign',label:'Vertical',opts:[['top','Top'],['middle','Middle'],['bottom','Bottom']],show:s=>clk(s)&&!s.ssMove},
    {t:'toggle',k:'ssMove',label:'Next corner each minute',show:clk},
    {t:'range',k:'ssSize',label:'Size',min:10,max:100,step:1,fmt:v=>'up to '+Math.round(v)+'%',show:clk},
    {t:'range',k:'ssMargin',label:'Margin',min:0,max:25,step:.5,fmt:v=>roundTo(v,.5)+'%',show:clk},
    {t:'seg',k:'ssWAlign',label:'Align',opts:[['left','Left'],['centre','Centre'],['right','Right']],show:wd},
    {t:'seg',k:'ssWVAlign',label:'Vertical',opts:[['top','Top'],['middle','Middle'],['bottom','Bottom']],show:wd},
    {t:'range',k:'ssWMargin',label:'Margin',min:0,max:15,step:.5,fmt:v=>roundTo(v,.5)+'%',show:wd},
    {t:'range',k:'ssDrift',label:'Drift',min:0,max:1,step:.01,fmt:v=>v===0?'Off':pct(v)},
  ]);
}
/* Colour + themes */
{const colOn=s=>clk(s)||(lk(s)&&s.ssLookCol==='saver');
  const b=card('ss-colour','Colour',colOn,'saver');
  const themeRow=el('div','ctl btn-row');addCustom(b,s=>s.ssRotate==='off',themeRow);
  const lab=i=>s=>s.ssColBy==='type'?['Numerals','Punctuation','Letters','Spare'][i]:s.ssColBy==='single'?'Type':s.ssColBy==='line'?'Line '+(i+1):'Colour '+(i+1);
  const manual=s=>s.ssRotate==='off';
  build(b,[
    {t:'seg',k:'ssColBy',label:'Colour by',opts:[['type','Character type'],['letter','Each letter'],['line','Line'],['random','Random'],['single','One colour']]},
    {t:'colour',k:'ssBg',label:'Background',show:manual},
    {t:'colour',k:'ssP1',labelFn:lab(0),label:'Colour 1',show:manual},
    {t:'colour',k:'ssP2',labelFn:lab(1),label:'Colour 2',show:s=>manual(s)&&s.ssColBy!=='single'},
    {t:'colour',k:'ssP3',labelFn:lab(2),label:'Colour 3',show:s=>manual(s)&&s.ssColBy!=='single'},
    {t:'colour',k:'ssP4',labelFn:lab(3),label:'Colour 4',show:s=>manual(s)&&s.ssColBy!=='single'&&s.ssColBy!=='type'},
  ]);
  const saveRow=el('div','ctl btn-row');const tn=el('input');tn.type='text';tn.placeholder='Name this theme';tn.setAttribute('aria-label','Theme name');tn.style.flex='1';
  const ts=el('button','pill small primary','Save theme');saveRow.append(tn,ts);addCustom(b,manual,saveRow);
  const mine=el('div','preset-list');addCustom(b,null,mine);
  build(b,[{t:'seg',k:'ssRotate',label:'Rotate themes every hour',opts:[['off','Off'],['all','All themes'],['mine','My themes']]}]);
  const apply=T=>{S.ssBg=T.bg;[S.ssP1,S.ssP2,S.ssP3,S.ssP4]=T.p;set('ssRotate','off');};
  const cur=()=>({bg:S.ssBg,p:[S.ssP1,S.ssP2,S.ssP3,S.ssP4]});
  const same=T=>T.bg.toLowerCase()===S.ssBg.toLowerCase()&&T.p.every((c,i)=>c.toLowerCase()===[S.ssP1,S.ssP2,S.ssP3,S.ssP4][i].toLowerCase());
  window.themesRefresh=()=>{themeRow.textContent='';[...PALETTES,...getThemes()].forEach(T=>{const p=el('button','pill small',T.name);p.setAttribute('aria-pressed',same(T));p.onclick=()=>{apply(T);themesRefresh();};themeRow.append(p);});
    mine.textContent='';getThemes().forEach((T,i)=>{const it=el('div','preset-item'),sw=el('span');sw.style.cssText='flex:none;display:inline-flex;gap:3px';
      [T.bg,...T.p].forEach(c=>{const d=el('i');d.style.cssText=`width:12px;height:12px;border-radius:50%;background:${c};box-shadow:0 0 0 1px var(--keyline)`;sw.append(d);});
      const nm=el('span',null,T.name),del=el('button','pill small','Delete');del.onclick=()=>{const q=getThemes();q.splice(i,1);LS.set('themes',q);themesRefresh();ssDirty=true;};it.append(sw,nm,del);mine.append(it);});};
  ts.onclick=()=>{const n=tn.value.trim()||('Theme '+(getThemes().length+1));const q=getThemes().filter(t=>t.name!==n&&!PALETTES.some(P=>P.name===n));q.push(Object.assign({name:n},cur()));LS.set('themes',q);tn.value='';themesRefresh();ssDirty=true;toast(`Saved ${n}`);};
}
/* In words: colour. Curated themes to start; Steve's set will replace them. */
const WORD_THEMES=[
  {name:'Apricot',bg:'#FFFFFF',ink:'#181818',soft:'#FDA072',date:'#F7C6AA',sun:'#FF6A1F',wx:'#8FAFC4'},
  {name:'Red',bg:'#FFFFFF',ink:'#FF3B1F',soft:'#181818',date:'#8C8C8C',sun:'#FF9A8A',wx:'#5A5A5A'},
  {name:'Paper',bg:'#F2F2F2',ink:'#000000',soft:'#B4B4B4',date:'#6E6E6E',sun:'#3A3A3A',wx:'#949494'},
  {name:'Night',bg:'#000000',ink:'#FFFFFF',soft:'#4D4D4D',date:'#8C8C8C',sun:'#FFB347',wx:'#7FA7C9'},
  {name:'Signal',bg:'#FF4F1F',ink:'#000000',soft:'#FFFFFF',date:'#FFD3C4',sun:'#FFF35C',wx:'#7A1A00'},
  {name:'Ultraviolet',bg:'#5B23F0',ink:'#FFF35C',soft:'#A98BFF',date:'#FFFFFF',sun:'#FF8FD0',wx:'#5DE0C0'},
];
const W_COLS=[['ssWBg','bg'],['ssWInk','ink'],['ssWSoft','soft'],['ssWDateCol','date'],['ssWSunCol','sun'],['ssWWxCol','wx']];
{const b=card('ss-wcolour','Colour',wd,'saver');
  const row=el('div','ctl btn-row');addCustom(b,s=>!s.ssWRotate,row);
  const same=T=>W_COLS.every(([k,t])=>String(T[t]).toLowerCase()===String(S[k]).toLowerCase());
  const fixed=s=>!s.ssWRotate;
  build(b,[
    {t:'colour',k:'ssWBg',label:'Background',show:fixed},
    {t:'colour',k:'ssWInk',label:'Highlight',labelFn:s=>s.ssWHi==='time'||s.ssWHi==='parts'?'The time':s.ssWHi==='latest'?'Latest change':'Type',show:fixed},
    {t:'colour',k:'ssWDateCol',label:'Date and place',show:s=>fixed(s)&&s.ssWHi==='parts'},
    {t:'colour',k:'ssWSunCol',label:'Sunrise and sunset',show:s=>fixed(s)&&s.ssWHi==='parts'},
    {t:'colour',k:'ssWWxCol',label:'Weather',show:s=>fixed(s)&&s.ssWHi==='parts'},
    {t:'colour',k:'ssWSoft',label:'Everything else',show:s=>fixed(s)&&s.ssWHi!=='none'},
    {t:'toggle',k:'ssWRotate',label:'Change theme every hour'},
  ]);
  const paint=()=>{row.textContent='';WORD_THEMES.forEach(T=>{const p=el('button','pill small',T.name);p.setAttribute('aria-pressed',same(T));
    p.onclick=()=>{W_COLS.forEach(([k,t])=>{S[k]=T[t];});set('ssWRotate',false);};row.append(p);});};
  controls.push({d:{},w:row,update:paint});
}
/* Export */
{const b=card('ss-export','Export',null,'saver');
  addHint(b,'No font loaded, so exports will use the demo face. Add your font in Fonts first.',()=>!anyLoaded());
  b.append(el('div','sub-head','Mac'));
  const mac=el('button','pill primary','Download for Mac');const r1=el('div','ctl btn-row');r1.append(mac);b.append(r1);
  b.append(el('p','hint','A .saver you install by double-clicking. The first time, macOS blocks it: allow it under System Settings \u203a Privacy & Security \u203a Open Anyway, then install for all users. The read-me in the zip walks through it.'));
  mac.onclick=exportMac;window.macBtn=mac;
  b.append(el('div','sub-head','Windows'));
  const win=el('button','pill primary','Download for Windows');const r3=el('div','ctl btn-row');r3.append(win);b.append(r3);
  b.append(el('p','hint','A .scr you install by right-clicking and choosing Install. It plays full screen through Microsoft Edge, built into Windows 10 and 11.'));
  win.onclick=exportWin;window.winBtn=win;
  b.append(el('div','sub-head','Any computer'));
  const go=el('button','pill','Download HTML file');const r2=el('div','ctl btn-row');r2.append(go);b.append(r2);
  go.onclick=exportScreensaver;
  const how=el('details');const sm=el('summary',null,'Using the HTML file');
  const howText=el('div','hint');
  howText.innerHTML='<p>Open it in any browser and click to go full screen. It also works with WebViewScreenSaver on a Mac and Lively Wallpaper on Windows, if you already use them.</p>';
  how.append(sm,howText);b.append(how);
}
function saverConfig(){
  const ps=getPresets();
  /* the words settings travel in their own block below, not inside each look */
  const noW=o=>{for(const k in o)if(/^ssW/.test(k))delete o[k];return o;};
  const looks=[...ssPicked].map(k=>k==='__current'?S:(ps.find(p=>p.name===k)||{}).settings).filter(Boolean).map(o=>{const l=noW(Object.assign(fresh(),sanitise(o)));l.transparent=false;return l;});
  const base=noW(Object.assign(fresh(),sanitise(S)));base.transparent=false;
  const pals=S.ssRotate==='mine'?getThemes():[...PALETTES,...getThemes()];
  return{show:S.ssShow,
    clock:{h24:S.ssH24,sep:SEPS[S.ssSep]||',',secs:S.ssSecs,zero:S.ssZero,ampm:true,line2:S.ssLine2,caps:S.ssCaps,text:(S.texts[0]||'').split('\n')[0],
      change:S.ssChange,feel:S.ssFeel,len:S.ssLen,align:S.ssAlign,valign:S.ssVAlign,size:S.ssSize,margin:S.ssMargin,tabular:S.ssTabular,tracking:S.ssTracking,leading:S.ssLeading,move:S.ssMove,pulse:S.ssPulse,ambient:S.ssAmbient,alt:S.ssAlt,altRate:S.ssAltRate},
    colours:{by:S.ssColBy,bg:S.ssBg,p:[S.ssP1,S.ssP2,S.ssP3,S.ssP4],cycle:S.ssRotate!=='off'&&pals.length>0},palettes:pals,lookColours:S.ssLookCol,
    looks:looks.length?looks:[base],base,every:S.ssEvery,shuffle:S.ssShuffle,reseed:S.ssReseed,speed:S.ssSpeed,drift:S.ssDrift,
    /* only when showing words, so clock and looks exports stay as they were */
    ...(wd(S)?{words:{lead:S.ssWLead,h24:S.ssWH24,time:S.ssWTime,secs:S.ssWSecs,weekday:S.ssWWeekday,daynum:S.ssWDayNum,month:S.ssWMonth,year:S.ssWYear,
      inPlace:S.ssWPlace,sun:S.ssWSun,weather:S.ssWWeather,unit:S.ssWUnit,stop:S.ssWStop,case:S.ssWCase,num:S.ssWNum,sep:S.ssWSep,
      place:{name:S.ssWPlaceName,lat:S.ssWLat,lon:S.ssWLon,tz:S.ssWTz},cols:{date:S.ssWDateCol,sun:S.ssWSunCol,wx:S.ssWWxCol},
      hi:S.ssWHi,hiFace:S.ssWHiFace,size:S.ssWSize,leading:S.ssWLeading,tracking:S.ssWTracking,measure:S.ssWMeasure,align:S.ssWAlign,valign:S.ssWVAlign,margin:S.ssWMargin,
      change:S.ssWChange,by:S.ssWBy,feel:S.ssWFeel,len:S.ssWLen,glide:S.ssWGlide,bg:S.ssWBg,ink:S.ssWInk,soft:S.ssWSoft,rotate:S.ssWRotate,themes:WORD_THEMES}}:{})};
}

function saverChars(cfg){
  const chars=new Set(' 0123456789,:.apmAPM');
  const add=s=>{for(const ch of Array.from(s||''))if(ch!=='\n'){chars.add(ch);chars.add(ch.toUpperCase());chars.add(ch.toLowerCase());}};
  for(let i=0;i<7;i++)add(new Date(2026,0,5+i).toLocaleDateString('en-GB',{weekday:'long'}));
  for(let m=0;m<12;m++)add(new Date(2026,m,1).toLocaleDateString('en-GB',{month:'long'}));
  add(cfg.clock.text);
  if(cfg.words){add(saverVocab());add(cfg.words.place.name);}
  for(const L of cfg.looks)for(const t of (L.seq?L.texts:[L.texts[0]||'']))add(t);
  return chars;
}
function bakeFonts(chars){
  const out=[];
  for(const {id,face:f,swap} of eng.faceList()){if(!f||f.fallback)continue;
    const d={id,swap,name:f.name,family:f.family,upm:f.upm,asc:f.asc,desc:f.desc,cap:f.cap,wc:f.weightClass,cmap:{},alts:{},glyphs:{},kern:{}};const ids=new Set();
    for(const ch of chars){const g=f.base(ch);if(!g)continue;d.cmap[ch]=g;ids.add(g);const al=f.alts(ch);if(al.length){d.alts[g]=al.slice();al.forEach(a=>ids.add(a));}}
    for(const g of ids)d.glyphs[g]={d:f.pathD(g),a:f.adv(g),n:f.glyphName(g),b:f.bbox?f.bbox(g):null};
    const arr=[...ids];for(const x of arr)for(const y of arr){const k=f.kern(x,y);if(k)d.kern[x+','+y]=k;}
    out.push(d);}
  return out;
}
function saverHTML(){
  const cfg=saverConfig();
  cfg.fonts=bakeFonts(saverChars(cfg));
  cfg.image=null;
  if(img&&S.ssImage){try{const c=document.createElement('canvas');const iw=img.naturalWidth,ih=img.naturalHeight,sc=Math.min(1,2400/Math.max(iw,ih));c.width=Math.round(iw*sc);c.height=Math.round(ih*sc);c.getContext('2d').drawImage(img,0,0,c.width,c.height);cfg.image=c.toDataURL('image/jpeg',.88);}catch(e){}}
  const title=(anyLoaded()?F(baseSlot()).family:'Tempo').replace(/[<&]/g,'');
  const json=JSON.stringify(cfg).replace(/</g,'\\u003c');
  const bg=saverBg(cfg);
  const html=`<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title} – screensaver</title>
${anyLoaded()?'':'<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;800&display=swap" rel="stylesheet">'}
<style>html,body{margin:0;height:100%;overflow:hidden;background:${bg};cursor:none}canvas{display:block;width:100vw;height:100vh}</style>
</head><body><canvas id="c"></canvas>
\x3cscript>${$('#rubato-engine').textContent}\x3c/script>
\x3cscript>${$('#rubato-saver').textContent}\x3c/script>
\x3cscript>window.__TEMPO__=${json};\x3c/script>
\x3cscript>${SS_BOOT}\x3c/script>
</body></html>`;
  return html;
}
async function exportScreensaver(){await saveFile(slug().replace(/-(still|fluid|snappy|transitional|motion)$/,'')+'-screensaver.html',new Blob([saverHTML()],{type:'text/html'}));}

function saverThumbs(){
  const tEng=createEngine();tEng.setFaces(eng.faceList());tEng.setImage(S.ssImage?img:null);
  const big=document.createElement('canvas');big.width=360;big.height=232;const bx=big.getContext('2d');
  createSaver(tEng,saverConfig()).frame(bx,360,232,performance.now(),0);
  const small=document.createElement('canvas');small.width=180;small.height=116;const sx=small.getContext('2d');sx.imageSmoothingQuality='high';sx.drawImage(big,0,0,180,116);
  return[{w:180,h:116,scale:1,rgba:sx.getImageData(0,0,180,116).data},{w:360,h:232,scale:2,rgba:bx.getImageData(0,0,360,232).data}];
}
function macReadme(name){return `${name} screen saver for Mac
=====================================

macOS blocks screen savers that don't come from the App Store, so the first
install takes a few extra clicks. You only do this once.

INSTALL
1. Unzip the download, then double-click "${name}.saver".

2. macOS says it couldn't verify "${name}.saver". Click Done
   (not Move to Bin).

3. Open System Settings > Privacy & Security. Scroll down to the Security
   section, where you'll see that "${name}.saver" was blocked.
   Click Open Anyway, then confirm with your password or Touch ID.
   (The button only shows for about an hour after step 2. If it has gone,
   double-click the .saver again and repeat.)

4. Double-click "${name}.saver" again. This time choose Open Anyway.

5. When asked, choose "Install for all users of this computer" and enter
   your password. This matters - see below.

6. In System Settings > Screen Saver, choose ${name}.

WHY "ALL USERS"?
The screen saver looks for its page in /Library/Screen Savers. If you
installed it for your user only, it will show a blank screen. To fix it,
open Finder > Go > Go to Folder, enter ~/Library/Screen Savers, and drag
"${name}.saver" into /Library/Screen Savers (enter your password).

PREFER TERMINAL?
Instead of steps 2-4: open Terminal, type  xattr -cr  followed by a space,
drag "${name}.saver" into the window and press Return. Then double-click
the .saver and carry on from step 5.

TO REMOVE IT
Delete "${name}.saver" from /Library/Screen Savers.

Made with Tempo by Ensemble. The bundle contains WebViewScreenSaver by
Alastair Tse (Apache License 2.0), renamed and re-signed for this screen
saver; the licence is inside the bundle. It isn't notarised by Apple, which
is why macOS asks.
`;}
async function exportMac(){
  if(!window.SaverPack||!window.SAVER_ASSETS){toast("The Mac packager didn't load. Reload and try again.");return;}
  if(!window.crypto||!crypto.subtle){toast('This browser can\u2019t build the Mac file. Try Chrome, Safari or Firefox.');return;}
  const btn=window.macBtn;btn.disabled=true;const label=btn.textContent;btn.textContent='Building\u2026';
  try{
    const name=(anyLoaded()?F(baseSlot()).family:'Tempo').replace(/[^A-Za-z0-9 \-]/g,'').trim()||'Tempo';
    const res=await SaverPack.build(SAVER_ASSETS,{name,html:saverHTML(),thumbs:saverThumbs(),readme:macReadme(name)});
    await saveFile(name+' screen saver for Mac.zip',res.blob);
  }catch(e){console.error(e);toast('Couldn\u2019t build the Mac file: '+(e.message||e));}
  finally{btn.disabled=false;btn.textContent=label;ssDirty=true;}
}
function winReadme(name){return `${name} screen saver for Windows
=======================================

1. Before unzipping: right-click the zip > Properties > tick "Unblock" > OK.
   (This stops Windows treating the screen saver as unsafe. If there's no
   Unblock box, carry on.) Then right-click > Extract All.

2. Move "${name}.scr" somewhere it can stay, such as your Documents folder.
   Windows runs it from wherever it is when you install it.

3. Right-click "${name}.scr" and choose Install. Screen Saver Settings opens
   with ${name} selected. Set the wait time and click OK.
   If "Windows protected your PC" appears, click More info > Run anyway.

It plays full screen through Microsoft Edge, which is built into Windows 10
and 11. Your main display shows the clock; other displays show the
background colour. Move the mouse or press a key to wake.

To remove it, choose another screen saver in Screen Saver Settings, then
delete "${name}.scr".

Made with Tempo by Ensemble.
`.replace(/\n/g,'\r\n');}
function saverBg(cfg){if(cfg.words){const w=cfg.words;return w.rotate?w.themes[new Date().getHours()%w.themes.length].bg:w.bg;}return cfg.show==='clock'?(cfg.colours.cycle?cfg.palettes[new Date().getHours()%cfg.palettes.length].bg:cfg.colours.bg):cfg.looks[0].bg;}
async function exportWin(){
  if(!window.SaverPack||!window.SAVER_WIN){toast("The Windows packager didn't load. Reload and try again.");return;}
  const btn=window.winBtn;btn.disabled=true;const label=btn.textContent;btn.textContent='Building\u2026';
  try{
    const name=(anyLoaded()?F(baseSlot()).family:'Tempo').replace(/[^A-Za-z0-9 \-]/g,'').trim()||'Tempo';
    const enc=new TextEncoder(),nb=enc.encode(name),hb=enc.encode(saverHTML());
    const bin=atob(SAVER_WIN),tpl=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)tpl[i]=bin.charCodeAt(i);
    const hex=/^#?([0-9a-f]{6})$/i.exec(saverBg(saverConfig())),bg=hex?parseInt(hex[1],16):0;
    const ft=new Uint8Array(24),dv=new DataView(ft.buffer);ft.set(enc.encode('RBTOSCR1'));dv.setUint32(8,nb.length,true);dv.setUint32(12,hb.length,true);dv.setUint32(16,bg,true);
    const scr=new Uint8Array(tpl.length+nb.length+hb.length+24);scr.set(tpl,0);scr.set(nb,tpl.length);scr.set(hb,tpl.length+nb.length);scr.set(ft,tpl.length+nb.length+hb.length);
    await saveFile(name+' screen saver for Windows.zip',SaverPack.zip([{path:name+'.scr',data:scr},{path:'Read me first.txt',data:enc.encode(winReadme(name))}]));
  }catch(e){console.error(e);toast('Couldn\u2019t build the Windows file: '+(e.message||e));}
  finally{btn.disabled=false;btn.textContent=label;ssDirty=true;}
}
const SS_BOOT=`(function(){
var C=window.__TEMPO__,eng=createEngine();
eng.setFaces((C.fonts||[]).map(function(d){return{id:d.id,face:eng.makeBaked(d),swap:d.swap!==false};}));
if(C.image){var im=new Image();im.onload=function(){eng.setImage(im);};im.src=C.image;}
var cv=document.getElementById('c'),ctx=cv.getContext('2d'),sv=createSaver(eng,C),last=0;
function size(){var dpr=Math.min(window.devicePixelRatio||1,2),w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr),cap=2880/Math.max(w,h);if(cap<1){w=Math.round(w*cap);h=Math.round(h*cap);}if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}}
function tick(now){var dt=last?Math.min(100,now-last):0;last=now;size();sv.frame(ctx,cv.width,cv.height,now,dt);document.body.style.background=sv.bg();requestAnimationFrame(tick);}
requestAnimationFrame(tick);
document.addEventListener('click',function(){if(!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(function(){});});
})();`;

/* ---------------- preview ---------------- */
function fitCanvas(){
  const [W,H]=SHAPES[S.ssShape]||SHAPES.laptop;if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
  const v=$('#view'),cs=getComputedStyle(v);
  const aw=v.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=v.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
  const s=Math.max(.01,Math.min(aw/W,ah/H));cv.style.width=Math.floor(W*s)+'px';cv.style.height=Math.floor(H*s)+'px';
  cv.classList.toggle('checker',!!S.transparent);
  $('#dims').textContent='Preview at '+W+' × '+H+' px, showing your local time';dirty=true;
}
let pEng=null,saver=null,pFonts=-1,pImg=null;
function previewFrame(now,dt){
  if(!pEng)pEng=createEngine();
  if(pFonts!==faceVer){pEng.setFaces(eng.faceList());pFonts=faceVer;ssDirty=true;}
  if(pImg!==img){pEng.setImage(S.ssImage?img:null);pImg=img;}
  if(!saver){saver=createSaver(pEng,saverConfig());ssDirty=false;}else if(ssDirty){saver.setConfig(saverConfig());pEng.setImage(S.ssImage?img:null);ssDirty=false;}
  saver.frame(ctx,cv.width,cv.height,now,dt);
}
function tick(now){
  const dt=lastT?Math.min(100,now-lastT):0;lastT=now;
  const P=SHAPES[S.ssShape]||SHAPES.laptop;if(cv.width!==P[0]||cv.height!==P[1])fitCanvas();try{previewFrame(now,dt);}catch(e){console.error(e);}dirty=true;requestAnimationFrame(tick);
}
const shapeBar=$('#shapes');const shapeBtns=[['laptop','Laptop'],['display','Display'],['portrait','Portrait']].map(([v,t])=>{const b=el('button','lane',t);b.onclick=()=>set('ssShape',v);shapeBar.append(b);return[v,b];});
controls.push({d:{},w:shapeBar,update(){shapeBtns.forEach(([v,b])=>b.setAttribute('aria-pressed',S.ssShape===v));}});
function applyTab(){
  document.body.classList.add('saver');
  shapeBtns.forEach(([v,b])=>b.setAttribute('aria-pressed',S.ssShape===v));
  refreshVis();fitCanvas();
}

/* ---------------- start ---------------- */
function appStart(){refreshFontCard();ssRefresh();themesRefresh();applyTab();refreshAll();fitCanvas();}
