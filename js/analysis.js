// Heuristic line detection using OpenCV.js (Canny edges + probabilistic Hough transform).
// This is NOT medically or scientifically validated hand analysis — it is a rough
// image-processing approximation used purely to drive the traditional-palmistry
// rules engine in rules.js.

const OPENCV_URL = "https://docs.opencv.org/4.9.0/opencv.js";
let openCvLoadPromise = null;

function loadOpenCVScript() {
  if (openCvLoadPromise) return openCvLoadPromise;

  openCvLoadPromise = new Promise((resolve, reject) => {
    if (window.cv && window.cv.Mat) return resolve(window.cv);

    const script = document.createElement("script");
    script.src = OPENCV_URL;
    script.async = true;
    script.onerror = () => {
      openCvLoadPromise = null;
      reject(new Error("Could not load the vision engine. Check your connection and try again."));
    };
    // opencv.js calls this once its WASM runtime has finished initializing.
    window.Module = { onRuntimeInitialized: () => resolve(window.cv) };
    document.head.appendChild(script);
  });

  return openCvLoadPromise;
}

function waitForOpenCV(timeoutMs = 20000) {
  return Promise.race([
    loadOpenCVScript(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Vision engine timed out loading. Please try again.")), timeoutMs)
    ),
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

export async function analyzePalm(canvas, onProgress) {
  onProgress?.("Loading vision engine…");
  const cv = await waitForOpenCV();

  onProgress?.("Preprocessing image…");
  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

  const enhanced = new cv.Mat();
  cv.equalizeHist(blurred, enhanced);

  onProgress?.("Detecting lines…");
  const edges = new cv.Mat();
  cv.Canny(enhanced, edges, 40, 120);

  const lines = new cv.Mat();
  const minLineLength = Math.round(Math.min(canvas.width, canvas.height) * 0.08);
  const maxLineGap = Math.round(Math.min(canvas.width, canvas.height) * 0.02);
  cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 40, minLineLength, maxLineGap);

  const w = canvas.width;
  const h = canvas.height;
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
      features[name] = { detected: false, segmentCount: 0, totalLength: 0, lengthRatio: 0 };
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

  const annotated = document.createElement("canvas");
  annotated.width = w;
  annotated.height = h;
  const actx = annotated.getContext("2d");
  actx.drawImage(canvas, 0, 0);
  const colors = { heart: "#ff6b8b", head: "#6bb7ff", life: "#7ee3c9", fate: "#ffcf6b" };
  for (const [name, zone] of Object.entries(ZONES)) {
    const f = features[name];
    if (!f.detected) continue;
    actx.strokeStyle = colors[name];
    actx.lineWidth = 3;
    for (const s of f.segments) {
      actx.beginPath();
      actx.moveTo(s.x1, s.y1);
      actx.lineTo(s.x2, s.y2);
      actx.stroke();
    }
  }

  const detectedCount = Object.values(features).filter((f) => f.detected).length;
  const confidence = detectedCount / Object.keys(ZONES).length;

  [src, gray, blurred, enhanced, edges, lines].forEach((m) => m.delete());

  return { features, annotated, confidence };
}
