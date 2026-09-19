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

// Renders the base photo plus per-zone line overlays. With no highlightKey,
// every detected zone is drawn in its own color (the default overview).
// With a highlightKey, that zone's area is boxed and its lines drawn bold
// while every other zone fades out, so a click on "Heart Line" in the text
// can point at exactly where on the hand that reading came from.
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

  for (const [name, f] of Object.entries(features)) {
    if (name === highlightKey || !f.detected) continue;
    strokeSegments(ctx, f.segments, ZONE_COLORS[name] || "#ffffff", 2, 0.25);
  }

  const active = features[highlightKey];
  if (active?.rect) {
    const color = ZONE_COLORS[highlightKey] || "#ffffff";
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(active.rect.x, active.rect.y, active.rect.width, active.rect.height);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(active.rect.x, active.rect.y, active.rect.width, active.rect.height);
    ctx.setLineDash([]);
  }
  if (active?.detected) {
    strokeSegments(ctx, active.segments, ZONE_COLORS[highlightKey] || "#ffffff", 4, 1);
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
