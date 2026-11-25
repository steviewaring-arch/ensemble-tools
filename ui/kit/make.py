"""The component page: every house part in one place, built from the kit itself.

Run from build.py, after the tools are built, so it can say which tools use each
component. Nothing here is hand-maintained except ui/kit/body.html – the CSS is
the same shared/tokens.css + components.css + kit.css the tools load, and the
inventory is read from the stylesheets, so the page cannot drift from the house.

Why it exists: a component only gets looked at, or checked, when a panel happens
to show it. The wrapped choice group that sat at 17px for weeks appears in two
panels out of four. Here they are all on screen at once, and tests/corner_check.py
reads this page as a fifth tool.
"""
import os, re, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSS = ['shared/tokens.css', 'shared/components.css', 'shared/kit.css']
TOOLS = {'Segue': 'segue/app.css', 'Rubato': 'rubato/app.css',
         'Tempo': 'tempo/app.css', 'Tutti': 'tutti/frame.css'}


def classes_in(path):
    """Every class a stylesheet defines."""
    if not os.path.exists(os.path.join(ROOT, path)):
        return set()
    css = re.sub(r'/\*.*?\*/', '', open(os.path.join(ROOT, path)).read(), flags=re.S)
    out = set()
    for sel in re.findall(r'([^{}]+)\{', css):
        out.update(re.findall(r'\.([A-Za-z][\w-]*)', sel))
    return out


def tokens_in_tools():
    """The class names each built tool actually puts in its markup.

    Read as whole tokens, not as a pattern: ".in" matched inside "island-in" when
    this searched with a word boundary, because a hyphen is one. Classes a tool
    composes at run time from a variable cannot be seen here, so the column says
    where a class appears in the markup, not everywhere it can reach.
    """
    seen = {}
    for tool in TOOLS:
        p = os.path.join(ROOT, 'docs', tool.lower(), 'index.html')
        if not os.path.exists(p):
            continue
        html = open(p, encoding='utf-8').read()
        got = set()
        for m in re.finditer(r'class(?:Name)?\s*=\s*["\'`]([^"\'`]*)', html):
            got.update(m.group(1).split())
        for m in re.finditer(r'classList\.(?:add|remove|toggle|contains)\(([^)]*)\)', html):
            got.update(re.findall(r'["\']([\w-]+)["\']', m.group(1)))
        # Rubato and Tempo build most of their DOM through el(tag, class) helpers,
        # so a class can be perfectly alive and never appear in a class attribute
        for m in re.finditer(r'\bel\(\s*["\'][\w-]+["\']\s*,\s*["\']([\w -]+)["\']', html):
            got.update(m.group(1).split())
        seen[tool] = got
    return seen


def build(docs):
    house = set()
    for p in CSS:
        house |= classes_in(p)
    own = {t: classes_in(p) - house for t, p in TOOLS.items()}

    body = open(os.path.join(ROOT, 'ui/kit/body.html'), encoding='utf-8').read()
    css = '\n'.join(open(os.path.join(ROOT, p), encoding='utf-8').read() for p in CSS)

    # a line under each specimen saying where its parts live
    def note(m):
        names = m.group(1).split()
        shared = [c for c in names if c in house]
        strays = [c for c in names if c not in house]
        bits = []
        if shared:
            bits.append(f'<b>{len(shared)} from the kit</b>: ' + ', '.join(shared))
        if strays:
            bits.append('<b>not in the kit</b>: ' + ', '.join(strays))
        return f'{m.group(0)}<!--note:{" &middot; ".join(bits)}-->'
    body = re.sub(r'data-spec="([^"]+)"', note, body)
    body = re.sub(r'<!--note:(.*?)-->', '', body)   # kept for the inventory below, not shown inline

    in_tools = tokens_in_tools()
    rows = []
    for t, cs in sorted(own.items()):
        for c in sorted(cs):
            where = ', '.join(tool for tool, got in in_tools.items() if c in got)
            rows.append((c, t, where or 'not in the markup'))
    inv = '\n'.join(
        f'<tr><td><code>.{c}</code></td><td>{t} only</td><td>{u}</td></tr>' for c, t, u in rows)

    # Two documents. The specimen is the components on their own, with nothing of the page
    # around them; the bench frames it at real viewport widths, so the media queries that decide
    # the phone layout actually fire. A width set with CSS on a div would not fire them, which is
    # the whole reason the mobile layout drifted unseen.
    # Two rules in the kit apply only to a touch screen - where the ? sits on a slider row, and
    # the scrollbar lane. A desktop browser showing a 390px frame is still a pointer, so the bench
    # could not show them, which is half of what a phone looks like. Lift them straight out of the
    # kit and re-serve them under html.force-touch, so the bench shows the real rule and cannot
    # drift from it: if the kit's rule changes, this changes with it.
    touch = '\n'.join(
        f'html.force-touch {sel.strip()}{{{body_}}}'
        for sel, body_ in re.findall(r'@media \(hover:\s*none\)\s*\{([^{}]+)\{([^{}]*)\}\s*\}', css))

    specimen = f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>The house kit – specimen</title>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700&display=swap" rel="stylesheet">
