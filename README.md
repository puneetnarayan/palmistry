# Palm Reader

A hand-scan upload app that generates a traditional, rule-based palmistry-style
reading. Palmistry is not scientifically validated — this app is for
entertainment/educational purposes and says so in the UI.

## Modes

- **Option A — Client-side (implemented):** everything runs in the browser.
  The uploaded photo is never sent anywhere. Line detection uses OpenCV.js
  (Canny edge detection + probabilistic Hough transform) and the result is
  matched against a rule-based interpretation engine.
- **Option B — Server-side (planned):** a Vercel serverless function will do
  heavier image processing and return structured results, enabling optional
  persistence. The mode selector in the UI already has a placeholder for it.

## Project structure

```
index.html               Page markup, mode selector, upload UI, results UI
css/styles.css            Styling
js/upload.js              File validation, image loading, EXIF-stripping via canvas
js/analysis.js            Main-thread orchestrator: spawns the worker, draws the annotated overlay
js/analysis.worker.js     Web Worker: loads OpenCV.js and runs line detection off the main thread
js/rules-data.js           Interpretation text, keyed by line + trait bin
js/rules.js                Rules engine: bins features and looks up interpretation text
js/main.js                 UI wiring / orchestration
vendor/opencv.js          Self-hosted OpenCV.js build (see "Updating OpenCV.js" below)
test/                     Unit tests (node --test) for rules.js and upload.js
vercel.json               Static hosting config
```

## Why a Web Worker + a vendored OpenCV.js

OpenCV.js is a large (~13MB) WASM library. Two problems came up running it
directly on the main thread from an external CDN:

1. Loading/initializing it on the main thread could block the UI long enough
   for the browser to show a "Page Unresponsive" dialog.
2. Fetching it from `docs.opencv.org` was slow or blocked entirely on some
   networks (e.g. restrictive institutional/school networks).

Both are addressed by: running OpenCV.js and all line detection inside
`js/analysis.worker.js` (a Web Worker, so it can never block the page), and
serving the OpenCV.js build from this app's own origin at `vendor/opencv.js`
instead of an external CDN.

### Updating OpenCV.js

The vendored file comes from the `@techstark/opencv-js` npm package (an
official-build redistribution). To update it:

```
npm install
npm run vendor:opencv
```

This copies `node_modules/@techstark/opencv-js/dist/opencv.js` to
`vendor/opencv.js`, which is what actually ships — the npm package itself
is a devDependency only, not loaded at runtime.

## Input requirements

- Formats: JPEG, PNG, WebP
- Max size: 10MB
- Min resolution: 800x800px
- One palm per photo, flat, fingers spread, even lighting, plain background

## Running locally

No build step is required.

```
npm run dev
```

Or open `index.html` with any static file server (a plain `file://` open will
not work because the JS is loaded as ES modules).

## Deployment

Push to GitHub and import the repo in Vercel — it will be detected as a
static site with no build command needed.
