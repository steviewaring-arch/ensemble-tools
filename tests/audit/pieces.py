import sys, json
from audit import *
JS = r"""
async (tests)=>{
  const E=segue.E,S=segue.S,k=.2,c=document.createElement('canvas'),x=c.getContext('2d',{willReadFrequently:true}),small=document.createElement('canvas'),sx=small.getContext('2d',{willReadFrequently:true});small.width=64;small.height=64;
  const sig=async()=>{const [W,H]=E.canvasSize(S);c.width=Math.round(W*k);c.height=Math.round(H*k);const P=segue.plan(),L=P.L,out=[L.toFixed(3)];
    const ts=[];for(let i=0;i<12;i++)ts.push((i+.37)/12*L);for(const g of (P.segs||[]).filter(g=>g.k!=='hold'&&g.k!=='rest').slice(0,4))ts.push((g.t0+g.t1)/2);
    for(const t of ts){await segue.frameAt(c,x,W,H,t,k);sx.clearRect(0,0,64,64);sx.drawImage(c,0,0,64,64);const d=sx.getImageData(0,0,64,64).data;let h=2166136261;for(let i=0;i<d.length;i++){h^=d[i]>>2;h=Math.imul(h,16777619);}out.push(h>>>0);}
    return out.join(',');};
  const res=[];const base=await sig();
  for(const [idx,key,val] of tests){const it=segue.items[idx],had=key in it,old=it[key];it[key]=val;segue.refresh();let s2;try{s2=await sig();}catch(e){s2='ERR '+e;}
    res.push([idx,key,String(val),s2!==base,s2.startsWith('ERR')?s2:'']);if(had)it[key]=old;else delete it[key];segue.refresh();}
  return res;}
"""
T = "segue.items.forEach((it,i)=>{it.title='Title '+(i+1);});"
CASES = {
 'slides bleed': ("segue.applyPreset('Slow fades');segue.set('capOn',true);"+T, [[1,'hold',3],[1,'arrive','cut'],[1,'moves','in'],[1,'zm',160],[1,'px',60],[1,'py',-60],[1,'opa',40],[1,'title','Other words'],[1,'line','A line'],[1,'tags','A: B'],[1,'join','on'],[1,'blend','multiply']]),
 'slides own': ("segue.applyPreset('Push and drift');", [[1,'ox',120],[1,'oy',-90],[1,'zm',60],[1,'opa',40],[1,'hold',3]]),
 'slides shape': ("segue.applyPreset('Push and drift');segue.set('oneFit','shape');segue.set('ratio','1:1');", [[1,'ox',120],[1,'oy',-90],[1,'fz',60],[1,'zm',180],[1,'px',70],[1,'py',70]]),
 'layer': ("segue.applyPreset('Slow fades');segue.items[1].join='on';segue.items[1].lfit='own';segue.items[1].zm=50;", [[1,'place','behind'],[1,'lfit','fill'],[1,'lin','fade'],[1,'ox',150],[1,'oy',-100],[1,'zm',80],[1,'blend','multiply'],[1,'opa',50]]),
 'layer build': ("segue.applyPreset('Slow fades');segue.items[1].join='on';segue.items[1].lfit='own';segue.items[1].zm=50;segue.items[1].lin='fade';", [[1,'lafter',1.5],[1,'lover',1.8]]),
 'line': ("segue.applyPreset('Snap along');", [[1,'zm',170],[1,'px',80],[1,'py',80],[1,'opa',40],[1,'blend','multiply']]),
 'columns': ("segue.applyPreset('Masonry drift');", [[1,'zm',170],[1,'px',80],[1,'opa',40]]),
 'frames': ("segue.applyPreset('Posters');", [[1,'slot','1'],[1,'zm',170],[1,'px',80],[1,'opa',40]]),
 'float': ("segue.applyPreset('Float with title');", [[1,'zm',170],[1,'opa',40]]),
 'video': ("segue.applyPreset('Straight cuts');", [[7,'start',1.5],[7,'end',2.5]]),
}
for n,(setup,tests) in CASES.items():
    if sys.argv[1:] and n not in sys.argv[1:]: continue
    p,b,pg=open_app(media=STILLS[:7]+[VIDEO]); pg.set_default_timeout(600000)
    pg.evaluate("()=>{"+setup+"segue.refresh();segue.setPlaying(false);}"); time.sleep(.5)
    r=pg.evaluate(JS, tests)
    print(n, 'no effect:', [(k,v) for i,k,v,alive,err in r if not alive], [e for *_,e in r if e], pg.errs[:2], flush=True)
    b.close(); p.stop()
