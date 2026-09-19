// Runs OpenCV.js off the main thread so a slow network or heavy computation
// never freezes the page. Classic (non-module) worker so importScripts works
// with opencv.js's UMD build. The build is vendored into /vendor/opencv.js and
// served from this app's own origin, rather than fetched from an external CDN,
// so it isn't subject to third-party network slowness or filtering.

const OPENCV_URL = new URL("../vendor/opencv.js", location.href).href;
let cvReadyPromise = null;

function loadOpenCV() {
  if (cvReadyPromise) return cvReadyPromise;

  cvReadyPromise = (async () => {
    if (self.cv && typeof self.cv.Mat === "function") return self.cv;

    try {
      importScripts(OPENCV_URL);
    } catch (err) {
      cvReadyPromise = null;
      throw new Error("Could not load the vision engine. Check your connection and try again.");
    }

    // This build's UMD wrapper sets self.cv to a Promise that resolves once
    // the WASM runtime has finished initializing.
    self.cv = await self.cv;
    return self.cv;
  })();

  return cvReadyPromise;
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
  ]);
}

// Zones are expressed as fractional boxes [x0,y0,x1,y1] relative to the detected
// hand bounding box (not the full photo), approximating where each classical line
// tends to sit on a palm-up hand. This is a coarse heuristic, not true hand-pose
// detection, and assumes a roughly upright, unrotated hand.
const ZONES = {
  heart: { box: [0.05, 0.28, 0.95, 0.42], angleRange: [-25, 25] },
  head: { box: [0.05, 0.4, 0.85, 0.55], angleRange: [-20, 20] },
  life: { box: [0.05, 0.3, 0.55, 0.9], angleRange: [30, 90] },
  fate: { box: [0.35, 0.3, 0.65, 0.95], angleRange: [65, 90] },
};

function segmentAngleDeg(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg < -90) deg += 180;
  if (deg > 90) deg -= 180;
  return deg;
}

function segmentLength(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function inBox(x, y, box, origin, w, h) {
  return (
    x >= origin.x + box[0] * w &&
    x <= origin.x + box[2] * w &&
    y >= origin.y + box[1] * h &&
    y <= origin.y + box[3] * h
  );
}

function angleInRange(angle, range) {
  return angle >= range[0] && angle <= range[1];
}

// OpenCV.js's HoughLinesP result Mat can pack all N detected segments into a
// single row of N columns rather than N rows of 1 column, depending on build.
// Reading by total element count (not .rows) works regardless of that layout.
function readLineSegments(lines) {
  const count = (lines.data32S.length / 4) | 0;
  const segments = [];
  for (let i = 0; i < count; i++) {
    const [x1, y1, x2, y2] = lines.data32S.slice(i * 4, i * 4 + 4);
    segments.push({ x1, y1, x2, y2, angle: segmentAngleDeg(x1, y1, x2, y2), length: segmentLength(x1, y1, x2, y2) });
  }
  return segments;
}

// Finds the largest skin-colored region via YCrCb thresholding. Returns its
// bounding box plus an eroded version of the mask (shrunk inward so the
// hand's own silhouette edge - by far the strongest edge in most photos - is
// excluded from crease detection). Zones are matched relative to the box
// rather than the full photo, since a casual palm photo rarely fills the
// whole frame.
function detectHandRegion(cv, src, w, h) {
  const ycrcb = new cv.Mat();
  cv.cvtColor(src, ycrcb, cv.COLOR_RGBA2RGB);
  cv.cvtColor(ycrcb, ycrcb, cv.COLOR_RGB2YCrCb);

  const low = new cv.Mat(h, w, ycrcb.type(), [0, 133, 77, 0]);
  const high = new cv.Mat(h, w, ycrcb.type(), [255, 173, 127, 255]);
  const mask = new cv.Mat();
  cv.inRange(ycrcb, low, high, mask);

  const kernel = cv.Mat.ones(7, 7, cv.CV_8U);
  cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);
  cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let box = { x: 0, y: 0, width: w, height: h };
  let bestArea = 0;
  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);
    if (area > bestArea) {
      bestArea = area;
      box = cv.boundingRect(contour);
    }
    contour.delete();
  }

  const erodeKernel = cv.Mat.ones(15, 15, cv.CV_8U);
  const erodedMask = new cv.Mat();
  cv.erode(mask, erodedMask, erodeKernel);

  [ycrcb, low, high, mask, kernel, erodeKernel, hierarchy].forEach((m) => m.delete());
  contours.delete();

  // Fall back to the full frame if skin detection found nothing usable
  // (e.g. unusual lighting) rather than producing a degenerate zero-size box.
  if (bestArea < w * h * 0.02) {
    box = { x: 0, y: 0, width: w, height: h };
  }
  return { box, erodedMask };
}

