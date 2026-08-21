/**
 * Rise a section into view as it is scrolled to, and start its tracery drawing.
 *
 * The hidden state is set HERE, in JavaScript, and deliberately NOT as a CSS
 * rule. This page is server-rendered and has to stay readable with scripting
 * off, so a `[data-reveal] { opacity: 0 }` would blank the entire site for
 * anyone the observer never runs for — the failure mode the design artifact
 * this came from actually has. An action runs before the first paint, so
 * setting it from here costs nothing visible and risks nothing.
 *
 * Stamping `data-shown` does double duty: it plays the section's own rise and
 * draws whatever tracery is inside it. See app.css.
 *
 * @param {HTMLElement} node
 */
export function reveal(node) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  node.style.opacity = '0';

  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      node.style.opacity = '';
      node.dataset.shown = '';
      io.disconnect(); // one-way: a section that has arrived stays arrived
    },
    // Pull the bottom of the root in, so a section starts rising once it is
    // properly on screen rather than the instant its first pixel clears the fold.
    { rootMargin: '0px 0px -8% 0px' }
  );
  io.observe(node);

  return { destroy: () => io.disconnect() };
}
