"""Helpers for the UI system (October 2026): Export and Presets live in sheets –
Export grows out of the island, Presets out of its capsule bottom right – so a
control in one is shut away until its sheet opens. These open the right sheet
first, as a person would. Harmless on builds without sheets (0.8.1, 0.9)."""
import time

FIND = """([n,ex])=>{n=n.toLowerCase();const m=[...document.querySelectorAll('.sheet button')].find(b=>{
  const t=(b.getAttribute('aria-label')||b.textContent||'').trim().toLowerCase();return ex?t===n:t.includes(n);});
  if(m&&window.ensembleUI)ensembleUI.reveal(m);}"""

def btn(page, name, exact=False):
    """page.get_by_role('button', name=…), with its sheet opened if it's in one."""
    page.evaluate(FIND, [name, exact]); time.sleep(0.05)
    return page.get_by_role('button', name=name, exact=exact)

def reveal(loc):
    """Open the sheet a located control is in (any locator that counts hidden elements)."""
    if loc.count():
        loc.first.evaluate("e=>window.ensembleUI&&ensembleUI.reveal(e)"); time.sleep(0.05)
    return loc

def sheet(page, name):
    page.evaluate("n=>window.ensembleUI&&ensembleUI.open(n)", name); time.sleep(0.5)
