# Tutti on weareensemble.co.uk

Two Squarespace code blocks embed Tutti from GitHub Pages. Paste each one in place
of the code block that's on that page now. Nothing else on either page needs to
change.

## 1. Overview page – weareensemble.co.uk/tutti

Tutti sits on the page as a framed object: rounded, with a hairline edge, on the
page's own grey. It is sized to the visitor's window (between 600 and 960 px tall,
leaving room for the site's header), so the whole tool, including Export at the
bottom, is in view once it's scrolled to.

```html
<iframe src="https://steviewaring-arch.github.io/ensemble-tools/tutti/?embed"
  title="Tutti – halftones by Ensemble" allow="camera" loading="lazy"
  style="display:block;width:100%;height:760px;height:clamp(600px,calc(100dvh - 140px),960px);border:0;"></iframe>
```

## 2. Full-screen page – weareensemble.co.uk/tutti/app

Tutti fills the space under the site's header, edge to edge, with no frame. The
site's header isn't one height – Tutti starts about 50 px down on a laptop, 82 on a
phone and 129 on a tablet – so a line of script measures where it starts and fills
the rest of the window – Export at the bottom is always in view. Without the script it falls back
to the laptop size.

```html
<iframe id="tutti-app" src="https://steviewaring-arch.github.io/ensemble-tools/tutti/?app"
  title="Tutti – halftones by Ensemble" allow="camera"
  style="display:block;width:100%;height:calc(100vh - 50px);height:calc(100dvh - 50px);border:0;"></iframe>
<script>
(function(){var f=document.getElementById('tutti-app');if(!f)return;
  function fit(){var t=f.getBoundingClientRect().top+window.scrollY;f.style.height=Math.max(480,window.innerHeight-t)+'px';}
  fit();window.addEventListener('resize',fit);window.addEventListener('load',fit);})();
</script>
```

## How it works

- **`?embed` and `?app`** are the only difference between the two. In an iframe,
  Tutti frames itself unless its address has `?app` (`shared/UI.md`, Embedded). On
  its own, outside an iframe, it always fills the window.
- **Updates arrive by themselves.** Each push to `main` redeploys GitHub Pages;
  browsers may keep their copy for up to 10 minutes. If a page still shows the old
  version after that, it's that browser's cache – reload the page while holding
  Shift.
- **Heights.** The overview's height is given twice: the first is a fallback for
  browsers that don't know `dvh`. The full-screen page measures itself, so a
  change to the site's header needs nothing here.
- **Tried on the real pages** (10 Oct): both blocks were dropped into
  weareensemble.co.uk/tutti and /tutti/app in a browser tab at laptop, tablet and
  phone sizes before handing over.
- **Camera:** `allow="camera"` lets Camera work inside the embed. The browser
  still asks the visitor first.
- **Light by default.** Tutti opens light for everyone, and remembers dark only for
  someone who chooses it.
- **Page copy:** the overview page's heading still says Tutti 6.0. It's now 6.1.
