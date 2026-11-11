"""Segue audit: for every preset, every setting that's showing – change it and see whether the picture (or the loop) changes."""
import sys, json, time
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import *
JS = r"""
async (opt)=>{
  const E=segue.E,S=segue.S,k=.2;
  const c=document.createElement('canvas'),x=c.getContext('2d',{willReadFrequently:true}),small=document.createElement('canvas'),sx=small.getContext('2d',{willReadFrequently:true});small.width=64;small.height=64;
  const sig=async()=>{const [W,H]=E.canvasSize(S);c.width=Math.round(W*k);c.height=Math.round(H*k);const P=segue.plan(),L=P.L,out=[L.toFixed(3)];
    const ts=[];for(let i=0;i<10;i++)ts.push((i+.37)/10*L);for(const g of (P.segs||[]).filter(g=>g.k!=='hold'&&g.k!=='rest').slice(0,4))ts.push((g.t0+g.t1)/2);if(P.hold!=null&&P.dur!=null&&!P.segs){ts.push(P.hold+P.dur*.5);ts.push(P.hold+P.dur*.25);}
    for(const t of ts){await segue.frameAt(c,x,W,H,t,k);sx.clearRect(0,0,64,64);sx.drawImage(c,0,0,64,64);const d=sx.getImageData(0,0,64,64).data;let h=2166136261;for(let i=0;i<d.length;i+=1){h^=d[i]>>2;h=Math.imul(h,16777619);}out.push(h>>>0);}
    return out.join(',');};
  const shown=()=>segue.ui.controls.filter(q=>q.d&&q.d.k&&q.d.t&&q.w&&q.w.isConnected&&!q.w.hidden&&!q.w.closest('[hidden]'));
  const lab=q=>{const l=q.w.querySelector('label,.ctl-head span,.toggle span:last-child');const card=q.w.closest('section.card');const fold=q.w.closest('.fold');return (card?card.dataset.id:'?')+' › '+(fold?fold.querySelector('.fold-head span').textContent+' › ':'')+(l?l.textContent.trim():q.d.k);};
  const alts=(d,cur)=>{if(d.t==='seg'||d.t==='select'){const o=d.optsFn?d.optsFn(S):typeof d.opts==='function'?d.opts(S):d.opts;return (o||[]).map(v=>Array.isArray(v)?v[0]:v).filter(v=>v!==cur);}
    if(d.t==='range'){const a=+d.min,b=+d.max,vals=[a,b,(a+b)/2,a+(b-a)*.25];return vals.filter(v=>Math.abs(v-(+cur))>1e-9);}
    if(d.t==='toggle')return [!cur];if(d.t==='colour')return ['#E4002B','#0A84FF'].filter(v=>v!==cur);if(d.t==='text')return ['Audit words'];return [];};
  const res=[];const snap=JSON.stringify(S);const restore=()=>{const o=JSON.parse(snap);for(const key of Object.keys(S))if(!(key in o))delete S[key];Object.assign(S,o);segue.refresh();};
  const base=await sig();
  const list=shown().map(q=>({k:q.d.k,t:q.d.t,label:lab(q)}));
  for(const it of list){const q=shown().find(q=>q.d.k===it.k&&lab(q)===it.label);if(!q){res.push({label:it.label,k:it.k,gone:true});continue;}
    const cur=S[it.k],as=alts(q.d,cur);let alive=false,tried=0,err=null;
    for(const v of as){try{if(q.d.pick)q.d.pick(v);else segue.set(it.k,v);tried++;const s2=await sig();if(s2!==base){alive=true;}}catch(e){err=String(e);}restore();if(alive)break;}
    res.push({label:it.label,k:it.k,t:it.t,alive,tried,err,cur:String(cur)});}
  return {base,res};
}
"""
def run(setup, name, media, out):
    p,b,pg=open_app(w=1440,h=1000,media=media)
    pg.set_default_timeout(600000)
    pg.evaluate(setup); time.sleep(.4)
    pg.evaluate("""()=>{const t=document.querySelector('.tier');if(t&&!t.classList.contains('open'))t.querySelector('.tier-head').click();document.querySelectorAll('#panel section.card.collapsed:not(.has-sw)>h2 .card-toggle').forEach(b=>b.click());document.querySelectorAll('#panel .fold-head[aria-expanded=false]').forEach(b=>b.click());}"""); time.sleep(.6)
    r=pg.evaluate(JS, {})
    out[name]=r['res']; dead=[x for x in r['res'] if not x.get('alive')]
    print(name, len(r['res']), 'settings;', len(dead), 'no effect:', [x['label']+('' if x.get('tried') else ' (untried)') for x in dead], pg.errs[:2], flush=True)
    b.close(); p.stop()
if __name__=='__main__':
    PRE=["Straight cuts","Slow fades","Push and drift","Open and zoom","Zoom through","Flick across","Spring up","Build up","Fade with caption","Snap along","Snap up","Card stack","Phone swipe","Carousel","Rows up","Columns up and down","Masonry drift","Rows side to side","Rows drift","Posters","Wall snap","Wall stairs","Brick wall","Float with title"]
    which=sys.argv[1:] or PRE; out={}
    for n in which:
        run(f"segue.applyPreset({json.dumps(n)});segue.setPlaying(false);segue.items.forEach((it,i)=>{{it.title='Title '+(i+1);it.line='A line about it';it.tags='Brand: Name | Year: 2026';}});segue.refresh()", n, STILLS[:7], out)
    json.dump(out, open(os.path.join(FX,'out_%s.json')%('all' if not sys.argv[1:] else 'part'),'w'), indent=1)
