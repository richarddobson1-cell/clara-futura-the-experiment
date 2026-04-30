/* Lazy YouTube embed — click the poster to swap in the real iframe.
 * Uses YouTube's hqdefault thumbnail as the poster image, no SDK needed
 * until the user actually wants to play. Massive payload + perf saving
 * vs. embedding all videos eagerly.
 */
(function () {
  'use strict';

  function setPoster(button, ytid) {
    var poster = button.querySelector('.ep-video-poster');
    if (!poster) return;
    // Try the high-res maxresdefault first, fall back to hqdefault.
    var img = new Image();
    var hi = 'https://i.ytimg.com/vi/' + ytid + '/maxresdefault.jpg';
    var lo = 'https://i.ytimg.com/vi/' + ytid + '/hqdefault.jpg';
    img.onload = function () {
      // YouTube returns a 120x90 placeholder when maxresdefault doesn't exist.
      // Detect that and fall back.
      if (img.naturalWidth < 320) {
        poster.style.backgroundImage = 'url(' + lo + ')';
      } else {
        poster.style.backgroundImage = 'url(' + hi + ')';
      }
      button.classList.add('ready');
    };
    img.onerror = function () {
      poster.style.backgroundImage = 'url(' + lo + ')';
      button.classList.add('ready');
    };
    img.src = hi;
  }

  function play(button, ytid, title) {
    var wrap = button.parentElement;
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/' + ytid + '?autoplay=1&rel=0&modestbranding=1';
    iframe.title = title || 'Companion video';
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    wrap.replaceChild(iframe, button);
  }

  function initNativeVideos() {
    document.querySelectorAll('.ep-video-native').forEach(function (wrap) {
      var v = wrap.querySelector('video');
      if (!v) return;
      v.addEventListener('play', function () { wrap.classList.add('is-playing'); });
      v.addEventListener('pause', function () { wrap.classList.remove('is-playing'); });
      v.addEventListener('ended', function () { wrap.classList.remove('is-playing'); });
    });
  }

  function init() {
    var buttons = document.querySelectorAll('.ep-video-play[data-ytid], .ep-video[data-ytid] .ep-video-play');
    // Find buttons whose parent has data-ytid
    document.querySelectorAll('.ep-video[data-ytid]').forEach(function (wrap) {
      var btn = wrap.querySelector('.ep-video-play');
      if (!btn) return;
      var ytid = wrap.getAttribute('data-ytid');
      var title = wrap.getAttribute('data-yttitle') || '';
      setPoster(btn, ytid);
      btn.addEventListener('click', function () {
        play(btn, ytid, title);
      });
    });
    initNativeVideos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
