export const CONSTRAINTS = {
  minDim: 800,
  maxBytes: 10 * 1024 * 1024,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
};

export function validateFile(file) {
  if (!CONSTRAINTS.acceptedTypes.includes(file.type)) {
    return { ok: false, message: "Unsupported file type. Use JPEG, PNG or WebP." };
  }
  if (file.size > CONSTRAINTS.maxBytes) {
    return { ok: false, message: "File is too large. Max size is 10MB." };
  }
  return { ok: true };
}

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => reject(new Error("Could not read image file."));
    img.src = url;
  });
}

export function validateDimensions(img) {
  if (img.naturalWidth < CONSTRAINTS.minDim || img.naturalHeight < CONSTRAINTS.minDim) {
    return {
      ok: false,
      message: `Image is too small (${img.naturalWidth}x${img.naturalHeight}). Use at least ${CONSTRAINTS.minDim}x${CONSTRAINTS.minDim}px.`,
    };
  }
  return { ok: true };
}

// Redraw onto a canvas to strip EXIF/metadata before any further processing.
export function sanitizeToCanvas(img, maxDim = 1200) {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}
