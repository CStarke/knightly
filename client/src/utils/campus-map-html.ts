import { Brand, Radius, Spacing } from '@/constants/theme';
import { campusMapSvg } from '@/data/campus-map-svg';

/**
 * Builds a self-contained viewer using trusted theme colors and the bundled SVG.
 * Returns HTML for the web iframe or native WebView; no network request is needed.
 *
 * @param theme - App theme colors. This viewer currently uses background and text.
 * @returns A complete HTML document with styles, map artwork, and controls.
 *
 * Use this with the bundled map and app theme, not untrusted HTML or user input.
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

/* Keep scrolling inside the map controls rather than moving the whole page. */
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

/* Pointer handlers below manage dragging and pinching inside this area. */
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

/* Keep the controls large enough to press on a touch screen. */
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

/* Show keyboard users which button currently has focus. */
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
  <!-- tabindex lets keyboard users focus the map and use its shortcuts. -->
  <div
    id="viewport"
    tabindex="0"
    role="region"
    aria-label="Campus building map. Use the zoom controls to read building labels."
  >${campusMapSvg}</div>

  <!-- Controls are outside the drag area so button presses do not drag the map. -->
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

// The original map is 1224 by 792 SVG units, centered at (612, 396).
// These dimensions must match the bundled SVG if the source map is replaced.
// scale = 1 means the whole map fits; scale = 8 is the maximum zoom.
let scale = 1;
let cx = 612;
let cy = 396;

// fit() adjusts these dimensions to match the shape of the viewing area.
let baseW = 1224;
let baseH = 792;

// Store up to two active pointers by ID, with positions in screen pixels.
const pointers = new Map();

function draw() {
  // A smaller visible rectangle makes the map appear more enlarged.
  const w = baseW / scale;
  const h = baseH / scale;

  // Keep the map reachable when users drag beyond an edge.
  // If an entire dimension already fits, keep that dimension centered.
  cx = w >= 1224
    ? 612
    : Math.max(w / 2, Math.min(1224 - w / 2, cx));

  cy = h >= 792
    ? 396
    : Math.max(h / 2, Math.min(792 - h / 2, cy));

  // SVG viewBox takes the visible rectangle's left, top, width, and height.
  svg.setAttribute(
    'viewBox',
    [cx - w / 2, cy - h / 2, w, h].join(' ')
  );

  // The percentage is relative to Fit map, not the PDF's printed size.
  document.getElementById('level').textContent =
    Math.round(scale * 100) + '%';

  minus.disabled = scale <= 1;
  plus.disabled = scale >= 8;
}

function fit() {
  const r = area.getBoundingClientRect();

  // The viewer may briefly have no size while the screen is loading.
  if (!r.width || !r.height) {
    return;
  }

  // Match the screen's proportions while keeping the entire map visible.
  // Different screen shapes can leave empty space around the map.
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
  // The same maximum zoom of 8 applies on unusually shaped screens.
  scale = Math.min(
    8,
    Math.max(1, baseW / 1224, baseH / 792)
  );

  draw();
}

// Step 2: Anchor zoom at the cursor or pinch midpoint rather than jumping away.
function zoom(factor, x, y) {
  const r = area.getBoundingClientRect();

  // Convert the pointer position to an offset from the viewport center.
  // Missing coordinates mean zoom around the center, as the buttons do.
  const px = x === undefined
    ? 0
    : (x - r.left) / r.width - 0.5;

  const py = y === undefined
    ? 0
    : (y - r.top) / r.height - 0.5;

  // Keep zoom between the whole-map view and eight times that scale.
  const next = Math.max(1, Math.min(8, scale * factor));

  // Move the center to keep the point under the pointer in the same place.
  // draw() may limit this movement when the map reaches an edge.
  cx += px * baseW * (1 / scale - 1 / next);
  cy += py * baseH * (1 / scale - 1 / next);

  scale = next;
  draw();
}

// Each button press multiplies or divides the current scale by 1.5.
plus.onclick = () => zoom(1.5);
minus.onclick = () => zoom(1 / 1.5);
document.getElementById('fit').onclick = fit;

area.addEventListener(
  'wheel',
  (e) => {
    // Use the wheel for map zoom rather than scrolling the page.
    e.preventDefault();

    // Turn wheel movement into a positive zoom multiplier.
    // Negative movement zooms in; positive movement zooms out.
    zoom(Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY);
  },

  // Allow preventDefault() to cancel the browser's usual wheel behavior.
  { passive: false }
);

// Step 3: One pointer drags; two pointers pan and pinch together.
function sample() {
  // Called only while at least one pointer is being tracked.
  const a = Array.from(pointers.values());

  return {
    // Average positions to get one pointer's location or two pointers' midpoint.
    x: a.reduce((sum, p) => sum + p.x, 0) / a.length,
    y: a.reduce((sum, p) => sum + p.y, 0) / a.length,

    // The distance between two pointers tells us how much a pinch changes.
    distance: a.length === 2
      ? Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y)
      : 0,
  };
}

area.addEventListener('pointerdown', (e) => {
  // Only the main mouse button should begin dragging.
  if (e.pointerType === 'mouse' && e.button !== 0) {
    return;
  }

  // Two pointers are enough for pinching; ignore additional touches.
  if (pointers.size >= 2) {
    return;
  }

  pointers.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY,
  });

  // Keep receiving movement if the pointer leaves the map while dragging.
  area.setPointerCapture(e.pointerId);

  // Give the map focus so its keyboard shortcuts can be used.
  area.focus();
});

area.addEventListener('pointermove', (e) => {
  // Ignore hovering and pointers that did not start a map interaction.
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

  // Convert movement from screen pixels to map units at the current zoom.
  // Subtract it from the center so the artwork follows the user's drag.
  cx -= (after.x - before.x) * baseW / scale / r.width;
  cy -= (after.y - before.y) * baseH / scale / r.height;

  if (before.distance > 0 && after.distance > 0) {
    // Fingers moving apart enlarge the map; moving together makes it smaller.
    zoom(
      after.distance / before.distance,
      after.x,
      after.y
    );
  } else {
    draw();
  }
});

// Stop tracking pointers when released, canceled, or no longer captured.
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
  // Move by about 60 screen pixels per arrow-key press, regardless of zoom.
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

  // Prevent handled keys from also scrolling the browser page.
  e.preventDefault();
  draw();
});

// Fill the viewing area when opening the map or resizing the screen.
// Resizing resets the center and zoom instead of preserving the previous view.
new ResizeObserver(fillViewport).observe(area);
fillViewport();
</script>
</body>
</html>`;
}