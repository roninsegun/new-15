/* GSAP + plugins from the CDN globals (loaded with <script defer> before main.js),
   registered once. The four named eases are the reference's CSS eases so the
   JS and CSS halves of one motion share a curve. `magic` is used by the
   reference as a GSAP ease name but never registered in its bundle (GSAP
   then falls back to the default) — here it is real. */
const { gsap, ScrollTrigger, SplitText, CustomEase } = window;

if (!gsap) throw new Error('gsap missing — check the CDN <script> order in index.html');
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

CustomEase.create('magic',   '0.33, 0, 0, 1');     // --ease-magic
CustomEase.create('quart',   '0.41, 0.35, 0.2, 1'); // --ease-quart
CustomEase.create('outExpo', '0.19, 1, 0.22, 1');   // --ease-out-expo
CustomEase.create('base',    '0.46, 0.03, 0.12, 1');// --ease-base
CustomEase.create('expoOut', '0.16, 1, 0.3, 1');    // --ease-expo (house blur-reveal curve)

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile = () => matchMedia('(max-width: 767px)').matches;

export { gsap, ScrollTrigger, SplitText, CustomEase };
