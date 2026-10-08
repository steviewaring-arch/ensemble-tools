"""Build Ensemble Tools into docs/ for GitHub Pages.

    python3 build.py

Each app becomes one self-contained HTML file (apart from the Adobe Fonts,
Google Fonts and opentype.js links it has always had):

    docs/rubato/index.html   Rubato – type in motion
    docs/tempo/index.html    Tempo – clock screen saver
    docs/tutti/index.html    Tutti – copied from tutti/index.html unchanged
    docs/decentish/index.html  Decentish – prototype, copied after a syntax check
    docs/index.html          a small page linking to all three
    docs/rubato/0.9/         earlier versions kept live, from archive/

Rubato and Tempo each have their own type engine (rubato/engine.js,
tempo/engine.js), so a change to one never reaches the other or Tempo's exports.

Never edit docs/ by hand – change the sources and run this again.
"""
import os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(ROOT, 'docs')

def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()

def strip1(s):
    # files end with one newline; the script tags add their own
    return s[:-1] if s.endswith('\n') else s

# Earlier versions kept live next to the current one. Each archived file keeps
# its own settings (it reads the current app's the first time, then saves under
# its own prefix), so opening an old version never overwrites newer settings.
ARCHIVE = [('rubato', '0.9', 'archive/rubato-0.9.html', "const APP='rubato';", "const APP='rubato-0.9';")]

# Each app: page title, version, its markup, extra scripts that must keep their
# ids (Tempo's screen saver export copies #tempo-engine and #tempo-saver into
# the exported page), and the app files that go inside the shared wrapper.
APPS = {
    'rubato': dict(
        title='Rubato — by Ensemble', version='1.0',
        body='rubato/app.html', css='rubato/app.css',
        tagged=[('rubato-engine', 'rubato/engine.js')],
        before='shared/gif.js',
        parts=['rubato/controls.js', 'rubato/stage.js', 'rubato/app.js', 'rubato/export.js'],
    ),
    'tempo': dict(
        title='Tempo – by Ensemble', version='0.6',
        body='tempo/app.html', css='tempo/app.css',
        tagged=[('tempo-engine', 'tempo/engine.js'), ('tempo-saver', 'tempo/saver.js'),
                ('tempo-mac', 'tempo/mac/packager.js'), ('tempo-win', 'tempo/win/host.js')],
        before=None,
        parts=['tempo/app.js'],
    ),
}

def build_app(name, cfg):
    css = read('shared/tokens.css') + read('shared/components.css')
    if cfg.get('css'):
        css += read(cfg['css'])
    body = read(cfg['body']).replace('{{version}}', cfg['version'])
    scripts = ''
    for sid, path in cfg['tagged']:
        scripts += f'<script id="{sid}">\n{strip1(read(path))}\n</script>\n'
    main = (read(cfg['before']) + '\n\n' if cfg['before'] else '')
    main += "(()=>{\n'use strict';\nconst $=s=>document.querySelector(s);\n"
    main += f"const APP='{name}';\n"
    main += read('shared/core.js')
    for p in cfg['parts']:
        main += read(p)
    main += read('shared/core-end.js') + '})();'
    scripts += f'<script>\n{main}\n</script>\n'
    page = read('shared/page.html')
    page = page.replace('{{title}}', cfg['title']).replace('{{css}}', css)
    page = page.replace('{{body}}', strip1(body)).replace('{{scripts}}', scripts)
    return page

def check_scripts(name, html):
    """Parse every inline script with Node so a syntax slip fails the build."""
    blocks = re.findall(r'<script(?: id="[a-z-]+")?>\n(.*?)\n</script>', html, re.S)
    ok = True
    with tempfile.TemporaryDirectory() as tmp:
        for i, b in enumerate(blocks):
            p = os.path.join(tmp, f'b{i}.js')
            with open(p, 'w', encoding='utf-8') as f:
                f.write(b)
            r = subprocess.run(['node', '-e', "new Function(require('fs').readFileSync(process.argv[1],'utf8'))", p],
                               capture_output=True, text=True)
            if r.returncode:
                ok = False
                print(f'  {name}: script {i} has an error:\n{r.stderr.strip()}')
    return ok

def write(rel, text):
    p = os.path.join(DOCS, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)

def main():
    ok = True
    for name, cfg in APPS.items():
        html = build_app(name, cfg)
        ok = check_scripts(name, html) and ok
        write(f'{name}/index.html', html)
        print(f'{name} {cfg["version"]}: docs/{name}/index.html ({len(html.encode()) // 1024} KB)')
    # Tempo's built-in fonts: whatever tempo/fonts/fonts.json lists, served next to
    # the app and loaded when switched on. Only fonts cleared to publish go here –
    # everything in docs/ is public.
    out = os.path.join(DOCS, 'tempo/fonts')
    shutil.rmtree(out, ignore_errors=True)
    man = os.path.join(ROOT, 'tempo/fonts/fonts.json')
    listed = []
    if os.path.exists(man):
        import json
        listed = json.load(open(man, encoding='utf-8')).get('fonts', [])
        os.makedirs(out)
        for f in listed:
            shutil.copyfile(os.path.join(ROOT, 'tempo/fonts', f['file']), os.path.join(out, f['file']))
        shutil.copyfile(man, os.path.join(out, 'fonts.json'))
    else:
        write('tempo/fonts/fonts.json', '{"fonts":[]}\n')
    print(f'tempo fonts: {len(listed)} built in')
    # Tempo's built-in presets: tempo/presets.json (the screen savers that ship),
    # in the same form as a "Download all" backup from the Presets card.
    pre = os.path.join(ROOT, 'tempo/presets.json')
    if os.path.exists(pre):
        import json
        n = len(json.load(open(pre, encoding='utf-8')).get('presets', []))
        shutil.copyfile(pre, os.path.join(DOCS, 'tempo/presets.json'))
    else:
        n = 0
        write('tempo/presets.json', '{"presets":[]}\n')
    print(f'tempo presets: {n} built in')
    os.makedirs(os.path.join(DOCS, 'tutti'), exist_ok=True)
    shutil.copyfile(os.path.join(ROOT, 'tutti/index.html'), os.path.join(DOCS, 'tutti/index.html'))
    print('tutti: docs/tutti/index.html (copied unchanged)')
    for app, ver, src, a, b in ARCHIVE:
        html = read(src)
        if html.count(a) != 1:
            print(f'  archive {src}: storage line not found'); ok = False
        write(f'{app}/{ver}/index.html', html.replace(a, b))
        print(f'{app} {ver}: docs/{app}/{ver}/index.html (archived)')
    html = read('decentish/index.html')
    ok = check_scripts('decentish', html) and ok
    write('decentish/index.html', html)
    ver = re.search(r"const VERSION='([0-9.]+)'", html).group(1)
    print(f'decentish {ver}: docs/decentish/index.html ({len(html.encode()) // 1024} KB, copied after a syntax check)')
    shutil.copyfile(os.path.join(ROOT, 'shared/home.html'), os.path.join(DOCS, 'index.html'))
    open(os.path.join(DOCS, '.nojekyll'), 'w').close()
    if not ok:
        sys.exit(1)

if __name__ == '__main__':
    main()
