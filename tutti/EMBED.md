# Tutti on weareensemble.co.uk

Two Squarespace code blocks embed Tutti from GitHub Pages. Paste each one in place
of the code block that's on that page now. Nothing else on either page needs to
change.

## 1. Overview page – weareensemble.co.uk/tutti

Tutti sits on the page as a framed object: rounded, with a hairline edge, on the
page's own grey. It is sized to the visitor's window (between 640 and 960 px tall),
so the whole tool, including Export at the bottom, is in view once it's scrolled to.

```html
<iframe src="https://steviewaring-arch.github.io/ensemble-tools/tutti/?embed"
  title="Tutti – halftones by Ensemble" allow="camera" loading="lazy"
  style="display:block;width:100%;height:780px;height:clamp(640px,calc(100dvh - 120px),960px);border:0;"></iframe>
```

## 2. Full-screen page – weareensemble.co.uk/tutti/app

Tutti fills the space under the site's header, edge to edge, with no frame.

```html
<iframe src="https://steviewaring-arch.github.io/ensemble-tools/tutti/?app"
  title="Tutti – halftones by Ensemble" allow="camera"
  style="display:block;width:100%;height:calc(100vh - 88px);height:calc(100dvh - 88px);border:0;"></iframe>
```

## How it works

- **`?embed` and `?app`** are the only difference between the two. In an iframe,
  Tutti frames itself unless its address has `?app` (`shared/UI.md`, Embedded). On
  its own, outside an iframe, it always fills the window.
- **Updates arrive by themselves.** Each push to `main` redeploys GitHub Pages;
  browsers may keep their copy for up to 10 minutes. If a page still shows the old
  version after that, it's that browser's cache – reload the page while holding
  Shift.
- **The two heights.** Each is given twice: the first is a fallback for browsers
  that don't know `dvh`. `88px` is the site's header on the full-screen page; change
  it if the header changes.
- **Camera:** `allow="camera"` lets Camera work inside the embed. The browser
  still asks the visitor first.
- **Light by default.** Tutti opens light for everyone, and remembers dark only for
  someone who chooses it.
- **Page copy:** the overview page's heading still says Tutti 6.0. It's now 6.1.
