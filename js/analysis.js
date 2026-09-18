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

function drawAnnotation(canvas, features) {
  const annotated = document.createElement("canvas");
  annotated.width = canvas.width;
  annotated.height = canvas.height;
  const ctx = annotated.getContext("2d");
  ctx.drawImage(canvas, 0, 0);

  for (const [name, f] of Object.entries(features)) {
    if (!f.detected) continue;
    ctx.strokeStyle = ZONE_COLORS[name] || "#ffffff";
    ctx.lineWidth = 3;
    for (const s of f.segments) {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
  }

  return annotated;
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
        const annotated = drawAnnotation(canvas, msg.features);
        resolve({ features: msg.features, confidence: msg.confidence, annotated });
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
