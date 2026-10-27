// Central media configuration. Every remote asset used by the site lives here,
// so the footage and photography can be replaced without touching the animation code.

// Generated with Higgsfield for this project; originals were re-encoded (JPEG/WebP, 2048 px)
// and re-hosted on Higgsfield's CDN, which serves them with CORS and byte-range support.
const HF = 'https://d8j0ntlcm91z4.cloudfront.net/user_39B7FztCK80gP9MfXjW2amX13nA';
const CDN = 'https://d2ol7oe51mr4n9.cloudfront.net/user_39B7FztCK80gP9MfXjW2amX13nA';

// Authentic reference photograph of a Zastava 1300/1500-body sedan, used only
// if a generated asset fails to load. Wikimedia Commons, CC BY-SA 4.0.
export const FALLBACK_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Zastava_1300_Luxe_F.jpg/1920px-Zastava_1300_Luxe_F.jpg';

export const MEDIA = {
  // Scroll-scrubbed hero footage: a Higgsfield push-in shot, trimmed, reversed and re-encoded
  // (H.264 1920x1080, keyframe every 12 frames, no audio, faststart). Set to null to use the poster only.
  video: `${CDN}/5c08cd2b-ea3c-4df7-8bce-c72096e2775a.mp4`,
  // Same footage for phones and tablets: 1280x720, every frame a keyframe so scroll seeks
  // decode a single frame instead of a group of 12.
  videoMobile: `${CDN}/2d51fe99-0683-4685-bb34-2ee6cd41aeb8.mp4`,
  // First frame of the hero footage.
  poster: `${CDN}/8fb7dab6-d1e3-4bf5-89c9-f3fe53a6a567.jpg`,
  // Wide front three-quarter photograph matching the end of the footage.
  end: `${CDN}/f075cbc4-5f37-4567-88c7-69a79e357595.jpg`,
  // Transparent cut-out of the footage's exact last frame (same 16:9 canvas, WebP with alpha).
  cut: `${CDN}/a97702a2-71ba-48f7-9c44-eec69eed8e2f.webp`,
  // Close, low front three-quarter still of the same car.
  still: `${CDN}/dde75e1f-948d-4745-b54a-128fc556736a.jpg`,
  // Additional views of the same vehicle.
  side: `${CDN}/a82ae377-5b77-4c84-926a-135644fb1c43.jpg`,
  rear: `${CDN}/aab2c9e0-1529-46da-9455-0e3fe131f3ef.jpg`,
  interior: `${CDN}/04450dd8-33a6-4010-b096-96a9acedcac7.jpg`,
  detail: `${CDN}/767a2d58-87fe-43eb-bda4-d9ce98b280e8.jpg`
};

export const MEDIA_ALT = {
  poster: 'Detalj restaurirane Zastave 1300: dupli okrugli farovi, hromirani branik i točak, pri zalasku sunca',
  end: 'Zastava 1300 u boji slonovače, prednji tri-četvrtinski profil',
  cut: 'Zastava 1300 — Tristać, izolovan prikaz automobila',
  still: 'Prednji deo Zastave 1300 iz niskog ugla, pri zalasku sunca',
  side: 'Bočni profil Zastave 1300 u kaldrmisanoj ulici starog grada',
  rear: 'Zastava 1300 iz zadnjeg tri-četvrtinskog ugla, na putu oivičenom drvećem',
  interior: 'Enterijer Zastave 1300 sa volanom i kontrolnom tablom u boji karoserije',
  detail: 'Detalj prednjeg dela: dupli okrugli farovi, hromirana maska i branik'
};

export const CREDITS =
  'Vizuali automobila su kreirani za TRISTAĆ. Rezervna fotografija: Wikimedia Commons, „Zastava 1300 Luxe“, CC BY-SA 4.0.';

// Resolves a media key to a URL, falling back to the authentic reference photograph.
export function mediaUrl(key) {
  return MEDIA[key] || FALLBACK_IMAGE;
}

// Loads an image element safely: on failure it swaps to the fallback photograph once.
export function loadImage(img, key, { alt = true } = {}) {
  return new Promise((resolve) => {
    if (!img) return resolve(false);
    let fellBack = false;
    const done = (ok) => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      resolve(ok);
    };
    const onLoad = () => done(!fellBack);
    const onError = () => {
      if (!fellBack && img.src !== FALLBACK_IMAGE) {
        fellBack = true;
        img.classList.add('is-fallback');
        img.src = FALLBACK_IMAGE;
        return;
      }
      done(false);
    };
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    if (alt && !img.getAttribute('alt') && MEDIA_ALT[key]) img.alt = MEDIA_ALT[key];
    img.src = mediaUrl(key);
    if (img.complete && img.naturalWidth) done(true);
  });
}
