import { validateFile, loadImageFromFile, validateDimensions, sanitizeToCanvas } from "./upload.js";
import { analyzePalm } from "./analysis.js";
import { generateReading } from "./rules.js";

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const cameraInput = document.getElementById("camera-input");
const chooseFileBtn = document.getElementById("choose-file-btn");
const takePhotoBtn = document.getElementById("take-photo-btn");
const previewWrap = document.getElementById("preview-wrap");
const previewImg = document.getElementById("preview-img");
const validationMsg = document.getElementById("validation-msg");
const analyzeBtn = document.getElementById("analyze-btn");
const progressSection = document.getElementById("progress-section");
const progressText = document.getElementById("progress-text");
const resultsSection = document.getElementById("results-section");
const annotatedCanvas = document.getElementById("annotated-canvas");
const readingText = document.getElementById("reading-text");
const lowConfidenceMsg = document.getElementById("low-confidence-msg");
const resetBtn = document.getElementById("reset-btn");
const uploadSection = document.getElementById("upload-section");
const errorSection = document.getElementById("error-section");
const errorText = document.getElementById("error-text");
const retryBtn = document.getElementById("retry-btn");
const errorResetBtn = document.getElementById("error-reset-btn");
const unsupportedBanner = document.getElementById("unsupported-banner");

let sanitizedCanvas = null;

function checkBrowserSupport() {
  const supported =
    typeof window.WebAssembly === "object" &&
    typeof window.File === "function" &&
    typeof window.FileReader === "function" &&
    typeof HTMLCanvasElement.prototype.getContext === "function";
  if (!supported) {
    unsupportedBanner.classList.remove("hidden");
    chooseFileBtn.disabled = true;
    takePhotoBtn.disabled = true;
  }
  return supported;
}
checkBrowserSupport();

function showError(message) {
  uploadSection.classList.add("hidden");
  progressSection.classList.add("hidden");
  resultsSection.classList.add("hidden");
  errorText.textContent = message;
  errorSection.classList.remove("hidden");
}

function showValidation(result) {
  validationMsg.textContent = result.ok ? "Looks good — ready to analyze." : result.message;
  validationMsg.className = "validation-msg " + (result.ok ? "ok" : "error");
  analyzeBtn.disabled = !result.ok;
}

async function handleFile(file) {
  const typeCheck = validateFile(file);
  previewWrap.classList.remove("hidden");

  if (!typeCheck.ok) {
    previewImg.removeAttribute("src");
    showValidation(typeCheck);
    return;
  }

  let img, url;
  try {
    ({ img, url } = await loadImageFromFile(file));
  } catch (e) {
    showValidation({ ok: false, message: e.message });
    return;
  }

  previewImg.src = url;

  const dimCheck = validateDimensions(img);
  if (!dimCheck.ok) {
    showValidation(dimCheck);
    sanitizedCanvas = null;
    return;
  }

  sanitizedCanvas = sanitizeToCanvas(img);
  showValidation({ ok: true });
}

chooseFileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});
takePhotoBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  cameraInput.click();
});

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") fileInput.click();
});

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) handleFile(file);
});
cameraInput.addEventListener("change", () => {
  const file = cameraInput.files[0];
  if (file) handleFile(file);
});

async function runAnalysis() {
  if (!sanitizedCanvas) return;

  uploadSection.classList.add("hidden");
  errorSection.classList.add("hidden");
  progressSection.classList.remove("hidden");
  resultsSection.classList.add("hidden");
  progressText.textContent = "Loading vision engine…";

  try {
    const { features, annotated, confidence } = await analyzePalm(sanitizedCanvas, (msg) => {
      progressText.textContent = msg;
    });

    annotatedCanvas.width = annotated.width;
    annotatedCanvas.height = annotated.height;
    annotatedCanvas.getContext("2d").drawImage(annotated, 0, 0);

    const reading = generateReading(features, confidence);
    renderReading(reading);

    lowConfidenceMsg.classList.toggle("hidden", confidence >= 0.4);

    progressSection.classList.add("hidden");
    resultsSection.classList.remove("hidden");
  } catch (err) {
    progressSection.classList.add("hidden");
    showError(err.message || "An unexpected error occurred during analysis.");
  }
}

analyzeBtn.addEventListener("click", runAnalysis);
retryBtn.addEventListener("click", runAnalysis);

errorResetBtn.addEventListener("click", () => {
  errorSection.classList.add("hidden");
  resetBtn.click();
});

function renderReading(reading) {
  readingText.innerHTML = "";
  const intro = document.createElement("p");
  intro.textContent = reading.intro;
  readingText.appendChild(intro);

  const note = document.createElement("p");
  note.style.fontSize = "0.8rem";
  note.style.opacity = "0.8";
  note.textContent = reading.confidenceNote;
  readingText.appendChild(note);

  for (const section of reading.sections) {
    const block = document.createElement("div");
    block.className = "line-block";
    const h3 = document.createElement("h3");
    h3.textContent = section.label;
    const p = document.createElement("p");
    p.textContent = section.text;
    block.appendChild(h3);
    block.appendChild(p);
    readingText.appendChild(block);
  }

  if (reading.summary) {
    const summaryBlock = document.createElement("div");
    summaryBlock.className = "line-block summary-block";
    const h3 = document.createElement("h3");
    h3.textContent = "Overall";
    const p = document.createElement("p");
    p.textContent = reading.summary;
    summaryBlock.appendChild(h3);
    summaryBlock.appendChild(p);
    readingText.appendChild(summaryBlock);
  }
}

resetBtn.addEventListener("click", () => {
  sanitizedCanvas = null;
  fileInput.value = "";
  cameraInput.value = "";
  previewWrap.classList.add("hidden");
  previewImg.removeAttribute("src");
  validationMsg.textContent = "";
  analyzeBtn.disabled = true;
  resultsSection.classList.add("hidden");
  uploadSection.classList.remove("hidden");
});

// Mode selector — Option A is functional; Option B is a disabled placeholder for now.
document.getElementById("mode-client").addEventListener("click", (e) => {
  document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
  e.currentTarget.classList.add("active");
});
