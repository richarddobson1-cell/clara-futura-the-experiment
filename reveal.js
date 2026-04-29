/* Shared IntersectionObserver reveal — fades in on viewport entry */
(function () {
  if (typeof window === 'undefined') return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // In iframe (no parent scroll inside), or reduced motion, reveal immediately —
  // IntersectionObserver in an iframe with scrolling="no" never fires for content
  // outside the initial seed viewport, leaving the page looking blank below the fold.
  var inIframe = false;
  try { inIframe = window.self !== window.top; } catch (e) { inIframe = true; }
  if (reduce || inIframe) {
    document.querySelectorAll('.reveal, .duo-card').forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var targets = document.querySelectorAll('.reveal, .duo-card');
  if (!('IntersectionObserver' in window) || !targets.length) {
    targets.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  targets.forEach(function (el) { io.observe(el); });
})();
