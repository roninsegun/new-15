/* The non-split half of the Undr Drift reveal contract (new-12 lib/reveal.js):
   `.reveal-image` gets `.is-loaded` once its <img> has pixels; the CSS plays
   reveal-clip only when BOTH .is-inview and .is-loaded are present (A5). */
export function initImageLoad(root = document) {
  root.querySelectorAll('.reveal-image:not([data-load-init])').forEach((box) => {
    box.setAttribute('data-load-init', '');
    const img = box.querySelector('img');
    const loaded = () => box.classList.add('is-loaded');
    if (!img) return loaded();
    if (img.complete && img.naturalWidth > 0) loaded();
    else {
      img.addEventListener('load', loaded, { once: true });
      img.addEventListener('error', loaded, { once: true });
    }
  });
}
