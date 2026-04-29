/* Hero — particles of light exploding from the centre.
 *
 * Continuous gentle bursts: every ~250ms a new burst of 6-12 sparks
 * is emitted from a slightly randomized point near the hero's centre.
 * Each spark has velocity, drag, gravity, lifespan, and fades out.
 *
 * Brand palette: amber-gold #F2B54D, cream #E8E5DD.
 *
 * Honours prefers-reduced-motion: stops emitting and clears the canvas.
 * Pauses when the tab is hidden or the canvas is offscreen.
 */
(function () {
  'use strict';
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var holder = hero.querySelector('.hero-particles');
  if (!holder) return;

  // Hide CSS gradient dots — we're taking over.
  holder.style.background = 'none';
  holder.style.opacity = '1';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return; // respect user preference, leave clean

  var canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'none';
  canvas.setAttribute('aria-hidden', 'true');
  holder.appendChild(canvas);

  var ctx = canvas.getContext('2d', { alpha: true });
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;

  function resize() {
    var r = hero.getBoundingClientRect();
    W = Math.max(1, Math.floor(r.width));
    H = Math.max(1, Math.floor(r.height));
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  var particles = [];
  var GOLD = [242, 181, 77];
  var CREAM = [232, 229, 221];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawnBurst(cx, cy) {
    // Burst direction: prefer outward / slightly upward bias
    var count = 8 + Math.floor(Math.random() * 6); // 8-13
    var angleBase = Math.random() * Math.PI * 2;
    for (var i = 0; i < count; i++) {
      var angle = angleBase + (i / count) * Math.PI * 2 + rand(-0.18, 0.18);
      var speed = rand(40, 130); // px/sec
      var col = Math.random() < 0.62 ? GOLD : CREAM;
      particles.push({
        x: cx + rand(-3, 3),
        y: cy + rand(-3, 3),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(8, 26), // small upward bias
        life: 0,
        maxLife: rand(1.4, 2.6), // seconds
        size: rand(1.2, 2.6),
        col: col,
        twinkle: rand(0, Math.PI * 2)
      });
    }
  }

  // Origin point: roughly behind the title block (centre, slightly above middle)
  function originPoint() {
    var cx = W * 0.5 + rand(-W * 0.06, W * 0.06);
    var cy = H * 0.46 + rand(-H * 0.05, H * 0.05);
    return { x: cx, y: cy };
  }

  var lastSpawn = 0;
  var SPAWN_MS = 240;
  var lastTime = performance.now();
  var running = true;
  var visible = true;

  // Soft additive glow: composite each particle as a small radial sprite
  function drawParticle(p, alpha) {
    var r = p.size * 4; // glow radius
    var grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    var c = p.col;
    grd.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (alpha * 0.95) + ')');
    grd.addColorStop(0.35, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (alpha * 0.45) + ')');
    grd.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    // Hot core
    ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.9) + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - lastTime) / 1000); // clamp to 50ms
    lastTime = now;

    if (visible) {
      if (now - lastSpawn > SPAWN_MS) {
        var o = originPoint();
        spawnBurst(o.x, o.y);
        lastSpawn = now;
        // every ~6th burst, fire a stronger one
        if (Math.random() < 0.18) {
          spawnBurst(o.x + rand(-30, 30), o.y + rand(-20, 20));
        }
      }

      // clear with very mild trail (motion-blur feel) — but in iframe this can
      // accumulate, so do a true clear and let particles' own fade do the work
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }
        // Physics
        p.vx *= (1 - dt * 0.6); // gentle drag
        p.vy *= (1 - dt * 0.6);
        p.vy += 14 * dt;        // soft gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Alpha: ease-in (quick brighten) then ease-out
        var t = p.life / p.maxLife;
        var alpha;
        if (t < 0.15) alpha = t / 0.15;
        else alpha = 1 - (t - 0.15) / 0.85;
        alpha = Math.max(0, alpha);
        // Twinkle
        alpha *= 0.7 + 0.3 * Math.sin(p.twinkle + p.life * 6);
        drawParticle(p, alpha);
      }

      ctx.globalCompositeOperation = 'source-over';
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(function (t) { lastTime = t; frame(t); });

  // Pause when tab is hidden
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible) lastTime = performance.now();
  });

  // Pause when hero scrolls fully out of view (saves cycles when reading lower sections)
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        // Note: in iframe with scrolling="no" this fires once on load only,
        // which is fine — hero is always in view from parent's perspective
        // until the user scrolls past it on the parent page.
        visible = e.isIntersecting && !document.hidden;
        if (visible) lastTime = performance.now();
      });
    }, { threshold: 0.05 });
    io.observe(hero);
  }
})();
