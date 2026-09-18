// Runs OpenCV.js off the main thread so a slow network or heavy computation
// never freezes the page. Classic (non-module) worker so importScripts works
// with opencv.js's UMD build.

const OPENCV_URL = "https://docs.opencv.org/4.9.0/opencv.js";
let cvReadyPromise = null;

function loadOpenCV() {
  if (cvReadyPromise) return cvReadyPromise;

  cvReadyPromise = new Promise((resolve, reject) => {
    if (self.cv && self.cv.Mat) return resolve(self.cv);

    self.Module = {
      onRuntimeInitialized: () => resolve(self.cv),
    };

    try {
      importScripts(OPENCV_URL);
    } catch (err) {
      cvReadyPromise = null;
      reject(new Error("Could not load the vision engine. Check your connection and try again."));
    }
  });

  return cvReadyPromise;
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
  ]);
}

// Zones are expressed as fractional boxes [x0,y0,x1,y1] over the analysis canvas,
// approximating where each classical line tends to sit on a right hand, palm facing up,
// fingers pointing up. This is a coarse heuristic, not hand-geometry detection.
const ZONES = {
  heart: { box: [0.1, 0.12, 0.95, 0.32], angleRange: [-20, 20] },
  head: { box: [0.08, 0.32, 0.85, 0.55], angleRange: [-15, 15] },
  life: { box: [0.15, 0.25, 0.55, 0.85], angleRange: [40, 90] },
  fate: { box: [0.35, 0.15, 0.65, 0.9], angleRange: [70, 110] },
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

function inBox(x, y, box, w, h) {
  return x >= box[0] * w && x <= box[2] * w && y >= box[1] * h && y <= box[3] * h;
}

function angleInRange(angle, range) {
  return angle >= range[0] && angle <= range[1];
}

function detectLines(cv, imageData) {
  const { width: w, height: h } = imageData;
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

  const enhanced = new cv.Mat();
  cv.equalizeHist(blurred, enhanced);

  const edges = new cv.Mat();
  cv.Canny(enhanced, edges, 40, 120);

  const lines = new cv.Mat();
  const minLineLength = Math.round(Math.min(w, h) * 0.08);
  const maxLineGap = Math.round(Math.min(w, h) * 0.02);
  cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 40, minLineLength, maxLineGap);

  const segments = [];
  for (let i = 0; i < lines.rows; i++) {
    const [x1, y1, x2, y2] = lines.data32S.slice(i * 4, i * 4 + 4);
    segments.push({ x1, y1, x2, y2, angle: segmentAngleDeg(x1, y1, x2, y2), length: segmentLength(x1, y1, x2, y2) });
  }

  const features = {};
  for (const [name, zone] of Object.entries(ZONES)) {
    const matches = segments.filter((s) => {
      const midX = (s.x1 + s.x2) / 2;
      const midY = (s.y1 + s.y2) / 2;
      return inBox(midX, midY, zone.box, w, h) && angleInRange(s.angle, zone.angleRange);
    });

    if (matches.length === 0) {
      features[name] = { detected: false, segmentCount: 0, totalLength: 0, lengthRatio: 0, segments: [] };
      continue;
    }

    const totalLength = matches.reduce((sum, s) => sum + s.length, 0);
    const zoneDiag = Math.hypot((zone.box[2] - zone.box[0]) * w, (zone.box[3] - zone.box[1]) * h);
    features[name] = {
      detected: true,
      segmentCount: matches.length,
      totalLength,
      lengthRatio: Math.min(1, totalLength / zoneDiag),
      segments: matches,
    };
  }

  const detectedCount = Object.values(features).filter((f) => f.detected).length;
  const confidence = detectedCount / Object.keys(ZONES).length;

  [src, gray, blurred, enhanced, edges, lines].forEach((m) => m.delete());

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
