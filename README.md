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
index.html          Page markup, mode selector, upload UI, results UI
css/styles.css       Styling
js/upload.js         File validation, image loading, EXIF-stripping via canvas
js/analysis.js       OpenCV.js-based line detection and feature extraction
js/rules-data.js      Interpretation text, keyed by line + trait bin
js/rules.js           Rules engine: bins features and looks up interpretation text
js/main.js            UI wiring / orchestration
vercel.json          Static hosting config
```

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