<style>{css}</style>
<style>{touch}</style>
<style>
  html,body{{margin:0;height:100%}}
  body{{background:var(--app,var(--k-panel));font-family:'Inter Tight',system-ui,sans-serif}}
  .app{{position:absolute;inset:0}}
</style>
</head><body>
{body}
<script>
  var q = new URLSearchParams(location.search);
  if (q.get('theme') === 'dark') {{ document.body.dataset.theme = 'dark';
    var a = document.querySelector('.app'); if (a) a.dataset.theme = 'dark'; }}
  if (q.get('touch') === '1') document.documentElement.classList.add('force-touch');
</script>
</body></html>
'''

    page = f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>The house kit – components</title>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700&display=swap" rel="stylesheet">
<style>{css}</style>
<style>
/* the bench's own chrome – deliberately outside .panel/.island/.topbar/.pop so the
   house check reads only the components, never this */
  body{{margin:0;background:var(--k-panel);color:var(--ink);font-family:'Inter Tight',system-ui,sans-serif}}
  .page{{max-width:1180px;margin:0 auto;padding:40px 24px 80px}}
  .page h1{{font-size:28px;letter-spacing:-.03em;margin:0 0 6px}}
  .page .lede{{color:var(--muted);font-size:14px;max-width:62ch;margin:0 0 28px;line-height:1.5}}
  .page h2.sec{{font-size:15px;font-weight:700;letter-spacing:-.01em;margin:40px 0 12px}}
  .bx{{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 16px}}
  .bx-grp{{display:flex;gap:2px;padding:2px;border-radius:var(--r-ctl);background:var(--k-fill)}}
  .bx-grp button{{height:26px;padding:0 10px;border:0;border-radius:var(--r-in);background:transparent;
    color:var(--muted);font:inherit;font-size:12.5px;cursor:pointer}}
  .bx-grp button[aria-pressed="true"]{{background:var(--k-raise);color:var(--ink-strong);
    font-weight:500;box-shadow:0 0 0 1px var(--k-raise-line)}}
  .bx-note{{color:var(--muted);font-size:12.5px}}
  .bx-wide{{max-width:1500px;margin:0 auto;padding:0 24px}}
  .bx-stage{{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}}
  .bx-vp{{flex:none}}
  .bx-vp .bx-cap{{color:var(--muted);font-size:12px;margin:0 0 6px}}
  .bx-vp iframe{{display:block;height:620px;border:0;border-radius:var(--r-surface);
    box-shadow:0 0 0 1px var(--keyline);background:var(--k-panel)}}
  table.inv{{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}}
  table.inv th,table.inv td{{text-align:left;padding:7px 10px;border-bottom:1px solid var(--keyline);vertical-align:top}}
  table.inv th{{font-weight:500;color:var(--muted)}}
  table.inv code{{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}}
  .count{{color:var(--muted);font-size:13px;margin:0 0 4px}}
</style>
</head><body>
<div class="page">
  <h1>The house kit</h1>
  <p class="lede">Every component the tools share, in one place, built from
  <code>shared/tokens.css</code>, <code>shared/components.css</code> and <code>shared/kit.css</code> –
  the same files the tools load, in the same order. Nothing here is a drawing of a component;
  they are the components. Refine them in the kit and every tool takes the change.</p>

  <h2 class="sec">The bench</h2>
  <div class="bx">
    <div class="grp" id="wgrp" role="group" aria-label="Width">
      <button type="button" data-w="1180" aria-pressed="true">Desktop</button>
      <button type="button" data-w="820" aria-pressed="false">Tablet</button>
      <button type="button" data-w="390" aria-pressed="false">Phone</button>
    </div>
    <div class="grp" id="tgrp" role="group" aria-label="Theme">
      <button type="button" data-t="light" aria-pressed="true">Light</button>
      <button type="button" data-t="dark" aria-pressed="false">Dark</button>
      <button type="button" data-t="both" aria-pressed="false">Both</button>
    </div>
    <div class="bx-grp" id="pgrp" role="group" aria-label="Input">
      <button type="button" data-p="0" aria-pressed="true">Pointer</button>
      <button type="button" data-p="1" aria-pressed="false">Touch</button>
    </div>
    <span class="bx-note">Each frame is a real viewport, so the panel\u2019s own breakpoints fire as they do on a phone. Touch serves the kit\u2019s own <code>hover:none</code> rules, which a pointer never sees.</span>
  </div>
</div>
<div class="bx-wide"><div class="bx-stage" id="stage"></div></div>
<div class="page">

  <h2 class="sec">What is not in the kit</h2>
  <p class="count">{{len(house)}} classes are the house\u2019s. These {{len(rows)}} belong to one tool
  only – each is a component that cannot be refined from the kit, so this is the queue.
  The last column is read from the built markup and from the <code>el(tag, class)</code> helpers;
  a class a tool composes at run time can be alive without showing here, so a blank is worth a
  look rather than proof of dead code.</p>
  <table class="inv"><tr><th>Class</th><th>Defined in</th><th>Seen in the markup of</th></tr>
  {{inv}}
  </table>
</div>
<script>
  var W = 1180, T = 'light', P = false, stage = document.getElementById('stage');
  function frame(theme, w) {{
    var d = document.createElement('div'); d.className = 'bx-vp';
    d.innerHTML = '<p class="bx-cap">' + (theme === 'dark' ? 'Dark' : 'Light') + ' &middot; ' + w + 'px</p>' +
      '<iframe title="Components, ' + theme + ', ' + w + 'px" loading="lazy" src="specimen.html?theme=' +
      theme + (P ? '&touch=1' : '') + '" style="width:' + w + 'px"></iframe>';
    return d;
  }}
  function draw() {{
    stage.textContent = '';
    // both frames keep the width you asked for: squeezing them to fit side by side would put a
    // desktop pair under the 860px breakpoint and quietly show the tablet layout instead.
    if (T === 'both') {{ stage.append(frame('light', W), frame('dark', W)); }}
    else stage.append(frame(T, W));
  }}
  function wire(id, attr, set) {{
    document.getElementById(id).addEventListener('click', function (e) {{
      var b = e.target.closest('button'); if (!b) return;
      [].forEach.call(this.querySelectorAll('button'), function (x) {{
        x.setAttribute('aria-pressed', String(x === b)); }});
      set(b.dataset[attr]); draw();
    }});
  }}
  wire('wgrp', 'w', function (v) {{ W = +v; }});
  wire('tgrp', 't', function (v) {{ T = v; }});
  wire('pgrp', 'p', function (v) {{ P = v === '1'; }});
  draw();
</script>
</body></html>
'''

    # The bench's chrome shares a document with the kit, so a class name it borrows is a name
    # the kit can style: .stage cost an afternoon, because the kit pins it to inset:0 and the
    # frames covered the controls. Every class the bench draws for itself is bx-*, and this says
    # so out loud rather than leaving it to be rediscovered.
    chrome = set(re.findall(r'\.(bx[\w-]*|page|lede|sec|inv|count)\s*[,{ ]', page))
    clash = sorted(c for c in chrome if c in house)
    if clash:
        raise SystemExit(f"ui/kit: the bench's own chrome borrows house class(es): "
                         f"{', '.join(clash)}. Rename to bx-*.")

    out = os.path.join(docs, 'ui', 'kit')
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page)
    open(os.path.join(out, 'specimen.html'), 'w', encoding='utf-8').write(specimen)
    return len(house), len(rows)