function detectLines(cv, imageData) {
  const { width: w, height: h } = imageData;
  const src = cv.matFromImageData(imageData);

  const { box: handBox, erodedMask } = detectHandRegion(cv, src, w, h);

  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  // Black-hat morphology picks out thin dark ridges (palm creases) on a
  // lighter background (palm skin) - a much better fit than generic edge
  // detection, which mainly picks up the hand's own silhouette instead of
  // the low-contrast creases inside it.
  const handMinDim = Math.min(handBox.width, handBox.height);
  const kernelSize = Math.max(9, Math.round(handMinDim * 0.045)) | 1;
  const morphKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(kernelSize, kernelSize));
  const blackhat = new cv.Mat();
  cv.morphologyEx(gray, blackhat, cv.MORPH_BLACKHAT, morphKernel);

  // Zero out anything outside the eroded hand mask so background clutter and
  // the hand's silhouette edge can't be picked up as false creases.
  const masked = new cv.Mat();
  blackhat.copyTo(masked, erodedMask);

  const binary = new cv.Mat();
  cv.threshold(masked, binary, 25, 255, cv.THRESH_BINARY);
  const dilateKernel = cv.Mat.ones(2, 2, cv.CV_8U);
  cv.dilate(binary, binary, dilateKernel);

  const lines = new cv.Mat();
  const minLineLength = Math.max(10, Math.round(handMinDim * 0.065));
  const maxLineGap = Math.max(4, Math.round(handMinDim * 0.025));
  const houghThreshold = Math.max(8, Math.round(minLineLength * 0.9));
  cv.HoughLinesP(binary, lines, 1, Math.PI / 180, houghThreshold, minLineLength, maxLineGap);

  const margin = 5;
  const origin = { x: handBox.x - margin, y: handBox.y - margin };
  const boxW = handBox.width + margin * 2;
  const boxH = handBox.height + margin * 2;

  const segments = readLineSegments(lines).filter((s) => {
    const midX = (s.x1 + s.x2) / 2;
    const midY = (s.y1 + s.y2) / 2;
    return midX >= origin.x && midX <= origin.x + boxW && midY >= origin.y && midY <= origin.y + boxH;
  });

  const features = {};
  for (const [name, zone] of Object.entries(ZONES)) {
    const matches = segments.filter((s) => {
      const midX = (s.x1 + s.x2) / 2;
      const midY = (s.y1 + s.y2) / 2;
      return inBox(midX, midY, zone.box, origin, boxW, boxH) && angleInRange(s.angle, zone.angleRange);
    });

    if (matches.length === 0) {
      features[name] = { detected: false, segmentCount: 0, totalLength: 0, lengthRatio: 0, segments: [] };
      continue;
    }

    // The longest single matched segment approximates "how long the line
    // looks" much better than summing every matched fragment: a zone with
    // lots of short, noisy fragments would otherwise score as artificially
    // "long" just from noise volume, not from any one real crease.
    const totalLength = matches.reduce((sum, s) => sum + s.length, 0);
    const maxSegmentLength = matches.reduce((max, s) => Math.max(max, s.length), 0);
    const zoneDiag = Math.hypot((zone.box[2] - zone.box[0]) * boxW, (zone.box[3] - zone.box[1]) * boxH);
    features[name] = {
      detected: true,
      segmentCount: matches.length,
      totalLength,
      lengthRatio: Math.min(1, maxSegmentLength / zoneDiag),
      segments: matches,
    };
  }

  const detectedCount = Object.values(features).filter((f) => f.detected).length;
  const confidence = detectedCount / Object.keys(ZONES).length;

  [src, gray, morphKernel, blackhat, erodedMask, masked, binary, dilateKernel, lines].forEach((m) => m.delete());

  return { features, confidence };
}

self.onmessage = async (event) => {
  const { imageData, requestId } = event.data;

  try {
    self.postMessage({ requestId, type: "progress", message: "Loading vision engine…" });
    const cv = await withTimeout(loadOpenCV(), 20000, "Vision engine timed out loading. Please try again.");

    self.postMessage({ requestId, type: "progress", message: "Detecting lines…" });
    const { features, confidence } = detectLines(cv, imageData);

    self.postMessage({ requestId, type: "done", features, confidence });
  } catch (err) {
    self.postMessage({ requestId, type: "error", message: err.message || "Analysis failed." });
  }
};
