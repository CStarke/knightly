import { Brand, Radius, Spacing } from '@/constants/theme';
import { campusMapSvg } from '@/data/campus-map-svg';

/**
 * Builds a self-contained viewer using trusted theme colors and the bundled SVG.
 * Returns HTML for the web iframe or native WebView; no network request is needed.
 */
export function createCampusMapHtml(theme: {
  background: string;
  backgroundElement: string;
  text: string;
  border: string;
}): string {
  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">

<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  height: 100%;
  overflow: hidden;
}

body {
  display: flex;
  flex-direction: column;
  font-family: system-ui;
  background: ${theme.background};
  color: ${theme.text};
}

p {
  margin: ${Spacing.two}px ${Spacing.three}px;
  font-size: 13px;
  line-height: 1.4;
}

/* Let the map use the full width beneath the floating controls. */
.map-layout {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

#viewport {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
}

#viewport:active {
  cursor: grabbing;
}

svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* Float a compact panel over the map instead of reserving a sidebar. */
nav {
  position: absolute;
  right: ${Spacing.three}px;
  bottom: ${Spacing.three}px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${Spacing.one}px;
  padding: ${Spacing.one}px;
  max-height: calc(100% - ${Spacing.five}px);
  overflow-y: auto;
  background: ${Brand.pureWhite};
  border: 1px solid ${Brand.maroon};
  border-radius: ${Radius.md}px;
}

button {
  flex-shrink: 0;
  width: 48px;
  min-height: 48px;
  border: none;
  border-radius: ${Radius.sm}px;
  background: ${Brand.pureWhite};
  color: ${Brand.maroon};
  font: inherit;
  font-size: 26px;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: ${Brand.goldSoft};
}

button:focus-visible {
  outline: 2px solid ${Brand.maroon};
  outline-offset: -3px;
}

button:disabled {
  opacity: 0.4;
  cursor: default;
}

#level {
  color: ${Brand.maroon};
  font-size: 11px;
  font-weight: 600;
}

#fit {
  background: ${Brand.gold};
  color: ${Brand.charcoal};
  font-size: 12px;
  font-weight: 700;
}

#fit:hover {
  background: ${Brand.goldSoft};
}
</style>
</head>

<body>
<p>
  Drag to move. Pinch or use + / − to zoom.
  Keyboard: arrows to move; + / − to zoom; 0 to fit.
</p>

<div class="map-layout">
  <div
    id="viewport"
    tabindex="0"
    role="region"
    aria-label="Campus building map. Use the zoom controls to read building labels."
  >${campusMapSvg}</div>

  <nav aria-label="Map zoom controls">
    <button id="in" aria-label="Zoom in">+</button>
    <output id="level" aria-live="polite">100%</output>
    <button id="out" aria-label="Zoom out">−</button>
    <button id="fit" aria-label="Fit entire map">Fit map</button>
  </nav>
</div>

<p>
  Source: Calvin University campus-map PDF.
  Building map; emergency-phone locations are not shown.
</p>

<script>
// Step 1: Keep the map in SVG coordinates so zoom redraws paths and letters sharply.
const area = document.getElementById('viewport');
const svg = area.querySelector('svg');
const minus = document.getElementById('out');
const plus = document.getElementById('in');

let scale = 1;
let cx = 612;
let cy = 396;
let baseW = 1224;
let baseH = 792;

const pointers = new Map();

function draw() {
  const w = baseW / scale;
  const h = baseH / scale;

  // Keep the map reachable when users drag beyond an edge.
  cx = w >= 1224
    ? 612
    : Math.max(w / 2, Math.min(1224 - w / 2, cx));

  cy = h >= 792
    ? 396
    : Math.max(h / 2, Math.min(792 - h / 2, cy));

  svg.setAttribute(
    'viewBox',
    [cx - w / 2, cy - h / 2, w, h].join(' ')
  );

  document.getElementById('level').textContent =
    Math.round(scale * 100) + '%';

  minus.disabled = scale <= 1;
  plus.disabled = scale >= 8;
}

function fit() {
  const r = area.getBoundingClientRect();

  if (!r.width || !r.height) {
    return;
  }

  const ratio = r.width / r.height;
  baseW = Math.max(1224, 792 * ratio);
  baseH = baseW / ratio;

  scale = 1;
  cx = 612;
  cy = 396;

  draw();
}

function fillViewport() {
  // First calculate the map dimensions for the available screen space.
  fit();

  // Enlarge the map until it fills both dimensions without stretching it.
  // Some edges may be outside the view; Fit map still shows everything.
  scale = Math.min(
    8,
    Math.max(1, baseW / 1224, baseH / 792)
  );

  draw();
}

// Step 2: Anchor zoom at the cursor or pinch midpoint rather than jumping away.
function zoom(factor, x, y) {
  const r = area.getBoundingClientRect();

  const px = x === undefined
    ? 0
    : (x - r.left) / r.width - 0.5;

  const py = y === undefined
    ? 0
    : (y - r.top) / r.height - 0.5;

  const next = Math.max(1, Math.min(8, scale * factor));

  cx += px * baseW * (1 / scale - 1 / next);
  cy += py * baseH * (1 / scale - 1 / next);

  scale = next;
  draw();
}

plus.onclick = () => zoom(1.5);
minus.onclick = () => zoom(1 / 1.5);
document.getElementById('fit').onclick = fit;

area.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    zoom(Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY);
  },
  { passive: false }
);

// Step 3: One pointer drags; two pointers pan and pinch together.
function sample() {
  const a = Array.from(pointers.values());

  return {
    x: a.reduce((sum, p) => sum + p.x, 0) / a.length,
    y: a.reduce((sum, p) => sum + p.y, 0) / a.length,
    distance: a.length === 2
      ? Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y)
      : 0,
  };
}

area.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) {
    return;
  }

  if (pointers.size >= 2) {
    return;
  }

  pointers.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY,
  });

  area.setPointerCapture(e.pointerId);
  area.focus();
});

area.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) {
    return;
  }

  const before = sample();

  pointers.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY,
  });

  const after = sample();
  const r = area.getBoundingClientRect();

  cx -= (after.x - before.x) * baseW / scale / r.width;
  cy -= (after.y - before.y) * baseH / scale / r.height;

  if (before.distance > 0 && after.distance > 0) {
    zoom(
      after.distance / before.distance,
      after.x,
      after.y
    );
  } else {
    draw();
  }
});

for (const event of [
  'pointerup',
  'pointercancel',
  'lostpointercapture',
]) {
  area.addEventListener(event, (e) => {
    pointers.delete(e.pointerId);
  });
}

area.addEventListener('keydown', (e) => {
  const step = 60;
  const r = area.getBoundingClientRect();

  if (e.key === '+' || e.key === '=') {
    zoom(1.5);
  } else if (e.key === '-') {
    zoom(1 / 1.5);
  } else if (e.key === '0') {
    fit();
  } else if (e.key === 'ArrowLeft') {
    cx -= step * baseW / scale / r.width;
  } else if (e.key === 'ArrowRight') {
    cx += step * baseW / scale / r.width;
  } else if (e.key === 'ArrowUp') {
    cy -= step * baseH / scale / r.height;
  } else if (e.key === 'ArrowDown') {
    cy += step * baseH / scale / r.height;
  } else {
    return;
  }

  e.preventDefault();
  draw();
});

// Fill the viewing area when opening the map or resizing the screen.
new ResizeObserver(fillViewport).observe(area);
fillViewport();
</script>
</body>
</html>`;
}