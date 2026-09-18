/* GSAP + plugins from the globals (loaded with <script defer> before main.js),
   registered once. Every ease the page uses is a built-in GSAP ease or a CSS
   cubic-bezier token — no CustomEase. */
const { gsap, ScrollTrigger, SplitText } = window;

if (!gsap) throw new Error('gsap missing — check the <script> order in index.html');
gsap.registerPlugin(ScrollTrigger, SplitText);

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export { gsap, ScrollTrigger, SplitText };
