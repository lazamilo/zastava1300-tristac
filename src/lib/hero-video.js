import { MEDIA } from '../config.js';
import { env } from './vars.js';

/**
 * Scroll-scrubbed hero footage. Every source exposes the same api:
 * { ok, duration, ready, seek(progress 0..1), destroy }. Nothing autoplays, loops or shows controls.
 *
 * Desktop: the video element with coalesced seeks.
 * Lite devices (phones, tablets): a pre-decoded image sequence drawn on a canvas, because
 * mobile browsers deliver video seeks late. Falls back to the light mobile video if it fails.
 */
export function initHeroVideo(video, plate, { timeout = 7000 } = {}) {
  const api = {
    ok: false,
    duration: 0,
    ready: Promise.resolve(false),
    seek: () => {},
    destroy: () => {}
  };
  if (!video) return api;

  const canFrames = typeof createImageBitmap === 'function' && typeof fetch === 'function';
  if (env.lite && MEDIA.frames && canFrames) {
    api.ready = initFrames(api, video, plate, timeout).then((ok) => ok || initVideo(api, video, plate, timeout, true));
    return api;
  }
  api.ready = initVideo(api, video, plate, timeout, env.lite);
  return api;
}

// Loads the sprite sheets, decodes them off the main thread and swaps the video for a canvas.
function initFrames(api, video, plate, timeout) {
  const { sheets, cols, rows, count, width, height, fps } = MEDIA.frames;
  const perSheet = cols * rows;
  const canvas = document.createElement('canvas');
  canvas.className = 'plate__frames';
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  let bitmaps = [];
  let last = -1;

  const drawFrame = (i, alpha) => {
    const sheet = bitmaps[Math.floor(i / perSheet)];
    const local = i % perSheet;
    ctx.globalAlpha = alpha;
    ctx.drawImage(sheet, (local % cols) * width, Math.floor(local / cols) * height, width, height, 0, 0, width, height);
  };

  // Draws the frame for a 0..1 progress, blending into the next frame so motion stays continuous.
  const seek = (progress) => {
    const f = Math.min(1, Math.max(0, progress)) * (count - 1);
    if (Math.abs(f - last) < 0.01) return;
    last = f;
    const i = Math.floor(f);
    const blend = f - i;
    drawFrame(i, 1);
    if (blend > 0.02 && i + 1 < count) drawFrame(i + 1, blend);
  };

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeout * 2);

    Promise.all(sheets.map((url) =>
      fetch(url, { mode: 'cors' })
        .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
        .then((blob) => createImageBitmap(blob))))
      .then((decoded) => {
        if (settled) return decoded.forEach((b) => b.close?.());
        bitmaps = decoded;
        video.replaceWith(canvas);
        api.ok = true;
        api.duration = count / (fps || 24);
        api.seek = seek;
        api.destroy = () => {
          bitmaps.forEach((b) => b.close?.());
          bitmaps = [];
        };
        seek(0);
        plate?.classList.add('is-video-ready');
        finish(true);
      })
      .catch(() => finish(false));
  });
}

// Video element with coalesced seeks: while one seek is in flight, only the latest requested
// time is kept and applied once the browser reports `seeked`.
function initVideo(api, video, plate, timeout, lite) {
  const src = (lite && MEDIA.videoMobile) || MEDIA.video;
  let objectUrl = null;
  if (!src || !video.isConnected || !video.canPlayType('video/mp4')) {
    plate?.classList.add('is-video-off');
    video.remove();
    return Promise.resolve(false);
  }

  let seeking = false;
  let pending = null;
  let last = -1;

  const apply = () => {
    if (pending === null) return;
    const t = pending;
    pending = null;
    if (Math.abs(t - last) < 0.001) return;
    seeking = true;
    last = t;
    try {
      if (typeof video.fastSeek === 'function' && Math.abs(t - video.currentTime) > 1.5) video.fastSeek(t);
      else video.currentTime = t;
    } catch {
      seeking = false;
    }
  };

  const onSeeked = () => {
    seeking = false;
    plate?.classList.add('is-video-ready');
    if (pending !== null) apply();
  };

  const onError = () => {
    api.ok = false;
    plate?.classList.remove('is-video-ready');
    plate?.classList.add('is-video-off');
  };

  video.addEventListener('seeked', onSeeked);
  video.addEventListener('error', onError);

  // Seeks to a 0..1 progress of the footage.
  api.seek = (progress) => {
    if (!api.ok || !api.duration) return;
    const p = Math.min(1, Math.max(0, progress));
    pending = p * Math.max(0, api.duration - 0.04);
    if (!seeking) apply();
  };

  api.destroy = () => {
    video.removeEventListener('seeked', onSeeked);
    video.removeEventListener('error', onError);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener('loadeddata', onData);
      api.ok = ok;
      if (!ok) onError();
      resolve(ok);
    };
    const onData = () => {
      api.duration = video.duration || 0;
      finish(Number.isFinite(api.duration) && api.duration > 0);
    };
    const timer = setTimeout(() => finish(video.readyState >= 2 && video.duration > 0), lite ? timeout * 2 : timeout);
    video.addEventListener('loadeddata', onData);
    video.addEventListener('error', () => finish(false), { once: true });
    video.muted = true;
    video.autoplay = false;
    video.loop = false;
    video.controls = false;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    // On lite devices the small file is downloaded whole first, so scroll seeks never wait on
    // the network; if that fails it streams like on desktop.
    const load = (url) => {
      video.src = url;
      video.load();
    };
    if (!lite || typeof fetch !== 'function') return load(src);
    fetch(src, { mode: 'cors' })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        load(objectUrl);
      })
      .catch(() => load(src));
  });
}
