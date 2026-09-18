/* The non-split half of the Undr Drift reveal contract (new-12 lib/reveal.js):
   `.reveal-image` gets `.is-loaded` once EVERY <img> inside it has pixels
   (one image for a plate, three for an arch icon); the CSS plays the reveal
   only when BOTH .is-inview and .is-loaded are present (A5). */
export function initImageLoad(root = document) {
  root.querySelectorAll('.reveal-image:not([data-load-init])').forEach((box) => {
    box.setAttribute('data-load-init', '');
    const imgs = [...box.querySelectorAll('img')];
    let pending = imgs.length;
    const one = () => { pending -= 1; if (pending <= 0) box.classList.add('is-loaded'); };
    if (!pending) return box.classList.add('is-loaded');
    imgs.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) one();
      else {
        img.addEventListener('load', one, { once: true });
        img.addEventListener('error', one, { once: true });
      }
    });
  });
}
