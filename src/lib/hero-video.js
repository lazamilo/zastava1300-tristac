import { MEDIA } from '../config.js';

/**
 * Scroll-scrubbed hero footage with coalesced seeks: while one seek is in flight, only the
 * latest requested time is kept and applied once the browser reports `seeked`.
 * The video never autoplays, loops or shows controls.
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

  const src = MEDIA.video;
  if (!src || !video.canPlayType('video/mp4')) {
    plate?.classList.add('is-video-off');
    video.remove();
    return api;
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

  api.ready = new Promise((resolve) => {
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
    const timer = setTimeout(() => finish(video.readyState >= 2 && video.duration > 0), timeout);
    video.addEventListener('loadeddata', onData);
    video.addEventListener('error', () => finish(false), { once: true });
    video.muted = true;
    video.autoplay = false;
    video.loop = false;
    video.controls = false;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.src = src;
    video.load();
  });

  api.destroy = () => {
    video.removeEventListener('seeked', onSeeked);
    video.removeEventListener('error', onError);
  };

  return api;
}
