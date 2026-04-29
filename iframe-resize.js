/* Iframe auto-resize: posts the document's true content height to the parent
 * window whenever it changes, so the parent can set iframe.style.height to match.
 * Parent listens for { type: 'cf-iframe-height', height: <px> } messages.
 *
 * Height source: max of documentElement.scrollHeight and body.scrollHeight —
 * avoids rounding discrepancies across browsers.
 */
(function () {
  'use strict';
  if (window.top === window.self) return; // not embedded; no parent to tell

  var lastHeight = 0;
  var CHANNEL = 'cf-iframe-height';
  var MIN_DELTA = 4; // ignore sub-pixel jitter

  function measure() {
    // Measure the bottom of the furthest visible content element.
    // Using scrollHeight is unreliable because an iframe with a fixed height
    // attribute can cause the body to stretch to fill that height.
    var candidates = [
      document.querySelector('footer'),
      document.querySelector('main'),
      document.body && document.body.lastElementChild
    ].filter(Boolean);
    var maxBottom = 0;
    for (var i = 0; i < candidates.length; i++) {
      var r = candidates[i].getBoundingClientRect();
      var bottom = r.bottom + window.pageYOffset;
      if (bottom > maxBottom) maxBottom = bottom;
    }
    // Fallback: use children bounding bottoms on body
    if (maxBottom < 200 && document.body) {
      var kids = document.body.children;
      for (var k = 0; k < kids.length; k++) {
        var kr = kids[k].getBoundingClientRect();
        var kb = kr.bottom + window.pageYOffset;
        if (kb > maxBottom) maxBottom = kb;
      }
    }
    return Math.ceil(maxBottom);
  }

  function post(reason) {
    var h = measure();
    if (Math.abs(h - lastHeight) < MIN_DELTA) return;
    lastHeight = h;
    try {
      window.parent.postMessage({ type: CHANNEL, height: h, reason: reason || '' }, '*');
    } catch (e) { /* noop */ }
  }

  // Force a post even if the height hasn't changed (used to reply to parent requests)
  function forcePost(reason) {
    lastHeight = 0;
    post(reason);
  }

  // Listen for parent requesting a height post (covers race where parent's
  // listener is attached after the iframe's initial posts).
  window.addEventListener('message', function(e){
    if (e.data && e.data.type === 'cf-iframe-request-height') forcePost('requested');
  });

  // Initial + after full load (images, fonts)
  function init() {
    post('init');
    // Re-measure a few times as late fonts/images settle. Force-post so parent
    // (which may attach its listener after the page's first paint) still gets one.
    setTimeout(function(){ forcePost('delay-120'); }, 120);
    setTimeout(function(){ forcePost('delay-450'); }, 450);
    setTimeout(function(){ forcePost('delay-1200'); }, 1200);
    setTimeout(function(){ forcePost('delay-2500'); }, 2500);
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init, { once: true });
    document.addEventListener('DOMContentLoaded', function(){ post('dom'); });
  }

  // Resize (orientation / viewport change inside iframe)
  window.addEventListener('resize', function(){ post('resize'); }, { passive: true });

  // Fonts loaded
  if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
    document.fonts.ready.then(function(){ post('fonts'); });
  }

  // Images
  document.querySelectorAll('img').forEach(function(img){
    if (!img.complete) img.addEventListener('load', function(){ post('img'); }, { once: true });
  });

  // ResizeObserver on body (catches accordion expand/collapse, content mutations)
  if (typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(function(){ post('resize-observer'); });
    if (document.body) ro.observe(document.body);
    else document.addEventListener('DOMContentLoaded', function(){ ro.observe(document.body); });
  }

  // Accordion buttons — explicit post after transition
  function bindAccordions() {
    document.querySelectorAll('.acc .acc-hd').forEach(function(btn){
      btn.addEventListener('click', function(){
        // After the acc-bd height transition lands
        setTimeout(function(){ post('acc-click'); }, 60);
        setTimeout(function(){ post('acc-click-settled'); }, 380);
        setTimeout(function(){ post('acc-click-done'); }, 780);
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAccordions);
  } else {
    bindAccordions();
  }
})();
