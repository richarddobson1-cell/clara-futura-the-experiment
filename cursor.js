/* Custom cursor — amber ring + centre dot
 * Follows the pointer with requestAnimationFrame; expands on interactive hover.
 * Disabled on touch/coarse pointers and when prefers-reduced-motion is on. */
(function () {
  if (typeof window === 'undefined') return;

  // Always run — when embedded the parent's WP cursor is hidden over the
  // iframe and this one takes over.

  // Skip on touch / coarse pointers
  var coarse = window.matchMedia && (
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  );
  if (coarse) return;

  // Respect reduced motion — still show the cursor, but no smoothing
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    if (document.querySelector('.cf-cursor')) return;
    var el = document.createElement('div');
    el.className = 'cf-cursor';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    document.documentElement.classList.add('cf-has-cursor');

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var curX = mouseX, curY = mouseY;
    var lerp = reduce ? 1 : 0.22; // smoothing factor (higher = snappier)
    var raf = null;

    function frame() {
      curX += (mouseX - curX) * lerp;
      curY += (mouseY - curY) * lerp;
      el.style.transform = 'translate3d(' + curX + 'px, ' + curY + 'px, 0)';
      // keep the transform origin around the element centre; the margin handles centring
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!el.classList.contains('is-on')) el.classList.add('is-on');
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      el.classList.remove('is-on');
    });
    document.addEventListener('mouseenter', function () {
      el.classList.add('is-on');
    });

    // Expand on interactive elements
    var hoverSel = 'a, button, [role="button"], .acc-hd, .cta-btn, .nav-links a, .duo-card, input, select, textarea, label[for]';
    document.addEventListener('mouseover', function (e) {
      if (e.target && e.target.closest && e.target.closest(hoverSel)) {
        el.classList.add('is-hover');
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target && e.target.closest && e.target.closest(hoverSel)) {
        // Only remove if the related target isn't still inside an interactive element
        var toEl = e.relatedTarget;
        if (!toEl || !toEl.closest || !toEl.closest(hoverSel)) {
          el.classList.remove('is-hover');
        }
      }
    });

    document.addEventListener('mousedown', function () { el.classList.add('is-down'); });
    document.addEventListener('mouseup',   function () { el.classList.remove('is-down'); });
    document.addEventListener('blur', function () { el.classList.remove('is-hover', 'is-down'); });

    // Clean up if page is hidden
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; }
      else if (!document.hidden && !raf) { raf = requestAnimationFrame(frame); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
