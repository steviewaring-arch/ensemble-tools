import sys, json
from audit import *
PIC = """await (async()=>{const c=document.createElement('canvas');c.width=400;c.height=300;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,400,300);g.addColorStop(0,'#f40');g.addColorStop(1,'#04f');x.fillStyle=g;x.fillRect(0,0,400,300);x.fillStyle='#fff';x.fillRect(60,60,120,90);const b=await new Promise(r=>c.toBlob(r,'image/png'));return new File([b],'pic.png',{type:'image/png'});})()"""
T = "segue.items.forEach((it,i)=>{it.title='Title '+(i+1);it.line='A line about it';it.tags='Brand: Name | Year: 2026';});"
SET = {
 'A slides shape, overlay text, edge, fit inside, unbuild, bg image': "async()=>{segue.applyPreset('Push and drift');segue.set('oneFit','shape');segue.set('ratio','4:5');segue.set('fit','fit');segue.set('edge',true);segue.set('mat',20);segue.set('pile',true);segue.set('pileEnd','unbuild');segue.set('ovOn',true);segue.set('ovKind','text');segue.set('ovText','Hello there');await segue.setPic('bg',%s);%ssegue.refresh();segue.setPlaying(false);}" % (PIC, T),
 'B frames 7 in 3, movement': "async()=>{segue.applyPreset('Posters');segue.set('inMove','zoom');%ssegue.refresh();segue.setPlaying(false);}" % T,
 'C line still': "async()=>{segue.applyPreset('Snap along');segue.set('trackMove','still');segue.refresh();segue.setPlaying(false);}",
 'D grid': "async()=>{segue.applyPreset('Snap along');segue.set('layout','grid');segue.refresh();segue.setPlaying(false);}",
 'E float, overlay among shapes': "async()=>{segue.applyPreset('Float with title');segue.setPlaying(false);}",
 'F overlay image': "async()=>{segue.applyPreset('Straight cuts');segue.set('ovOn',true);segue.set('ovKind','image');await segue.setPic('ov',%s);segue.refresh();segue.setPlaying(false);}" % PIC,
 'G columns step': "async()=>{segue.applyPreset('Columns up and down');segue.setPlaying(false);}",
 'H captions over, slides bleed': "async()=>{segue.applyPreset('Fade with caption');%ssegue.refresh();segue.setPlaying(false);}" % T,
}
out={}
for n,js in SET.items():
    if sys.argv[1:] and not any(n.startswith(a) for a in sys.argv[1:]): continue
    run("("+js+")()", n, STILLS[:7]+([TEX] if n.startswith('A') else []), out)
json.dump(out, open(os.path.join(FX,'out_extra.json'),'w'), indent=1)
