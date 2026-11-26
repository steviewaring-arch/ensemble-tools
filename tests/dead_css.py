# -*- coding: utf-8 -*-
"""CSS and markup that have lost each other.

Two ways a tool rots, both of which have bitten us:

  - a rule whose markup went away. Nine of these had built up: a swatch set, a
    GIF panel, a card subtitle, three parts of an illustration, and two rules left
    behind when the colour pickers were merged.
  - a specimen in the kit that the house does not style. The States card kept
    Rubato's old `.st-box`/`.st-btn` stepper after its CSS was deleted, so the
    specimen drew a native browser button - and the house check reported it as a
    stray every run. The kit has to show what the house builds, or it is lying.

A class with no rule anywhere is not checked in a tool: plenty are honest JS
hooks (`.stColor`, `.edgeR`, `.markbtn`) that never wanted styling. In the kit
there is no such excuse - everything in the specimen is there to be looked at.

Read from source, never from the built page, so it says nothing about whether a
component happens to be on screen.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'ui', 'kit'))
import make

# A class we keep deliberately, with the reason. Empty is the goal.
KEEP = {}


def classes_used(text):
    """Every class name the source can put on an element."""
    out = set()
    for m in re.finditer(r'class(?:Name)?\s*=\s*["\'`]([^"\'`]*)', text):
        out.update(re.findall(r'[\w-]+', m.group(1)))
    for m in re.finditer(r'classList\.\w+\(([^)]*)\)', text):
        out.update(re.findall(r'["\']([\w-]+)["\']', m.group(1)))
    for m in re.finditer(r'\bel\(\s*["\'][\w-]+["\']\s*,\s*["\']([\w -]+)["\']', text):
        out.update(m.group(1).split())
    return out


def mentioned(c, text):
    """Is this exact class named anywhere? A hyphen is a word character here,
    so `.tp-b` must not match inside `tp-bg`, and `pp-stop` must still match
    inside `class="pp-stop${first}"`."""
    return re.search(r'(?<![\w-])' + re.escape(c) + r'(?![\w-])', text) is not None


def source_of(tool):
    text = ''
    d = os.path.join(ROOT, tool)
    for root, _, fs in os.walk(d):
        if '__pycache__' in root:
            continue
        for f in sorted(fs):
            if f.endswith(('.js', '.html')):
                text += open(os.path.join(root, f), encoding='utf-8', errors='ignore').read()
    return text


def main():
    house = set()
    for p in make.CSS:
        house |= make.classes_in(p)
    shared = ''
    for f in sorted(os.listdir(os.path.join(ROOT, 'shared'))):
        if f.endswith('.js'):
            shared += open(os.path.join(ROOT, 'shared', f), encoding='utf-8').read()
    kit_body = open(os.path.join(ROOT, 'ui', 'kit', 'body.html'), encoding='utf-8').read()

    bad = []
    for tool, cssp in sorted(make.TOOLS.items()):
        own = make.classes_in(cssp) - house
        src = source_of(tool.lower())
        for c in sorted(own):
            if c in KEEP:
                continue
            # shared code can put a class on any tool's element
            if not mentioned(c, src) and not mentioned(c, shared):
                bad.append(f'{tool}: .{c} is styled in {cssp} and named nowhere else')

    # the kit's specimen must only show components the house actually styles
    for c in sorted(classes_used(kit_body)):
        if c in KEEP or c in house or c.startswith('bx-'):
            continue
        bad.append(f'the kit: .{c} is in the specimen and the house does not style it')

    for line in bad:
        print('  ' + line)
    print(f'\n{"FAIL" if bad else "PASS"}: {len(bad)} '
          f'{"class has" if len(bad) == 1 else "classes have"} lost the other half.')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
