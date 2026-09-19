// Main-thread orchestrator: hands the heavy OpenCV.js work off to analysis.worker.js
// so a slow network or slow computation never freezes the page.

let worker = null;
let requestCounter = 0;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./analysis.worker.js", import.meta.url));
  }
  return worker;
}

const ZONE_COLORS = { heart: "#ff6b8b", head: "#6bb7ff", life: "#7ee3c9", fate: "#ffcf6b" };

function strokeSegments(ctx, segments, color, lineWidth, alpha) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = alpha;
  for (const s of segments) {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawDimmedOthers(ctx, features, highlightKey) {
  for (const [name, f] of Object.entries(features)) {
    if (name === highlightKey || !f.detected) continue;
    strokeSegments(ctx, f.segments, ZONE_COLORS[name] || "#ffffff", 2, 0.25);
  }
}

// Renders the base photo plus per-zone line overlays. With no highlightKey,
// every detected zone is drawn in its own color (the default overview). With
// a highlightKey, that zone's raw detected fragments are drawn bold while
// every other zone fades out.
export function renderAnnotation(baseCanvas, features, highlightKey = null) {
  const canvas = document.createElement("canvas");
  canvas.width = baseCanvas.width;
  canvas.height = baseCanvas.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(baseCanvas, 0, 0);

  if (!highlightKey) {
    for (const [name, f] of Object.entries(features)) {
      if (!f.detected) continue;
      strokeSegments(ctx, f.segments, ZONE_COLORS[name] || "#ffffff", 3, 1);
    }
    return canvas;
  }

  drawDimmedOthers(ctx, features, highlightKey);
  const active = features[highlightKey];
  if (active?.detected) {
    strokeSegments(ctx, active.segments, ZONE_COLORS[highlightKey] || "#ffffff", 4, 1);
  }

  return canvas;
}

// Zones whose crease runs mostly top-to-bottom get ordered by y when
// stitching fragments into a path; the mostly-horizontal ones by x.
const VERTICAL_ZONES = new Set(["life", "fate"]);

function collectEndpoints(segments) {
  const points = [];
  for (const s of segments) {
    points.push({ x: s.x1, y: s.y1 });
    points.push({ x: s.x2, y: s.y2 });
  }
  return points;
}

function dedupeClose(points, minDist = 4) {
  const out = [];
  for (const p of points) {
    if (!out.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < minDist)) out.push(p);
  }
  return out;
}

function orderPoints(zoneKey, points) {
  const axis = VERTICAL_ZONES.has(zoneKey) ? "y" : "x";
  return [...points].sort((a, b) => a[axis] - b[axis]);
}

// Draws a smooth curve through an ordered set of points using the
// midpoint-quadratic technique: each pair of points is joined via a
// quadratic curve through their midpoint, which avoids sharp corners
// without needing a full spline implementation.
function drawSmoothPath(ctx, points, color, lineWidth) {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
}

// Best-effort reconstruction of a single continuous crease from Hough's
// fragmented segments: pool every fragment's endpoints, order them along
// the zone's expected direction, and draw a smoothed path through them.
// This is a heuristic, not true curve tracing - on noisy detections it can
// still look rough or jump around, since it has no way to tell a stray
// fragment from a real part of the crease.
export function renderTrace(baseCanvas, features, highlightKey) {
  const canvas = document.createElement("canvas");
  canvas.width = baseCanvas.width;
  canvas.height = baseCanvas.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(baseCanvas, 0, 0);

  drawDimmedOthers(ctx, features, highlightKey);

  const active = features[highlightKey];
  if (active?.detected) {
    const points = dedupeClose(orderPoints(highlightKey, collectEndpoints(active.segments)));
    drawSmoothPath(ctx, points, ZONE_COLORS[highlightKey] || "#ffffff", 4);
  }

  return canvas;
}

export function analyzePalm(canvas, onProgress) {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const requestId = ++requestCounter;

    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const handleMessage = (event) => {
      const msg = event.data;
      if (msg.requestId !== requestId) return;

      if (msg.type === "progress") {
        onProgress?.(msg.message);
      } else if (msg.type === "done") {
        w.removeEventListener("message", handleMessage);
        w.removeEventListener("error", handleWorkerError);
        const annotated = renderAnnotation(canvas, msg.features);
        resolve({ features: msg.features, confidence: msg.confidence, annotated, baseCanvas: canvas });
      } else if (msg.type === "error") {
        w.removeEventListener("message", handleMessage);
        w.removeEventListener("error", handleWorkerError);
        reject(new Error(msg.message));
      }
    };

    const handleWorkerError = () => {
      w.removeEventListener("message", handleMessage);
      w.removeEventListener("error", handleWorkerError);
      reject(new Error("Vision engine crashed unexpectedly. Please try again."));
    };

    w.addEventListener("message", handleMessage);
    w.addEventListener("error", handleWorkerError, { once: true });
    w.postMessage({ requestId, imageData });
  });
}
