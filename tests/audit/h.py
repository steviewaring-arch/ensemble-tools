"""Shared by the audit scripts: its own pictures (no outside files), a page with Segue in it."""
import sys, os, time, tempfile, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from serve import start
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
FX = os.path.join(tempfile.gettempdir(), 'segue-audit'); os.makedirs(FX, exist_ok=True)
STILLS = []
for i, (c, size) in enumerate([('#EA2631', (1600, 1000)), ('#2F5DA8', (1000, 1500)), ('#3C6E5A', (1400, 1400)), ('#E2552D', (1800, 900)), ('#111111', (1200, 1600)), ('#8A6FD1', (1500, 1000)), ('#D9B44A', (900, 1300))]):
    p = os.path.join(FX, f'still_{i}.png')
    if not os.path.exists(p):
        im = Image.new('RGB', size, c); d = ImageDraw.Draw(im); w, h = size
        d.rectangle([w * .1, h * .1, w * .45, h * .5], fill='#F5F5F3'); d.ellipse([w * .55, h * .5, w * .9, h * .9], fill='#FFFFFF'); d.line([0, 0, w, h], fill='#000000', width=12); im.save(p)
    STILLS.append(p)
TEX = os.path.join(FX, 'texture.png')
if not os.path.exists(TEX): Image.radial_gradient('L').resize((600, 600)).convert('RGB').save(TEX)
VIDEO = os.path.join(FX, 'clip.webm')
if not os.path.exists(VIDEO):
    try: subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=960x600:rate=30:duration=4', '-c:v', 'libvpx-vp9', '-b:v', '2M', '-g', '10', '-pix_fmt', 'yuv420p', VIDEO], check=True)
    except Exception: VIDEO = None

def open_app(w=1440, h=900, engine='chromium', media=None):
    base = start(); p = sync_playwright().start(); b = getattr(p, engine).launch()
    pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(base + 'docs/segue/'); time.sleep(1.5)
    if media:
        pg.set_input_files('#mediafile', [m for m in media if m]); time.sleep(2.5)
    pg.errs = errs
    return p, b, pg
