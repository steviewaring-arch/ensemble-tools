"""Tutti audit (6.3): does every setting do something? For each set-up, every control that's showing in the
panel is moved to its other values and the canvas – the export's own pixels – compared with before. Each change
is taken back with putState (the same snapshot Undo uses) before the next.

    python3 tests/audit/tutti.py            # Chromium, about two minutes

A "no effect" needs a reason, not always a fix: Rotation does nothing to a round dot, Own colours nothing until a
band has an SVG mark – so a set-up with a mark is run too."""
import sys, os, json, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from serve import start
from playwright.sync_api import sync_playwright

FIX = os.path.join(os.path.dirname(HERE), 'fixtures')
PHOTO, MARK = os.path.join(FIX, 'tutti-photo.jpg'), os.path.join(FIX, 'tutti-mark.svg')

JS = r"""
async ()=>{
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const out=document.getElementById('out');   /* every pixel: a band's colour may be a few small dots */
  const sig=async()=>{await wait(320);const d=out.getContext('2d').getImageData(0,0,out.width,out.height).data;let h=2166136261;
    for(let i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619);}return out.width+'x'+out.height+':'+(h>>>0);};
  const panel=document.getElementById('panel');
  const seen=e=>{for(let n=e;n&&n!==panel;n=n.parentElement){if(n.hidden||getComputedStyle(n).display==='none')return false;}return true;};
  const words=e=>e?e.textContent.replace(/\?/g,'').replace(/\s+/g,' ').trim():'';
  const where=e=>{const c=e.closest('.card');const f=e.closest('.fold-body');return (c?words(c.querySelector('.card-toggle span')):'?')+' › '+(f?words(f.previousElementSibling.querySelector('span'))+' › ':'');};
  const name=e=>{const x=e.closest('.ctl,.toggle,.state,.stepper,.edge,.row,.seg,.card-tools,.subttl-row')||e;
    if(e.matches('textarea'))return 'Text';if(x.classList.contains('seg'))return 'Align';if(x.classList.contains('state'))return 'Band '+words(x.querySelector('.meta b'))+' colour';
    if(x.classList.contains('card-tools')||x.classList.contains('subttl-row')||e.matches('.steps button'))return words(e)||e.id;
    const l=x.querySelector('.lbl,label,:scope>span');return words(l)||e.id;};
  const fire=(e,t)=>e.dispatchEvent(new Event(t,{bubbles:true}));
  /* every control showing, and the other values each can take */
  const items=[];
  panel.querySelectorAll('input[type=range]').forEach(e=>{if(!seen(e.closest('.ctl,.edge')||e))return;const a=+e.min,b=+e.max,cur=+e.value;
    items.push({e,label:name(e),vals:[a,b,(a+b)/2,a+(b-a)*.25].filter(v=>Math.abs(v-cur)>1e-9),set:v=>{e.value=v;fire(e,'input');fire(e,'change');}});});
  panel.querySelectorAll('select').forEach(e=>{if(!seen(e))return;items.push({e,label:name(e),vals:[...e.options].map(o=>o.value).filter(v=>v!==e.value),set:v=>{e.value=v;fire(e,'change');}});});
  panel.querySelectorAll('input[type=color]').forEach(e=>{if(!seen(e))return;items.push({e,label:name(e),vals:['#e4002b','#0a84ff'].filter(v=>v!==e.value),set:v=>{e.value=v;fire(e,'input');fire(e,'change');}});});
  panel.querySelectorAll('input.num').forEach(e=>{if(!seen(e))return;items.push({e,label:name(e),vals:[+e.value===7?2:7],set:v=>{e.value=v;fire(e,'input');}});});
  panel.querySelectorAll('textarea').forEach(e=>{if(!seen(e))return;items.push({e,label:'Text',vals:['Audit words'],set:v=>{e.value=v;fire(e,'input');}});});
  panel.querySelectorAll('.toggle').forEach(e=>{if(!seen(e))return;items.push({e,label:name(e),vals:[1],set:()=>e.click()});});
  panel.querySelectorAll('.seg button').forEach(e=>{if(!seen(e)||e.classList.contains('on'))return;items.push({e,label:'Align › '+words(e),vals:[1],set:()=>e.click()});});
  ['bandPlus','bandMinus','randomColors','resetShapes','randomAll','resetEdges'].forEach(id=>{const e=document.getElementById(id);if(e&&seen(e)&&!e.disabled)items.push({e,label:words(e)||id,vals:[1],set:()=>e.click()});});
  const res=[];const base=await sig();
  for(const it of items){const before=snapState();let alive=false,tried=0,err=null;
    for(const v of it.vals){try{it.set(v);tried++;if(await sig()!==base)alive=true;}catch(x){err=String(x);}putState(before);await wait(60);if(alive)break;}
    if(await sig()!==base)err=(err?err+'; ':'')+'did not come back';
    res.push({label:where(it.e)+it.label,alive,tried,err});}
  return res;
}
"""

SETUPS = [
    ('Image', "document.getElementById('fileIn')", PHOTO, None),
    ('Image, a band with an SVG mark', "document.getElementById('fileIn')", PHOTO, 'mark'),
    ('Image, Custom format', "document.getElementById('fileIn')", PHOTO, "aspect=custom"),
    ('Type', None, None, 'type'),
    ('Type, Gradient fill', None, None, 'type+grad'),
]

def run(pg, name, how):
    pg.goto(BASE + 'docs/tutti/'); pg.wait_for_timeout(1200)
    if how in ('type', 'type+grad'):
        pg.click('#typeBtn'); pg.wait_for_timeout(400)
        if how == 'type+grad': pg.click('#tGrad')
    else:
        pg.set_input_files('#fileIn', PHOTO); pg.wait_for_timeout(900)
        if how == 'mark':
            for i in range(3): pg.locator('.stSvg').nth(i).set_input_files(MARK)
            pg.wait_for_timeout(700)
        if how == 'aspect=custom': pg.select_option('#aspect', 'custom')
    pg.evaluate("()=>{document.querySelectorAll('#panel .card.collapsed .card-toggle').forEach(b=>b.click());document.querySelectorAll('#panel .fold-head[aria-expanded=false]').forEach(b=>b.click());}")
    pg.wait_for_timeout(500)
    r = pg.evaluate(JS)
    dead = [x for x in r if not x['alive']]
    bad = [x for x in r if x.get('err')]
    print(f'{name}: {len(r)} settings; {len(dead)} no effect: ' + ', '.join(x['label'] + ('' if x['tried'] else ' (untried)') for x in dead) + (f'\n   problems: {bad}' if bad else ''), flush=True)
    return r

if __name__ == '__main__':
    BASE = start(); out = {}
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        for name, _, _, how in SETUPS: out[name] = run(pg, name, how)
        print('script errors:', errs[:3] or 'none')
        b.close()
    os.makedirs(os.path.join(os.path.dirname(HERE), 'out'), exist_ok=True)
    json.dump(out, open(os.path.join(os.path.dirname(HERE), 'out', 'tutti_audit.json'), 'w'), indent=1)
