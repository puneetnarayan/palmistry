// Static reference content for the Guide tab: simple schematic (non-photo)
// hand diagrams showing where each of the four detected lines sits, plus a
// caption explaining what this app's own vocabulary (short/long,
// straight/curved) means for that line. Purely educational - not tied to
// any particular user's uploaded photo or detection result.

const HAND_OUTLINE_D =
  "M150 380 C 90 380 70 320 70 260 L 70 120 C 70 105 82 95 95 95 C 108 95 118 108 118 122 " +
  "L 118 200 L 122 200 L 122 60 C 122 45 134 34 148 34 C 162 34 174 45 174 60 L 174 200 " +
  "L 178 200 L 178 50 C 178 36 189 25 203 25 C 217 25 228 36 228 50 L 228 200 L 232 200 " +
  "L 232 90 C 232 78 242 68 254 68 C 266 68 276 78 276 90 L 276 250 C 276 320 230 380 150 380 Z";

const LINES = [
  {
    key: "heart",
    label: "Heart Line",
    linePath: "M 95 205 C 130 193, 190 193, 248 213",
    caption:
      "Runs beneath the fingers, from the pinky side toward the index finger. Traditionally, longer reads as open and expressive; shorter as more selective with affection. A curved path reads as visibly emotional; a straighter path as more direct.",
  },
  {
    key: "head",
    label: "Head Line",
    linePath: "M 100 232 C 150 238, 200 240, 250 232",
    caption:
      "Crosses the middle of the palm, starting near the thumb side. Traditionally, length is linked to how much you deliberate before acting; shape (straight vs. curved) to a logical vs. imaginative thinking style.",
  },
  {
    key: "life",
    label: "Life Line",
    linePath: "M 118 198 C 98 230, 88 285, 100 345",
    caption:
      "Arcs around the base of the thumb. Despite the name, it isn't traditionally linked to lifespan — it's read as energy and vitality instead. A wider curve reads as outgoing; a tighter one as more cautious.",
  },
  {
    key: "fate",
    label: "Fate Line",
    linePath: "M 176 352 C 173 300, 170 250, 167 206",
    caption:
      "Runs vertically up the center of the palm toward the middle finger. Not everyone has a strong one. Length and continuity are traditionally linked to having a clear, consistent sense of direction.",
  },
];

function svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function buildDiagram(line) {
  const svg = svgEl("svg", { viewBox: "0 0 300 400", class: "guide-diagram-svg", "aria-hidden": "true" });
  svg.appendChild(
    svgEl("path", {
      d: HAND_OUTLINE_D,
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "3",
      class: "guide-hand-outline",
    })
  );
  svg.appendChild(
    svgEl("path", {
      d: line.linePath,
      fill: "none",
      stroke: "var(--accent)",
      "stroke-width": "5",
      "stroke-linecap": "round",
    })
  );
  return svg;
}

export function renderGuide(container) {
  container.innerHTML = "";
  for (const line of LINES) {
    const card = document.createElement("div");
    card.className = "guide-card";

    const h3 = document.createElement("h3");
    h3.textContent = line.label;

    const diagramWrap = document.createElement("div");
    diagramWrap.className = "guide-diagram";
    diagramWrap.appendChild(buildDiagram(line));

    const p = document.createElement("p");
    p.textContent = line.caption;

    card.appendChild(h3);
    card.appendChild(diagramWrap);
    card.appendChild(p);
    container.appendChild(card);
  }
}
