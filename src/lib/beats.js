import { viewport, env, clamp } from './vars.js';

// Document offset that ignores transforms (sticky/pinned parents are measured at rest).
function docTop(el) {
  let top = 0;
  let node = el;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent;
  }
  return top;
}

function docLeft(el) {
  let left = 0;
  let node = el;
  while (node) {
    left += node.offsetLeft;
    node = node.offsetParent;
  }
  return left;
}

/**
 * Calculates the full scroll choreography from live viewport measurements.
 * Every beat is a [start, end] pair in scroll pixels; every rect is in viewport pixels.
 */
export function computeBeats(dom) {
  const { w: vw, h: vh } = viewport;
  const mobile = env.mobile;
  const { about, slot, catalog, pin, statement, widgets } = dom;

  const aboutTop = docTop(about);
  const catTop = docTop(catalog);

  // Hero → about: the plate lands in the slot exactly when the about section reaches the top.
  const heroEnd = Math.max(1, aboutTop);
  const slotRect = {
    x: docLeft(slot),
    y: docTop(slot) - heroEnd,
    w: slot.offsetWidth
  };
  slotRect.h = slotRect.w * 9 / 16;

  // Cover rect: the 16:9 plate scaled to fill the viewport at its tallest (toolbars collapsed).
  const vhCover = viewport.cover || vh;
  const coverW = Math.max(vw, vhCover * 16 / 9);
  const cover = { x: (vw - coverW) / 2, y: (vhCover - coverW * 9 / 16) / 2, w: coverW, h: coverW * 9 / 16 };

  // About: the plate tracks the slot, then glides toward the lower centre of the catalog.
  const glideStart = clamp(heroEnd + vh * (mobile ? 0.55 : 0.4), heroEnd + 1, catTop - vh * 0.35);
  const glideEnd = catTop;
  const glideW = vw * (mobile ? 0.58 : 0.34);
  const glide = { x: (vw - glideW) / 2, y: vh * (mobile ? 0.6 : 0.56), w: glideW, h: glideW * 9 / 16 };

  // Present: the car grows into the space between the header and the rental cards.
  const pinTop = docTop(pin);
  const widgetsTop = docTop(widgets) - pinTop;
  const headerSpace = mobile ? 64 : 84;
  const availH = Math.max(120, widgetsTop - headerSpace - (mobile ? 8 : 16));
  // Photo views fit the free area exactly; the transparent cut-out may overscale slightly,
  // since its canvas carries empty margins around the car.
  const fitW = Math.min(vw - (mobile ? 16 : 48), availH * 16 / 9);
  const fitH = fitW * 9 / 16;
  const fit = { x: (vw - fitW) / 2, y: headerSpace + (availH - fitH) / 2, w: fitW, h: fitH };
  const over = Math.min(mobile ? 1.12 : 1.14, (vw - (mobile ? 0 : 24)) / fitW);
  const presentW = fitW * over;
  const present = {
    x: (vw - presentW) / 2,
    y: fit.y + (fitH - presentW * 9 / 16) / 2 + fitH * 0.04,
    w: presentW,
    h: presentW * 9 / 16
  };

  const statementBottom = docTop(statement) - pinTop + statement.offsetHeight;

  return {
    vw,
    vh,
    vhCover,
    mobile,
    lite: env.lite,
    hero: [0, heroEnd],
    heroText: [0, heroEnd * 0.55],
    polFlip: heroEnd * 0.62,
    track: [heroEnd, glideStart],
    aboutOut: [glideStart - vh * 0.1, glideEnd - vh * 0.15],
    glide: [glideStart, glideEnd],
    words: [catTop - vh * 0.55, catTop + vh * 0.75],
    dissolve: [catTop + vh * 0.1, catTop + vh * 0.5],
    statementOut: [catTop + vh * 0.85, catTop + vh * 1.2],
    present: [catTop + vh * 0.85, catTop + vh * 1.55],
    widgets: [catTop + vh * 1.45, catTop + vh * 2.05],
    rects: { cover, slot: slotRect, glide, present, fit },
    statementBottom
  };
}
