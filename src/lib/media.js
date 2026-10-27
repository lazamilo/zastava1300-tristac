import { gsap } from './gsap.js';
import { setVar, px, lerp } from './vars.js';

/**
 * Shared media scene.
 *
 * The plate's resting box is the about-section slot. Every beat owns one link of a chained
 * transform (see .plate in style.css), applied innermost first:
 *   hero  → scales/offsets the slot box up to a full-bleed cover
 *   track → follows the slot while the about section scrolls
 *   cat   → glides the plate to the lower centre of the catalog
 *   pres  → grows the car into the full-width presentation
 * Each link is linear in scroll, so all motion is reversible and tied to scroll position.
 */

const state = {
  hero: 1, // 1 = full-bleed, 0 = in slot
  track: 0, // 0..1 along the track beat
  cat: 0, // 0..1 along the glide beat
  pres: 0, // 0..1 along the present beat
  cut: 0, // 0 = footage, 1 = transparent cut-out
  blur: 0
};

let dom = null;
let beats = null;
let geo = null;

export function initMedia(elements) {
  dom = elements;
  return { build: buildMedia, render, state };
}

// Derives every link's endpoint values from the measured rects.
function computeGeometry(b) {
  const { cover, slot, glide, present } = b.rects;
  const vw = b.vw;
  const vh = b.vhCover || b.vh;
  const trackDist = b.track[1] - b.track[0];

  const heroS = cover.w / slot.w;
  const catS = glide.w / slot.w;
  const presS = present.w / glide.w;

  // Viewport clip of the full-bleed plate, expressed in the plate's local (unscaled) units.
  const clip = {
    t: Math.max(0, -cover.y) / heroS,
    b: Math.max(0, cover.y + cover.h - vh) / heroS,
    l: Math.max(0, -cover.x) / heroS,
    r: Math.max(0, cover.x + cover.w - vw) / heroS
  };

  return {
    slot,
    trackDist,
    hero: { x: cover.x - slot.x, y: cover.y - slot.y, s: heroS },
    cat: { x: glide.x - slot.x, y: glide.y - slot.y + trackDist * catS, s: catS },
    glideLocal: { x: glide.x - slot.x, y: glide.y - slot.y },
    pres: { s: presS, x: present.x - slot.x, y: present.y - slot.y },
    clip,
    lite: Boolean(b.lite)
  };
}

// Writes the current state into the chained-transform custom properties (memoised).
export function render() {
  if (!dom || !geo) return;
  const el = dom.plate;
  const { hero, cat, pres, clip, trackDist, glideLocal } = geo;

  const hs = lerp(1, hero.s, state.hero);
  setVar(el, '--hero-x', px(hero.x * state.hero));
  setVar(el, '--hero-y', px(hero.y * state.hero));
  setVar(el, '--hero-s', hs);

  setVar(el, '--track-y', px(-trackDist * state.track));

  const cs = lerp(1, cat.s, state.cat);
  setVar(el, '--cat-x', px(cat.x * state.cat));
  // cat.y already compensates for the scaled track offset, so it interpolates linearly from 0.
  setVar(el, '--cat-y', px(cat.y * state.cat));
  setVar(el, '--cat-s', cs);

  // pres maps the glide rect onto the present rect: p' = p * ps + t
  const ps = lerp(1, pres.s, state.pres);
  const tx = (pres.x - glideLocal.x * pres.s) * state.pres;
  const ty = (pres.y - glideLocal.y * pres.s) * state.pres;
  setVar(el, '--pres-x', px(tx));
  setVar(el, '--pres-y', px(ty));
  setVar(el, '--pres-s', ps);

  setVar(el, '--cut', state.cut);
  // The hero scrim on the plate eases out as the plate shrinks toward the about slot.
  setVar(el, '--scrim', Math.min(1, state.hero * 1.25));
  // Lite devices use a fixed radius and no clip-path (see style.css), so nothing else to write.
  if (geo.lite) return;

  // Visual radius grows from 0 (full-bleed) to the plate radius; compensate the total scale.
  const total = hs * cs * ps;
  const radius = (dom.radius ?? 16) * (1 - state.hero) * (1 - state.cut);
  setVar(el, '--plate-r', px(radius / total));
  setVar(el, '--clip-t', px(clip.t * state.hero));
  setVar(el, '--clip-r', px(clip.r * state.hero));
  setVar(el, '--clip-b', px(clip.b * state.hero));
  setVar(el, '--clip-l', px(clip.l * state.hero));
  setVar(el, '--plate-blur', px(state.blur));
}

function scrub(beat, vars) {
  return {
    ...vars,
    ease: 'none',
    onUpdate: render,
    scrollTrigger: { start: beat[0], end: beat[1], scrub: true, invalidateOnRefresh: false }
  };
}

// Creates the plate's scroll timelines. Call inside a gsap.context so a refresh reverts them.
export function buildMedia(b) {
  beats = b;
  geo = computeGeometry(b);
  const el = dom.plate;
  const { slot, fit } = b.rects;

  setVar(el, '--base-x', px(slot.x));
  setVar(el, '--base-y', px(slot.y));
  setVar(el, '--base-w', px(slot.w));
  setVar(dom.row, '--row-x', px(fit.x));
  setVar(dom.row, '--row-y', px(fit.y));
  setVar(dom.row, '--row-w', px(fit.w));
  dom.radius = parseFloat(getComputedStyle(el).getPropertyValue('--radius-plate')) || 16;

  Object.assign(state, { hero: 1, track: 0, cat: 0, pres: 0, cut: 0, blur: 0 });

  gsap.fromTo(state, { hero: 1 }, scrub(b.hero, { hero: 0, immediateRender: true }));
  gsap.fromTo(state, { track: 0 }, scrub(b.track, { track: 1, immediateRender: false }));
  gsap.fromTo(state, { cat: 0 }, scrub(b.glide, { cat: 1, immediateRender: false }));
  gsap.fromTo(state, { cut: 0 }, scrub(b.dissolve, { cut: 1, immediateRender: false }));
  gsap.fromTo(state, { pres: 0 }, scrub(b.present, { pres: 1, immediateRender: false }));
  // A soft blur pulse while the plate leaves the about section (skipped on lite devices).
  if (!b.lite) gsap.timeline(scrub(b.glide, {}))
    .fromTo(state, { blur: 0 }, { blur: b.mobile ? 2 : 4, ease: 'none', duration: 0.5, onUpdate: render })
    .to(state, { blur: 0, ease: 'none', duration: 0.5, onUpdate: render });

  render();
  return geo;
}

export function getGeometry() {
  return geo;
}

export function getBeats() {
  return beats;
}
